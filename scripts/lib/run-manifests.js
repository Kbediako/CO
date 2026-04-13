import { access, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const DEFAULT_TASK_ID = '0101';
const DEFAULT_RUN_LAYOUT = 'cli';
const PROVIDER_WORKSPACE_ROOT_DIRNAME = '.workspaces';
const PROVIDER_LINEAR_WORKER_PIPELINE_ID = 'provider-linear-worker';
const PRESERVE_PROVIDER_ARTIFACT_ROOTS_ENV =
  'CODEX_ORCHESTRATOR_PRESERVE_PROVIDER_ARTIFACT_ROOTS';

function resolveConfiguredPath(configured, cwd) {
  if (isAbsolute(configured)) {
    return resolve(configured);
  }
  return resolve(cwd, configured);
}

function normalizeTaskId(value) { return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null; }

function resolveConfiguredTaskId(env) { return normalizeTaskId(env.MCP_RUNNER_TASK_ID) ?? normalizeTaskId(env.CODEX_ORCHESTRATOR_TASK_ID) ?? normalizeTaskId(env.TASK); }

function resolveProviderTaskId(env, cwd) { const cwdRoot = resolve(cwd), cwdTask = basename(dirname(cwdRoot)) === PROVIDER_WORKSPACE_ROOT_DIRNAME ? basename(cwdRoot) : null; return cwdTask && [normalizeTaskId(env.CODEX_ORCHESTRATOR_TASK_ID), normalizeTaskId(env.MCP_RUNNER_TASK_ID), normalizeTaskId(env.TASK)].includes(cwdTask) ? cwdTask : resolveConfiguredTaskId(env); }

function isProviderIssueWorkspaceRootForTask(candidate, taskId) {
  return (
    typeof candidate === 'string' &&
    candidate.length > 0 &&
    basename(candidate) === taskId &&
    basename(dirname(candidate)) === PROVIDER_WORKSPACE_ROOT_DIRNAME
  );
}

function providerIssueWorkspaceOverrideForCwd(configuredRoot, env, cwd) {
  if (env.CODEX_ORCHESTRATOR_PIPELINE_ID !== PROVIDER_LINEAR_WORKER_PIPELINE_ID) {
    return null;
  }
  const taskId = resolveProviderTaskId(env, cwd);
  if (!taskId) {
    return null;
  }
  const resolvedCwd = resolve(cwd);
  if (!isProviderIssueWorkspaceRootForTask(resolvedCwd, taskId)) {
    return null;
  }
  const sharedRoot = dirname(dirname(resolvedCwd));
  return sharedRoot === configuredRoot ? resolvedCwd : null;
}

function resolveRepoRoot(env, cwd) {
  const configured = env.CODEX_ORCHESTRATOR_ROOT;
  if (!configured) {
    return cwd;
  }
  const configuredRoot = resolveConfiguredPath(configured, cwd);
  return providerIssueWorkspaceOverrideForCwd(configuredRoot, env, cwd) ?? configuredRoot;
}

function resolveProviderSharedRootForIssueWorkspace(repoRoot, env, cwd) {
  const taskId = resolveProviderTaskId(env, repoRoot);
  if (!taskId || !isProviderIssueWorkspaceRootForTask(repoRoot, taskId)) {
    return null;
  }
  const configured = env.CODEX_ORCHESTRATOR_ROOT;
  if (!configured) {
    return null;
  }
  const configuredRoot = resolveConfiguredPath(configured, cwd);
  const sharedRoot = dirname(dirname(repoRoot));
  return configuredRoot === sharedRoot ? sharedRoot : null;
}

function isPathWithinRoot(root, candidate) {
  const relativePath = relative(root, candidate);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') &&
      !relativePath.startsWith(`..${sep}`) &&
      !isAbsolute(relativePath))
  );
}

function firstPathSegment(relativePath) {
  return relativePath.split(sep).filter((segment) => segment.length > 0)[0] ?? '';
}

function isDefaultRunsLayoutSegment(segment) {
  return segment === '.runs' || segment === 'runs';
}

function resolveConfiguredArtifactRoot(baseRoot, configured, fallbackDirname) {
  if (!configured) {
    return resolve(baseRoot, fallbackDirname);
  }
  return isAbsolute(configured) ? resolve(configured) : resolve(baseRoot, configured);
}

function resolveWorkspaceArtifactRootForSharedRoot(
  repoRoot,
  sharedRoot,
  sharedArtifactRoot,
  fallbackDirname,
  allowCustomCounterpart = false
) {
  if (!sharedRoot || !isPathWithinRoot(sharedRoot, sharedArtifactRoot)) {
    return null;
  }
  const relativeArtifactRoot = relative(sharedRoot, sharedArtifactRoot);
  const firstSegment = firstPathSegment(relativeArtifactRoot);
  if (
    (fallbackDirname === '.runs' && isDefaultRunsLayoutSegment(firstSegment)) ||
    firstSegment === fallbackDirname ||
    allowCustomCounterpart
  ) {
    return resolve(repoRoot, relativeArtifactRoot);
  }
  return null;
}

function resolveProviderWorkspaceManifestCounterpartPath(repoRoot, env, cwd) {
  const manifestPath = env.CODEX_ORCHESTRATOR_MANIFEST_PATH || env.MANIFEST;
  if (!manifestPath) {
    return null;
  }
  const inheritedSharedRoot = resolveProviderSharedRootForIssueWorkspace(repoRoot, env, cwd);
  const sharedRoot = dirname(dirname(repoRoot));
  const resolvedManifestPath = resolveConfiguredPath(manifestPath, inheritedSharedRoot ?? repoRoot);
  if (isPathWithinRoot(repoRoot, resolvedManifestPath)) {
    return resolvedManifestPath;
  }
  const sharedRunsRoot = resolveConfiguredArtifactRoot(
    inheritedSharedRoot ?? sharedRoot,
    env.CODEX_ORCHESTRATOR_RUNS_DIR || '.runs',
    '.runs'
  );
  if (!isPathWithinRoot(sharedRunsRoot, resolvedManifestPath)) {
    return resolvedManifestPath;
  }
  const workspaceRunsRoot = resolveWorkspaceArtifactRootForSharedRoot(
    repoRoot,
    sharedRoot,
    sharedRunsRoot,
    '.runs',
    true
  );
  if (!workspaceRunsRoot) {
    return null;
  }
  const workspaceManifestPath = resolve(
    workspaceRunsRoot,
    relative(sharedRunsRoot, resolvedManifestPath)
  );
  return existsSync(workspaceManifestPath) ? workspaceManifestPath : null;
}

function shouldScopeProviderArtifactDirs(repoRoot, env, cwd) {
  if (env.CODEX_ORCHESTRATOR_PIPELINE_ID !== PROVIDER_LINEAR_WORKER_PIPELINE_ID) {
    return false;
  }
  const taskId = resolveProviderTaskId(env, repoRoot);
  if (!taskId || !isProviderIssueWorkspaceRootForTask(repoRoot, taskId)) {
    return false;
  }
  if (
    env[PRESERVE_PROVIDER_ARTIFACT_ROOTS_ENV] === '1' &&
    !providerWorkspaceManifestCounterpartExists(repoRoot, env, cwd)
  ) {
    return false;
  }
  return true;
}

function providerWorkspaceManifestCounterpartExists(repoRoot, env, cwd) {
  const manifestPath = env.CODEX_ORCHESTRATOR_MANIFEST_PATH || env.MANIFEST;
  if (!manifestPath) {
    return true;
  }
  const counterpartPath = resolveProviderWorkspaceManifestCounterpartPath(repoRoot, env, cwd);
  if (counterpartPath) {
    return true;
  }
  const inheritedSharedRoot = resolveProviderSharedRootForIssueWorkspace(repoRoot, env, cwd);
  const sharedRoot = dirname(dirname(repoRoot));
  const resolvedManifestPath = resolveConfiguredPath(manifestPath, inheritedSharedRoot ?? repoRoot);
  if (isPathWithinRoot(repoRoot, resolvedManifestPath)) {
    return true;
  }
  const sharedRunsRoot = resolveConfiguredArtifactRoot(
    inheritedSharedRoot ?? sharedRoot,
    env.CODEX_ORCHESTRATOR_RUNS_DIR || '.runs',
    '.runs'
  );
  if (!isPathWithinRoot(sharedRunsRoot, resolvedManifestPath)) {
    return true;
  }
  return false;
}

function resolveArtifactDir(
  repoRoot,
  configured,
  fallbackDirname,
  scopeToRepoRoot,
  baseRoot = repoRoot,
  hasProviderWorkspaceManifestCounterpart = false,
  sharedRootForCounterpart = baseRoot
) {
  const relativeBaseRoot = scopeToRepoRoot ? repoRoot : baseRoot;
  const fallback = resolve(relativeBaseRoot, fallbackDirname);
  if (!configured) {
    return fallback;
  }
  const candidate =
    scopeToRepoRoot && !isAbsolute(configured)
      ? resolve(repoRoot, configured)
      : resolveConfiguredArtifactRoot(baseRoot, configured, fallbackDirname);
  if (scopeToRepoRoot && !isPathWithinRoot(repoRoot, candidate)) {
    const workspaceArtifactRoot = resolveWorkspaceArtifactRootForSharedRoot(
      repoRoot,
      sharedRootForCounterpart,
      candidate,
      fallbackDirname,
      hasProviderWorkspaceManifestCounterpart
    );
    if (workspaceArtifactRoot) {
      return workspaceArtifactRoot;
    }
  }
  return candidate;
}

function resolveRunsDir(
  repoRoot,
  env,
  scopeToRepoRoot,
  baseRoot = repoRoot,
  hasProviderWorkspaceManifestCounterpart = false,
  sharedRootForCounterpart = baseRoot
) {
  return resolveArtifactDir(
    repoRoot,
    env.CODEX_ORCHESTRATOR_RUNS_DIR || '.runs',
    '.runs',
    scopeToRepoRoot,
    baseRoot,
    hasProviderWorkspaceManifestCounterpart,
    sharedRootForCounterpart
  );
}

function resolveOutDir(
  repoRoot,
  env,
  scopeToRepoRoot,
  baseRoot = repoRoot,
  hasProviderWorkspaceManifestCounterpart = false,
  sharedRootForCounterpart = baseRoot
) {
  return resolveArtifactDir(
    repoRoot,
    env.CODEX_ORCHESTRATOR_OUT_DIR || 'out',
    'out',
    scopeToRepoRoot,
    baseRoot,
    hasProviderWorkspaceManifestCounterpart,
    sharedRootForCounterpart
  );
}

export function resolveEnvironmentPathsForProcess(env = process.env, cwd = process.cwd()) {
  const repoRoot = resolveRepoRoot(env, cwd);
  const providerSharedRoot = resolveProviderSharedRootForIssueWorkspace(repoRoot, env, cwd);
  const providerWorkspaceManifestCounterpartPath = resolveProviderWorkspaceManifestCounterpartPath(
    repoRoot,
    env,
    cwd
  );
  const scopeProviderArtifacts = shouldScopeProviderArtifactDirs(repoRoot, env, cwd);
  const artifactBaseRoot = providerSharedRoot ?? repoRoot;
  const sharedRootForCounterpart = providerSharedRoot ?? dirname(dirname(repoRoot));
  const hasProviderWorkspaceManifestCounterpart = Boolean(providerWorkspaceManifestCounterpartPath);
  const runsRoot = resolveRunsDir(
    repoRoot,
    env,
    scopeProviderArtifacts,
    artifactBaseRoot,
    hasProviderWorkspaceManifestCounterpart,
    sharedRootForCounterpart
  );
  const outRoot = resolveOutDir(
    repoRoot,
    env,
    scopeProviderArtifacts,
    artifactBaseRoot,
    hasProviderWorkspaceManifestCounterpart,
    sharedRootForCounterpart
  );
  const taskId = (env.CODEX_ORCHESTRATOR_PIPELINE_ID === PROVIDER_LINEAR_WORKER_PIPELINE_ID ? resolveProviderTaskId(env, repoRoot) : resolveConfiguredTaskId(env)) ?? DEFAULT_TASK_ID;
  return { repoRoot, runsRoot, outRoot, taskId };
}

export function resolveEnvironmentPaths() {
  return resolveEnvironmentPathsForProcess(process.env, process.cwd());
}

export function resolveRunDir(options) {
  const { runsRoot, taskId, runId, layout = DEFAULT_RUN_LAYOUT } = options ?? {};
  if (!runsRoot || !taskId || !runId) {
    throw new Error('resolveRunDir requires runsRoot, taskId, and runId');
  }
  if (layout !== 'cli' && layout !== 'legacy') {
    throw new Error(`resolveRunDir received unsupported layout: ${layout}`);
  }
  if (layout === 'legacy') {
    return join(runsRoot, taskId, runId);
  }
  return join(runsRoot, taskId, 'cli', runId);
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
  let taskEntries = [];
  try {
    taskEntries = await readdir(runsDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return results;
    }
    throw error;
  }

  for (const taskEntry of taskEntries) {
    if (!taskEntry.isDirectory()) {
      continue;
    }
    const taskId = taskEntry.name;
    if (taskFilter && taskFilter !== taskId) {
      continue;
    }
    const taskPath = join(runsDir, taskId);
    const cliPath = join(taskPath, 'cli');
    const legacyPath = taskPath;

    const candidates = [];
    const cliRunIds = await listDirectories(cliPath);
    if (cliRunIds.length > 0) {
      candidates.push({ root: cliPath, runIds: cliRunIds });
    }

    if (candidates.length === 0) {
      const legacyRunIds = (await listDirectories(legacyPath)).filter((name) => name !== 'cli');
      if (legacyRunIds.length > 0) {
        candidates.push({ root: legacyPath, runIds: legacyRunIds });
      }
    }

    for (const candidate of candidates) {
      for (const runId of candidate.runIds) {
        const manifestPath = join(candidate.root, runId, 'manifest.json');
        try {
          await access(manifestPath);
          results.push(manifestPath);
        } catch {
          // Only return manifest paths that exist on disk.
        }
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
