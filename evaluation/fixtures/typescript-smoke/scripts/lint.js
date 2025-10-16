const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, '..', 'src', 'index.ts');
const contents = fs.readFileSync(sourcePath, 'utf8');

if (/console\./.test(contents)) {
  console.error('lint: console usage is not allowed in fixture source');
  process.exitCode = 1;
  return;
}

console.log('lint check passed');
