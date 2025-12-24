# Frontend Architecture Reference

Quick reference for frontend development on Firelock Bluebird.

---

## 1. Layout Definitions

### Primary Layout: 3-Column Responsive Editor
**File**: `src/components/ArmyEditor/ArmyEditorLayout.tsx`

| Breakpoint | Columns Shown | Layout |
|------------|---------------|--------|
| Mobile (< md) | 1 | Text editor only |
| Tablet (md: 768px) | 2 | Text editor + Unit info |
| Desktop (lg: 1024px) | 3 | Text editor + Unit info + ASCII art |

**Column Proportions**:
- Text Editor: `flex-1`, `lg:max-w-[50%]`
- Unit Info Panel: `flex-1`, `lg:max-w-[30%]`
- ASCII Art Panel: `flex-1`, `max-w-[20%]`

### Terminal Wrapper
**File**: `src/components/Terminal/Terminal.tsx`
- Header/footer with 1980s aesthetic
- CRT scanlines overlay via `.crt-overlay`

---

## 2. Autocomplete Configuration

### Data Sources

| Data | Location | Format |
|------|----------|--------|
| Faction list | `src/hooks/useFactionData.ts` | Hardcoded array |
| Unit data (dev) | `src/data/factions/*.json` | TypeScript imports |
| Unit data (prod) | `public/data/factions/*.json` | Static JSON |
| Mounting modes | `src/components/ArmyEditor/types.ts` | `MOUNTING_MODES` constant |

### Available Factions
```typescript
{ id: 'federal_states', name: 'Federal States-Army' }
{ id: 'rygolic_host', name: 'The New Rygolic Host' }
```

### Unit Interface
```typescript
interface Unit {
  id: string;           // "type_68c_appomattox"
  name: string;         // Exact name
  displayName: string;  // Pretty name for UI
  points: number;
  unitType: string;     // "COMMAND POST CARRIER"
  category: string;
  section: string;      // "TACOMS"
  stats: UnitStats;
  abilities: string[];  // ["Amphibious", "NBC"]
  weapons: Weapon[];
}
```

### Mounting Modes
```typescript
[D] Dismounted - Infantry on foot
[E] Embarked - Infantry inside transport
[T] Transport - Vehicle carries infantry
[1]-[3] Tercio slots - Formation placements
```

### Dropdown Component
**File**: `src/components/ArmyEditor/TerminalDropdown.tsx`
- Max items: 10 (deduplicated)
- Item types: `[F]` Faction, `[U]` Unit, `[M]` Mounting

---

## 3. Animation Definitions

**File**: `src/index.css`

| Animation | Duration | Purpose |
|-----------|----------|---------|
| `blink` | 1s | Cursor blink |
| `cm-blink` | 1s | CodeMirror cursor |
| `cm-error-blink` | 0.6s | Validation errors (red/dim) |
| `cm-warning-blink` | 0.8s | Cross-faction warnings |

### Text Effects
```css
.terminal-glow {
  text-shadow: 0 0 2px var(--terminal-fg), 0 0 4px var(--terminal-glow);
}
```

### CRT Scanlines
Applied via `.crt-overlay` fixed position element with repeating gradient.

---

## 4. Behavior Configuration

### Autocomplete Logic
**File**: `src/components/ArmyEditor/CodeMirrorEditor.tsx`

**Trigger Conditions**:
| Context | Trigger | Result |
|---------|---------|--------|
| Lines 1-3, no faction | 2+ chars matching faction | Faction dropdown |
| Any line | 2+ chars matching unit | Unit dropdown (all factions) |
| Line starts with `-[` | Pattern `/^-\s*\[?$/` | Mounting mode dropdown |

**To modify autocomplete behavior based on selected army**:
```typescript
// In checkAutocomplete() function:
if (selectedFaction) {
  // Filter to only selected faction units
  const factionData = getFactionData(selectedFaction);
  // ... use factionData.units instead of all factions
}
```

### Unit Matching Logic
```typescript
// Normalization
normalizedName = name.toLowerCase().trim()

// Matching (in validators.ts)
u.name.toLowerCase().includes(cleanLine.toLowerCase()) ||
u.displayName.toLowerCase().includes(cleanLine.toLowerCase())
```

### Cross-Faction Detection
```typescript
// In validation/validators.ts
if (!selectedFactionUnits.has(normalizedName)) {
  return { status: 'cross-faction', ... }
}
```

---

## 5. Styling System

### CSS Variables
**File**: `src/index.css`

```css
:root {
  --terminal-fg: #FFB000;      /* Amber text */
  --terminal-bg: #1A1100;      /* Dark background */
  --terminal-dim: #805800;     /* Dimmed text */
  --terminal-bright: #FFCC00;  /* Bright highlights */
  --terminal-glow: rgba(255, 176, 0, 0.15);
  --terminal-glow-strong: rgba(255, 176, 0, 0.3);
}
```

### CodeMirror Theme
**File**: `src/components/ArmyEditor/terminalTheme.ts`

| Class | Purpose |
|-------|---------|
| `.cm-validation-unknown` | Red wavy underline + blink |
| `.cm-validation-cross-faction` | Amber background + blink |
| `.cm-validation-structural` | Red wavy underline |

### Syntax Highlighting Tags
**File**: `src/components/ArmyEditor/armyListLanguage.ts`

| Tag | Applied To | Style |
|-----|------------|-------|
| `tags.heading` | FactionLine | Amber + glow |
| `tags.meta` | ArmyInfoLine | Dim |
| `tags.name` | Unit names | Bright amber |
| `tags.number` | Points | Bright |
| `tags.bracket` | [D/E/T] | Bright, bold |
| `tags.separator` | Delineators | Dim |

---

## 6. Data Flow

### Faction Loading
```
useFactionData() hook
  ↓
Preloads all factions on mount
  ↓
Fetches /data/factions/{id}.json
  ↓
Caches in Map<string, FactionData>
  ↓
Passed to CodeMirrorEditor via getFactionData prop
```

### Unit Selection Flow
```
User types → checkAutocomplete() → showUnitDropdown()
  ↓
User selects → handleSelect() → text inserted
  ↓
Cursor moves → updateCursorContext() → finds unit in line
  ↓
onCursorUnitChange(unit) → Home.tsx state update
  ↓
UnitInfoPanel renders stats
AsciiArtPanel fetches /unit_ascii/{id}_40.json
```

### Validation Flow
```
Document changes → validationPlugin.update()
  ↓
parser.parse(content) → AST
  ↓
validateDocument() scans for Unit nodes
  ↓
Each unit checked against allUnits Map
  ↓
Decorations applied (underlines, backgrounds)
  ↓
Tooltips available on hover
```

---

## 7. Key Files Reference

### Editor Components
| File | Purpose |
|------|---------|
| `ArmyEditorLayout.tsx` | 3-column responsive layout |
| `CodeMirrorEditor.tsx` | Main editor with syntax highlighting |
| `TerminalDropdown.tsx` | Autocomplete dropdown |
| `UnitInfoPanel.tsx` | Unit stats display |
| `AsciiArtPanel.tsx` | ASCII art renderer |
| `StatTooltip.tsx` | Hover tooltips |

### Styling
| File | Purpose |
|------|---------|
| `terminalTheme.ts` | CodeMirror theme + syntax colors |
| `armyListLanguage.ts` | Grammar → highlight tag mapping |
| `src/index.css` | Global CSS + animations |

### Validation
| File | Purpose |
|------|---------|
| `validation/validators.ts` | Unit validation logic |
| `validation/validationPlugin.ts` | CodeMirror plugin |
| `validation/fuzzyMatch.ts` | Suggestion generation |

### Data
| File | Purpose |
|------|---------|
| `hooks/useFactionData.ts` | Faction loading + caching |
| `types.ts` | TypeScript interfaces |
| `public/data/factions/*.json` | Unit data |
| `public/unit_ascii/*.json` | ASCII art cache |

### Parser
| File | Purpose |
|------|---------|
| `armyList.grammar` | Lezer grammar definition |
| `tokens.js` | External tokenizer |
| `parser.js` | Generated parser |
| `buildParser.js` | Build script |
| `testParser.js` | Test runner |

---

## Common Modifications

### Add new faction
1. Create `public/data/factions/{faction_id}.json`
2. Add to `AVAILABLE_FACTIONS` in `useFactionData.ts`

### Modify autocomplete behavior
Edit `checkAutocomplete()` in `CodeMirrorEditor.tsx`

### Change syntax colors
Edit `terminalHighlightStyle` in `terminalTheme.ts`

### Add new validation rule
Edit `validateDocument()` in `validation/validators.ts`

### Modify grammar
1. Edit `armyList.grammar`
2. Run `node buildParser.js`
3. Update `armyListLanguage.ts` with new tags
