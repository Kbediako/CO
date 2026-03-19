import process from 'node:process';

import type { ExecutionMode } from '../../types.js';
import { resolveRuntimeSelection } from '../runtime/index.js';
import type { RuntimeMode, RuntimeModeSource, RuntimeSelection } from '../runtime/types.js';
import type { CliManifest } from '../types.js';

export type OrchestratorExecutionRouteState = {
  runtimeSelection: RuntimeSelection;
  effectiveEnvOverrides: NodeJS.ProcessEnv;
  effectiveMergedEnv: NodeJS.ProcessEnv;
};

export interface OrchestratorExecutionRouteStateOptions {
  repoRoot: string;
  manifest: CliManifest;
  mode: ExecutionMode;
  runtimeModeRequested: RuntimeMode;
  runtimeModeSource: RuntimeModeSource;
  envOverrides?: NodeJS.ProcessEnv;
  applyRuntimeSelection(manifest: CliManifest, selection: RuntimeSelection): void;
}

export async function resolveOrchestratorExecutionRouteState(
  options: OrchestratorExecutionRouteStateOptions
): Promise<OrchestratorExecutionRouteState> {
  const baseEnvOverrides: NodeJS.ProcessEnv = { ...(options.envOverrides ?? {}) };
  const mergedEnv = { ...process.env, ...baseEnvOverrides };
  const runtimeSelection = await resolveRuntimeSelection({
    requestedMode: options.runtimeModeRequested,
    source: options.runtimeModeSource,
    executionMode: options.mode,
    repoRoot: options.repoRoot,
    env: mergedEnv,
    runId: options.manifest.run_id
  });

  options.applyRuntimeSelection(options.manifest, runtimeSelection);
  const effectiveEnvOverrides: NodeJS.ProcessEnv = {
    ...baseEnvOverrides,
    ...runtimeSelection.env_overrides
  };
  const effectiveMergedEnv = { ...process.env, ...effectiveEnvOverrides };
  return { runtimeSelection, effectiveEnvOverrides, effectiveMergedEnv };
}
