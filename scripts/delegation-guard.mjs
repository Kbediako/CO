#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';

function showUsage() {
  console.log(`Usage: node scripts/delegation-guard.mjs [--dry-run]

Ensures top-level tasks include at least one subagent run with manifest evidence.

Requirements:
  - MCP_RUNNER_TASK_ID must be set for top-level runs
  - tasks/index.json must include the top-level task
  - Subagent runs must be prefixed with <task-id>- and have .runs/<task-id>-*/cli/<run-id>/manifest.json

Escape hatch:
  Set DELEGATION_GUARD_OVERRIDE_REASON="<why delegation is not possible>" to bypass.

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

function normalizeTaskKey(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
  if (slug && id && slug.startsWith(`${id}-`)) {
    return slug;
  }
  if (id && slug) {
    return `${id}-${slug}`;
  }
  if (slug) {
    return slug;
  }
  if (id) {
    return id;
  }
  return null;
}

async function loadTaskKeys(taskIndexPath) {
  const raw = await readFile(taskIndexPath, 'utf8');
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  return items
    .map((item) => normalizeTaskKey(item))
    .filter((key) => typeof key === 'string' && key.length > 0);
}

function resolveRepoRoot() {
  const configured = process.env.CODEX_ORCHESTRATOR_ROOT;
  if (!configured) {
    return process.cwd();
  }
  if (isAbsolute(configured)) {
    return configured;
  }
  return resolve(process.cwd(), configured);
}

function resolveRunsDir(repoRoot) {
  const configured = process.env.CODEX_ORCHESTRATOR_RUNS_DIR || '.runs';
  if (isAbsolute(configured)) {
    return configured;
  }
  return resolve(repoRoot, configured);
}

async function findSubagentManifests(runsDir, taskId) {
  let entries;
  try {
    entries = await readdir(runsDir, { withFileTypes: true });
  } catch (error) {
    const message =
      error && typeof error === 'object' && error !== null && 'message' in error
        ? error.message
        : String(error);
    return { found: [], error: `Unable to read runs directory (${message})` };
  }

  const prefix = `${taskId}-`;
  const found = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(prefix)) {
      continue;
    }
    const cliDir = join(runsDir, entry.name, 'cli');
    let runDirs;
    try {
      runDirs = await readdir(cliDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const runDir of runDirs) {
      if (!runDir.isDirectory()) {
        continue;
      }
      const manifestPath = join(cliDir, runDir.name, 'manifest.json');
      try {
        await access(manifestPath);
        found.push(manifestPath);
      } catch {
        // ignore missing manifest
      }
    }
  }

  return { found, error: null };
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));

  const overrideReason = (process.env.DELEGATION_GUARD_OVERRIDE_REASON || '').trim();
  if (overrideReason) {
    console.log('Delegation guard override active.');
    console.log(`Reason: ${overrideReason}`);
    return;
  }

  const taskId = (process.env.MCP_RUNNER_TASK_ID || '').trim();
  const failures = [];

  if (!taskId) {
    failures.push('MCP_RUNNER_TASK_ID is required for delegation guard');
  }

  const repoRoot = resolveRepoRoot();
  const taskIndexPath = join(repoRoot, 'tasks', 'index.json');
  let taskKeys = [];
  try {
    taskKeys = await loadTaskKeys(taskIndexPath);
  } catch (error) {
    const message =
      error && typeof error === 'object' && error !== null && 'message' in error
        ? error.message
        : String(error);
    failures.push(`Unable to read tasks/index.json (${message})`);
  }

  if (taskId && taskKeys.length > 0) {
    const isTopLevel = taskKeys.includes(taskId);
    const parentKey = isTopLevel
      ? taskId
      : taskKeys.find((key) => taskId.startsWith(`${key}-`));

    if (!parentKey) {
      failures.push(
        `MCP_RUNNER_TASK_ID '${taskId}' is not registered in tasks/index.json (add it or use a parent task prefix)`
      );
    } else if (parentKey !== taskId) {
      console.log(`Delegation guard: '${taskId}' treated as subagent run for '${parentKey}'.`);
      console.log('Delegation guard: OK (subagent runs are exempt).');
      return;
    } else {
      const runsDir = resolveRunsDir(repoRoot);
      const { found, error } = await findSubagentManifests(runsDir, taskId);
      if (error) {
        failures.push(error);
      }
      if (found.length === 0) {
        failures.push(
          `No subagent manifests found for '${taskId}'. Expected at least one under ${runsDir}/${taskId}-*/cli/<run-id>/manifest.json`
        );
      } else {
        console.log(`Delegation guard: OK (${found.length} subagent manifest(s) found).`);
        return;
      }
    }
  }

  if (failures.length > 0) {
    console.log('Delegation guard: issues detected');
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

  console.log('Delegation guard: OK');
}

main().catch((error) => {
  const message =
    error && typeof error === 'object' && error !== null && 'message' in error
      ? error.message
      : String(error);
  console.error(`Delegation guard failed: ${message}`);
  process.exit(1);
});
