import { afterEach, describe, expect, it, vi } from 'vitest';

import { runDelegationCliShell } from '../src/cli/delegationCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runDelegationCliShell', () => {
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
    ).rejects.toThrow('delegation requires a subcommand (setup).');

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
          commandLine: "codex mcp add delegation -- codex-orchestrator delegate-server --repo '/tmp/repo'"
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
        commandLine: "codex mcp add delegation -- codex-orchestrator delegate-server --repo '/tmp/repo'"
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
          commandLine: "codex mcp add delegation -- codex-orchestrator delegate-server --repo '/tmp/repo'"
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
          commandLine: "codex mcp add delegation -- codex-orchestrator delegate-server --repo '/tmp/repo'"
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
});
