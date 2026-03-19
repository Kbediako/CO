import process from 'node:process';

import type { CodexOrchestrator } from './orchestrator.js';
import type { PlanPreviewResult } from './types.js';
import { formatPlanPreview } from './utils/planFormatter.js';

type OutputFormat = 'json' | 'text';

type OutputWriter = Pick<NodeJS.WriteStream, 'write'>;

export interface RunPlanCliShellParams {
  orchestrator: CodexOrchestrator;
  pipelineId?: string;
  taskId?: string;
  targetStageId?: string;
  format: OutputFormat;
}

interface PlanCliShellDependencies {
  formatPlanPreview: (result: PlanPreviewResult) => string;
  stdout: OutputWriter;
}

const DEFAULT_DEPENDENCIES: PlanCliShellDependencies = {
  formatPlanPreview,
  stdout: process.stdout
};

export async function runPlanCliShell(
  params: RunPlanCliShellParams,
  overrides: Partial<PlanCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const result = await params.orchestrator.plan({
    pipelineId: params.pipelineId,
    taskId: params.taskId,
    targetStageId: params.targetStageId
  });
  if (params.format === 'json') {
    dependencies.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  dependencies.stdout.write(`${dependencies.formatPlanPreview(result)}\n`);
}
