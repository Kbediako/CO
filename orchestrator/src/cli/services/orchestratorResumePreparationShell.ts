import process from 'node:process';

import {
  loadManifest,
  appendSummary,
  backfillProviderControlHostLocatorFromEnv,
  updateHeartbeat,
  resetForResume,
  recordResumeEvent
} from '../run/manifest.js';
import {
  ManifestPersister,
  type ManifestPersisterOptions
} from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import { resolveRuntimeMode } from '../runtime/index.js';
import type { RuntimeMode, RuntimeModeResolution } from '../runtime/types.js';
import {
  prepareRun,
  resolvePipelineForResume,
  overrideTaskEnvironment,
  type RunPreparationResult
} from './runPreparation.js';
import type { CliManifest, ResumeOptions } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import {
  PipelineResolver,
  formatConfigNotice,
  type ConfigResolutionSummary
} from './pipelineResolver.js';
import {
  formatRepoConfigRequiredError,
  isRepoConfigRequired,
  resolveConfigAuthorityMode
} from '../config/repoConfigPolicy.js';
import {
  findPipeline,
  loadPackageConfig,
  loadUserConfig,
  resolveRepoConfigPath
} from '../config/userConfig.js';

export interface RunOrchestratorResumePreparationShellParams {
  baseEnv: EnvironmentPaths;
  options: ResumeOptions;
  validateResumeToken: (paths: RunPaths, manifest: CliManifest, provided: string | null) => Promise<void>;
  applyRequestedRuntimeMode: (manifest: CliManifest, mode: RuntimeMode) => void;
  loadManifestImpl?: typeof loadManifest;
  overrideTaskEnvironmentImpl?: typeof overrideTaskEnvironment;
  createResolver?: () => PipelineResolver;
  isRepoConfigRequiredImpl?: typeof isRepoConfigRequired;
  loadUserConfigImpl?: typeof loadUserConfig;
  loadPackageConfigImpl?: typeof loadPackageConfig;
  resolveRepoConfigPathImpl?: typeof resolveRepoConfigPath;
  formatRepoConfigRequiredErrorImpl?: typeof formatRepoConfigRequiredError;
  resolvePipelineForResumeImpl?: typeof resolvePipelineForResume;
  recordResumeEventImpl?: typeof recordResumeEvent;
  resetForResumeImpl?: typeof resetForResume;
  updateHeartbeatImpl?: typeof updateHeartbeat;
  prepareRunImpl?: typeof prepareRun;
  resolveRuntimeModeImpl?: typeof resolveRuntimeMode;
  appendSummaryImpl?: typeof appendSummary;
  createPersister?: (options: ManifestPersisterOptions) => ManifestPersister;
}

export interface OrchestratorResumePreparationShellResult {
  preparation: RunPreparationResult;
  runtimeModeResolution: RuntimeModeResolution;
  manifest: CliManifest;
  paths: RunPaths;
  persister: ManifestPersister;
}

export async function runOrchestratorResumePreparationShell(
  params: RunOrchestratorResumePreparationShellParams
): Promise<OrchestratorResumePreparationShellResult> {
  const loadManifestImpl = params.loadManifestImpl ?? loadManifest;
  const overrideTaskEnvironmentImpl = params.overrideTaskEnvironmentImpl ?? overrideTaskEnvironment;
  const createResolver = params.createResolver ?? (() => new PipelineResolver());
  const isRepoConfigRequiredImpl = params.isRepoConfigRequiredImpl ?? isRepoConfigRequired;
  const loadUserConfigImpl = params.loadUserConfigImpl ?? loadUserConfig;
  const loadPackageConfigImpl = params.loadPackageConfigImpl ?? loadPackageConfig;
  const resolveRepoConfigPathImpl = params.resolveRepoConfigPathImpl ?? resolveRepoConfigPath;
  const formatRepoConfigRequiredErrorImpl =
    params.formatRepoConfigRequiredErrorImpl ?? formatRepoConfigRequiredError;
  const resolvePipelineForResumeImpl =
    params.resolvePipelineForResumeImpl ?? resolvePipelineForResume;
  const recordResumeEventImpl = params.recordResumeEventImpl ?? recordResumeEvent;
  const resetForResumeImpl = params.resetForResumeImpl ?? resetForResume;
  const updateHeartbeatImpl = params.updateHeartbeatImpl ?? updateHeartbeat;
  const prepareRunImpl = params.prepareRunImpl ?? prepareRun;
  const resolveRuntimeModeImpl = params.resolveRuntimeModeImpl ?? resolveRuntimeMode;
  const appendSummaryImpl = params.appendSummaryImpl ?? appendSummary;
  const createPersister =
    params.createPersister ?? ((options: ManifestPersisterOptions) => new ManifestPersister(options));

  const { manifest, paths } = await loadManifestImpl(params.baseEnv, params.options.runId);
  const actualEnv = overrideTaskEnvironmentImpl(params.baseEnv, manifest.task_id);
  const resolver = createResolver();
  const designConfig = await resolver.loadDesignConfig(actualEnv.repoRoot);

  const repoConfigRequired = isRepoConfigRequiredImpl(process.env);
  const configMode = resolveResumeConfigMode(repoConfigRequired, process.env);
  const userConfig = await loadUserConfigImpl(actualEnv, { allowPackageFallback: !repoConfigRequired });
  if (repoConfigRequired && userConfig?.source !== 'repo') {
    throw new Error(formatRepoConfigRequiredErrorImpl(resolveRepoConfigPathImpl(actualEnv, process.env)));
  }
  const repoPipeline = findPipeline(userConfig ?? null, manifest.pipeline_id);
  const fallbackConfig =
    !repoConfigRequired && manifest.pipeline_id === 'rlm' && userConfig?.source === 'repo' && !repoPipeline
      ? await loadPackageConfigImpl(actualEnv)
      : null;
  const pipeline = resolvePipelineForResumeImpl(actualEnv, manifest, userConfig, fallbackConfig);
  const fallbackPipeline = fallbackConfig ? findPipeline(fallbackConfig, manifest.pipeline_id) : null;
  const fallbackNotice =
    'Configuration mode: downstream-compatibility; repo config is missing the rlm pipeline, so the packaged compatibility pipeline is active. ' +
    'Add rlm to your repo-local codex.orchestrator.json to avoid compatibility fallback.';
  const resumeConfigResolution: ConfigResolutionSummary =
    !repoPipeline && fallbackPipeline
      ? {
          mode: 'downstream-compatibility',
          reason: fallbackNotice,
          config_source: 'package'
        }
      : {
          mode: configMode.mode,
          reason: configMode.reason,
          config_source: userConfig?.source ?? null
        };
  const resumeConfigNotice =
    !repoPipeline && fallbackPipeline ? fallbackNotice : formatConfigNotice(resumeConfigResolution);
  const envOverrides = resolver.resolveDesignEnvOverrides(designConfig, pipeline.id);

  await params.validateResumeToken(paths, manifest, params.options.resumeToken ?? null);
  backfillProviderControlHostLocatorFromEnv(manifest, process.env, { overwriteConflicts: true });
  recordResumeEventImpl(manifest, {
    actor: params.options.actor ?? 'cli',
    reason: params.options.reason ?? 'manual-resume',
    outcome: 'accepted'
  });
  resetForResumeImpl(manifest);
  updateHeartbeatImpl(manifest);

  const preparation = await prepareRunImpl({
    baseEnv: actualEnv,
    pipeline,
    runtimeModeDefault: userConfig?.runtimeMode ?? null,
    resolver,
    taskIdOverride: manifest.task_id,
    targetStageId: params.options.targetStageId,
    planTargetFallback: manifest.plan_target_id ?? null,
    configResolution: resumeConfigResolution,
    configNotice: resumeConfigNotice,
    envOverrides
  });
  const activeConfigResolution = preparation.configResolution ?? resumeConfigResolution;
  const activeConfigNotice = preparation.configNotice ?? resumeConfigNotice;
  manifest.config_resolution = activeConfigResolution;
  if (activeConfigNotice && !(manifest.summary ?? '').includes(activeConfigNotice)) {
    appendSummaryImpl(manifest, activeConfigNotice);
  }
  const runtimeModeResolution = resolveRuntimeModeImpl({
    flag: params.options.runtimeMode,
    env: { ...process.env, ...(preparation.envOverrides ?? {}) },
    configDefault: preparation.runtimeModeDefault,
    manifestMode: manifest.runtime_mode_requested ?? manifest.runtime_mode ?? null,
    preferManifest: true
  });
  params.applyRequestedRuntimeMode(manifest, runtimeModeResolution.mode);
  manifest.plan_target_id = preparation.planPreview?.targetId ?? preparation.plannerTargetId ?? null;
  const persister = createPersister({
    manifest,
    paths,
    persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
  });
  await persister.schedule({ manifest: true, heartbeat: true, force: true });

  return {
    preparation,
    runtimeModeResolution,
    manifest,
    paths,
    persister
  };
}

function resolveResumeConfigMode(
  repoConfigRequired: boolean,
  runtimeEnv: NodeJS.ProcessEnv
): ReturnType<typeof resolveConfigAuthorityMode> {
  const resolved = resolveConfigAuthorityMode(runtimeEnv);
  if ((resolved.mode === 'repo-authoritative') === repoConfigRequired) {
    return resolved;
  }
  return repoConfigRequired
    ? { mode: 'repo-authoritative', reason: 'resume policy required repo-local config' }
    : { mode: 'downstream-compatibility', reason: 'resume policy allowed packaged compatibility fallback' };
}
