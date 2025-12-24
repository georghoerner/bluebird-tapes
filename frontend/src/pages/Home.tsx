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
  const { factions, getFactionData } = useFactionData();

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
          />
        }
        unitInfo={<UnitInfoPanel unit={currentUnit} />}
        asciiArt={<AsciiArtPanel unit={currentUnit} />}
      />

      <Separator />

      {/* Communications section placeholder */}
      <div className="mt-4">
        <label className="block mb-1 text-dim">COMMUNICATIONS (optional):</label>
        <input
          type="email"
          placeholder="email@example.com - to track your army list"
          className="w-full md:w-1/2"
        />
      </div>
    </Terminal>
  );
}
