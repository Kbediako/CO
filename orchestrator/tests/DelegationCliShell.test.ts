import { afterEach, describe, expect, it, vi } from 'vitest';

import { runDelegationCliShell } from '../src/cli/delegationCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runDelegationCliShell', () => {
  const directDistCommand =
    "codex mcp add delegation -- /opt/homebrew/bin/node /tmp/repo/dist/bin/codex-orchestrator.js delegate-server --repo '/tmp/repo'";

  it('rejects a missing subcommand before invoking the delegation setup engine', async () => {
    const runDelegationSetupMock = vi.fn<typeof import('../src/cli/delegationSetup.js').runDelegationSetup>();

    await expect(
      runDelegationCliShell(
        {
          positionals: [],
          flags: {}
        },
        {
          runDelegationSetup: runDelegationSetupMock
        }
      )
    ).rejects.toThrow('delegation requires a subcommand (setup|cleanup-stale).');

    expect(runDelegationSetupMock).not.toHaveBeenCalled();
  });

  it('rejects unknown subcommands before invoking the delegation setup engine', async () => {
    const runDelegationSetupMock = vi.fn<typeof import('../src/cli/delegationSetup.js').runDelegationSetup>();

    await expect(
      runDelegationCliShell(
        {
          positionals: ['unexpected'],
          flags: {}
        },
        {
          runDelegationSetup: runDelegationSetupMock
        }
      )
    ).rejects.toThrow('Unknown delegation subcommand: unexpected');

    expect(runDelegationSetupMock).not.toHaveBeenCalled();
  });

  it('rejects --format json when --yes is also set', async () => {
    const runDelegationSetupMock = vi.fn<typeof import('../src/cli/delegationSetup.js').runDelegationSetup>();

    await expect(
      runDelegationCliShell(
        {
          positionals: ['setup'],
          flags: { format: 'json', yes: true }
        },
        {
          runDelegationSetup: runDelegationSetupMock
        }
      )
    ).rejects.toThrow('delegation setup does not support --format json with --yes.');

    expect(runDelegationSetupMock).not.toHaveBeenCalled();
  });

  it('maps setup flags into the engine and emits json output', async () => {
    const log = vi.fn();
    const runDelegationSetupMock =
      vi.fn<typeof import('../src/cli/delegationSetup.js').runDelegationSetup>().mockResolvedValue({
        status: 'planned',
        plan: {
          codexBin: 'codex',
          codexHome: '/tmp/.codex',
          repoRoot: '/tmp/repo',
          commandLine: directDistCommand
        },
        readiness: {
          configured: false,
          configPath: '/tmp/.codex/config.toml'
        }
      });

    await runDelegationCliShell(
      {
        positionals: ['setup'],
        flags: {
          format: 'json',
          repo: '/tmp/repo'
        }
      },
      {
        runDelegationSetup: runDelegationSetupMock,
        log
      }
    );

    expect(runDelegationSetupMock).toHaveBeenCalledWith({
      apply: false,
      repoRoot: '/tmp/repo'
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      status: 'planned',
      plan: {
        codexBin: 'codex',
        codexHome: '/tmp/.codex',
        repoRoot: '/tmp/repo',
        commandLine: directDistCommand
      },
      readiness: {
        configured: false,
        configPath: '/tmp/.codex/config.toml'
      }
    });
  });

  it('renders text output and defaults repoRoot to cwd', async () => {
    const log = vi.fn();
    const runDelegationSetupMock =
      vi.fn<typeof import('../src/cli/delegationSetup.js').runDelegationSetup>().mockResolvedValue({
        status: 'applied',
        plan: {
          codexBin: 'codex',
          codexHome: '/tmp/.codex',
          repoRoot: '/tmp/repo',
          commandLine: directDistCommand
        },
        readiness: {
          configured: true,
          configPath: '/tmp/.codex/config.toml'
        }
      });
    const formatDelegationSetupSummaryMock =
      vi.fn<typeof import('../src/cli/delegationSetup.js').formatDelegationSetupSummary>().mockReturnValue([
        'Delegation setup: applied',
        '- Config: ok (/tmp/.codex/config.toml)'
      ]);

    await runDelegationCliShell(
      {
        positionals: ['setup'],
        flags: { yes: true }
      },
      {
        runDelegationSetup: runDelegationSetupMock,
        formatDelegationSetupSummary: formatDelegationSetupSummaryMock,
        getCwd: () => '/tmp/repo',
        log
      }
    );

    expect(runDelegationSetupMock).toHaveBeenCalledWith({
      apply: true,
      repoRoot: '/tmp/repo'
    });
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'Delegation setup: applied',
      '- Config: ok (/tmp/.codex/config.toml)'
    ]);
  });

  it('trims repo flags and falls back to cwd when the value is blank', async () => {
    const runDelegationSetupMock =
      vi.fn<typeof import('../src/cli/delegationSetup.js').runDelegationSetup>().mockResolvedValue({
        status: 'planned',
        plan: {
          codexBin: 'codex',
          codexHome: '/tmp/.codex',
          repoRoot: '/tmp/repo',
          commandLine: directDistCommand
        },
        readiness: {
          configured: false,
          configPath: '/tmp/.codex/config.toml'
        }
      });

    await runDelegationCliShell(
      {
        positionals: ['setup'],
        flags: {
          repo: '   '
        }
      },
      {
        runDelegationSetup: runDelegationSetupMock,
        getCwd: () => '/tmp/repo',
        log: vi.fn()
      }
    );

    expect(runDelegationSetupMock).toHaveBeenCalledWith({
      apply: false,
      repoRoot: '/tmp/repo'
    });
  });

  it('runs cleanup-stale and emits json output', async () => {
    const log = vi.fn();
    const cleanupMock =
      vi.fn<typeof import('../src/cli/utils/delegationMcpHealth.js').cleanupStaleDelegateServerProcesses>()
        .mockResolvedValue({
          status: 'stale',
          activeCount: 1,
          staleCount: 2,
          activePids: [101],
          stalePids: [202, 203],
          staleRssKb: 8192,
          thresholdSeconds: 600,
          detail: 'Detected 2 stale delegate-server processes not rooted in a live codex client.',
          dryRun: false,
          terminatedPids: [202, 203],
          forcedPids: [],
          remainingPids: []
        });

    await runDelegationCliShell(
      {
        positionals: ['cleanup-stale'],
        flags: { format: 'json', yes: true }
      },
      {
        cleanupStaleDelegateServerProcesses: cleanupMock,
        log
      }
    );

    expect(cleanupMock).toHaveBeenCalledWith({ apply: true });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      status: 'stale',
      staleCount: 2,
      dryRun: false,
      terminatedPids: [202, 203]
    });
  });
});
