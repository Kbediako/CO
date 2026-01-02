import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  loadDesignConfig,
  designPipelineId,
  type DesignConfigLoadResult
} from '../../../packages/shared/config/index.js';
import { sanitizeTaskId } from '../../../orchestrator/src/persistence/sanitizeTaskId.js';
import { sanitizeRunId } from '../../../orchestrator/src/persistence/sanitizeRunId.js';
import { resolveEnvironmentPaths } from '../../lib/run-manifests.js';

export interface DesignContext {
  taskId: string;
  runId: string;
  repoRoot: string;
  runsRoot: string;
  outRoot: string;
  runDir: string;
  manifestPath: string;
  statePath: string;
  designConfigPath: string;
  config: DesignConfigLoadResult;
}

export async function loadDesignContext(): Promise<DesignContext> {
  const { repoRoot, runsRoot, outRoot } = resolveEnvironmentPaths();

  const taskId = sanitizeTaskId(
    process.env.CODEX_ORCHESTRATOR_TASK_ID ?? process.env.MCP_RUNNER_TASK_ID ?? 'unknown-task'
  );
  const rawRunId = process.env.CODEX_ORCHESTRATOR_RUN_ID ?? 'run-local';
  const runId = sanitizeRunId(rawRunId);
  const runDir = process.env.CODEX_ORCHESTRATOR_RUN_DIR ?? join(runsRoot, taskId, runId);
  const manifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH ?? join(runDir, 'manifest.json');
  const designConfigPath = process.env.DESIGN_CONFIG_PATH ?? join(repoRoot, 'design.config.yaml');

  const config = await loadDesignConfig({ rootDir: repoRoot, filePath: designConfigPath });

  const stateDir = join(runDir, 'design');
  await mkdir(stateDir, { recursive: true });
  const statePath = join(stateDir, 'state.json');

  return {
    taskId,
    runId,
    repoRoot,
    runsRoot,
    outRoot,
    runDir,
    manifestPath,
    statePath,
    designConfigPath,
    config
  };
}

export function resolveDesignPipelineId(result?: DesignConfigLoadResult): string {
  return designPipelineId(result);
}
