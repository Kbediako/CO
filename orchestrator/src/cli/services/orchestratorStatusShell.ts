import process from 'node:process';

import { logger } from '../../logger.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { loadManifest } from '../run/manifest.js';
import { resolveRuntimeActivitySnapshot, type RuntimeActivitySnapshot } from '../run/runtimeActivity.js';
import { relativeToRepo } from '../run/runPaths.js';
import type { RunPaths } from '../run/runPaths.js';
import { describeFallbackTarget } from '../runtime/fallbackPolicy.js';
import type { CliManifest, StatusOptions } from '../types.js';

export interface RunOrchestratorStatusShellParams {
  baseEnv: EnvironmentPaths;
  options: StatusOptions;
  loadManifestImpl?: typeof loadManifest;
  resolveRuntimeActivitySnapshotImpl?: typeof resolveRuntimeActivitySnapshot;
}

export function buildOrchestratorStatusPayload(
  env: EnvironmentPaths,
  manifest: CliManifest,
  paths: RunPaths,
  activity: RuntimeActivitySnapshot
): Record<string, unknown> {
  return {
    run_id: manifest.run_id,
    status: manifest.status,
    status_detail: manifest.status_detail,
    started_at: manifest.started_at,
    completed_at: manifest.completed_at,
    manifest: relativeToRepo(env, paths.manifestPath),
    artifact_root: manifest.artifact_root,
    log_path: manifest.log_path,
    heartbeat_at: manifest.heartbeat_at,
    activity,
    commands: manifest.commands,
    child_runs: manifest.child_runs,
    runtime_mode_requested: manifest.runtime_mode_requested,
    runtime_mode: manifest.runtime_mode,
    runtime_provider: manifest.runtime_provider,
    config_resolution: manifest.config_resolution ?? null,
    runtime_fallback: manifest.runtime_fallback ?? null,
    cloud_execution: manifest.cloud_execution ?? null,
    cloud_fallback: manifest.cloud_fallback ?? null
  };
}

export function renderOrchestratorStatus(
  manifest: CliManifest,
  activity: RuntimeActivitySnapshot
): void {
  logger.info(`Run: ${manifest.run_id}`);
  logger.info(`Status: ${manifest.status}${manifest.status_detail ? ` (${manifest.status_detail})` : ''}`);
  logger.info(`Started: ${manifest.started_at}`);
  logger.info(`Completed: ${manifest.completed_at ?? 'in-progress'}`);
  logger.info(`Manifest: ${manifest.artifact_root}/manifest.json`);
  if (manifest.runtime_mode || manifest.runtime_mode_requested || manifest.runtime_provider) {
    const selectedMode = manifest.runtime_mode ?? 'unknown';
    logger.info(
      `Runtime: ${selectedMode}${manifest.runtime_mode_requested ? ` (requested ${manifest.runtime_mode_requested})` : ''}` +
        (manifest.runtime_provider ? ` via ${manifest.runtime_provider}` : '')
    );
  }
  if (manifest.runtime_fallback?.occurred || manifest.runtime_fallback?.blocking_reason) {
    const fallback = manifest.runtime_fallback;
    logger.info(
      `Runtime fallback: policy=${fallback.policy ?? 'auto'} code=${fallback.code ?? 'runtime-fallback'} ` +
        `original_target=${describeFallbackTarget(fallback.original_target ?? null)} ` +
        `fallback_target=${describeFallbackTarget(fallback.fallback_target ?? null)} ` +
        `blocking_reason=${fallback.blocking_reason ?? fallback.reason ?? 'n/a'}`
    );
    if (fallback.expiry) {
      logger.info(
        `Runtime fallback expiry: owner=${fallback.expiry.owner} review=${fallback.expiry.review_date} ` +
          `max=${fallback.expiry.maximum_lifetime}`
      );
    }
  }
  if (manifest.config_resolution) {
    logger.info(
      `Configuration mode: ${manifest.config_resolution.mode} (${manifest.config_resolution.reason}; source=${manifest.config_resolution.config_source ?? 'none'})`
    );
  }
  if (activity.observed_at) {
    const staleSuffix = activity.stale === null ? '' : activity.stale ? ' [stale]' : ' [active]';
    const sourceLabel = activity.observed_source ? ` via ${activity.observed_source}` : '';
    const ageLabel = activity.age_seconds === null ? '' : ` age=${activity.age_seconds}s`;
    logger.info(`Activity: ${activity.observed_at}${sourceLabel}${ageLabel}${staleSuffix}`);
  }
  if (manifest.cloud_execution?.task_id) {
    logger.info(
      `Cloud: ${manifest.cloud_execution.task_id} [${manifest.cloud_execution.status}]` +
        (manifest.cloud_execution.status_url ? ` ${manifest.cloud_execution.status_url}` : '')
    );
  }
  if (manifest.cloud_fallback) {
    logger.info(
      `Cloud fallback: policy=${manifest.cloud_fallback.policy ?? 'auto'} ` +
        `original_target=${manifest.cloud_fallback.original_target ?? 'execution:cloud'} ` +
        `fallback_target=${manifest.cloud_fallback.fallback_target ?? 'execution:mcp'} ` +
        `blocking_reason=${manifest.cloud_fallback.blocking_reason ?? manifest.cloud_fallback.reason}`
    );
  }
  logger.info('Commands:');
  for (const command of manifest.commands) {
    const summary = command.summary ? ` — ${command.summary}` : '';
    logger.info(`  [${command.status}] ${command.title}${summary}`);
  }
}

export async function runOrchestratorStatusShell(
  params: RunOrchestratorStatusShellParams
): Promise<CliManifest> {
  const loadManifestImpl = params.loadManifestImpl ?? loadManifest;
  const resolveRuntimeActivitySnapshotImpl =
    params.resolveRuntimeActivitySnapshotImpl ?? resolveRuntimeActivitySnapshot;

  const { manifest, paths } = await loadManifestImpl(params.baseEnv, params.options.runId);
  const activity = await resolveRuntimeActivitySnapshotImpl(manifest, paths);

  if (params.options.format === 'json') {
    process.stdout.write(
      `${JSON.stringify(buildOrchestratorStatusPayload(params.baseEnv, manifest, paths, activity), null, 2)}\n`
    );
    return manifest;
  }

  renderOrchestratorStatus(manifest, activity);
  return manifest;
}
