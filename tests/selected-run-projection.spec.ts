import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createSelectedRunProjectionReader } from '../orchestrator/src/cli/control/selectedRunProjection.js';
import type { ControlState } from '../orchestrator/src/cli/control/controlState.js';

const sandboxes: string[] = [];

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'selected-run-projection-'));
  sandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(
    sandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('createSelectedRunProjectionReader', () => {
  it('derives the task id from the task directory when the run id is "cli"', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = join(sandbox, '.runs', 'task-under-test', 'cli', 'cli', 'manifest.json');
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify({ run: 'selected' }), 'utf8');
    const controlState: ControlState = {
      run_id: 'cli',
      control_seq: 0
    };

    const projection = createSelectedRunProjectionReader({
      controlStore: {
        snapshot: () => controlState
      },
      questionQueue: {
        list: () => []
      },
      paths: {
        manifestPath,
        runDir: dirname(manifestPath)
      },
      linearAdvisoryState: {
        tracked_issue: null
      }
    });

    const snapshot = await projection.readSelectedRunManifestSnapshot();

    expect(snapshot?.taskId).toBe('task-under-test');
    expect(snapshot?.runId).toBe('cli');
  });
});
