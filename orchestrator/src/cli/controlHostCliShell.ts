/* eslint-disable patterns/prefer-logger-over-console */

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import process from 'node:process';

import { resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import {
  computeEffectiveDelegationConfig,
  loadDelegationConfigFiles,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides,
  type DelegationConfigLayer
} from './config/delegationConfig.js';
import { logger } from '../logger.js';
import { resolveRunPaths } from './run/runPaths.js';
import { normalizeEnvironmentPaths, normalizeTaskId } from './run/environment.js';
import {
  closeControlServerPublicLifecycle,
  startControlServerPublicLifecycle
} from './control/controlServerPublicLifecycle.js';
import { createProviderIssueHandoffService } from './control/providerIssueHandoff.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';

const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];

export interface RunControlHostCliShellParams {
  flags: ArgMap;
  printHelp: () => void;
}

export async function runControlHostCliShell(
  params: RunControlHostCliShellParams
): Promise<void> {
  if (params.flags['help'] !== undefined) {
    params.printHelp();
    return;
  }

  const baseEnv = normalizeEnvironmentPaths(resolveEnvironmentPaths());
  const taskId = normalizeTaskId(readStringFlag(params.flags, 'task') ?? 'local-mcp');
  const runId = readStringFlag(params.flags, 'run') ?? 'control-host';
  const startPipelineId = readStringFlag(params.flags, 'pipeline') ?? 'diagnostics';
  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  const env = { ...baseEnv, taskId };
  const paths = resolveRunPaths(env, runId);
  await mkdir(paths.runDir, { recursive: true });

  const configFiles = await loadDelegationConfigFiles({ repoRoot: env.repoRoot });
  const layers = [
    configFiles.global,
    configFiles.repo,
    ...collectDelegationEnvOverrides()
  ].filter(Boolean) as DelegationConfigLayer[];
  const config = computeEffectiveDelegationConfig({
    repoRoot: env.repoRoot,
    layers
  });

  const cliEntrypoint = process.argv[1];
  if (!cliEntrypoint) {
    throw new Error('Unable to resolve current codex-orchestrator CLI entrypoint.');
  }

  const lifecycle = await startControlServerPublicLifecycle({
    paths,
    config,
    runId,
    createProviderIssueHandoff: ({ providerIntakeState, persistProviderIntake }) =>
      createProviderIssueHandoffService({
        paths,
        state: providerIntakeState,
        persist: persistProviderIntake,
        startPipelineId,
        launcher: {
          start: async (input) => {
            await spawnBackgroundCli(env.repoRoot, cliEntrypoint, [
              'start',
              input.pipelineId,
              '--task',
              input.taskId,
              '--issue-provider',
              input.provider,
              '--issue-id',
              input.issueId,
              '--issue-identifier',
              input.issueIdentifier,
              ...(input.issueUpdatedAt ? ['--issue-updated-at', input.issueUpdatedAt] : [])
            ]);
          },
          resume: async (input) => {
            await spawnBackgroundCli(env.repoRoot, cliEntrypoint, [
              'resume',
              '--run',
              input.runId,
              '--actor',
              input.actor,
              '--reason',
              input.reason
            ]);
          }
        }
      })
  });

  try {
    await lifecycle.requestContextShared.providerIssueHandoff?.rehydrate();
    lifecycle.requestContextShared.runtime.publish({ source: 'provider-intake.rehydrate' });

    const payload = {
      status: 'ready',
      base_url: lifecycle.baseUrl,
      task_id: taskId,
      run_id: runId,
      run_dir: paths.runDir,
      start_pipeline_id: startPipelineId
    };
    if (format === 'json') {
      console.log(JSON.stringify(payload));
    } else {
      console.log(`Control host ready: ${lifecycle.baseUrl}`);
      console.log(`Task: ${taskId}`);
      console.log(`Run: ${runId}`);
      console.log(`Run dir: ${paths.runDir}`);
      console.log(`Start pipeline: ${startPipelineId}`);
    }

    await waitForSignal();
  } finally {
    await closeControlServerPublicLifecycle(lifecycle);
  }
}

async function spawnBackgroundCli(repoRoot: string, cliEntrypoint: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, cliEntrypoint, ...args], {
      cwd: repoRoot,
      env: process.env,
      detached: true,
      stdio: 'ignore'
    });
    child.once('error', reject);
    child.unref();
    resolve();
  });
}

function collectDelegationEnvOverrides(env: NodeJS.ProcessEnv = process.env): DelegationConfigLayer[] {
  const layers: DelegationConfigLayer[] = [];
  for (const key of CONFIG_OVERRIDE_ENV_KEYS) {
    const raw = env[key];
    if (!raw) {
      continue;
    }
    const values = splitDelegationConfigOverrides(raw);
    for (const value of values) {
      try {
        const layer = parseDelegationConfigOverride(value, 'env');
        if (layer) {
          layers.push(layer);
        }
      } catch (error) {
        logger.warn(
          `Invalid delegation config override (env): ${(error as Error)?.message ?? String(error)}`
        );
      }
    }
  }
  return layers;
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function waitForSignal(): Promise<void> {
  await new Promise<void>((resolve) => {
    const handle = () => {
      process.off('SIGINT', handle);
      process.off('SIGTERM', handle);
      resolve();
    };
    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  });
}
