#!/usr/bin/env node
/**
 * MCP runner migration utility.
 *
 * Relocates legacy .runs/local-mcp/<run-id> directories into the
 * task-scoped hierarchy (.runs/0001/mcp/<run-id>) and drops a
 * backward-compatible pointer stub/symlink for legacy consumers.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { constants, createCompatibilityPointer, isoTimestamp, timestampForRunId } from './agents_mcp_runner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { repoRoot, legacyRunsRoot, taskRunsRoot, TASK_ID } = constants;

const migrationsRoot = path.join(repoRoot, '.runs', TASK_ID, 'migrations');

async function writeJsonAtomic(targetPath, data) {
  const tmpPath = `${targetPath}.tmp`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, targetPath);
}

async function listLegacyRuns() {
  try {
    const entries = await fs.readdir(legacyRunsRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function readManifest(manifestPath) {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

async function migrateRun(runId, { dryRun }) {
  const sourceDir = path.join(legacyRunsRoot, runId);
  const destinationDir = path.join(taskRunsRoot, runId);
  const manifestPath = path.join(sourceDir, 'manifest.json');

  const result = {
    run_id: runId,
    source: path.relative(repoRoot, sourceDir),
    destination: path.relative(repoRoot, destinationDir),
    status: 'skipped',
    message: '',
  };

  try {
    await fs.access(manifestPath);
  } catch (error) {
    result.status = 'error';
    result.message = `Manifest missing: ${error.message ?? error}`;
    return result;
  }

  if (await exists(destinationDir)) {
    result.status = 'skipped';
    result.message = 'Destination already exists; no action taken.';
    return result;
  }

  if (dryRun) {
    result.status = 'planned';
    result.message = 'Would migrate directory.';
    return result;
  }

  await fs.mkdir(path.dirname(destinationDir), { recursive: true });
  await fs.rename(sourceDir, destinationDir);

  const manifest = await readManifest(path.join(destinationDir, 'manifest.json'));
  manifest.task_id = manifest.task_id ?? TASK_ID;
  manifest.artifact_root = path.relative(repoRoot, destinationDir);
  manifest.compat_path = path.relative(repoRoot, path.join(legacyRunsRoot, runId));
  manifest.metrics_recorded = manifest.metrics_recorded ?? true;
  manifest.resume_token = manifest.resume_token ?? null;
  manifest.resume_events = manifest.resume_events ?? [];
  manifest.updated_at = isoTimestamp();

  await writeJsonAtomic(path.join(destinationDir, 'manifest.json'), manifest);
  await createCompatibilityPointer(runId, path.join(destinationDir, 'manifest.json'), destinationDir);

  result.status = 'migrated';
  result.message = 'Migrated successfully.';
  return result;
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let dryRun = false;
  let runIdFilter = null;

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run':
        dryRun = true;
        break;
      case '--run-id': {
        const value = args[++i];
        if (!value) {
          throw new Error('--run-id requires a value.');
        }
        runIdFilter = value;
        break;
      }
      case '--help':
      case '-h':
        printHelp();
        return;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  const candidates = await listLegacyRuns();
  const runIds = runIdFilter ? candidates.filter((id) => id === runIdFilter) : candidates;

  if (runIds.length === 0) {
    console.log('No legacy MCP runs found to migrate.');
    return;
  }

  const results = [];
  for (const runId of runIds) {
    const outcome = await migrateRun(runId, { dryRun });
    results.push(outcome);
    console.log(`${runId}: ${outcome.status} — ${outcome.message}`);
  }

  const logPayload = {
    generated_at: isoTimestamp(),
    dry_run: dryRun,
    repo_root: repoRoot,
    legacy_root: path.relative(repoRoot, legacyRunsRoot),
    task_runs_root: path.relative(repoRoot, taskRunsRoot),
    runs: results,
  };

  await fs.mkdir(migrationsRoot, { recursive: true });
  const logName = `${timestampForRunId()}-${dryRun ? 'dry-run' : 'migration'}.log`;
  const logPath = path.join(migrationsRoot, logName);
  await writeJsonAtomic(logPath, logPayload);

  console.log(`Migration log written to ${path.relative(repoRoot, logPath)}`);
}

function printHelp() {
  console.log(`Usage: scripts/mcp-runner-migrate.js [--dry-run] [--run-id <id>]`);
  console.log('Moves legacy .runs/local-mcp/<run-id> directories into .runs/0001/mcp/.');
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  try {
    await main();
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}

export { listLegacyRuns, migrateRun, main };
