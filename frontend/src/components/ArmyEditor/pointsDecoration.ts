import { EditorView, Decoration, WidgetType, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { parser } from '../../utils/armyListParser/parser.js';
import { factionDataFacet, debugModeFacet } from './validation/validationFacet';
import type { FactionDataConfig } from './validation/types';
import { normalizeForComparison } from './utils/normalize';

// Widget that displays calculated points before the cap
class PointsWidget extends WidgetType {
  points: number;

  constructor(points: number) {
    super();
    this.points = points;
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = `${this.points}/`;
    span.className = 'cm-calculated-points';
    span.style.cssText = 'color: #FFCC00; font-weight: bold;';
    return span;
  }

  eq(other: PointsWidget) {
    return this.points === other.points;
  }

  ignoreEvent() {
    return false;
  }
}

// Widget that displays calculated command after user's command entry
class CommandWidget extends WidgetType {
  private command: number;
  private token: string; // CMD, COMMAND, etc.

  constructor(command: number, token: string) {
    super();
    this.command = command;
    this.token = token;
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = ` (current: ${this.command} ${this.token})`;
    span.className = 'cm-calculated-command';
    span.style.color = '#FFCC00'; // bright amber
    return span;
  }

  eq(other: CommandWidget) {
    return this.command === other.command && this.token === other.token;
  }
}

// Find the position of the point cap number in the header
function findPointCapPosition(content: string, debug: boolean): { from: number; to: number; cap: number } | null {
  try {
    const tree = parser.parse(content);
    const cursor = tree.cursor();

    do {
      if (cursor.name === 'ArmyInfoLine') {
        const headerStart = cursor.from;
        const headerText = content.substring(headerStart, cursor.to);

        // Look for pattern: NUMBER followed by pts/PTS/etc
        const match = headerText.match(/(\d+)\s*(?:pts|PTS|POINTS|points)/i);
        if (match && match.index !== undefined) {
          const numberStart = headerStart + match.index;
          const numberEnd = numberStart + match[1].length;
          const result = {
            from: numberStart,
            to: numberEnd,
            cap: parseInt(match[1], 10),
          };
          if (debug) console.log('[pointsDecoration] Found capPos:', result);
          return result;
        }
      }
    } while (cursor.next());
  } catch (e) {
    // Parse error
  }
  return null;
}

// Find the position and token of command in the header
function findCommandPosition(content: string, debug: boolean): { from: number; to: number; value: number; token: string } | null {
  try {
    const tree = parser.parse(content);
    const cursor = tree.cursor();

    do {
      if (cursor.name === 'ArmyInfoLine') {
        const headerStart = cursor.from;
        const headerEnd = cursor.to;
        const headerText = content.substring(headerStart, headerEnd);

        // Look for pattern: NUMBER followed by cmd/CMD/COMMAND/command
        const match = headerText.match(/(\d+)\s*(cmd|CMD|COMMAND|command)/i);
        if (match && match.index !== undefined) {
          const matchStart = headerStart + match.index;
          const matchEnd = matchStart + match[0].length;
          const result = {
            from: matchStart,
            to: matchEnd,
            value: parseInt(match[1], 10),
            token: match[2],
          };
          if (debug) console.log('[pointsDecoration] Found cmdPos:', result);
          return result;
        }
      }
    } while (cursor.next());
  } catch (e) {
    // Parse error
  }
  return null;
}

// Calculate total points from units
function calculateTotalPoints(content: string, debug: boolean): number {
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
  if (debug) console.log('[pointsDecoration] Total points:', points);
  return points;
}

// Extract unit name from a unit line (before the " - " points separator)
function extractUnitName(unitText: string): string {
  // Remove mounting prefix like "- [D] " or "- [E] "
  const withoutMount = unitText.replace(/^-\s*\[[DET0-9]\]\s*/i, '');
  // Get part before " - " (points)
  const namePart = withoutMount.split(' - ')[0];
  return namePart.trim();
}

// Calculate total command points from matched units
function calculateTotalCommand(content: string, config: FactionDataConfig, debug: boolean): number {
  let totalCommand = 0;
  if (debug) console.log('[pointsDecoration] calculateTotalCommand, allUnits size:', config.allUnits.size);
  try {
    const tree = parser.parse(content);
    const cursor = tree.cursor();

    do {
      if (cursor.name === 'Unit') {
        const unitText = content.substring(cursor.from, cursor.to);
        const unitName = extractUnitName(unitText);
        const normalizedName = normalizeForComparison(unitName);

        const unit = config.allUnits.get(normalizedName);
        if (debug) {
          console.log('[pointsDecoration] Unit lookup:', unitName, '→', normalizedName, '=', unit ? `${unit.name} (cmd: ${unit.stats?.command})` : 'null');
        }
        if (unit && unit.stats?.command) {
          const multiplierMatch = unitText.match(/\(x(\d+)\)/i);
          const multiplier = multiplierMatch ? parseInt(multiplierMatch[1], 10) : 1;
          totalCommand += unit.stats.command * multiplier;
        }
      }
    } while (cursor.next());
  } catch (e) {
    // Parse error
  }
  if (debug) console.log('[pointsDecoration] Total command:', totalCommand);
  return totalCommand;
}

// View plugin that creates the decoration
export const pointsDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      this.decorations = this.buildDecorations(update.view);
    }

    buildDecorations(view: EditorView): DecorationSet {
      const content = view.state.doc.toString();
      const config = view.state.facet(factionDataFacet);
      const debug = view.state.facet(debugModeFacet);
      const decorations: Array<{ pos: number; widget: Decoration }> = [];

      if (debug) {
        console.log('[pointsDecoration] buildDecorations, doc length:', content.length, 'allUnits size:', config.allUnits.size);
      }

      // Points decoration
      const capPos = findPointCapPosition(content, debug);
      if (capPos) {
        const totalPoints = calculateTotalPoints(content, debug);
        const pointsWidget = Decoration.widget({
          widget: new PointsWidget(totalPoints),
          side: -1, // Insert before
        });
        decorations.push({ pos: capPos.from, widget: pointsWidget });
      }

      // Command decoration
      const cmdPos = findCommandPosition(content, debug);
      if (cmdPos) {
        const totalCommand = calculateTotalCommand(content, config, debug);
        const commandWidget = Decoration.widget({
          widget: new CommandWidget(totalCommand, cmdPos.token),
          side: 1, // Insert after
        });
        decorations.push({ pos: cmdPos.to, widget: commandWidget });
      }

      if (decorations.length === 0) {
        return Decoration.none;
      }

      decorations.sort((a, b) => a.pos - b.pos);
      if (debug) {
        console.log('[pointsDecoration] Creating', decorations.length, 'decorations at positions:', decorations.map(d => d.pos));
      }
      return Decoration.set(decorations.map(d => d.widget.range(d.pos)));
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
