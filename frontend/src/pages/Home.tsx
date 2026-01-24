import { useState } from 'react';
import { Terminal, ExampleBlock, Separator } from '../components/Terminal';
import {
  ArmyEditorLayout,
  ArmyTextEditor,
  UnitInfoPanel,
  AsciiArtPanel,
} from '../components/ArmyEditor';
import type { Unit } from '../components/ArmyEditor';
import { useFactionData } from '../hooks/useFactionData';

export function Home() {
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
  const { factions, getFactionData, isLoading, getError } = useFactionData();

  return (
    <Terminal>
      {/* Collapsible format example - serves as delineation after header */}
      <ExampleBlock />

      <Separator />

      {/* Army list editor with 3-column layout */}
      <ArmyEditorLayout
        textEditor={
          <ArmyTextEditor
            factions={factions}
            getFactionData={getFactionData}
            onCursorUnitChange={setCurrentUnit}
            isLoading={isLoading}
            getError={getError}
          />
        }
        unitInfo={<UnitInfoPanel unit={currentUnit} />}
        asciiArt={<AsciiArtPanel unit={currentUnit} />}
      />

      <Separator />

      {/* Communications section placeholder */}
      <div className="mt-4 text-dim text-sm">
        We are working on adding a way to share sightings internally. Please contact your supervisor for more information.
      </div>
    </Terminal>
  );
}
