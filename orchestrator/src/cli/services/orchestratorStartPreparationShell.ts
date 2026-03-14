import process from 'node:process';

import { bootstrapManifest, appendSummary } from '../run/manifest.js';
import {
  ManifestPersister,
  type ManifestPersisterOptions
} from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import { resolveRuntimeMode } from '../runtime/index.js';
import type { RuntimeMode, RuntimeModeResolution } from '../runtime/types.js';
import { prepareRun, type RunPreparationResult } from './runPreparation.js';
import type { CliManifest, StartOptions } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { generateRunId } from '../utils/runId.js';

export interface RunOrchestratorStartPreparationShellParams {
  baseEnv: EnvironmentPaths;
  options: StartOptions;
  applyRequestedRuntimeMode: (manifest: CliManifest, mode: RuntimeMode) => void;
  prepareRunImpl?: typeof prepareRun;
  generateRunIdImpl?: typeof generateRunId;
  resolveRuntimeModeImpl?: typeof resolveRuntimeMode;
  bootstrapManifestImpl?: typeof bootstrapManifest;
  appendSummaryImpl?: typeof appendSummary;
  createPersister?: (options: ManifestPersisterOptions) => ManifestPersister;
}

export interface OrchestratorStartPreparationShellResult {
  preparation: RunPreparationResult;
  runId: string;
  runtimeModeResolution: RuntimeModeResolution;
  manifest: CliManifest;
  paths: RunPaths;
  persister: ManifestPersister;
}

export async function runOrchestratorStartPreparationShell(
  params: RunOrchestratorStartPreparationShellParams
): Promise<OrchestratorStartPreparationShellResult> {
  const prepareRunImpl = params.prepareRunImpl ?? prepareRun;
  const generateRunIdImpl = params.generateRunIdImpl ?? generateRunId;
  const resolveRuntimeModeImpl = params.resolveRuntimeModeImpl ?? resolveRuntimeMode;
  const bootstrapManifestImpl = params.bootstrapManifestImpl ?? bootstrapManifest;
  const appendSummaryImpl = params.appendSummaryImpl ?? appendSummary;
  const createPersister =
    params.createPersister ?? ((options: ManifestPersisterOptions) => new ManifestPersister(options));

  const preparation = await prepareRunImpl({
    baseEnv: params.baseEnv,
    taskIdOverride: params.options.taskId,
    pipelineId: params.options.pipelineId,
    targetStageId: params.options.targetStageId ?? null,
    planTargetFallback: null
  });
  const runId = generateRunIdImpl();
  const runtimeModeResolution = resolveRuntimeModeImpl({
    flag: params.options.runtimeMode,
    env: { ...process.env, ...(preparation.envOverrides ?? {}) },
    configDefault: preparation.runtimeModeDefault
  });
  const { manifest, paths } = await bootstrapManifestImpl(runId, {
    env: preparation.env,
    pipeline: preparation.pipeline,
    parentRunId: params.options.parentRunId ?? null,
    taskSlug: preparation.metadata.slug,
    approvalPolicy: params.options.approvalPolicy ?? null,
    planTargetId: preparation.planPreview?.targetId ?? preparation.plannerTargetId ?? null
  });
  params.applyRequestedRuntimeMode(manifest, runtimeModeResolution.mode);
  if (preparation.configNotice) {
    appendSummaryImpl(manifest, preparation.configNotice);
  }
  const persister = createPersister({
    manifest,
    paths,
    persistIntervalMs: Math.max(1000, manifest.heartbeat_interval_seconds * 1000)
  });

  return {
    preparation,
    runId,
    runtimeModeResolution,
    manifest,
    paths,
    persister
  };
}
