import { Facet } from '@codemirror/state';
import type { FactionDataConfig } from './types';

const defaultConfig: FactionDataConfig = {
  allUnits: new Map(),
  selectedFaction: null,
  selectedFactionUnits: new Set(),
  unitToFaction: new Map(),
};

/**
 * Facet to provide faction data to the validation plugin.
 * Use with a Compartment to update when React state changes.
 */
export const factionDataFacet = Facet.define<FactionDataConfig, FactionDataConfig>({
  combine: (values) => values[0] ?? defaultConfig,
});

/**
 * Facet to control debug logging in CodeMirror plugins.
 */
export const debugModeFacet = Facet.define<boolean, boolean>({
  combine: (values) => values[0] ?? false,
});
