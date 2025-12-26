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
