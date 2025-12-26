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
  ): Promise<{
    pipeline: PipelineDefinition;
    userConfig: UserConfig | null;
    designConfig: DesignConfigLoadResult;
    source: 'default' | 'user';
    envOverrides: NodeJS.ProcessEnv;
  }> {
    logger.info(`PipelineResolver.resolve start for ${options.pipelineId ?? '<default>'}`);
    const designConfig = await this.loadDesignConfig(env.repoRoot);
    logger.info(`PipelineResolver.resolve loaded design config from ${designConfig.path}`);
    const userConfig = await loadUserConfig(env);
    logger.info(`PipelineResolver.resolve loaded user config`);
    
    const requestedPipelineId = options.pipelineId ?? 
      (shouldActivateDesignPipeline(designConfig) ? designPipelineId(designConfig) : undefined);

    const envOverrides = this.resolveDesignEnvOverrides(designConfig, requestedPipelineId);

    try {
      const { pipeline, source } = resolvePipeline(env, {
        pipelineId: requestedPipelineId,
        config: userConfig
      });
      logger.info(`PipelineResolver.resolve selected pipeline ${pipeline.id}`);
      return { pipeline, userConfig, designConfig, source, envOverrides };
    } catch (error) {
      logger.error(
        `PipelineResolver.resolve failed for ${requestedPipelineId ?? '<default>'}: ${(error as Error).message}`
      );
      throw error;
    }
  }

  resolveDesignEnvOverrides(
    designConfig: DesignConfigLoadResult,
    pipelineId?: string
  ): NodeJS.ProcessEnv {
    const envOverrides: NodeJS.ProcessEnv = {
      DESIGN_CONFIG_PATH: designConfig.path
    };
    if (pipelineId === designPipelineId(designConfig) && process.env.DESIGN_PIPELINE === undefined) {
      envOverrides.DESIGN_PIPELINE = '1';
    }
    return envOverrides;
  }
}
