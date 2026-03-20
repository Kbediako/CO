import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { __test__ as controlHostCliShellTest } from '../src/cli/controlHostCliShell.js';

const { findSpawnManifest, snapshotRunManifests } = controlHostCliShellTest;

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
});
