/* eslint-disable patterns/prefer-logger-over-console */

import { formatDevtoolsSetupSummary, runDevtoolsSetup } from './devtoolsSetup.js';
import { formatDelegationSetupSummary, runDelegationSetup } from './delegationSetup.js';
import { buildCommandPreview } from './utils/commandPreview.js';
import { formatSkillsInstallSummary, installSkills, listBundledSkills } from './skills.js';

type OutputFormat = 'json' | 'text';

interface SetupGuidancePayload {
  note: string;
  references: string[];
  recommended_commands: string[];
}

export interface RunSetupBootstrapShellParams {
  format: OutputFormat;
  apply: boolean;
  refreshSkills: boolean;
  repoRoot: string;
  repoFlag?: string;
}

interface SetupBootstrapShellDependencies {
  buildCommandPreview: typeof buildCommandPreview;
  listBundledSkills: typeof listBundledSkills;
  installSkills: typeof installSkills;
  runDelegationSetup: typeof runDelegationSetup;
  runDevtoolsSetup: typeof runDevtoolsSetup;
  formatSkillsInstallSummary: typeof formatSkillsInstallSummary;
  formatDelegationSetupSummary: typeof formatDelegationSetupSummary;
  formatDevtoolsSetupSummary: typeof formatDevtoolsSetupSummary;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: SetupBootstrapShellDependencies = {
  buildCommandPreview,
  listBundledSkills,
  installSkills,
  runDelegationSetup,
  runDevtoolsSetup,
  formatSkillsInstallSummary,
  formatDelegationSetupSummary,
  formatDevtoolsSetupSummary,
  log: (line: string) => console.log(line)
};

export async function runSetupBootstrapShell(
  params: RunSetupBootstrapShellParams,
  overrides: Partial<SetupBootstrapShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const delegationCommandPreview = params.repoFlag
    ? dependencies.buildCommandPreview('codex-orchestrator', ['delegation', 'setup', '--yes', '--repo', params.repoFlag])
    : 'codex-orchestrator delegation setup --yes';
  const bundledSkills = await dependencies.listBundledSkills();
  if (bundledSkills.length === 0) {
    throw new Error('No bundled skills detected; cannot run setup.');
  }
  const guidance = buildSetupGuidance();

  if (!params.apply) {
    const installCommand =
      `codex-orchestrator skills install ${params.refreshSkills ? '--force ' : ''}--only ${bundledSkills.join(',')}`;
    const skillsNote = params.refreshSkills
      ? 'Installs bundled skills into $CODEX_HOME/skills with overwrite enabled via --refresh-skills.'
      : 'Installs bundled skills into $CODEX_HOME/skills without overwriting existing files by default. Add --refresh-skills to force overwrite.';

    const delegation = await dependencies.runDelegationSetup({ repoRoot: params.repoRoot });
    const devtools = await dependencies.runDevtoolsSetup();
    const payload = {
      status: 'planned' as const,
      steps: {
        skills: {
          commandLines: [installCommand],
          note: skillsNote
        },
        delegation,
        devtools,
        guidance
      }
    };

    if (params.format === 'json') {
      dependencies.log(JSON.stringify(payload, null, 2));
      return;
    }

    dependencies.log('Setup plan:');
    dependencies.log('- Skills:');
    for (const commandLine of payload.steps.skills.commandLines) {
      dependencies.log(`  - ${commandLine}`);
    }
    dependencies.log(`- Delegation: ${delegationCommandPreview}`);
    dependencies.log('- DevTools: codex-orchestrator devtools setup --yes');
    for (const line of formatSetupGuidanceSummary(guidance)) {
      dependencies.log(line);
    }
    dependencies.log('Run with --yes to apply this setup.');
    return;
  }

  const skills = await dependencies.installSkills({ force: params.refreshSkills, only: bundledSkills });
  const delegation = await dependencies.runDelegationSetup({ apply: true, repoRoot: params.repoRoot });
  const devtools = await dependencies.runDevtoolsSetup({ apply: true });

  for (const line of dependencies.formatSkillsInstallSummary(skills)) {
    dependencies.log(line);
  }
  for (const line of dependencies.formatDelegationSetupSummary(delegation)) {
    dependencies.log(line);
  }
  for (const line of dependencies.formatDevtoolsSetupSummary(devtools)) {
    dependencies.log(line);
  }
  for (const line of formatSetupGuidanceSummary(guidance)) {
    dependencies.log(line);
  }
  dependencies.log('Next: codex-orchestrator doctor --usage');
}

function buildSetupGuidance(): SetupGuidancePayload {
  return {
    note: 'Agent-first default: run docs-review before implementation and implementation-gate before handoff.',
    references: [
      'https://github.com/Kbediako/CO#downstream-usage-cheatsheet-agent-first',
      'https://github.com/Kbediako/CO/blob/main/docs/AGENTS.md',
      'https://github.com/Kbediako/CO/blob/main/docs/guides/collab-vs-mcp.md',
      'https://github.com/Kbediako/CO/blob/main/docs/guides/rlm-recursion-v2.md'
    ],
    recommended_commands: [
      'codex-orchestrator flow --task <task-id>',
      'codex-orchestrator doctor --usage',
      'codex-orchestrator rlm --multi-agent auto "<goal>"',
      'codex-orchestrator codex defaults --yes',
      'codex-orchestrator mcp enable --servers delegation --yes'
    ]
  };
}

function formatSetupGuidanceSummary(guidance: SetupGuidancePayload): string[] {
  const lines: string[] = ['Setup guidance:', `- ${guidance.note}`];
  if (guidance.recommended_commands.length > 0) {
    lines.push('- Recommended commands:');
    for (const command of guidance.recommended_commands) {
      lines.push(`  - ${command}`);
    }
  }
  if (guidance.references.length > 0) {
    lines.push('- References:');
    for (const reference of guidance.references) {
      lines.push(`  - ${reference}`);
    }
  }
  return lines;
}
