#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { computeAgeInDays, parseIsoDate } from './lib/docs-helpers.js';

const execFileAsync = promisify(execFile);

/**
 * Print usage information and available command-line options for the spec-guard script.
 *
 * Describes the checks the script performs (code/migration changes require a spec update in tasks/specs or tasks/index.json; TECH_SPEC last_review must be within 30 days) and documents the supported options (--dry-run, -h/--help).
 */
function showUsage() {
  console.log(`Usage: node scripts/spec-guard.mjs [--dry-run]

Ensures that implementation changes adhere to Codex-Orchestrator spec guardrails.
Checks include:
  • Code/migration edits must accompany a spec update under tasks/specs or tasks/index.json
  • TECH_SPEC last_review dates must be ≤30 days old

Options:
  --dry-run   Report failures without exiting non-zero
  -h, --help  Show this help message`);
}

async function verifyGitRef(ref) {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', ref]);
    return true;
  } catch {
    return false;
  }
}

async function resolveBaseRef() {
  const envBase = process.env.BASE_SHA;
  if (envBase && (await verifyGitRef(envBase))) {
    return envBase;
  }

  const defaultRef = 'origin/main';
  if (await verifyGitRef(defaultRef)) {
    return defaultRef;
  }

  const { stdout } = await execFileAsync('git', ['rev-list', '--max-parents=0', 'HEAD']);
  const commits = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (commits.length === 0) {
    throw new Error('Unable to locate repository history for spec guard.');
  }
  return commits[commits.length - 1] || 'HEAD';
}

async function runGitDiff(args) {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--name-only', ...args]);
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function listChangedFiles(baseRef) {
  const symmetric = await runGitDiff([`${baseRef}...HEAD`]);
  if (symmetric.length > 0) {
    return symmetric;
  }
  return runGitDiff(['HEAD~1..HEAD']);
}

function isCodePath(file) {
  return (
    file.startsWith('src/') ||
    file.startsWith('app/') ||
    file.startsWith('server/') ||
    file.startsWith('migrations/') ||
    file.startsWith('db/migrations/') ||
    file.startsWith('prisma/migrations/')
  );
}

function isSpecPath(file) {
  return (
    file.startsWith('tasks/specs/') ||
    file.startsWith('docs/design/specs/') ||
    file === 'tasks/index.json'
  );
}

/**
 * Collects spec Markdown files from the repository spec directories.
 *
 * Searches 'tasks/specs' and 'docs/design/specs' for regular files ending with `.md`, ignores `README.md`, and skips directories that do not exist.
 * @returns {string[]} Sorted list of file paths to spec Markdown files.
 * @throws {Error} Re-throws filesystem errors encountered while reading a directory, except when the directory is missing (`ENOENT`), which is ignored.
 */
async function listSpecFiles() {
  const specDirs = ['tasks/specs', 'docs/design/specs'];
  const files = [];

  for (const dir of specDirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) {
          continue;
        }
        if (entry.name === 'README.md') {
          continue;
        }
        files.push(join(dir, entry.name));
      }
    } catch (error) {
      const code =
        error && typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  return files.sort();
}

async function checkSpecFreshness(specFiles) {
  const failures = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const file of specFiles) {
    let content;
    try {
      content = await readFile(file, 'utf8');
    } catch (error) {
      const code = error && typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'ENOENT') {
        failures.push(`${file}: file missing during freshness check`);
      } else {
        const message =
          error && typeof error === 'object' && error !== null && 'message' in error
            ? error.message
            : 'unknown error';
        failures.push(`${file}: unable to read file (${message})`);
      }
      continue;
    }

    const reviewLine = content
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith('last_review:'));
    if (!reviewLine) {
      failures.push(`${file}: missing last_review field`);
      continue;
    }

    const rawValue = reviewLine.split(':', 2)[1]?.trim() ?? '';
    const reviewDate = parseIsoDate(rawValue);
    if (!reviewDate) {
      failures.push(`${file}: invalid last_review date '${rawValue}'`);
      continue;
    }

    const ageDays = computeAgeInDays(reviewDate, today);
    if (ageDays > 30) {
      failures.push(
        `${file}: last_review ${rawValue} is ${ageDays} days old (must be ≤30 days)`
      );
    }
  }

  return failures;
}

async function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    process.exit(0);
  }
  const knownFlags = new Set(['dry-run', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    showUsage();
    process.exit(2);
  }
  const dryRun = hasFlag(args, 'dry-run');
  const baseRef = await resolveBaseRef();
  const changedFiles = await listChangedFiles(baseRef);

  let needsSpec = false;
  let specTouched = false;

  for (const file of changedFiles) {
    if (!needsSpec && isCodePath(file)) {
      needsSpec = true;
    }
    if (!specTouched && isSpecPath(file)) {
      specTouched = true;
    }
    if (needsSpec && specTouched) {
      break;
    }
  }

  const failures = [];

  if (needsSpec && !specTouched) {
    failures.push('code/migrations changed but no spec updated under tasks/specs or tasks/index.json');
  }

  const specFiles = await listSpecFiles();
  if (specFiles.length > 0) {
    failures.push(...(await checkSpecFreshness(specFiles)));
  }

  if (failures.length > 0) {
    console.log('❌ Spec guard: issues detected');
    for (const message of failures) {
      console.log(` - ${message}`);
    }
    if (dryRun) {
      console.log('Dry run: exiting successfully despite failures.');
      return;
    }
    process.exitCode = 1;
    return;
  }

  console.log('✅ Spec guard: OK');
}

main().catch((error) => {
  const message =
    error && typeof error === 'object' && error !== null && 'message' in error
      ? error.message
      : String(error);
  console.error(`Spec guard failed: ${message}`);
  process.exit(1);
});
