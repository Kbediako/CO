import type { ExecutionMode } from '../../types.js';
import { resolveCodexCommand } from '../utils/devtools.js';
import { resolveRuntimeMode } from './mode.js';
import { resolveRuntimeSelection } from './provider.js';
import { describeFallbackTarget, type RuntimeFallbackPolicy } from './fallbackPolicy.js';
import type { RuntimeMode, RuntimeSelection } from './types.js';

export interface RuntimeCodexCommandContext {
  runtime: RuntimeSelection;
  env: NodeJS.ProcessEnv;
}

export interface RuntimeCodexCommandContextOptions {
  requestedMode?: RuntimeMode | string | null;
  executionMode?: ExecutionMode;
  repoRoot: string;
  env?: NodeJS.ProcessEnv;
  runId: string;
  configDefault?: RuntimeMode | string | null;
  allowFallback?: boolean | RuntimeFallbackPolicy;
}

export async function createRuntimeCodexCommandContext(
  options: RuntimeCodexCommandContextOptions
): Promise<RuntimeCodexCommandContext> {
  const runtimeEnv = options.env ?? process.env;
  const modeResolution = resolveRuntimeMode({
    flag: options.requestedMode,
    env: runtimeEnv,
    configDefault: options.configDefault
  });
  const runtime = await resolveRuntimeSelection({
    requestedMode: modeResolution.mode,
    source: modeResolution.source,
    executionMode: options.executionMode ?? 'mcp',
    repoRoot: options.repoRoot,
    env: runtimeEnv,
    runId: options.runId,
    allowFallback: options.allowFallback
  });

  return {
    runtime,
    env: {
      ...runtimeEnv,
      ...runtime.env_overrides
    }
  };
}

export function resolveRuntimeCodexCommand(
  args: string[],
  context: RuntimeCodexCommandContext
): { command: string; args: string[] } {
  return resolveCodexCommand(args, context.env);
}

export function formatRuntimeSelectionSummary(selection: RuntimeSelection): string {
  const base =
    `runtime requested=${selection.requested_mode} selected=${selection.selected_mode} provider=${selection.provider}` +
    ` fallback_policy=${selection.fallback.policy} fallback_policy_source=${selection.fallback.policy_source}`;
  if (!selection.fallback.occurred) {
    return base;
  }
  const code = selection.fallback.code ?? 'unknown';
  const reason = selection.fallback.reason ?? 'fallback occurred';
  const expiry = selection.fallback.expiry
    ? ` expiry_owner=${selection.fallback.expiry.owner} expiry_review=${selection.fallback.expiry.review_date} expiry_max=${selection.fallback.expiry.maximum_lifetime}`
    : '';
  return (
    `${base} fallback=${code}${expiry} ` +
    `original_target=${describeFallbackTarget(selection.fallback.original_target)} ` +
    `fallback_target=${describeFallbackTarget(selection.fallback.fallback_target)} ` +
    `blocking_reason=${selection.fallback.blocking_reason ?? reason}`
  );
}
