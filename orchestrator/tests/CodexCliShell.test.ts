import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCodexCliShell } from '../src/cli/codexCliShell.js';

type TestFlags = Record<string, string | boolean>;

afterEach(() => {
  vi.restoreAllMocks();
});

function dispatchDefaultsForTest(flags: TestFlags) {
  const runCodexDefaultsSetupMock =
    vi.fn<typeof import('../src/cli/codexDefaultsSetup.ts').runCodexDefaultsSetup>().mockResolvedValue({
      status: 'planned'
    } as never);

  const promise = runCodexCliShell(
    {
      positionals: ['defaults'],
      flags,
      printHelp: vi.fn()
    },
    {
      runCodexDefaultsSetup: runCodexDefaultsSetupMock,
      formatCodexDefaultsSetupSummary: vi.fn().mockReturnValue([]),
      log: vi.fn()
    }
  );

  return { promise, runCodexDefaultsSetupMock };
}

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
      force: true,
      authScope: undefined
    });
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'Codex defaults setup: planned',
      'Run with --yes to apply this setup.'
    ]);
  });

  it('passes explicit ChatGPT auth scope to defaults setup', async () => {
    const runCodexDefaultsSetupMock =
      vi.fn<typeof import('../src/cli/codexDefaultsSetup.ts').runCodexDefaultsSetup>().mockResolvedValue({
        status: 'planned'
      } as never);

    await runCodexCliShell(
      {
        positionals: ['defaults'],
        flags: { yes: true, 'auth-scope': 'chatgpt' },
        printHelp: vi.fn()
      },
      {
        runCodexDefaultsSetup: runCodexDefaultsSetupMock,
        formatCodexDefaultsSetupSummary: vi.fn().mockReturnValue([]),
        log: vi.fn()
      }
    );

    expect(runCodexDefaultsSetupMock).toHaveBeenCalledWith({
      apply: true,
      force: false,
      authScope: 'chatgpt'
    });
  });

  it('maps legacy boolean ChatGPT auth flag to ChatGPT auth scope', async () => {
    const { promise, runCodexDefaultsSetupMock } = dispatchDefaultsForTest({
      yes: true,
      'chatgpt-auth': true
    });

    await promise;

    expect(runCodexDefaultsSetupMock).toHaveBeenCalledWith({
      apply: true,
      force: false,
      authScope: 'chatgpt'
    });
  });

  it.each(['true', '1', 'yes', 'on', 'enabled'])(
    'maps legacy string ChatGPT auth value %s to ChatGPT auth scope',
    async value => {
      const { promise, runCodexDefaultsSetupMock } = dispatchDefaultsForTest({
        yes: true,
        'chatgpt-auth': value
      });

      await promise;

      expect(runCodexDefaultsSetupMock).toHaveBeenCalledWith({
        apply: true,
        force: false,
        authScope: 'chatgpt'
      });
    }
  );

  it.each([false, 'false', '0', 'no', 'off', 'disabled'])(
    'maps legacy ChatGPT auth value %s to portable auth scope',
    async value => {
      const { promise, runCodexDefaultsSetupMock } = dispatchDefaultsForTest({
        yes: true,
        'chatgpt-auth': value
      });

      await promise;

      expect(runCodexDefaultsSetupMock).toHaveBeenCalledWith({
        apply: true,
        force: false,
        authScope: 'portable'
      });
    }
  );

  it('rejects invalid legacy ChatGPT auth flag values', async () => {
    const { promise, runCodexDefaultsSetupMock } = dispatchDefaultsForTest({
      yes: true,
      'chatgpt-auth': 'maybe'
    });

    await expect(promise).rejects.toThrow('Invalid codex defaults ChatGPT auth flag');
    expect(runCodexDefaultsSetupMock).not.toHaveBeenCalled();
  });

  it.each([true, 'true'])('rejects conflicting ChatGPT auth scope flags for legacy value %s', async value => {
    const { promise, runCodexDefaultsSetupMock } = dispatchDefaultsForTest({
      yes: true,
      'chatgpt-auth': value,
      'auth-scope': 'portable'
    });

    await expect(promise).rejects.toThrow('Conflicting codex defaults auth scope');
    expect(runCodexDefaultsSetupMock).not.toHaveBeenCalled();
  });

  it.each([false, 'false'])(
    'rejects conflicting portable auth scope flags for legacy value %s',
    async value => {
      const { promise, runCodexDefaultsSetupMock } = dispatchDefaultsForTest({
        yes: true,
        'chatgpt-auth': value,
        'auth-scope': 'chatgpt'
      });

      await expect(promise).rejects.toThrow('Conflicting codex defaults auth scope');
      expect(runCodexDefaultsSetupMock).not.toHaveBeenCalled();
    }
  );

  it('rejects auth scope flags without a value', async () => {
    const runCodexDefaultsSetupMock =
      vi.fn<typeof import('../src/cli/codexDefaultsSetup.ts').runCodexDefaultsSetup>().mockResolvedValue({
        status: 'planned'
      } as never);

    await expect(
      runCodexCliShell(
        {
          positionals: ['defaults'],
          flags: { yes: true, 'auth-scope': true },
          printHelp: vi.fn()
        },
        {
          runCodexDefaultsSetup: runCodexDefaultsSetupMock,
          formatCodexDefaultsSetupSummary: vi.fn().mockReturnValue([]),
          log: vi.fn()
        }
      )
    ).rejects.toThrow('Missing value for codex defaults auth scope');
    expect(runCodexDefaultsSetupMock).not.toHaveBeenCalled();
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
