/* eslint-disable patterns/prefer-logger-over-console */

import {
  formatDoctorCloudPreflightSummary,
  formatDoctorSummary,
  runDoctor,
  runDoctorCloudPreflight
} from './doctor.js';
import { formatDoctorUsageSummary, runDoctorUsage } from './doctorUsage.js';
import { formatDoctorIssueLogSummary, writeDoctorIssueLog } from './doctorIssueLog.js';
import { formatDevtoolsSetupSummary, runDevtoolsSetup } from './devtoolsSetup.js';
import { formatDelegationSetupSummary, runDelegationSetup } from './delegationSetup.js';
import { formatSkillsInstallSummary, installSkills } from './skills.js';

type OutputFormat = 'json' | 'text';

export interface RunDoctorCliShellParams {
  format: OutputFormat;
  includeUsage: boolean;
  includeCloudPreflight: boolean;
  includeIssueLog: boolean;
  cloudEnvIdOverride?: string;
  cloudBranchOverride?: string;
  issueTitle?: string;
  issueNotes?: string;
  issueLogPath?: string;
  wantsApply: boolean;
  apply: boolean;
  windowDays?: number;
  taskFilter: string | null;
  repoRoot: string;
}

interface DoctorCliShellDependencies {
  runDoctor: typeof runDoctor;
  runDoctorUsage: typeof runDoctorUsage;
  runDoctorCloudPreflight: typeof runDoctorCloudPreflight;
  writeDoctorIssueLog: typeof writeDoctorIssueLog;
  runDelegationSetup: typeof runDelegationSetup;
  runDevtoolsSetup: typeof runDevtoolsSetup;
  installSkills: typeof installSkills;
  formatDoctorSummary: typeof formatDoctorSummary;
  formatDoctorUsageSummary: typeof formatDoctorUsageSummary;
  formatDoctorCloudPreflightSummary: typeof formatDoctorCloudPreflightSummary;
  formatDoctorIssueLogSummary: typeof formatDoctorIssueLogSummary;
  formatSkillsInstallSummary: typeof formatSkillsInstallSummary;
  formatDelegationSetupSummary: typeof formatDelegationSetupSummary;
  formatDevtoolsSetupSummary: typeof formatDevtoolsSetupSummary;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: DoctorCliShellDependencies = {
  runDoctor,
  runDoctorUsage,
  runDoctorCloudPreflight,
  writeDoctorIssueLog,
  runDelegationSetup,
  runDevtoolsSetup,
  installSkills,
  formatDoctorSummary,
  formatDoctorUsageSummary,
  formatDoctorCloudPreflightSummary,
  formatDoctorIssueLogSummary,
  formatSkillsInstallSummary,
  formatDelegationSetupSummary,
  formatDevtoolsSetupSummary,
  log: (line: string) => console.log(line)
};

export async function runDoctorCliShell(
  params: RunDoctorCliShellParams,
  overrides: Partial<DoctorCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const doctorResult = dependencies.runDoctor(params.repoRoot);
  const usageResult = params.includeUsage
    ? await dependencies.runDoctorUsage({ windowDays: params.windowDays, taskFilter: params.taskFilter })
    : null;
  const cloudPreflightResult = params.includeCloudPreflight
    ? await dependencies.runDoctorCloudPreflight({
        cwd: params.repoRoot,
        environmentId: params.cloudEnvIdOverride,
        branch: params.cloudBranchOverride,
        taskId: params.taskFilter
      })
    : null;
  const issueLogResult = params.includeIssueLog
    ? await dependencies.writeDoctorIssueLog({
        doctor: doctorResult,
        usage: usageResult,
        cloudPreflight: cloudPreflightResult,
        issueTitle: params.issueTitle,
        issueNotes: params.issueNotes,
        issueLogPath: params.issueLogPath,
        taskFilter: params.taskFilter
      })
    : null;

  if (params.format === 'json') {
    const payload: Record<string, unknown> = { ...doctorResult };
    if (usageResult) {
      payload.usage = usageResult;
    }
    if (cloudPreflightResult) {
      payload.cloud_preflight = cloudPreflightResult;
    }
    if (issueLogResult) {
      payload.issue_log = issueLogResult;
    }
    dependencies.log(JSON.stringify(payload, null, 2));
    return;
  }

  for (const line of dependencies.formatDoctorSummary(doctorResult)) {
    dependencies.log(line);
  }
  if (usageResult) {
    for (const line of dependencies.formatDoctorUsageSummary(usageResult)) {
      dependencies.log(line);
    }
  }
  if (cloudPreflightResult) {
    for (const line of dependencies.formatDoctorCloudPreflightSummary(cloudPreflightResult)) {
      dependencies.log(line);
    }
  }
  if (issueLogResult) {
    for (const line of dependencies.formatDoctorIssueLogSummary(issueLogResult)) {
      dependencies.log(line);
    }
  }

  if (!params.wantsApply) {
    return;
  }

  const delegationPlan = await dependencies.runDelegationSetup({ repoRoot: params.repoRoot });
  const devtoolsPlan = await dependencies.runDevtoolsSetup();
  const needsDelegation = !delegationPlan.readiness.configured;
  const needsDevtoolsSkill = devtoolsPlan.readiness.skill.status !== 'ok';
  const devtoolsConfigStatus = devtoolsPlan.readiness.config.status;
  const needsDevtoolsConfig = devtoolsConfigStatus === 'missing';
  const hasInvalidDevtoolsConfig = devtoolsConfigStatus === 'invalid';

  if (!needsDelegation && !needsDevtoolsSkill && !needsDevtoolsConfig && !hasInvalidDevtoolsConfig) {
    dependencies.log('Doctor apply: nothing to do.');
    return;
  }

  dependencies.log('Doctor apply plan:');
  if (needsDevtoolsSkill) {
    dependencies.log('- Install skill: chrome-devtools (codex-orchestrator skills install --only chrome-devtools)');
  }
  if (hasInvalidDevtoolsConfig) {
    dependencies.log(
      `- DevTools MCP config is invalid: ${devtoolsPlan.readiness.config.path} (fix config.toml then rerun doctor --apply)`
    );
  }
  if (needsDevtoolsConfig) {
    dependencies.log('- Configure DevTools MCP: codex-orchestrator devtools setup --yes');
  }
  if (needsDelegation) {
    dependencies.log('- Configure delegation MCP: codex-orchestrator delegation setup --yes');
  }

  if (!params.apply) {
    dependencies.log('Run with --apply --yes to apply these fixes.');
    return;
  }

  if (needsDevtoolsSkill) {
    const skills = await dependencies.installSkills({ only: ['chrome-devtools'] });
    for (const line of dependencies.formatSkillsInstallSummary(skills)) {
      dependencies.log(line);
    }
  }
  if (needsDelegation) {
    const delegation = await dependencies.runDelegationSetup({ apply: true, repoRoot: params.repoRoot });
    for (const line of dependencies.formatDelegationSetupSummary(delegation)) {
      dependencies.log(line);
    }
  }
  if (hasInvalidDevtoolsConfig) {
    dependencies.log(
      `DevTools setup: skipped (config.toml is invalid: ${devtoolsPlan.readiness.config.path}). Fix it and rerun doctor --apply --yes.`
    );
  } else if (needsDevtoolsConfig) {
    const devtools = await dependencies.runDevtoolsSetup({ apply: true });
    for (const line of dependencies.formatDevtoolsSetupSummary(devtools)) {
      dependencies.log(line);
    }
  }

  const doctorAfter = dependencies.runDoctor(params.repoRoot);
  for (const line of dependencies.formatDoctorSummary(doctorAfter)) {
    dependencies.log(line);
  }
}
