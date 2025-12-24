# Lezer Grammar Cheat Sheet

Quick reference for writing `.grammar` files for Lezer parser generator.

## Basic Structure

```
@top RuleName { ... }     // Entry point (required, exactly one)

RuleName { ... }          // Grammar rules (lowercase = anonymous in tree)
ruleName { ... }          // Lowercase rules don't create nodes

@tokens { ... }           // Token definitions (lexer rules)

@skip { whitespace }      // Tokens to skip (usually whitespace)
```

## Grammar Rules

### Sequences
```
Rule { A B C }            // A followed by B followed by C
```

### Alternatives
```
Rule { A | B | C }        // A or B or C
```

### Repetition
```
Rule { A* }               // Zero or more A
Rule { A+ }               // One or more A
Rule { A? }               // Zero or one A (optional)
```

### Grouping
```
Rule { (A B)+ }           // Group for repetition
Rule { (A | B) C }        // Group for precedence
```

### Inline Rules
```
Rule { A inline { X Y } B }   // Anonymous inline rule
```

## Token Definitions (@tokens block)

### Literal Strings
```
keyword { "if" }
operator { "+" | "-" | "*" }
```

### Character Classes
```
digit { @digit }                    // 0-9
letter { @asciiLetter }             // a-z, A-Z
alphanumeric { @asciiLetter | @digit }
whitespace { @whitespace }          // space, tab, etc.
```

### Character Sets (custom)
```
hex { $[0-9a-fA-F] }               // Character set
vowel { $[aeiouAEIOU] }
notNewline { ![\n\r] }             // Negated set
```

### Repetition in Tokens
```
Number { @digit+ }                  // One or more digits
Word { @asciiLetter+ }              // One or more letters
Identifier { @asciiLetter (@asciiLetter | @digit)* }
```

### Built-in Character Classes
```
@digit          // 0-9
@asciiLetter    // a-zA-Z
@asciiLowercase // a-z
@asciiUppercase // A-Z
@whitespace     // space, tab, newline, etc.
@eof            // End of file
```

## Precedence & Conflicts

### Token Precedence
```
@tokens {
  @precedence { keyword, identifier }   // keyword wins over identifier

  keyword { "if" | "else" | "while" }
  identifier { @asciiLetter+ }
}
```

### Rule Precedence (conflict resolution)
```
@precedence {
  multiply @left,      // Left associative
  add @left,
  compare @none        // Non-associative
}

Expr {
  Expr !multiply ("*" | "/") Expr |
  Expr !add ("+" | "-") Expr |
  Expr !compare ("==" | "!=") Expr |
  Number
}
```

### Explicit Ambiguity Markers
```
Rule { A ~ambig B }       // Mark intentional ambiguity
```

## Special Directives

### Skip (ignore tokens)
```
@skip { whitespace | Comment }

@tokens {
  whitespace { @whitespace+ }
  Comment { "//" ![\n]* }
}
```

### External Tokens
```
@external tokens tokenizer from "./tokenizer" { Token1, Token2 }
```

### Context Tracking
```
@context trackContext from "./context"
```

### Dialect Support
```
@dialects { strict, loose }

Rule { @dialect<strict> StrictVersion | LooseVersion }
```

### Detection
```
@detectDelim              // Auto-detect indentation
```

## Node Props (for syntax highlighting)

```
@top Program { statement+ }

statement {
  IfStatement |
  WhileStatement
}

IfStatement { kw<"if"> "(" Expr ")" Block }
WhileStatement { kw<"while"> "(" Expr ")" Block }

kw<term> { @specialize[@name={term}]<identifier, term> }

@tokens {
  identifier { @asciiLetter+ }
}
```

## Common Patterns

### Line-Based Parsing
```
@top Document { line* }

line {
  CommentLine |
  ContentLine
}

CommentLine { "#" content* LineEnd }
ContentLine { content+ LineEnd }

@tokens {
  content { ![\n\r#] }
  LineEnd { "\n" | "\r\n" | "\r" | @eof }
}
```

### Keywords vs Identifiers
```
@tokens {
  @precedence { keyword, Identifier }

  keyword { "if" | "else" | "while" | "for" }
  Identifier { @asciiLetter (@asciiLetter | @digit | "_")* }
}

// Or use @specialize for contextual keywords:
kw<term> { @specialize<Identifier, term> }

IfStatement { kw<"if"> ... }
```

### Strings with Escapes
```
@tokens {
  String { '"' (stringContent | stringEscape)* '"' }
  stringContent { ![\\\n\r"]+ }
  stringEscape { "\\" _ }
}
```

### Numbers
```
@tokens {
  Number {
    @digit+ ("." @digit+)? (("e" | "E") ("+" | "-")? @digit+)?
  }
  Integer { @digit+ }
  Hex { "0x" $[0-9a-fA-F]+ }
}
```

### Comments
```
@tokens {
  LineComment { "//" ![\n]* }
  BlockComment { "/*" blockCommentContent* "*/" }
  blockCommentContent { ![*] | "*" ![/] }
}

@skip { @whitespace+ | LineComment | BlockComment }
```

## Error Recovery

Lezer has automatic error recovery. To help it:

1. **Use clear delimiters** - brackets, newlines, semicolons
2. **Avoid overly greedy tokens** - `![\n]*` is better than `.*`
3. **Precedence matters** - specific tokens before general ones

```
// Good: specific patterns first
@tokens {
  @precedence { Keyword, Number, Identifier, content }

  Keyword { "if" | "else" }
  Number { @digit+ }
  Identifier { @asciiLetter+ }
  content { ![\n\r]+ }           // Catch-all last
}
```

## Debugging Tips

1. **Start simple** - get basic structure working first
2. **Test incrementally** - add rules one at a time
3. **Watch for conflicts** - "shift/reduce conflict" means ambiguity
4. **Check precedence** - most specific tokens/rules should win
5. **Use the playground** - https://lezer.codemirror.net/try/

## Example: Simple Line-Based Format

```
@top Document { line* }

line {
  HeaderLine |
  MarkerLine |
  PlainLine
}

HeaderLine { "#" content LineEnd }
MarkerLine { marker content LineEnd }
PlainLine { content LineEnd }

@tokens {
  @precedence { marker, content }

  marker { "-" | "*" | ">" }
  content { ![\n\r]+ }
  LineEnd { "\n" | "\r\n" | @eof }
  space { " " | "\t" }
}

@skip { space }
```

## Resources

- **Official Docs**: https://lezer.codemirror.net/docs/guide/
- **Grammar Reference**: https://lezer.codemirror.net/docs/ref/#lezer-generator
- **Interactive Playground**: https://lezer.codemirror.net/try/
- **Example Grammars**: https://github.com/lezer-parser (JavaScript, JSON, CSS, etc.)
