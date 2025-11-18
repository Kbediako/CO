import process from 'node:process';
import { EnvironmentPaths } from '../run/environment.js';
import { loadUserConfig, type UserConfig } from '../config/userConfig.js';
import { resolvePipeline } from '../pipelines/index.js';
import {
  loadDesignConfig,
  shouldActivateDesignPipeline,
  designPipelineId,
  type DesignConfigLoadResult
} from '../../../../packages/shared/config/index.js';
import { logger } from '../../logger.js';
import type { PipelineDefinition } from '../types.js';

export class PipelineResolver {
  async loadDesignConfig(rootDir: string): Promise<DesignConfigLoadResult> {
    const designConfig = await loadDesignConfig({ rootDir });
    process.env.DESIGN_CONFIG_PATH = designConfig.path;
    if (designConfig.warnings.length > 0) {
      for (const warning of designConfig.warnings) {
        logger.warn(`[design-config] ${warning}`);
      }
    }
    return designConfig;
  }

  async resolve(
    env: EnvironmentPaths,
    options: { pipelineId?: string }
  ): Promise<{ pipeline: PipelineDefinition; userConfig: UserConfig | null; designConfig: DesignConfigLoadResult; source: 'default' | 'user' }> {
    const designConfig = await this.loadDesignConfig(env.repoRoot);
    const userConfig = await loadUserConfig(env);
    
    const requestedPipelineId = options.pipelineId ?? 
      (shouldActivateDesignPipeline(designConfig) ? designPipelineId(designConfig) : undefined);

    if (requestedPipelineId === designPipelineId(designConfig) && process.env.DESIGN_PIPELINE === undefined) {
      process.env.DESIGN_PIPELINE = '1';
    }

    const { pipeline, source } = resolvePipeline(env, {
      pipelineId: requestedPipelineId,
      config: userConfig
    });

    return { pipeline, userConfig, designConfig, source };
  }

  ensureDesignPipelineEnv(pipelineId: string, designConfig: DesignConfigLoadResult): void {
    if (pipelineId === designPipelineId(designConfig) && process.env.DESIGN_PIPELINE === undefined) {
      process.env.DESIGN_PIPELINE = '1';
    }
  }
}