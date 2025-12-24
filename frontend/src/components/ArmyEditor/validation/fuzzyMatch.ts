export interface FuzzyMatch {
  name: string;
  displayName: string;
  score: number;
  distance: number;
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find fuzzy matches for a query string among candidate unit names.
 * Returns matches sorted by relevance score (best first).
 */
export function fuzzyMatchUnits(
  query: string,
  candidates: Array<{ name: string; displayName: string }>,
  maxResults: number = 5
): FuzzyMatch[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (normalizedQuery.length < 2) return [];

  const matches: FuzzyMatch[] = candidates.map((candidate) => {
    const normalizedName = candidate.name.toLowerCase();
    const distance = levenshteinDistance(normalizedQuery, normalizedName);

    // Calculate score (lower is better)
    let score = distance;

    // Bonus for prefix match
    if (normalizedName.startsWith(normalizedQuery)) {
      score -= 3;
    }

    // Bonus for containing query as substring
    if (normalizedName.includes(normalizedQuery)) {
      score -= 2;
    }

    // Penalty for very different lengths
    const lengthDiff = Math.abs(normalizedName.length - normalizedQuery.length);
    score += lengthDiff * 0.3;

    return {
      name: candidate.name,
      displayName: candidate.displayName,
      score,
      distance,
    };
  });

  // Filter out poor matches and sort by score
  const maxDistance = Math.max(normalizedQuery.length * 0.6, 4);
  return matches
    .filter((m) => m.distance <= maxDistance)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxResults);
}
