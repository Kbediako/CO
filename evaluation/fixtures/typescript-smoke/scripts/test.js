require('ts-node/register');
const assert = require('node:assert');

const { greet } = require('../src/index.ts');
const output = greet('Codex');

assert.strictEqual(output, 'Hello, Codex!');
console.log('test check passed');
