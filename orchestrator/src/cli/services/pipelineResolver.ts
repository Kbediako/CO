import process from 'node:process';
import { EnvironmentPaths } from '../run/environment.js';
import {
  loadPackageConfig,
  loadUserConfig,
  resolveRepoConfigPath,
  type UserConfig
} from '../config/userConfig.js';
import { resolvePipeline } from '../pipelines/index.js';
import {
  loadDesignConfig,
  shouldActivateDesignPipeline,
  designPipelineId,
  type DesignConfigLoadResult
} from '../../../../packages/shared/config/index.js';
import { logger } from '../../logger.js';
import type { PipelineDefinition } from '../types.js';
import {
  formatRepoConfigRequiredError,
  resolveConfigAuthorityMode,
  type ConfigAuthorityMode
} from '../config/repoConfigPolicy.js';

export interface ConfigResolutionSummary {
  mode: ConfigAuthorityMode;
  reason: string;
  config_source: 'repo' | 'package' | null;
}

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
    configResolution: ConfigResolutionSummary;
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
    const configMode = resolveConfigAuthorityMode(runtimeEnv);
    const repoConfigRequired = configMode.mode === 'repo-authoritative';
    const userConfig = await loadUserConfig(env, {
      allowPackageFallback: !repoConfigRequired,
      quiet,
      processEnv: runtimeEnv
    });
    if (repoConfigRequired && userConfig?.source !== 'repo') {
      throw new Error(formatRepoConfigRequiredError(resolveRepoConfigPath(env, runtimeEnv)));
    }
    let configResolution: ConfigResolutionSummary = {
      mode: configMode.mode,
      reason: configMode.reason,
      config_source: userConfig?.source ?? null
    };
    let configNotice = formatConfigNotice(configResolution);
    if (configMode.mode === 'downstream-compatibility' || userConfig?.source === 'package') {
      this.logWarn(`[codex-config] ${configNotice}`, quiet);
    } else if (userConfig?.source === 'repo') {
      this.logInfo(`[codex-config] ${configNotice}`, quiet);
    } else {
      this.logWarn(`[codex-config] ${configNotice}`, quiet);
    }

    const pipelineCandidate =
      options.pipelineId ??
      (shouldActivateDesignPipeline(designConfig) ? designPipelineId(designConfig) : undefined);
    const resolvedAlias = this.resolvePipelineAlias(pipelineCandidate);
    const requestedPipelineId = resolvedAlias.pipelineId;

    const envOverrides = this.resolveDesignEnvOverrides(designConfig, requestedPipelineId, runtimeEnv);
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
      return { pipeline, userConfig, designConfig, source, configResolution, configNotice, envOverrides };
    } catch (error) {
      const repoPipelineMissing = isMissingPipelineError(error, requestedPipelineId);
      if (requestedPipelineId === 'rlm' && userConfig?.source === 'repo' && repoConfigRequired && repoPipelineMissing) {
        throw new Error(
          'Repo-local codex.orchestrator.json is missing the rlm pipeline while strict repo-config mode is enabled.'
        );
      }
      if (requestedPipelineId === 'rlm' && userConfig?.source === 'repo' && !repoConfigRequired && repoPipelineMissing) {
        const packageConfig = await loadPackageConfig(env, { quiet });
        if (packageConfig) {
          const fallbackNotice =
            'Configuration mode: downstream-compatibility; repo config is missing the rlm pipeline, so the packaged compatibility pipeline is active. ' +
            'Add rlm to your repo-local codex.orchestrator.json to avoid compatibility fallback.';
          this.logWarn(`[codex-config] ${fallbackNotice}`, quiet);
          const { pipeline, source } = resolvePipeline(env, {
            pipelineId: requestedPipelineId,
            config: packageConfig
          });
          this.logInfo(`PipelineResolver.resolve selected package pipeline ${pipeline.id}`, quiet);
          configResolution = {
            mode: 'downstream-compatibility',
            reason: fallbackNotice,
            config_source: 'package'
          };
          configNotice = fallbackNotice;
          return {
            pipeline,
            userConfig: packageConfig,
            designConfig,
            source,
            configResolution,
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
    pipelineId?: string,
    runtimeEnv: NodeJS.ProcessEnv = process.env
  ): NodeJS.ProcessEnv {
    const envOverrides: NodeJS.ProcessEnv = {
      DESIGN_CONFIG_PATH: designConfig.path
    };
    if (pipelineId === designPipelineId(designConfig) && runtimeEnv.DESIGN_PIPELINE === undefined) {
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

function formatConfigNotice(resolution: ConfigResolutionSummary): string {
  if (resolution.mode === 'repo-authoritative') {
    if (resolution.config_source === 'repo') {
      return `Configuration mode: repo-authoritative (${resolution.reason}); using repo-local codex.orchestrator.json.`;
    }
    return `Configuration mode: repo-authoritative (${resolution.reason}); repo-local codex.orchestrator.json is required.`;
  }
  if (resolution.config_source === 'package') {
    return `Configuration mode: downstream-compatibility (${resolution.reason}); using packaged compatibility codex.orchestrator.json.`;
  }
  if (resolution.config_source === 'repo') {
    return `Configuration mode: downstream-compatibility (${resolution.reason}); using repo-local codex.orchestrator.json with packaged fallback enabled.`;
  }
  return `Configuration mode: downstream-compatibility (${resolution.reason}); packaged compatibility fallback is enabled.`;
}

function isMissingPipelineError(error: unknown, pipelineId: string | undefined): boolean {
  return error instanceof Error && pipelineId !== undefined && error.message === `Pipeline '${pipelineId}' not found.`;
}
