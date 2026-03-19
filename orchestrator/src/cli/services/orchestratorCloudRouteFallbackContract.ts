import process from 'node:process';

import type { RuntimeMode, RuntimeModeSource } from '../runtime/types.js';
import type { CliManifest } from '../types.js';
import { isoTimestamp } from '../utils/time.js';

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
  const raw =
    readCloudString(envOverrides?.CODEX_ORCHESTRATOR_CLOUD_FALLBACK) ??
    readCloudString(process.env.CODEX_ORCHESTRATOR_CLOUD_FALLBACK);
  if (!raw) {
    return true;
  }
  const normalized = raw.toLowerCase();
  return !['0', 'false', 'off', 'deny', 'disabled', 'never', 'strict'].includes(normalized);
}

export function buildCloudPreflightFailureContract(
  input: OrchestratorCloudFallbackContractInput,
  issues: { code: string; message: string }[]
): OrchestratorCloudPreflightFailureContract {
  const issueSummary = issues.map((issue) => issue.message).join(' ');
  if (!allowCloudFallback(input.envOverrides)) {
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
      runtimeModeRequested: input.runtimeModeRequested,
      runtimeModeSource: input.runtimeModeSource,
      envOverrides: input.envOverrides
    }
  };
}
