# Chat Log: External Tokenizer Implementation
**Date:** 2025-12-21

---

## User

I am habing trouble with a GLR grammar

I want it to be able to parse into a generic name rule a multi-line string that contains characters that are also in a specific phrase that is going to be the last part of a line. and that phrase should always be found and not swalloed up by the generic name rule.

for example:

LAN DARRI-GRAND & MERCENARIES - 3
HOUSE GUARD - 300 PTS,          9 COMMAND
__________________________

should parse into GenName:
"LAN DARRI-GRAND & MERCENARIES - 3\nHOUSE GUARD"
and then have:
" - 300 PTS,          9 COMMAND" as the end

the problem: the border between these two parts: " - " can also be part of the GenName

what do?

---

## Assistant

This is a classic GLR ambiguity problem - the " - " token appears in both your generic name content and as a delimiter before the structured suffix.

Let me explore your current grammar to understand the structure and suggest solutions.

*[Explored the Lezer grammar for the army list parser]*

Based on the exploration, I now understand your current grammar and the problem. Let me clarify the challenge:

**The Core Issue:**
Your grammar currently uses `@precedence{Delineator, contentChar}` to make ` - ` stop the name capture. But this works on a **first-match** basis within a line. When ` - ` appears multiple times across lines, or even within a line before the actual suffix, the grammar can't distinguish which one is "the real delimiter."

There are a few approaches to solve this. Before I write up a plan, I have some clarifying questions:

**Questions asked:**
1. What makes the suffix pattern unique? Is it specifically the presence of 'PTS' (or similar keyword)?
2. Are you open to using a Lezer external tokenizer (custom JavaScript)?

---

## User Answers

1. "PTS + optional COMMAND" - The suffix is always NUMBER PTS with optional COMMAND clause
2. "Either approach" - Whichever works best for this case

---

## Plan Created

The **recommended approach** is using a Lezer external tokenizer because:

1. **Lookahead capability** - JS can use regex to find the ` - NUMBER PTS` pattern and work backwards
2. **Deterministic** - Unlike GLR, produces exactly one parse tree
3. **Clean separation** - Grammar stays readable; boundary logic lives in JavaScript

---

## Implementation

### Step 1: Created `tokens.js`

```javascript
import { ExternalTokenizer } from "@lezer/lr"
import { GenName } from "./parser.terms.js"

const SUFFIX_REGEX = /\s-\s+\d+\s+(PTS|pts|POINTS|points)/gi

export const nameTokenizer = new ExternalTokenizer((input, stack) => {
  let content = ""
  let offset = 0

  while (true) {
    const ch = input.peek(offset)
    if (ch === -1) break
    content += String.fromCharCode(ch)
    offset++
  }

  if (content.length === 0) return

  let lastMatchIndex = -1
  let match

  SUFFIX_REGEX.lastIndex = 0
  while ((match = SUFFIX_REGEX.exec(content)) !== null) {
    lastMatchIndex = match.index
  }

  if (lastMatchIndex > 0) {
    input.acceptToken(GenName, lastMatchIndex)
  }
})
```

### Step 2: Updated `armyList.grammar`

Added at top of file:
```lezer
// External tokenizer for multi-line names that end at " - NUMBER PTS"
@external tokens nameTokenizer from "./tokens.js" { GenName }
```

Added example usage (commented):
```lezer
// Example: Multi-line structure using external tokenizer
// Uncomment and adapt as needed:
// MultiLineHeader {
//   GenName Delineator Number PointsMarker CommandClause? LineEnd
// }
```

### Step 3: Build & Test

```bash
$ node buildParser.js
Building Lezer parser from grammar...
✓ Parser generated successfully at: parser.js
Unused rule 'GenName' (armyList.grammar 2:52)

$ node testParser.js
Found 10 test files
✓ bauzaleras.army: 4 tactical groups, 12 units, 6 mounted
✓ chasseurs_d_argent.army: 0 tactical groups, 3 units, 3 mounted
✓ dromo_marzial.army: 4 tactical groups, 7 units, 11 mounted
✓ empty_pockets.army: 4 tactical groups, 4 units, 6 mounted
✓ gunthers_chain.army: 4 tactical groups, 7 units, 8 mounted
✓ jasper15.army: 2 tactical groups, 2 units, 4 mounted
✓ lamashtu-09.army: 0 tactical groups, 2 units, 2 mounted
✓ savage_six.army: 0 tactical groups, 4 units, 1 mounted
✓ senor_xiente.army: 0 tactical groups, 3 units, 1 mounted
✓ stumptails.army: 4 tactical groups, 9 units, 0 mounted

10 passed, 0 failed
```

---

## Generated Files

After build, `parser.terms.js` now includes:
```javascript
export const
  GenName = 1,
  Document = 2,
  // ...
```

And `parser.js` imports the external tokenizer:
```javascript
import {nameTokenizer} from "./tokens.js"
// ...
tokenizers: [nameTokenizer, 0, 1],
```

---

## Summary

**Files modified/created:**

1. **`tokens.js`** - External tokenizer that scans forward to find the LAST ` - NUMBER PTS` pattern and accepts everything before it as `GenName`

2. **`armyList.grammar`** - Added `@external tokens nameTokenizer from "./tokens.js" { GenName }`

**To use GenName**, replace `Name` with `GenName` where multi-line behavior is needed:

```lezer
Header {
  GenName Delineator Number PointsMarker CommandClause? LineEnd
  DelineatorLine
}
```

The tokenizer only activates when the grammar expects a `GenName` token at that position.
