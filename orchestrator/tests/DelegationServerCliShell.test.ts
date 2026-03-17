import { afterEach, describe, expect, it, vi } from 'vitest';

import { runDelegationServerCliShell } from '../src/cli/delegationServerCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runDelegationServerCliShell', () => {
  it('prints help when requested before starting the delegation server', async () => {
    const printHelp = vi.fn();
    const startDelegationServerMock =
      vi.fn<typeof import('../src/cli/delegationServer.js').startDelegationServer>();

    await runDelegationServerCliShell(
      {
        positionals: [],
        flags: { help: true },
        printHelp
      },
      {
        startDelegationServer: startDelegationServerMock
      }
    );

    expect(printHelp).toHaveBeenCalledTimes(1);
    expect(startDelegationServerMock).not.toHaveBeenCalled();
  });

  it('maps repo, mode, and config overrides into the delegation server engine', async () => {
    const startDelegationServerMock =
      vi.fn<typeof import('../src/cli/delegationServer.js').startDelegationServer>().mockResolvedValue();

    await runDelegationServerCliShell(
      {
        positionals: [],
        flags: {
          repo: '/tmp/repo',
          mode: 'status_only',
          config: 'delegate.mode=full; runner.mode=dev',
          'config-override': 'delegate.mode=question_only'
        },
        printHelp: vi.fn()
      },
      {
        startDelegationServer: startDelegationServerMock,
        getEnvMode: () => 'question_only'
      }
    );

    expect(startDelegationServerMock).toHaveBeenCalledWith({
      repoRoot: '/tmp/repo',
      mode: 'status_only',
      configOverrides: [
        { source: 'cli', value: 'delegate.mode=full' },
        { source: 'cli', value: 'runner.mode=dev' }
      ]
    });
  });

  it('falls back to the environment mode when no CLI mode is provided', async () => {
    const startDelegationServerMock =
      vi.fn<typeof import('../src/cli/delegationServer.js').startDelegationServer>().mockResolvedValue();

    await runDelegationServerCliShell(
      {
        positionals: [],
        flags: {},
        printHelp: vi.fn()
      },
      {
        startDelegationServer: startDelegationServerMock,
        getCwd: () => '/tmp/repo',
        getEnvMode: () => ' question_only '
      }
    );

    expect(startDelegationServerMock).toHaveBeenCalledWith({
      repoRoot: '/tmp/repo',
      mode: 'question_only',
      configOverrides: []
    });
  });

  it('warns and falls back to the config default for invalid modes', async () => {
    const startDelegationServerMock =
      vi.fn<typeof import('../src/cli/delegationServer.js').startDelegationServer>().mockResolvedValue();
    const warn = vi.fn();

    await runDelegationServerCliShell(
      {
        positionals: [],
        flags: {},
        printHelp: vi.fn()
      },
      {
        startDelegationServer: startDelegationServerMock,
        getCwd: () => '/tmp/repo',
        getEnvMode: () => 'broken-mode',
        warn
      }
    );

    expect(warn).toHaveBeenCalledWith('Invalid delegate mode "broken-mode". Falling back to config default.');
    expect(startDelegationServerMock).toHaveBeenCalledWith({
      repoRoot: '/tmp/repo',
      mode: undefined,
      configOverrides: []
    });
  });
});
