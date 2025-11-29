import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { isoTimestamp } from '../cli/utils/time.js';
import type { CliManifest } from '../cli/types.js';
import { logger } from '../logger.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';
import {
  appendLearningAlert,
  ensureLearningSection,
  updateLearningValidation
} from './manifest.js';

const execFileAsync = promisify(execFile);

export interface LearningHarvesterOptions {
  repoRoot: string;
  runsRoot: string;
  manifestPath: string;
  taskId: string;
  runId: string;
  diffPath?: string | null;
  promptPath?: string | null;
  executionHistoryPath?: string | null;
  maxAttempts?: number;
  backoffMs?: number[];
  bucket?: string;
  alertTargets?: { slack?: string; pagerduty?: string };
  uploader?: SnapshotUploader;
}

export interface HarvesterResult {
  manifest: CliManifest;
  snapshotPath: string | null;
  queuePayloadPath: string | null;
}

export async function runLearningHarvester(
  manifest: CliManifest,
  options: LearningHarvesterOptions
): Promise<HarvesterResult> {
  const {
    repoRoot,
    runsRoot,
    manifestPath,
    taskId,
    runId,
    diffPath = null,
    promptPath = null,
    executionHistoryPath = null,
    maxAttempts = 3,
    backoffMs = [500, 1_000],
    bucket = 's3://learning-snapshots',
    alertTargets,
    uploader
  } = options;

  const learning = ensureLearningSection(manifest);
  const safeTaskId = sanitizeTaskId(taskId);
  const learningDir = join(runsRoot, safeTaskId, 'cli', sanitizeRunId(runId), 'learning');
  await mkdir(learningDir, { recursive: true });

  let snapshotPath: string | null = null;
  let queuePayloadPath: string | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const snapshot = await createSnapshot({ repoRoot, learningDir, runId });
      snapshotPath = snapshot.tarballPath;
      const s3Uri = await uploadSnapshot({
        uploader,
        bucket,
        taskId,
        runId,
        tarballPath: snapshot.tarballPath,
        retentionDays: 30
      });
      const queuePayload = {
        snapshot_id: snapshot.tag,
        snapshot_commit: snapshot.commitSha,
        diff_path: diffPath,
        prompt_path: promptPath,
        execution_history_path: executionHistoryPath,
        manifest_path: manifestPath
      };
      queuePayloadPath = join(learningDir, 'queue-payload.json');
      await writeFile(queuePayloadPath, JSON.stringify(queuePayload, null, 2), 'utf8');

      learning.snapshot = {
        tag: snapshot.tag,
        commit_sha: snapshot.commitSha,
        tarball_path: relative(repoRoot, snapshot.tarballPath),
        tarball_digest: snapshot.tarballDigest,
        s3_uri: s3Uri,
        retention_days: 30,
        status: 'captured',
        attempts: attempt,
        created_at: isoTimestamp(),
        last_error: null
      };
      learning.queue = {
        snapshot_id: snapshot.tag,
        diff_path: diffPath,
        prompt_path: promptPath,
        execution_history_path: executionHistoryPath,
        manifest_path: relative(repoRoot, manifestPath),
        enqueued_at: isoTimestamp(),
        payload_path: relative(repoRoot, queuePayloadPath),
        status: 'queued'
      };
      if (learning.validation?.status === 'snapshot_failed') {
        updateLearningValidation(manifest, 'pending');
      }
      return { manifest, snapshotPath, queuePayloadPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`[learning] snapshot attempt ${attempt} failed: ${message}`);
      learning.snapshot = {
        tag: learning.snapshot?.tag ?? `learning-snapshot-${randomUUID()}`,
        commit_sha: learning.snapshot?.commit_sha ?? 'unknown',
        tarball_path: learning.snapshot?.tarball_path ?? 'unavailable',
        tarball_digest: learning.snapshot?.tarball_digest ?? 'unavailable',
        s3_uri: learning.snapshot?.s3_uri ?? `${bucket}/${taskId}/${runId}.tar.gz`,
        retention_days: 30,
        status: 'snapshot_failed',
        attempts: attempt,
        created_at: learning.snapshot?.created_at ?? isoTimestamp(),
        last_error: message
      };
      appendLearningAlert(manifest, {
        type: 'snapshot_failed',
        channel: 'slack',
        target: alertTargets?.slack ?? '#learning-alerts',
        message: `Snapshot attempt ${attempt} failed: ${message}`
      });
      appendLearningAlert(manifest, {
        type: 'snapshot_failed',
        channel: 'pagerduty',
        target: alertTargets?.pagerduty ?? 'learning-pipeline',
        message: `Snapshot attempt ${attempt} failed for ${taskId}/${runId}`
      });
      if (attempt >= maxAttempts) {
        updateLearningValidation(manifest, 'snapshot_failed');
        break;
      }
      const delayMs = backoffMs[Math.min(attempt - 1, backoffMs.length - 1)] ?? 500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { manifest, snapshotPath, queuePayloadPath };
}

export async function recordStalledSnapshot(
  manifest: CliManifest,
  options: {
    repoRoot: string;
    runsRoot: string;
    taskId: string;
    runId: string;
    reason: string;
    alertTargets?: { slack?: string; pagerduty?: string };
  }
): Promise<void> {
  const { repoRoot, runsRoot, taskId, runId, reason, alertTargets } = options;
  const learning = ensureLearningSection(manifest);
  const safeTaskId = sanitizeTaskId(taskId);
  const runDir = join(runsRoot, safeTaskId, 'cli', sanitizeRunId(runId));
  const learningDir = join(runDir, 'learning');
  await mkdir(learningDir, { recursive: true });
  const gitStatusPath = join(learningDir, 'stalled-git-status.txt');
  const gitLogPath = join(learningDir, 'stalled-git-log.txt');

  const [statusOutput, logOutput] = await Promise.all([
    safeGit(['status', '--short'], repoRoot).catch((error) => `git status failed: ${String(error)}`),
    safeGit(['log', '-5', '--oneline'], repoRoot).catch((error) => `git log failed: ${String(error)}`)
  ]);

  await writeFile(gitStatusPath, statusOutput, 'utf8');
  await writeFile(gitLogPath, logOutput, 'utf8');

  learning.snapshot = {
    tag: learning.snapshot?.tag ?? `learning-snapshot-${randomUUID()}`,
    commit_sha: learning.snapshot?.commit_sha ?? 'unknown',
    tarball_path: learning.snapshot?.tarball_path ?? 'unavailable',
    tarball_digest: learning.snapshot?.tarball_digest ?? 'unavailable',
    s3_uri: learning.snapshot?.s3_uri ?? `s3://learning-snapshots/${taskId}/${runId}.tar.gz`,
    retention_days: 30,
    status: 'stalled_snapshot',
    attempts: learning.snapshot?.attempts ?? 0,
    created_at: learning.snapshot?.created_at ?? isoTimestamp(),
    last_error: reason,
    git_status_path: relative(repoRoot, gitStatusPath),
    git_log_path: relative(repoRoot, gitLogPath)
  };
  updateLearningValidation(manifest, 'stalled_snapshot');
  appendLearningAlert(manifest, {
    type: 'stalled_snapshot',
    channel: 'slack',
    target: alertTargets?.slack ?? '#learning-alerts',
    message: `Runner stalled on snapshot ${learning.snapshot.tag}: ${reason}`
  });
  appendLearningAlert(manifest, {
    type: 'stalled_snapshot',
    channel: 'pagerduty',
    target: alertTargets?.pagerduty ?? 'learning-pipeline',
    message: `Runner stalled on snapshot ${taskId}/${runId}: ${reason}`
  });
}

type SnapshotUploader = (params: {
  bucket: string;
  key: string;
  file: string;
  retentionDays: number;
}) => Promise<string>;

async function createSnapshot(params: {
  repoRoot: string;
  learningDir: string;
  runId: string;
}): Promise<{ tag: string; commitSha: string; tarballPath: string; tarballDigest: string }> {
  const { repoRoot, learningDir, runId } = params;
  const commitSha = (await safeGit(['rev-parse', 'HEAD'], repoRoot)).trim();
  const tag = `learning-snapshot-${randomUUID()}`;
  await safeGit(['tag', tag, commitSha], repoRoot);

  await mkdir(learningDir, { recursive: true });
  const tarballPath = join(learningDir, `${runId}.tar.gz`);
  await execFileAsync('git', ['archive', '--format=tar.gz', '-o', tarballPath, tag], { cwd: repoRoot });
  const digest = await hashFile(tarballPath);
  return { tag, commitSha, tarballPath, tarballDigest: digest };
}

async function hashFile(path: string): Promise<string> {
  const raw = await readFile(path);
  return createHash('sha256').update(raw).digest('hex');
}

async function uploadSnapshot(params: {
  uploader?: SnapshotUploader;
  bucket: string;
  taskId: string;
  runId: string;
  tarballPath: string;
  retentionDays: number;
}): Promise<string> {
  const { uploader, bucket, taskId, runId, tarballPath, retentionDays } = params;
  const key = `${taskId}/${runId}.tar.gz`.replace(/^\/+/, '');
  const upload = uploader ?? awsCliUploader;
  return upload({ bucket, key, file: tarballPath, retentionDays });
}

async function awsCliUploader(params: { bucket: string; key: string; file: string; retentionDays: number }): Promise<string> {
  const { bucket, key, file, retentionDays } = params;
  const normalized = bucket.startsWith('s3://') ? bucket.replace(/\/+$/, '') : `s3://${bucket.replace(/\/+$/, '')}`;
  const uri = `${normalized}/${key}`;
  const args = ['s3', 'cp', file, uri, '--metadata', `retention-days=${retentionDays}`];
  await execFileAsync('aws', args, { env: { ...process.env, AWS_PAGER: '' } });
  return uri;
}

async function safeGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout;
}
