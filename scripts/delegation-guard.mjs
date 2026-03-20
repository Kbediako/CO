#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { normalizeTaskKey } from './lib/docs-helpers.js';
import {
  PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV,
  readProviderControlHostLocatorFromEnv,
  readProviderControlHostLocatorFromManifest
} from './lib/provider-run-contract.js';
import { findSubagentManifests, resolveEnvironmentPaths } from './lib/run-manifests.js';

const PROVIDER_INTAKE_STATE_FILE = 'provider-intake-state.json';
const LINEAR_ADVISORY_STATE_FILE = 'linear-advisory-state.json';
const CONTROL_HOST_TASK_ID = 'local-mcp';
const CONTROL_HOST_RUN_ID = 'control-host';
const FALLBACK_CONTROL_HOST_MARKER_FILES = [
  LINEAR_ADVISORY_STATE_FILE,
  'control.json',
  'control_endpoint.json',
  'control_auth.json'
];
const SANCTIONED_PROVIDER_RUN_STATES = new Set([
  'starting',
  'running',
  'resuming',
  'resumable',
  'completed'
]);
const SANCTIONED_PROVIDER_PARENT_STATES = new Set(['starting', 'running', 'resuming', 'resumable']);

function showUsage() {
  console.log(`Usage: node scripts/delegation-guard.mjs [--task <id>] [--dry-run]

Ensures top-level tasks include at least one subagent run with manifest evidence.

Requirements:
  - A task id must be set (prefer MCP_RUNNER_TASK_ID; --task/TASK also supported)
  - tasks/index.json must include the top-level task, unless the active manifest matches a control-host provider-intake claim for a sanctioned provider-started fallback run
  - A sanctioned provider-started fallback run is treated as an already-delegated control-host child run, so that matched provider contract replaces the need for a pre-existing <task-id>-* subagent manifest for that run itself
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

function readNonEmptyString(record, key) {
  const value = record?.[key];
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

async function loadJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function describeError(error) {
  return error && typeof error === 'object' && error !== null && 'message' in error
    ? error.message
    : String(error);
}

function resolveControlHostRunLocator(env, manifest = null) {
  const explicitLocator = readExplicitControlHostRunLocator(env, manifest);
  if (explicitLocator) {
    return explicitLocator;
  }

  return { taskId: CONTROL_HOST_TASK_ID, runId: CONTROL_HOST_RUN_ID };
}

function readExplicitControlHostRunLocator(env, manifest = null) {
  const manifestLocator =
    manifest && typeof manifest === 'object' ? readProviderControlHostLocatorFromManifest(manifest) : null;
  if (manifestLocator) {
    return manifestLocator;
  }

  const envLocator = readProviderControlHostLocatorFromEnv(env);
  return envLocator ?? null;
}

function resolveControlHostProviderIntakeStatePath(runsDir, env, manifest = null) {
  const explicitLocator = readExplicitControlHostRunLocator(env, manifest);
  const locator = explicitLocator ?? resolveControlHostRunLocator(env, manifest);
  return {
    ...locator,
    explicit: explicitLocator !== null,
    statePath: join(runsDir, locator.taskId, 'cli', locator.runId, PROVIDER_INTAKE_STATE_FILE)
  };
}

async function loadControlHostProviderIntakeState(runsDir, env, manifest = null) {
  const { statePath, taskId, runId, explicit } = resolveControlHostProviderIntakeStatePath(
    runsDir,
    env,
    manifest
  );
  try {
    const state = await loadJson(statePath);
    return { statePath, taskId, runId, explicit, state, error: null };
  } catch (error) {
    if (error && typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      if (!explicit) {
        return { statePath, taskId, runId, explicit, state: null, error: null };
      }
      return {
        statePath,
        taskId,
        runId,
        explicit,
        state: null,
        error: `Control-host provider-intake state '${statePath}' is missing for explicit locator '${taskId}/${runId}'`
      };
    }
    return {
      statePath,
      taskId,
      runId,
      explicit,
      state: null,
      error: `Control-host provider-intake state '${statePath}' could not be read (${describeError(error)})`
    };
  }
}

async function discoverFallbackControlHostProviderIntakeStates(runsDir, excludedStatePath = '') {
  const candidates = [];
  let taskEntries;
  try {
    taskEntries = await readdir(runsDir, { withFileTypes: true });
  } catch (error) {
    return {
      states: [],
      error: `Unable to scan runs directory '${runsDir}' for fallback control-host state (${describeError(error)})`
    };
  }

  for (const taskEntry of taskEntries) {
    if (!taskEntry.isDirectory()) {
      continue;
    }
    const cliDir = join(runsDir, taskEntry.name, 'cli');
    let runEntries;
    try {
      runEntries = await readdir(cliDir, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      return {
        states: [],
        error: `Unable to scan '${cliDir}' for fallback control-host state (${describeError(error)})`
      };
    }

    for (const runEntry of runEntries) {
      if (!runEntry.isDirectory()) {
        continue;
      }
      const runDir = join(cliDir, runEntry.name);
      const statePath = join(runDir, PROVIDER_INTAKE_STATE_FILE);
      if (statePath === excludedStatePath) {
        continue;
      }
      try {
        await access(statePath);
      } catch (error) {
        continue;
      }
      const hasMarker = await hasFallbackControlHostMarker(runDir);
      if (!hasMarker) {
        continue;
      }
      try {
        candidates.push({
          taskId: taskEntry.name,
          runId: runEntry.name,
          statePath,
          state: await loadJson(statePath)
        });
      } catch (error) {
        continue;
      }
    }
  }

  return { states: candidates, error: null };
}

async function hasFallbackControlHostMarker(runDir) {
  for (const markerFile of FALLBACK_CONTROL_HOST_MARKER_FILES) {
    try {
      await access(join(runDir, markerFile));
      return true;
    } catch (error) {
      continue;
    }
  }
  return false;
}

function buildProviderContractCandidate(taskId, manifest) {
  const manifestTaskId = readNonEmptyString(manifest, 'task_id');
  const provider = readNonEmptyString(manifest, 'issue_provider');
  const issueId = readNonEmptyString(manifest, 'issue_id');
  const issueIdentifier = readNonEmptyString(manifest, 'issue_identifier');
  if (!manifestTaskId || manifestTaskId !== taskId || !provider || !issueId || !issueIdentifier) {
    return null;
  }
  return {
    taskId,
    provider,
    issueId,
    issueIdentifier
  };
}

async function loadActiveManifestForTask(taskId, env, label) {
  const manifestPath = readNonEmptyString(env, 'CODEX_ORCHESTRATOR_MANIFEST_PATH');
  if (!manifestPath) {
    return { manifestPath: null, manifest: null, error: null };
  }

  let manifest;
  try {
    manifest = await loadJson(manifestPath);
  } catch (error) {
    const message =
      error && typeof error === 'object' && error !== null && 'message' in error
        ? error.message
        : String(error);
    return {
      manifestPath,
      manifest: null,
      error: `${label} manifest '${manifestPath}' could not be read (${message})`
    };
  }

  const manifestTaskId = readNonEmptyString(manifest, 'task_id');
  if (!manifestTaskId || manifestTaskId !== taskId) {
    return {
      manifestPath,
      manifest: null,
      error: `${label} manifest '${manifestPath}' does not match task id '${taskId}'`
    };
  }

  const status = readNonEmptyString(manifest, 'status');
  if (status !== 'in_progress') {
    return {
      manifestPath,
      manifest: null,
      error: `${label} manifest '${manifestPath}' for '${taskId}' must remain in_progress`
    };
  }

  return { manifestPath, manifest, error: null };
}

function readProviderLaunchContext(env) {
  return {
    launchSource: readNonEmptyString(env, PROVIDER_LAUNCH_SOURCE_ENV),
    launchToken: readNonEmptyString(env, PROVIDER_LAUNCH_TOKEN_ENV)
  };
}

function validateProviderLaunchContext(taskId, env) {
  const launchContext = readProviderLaunchContext(env);
  if (!launchContext.launchSource && !launchContext.launchToken) {
    return {
      launchContext,
      error: `Provider-started task id '${taskId}' is missing control-host launch provenance`
    };
  }
  if (launchContext.launchSource !== PROVIDER_LAUNCH_SOURCE_CONTROL_HOST) {
    return {
      launchContext,
      error: `Provider-started task id '${taskId}' did not originate from control-host launch provenance`
    };
  }
  if (!launchContext.launchToken) {
    return {
      launchContext,
      error: `Provider-started task id '${taskId}' is missing a control-host launch token`
    };
  }
  return { launchContext, error: null };
}

function matchesProviderClaim(claim, contract) {
  const provider = readNonEmptyString(claim, 'provider');
  const issueId = readNonEmptyString(claim, 'issue_id');
  const issueIdentifier = readNonEmptyString(claim, 'issue_identifier');
  const taskId = readNonEmptyString(claim, 'task_id');
  const mappingSource = readNonEmptyString(claim, 'mapping_source');
  const state = readNonEmptyString(claim, 'state');
  const reason = readNonEmptyString(claim, 'reason');
  const launchSource = readNonEmptyString(claim, 'launch_source');
  const launchToken = readNonEmptyString(claim, 'launch_token');
  const runId = readNonEmptyString(claim, 'run_id');
  const runManifestPath = readNonEmptyString(claim, 'run_manifest_path');
  const canonicalManifestPath =
    runId.length > 0 ? join(contract.runsDir, contract.taskId, 'cli', runId, 'manifest.json') : '';
  return (
    provider === contract.provider &&
    issueId === contract.issueId &&
    issueIdentifier === contract.issueIdentifier &&
    taskId === contract.taskId &&
    mappingSource === 'provider_id_fallback' &&
    SANCTIONED_PROVIDER_RUN_STATES.has(state) &&
    reason.startsWith('provider_issue_') &&
    launchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST &&
    launchToken === contract.launchToken &&
    (!runManifestPath ||
      runManifestPath === contract.manifestPath ||
      (canonicalManifestPath.length > 0 && canonicalManifestPath === contract.manifestPath))
  );
}

function matchesProviderParentClaim(claim, taskId) {
  const claimTaskId = readNonEmptyString(claim, 'task_id');
  const provider = readNonEmptyString(claim, 'provider');
  const issueId = readNonEmptyString(claim, 'issue_id');
  const issueIdentifier = readNonEmptyString(claim, 'issue_identifier');
  const mappingSource = readNonEmptyString(claim, 'mapping_source');
  const state = readNonEmptyString(claim, 'state');
  const reason = readNonEmptyString(claim, 'reason');
  const launchSource = readNonEmptyString(claim, 'launch_source');
  const launchToken = readNonEmptyString(claim, 'launch_token');
  const runId = readNonEmptyString(claim, 'run_id');
  const runManifestPath = readNonEmptyString(claim, 'run_manifest_path');
  if (
    !(
      claimTaskId.length > 0 &&
      provider.length > 0 &&
      issueId.length > 0 &&
      issueIdentifier.length > 0 &&
      taskId.startsWith(`${claimTaskId}-`) &&
      mappingSource === 'provider_id_fallback' &&
      SANCTIONED_PROVIDER_PARENT_STATES.has(state) &&
      reason.startsWith('provider_issue_') &&
      launchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST &&
      launchToken.length > 0 &&
      runId.length > 0
    )
  ) {
    return null;
  }
  return {
    parentTaskId: claimTaskId,
    provider,
    issueId,
    issueIdentifier,
    parentRunId: runId,
    runManifestPath
  };
}

function resolveProviderParentManifestPaths(runsDir, contract) {
  const canonicalPath = join(runsDir, contract.parentTaskId, 'cli', contract.parentRunId, 'manifest.json');
  if (!contract.runManifestPath || contract.runManifestPath === canonicalPath) {
    return [canonicalPath];
  }
  return [contract.runManifestPath, canonicalPath];
}

async function hasActiveProviderParentManifest(runsDir, contract) {
  for (const manifestPath of resolveProviderParentManifestPaths(runsDir, contract)) {
    let manifest;
    try {
      manifest = await loadJson(manifestPath);
    } catch {
      continue;
    }
    if (
      readNonEmptyString(manifest, 'task_id') === contract.parentTaskId &&
      readNonEmptyString(manifest, 'run_id') === contract.parentRunId &&
      readNonEmptyString(manifest, 'issue_provider') === contract.provider &&
      readNonEmptyString(manifest, 'issue_id') === contract.issueId &&
      readNonEmptyString(manifest, 'issue_identifier') === contract.issueIdentifier &&
      readNonEmptyString(manifest, 'status') === 'in_progress'
    ) {
      return true;
    }
  }
  return false;
}

async function resolveProviderParentClaim(runsDir, claim, taskId) {
  const contract = matchesProviderParentClaim(claim, taskId);
  if (!contract) {
    return null;
  }
  return (await hasActiveProviderParentManifest(runsDir, contract)) ? contract : null;
}

async function collectProviderParentContracts(runsDir, state, taskId, statePath) {
  const candidateContracts = [];
  const claims = Array.isArray(state?.claims) ? state.claims : [];
  for (const claim of claims) {
    const contract = await resolveProviderParentClaim(runsDir, claim, taskId);
    if (contract) {
      candidateContracts.push({
        ...contract,
        statePath
      });
    }
  }
  return candidateContracts;
}

async function findProviderContractProof(runsDir, taskId, env) {
  const { manifestPath, manifest, error } = await loadActiveManifestForTask(
    taskId,
    env,
    'Provider-run'
  );
  if (!manifestPath) {
    return { matched: false, contract: null, statePath: null, error: null };
  }
  if (error) {
    return {
      matched: false,
      contract: null,
      statePath: null,
      error
    };
  }

  const contract = buildProviderContractCandidate(taskId, manifest);
  if (!contract) {
    return { matched: false, contract: null, statePath: null, error: null };
  }
  const { launchContext, error: launchContextError } = validateProviderLaunchContext(taskId, env);
  if (launchContextError) {
    return {
      matched: false,
      contract: null,
      statePath: null,
      error: launchContextError
    };
  }
  contract.manifestPath = manifestPath;
  contract.launchToken = launchContext.launchToken;
  contract.runsDir = runsDir;

  const { statePath, explicit, state, error: stateError } = await loadControlHostProviderIntakeState(
    runsDir,
    env,
    manifest
  );
  if (stateError) {
    return { matched: false, contract, statePath, error: stateError };
  }
  const claims = Array.isArray(state?.claims) ? state.claims : [];
  if (claims.some((claim) => matchesProviderClaim(claim, contract))) {
    return { matched: true, contract, statePath, error: null };
  }
  if (explicit) {
    return { matched: false, contract, statePath, error: null };
  }

  const { states: fallbackStates, error: fallbackError } = await discoverFallbackControlHostProviderIntakeStates(
    runsDir,
    statePath
  );
  if (fallbackError) {
    return {
      matched: false,
      contract,
      statePath,
      error: stateError ?? fallbackError
    };
  }
  for (const fallbackState of fallbackStates) {
    const fallbackClaims = Array.isArray(fallbackState.state?.claims) ? fallbackState.state.claims : [];
    if (fallbackClaims.some((claim) => matchesProviderClaim(claim, contract))) {
      return { matched: true, contract, statePath: fallbackState.statePath, error: null };
    }
  }

  return { matched: false, contract, statePath, error: stateError };
}

async function findProviderParentTaskProof(runsDir, taskId, env) {
  const { manifestPath, manifest, error } = await loadActiveManifestForTask(
    taskId,
    env,
    'Provider-child'
  );
  if (error) {
    return {
      matched: false,
      parentTaskId: null,
      statePath: null,
      error
    };
  }
  if (!manifestPath || !manifest) {
    return {
      matched: false,
      parentTaskId: null,
      statePath: null,
      error: `Provider-child task id '${taskId}' is missing active manifest context for provider-parent validation`
    };
  }
  if (buildProviderContractCandidate(taskId, manifest)) {
    return {
      matched: false,
      parentTaskId: null,
      statePath: null,
      error: null
    };
  }
  const childParentRunId = manifest ? readNonEmptyString(manifest, 'parent_run_id') : '';

  const { statePath, explicit, state, error: stateError } = await loadControlHostProviderIntakeState(
    runsDir,
    env,
    manifest
  );
  if (stateError) {
    return {
      matched: false,
      parentTaskId: null,
      statePath,
      error: stateError
    };
  }
  const candidateContracts = await collectProviderParentContracts(runsDir, state, taskId, statePath);

  let matchedStatePath = statePath;
  let fallbackError = null;
  const hasMatchingParentRun = childParentRunId
    ? candidateContracts.some((contract) => contract.parentRunId === childParentRunId)
    : false;
  if ((!childParentRunId || !hasMatchingParentRun) && !explicit) {
    const { states: fallbackStates, error: discoveredFallbackError } =
      await discoverFallbackControlHostProviderIntakeStates(runsDir, statePath);
    if (discoveredFallbackError) {
      fallbackError = discoveredFallbackError;
    } else {
      for (const fallbackState of fallbackStates) {
        const fallbackContracts = await collectProviderParentContracts(
          runsDir,
          fallbackState.state,
          taskId,
          fallbackState.statePath
        );
        if (fallbackContracts.length > 0) {
          candidateContracts.push(...fallbackContracts);
          if (fallbackContracts.some((contract) => contract.parentRunId === childParentRunId)) {
            matchedStatePath = fallbackState.statePath;
          }
        }
      }
    }
  }

  if (!childParentRunId) {
    if (candidateContracts.length === 0) {
      return {
        matched: false,
        parentTaskId: null,
        statePath: matchedStatePath,
        error: fallbackError
      };
    }
    return {
      matched: false,
      parentTaskId: null,
      statePath: matchedStatePath,
      error: `Provider-child task id '${taskId}' is missing parent_run_id in active manifest '${manifestPath}'`
    };
  }

  if (candidateContracts.length === 0) {
    return {
      matched: false,
      parentTaskId: null,
      statePath: matchedStatePath,
      error: fallbackError
    };
  }

  let bestMatch = null;
  let mismatchError = null;

  for (const contract of candidateContracts) {
    if (contract.parentRunId !== childParentRunId) {
      mismatchError =
        mismatchError ??
        `Provider-child task id '${taskId}' parent_run_id '${childParentRunId}' does not match sanctioned provider parent run '${contract.parentRunId}'`;
      continue;
    }
    if (!bestMatch || contract.parentTaskId.length > bestMatch.parentTaskId.length) {
      bestMatch = {
        matched: true,
        parentTaskId: contract.parentTaskId,
        statePath: contract.statePath ?? matchedStatePath,
        error: null
      };
    }
  }

  return bestMatch ?? {
    matched: false,
    parentTaskId: null,
    statePath: matchedStatePath,
    error: mismatchError ?? fallbackError
  };
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

  if (taskId) {
    const isTopLevel = taskKeys.includes(taskId);
    let parentKey = isTopLevel
      ? taskId
      : taskKeys.find((key) => taskId.startsWith(`${key}-`));
    let providerParentProof = null;

    if (!parentKey) {
      providerParentProof = await findProviderParentTaskProof(runsDir, taskId, process.env);
      if (providerParentProof.error) {
        failures.push(providerParentProof.error);
      }
      if (providerParentProof.matched) {
        parentKey = providerParentProof.parentTaskId;
      }
    }

    if (!parentKey) {
      const providerProof = await findProviderContractProof(runsDir, taskId, process.env);
      if (providerProof.matched) {
        if (failures.length === 0) {
          console.log(
            `Delegation guard: '${taskId}' accepted via provider-intake contract (${providerProof.statePath}).`
          );
          console.log('Delegation guard: OK (provider-started run contract matched).');
          return;
        }
      } else {
        if (providerProof.error) {
          failures.push(providerProof.error);
        }
        if (providerProof.contract) {
          failures.push(
            `Provider-started task id '${taskId}' did not match any control-host provider-intake claim in ${providerProof.statePath}`
          );
        }
      }
      if (taskIndexReadable) {
        failures.push(
          `Task id '${taskId}' is not registered in tasks/index.json (add it or use a parent task prefix)`
        );
      }
    } else if (parentKey !== taskId) {
      if (failures.length === 0) {
        if (providerParentProof?.matched) {
          console.log(
            `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentKey}' (${providerParentProof.statePath}).`
          );
        } else {
          console.log(`Delegation guard: '${taskId}' treated as subagent run for '${parentKey}'.`);
        }
        console.log('Delegation guard: OK (subagent runs are exempt).');
        return;
      }
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
