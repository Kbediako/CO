import { join } from 'node:path';

import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import { relativeToRepo } from '../run/runPaths.js';
import { writeJsonAtomic } from '../utils/fs.js';
import { persistManifest, type ManifestPersister } from '../run/manifestPersister.js';
import type { CliManifest } from '../types.js';
import type { RunSummary } from '../../types.js';

export function applyHandlesToRunSummary(runSummary: RunSummary, manifest: CliManifest): void {
  if (!manifest.handles || manifest.handles.length === 0) {
    return;
  }
  runSummary.handles = manifest.handles.map((handle) => ({
    handleId: handle.handle_id,
    correlationId: handle.correlation_id,
    stageId: handle.stage_id,
    status: handle.status,
    frameCount: handle.frame_count,
    latestSequence: handle.latest_sequence
  }));
}

export function applyPrivacyToRunSummary(runSummary: RunSummary, manifest: CliManifest): void {
  if (!manifest.privacy) {
    return;
  }
  runSummary.privacy = {
    mode: manifest.privacy.mode,
    totalFrames: manifest.privacy.totals.total_frames,
    redactedFrames: manifest.privacy.totals.redacted_frames,
    blockedFrames: manifest.privacy.totals.blocked_frames,
    allowedFrames: manifest.privacy.totals.allowed_frames
  };
}

export function applyCloudExecutionToRunSummary(runSummary: RunSummary, manifest: CliManifest): void {
  if (!manifest.cloud_execution) {
    return;
  }
  runSummary.cloudExecution = {
    taskId: manifest.cloud_execution.task_id,
    environmentId: manifest.cloud_execution.environment_id,
    status: manifest.cloud_execution.status,
    statusUrl: manifest.cloud_execution.status_url,
    submittedAt: manifest.cloud_execution.submitted_at,
    completedAt: manifest.cloud_execution.completed_at,
    lastPolledAt: manifest.cloud_execution.last_polled_at,
    pollCount: manifest.cloud_execution.poll_count,
    pollIntervalSeconds: manifest.cloud_execution.poll_interval_seconds,
    timeoutSeconds: manifest.cloud_execution.timeout_seconds,
    attempts: manifest.cloud_execution.attempts,
    diffPath: manifest.cloud_execution.diff_path,
    diffUrl: manifest.cloud_execution.diff_url,
    diffStatus: manifest.cloud_execution.diff_status,
    applyStatus: manifest.cloud_execution.apply_status,
    logPath: manifest.cloud_execution.log_path,
    error: manifest.cloud_execution.error
  };
}

export async function persistRunSummary(
  env: EnvironmentPaths,
  paths: RunPaths,
  manifest: CliManifest,
  runSummary: RunSummary,
  persister?: ManifestPersister
): Promise<void> {
  const summaryPath = join(paths.runDir, 'run-summary.json');
  await writeJsonAtomic(summaryPath, runSummary);
  manifest.run_summary_path = relativeToRepo(env, summaryPath);
  await persistManifest(paths, manifest, persister, { force: true });
}
