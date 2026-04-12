import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { listDirectories, resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import { acquireLockWithRetry, type AcquiredLock, type LockRetryOptions } from './lockFile.js';
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

export type ExperienceSourceKind = 'group_id' | 'run_id' | 'manifest_path' | 'stamp_signature';
export type ExperienceExclusionReason = 'raw_score_below_min_score' | 'competitive_score_below_min_score' | 'outcompeted';

export interface ExperienceSelectionPolicy {
  kind: 'competitive_scoring_v1';
  minScore: number;
  scoreWeights: {
    gtScore: number;
    relativeRank: number;
  };
  antiDominanceNormalization: {
    enabled: boolean;
    strength: number;
    sourceGrouping: 'provenance_fallback_v1';
  };
}

export interface ExperienceSelectionCandidate {
  id: string;
  source_key: string;
  source_kind: ExperienceSourceKind;
  raw_score: number;
  competitive_score: number;
  dominance_penalty: number;
  selected: boolean;
  selected_slot: number | null;
  exclusion_reason: ExperienceExclusionReason | null;
}

export interface ExperienceSelectionDiagnostics {
  policy: ExperienceSelectionPolicy;
  candidate_count: number;
  selected_count: number;
  selected_ids: string[];
  suppressed_source_keys: string[];
  selected: Array<{
    id: string;
    source_key: string;
    source_kind: ExperienceSourceKind;
    raw_score: number;
    competitive_score: number;
    dominance_penalty: number;
  }>;
  candidates: ExperienceSelectionCandidate[];
}

export interface ExperienceSelectionResult {
  records: ExperienceRecord[];
  diagnostics: ExperienceSelectionDiagnostics;
}

interface ExperienceSelectionEntry {
  record: ExperienceRecord;
  sourceKey: string;
  sourceKind: ExperienceSourceKind;
  rawScore: number;
  competitiveScore: number;
  dominancePenalty: number;
  selected: boolean;
  selectedSlot: number | null;
  exclusionReason: ExperienceExclusionReason | null;
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
    const lock = await this.acquireLock(taskId, lockPath);
    try {
      const targetDir = join(this.outDir, taskId);
      await mkdir(targetDir, { recursive: true });
      const filePath = join(targetDir, 'experiences.jsonl');
      const nextRecords = inputs.map((input) => this.prepareRecord(input, manifestPath));
      await this.ensureTrailingNewline(filePath);
      const payload = nextRecords.map((record) => JSON.stringify(record)).join('\n');
      await appendFile(filePath, `${payload}\n`, 'utf8');
      return nextRecords;
    } finally {
      await this.releaseLock(lock);
    }
  }

  async fetchTop(params: { domain: string; limit: number; minReward?: number; taskId?: string }): Promise<ExperienceRecord[]> {
    const result = await this.selectTop({
      domain: params.domain,
      limit: params.limit,
      minScore: params.minReward,
      taskId: params.taskId
    });
    return result.records;
  }

  async selectTop(params: {
    domain: string;
    limit: number;
    minScore?: number;
    taskId?: string;
    policy?: Partial<ExperienceSelectionPolicy>;
  }): Promise<ExperienceSelectionResult> {
    const safeDomain = params.domain.trim();
    const policy = resolveExperienceSelectionPolicy(params.policy, params.minScore);
    if (!safeDomain) {
      return emptySelection(policy);
    }
    const taskFilter = params.taskId ? sanitizeTaskId(params.taskId) : null;
    const limit = Math.max(0, params.limit);
    if (limit === 0) {
      return emptySelection(policy);
    }
    const entriesBySource = new Map<string, ExperienceSelectionEntry[]>();
    const sourceCandidateCounts = new Map<string, number>();
    let candidateCount = 0;
    const applyRecord = (record: ExperienceRecord) => {
      if (record.domain !== safeDomain) {
        return;
      }
      if (taskFilter && record.taskId !== taskFilter) {
        return;
      }
      const entry = createSelectionEntry(record, policy);
      candidateCount += 1;
      sourceCandidateCounts.set(entry.sourceKey, (sourceCandidateCounts.get(entry.sourceKey) ?? 0) + 1);
      insertSourceCandidate(entriesBySource, entry, limit);
    };

    if (taskFilter) {
      await this.scanRecords(join(this.outDir, taskFilter, 'experiences.jsonl'), applyRecord);
    } else {
      const directories = await listDirectories(this.outDir);
      for (const dir of directories) {
        await this.scanRecords(join(this.outDir, dir, 'experiences.jsonl'), applyRecord);
      }
    }

    return selectCompetitiveTop(
      [...entriesBySource.values()].flat(),
      limit,
      policy,
      candidateCount,
      sourceCandidateCounts
    );
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

  private async acquireLock(taskId: string, lockPath: string): Promise<AcquiredLock> {
    return await acquireLockWithRetry({
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

  private async releaseLock(lock: AcquiredLock): Promise<void> {
    await lock.release();
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

  private async ensureTrailingNewline(filePath: string): Promise<void> {
    try {
      const handle = await open(filePath, 'r');
      let needsNewline = false;
      try {
        const { size } = await handle.stat();
        if (size === 0) {
          return;
        }
        const buffer = Buffer.alloc(1);
        await handle.read(buffer, 0, 1, size - 1);
        needsNewline = buffer[0] !== 0x0a;
      } finally {
        await handle.close();
      }
      if (needsNewline) {
        await appendFile(filePath, '\n', 'utf8');
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

function emptySelection(policy: ExperienceSelectionPolicy): ExperienceSelectionResult {
  return {
    records: [],
    diagnostics: {
      policy,
      candidate_count: 0,
      selected_count: 0,
      selected_ids: [],
      suppressed_source_keys: [],
      selected: [],
      candidates: []
    }
  };
}

function resolveExperienceSelectionPolicy(
  policy: Partial<ExperienceSelectionPolicy> | undefined,
  minScoreFallback?: number
): ExperienceSelectionPolicy {
  return {
    kind: 'competitive_scoring_v1',
    minScore: normalizeScore(policy?.minScore ?? minScoreFallback ?? 0),
    scoreWeights: {
      gtScore: normalizeScore(policy?.scoreWeights?.gtScore ?? 1),
      relativeRank: normalizeScore(policy?.scoreWeights?.relativeRank ?? 1)
    },
    antiDominanceNormalization: {
      enabled: policy?.antiDominanceNormalization?.enabled ?? true,
      strength: normalizeScore(policy?.antiDominanceNormalization?.strength ?? 0.5),
      sourceGrouping: 'provenance_fallback_v1'
    }
  };
}

function createSelectionEntry(
  record: ExperienceRecord,
  policy: ExperienceSelectionPolicy
): ExperienceSelectionEntry {
  const source = deriveExperienceSource(record);
  const rawScore = roundScore(
    record.reward.gtScore * policy.scoreWeights.gtScore +
      record.reward.relativeRank * policy.scoreWeights.relativeRank
  );
  return {
    record,
    sourceKey: source.key,
    sourceKind: source.kind,
    rawScore,
    competitiveScore: rawScore,
    dominancePenalty: 0,
    selected: false,
    selectedSlot: null,
    exclusionReason: rawScore < policy.minScore ? 'raw_score_below_min_score' : null
  };
}

function insertSourceCandidate(
  entriesBySource: Map<string, ExperienceSelectionEntry[]>,
  entry: ExperienceSelectionEntry,
  limit: number
): void {
  const bucket = entriesBySource.get(entry.sourceKey) ?? [];
  let insertAt = 0;
  while (
    insertAt < bucket.length &&
    compareSelectionEntriesByRaw(bucket[insertAt]!, entry) <= 0
  ) {
    insertAt += 1;
  }
  bucket.splice(insertAt, 0, entry);
  if (bucket.length > limit) {
    bucket.pop();
  }
  entriesBySource.set(entry.sourceKey, bucket);
}

function selectCompetitiveTop(
  entries: ExperienceSelectionEntry[],
  limit: number,
  policy: ExperienceSelectionPolicy,
  candidateCount = entries.length,
  sourceCandidateCounts: Map<string, number> = new Map()
): ExperienceSelectionResult {
  const remaining = entries.filter((entry) => entry.exclusionReason === null);
  const selectedCounts = new Map<string, number>();
  const selectedEntries: ExperienceSelectionEntry[] = [];

  for (let slot = 1; slot <= limit && remaining.length > 0; slot += 1) {
    for (const entry of remaining) {
      const priorSelections = selectedCounts.get(entry.sourceKey) ?? 0;
      const dominancePenalty =
        policy.antiDominanceNormalization.enabled
          ? roundScore(policy.antiDominanceNormalization.strength * priorSelections)
          : 0;
      entry.dominancePenalty = dominancePenalty;
      entry.competitiveScore = roundScore(entry.rawScore - dominancePenalty);
    }

    remaining.sort(compareSelectionEntries);
    const best = remaining[0];
    if (!best || best.competitiveScore < policy.minScore) {
      for (const entry of remaining) {
        entry.exclusionReason = 'competitive_score_below_min_score';
      }
      break;
    }

    best.selected = true;
    best.selectedSlot = slot;
    best.exclusionReason = null;
    selectedEntries.push(best);
    selectedCounts.set(best.sourceKey, (selectedCounts.get(best.sourceKey) ?? 0) + 1);
    remaining.shift();
  }

  for (const entry of remaining) {
    if (entry.exclusionReason === null) {
      entry.exclusionReason = 'outcompeted';
    }
  }

  if (sourceCandidateCounts.size === 0) {
    for (const entry of entries) {
      sourceCandidateCounts.set(entry.sourceKey, (sourceCandidateCounts.get(entry.sourceKey) ?? 0) + 1);
    }
  }
  const suppressedSourceKeys = [...sourceCandidateCounts.entries()]
    .filter(([sourceKey, count]) => count > (selectedCounts.get(sourceKey) ?? 0))
    .map(([sourceKey]) => sourceKey)
    .sort((a, b) => a.localeCompare(b));

  return {
    records: selectedEntries.map((entry) => entry.record),
    diagnostics: {
      policy,
      candidate_count: candidateCount,
      selected_count: selectedEntries.length,
      selected_ids: selectedEntries.map((entry) => entry.record.id),
      suppressed_source_keys: suppressedSourceKeys,
      selected: selectedEntries.map((entry) => ({
        id: entry.record.id,
        source_key: entry.sourceKey,
        source_kind: entry.sourceKind,
        raw_score: entry.rawScore,
        competitive_score: entry.competitiveScore,
        dominance_penalty: entry.dominancePenalty
      })),
      candidates: entries
        .slice()
        .sort((a, b) => compareSelectionEntries(a, b))
        .map((entry) => ({
          id: entry.record.id,
          source_key: entry.sourceKey,
          source_kind: entry.sourceKind,
          raw_score: entry.rawScore,
          competitive_score: entry.competitiveScore,
          dominance_penalty: entry.dominancePenalty,
          selected: entry.selected,
          selected_slot: entry.selectedSlot,
          exclusion_reason: entry.exclusionReason
        }))
    }
  };
}

function deriveExperienceSource(record: ExperienceRecord): { kind: ExperienceSourceKind; key: string } {
  if (record.groupId && record.groupId.trim()) {
    return { kind: 'group_id', key: record.groupId.trim() };
  }
  if (record.runId && record.runId.trim()) {
    return { kind: 'run_id', key: record.runId.trim() };
  }
  if (record.manifestPath && record.manifestPath.trim()) {
    return { kind: 'manifest_path', key: record.manifestPath.trim() };
  }
  return { kind: 'stamp_signature', key: record.stampSignature };
}

function compareSelectionEntries(
  a: Pick<ExperienceSelectionEntry, 'record' | 'rawScore' | 'competitiveScore'>,
  b: Pick<ExperienceSelectionEntry, 'record' | 'rawScore' | 'competitiveScore'>
): number {
  if (a.competitiveScore !== b.competitiveScore) {
    return b.competitiveScore - a.competitiveScore;
  }
  return compareSelectionEntriesByRaw(a, b);
}

function compareSelectionEntriesByRaw(
  a: Pick<ExperienceSelectionEntry, 'record' | 'rawScore'>,
  b: Pick<ExperienceSelectionEntry, 'record' | 'rawScore'>
): number {
  if (a.rawScore !== b.rawScore) {
    return b.rawScore - a.rawScore;
  }
  const aTime = a.record.createdAt ?? '';
  const bTime = b.record.createdAt ?? '';
  const timeCompare = bTime.localeCompare(aTime);
  if (timeCompare !== 0) {
    return timeCompare;
  }
  return a.record.id.localeCompare(b.record.id);
}

function roundScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizeScore(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
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
