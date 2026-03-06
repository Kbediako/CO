import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { collectManifests } from '../../scripts/lib/run-manifests.js';

let workspaceRoot: string;
let runsDir: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'run-manifests-'));
  runsDir = join(workspaceRoot, '.runs');
  await mkdir(runsDir, { recursive: true });
});

afterEach(async () => {
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('collectManifests', () => {
  it('returns only existing CLI-layout manifest files from run directories', async () => {
    const taskCliDir = join(runsDir, 'task-cli', 'cli');
    const validRunDir = join(taskCliDir, 'run-valid');
    const validManifest = join(validRunDir, 'manifest.json');
    await mkdir(validRunDir, { recursive: true });
    await writeFile(validManifest, '{}\n', 'utf8');

    await mkdir(join(taskCliDir, 'run-missing-manifest'), { recursive: true });
    await writeFile(join(taskCliDir, 'notes.txt'), 'not a run dir\n', 'utf8');

    const manifests = await collectManifests(runsDir);

    expect(manifests).toEqual([validManifest]);
  });

  it('falls back to legacy layout when CLI runs are absent and filters by task id', async () => {
    await mkdir(join(runsDir, 'task-legacy', 'cli'), { recursive: true });
    const legacyRunDir = join(runsDir, 'task-legacy', '2026-03-05T00-00-00-000Z-demo');
    const legacyManifest = join(legacyRunDir, 'manifest.json');
    await mkdir(legacyRunDir, { recursive: true });
    await writeFile(legacyManifest, '{}\n', 'utf8');
    await writeFile(join(runsDir, 'task-legacy', 'README.txt'), 'ignore me\n', 'utf8');

    const otherRunDir = join(runsDir, 'task-other', 'cli', 'run-other');
    await mkdir(otherRunDir, { recursive: true });
    await writeFile(join(otherRunDir, 'manifest.json'), '{}\n', 'utf8');

    const manifests = await collectManifests(runsDir, 'task-legacy');

    expect(manifests).toEqual([legacyManifest]);
  });
});
