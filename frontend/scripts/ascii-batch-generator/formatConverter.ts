/**
 * Convert AsciiChar[][] output to ASCII_FORMAT JSON
 */

export interface AsciiChar {
  char: string;
  fgColor: string | null;  // null = transparent
  bgColor: string | null;  // null = transparent
}

export interface AsciiFormatJson {
  version: number;
  unit_id: string;
  width: number;
  height: number;
  fg_palette: string[];
  bg_palette: string[];
  data: string[];
}

/**
 * Convert RGB string "rgb(r, g, b)" to hex "#RRGGBB"
 */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb; // Already hex or invalid

  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Convert AsciiChar[][] to indexed ASCII_FORMAT JSON
 */
export function convertToAsciiFormat(
  unitId: string,
  width: number,
  asciiChars: AsciiChar[][]
): AsciiFormatJson {
  const height = asciiChars.length;

  // Build unique palettes (using hex colors)
  const fgSet = new Map<string, number>();
  const bgSet = new Map<string, number>();

  // First pass: collect unique colors (skip transparent cells)
  for (const row of asciiChars) {
    for (const cell of row) {
      // Skip transparent cells
      if (cell.fgColor === null || cell.bgColor === null) {
        continue;
      }

      const fgHex = rgbToHex(cell.fgColor);
      const bgHex = rgbToHex(cell.bgColor);

      if (!fgSet.has(fgHex)) {
        fgSet.set(fgHex, fgSet.size);
      }
      if (!bgSet.has(bgHex)) {
        bgSet.set(bgHex, bgSet.size);
      }
    }
  }

  const fg_palette = Array.from(fgSet.keys());
  const bg_palette = Array.from(bgSet.keys());

  // Second pass: build indexed data rows
  const data = asciiChars.map(row =>
    row.map(cell => {
      // Transparent cells use -1 indices
      if (cell.fgColor === null || cell.bgColor === null) {
        return `-1,-1, `;
      }

      const fgHex = rgbToHex(cell.fgColor);
      const bgHex = rgbToHex(cell.bgColor);
      const fgIdx = fgSet.get(fgHex) ?? 0;
      const bgIdx = bgSet.get(bgHex) ?? 0;

      // Escape pipe character if it appears in the char
      const safeChar = cell.char === '|' ? '\\|' : cell.char;

      return `${fgIdx},${bgIdx},${safeChar}`;
    }).join('|')
  );

  return {
    version: 1,
    unit_id: unitId,
    width,
    height,
    fg_palette,
    bg_palette,
    data,
  };
}
