const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, '..', 'src', 'index.ts');
if (!fs.existsSync(sourcePath)) {
  console.error('build: missing src/index.ts');
  process.exitCode = 1;
  return;
}

const contents = fs.readFileSync(sourcePath, 'utf8');
if (!contents.includes('export function greet')) {
  console.error('build: greet export not found');
  process.exitCode = 1;
  return;
}

console.log('build check passed');
