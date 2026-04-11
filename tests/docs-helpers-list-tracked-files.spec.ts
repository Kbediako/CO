import { afterEach, describe, expect, it, vi } from 'vitest';

describe('listTrackedFiles', () => {
  afterEach(() => {
    vi.doUnmock('node:child_process');
    vi.resetModules();
  });

  it('uses a larger git output buffer for repo-wide tracked-file inventories', async () => {
    vi.resetModules();
    const spawnSync = vi.fn(() => ({
      status: 0,
      stdout: 'b.txt\0a.txt\0',
      stderr: ''
    }));
    vi.doMock('node:child_process', () => ({ spawnSync }));

    const { listTrackedFiles } = await import('../scripts/lib/docs-helpers.js');

    expect(listTrackedFiles('/repo')).toEqual(['a.txt', 'b.txt']);
    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/repo', 'ls-files', '-z'],
      expect.objectContaining({
        encoding: 'utf8',
        maxBuffer: expect.any(Number)
      })
    );
    expect(spawnSync.mock.calls[0]?.[2]?.maxBuffer).toBeGreaterThan(1024 * 1024);
  });

  it('forwards pathspecs to git ls-files', async () => {
    vi.resetModules();
    const spawnSync = vi.fn(() => ({
      status: 0,
      stdout: 'docs/b.md\0docs/a.md\0',
      stderr: ''
    }));
    vi.doMock('node:child_process', () => ({ spawnSync }));

    const { listTrackedFiles } = await import('../scripts/lib/docs-helpers.js');

    expect(listTrackedFiles('/repo', ['docs/**'])).toEqual(['docs/a.md', 'docs/b.md']);
    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/repo', 'ls-files', '-z', '--', 'docs/**'],
      expect.objectContaining({
        encoding: 'utf8',
        maxBuffer: expect.any(Number)
      })
    );
  });

  it('preserves tracked path whitespace from nul-delimited git output', async () => {
    vi.resetModules();
    const spawnSync = vi.fn(() => ({
      status: 0,
      stdout: ' leading.txt\0trailing.txt \0',
      stderr: ''
    }));
    vi.doMock('node:child_process', () => ({ spawnSync }));

    const { listTrackedFiles } = await import('../scripts/lib/docs-helpers.js');

    expect(listTrackedFiles('/repo')).toEqual([' leading.txt', 'trailing.txt ']);
  });

  it('includes stderr and status details when git ls-files fails', async () => {
    vi.resetModules();
    const spawnSync = vi.fn(() => ({
      status: 1,
      signal: null,
      stdout: '',
      stderr: 'fatal: not a git repository\n'
    }));
    vi.doMock('node:child_process', () => ({ spawnSync }));

    const { listTrackedFiles } = await import('../scripts/lib/docs-helpers.js');

    expect(() => listTrackedFiles('/repo')).toThrow(/fatal: not a git repository/);
    expect(() => listTrackedFiles('/repo')).toThrow(/status=1/);
  });

  it('includes spawn errors when git cannot be started', async () => {
    vi.resetModules();
    const spawnSync = vi.fn(() => ({
      status: null,
      signal: null,
      stdout: '',
      stderr: '',
      error: new Error('spawnSync git ENOENT')
    }));
    vi.doMock('node:child_process', () => ({ spawnSync }));

    const { listTrackedFiles } = await import('../scripts/lib/docs-helpers.js');

    expect(() => listTrackedFiles('/repo')).toThrow(/spawnSync git ENOENT/);
    expect(() => listTrackedFiles('/repo')).toThrow(/status=<no status>/);
  });
});
