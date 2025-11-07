import type { PipelineDefinition } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { defaultDiagnosticsPipeline } from './defaultDiagnostics.js';
import { designReferencePipeline } from './designReference.js';
import { hiFiDesignToolkitPipeline } from './hiFiDesignToolkit.js';
import type { UserConfig } from '../config/userConfig.js';
import { findPipeline } from '../config/userConfig.js';

export interface PipelineResolution {
  pipeline: PipelineDefinition;
  source: 'default' | 'user';
}

const builtinPipelines = new Map<string, PipelineDefinition>([
  [defaultDiagnosticsPipeline.id, defaultDiagnosticsPipeline],
  [designReferencePipeline.id, designReferencePipeline],
  [hiFiDesignToolkitPipeline.id, hiFiDesignToolkitPipeline]
]);

function getBuiltinPipeline(id: string | undefined): PipelineDefinition | null {
  if (!id) {
    return null;
  }
  return builtinPipelines.get(id) ?? null;
}

export function resolvePipeline(
  env: EnvironmentPaths,
  options: { pipelineId?: string; config: UserConfig | null }
): PipelineResolution {
  const { pipelineId, config } = options;
  if (pipelineId) {
    const fromUser = findPipeline(config, pipelineId);
    if (fromUser) {
      return { pipeline: fromUser, source: 'user' };
    }
    const builtin = getBuiltinPipeline(pipelineId);
    if (builtin) {
      return { pipeline: builtin, source: 'default' };
    }
    throw new Error(`Pipeline '${pipelineId}' not found.`);
  }

  const defaultId = config?.defaultPipeline ?? defaultDiagnosticsPipeline.id;
  const userPipeline = findPipeline(config, defaultId);
  const chosen = userPipeline ?? getBuiltinPipeline(defaultId) ?? defaultDiagnosticsPipeline;
  const source: 'default' | 'user' = userPipeline ? 'user' : 'default';
  return { pipeline: chosen, source };
}
