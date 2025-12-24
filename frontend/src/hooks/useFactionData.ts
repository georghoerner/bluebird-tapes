import { useState, useCallback, useEffect } from 'react';
import type { FactionData } from '../components/ArmyEditor/types';

// Available factions
const AVAILABLE_FACTIONS = [
  { id: 'federal_states', name: 'Federal States-Army' },
  { id: 'atom_barons', name: 'The Atom Barons of Santagira' },
  { id: 'ebon_forest', name: 'The Army of the Ebon Forest' },
  { id: 'rygolic_host', name: 'The New Rygolic Host' },


];

/**
 * Hook to load and cache faction data.
 */
export function useFactionData() {
  const [cache, setCache] = useState<Record<string, FactionData>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load a faction's data
  const loadFaction = useCallback(async (factionId: string) => {
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
