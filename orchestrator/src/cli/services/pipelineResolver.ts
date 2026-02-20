import process from 'node:process';
import { EnvironmentPaths } from '../run/environment.js';
import { loadPackageConfig, loadUserConfig, type UserConfig } from '../config/userConfig.js';
import { resolvePipeline } from '../pipelines/index.js';
import {
  loadDesignConfig,
  shouldActivateDesignPipeline,
  designPipelineId,
  type DesignConfigLoadResult
} from '../../../../packages/shared/config/index.js';
import { logger } from '../../logger.js';
import type { PipelineDefinition } from '../types.js';
import { formatRepoConfigRequiredError, isRepoConfigRequired } from '../config/repoConfigPolicy.js';

const DEVTOOLS_PIPELINE_ALIASES = new Map<string, string>([
  ['implementation-gate-devtools', 'implementation-gate'],
  ['frontend-testing-devtools', 'frontend-testing']
]);

export class PipelineResolver {
  private logInfo(message: string, quiet: boolean): void {
    if (!quiet) {
      logger.info(message);
    }
  }

  private logWarn(message: string, quiet: boolean): void {
    if (!quiet) {
      logger.warn(message);
    }
  }

  private logError(message: string, quiet: boolean): void {
    if (!quiet) {
      logger.error(message);
    }
  }

  async loadDesignConfig(rootDir: string, quiet: boolean = false): Promise<DesignConfigLoadResult> {
    const designConfig = await loadDesignConfig({ rootDir });
    if (designConfig.warnings.length > 0) {
      for (const warning of designConfig.warnings) {
        this.logWarn(`[design-config] ${warning}`, quiet);
      }
    }
    return designConfig;
  }

  async resolve(
    env: EnvironmentPaths,
    options: { pipelineId?: string; quiet?: boolean; processEnv?: NodeJS.ProcessEnv }
  ): Promise<{
    pipeline: PipelineDefinition;
    userConfig: UserConfig | null;
    designConfig: DesignConfigLoadResult;
    source: 'default' | 'user';
    configNotice: string | null;
    envOverrides: NodeJS.ProcessEnv;
  }> {
    const quiet = options.quiet === true;
    const runtimeEnv = options.processEnv ?? process.env;
    this.logInfo(`PipelineResolver.resolve start for ${options.pipelineId ?? '<default>'}`, quiet);
    const designConfig = await this.loadDesignConfig(env.repoRoot, quiet);
    if (designConfig.exists) {
      this.logInfo(`[design-config] loaded repo file at ${designConfig.path}`, quiet);
    } else {
      this.logInfo(`[design-config] using defaults (missing file at ${designConfig.path})`, quiet);
    }
    const repoConfigRequired = isRepoConfigRequired(runtimeEnv);
    const userConfig = await loadUserConfig(env, { allowPackageFallback: !repoConfigRequired, quiet });
    if (repoConfigRequired && userConfig?.source !== 'repo') {
      throw new Error(formatRepoConfigRequiredError(env.repoRoot));
    }
    let configNotice: string | null = null;
    if (userConfig?.source === 'package') {
      configNotice =
        'Using packaged fallback codex.orchestrator.json (compatibility path). ' +
        'Run `codex-orchestrator init codex` to pin repo-local config.';
      this.logWarn(`[codex-config] ${configNotice}`, quiet);
    } else if (userConfig?.source === 'repo') {
      this.logInfo('[codex-config] Using repo-local codex.orchestrator.json.', quiet);
    } else {
      this.logWarn('[codex-config] No codex.orchestrator.json found in repo or package.', quiet);
    }

    const pipelineCandidate =
      options.pipelineId ??
      (shouldActivateDesignPipeline(designConfig) ? designPipelineId(designConfig) : undefined);
    const resolvedAlias = this.resolvePipelineAlias(pipelineCandidate);
    const requestedPipelineId = resolvedAlias.pipelineId;

    const envOverrides = this.resolveDesignEnvOverrides(designConfig, requestedPipelineId);
    if (resolvedAlias.devtoolsRequested) {
      envOverrides.CODEX_REVIEW_DEVTOOLS = '1';
      this.logWarn(
        `[pipeline] ${resolvedAlias.aliasId} is deprecated; use ${requestedPipelineId} with CODEX_REVIEW_DEVTOOLS=1.`,
        quiet
      );
    }

    try {
      const { pipeline, source } = resolvePipeline(env, {
        pipelineId: requestedPipelineId,
        config: userConfig
      });
      this.logInfo(`PipelineResolver.resolve selected pipeline ${pipeline.id}`, quiet);
      return { pipeline, userConfig, designConfig, source, configNotice, envOverrides };
    } catch (error) {
      if (requestedPipelineId === 'rlm' && userConfig?.source === 'repo' && repoConfigRequired) {
        throw new Error(
          'Repo-local codex.orchestrator.json is missing the rlm pipeline while strict repo-config mode is enabled.'
        );
      }
      if (requestedPipelineId === 'rlm' && userConfig?.source === 'repo' && !repoConfigRequired) {
        const packageConfig = await loadPackageConfig(env, { quiet });
        if (packageConfig) {
          const fallbackNotice =
            'Repo config is missing the rlm pipeline; using packaged fallback pipeline for compatibility. ' +
            'Add rlm to your repo-local codex.orchestrator.json to avoid fallback.';
          this.logWarn(`[codex-config] ${fallbackNotice}`, quiet);
          const { pipeline, source } = resolvePipeline(env, {
            pipelineId: requestedPipelineId,
            config: packageConfig
          });
          this.logInfo(`PipelineResolver.resolve selected package pipeline ${pipeline.id}`, quiet);
          return {
            pipeline,
            userConfig: packageConfig,
            designConfig,
            source,
            configNotice: fallbackNotice,
            envOverrides
          };
        }
      }
      this.logError(
        `PipelineResolver.resolve failed for ${requestedPipelineId ?? '<default>'}: ${(error as Error).message}`,
        quiet
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

  resolvePipelineAlias(pipelineId?: string): {
    pipelineId?: string;
    devtoolsRequested: boolean;
    aliasId?: string;
  } {
    if (!pipelineId) {
      return { pipelineId, devtoolsRequested: false };
    }
    const target = DEVTOOLS_PIPELINE_ALIASES.get(pipelineId);
    if (!target) {
      return { pipelineId, devtoolsRequested: false };
    }
    return { pipelineId: target, devtoolsRequested: true, aliasId: pipelineId };
  }
}
