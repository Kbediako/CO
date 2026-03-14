import type { RuntimeSelection } from '../runtime/types.js';
import type { CliManifest, PipelineRunExecutionResult } from '../types.js';
import type { OrchestratorExecutionRouteOptions } from './orchestratorExecutionRouter.js';
import {
  executeOrchestratorPipelineWithRouteAdapter,
  type ExecutePipelineOptions
} from './orchestratorExecutionRouteAdapterShell.js';
import { runOrchestratorCloudExecutionLifecycleShell } from './orchestratorCloudExecutionLifecycleShell.js';

export interface RunOrchestratorPipelineRouteEntryShellOptions {
  options: ExecutePipelineOptions;
  applyRuntimeSelection: (manifest: CliManifest, selection: RuntimeSelection) => void;
  runAutoScout: OrchestratorExecutionRouteOptions['runAutoScout'];
  startSubpipeline: OrchestratorExecutionRouteOptions['startSubpipeline'];
  executePipelineWithRouteAdapter?: typeof executeOrchestratorPipelineWithRouteAdapter;
  runCloudExecutionLifecycleShell?: typeof runOrchestratorCloudExecutionLifecycleShell;
}

export async function runOrchestratorPipelineRouteEntryShell(
  options: RunOrchestratorPipelineRouteEntryShellOptions
): Promise<PipelineRunExecutionResult> {
  const executePipelineWithRouteAdapter =
    options.executePipelineWithRouteAdapter ?? executeOrchestratorPipelineWithRouteAdapter;
  const runCloudExecutionLifecycle =
    options.runCloudExecutionLifecycleShell ?? runOrchestratorCloudExecutionLifecycleShell;

  return executePipelineWithRouteAdapter({
    options: options.options,
    applyRuntimeSelection: options.applyRuntimeSelection,
    executeCloudPipeline: (cloudOptions) =>
      runCloudExecutionLifecycle({
        ...cloudOptions,
        runAutoScout: options.runAutoScout
      }),
    runAutoScout: options.runAutoScout,
    startSubpipeline: options.startSubpipeline
  });
}
