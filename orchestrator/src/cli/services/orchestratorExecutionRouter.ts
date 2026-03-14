import type { TaskContext, ExecutionMode, PlanItem } from '../../types.js';
import { logger } from '../../logger.js';
import { CLI_EXECUTION_MODE_PARSER, resolveRequiresCloudPolicy } from '../../utils/executionMode.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { appendSummary, finalizeStatus } from '../run/manifest.js';
import { executeOrchestratorLocalRouteShell } from './orchestratorLocalRouteShell.js';
import type { ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import type { RuntimeMode, RuntimeModeSource, RuntimeSelection } from '../runtime/types.js';
import type {
  CliManifest,
  PipelineDefinition,
  PipelineExecutionResult,
  PipelineRunExecutionResult
} from '../types.js';
import type { AdvancedAutopilotDecision } from '../utils/advancedAutopilot.js';
import { executeOrchestratorCloudRouteShell } from './orchestratorCloudRouteShell.js';
import {
  resolveOrchestratorExecutionRouteState,
  type OrchestratorExecutionRouteState
} from './orchestratorExecutionRouteState.js';

export type OrchestratorAutoScoutOutcome =
  | { status: 'recorded'; path: string }
  | { status: 'timeout' | 'error'; message: string };

export interface OrchestratorAutoScoutParams {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  mode: ExecutionMode;
  pipeline: PipelineDefinition;
  target: PlanItem;
  task: TaskContext;
  envOverrides?: NodeJS.ProcessEnv;
  advancedDecision: AdvancedAutopilotDecision;
}

export interface OrchestratorExecutionRouteOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  mode: ExecutionMode;
  runtimeModeRequested: RuntimeMode;
  runtimeModeSource: RuntimeModeSource;
  executionModeOverride?: ExecutionMode;
  target: PlanItem;
  task: TaskContext;
  runEvents?: RunEventPublisher;
  eventStream?: RunEventStream;
  onEventEntry?: (entry: RunEventStreamEntry) => void;
  persister?: ManifestPersister;
  envOverrides?: NodeJS.ProcessEnv;
  applyRuntimeSelection(manifest: CliManifest, selection: RuntimeSelection): void;
  executeCloudPipeline(
    options: OrchestratorExecutionRouteOptions
  ): Promise<PipelineRunExecutionResult>;
  runAutoScout(params: OrchestratorAutoScoutParams): Promise<OrchestratorAutoScoutOutcome>;
  startSubpipeline(options: {
    pipelineId: string;
    executionModeOverride?: ExecutionMode;
    runtimeModeRequested: RuntimeMode;
  }): Promise<PipelineExecutionResult>;
}

export function requiresCloudOrchestratorExecution(task: TaskContext, subtask: PlanItem): boolean {
  const requiresCloudFlag = resolveRequiresCloudPolicy({
    boolFlags: [subtask.requires_cloud, subtask.requiresCloud],
    metadata: {
      executionMode:
        typeof subtask.metadata?.executionMode === 'string'
          ? (subtask.metadata.executionMode as string)
          : null,
      mode: typeof subtask.metadata?.mode === 'string' ? (subtask.metadata.mode as string) : null
    },
    metadataOrder: ['executionMode', 'mode'],
    parseMode: CLI_EXECUTION_MODE_PARSER
  });
  if (requiresCloudFlag !== null) {
    return requiresCloudFlag;
  }
  return Boolean(task.metadata?.execution?.parallel);
}

export function determineOrchestratorExecutionMode(
  task: TaskContext,
  subtask: PlanItem,
  overrideMode?: ExecutionMode
): ExecutionMode {
  if (overrideMode) {
    return overrideMode;
  }
  if (requiresCloudOrchestratorExecution(task, subtask)) {
    return 'cloud';
  }
  return 'mcp';
}

function failExecutionRoute(
  options: OrchestratorExecutionRouteOptions,
  statusDetail: string,
  detail: string
): PipelineRunExecutionResult {
  finalizeStatus(options.manifest, 'failed', statusDetail);
  appendSummary(options.manifest, detail);
  logger.error(detail);
  return {
    success: false,
    notes: [detail],
    manifest: options.manifest,
    manifestPath: options.paths.manifestPath,
    logPath: options.paths.logPath
  };
}

async function executeCloudRoute(
  options: OrchestratorExecutionRouteOptions,
  state: OrchestratorExecutionRouteState
): Promise<PipelineRunExecutionResult> {
  return await executeOrchestratorCloudRouteShell({
    repoRoot: options.env.repoRoot,
    task: options.task,
    target: options.target,
    manifest: options.manifest,
    state,
    executeCloudPipeline: (envOverrides) =>
      options.executeCloudPipeline({ ...options, envOverrides }),
    reroute: (reroute) =>
      routeOrchestratorExecution({
        ...options,
        ...reroute
      }),
    failExecutionRoute: (statusDetail, detail) => failExecutionRoute(options, statusDetail, detail)
  });
}

async function executeLocalRoute(
  options: OrchestratorExecutionRouteOptions,
  state: OrchestratorExecutionRouteState
): Promise<PipelineRunExecutionResult> {
  return executeOrchestratorLocalRouteShell({ ...options, state });
}

export async function routeOrchestratorExecution(
  options: OrchestratorExecutionRouteOptions
): Promise<PipelineRunExecutionResult> {
  let state: OrchestratorExecutionRouteState;
  try {
    state = await resolveOrchestratorExecutionRouteState({
      repoRoot: options.env.repoRoot,
      manifest: options.manifest,
      mode: options.mode,
      runtimeModeRequested: options.runtimeModeRequested,
      runtimeModeSource: options.runtimeModeSource,
      envOverrides: options.envOverrides,
      applyRuntimeSelection: options.applyRuntimeSelection
    });
  } catch (error) {
    const detail = `Runtime selection failed: ${(error as Error)?.message ?? String(error)}`;
    return failExecutionRoute(options, 'runtime-selection-failed', detail);
  }

  if (options.mode === 'cloud') {
    return await executeCloudRoute(options, state);
  }
  return await executeLocalRoute(options, state);
}
