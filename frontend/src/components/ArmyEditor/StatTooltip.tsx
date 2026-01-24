import { useState, type ReactNode } from 'react';

interface StatTooltipProps {
  children: ReactNode;
  tooltip: string;
}

/**
 * Inline tooltip component for stat explanations.
 * Shows tooltip on hover.
 */
export function StatTooltip({ children, tooltip }: StatTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      className="relative cursor-help border-b border-dotted border-[var(--terminal-dim)]"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-[var(--terminal-bg)] border border-[var(--terminal-fg)] whitespace-nowrap z-50">
          {tooltip}
        </span>
      )}
    </span>
  );
}

// Stat field explanations
export const STAT_TOOLTIPS: Record<string, string> = {
  // Unit type (Unit Class)
  type: 'Unit Class',
  'Inf': 'Infantry',
  'Inf (S)': 'Infantry Squad',
  'Vec': 'Vehicle',
  'Vec (W)': 'Vehicle (Wheeled)',
  'Vec (H)': 'Vehicle (Hovercraft)',
  'Vec (S)': 'Vehicle (Strider',
  'Vec (C)': 'Vehicle (Caterpillar)',
  'Air': 'Aircraft',
  'Air (CAS)': 'Aircraft (Close Air Support)',
  'Air (CAP)': 'Aircraft (Combat Air Patrol)',

  // Unit Stats
  hull: 'Height (H) - The higher the statistic, the taller the unit.',
  speed: 'Spotting Distance (S)',
  move: 'Move (M) - The number of inches the unit can move (before terrain multipliers) in one turn.',
  quality: 'Quality (Q) - The higher the statistic, the better the unit’s discipline and nerve.',
  toughness: 'Toughness (T) - Three numbers indicating the unit’s resilience to damage on its front, side, and rear arcs respectively.',
  command: 'Command (C) - Command tokens generated at beginning of Support Phase. TACOMs only',

  // Weapon stats
  targets: 'Target - Unit classes this weapon can engage',
  range: 'Range (R) - Max distance in inches. Half range = half this value (+1 Acc bonus)',
  accuracy: 'Accuracy (A) - Roll needed to hit: Stationary/Moving. Lower = better',
  strength: 'Strength (S) - Firepower. First number normal, second typically at half range',
  damage: 'Dice (D) - Number of dice rolled per attack. More dice = more chances to hit/kill',
  ammo: 'Ammo - Limited shots. One ammo consumed per attack regardless of Dice value',
};

// Weapon target type tooltips
export const WEAPON_STAT_TOOLTIPS: Record<string, string> = {
  'All': 'May target all unit classes',
  'Inf': 'May target Infantry only',
  'Vec': 'May target Vehicles only',
  'Air': 'May target Aircraft only',
  'Gnd': 'Ground-targeting - Targets a point on ground, affects units in listed Radius',
  'Inf/Vec': 'May target Infantry and Vehicles',
  'Vec/Air': 'May target Vehicles and Aircraft',
};
