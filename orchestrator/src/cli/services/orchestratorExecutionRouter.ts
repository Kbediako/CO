import process from 'node:process';

import type { TaskContext, ExecutionMode, PlanItem } from '../../types.js';
import { logger } from '../../logger.js';
import { CLI_EXECUTION_MODE_PARSER, resolveRequiresCloudPolicy } from '../../utils/executionMode.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { appendSummary, ensureGuardrailStatus, finalizeStatus } from '../run/manifest.js';
import type { ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import { resolveRuntimeSelection } from '../runtime/index.js';
import type { RuntimeMode, RuntimeModeSource, RuntimeSelection } from '../runtime/types.js';
import type {
  CliManifest,
  PipelineDefinition,
  PipelineExecutionResult,
  PipelineRunExecutionResult
} from '../types.js';
import { resolveCodexCliBin } from '../utils/codexCli.js';
import { runCloudPreflight } from '../utils/cloudPreflight.js';
import type { AdvancedAutopilotDecision } from '../utils/advancedAutopilot.js';
import { isoTimestamp } from '../utils/time.js';
import { resolveCloudEnvironmentId } from './orchestratorCloudTargetExecutor.js';
import { runOrchestratorExecutionLifecycle } from './orchestratorExecutionLifecycle.js';
import { executeOrchestratorLocalPipeline } from './orchestratorLocalPipelineExecutor.js';

function readCloudString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function allowCloudFallback(envOverrides?: NodeJS.ProcessEnv): boolean {
  const raw =
    readCloudString(envOverrides?.CODEX_ORCHESTRATOR_CLOUD_FALLBACK) ??
    readCloudString(process.env.CODEX_ORCHESTRATOR_CLOUD_FALLBACK);
  if (!raw) {
    return true;
  }
  const normalized = raw.toLowerCase();
  return !['0', 'false', 'off', 'deny', 'disabled', 'never', 'strict'].includes(normalized);
}

function normalizeCloudFallbackIssues(
  issues: { code: string; message: string }[]
): Array<{ code: string; message: string }> {
  return issues.map((issue) => ({ code: issue.code, message: issue.message }));
}

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

export async function routeOrchestratorExecution(
  options: OrchestratorExecutionRouteOptions
): Promise<PipelineRunExecutionResult> {
  const baseEnvOverrides: NodeJS.ProcessEnv = { ...(options.envOverrides ?? {}) };
  const mergedEnv = { ...process.env, ...baseEnvOverrides };
  let runtimeSelection: RuntimeSelection;
  try {
    runtimeSelection = await resolveRuntimeSelection({
      requestedMode: options.runtimeModeRequested,
      source: options.runtimeModeSource,
      executionMode: options.mode,
      repoRoot: options.env.repoRoot,
      env: mergedEnv,
      runId: options.manifest.run_id
    });
  } catch (error) {
    const detail = `Runtime selection failed: ${(error as Error)?.message ?? String(error)}`;
    finalizeStatus(options.manifest, 'failed', 'runtime-selection-failed');
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

  options.applyRuntimeSelection(options.manifest, runtimeSelection);
  const effectiveEnvOverrides: NodeJS.ProcessEnv = {
    ...baseEnvOverrides,
    ...runtimeSelection.env_overrides
  };
  const effectiveMergedEnv = { ...process.env, ...effectiveEnvOverrides };

  if (options.mode === 'cloud') {
    const environmentId = resolveCloudEnvironmentId(options.task, options.target, effectiveEnvOverrides);
    const branch =
      readCloudString(effectiveEnvOverrides.CODEX_CLOUD_BRANCH) ??
      readCloudString(process.env.CODEX_CLOUD_BRANCH);
    const codexBin = resolveCodexCliBin(effectiveMergedEnv);
    const preflight = await runCloudPreflight({
      repoRoot: options.env.repoRoot,
      codexBin,
      environmentId,
      branch,
      env: effectiveMergedEnv
    });
    if (!preflight.ok) {
      if (!allowCloudFallback(effectiveEnvOverrides)) {
        const detail =
          `Cloud preflight failed and cloud fallback is disabled. ` +
          preflight.issues.map((issue) => issue.message).join(' ');
        finalizeStatus(options.manifest, 'failed', 'cloud-preflight-failed');
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

      const detail =
        `Cloud preflight failed; falling back to mcp. ` +
        preflight.issues.map((issue) => issue.message).join(' ');
      options.manifest.cloud_fallback = {
        mode_requested: 'cloud',
        mode_used: 'mcp',
        reason: detail,
        issues: normalizeCloudFallbackIssues(preflight.issues),
        checked_at: isoTimestamp()
      };
      appendSummary(options.manifest, detail);
      logger.warn(detail);
      const fallback = await routeOrchestratorExecution({
        ...options,
        mode: 'mcp',
        executionModeOverride: 'mcp',
        runtimeModeRequested: runtimeSelection.selected_mode,
        runtimeModeSource: runtimeSelection.source,
        envOverrides: effectiveEnvOverrides
      });
      fallback.notes.unshift(detail);
      return fallback;
    }
    return await options.executeCloudPipeline({ ...options, envOverrides: effectiveEnvOverrides });
  }

  const { env, pipeline, manifest, paths, runEvents } = options;
  return runOrchestratorExecutionLifecycle({
    env,
    pipeline,
    manifest,
    paths,
    mode: options.mode,
    target: options.target,
    task: options.task,
    runEvents,
    eventStream: options.eventStream,
    onEventEntry: options.onEventEntry,
    persister: options.persister,
    envOverrides: effectiveEnvOverrides,
    advancedDecisionEnv: effectiveMergedEnv,
    defaultFailureStatusDetail: 'pipeline-failed',
    beforeStart: ({ notes }) => {
      if (runtimeSelection.fallback.occurred) {
        const fallbackCode = runtimeSelection.fallback.code ?? 'runtime-fallback';
        const fallbackReason = runtimeSelection.fallback.reason ?? 'runtime fallback occurred';
        const fallbackSummary = `Runtime fallback (${fallbackCode}): ${fallbackReason}`;
        appendSummary(manifest, fallbackSummary);
        notes.push(fallbackSummary);
      }
    },
    runAutoScout: (autoScoutOptions) =>
      options.runAutoScout({
        ...autoScoutOptions,
        envOverrides: effectiveEnvOverrides
      }),
    executeBody: async ({ notes, persister, controlWatcher, schedulePersist }) => {
      const localResult = await executeOrchestratorLocalPipeline({
        env,
        pipeline,
        manifest,
        paths,
        persister,
        envOverrides: effectiveEnvOverrides,
        runtimeMode: runtimeSelection.selected_mode,
        runtimeSessionId: runtimeSelection.runtime_session_id,
        runEvents,
        controlWatcher,
        schedulePersist,
        startSubpipeline: (pipelineId) =>
          options.startSubpipeline({
            pipelineId,
            executionModeOverride: options.executionModeOverride,
            runtimeModeRequested: runtimeSelection.selected_mode
          })
      });
      notes.push(...localResult.notes);
      return localResult.success;
    },
    afterFinalize: () => {
      const guardrailStatus = ensureGuardrailStatus(manifest);
      if (guardrailStatus.recommendation) {
        appendSummary(manifest, guardrailStatus.recommendation);
      }
    }
  });
}
