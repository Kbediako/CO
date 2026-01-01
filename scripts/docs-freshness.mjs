#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { collectDocFiles, computeAgeInDays, parseIsoDate, toPosixPath } from './lib/docs-helpers.js';

const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const STATUS_VALUES = new Set(['active', 'archived', 'deprecated']);
const OWNER_PLACEHOLDERS = new Set(['tbd', 'unassigned', 'owner']);

function showUsage() {
  console.log(`Usage: node scripts/docs-freshness.mjs [options]

Checks documentation coverage and freshness using a registry file.

Options:
  --registry <path>  Registry JSON path (default: ${DEFAULT_REGISTRY_PATH})
  --report <path>    Report JSON path (default: out/<task-id>/docs-freshness.json)
  --warn             Emit failures but exit 0
  --check            Alias for default behavior
  -h, --help         Show this help message`);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}


function normalizeOwner(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

async function loadRegistry(registryPath) {
  const raw = await readFile(registryPath, 'utf8');
  const data = JSON.parse(raw);
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  return { data, entries };
}

async function main() {
  const repoRoot = process.cwd();
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    return;
  }
  const knownFlags = new Set(['registry', 'report', 'warn', 'check', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    throw new Error(`Unknown option: ${label}`);
  }

  const options = {
    registryPath: typeof args.registry === 'string' ? args.registry : DEFAULT_REGISTRY_PATH,
    reportPath: typeof args.report === 'string' ? args.report : null,
    warnOnly: hasFlag(args, 'warn')
  };
  const registryPath = path.resolve(repoRoot, options.registryPath);

  if (!(await exists(registryPath))) {
    console.error(`Registry not found: ${options.registryPath}`);
    process.exit(1);
  }

  const [docFiles, registryResult] = await Promise.all([
    collectDocFiles(repoRoot),
    loadRegistry(registryPath)
  ]);

  const registryEntries = registryResult.entries;
  const invalidEntries = [];
  const staleEntries = [];
  const missingOnDisk = [];
  const registryPaths = new Set();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const entry of registryEntries) {
    const issues = [];
    const entryPath = typeof entry?.path === 'string' ? entry.path : '';
    const owner = normalizeOwner(entry?.owner);
    const status = typeof entry?.status === 'string' ? entry.status : '';
    const cadenceDays = Number.isFinite(entry?.cadence_days) ? Number(entry.cadence_days) : NaN;
    const reviewDate = parseIsoDate(entry?.last_review);

    if (!entryPath) {
      issues.push('missing path');
    } else if (registryPaths.has(entryPath)) {
      issues.push('duplicate path');
    } else {
      registryPaths.add(entryPath);
    }

    if (!STATUS_VALUES.has(status)) {
      issues.push('invalid status');
    }

    if (!Number.isInteger(cadenceDays) || cadenceDays <= 0) {
      issues.push('invalid cadence_days');
    }

    if (!reviewDate) {
      issues.push('invalid last_review');
    }

    if (status === 'active' || status === 'deprecated') {
      if (!owner || OWNER_PLACEHOLDERS.has(owner.toLowerCase())) {
        issues.push('missing owner');
      }
    }

    if (issues.length > 0) {
      invalidEntries.push({ path: entryPath || '<missing>', issues });
    }

    if (entryPath) {
      const abs = path.resolve(repoRoot, entryPath);
      if (!(await exists(abs))) {
        missingOnDisk.push(entryPath);
      }
    }

    if (reviewDate && Number.isInteger(cadenceDays) && cadenceDays > 0) {
      if (status === 'active' || status === 'deprecated') {
        const ageDays = computeAgeInDays(reviewDate, today);
        if (ageDays > cadenceDays) {
          staleEntries.push({
            path: entryPath,
            last_review: entry.last_review,
            cadence_days: cadenceDays,
            age_days: ageDays
          });
        }
      }
    }
  }

  const missingInRegistry = docFiles.filter((doc) => !registryPaths.has(doc));

  const report = {
    version: 1,
    generated_at: new Date().toISOString(),
    task_id: process.env.MCP_RUNNER_TASK_ID || null,
    registry_path: toPosixPath(path.relative(repoRoot, registryPath)),
    totals: {
      docs_scanned: docFiles.length,
      registry_entries: registryEntries.length,
      missing_in_registry: missingInRegistry.length,
      missing_on_disk: missingOnDisk.length,
      invalid_entries: invalidEntries.length,
      stale_entries: staleEntries.length
    },
    missing_in_registry: missingInRegistry,
    missing_on_disk: missingOnDisk,
    invalid_entries: invalidEntries,
    stale_entries: staleEntries
  };

  const taskId = process.env.MCP_RUNNER_TASK_ID || 'local';
  const reportPath =
    options.reportPath ?? path.join(repoRoot, 'out', taskId, 'docs-freshness.json');
  const reportDir = path.dirname(reportPath);

  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');

  const hasFailures =
    missingInRegistry.length > 0 ||
    missingOnDisk.length > 0 ||
    invalidEntries.length > 0 ||
    staleEntries.length > 0;

  const summary = hasFailures ? 'FAILED' : 'OK';
  console.log(
    `docs:freshness ${summary} - ${report.totals.docs_scanned} docs, ${report.totals.registry_entries} registry entries`
  );
  if (missingInRegistry.length > 0) {
    console.log(`- missing registry entries: ${missingInRegistry.length}`);
  }
  if (missingOnDisk.length > 0) {
    console.log(`- registry references missing files: ${missingOnDisk.length}`);
  }
  if (invalidEntries.length > 0) {
    console.log(`- invalid registry entries: ${invalidEntries.length}`);
  }
  if (staleEntries.length > 0) {
    console.log(`- stale docs: ${staleEntries.length}`);
  }

  if (hasFailures && !options.warnOnly) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
