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
  manifest: { run_id: string; task_id: string }
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
});
