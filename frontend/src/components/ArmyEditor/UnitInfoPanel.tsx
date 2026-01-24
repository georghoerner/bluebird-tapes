import { useState } from 'react';
import type { Unit, Weapon } from './types';
import { StatTooltip, STAT_TOOLTIPS } from './StatTooltip';

interface UnitInfoPanelProps {
  unit: Unit | null;
}

/**
 * Display detailed unit information in terminal style.
 * Stats shown as compact one-liners with hover tooltips.
 */
export function UnitInfoPanel({ unit }: UnitInfoPanelProps) {
  const [fontSize, setFontSize] = useState(12);

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 20));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 8));

  if (!unit) {
    return (
      <div className="border border-[var(--terminal-dim)] h-full flex flex-col">
        <div className="px-2 py-1 border-b border-[var(--terminal-dim)] flex items-center">
          <button onClick={decreaseFontSize} className="text-xs hover:text-bright bg-transparent border-0 p-0 m-0 cursor-pointer">▓-▓</button>
          <span className="text-dim mx-1">UNIT INFO</span>
          <button onClick={increaseFontSize} className="text-xs hover:text-bright bg-transparent border-0 p-0 m-0 cursor-pointer">▓+▓</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <span className="text-dim text-center">
            No unit selected.
            <br />
            <br />
            Move cursor to a unit line
            <br />
            to see details.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--terminal-fg)] h-full flex flex-col overflow-hidden">
      {/* Header with size controls */}
      <div className="px-2 py-1 border-b border-[var(--terminal-dim)] bg-[var(--terminal-glow)] flex items-center">
        <button onClick={decreaseFontSize} className="text-xs hover:text-bright bg-transparent border-0 p-0 m-0 cursor-pointer">▓-▓</button>
        <span className="text-bright terminal-glow mx-1">UNIT INFO</span>
        <button onClick={increaseFontSize} className="text-xs hover:text-bright bg-transparent border-0 p-0 m-0 cursor-pointer">▓+▓</button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-2" style={{ fontSize: `${fontSize}px` }}>
        {/* Unit name and type */}
        <div className="mb-3">
          <div className="text-bright terminal-glow font-bold">{unit.displayName}</div>
          <div className="text-dim">{unit.unitType}</div>
          <div className="text-bright">{unit.points} pts</div>
        </div>

        {/* Stats - One liner */}
        <div className="mb-3 border border-[var(--terminal-dim)] p-2">
          <div className="text-dim mb-1">{'─── STATS ───'}</div>
          <div className="font-mono">
            <UnitStatLine stats={unit.stats} />
          </div>
        </div>

        {/* Abilities */}
        {unit.abilities.length > 0 && (
          <div className="mb-3">
            <div className="text-dim mb-1">{'─── UNIT SPECIAL RULES ───'}</div>
            <div>
              {unit.abilities.map((ability, i) => (
                <span key={i} className="inline-block mr-2 mb-1 px-1 border border-[var(--terminal-dim)] cursor-help">
                  {ability}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {unit.description && (
          <div className="mb-3">
            <div className="text-dim mb-1">{'─── ADDITIONAL ───'}</div>
            <div className="italic">{unit.description}</div>
          </div>
        )}

        {/* Weapons */}
        {unit.weapons.length > 0 && (
          <div className="mb-3">
            <div className="text-dim mb-1">{'─── WEAPONS ───'}</div>
            {unit.weapons.map((weapon, i) => (
              <WeaponDisplay key={i} weapon={weapon} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t border-[var(--terminal-dim)] text-dim" style={{ fontSize: `${fontSize - 2}px` }}>
        Section: {unit.section}
      </div>
    </div>
  );
}

/**
 * Render unit stats as a one-liner with tooltips
 * Format: Type, H#, S#", M#", Q#, T#/#/#(, C#)
 */
function UnitStatLine({ stats }: { stats: Unit['stats'] }) {
  const parts = [];

  // Type
  parts.push(
    <StatTooltip key="type" tooltip={STAT_TOOLTIPS[stats.type] || STAT_TOOLTIPS.type}>
      {stats.type}
    </StatTooltip>
  );

  // Height
  parts.push(
    <StatTooltip key="height" tooltip={STAT_TOOLTIPS.height}>
      H{stats.height}
    </StatTooltip>
  );

  // Spotting Distance
  parts.push(
    <StatTooltip key="spot" tooltip={STAT_TOOLTIPS.spot}>
      {stats.spot}
    </StatTooltip>
  );

  // Move
  parts.push(
    <StatTooltip key="move" tooltip={STAT_TOOLTIPS.move}>
      {stats.move}
    </StatTooltip>
  );

  // Quality
  parts.push(
    <StatTooltip key="quality" tooltip={STAT_TOOLTIPS.quality}>
      Q{stats.quality}
    </StatTooltip>
  );

  // Toughness
  parts.push(
    <StatTooltip key="toughness" tooltip={STAT_TOOLTIPS.toughness}>
      {stats.toughness}
    </StatTooltip>
  );

  // Command (optional)
  if (stats.command !== undefined) {
    parts.push(
      <StatTooltip key="command" tooltip={STAT_TOOLTIPS.command}>
        C{stats.command}
      </StatTooltip>
    );
  }

  return (
    <span className="flex flex-wrap gap-x-1">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="text-dim">,</span>}
        </span>
      ))}
    </span>
  );
}

/**
 * Render weapon stats as a one-liner with tooltips
 * Format: Targets, Range, Accuracy, Strength, Damage(, Ammo)
 */
function WeaponDisplay({ weapon, indent = 0 }: { weapon: Weapon; indent?: number }) {
  const paddingLeft = indent * 12;

  // Build weapon stat line
  const statParts = [];

  if (weapon.targets) {
    statParts.push(
      <StatTooltip key="targets" tooltip={STAT_TOOLTIPS.targets}>
        {weapon.targets}
      </StatTooltip>
    );
  }

  if (weapon.range) {
    statParts.push(
      <StatTooltip key="range" tooltip={STAT_TOOLTIPS.range}>
        {weapon.range}
      </StatTooltip>
    );
  }

  if (weapon.accuracy) {
    statParts.push(
      <StatTooltip key="accuracy" tooltip={STAT_TOOLTIPS.accuracy}>
        {weapon.accuracy}
      </StatTooltip>
    );
  }

  if (weapon.strength) {
    statParts.push(
      <StatTooltip key="strength" tooltip={STAT_TOOLTIPS.strength}>
        {weapon.strength}
      </StatTooltip>
    );
  }

  if (weapon.damage) {
    statParts.push(
      <StatTooltip key="damage" tooltip={STAT_TOOLTIPS.damage}>
        {weapon.damage}
      </StatTooltip>
    );
  }

  if (weapon.ammo !== undefined) {
    statParts.push(
      <StatTooltip key="ammo" tooltip={STAT_TOOLTIPS.ammo}>
        Ammo {weapon.ammo}
      </StatTooltip>
    );
  }

  return (
    <div className="mb-2" style={{ paddingLeft }}>
      <div className="text-bright">{weapon.name}</div>
      {statParts.length > 0 && (
        <div className="font-mono ml-2 flex flex-wrap gap-x-1">
          {statParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < statParts.length - 1 && <span className="text-dim">,</span>}
            </span>
          ))}
        </div>
      )}
      {weapon.abilities.length > 0 && (
        <div className="ml-2 text-dim">
          {weapon.abilities.map((ability, i) => (
            <span key={i} className="inline-block mr-1 cursor-help">
              {ability}
              {i < weapon.abilities.length - 1 && ','}
            </span>
          ))}
        </div>
      )}
      {weapon.subWeapons && weapon.subWeapons.map((sub, i) => (
        <WeaponDisplay key={i} weapon={sub} indent={indent + 1} />
      ))}
    </div>
  );
}
