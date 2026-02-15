#!/usr/bin/env node

import process from 'node:process';

import { runPrWatchMerge } from './lib/pr-watch-merge.js';

const exitCode = await runPrWatchMerge(process.argv.slice(2), { usage: 'node scripts/pr-monitor-merge.mjs' });
if (exitCode !== 0) {
  process.exit(exitCode);
}
