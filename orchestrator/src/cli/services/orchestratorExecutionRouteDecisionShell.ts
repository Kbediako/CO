import { logger } from '../../logger.js';
import { appendSummary, finalizeStatus } from '../run/manifest.js';
import type { PipelineRunExecutionResult } from '../types.js';
import { getRuntimeSelectionFailureMetadata } from '../runtime/provider.js';
import { executeOrchestratorCloudRouteShell } from './orchestratorCloudRouteShell.js';
import {
  resolveOrchestratorExecutionRouteState,
  type OrchestratorExecutionRouteState
} from './orchestratorExecutionRouteState.js';
import { executeOrchestratorLocalRouteShell } from './orchestratorLocalRouteShell.js';
import type { OrchestratorExecutionRouteOptions } from './orchestratorExecutionRouter.js';

function restorePreviousRuntimeFallback(
  previousRuntimeFallback: OrchestratorExecutionRouteOptions['manifest']['runtime_fallback'],
  options: OrchestratorExecutionRouteOptions,
  state: OrchestratorExecutionRouteState
): typeof previousRuntimeFallback {
  if (!previousRuntimeFallback?.expiry || !previousRuntimeFallback.occurred) {
    return null;
  }
  if (
    previousRuntimeFallback.code !== 'cloud-appserver-unsupported' ||
    previousRuntimeFallback.original_target !== 'execution:cloud/runtime:appserver' ||
    previousRuntimeFallback.fallback_target !== 'execution:cloud/runtime:cli'
  ) {
    return null;
  }
  if (
    options.mode !== 'mcp' ||
    options.executionModeOverride !== 'mcp' ||
    options.runtimeModeRequested !== previousRuntimeFallback.to_mode
  ) {
    return null;
  }
  const current = state.runtimeSelection.fallback;
  if (
    state.runtimeSelection.requested_mode !== previousRuntimeFallback.to_mode ||
    state.runtimeSelection.selected_mode !== previousRuntimeFallback.to_mode ||
    current.occurred ||
    current.blocking_reason ||
    current.expiry
  ) {
    return null;
  }
  return previousRuntimeFallback;
}

function failExecutionRoute(
  options: OrchestratorExecutionRouteOptions,
  statusDetail: string,
  detail: string
): PipelineRunExecutionResult {
  finalizeStatus(options.manifest, 'failed', statusDetail);
  appendSummary(options.manifest, detail);
  logger.error(detail);
  return {
    success: false,
    notes: [detail],
    manifest: options.manifest,
    manifestPath: options.paths.manifestPath,
    logPath: options.paths.logPath
  };
}

async function executeCloudRoute(
  options: OrchestratorExecutionRouteOptions,
  state: OrchestratorExecutionRouteState
): Promise<PipelineRunExecutionResult> {
  return await executeOrchestratorCloudRouteShell({
    repoRoot: options.env.repoRoot,
    task: options.task,
    target: options.target,
    manifest: options.manifest,
    state,
    executeCloudPipeline: (envOverrides) =>
      options.executeCloudPipeline({ ...options, envOverrides }),
    reroute: (reroute) =>
      routeOrchestratorExecution({
        ...options,
        ...reroute
      }),
    failExecutionRoute: (statusDetail, detail) => failExecutionRoute(options, statusDetail, detail)
  });
}

async function executeLocalRoute(
  options: OrchestratorExecutionRouteOptions,
  state: OrchestratorExecutionRouteState
): Promise<PipelineRunExecutionResult> {
  return executeOrchestratorLocalRouteShell({ ...options, state });
}

export async function routeOrchestratorExecution(
  options: OrchestratorExecutionRouteOptions
): Promise<PipelineRunExecutionResult> {
  let state: OrchestratorExecutionRouteState;
  const previousRuntimeFallback = options.manifest.runtime_fallback ?? null;
  try {
    state = await resolveOrchestratorExecutionRouteState({
      repoRoot: options.env.repoRoot,
      manifest: options.manifest,
      mode: options.mode,
      runtimeModeRequested: options.runtimeModeRequested,
      runtimeModeSource: options.runtimeModeSource,
      envOverrides: options.envOverrides,
      applyRuntimeSelection: options.applyRuntimeSelection
    });
    const restoredRuntimeFallback = restorePreviousRuntimeFallback(previousRuntimeFallback, options, state);
    if (restoredRuntimeFallback) {
      options.manifest.runtime_fallback = restoredRuntimeFallback;
    }
  } catch (error) {
    const runtimeFallback = getRuntimeSelectionFailureMetadata(error);
    if (runtimeFallback) {
      options.manifest.runtime_fallback = runtimeFallback;
    }
    const detail = `Runtime selection failed: ${(error as Error)?.message ?? String(error)}`;
    return failExecutionRoute(options, 'runtime-selection-failed', detail);
  }

  if (options.mode === 'cloud') {
    return await executeCloudRoute(options, state);
  }
  return await executeLocalRoute(options, state);
}
