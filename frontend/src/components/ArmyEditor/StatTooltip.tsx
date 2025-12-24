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
  type: 'Unit Class - Determines unit behavior and targeting',
  'Inf': 'Infantry - Foot soldiers',
  'Inf (S)': 'Infantry Squad - Larger infantry formation',
  'Vec': 'Vehicle - Armored ground vehicle',
  'Vec (W)': 'Vehicle (Wheeled) - Fast wheeled transport',
  'Vec (H)': 'Vehicle (Hover) - Hovercraft, can cross water',
  'Vec (S)': 'Vehicle (Strider) - Bipedal walker mech',
  'Vec (C)': 'Vehicle (Caterpillar) - Tracked vehicle',
  'Air': 'Aircraft - Flying unit',
  'Air (CAS)': 'Aircraft (Close Air Support) - Ground attack plane',
  'Air (CAP)': 'Aircraft (Combat Air Patrol) - Air superiority fighter',

  // Unit Stats
  hull: 'Height (H) - Unit tallness. Higher = taller unit, easier to spot/hit',
  speed: 'Spotting Distance (S) - How far this unit can spot enemies',
  move: 'Move (M) - Movement in inches per turn (before terrain modifiers)',
  quality: 'Quality (Q) - Discipline and nerve. Higher = better',
  toughness: 'Toughness (T) - Armor values: Front/Side/Rear arcs',
  command: 'Command (C) - Tokens generated at Support Phase. TACOMs only',

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
  'Gnd': 'Ground-targeting - Targets a point on ground, affects units in Radius',
  'Inf/Vec': 'May target Infantry and Vehicles',
  'Vec/Air': 'May target Vehicles and Aircraft',
};
