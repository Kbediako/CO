import { afterEach, describe, expect, it, vi } from 'vitest';

import { runInitCliShell } from '../src/cli/initCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runInitCliShell', () => {
  it('rejects missing templates', async () => {
    await expect(
      runInitCliShell({
        positionals: [],
        flags: {}
      })
    ).rejects.toThrow('init requires a template name (e.g. init codex).');
  });

  it('rejects unknown templates', async () => {
    await expect(
      runInitCliShell({
        positionals: ['unexpected'],
        flags: {}
      })
    ).rejects.toThrow('Unknown init template: unexpected');
  });

  it('maps cwd and force flags into template initialization and logs the init summary', async () => {
    const initCodexTemplatesMock =
      vi.fn<typeof import('../src/cli/init.js').initCodexTemplates>().mockResolvedValue({
        written: ['/tmp/workspace/AGENTS.md'],
        skipped: [],
        templateRoot: '/tmp/templates/codex'
      });
    const formatInitSummaryMock =
      vi.fn<typeof import('../src/cli/init.js').formatInitSummary>().mockReturnValue([
        'Written:',
        '  - AGENTS.md'
      ]);
    const runCodexCliSetupMock =
      vi.fn<typeof import('../src/cli/codexCliSetup.ts').runCodexCliSetup>();
    const log = vi.fn();

    await runInitCliShell(
      {
        positionals: ['codex'],
        flags: {
          cwd: '/tmp/workspace',
          force: true
        }
      },
      {
        initCodexTemplates: initCodexTemplatesMock,
        formatInitSummary: formatInitSummaryMock,
        runCodexCliSetup: runCodexCliSetupMock,
        log
      }
    );

    expect(initCodexTemplatesMock).toHaveBeenCalledWith({
      template: 'codex',
      cwd: '/tmp/workspace',
      force: true
    });
    expect(formatInitSummaryMock).toHaveBeenCalledWith(
      {
        written: ['/tmp/workspace/AGENTS.md'],
        skipped: [],
        templateRoot: '/tmp/templates/codex'
      },
      '/tmp/workspace'
    );
    expect(runCodexCliSetupMock).not.toHaveBeenCalled();
    expect(log.mock.calls.map(([line]) => line)).toEqual(['Written:', '  - AGENTS.md']);
  });

  it('defaults cwd to process.cwd() and force to false', async () => {
    const initCodexTemplatesMock =
      vi.fn<typeof import('../src/cli/init.js').initCodexTemplates>().mockResolvedValue({
        written: [],
        skipped: [],
        templateRoot: '/tmp/templates/codex'
      });
    const formatInitSummaryMock =
      vi.fn<typeof import('../src/cli/init.js').formatInitSummary>().mockReturnValue(['No files written.']);
    const log = vi.fn();
    vi.spyOn(process, 'cwd').mockReturnValue('/tmp/default-cwd');

    await runInitCliShell(
      {
        positionals: ['codex'],
        flags: {}
      },
      {
        initCodexTemplates: initCodexTemplatesMock,
        formatInitSummary: formatInitSummaryMock,
        log
      }
    );

    expect(initCodexTemplatesMock).toHaveBeenCalledWith({
      template: 'codex',
      cwd: '/tmp/default-cwd',
      force: false
    });
    expect(formatInitSummaryMock).toHaveBeenCalledWith(
      {
        written: [],
        skipped: [],
        templateRoot: '/tmp/templates/codex'
      },
      '/tmp/default-cwd'
    );
    expect(log.mock.calls.map(([line]) => line)).toEqual(['No files written.']);
  });

  it('runs the optional codex-cli follow-on setup and appends its summary lines', async () => {
    const initCodexTemplatesMock =
      vi.fn<typeof import('../src/cli/init.js').initCodexTemplates>().mockResolvedValue({
        written: ['/tmp/workspace/codex.orchestrator.json'],
        skipped: [],
        templateRoot: '/tmp/templates/codex'
      });
    const formatInitSummaryMock =
      vi.fn<typeof import('../src/cli/init.js').formatInitSummary>().mockReturnValue([
        'Written:',
        '  - codex.orchestrator.json'
      ]);
    const runCodexCliSetupMock =
      vi.fn<typeof import('../src/cli/codexCliSetup.ts').runCodexCliSetup>().mockResolvedValue({
        status: 'planned',
        plan: { method: 'build' }
      } as never);
    const formatCodexCliSetupSummaryMock =
      vi.fn<typeof import('../src/cli/codexCliSetup.ts').formatCodexCliSetupSummary>().mockReturnValue([
        'Codex CLI setup: planned',
        'Run with --yes to apply this setup.'
      ]);
    const log = vi.fn();

    await runInitCliShell(
      {
        positionals: ['codex'],
        flags: {
          cwd: '/tmp/workspace',
          'codex-cli': true,
          yes: true,
          'codex-force': true,
          'codex-source': '/tmp/codex',
          'codex-ref': 'main',
          'codex-download-url': 'https://example.invalid/codex',
          'codex-download-sha256': 'abc123'
        }
      },
      {
        initCodexTemplates: initCodexTemplatesMock,
        formatInitSummary: formatInitSummaryMock,
        runCodexCliSetup: runCodexCliSetupMock,
        formatCodexCliSetupSummary: formatCodexCliSetupSummaryMock,
        log
      }
    );

    expect(runCodexCliSetupMock).toHaveBeenCalledWith({
      apply: true,
      force: true,
      source: '/tmp/codex',
      ref: 'main',
      downloadUrl: 'https://example.invalid/codex',
      downloadSha256: 'abc123'
    });
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'Written:',
      '  - codex.orchestrator.json',
      'Codex CLI setup: planned',
      'Run with --yes to apply this setup.'
    ]);
  });
});
