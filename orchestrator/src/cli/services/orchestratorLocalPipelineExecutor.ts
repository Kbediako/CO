import type { PipelineExecutionResult, PipelineDefinition, CliManifest } from '../types.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import type { ManifestPersister } from '../run/manifestPersister.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import type { RuntimeMode } from '../runtime/types.js';
import { runCommandStage } from './commandRunner.js';
import { appendSummary } from '../run/manifest.js';
import { relativeToRepo, resolveRunPaths } from '../run/runPaths.js';
import { isoTimestamp } from '../utils/time.js';

type PersistOptions = { manifest?: boolean; heartbeat?: boolean; force?: boolean };

interface LocalPipelineExecutorOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
  persister: ManifestPersister;
  envOverrides?: NodeJS.ProcessEnv;
  runtimeMode: RuntimeMode;
  runtimeSessionId: string | null;
  runEvents?: RunEventPublisher;
  controlWatcher: {
    sync(): Promise<void>;
    waitForResume(): Promise<void>;
    isCanceled(): boolean;
  };
  schedulePersist(options?: PersistOptions): Promise<void>;
  startSubpipeline(pipelineId: string): Promise<PipelineExecutionResult>;
}

export async function executeOrchestratorLocalPipeline(
  options: LocalPipelineExecutorOptions
): Promise<{ success: boolean; notes: string[] }> {
  const notes: string[] = [];
  const {
    env,
    pipeline,
    manifest,
    paths,
    persister,
    envOverrides,
    runtimeMode,
    runtimeSessionId,
    runEvents,
    controlWatcher,
    schedulePersist,
    startSubpipeline
  } = options;

  let success = true;

  for (let i = 0; i < pipeline.stages.length; i += 1) {
    await controlWatcher.sync();
    await controlWatcher.waitForResume();
    if (controlWatcher.isCanceled()) {
      manifest.status_detail = 'run-canceled';
      success = false;
      break;
    }
    const stage = pipeline.stages[i];
    const entry = manifest.commands[i];
    if (!entry) {
      continue;
    }
    if (entry.status === 'succeeded' || entry.status === 'skipped') {
      notes.push(`${stage.title}: ${entry.status}`);
      continue;
    }

    entry.status = 'pending';
    entry.started_at = isoTimestamp();
    void schedulePersist({ manifest: true });

    if (stage.kind === 'command') {
      try {
        const result = await runCommandStage({
          env,
          paths,
          manifest,
          stage,
          index: entry.index,
          events: runEvents,
          persister,
          envOverrides,
          runtimeMode,
          runtimeSessionId
        });
        notes.push(`${stage.title}: ${result.summary}`);
        const updatedEntry = manifest.commands[i];
        if (updatedEntry?.status === 'failed') {
          manifest.status_detail = `stage:${stage.id}:failed`;
          appendSummary(manifest, `Stage '${stage.title}' failed with exit code ${result.exitCode}.`);
          success = false;
          await schedulePersist({ manifest: true, force: true });
          break;
        }
      } catch (error) {
        entry.status = 'failed';
        entry.completed_at = isoTimestamp();
        entry.summary = `Execution error: ${(error as Error)?.message ?? String(error)}`;
        manifest.status_detail = `stage:${stage.id}:error`;
        appendSummary(manifest, entry.summary);
        await schedulePersist({ manifest: true, force: true });
        runEvents?.stageCompleted({
          stageId: stage.id,
          stageIndex: entry.index,
          title: stage.title,
          kind: 'command',
          status: entry.status,
          exitCode: entry.exit_code,
          summary: entry.summary,
          logPath: entry.log_path
        });
        success = false;
        break;
      }
      continue;
    }

    entry.status = 'running';
    await schedulePersist({ manifest: true, force: true });
    runEvents?.stageStarted({
      stageId: stage.id,
      stageIndex: entry.index,
      title: stage.title,
      kind: 'subpipeline',
      logPath: entry.log_path,
      status: entry.status
    });
    try {
      const child = await startSubpipeline(stage.pipeline);
      entry.completed_at = isoTimestamp();
      entry.sub_run_id = child.manifest.run_id;
      entry.summary = child.runSummary.review.summary ?? null;
      entry.status =
        child.manifest.status === 'succeeded' ? 'succeeded' : stage.optional ? 'skipped' : 'failed';
      entry.command = null;
      manifest.child_runs.push({
        run_id: child.manifest.run_id,
        pipeline_id: stage.pipeline,
        status: child.manifest.status,
        manifest: relativeToRepo(env, resolveRunPaths(env, child.manifest.run_id).manifestPath)
      });
      notes.push(`${stage.title}: ${entry.status}`);
      await schedulePersist({ manifest: true, force: true });
      runEvents?.stageCompleted({
        stageId: stage.id,
        stageIndex: entry.index,
        title: stage.title,
        kind: 'subpipeline',
        status: entry.status,
        exitCode: entry.exit_code,
        summary: entry.summary,
        logPath: entry.log_path,
        subRunId: entry.sub_run_id
      });
      if (!stage.optional && entry.status === 'failed') {
        manifest.status_detail = `subpipeline:${stage.pipeline}:failed`;
        appendSummary(manifest, `Sub-pipeline '${stage.pipeline}' failed.`);
        await schedulePersist({ manifest: true, force: true });
        success = false;
        break;
      }
    } catch (error) {
      entry.completed_at = isoTimestamp();
      entry.summary = `Sub-pipeline error: ${(error as Error)?.message ?? String(error)}`;
      entry.status = stage.optional ? 'skipped' : 'failed';
      entry.command = null;
      manifest.status_detail = `subpipeline:${stage.pipeline}:error`;
      appendSummary(manifest, entry.summary);
      notes.push(`${stage.title}: ${entry.status}`);
      await schedulePersist({ manifest: true, force: true });
      runEvents?.stageCompleted({
        stageId: stage.id,
        stageIndex: entry.index,
        title: stage.title,
        kind: 'subpipeline',
        status: entry.status,
        exitCode: entry.exit_code,
        summary: entry.summary,
        logPath: entry.log_path,
        subRunId: entry.sub_run_id
      });
      if (!stage.optional) {
        success = false;
        break;
      }
    }
  }

  return { success, notes };
}
