import { spawn } from 'node:child_process';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import type { CliManifest } from '../cli/types.js';
import { isoTimestamp } from '../cli/utils/time.js';

const TASK_ID_PATTERN = /\btask_[a-z]_[a-f0-9]+\b/i;
const MAX_LOG_CHARS = 32 * 1024;
const DEFAULT_STATUS_RETRY_LIMIT = 12;
const DEFAULT_STATUS_RETRY_BACKOFF_MS = 1500;
const MAX_STATUS_RETRY_LIMIT = 60;
const MAX_STATUS_RETRY_BACKOFF_MS = 30_000;
const DEFAULT_LIST_LIMIT = 20;

export type CloudExecutionManifest = NonNullable<CliManifest['cloud_execution']>;

export interface CloudCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CloudCommandRunner = (request: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}) => Promise<CloudCommandResult>;

export interface CloudTaskExecutorInput {
  codexBin: string;
  prompt: string;
  environmentId: string;
  repoRoot: string;
  runDir: string;
  pollIntervalSeconds: number;
  timeoutSeconds: number;
  attempts: number;
  statusRetryLimit?: number;
  statusRetryBackoffMs?: number;
  branch?: string | null;
  enableFeatures?: string[];
  disableFeatures?: string[];
  env?: NodeJS.ProcessEnv;
}

export interface CloudTaskExecutionResult {
  success: boolean;
  summary: string;
  notes: string[];
  cloudExecution: CloudExecutionManifest;
}

export interface CodexCloudTaskExecutorOptions {
  commandRunner?: CloudCommandRunner;
  now?: () => string;
  sleepFn?: (ms: number) => Promise<void>;
}

interface CloudTaskListPayload {
  tasks?: Array<{
    id?: string;
    url?: string;
    status?: string;
  }>;
}

export function extractCloudTaskId(text: string): string | null {
  const match = TASK_ID_PATTERN.exec(text);
  if (!match?.[0]) {
    return null;
  }
  return match[0];
}

export function parseCloudStatusToken(text: string): string | null {
  const match = /^\s*\[([A-Z_]+)\]/m.exec(text);
  if (!match?.[1]) {
    return null;
  }
  return match[1].toUpperCase();
}

export function mapCloudStatusToken(token: string | null): CloudExecutionManifest['status'] {
  if (!token) {
    return 'unknown';
  }
  switch (token) {
    case 'READY':
    case 'COMPLETED':
    case 'SUCCEEDED':
      return 'ready';
    case 'RUNNING':
    case 'IN_PROGRESS':
      return 'running';
    case 'QUEUED':
    case 'PENDING':
      return 'queued';
    case 'ERROR':
      return 'error';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

export class CodexCloudTaskExecutor {
  private readonly commandRunner: CloudCommandRunner;
  private readonly now: () => string;
  private readonly sleepFn: (ms: number) => Promise<void>;

  constructor(options: CodexCloudTaskExecutorOptions = {}) {
    this.commandRunner = options.commandRunner ?? defaultCloudCommandRunner;
    this.now = options.now ?? isoTimestamp;
    this.sleepFn = options.sleepFn ?? sleep;
  }

  async execute(input: CloudTaskExecutorInput): Promise<CloudTaskExecutionResult> {
    const cloudDir = join(input.runDir, 'cloud');
    await mkdir(cloudDir, { recursive: true });
    const commandLogPath = join(cloudDir, 'commands.ndjson');
    const env = { ...process.env, ...(input.env ?? {}) };
    const notes: string[] = [];

    const cloudExecution: CloudExecutionManifest = {
      task_id: null,
      environment_id: input.environmentId,
      status: 'queued',
      status_url: null,
      submitted_at: null,
      completed_at: null,
      last_polled_at: null,
      poll_count: 0,
      poll_interval_seconds: Math.max(1, input.pollIntervalSeconds),
      timeout_seconds: Math.max(1, input.timeoutSeconds),
      attempts: Math.max(1, input.attempts),
      diff_path: null,
      diff_url: null,
      diff_status: 'pending',
      apply_status: 'not_requested',
      log_path: relative(input.repoRoot, commandLogPath),
      error: null
    };
    const statusRetryLimit = normalizePositiveInt(
      input.statusRetryLimit,
      DEFAULT_STATUS_RETRY_LIMIT,
      MAX_STATUS_RETRY_LIMIT
    );
    const statusRetryBackoffMs = normalizePositiveInt(
      input.statusRetryBackoffMs,
      DEFAULT_STATUS_RETRY_BACKOFF_MS,
      MAX_STATUS_RETRY_BACKOFF_MS
    );

    const runCloudCommand = async (args: string[]): Promise<CloudCommandResult> => {
      const result = await this.commandRunner({
        command: input.codexBin,
        args,
        cwd: input.repoRoot,
        env
      });
      await appendFile(
        commandLogPath,
        `${JSON.stringify({
          timestamp: this.now(),
          command: input.codexBin,
          args,
          exit_code: result.exitCode,
          stdout: truncate(result.stdout),
          stderr: truncate(result.stderr)
        })}\n`,
        'utf8'
      );
      return result;
    };

    try {
      const execArgs = ['cloud', 'exec', '--env', input.environmentId, '--attempts', String(cloudExecution.attempts)];
      if (input.branch && input.branch.trim()) {
        execArgs.push('--branch', input.branch.trim());
      }
      for (const feature of normalizeFeatureList(input.enableFeatures)) {
        execArgs.push('--enable', feature);
      }
      for (const feature of normalizeFeatureList(input.disableFeatures)) {
        execArgs.push('--disable', feature);
      }
      execArgs.push(input.prompt);

      const execResult = await runCloudCommand(execArgs);
      if (execResult.exitCode !== 0) {
        throw new Error(
          `codex cloud exec failed with exit ${execResult.exitCode}: ${compactError(execResult.stderr, execResult.stdout)}`
        );
      }

      const taskId = extractCloudTaskId(`${execResult.stdout}\n${execResult.stderr}`);
      if (!taskId) {
        throw new Error('Unable to parse cloud task id from codex cloud exec output.');
      }

      cloudExecution.task_id = taskId;
      cloudExecution.status = 'running';
      cloudExecution.submitted_at = this.now();
      notes.push(`Cloud task submitted: ${taskId}`);

      const metadata = await this.lookupTaskMetadata(taskId, runCloudCommand);
      if (metadata?.url) {
        cloudExecution.status_url = metadata.url;
      }

      const timeoutAt = Date.now() + cloudExecution.timeout_seconds * 1000;
      let statusRetries = 0;
      let lastKnownStatus: CloudExecutionManifest['status'] = cloudExecution.status;
      let loggedNonZeroStatus = false;
      while (Date.now() < timeoutAt) {
        const statusResult = await runCloudCommand(['cloud', 'status', taskId]);
        cloudExecution.last_polled_at = this.now();
        cloudExecution.poll_count += 1;
        const token = parseCloudStatusToken(`${statusResult.stdout}\n${statusResult.stderr}`);
        const mapped = mapCloudStatusToken(token);

        // `codex cloud status` may return a non-zero exit while the task is still pending.
        // Treat non-zero as a retry only when no recognizable status token is present.
        if (statusResult.exitCode !== 0 && mapped === 'unknown') {
          statusRetries += 1;
          if (statusRetries > statusRetryLimit) {
            throw new Error(
              `codex cloud status failed ${statusRetries} times: ${compactError(statusResult.stderr, statusResult.stdout)}`
            );
          }
          const retryDelayMs = Math.min(
            statusRetryBackoffMs * statusRetries,
            Math.max(0, timeoutAt - Date.now())
          );
          if (retryDelayMs > 0) {
            await this.sleepFn(retryDelayMs);
          }
          continue;
        }
        if (statusResult.exitCode !== 0 && mapped !== 'unknown' && !loggedNonZeroStatus) {
          notes.push(
            `Cloud status returned exit ${statusResult.exitCode} with remote status ${mapped}; continuing to poll.`
          );
          loggedNonZeroStatus = true;
        }
        statusRetries = 0;

        if (mapped !== 'unknown') {
          cloudExecution.status = mapped;
          lastKnownStatus = mapped;
        }

        if (mapped === 'ready') {
          notes.push(`Cloud task completed: ${taskId}`);
          break;
        }
        if (mapped === 'error' || mapped === 'failed' || mapped === 'cancelled') {
          cloudExecution.error = `Cloud task ended with status ${mapped}.`;
          break;
        }
        await this.sleepFn(cloudExecution.poll_interval_seconds * 1000);
      }

      if (cloudExecution.status === 'running' || cloudExecution.status === 'queued') {
        cloudExecution.status = 'failed';
        cloudExecution.error = `Timed out waiting for cloud task completion after ${cloudExecution.timeout_seconds}s (last remote status: ${lastKnownStatus}, polls: ${cloudExecution.poll_count}).`;
      }

      if (cloudExecution.status === 'ready') {
        const diffResult = await runCloudCommand(['cloud', 'diff', taskId]);
        if (diffResult.exitCode === 0 && diffResult.stdout.trim().length > 0) {
          const diffPath = join(cloudDir, `${taskId}.diff.patch`);
          await writeFile(diffPath, diffResult.stdout, 'utf8');
          cloudExecution.diff_path = relative(input.repoRoot, diffPath);
          cloudExecution.diff_status = 'available';
          cloudExecution.diff_url = cloudExecution.status_url;
          notes.push(`Cloud diff captured: ${cloudExecution.diff_path}`);
        } else {
          cloudExecution.diff_status = 'unavailable';
          if (diffResult.exitCode !== 0) {
            notes.push(`Cloud diff unavailable (exit ${diffResult.exitCode}).`);
          } else {
            notes.push('Cloud diff unavailable (empty payload).');
          }
        }
      } else {
        cloudExecution.diff_status = 'unavailable';
      }

      cloudExecution.completed_at = this.now();
      const success = cloudExecution.status === 'ready';
      const summary = success
        ? `Cloud task ${cloudExecution.task_id} completed successfully.`
        : `Cloud task ${cloudExecution.task_id ?? '<unknown>'} failed (${cloudExecution.status}).`;

      return { success, summary, notes, cloudExecution };
    } catch (error) {
      // Convert non-terminal states to failed when execution throws before a terminal cloud status.
      if (cloudExecution.status === 'queued' || cloudExecution.status === 'running') {
        cloudExecution.status = 'failed';
      }
      cloudExecution.diff_status = 'unavailable';
      cloudExecution.error = (error as Error)?.message ?? String(error);
      cloudExecution.completed_at = this.now();
      const summary = `Cloud execution failed: ${cloudExecution.error}`;
      notes.push(summary);
      return { success: false, summary, notes, cloudExecution };
    }
  }

  private async lookupTaskMetadata(
    taskId: string,
    runCloudCommand: (args: string[]) => Promise<CloudCommandResult>
  ): Promise<{ url: string | null } | null> {
    const listResult = await runCloudCommand(['cloud', 'list', '--json', '--limit', String(DEFAULT_LIST_LIMIT)]);
    if (listResult.exitCode !== 0) {
      return null;
    }
    try {
      const payload = JSON.parse(listResult.stdout) as CloudTaskListPayload;
      const match = payload.tasks?.find((task) => task.id === taskId) ?? null;
      return { url: match?.url ?? null };
    } catch {
      return null;
    }
  }
}

function normalizeFeatureList(features: string[] | undefined): string[] {
  if (!Array.isArray(features) || features.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of features) {
    if (typeof raw !== 'string') {
      continue;
    }
    const feature = raw.trim();
    if (!feature || seen.has(feature)) {
      continue;
    }
    seen.add(feature);
    normalized.push(feature);
  }
  return normalized;
}

function normalizePositiveInt(value: number | undefined, fallback: number, max: number = Number.POSITIVE_INFINITY): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.trunc(value);
  if (rounded <= 0) {
    return fallback;
  }
  return Math.min(rounded, max);
}

export async function defaultCloudCommandRunner(request: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}): Promise<CloudCommandResult> {
  return await new Promise<CloudCommandResult>((resolve, reject) => {
    const child = spawn(request.command, request.args, {
      cwd: request.cwd,
      env: request.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });
    child.once('close', (code) => {
      resolve({
        exitCode: typeof code === 'number' ? code : 1,
        stdout,
        stderr
      });
    });
  });
}

function truncate(value: string): string {
  if (value.length <= MAX_LOG_CHARS) {
    return value;
  }
  return `${value.slice(0, MAX_LOG_CHARS)}…`;
}

function compactError(...values: string[]): string {
  const merged = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(' | ');
  return merged.length > 0 ? truncate(merged) : 'no stderr/stdout captured';
}
