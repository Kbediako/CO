#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const STAMP_PATTERN = /^(?:\uFEFF)?<!--\s*codex:instruction-stamp\s+([a-f0-9]{64})\s*-->(\r?\n)?/i;
const DEFAULT_PATHS = ['AGENTS.md', 'docs/AGENTS.md', '.agent/AGENTS.md'];

function showUsage() {
  console.log(`Usage: node scripts/update-instruction-stamp.mjs [--check] [path ...]

Refreshes codex:instruction-stamp headers for AGENTS.md files.

Options:
  --check   Verify stamps without writing changes.
  -h, --help  Show this help message.

If no paths are provided, defaults to: ${DEFAULT_PATHS.join(', ')}`);
}

function parseArgs(argv) {
  const options = { check: false, paths: [] };
  for (const arg of argv) {
    if (arg === '--check') {
      options.check = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      showUsage();
      process.exit(0);
    }
    if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      showUsage();
      process.exit(2);
    }
    options.paths.push(arg);
  }
  return options;
}

function detectEol(raw) {
  return raw.includes('\r\n') ? '\r\n' : '\n';
}

async function updateFile(targetPath, { check, explicit }) {
  const absolutePath = path.resolve(process.cwd(), targetPath);
  let raw;
  try {
    raw = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      const message = explicit
        ? `missing: ${targetPath}`
        : `skip missing: ${targetPath}`;
      console.warn(message);
      return { status: explicit ? 'missing' : 'skipped' };
    }
    throw error;
  }

  if (!raw.trim()) {
    console.warn(`skip empty: ${targetPath}`);
    return { status: 'skipped' };
  }

  const bom = raw.startsWith('\uFEFF') ? '\uFEFF' : '';
  const stripped = bom ? raw.slice(1) : raw;
  const match = STAMP_PATTERN.exec(stripped);
  const body = match ? stripped.slice(match[0].length) : stripped;
  const computed = createHash('sha256').update(body, 'utf8').digest('hex');
  const separator = match ? match[2] ?? '' : detectEol(stripped);
  const updated = `${bom}<!-- codex:instruction-stamp ${computed} -->${separator}${body}`;

  if (updated === raw) {
    console.log(`ok: ${targetPath}`);
    return { status: 'ok' };
  }

  if (check) {
    console.error(`mismatch: ${targetPath}`);
    return { status: 'mismatch' };
  }

  await writeFile(absolutePath, updated, 'utf8');
  console.log(`updated: ${targetPath}`);
  return { status: 'updated' };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = options.paths.length > 0 ? options.paths : DEFAULT_PATHS;
  const explicitSet = new Set(options.paths);
  const results = [];

  for (const target of targets) {
    results.push(await updateFile(target, { check: options.check, explicit: explicitSet.has(target) }));
  }

  const failed = results.some((result) => result.status === 'missing' || result.status === 'mismatch');
  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
