/**
 * PDF Text Parser for Firelock unit data
 *
 * Parses copy-pasted text from rulebook PDFs into structured JSON.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedWeapon {
  name: string;
  targets: string;        // "All", "Inf", "Vec", "Gnd", "Air", "Inf/Vec", etc.
  range: string;          // "R12"" or empty
  accuracy: string;       // "A4+/4+" or "A++/++"
  strength: string;       // "S1/1+" or "S12/18"
  damage: string;         // "D2"
  ammo?: number;          // "Ammo 6" -> 6
  abilities: string[];    // ["Turret", "Ignore Cover (1)"]
  subWeapons?: ParsedWeapon[];  // For weapons with → sub-options
}

export interface ParsedStats {
  type: string;           // "Vec", "Inf", "Air", etc.
  hull: number;           // H2 -> 2
  speed: string;          // S32"
  move: string;           // M6"
  quality: number;        // Q2 -> 2
  toughness: string;      // T8/6/5
  command?: number;       // C3 -> 3 (TACOM only)
}

export interface ParsedUnit {
  id: string;             // Generated from name
  name: string;           // TYPE 40M "VELDJEN-M"
  displayName: string;    // "VELDJEN-M" (the quoted part)
  points: number;
  unitType: string;       // "MEDIUM TANK", "TRAP", "FORTIFICATION"
  category: 'unit' | 'trap' | 'fortification';
  section?: string;       // Section this unit belongs to
  stats?: ParsedStats;
  abilities: string[];
  description?: string;   // Special rules, base size info
  weapons: ParsedWeapon[];
  rawText: string;        // Original text for debugging
}

export interface ParseResult {
  units: ParsedUnit[];
  footer?: string;        // "FEDERAL STATES-ARMY - DREKFORT M.D.C."
  errors: string[];
  warnings: string[];
}

// ============================================================================
// KEYWORD LISTS (from rulebook)
// ============================================================================

export const WEAPON_ABILITIES = [
  'Air-Filling', 'Barrage', 'Chemical Weapon', 'Defensive CC', 'Designator',
  'Discreet', 'Door Gun', 'Guided Missile', 'Heavy Indirect', 'Light Indirect',
  'Homing', 'Ignore Cover', 'Lingering', 'MCLOS', 'Melee', 'Multi-Gun', 'No CC',
  'Nuclear', 'Radius', 'Radar Anti-Air', 'Rally', 'Rear Attack', 'Saturating',
  'Scoped', 'Shaped Charge', 'Small Arm', 'Smoke', 'Strafing', 'Tracking',
  'Turret', 'Thermal Sights', 'Underbarrel', 'Undetectable'
];

export const UNIT_ABILITIES = [
  'Afterburner', 'Amphibious', 'APS', 'Assault Specialist', 'Brigade',
  'Chaff-Flares', 'Fearless', 'Loiter', 'NBC', 'Paradrop', 'PC', 'Resupply',
  'Sense', 'Tow', 'Watercraft',
  // Federal States
  'Assault Dismount', 'Chemical-SP', 'Sprint Motor', 'Steel Watchbands',
  // Ebon Forest
  'Bloodlust', 'Guidance', 'Infiltrator',
  // Rygolic Host
  'Active Camouflage', 'Drone', 'Hovercraft', 'Guided Shell', 'Laser',
  'Round Extruder', 'Rygonet', 'Strider',
  // Atom Barons
  'Leviathan', 'Flower of the Atom', 'Tercio'
];

// ============================================================================
// REGEX PATTERNS
// ============================================================================

// Unit header: TYPE 40M "VELDJEN-M" - 20 pts or NODE TEAM - 0/20 pts
const UNIT_HEADER_PATTERN = /^(.+?)\s*-\s*(\d+(?:\/\d+)?)\s*pts?\s*$/i;

// Stats line: Vec, H2, S32", M6", Q2, T8/6/5
// Note: Handle both straight and curly quotes, and '' for inches
const STATS_PATTERN = /^(Vec|Inf|Air|Vec\s*\([WHC]\)|Inf\s*\(S\)|Air\s*\(CAS\)|Air\s*\(CAP\))/i;

// Weapon stats line detection (lookahead pattern)
// Matches lines starting with target type OR range (R8", etc.)
const WEAPON_STATS_PATTERN = /^(All|Inf|Vec|Gnd|Air|Inf\/Vec|R\d)[^,]*,/i;

// Sub-weapon indicator
const SUB_WEAPON_PATTERN = /^→\s*(.+)$/;

// Footer pattern: FACTION-NAME - LOCATION
const FOOTER_PATTERN = /^[A-Z][A-Z\s]+-[A-Z]+\s+-\s+[A-Z\s.]+$/;

// Page header/footer patterns to filter out
const PAGE_HEADER_PATTERNS = [
  /^QUICK UNIT REFERENCE\s*-\s*[A-Z]-?\d+/i,
  /^FM\s+\d+-\d+-\d+[A-Z]*/i,
  /^\d+$/,  // Just page numbers
  /^TACOM$/i,  // Standalone TACOM header
];

// Category/Section indicators from Quick Reference
// Matches: "INFANTRY - Light Infantry" or "TYPE: AREA DENIAL WEAPON"
const CATEGORY_PATTERN = /^(INFANTRY|VEHICLES?|AIRCRAFT|EMPLACEMENTS?|TRAPS?|FORTIFICATIONS?)\s*[-:]\s*(.+)$/i;
const TYPE_CATEGORY_PATTERN = /^TYPE:\s*(.+)$/i;

// Standalone category words (just "VEHICLES" or "INFANTRY" on a line)
const STANDALONE_CATEGORY_PATTERN = /^(INFANTRY|VEHICLES?|AIRCRAFT|EMPLACEMENTS?|TRAPS?|FORTIFICATIONS?)$/i;

// Section marker pattern
const SECTION_MARKER_PATTERN = /^SECTION:\s*(.+)$/i;

// Separator pattern (underscore line)
const SEPARATOR_PATTERN = /^_{5,}$/;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize quotes - convert curly quotes and double single-quotes to straight quotes
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[""„‟]/g, '"')      // Curly double quotes
    .replace(/[''‚‛]/g, "'")      // Curly single quotes
    .replace(/''/g, '"')          // Double single quotes (often used for inches)
    .replace(/′′/g, '"')          // Prime symbols
    .replace(/″/g, '"');          // Double prime
}

/**
 * Check if a line should be filtered out (page headers, footers, etc.)
 */
function shouldFilterLine(line: string): boolean {
  for (const pattern of PAGE_HEADER_PATTERNS) {
    if (pattern.test(line)) return true;
  }
  return false;
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Main entry point - parse raw PDF text into structured units
 */
export function parsePdfText(text: string): ParseResult {
  const result: ParseResult = {
    units: [],
    errors: [],
    warnings: []
  };

  // Normalize quotes and line endings
  let normalizedText = normalizeQuotes(text);
  normalizedText = normalizedText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Fix common PDF copy-paste issues where lines merge
  // e.g., "UNIT__________________________" should be "UNIT\n__________________________"
  normalizedText = normalizedText.replace(/([A-Za-z0-9)])(_____)/g, '$1\n$2');
  normalizedText = normalizedText.replace(/(_____)([A-Za-z])/g, '$1\n$2');

  const lines = normalizedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => !shouldFilterLine(line));

  // Check for footer line
  const lastNonEmpty = [...lines].reverse().find(l => l.length > 0);
  if (lastNonEmpty && FOOTER_PATTERN.test(lastNonEmpty)) {
    result.footer = lastNonEmpty;
  }

  // Track current section
  let currentSection: string | undefined;

  // Split into unit blocks and track sections
  const unitBlocks = splitIntoUnitBlocks(lines, result, (section) => {
    currentSection = section;
  });

  // Parse each unit block
  let sectionForNextUnits = currentSection;
  for (const block of unitBlocks) {
    // Check if block starts with a section marker
    const sectionMatch = block.lines[0]?.match(SECTION_MARKER_PATTERN);
    if (sectionMatch) {
      sectionForNextUnits = sectionMatch[1];
      block.lines.shift(); // Remove the section line
    }

    // Check for category line
    const categoryMatch = block.lines[0]?.match(CATEGORY_PATTERN);
    if (categoryMatch) {
      sectionForNextUnits = `${categoryMatch[1]} - ${categoryMatch[2]}`;
      block.lines.shift();
    }

    // Check for TYPE: category line
    const typeMatch = block.lines[0]?.match(TYPE_CATEGORY_PATTERN);
    if (typeMatch) {
      sectionForNextUnits = `TYPE: ${typeMatch[1]}`;
      block.lines.shift();
    }

    // Check for standalone category word
    const standaloneMatch = block.lines[0]?.match(STANDALONE_CATEGORY_PATTERN);
    if (standaloneMatch) {
      sectionForNextUnits = standaloneMatch[1].toUpperCase();
      block.lines.shift();
    }

    if (block.lines.length === 0) continue;

    try {
      const unit = parseUnitBlock(block.lines, result);
      if (unit) {
        unit.section = block.section || sectionForNextUnits;
        result.units.push(unit);
      }
    } catch (err) {
      result.errors.push(`Failed to parse unit: ${err}`);
    }
  }

  return result;
}

interface UnitBlock {
  lines: string[];
  section?: string;
}

/**
 * Split lines into separate unit blocks
 */
function splitIntoUnitBlocks(
  lines: string[],
  result: ParseResult,
  onSectionChange: (section: string) => void
): UnitBlock[] {
  const blocks: UnitBlock[] = [];
  let currentBlock: string[] = [];
  let currentBlockSection: string | undefined;  // Section assigned when block started
  let currentSection: string | undefined;       // Latest section seen

  for (const line of lines) {
    // Skip empty lines at start of block
    if (currentBlock.length === 0 && line === '') continue;

    // Skip footer line
    if (result.footer && line === result.footer) continue;

    // Check for section marker
    const sectionMatch = line.match(SECTION_MARKER_PATTERN);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      onSectionChange(currentSection);
      continue;
    }

    // Check for category line (INFANTRY - Light Infantry, etc.)
    const categoryMatch = line.match(CATEGORY_PATTERN);
    if (categoryMatch) {
      currentSection = `${categoryMatch[1]} - ${categoryMatch[2]}`;
      onSectionChange(currentSection);
      continue;
    }

    // Check for TYPE: category line (TYPE: AREA DENIAL WEAPON, etc.)
    const typeMatch = line.match(TYPE_CATEGORY_PATTERN);
    if (typeMatch) {
      currentSection = `TYPE: ${typeMatch[1]}`;
      onSectionChange(currentSection);
      continue;
    }

    // Check for standalone category word (VEHICLES, INFANTRY, etc.)
    const standaloneMatch = line.match(STANDALONE_CATEGORY_PATTERN);
    if (standaloneMatch) {
      currentSection = standaloneMatch[1].toUpperCase();
      onSectionChange(currentSection);
      continue;
    }

    // Check if this starts a new unit (matches "NAME - X pts")
    if (UNIT_HEADER_PATTERN.test(line)) {
      // Save previous block if it has content
      if (currentBlock.length > 0) {
        blocks.push({ lines: currentBlock, section: currentBlockSection });
      }
      // Start new block with current section
      currentBlock = [line];
      currentBlockSection = currentSection;
    } else {
      currentBlock.push(line);
    }
  }

  // Don't forget the last block
  if (currentBlock.length > 0) {
    blocks.push({ lines: currentBlock, section: currentBlockSection });
  }

  return blocks;
}

/**
 * Parse a single unit block
 */
function parseUnitBlock(lines: string[], result: ParseResult): ParsedUnit | null {
  if (lines.length === 0) return null;

  const rawText = lines.join('\n');

  // Find separator positions
  const separatorIndices: number[] = [];
  lines.forEach((line, i) => {
    if (SEPARATOR_PATTERN.test(line)) {
      separatorIndices.push(i);
    }
  });

  if (separatorIndices.length < 1) {
    result.warnings.push(`Unit block missing separators: ${lines[0]}`);
  }

  // Parse header (before first separator)
  const headerEnd = separatorIndices[0] ?? lines.length;
  const headerLines = lines.slice(0, headerEnd);

  // Parse name and points from first line
  const headerMatch = headerLines[0]?.match(UNIT_HEADER_PATTERN);
  if (!headerMatch) {
    result.errors.push(`Invalid unit header: ${headerLines[0]}`);
    return null;
  }

  const fullName = headerMatch[1].trim();
  const points = parseInt(headerMatch[2], 10);

  // Extract display name (quoted part)
  const displayNameMatch = fullName.match(/"([^"]+)"/);
  const displayName = displayNameMatch ? displayNameMatch[1] : fullName;

  // Unit type is second line
  const unitType = headerLines[1]?.trim() || 'UNKNOWN';

  // Determine category and parse sections based on number of separators
  let category: 'unit' | 'trap' | 'fortification' = 'unit';
  let stats: ParsedStats | undefined;
  let abilities: string[] = [];
  let description: string | undefined;
  let weapons: ParsedWeapon[] = [];

  if (separatorIndices.length >= 2) {
    // Parse stats/abilities section (between first and second separator)
    const statsStart = separatorIndices[0] + 1;
    const statsEnd = separatorIndices[1];
    const statsLines = lines.slice(statsStart, statsEnd).filter(l => l && !SEPARATOR_PATTERN.test(l));

    if (statsLines.length > 0) {
      const firstStatsLine = statsLines[0];

      if (firstStatsLine === 'Trap') {
        category = 'trap';
      } else if (firstStatsLine === 'Fortification') {
        category = 'fortification';
      } else if (STATS_PATTERN.test(firstStatsLine)) {
        stats = parseStatsLine(firstStatsLine);
        // Remaining lines are abilities (may be multiline)
        abilities = parseAbilitiesLines(statsLines.slice(1));
      }
    }

    // Check if there's a third separator (description section)
    if (separatorIndices.length >= 3) {
      // Description is between second and third separator
      const descStart = separatorIndices[1] + 1;
      const descEnd = separatorIndices[2];
      const descLines = lines.slice(descStart, descEnd).filter(l => l && !SEPARATOR_PATTERN.test(l));
      if (descLines.length > 0) {
        description = descLines.join(' ');
      }

      // Weapons are after third separator
      const weaponsStart = separatorIndices[2] + 1;
      const weaponsLines = lines.slice(weaponsStart).filter(l => l && !SEPARATOR_PATTERN.test(l) && !FOOTER_PATTERN.test(l));
      weapons = parseWeaponsSection(weaponsLines, result);
    } else {
      // Only 2 separators - weapons are after second separator
      const weaponsStart = separatorIndices[1] + 1;
      const weaponsLines = lines.slice(weaponsStart).filter(l => l && !SEPARATOR_PATTERN.test(l) && !FOOTER_PATTERN.test(l));

      if (category === 'fortification' || category === 'trap') {
        // For traps/fortifications, this section might be description OR weapons
        // Check if first line looks like a weapon
        if (weaponsLines.length > 0 && weaponsLines[1] && WEAPON_STATS_PATTERN.test(weaponsLines[1])) {
          weapons = parseWeaponsSection(weaponsLines, result);
        } else {
          description = weaponsLines.join(' ');
        }
      } else {
        weapons = parseWeaponsSection(weaponsLines, result);
      }
    }
  } else if (separatorIndices.length === 1) {
    // Only one separator - everything after is either stats+weapons or description
    const afterSep = lines.slice(separatorIndices[0] + 1).filter(l => l && !SEPARATOR_PATTERN.test(l) && !FOOTER_PATTERN.test(l));

    if (afterSep.length > 0 && STATS_PATTERN.test(afterSep[0])) {
      stats = parseStatsLine(afterSep[0]);
      abilities = parseAbilitiesLines(afterSep.slice(1));
    } else {
      description = afterSep.join(' ');
    }
  }

  // Generate ID from name
  const id = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return {
    id,
    name: fullName,
    displayName,
    points,
    unitType,
    category,
    stats,
    abilities,
    description,
    weapons,
    rawText
  };
}

/**
 * Parse stats line like: Vec, H2, S32", M6", Q2, T8/6/5, C3
 */
function parseStatsLine(line: string): ParsedStats {
  // Normalize the line first
  const normalizedLine = normalizeQuotes(line);
  const parts = normalizedLine.split(',').map(p => p.trim());

  const stats: ParsedStats = {
    type: parts[0] || 'Unknown',
    hull: 0,
    speed: '',
    move: '',
    quality: 0,
    toughness: ''
  };

  for (const part of parts.slice(1)) {
    const p = part.trim();
    if (p.startsWith('H') && /^H\d/.test(p)) {
      stats.hull = parseInt(p.slice(1), 10) || 0;
    } else if (p.startsWith('S') && /^S\d/.test(p)) {
      stats.speed = p;
    } else if (p.startsWith('M') && /^M\d/.test(p)) {
      stats.move = p;
    } else if (p.startsWith('Q') && /^Q\d/.test(p)) {
      stats.quality = parseInt(p.slice(1), 10) || 0;
    } else if (p.startsWith('T') && /^T\d/.test(p)) {
      stats.toughness = p;
    } else if (p.startsWith('C') && /^C\d/.test(p)) {
      stats.command = parseInt(p.slice(1), 10) || 0;
    }
  }

  return stats;
}

/**
 * Parse ability lines (handles multiline abilities)
 */
function parseAbilitiesLines(lines: string[]): string[] {
  // Join all lines, then split by comma
  const combined = lines.join(' ').trim();
  if (!combined) return [];

  // Split by comma but preserve parenthetical content
  const abilities: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of combined) {
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;

    if (char === ',' && parenDepth === 0) {
      if (current.trim()) {
        abilities.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    abilities.push(current.trim());
  }

  return abilities;
}

/**
 * Parse weapons section using state machine
 */
function parseWeaponsSection(lines: string[], result: ParseResult): ParsedWeapon[] {
  const weapons: ParsedWeapon[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Check if this is a sub-weapon (belongs to previous weapon)
    if (SUB_WEAPON_PATTERN.test(line)) {
      if (weapons.length > 0) {
        const parentWeapon = weapons[weapons.length - 1];
        const subWeapon = parseSubWeapon(lines, i, result);
        if (subWeapon) {
          parentWeapon.subWeapons = parentWeapon.subWeapons || [];
          parentWeapon.subWeapons.push(subWeapon.weapon);
          i = subWeapon.nextIndex;
          continue;
        }
      }
      i++;
      continue;
    }

    // Check if next line looks like weapon stats
    const nextLine = lines[i + 1];
    if (nextLine && WEAPON_STATS_PATTERN.test(nextLine)) {
      // This line is a weapon name
      const weaponResult = parseWeapon(lines, i, result);
      if (weaponResult) {
        weapons.push(weaponResult.weapon);
        i = weaponResult.nextIndex;
        continue;
      }
    }

    // If we have a current weapon, this line might be a continuation of abilities
    if (weapons.length > 0) {
      const lastWeapon = weapons[weapons.length - 1];
      // Check if this looks like weapon abilities
      const abilityTokens = parseWeaponAbilityLine(line);
      if (abilityTokens.length > 0) {
        lastWeapon.abilities.push(...abilityTokens);
      }
    }

    i++;
  }

  return weapons;
}

/**
 * Parse a single weapon starting at given index
 */
function parseWeapon(
  lines: string[],
  startIndex: number,
  _result: ParseResult
): { weapon: ParsedWeapon; nextIndex: number } | null {
  const name = lines[startIndex];
  const statsLine = lines[startIndex + 1];

  if (!name || !statsLine) return null;

  const weapon = parseWeaponStats(name, statsLine);

  // Collect ability lines until we hit another weapon or sub-weapon
  let i = startIndex + 2;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Check if this is a new weapon or sub-weapon
    if (SUB_WEAPON_PATTERN.test(line)) break;

    const nextLine = lines[i + 1];
    if (nextLine && WEAPON_STATS_PATTERN.test(nextLine)) break;

    // Otherwise, treat as ability continuation
    const abilityTokens = parseWeaponAbilityLine(line);
    if (abilityTokens.length > 0) {
      weapon.abilities.push(...abilityTokens);
    }

    i++;
  }

  return { weapon, nextIndex: i };
}

/**
 * Parse a sub-weapon (→ prefix)
 */
function parseSubWeapon(
  lines: string[],
  startIndex: number,
  _result: ParseResult
): { weapon: ParsedWeapon; nextIndex: number } | null {
  const match = lines[startIndex].match(SUB_WEAPON_PATTERN);
  if (!match) return null;

  const name = match[1];
  const statsLine = lines[startIndex + 1];

  if (!statsLine) {
    return {
      weapon: {
        name,
        targets: '',
        range: '',
        accuracy: '',
        strength: '',
        damage: '',
        abilities: []
      },
      nextIndex: startIndex + 1
    };
  }

  // Sub-weapon stats are often abbreviated (no targets prefix)
  const weapon = parseSubWeaponStats(name, statsLine);

  // Collect ability lines
  let i = startIndex + 2;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Check if this is a new weapon or sub-weapon
    if (SUB_WEAPON_PATTERN.test(line)) break;

    const nextLine = lines[i + 1];
    if (nextLine && WEAPON_STATS_PATTERN.test(nextLine)) break;

    const abilityTokens = parseWeaponAbilityLine(line);
    if (abilityTokens.length > 0) {
      weapon.abilities.push(...abilityTokens);
    }

    i++;
  }

  return { weapon, nextIndex: i };
}

/**
 * Parse weapon stats line: All, R12", A4+/4+, S1/1+, D2, Ammo 6
 */
function parseWeaponStats(name: string, statsLine: string): ParsedWeapon {
  const weapon: ParsedWeapon = {
    name,
    targets: '',
    range: '',
    accuracy: '',
    strength: '',
    damage: '',
    abilities: []
  };

  const normalizedLine = normalizeQuotes(statsLine);
  const parts = normalizedLine.split(',').map(p => p.trim());

  for (const part of parts) {
    if (/^(All|Inf|Vec|Gnd|Air|Inf\/Vec)/.test(part)) {
      weapon.targets = part;
    } else if (/^R\d/.test(part)) {
      weapon.range = part;
    } else if (/^A[\d+*]/.test(part)) {
      weapon.accuracy = part;
    } else if (/^S[\d+]/.test(part)) {
      weapon.strength = part;
    } else if (/^D\d/.test(part)) {
      weapon.damage = part;
    } else if (part.startsWith('Ammo')) {
      weapon.ammo = parseInt(part.replace('Ammo', '').trim(), 10) || undefined;
    } else if (part.trim()) {
      // Treat as ability
      weapon.abilities.push(part);
    }
  }

  return weapon;
}

/**
 * Parse sub-weapon stats (often abbreviated format)
 */
function parseSubWeaponStats(name: string, statsLine: string): ParsedWeapon {
  const weapon: ParsedWeapon = {
    name,
    targets: '',
    range: '',
    accuracy: '',
    strength: '',
    damage: '',
    abilities: []
  };

  const normalizedLine = normalizeQuotes(statsLine);
  const parts = normalizedLine.split(',').map(p => p.trim());

  for (const part of parts) {
    if (/^(All|Inf|Vec|Gnd|Air|Inf\/Vec)/.test(part)) {
      weapon.targets = part;
    } else if (/^R\d/.test(part)) {
      weapon.range = part;
    } else if (/^A[\d+*]/.test(part)) {
      weapon.accuracy = part;
    } else if (/^S[\d+]/.test(part)) {
      weapon.strength = part;
    } else if (/^D\d/.test(part)) {
      weapon.damage = part;
    } else if (part.startsWith('Ammo')) {
      weapon.ammo = parseInt(part.replace('Ammo', '').trim(), 10) || undefined;
    } else if (part.trim()) {
      weapon.abilities.push(part);
    }
  }

  return weapon;
}

/**
 * Parse a line that may contain weapon abilities
 */
function parseWeaponAbilityLine(line: string): string[] {
  if (!line.trim()) return [];

  // Split by comma, preserving parenthetical content
  const abilities: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of line) {
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;

    if (char === ',' && parenDepth === 0) {
      if (current.trim()) {
        abilities.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    abilities.push(current.trim());
  }

  return abilities;
}

/**
 * Generate JSON output for a faction file
 */
export function generateFactionJson(
  factionId: string,
  factionName: string,
  units: ParsedUnit[],
  section?: string
): string {
  const output = {
    factionId,
    factionName,
    section: section || undefined,
    generatedAt: new Date().toISOString(),
    units: units.map(unit => ({
      id: unit.id,
      name: unit.name,
      displayName: unit.displayName,
      points: unit.points,
      unitType: unit.unitType,
      category: unit.category,
      section: unit.section,
      stats: unit.stats,
      abilities: unit.abilities,
      description: unit.description,
      weapons: unit.weapons.map(w => ({
        name: w.name,
        targets: w.targets,
        range: w.range,
        accuracy: w.accuracy,
        strength: w.strength,
        damage: w.damage,
        ammo: w.ammo,
        abilities: w.abilities,
        subWeapons: w.subWeapons
      }))
    }))
  };

  return JSON.stringify(output, null, 2);
}
