import { chmod, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
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

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'provider-workflow-store-'));
  revisionTick = 0;
  delete process.env[REPO_CONFIG_PATH_ENV_KEY];
});

afterEach(async () => {
  if (initialRepoConfigPathEnv === undefined) {
    delete process.env[REPO_CONFIG_PATH_ENV_KEY];
  } else {
    process.env[REPO_CONFIG_PATH_ENV_KEY] = initialRepoConfigPathEnv;
  }
  vi.doUnmock('node:fs/promises');
  vi.resetModules();
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

  it('returns defensive copies from its public state accessors', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    const bootstrapped = await store.bootstrap();
    bootstrapped.status = 'reload_failed';
    bootstrapped.last_error = 'mutated bootstrap state';

    expect(store.snapshot()).toMatchObject({
      status: 'ready',
      pipeline_id: 'provider-linear-worker',
      last_error: null
    });

    const snapshotted = store.snapshot();
    snapshotted.pipeline_id = 'mutated-pipeline-id';

    expect(store.snapshot()).toMatchObject({
      status: 'ready',
      pipeline_id: 'provider-linear-worker'
    });

    await writeRepoConfig('{ invalid json');
    const degraded = await store.refresh();
    degraded.status = 'ready';
    degraded.last_error = 'mutated degraded state';

    expect(store.snapshot()).toMatchObject({
      status: 'reload_failed'
    });
    expect(store.snapshot().last_error).toBeTruthy();
    expect(store.snapshot().last_error).not.toBe('mutated degraded state');
  });

  it('retries a failed revision when the config is repaired without metadata change', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');
    const recoveredRaw = `${JSON.stringify(buildValidProviderConfig('v2'), null, 2)}\n`;
    const brokenRaw = recoveredRaw.replace('"defaultPipeline"', "'defaultPipeline'");
    const configPath = getRepoConfigPath();
    const fixedRevisionTime = new Date(Date.UTC(2026, 2, 24, 0, 0, 50));

    expect(brokenRaw).not.toBe(recoveredRaw);
    expect(brokenRaw.length).toBe(recoveredRaw.length);

    await writeFile(configPath, brokenRaw, 'utf8');
    await utimes(configPath, fixedRevisionTime, fixedRevisionTime);
    const degraded = await store.refresh();

    expect(degraded.status).toBe('reload_failed');
    expect(degraded.snapshot_path).toBe(snapshotPath);
    expect(degraded.last_error).toBeTruthy();
    expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);

    await writeFile(configPath, recoveredRaw, 'utf8');
    await utimes(configPath, fixedRevisionTime, fixedRevisionTime);

    const recovered = await store.refresh();
    const recoveredSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
      pipelines: Array<{ title: string }>;
    };

    expect(recovered.status).toBe('ready');
    expect(recovered.last_error).toBeNull();
    expect(recoveredSnapshot.pipelines[0]?.title).toBe('Provider worker v2');
  });

  it('regenerates the launch snapshot when the cached snapshot file is removed', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await rm(snapshotPath, { force: true });

    const regeneratedSnapshotPath = await store.getLaunchConfigPath();
    const regeneratedSnapshot = await readFile(regeneratedSnapshotPath, 'utf8');

    expect(regeneratedSnapshotPath).toBe(snapshotPath);
    expect(regeneratedSnapshot).toBe(initialSnapshot);
    expect(store.snapshot().status).toBe('ready');
  });

  it('fails closed when the cached snapshot path stops being a file', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();

    await rm(snapshotPath, { force: true });
    await mkdir(snapshotPath, { recursive: true });

    const degraded = await store.refresh();

    expect(degraded).toMatchObject({
      status: 'reload_failed',
      snapshot_path: snapshotPath
    });
    expect(degraded.last_error).toBeTruthy();
    await expect(store.getLaunchConfigPath()).rejects.toThrow(
      /Provider workflow config snapshot is unavailable:/
    );
    expect(store.snapshot()).toMatchObject({
      status: 'reload_failed',
      snapshot_path: snapshotPath
    });
    expect(store.snapshot().last_error).toBeTruthy();
  });

  it('rewrites a corrupted snapshot before short-circuiting an unchanged revision', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir: join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await writeFile(snapshotPath, '{ invalid json', 'utf8');

    const refreshed = await store.refresh();
    const healedSnapshot = await readFile(snapshotPath, 'utf8');

    expect(refreshed.status).toBe('ready');
    expect(refreshed.last_error).toBeNull();
    expect(healedSnapshot).toBe(initialSnapshot);
    expect(await store.getLaunchConfigPath()).toBe(snapshotPath);
  });

  it('preserves the last known good snapshot when rewriting it fails', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const runDir = join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host');
    const store = createProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir,
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    const snapshotPath = await store.getLaunchConfigPath();
    const initialSnapshot = await readFile(snapshotPath, 'utf8');

    await writeRepoConfig(buildValidProviderConfig('v2'));
    await chmod(runDir, 0o500);

    try {
      const degraded = await store.refresh();

      expect(degraded.status).toBe('reload_failed');
      expect(degraded.snapshot_path).toBe(snapshotPath);
      expect(degraded.last_error).toBeTruthy();
      expect(await readFile(snapshotPath, 'utf8')).toBe(initialSnapshot);
    } finally {
      await chmod(runDir, 0o700);
    }

    const recovered = await store.refresh();
    const recoveredSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
      pipelines: Array<{ title: string }>;
    };

    expect(recovered.status).toBe('ready');
    expect(recovered.last_error).toBeNull();
    expect(recoveredSnapshot.pipelines[0]?.title).toBe('Provider worker v2');
  });

  it('serializes concurrent refresh and launch-path reads while rewriting the snapshot', async () => {
    await writeRepoConfig(buildValidProviderConfig('v1'));
    const runDir = join(workspaceRoot, '.runs', 'local-mcp', 'cli', 'control-host');
    const snapshotPath = join(runDir, 'provider-workflow.last-known-good.json');
    const tempSnapshotPath = `${snapshotPath}.tmp`;
    const firstSnapshotWriteEntered = createDeferred<void>();
    const releaseFirstSnapshotWrite = createDeferred<void>();
    let observeSnapshotWrites = false;
    let observedSnapshotTempWriteCalls = 0;
    let activeSnapshotTempWrites = 0;
    let maxConcurrentSnapshotTempWrites = 0;

    vi.resetModules();
    const actualFsPromises = await vi.importActual<typeof import('node:fs/promises')>(
      'node:fs/promises'
    );
    vi.doMock('node:fs/promises', () => ({
      ...actualFsPromises,
      writeFile: vi.fn(
        async (...args: Parameters<typeof actualFsPromises.writeFile>) => {
          const [path] = args;
          if (path === tempSnapshotPath && observeSnapshotWrites) {
            observedSnapshotTempWriteCalls += 1;
            activeSnapshotTempWrites += 1;
            maxConcurrentSnapshotTempWrites = Math.max(
              maxConcurrentSnapshotTempWrites,
              activeSnapshotTempWrites
            );
            try {
              if (observedSnapshotTempWriteCalls === 1) {
                firstSnapshotWriteEntered.resolve();
                await releaseFirstSnapshotWrite.promise;
              }
              return await actualFsPromises.writeFile(...args);
            } finally {
              activeSnapshotTempWrites -= 1;
            }
          }
          return await actualFsPromises.writeFile(...args);
        }
      )
    }));
    const { createProviderWorkflowConfigStore: createIsolatedProviderWorkflowConfigStore } =
      await import('../src/cli/control/providerWorkflowConfigStore.js');
    const store = createIsolatedProviderWorkflowConfigStore({
      env: buildEnv(workspaceRoot),
      runDir,
      pipelineId: 'provider-linear-worker'
    });

    await store.bootstrap();
    await store.getLaunchConfigPath();
    observeSnapshotWrites = true;
    await writeRepoConfig(buildValidProviderConfig('v2'));
    const refreshPromise = store.refresh();
    await firstSnapshotWriteEntered.promise;

    const launchPathPromise = store.getLaunchConfigPath();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(maxConcurrentSnapshotTempWrites).toBe(1);

    releaseFirstSnapshotWrite.resolve();
    const [refreshed, launchPath] = await Promise.all([refreshPromise, launchPathPromise]);
    const recoveredSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
      pipelines: Array<{ title: string }>;
    };

    expect(refreshed.status).toBe('ready');
    expect(launchPath).toBe(snapshotPath);
    expect(observedSnapshotTempWriteCalls).toBe(1);
    expect(maxConcurrentSnapshotTempWrites).toBe(1);
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

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

async function writeRepoConfig(config: Record<string, unknown> | string): Promise<void> {
  const configPath = getRepoConfigPath();
  const raw = typeof config === 'string' ? config : `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, raw, 'utf8');
  revisionTick += 1;
  const revisionTime = new Date(Date.UTC(2026, 2, 24, 0, 0, revisionTick));
  await utimes(configPath, revisionTime, revisionTime);
}

function getRepoConfigPath(): string {
  return join(workspaceRoot, 'codex.orchestrator.json');
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
