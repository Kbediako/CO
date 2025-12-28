import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { logger } from '../../logger.js';

const specGuardPath = join(process.cwd(), 'scripts', 'spec-guard.mjs');

if (!existsSync(specGuardPath)) {
  logger.warn(`[spec-guard] skipped: ${specGuardPath} not found`);
  process.exit(0);
}

const child = spawn(process.execPath, [specGuardPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});

child.on('error', (error) => {
  logger.error(`[spec-guard] failed: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (typeof code === 'number') {
    process.exit(code);
  }
  if (signal) {
    logger.error(`[spec-guard] exited with signal ${signal}`);
  }
  process.exit(1);
});
