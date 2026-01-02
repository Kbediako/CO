import { access, readdir } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';

export function resolveRepoRoot() {
  const configured =
    process.env.CODEX_ORCHESTRATOR_ROOT || process.env.CODEX_ORCHESTRATOR_REPO_ROOT;
  if (!configured) {
    return process.cwd();
  }
  if (isAbsolute(configured)) {
    return configured;
  }
  return resolve(process.cwd(), configured);
}

export function resolveRunsDir(repoRoot) {
  const configured = process.env.CODEX_ORCHESTRATOR_RUNS_DIR || '.runs';
  if (isAbsolute(configured)) {
    return configured;
  }
  return resolve(repoRoot, configured);
}

export function resolveOutDir(repoRoot) {
  const configured = process.env.CODEX_ORCHESTRATOR_OUT_DIR || 'out';
  if (isAbsolute(configured)) {
    return configured;
  }
  return resolve(repoRoot, configured);
}

export async function listDirectories(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export function parseRunIdTimestamp(runId) {
  if (typeof runId !== 'string') {
    return null;
  }
  const match = runId.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/);
  if (!match) {
    return null;
  }
  const [, date, hours, minutes, seconds, ms] = match;
  const iso = `${date}T${hours}:${minutes}:${seconds}.${ms}Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function pickLatestRunId(runIds) {
  if (!Array.isArray(runIds) || runIds.length === 0) {
    return null;
  }
  const sorted = [...runIds].sort((a, b) => {
    const aTimestamp = parseRunIdTimestamp(a)?.getTime();
    const bTimestamp = parseRunIdTimestamp(b)?.getTime();
    if (aTimestamp != null && bTimestamp != null && aTimestamp !== bTimestamp) {
      return bTimestamp - aTimestamp;
    }
    return String(b ?? '').localeCompare(String(a ?? ''));
  });
  return sorted[0] ?? null;
}

export async function collectManifests(runsDir, taskFilter) {
  const results = [];
  let taskIds = [];
  try {
    taskIds = await readdir(runsDir);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return results;
    }
    throw error;
  }

  for (const taskId of taskIds) {
    if (taskFilter && taskFilter !== taskId) {
      continue;
    }
    const taskPath = join(runsDir, taskId);
    const cliPath = join(taskPath, 'cli');
    const legacyPath = taskPath;

    const candidates = [];
    try {
      const cliRunIds = await readdir(cliPath);
      candidates.push({ root: cliPath, runIds: cliRunIds });
    } catch {
      // Ignore missing CLI directory; fall back to legacy layout.
    }

    if (candidates.length === 0) {
      try {
        const legacyRunIds = await readdir(legacyPath);
        candidates.push({ root: legacyPath, runIds: legacyRunIds });
      } catch {
        continue;
      }
    }

    for (const candidate of candidates) {
      for (const runId of candidate.runIds) {
        const manifestPath = join(candidate.root, runId, 'manifest.json');
        results.push(manifestPath);
      }
    }
  }
  return results;
}

export async function findSubagentManifests(runsDir, taskId) {
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
