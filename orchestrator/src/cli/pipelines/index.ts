import type { PipelineDefinition } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { defaultDiagnosticsPipeline } from './defaultDiagnostics.js';
import type { UserConfig } from '../config/userConfig.js';
import { findPipeline } from '../config/userConfig.js';

export interface PipelineResolution {
  pipeline: PipelineDefinition;
  source: 'default' | 'user';
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
    if (pipelineId === defaultDiagnosticsPipeline.id) {
      return { pipeline: defaultDiagnosticsPipeline, source: 'default' };
    }
    throw new Error(`Pipeline '${pipelineId}' not found.`);
  }

  const defaultId = config?.defaultPipeline ?? defaultDiagnosticsPipeline.id;
  const chosen = findPipeline(config, defaultId) ?? defaultDiagnosticsPipeline;
  const source: 'default' | 'user' = chosen === defaultDiagnosticsPipeline ? 'default' : 'user';
  return { pipeline: chosen, source };
}
