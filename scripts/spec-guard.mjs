#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function showUsage() {
  console.log(`Usage: node scripts/spec-guard.mjs [--dry-run]

Ensures that implementation changes adhere to Codex-Orchestrator spec guardrails.
Checks include:
  • Code/migration edits must accompany a spec update under tasks/specs or tasks/index.json
  • Mini-spec last_review dates must be ≤30 days old

Options:
  --dry-run   Report failures without exiting non-zero
  -h, --help  Show this help message`);
}

function parseArgs(argv) {
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '-h' || arg === '--help') {
      showUsage();
      process.exit(0);
    } else {
      console.error(`Unknown option: ${arg}`);
      showUsage();
      process.exit(2);
    }
  }
  return { dryRun };
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

async function listSpecFiles() {
  const specDirs = ['tasks/specs', 'docs/design/specs'];
  const files = [];

  for (const dir of specDirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(join(dir, entry.name));
        }
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

function parseReviewDate(raw) {
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function computeAgeInDays(from, to) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / msPerDay);
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
    const reviewDate = parseReviewDate(rawValue);
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
  const { dryRun } = parseArgs(process.argv.slice(2));
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
