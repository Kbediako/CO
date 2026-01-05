import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { listDirectories, resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import { acquireLockWithRetry, type LockRetryOptions } from './lockFile.js';
import { sanitizeTaskId } from './sanitizeTaskId.js';

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
    const envPaths = resolveEnvironmentPaths();
    this.outDir = options.outDir ?? envPaths.outRoot;
    this.runsDir = options.runsDir ?? envPaths.runsRoot;
    this.maxWords = Math.max(1, options.maxSummaryWords ?? DEFAULT_MAX_WORDS);
    const defaults: LockRetryOptions = {
      maxAttempts: 5,
      initialDelayMs: 100,
      backoffFactor: 2,
      maxDelayMs: 1000,
      staleMs: 5 * 60 * 1000
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
      const nextRecords = inputs.map((input) => this.prepareRecord(input, manifestPath));
      const payload = nextRecords.map((record) => JSON.stringify(record)).join('\n');
      await appendFile(filePath, `${payload}\n`, 'utf8');
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
    const collector = createTopKCollector(limit, params.minReward);
    const applyRecord = (record: ExperienceRecord) => {
      if (record.domain !== safeDomain) {
        return;
      }
      if (taskFilter && record.taskId !== taskFilter) {
        return;
      }
      collector.add(record);
    };

    if (taskFilter) {
      await this.scanRecords(join(this.outDir, taskFilter, 'experiences.jsonl'), applyRecord);
    } else {
      const directories = await listDirectories(this.outDir);
      for (const dir of directories) {
        await this.scanRecords(join(this.outDir, dir, 'experiences.jsonl'), applyRecord);
      }
    }

    return collector.finalize();
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
    await acquireLockWithRetry({
      taskId,
      lockPath,
      retry: this.lockRetry,
      ensureDirectory: async () => {
        await mkdir(this.runsDir, { recursive: true });
      },
      createError: (id, attempts) =>
        new ExperienceStoreLockError(
          `Failed to acquire experience lock for ${id} after ${attempts} attempts`,
          id
        )
    });
  }

  private async releaseLock(lockPath: string): Promise<void> {
    await rm(lockPath, { force: true });
  }

  private async scanRecords(
    filePath: string,
    onRecord: (record: ExperienceRecord) => void
  ): Promise<void> {
    try {
      const stream = createReadStream(filePath, { encoding: 'utf8' });
      const reader = createInterface({ input: stream, crlfDelay: Infinity });
      for await (const line of reader) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        try {
          const record = JSON.parse(trimmed) as ExperienceRecord;
          onRecord(record);
        } catch {
          continue;
        }
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  private generateId(): string {
    const suffix = randomBytes(3).toString('hex');
    return `exp-${Date.now().toString(36)}-${suffix}`;
  }
}

function createTopKCollector(limit: number, minReward?: number): {
  add: (record: ExperienceRecord) => void;
  finalize: () => ExperienceRecord[];
} {
  const entries: Array<{ record: ExperienceRecord; score: number }> = [];
  const threshold = typeof minReward === 'number' ? minReward : null;

  const compare = (
    a: { record: ExperienceRecord; score: number },
    b: { record: ExperienceRecord; score: number }
  ): number => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    const aTime = a.record.createdAt ?? '';
    const bTime = b.record.createdAt ?? '';
    return aTime.localeCompare(bTime);
  };

  const add = (record: ExperienceRecord) => {
    const score = record.reward.gtScore + record.reward.relativeRank;
    if (threshold !== null && score < threshold) {
      return;
    }
    const entry = { record, score };
    if (entries.length === 0) {
      entries.push(entry);
      return;
    }
    const worst = entries[0];
    if (entries.length >= limit && worst && compare(entry, worst) <= 0) {
      return;
    }
    let index = 0;
    while (index < entries.length && compare(entries[index]!, entry) <= 0) {
      index += 1;
    }
    entries.splice(index, 0, entry);
    if (entries.length > limit) {
      entries.shift();
    }
  };

  const finalize = () =>
    entries
      .slice()
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        const aTime = a.record.createdAt ?? '';
        const bTime = b.record.createdAt ?? '';
        return bTime.localeCompare(aTime);
      })
      .map((entry) => entry.record);

  return { add, finalize };
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
