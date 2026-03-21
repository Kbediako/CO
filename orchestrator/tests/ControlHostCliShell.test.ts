import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProviderIssueHandoffService } from '../src/cli/control/providerIssueHandoff.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';

import { __test__ as controlHostCliShellTest } from '../src/cli/controlHostCliShell.js';
import { PROVIDER_LINEAR_WORKER_PROOF_FILENAME } from '../src/cli/providerLinearWorkerRunner.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const {
  DEFAULT_PROVIDER_START_PIPELINE_ID,
  buildProviderLinearSourceEnvOverrides,
  beginProviderIssueHandoffStartupRefresh,
  findSpawnManifest,
  rehydrateProviderIssueHandoffOnStartup,
  refreshProviderIssueHandoffOnStartup,
  resolveProviderResumeLaunchSpec,
  snapshotRunManifests
} = controlHostCliShellTest;
const execFileAsync = promisify(execFile);

let tempRoot: string | null = null;

afterEach(async () => {
  if (!tempRoot) {
    return;
  }
  await rm(tempRoot, { recursive: true, force: true });
  tempRoot = null;
});

async function writeManifest(
  taskRunsRoot: string,
  runId: string,
  manifest: Record<string, unknown>
): Promise<string> {
  const runDir = join(taskRunsRoot, runId);
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest), 'utf8');
  return manifestPath;
}

async function runGit(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', repoRoot, ...args]);
  return stdout.trim();
}

async function initializeRepo(repoRoot: string): Promise<void> {
  await runGit(repoRoot, ['init']);
  await runGit(repoRoot, ['config', 'user.email', 'control-host@example.com']);
  await runGit(repoRoot, ['config', 'user.name', 'control-host']);
  await writeFile(join(repoRoot, 'package.json'), JSON.stringify({ name: 'control-host-test' }), 'utf8');
  await runGit(repoRoot, ['add', 'package.json']);
  await runGit(repoRoot, ['commit', '-m', 'init']);
}

describe('controlHostCliShell manifest discovery', () => {
  it('defaults provider starts to the provider worker pipeline', () => {
    expect(DEFAULT_PROVIDER_START_PIPELINE_ID).toBe('provider-linear-worker');
  });

  it('maps tracked issue scope bindings into provider worker env overrides', () => {
    expect(
      buildProviderLinearSourceEnvOverrides({
        provider: 'linear',
        workspaceId: 'workspace-1',
        teamId: 'team-1',
        projectId: 'project-1'
      })
    ).toEqual({
      CO_LINEAR_WORKSPACE_ID: 'workspace-1',
      CO_LINEAR_TEAM_ID: 'team-1',
      CO_LINEAR_PROJECT_ID: 'project-1'
    });
  });

  it('clears null tracked issue scope bindings in provider worker env overrides', () => {
    expect(
      buildProviderLinearSourceEnvOverrides({
        provider: 'linear',
        workspaceId: 'workspace-1',
        teamId: null,
        projectId: null
      })
    ).toEqual({
      CO_LINEAR_WORKSPACE_ID: 'workspace-1',
      CO_LINEAR_TEAM_ID: '',
      CO_LINEAR_PROJECT_ID: ''
    });
  });

  it('keeps the newly spawned manifest even when its mtime falls before the local spawn timestamp', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));

    await writeManifest(tempRoot, 'run-existing', { run_id: 'run-existing', task_id: 'task-1' });
    const baselineRuns = await snapshotRunManifests(tempRoot);

    const manifestPath = await writeManifest(tempRoot, 'run-new', { run_id: 'run-new', task_id: 'task-1' });
    const coarseTimestamp = new Date('2026-03-20T00:00:00.000Z');
    await utimes(manifestPath, coarseTimestamp, coarseTimestamp);

    await expect(
      findSpawnManifest({
        taskRunsRoot: tempRoot,
        taskId: 'task-1',
        baselineRuns
      })
    ).resolves.toEqual({
      runId: 'run-new',
      manifestPath
    });
  });

  it('ignores a preexisting run directory that gains a manifest after the baseline snapshot', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));

    await mkdir(join(tempRoot, 'run-existing'), { recursive: true });
    const baselineRuns = await snapshotRunManifests(tempRoot);

    const newManifestPath = await writeManifest(tempRoot, 'run-new', {
      run_id: 'run-new',
      task_id: 'task-1'
    });
    const existingManifestPath = await writeManifest(tempRoot, 'run-existing', {
      run_id: 'run-existing',
      task_id: 'task-1'
    });
    const laterTimestamp = new Date('2026-03-20T00:00:02.000Z');
    await utimes(existingManifestPath, laterTimestamp, laterTimestamp);

    await expect(
      findSpawnManifest({
        taskRunsRoot: tempRoot,
        taskId: 'task-1',
        baselineRuns
      })
    ).resolves.toEqual({
      runId: 'run-new',
      manifestPath: newManifestPath
    });
  });

  it('matches the launched manifest by issue metadata before accepting newer concurrent manifests', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));

    const baselineRuns = await snapshotRunManifests(tempRoot);

    const expectedManifestPath = await writeManifest(tempRoot, 'run-expected', {
      run_id: 'run-expected',
      task_id: 'task-1',
      issue_provider: 'linear',
      issue_id: 'issue-1',
      issue_identifier: 'CO-1',
      issue_updated_at: '2026-03-20T00:00:00.000Z',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'provider-host-run'
    });
    const newerOtherManifestPath = await writeManifest(tempRoot, 'run-other', {
      run_id: 'run-other',
      task_id: 'task-1',
      issue_provider: 'linear',
      issue_id: 'issue-2',
      issue_identifier: 'CO-2',
      issue_updated_at: '2026-03-20T00:00:01.000Z',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'provider-host-run'
    });
    const laterTimestamp = new Date('2026-03-20T00:00:02.000Z');
    await utimes(newerOtherManifestPath, laterTimestamp, laterTimestamp);

    await expect(
      findSpawnManifest({
        taskRunsRoot: tempRoot,
        taskId: 'task-1',
        baselineRuns,
        correlation: {
          issueProvider: 'linear',
          issueId: 'issue-1',
          issueIdentifier: 'CO-1',
          issueUpdatedAt: '2026-03-20T00:00:00.000Z',
          providerControlHostTaskId: 'provider-host-task',
          providerControlHostRunId: 'provider-host-run'
        }
      })
    ).resolves.toEqual({
      runId: 'run-expected',
      manifestPath: expectedManifestPath
    });
  });

  it('matches the launched manifest by control-host locator before accepting same-issue collisions', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));

    const baselineRuns = await snapshotRunManifests(tempRoot);

    const expectedManifestPath = await writeManifest(tempRoot, 'run-expected', {
      run_id: 'run-expected',
      task_id: 'task-1',
      issue_provider: 'linear',
      issue_id: 'issue-1',
      issue_identifier: 'CO-1',
      issue_updated_at: '2026-03-20T00:00:00.000Z',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'provider-host-run'
    });
    const newerOtherManifestPath = await writeManifest(tempRoot, 'run-other', {
      run_id: 'run-other',
      task_id: 'task-1',
      issue_provider: 'linear',
      issue_id: 'issue-1',
      issue_identifier: 'CO-1',
      issue_updated_at: '2026-03-20T00:00:00.000Z',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'other-provider-host-run'
    });
    const laterTimestamp = new Date('2026-03-20T00:00:02.000Z');
    await utimes(newerOtherManifestPath, laterTimestamp, laterTimestamp);

    await expect(
      findSpawnManifest({
        taskRunsRoot: tempRoot,
        taskId: 'task-1',
        baselineRuns,
        correlation: {
          issueProvider: 'linear',
          issueId: 'issue-1',
          issueIdentifier: 'CO-1',
          issueUpdatedAt: '2026-03-20T00:00:00.000Z',
          providerControlHostTaskId: 'provider-host-task',
          providerControlHostRunId: 'provider-host-run'
        }
      })
    ).resolves.toEqual({
      runId: 'run-expected',
      manifestPath: expectedManifestPath
    });
  });

  it('resumes provider runs inside the manifest workspace while preserving main repo artifact roots', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      }
    });
  });

  it('restores persisted Linear scope bindings for provider resumes and clears null fields', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        workspace_path: join(tempRoot, '.workspaces', 'linear-lin-issue-1')
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        source_setup: {
          provider: 'linear',
          workspace_id: 'workspace-1',
          team_id: null,
          project_id: 'project-1'
        }
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        CO_LINEAR_WORKSPACE_ID: 'workspace-1',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: 'project-1'
      }
    });
  });

  it('rebuilds the deterministic per-issue workspace for legacy provider resumes without workspace metadata', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1'
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      }
    });
  });

  it('derives legacy provider resume task ids from the resolved run path when manifest task_id is absent', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const legacyRunDir = join(env.runsRoot, 'linear-lin-issue-1', 'run-child');
    await mkdir(legacyRunDir, { recursive: true });
    await writeFile(
      join(legacyRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'run-child'
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      }
    });
  });

  it('ignores manifest workspace paths outside the deterministic provider workspace root on resume', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        workspace_path: tempRoot
      }),
      'utf8'
    );

    const spec = await resolveProviderResumeLaunchSpec(env, 'run-child');

    expect(spec).toEqual({
      cwd: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
      envOverrides: {
        CODEX_ORCHESTRATOR_ROOT: join(tempRoot, '.workspaces', 'linear-lin-issue-1'),
        CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
        CO_LINEAR_WORKSPACE_ID: '',
        CO_LINEAR_TEAM_ID: '',
        CO_LINEAR_PROJECT_ID: ''
      }
    });
  });

  it('rejects invalid manifest task ids before recreating a provider resume workspace', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'control-host-cli-shell-'));
    await initializeRepo(tempRoot);
    const env: EnvironmentPaths = {
      repoRoot: tempRoot,
      runsRoot: join(tempRoot, '.runs'),
      outRoot: join(tempRoot, 'out'),
      taskId: 'local-mcp'
    };
    const childPaths = resolveRunPaths(
      {
        ...env,
        taskId: 'linear-lin-issue-1'
      },
      'run-child'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: '../escape'
      }),
      'utf8'
    );

    await expect(resolveProviderResumeLaunchSpec(env, 'run-child')).rejects.toThrow(
      'Invalid provider resume manifest task_id for run run-child'
    );
  });
});

describe('controlHostCliShell startup provider handoff bootstrap', () => {
  it('runs an immediate provider rehydrate during control-host startup', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    } satisfies ProviderIssueHandoffService;

    await rehydrateProviderIssueHandoffOnStartup(providerIssueHandoff);

    expect(providerIssueHandoff.rehydrate).toHaveBeenCalledTimes(1);
  });

  it('keeps startup non-blocking when the immediate provider rehydrate fails', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {
        throw new Error('rehydrate unavailable');
      }),
      refresh: vi.fn(async () => undefined)
    } satisfies ProviderIssueHandoffService;

    await expect(rehydrateProviderIssueHandoffOnStartup(providerIssueHandoff)).resolves.toBeUndefined();
    expect(providerIssueHandoff.rehydrate).toHaveBeenCalledTimes(1);
  });

  it('starts the immediate provider refresh without waiting for it to finish before startup can continue', async () => {
    let resolveRefresh: (() => void) | null = null;
    const publish = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(),
      refresh: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveRefresh = resolve;
          })
      )
    } satisfies ProviderIssueHandoffService;

    const startupRefresh = beginProviderIssueHandoffStartupRefresh(providerIssueHandoff, publish);

    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    let settled = false;
    void startupRefresh.then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(settled).toBe(false);
    expect(publish).not.toHaveBeenCalled();

    resolveRefresh?.();
    await startupRefresh;

    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('runs an immediate provider refresh during control-host startup', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(),
      refresh: vi.fn(async () => undefined)
    } satisfies ProviderIssueHandoffService;

    await refreshProviderIssueHandoffOnStartup(providerIssueHandoff);

    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps startup non-blocking when the immediate provider refresh fails', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(),
      refresh: vi.fn(async () => {
        throw new Error('linear unavailable');
      })
    } satisfies ProviderIssueHandoffService;

    await expect(refreshProviderIssueHandoffOnStartup(providerIssueHandoff)).resolves.toBeUndefined();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps injected startup refresh callbacks on the catch/finally path when they throw synchronously', async () => {
    const publish = vi.fn();
    const refreshProviderIssueHandoff = vi.fn(() => {
      throw new Error('sync refresh failure');
    });

    await expect(
      beginProviderIssueHandoffStartupRefresh(undefined, publish, refreshProviderIssueHandoff)
    ).resolves.toBeUndefined();

    expect(refreshProviderIssueHandoff).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('cancels the lifecycle-owned startup trigger before the injected startup refresh takes over', async () => {
    vi.useFakeTimers();
    try {
      const publish = vi.fn();
      const refreshProviderIssueHandoff = vi.fn(async () => undefined);
      const startupTrigger = setTimeout(() => {
        throw new Error('startup trigger should have been cancelled');
      }, 0);

      await beginProviderIssueHandoffStartupRefresh(
        undefined,
        publish,
        refreshProviderIssueHandoff,
        startupTrigger
      );
      await vi.runAllTimersAsync();

      expect(refreshProviderIssueHandoff).toHaveBeenCalledTimes(1);
      expect(publish).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
