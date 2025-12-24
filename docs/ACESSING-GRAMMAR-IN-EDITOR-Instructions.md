# Accessing Grammar in CodeMirror Editor

This guide explains how to access parts of the parsed Lezer grammar tree in `CodeMirrorEditor.tsx`.

## Basic Pattern (Already in Use)

The `calculateStats` function (lines 131-173) demonstrates the basic pattern:

```typescript
const tree = parser.parse(content);
const cursor = tree.cursor();

do {
  if (cursor.name === 'UnitComplex') {
    // You found a UnitComplex node
    const unitComplexText = content.substring(cursor.from, cursor.to);
  }
} while (cursor.next());
```

## Finding the First Unit in a UnitComplex

Here's how to navigate into a specific node structure:

```typescript
const tree = parser.parse(content);
const cursor = tree.cursor();

do {
  if (cursor.name === 'UnitComplex') {
    // Enter the UnitComplex node
    cursor.firstChild(); // Move into children

    do {
      if (cursor.name === 'Unit') {
        // This is the first Unit child
        const unitText = content.substring(cursor.from, cursor.to);
        console.log('First unit:', unitText);
        break; // Found the first unit
      }
    } while (cursor.nextSibling()); // Move to next sibling

    cursor.parent(); // Go back up to UnitComplex
  }
} while (cursor.next());
```

## Finding Unit at Cursor Position

If you want to find the UnitComplex that contains the cursor position:

```typescript
const findUnitComplexAtPos = (content: string, cursorPos: number) => {
  const tree = parser.parse(content);
  const cursor = tree.cursorAt(cursorPos); // Start at specific position

  // Walk up the tree to find UnitComplex
  while (cursor.name !== 'UnitComplex' && cursor.parent()) {
    // Keep going up
  }

  if (cursor.name === 'UnitComplex') {
    // Now navigate to first Unit child
    cursor.firstChild();
    do {
      if (cursor.name === 'Unit') {
        return content.substring(cursor.from, cursor.to);
      }
    } while (cursor.nextSibling());
  }

  return null;
};
```

## Key Lezer Cursor Methods

- `cursor.next()` - Move to next node in document order (pre-order traversal)
- `cursor.firstChild()` - Enter first child node
- `cursor.nextSibling()` - Move to next sibling at same level
- `cursor.parent()` - Move up to parent node
- `cursor.name` - Current node type (e.g., "Unit", "UnitComplex", "TacticalGroup")
- `cursor.from` / `cursor.to` - Character positions in the document
- `tree.cursorAt(pos)` - Create cursor at specific position

## Grammar Structure Reference

From `armyList.grammar:50-57`:

```
UnitComplex {
  Unit LineEnd
  MountedUnitLine*
}
```

A UnitComplex has:
1. First child: `Unit` (the primary unit)
2. Second child: `LineEnd`
3. Then zero or more `MountedUnitLine` children

## Example: Extract All Units from All UnitComplexes

```typescript
const extractAllUnits = (content: string) => {
  const tree = parser.parse(content);
  const cursor = tree.cursor();
  const units: string[] = [];

  do {
    if (cursor.name === 'UnitComplex') {
      cursor.firstChild();
      do {
        if (cursor.name === 'Unit') {
          units.push(content.substring(cursor.from, cursor.to));
          break; // Only get first Unit per UnitComplex
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }
  } while (cursor.next());

  return units;
};
```

## Relevant Files

- Parser implementation: `frontend/src/components/ArmyEditor/CodeMirrorEditor.tsx`
- Grammar definition: `frontend/src/utils/armyListParser/armyList.grammar`
- Parser: `frontend/src/utils/armyListParser/parser.js` (generated)
