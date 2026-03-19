import { appendSummary, ensureGuardrailStatus } from '../run/manifest.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import type { PipelineExecutionResult, PipelineRunExecutionResult, CliManifest, PipelineDefinition } from '../types.js';
import type { TaskContext, ExecutionMode, PlanItem } from '../../types.js';
import { runOrchestratorExecutionLifecycle } from './orchestratorExecutionLifecycle.js';
import { executeOrchestratorLocalPipeline } from './orchestratorLocalPipelineExecutor.js';
import type {
  OrchestratorAutoScoutOutcome,
  OrchestratorAutoScoutParams
} from './orchestratorExecutionRouter.js';
import type { OrchestratorExecutionRouteState } from './orchestratorExecutionRouteState.js';
import type { RuntimeMode } from '../runtime/types.js';

export interface OrchestratorLocalRouteShellOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  mode: ExecutionMode;
  executionModeOverride?: ExecutionMode;
  target: PlanItem;
  task: TaskContext;
  runEvents?: RunEventPublisher;
  eventStream?: RunEventStream;
  onEventEntry?: (entry: RunEventStreamEntry) => void;
  persister?: ManifestPersister;
  state: OrchestratorExecutionRouteState;
  runAutoScout(params: OrchestratorAutoScoutParams): Promise<OrchestratorAutoScoutOutcome>;
  startSubpipeline(options: {
    pipelineId: string;
    executionModeOverride?: ExecutionMode;
    runtimeModeRequested: RuntimeMode;
  }): Promise<PipelineExecutionResult>;
}

export async function executeOrchestratorLocalRouteShell(
  options: OrchestratorLocalRouteShellOptions
): Promise<PipelineRunExecutionResult> {
  const { env, pipeline, manifest, paths, runEvents, state } = options;

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
    envOverrides: state.effectiveEnvOverrides,
    advancedDecisionEnv: state.effectiveMergedEnv,
    defaultFailureStatusDetail: 'pipeline-failed',
    beforeStart: ({ notes }) => {
      if (state.runtimeSelection.fallback.occurred) {
        const fallbackCode = state.runtimeSelection.fallback.code ?? 'runtime-fallback';
        const fallbackReason = state.runtimeSelection.fallback.reason ?? 'runtime fallback occurred';
        const fallbackSummary = `Runtime fallback (${fallbackCode}): ${fallbackReason}`;
        appendSummary(manifest, fallbackSummary);
        notes.push(fallbackSummary);
      }
    },
    runAutoScout: (autoScoutOptions) =>
      options.runAutoScout({
        ...autoScoutOptions,
        envOverrides: state.effectiveEnvOverrides
      }),
    executeBody: async ({ notes, persister, controlWatcher, schedulePersist }) => {
      const localResult = await executeOrchestratorLocalPipeline({
        env,
        pipeline,
        manifest,
        paths,
        persister,
        envOverrides: state.effectiveEnvOverrides,
        runtimeMode: state.runtimeSelection.selected_mode,
        runtimeSessionId: state.runtimeSelection.runtime_session_id,
        runEvents,
        controlWatcher,
        schedulePersist,
        startSubpipeline: (pipelineId) =>
          options.startSubpipeline({
            pipelineId,
            executionModeOverride: options.executionModeOverride,
            runtimeModeRequested: state.runtimeSelection.selected_mode
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
