import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { detectValidator } from '../src/cli/rlm/validator.js';

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('rlm validator detection', () => {
  it('detects packageManager-based node validator', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-validator-'));
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@8.1.0' }),
      'utf8'
    );

    const result = await detectValidator(tempDir);
    expect(result.status).toBe('selected');
    expect(result.command).toBe('pnpm test');
    expect(result.reason).toContain('packageManager=pnpm@8.1.0');
  });

  it('flags ambiguity across ecosystems', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-validator-'));
    await writeFile(join(tempDir, 'package-lock.json'), '{}', 'utf8');
    await writeFile(join(tempDir, 'pyproject.toml'), '[tool.pytest]\n', 'utf8');

    const result = await detectValidator(tempDir);
    expect(result.status).toBe('ambiguous');
    const commands = result.candidates.map((candidate) => candidate.command);
    expect(commands).toContain('npm test');
    expect(commands).toContain('python -m pytest');
  });

  it('detects pytest from pyproject', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-validator-'));
    await writeFile(join(tempDir, 'pyproject.toml'), '[tool.pytest]\n', 'utf8');

    const result = await detectValidator(tempDir);
    expect(result.status).toBe('selected');
    expect(result.command).toBe('python -m pytest');
  });
});
