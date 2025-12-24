import { ExternalTokenizer } from "@lezer/lr"
import { GenName } from "./parser.terms.js"

// Pattern: " - " followed by digits followed by space and PTS/POINTS (case insensitive)
// We look for the LAST occurrence of this pattern to determine where GenName ends
const SUFFIX_REGEX = /\s-\s+\d+\s+(PTS|pts|POINTS|points)/gi

export const nameTokenizer = new ExternalTokenizer((input, stack) => {
  // Build up the content string to search through
  let content = ""
  let offset = 0

  // Read characters until end of input
  while (true) {
    const ch = input.peek(offset)
    if (ch === -1) break  // End of input
    content += String.fromCharCode(ch)
    offset++
  }

  if (content.length === 0) return

  // Find ALL matches of the suffix pattern
  let lastMatchIndex = -1
  let match

  // Reset regex state and find all matches
  SUFFIX_REGEX.lastIndex = 0
  while ((match = SUFFIX_REGEX.exec(content)) !== null) {
    lastMatchIndex = match.index
  }

  if (lastMatchIndex > 0) {
    // Accept everything UP TO the last suffix pattern as GenName
    input.acceptToken(GenName, lastMatchIndex)
  } else if (lastMatchIndex === -1) {
    // No suffix found - don't accept anything, let other rules try
    // This could be changed to accept all content if that's desired behavior
  }
})
