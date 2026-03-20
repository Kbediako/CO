import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProviderIssueHandoffService } from '../src/cli/control/providerIssueHandoff.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';

import { __test__ as controlHostCliShellTest } from '../src/cli/controlHostCliShell.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const {
  beginProviderIssueHandoffStartupRefresh,
  findSpawnManifest,
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
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot
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
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot
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
        CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot
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

describe('controlHostCliShell startup refresh', () => {
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
});
