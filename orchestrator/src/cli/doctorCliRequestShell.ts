/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { runDoctorCliShell } from './doctorCliShell.js';

type OutputFormat = 'json' | 'text';
type ArgMap = Record<string, string | boolean>;

export interface RunDoctorCliRequestShellParams {
  flags: ArgMap;
}

interface DoctorCliRequestShellDependencies {
  runDoctorCliShell: typeof runDoctorCliShell;
  getCwd: () => string;
}

const DEFAULT_DEPENDENCIES: DoctorCliRequestShellDependencies = {
  runDoctorCliShell,
  getCwd: () => process.cwd()
};

export async function runDoctorCliRequestShell(
  params: RunDoctorCliRequestShellParams,
  overrides: Partial<DoctorCliRequestShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const format = resolveOutputFormat(params.flags);
  const includeUsage = Boolean(params.flags['usage']);
  const includeCloudPreflight = Boolean(params.flags['cloud-preflight']);
  const includeIssueLog = Boolean(params.flags['issue-log']);
  const cloudEnvIdOverride = readStringFlag(params.flags, 'cloud-env-id');
  const cloudBranchOverride = readStringFlag(params.flags, 'cloud-branch');
  const issueTitle = readStringFlag(params.flags, 'issue-title');
  const issueNotes = readStringFlag(params.flags, 'issue-notes');
  const issueLogPath = readStringFlag(params.flags, 'issue-log-path');

  if (!includeCloudPreflight && (cloudEnvIdOverride || cloudBranchOverride)) {
    throw new Error('--cloud-env-id/--cloud-branch require --cloud-preflight.');
  }
  if (!includeIssueLog && (issueTitle || issueNotes || issueLogPath)) {
    throw new Error('--issue-title/--issue-notes/--issue-log-path require --issue-log.');
  }

  const wantsApply = Boolean(params.flags['apply']);
  const apply = Boolean(params.flags['yes']);
  if (wantsApply && format === 'json') {
    throw new Error('doctor --apply does not support --format json.');
  }

  const windowDays = parseWindowDays(readStringFlag(params.flags, 'window-days'));
  const taskFilter = readStringFlag(params.flags, 'task') ?? null;

  await dependencies.runDoctorCliShell({
    format,
    includeUsage,
    includeCloudPreflight,
    includeIssueLog,
    cloudEnvIdOverride: cloudEnvIdOverride ?? undefined,
    cloudBranchOverride: cloudBranchOverride ?? undefined,
    issueTitle: issueTitle ?? undefined,
    issueNotes: issueNotes ?? undefined,
    issueLogPath: issueLogPath ?? undefined,
    wantsApply,
    apply,
    windowDays,
    taskFilter,
    repoRoot: dependencies.getCwd()
  });
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseWindowDays(windowDaysRaw: string | undefined): number | undefined {
  if (!windowDaysRaw) {
    return undefined;
  }
  if (!/^\d+$/u.test(windowDaysRaw)) {
    throw new Error(`Invalid --window-days value '${windowDaysRaw}'. Expected a positive integer.`);
  }
  const parsed = Number(windowDaysRaw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --window-days value '${windowDaysRaw}'. Expected a positive integer.`);
  }
  return parsed;
}
