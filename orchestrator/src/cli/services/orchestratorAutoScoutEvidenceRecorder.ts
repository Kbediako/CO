import process from 'node:process';
import { join } from 'node:path';

import type { OrchestratorAutoScoutOutcome, OrchestratorAutoScoutParams } from './orchestratorExecutionRouter.js';
import { writeJsonAtomic } from '../utils/fs.js';
import { buildAutoScoutEvidence } from '../utils/advancedAutopilot.js';
import { isoTimestamp } from '../utils/time.js';
import { relativeToRepo } from '../run/runPaths.js';
import { resolveCloudBranch } from './orchestratorCloudBranchResolution.js';
import { resolveCloudEnvironmentId } from './orchestratorCloudEnvironmentResolution.js';

const DEFAULT_AUTO_SCOUT_TIMEOUT_MS = 4000;

function readCloudNumber(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function recordOrchestratorAutoScoutEvidence(
  params: OrchestratorAutoScoutParams
): Promise<OrchestratorAutoScoutOutcome> {
  const mergedEnv = { ...process.env, ...(params.envOverrides ?? {}) };
  const timeoutMs = readCloudNumber(
    mergedEnv.CODEX_ORCHESTRATOR_AUTO_SCOUT_TIMEOUT_MS,
    DEFAULT_AUTO_SCOUT_TIMEOUT_MS
  );

  const work = async (): Promise<OrchestratorAutoScoutOutcome> => {
    const cloudEnvironmentId = resolveCloudEnvironmentId(params.task, params.target, params.envOverrides);
    const cloudBranch = resolveCloudBranch(params.envOverrides);
    const cloudRequested =
      params.mode === 'cloud' || params.manifest.cloud_fallback?.mode_requested === 'cloud';

    const evidence = buildAutoScoutEvidence({
      taskId: params.manifest.task_id,
      pipelineId: params.pipeline.id,
      targetId: params.target.id,
      targetDescription: params.target.description,
      executionMode: params.mode,
      cloudRequested,
      advanced: params.advancedDecision,
      cloudEnvironmentId,
      cloudBranch,
      env: mergedEnv,
      generatedAt: isoTimestamp()
    });
    const evidencePath = join(params.paths.runDir, 'auto-scout.json');
    await writeJsonAtomic(evidencePath, evidence);
    return { status: 'recorded', path: relativeToRepo(params.env, evidencePath) };
  };

  try {
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<OrchestratorAutoScoutOutcome>((resolve) => {
      timeoutHandle = setTimeout(() => {
        resolve({
          status: 'timeout',
          message: `timed out after ${Math.round(timeoutMs / 1000)}s`
        });
      }, timeoutMs);
      timeoutHandle.unref?.();
    });
    const workPromise = work().catch((error): OrchestratorAutoScoutOutcome => ({
      status: 'error',
      message: (error as Error)?.message ?? String(error)
    }));
    const result = await Promise.race([workPromise, timeoutPromise]);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    return result;
  } catch (error) {
    return {
      status: 'error',
      message: (error as Error)?.message ?? String(error)
    };
  }
}
