import { logger } from '../../logger.js';
import type { ExecutionMode, PlanItem, TaskContext } from '../../types.js';
import { ControlWatcher } from '../control/controlWatcher.js';
import { type RunEventPublisher, snapshotStages } from '../events/runEvents.js';
import { type RunEventStream, type RunEventStreamEntry } from '../events/runEventStream.js';
import { appendMetricsEntry } from '../metrics/metricsRecorder.js';
import { appendSummary, finalizeStatus, updateHeartbeat } from '../run/manifest.js';
import { ManifestPersister } from '../run/manifestPersister.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import { relativeToRepo } from '../run/runPaths.js';
import { persistPipelineExperience } from './pipelineExperience.js';
import type { CliManifest, PipelineDefinition, PipelineRunExecutionResult } from '../types.js';
import {
  resolveAdvancedAutopilotDecision,
  type AdvancedAutopilotDecision
} from '../utils/advancedAutopilot.js';

type AutoScoutOutcome =
  | { status: 'recorded'; path: string }
  | { status: 'timeout' | 'error'; message: string };

type PersistOptions = { manifest?: boolean; heartbeat?: boolean; force?: boolean };

type OrchestratorExecutionLifecycleContext = {
  notes: string[];
  persister: ManifestPersister;
  controlWatcher: ControlWatcher;
  schedulePersist(options?: PersistOptions): Promise<void>;
};

type RunOrchestratorExecutionLifecycleOptions = {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  mode: ExecutionMode;
  target: PlanItem;
  task: TaskContext;
  runEvents?: RunEventPublisher;
  eventStream?: RunEventStream;
  onEventEntry?: (entry: RunEventStreamEntry) => void;
  persister?: ManifestPersister;
  envOverrides?: NodeJS.ProcessEnv;
  advancedDecisionEnv: NodeJS.ProcessEnv;
  defaultFailureStatusDetail: string;
  beforeStart?(context: OrchestratorExecutionLifecycleContext): Promise<void> | void;
  executeBody(context: OrchestratorExecutionLifecycleContext): Promise<boolean>;
  afterFinalize?(context: OrchestratorExecutionLifecycleContext): Promise<void> | void;
  runAutoScout(params: {
    env: EnvironmentPaths;
    paths: RunPaths;
    manifest: CliManifest;
    mode: ExecutionMode;
    pipeline: PipelineDefinition;
    target: PlanItem;
    task: TaskContext;
    envOverrides?: NodeJS.ProcessEnv;
    advancedDecision: AdvancedAutopilotDecision;
  }): Promise<AutoScoutOutcome>;
};

export async function runOrchestratorExecutionLifecycle(
  options: RunOrchestratorExecutionLifecycleOptions
): Promise<PipelineRunExecutionResult> {
  const { env, pipeline, manifest, paths, runEvents } = options;
  const notes: string[] = [];
  manifest.guardrail_status = undefined;

  const persister =
    options.persister ??
    new ManifestPersister({
      manifest,
      paths,
      persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
    });
  const schedulePersist = (persistOptions: PersistOptions = {}): Promise<void> =>
    persister.schedule(persistOptions);

  const pushHeartbeat = (forceManifest = false): Promise<void> => {
    updateHeartbeat(manifest);
    return schedulePersist({ manifest: forceManifest, heartbeat: true, force: forceManifest });
  };

  const controlWatcher = new ControlWatcher({
    paths,
    manifest,
    eventStream: options.eventStream,
    onEntry: options.onEventEntry,
    persist: () => schedulePersist({ manifest: true, force: true })
  });
  const context: OrchestratorExecutionLifecycleContext = { notes, persister, controlWatcher, schedulePersist };

  await options.beforeStart?.(context);

  manifest.status = 'in_progress';
  updateHeartbeat(manifest);

  const advancedDecision = resolveAdvancedAutopilotDecision({
    pipelineId: pipeline.id,
    targetMetadata: (options.target.metadata ?? null) as Record<string, unknown> | null,
    taskMetadata: (options.task.metadata ?? null) as Record<string, unknown> | null,
    env: options.advancedDecisionEnv
  });
  if (advancedDecision.enabled || advancedDecision.source !== 'default') {
    const advancedSummary =
      `Advanced mode (${advancedDecision.mode}) ${advancedDecision.enabled ? 'enabled' : 'disabled'}: ${advancedDecision.reason}.`;
    appendSummary(manifest, advancedSummary);
    notes.push(advancedSummary);
    if (options.mode === 'cloud') {
      await schedulePersist({ manifest: true, force: true });
    }
  }

  await schedulePersist({ manifest: true, heartbeat: true, force: true });
  runEvents?.runStarted(snapshotStages(manifest, pipeline), manifest.status);

  if (advancedDecision.autoScout) {
    const scoutOutcome = await options.runAutoScout({
      env,
      paths,
      manifest,
      mode: options.mode,
      pipeline,
      target: options.target,
      task: options.task,
      envOverrides: options.envOverrides,
      advancedDecision
    });
    const scoutMessage =
      scoutOutcome.status === 'recorded'
        ? `Auto scout: evidence recorded at ${scoutOutcome.path}.`
        : `Auto scout: ${scoutOutcome.message} (non-blocking).`;
    appendSummary(manifest, scoutMessage);
    notes.push(scoutMessage);
    await schedulePersist({ manifest: true, force: true });
  }

  const heartbeatInterval = setInterval(() => {
    void pushHeartbeat(false).catch((error) => {
      logger.warn(
        `Heartbeat update failed for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
      );
    });
  }, manifest.heartbeat_interval_seconds * 1000);

  let success = true;
  try {
    success = await options.executeBody(context);
  } finally {
    clearInterval(heartbeatInterval);
    await schedulePersist({ force: true });
  }

  await controlWatcher.sync();

  if (controlWatcher.isCanceled()) {
    finalizeStatus(manifest, 'cancelled', manifest.status_detail ?? 'run-canceled');
  } else if (success) {
    finalizeStatus(manifest, 'succeeded');
  } else {
    finalizeStatus(manifest, 'failed', manifest.status_detail ?? options.defaultFailureStatusDetail);
  }

  await options.afterFinalize?.(context);

  updateHeartbeat(manifest);
  await schedulePersist({ manifest: true, heartbeat: true, force: true }).catch((error) => {
    logger.warn(
      `Heartbeat update failed for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
    );
  });
  await persistPipelineExperience({ env, pipeline, manifest, paths });
  await schedulePersist({ force: true });
  await appendMetricsEntry(env, paths, manifest, persister);

  return {
    success,
    notes,
    manifest,
    manifestPath: relativeToRepo(env, paths.manifestPath),
    logPath: relativeToRepo(env, paths.logPath)
  };
}
