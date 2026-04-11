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
      stdout: 'b.txt\na.txt\n',
      stderr: ''
    }));
    vi.doMock('node:child_process', () => ({ spawnSync }));

    const { listTrackedFiles } = await import('../scripts/lib/docs-helpers.js');

    expect(listTrackedFiles('/repo')).toEqual(['a.txt', 'b.txt']);
    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/repo', 'ls-files'],
      expect.objectContaining({
        encoding: 'utf8',
        maxBuffer: expect.any(Number)
      })
    );
    expect(spawnSync.mock.calls[0]?.[2]?.maxBuffer).toBeGreaterThan(1024 * 1024);
  });
});
