import { LRLanguage, LanguageSupport } from '@codemirror/language';
import { styleTags, tags } from '@lezer/highlight';
import { parser } from '../../utils/armyListParser/parser.js';

// Map grammar node types to highlight tags
const armyListHighlighting = styleTags({
  // Header elements
  Header: tags.heading,
  FactionLine: tags.heading,
  FactionName: tags.heading,
  ArmyInfoLine: tags.meta,
  ArmyName: tags.meta,

  // Unit name - bright amber
  Name: tags.name,

  // Numbers (points, command points, multipliers)
  Number: tags.number,

  // Markers and keywords
  PointsMarker: tags.keyword,
  CommandMarker: tags.keyword,
  TacomMarker: tags.modifier,
  MultiplierMarker: tags.operator,

  // Designations [E], [D], [T], [1]-[9]
  MountedPrefix: tags.bracket,

  // Delineators and separators
  Delineator: tags.separator,
  DelineatorLine: tags.separator,
  DelineatorChar: tags.separator,

  // Structural elements - use variableName for definition-like things
  TacticalGroup: tags.variableName,
  UnitComplex: tags.literal,
  Unit: tags.literal,
  MountedUnitLine: tags.literal,

  // Modifiers
  TacomDesignator: tags.modifier,
  Multiplier: tags.operator,
  CommandClause: tags.meta,
});

// Create the language with highlighting
const armyListLanguage = LRLanguage.define({
  name: 'armyList',
  parser: parser.configure({
    props: [armyListHighlighting],
  }),
  languageData: {
    commentTokens: {},
  },
});

// Export language support for use in CodeMirror
export function armyList(): LanguageSupport {
  return new LanguageSupport(armyListLanguage);
}

export { armyListLanguage };
