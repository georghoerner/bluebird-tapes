import type { ReactNode } from 'react';

interface TerminalProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export function Terminal({ children, hideHeader = false }: TerminalProps) {
  return (
    <div className="terminal min-h-screen flex flex-col">
      {/* CRT Scanlines overlay */}
      <div className="crt-overlay" />

      {/* Terminal header */}
      {!hideHeader && (
        <header className="p-4 border-b border-[var(--terminal-dim)]">
          <pre className="terminal-glow text-center text-sm leading-tight">
{`╔══════════════════════════════════════════════════════════════════════════╗
║  BLUEBIRD TERMINAL v1.0 - DREKFORT M.D.C. INTELLIGENCE DIVISION          ║
║  MAIN THREATS DIRECTORATE - ARMY SIGHTING REPORT SYSTEM                  ║
╚══════════════════════════════════════════════════════════════════════════╝`}
          </pre>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 overflow-auto">
        {children}
      </main>

      {/* Terminal footer */}
      <footer className="p-2 border-t border-[var(--terminal-dim)] text-center text-dim text-xs flex justify-between items-center">
        <span className="flex-1" />
        <span>
          <span>CLASSIFICATION: UNCLASSIFIED // FOUO</span>
          <span className="mx-4">|</span>
          <span>DREKFORT M.D.C. - LANGPORT, VANSA</span>
        </span>
        <span className="flex-1 text-right">
          <button
            onClick={() => {
              const info = [
                '## Environment',
                `- URL: ${window.location.href}`,
                `- User Agent: ${navigator.userAgent}`,
                `- Screen: ${window.innerWidth}x${window.innerHeight}`,
                `- Time: ${new Date().toISOString()}`,
                '',
                '## Description',
                'Describe the issue here...',
                '',
                '## Steps to Reproduce',
                '1. ',
                '',
                '## Expected Behavior',
                '',
                '## Actual Behavior',
              ].join('\n');
              const url = `https://github.com/georghoerner/bluebird-tapes/issues/new?title=Bug+Report&body=${encodeURIComponent(info)}`;
              window.open(url, '_blank');
            }}
            className="hover:text-bright bg-transparent border-0 p-0 m-0 cursor-pointer"
            title="Report a bug"
          >
            [REPORT ISSUE]
          </button>
        </span>
      </footer>
    </div>
  );
}

// Blinking cursor component
export function Cursor() {
  return <span className="cursor-block cursor-blink" />;
}

// Terminal prompt component
interface PromptProps {
  children?: ReactNode;
}

export function Prompt({ children }: PromptProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-dim">&gt;</span>
      {children}
      <Cursor />
    </div>
  );
}

// Terminal message component
interface MessageProps {
  type?: 'info' | 'success' | 'error' | 'warning';
  children: ReactNode;
}

export function Message({ type = 'info', children }: MessageProps) {
  const prefix = {
    info: '[INFO]',
    success: '[OK]',
    error: '[ERROR]',
    warning: '[WARN]',
  }[type];

  const colorClass = {
    info: '',
    success: 'text-bright',
    error: 'text-[#FF6B6B]',
    warning: 'text-[#FFCC00]',
  }[type];

  return (
    <div className={`mb-1 ${colorClass}`}>
      <span className="text-dim mr-2">{prefix}</span>
      {children}
    </div>
  );
}

// Box-drawing character constants
export const BOX = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  teeRight: '╠',
  teeLeft: '╣',
  teeDown: '╦',
  teeUp: '╩',
  cross: '╬',
  // Single-line variants
  sTopLeft: '┌',
  sTopRight: '┐',
  sBottomLeft: '└',
  sBottomRight: '┘',
  sHorizontal: '─',
  sVertical: '│',
};

// Box component for bordered sections using Unicode box-drawing
interface BoxProps {
  title?: string;
  children: ReactNode;
  className?: string;
  width?: number;
  variant?: 'double' | 'single';
}

export function Box({ title, children, className = '', width, variant = 'double' }: BoxProps) {
  const chars = variant === 'double'
    ? { tl: BOX.topLeft, tr: BOX.topRight, bl: BOX.bottomLeft, br: BOX.bottomRight, h: BOX.horizontal, v: BOX.vertical }
    : { tl: BOX.sTopLeft, tr: BOX.sTopRight, bl: BOX.sBottomLeft, br: BOX.sBottomRight, h: BOX.sHorizontal, v: BOX.sVertical };

  // If width is specified, use character-based sizing; otherwise use full width
  const useFixedWidth = width !== undefined;
  const innerWidth = useFixedWidth ? width - 2 : 76; // Default 78 chars total (76 inner)

  const topBorder = title
    ? `${chars.tl}${chars.h}${chars.h}[ ${title} ]${chars.h.repeat(Math.max(0, innerWidth - title.length - 6))}${chars.tr}`
    : `${chars.tl}${chars.h.repeat(innerWidth)}${chars.tr}`;
  const bottomBorder = `${chars.bl}${chars.h.repeat(innerWidth)}${chars.br}`;

  const containerStyle = useFixedWidth
    ? { width: `${width}ch`, maxWidth: '100%' }
    : { width: '100%' };

  return (
    <div className={`font-mono ${className}`} style={containerStyle}>
      <div className="text-dim whitespace-pre overflow-hidden">{topBorder}</div>
      <div className="flex min-h-[1.5em]">
        <span className="text-dim flex-shrink-0">{chars.v}</span>
        <div className="flex-1 px-1 overflow-hidden">{children}</div>
        <span className="text-dim flex-shrink-0">{chars.v}</span>
      </div>
      <div className="text-dim whitespace-pre overflow-hidden">{bottomBorder}</div>
    </div>
  );
}

// Separator line
export function Separator() {
  return (
    <div className="my-4 text-dim">
      {'─'.repeat(76)}
    </div>
  );
}

// Double line separator
export function DoubleSeparator() {
  return (
    <div className="my-4">
      {'═'.repeat(76)}
    </div>
  );
}
