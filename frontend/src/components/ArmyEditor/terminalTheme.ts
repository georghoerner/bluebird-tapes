import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Terminal color variables (matching index.css)
const colors = {
  fg: '#FFB000',
  bg: '#1A1100',
  dim: '#805800',
  bright: '#FFCC00',
  error: '#FF6B6B',
  glow: 'rgba(255, 176, 0, 0.15)',
  glowStrong: 'rgba(255, 176, 0, 0.3)',
};

// CodeMirror theme matching terminal aesthetic
export const terminalTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: colors.fg,
    fontFamily: "'IBM VGA', 'Courier New', monospace",
    fontSize: '16px',
    lineHeight: '1.2',
  },
  '.cm-content': {
    caretColor: colors.fg,
    fontFamily: "'IBM VGA', 'Courier New', monospace",
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: colors.fg,
    borderLeftWidth: '0.6em',
    borderLeftStyle: 'solid',
    marginLeft: '-0.3em',
  },
  '&.cm-focused .cm-cursor': {
    animation: 'cm-blink 1s step-end infinite',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: `${colors.fg} !important`,
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: colors.fg,
  },
  '.cm-selectionMatch': {
    backgroundColor: colors.glowStrong,
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  // Error gutter styling
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    width: '20px',
  },
  '.cm-gutter-error': {
    width: '16px',
  },
  '.cm-error-marker': {
    color: colors.error,
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center',
    cursor: 'default',
  },
  '.cm-warning-marker': {
    color: colors.bright,
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center',
    cursor: 'default',
  },
  // Scrollbar styling
  '.cm-scroller': {
    fontFamily: "'IBM VGA', 'Courier New', monospace",
    overflow: 'auto',
  },
  // Line wrapping
  '.cm-line': {
    padding: '0',
  },
  // Placeholder text
  '.cm-placeholder': {
    color: colors.dim,
  },
  // Focus outline
  '&.cm-focused': {
    outline: 'none',
  },
  // Validation decoration styles
  '.cm-validation-unknown': {
    textDecoration: 'underline wavy',
    textDecorationColor: colors.error,
    animation: 'cm-error-blink 0.6s step-end infinite',
  },
  '.cm-validation-cross-faction': {
    backgroundColor: 'rgba(255, 176, 0, 0.2)',
    animation: 'cm-warning-blink 0.8s step-end infinite',
  },
  '.cm-validation-structural': {
    textDecoration: 'underline wavy',
    textDecorationColor: colors.error,
  },
  '.cm-validation-transport': {
    textDecoration: 'underline wavy',
    textDecorationColor: colors.error,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  // Validation tooltip styles
  '.cm-tooltip.cm-tooltip-hover': {
    backgroundColor: colors.bg,
    border: `1px solid ${colors.fg}`,
    padding: '0',
    boxShadow: `0 0 8px ${colors.glow}`,
  },
  '.cm-validation-tooltip': {
    backgroundColor: colors.bg,
    padding: '6px 10px',
    fontFamily: "'IBM VGA', 'Courier New', monospace",
    fontSize: '14px',
    color: colors.fg,
    maxWidth: '280px',
  },
  '.cm-validation-tooltip-title': {
    color: colors.dim,
    marginBottom: '4px',
  },
  '.cm-validation-tooltip-list': {
    margin: '0',
    padding: '0',
    listStyle: 'none',
  },
  '.cm-validation-tooltip-list li': {
    padding: '2px 0',
  },
  '.cm-validation-tooltip-list li::before': {
    content: '">"',
    marginRight: '6px',
    color: colors.dim,
  },
  '.cm-validation-tooltip-warning': {
    color: colors.bright,
  },
}, { dark: true });

// Syntax highlighting styles for army list tokens
export const terminalHighlightStyle = HighlightStyle.define([
  // Header - normal amber with glow
  { tag: tags.heading,
    color: colors.fg,
    textShadow: `0 0 2px ${colors.fg}, 0 0 4px ${colors.glow}`,
  },

  // Meta info (header info line, command clause) - dim
  { tag: tags.meta, color: colors.dim },

  // Unit names - bright amber (removed inversion as it conflicts with validation marks)
  { tag: tags.name,
    color: colors.bright,
  },

  // Points/numbers - bright amber
  { tag: tags.number, color: colors.bright },

  // Designations [E], [D], [T] - bright amber, bold
  { tag: tags.bracket, color: colors.bright, fontWeight: 'bold' },

  // Keywords (PTS, COMMAND) - bright
  { tag: tags.keyword, color: colors.bright },

  // TACOM marker - dim
  { tag: tags.modifier, color: colors.dim },

  // Multiplier (x2) - dim
  { tag: tags.operator, color: colors.dim },

  // Delineator lines (---) - dim
  { tag: tags.separator, color: colors.dim },

  // Definition (tactical group) - normal amber
  { tag: tags.definition(tags.variableName), color: colors.fg },

  // Content (unit, mounted unit) - normal amber
  { tag: tags.literal, color: colors.fg },

  // Errors - red with glow
  { tag: tags.invalid,
    color: colors.error,
    textDecoration: 'underline wavy',
  },
]);

// Combined syntax highlighting extension
export const terminalSyntaxHighlighting = syntaxHighlighting(terminalHighlightStyle);

// CSS for cursor blink animation (add to index.css or inject)
export const cursorBlinkCSS = `
@keyframes cm-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Error token blinking */
@keyframes cm-error-blink {
  0%, 50% { color: #FF6B6B; }
  51%, 100% { color: #805800; }
}

.cm-error-blink {
  animation: cm-error-blink 0.6s step-end infinite;
}

/* Selection in CodeMirror - ensure inverted colors */
.cm-editor .cm-selectionBackground {
  background-color: #FFB000 !important;
}

.cm-editor .cm-content ::selection {
  background-color: #FFB000;
  color: #1A1100;
}
`;
