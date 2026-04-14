#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { promisify } from 'node:util';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { computeAgeInDays, parseIsoDate } from './lib/docs-helpers.js';
import { maybeLoadDocsCatalog, resolveDocsCatalogEntry } from './lib/docs-catalog.js';

const execFileAsync = promisify(execFile);
const ARCHIVE_STUB_MARKER = '<!-- docs-archive:stub -->';
const INACTIVE_SPEC_STATUSES = new Set([
  'archived',
  'canceled',
  'cancelled',
  'closed',
  'completed',
  'deprecated',
  'done',
  'succeeded'
]);
const SPEC_FRESHNESS_CADENCE_DAYS = 30;

/**
 * Print usage information and available command-line options for the spec-guard script.
 *
 * Describes the checks the script performs (tracked implementation/migration changes require a spec update in tasks/specs, docs/design/specs, or tasks/index.json; spec last_review dates must be within 30 days) and documents the supported options (--dry-run, -h/--help).
 */
function showUsage() {
  console.log(`Usage: node scripts/spec-guard.mjs [--dry-run]

Ensures that implementation changes adhere to Codex-Orchestrator spec guardrails.
Checks include:
  • Tracked implementation/migration edits must accompany a spec update under tasks/specs, docs/design/specs, or tasks/index.json
  • Active spec last_review dates under tasks/specs and docs/design/specs must be ≤30 days old

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

const CODE_PATH_PREFIXES = [
  'src/',
  'app/',
  'server/',
  'orchestrator/src/',
  'packages/orchestrator/src/',
  'packages/shared/',
  'adapters/',
  'evaluation/harness/',
  'migrations/',
  'db/migrations/',
  'prisma/migrations/'
];

function isCodePath(file) {
  return CODE_PATH_PREFIXES.some((prefix) => file.startsWith(prefix));
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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function normalizeRollingFreshnessPolicy(rawPolicy) {
  if (!rawPolicy || typeof rawPolicy !== 'object' || rawPolicy.enabled !== true) {
    return {
      enabled: false,
      is_valid: false,
      owner_issue: null,
      policy_doc: null,
      window_days: 0,
      max_cohorts: 0,
      max_entries: 0,
      eligible_doc_classes: []
    };
  }

  const ownerIssue = typeof rawPolicy.owner_issue === 'string' ? rawPolicy.owner_issue.trim() || null : null;
  const policyDoc = typeof rawPolicy.policy_doc === 'string' ? rawPolicy.policy_doc.trim() || null : null;
  const windowDays = Number.isInteger(rawPolicy.window_days) && rawPolicy.window_days >= 0 ? rawPolicy.window_days : null;
  const maxCohorts = Number.isInteger(rawPolicy.max_cohorts) && rawPolicy.max_cohorts > 0 ? rawPolicy.max_cohorts : null;
  const maxEntries = Number.isInteger(rawPolicy.max_entries) && rawPolicy.max_entries > 0 ? rawPolicy.max_entries : null;
  const eligibleDocClasses = normalizeStringArray(rawPolicy.eligible_doc_classes);

  return {
    enabled: true,
    is_valid: Boolean(
      ownerIssue &&
        policyDoc &&
        windowDays !== null &&
        maxCohorts !== null &&
        maxEntries !== null &&
        eligibleDocClasses.length > 0
    ),
    owner_issue: ownerIssue,
    policy_doc: policyDoc,
    window_days: windowDays ?? 0,
    max_cohorts: maxCohorts ?? 0,
    max_entries: maxEntries ?? 0,
    eligible_doc_classes: eligibleDocClasses
  };
}

function classifySpecPath(file, docsCatalog) {
  return resolveDocsCatalogEntry(file, docsCatalog)?.doc_class ?? null;
}

function applyRollingFreshnessPolicy(staleSpecs, docsCatalog) {
  const policy = normalizeRollingFreshnessPolicy(docsCatalog?.policies?.rolling_freshness_cohorts);
  if (!policy.enabled || !policy.is_valid || staleSpecs.length === 0) {
    return {
      policy,
      blockingStaleSpecs: staleSpecs,
      rollingStaleSpecs: [],
      rollingCohorts: []
    };
  }

  const eligibleClasses = new Set(policy.eligible_doc_classes);
  const eligibleSpecs = staleSpecs.filter(
    (entry) =>
      eligibleClasses.has(entry.doc_class) &&
      entry.overdue_days > 0 &&
      entry.overdue_days <= policy.window_days
  );

  const cohortsByKey = new Map();
  for (const entry of eligibleSpecs) {
    const key = `${entry.last_review}|${entry.cadence_days}|${entry.age_days}`;
    if (!cohortsByKey.has(key)) {
      cohortsByKey.set(key, []);
    }
    cohortsByKey.get(key).push(entry);
  }

  const policyCapacityExceeded = cohortsByKey.size > policy.max_cohorts || eligibleSpecs.length > policy.max_entries;
  if (policyCapacityExceeded) {
    return {
      policy,
      blockingStaleSpecs: staleSpecs,
      rollingStaleSpecs: [],
      rollingCohorts: []
    };
  }

  const rollingPaths = new Set(eligibleSpecs.map((entry) => entry.file));
  const rollingCohorts = [...cohortsByKey.values()].map((entries) => ({
    owner_issue: policy.owner_issue,
    stale_entries: entries.length,
    last_review: entries[0].last_review,
    cadence_days: entries[0].cadence_days,
    age_days: entries[0].age_days,
    overdue_days: entries[0].overdue_days,
    window_days: policy.window_days,
    sample_paths: entries.slice(0, 5).map((entry) => entry.file)
  }));

  return {
    policy,
    blockingStaleSpecs: staleSpecs.filter((entry) => !rollingPaths.has(entry.file)),
    rollingStaleSpecs: eligibleSpecs,
    rollingCohorts
  };
}

async function loadRollingFreshnessCatalog() {
  try {
    return await maybeLoadDocsCatalog(process.cwd());
  } catch {
    return null;
  }
}

async function checkSpecFreshness(specFiles) {
  const failures = [];
  const staleSpecs = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const docsCatalog = await loadRollingFreshnessCatalog();

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

    if (isArchivedSpecStub(file, content) || isInactiveSpec(content)) {
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
    if (ageDays > SPEC_FRESHNESS_CADENCE_DAYS) {
      staleSpecs.push({
        file,
        last_review: rawValue,
        cadence_days: SPEC_FRESHNESS_CADENCE_DAYS,
        age_days: ageDays,
        overdue_days: ageDays - SPEC_FRESHNESS_CADENCE_DAYS,
        doc_class: classifySpecPath(file, docsCatalog)
      });
    }
  }

  const { blockingStaleSpecs, rollingStaleSpecs, rollingCohorts } = applyRollingFreshnessPolicy(staleSpecs, docsCatalog);
  for (const entry of blockingStaleSpecs) {
    failures.push(
      `${entry.file}: last_review ${entry.last_review} is ${entry.age_days} days old (must be ≤30 days)`
    );
  }

  return { failures, rollingStaleSpecs, rollingCohorts };
}

function isInactiveSpec(content) {
  const lines = content.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (lines[index]?.trim() !== '---') {
    return false;
  }

  for (index += 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed === '---') {
      break;
    }
    if (!trimmed.startsWith('status:')) {
      continue;
    }
    const status = trimmed.split(':', 2)[1]?.trim().toLowerCase() ?? '';
    return INACTIVE_SPEC_STATUSES.has(status);
  }

  return false;
}

function isArchivedSpecStub(file, content) {
  const lines = content.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (!lines[index]?.trim().startsWith('#')) {
    return false;
  }

  index += 1;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (lines[index]?.trim().startsWith('last_review:')) {
    index += 1;
    while (index < lines.length && lines[index].trim() === '') {
      index += 1;
    }
  }

  if (lines[index]?.trim() !== ARCHIVE_STUB_MARKER) {
    return false;
  }

  const trailingLines = lines.slice(index + 1).map((line) => line.trim());
  const archivePath =
    trailingLines
      .find((line) => line.startsWith('- Archive path:'))
      ?.slice('- Archive path:'.length)
      .trim() ?? '';
  const normalizedArchivePath = normalizeSpecPathForComparison(archivePath);
  const normalizedFile = normalizeSpecPathForComparison(file);

  return (
    trailingLines.some((line) => line.startsWith('> Archived on ')) &&
    trailingLines.some((line) => line.startsWith('- Archive branch:')) &&
    normalizedArchivePath === normalizedFile
  );
}

function normalizeSpecPathForComparison(value) {
  return posix.normalize(value.replace(/\\/g, '/'));
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
    failures.push(
      'code/migrations changed but no spec updated under tasks/specs, docs/design/specs, or tasks/index.json'
    );
  }

  const specFiles = await listSpecFiles();
  if (specFiles.length > 0) {
    const freshness = await checkSpecFreshness(specFiles);
    failures.push(...freshness.failures);
    if (freshness.rollingStaleSpecs.length > 0) {
      console.log(`Spec guard rolling freshness cohort entries: ${freshness.rollingStaleSpecs.length}`);
      for (const cohort of freshness.rollingCohorts) {
        console.log(
          ` - rolling cohort ${cohort.owner_issue ?? 'unassigned'}: ${cohort.stale_entries} specs, last_review=${cohort.last_review}, overdue=${cohort.overdue_days}/${cohort.window_days} days`
        );
      }
    }
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
