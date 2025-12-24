import { buildParserFile } from '@lezer/generator';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const grammarFile = join(__dirname, 'armyList.grammar');
const outputFile = join(__dirname, 'parser.js');

console.log('Building Lezer parser from grammar...');

try {
  const grammar = readFileSync(grammarFile, 'utf8');
  const { parser: parserCode, terms } = buildParserFile(grammar, {
    fileName: 'armyList.grammar',
    moduleStyle: 'es'
  });

  writeFileSync(outputFile, parserCode);
  if (terms) {
    writeFileSync(join(__dirname, 'parser.terms.js'), terms);
  }
  console.log('✓ Parser generated successfully at:', outputFile);
} catch (error) {
  console.error('✗ Error building parser:', error);
  process.exit(1);
}
