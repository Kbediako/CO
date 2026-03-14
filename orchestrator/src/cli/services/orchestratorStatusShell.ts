import process from 'node:process';

import { logger } from '../../logger.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { loadManifest } from '../run/manifest.js';
import { resolveRuntimeActivitySnapshot, type RuntimeActivitySnapshot } from '../run/runtimeActivity.js';
import { relativeToRepo } from '../run/runPaths.js';
import type { RunPaths } from '../run/runPaths.js';
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
  if (manifest.runtime_fallback?.occurred) {
    const fallbackCode = manifest.runtime_fallback.code ?? 'runtime-fallback';
    logger.info(`Runtime fallback: ${fallbackCode} — ${manifest.runtime_fallback.reason ?? 'n/a'}`);
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
