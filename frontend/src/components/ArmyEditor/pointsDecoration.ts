import { EditorView, Decoration, WidgetType, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { parser } from '../../utils/armyListParser/parser.js';

// Widget that displays calculated points before the cap
class PointsWidget extends WidgetType {
  private points: number;

  constructor(points: number) {
    super();
    this.points = points;
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = `${this.points}/`;
    span.className = 'cm-calculated-points';
    span.style.color = '#FFCC00'; // bright amber
    return span;
  }

  eq(other: PointsWidget) {
    return this.points === other.points;
  }
}

// Find the position of the point cap number in the header
function findPointCapPosition(content: string): { from: number; to: number; cap: number } | null {
  try {
    const tree = parser.parse(content);
    const cursor = tree.cursor();

    do {
      if (cursor.name === 'HeaderInfoLine') {
        // Find the Number node before PointsMarker
        const headerStart = cursor.from;
        const headerText = content.substring(headerStart, cursor.to);

        // Look for pattern: NUMBER followed by pts/PTS/etc
        const match = headerText.match(/(\d+)\s*(?:pts|PTS|POINTS|points)/i);
        if (match && match.index !== undefined) {
          const numberStart = headerStart + match.index;
          const numberEnd = numberStart + match[1].length;
          return {
            from: numberStart,
            to: numberEnd,
            cap: parseInt(match[1], 10),
          };
        }
      }
    } while (cursor.next());
  } catch (e) {
    // Parse error
  }
  return null;
}

// Calculate total points from units
function calculateTotalPoints(content: string): number {
  let points = 0;
  try {
    const tree = parser.parse(content);
    const cursor = tree.cursor();

    do {
      if (cursor.name === 'Unit') {
        const unitText = content.substring(cursor.from, cursor.to);
        const pointsMatch = unitText.match(/(\d+)\s*(?:pts|PTS|POINTS|points)/i);
        const multiplierMatch = unitText.match(/\(x(\d+)\)/i);

        if (pointsMatch) {
          const unitPoints = parseInt(pointsMatch[1], 10);
          const multiplier = multiplierMatch ? parseInt(multiplierMatch[1], 10) : 1;
          points += unitPoints * multiplier;
        }
      }
    } while (cursor.next());
  } catch (e) {
    // Parse error
  }
  return points;
}

// View plugin that creates the decoration
export const pointsDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const content = view.state.doc.toString();
      const capPos = findPointCapPosition(content);

      if (!capPos) {
        return Decoration.none;
      }

      const totalPoints = calculateTotalPoints(content);

      // Create widget decoration at the start of the cap number
      const widget = Decoration.widget({
        widget: new PointsWidget(totalPoints),
        side: -1, // Insert before
      });

      return Decoration.set([widget.range(capPos.from)]);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
