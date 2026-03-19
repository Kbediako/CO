import { afterEach, describe, expect, it, vi } from 'vitest';

import { runMcpEnableCliShell } from '../src/cli/mcpEnableCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runMcpEnableCliShell', () => {
  it('parses equals-style flags and emits the planned json payload', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const runMcpEnableMock = vi.fn<typeof import('../src/cli/mcpEnable.js').runMcpEnable>().mockResolvedValue({
      status: 'planned',
      codex_bin: 'codex',
      targets: ['delegation'],
      actions: [{ name: 'delegation', status: 'planned' }]
    } as never);

    await runMcpEnableCliShell(
      {
        rawArgs: ['--format=json', '--servers=delegation', '--yes=false']
      },
      {
        runMcpEnable: runMcpEnableMock,
        log,
        setExitCode
      }
    );

    expect(runMcpEnableMock).toHaveBeenCalledWith({
      apply: false,
      serverNames: ['delegation']
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      status: 'planned',
      codex_bin: 'codex',
      targets: ['delegation'],
      actions: [{ name: 'delegation', status: 'planned' }]
    });
    expect(setExitCode).not.toHaveBeenCalled();
  });

  it('rejects duplicate enable flags before invoking the engine', async () => {
    const runMcpEnableMock = vi.fn<typeof import('../src/cli/mcpEnable.js').runMcpEnable>();

    await expect(
      runMcpEnableCliShell(
        {
          rawArgs: ['--servers', 'delegation', '--servers', 'playwright']
        },
        {
          runMcpEnable: runMcpEnableMock
        }
      )
    ).rejects.toThrow('--servers specified multiple times.');

    expect(runMcpEnableMock).not.toHaveBeenCalled();
  });

  it('sets a non-zero exit code when apply mode reports non-enabled actions', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const runMcpEnableMock = vi.fn<typeof import('../src/cli/mcpEnable.js').runMcpEnable>().mockResolvedValue({
      status: 'applied',
      codex_bin: 'codex',
      targets: ['delegation'],
      actions: [{ name: 'delegation', status: 'failed', reason: 'simulated add failure' }]
    } as never);
    const formatSummaryMock =
      vi.fn<typeof import('../src/cli/mcpEnable.js').formatMcpEnableSummary>().mockReturnValue([
        'MCP enable: applied',
        '  - delegation: failed (simulated add failure)'
      ]);

    await runMcpEnableCliShell(
      {
        rawArgs: ['--yes']
      },
      {
        runMcpEnable: runMcpEnableMock,
        formatMcpEnableSummary: formatSummaryMock,
        log,
        setExitCode
      }
    );

    expect(runMcpEnableMock).toHaveBeenCalledWith({
      apply: true,
      serverNames: undefined
    });
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'MCP enable: applied',
      '  - delegation: failed (simulated add failure)'
    ]);
    expect(setExitCode).toHaveBeenCalledWith(1);
  });
});
