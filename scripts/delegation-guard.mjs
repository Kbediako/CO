#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { normalizeTaskKey } from './lib/docs-helpers.js';
import { findSubagentManifests, resolveEnvironmentPaths } from './lib/run-manifests.js';

function showUsage() {
  console.log(`Usage: node scripts/delegation-guard.mjs [--task <id>] [--dry-run]

Ensures top-level tasks include at least one subagent run with manifest evidence.

Requirements:
  - A task id must be set (prefer MCP_RUNNER_TASK_ID; --task/TASK also supported)
  - tasks/index.json must include the top-level task
  - Subagent runs must be prefixed with <task-id>- and have .runs/<task-id>-*/cli/<run-id>/manifest.json

Escape hatch:
  Set DELEGATION_GUARD_OVERRIDE_REASON="<why delegation is not possible>" to bypass.

Options:
  --task <id> Resolve task id directly (fallbacks: MCP_RUNNER_TASK_ID, TASK, CODEX_ORCHESTRATOR_TASK_ID)
  --dry-run   Report failures without exiting non-zero
  -h, --help  Show this help message`);
}

async function loadTaskIndex(taskIndexPath) {
  const raw = await readFile(taskIndexPath, 'utf8');
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  const keys = items
    .map((item) => normalizeTaskKey(item))
    .filter((key) => typeof key === 'string' && key.length > 0);
  return { items, keys };
}

function pickExampleTaskId(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return '<task-id>';
  }
  return keys[keys.length - 1];
}

async function collectSubagentCandidates(runsDir, taskId) {
  const candidates = [];
  const prefix = `${taskId}-`;
  let entries;
  try {
    entries = await readdir(runsDir, { withFileTypes: true });
  } catch {
    return candidates;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(prefix)) {
      continue;
    }
    const cliDir = join(runsDir, entry.name, 'cli');
    let runDirs;
    try {
      runDirs = await readdir(cliDir, { withFileTypes: true });
    } catch {
      candidates.push({ path: cliDir, reason: 'missing cli directory' });
      if (candidates.length >= 3) {
        return candidates;
      }
      continue;
    }

    const runEntries = runDirs.filter((run) => run.isDirectory());
    if (runEntries.length === 0) {
      candidates.push({ path: cliDir, reason: 'no run directories' });
      if (candidates.length >= 3) {
        return candidates;
      }
      continue;
    }

    for (const runEntry of runEntries) {
      const manifestPath = join(cliDir, runEntry.name, 'manifest.json');
      try {
        await access(manifestPath);
      } catch {
        candidates.push({ path: manifestPath, reason: 'manifest.json missing' });
        if (candidates.length >= 3) {
          return candidates;
        }
      }
    }
  }
  return candidates;
}

async function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    process.exit(0);
  }
  const knownFlags = new Set(['task', 'dry-run', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    showUsage();
    process.exit(2);
  }
  if (args.task === true) {
    console.error('Missing value for --task');
    showUsage();
    process.exit(2);
  }
  const dryRun = hasFlag(args, 'dry-run');

  const overrideReason = (process.env.DELEGATION_GUARD_OVERRIDE_REASON || '').trim();
  if (overrideReason) {
    console.log('Delegation guard override active.');
    console.log(`Reason: ${overrideReason}`);
    return;
  }

  const taskId = resolveTaskId(args, process.env);
  const failures = [];
  let candidateManifests = [];
  const { repoRoot, runsRoot: runsDir } = resolveEnvironmentPaths();
  const taskIndexPath = join(repoRoot, 'tasks', 'index.json');
  let taskKeys = [];
  let exampleTaskId = '<task-id>';
  let taskIndexReadable = true;
  try {
    const taskIndex = await loadTaskIndex(taskIndexPath);
    taskKeys = taskIndex.keys;
    exampleTaskId = pickExampleTaskId(taskIndex.keys);
  } catch (error) {
    const message =
      error && typeof error === 'object' && error !== null && 'message' in error
        ? error.message
        : String(error);
    taskIndexReadable = false;
    failures.push(`Unable to read tasks/index.json (${message})`);
  }

  if (!taskId) {
    failures.push(
      `Task id is required for delegation guard (set --task, MCP_RUNNER_TASK_ID, TASK, or CODEX_ORCHESTRATOR_TASK_ID; example: export MCP_RUNNER_TASK_ID=${exampleTaskId})`
    );
  }

  if (taskId && taskKeys.length > 0) {
    const isTopLevel = taskKeys.includes(taskId);
    const parentKey = isTopLevel
      ? taskId
      : taskKeys.find((key) => taskId.startsWith(`${key}-`));

    if (!parentKey) {
      failures.push(
        `Task id '${taskId}' is not registered in tasks/index.json (add it or use a parent task prefix)`
      );
    } else if (parentKey !== taskId) {
      console.log(`Delegation guard: '${taskId}' treated as subagent run for '${parentKey}'.`);
      console.log('Delegation guard: OK (subagent runs are exempt).');
      return;
    } else {
      const { found, error } = await findSubagentManifests(runsDir, taskId);
      if (error) {
        failures.push(error);
      }
      if (found.length === 0) {
        candidateManifests = await collectSubagentCandidates(runsDir, taskId);
        failures.push(
          `No subagent manifests found for '${taskId}'. Expected at least one under ${runsDir}/${taskId}-*/cli/<run-id>/manifest.json`
        );
      } else {
        console.log(`Delegation guard: OK (${found.length} subagent manifest(s) found).`);
        return;
      }
    }
  } else if (taskId && taskIndexReadable) {
    failures.push(
      `Task id '${taskId}' is not registered in tasks/index.json (add it or use a parent task prefix)`
    );
  }

  if (failures.length > 0) {
    console.log('Delegation guard: issues detected');
    for (const message of failures) {
      console.log(` - ${message}`);
    }
    if (candidateManifests.length > 0) {
      console.log('Candidate manifests (rejected):');
      for (const candidate of candidateManifests.slice(0, 3)) {
        console.log(` - ${candidate.path} (${candidate.reason})`);
      }
    }
    if (taskId || taskIndexReadable) {
      const expectedTaskId = taskId || exampleTaskId;
      console.log('Expected subagent manifests:');
      console.log(` - ${runsDir}/${expectedTaskId}-*/cli/<run-id>/manifest.json`);
    }
    console.log('Fix guidance:');
    if (!taskId) {
      console.log(` - export MCP_RUNNER_TASK_ID=${exampleTaskId}`);
      console.log(` - or run: node scripts/delegation-guard.mjs --task ${exampleTaskId}`);
    } else {
      console.log(` - Use MCP_RUNNER_TASK_ID="${taskId}-<stream>" for subagent runs.`);
      console.log(
        ` - Example: MCP_RUNNER_TASK_ID=${taskId}-guard npx codex-orchestrator start diagnostics --format json --task ${taskId}-guard`
      );
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

function resolveTaskId(args, env) {
  const candidates = [
    typeof args.task === 'string' ? args.task : '',
    env.MCP_RUNNER_TASK_ID,
    env.TASK,
    env.CODEX_ORCHESTRATOR_TASK_ID
  ];
  for (const candidate of candidates) {
    const value = (candidate || '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

main().catch((error) => {
  const message =
    error && typeof error === 'object' && error !== null && 'message' in error
      ? error.message
      : String(error);
  console.error(`Delegation guard failed: ${message}`);
  process.exit(1);
});
