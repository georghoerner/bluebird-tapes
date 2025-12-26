import { parser } from '../../../utils/armyListParser/parser.js';
import type {
  FactionDataConfig,
  ValidationResult,
  UnitValidation,
  StructuralError,
} from './types';
import { fuzzyMatchUnits } from './fuzzyMatch';
import { normalizeUnitName } from '../utils/normalize';

const CUSTOM_PREFIX = 'custom:';

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
 * Validate the entire document.
 */
export function validateDocument(
  content: string,
  config: FactionDataConfig
): ValidationResult {
  const unitValidations: UnitValidation[] = [];
  const structuralErrors: StructuralError[] = [];

  // Skip validation if content is empty or just whitespace
  if (!content.trim()) {
    return { unitValidations, structuralErrors };
  }

  try {
    const tree = parser.parse(content);
    const cursor = tree.cursor();

    let hasHeader = false;
    let hasHeaderInfoLine = false;

    do {
      // Track structural elements
      if (cursor.name === 'Header') {
        hasHeader = true;
      }
      if (cursor.name === 'ArmyInfoLine') {
        hasHeaderInfoLine = true;
        validateHeaderInfoLine(content, cursor.from, cursor.to, structuralErrors);
      }

      // Validate unit names
      if (cursor.name === 'Unit') {
        const unitText = content.substring(cursor.from, cursor.to);
        const validation = validateUnit(unitText, cursor.from, config);
        unitValidations.push(validation);
      }
    } while (cursor.next());

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

  return { unitValidations, structuralErrors };
}
