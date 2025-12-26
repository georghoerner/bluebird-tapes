import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { factionDataFacet } from './validationFacet';
import { validateDocument } from './validators';
import type { ValidationResult } from './types';

// StateEffect to update validation results
const setValidationResult = StateEffect.define<ValidationResult>();

// StateField to store validation results (accessible by tooltip)
export const validationResultField = StateField.define<ValidationResult>({
  create() {
    return { unitValidations: [], structuralErrors: [], transportErrors: [] };
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setValidationResult)) {
        return effect.value;
      }
    }
    return value;
  },
});

// Decoration marks for different validation states
const unknownUnitMark = Decoration.mark({
  class: 'cm-validation-unknown',
  attributes: { 'data-validation': 'unknown' },
});

const crossFactionMark = Decoration.mark({
  class: 'cm-validation-cross-faction',
  attributes: { 'data-validation': 'cross-faction' },
});

const structuralErrorMark = Decoration.mark({
  class: 'cm-validation-structural',
  attributes: { 'data-validation': 'structural' },
});

const transportErrorMark = Decoration.mark({
  class: 'cm-validation-transport',
  attributes: { 'data-validation': 'transport' },
});

/**
 * ViewPlugin that validates the document and creates decorations
 * for invalid unit names and structural errors.
 */
export const validationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      const result = this.runValidation(view);
      this.decorations = this.buildDecorations(result);
      // Schedule the result dispatch for after construction
      setTimeout(() => this.dispatchResult(view, result), 0);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || this.facetChanged(update)) {
        const result = this.runValidation(update.view);
        this.decorations = this.buildDecorations(result);
        // Schedule to avoid infinite loops
        setTimeout(() => this.dispatchResult(update.view, result), 0);
      }
    }

    private facetChanged(update: ViewUpdate): boolean {
      return (
        update.state.facet(factionDataFacet) !==
        update.startState.facet(factionDataFacet)
      );
    }

    private runValidation(view: EditorView): ValidationResult {
      const content = view.state.doc.toString();
      const config = view.state.facet(factionDataFacet);
      return validateDocument(content, config);
    }

    private dispatchResult(view: EditorView, result: ValidationResult) {
      // Only dispatch if the view is still attached
      if (view.dom.parentNode) {
        view.dispatch({
          effects: setValidationResult.of(result),
        });
      }
    }

    private buildDecorations(result: ValidationResult): DecorationSet {
      const decorations: Array<{ from: number; to: number; value: Decoration }> =
        [];

      // Add unit validation decorations
      for (const unit of result.unitValidations) {
        // Skip empty ranges (CodeMirror mark decorations require from < to)
        if (unit.to <= unit.from) continue;

        if (unit.status === 'unknown') {
          decorations.push({
            from: unit.from,
            to: unit.to,
            value: unknownUnitMark,
          });
        } else if (unit.status === 'cross-faction') {
          decorations.push({
            from: unit.from,
            to: unit.to,
            value: crossFactionMark,
          });
        }
      }

      // Add structural error decorations
      for (const error of result.structuralErrors) {
        // Only add if there's actual content to mark
        if (error.to > error.from) {
          decorations.push({
            from: error.from,
            to: error.to,
            value: structuralErrorMark,
          });
        }
      }

      // Add transport error decorations
      for (const error of result.transportErrors) {
        if (error.to > error.from) {
          decorations.push({
            from: error.from,
            to: error.to,
            value: transportErrorMark,
          });
        }
      }

      // Sort by position (required by CodeMirror)
      decorations.sort((a, b) => a.from - b.from || a.to - b.to);

      // Filter out overlapping decorations
      const filtered: typeof decorations = [];
      let lastEnd = -1;
      for (const d of decorations) {
        if (d.from >= lastEnd) {
          filtered.push(d);
          lastEnd = d.to;
        }
      }

      return Decoration.set(filtered.map((d) => d.value.range(d.from, d.to)));
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
