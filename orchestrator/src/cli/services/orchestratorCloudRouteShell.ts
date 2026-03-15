import process from 'node:process';

import { logger } from '../../logger.js';
import type { TaskContext, PlanItem } from '../../types.js';
import { appendSummary } from '../run/manifest.js';
import type { CliManifest, PipelineRunExecutionResult } from '../types.js';
import { buildCloudPreflightRequest, runCloudPreflight } from '../utils/cloudPreflight.js';
import { resolveCloudEnvironmentId } from './orchestratorCloudEnvironmentResolution.js';
import {
  buildCloudPreflightFailureContract,
  type OrchestratorCloudFallbackReroute
} from './orchestratorCloudRouteFallbackContract.js';
import type { OrchestratorExecutionRouteState } from './orchestratorExecutionRouteState.js';

function readCloudString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export interface OrchestratorCloudRouteShellOptions {
  repoRoot: string;
  task: TaskContext;
  target: PlanItem;
  manifest: CliManifest;
  state: OrchestratorExecutionRouteState;
  executeCloudPipeline(envOverrides: NodeJS.ProcessEnv): Promise<PipelineRunExecutionResult>;
  reroute(reroute: OrchestratorCloudFallbackReroute): Promise<PipelineRunExecutionResult>;
  failExecutionRoute(statusDetail: string, detail: string): PipelineRunExecutionResult;
}

function buildExecutionRouteCloudPreflightRequest(
  options: OrchestratorCloudRouteShellOptions
): Parameters<typeof runCloudPreflight>[0] {
  const environmentId = resolveCloudEnvironmentId(
    options.task,
    options.target,
    options.state.effectiveEnvOverrides
  );
  const branch =
    readCloudString(options.state.effectiveEnvOverrides.CODEX_CLOUD_BRANCH) ??
    readCloudString(process.env.CODEX_CLOUD_BRANCH);
  return buildCloudPreflightRequest({
    repoRoot: options.repoRoot,
    environmentId,
    branch,
    env: options.state.effectiveMergedEnv
  });
}

export async function executeOrchestratorCloudRouteShell(
  options: OrchestratorCloudRouteShellOptions
): Promise<PipelineRunExecutionResult> {
  const preflight = await runCloudPreflight(buildExecutionRouteCloudPreflightRequest(options));

  if (!preflight.ok) {
    const contract = buildCloudPreflightFailureContract(
      {
        runtimeModeRequested: options.state.runtimeSelection.selected_mode,
        runtimeModeSource: options.state.runtimeSelection.source,
        envOverrides: options.state.effectiveEnvOverrides
      },
      preflight.issues
    );
    if (contract.outcome === 'fail') {
      return options.failExecutionRoute('cloud-preflight-failed', contract.detail);
    }

    options.manifest.cloud_fallback = contract.manifestFallback;
    appendSummary(options.manifest, contract.detail);
    logger.warn(contract.detail);
    const fallback = await options.reroute(contract.reroute);
    fallback.notes.unshift(contract.detail);
    return fallback;
  }

  return await options.executeCloudPipeline(options.state.effectiveEnvOverrides);
}
