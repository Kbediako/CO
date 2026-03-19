import { afterEach, describe, expect, it, vi } from 'vitest';

import { printSetupCliHelp, runSetupCliShell } from '../src/cli/setupCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runSetupCliShell', () => {
  it('maps default cwd into the setup bootstrap shell', async () => {
    const runSetupBootstrapShellMock =
      vi.fn<typeof import('../src/cli/setupBootstrapShell.ts').runSetupBootstrapShell>().mockResolvedValue();
    const getCwd = vi.fn(() => '/tmp/default-repo');

    await runSetupCliShell(
      {
        flags: {}
      },
      {
        runSetupBootstrapShell: runSetupBootstrapShellMock,
        getCwd
      }
    );

    expect(runSetupBootstrapShellMock).toHaveBeenCalledWith({
      format: 'text',
      apply: false,
      refreshSkills: false,
      repoRoot: '/tmp/default-repo',
      repoFlag: undefined
    });
  });

  it('passes explicit repo and refresh flags through to the setup bootstrap shell', async () => {
    const runSetupBootstrapShellMock =
      vi.fn<typeof import('../src/cli/setupBootstrapShell.ts').runSetupBootstrapShell>().mockResolvedValue();

    await runSetupCliShell(
      {
        flags: {
          format: 'json',
          'refresh-skills': true,
          repo: ' /tmp/explicit-repo '
        }
      },
      {
        runSetupBootstrapShell: runSetupBootstrapShellMock
      }
    );

    expect(runSetupBootstrapShellMock).toHaveBeenCalledWith({
      format: 'json',
      apply: false,
      refreshSkills: true,
      repoRoot: '/tmp/explicit-repo',
      repoFlag: '/tmp/explicit-repo'
    });
  });

  it('rejects json mode when combined with --yes', async () => {
    await expect(
      runSetupCliShell({
        flags: {
          format: 'json',
          yes: true
        }
      })
    ).rejects.toThrow('setup does not support --format json with --yes.');
  });
});

describe('printSetupCliHelp', () => {
  it('prints the setup help text', () => {
    const log = vi.fn();

    printSetupCliHelp(log);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('Usage: codex-orchestrator setup'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('--refresh-skills'));
  });
});
