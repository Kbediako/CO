#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const distPath = path.join(repoRoot, 'dist');

async function main() {
  try {
    await rm(distPath, { recursive: true, force: true });
    console.log(`[clean:dist] removed ${path.relative(repoRoot, distPath)}`);
  } catch (error) {
    console.error(`[clean:dist] failed: ${error?.message ?? String(error)}`);
    process.exitCode = 1;
  }
}

main();
