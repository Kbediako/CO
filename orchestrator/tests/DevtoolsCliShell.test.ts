import { afterEach, describe, expect, it, vi } from 'vitest';

import { runDevtoolsCliShell } from '../src/cli/devtoolsCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runDevtoolsCliShell', () => {
  it('emits the planned setup payload in json mode', async () => {
    const runDevtoolsSetupMock = vi.fn<typeof import('../src/cli/devtoolsSetup.js').runDevtoolsSetup>()
      .mockResolvedValue({
        status: 'planned',
        plan: { commandLine: 'codex mcp add chrome-devtools' } as never,
        readiness: {} as never
      });
    const log = vi.fn();

    await runDevtoolsCliShell(
      {
        positionals: ['setup'],
        flags: { format: 'json' }
      },
      {
        runDevtoolsSetup: runDevtoolsSetupMock,
        log
      }
    );

    expect(runDevtoolsSetupMock).toHaveBeenCalledWith({ apply: false });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      status: 'planned'
    });
  });

  it('renders the setup summary in text mode', async () => {
    const runDevtoolsSetupMock = vi.fn<typeof import('../src/cli/devtoolsSetup.js').runDevtoolsSetup>()
      .mockResolvedValue({
        status: 'applied',
        plan: {} as never,
        readiness: {} as never
      });
    const formatDevtoolsSetupSummaryMock = vi.fn(() => ['DevTools setup: applied']);
    const log = vi.fn();

    await runDevtoolsCliShell(
      {
        positionals: ['setup'],
        flags: { yes: true }
      },
      {
        runDevtoolsSetup: runDevtoolsSetupMock,
        formatDevtoolsSetupSummary: formatDevtoolsSetupSummaryMock,
        log
      }
    );

    expect(runDevtoolsSetupMock).toHaveBeenCalledWith({ apply: true });
    expect(formatDevtoolsSetupSummaryMock).toHaveBeenCalled();
    expect(log.mock.calls.map(([line]) => line)).toEqual(['DevTools setup: applied']);
  });

  it('rejects missing subcommands', async () => {
    await expect(
      runDevtoolsCliShell({
        positionals: [],
        flags: {}
      })
    ).rejects.toThrow('devtools requires a subcommand (setup).');
  });

  it('rejects unknown subcommands', async () => {
    await expect(
      runDevtoolsCliShell({
        positionals: ['ship-it'],
        flags: {}
      })
    ).rejects.toThrow('Unknown devtools subcommand: ship-it');
  });

  it('rejects json mode when combined with --yes', async () => {
    await expect(
      runDevtoolsCliShell({
        positionals: ['setup'],
        flags: { format: 'json', yes: true }
      })
    ).rejects.toThrow('devtools setup does not support --format json with --yes.');
  });
});
