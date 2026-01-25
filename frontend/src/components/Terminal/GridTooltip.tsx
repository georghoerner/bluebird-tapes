import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipVariant = 'info' | 'warning' | 'stats' | 'help';

interface GridTooltipProps {
  /** The element that triggers the tooltip on hover */
  children: ReactNode;
  /** The tooltip content (can be multiline text) */
  content: string;
  /** Visual variant determining border character */
  variant?: TooltipVariant;
  /** Max width in characters */
  maxWidth?: number;
  /** Whether to show the tooltip above or below */
  position?: 'above' | 'below';
}

const BORDER_CHARS: Record<TooltipVariant, string> = {
  info: '+',
  warning: '*',
  stats: '=',
  help: '-',
};

/**
 * A tooltip that appears as a monospace text overlay in the terminal grid style.
 *
 * Example appearance (info variant):
 *   +++++++++++++++++++++++++++++
 *   | This is the tooltip text  |
 *   | It can span multiple      |
 *   | lines as needed.          |
 *   +++++++++++++++++++++++++++++
 */
export function GridTooltip({
  children,
  content,
  variant = 'info',
  maxWidth = 40,
  position = 'below',
}: GridTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const borderChar = BORDER_CHARS[variant];

  // Word-wrap the content to fit within maxWidth
  const wrapText = (text: string, width: number): string[] => {
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (paragraph.length <= width) {
        lines.push(paragraph);
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        if (currentLine.length + word.length + 1 <= width) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    return lines;
  };

  // Build the tooltip box
  const buildTooltipBox = () => {
    const contentWidth = maxWidth - 4; // Account for border chars and spaces
    const wrappedLines = wrapText(content, contentWidth);
    const boxWidth = Math.max(...wrappedLines.map(l => l.length)) + 4;

    const topBorder = borderChar.repeat(boxWidth);
    const bottomBorder = borderChar.repeat(boxWidth);

    // Use pipes | for the sides, variant char for top/bottom
    const contentLines = wrappedLines.map(line => {
      const padding = boxWidth - line.length - 4;
      return `| ${line}${' '.repeat(padding)} |`;
    });

    return [topBorder, ...contentLines, bottomBorder].join('\n');
  };

  // Position the tooltip
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      let left = triggerRect.left;
      let top = position === 'above'
        ? triggerRect.top - tooltipRect.height - 4
        : triggerRect.bottom + 4;

      // Keep tooltip within viewport horizontally
      if (left + tooltipRect.width > viewportWidth - 16) {
        left = viewportWidth - tooltipRect.width - 16;
      }
      if (left < 16) {
        left = 16;
      }

      // If below would go off screen, try above
      if (position === 'below' && top + tooltipRect.height > window.innerHeight - 16) {
        top = triggerRect.top - tooltipRect.height - 4;
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible, position]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help border-b border-dotted border-[var(--terminal-dim)] hover:border-[var(--terminal-fg)] hover:text-bright transition-colors"
      >
        {children}
      </span>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            zIndex: 9999,
          }}
        >
          <pre
            className="text-sm leading-tight bg-[var(--terminal-bg)] border border-[var(--terminal-fg)] p-0 m-0 terminal-glow"
            style={{
              boxShadow: '0 0 10px var(--terminal-glow-strong)',
            }}
          >
            {buildTooltipBox()}
          </pre>
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Simpler inline tooltip wrapper for use in text
 */
interface HoverExplainProps {
  children: ReactNode;
  explanation: string;
  variant?: TooltipVariant;
}

export function HoverExplain({ children, explanation, variant = 'info' }: HoverExplainProps) {
  return (
    <GridTooltip content={explanation} variant={variant} maxWidth={50}>
      {children}
    </GridTooltip>
  );
}
