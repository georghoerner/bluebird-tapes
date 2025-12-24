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
      <footer className="p-2 border-t border-[var(--terminal-dim)] text-center text-dim text-xs">
        <span>CLASSIFICATION: UNCLASSIFIED // FOUO</span>
        <span className="mx-4">|</span>
        <span>DREKFORT M.D.C. - LANGPORT, VANSA</span>
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

// Box component for bordered sections
interface BoxProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Box({ title, children, className = '' }: BoxProps) {
  return (
    <div className={`border border-[var(--terminal-fg)] p-4 ${className}`}>
      {title && (
        <div className="text-bright mb-2 terminal-glow">
          {'▓▓ '}{title}{' ▓▓'}
        </div>
      )}
      {children}
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
