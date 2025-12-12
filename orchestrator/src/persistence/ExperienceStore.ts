import { randomBytes } from 'node:crypto';
import { readFile, mkdir, open, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { sanitizeTaskId } from './sanitizeTaskId.js';
import { writeAtomicFile } from './writeAtomicFile.js';

interface LockRetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

export interface ExperienceStoreOptions {
  outDir?: string;
  runsDir?: string;
  maxSummaryWords?: number;
  lockRetry?: Partial<LockRetryOptions>;
  now?: () => Date;
}

export interface ExperienceReward {
  gtScore: number;
  relativeRank: number;
}

export interface ExperienceToolStat {
  tool: string;
  tokens: number;
  latencyMs: number;
  costUsd: number;
}

export interface ExperienceInput {
  runId: string;
  taskId: string;
  epoch: number | null;
  groupId: string | null;
  summary: string;
  reward: ExperienceReward;
  toolStats: ExperienceToolStat[];
  stampSignature: string;
  domain: string;
}

export interface ExperienceRecord {
  id: string;
  runId: string;
  taskId: string;
  epoch: number | null;
  groupId: string | null;
  summary32: string;
  reward: ExperienceReward;
  toolStats: ExperienceToolStat[];
  stampSignature: string;
  domain: string;
  createdAt: string;
  manifestPath: string;
}

export class ExperienceStoreLockError extends Error {
  constructor(message: string, public readonly taskId: string) {
    super(message);
    this.name = 'ExperienceStoreLockError';
  }
}

const DEFAULT_MAX_WORDS = 32;
const HEX_STAMP_PATTERN = /^[a-f0-9]{64}$/i;

export class ExperienceStore {
  private readonly outDir: string;
  private readonly runsDir: string;
  private readonly maxWords: number;
  private readonly lockRetry: LockRetryOptions;
  private readonly now: () => Date;

  constructor(options: ExperienceStoreOptions = {}) {
    this.outDir = options.outDir ?? join(process.cwd(), 'out');
    this.runsDir = options.runsDir ?? join(process.cwd(), '.runs');
    this.maxWords = Math.max(1, options.maxSummaryWords ?? DEFAULT_MAX_WORDS);
    const defaults: LockRetryOptions = {
      maxAttempts: 5,
      initialDelayMs: 100,
      backoffFactor: 2,
      maxDelayMs: 1000
    };
    const overrides = options.lockRetry ?? {};
    const sanitizedOverrides = Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined)
    ) as Partial<LockRetryOptions>;
    this.lockRetry = { ...defaults, ...sanitizedOverrides };
    this.now = options.now ?? (() => new Date());
  }

  async recordBatch(inputs: ExperienceInput[], manifestPath: string): Promise<ExperienceRecord[]> {
    if (inputs.length === 0) {
      return [];
    }
    const taskIds = new Set(inputs.map((input) => input.taskId));
    if (taskIds.size !== 1) {
      throw new Error('Experience batches must target a single taskId.');
    }
    const taskId = sanitizeTaskId(inputs[0]!.taskId);
    const lockPath = this.buildLockPath(taskId);
    await this.acquireLock(taskId, lockPath);
    try {
      const targetDir = join(this.outDir, taskId);
      await mkdir(targetDir, { recursive: true });
      const filePath = join(targetDir, 'experiences.jsonl');
      const existing = await this.readRecords(filePath);
      const nextRecords = inputs.map((input) => this.prepareRecord(input, manifestPath));
      const serialized = [...existing, ...nextRecords].map((record) => JSON.stringify(record)).join('\n');
      await writeAtomicFile(filePath, `${serialized}\n`);
      return nextRecords;
    } finally {
      await this.releaseLock(lockPath);
    }
  }

  async fetchTop(params: { domain: string; limit: number; minReward?: number; taskId?: string }): Promise<ExperienceRecord[]> {
    const safeDomain = params.domain.trim();
    if (!safeDomain) {
      return [];
    }
    const taskFilter = params.taskId ? sanitizeTaskId(params.taskId) : null;
    const limit = Math.max(0, params.limit);
    if (limit === 0) {
      return [];
    }
    const allRecords = taskFilter
      ? await this.readRecords(join(this.outDir, taskFilter, 'experiences.jsonl'))
      : await this.readAllRecords();
    const filtered = allRecords.filter((record) => {
      if (record.domain !== safeDomain) {
        return false;
      }
      if (taskFilter && record.taskId !== taskFilter) {
        return false;
      }
      return true;
    });
    const scored = filtered
      .map((record) => ({
        record,
        score: record.reward.gtScore + record.reward.relativeRank
      }))
      .filter((entry) => {
        if (params.minReward === undefined) {
          return true;
        }
        return entry.score >= params.minReward;
      })
      .sort((a, b) => {
        if (b.score === a.score) {
          return b.record.createdAt.localeCompare(a.record.createdAt);
        }
        return b.score - a.score;
      });
    return scored.slice(0, limit).map((entry) => entry.record);
  }

  verifyStamp(record: ExperienceRecord): boolean {
    return HEX_STAMP_PATTERN.test(record.stampSignature);
  }

  private prepareRecord(input: ExperienceInput, manifestPath: string): ExperienceRecord {
    if (!HEX_STAMP_PATTERN.test(input.stampSignature)) {
      throw new Error(`Experience stamp ${input.stampSignature} is not a valid SHA-256 digest`);
    }
    if (!input.domain || !input.domain.trim()) {
      throw new Error('Experience domain cannot be empty.');
    }
    const summary32 = truncateSummary(input.summary, this.maxWords);
    const reward = {
      gtScore: Number.isFinite(input.reward.gtScore) ? input.reward.gtScore : 0,
      relativeRank: Number.isFinite(input.reward.relativeRank) ? input.reward.relativeRank : 0
    };
    const toolStats = input.toolStats.map((stat) => ({
      tool: stat.tool,
      tokens: normalizeNumber(stat.tokens),
      latencyMs: normalizeNumber(stat.latencyMs),
      costUsd: normalizeNumber(stat.costUsd)
    }));
    return {
      id: this.generateId(),
      runId: input.runId,
      taskId: sanitizeTaskId(input.taskId),
      epoch: input.epoch ?? null,
      groupId: input.groupId ?? null,
      summary32,
      reward,
      toolStats,
      stampSignature: input.stampSignature,
      domain: input.domain.trim(),
      createdAt: this.now().toISOString(),
      manifestPath
    };
  }

  private buildLockPath(taskId: string): string {
    return join(this.runsDir, `${taskId}.experiences.lock`);
  }

  private async acquireLock(taskId: string, lockPath: string): Promise<void> {
    await mkdir(this.runsDir, { recursive: true });
    const { maxAttempts, initialDelayMs, backoffFactor, maxDelayMs } = this.lockRetry;
    let attempt = 0;
    let delayMs = initialDelayMs;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const handle = await open(lockPath, 'wx');
        await handle.close();
        return;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
        if (attempt >= maxAttempts) {
          throw new ExperienceStoreLockError(
            `Failed to acquire experience lock for ${taskId} after ${attempt} attempts`,
            taskId
          );
        }
        await delay(Math.min(delayMs, maxDelayMs));
        delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
      }
    }
  }

  private async releaseLock(lockPath: string): Promise<void> {
    await rm(lockPath, { force: true });
  }

  private async readRecords(filePath: string): Promise<ExperienceRecord[]> {
    try {
      const raw = await readFile(filePath, 'utf8');
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ExperienceRecord);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async readAllRecords(): Promise<ExperienceRecord[]> {
    const directories = await listDirectories(this.outDir);
    const all: ExperienceRecord[] = [];
    for (const dir of directories) {
      const filePath = join(this.outDir, dir, 'experiences.jsonl');
      all.push(...(await this.readRecords(filePath)));
    }
    return all;
  }

  private generateId(): string {
    const suffix = randomBytes(3).toString('hex');
    return `exp-${Date.now().toString(36)}-${suffix}`;
  }
}

async function listDirectories(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function truncateSummary(value: string, maxWords: number): string {
  const tokens = value.trim().split(/\s+/u).filter(Boolean);
  if (tokens.length <= maxWords) {
    return tokens.join(' ');
  }
  return tokens.slice(0, maxWords).join(' ');
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value;
}
