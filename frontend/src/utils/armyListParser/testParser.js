import { parser } from './parser.js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDir = join(__dirname, '../../../../test');

const armyFiles = readdirSync(testDir).filter(f => f.endsWith('.army'));

console.log(`Found ${armyFiles.length} test files\n`);

let passCount = 0;
let failCount = 0;

for (const file of armyFiles) {
  const content = readFileSync(join(testDir, file), 'utf8');
  const tree = parser.parse(content);

  // Count key structural elements to verify parsing
  let headerCount = 0;
  let tacticalGroupCount = 0;
  let unitComplexCount = 0;
  let mountedUnitCount = 0;
  let errorCount = 0;

  let cursor = tree.cursor();
  do {
    switch (cursor.name) {
      case 'Header': headerCount++; break;
      case 'TacticalGroup': tacticalGroupCount++; break;
      case 'UnitComplex': unitComplexCount++; break;
      case 'MountedUnitLine': mountedUnitCount++; break;
    }
    if (cursor.type.isError) errorCount++;
  } while (cursor.next());

  const hasHeader = headerCount === 1;
  const hasContent = tacticalGroupCount > 0 || unitComplexCount > 0;

  if (hasHeader && hasContent) {
    console.log(`✓ ${file}: ${tacticalGroupCount} tactical groups, ${unitComplexCount} units, ${mountedUnitCount} mounted (${errorCount} recovery nodes)`);
    passCount++;
  } else {
    console.log(`✗ ${file}: Failed - header:${headerCount}, groups:${tacticalGroupCount}, units:${unitComplexCount}`);
    failCount++;
    // Print tree for failed files
    console.log('  Tree structure:');
    printTree(tree, content, '    ');
  }
}

console.log(`\n${passCount} passed, ${failCount} failed`);

// Optional: print detailed tree for a specific file
const detailFile = process.argv[2];
if (detailFile) {
  const content = readFileSync(join(testDir, detailFile), 'utf8');
  const tree = parser.parse(content);
  console.log(`\n=== Detailed tree for ${detailFile} ===`);
  printTree(tree, content, '  ');
}

function printTree(tree, content, indent = '') {
  let cursor = tree.cursor();
  let depth = 0;
  do {
    const nodeIndent = indent + '  '.repeat(depth);
    const snippet = content.substring(cursor.from, Math.min(cursor.to, cursor.from + 30)).replace(/\n/g, '\\n');
    if (!cursor.type.isError) {
      console.log(`${nodeIndent}${cursor.name}: "${snippet}${cursor.to - cursor.from > 30 ? '...' : ''}"`);
    }

    if (cursor.firstChild()) {
      depth++;
    } else if (cursor.nextSibling()) {
      // stay at same depth
    } else {
      while (depth > 0) {
        cursor.parent();
        depth--;
        if (cursor.nextSibling()) break;
      }
    }
  } while (depth > 0 || cursor.nextSibling());
}
