import process from 'node:process';

import { logger } from '../../logger.js';
import type { TaskContext, PlanItem } from '../../types.js';
import type { RuntimeMode, RuntimeModeSource } from '../runtime/types.js';
import { appendSummary } from '../run/manifest.js';
import type { CliManifest, PipelineRunExecutionResult } from '../types.js';
import { buildCloudPreflightRequest, runCloudPreflight } from '../utils/cloudPreflight.js';
import { isoTimestamp } from '../utils/time.js';
import { resolveCloudEnvironmentId } from './orchestratorCloudTargetExecutor.js';
import type { OrchestratorExecutionRouteState } from './orchestratorExecutionRouteState.js';

function readCloudString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function allowCloudFallback(envOverrides?: NodeJS.ProcessEnv): boolean {
  const raw =
    readCloudString(envOverrides?.CODEX_ORCHESTRATOR_CLOUD_FALLBACK) ??
    readCloudString(process.env.CODEX_ORCHESTRATOR_CLOUD_FALLBACK);
  if (!raw) {
    return true;
  }
  const normalized = raw.toLowerCase();
  return !['0', 'false', 'off', 'deny', 'disabled', 'never', 'strict'].includes(normalized);
}

function normalizeCloudFallbackIssues(
  issues: { code: string; message: string }[]
): Array<{ code: string; message: string }> {
  return issues.map((issue) => ({ code: issue.code, message: issue.message }));
}

export type OrchestratorCloudFallbackReroute = {
  mode: 'mcp';
  executionModeOverride: 'mcp';
  runtimeModeRequested: RuntimeMode;
  runtimeModeSource: RuntimeModeSource;
  envOverrides: NodeJS.ProcessEnv;
};

type OrchestratorCloudPreflightFailureContract =
  | {
      outcome: 'fail';
      detail: string;
    }
  | {
      outcome: 'fallback';
      detail: string;
      manifestFallback: NonNullable<CliManifest['cloud_fallback']>;
      reroute: OrchestratorCloudFallbackReroute;
    };

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

function buildCloudPreflightFailureContract(
  state: OrchestratorExecutionRouteState,
  issues: { code: string; message: string }[]
): OrchestratorCloudPreflightFailureContract {
  const issueSummary = issues.map((issue) => issue.message).join(' ');
  if (!allowCloudFallback(state.effectiveEnvOverrides)) {
    return {
      outcome: 'fail',
      detail: `Cloud preflight failed and cloud fallback is disabled. ${issueSummary}`
    };
  }

  const detail = `Cloud preflight failed; falling back to mcp. ${issueSummary}`;
  return {
    outcome: 'fallback',
    detail,
    manifestFallback: {
      mode_requested: 'cloud',
      mode_used: 'mcp',
      reason: detail,
      issues: normalizeCloudFallbackIssues(issues),
      checked_at: isoTimestamp()
    },
    reroute: {
      mode: 'mcp',
      executionModeOverride: 'mcp',
      runtimeModeRequested: state.runtimeSelection.selected_mode,
      runtimeModeSource: state.runtimeSelection.source,
      envOverrides: state.effectiveEnvOverrides
    }
  };
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
    const contract = buildCloudPreflightFailureContract(options.state, preflight.issues);
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
