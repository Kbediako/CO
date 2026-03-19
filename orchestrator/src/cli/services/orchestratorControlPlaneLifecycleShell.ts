import { RunEventEmitter, RunEventPublisher } from '../events/runEvents.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest, PipelineDefinition } from '../types.js';
import {
  startOrchestratorControlPlaneLifecycle,
  type OrchestratorControlPlaneLifecycle,
  type StartOrchestratorControlPlaneLifecycleOptions
} from './orchestratorControlPlaneLifecycle.js';

export interface OrchestratorControlPlaneLifecycleShellContext {
  runEvents?: RunEventPublisher;
  eventStream: OrchestratorControlPlaneLifecycle['eventStream'];
  onEventEntry: OrchestratorControlPlaneLifecycle['onEventEntry'];
}

interface CreateOrchestratorRunEventPublisherParams {
  pipeline: Pick<PipelineDefinition, 'id' | 'title'>;
  manifest: Pick<CliManifest, 'task_id' | 'run_id'>;
  paths: Pick<RunPaths, 'manifestPath' | 'logPath'>;
  emitter?: RunEventEmitter;
}

export interface RunOrchestratorControlPlaneLifecycleShellParams<T>
  extends Omit<CreateOrchestratorRunEventPublisherParams, 'paths'> {
  repoRoot: string;
  paths: RunPaths;
  onStartFailure?: () => Promise<void>;
  runWithLifecycle: (context: OrchestratorControlPlaneLifecycleShellContext) => Promise<T>;
  startLifecycle?: (
    options: StartOrchestratorControlPlaneLifecycleOptions
  ) => Promise<OrchestratorControlPlaneLifecycle>;
}

function createOrchestratorRunEventPublisher(
  params: CreateOrchestratorRunEventPublisherParams
): RunEventPublisher | undefined {
  if (!params.emitter) {
    return undefined;
  }
  return new RunEventPublisher(params.emitter, {
    taskId: params.manifest.task_id,
    runId: params.manifest.run_id,
    pipelineId: params.pipeline.id,
    pipelineTitle: params.pipeline.title,
    manifestPath: params.paths.manifestPath,
    logPath: params.paths.logPath
  });
}

export async function runOrchestratorControlPlaneLifecycleShell<T>(
  params: RunOrchestratorControlPlaneLifecycleShellParams<T>
): Promise<T> {
  const emitter = params.emitter ?? new RunEventEmitter();
  const startLifecycle = params.startLifecycle ?? startOrchestratorControlPlaneLifecycle;
  let controlPlaneLifecycle: OrchestratorControlPlaneLifecycle | null = null;

  try {
    try {
      controlPlaneLifecycle = await startLifecycle({
        repoRoot: params.repoRoot,
        paths: params.paths,
        taskId: params.manifest.task_id,
        runId: params.manifest.run_id,
        pipeline: params.pipeline,
        emitter
      });
    } catch (error) {
      if (params.onStartFailure) {
        await params.onStartFailure();
      }
      throw error;
    }

    const runEvents = createOrchestratorRunEventPublisher({
      pipeline: params.pipeline,
      manifest: params.manifest,
      paths: params.paths,
      emitter
    });

    return await params.runWithLifecycle({
      runEvents,
      eventStream: controlPlaneLifecycle.eventStream,
      onEventEntry: controlPlaneLifecycle.onEventEntry
    });
  } finally {
    if (controlPlaneLifecycle) {
      await controlPlaneLifecycle.close();
    }
  }
}
