import type { ReactNode } from 'react';

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
 */
export function ArmyEditorLayout({ textEditor, unitInfo, asciiArt }: ArmyEditorLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[60vh]">
      {/* Column 1: Text Editor - always visible, takes priority */}
      <div className="flex-1 min-w-0 lg:max-w-[50%]">
        {textEditor}
      </div>

      {/* Column 2: Unit Info - hidden on mobile, shown on tablet+ */}
      <div className="hidden md:block flex-1 min-w-0 lg:max-w-[30%]">
        {unitInfo}
      </div>

      {/* Column 3: ASCII Art - only on wide screens */}
      {asciiArt && (
        <div className="hidden xl:block flex-1 min-w-0 max-w-[20%]">
          {asciiArt}
        </div>
      )}
    </div>
  );
}
