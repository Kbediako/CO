import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import type { FileHandle } from 'node:fs/promises';
import { open, readFile, rm, stat } from 'node:fs/promises';
import { hostname } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

export interface LockRetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
  staleMs?: number;
}

export interface LockRetryParams {
  taskId: string;
  lockPath: string;
  retry: LockRetryOptions;
  ensureDirectory: () => Promise<void>;
  createError: (taskId: string, attempts: number, diagnostics?: LockRetryFailureDiagnostics | null) => Error;
}

export interface AcquiredLock {
  lockPath: string;
  ownerToken: string;
  release(): Promise<void>;
}

const STALE_AWARE_ACQUISITION_LOCK_SUFFIX = '.acquire';
const LOCK_OWNER_PAYLOAD_KIND = 'codex-lock-owner';
const LOCK_OWNER_PAYLOAD_SCHEMA_VERSION = 1;
const PROCESS_START_AFTER_LOCK_TOLERANCE_MS = 2_000;
const execFileAsync = promisify(execFile);

export interface LockOwnerMetadata {
  format: 'metadata' | 'legacy';
  token: string;
  taskId: string | null;
  pid: number | null;
  host: string | null;
  acquiredAt: string | null;
  staleMs: number | null;
}

export interface LockRetryFailureDiagnostics {
  lockPath: string;
  inspectedHost: string;
  owner: LockOwnerMetadata | null;
  mtimeMs: number | null;
  ageMs: number | null;
  staleMs: number;
  isStale: boolean;
  ownerStatus:
    | 'missing'
    | 'legacy_or_unknown'
    | 'same_host_process_alive'
    | 'same_host_process_not_live'
    | 'same_host_process_reused_pid'
    | 'same_host_process_identity_unverified'
    | 'remote_host'
    | 'metadata_without_pid';
  recoverable: boolean;
}

export async function acquireLockWithRetry(params: LockRetryParams): Promise<AcquiredLock> {
  await params.ensureDirectory();
  const { maxAttempts, initialDelayMs, backoffFactor, maxDelayMs } = params.retry;
  const staleMs = params.retry.staleMs ?? 0;
  let attempt = 0;
  let delayMs = initialDelayMs;
  let lastDiagnostics: LockRetryFailureDiagnostics | null = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    let acquisitionLock: AcquiredLock | null = null;
    try {
      if (staleMs > 0) {
        acquisitionLock = await acquireStaleAwareAcquisitionLock(params);
      }
      const ownerToken = randomUUID();
      const handle = await open(params.lockPath, 'wx+');
      try {
        await handle.writeFile(serializeLockOwnerPayload(ownerToken, params.taskId, staleMs), 'utf8');
      } catch (error) {
        await handle.close();
        await rm(params.lockPath, { force: true });
        throw error;
      }
      const lock = createAcquiredLock(params.lockPath, ownerToken, handle, staleMs);
      if (acquisitionLock) {
        try {
          await acquisitionLock.release();
          acquisitionLock = null;
        } catch (error) {
          await lock.release();
          throw error;
        }
      }
      return lock;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        await releaseLockIfPresent(acquisitionLock);
        throw error;
      }
      if (staleMs > 0) {
        const staleResult = await clearStaleLock(params.lockPath, staleMs);
        lastDiagnostics = staleResult.diagnostics;
        const cleared = staleResult.cleared;
        await releaseLockIfPresent(acquisitionLock);
        acquisitionLock = null;
        if (cleared) {
          attempt -= 1;
          continue;
        }
      } else {
        await releaseLockIfPresent(acquisitionLock);
        acquisitionLock = null;
      }
      if (attempt >= maxAttempts) {
        throw appendLockRetryDiagnostics(params.createError(params.taskId, attempt, lastDiagnostics), lastDiagnostics);
      }
      await delay(Math.min(delayMs, maxDelayMs));
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
    }
  }

  throw appendLockRetryDiagnostics(params.createError(params.taskId, attempt, lastDiagnostics), lastDiagnostics);
}

async function acquireStaleAwareAcquisitionLock(params: LockRetryParams): Promise<AcquiredLock> {
  const lockPath = `${params.lockPath}${STALE_AWARE_ACQUISITION_LOCK_SUFFIX}`;
  const { maxAttempts, initialDelayMs, backoffFactor, maxDelayMs } = params.retry;
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const ownerToken = randomUUID();
      const handle = await open(lockPath, 'wx+');
      try {
        await handle.writeFile(serializeLockOwnerPayload(ownerToken, params.taskId, params.retry.staleMs ?? 0), 'utf8');
      } catch (error) {
        await handle.close();
        await rm(lockPath, { force: true });
        throw error;
      }
      return createAcquiredLock(lockPath, ownerToken, handle, params.retry.staleMs ?? 0);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      const staleMs = params.retry.staleMs ?? 0;
      let diagnostics: LockRetryFailureDiagnostics | null = null;
      if (staleMs > 0) {
        const staleResult = await clearStaleLock(lockPath, staleMs);
        diagnostics = staleResult.diagnostics;
        if (staleResult.cleared) {
          attempt -= 1;
          continue;
        }
      }
      if (attempt >= maxAttempts) {
        throw appendLockRetryDiagnostics(params.createError(params.taskId, attempt, diagnostics), diagnostics);
      }
      await delay(Math.min(delayMs, maxDelayMs));
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
    }
  }

  throw params.createError(params.taskId, attempt);
}

async function releaseLockIfPresent(lock: AcquiredLock | null): Promise<void> {
  if (!lock) {
    return;
  }
  await lock.release();
}

function createAcquiredLock(
  lockPath: string,
  ownerToken: string,
  handle: FileHandle,
  staleMs: number
): AcquiredLock {
  let released = false;
  const keepalive = createLockKeepalive(handle, staleMs);
  return {
    lockPath,
    ownerToken,
    async release(): Promise<void> {
      if (released) {
        return;
      }
      released = true;
      keepalive.stop();
      await handle.close();
      await releaseLockIfOwned(lockPath, ownerToken);
    }
  };
}

function createLockKeepalive(handle: FileHandle, staleMs: number): { stop(): void } {
  if (staleMs <= 0) {
    return { stop() {} };
  }

  const intervalMs = Math.max(10, Math.floor(staleMs / 2));
  const timer = setInterval(() => {
    void touchLockHandle(handle);
  }, intervalMs);
  timer.unref?.();

  return {
    stop(): void {
      clearInterval(timer);
    }
  };
}

async function touchLockHandle(handle: FileHandle): Promise<void> {
  try {
    const now = new Date();
    await handle.utimes(now, now);
  } catch {
    // Ignore keepalive failures; acquisition/release paths still surface real errors.
  }
}

async function releaseLockIfOwned(lockPath: string, ownerToken: string): Promise<void> {
  try {
    const currentOwner = parseLockOwnerMetadata(await readFile(lockPath, 'utf8'));
    if (currentOwner?.token !== ownerToken) {
      return;
    }
    await rm(lockPath, { force: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function clearStaleLock(
  lockPath: string,
  staleMs: number
): Promise<{ cleared: boolean; diagnostics: LockRetryFailureDiagnostics | null }> {
  try {
    const diagnostics = await inspectLockForRecovery(lockPath, staleMs);
    if (!diagnostics?.recoverable) {
      return { cleared: false, diagnostics };
    }
    await rm(lockPath, { force: true });
    return { cleared: true, diagnostics };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { cleared: false, diagnostics: null };
    }
    throw error;
  }
}

function serializeLockOwnerPayload(ownerToken: string, taskId: string, staleMs: number): string {
  const acquiredAt = new Date().toISOString();
  return `${JSON.stringify({
    schema_version: LOCK_OWNER_PAYLOAD_SCHEMA_VERSION,
    kind: LOCK_OWNER_PAYLOAD_KIND,
    token: ownerToken,
    task_id: taskId,
    pid: process.pid,
    host: hostname(),
    acquired_at: acquiredAt,
    stale_ms: staleMs > 0 ? staleMs : null
  })}\n`;
}

function parseLockOwnerMetadata(raw: string): LockOwnerMetadata | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      !isRecord(parsed)
      || parsed.kind !== LOCK_OWNER_PAYLOAD_KIND
      || parsed.schema_version !== LOCK_OWNER_PAYLOAD_SCHEMA_VERSION
    ) {
      return buildLegacyLockOwner(trimmed);
    }
    const token = typeof parsed.token === 'string' ? parsed.token.trim() : '';
    if (!token) {
      return null;
    }
    const pid = parsed.pid;
    const payloadStaleMs = parsed.stale_ms;
    return {
      format: 'metadata',
      token,
      taskId: typeof parsed.task_id === 'string' && parsed.task_id.trim() ? parsed.task_id.trim() : null,
      pid: typeof pid === 'number' && Number.isInteger(pid) && pid > 0 ? pid : null,
      host: typeof parsed.host === 'string' && parsed.host.trim() ? parsed.host.trim() : null,
      acquiredAt:
        typeof parsed.acquired_at === 'string' && parsed.acquired_at.trim()
          ? parsed.acquired_at.trim()
          : null,
      staleMs:
        typeof payloadStaleMs === 'number' && Number.isFinite(payloadStaleMs) && payloadStaleMs > 0
          ? payloadStaleMs
          : null
    };
  } catch {
    return buildLegacyLockOwner(trimmed);
  }
}

function buildLegacyLockOwner(token: string): LockOwnerMetadata {
  return {
    format: 'legacy',
    token,
    taskId: null,
    pid: null,
    host: null,
    acquiredAt: null,
    staleMs: null
  };
}

async function inspectLockForRecovery(
  lockPath: string,
  staleMs: number
): Promise<LockRetryFailureDiagnostics | null> {
  const inspectedHost = hostname();
  const [stats, raw] = await Promise.all([stat(lockPath), readFile(lockPath, 'utf8')]);
  const owner = parseLockOwnerMetadata(raw);
  const ageMs = Date.now() - stats.mtimeMs;
  const isStale = Number.isFinite(ageMs) && staleMs > 0 && ageMs > staleMs;
  const ownerStatus = await classifyLockOwnerStatus(owner, inspectedHost);
  const recoverable =
    isStale
    && ownerStatus !== 'same_host_process_alive'
    && ownerStatus !== 'same_host_process_identity_unverified'
    && ownerStatus !== 'metadata_without_pid'
    && ownerStatus !== 'remote_host';

  return {
    lockPath,
    inspectedHost,
    owner,
    mtimeMs: stats.mtimeMs,
    ageMs: Number.isFinite(ageMs) ? ageMs : null,
    staleMs,
    isStale,
    ownerStatus,
    recoverable
  };
}

async function classifyLockOwnerStatus(
  owner: LockOwnerMetadata | null,
  inspectedHost: string
): Promise<LockRetryFailureDiagnostics['ownerStatus']> {
  if (!owner) {
    return 'missing';
  }
  if (owner.format === 'legacy') {
    return 'legacy_or_unknown';
  }
  if (owner.host && owner.host !== inspectedHost) {
    return 'remote_host';
  }
  if (!owner.pid) {
    return 'metadata_without_pid';
  }
  if (!isProcessAlive(owner.pid)) {
    return 'same_host_process_not_live';
  }
  const ownerAcquiredAtMs = owner.acquiredAt ? Date.parse(owner.acquiredAt) : NaN;
  if (!Number.isFinite(ownerAcquiredAtMs)) {
    return 'same_host_process_identity_unverified';
  }
  const processStartedAtMs = await readLocalProcessStartedAtMs(owner.pid);
  if (processStartedAtMs === null) {
    return 'same_host_process_identity_unverified';
  }
  return processStartedAtMs > ownerAcquiredAtMs + PROCESS_START_AFTER_LOCK_TOLERANCE_MS
    ? 'same_host_process_reused_pid'
    : 'same_host_process_alive';
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function readLocalProcessStartedAtMs(pid: number): Promise<number | null> {
  if (pid === process.pid) {
    return Date.now() - process.uptime() * 1_000;
  }
  if (process.platform === 'win32') {
    return readWindowsProcessStartedAtMs(pid);
  }
  return readUnixProcessStartedAtMs(pid);
}

async function readUnixProcessStartedAtMs(pid: number): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('ps', ['-p', String(pid), '-o', 'lstart='], {
      timeout: 1_000,
      windowsHide: true
    });
    const firstLine = stdout.trim().split('\n')[0]?.trim();
    if (!firstLine) {
      return null;
    }
    const parsed = Date.parse(firstLine);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function readWindowsProcessStartedAtMs(pid: number): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"; if ($process) { $process.CreationDate }`
      ],
      {
        timeout: 1_000,
        windowsHide: true
      }
    );
    const firstLine = stdout.trim().split('\n')[0]?.trim();
    if (!firstLine) {
      return null;
    }
    const parsedDmtf = parseWindowsProcessCreationDate(firstLine);
    if (parsedDmtf !== null) {
      return parsedDmtf;
    }
    const parsed = Date.parse(firstLine);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseWindowsProcessCreationDate(value: string): number | null {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.\d+)?([+-])(\d{3})$/.exec(
    value.trim()
  );
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second, offsetSign, offsetMinutesRaw] = match;
  const localAsUtcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  const offsetMinutes = Number(offsetMinutesRaw) * (offsetSign === '+' ? 1 : -1);
  return localAsUtcMs - offsetMinutes * 60_000;
}

function appendLockRetryDiagnostics(
  error: Error,
  diagnostics: LockRetryFailureDiagnostics | null
): Error {
  const summary = formatLockRetryFailureDiagnostics(diagnostics);
  if (!summary || error.message.includes('[lock_diagnostics')) {
    return error;
  }
  error.message = `${error.message} ${summary}`;
  return error;
}

export function formatLockRetryFailureDiagnostics(
  diagnostics: LockRetryFailureDiagnostics | null | undefined
): string | null {
  if (!diagnostics) {
    return null;
  }
  const owner = diagnostics.owner;
  const fields = [
    `path=${diagnostics.lockPath}`,
    `owner_format=${owner?.format ?? 'missing'}`,
    `owner_task=${owner?.taskId ?? 'unknown'}`,
    `owner_pid=${owner?.pid ?? 'unknown'}`,
    `owner_host=${owner?.host ?? 'unknown'}`,
    `owner_acquired_at=${owner?.acquiredAt ?? 'unknown'}`,
    `owner_stale_ms=${owner?.staleMs ?? 'unknown'}`,
    `inspected_host=${diagnostics.inspectedHost}`,
    `owner_status=${diagnostics.ownerStatus}`,
    `age_ms=${diagnostics.ageMs === null ? 'unknown' : Math.max(0, Math.round(diagnostics.ageMs))}`,
    `stale_ms=${diagnostics.staleMs}`,
    `recoverable=${diagnostics.recoverable ? 'true' : 'false'}`
  ];
  return `[lock_diagnostics ${fields.join(' ')}]`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
