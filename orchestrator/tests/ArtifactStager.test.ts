import { afterEach, describe, expect, it } from 'vitest';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { stageArtifacts } from '../src/persistence/ArtifactStager.js';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

describe('stageArtifacts', () => {
  const tempDir = join(process.cwd(), 'temp-artifacts');
  const runsDir = join(process.cwd(), '.runs');
  const taskId = 'stage-task';
  const runId = 'run:with:colon';

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    await rm(join(runsDir, taskId), { recursive: true, force: true });
  });

  it('moves artifacts into the run-specific artifacts directory', async () => {
    await mkdir(tempDir, { recursive: true });
    const sourcePath = join(tempDir, 'sample.log');
    await writeFile(sourcePath, 'log-content', 'utf8');

    const [staged] = await stageArtifacts({
      taskId,
      runId,
      artifacts: [
        {
          path: relative(process.cwd(), sourcePath),
          description: 'sample log'
        }
      ],
      options: { runsDir }
    });

    const destinationPath = join(process.cwd(), staged.path);
    expect(destinationPath).toContain(`${taskId}/run-with-colon/artifacts/sample`);
    expect(await exists(sourcePath)).toBe(false);
    expect(await exists(destinationPath)).toBe(true);
    expect(await readFile(destinationPath, 'utf8')).toBe('log-content');
  });

  it('does not treat similarly prefixed directories as already staged', async () => {
    const runBaseDir = join(runsDir, taskId, 'run-with-colon');
    const artifactsOldDir = join(runBaseDir, 'artifacts-old');
    await mkdir(artifactsOldDir, { recursive: true });
    const sourcePath = join(artifactsOldDir, 'tricky.log');
    await writeFile(sourcePath, 'tricky', 'utf8');

    const relativeSource = relative(process.cwd(), sourcePath);
    const [staged] = await stageArtifacts({
      taskId,
      runId,
      artifacts: [
        {
          path: relativeSource,
          description: 'prefixed directory artifact'
        }
      ],
      options: { runsDir }
    });

    const stagedPath = join(process.cwd(), staged.path);
    expect(staged.path).not.toBe(relativeSource);
    expect(stagedPath).toContain(`${taskId}/run-with-colon/artifacts/tricky`);
    expect(await exists(sourcePath)).toBe(false);
    expect(await exists(stagedPath)).toBe(true);
    expect(await readFile(stagedPath, 'utf8')).toBe('tricky');
  });

  it('stages artifacts within a relative directory', async () => {
    await mkdir(tempDir, { recursive: true });
    const sourcePath = join(tempDir, 'capture.json');
    await writeFile(sourcePath, JSON.stringify({ ok: true }), 'utf8');

    const [staged] = await stageArtifacts({
      taskId,
      runId,
      artifacts: [
        {
          path: relative(process.cwd(), sourcePath),
          description: 'design capture snapshot'
        }
      ],
      options: { runsDir, relativeDir: 'design/reference/playwright' }
    });

    const destinationPath = join(process.cwd(), staged.path);
    expect(destinationPath).toContain(
      `${taskId}/run-with-colon/artifacts/design/reference/playwright/capture.json`
    );
    expect(await exists(destinationPath)).toBe(true);
  });

  it('overwrites existing artifacts when overwrite option is enabled', async () => {
    await mkdir(tempDir, { recursive: true });
    const sourcePath = join(tempDir, 'component.html');
    await writeFile(sourcePath, '<div>v1</div>', 'utf8');

    const [initial] = await stageArtifacts({
      taskId,
      runId,
      artifacts: [
        {
          path: relative(process.cwd(), sourcePath),
          description: 'component v1'
        }
      ],
      options: { runsDir, keepOriginal: true, relativeDir: 'design/components' }
    });

    await writeFile(sourcePath, '<div>v2</div>', 'utf8');
    const [overwritten] = await stageArtifacts({
      taskId,
      runId,
      artifacts: [
        {
          path: relative(process.cwd(), sourcePath),
          description: 'component v2'
        }
      ],
      options: { runsDir, keepOriginal: true, relativeDir: 'design/components', overwrite: true }
    });

    expect(overwritten.path).toBe(initial.path);
    const destinationPath = join(process.cwd(), overwritten.path);
    expect(await readFile(destinationPath, 'utf8')).toBe('<div>v2</div>');
  });

  it('throws for invalid relative directory segments', async () => {
    await mkdir(tempDir, { recursive: true });
    const sourcePath = join(tempDir, 'sample.txt');
    await writeFile(sourcePath, 'invalid', 'utf8');

    await expect(
      stageArtifacts({
        taskId,
        runId,
        artifacts: [
          {
            path: relative(process.cwd(), sourcePath),
            description: 'invalid relative dir'
          }
        ],
        options: { runsDir, relativeDir: '../outside' }
      })
    ).rejects.toThrow(/relativeDir/);
  });
});
