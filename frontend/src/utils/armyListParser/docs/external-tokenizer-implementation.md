# External Tokenizer for Multi-line Name Parsing

## Problem

Parse a multi-line string into a `GenName` where ` - ` appears both:
- Inside the name content (should be kept)
- As the delimiter before ` - NUMBER PTS` suffix (should end the name)

**Example:**
```
LAN DARRI-GRAND & MERCENARIES - 3
HOUSE GUARD - 300 PTS, 9 COMMAND
```

Should parse as:
- `GenName`: `"LAN DARRI-GRAND & MERCENARIES - 3\nHOUSE GUARD"`
- Suffix: ` - 300 PTS, 9 COMMAND`

## Solution

Lezer **external tokenizer** that scans forward to find the LAST ` - NUMBER PTS` pattern.

## Files Created/Modified

### `tokens.js` (new)
```javascript
import { ExternalTokenizer } from "@lezer/lr"
import { GenName } from "./parser.terms.js"

const SUFFIX_REGEX = /\s-\s+\d+\s+(PTS|pts|POINTS|points)/gi

export const nameTokenizer = new ExternalTokenizer((input, stack) => {
  let content = "", offset = 0
  while (true) {
    const ch = input.peek(offset)
    if (ch === -1) break
    content += String.fromCharCode(ch)
    offset++
  }
  if (content.length === 0) return

  let lastMatchIndex = -1, match
  SUFFIX_REGEX.lastIndex = 0
  while ((match = SUFFIX_REGEX.exec(content)) !== null) {
    lastMatchIndex = match.index
  }

  if (lastMatchIndex > 0) {
    input.acceptToken(GenName, lastMatchIndex)
  }
})
```

### `armyList.grammar` (modified)
Added at top:
```lezer
@external tokens nameTokenizer from "./tokens.js" { GenName }
```

## Usage

Replace `Name` with `GenName` in grammar rules where multi-line lookahead is needed:

```lezer
// Use GenName for multi-line name capture
Header {
  GenName Delineator Number PointsMarker CommandClause? LineEnd
}
```

## Build & Test

```bash
node buildParser.js   # Rebuilds parser with external tokenizer
node testParser.js    # All 10 tests pass
```
