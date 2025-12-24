# Army List Parser - Implementation Plan

## Overview

Build a parser for user-entered army list text in the `ArmyTextEditor` component. This parser will:
1. Parse the army list grammar into a structured AST
2. Provide syntax highlighting
3. Enable better autocomplete (context-aware)
4. Mark unrecognized input as `<user input>` instead of failing
5. Power the unit info panel with accurate cursor position tracking

---

## What We're Parsing

**Input:** Free-form text typed by users in the army editor
**Output:** Abstract Syntax Tree (AST) + parse errors/warnings

### Example Input:
```
SECURITY TASK ELEMENT JASPER-15
EXAMPLE - 100 PTS, 2 COMMAND
__________________________
Task Unit 1 - Headquarters
P1 "Parallax" - 35 pts
- [D] Tactical Team - 15 pts
- [E] Node Team - 0 pts (TACOM)
- [T] Automated Sentry - 15 pts
```

---

## Grammar Definition

Based on your notes from `.todos/2025-12-15.md`, here's the refined grammar:

```
ArmyList
  = Header Delineator TacticalGroup+

Header
  = ArmyName PointsAndCommand

ArmyName
  = .+ NEWLINE                           # Any text until newline

PointsAndCommand
  = .+ InlineDelineator PointCap InlineDelineator CommandPoints NEWLINE

PointCap
  = DIGITS WHITESPACE? "pts"?           # e.g., "100 PTS", "100pts", "100"

CommandPoints
  = DIGITS WHITESPACE? ("cmd" | "command" | "COMMAND") WHITESPACE?

Delineator
  = ("_" | "-" | "=")+ NEWLINE          # Underscores, dashes, or equals

TacticalGroup
  = TacticalGroupHeader UnitLine+

TacticalGroupHeader
  = .+ InlineDelineator .+ NEWLINE      # e.g., "Task Unit 1 - Headquarters"

UnitLine
  = LeaderLine | MountedLine

LeaderLine
  = WHITESPACE? "P" DIGITS WHITESPACE UnitName WHITESPACE InlineDelineator WHITESPACE UnitPoints

MountedLine
  = WHITESPACE? InlineDelineator WHITESPACE MountDemarkation WHITESPACE UnitName WHITESPACE InlineDelineator WHITESPACE UnitPoints WHITESPACE? UnitNote?

MountDemarkation
  = "[" ("E" | "D" | "T") "]"

UnitName
  = .+?                                  # Non-greedy match until delineator

UnitPoints
  = DIGITS WHITESPACE? "pts"?

UnitNote
  = "(" .+ ")"                          # e.g., "(TACOM)"

InlineDelineator
  = "-" | "_" | "," | ";" | "|"

WHITESPACE
  = [ \t]+

DIGITS
  = [0-9]+

NEWLINE
  = "\n" | "\r\n"
```

---

## Decision Points - YOUR INPUT NEEDED

### 1. Unit Name Matching Strategy

When parsing a `UnitName`, how should we validate it?

**Option A: Free Text (Lenient)**
- Accept any string as unit name
- After parsing, try to match against faction unit database
- If no match found, mark as `<user input>` and preserve as-is
- **Pros:** Flexible, allows custom units, typos don't break parsing
- **Cons:** Less validation, harder to provide autocomplete

**Option B: Whitelist (Strict)**
- Only accept unit names that exist in selected faction's unit list
- Parsing fails if unit not found
- **Pros:** Ensures data integrity, easier autocomplete
- **Cons:** Requires faction selection first, no custom units

**Option C: Hybrid (Recommended)**
- Parse as free text first
- During semantic analysis, check if unit exists in faction
- Tag as `valid_unit` or `user_input`
- Provide warnings (not errors) for unknown units
- **Pros:** Best of both worlds, graceful degradation
- **Cons:** Two-pass parsing (syntax → semantic)

**QUESTION:** Which approach do you prefer? (I recommend Option C)

---

### 2. Parser Library Choice

**Option A: Chevrotain** ✅ RECOMMENDED
- Programmatic parser in TypeScript
- Excellent error recovery (key for "mark as user input" requirement)
- Fast, well-maintained
- Define lexer tokens + parser rules in code
- **Best for:** Interactive editors with incremental parsing

**Option B: Lezer**
- Used by CodeMirror
- Grammar file compiles to parser
- Incremental parsing built-in
- **Best for:** Full-featured code editors
- **Overkill?** Might be more than we need

**Option C: PEG.js / Peggy**
- Grammar file (.pegjs) generates parser
- Simple syntax
- **Issue:** Less flexible error recovery

**QUESTION:** Chevrotain or Lezer? (I recommend Chevrotain for easier integration)

---

### 3. Error Handling Strategy

When the parser encounters unparseable text:

**Option A: Mark Line as `<user input>`**
- Treat entire line as free text
- Don't break parsing, continue with next line
- Display in dim color or with warning icon

**Option B: Mark Token as `<user input>`**
- Try to parse what we can
- Mark only the problematic token/phrase
- **Example:** `P1 "Parallax" - xyz pts` → "xyz" marked as user input

**Option C: Best Effort + Recovery**
- Use Chevrotain's error recovery
- Insert "virtual tokens" to continue parsing
- Show squiggly underlines like IDEs

**QUESTION:** How strict should error handling be? (I recommend Option B)

---

### 4. Delineator Flexibility

Should we accept mixed delineators in one file?

**Example:**
```
JASPER-15 - 100 PTS, 2 COMMAND
_____________________________    ← underscores
Task Unit 1 - HQ
P1 "Parallax" - 35 pts
----------------------------     ← dashes
Task Unit 2 - Support
...
```

**Option A: Allow Any**
- Each delineator line can use any character
- Most flexible

**Option B: Consistent Per File**
- First delineator sets the pattern
- Others must match

**QUESTION:** Should we enforce consistency? (I say allow any)

---

### 5. Point Tracking

Should the parser validate point totals?

**Option A: Parse Only**
- Just extract numbers, don't sum
- UI handles validation

**Option B: Validate During Parse**
- Sum unit points, compare to point cap
- Emit warning if over/under

**QUESTION:** Parser responsibility or UI responsibility? (I say UI)

---

## Implementation Steps

### Phase 1: Grammar Setup (1-2 hours)
1. Install Chevrotain: `npm install chevrotain`
2. Create `frontend/src/utils/armyListParser/`
   - `lexer.ts` - Token definitions
   - `parser.ts` - Grammar rules
   - `ast.ts` - AST type definitions
   - `index.ts` - Public API
3. Define tokens (keywords, delineators, numbers, etc.)
4. Write grammar rules based on definition above
5. Add basic tests

### Phase 2: Integration (2-3 hours)
1. Create hook: `useArmyListParser(text: string)`
   - Returns AST, errors, warnings
   - Memoized for performance
2. Update `ArmyTextEditor.tsx`:
   - Parse text on every change
   - Store AST in state
   - Display parse errors below editor
3. Wire up cursor position to AST:
   - Find AST node at cursor position
   - Extract unit name
   - Look up in faction data
   - Update `onCursorUnitChange`

### Phase 3: Syntax Highlighting (2-3 hours)
1. Map AST nodes to text positions
2. Apply CSS classes based on node type:
   - `.ast-header` - Army name, points
   - `.ast-delineator` - Separators
   - `.ast-group-header` - Tactical group names
   - `.ast-unit-valid` - Recognized units (bright)
   - `.ast-unit-unknown` - User input (dim + warning)
   - `.ast-points` - Point values
   - `.ast-mount` - [E], [D], [T]
3. Overlay highlighting (preserve textarea usability)
   - Option A: Dual div + textarea with sync scroll
   - Option B: ContentEditable div (more complex)

### Phase 4: Enhanced Autocomplete (1-2 hours)
1. Use AST to detect context:
   - "Typing after `P1 ` → suggest units"
   - "Typing `- [` → suggest E/D/T"
   - "Typing after tactical group header → suggest units"
2. Filter suggestions by faction (if selected)
3. Improve positioning based on AST structure

### Phase 5: Testing & Polish (1-2 hours)
1. Test various army list formats
2. Test malformed input (typos, missing delineators)
3. Ensure "user input" handling works
4. Add parse error messages
5. Performance testing (large army lists)

---

## Example AST Structure

```typescript
interface ArmyListAST {
  type: 'ArmyList';
  header: HeaderNode;
  delineator: DelineatorNode;
  tacticalGroups: TacticalGroupNode[];
}

interface HeaderNode {
  type: 'Header';
  armyName: string;
  pointCap: number;
  commandPoints: number;
  position: { start: number; end: number };
}

interface TacticalGroupNode {
  type: 'TacticalGroup';
  name: string;
  function: string;
  units: UnitNode[];
  position: { start: number; end: number };
}

interface UnitNode {
  type: 'Unit';
  designation: 'P' | 'E' | 'D' | 'T';
  unitName: string;
  points: number;
  note?: string;
  isRecognized: boolean;  // true if found in faction data
  position: { start: number; end: number };
}
```

---

## Questions for You

Before I start implementing, please answer:

1. **Unit Matching:** Option A (free text), B (whitelist), or C (hybrid)? → **I recommend C**

2. **Parser Library:** Chevrotain or Lezer? → **I recommend Chevrotain**

3. **Error Handling:** How should we mark unparseable text? → **I recommend marking specific tokens**

4. **Delineators:** Allow mixed styles per file? → **I recommend yes**

5. **Point Validation:** Parser's job or UI's job? → **I recommend UI**

6. **Testing Strategy:** Should I create a dedicated test page (`/parser-test`) for army list grammar testing? This would let you paste example army lists and see the AST/errors in real-time.

7. **Grammar Adjustments:** Looking at your notes, you had specific patterns. Are these requirements correct?
   - `PointCap`: Must be 1-3 digits? Or allow more?
   - `CommandPoints`: Must be 1-2 digits? Or allow more?
   - `Whitespaces`: 0-3 spaces only, or flexible?

8. **Leader Units:** In your example, `P1 "Parallax"` - should `P` always be followed by a digit? Or can it be `P-1`, `P.1`, etc.?

---

## Next Steps

Once you answer the questions above, I'll:
1. Set up the Chevrotain parser with the grammar
2. Create a test page at `/parser-test` so you can try it out
3. Integrate it into `ArmyTextEditor`
4. Add syntax highlighting
5. Wire up the enhanced autocomplete

**Estimated Total Time:** 8-12 hours of development work

Let me know your preferences and I'll get started!
