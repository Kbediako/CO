#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const command = args.shift();

if (!command) {
  printHelp();
  process.exit(1);
}

switch (command) {
  case 'start':
    forward(['start', ...args]);
    break;
  case 'resume':
    forward(['resume', ...args]);
    break;
  case 'poll':
  case 'status':
    forward(['status', ...args]);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

function forward(cliArgs) {
  const distPath = resolve('dist/bin/codex-orchestrator.js');
  const executable = existsSync(distPath)
    ? ['node', [distPath, ...cliArgs]]
    : ['node', ['--loader', 'ts-node/esm', 'bin/codex-orchestrator.ts', ...cliArgs]];

  const result = spawnSync(executable[0], executable[1], {
    stdio: 'inherit'
  });
  if (result.error) {
    console.error(result.error.message ?? String(result.error));
    process.exit(1);
  }
  if (typeof result.status === 'number') {
    process.exit(result.status);
  }
}

function printHelp() {
  console.log('Usage: node scripts/agents_mcp_runner.mjs <start|resume|poll> [options]');
}
