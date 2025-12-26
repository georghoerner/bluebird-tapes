/**
 * Shared normalization utilities for consistent text comparison.
 */

/**
 * Normalize text for comparison across the application.
 * - Converts to lowercase
 * - Trims whitespace
 * - Normalizes curly quotes to straight quotes
 * - Normalizes curly apostrophes to straight apostrophes
 */
export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[""]/g, '"')  // Normalize curly double quotes
    .replace(/['']/g, "'"); // Normalize curly apostrophes/single quotes
}

/**
 * Normalize a unit name for comparison.
 * Alias for normalizeForComparison for backward compatibility.
 */
export function normalizeUnitName(name: string): string {
  return normalizeForComparison(name);
}
