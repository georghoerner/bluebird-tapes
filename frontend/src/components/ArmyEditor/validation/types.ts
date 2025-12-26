import type { Unit } from '../types';

export interface FactionDataConfig {
  /** All units across all factions, keyed by normalized name (lowercase) */
  allUnits: Map<string, Unit>;
  /** Currently selected faction ID */
  selectedFaction: string | null;
  /** Normalized names of units in selected faction */
  selectedFactionUnits: Set<string>;
  /** Map unit normalized name to faction ID */
  unitToFaction: Map<string, string>;
}

export type ValidationStatus = 'valid' | 'cross-faction' | 'unknown' | 'custom';

export interface UnitValidation {
  /** Start position of unit name in document */
  from: number;
  /** End position of unit name */
  to: number;
  /** Original name text */
  name: string;
  /** Lowercase, trimmed name */
  normalizedName: string;
  /** Validation result */
  status: ValidationStatus;
  /** The matched unit if found */
  matchedUnit?: Unit;
  /** Faction ID where unit was found */
  matchedFaction?: string;
  /** Fuzzy match suggestions for unknown units */
  suggestions?: string[];
}

export interface StructuralError {
  type: 'missing-faction' | 'missing-header' | 'malformed-points';
  from: number;
  to: number;
  message: string;
}

export interface TransportError {
  type: 'no-vehicle' | 'invalid-desant' | 'invalid-embark' | 'invalid-tow' | 'capacity-exceeded';
  from: number;
  to: number;
  message: string;
  mountType: 'D' | 'E' | 'T';
  unitName: string;
  vehicleName?: string;
}

export interface ValidationResult {
  unitValidations: UnitValidation[];
  structuralErrors: StructuralError[];
  transportErrors: TransportError[];
}
