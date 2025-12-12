import { describe, it, expect, beforeEach, vi } from 'vitest';
import { writeFile, access } from 'node:fs/promises';
import path from 'node:path';

let execFileMock: ReturnType<typeof vi.fn>;

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => execFileMock(...args)
}));

import { createCodexCliCrystalizerClient } from '../src/learning/crystalizer.js';

beforeEach(() => {
  execFileMock = vi.fn();
});

describe('createCodexCliCrystalizerClient', () => {
  it('cleans up temp work dirs after successful generate', async () => {
    execFileMock.mockImplementation((_, args: unknown[], __, cb: (err: Error | null) => void) => {
      const argv = args as string[];
      const outIndex = argv.indexOf('--output-file');
      const outputPath = argv[outIndex + 1]!;
      void writeFile(outputPath, 'ok', 'utf8').then(() => cb(null));
    });

    const client = await createCodexCliCrystalizerClient('codex');
    const result = await client.generate('prompt', { model: 'gpt-test' });
    expect(result.content).toBe('ok');

    const argv = execFileMock.mock.calls[0]?.[1] as string[];
    const inputIndex = argv.indexOf('--input-file');
    const promptPath = argv[inputIndex + 1]!;
    const workDir = path.dirname(promptPath);

    const exists = await access(workDir).then(
      () => true,
      () => false
    );
    expect(exists).toBe(false);
  });

  it('cleans up temp work dirs on exec failure', async () => {
    execFileMock.mockImplementation((_, args: unknown[], __, cb: (err: Error | null) => void) => {
      const argv = args as string[];
      const outIndex = argv.indexOf('--output-file');
      const outputPath = argv[outIndex + 1]!;
      void writeFile(outputPath, '', 'utf8').then(() => cb(new Error('fail')));
    });

    const client = await createCodexCliCrystalizerClient('codex');
    await expect(client.generate('prompt', { model: 'gpt-test' })).rejects.toThrow(/fail/);

    const argv = execFileMock.mock.calls[0]?.[1] as string[];
    const inputIndex = argv.indexOf('--input-file');
    const promptPath = argv[inputIndex + 1]!;
    const workDir = path.dirname(promptPath);

    const exists = await access(workDir).then(
      () => true,
      () => false
    );
    expect(exists).toBe(false);
  });
});

