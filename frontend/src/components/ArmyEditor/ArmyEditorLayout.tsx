import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

interface ArmyEditorLayoutProps {
  textEditor: ReactNode;
  unitInfo: ReactNode;
  asciiArt?: ReactNode;
}

/**
 * Responsive 3-column layout for army editor:
 * - Mobile: 1 column (text editor only, others collapse)
 * - Tablet: 2 columns (text editor + unit info)
 * - Desktop: 3 columns (text editor + unit info + ascii art)
 *
 * Features a draggable resize bar between Unit Info and Visual panels.
 */
export function ArmyEditorLayout({ textEditor, unitInfo, asciiArt }: ArmyEditorLayoutProps) {
  // Panel widths in pixels
  const [unitInfoWidth, setUnitInfoWidth] = useState(280);
  const [visualWidth, setVisualWidth] = useState(300);
  const [dragging, setDragging] = useState<'unitInfo' | 'visual' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const unitInfoRef = useRef<HTMLDivElement>(null);

  // Handle drag start
  const handleMouseDownUnitInfo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging('unitInfo');
  }, []);

  const handleMouseDownVisual = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging('visual');
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      if (dragging === 'visual') {
        const newWidth = containerRect.right - e.clientX;
        const clampedWidth = Math.max(150, Math.min(600, newWidth));
        setVisualWidth(clampedWidth);
      } else if (dragging === 'unitInfo' && unitInfoRef.current) {
        const unitInfoRect = unitInfoRef.current.getBoundingClientRect();
        const newWidth = unitInfoRect.right - e.clientX;
        const clampedWidth = Math.max(200, Math.min(700, newWidth));
        setUnitInfoWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row min-h-[60vh]">
      {/* Column 1: Text Editor - flexible width, takes remaining space */}
      <div className="flex-1 min-w-0">
        {textEditor}
      </div>

      {/* Column 2: Unit Info with resize handle - hidden on mobile */}
      <div className="hidden md:flex">
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDownUnitInfo}
          className={`w-2 cursor-col-resize flex items-center justify-center hover:bg-[var(--terminal-dim)] transition-colors ${
            dragging === 'unitInfo' ? 'bg-[var(--terminal-fg)]' : ''
          }`}
          title="Drag to resize"
        >
          <span className="text-dim text-xs select-none">║</span>
        </div>

        {/* Unit Info panel */}
        <div
          ref={unitInfoRef}
          style={{ width: `${unitInfoWidth}px` }}
          className="min-w-[200px] max-w-[700px]"
        >
          {unitInfo}
        </div>
      </div>

      {/* Column 3: ASCII Art with resize handle - only on wide screens */}
      {asciiArt && (
        <div className="hidden xl:flex">
          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDownVisual}
            className={`w-2 cursor-col-resize flex items-center justify-center hover:bg-[var(--terminal-dim)] transition-colors ${
              dragging === 'visual' ? 'bg-[var(--terminal-fg)]' : ''
            }`}
            title="Drag to resize"
          >
            <span className="text-dim text-xs select-none">║</span>
          </div>

          {/* Visual panel */}
          <div
            style={{ width: `${visualWidth}px` }}
            className="min-w-[150px] max-w-[600px]"
          >
            {asciiArt}
          </div>
        </div>
      )}
    </div>
  );
}
