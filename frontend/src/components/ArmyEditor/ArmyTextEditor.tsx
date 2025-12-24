import { useState, useRef, useCallback, useEffect } from 'react';
import { TerminalDropdown } from './TerminalDropdown';
import type { AutocompleteItem, FactionData, Unit } from './types';
import { MOUNTING_MODES } from './types';

interface ArmyTextEditorProps {
  maxWidth?: number;
  factions: { id: string; name: string }[];
  getFactionData: (factionId: string) => FactionData | null;
  onCursorUnitChange?: (unit: Unit | null) => void;
  onTextChange?: (text: string) => void;
}

/**
 * Terminal-style text editor for army list entry.
 * Features:
 * - Plain text input in army list format
 * - Autocomplete for factions, units, and mounting modes
 * - Character width limit per line
 */
export function ArmyTextEditor({
  maxWidth = 40,
  factions,
  getFactionData,
  onCursorUnitChange,
  onTextChange,
}: ArmyTextEditorProps) {
  const [text, setText] = useState('');
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownItems, setDropdownItems] = useState<AutocompleteItem[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerStart, setTriggerStart] = useState(0);
  const [fontSize, setFontSize] = useState(16);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 10));

  // Get current line info
  const getCurrentLineInfo = useCallback(() => {
    if (!textareaRef.current) return { line: '', lineStart: 0, lineEnd: 0, cursorInLine: 0 };

    const cursorPos = textareaRef.current.selectionStart;
    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);

    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const lineEndOffset = afterCursor.indexOf('\n');
    const lineEnd = lineEndOffset === -1 ? text.length : cursorPos + lineEndOffset;

    const line = text.substring(lineStart, lineEnd);
    const cursorInLine = cursorPos - lineStart;

    return { line, lineStart, lineEnd, cursorInLine };
  }, [text]);

  // Update cursor position and check for unit under cursor
  const updateCursorContext = useCallback(() => {
    const { line } = getCurrentLineInfo();

    // Try to find a unit name in the current line - search ALL factions
    for (const faction of factions) {
      const factionData = getFactionData(faction.id);
      if (factionData) {
        for (const unit of factionData.units) {
          if (line.toLowerCase().includes(unit.name.toLowerCase()) ||
              line.toLowerCase().includes(unit.displayName.toLowerCase())) {
            onCursorUnitChange?.(unit);
            return;
          }
        }
      }
    }
    onCursorUnitChange?.(null);
  }, [getCurrentLineInfo, factions, getFactionData, onCursorUnitChange]);

  // Handle text changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onTextChange?.(newText);

    // Check for autocomplete triggers
    checkAutocomplete(newText, e.target.selectionStart);
  };

  // Check if we should show autocomplete
  const checkAutocomplete = useCallback((currentText: string, cursorPos: number) => {
    const beforeCursor = currentText.substring(0, cursorPos);
    const lines = beforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    // Check for mounting mode trigger (typing "-" at start of unit line or "[")
    // TODO: add check if line before was a unit that was not mounted
    if (currentLine.match(/^-\s*\[?$/)) {
      showMountingModeDropdown(cursorPos);
      return;
    }

    // Check for faction input (first few lines, check if typing faction name)
    // TODO: let's use it only when in line one, or in the first line that is not empty
    // TODO: allow shortcuts like: FSA, AEF, NRH, ABS
    // TODO: allow ALL as an input, enabling all army unit copositions
    if (lines.length <= 3 && !selectedFaction) {
      const factionMatches = factions.filter(f =>
        f.name.toLowerCase().includes(currentLine.toLowerCase()) ||
        f.id.toLowerCase().includes(currentLine.toLowerCase())
      );
      if (factionMatches.length > 0 && currentLine.length >= 2) {
        showFactionDropdown(factionMatches, cursorPos, currentLine);
        return;
      }
    }

    // Check for unit autocomplete (typing unit name) - search ALL factions
    // TODO: make it dependent on what army was selected (look at ALL as an option)
    if (currentLine.length >= 2) {
      // Filter out mounting mode prefixes
      const cleanLine = currentLine.replace(/^-\s*\[[DET]\]\s*/i, '');
      if (cleanLine.length >= 2) {
        // Collect matches from all factions
        const allMatches: Unit[] = [];
        for (const faction of factions) {
          const factionData = getFactionData(faction.id);
          if (factionData) {
            const matches = factionData.units.filter(u =>
              u.name.toLowerCase().includes(cleanLine.toLowerCase()) ||
              u.displayName.toLowerCase().includes(cleanLine.toLowerCase())
            );
            allMatches.push(...matches);
          }
        }

        if (allMatches.length > 0) {
          // Deduplicate by unit id and limit to 10
          const uniqueMatches = allMatches.filter((unit, index, self) =>
            index === self.findIndex(u => u.id === unit.id)
          ).slice(0, 10);
          showUnitDropdown(uniqueMatches, cursorPos, cleanLine);
          return;
        }
      }
    }

    // Hide dropdown if no matches
    setDropdownVisible(false);
  }, [factions, selectedFaction, getFactionData]);

  // Show faction selection dropdown
  const showFactionDropdown = (matches: { id: string; name: string }[], cursorPos: number, searchText: string) => {
    const items: AutocompleteItem[] = matches.map(f => ({
      label: f.name,
      value: f.id,
      type: 'faction',
    // TODO: ALL faction selection add.
    }));

    setDropdownItems(items);
    setSelectedIndex(0);
    setTriggerStart(cursorPos - searchText.length);
    positionDropdown(cursorPos);
    setDropdownVisible(true);
  };

  // Show unit selection dropdown
  const showUnitDropdown = (units: Unit[], cursorPos: number, searchText: string) => {
    const items: AutocompleteItem[] = units.map(u => ({
      label: u.displayName,
      value: u.id,
      type: 'unit',
      data: u,
    }));

    setDropdownItems(items);
    setSelectedIndex(0);
    setTriggerStart(cursorPos - searchText.length);
    positionDropdown(cursorPos);
    setDropdownVisible(true);
  };

  // Show mounting mode dropdown
  const showMountingModeDropdown = (cursorPos: number) => {
    const items: AutocompleteItem[] = MOUNTING_MODES.map(m => ({
      label: m.label,
      value: m.value,
      type: 'mounting',
    }));

    setDropdownItems(items);
    setSelectedIndex(0);
    setTriggerStart(cursorPos);
    positionDropdown(cursorPos);
    setDropdownVisible(true);
  };

  // Position dropdown near cursor
  const positionDropdown = (cursorPos: number) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();

    // Estimate cursor position (rough approximation)
    const lines = text.substring(0, cursorPos).split('\n');
    const lineIndex = lines.length - 1;
    const charIndex = lines[lineIndex].length;

    // Approximate character dimensions
    const charWidth = 9.6; // Monospace estimate
    const lineHeight = 19.2; // 1.2 line-height * 16px

    const top = rect.top + (lineIndex + 1) * lineHeight + textarea.scrollTop;
    const left = rect.left + charIndex * charWidth;

    setDropdownPosition({
      top: Math.min(top, window.innerHeight - 200),
      left: Math.min(left, window.innerWidth - 220),
    });
  };

  // Handle autocomplete selection
  const handleSelect = (item: AutocompleteItem) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    let insertText = '';
    let newCursorPos = cursorPos;

    if (item.type === 'faction') {
      // Set faction and insert name
      setSelectedFaction(item.value);
      insertText = item.label;
      const before = text.substring(0, triggerStart);
      const after = text.substring(cursorPos);
      setText(before + insertText + after);
      newCursorPos = triggerStart + insertText.length;
    } else if (item.type === 'unit') {
      // Insert unit with points
      const unit = item.data;
      insertText = `${item.label} - ${unit?.points || 0} pts`;
      const before = text.substring(0, triggerStart);
      const after = text.substring(cursorPos);
      setText(before + insertText + after);
      newCursorPos = triggerStart + insertText.length;
    } else if (item.type === 'mounting') {
      // Insert mounting mode
      insertText = `[${item.value}] `;
      const before = text.substring(0, triggerStart);
      const after = text.substring(cursorPos);
      // Replace the "- [" or just "-" with "- [X] "
      const cleanBefore = before.replace(/-\s*\[?$/, '- ');
      setText(cleanBefore + insertText + after);
      newCursorPos = cleanBefore.length + insertText.length;
    }

    setDropdownVisible(false);

    // Set cursor position after React re-render
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (dropdownVisible) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, dropdownItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (dropdownItems[selectedIndex]) {
            handleSelect(dropdownItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setDropdownVisible(false);
          break;
      }
    }
  };

  // Update cursor context on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      updateCursorContext();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateCursorContext]);

  // Line count and character limit display
  const lines = text.split('\n');
  const lineCount = lines.length;
  const longestLine = Math.max(...lines.map(l => l.length));

  return (
    <div className="border border-[var(--terminal-fg)] h-full flex flex-col">
      {/* Header with size controls */}
      <div className="px-2 py-1 border-b border-[var(--terminal-dim)] flex justify-between items-center">
        <span className="flex items-center">
          <button onClick={decreaseFontSize} className="text-xs hover:text-bright bg-transparent border-0 p-0 m-0 cursor-pointer">▓-▓</button>
          <span className="text-bright terminal-glow mx-1">ARMY LIST ENTRY</span>
          <button onClick={increaseFontSize} className="text-xs hover:text-bright bg-transparent border-0 p-0 m-0 cursor-pointer">▓+▓</button>
        </span>
        <span className="text-dim text-xs">
          {selectedFaction ? `[${selectedFaction.toUpperCase()}]` : '[NO FACTION]'}
        </span>
      </div>

      {/* Textarea */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onClick={updateCursorContext}
          className="w-full h-full p-2 bg-transparent resize-none focus:outline-none"
          style={{
            fontFamily: "'IBM VGA', 'Courier New', monospace",
            fontSize: `${fontSize}px`,
            lineHeight: '1.2',
            caretColor: 'var(--terminal-fg)',
          }}
          placeholder={`Enter faction name to begin...

Example:
FEDERAL STATES
MY ARMY NAME - 1000 PTS, 3 COMMAND
_________________________
Task Unit 1 - Headquarters
P1 "Parallax" - 35 pts
- [D] Tactical Team - 15 pts`}
          spellCheck={false}
        />

        {/* Dropdown */}
        <TerminalDropdown
          items={dropdownItems}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          onClose={() => setDropdownVisible(false)}
          position={dropdownPosition}
          visible={dropdownVisible}
        />
      </div>

      {/* Footer status */}
      <div className="px-2 py-1 border-t border-[var(--terminal-dim)] flex justify-between text-dim text-xs">
        <span>Lines: {lineCount}</span>
        <span className={longestLine > maxWidth ? 'text-[#FF6B6B]' : ''}>
          Max Width: {longestLine}/{maxWidth}
        </span>
      </div>
    </div>
  );
}
