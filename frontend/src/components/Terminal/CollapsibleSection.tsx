import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  /** Content to show when expanded */
  children: ReactNode;
  /** Label shown in the collapsed delineation bar */
  label?: string;
  /** Whether the section starts expanded */
  defaultExpanded?: boolean;
  /** The character used for the delineation line */
  lineChar?: string;
  /** Total width in characters (default 76 to match other separators) */
  width?: number;
}

/**
 * A collapsible section that shows as a clickable delineation line.
 * Click the header line to toggle expanded/collapsed state.
 *
 * Collapsed state:
 *   ──────────[ ▶ EXAMPLE ]──────────
 *
 * Expanded state:
 *   ══════════[ ▼ EXAMPLE ]══════════
 *   (content here)
 */
export function CollapsibleSection({
  children,
  label = 'SECTION',
  defaultExpanded = true,
  lineChar = '─',
  width = 76,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate padding for centered label
  const createDelineation = (text: string, char: string) => {
    const bracketedText = `[ ${text} ]`;
    const remainingWidth = width - bracketedText.length;
    const leftPadding = Math.floor(remainingWidth / 2);
    const rightPadding = remainingWidth - leftPadding;
    return `${char.repeat(leftPadding)}${bracketedText}${char.repeat(rightPadding)}`;
  };

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // Header line - always clickable to toggle
  const headerLine = (
    <button
      type="button"
      onClick={toggleExpanded}
      className="w-full text-left bg-transparent border-none p-0 cursor-pointer"
      style={{
        fontFamily: 'inherit',
        fontSize: 'inherit',
      }}
    >
      <span className="text-dim hover:text-[var(--terminal-fg)] transition-colors">
        {createDelineation(
          `${isExpanded ? '▼' : '▶'} ${label}`,
          isExpanded ? '═' : lineChar
        )}
      </span>
    </button>
  );

  if (!isExpanded) {
    // Collapsed state - just the header line
    return <div className="my-4">{headerLine}</div>;
  }

  // Expanded state - header line + content
  return (
    <div className="my-4">
      <div className="mb-2">{headerLine}</div>
      <div className="pl-2">{children}</div>
    </div>
  );
}
