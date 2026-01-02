import type { PipelineDefinition } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { UserConfig } from '../config/userConfig.js';
import { findPipeline } from '../config/userConfig.js';

export interface PipelineResolution {
  pipeline: PipelineDefinition;
  source: 'default' | 'user';
}

function resolveConfigSource(config: UserConfig | null): 'default' | 'user' {
  return config?.source === 'package' ? 'default' : 'user';
}

export function resolvePipeline(
  _env: EnvironmentPaths,
  options: { pipelineId?: string; config: UserConfig | null }
): PipelineResolution {
  const { pipelineId, config } = options;
  const configSource = resolveConfigSource(config);
  if (pipelineId) {
    const fromUser = findPipeline(config, pipelineId);
    if (fromUser) {
      return { pipeline: fromUser, source: configSource };
    }
    const suffix = config ? '' : ' (missing codex.orchestrator.json)';
    throw new Error(`Pipeline '${pipelineId}' not found${suffix}.`);
  }

  const defaultId = config?.defaultPipeline ?? 'diagnostics';
  const userPipeline = findPipeline(config, defaultId);
  if (userPipeline) {
    return { pipeline: userPipeline, source: configSource };
  }
  const suffix = config ? '' : ' (missing codex.orchestrator.json)';
  throw new Error(`Pipeline '${defaultId}' not found${suffix}.`);
}
