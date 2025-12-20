import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeAtomicFile } from '../src/persistence/writeAtomicFile.js';
import { writeFileAtomic, writeJsonAtomic } from '../src/cli/utils/fs.js';
import { buildAtomicTempPath } from '../src/utils/atomicWrite.js';

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'atomic-write-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('atomic write helpers', () => {
  it('writeFileAtomic creates the target directory when missing', async () => {
    const targetPath = join(workspace, 'nested', 'file.txt');
    await writeFileAtomic(targetPath, 'hello');

    const contents = await readFile(targetPath, 'utf8');
    expect(contents).toBe('hello');
  });

  it('writeAtomicFile does not create directories', async () => {
    const targetPath = join(workspace, 'missing', 'file.txt');
    await expect(writeAtomicFile(targetPath, 'hello')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('writeJsonAtomic appends a trailing newline', async () => {
    const targetPath = join(workspace, 'data', 'payload.json');
    const payload = { ok: true };
    await writeJsonAtomic(targetPath, payload);

    const contents = await readFile(targetPath, 'utf8');
    expect(contents).toBe(`${JSON.stringify(payload, null, 2)}\n`);
  });

  it('buildAtomicTempPath preserves the temp naming pattern', () => {
    const targetPath = join(workspace, 'file.txt');
    expect(buildAtomicTempPath(targetPath, () => 1234, 5678)).toBe(
      `${targetPath}.tmp-5678-1234`
    );
  });
});
