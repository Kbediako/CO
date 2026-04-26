import process from 'node:process';

import {
  resolveRuntimeFallbackPolicy,
  type RuntimeFallbackPolicyResolution
} from '../runtime/fallbackPolicy.js';
import type { RuntimeMode, RuntimeModeSource } from '../runtime/types.js';
import type { CliManifest } from '../types.js';
import { isoTimestamp } from '../utils/time.js';

const CLOUD_FALLBACK_ENV_KEY = 'CODEX_ORCHESTRATOR_CLOUD_FALLBACK';

function readCloudString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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

export type OrchestratorCloudPreflightFailureContract =
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

export interface OrchestratorCloudFallbackContractInput {
  runtimeModeRequested: RuntimeMode;
  runtimeModeSource: RuntimeModeSource;
  envOverrides: NodeJS.ProcessEnv;
}

export function allowCloudFallback(envOverrides?: NodeJS.ProcessEnv): boolean {
  return resolveCloudFallbackPolicy(envOverrides).policy === 'auto';
}

export function resolveCloudFallbackPolicy(
  envOverrides?: NodeJS.ProcessEnv
): RuntimeFallbackPolicyResolution {
  const raw =
    readCloudString(envOverrides?.CODEX_ORCHESTRATOR_CLOUD_FALLBACK) ??
    readCloudString(process.env.CODEX_ORCHESTRATOR_CLOUD_FALLBACK);
  return resolveRuntimeFallbackPolicy({
    env: raw === null ? {} : { [CLOUD_FALLBACK_ENV_KEY]: raw },
    envKey: CLOUD_FALLBACK_ENV_KEY
  });
}

function formatCloudFallbackDetail(params: {
  policyResolution: RuntimeFallbackPolicyResolution;
  fallbackTarget: string;
  issueSummary: string;
}): string {
  return (
    `Cloud preflight failed; fallback_policy=${params.policyResolution.policy} ` +
    `original_target=execution:cloud fallback_target=${params.fallbackTarget} ` +
    `blocking_reason=${params.issueSummary}`
  );
}

export function buildCloudPreflightFailureContract(
  input: OrchestratorCloudFallbackContractInput,
  issues: { code: string; message: string }[]
): OrchestratorCloudPreflightFailureContract {
  const issueSummary = issues.map((issue) => issue.message).join(' ');
  const policyResolution = resolveCloudFallbackPolicy(input.envOverrides);
  const fallbackTarget = 'execution:mcp';
  const detail = formatCloudFallbackDetail({
    policyResolution,
    fallbackTarget,
    issueSummary
  });

  if (policyResolution.policy === 'strict') {
    return {
      outcome: 'fail',
      detail
    };
  }

  return {
    outcome: 'fallback',
    detail,
    manifestFallback: {
      mode_requested: 'cloud',
      mode_used: 'mcp',
      policy: policyResolution.policy,
      policy_source: policyResolution.source,
      original_target: 'execution:cloud',
      fallback_target: fallbackTarget,
      blocking_reason: issueSummary,
      reason: detail,
      issues: normalizeCloudFallbackIssues(issues),
      checked_at: isoTimestamp()
    },
    reroute: {
      mode: 'mcp',
      executionModeOverride: 'mcp',
      runtimeModeRequested: input.runtimeModeRequested,
      runtimeModeSource: input.runtimeModeSource,
      envOverrides: input.envOverrides
    }
  };
}
