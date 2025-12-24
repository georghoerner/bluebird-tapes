import { useEffect, useRef } from 'react';
import type { AutocompleteItem } from './types';

interface TerminalDropdownProps {
  items: AutocompleteItem[];
  selectedIndex: number;
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
  visible: boolean;
}

/**
 * Terminal-style dropdown for autocomplete suggestions.
 * Styled to look like a retro terminal menu.
 */
export function TerminalDropdown({
  items,
  selectedIndex,
  onSelect,
  onClose,
  position,
  visible,
}: TerminalDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (visible && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, visible]);

  if (!visible || items.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 border border-[var(--terminal-fg)] bg-[var(--terminal-bg)] shadow-lg max-h-48 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '200px',
        maxWidth: '400px',
      }}
    >
      {/* Header bar */}
      <div className="px-2 py-1 border-b border-[var(--terminal-dim)] text-dim text-xs">
        {'>'} SELECT OPTION {'<'}
      </div>

      {/* Items */}
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <div
            key={`${item.type}-${item.value}-${index}`}
            data-selected={isSelected}
            onClick={() => onSelect(item)}
            className={`
              px-2 py-1 cursor-pointer text-sm
              ${isSelected
                ? 'bg-[var(--terminal-fg)] text-[var(--terminal-bg)]'
                : 'hover:bg-[var(--terminal-glow)]'
              }
            `}
          >
            <span className="text-dim mr-2">
              {item.type === 'faction' ? '[F]' : item.type === 'mounting' ? '[M]' : '[U]'}
            </span>
            <span>{item.label}</span>
            {item.data?.points !== undefined && (
              <span className="ml-2 text-dim">({item.data.points} pts)</span>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div className="px-2 py-1 border-t border-[var(--terminal-dim)] text-dim text-xs">
        {'↑↓'} Navigate {'·'} {'↵'} Select {'·'} ESC Close
      </div>
    </div>
  );
}
