import { parser } from '../../../utils/armyListParser/parser.js';
import type {
  FactionDataConfig,
  ValidationResult,
  UnitValidation,
  StructuralError,
  TransportError,
} from './types';
import type { Unit } from '../types';
import { fuzzyMatchUnits } from './fuzzyMatch';
import { normalizeUnitName } from '../utils/normalize';

const CUSTOM_PREFIX = 'custom:';

// Transport capability helpers

/**
 * Get embark capacity from unit abilities (e.g., "PC (2, Rear)" -> 2)
 */
function getEmbarkCapacity(unit: Unit): number {
  const pcAbility = unit.abilities?.find(a => /PC\s*\(\s*(\d+)/i.test(a));
  if (pcAbility) {
    const match = pcAbility.match(/PC\s*\(\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }
  return 0;
}

/**
 * Get tow capacity from unit abilities (e.g., "Tow (3)" -> 3)
 */
function getTowCapacity(unit: Unit): number {
  const towAbility = unit.abilities?.find(a => /Tow\s*\(\s*(\d+)\s*\)/i.test(a));
  if (towAbility) {
    const match = towAbility.match(/Tow\s*\(\s*(\d+)\s*\)/i);
    return match ? parseInt(match[1], 10) : 0;
  }
  return 0;
}

/**
 * Check if unit is a towable carriage (Vec (C) in stats.type)
 */
function isTowable(unit: Unit): boolean {
  return unit.stats?.type?.includes('(C)') || false;
}

/**
 * Check if unit is an aircraft (cannot carry desanting/embarked)
 */
function isAircraft(unit: Unit): boolean {
  const type = unit.stats?.type?.toLowerCase() || '';
  const unitType = unit.unitType?.toLowerCase() || '';
  return type.includes('air') || unitType.includes('aircraft') || unitType.includes('helicopter');
}

/**
 * Check if unit is a ground vehicle (can carry desanting infantry)
 * All ground vehicles are "Personnel Carriers 2" by default
 */
function isGroundVehicle(unit: Unit): boolean {
  const type = unit.stats?.type?.toLowerCase() || '';
  return type.includes('vec') && !isAircraft(unit);
}

/**
 * Extract unit name from a unit line text.
 * Handles formats like:
 * - "P1 PARALLAX - 35 pts"
 * - "P1 PARALLAX - 35 pts (TACOM)"
 * - "P1 PARALLAX - 35 pts (x2)"
 */
function extractUnitName(unitText: string): string {
  // Match everything before " - NUMBER pts/PTS"
  const match = unitText.match(/^(.+?)\s*-\s*\d+\s*(?:pts|PTS|points|POINTS)/i);
  if (match) {
    return match[1].trim();
  }
  // Fallback: split on " - " and take first part
  const parts = unitText.split(/\s+-\s+/);
  return parts[0].trim();
}

/**
 * Find the position of the unit name within the full unit text.
 * Returns from/to positions relative to document start.
 */
function findNamePosition(
  unitText: string,
  unitFrom: number
): { from: number; to: number } {
  const name = extractUnitName(unitText);
  const nameIndex = unitText.indexOf(name);
  return {
    from: unitFrom + (nameIndex >= 0 ? nameIndex : 0),
    to: unitFrom + (nameIndex >= 0 ? nameIndex : 0) + name.length,
  };
}

/**
 * Validate a single unit against faction data.
 */
function validateUnit(
  unitText: string,
  unitFrom: number,
  config: FactionDataConfig
): UnitValidation {
  const rawName = extractUnitName(unitText);
  const normalizedName = normalizeUnitName(rawName);
  const { from, to } = findNamePosition(unitText, unitFrom);

  // Check for custom prefix (case-insensitive)
  if (normalizedName.startsWith(CUSTOM_PREFIX.toLowerCase())) {
    return {
      from,
      to,
      name: rawName,
      normalizedName,
      status: 'custom',
    };
  }

  // Check if unit exists anywhere (by name or displayName)
  const matchedUnit = config.allUnits.get(normalizedName);
  const matchedFaction = config.unitToFaction.get(normalizedName);

  if (!matchedUnit) {
    // Unknown unit - generate suggestions
    const candidates = Array.from(config.allUnits.values()).map((u) => ({
      name: u.name,
      displayName: u.displayName,
    }));
    // Deduplicate candidates by displayName
    const uniqueCandidates = candidates.filter(
      (c, i, arr) => arr.findIndex((x) => x.displayName === c.displayName) === i
    );
    const suggestions = fuzzyMatchUnits(rawName, uniqueCandidates, 5).map(
      (m) => m.displayName
    );

    return {
      from,
      to,
      name: rawName,
      normalizedName,
      status: 'unknown',
      suggestions,
    };
  }

  // Check if unit is in selected faction
  if (config.selectedFaction && !config.selectedFactionUnits.has(normalizedName)) {
    return {
      from,
      to,
      name: rawName,
      normalizedName,
      status: 'cross-faction',
      matchedUnit,
      matchedFaction,
    };
  }

  return {
    from,
    to,
    name: rawName,
    normalizedName,
    status: 'valid',
    matchedUnit,
    matchedFaction,
  };
}

/**
 * Validate the HeaderInfoLine for proper format.
 */
function validateHeaderInfoLine(
  content: string,
  from: number,
  to: number,
  errors: StructuralError[]
): void {
  const lineText = content.substring(from, to);

  // Check for proper points format
  if (!/\d+\s*(?:pts|PTS|points|POINTS)/i.test(lineText)) {
    errors.push({
      type: 'malformed-points',
      from,
      to,
      message: 'Header should include points (e.g., "100 PTS")',
    });
  }
}

/**
 * Parsed unit information for transport validation.
 */
interface ParsedUnit {
  from: number;
  to: number;
  name: string;
  mountType: 'D' | 'E' | 'T' | null;
  unit: Unit | null;
}

/**
 * Parse a line to extract mount type prefix (e.g., "- [D]", "- [E]", "- [T]")
 */
function parseMountType(lineText: string): 'D' | 'E' | 'T' | null {
  const match = lineText.match(/^-\s*\[([DET])\]/i);
  if (match) {
    return match[1].toUpperCase() as 'D' | 'E' | 'T';
  }
  return null;
}

/**
 * Validate transport relationships between mounted units and their parent vehicles.
 */
function validateTransport(
  parsedUnits: ParsedUnit[],
  transportErrors: TransportError[]
): void {
  let lastVehicle: ParsedUnit | null = null;
  const desantCount = new Map<ParsedUnit, number>();
  const embarkCount = new Map<ParsedUnit, number>();
  const towCount = new Map<ParsedUnit, number>();

  for (const pu of parsedUnits) {
    // Non-mounted unit becomes potential parent vehicle
    if (!pu.mountType) {
      lastVehicle = pu;
      continue;
    }

    // Mounted unit - validate against last vehicle
    const mountType = pu.mountType;

    if (!lastVehicle || !lastVehicle.unit) {
      transportErrors.push({
        type: 'no-vehicle',
        from: pu.from,
        to: pu.to,
        message: `[${mountType}] ${pu.name} has no vehicle to mount on`,
        mountType,
        unitName: pu.name,
      });
      continue;
    }

    const vehicle = lastVehicle.unit;

    if (mountType === 'D') {
      // Desanting: All ground vehicles are PC 2 by default
      if (!isGroundVehicle(vehicle)) {
        transportErrors.push({
          type: 'invalid-desant',
          from: pu.from,
          to: pu.to,
          message: `Cannot desant on ${lastVehicle.name} (not a ground vehicle)`,
          mountType,
          unitName: pu.name,
          vehicleName: lastVehicle.name,
        });
      } else {
        // Check desant capacity (default 2)
        const count = (desantCount.get(lastVehicle) || 0) + 1;
        desantCount.set(lastVehicle, count);
        if (count > 2) {
          transportErrors.push({
            type: 'capacity-exceeded',
            from: pu.from,
            to: pu.to,
            message: `${lastVehicle.name} can only carry 2 desanting units`,
            mountType,
            unitName: pu.name,
            vehicleName: lastVehicle.name,
          });
        }
      }
    } else if (mountType === 'E') {
      // Embarked: Requires PC(X) ability
      const capacity = getEmbarkCapacity(vehicle);
      if (capacity === 0) {
        transportErrors.push({
          type: 'invalid-embark',
          from: pu.from,
          to: pu.to,
          message: `${lastVehicle.name} cannot carry embarked units (no PC ability)`,
          mountType,
          unitName: pu.name,
          vehicleName: lastVehicle.name,
        });
      } else {
        const count = (embarkCount.get(lastVehicle) || 0) + 1;
        embarkCount.set(lastVehicle, count);
        if (count > capacity) {
          transportErrors.push({
            type: 'capacity-exceeded',
            from: pu.from,
            to: pu.to,
            message: `${lastVehicle.name} can only carry ${capacity} embarked unit(s)`,
            mountType,
            unitName: pu.name,
            vehicleName: lastVehicle.name,
          });
        }
      }
    } else if (mountType === 'T') {
      // Towed: Vehicle needs Tow(X), mounted unit needs Vec(C)
      const towCapacity = getTowCapacity(vehicle);
      if (towCapacity === 0) {
        transportErrors.push({
          type: 'invalid-tow',
          from: pu.from,
          to: pu.to,
          message: `${lastVehicle.name} cannot tow (no Tow ability)`,
          mountType,
          unitName: pu.name,
          vehicleName: lastVehicle.name,
        });
      } else if (pu.unit && !isTowable(pu.unit)) {
        transportErrors.push({
          type: 'invalid-tow',
          from: pu.from,
          to: pu.to,
          message: `${pu.name} cannot be towed (not a Vec (C) carriage)`,
          mountType,
          unitName: pu.name,
          vehicleName: lastVehicle.name,
        });
      } else {
        const count = (towCount.get(lastVehicle) || 0) + 1;
        towCount.set(lastVehicle, count);
        if (count > towCapacity) {
          transportErrors.push({
            type: 'capacity-exceeded',
            from: pu.from,
            to: pu.to,
            message: `${lastVehicle.name} can only tow ${towCapacity} unit(s)`,
            mountType,
            unitName: pu.name,
            vehicleName: lastVehicle.name,
          });
        }
      }
    }
  }
}

/**
 * Validate the entire document.
 */
export function validateDocument(
  content: string,
  config: FactionDataConfig
): ValidationResult {
  const unitValidations: UnitValidation[] = [];
  const structuralErrors: StructuralError[] = [];
  const transportErrors: TransportError[] = [];

  // Skip validation if content is empty or just whitespace
  if (!content.trim()) {
    return { unitValidations, structuralErrors, transportErrors };
  }

  try {
    const tree = parser.parse(content);
    const cursor = tree.cursor();

    let hasHeader = false;
    let hasHeaderInfoLine = false;

    // Collect parsed units for transport validation
    const parsedUnits: ParsedUnit[] = [];

    do {
      // Track structural elements
      if (cursor.name === 'Header') {
        hasHeader = true;
      }
      if (cursor.name === 'ArmyInfoLine') {
        hasHeaderInfoLine = true;
        validateHeaderInfoLine(content, cursor.from, cursor.to, structuralErrors);
      }

      // Validate unit names and collect for transport validation
      if (cursor.name === 'Unit') {
        const unitText = content.substring(cursor.from, cursor.to);
        const validation = validateUnit(unitText, cursor.from, config);
        unitValidations.push(validation);

        // Get the line containing this unit to check for mount prefix
        const lineStart = content.lastIndexOf('\n', cursor.from) + 1;
        const lineText = content.substring(lineStart, cursor.to);
        const mountType = parseMountType(lineText);

        parsedUnits.push({
          from: cursor.from,
          to: cursor.to,
          name: validation.name,
          mountType,
          unit: validation.matchedUnit || null,
        });
      }
    } while (cursor.next());

    // Validate transport relationships
    validateTransport(parsedUnits, transportErrors);

    // Check for missing structural elements (only if there's actual content)
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length >= 1 && !hasHeader) {
      structuralErrors.push({
        type: 'missing-faction',
        from: 0,
        to: Math.min(content.length, content.indexOf('\n') || content.length),
        message: 'Document should start with faction name',
      });
    }

    if (hasHeader && !hasHeaderInfoLine) {
      structuralErrors.push({
        type: 'missing-header',
        from: 0,
        to: Math.min(content.length, 50),
        message: 'Missing points/command line (e.g., "ARMY NAME - 100 PTS, 3 COMMAND")',
      });
    }
  } catch (e) {
    // Parser error - document is malformed, skip validation
  }

  return { unitValidations, structuralErrors, transportErrors };
}
