export interface Weapon {
  name: string;
  targets: string;
  range: string;
  accuracy: string;
  strength: string;
  damage: string;
  ammo?: number;
  abilities: string[];
  subWeapons?: Weapon[];
}

export interface UnitStats {
  type: string;
  hull: number;
  spot: string;
  move: string;
  quality: number;
  toughness: string;
  command?: number;
}

export interface Unit {
  id: string;
  name: string;
  displayName: string;
  points: number;
  unitType: string;
  category: string;
  section: string;
  stats: UnitStats;
  abilities: string[];
  description?: string;
  weapons: Weapon[];
}

export interface FactionData {
  factionId: string;
  factionName: string;
  generatedAt: string;
  units: Unit[];
}

export interface AutocompleteItem {
  label: string;
  value: string;
  type: 'faction' | 'unit' | 'mounting';
  data?: Unit;
}

export type MountingMode = 'D' | 'E' | 'T' | '1' | '2' | '3' ;

export const MOUNTING_MODES: { value: MountingMode; label: string; description: string }[] = [
  { value: 'D', label: '[D] Desanting', description: 'Infantry rides on vehicle' },
  { value: 'E', label: '[E] Embarked', description: 'Infantry rides in vehicle' },
  { value: 'T', label: '[T] Towing', description: 'Vehicle tow' },
  { value: '1', label: '[1] Tercio 1', description: 'Tercio formation lead' },
  { value: '2', label: '[2] Tercio 2', description: 'Tercio formation supporting right' },
  { value: '3', label: '[3] Tercio 3', description: 'Tercio formation supporting left' },
];
