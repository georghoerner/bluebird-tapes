import { useEffect, useRef } from 'react';
import type { AutocompleteItem } from './types';

// Box-drawing characters for dropdown
const BOX = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  teeRight: '╠',
  teeLeft: '╣',
};

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
 * Uses Unicode box-drawing characters for authentic retro look.
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

  const width = 36;
  const innerWidth = width - 2;
  const headerText = ' SELECT OPTION ';
  const topBorder = `${BOX.topLeft}${BOX.horizontal.repeat(Math.floor((innerWidth - headerText.length) / 2))}${headerText}${BOX.horizontal.repeat(Math.ceil((innerWidth - headerText.length) / 2))}${BOX.topRight}`;
  const divider = `${BOX.teeRight}${BOX.horizontal.repeat(innerWidth)}${BOX.teeLeft}`;
  const bottomBorder = `${BOX.bottomLeft}${BOX.horizontal.repeat(innerWidth)}${BOX.bottomRight}`;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-[var(--terminal-bg)] shadow-lg font-mono"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Top border with header */}
      <div className="text-dim whitespace-pre text-xs">{topBorder}</div>

      {/* Scrollable items container */}
      <div className="max-h-40 overflow-y-auto">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={`${item.type}-${item.value}-${index}`}
              data-selected={isSelected}
              onClick={() => onSelect(item)}
              className="flex cursor-pointer text-sm"
            >
              <span className="text-dim">{BOX.vertical}</span>
              <div
                className={`flex-1 px-1 ${
                  isSelected
                    ? 'bg-[var(--terminal-fg)] text-[var(--terminal-bg)]'
                    : 'hover:bg-[var(--terminal-glow)]'
                }`}
              >
                <span className={isSelected ? '' : 'text-dim'}>
                  {item.type === 'faction' ? '[F]' : item.type === 'mounting' ? '[M]' : '[U]'}
                </span>
                <span className="ml-1">{item.label}</span>
                {item.data?.points !== undefined && (
                  <span className={`ml-1 ${isSelected ? '' : 'text-dim'}`}>({item.data.points})</span>
                )}
              </div>
              <span className="text-dim">{BOX.vertical}</span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="text-dim whitespace-pre text-xs">{divider}</div>

      {/* Footer */}
      <div className="flex text-dim text-xs">
        <span>{BOX.vertical}</span>
        <div className="flex-1 px-1 text-center">↑↓ Nav · ↵ Select · Esc</div>
        <span>{BOX.vertical}</span>
      </div>

      {/* Bottom border */}
      <div className="text-dim whitespace-pre text-xs">{bottomBorder}</div>
    </div>
  );
}
