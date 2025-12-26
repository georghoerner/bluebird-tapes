import { hoverTooltip, EditorView } from '@codemirror/view';
import type { Tooltip } from '@codemirror/view';
import { validationResultField } from './validationPlugin';
import type { UnitValidation, TransportError } from './types';

/**
 * Create DOM element for unit validation tooltip.
 */
function createUnitTooltipDOM(validation: UnitValidation): HTMLElement {
  const dom = document.createElement('div');
  dom.className = 'cm-validation-tooltip';

  if (validation.status === 'unknown' && validation.suggestions?.length) {
    const title = document.createElement('div');
    title.className = 'cm-validation-tooltip-title';
    title.textContent = 'Unknown unit. Did you mean:';
    dom.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'cm-validation-tooltip-list';

    for (const suggestion of validation.suggestions.slice(0, 5)) {
      const item = document.createElement('li');
      item.textContent = suggestion;
      list.appendChild(item);
    }

    dom.appendChild(list);
  } else if (validation.status === 'cross-faction') {
    const message = document.createElement('div');
    message.className = 'cm-validation-tooltip-warning';
    const factionName = validation.matchedFaction ?? 'another faction';
    message.textContent = `Unit belongs to ${factionName}`;
    dom.appendChild(message);
  }

  return dom;
}

/**
 * Create DOM element for transport error tooltip.
 */
function createTransportTooltipDOM(error: TransportError): HTMLElement {
  const dom = document.createElement('div');
  dom.className = 'cm-validation-tooltip';

  const message = document.createElement('div');
  message.className = 'cm-validation-tooltip-warning';
  message.textContent = error.message;
  dom.appendChild(message);

  return dom;
}

/**
 * Hover tooltip extension that shows validation info for invalid units and transport errors.
 */
export const validationTooltip = hoverTooltip(
  (view: EditorView, pos: number, _side: -1 | 1): Tooltip | null => {
    const result = view.state.field(validationResultField, false);

    if (!result) return null;

    // Check for transport errors first (they take priority)
    const transportError = result.transportErrors.find(
      (e) => pos >= e.from && pos <= e.to
    );

    if (transportError) {
      return {
        pos: transportError.from,
        end: transportError.to,
        above: true,
        create() {
          return { dom: createTransportTooltipDOM(transportError) };
        },
      };
    }

    // Find unit validation at hover position
    const validation = result.unitValidations.find(
      (v) =>
        pos >= v.from &&
        pos <= v.to &&
        (v.status === 'unknown' || v.status === 'cross-faction')
    );

    if (!validation) return null;

    // Only show tooltip if there's meaningful content
    if (validation.status === 'unknown' && !validation.suggestions?.length) {
      return null;
    }

    return {
      pos: validation.from,
      end: validation.to,
      above: true,
      create() {
        return { dom: createUnitTooltipDOM(validation) };
      },
    };
  },
  {
    hoverTime: 400, // Slightly longer than default for less intrusive UX
  }
);
