import { readFile, stat } from 'node:fs/promises';

import type { CliManifest } from '../types.js';
import type { RunPaths } from './runPaths.js';

export interface RuntimeActivitySnapshot {
  manifest_heartbeat_at: string | null;
  heartbeat_file_at: string | null;
  runner_log_mtime_at: string | null;
  observed_at: string | null;
  observed_source: 'manifest' | 'heartbeat_file' | 'runner_log' | null;
  stale: boolean | null;
  stale_threshold_seconds: number | null;
  age_seconds: number | null;
}

interface RuntimeActivityOptions {
  nowMs?: number;
}

type RuntimeActivitySource = Exclude<RuntimeActivitySnapshot['observed_source'], null>;

interface TimestampCandidate {
  source: RuntimeActivitySource;
  iso: string;
  ms: number;
}

export async function resolveRuntimeActivitySnapshot(
  manifest: CliManifest,
  paths: RunPaths,
  options: RuntimeActivityOptions = {}
): Promise<RuntimeActivitySnapshot> {
  const manifestHeartbeat = normalizeTimestamp(manifest.heartbeat_at);
  const heartbeatFileAt = await readHeartbeatTimestamp(paths.heartbeatPath);
  const runnerLogMtime = await readMtimeIso(paths.logPath);

  const candidates: TimestampCandidate[] = [];
  if (manifestHeartbeat) {
    candidates.push({ source: 'manifest', ...manifestHeartbeat });
  }
  const heartbeatCandidate = normalizeTimestamp(heartbeatFileAt);
  if (heartbeatCandidate) {
    candidates.push({ source: 'heartbeat_file', ...heartbeatCandidate });
  }
  const logCandidate = normalizeTimestamp(runnerLogMtime);
  if (logCandidate) {
    candidates.push({ source: 'runner_log', ...logCandidate });
  }

  const latest = pickLatest(candidates);
  const nowMs = Number.isFinite(options.nowMs) ? Number(options.nowMs) : Date.now();
  const staleThresholdSeconds =
    Number.isFinite(manifest.heartbeat_stale_after_seconds) && manifest.heartbeat_stale_after_seconds > 0
      ? Math.floor(manifest.heartbeat_stale_after_seconds)
      : null;

  let stale: boolean | null = null;
  let ageSeconds: number | null = null;
  if (manifest.status === 'in_progress' && latest && staleThresholdSeconds !== null) {
    ageSeconds = Math.max(0, Math.floor((nowMs - latest.ms) / 1000));
    stale = ageSeconds > staleThresholdSeconds;
  }

  return {
    manifest_heartbeat_at: manifestHeartbeat?.iso ?? null,
    heartbeat_file_at: heartbeatCandidate?.iso ?? null,
    runner_log_mtime_at: logCandidate?.iso ?? null,
    observed_at: latest?.iso ?? null,
    observed_source: latest?.source ?? null,
    stale,
    stale_threshold_seconds: staleThresholdSeconds,
    age_seconds: ageSeconds
  };
}

async function readHeartbeatTimestamp(heartbeatPath: string): Promise<string | null> {
  try {
    const raw = await readFile(heartbeatPath, 'utf8');
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

async function readMtimeIso(filePath: string): Promise<string | null> {
  try {
    const fileStat = await stat(filePath);
    return fileStat.mtime.toISOString();
  } catch {
    return null;
  }
}

function normalizeTimestamp(value: unknown): { iso: string; ms: number } | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    return null;
  }
  return { iso: new Date(ms).toISOString(), ms };
}

function pickLatest(candidates: TimestampCandidate[]): TimestampCandidate | null {
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => b.ms - a.ms);
  return candidates[0] ?? null;
}
