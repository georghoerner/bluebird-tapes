#!/usr/bin/env npx tsx
/**
 * ASCII Batch Generator
 *
 * Converts unit images to ASCII art JSON files at multiple widths.
 *
 * Usage:
 *   npx tsx scripts/ascii-batch-generator/index.ts [options]
 *
 * Options:
 *   --input, -i    Input directory (default: public/unit_images)
 *   --output, -o   Output directory (default: public/unit_ascii)
 *   --charset, -c  Character set: standard, blocks, detailed, simple, binary (default: standard)
 *   --fg-quant     Foreground color quantization (default: 8)
 *   --bg-quant     Background color quantization (default: 4)
 *   --no-bg        Disable background colors
 *   --widths       Comma-separated widths to generate (default: 10,20,...,200)
 *   --unit         Process single unit by ID (optional)
 *   --dry-run      Show what would be processed without generating
 */

import { readdir, mkdir, writeFile, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { processImage, type CharSetKey, CHAR_SETS } from './imageProcessor';
import { convertToAsciiFormat } from './formatConverter';

// Default widths: 10 to 200 in increments of 10
const DEFAULT_WIDTHS = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);

// Supported image extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

interface Config {
  inputDir: string;
  outputDir: string;
  charSet: CharSetKey;
  fgQuant: number;
  bgQuant: number;
  useBgColors: boolean;
  widths: number[];
  singleUnit: string | null;
  dryRun: boolean;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    inputDir: 'public/unit_images',
    outputDir: 'public/unit_ascii',
    charSet: 'standard',
    fgQuant: 8,
    bgQuant: 4,
    useBgColors: true,
    widths: DEFAULT_WIDTHS,
    singleUnit: null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--input':
      case '-i':
        config.inputDir = next;
        i++;
        break;
      case '--output':
      case '-o':
        config.outputDir = next;
        i++;
        break;
      case '--charset':
      case '-c':
        if (next in CHAR_SETS) {
          config.charSet = next as CharSetKey;
        } else {
          console.error(`Invalid charset: ${next}. Available: ${Object.keys(CHAR_SETS).join(', ')}`);
          process.exit(1);
        }
        i++;
        break;
      case '--fg-quant':
        config.fgQuant = parseInt(next) || 8;
        i++;
        break;
      case '--bg-quant':
        config.bgQuant = parseInt(next) || 4;
        i++;
        break;
      case '--no-bg':
        config.useBgColors = false;
        break;
      case '--widths':
        config.widths = next.split(',').map(w => parseInt(w.trim())).filter(w => w > 0);
        i++;
        break;
      case '--unit':
        config.singleUnit = next;
        i++;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
ASCII Batch Generator - Convert unit images to ASCII art JSON files

Usage:
  npx tsx scripts/ascii-batch-generator/index.ts [options]

Options:
  --input, -i <dir>    Input directory (default: public/unit_images)
  --output, -o <dir>   Output directory (default: public/unit_ascii)
  --charset, -c <set>  Character set (default: standard)
                       Available: ${Object.keys(CHAR_SETS).join(', ')}
  --fg-quant <n>       Foreground color quantization 2-32 (default: 8)
  --bg-quant <n>       Background color quantization 1-16 (default: 4)
  --no-bg              Disable background colors
  --widths <list>      Comma-separated widths (default: 10,20,...,200)
  --unit <id>          Process single unit by ID
  --dry-run            Show what would be processed
  --help, -h           Show this help

Examples:
  # Process all images with defaults
  npx tsx scripts/ascii-batch-generator/index.ts

  # Process single unit at specific widths
  npx tsx scripts/ascii-batch-generator/index.ts --unit node_team --widths 40,80,120

  # Use block characters with more colors
  npx tsx scripts/ascii-batch-generator/index.ts --charset blocks --fg-quant 16
`);
}

/**
 * Find all image files in directory
 */
async function findImages(dir: string): Promise<{ unitId: string; path: string }[]> {
  const images: { unitId: string; path: string }[] = [];

  try {
    const files = await readdir(dir);

    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const unitId = basename(file, ext);
        images.push({
          unitId,
          path: join(dir, file),
        });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }

  return images.sort((a, b) => a.unitId.localeCompare(b.unitId));
}

/**
 * Ensure directory exists
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    await stat(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Format bytes as human-readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const config = parseArgs();

  console.log('╔════════════════════════════════════════╗');
  console.log('║     ASCII BATCH GENERATOR v1.0         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`Input:    ${config.inputDir}`);
  console.log(`Output:   ${config.outputDir}`);
  console.log(`Charset:  ${config.charSet} (${CHAR_SETS[config.charSet]})`);
  console.log(`FG Quant: ${config.fgQuant}`);
  console.log(`BG Quant: ${config.bgQuant} ${config.useBgColors ? '' : '(disabled)'}`);
  console.log(`Widths:   ${config.widths.join(', ')}`);
  console.log('');

  // Find images
  let images = await findImages(config.inputDir);

  if (images.length === 0) {
    console.error('No images found in input directory.');
    process.exit(1);
  }

  // Filter to single unit if specified
  if (config.singleUnit) {
    images = images.filter(img => img.unitId === config.singleUnit);
    if (images.length === 0) {
      console.error(`Unit not found: ${config.singleUnit}`);
      process.exit(1);
    }
  }

  console.log(`Found ${images.length} image(s) to process`);
  console.log(`Generating ${images.length * config.widths.length} ASCII files`);
  console.log('');

  if (config.dryRun) {
    console.log('DRY RUN - Files that would be generated:');
    for (const img of images) {
      for (const width of config.widths) {
        console.log(`  ${img.unitId}_${width}.json`);
      }
    }
    return;
  }

  // Ensure output directory exists
  await ensureDir(config.outputDir);

  // Process each image
  let totalFiles = 0;
  let totalBytes = 0;
  const startTime = Date.now();

  for (const img of images) {
    console.log(`Processing: ${img.unitId}`);

    for (const width of config.widths) {
      try {
        // Process image to ASCII
        const asciiChars = await processImage(img.path, {
          width,
          charSet: config.charSet,
          fgQuant: config.fgQuant,
          bgQuant: config.bgQuant,
          useBgColors: config.useBgColors,
        });

        // Convert to indexed format
        const jsonData = convertToAsciiFormat(img.unitId, width, asciiChars);

        // Write to file
        const outputPath = join(config.outputDir, `${img.unitId}_${width}.json`);
        const jsonString = JSON.stringify(jsonData);
        await writeFile(outputPath, jsonString, 'utf-8');

        totalFiles++;
        totalBytes += jsonString.length;

        process.stdout.write(`  ├─ ${width}w: ${jsonData.height}h, ${jsonData.fg_palette.length}fg/${jsonData.bg_palette.length}bg colors, ${formatBytes(jsonString.length)}\n`);
      } catch (err) {
        console.error(`  ├─ ${width}w: ERROR - ${err}`);
      }
    }

    console.log(`  └─ Done`);
    console.log('');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('════════════════════════════════════════');
  console.log(`Generated ${totalFiles} files (${formatBytes(totalBytes)}) in ${elapsed}s`);
  console.log('════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
