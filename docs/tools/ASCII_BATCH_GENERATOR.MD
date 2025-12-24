● ASCII Batch Pipeline Complete!

  Created in frontend/scripts/ascii-batch-generator/:

  | File               | Purpose                                        |
  |--------------------|------------------------------------------------|
  | index.ts           | Main CLI entry point with arg parsing          |
  | imageProcessor.ts  | Image → AsciiChar[][] conversion (node-canvas) |
  | formatConverter.ts | AsciiChar[][] → indexed JSON format            |

  Usage:
  # Full batch (161 images × 20 widths = 3220 files)
  npx tsx scripts/ascii-batch-generator/index.ts

  # Single unit test
  npx tsx scripts/ascii-batch-generator/index.ts --unit a1_apogee --widths 40,80

  # Custom settings
  npx tsx scripts/ascii-batch-generator/index.ts --charset blocks --fg-quant 16

  # Dry run to preview
  npx tsx scripts/ascii-batch-generator/index.ts --dry-run

  Options:
  - --input, -i - Input directory (default: public/unit_images)
  - --output, -o - Output directory (default: public/unit_ascii)
  - --charset, -c - Character set: standard, blocks, detailed, simple, binary
  - --fg-quant - Foreground colors 2-32 (default: 8)
  - --bg-quant - Background colors 1-16 (default: 4)
  - --no-bg - Disable background colors
  - --widths - Comma-separated widths (default: 10,20,...,200)
  - --unit - Process single unit by ID
  - --dry-run - Preview without generating

  Output files go to public/unit_ascii/{unit_id}_{width}.json
