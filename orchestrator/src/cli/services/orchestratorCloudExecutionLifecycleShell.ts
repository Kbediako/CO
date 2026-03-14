import process from 'node:process';

import type { PipelineRunExecutionResult } from '../types.js';
import type { ExecutePipelineOptions } from './orchestratorExecutionRouteAdapterShell.js';
import type { OrchestratorExecutionRouteOptions } from './orchestratorExecutionRouter.js';
import { executeOrchestratorCloudTarget } from './orchestratorCloudTargetExecutor.js';
import { runOrchestratorExecutionLifecycle } from './orchestratorExecutionLifecycle.js';

export interface RunOrchestratorCloudExecutionLifecycleShellOptions extends ExecutePipelineOptions {
  runAutoScout: OrchestratorExecutionRouteOptions['runAutoScout'];
}

export async function runOrchestratorCloudExecutionLifecycleShell(
  options: RunOrchestratorCloudExecutionLifecycleShellOptions
): Promise<PipelineRunExecutionResult> {
  const { env, pipeline, manifest, paths, runEvents, target, task, envOverrides } = options;

  return runOrchestratorExecutionLifecycle({
    env,
    pipeline,
    manifest,
    paths,
    mode: options.mode,
    target,
    task,
    runEvents,
    eventStream: options.eventStream,
    onEventEntry: options.onEventEntry,
    persister: options.persister,
    envOverrides,
    advancedDecisionEnv: { ...process.env, ...(envOverrides ?? {}) },
    defaultFailureStatusDetail: 'cloud-execution-failed',
    runAutoScout: options.runAutoScout,
    executeBody: async ({ notes, controlWatcher, schedulePersist }) => {
      const cloudResult = await executeOrchestratorCloudTarget({
        env,
        pipeline,
        manifest,
        paths,
        target,
        task,
        envOverrides,
        runEvents,
        controlWatcher,
        schedulePersist
      });
      notes.push(...cloudResult.notes);
      return cloudResult.success;
    }
  });
}
