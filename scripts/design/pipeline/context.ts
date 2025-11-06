import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  loadDesignConfig,
  designPipelineId,
  type DesignConfigLoadResult
} from '../../../packages/shared/config/index.js';
import { sanitizeTaskId } from '../../../orchestrator/src/persistence/sanitizeTaskId.js';

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
  const repoRoot = process.env.CODEX_ORCHESTRATOR_REPO_ROOT ?? process.cwd();
  const runsRoot = process.env.CODEX_ORCHESTRATOR_RUNS_DIR ?? join(repoRoot, '.runs');
  const outRoot = process.env.CODEX_ORCHESTRATOR_OUT_DIR ?? join(repoRoot, 'out');

  const taskId = sanitizeTaskId(
    process.env.CODEX_ORCHESTRATOR_TASK_ID ?? process.env.MCP_RUNNER_TASK_ID ?? 'unknown-task'
  );
  const runId = process.env.CODEX_ORCHESTRATOR_RUN_ID ?? 'run-local';
  const runDir = process.env.CODEX_ORCHESTRATOR_RUN_DIR ?? join(runsRoot, taskId, sanitizeRunId(runId));
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

export function resolveDesignPipelineId(): string {
  return designPipelineId();
}

function sanitizeRunId(value: string): string {
  return value.replace(/[:]/g, '-');
}
