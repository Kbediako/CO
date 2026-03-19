import { afterEach, describe, expect, it, vi } from 'vitest';

import { runSkillsCliShell } from '../src/cli/skillsCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runSkillsCliShell', () => {
  it('prints help when requested before dispatching subcommands', async () => {
    const printHelp = vi.fn();
    const installSkillsMock = vi.fn<typeof import('../src/cli/skills.js').installSkills>();

    await runSkillsCliShell(
      {
        positionals: [],
        flags: { help: true },
        printHelp
      },
      {
        installSkills: installSkillsMock
      }
    );

    expect(printHelp).toHaveBeenCalledTimes(1);
    expect(installSkillsMock).not.toHaveBeenCalled();
  });

  it('maps install flags into the skills engine and emits json', async () => {
    const printHelp = vi.fn();
    const log = vi.fn();
    const installSkillsMock =
      vi.fn<typeof import('../src/cli/skills.js').installSkills>().mockResolvedValue({
        written: ['/tmp/.codex/skills/docs-first/SKILL.md'],
        skipped: [],
        sourceRoot: '/tmp/pkg/skills',
        targetRoot: '/tmp/.codex/skills',
        skills: ['docs-first']
      });

    await runSkillsCliShell(
      {
        positionals: ['install'],
        flags: {
          format: 'json',
          force: true,
          'codex-home': '/tmp/.codex',
          only: 'docs-first, chrome-devtools'
        },
        printHelp
      },
      {
        installSkills: installSkillsMock,
        log
      }
    );

    expect(printHelp).not.toHaveBeenCalled();
    expect(installSkillsMock).toHaveBeenCalledWith({
      force: true,
      codexHome: '/tmp/.codex',
      only: ['docs-first', 'chrome-devtools']
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      written: ['/tmp/.codex/skills/docs-first/SKILL.md'],
      skipped: [],
      sourceRoot: '/tmp/pkg/skills',
      targetRoot: '/tmp/.codex/skills',
      skills: ['docs-first']
    });
  });

  it('renders text output from the skills engine', async () => {
    const printHelp = vi.fn();
    const log = vi.fn();
    const installSkillsMock =
      vi.fn<typeof import('../src/cli/skills.js').installSkills>().mockResolvedValue({
        written: [],
        skipped: ['/tmp/.codex/skills/docs-first/SKILL.md'],
        sourceRoot: '/tmp/pkg/skills',
        targetRoot: '/tmp/.codex/skills',
        skills: ['docs-first']
      });
    const formatSkillsInstallSummaryMock =
      vi.fn<typeof import('../src/cli/skills.js').formatSkillsInstallSummary>().mockReturnValue([
        'Skills source: /tmp/pkg/skills',
        'Skills target: /tmp/.codex/skills'
      ]);

    await runSkillsCliShell(
      {
        positionals: ['install'],
        flags: {},
        printHelp
      },
      {
        installSkills: installSkillsMock,
        formatSkillsInstallSummary: formatSkillsInstallSummaryMock,
        log
      }
    );

    expect(installSkillsMock).toHaveBeenCalledWith({
      force: false,
      codexHome: undefined,
      only: undefined
    });
    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'Skills source: /tmp/pkg/skills',
      'Skills target: /tmp/.codex/skills'
    ]);
  });

  it('rejects --only when the flag has no value', async () => {
    await expect(
      runSkillsCliShell({
        positionals: ['install'],
        flags: { only: true },
        printHelp: vi.fn()
      })
    ).rejects.toThrow('--only requires a comma-separated list of skill names.');
  });

  it('rejects unknown skills subcommands', async () => {
    await expect(
      runSkillsCliShell({
        positionals: ['unexpected'],
        flags: {},
        printHelp: vi.fn()
      })
    ).rejects.toThrow('Unknown skills command: unexpected');
  });
});
