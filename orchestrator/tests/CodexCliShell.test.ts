import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCodexCliShell } from '../src/cli/codexCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runCodexCliShell', () => {
  it('prints help when requested before dispatching subcommands', async () => {
    const printHelp = vi.fn();
    const runCodexCliSetupMock = vi.fn<typeof import('../src/cli/codexCliSetup.js').runCodexCliSetup>();

    await runCodexCliShell(
      {
        positionals: [],
        flags: { help: true },
        printHelp
      },
      {
        runCodexCliSetup: runCodexCliSetupMock
      }
    );

    expect(printHelp).toHaveBeenCalledTimes(1);
    expect(runCodexCliSetupMock).not.toHaveBeenCalled();
  });

  it('maps setup flags into the setup engine and emits json', async () => {
    const printHelp = vi.fn();
    const log = vi.fn();
    const runCodexCliSetupMock =
      vi.fn<typeof import('../src/cli/codexCliSetup.js').runCodexCliSetup>().mockResolvedValue({
        status: 'planned',
        plan: { method: 'build', source: '/tmp/codex', ref: 'main' }
      } as never);

    await runCodexCliShell(
      {
        positionals: ['setup'],
        flags: {
          format: 'json',
          yes: true,
          force: true,
          source: '/tmp/codex',
          ref: 'main',
          'download-url': 'https://example.invalid/codex',
          'download-sha256': 'abc123'
        },
        printHelp
      },
      {
        runCodexCliSetup: runCodexCliSetupMock,
        log
      }
    );

    expect(printHelp).not.toHaveBeenCalled();
    expect(runCodexCliSetupMock).toHaveBeenCalledWith({
      apply: true,
      force: true,
      source: '/tmp/codex',
      ref: 'main',
      downloadUrl: 'https://example.invalid/codex',
      downloadSha256: 'abc123'
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      status: 'planned',
      plan: { method: 'build', source: '/tmp/codex', ref: 'main' }
    });
  });

  it('renders defaults text output from the defaults engine', async () => {
    const printHelp = vi.fn();
    const log = vi.fn();
    const runCodexDefaultsSetupMock =
      vi.fn<typeof import('../src/cli/codexDefaultsSetup.ts').runCodexDefaultsSetup>().mockResolvedValue({
        status: 'planned'
      } as never);
    const formatCodexDefaultsSetupSummaryMock =
      vi.fn<typeof import('../src/cli/codexDefaultsSetup.ts').formatCodexDefaultsSetupSummary>().mockReturnValue([
        'Codex defaults setup: planned',
        'Run with --yes to apply this setup.'
      ]);

    await runCodexCliShell(
      {
        positionals: ['defaults'],
        flags: { force: true },
        printHelp
      },
      {
        runCodexDefaultsSetup: runCodexDefaultsSetupMock,
        formatCodexDefaultsSetupSummary: formatCodexDefaultsSetupSummaryMock,
        log
      }
    );

    expect(runCodexDefaultsSetupMock).toHaveBeenCalledWith({
      apply: false,
      force: true
    });
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'Codex defaults setup: planned',
      'Run with --yes to apply this setup.'
    ]);
  });

  it('rejects unknown codex subcommands', async () => {
    await expect(
      runCodexCliShell({
        positionals: ['unexpected'],
        flags: {},
        printHelp: vi.fn()
      })
    ).rejects.toThrow('Unknown codex subcommand: unexpected');
  });
});
