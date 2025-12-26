import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { TerminalDropdown } from './TerminalDropdown';
import { terminalTheme, terminalSyntaxHighlighting } from './terminalTheme';
import { armyList } from './armyListLanguage';
import { pointsDecorationPlugin } from './pointsDecoration';
import {
  factionDataFacet,
  validationPlugin,
  validationResultField,
  validationTooltip,
  errorGutter,
} from './validation';
import type { FactionDataConfig } from './validation';
import type { AutocompleteItem, FactionData, Unit } from './types';
import { MOUNTING_MODES } from './types';
import { parser } from '../../utils/armyListParser/parser.js';
import { matchFactionByAlias } from '../../hooks/useFactionData';
import { normalizeForComparison } from './utils/normalize';

interface CodeMirrorEditorProps {
  maxWidth?: number;
  factions: { id: string; name: string }[];
  getFactionData: (factionId: string) => FactionData | null;
  onCursorUnitChange?: (unit: Unit | null) => void;
  onTextChange?: (text: string) => void;
}

const PLACEHOLDER_TEXT = `Enter faction name to begin...

Example:
FEDERAL STATES
MY ARMY NAME - 100 PTS, 3 COMMAND
_________________________
Task Unit 1 - Headquarters
P1 "Parallax" - 35 pts
- [D] Tactical Team - 15 pts`;

/**
 * CodeMirror-based terminal-style editor for army list entry.
 * Features:
 * - Syntax highlighting using Lezer grammar
 * - Autocomplete for factions, units, and mounting modes
 * - Real-time points/command calculation
 */
export function CodeMirrorEditor({
  maxWidth = 40,
  factions,
  getFactionData,
  onCursorUnitChange,
  onTextChange,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [text, setText] = useState('');
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);

  // Autocomplete state
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownItems, setDropdownItems] = useState<AutocompleteItem[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerStart, setTriggerStart] = useState(0);

  // Refs to avoid stale closures in CodeMirror event handlers
  const dropdownVisibleRef = useRef(dropdownVisible);
  const dropdownItemsRef = useRef(dropdownItems);
  const selectedIndexRef = useRef(selectedIndex);
  const triggerStartRef = useRef(triggerStart);

  // Keep refs in sync with state
  dropdownVisibleRef.current = dropdownVisible;
  dropdownItemsRef.current = dropdownItems;
  selectedIndexRef.current = selectedIndex;
  triggerStartRef.current = triggerStart;

  // Stats calculated from parse tree
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointCap, setPointCap] = useState(0);
  const [commandPoints, setCommandPoints] = useState(0);

  const fontSizeCompartment = useRef(new Compartment());
  const factionDataCompartment = useRef(new Compartment());

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 10));

  // Build faction data config for validation
  const buildFactionDataConfig = useCallback((): FactionDataConfig => {
    const allUnits = new Map<string, Unit>();
    const unitToFaction = new Map<string, string>();
    const selectedFactionUnits = new Set<string>();

    for (const faction of factions) {
      // Skip 'all' pseudo-faction (no JSON data)
      if (faction.id === 'all') continue;

      const data = getFactionData(faction.id);
      if (data) {
        for (const unit of data.units) {
          // Index by normalized name
          const normalized = normalizeForComparison(unit.name);
          allUnits.set(normalized, unit);
          unitToFaction.set(normalized, faction.id);

          // Also index by displayName if different
          const displayNormalized = normalizeForComparison(unit.displayName);
          if (displayNormalized !== normalized) {
            // Only add if not already present (prioritize name over displayName)
            if (!allUnits.has(displayNormalized)) {
              allUnits.set(displayNormalized, unit);
              unitToFaction.set(displayNormalized, faction.id);
            }
          }

          // Track selected faction units
          // When 'all' is selected, ALL units are valid (no cross-faction warnings)
          if (selectedFaction === 'all' || (selectedFaction && faction.id === selectedFaction)) {
            selectedFactionUnits.add(normalized);
            selectedFactionUnits.add(displayNormalized);
          }
        }
      }
    }

    return {
      allUnits,
      selectedFaction,
      selectedFactionUnits,
      unitToFaction,
    };
  }, [factions, getFactionData, selectedFaction]);

  // Calculate points and command from parse tree
  const calculateStats = useCallback((content: string) => {
    try {
      const tree = parser.parse(content);
      let points = 0;
      let cap = 0;
      let cmd = 0;

      const cursor = tree.cursor();
      do {
        // Extract point cap from HeaderInfoLine
        if (cursor.name === 'HeaderInfoLine') {
          const headerText = content.substring(cursor.from, cursor.to);
          const capMatch = headerText.match(/(\d+)\s*(?:pts|PTS|POINTS|points)/i);
          if (capMatch) {
            cap = parseInt(capMatch[1], 10);
          }
          const cmdMatch = headerText.match(/(\d+)\s*(?:cmd|CMD|COMMAND|command)/i);
          if (cmdMatch) {
            cmd = parseInt(cmdMatch[1], 10);
          }
        }

        // Sum up unit points
        if (cursor.name === 'Unit') {
          const unitText = content.substring(cursor.from, cursor.to);
          const pointsMatch = unitText.match(/(\d+)\s*(?:pts|PTS|POINTS|points)/i);
          const multiplierMatch = unitText.match(/\(x(\d+)\)/i);

          if (pointsMatch) {
            const unitPoints = parseInt(pointsMatch[1], 10);
            const multiplier = multiplierMatch ? parseInt(multiplierMatch[1], 10) : 1;
            points += unitPoints * multiplier;
          }
        }
      } while (cursor.next());

      setTotalPoints(points);
      setPointCap(cap);
      setCommandPoints(cmd);
    } catch (e) {
      // Parse error - keep previous values
    }
  }, []);

  // Find unit under cursor (prioritizes selected faction for ambiguous names)
  const updateCursorUnit = useCallback((content: string, cursorPos: number) => {
    const beforeCursor = content.substring(0, cursorPos);
    const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
    const afterCursor = content.substring(cursorPos);
    const lineEndOffset = afterCursor.indexOf('\n');
    const currentLineEnd = lineEndOffset === -1 ? content.length : cursorPos + lineEndOffset;
    const currentLine = content.substring(currentLineStart, currentLineEnd);

    const normalizedLine = normalizeForComparison(currentLine);

    // First check selected faction (prioritize for ambiguous names)
    if (selectedFaction && selectedFaction !== 'all') {
      const factionData = getFactionData(selectedFaction);
      if (factionData) {
        for (const unit of factionData.units) {
          if (normalizedLine.includes(normalizeForComparison(unit.name)) ||
              normalizedLine.includes(normalizeForComparison(unit.displayName))) {
            onCursorUnitChange?.(unit);
            return;
          }
        }
      }
    }

    // Then search other factions
    for (const faction of factions) {
      if (faction.id === 'all') continue; // Skip pseudo-faction
      if (faction.id === selectedFaction) continue; // Already checked
      const factionData = getFactionData(faction.id);
      if (factionData) {
        for (const unit of factionData.units) {
          if (normalizedLine.includes(normalizeForComparison(unit.name)) ||
              normalizedLine.includes(normalizeForComparison(unit.displayName))) {
            onCursorUnitChange?.(unit);
            return;
          }
        }
      }
    }
    onCursorUnitChange?.(null);
  }, [factions, selectedFaction, getFactionData, onCursorUnitChange]);

  // Check for autocomplete triggers
  const checkAutocomplete = useCallback((content: string, cursorPos: number, view: EditorView) => {
    const beforeCursor = content.substring(0, cursorPos);
    const lines = beforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    // Check for mounting mode trigger
    if (currentLine.match(/^-\s*\[?$/)) {
      showMountingModeDropdown(cursorPos, view);
      return;
    }

    // Check for faction input (first few lines)
    if (lines.length === 1 && !selectedFaction && currentLine.length >= 2) {
      // First check for alias match
      const aliasMatch = matchFactionByAlias(currentLine);
      if (aliasMatch) {
        const matchedFaction = factions.find(f => f.id === aliasMatch);
        if (matchedFaction) {
          showFactionDropdown([matchedFaction], cursorPos, currentLine, view);
          return;
        }
      }

      // Fall back to name/id matching
      const factionMatches = factions.filter(f =>
        f.name.toLowerCase().includes(currentLine.toLowerCase()) ||
        f.id.toLowerCase().includes(currentLine.toLowerCase())
      );
      if (factionMatches.length > 0) {
        showFactionDropdown(factionMatches, cursorPos, currentLine, view);
        return;
      }
    }

    // Check for unit autocomplete
    if (currentLine.length >= 2) {
      const cleanLine = currentLine.replace(/^-\s*\[[DET0-9]\]\s*/i, '');
      if (cleanLine.length >= 2) {
        const allMatches: Unit[] = [];

        // Filter by selected faction (unless 'all' or no faction selected)
        const factionsToSearch = (selectedFaction && selectedFaction !== 'all')
          ? factions.filter(f => f.id === selectedFaction)
          : factions.filter(f => f.id !== 'all'); // Exclude 'all' pseudo-faction

        const normalizedCleanLine = normalizeForComparison(cleanLine);
        for (const faction of factionsToSearch) {
          const factionData = getFactionData(faction.id);
          if (factionData) {
            const matches = factionData.units.filter(u =>
              normalizeForComparison(u.name).includes(normalizedCleanLine) ||
              normalizeForComparison(u.displayName).includes(normalizedCleanLine)
            );
            allMatches.push(...matches);
          }
        }

        if (allMatches.length > 0) {
          const uniqueMatches = allMatches.filter((unit, index, self) =>
            index === self.findIndex(u => u.id === unit.id)
          ).slice(0, 10);
          showUnitDropdown(uniqueMatches, cursorPos, cleanLine, view);
          return;
        }
      }
    }

    setDropdownVisible(false);
  }, [factions, selectedFaction, getFactionData]);

  // Ref for checkAutocomplete to avoid stale closure in updateListener
  const checkAutocompleteRef = useRef(checkAutocomplete);
  checkAutocompleteRef.current = checkAutocomplete;

  // Dropdown helpers
  const positionDropdown = (cursorPos: number, view: EditorView) => {
    const coords = view.coordsAtPos(cursorPos);
    if (coords) {
      setDropdownPosition({
        top: Math.min(coords.bottom + 4, window.innerHeight - 200),
        left: Math.min(coords.left, window.innerWidth - 220),
      });
    }
  };

  const showFactionDropdown = (matches: { id: string; name: string }[], cursorPos: number, searchText: string, view: EditorView) => {
    const items: AutocompleteItem[] = matches.map(f => ({
      label: f.name,
      value: f.id,
      type: 'faction',
    }));
    setDropdownItems(items);
    setSelectedIndex(0);
    setTriggerStart(cursorPos - searchText.length);
    positionDropdown(cursorPos, view);
    setDropdownVisible(true);
  };

  const showUnitDropdown = (units: Unit[], cursorPos: number, searchText: string, view: EditorView) => {
    const items: AutocompleteItem[] = units.map(u => ({
      label: u.displayName,
      value: u.id,
      type: 'unit',
      data: u,
    }));
    setDropdownItems(items);
    setSelectedIndex(0);
    setTriggerStart(cursorPos - searchText.length);
    positionDropdown(cursorPos, view);
    setDropdownVisible(true);
  };

  const showMountingModeDropdown = (cursorPos: number, view: EditorView) => {
    const items: AutocompleteItem[] = MOUNTING_MODES.map(m => ({
      label: m.label,
      value: m.value,
      type: 'mounting',
    }));
    setDropdownItems(items);
    setSelectedIndex(0);
    setTriggerStart(cursorPos);
    positionDropdown(cursorPos, view);
    setDropdownVisible(true);
  };

  // Handle autocomplete selection
  const handleSelect = useCallback((item: AutocompleteItem) => {
    const view = viewRef.current;
    if (!view) return;

    const cursorPos = view.state.selection.main.head;
    let insertText = '';
    let from = triggerStartRef.current;
    let to = cursorPos;

    if (item.type === 'faction') {
      setSelectedFaction(item.value);
      insertText = item.label;
    } else if (item.type === 'unit') {
      const unit = item.data;
      insertText = `${item.label} - ${unit?.points || 0} pts`;
    } else if (item.type === 'mounting') {
      insertText = `[${item.value}] `;
      // Adjust from to replace "- [" or just "-"
      const beforeCursor = view.state.doc.sliceString(0, cursorPos);
      const match = beforeCursor.match(/-\s*\[?$/);
      if (match) {
        from = cursorPos - match[0].length;
        insertText = '- ' + insertText;
      }
    }

    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: from + insertText.length },
    });

    setDropdownVisible(false);
    view.focus();
  }, []);

  // Ref for handleSelect to avoid stale closure
  const handleSelectRef = useRef(handleSelect);
  handleSelectRef.current = handleSelect;

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString();
        setText(content);
        onTextChange?.(content);
        calculateStats(content);
      }
      if (update.selectionSet || update.docChanged) {
        const content = update.state.doc.toString();
        const cursorPos = update.state.selection.main.head;
        updateCursorUnit(content, cursorPos);
        // Autocomplete now triggered by Ctrl+Space instead of on every keystroke
      }
    });

    const state = EditorState.create({
      doc: '',
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        terminalTheme,
        terminalSyntaxHighlighting,
        armyList(),
        pointsDecorationPlugin,
        // Validation extensions
        factionDataCompartment.current.of(factionDataFacet.of(buildFactionDataConfig())),
        validationResultField,
        validationPlugin,
        validationTooltip,
        errorGutter,
        placeholder(PLACEHOLDER_TEXT),
        updateListener,
        fontSizeCompartment.current.of(EditorView.theme({
          '&': { fontSize: `${fontSize}px` },
          '.cm-content': { fontSize: `${fontSize}px` },
        })),
        // High-precedence keymap for dropdown navigation and autocomplete trigger
        Prec.highest(keymap.of([
          {
            key: 'Ctrl-Space',
            run: (view) => {
              const content = view.state.doc.toString();
              const cursorPos = view.state.selection.main.head;
              checkAutocompleteRef.current(content, cursorPos, view);
              return true;
            },
          },
          {
            key: 'ArrowDown',
            run: () => {
              if (!dropdownVisibleRef.current) return false;
              const items = dropdownItemsRef.current;
              setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
              return true;
            },
          },
          {
            key: 'ArrowUp',
            run: () => {
              if (!dropdownVisibleRef.current) return false;
              setSelectedIndex(prev => Math.max(prev - 1, 0));
              return true;
            },
          },
          {
            key: 'Enter',
            run: () => {
              if (!dropdownVisibleRef.current) return false;
              const items = dropdownItemsRef.current;
              const idx = selectedIndexRef.current;
              if (items[idx]) {
                handleSelectRef.current(items[idx]);
              }
              return true;
            },
          },
          {
            key: 'Tab',
            run: () => {
              if (!dropdownVisibleRef.current) return false;
              const items = dropdownItemsRef.current;
              const idx = selectedIndexRef.current;
              if (items[idx]) {
                handleSelectRef.current(items[idx]);
              }
              return true;
            },
          },
          {
            key: 'Escape',
            run: () => {
              if (!dropdownVisibleRef.current) return false;
              setDropdownVisible(false);
              return true;
            },
          },
        ])),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update font size
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: fontSizeCompartment.current.reconfigure(
          EditorView.theme({
            '&': { fontSize: `${fontSize}px` },
            '.cm-content': { fontSize: `${fontSize}px` },
          })
        ),
      });
    }
  }, [fontSize]);

  // Update validation facet when faction data changes
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: factionDataCompartment.current.reconfigure(
          factionDataFacet.of(buildFactionDataConfig())
        ),
      });
    }
  }, [selectedFaction, factions, buildFactionDataConfig]);

  // Line stats
  const lines = text.split('\n');
  const lineCount = lines.length;
  const longestLine = Math.max(...lines.map(l => l.length), 0);

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

      {/* CodeMirror Editor */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={editorRef}
          className="h-full w-full p-2"
          style={{ minHeight: '200px' }}
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
        <span className="text-bright">
          {totalPoints}/{pointCap} PTS | {commandPoints} CMD
        </span>
        <span className={longestLine > maxWidth ? 'text-[#FF6B6B]' : ''}>
          Width: {longestLine}/{maxWidth}
        </span>
      </div>
    </div>
  );
}
