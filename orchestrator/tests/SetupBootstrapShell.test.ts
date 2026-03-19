import { afterEach, describe, expect, it, vi } from 'vitest';

import { runSetupBootstrapShell } from '../src/cli/setupBootstrapShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runSetupBootstrapShell', () => {
  it('emits the planned setup payload in json mode', async () => {
    const log = vi.fn();

    await runSetupBootstrapShell(
      {
        format: 'json',
        apply: false,
        refreshSkills: false,
        repoRoot: '/tmp/repo'
      },
      {
        listBundledSkills: vi.fn(async () => ['docs-first', 'chrome-devtools']),
        runDelegationSetup: vi.fn(async () => ({ status: 'planned', plan: { repoRoot: '/tmp/repo' } })),
        runDevtoolsSetup: vi.fn(async () => ({ status: 'planned', plan: { commandLine: 'codex mcp add chrome-devtools' } })),
        log
      }
    );

    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      status: string;
      steps: {
        skills: { commandLines: string[]; note: string };
        guidance: { recommended_commands: string[]; references: string[]; note: string };
      };
    };
    expect(payload.status).toBe('planned');
    expect(payload.steps.skills.commandLines).toEqual([
      'codex-orchestrator skills install --only docs-first,chrome-devtools'
    ]);
    expect(payload.steps.guidance.note).toContain('Agent-first default');
    expect(payload.steps.guidance.references).toContain(
      'https://github.com/Kbediako/CO/blob/main/docs/AGENTS.md'
    );
  });

  it('renders the apply summaries and final next step in text mode', async () => {
    const log = vi.fn();

    await runSetupBootstrapShell(
      {
        format: 'text',
        apply: true,
        refreshSkills: true,
        repoRoot: '/tmp/repo',
        repoFlag: 'repo;quoted'
      },
      {
        listBundledSkills: vi.fn(async () => ['docs-first']),
        installSkills: vi.fn(async () => ({ written: [], skipped: [], sourceRoot: '/src', targetRoot: '/dst', skills: ['docs-first'] })),
        runDelegationSetup: vi.fn(async () => ({ status: 'applied' })),
        runDevtoolsSetup: vi.fn(async () => ({ status: 'applied' })),
        formatSkillsInstallSummary: vi.fn(() => ['Skills source: /src']),
        formatDelegationSetupSummary: vi.fn(() => ['Delegation setup: applied']),
        formatDevtoolsSetupSummary: vi.fn(() => ['DevTools setup: applied']),
        log
      }
    );

    expect(log.mock.calls.map(([line]) => line)).toEqual(
      expect.arrayContaining([
        'Skills source: /src',
        'Delegation setup: applied',
        'DevTools setup: applied',
        'Setup guidance:',
        'Next: codex-orchestrator doctor --usage'
      ])
    );
  });

  it('renders the planned setup summary in text mode with wrapper previews and guidance', async () => {
    const log = vi.fn();

    await runSetupBootstrapShell(
      {
        format: 'text',
        apply: false,
        refreshSkills: true,
        repoRoot: '/tmp/repo',
        repoFlag: 'repo;quoted'
      },
      {
        buildCommandPreview: vi.fn(() => "codex-orchestrator delegation setup --yes --repo 'repo;quoted'"),
        listBundledSkills: vi.fn(async () => ['docs-first', 'chrome-devtools']),
        runDelegationSetup: vi.fn(async () => ({ status: 'planned' })),
        runDevtoolsSetup: vi.fn(async () => ({ status: 'planned' })),
        log
      }
    );

    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'Setup plan:',
      '- Skills:',
      '  - codex-orchestrator skills install --force --only docs-first,chrome-devtools',
      "- Delegation: codex-orchestrator delegation setup --yes --repo 'repo;quoted'",
      '- DevTools: codex-orchestrator devtools setup --yes',
      'Setup guidance:',
      '- Agent-first default: run docs-review before implementation and implementation-gate before handoff.',
      '- Recommended commands:',
      '  - codex-orchestrator flow --task <task-id>',
      '  - codex-orchestrator doctor --usage',
      '  - codex-orchestrator rlm --multi-agent auto "<goal>"',
      '  - codex-orchestrator codex defaults --yes',
      '  - codex-orchestrator mcp enable --servers delegation --yes',
      '- References:',
      '  - https://github.com/Kbediako/CO#downstream-usage-cheatsheet-agent-first',
      '  - https://github.com/Kbediako/CO/blob/main/docs/AGENTS.md',
      '  - https://github.com/Kbediako/CO/blob/main/docs/guides/collab-vs-mcp.md',
      '  - https://github.com/Kbediako/CO/blob/main/docs/guides/rlm-recursion-v2.md',
      'Run with --yes to apply this setup.'
    ]);
  });

  it('fails fast when no bundled skills are available', async () => {
    await expect(
      runSetupBootstrapShell(
        {
          format: 'text',
          apply: false,
          refreshSkills: false,
          repoRoot: '/tmp/repo'
        },
        {
          listBundledSkills: vi.fn(async () => [])
        }
      )
    ).rejects.toThrow('No bundled skills detected; cannot run setup.');
  });
});
