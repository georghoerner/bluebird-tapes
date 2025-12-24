// Unit designation enum
export type UnitDesignation = 'E' | 'D' | 'T' | null;

// Unit data
export interface Unit {
  id?: string;
  designation: UnitDesignation;
  unitName: string;
  pointCost: number;
  tacomDesignation: string;
  sortOrder: number;
}

// Tactical group data
export interface TacticalGroup {
  id?: string;
  groupName: string;
  groupFunction: string;
  groupNumber: number;
  sortOrder: number;
  units: Unit[];
}

// Army list data
export interface ArmyList {
  id?: string;
  faction: string;
  name: string;
  pointCap: number;
  commandPoints: number;
  armyKey?: string;
  createdAt?: string;
  tacticalGroups: TacticalGroup[];
}

// Form state for creating army list
export interface ArmyListFormData {
  faction: string;
  name: string;
  pointCap: number;
  commandPoints: number;
  armyKey: string;
  tacticalGroups: TacticalGroupFormData[];
}

export interface TacticalGroupFormData {
  groupName: string;
  groupFunction: string;
  groupNumber: number;
  units: UnitFormData[];
}

export interface UnitFormData {
  designation: UnitDesignation;
  unitName: string;
  pointCost: number;
  tacomDesignation: string;
}

// API response types
export interface CreateArmyListResponse {
  id: string;
  url: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// Faction options
export const FACTIONS = [
  { value: 'federal-states', label: 'Federal States-Army' },
  { value: 'ebon-forest', label: 'Army of the Ebon Forest' },
  { value: 'rygolic-host', label: 'The New Rygolic Host' },
  { value: 'atom-barons', label: 'Atom Barons of Santagria' },
] as const;

// Group function options
export const GROUP_FUNCTIONS = [
  'CORE',
  'SUPPORT',
  'SPECIAL',
  'RESERVE',
] as const;

// TACOM designation options
export const TACOM_DESIGNATIONS = [
  'TACOM',
  'INF',
  'ARM',
  'WT',
  'AIR',
  'ART',
  'LOG',
  'SPE',
] as const;
