import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import { createProviderWorkflowConfigStore } from '../src/cli/control/providerWorkflowConfigStore.js';
import { REPO_CONFIG_PATH_ENV_KEY } from '../src/cli/config/userConfig.js';
import { logger } from '../src/logger.js';

let workspaceRoot: string;
let revisionTick = 0;
const initialRepoConfigPathEnv = process.env[REPO_CONFIG_PATH_ENV_KEY];

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'provider-workflow-store-'));
  revisionTick = 0;
});

afterEach(async () => {
  if (initialRepoConfigPathEnv === undefined) {
    delete process.env[REPO_CONFIG_PATH_ENV_KEY];
  } else {
    process.env[REPO_CONFIG_PATH_ENV_KEY] = initialRepoConfigPathEnv;
  }
  vi.restoreAllMocks();
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('providerWorkflowConfigStore', () => {
  it('fails closed at startup when the repo config is missing', async () => {
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await expect(store.bootstrap()).rejects.toThrow(
      /Failed to load provider workflow config path=.*codex\.orchestrator\.json/
    );
  });

  it('keeps the last known good snapshot when a later reload becomes invalid', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    expect(bootstrapped.status).toBe('ready');
    expect(JSON.parse(initialSnapshot)).toMatchObject({
      pipelines: [{ id: 'provider-linear-worker', title: 'Provider worker v1' }]
    });

    await writeRepoConfig('{ invalid json');
    const degraded = await store.refresh();

    expect(degraded.status).toBe('reload_failed');
    expect(degraded.snapshot_path).toBe(snapshotPath);
    expect(degraded.last_error).toBeTruthy();
    expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('keeping last known good configuration')
    );
  });

  it('replaces the snapshot and clears the error when a later valid reload succeeds', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    await writeRepoConfig('{ invalid json');
    const degraded = await store.refresh();

    expect(degraded.status).toBe('reload_failed');
    expect(degraded.last_error).toBeTruthy();

    await writeRepoConfig(buildValidProviderConfig('v2'));
    const recovered = await store.refresh();
    const snapshotPath = await store.getLaunchConfigPath();
    const recoveredSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
      pipelines: Array<{ title: string }>;
    };

    expect(recovered.status).toBe('ready');
    expect(recovered.last_error).toBeNull();
    expect(recovered.last_error_at).toBeNull();
    expect(recovered.last_success_at).toBeTruthy();
    expect(recoveredSnapshot.pipelines[0]?.title).toBe('Provider worker v2');
  });

  it('watches the resolved repo-config override path when one is provided', async () => {
    const overridePath = join(workspaceRoot, 'config', 'provider.json');
    process.env[REPO_CONFIG_PATH_ENV_KEY] = overridePath;
    await mkdir(join(workspaceRoot, 'config'), { recursive: true });
    await writeFile(overridePath, `${JSON.stringify(buildValidProviderConfig('override'), null, 2)}\n`, 'utf8');
    revisionTick += 1;
    const revisionTime = new Date(Date.UTC(2026, 2, 24, 0, 0, revisionTick));
    await utimes(overridePath, revisionTime, revisionTime);

    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();

    expect(bootstrapped.status).toBe('ready');
    expect(bootstrapped.source_path).toBe(overridePath);
  });
});

function buildEnv(repoRoot: string): EnvironmentPaths {
  return {
    repoRoot,
    runsRoot: join(repoRoot, '.runs'),
    outRoot: join(repoRoot, 'out'),
    taskId: 'local-mcp'
  };
}

async function writeRepoConfig(config: Record<string, unknown> | string): Promise<void> {
  const configPath = join(workspaceRoot, 'codex.orchestrator.json');
  const raw = typeof config === 'string' ? config : `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, raw, 'utf8');
  revisionTick += 1;
  const revisionTime = new Date(Date.UTC(2026, 2, 24, 0, 0, revisionTick));
  await utimes(configPath, revisionTime, revisionTime);
}

function buildValidProviderConfig(version: string): Record<string, unknown> {
  return {
    defaultPipeline: 'provider-linear-worker',
    pipelines: [
      {
        id: 'provider-linear-worker',
        title: `Provider worker ${version}`,
        guardrailsRequired: false,
        stages: [
          {
            kind: 'command',
            id: 'echo',
            title: 'echo',
            command: `echo ${version}`
          }
        ]
      }
    ]
  };
}
