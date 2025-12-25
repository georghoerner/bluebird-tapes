import { useState, useCallback, useEffect } from 'react';
import type { FactionData } from '../components/ArmyEditor/types';

// Available factions
const AVAILABLE_FACTIONS = [
  { id: 'all', name: 'ALL FACTIONS' },
  { id: 'federal_states', name: 'Federal States-Army' },
  { id: 'atom_barons', name: 'The Atom Barons of Santagira' },
  { id: 'ebon_forest', name: 'The Army of the Ebon Forest' },
  { id: 'rygolic_host', name: 'The New Rygolic Host' },
];

// Faction aliases for case-insensitive matching
const FACTION_ALIASES: Record<string, string[]> = {
  all: ['ALL', 'All Factions', 'Any', 'Mixed'],
  federal_states: [
    'FSA', 'F.S.A.', 'F.S-A.', 'Fed', 'Federal', 'Federal States',
    'Intermarine Federation', 'Federation', 'Cydoland', 'Vansa',
    'Riesling', 'Sumpkassel', 'Eddelaw', 'Djekker', 'Vykeland', 'Derire',
  ],
  ebon_forest: [
    'AEF', 'A.E.F.', 'Regency', 'Regency Council', 'Wolf', 'Lupar', 'Lupes',
    'Ebon', 'Forest', 'Ebon Forest', 'Wolves', 'Dogface', 'Dogfaces', 'dog', 'dogs',
  ],
  rygolic_host: [
    'NRH', 'N.R.H.', 'Rygonet', 'Net', '5G', 'Rygo', 'Rygolic',
    'man-machines', 'man machines', 'constructs', 'Rygoles', 'Nodes', 'angel', 'angels',
  ],
  atom_barons: [
    'ABS', 'A.B.S.', 'Santagrines', 'Knights', 'Commonwealth', 'yokels',
    'Barons', 'Atom Barons', 'Santagira',
  ],
};

/**
 * Match faction by alias (case-insensitive).
 * Strips leading "The " or "the " before matching.
 * Returns the faction id if matched, null otherwise.
 */
export function matchFactionByAlias(input: string): string | null {
  // Strip leading "The " or "the "
  const cleaned = input.replace(/^the\s+/i, '').trim().toLowerCase();

  if (!cleaned) return null;

  for (const [factionId, aliases] of Object.entries(FACTION_ALIASES)) {
    // Check exact alias match
    for (const alias of aliases) {
      if (alias.toLowerCase() === cleaned) {
        return factionId;
      }
    }
    // Check if input starts with alias (for partial typing)
    for (const alias of aliases) {
      if (alias.toLowerCase().startsWith(cleaned) && cleaned.length >= 2) {
        return factionId;
      }
    }
  }

  return null;
}

/**
 * Hook to load and cache faction data.
 */
export function useFactionData() {
  const [cache, setCache] = useState<Record<string, FactionData>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load a faction's data
  const loadFaction = useCallback(async (factionId: string) => {
    // Skip 'all' pseudo-faction (no JSON file)
    if (factionId === 'all') return;
    if (cache[factionId] || loading[factionId]) return;

    setLoading(prev => ({ ...prev, [factionId]: true }));

    try {
      const response = await fetch(`/data/factions/${factionId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load faction: ${factionId}`);
      }
      const data: FactionData = await response.json();
      setCache(prev => ({ ...prev, [factionId]: data }));
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [factionId]: err instanceof Error ? err.message : 'Unknown error',
      }));
    } finally {
      setLoading(prev => ({ ...prev, [factionId]: false }));
    }
  }, [cache, loading]);

  // Get faction data (returns null if not loaded)
  const getFactionData = useCallback((factionId: string): FactionData | null => {
    return cache[factionId] || null;
  }, [cache]);

  // Preload all factions
  useEffect(() => {
    AVAILABLE_FACTIONS.forEach(f => loadFaction(f.id));
  }, [loadFaction]);

  return {
    factions: AVAILABLE_FACTIONS,
    getFactionData,
    loadFaction,
    isLoading: (id: string) => loading[id] || false,
    getError: (id: string) => errors[id] || null,
  };
}
