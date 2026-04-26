import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { RunEventEmitter } from './events/runEvents.js';
import type { RunStartCliShellParams } from './startCliShell.js';
import { runStartCliShell } from './startCliShell.js';
import { PROVIDER_INTAKE_STATE_FILE } from './control/controlPersistenceFiles.js';
import {
  buildProviderIssueKey,
  normalizeProviderIntakeState,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState
} from './control/providerIntakeState.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';
import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV
} from '../../../scripts/lib/provider-run-contract.js';

type OutputFormat = 'json' | 'text';
type ExecutionModeOption = 'mcp' | 'cloud';
type RuntimeModeOption = 'cli' | 'appserver';
type ArgMap = Record<string, string | boolean>;
const PROVIDER_LINEAR_WORKER_PIPELINE_ID = 'provider-linear-worker';

export interface RunStartCliRequestShellParams {
  orchestrator: RunStartCliShellParams['orchestrator'];
  positionals: string[];
  flags: ArgMap;
  runWithUi: (
    format: OutputFormat,
    action: (runEvents: RunEventEmitter) => Promise<void>
  ) => Promise<void>;
  emitRunOutput: RunStartCliShellParams['emitRunOutput'];
  maybeCaptureAutoIssueLog: RunStartCliShellParams['maybeCaptureAutoIssueLog'];
  resolveTaskFilter: RunStartCliShellParams['resolveTaskFilter'];
  withAutoIssueLogContext: RunStartCliShellParams['withAutoIssueLogContext'];
  maybeEmitRunAdoptionHint: RunStartCliShellParams['maybeEmitRunAdoptionHint'];
  resolveExecutionModeFlag: (flags: ArgMap) => ExecutionModeOption | undefined;
  resolveRuntimeModeFlag: (flags: ArgMap) => RuntimeModeOption | undefined;
  applyRepoConfigRequiredPolicy: (flags: ArgMap) => boolean;
  resolveAutoIssueLogEnabled: (flags: ArgMap) => boolean;
  resolveTargetStageId: (flags: ArgMap) => string | undefined;
  readStringFlag: (flags: ArgMap, key: string) => string | undefined;
  shouldWarnLegacyMultiAgentEnv: (flags: ArgMap) => boolean;
  applyRlmEnvOverrides: (flags: ArgMap, goal?: string) => void;
  resolveRlmTaskId: RunStartCliShellParams['resolveRlmTaskId'];
  setTaskEnvironment: RunStartCliShellParams['setTaskEnvironment'];
  log: RunStartCliShellParams['log'];
  warn: RunStartCliShellParams['warn'];
  setExitCode: RunStartCliShellParams['setExitCode'];
}

export interface ProviderLinearWorkerStartGuardInput {
  pipelineId: string | undefined;
  issueId?: string | null;
  issueIdentifier?: string | null;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

interface ProviderLinearWorkerStartGuardContext {
  issueId: string;
  issueIdentifier: string | null;
  launchSource: string | null;
  controlHostTaskId: string | null;
  controlHostRunId: string | null;
  launchToken: string | null;
  statePath: string | null;
}

interface StartCliRequestShellDependencies {
  runStartCliShell: typeof runStartCliShell;
}

const DEFAULT_DEPENDENCIES: StartCliRequestShellDependencies = {
  runStartCliShell
};

export async function runStartCliRequestShell(
  params: RunStartCliRequestShellParams,
  overrides: Partial<StartCliRequestShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const format = resolveOutputFormat(params.flags);
  const executionMode = params.resolveExecutionModeFlag(params.flags);
  const runtimeMode = params.resolveRuntimeModeFlag(params.flags);
  params.applyRepoConfigRequiredPolicy(params.flags);
  const autoIssueLogEnabled = params.resolveAutoIssueLogEnabled(params.flags);
  const taskIdOverride = readStringFlagValue(params.flags['task']);
  const goal = params.readStringFlag(params.flags, 'goal');
  const pipelineId = params.positionals[0];
  const issueId = readStringFlagValue(params.flags['issue-id']);
  const issueIdentifier = readStringFlagValue(params.flags['issue-identifier']);

  assertProviderLinearWorkerStartAllowed({
    pipelineId,
    issueId,
    issueIdentifier,
    env: process.env
  });

  await dependencies.runStartCliShell({
    orchestrator: params.orchestrator,
    pipelineId,
    format,
    executionMode,
    runtimeMode,
    autoIssueLogEnabled,
    taskIdOverride,
    parentRunId: readStringFlagValue(params.flags['parent-run']),
    approvalPolicy: readStringFlagValue(params.flags['approval-policy']),
    issueProvider: readStringFlagValue(params.flags['issue-provider']),
    issueId,
    issueIdentifier,
    issueUpdatedAt: readStringFlagValue(params.flags['issue-updated-at']),
    targetStageId: params.resolveTargetStageId(params.flags),
    runWithUi: async (action) => await params.runWithUi(format, action),
    emitRunOutput: params.emitRunOutput,
    maybeCaptureAutoIssueLog: params.maybeCaptureAutoIssueLog,
    resolveTaskFilter: params.resolveTaskFilter,
    withAutoIssueLogContext: params.withAutoIssueLogContext,
    maybeEmitRunAdoptionHint: params.maybeEmitRunAdoptionHint,
    isLegacyCollabEnvAliasEnabled: () => params.shouldWarnLegacyMultiAgentEnv(params.flags),
    applyRlmEnvOverrides: () => params.applyRlmEnvOverrides(params.flags, goal),
    resolveRlmTaskId: params.resolveRlmTaskId,
    setTaskEnvironment: params.setTaskEnvironment,
    log: params.log,
    warn: params.warn,
    setExitCode: params.setExitCode
  });
}

export function assertProviderLinearWorkerStartAllowed(
  input: ProviderLinearWorkerStartGuardInput
): void {
  if (input.pipelineId !== PROVIDER_LINEAR_WORKER_PIPELINE_ID) {
    return;
  }

  const env = input.env ?? process.env;
  const launchSource = normalizeEnvValue(env[PROVIDER_LAUNCH_SOURCE_ENV]);
  const controlHostTaskId = normalizeEnvValue(env[PROVIDER_CONTROL_HOST_TASK_ID_ENV]);
  const controlHostRunId = normalizeEnvValue(env[PROVIDER_CONTROL_HOST_RUN_ID_ENV]);
  const launchToken = normalizeEnvValue(env[PROVIDER_LAUNCH_TOKEN_ENV]);
  const issueId = normalizeOptionalString(input.issueId);
  const issueIdentifier = normalizeOptionalString(input.issueIdentifier);
  const statePath = resolveProviderIntakeStatePath(env, controlHostTaskId, controlHostRunId);
  const guardContext: ProviderLinearWorkerStartGuardContext = {
    issueId: issueId ?? '<linear-issue-id>',
    issueIdentifier,
    launchSource,
    controlHostTaskId,
    controlHostRunId,
    launchToken,
    statePath
  };

  if (
    launchSource !== PROVIDER_LAUNCH_SOURCE_CONTROL_HOST ||
    !controlHostTaskId ||
    !controlHostRunId ||
    !launchToken ||
    !issueId ||
    !statePath
  ) {
    throwProviderLinearWorkerStartGuardError(guardContext, buildMissingProviderWorkerStartGuardFields({
      launchSource,
      controlHostTaskId,
      controlHostRunId,
      launchToken,
      issueId,
      statePath
    }));
  }

  readMatchingControlHostProviderIntakeClaim(guardContext, {
    statePath,
    issueId,
    issueIdentifier,
    launchToken
  });
}

function throwProviderLinearWorkerStartGuardError(
  context: ProviderLinearWorkerStartGuardContext,
  reasons: string[]
): never {
  const issueHint = context.issueId !== '<linear-issue-id>'
    ? context.issueId
    : context.issueIdentifier ?? '<linear-issue-id>';
  const stateNote = context.statePath
    ? ` Checked control-host provider-intake state: ${context.statePath}.`
    : '';

  throw new Error(
    [
      'Direct `codex-orchestrator start provider-linear-worker` is unsupported without matching control-host launch provenance.',
      `Use \`codex-orchestrator control-host recover --issue-id ${issueHint} --format json\` from the shared repo root, or let the running control host launch the provider worker.`,
      `Guard reason: ${reasons.join(', ')}.${stateNote}`
    ].join(' ')
  );
}

function buildMissingProviderWorkerStartGuardFields(input: {
  launchSource: string | null; controlHostTaskId: string | null; controlHostRunId: string | null;
  launchToken: string | null; issueId: string | null; statePath: string | null;
}): string[] {
  return [
    input.launchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST
      ? null
      : `${PROVIDER_LAUNCH_SOURCE_ENV}=control-host`,
    input.controlHostTaskId ? null : PROVIDER_CONTROL_HOST_TASK_ID_ENV,
    input.controlHostRunId ? null : PROVIDER_CONTROL_HOST_RUN_ID_ENV,
    input.launchToken ? null : PROVIDER_LAUNCH_TOKEN_ENV,
    input.issueId ? null : '--issue-id',
    input.statePath ? null : 'control-host provider-intake state locator'
  ].filter((value): value is string => value !== null);
}

function resolveProviderIntakeStatePath(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  controlHostTaskId: string | null,
  controlHostRunId: string | null
): string | null {
  if (!controlHostTaskId || !controlHostRunId) {
    return null;
  }
  const runsRoot = normalizeEnvValue(env.CODEX_ORCHESTRATOR_RUNS_DIR);
  if (!runsRoot) {
    return null;
  }
  try {
    return join(resolve(runsRoot), sanitizeTaskId(controlHostTaskId), 'cli', sanitizeRunId(controlHostRunId), PROVIDER_INTAKE_STATE_FILE);
  } catch {
    return null;
  }
}

function readMatchingControlHostProviderIntakeClaim(
  context: ProviderLinearWorkerStartGuardContext,
  input: {
    statePath: string;
    issueId: string;
    issueIdentifier: string | null;
    launchToken: string;
  }
): ProviderIntakeClaimRecord {
  const raw = readProviderIntakeJson(context, input.statePath);
  if (!isRecord(raw)) {
    throwProviderLinearWorkerStartGuardError(context, [
      'control-host provider-intake state is malformed'
    ]);
  }
  const state = normalizeProviderIntakeState(raw as unknown as ProviderIntakeState);
  const claim = state.claims.find(
    (candidate) =>
      candidate.provider_key === buildProviderIssueKey('linear', input.issueId) &&
      candidate.issue_id === input.issueId
  );
  if (!claim) {
    throwProviderLinearWorkerStartGuardError(context, [
      'provider-intake reservation for requested issue is missing'
    ]);
  }
  if (input.issueIdentifier && claim.issue_identifier !== input.issueIdentifier) {
    throwProviderLinearWorkerStartGuardError(context, [
      'provider-intake reservation issue identifier mismatch'
    ]);
  }
  if (
    claim.launch_source !== PROVIDER_LAUNCH_SOURCE_CONTROL_HOST ||
    claim.launch_token !== input.launchToken
  ) {
    throwProviderLinearWorkerStartGuardError({
      ...context,
      launchSource: claim.launch_source
    }, ['provider-intake reservation launch provenance mismatch']);
  }
  return claim;
}

function readProviderIntakeJson(
  context: ProviderLinearWorkerStartGuardContext,
  statePath: string
): unknown {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8')) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throwProviderLinearWorkerStartGuardError(context, [
      `control-host provider-intake state could not be read: ${reason}`
    ]);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return flags['format'] === 'json' ? 'json' : 'text';
}

function readStringFlagValue(value: string | boolean | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEnvValue(value: string | undefined): string | null {
  return normalizeOptionalString(value);
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
