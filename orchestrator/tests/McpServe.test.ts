import { mkdtemp, rm } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { serveMcp } from '../src/cli/mcp.js';

let tempDir: string | null = null;
let spawnMock: ReturnType<typeof vi.fn>;

vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}));

beforeEach(() => {
  spawnMock = vi.fn();
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('serveMcp', () => {
  it('logs dry-run output to stderr only', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-mcp-'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await serveMcp({ repoRoot: tempDir, dryRun: true, extraArgs: [] });
      expect(spawnMock).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy.mock.calls.length + errorSpy.mock.calls.length).toBeGreaterThan(0);
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('fails fast when repo root does not exist', async () => {
    await expect(serveMcp({ repoRoot: '/missing-repo-root', dryRun: true, extraArgs: [] }))
      .rejects
      .toThrow(/Repository root not found/);
  });

  it('filters non-protocol stdout to stderr when spawning codex', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-mcp-'));
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child as unknown);

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    let stdoutWrites: unknown[] = [];
    let stderrWriteCount = 0;

    try {
      const servePromise = serveMcp({ repoRoot: tempDir, dryRun: false, extraArgs: [] });
      child.stdout.write('log line\n');
      await new Promise((resolve) => setImmediate(resolve));
      child.emit('exit', 0);
      await servePromise;
      stdoutWrites = stdoutSpy.mock.calls.map((call) => call[0]);
      stderrWriteCount = stderrSpy.mock.calls.length;
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }

    expect(spawnMock).toHaveBeenCalledWith(
      'codex',
      ['-C', tempDir, 'mcp-server'],
      { stdio: ['inherit', 'pipe', 'pipe'] }
    );
    expect(stderrWriteCount).toBeGreaterThan(0);
    expect(stdoutWrites).not.toContain('log line\n');
  });
});

class MockChildProcess extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
}
