import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { buildContextObject, ContextStore } from '../../orchestrator/src/cli/rlm/context.ts';
import { runSymbolicLoop } from '../../orchestrator/src/cli/rlm/symbolic.ts';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const DEFAULT_CHUNKING = {
  targetBytes: 65536,
  overlapBytes: 2048,
  strategy: 'byte'
};

const DEFAULT_BUDGETS = {
  maxSubcallsPerIteration: 2,
  maxSearchesPerIteration: 0,
  maxChunkReadsPerIteration: 0,
  maxBytesPerChunkRead: 65536,
  maxSnippetsPerSubcall: 1,
  maxBytesPerSnippet: 65536,
  maxSubcallInputBytes: 131072,
  maxPlannerPromptBytes: 8192,
  searchTopK: 5,
  maxPreviewBytes: 64,
  maxConcurrency: 1
};

const LABEL_ALIASES = new Map([
  ['description and abstract concept', 'description'],
  ['description abstract concept', 'description'],
  ['abstract concept', 'description'],
  ['description', 'description'],
  ['entity', 'entity'],
  ['human being', 'human'],
  ['human', 'human'],
  ['location', 'location'],
  ['numeric value', 'numeric'],
  ['numeric', 'numeric'],
  ['abbreviation', 'abbreviation']
]);

const ENTRY_REGEX = /Date:\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})\s*\|\|\s*User:\s*([0-9]+)\s*\|\|\s*Instance:\s*([\s\S]*?)\s*\|\|\s*Label:\s*([^\n]+?)(?=\s*(Date:|Recall:|$))/g;
const MONTH_INDEX = new Map([
  ['jan', 0],
  ['feb', 1],
  ['mar', 2],
  ['apr', 3],
  ['may', 4],
  ['jun', 5],
  ['jul', 6],
  ['aug', 7],
  ['sep', 8],
  ['oct', 9],
  ['nov', 10],
  ['dec', 11]
]);

export function normalizeLabel(raw) {
  if (!raw) {
    return '';
  }
  const cleaned = String(raw).toLowerCase().replace(/\s+/g, ' ').trim();
  return LABEL_ALIASES.get(cleaned) ?? cleaned;
}

export function extractEntries(text, seen = null) {
  const entries = [];
  if (!text) {
    return entries;
  }
  ENTRY_REGEX.lastIndex = 0;
  let match;
  while ((match = ENTRY_REGEX.exec(text)) !== null) {
    const dateStr = match[1]?.trim() ?? '';
    const userId = match[2]?.trim() ?? '';
    const instance = match[3]?.trim() ?? '';
    const rawLabel = match[4]?.trim() ?? '';
    const label = normalizeLabel(rawLabel);
    const signature = hashEntry(`${userId}|${dateStr}|${label}|${instance}`);
    if (seen && seen.has(signature)) {
      continue;
    }
    if (seen) {
      seen.add(signature);
    }
    const date = dateStr ? parseEntryDateUtc(dateStr) : null;
    entries.push({
      userId,
      label,
      date: Number.isNaN(date?.getTime()) ? null : date,
      signature
    });
  }
  return entries;
}

function parseEntryDateUtc(dateStr) {
  const match = String(dateStr).match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) {
    return null;
  }
  const monthKey = match[1]?.slice(0, 3).toLowerCase();
  const month = MONTH_INDEX.get(monthKey);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month === undefined || !Number.isFinite(day) || !Number.isFinite(year)) {
    return null;
  }
  return new Date(Date.UTC(year, month, day));
}

export function truncateContext(text, contextLenTokens, baselineMaxTokens) {
  if (!text || !contextLenTokens || !baselineMaxTokens) {
    return text ?? '';
  }
  if (contextLenTokens <= baselineMaxTokens) {
    return text;
  }
  const ratio = baselineMaxTokens / contextLenTokens;
  const cutIndex = Math.max(1, Math.floor(text.length * ratio));
  return text.slice(0, cutIndex);
}

export function parseUserIds(question) {
  if (!question) {
    return [];
  }
  const matches = String(question).match(/\b\d{4,}\b/g) ?? [];
  return Array.from(new Set(matches));
}

export function countLabels(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const label = entry.label;
    if (!label) {
      continue;
    }
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

export function buildUserStats(entries) {
  const users = new Map();
  for (const entry of entries) {
    const userId = entry.userId;
    if (!userId) {
      continue;
    }
    let stats = users.get(userId);
    if (!stats) {
      stats = { counts: new Map(), dates: new Map() };
      users.set(userId, stats);
    }
    if (entry.label) {
      stats.counts.set(entry.label, (stats.counts.get(entry.label) ?? 0) + 1);
      if (entry.date) {
        const list = stats.dates.get(entry.label) ?? [];
        list.push(entry.date);
        stats.dates.set(entry.label, list);
      }
    }
  }
  return users;
}

export function chooseLabel(counts, direction = 'max') {
  const entries = Array.from(counts.entries());
  if (entries.length === 0) {
    return null;
  }
  entries.sort((a, b) => {
    const diff = a[1] - b[1];
    if (diff !== 0) {
      return direction === 'max' ? -diff : diff;
    }
    return a[0].localeCompare(b[0]);
  });
  return entries[0]?.[0] ?? null;
}

export function parseGoldAnswer(raw) {
  if (raw === null || raw === undefined) {
    return { labels: new Set(), number: null, raw: '' };
  }
  const text = String(raw).trim();
  let normalized = text;
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try {
      const parsed = JSON.parse(text.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        const labels = parsed.map((item) => normalizeLabel(String(item)));
        return { labels: new Set(labels.filter(Boolean)), number: null, raw: text };
      }
      if (typeof parsed === 'number') {
        return { labels: new Set(), number: parsed, raw: text };
      }
      if (typeof parsed === 'string') {
        normalized = parsed;
      }
    } catch {
      // fall through
    }
  }
  const numberMatch = normalized.match(/-?\d+(\.\d+)?/);
  const labels = new Set();
  for (const [alias, canonical] of LABEL_ALIASES.entries()) {
    if (normalized.toLowerCase().includes(alias)) {
      labels.add(canonical);
    }
  }
  return {
    labels,
    number: numberMatch ? Number(numberMatch[0]) : null,
    raw: normalized
  };
}

export function isLabelAnswerCorrect(predicted, gold) {
  if (!predicted) {
    return false;
  }
  if (gold.labels.size === 0) {
    return normalizeLabel(gold.raw) === normalizeLabel(predicted);
  }
  return gold.labels.has(normalizeLabel(predicted));
}

function resolveCachePath(fixturePath, cachePath) {
  if (!cachePath) {
    return null;
  }
  if (path.isAbsolute(cachePath)) {
    return cachePath;
  }
  if (cachePath.startsWith('./') || cachePath.startsWith('../')) {
    return path.resolve(fixturePath, cachePath);
  }
  return path.resolve(repoRoot, cachePath);
}

export async function loadRowsFromFixture(fixturePath, datasetConfig, requiredFields) {
  if (!datasetConfig || datasetConfig.source === 'local') {
    const localPath = path.resolve(fixturePath, datasetConfig?.local_path ?? 'sample.json');
    const raw = await fs.readFile(localPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.rows ?? [];
  }

  if (datasetConfig.source !== 'hf') {
    throw new Error(`Unsupported dataset source ${datasetConfig.source}`);
  }

  const cachePath = resolveCachePath(fixturePath, datasetConfig.cache_path);
  if (cachePath) {
    try {
      const cached = await fs.readFile(cachePath, 'utf8');
      const parsed = JSON.parse(cached);
      if (parsed?.rows) {
        return parsed.rows;
      }
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // fall through to fetch
    }
  }

  if (datasetConfig.offline) {
    throw new Error('OOLONG dataset offline mode enabled but cache_path is missing or unreadable.');
  }

  const { raw, payload } = await fetchRowsFromHf(datasetConfig, requiredFields);
  if (cachePath) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, raw, 'utf8');
  }
  return payload.rows ?? [];
}

export function groupRowsByLength(rows, targetLengths, tolerance, options = {}) {
  const fallbackTolerance =
    typeof options.fallbackTolerance === 'number' ? options.fallbackTolerance : null;
  const fallbackLengths = new Set(options.fallbackLengths ?? []);
  const buckets = new Map();
  for (const length of targetLengths) {
    buckets.set(length, []);
  }
  for (const row of rows) {
    const ctxLen = Number(row.context_len ?? row.context_length ?? 0);
    if (!ctxLen) {
      continue;
    }
    for (const target of targetLengths) {
      const effectiveTolerance =
        fallbackLengths.has(target) && fallbackTolerance !== null ? fallbackTolerance : tolerance;
      const allowed = effectiveTolerance > 1 ? effectiveTolerance : target * effectiveTolerance;
      if (Math.abs(ctxLen - target) <= allowed) {
        const bucket = buckets.get(target);
        if (bucket) {
          bucket.push(row);
        }
      }
    }
  }
  return buckets;
}

export function sortRowsDeterministically(rows) {
  return [...rows].sort((a, b) => rowSortKey(a).localeCompare(rowSortKey(b)));
}

export function mergeRows(primaryRows, extraRows) {
  const merged = [];
  const seen = new Set();
  const candidates = [...primaryRows, ...extraRows];
  for (const row of candidates) {
    const signature = rowSignature(row);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    merged.push(row);
  }
  return merged;
}

export async function aggregateEntriesRlm(contextText, options) {
  const chunking = { ...DEFAULT_CHUNKING, ...(options?.chunking ?? {}) };
  const budgets = { ...DEFAULT_BUDGETS, ...(options?.budgets ?? {}) };
  budgets.maxBytesPerSnippet = Math.max(budgets.maxBytesPerSnippet, chunking.targetBytes);
  budgets.maxSubcallInputBytes = Math.max(budgets.maxSubcallInputBytes, chunking.targetBytes * 2);

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-oolong-rlm-'));
  try {
    const contextPath = path.join(workDir, 'context.txt');
    await fs.writeFile(contextPath, contextText, 'utf8');

    const runDir = path.join(workDir, 'rlm');
    const contextDir = path.join(workDir, 'context');
    const contextObject = await buildContextObject({
      source: { type: 'file', value: contextPath },
      targetDir: contextDir,
      chunking
    });
    const chunks = contextObject.index.chunks ?? [];
    const pointerPrefix = `ctx:${contextObject.index.object_id}#chunk:`;
    const queue = [...chunks];
    const seen = new Set();
    const aggregated = [];

    let planIndex = 0;
    const maxSubcalls = Math.max(1, budgets.maxSubcallsPerIteration ?? 1);
    const maxIterations = options?.maxIterations ?? Math.ceil(queue.length / maxSubcalls) + 1;

    const runStart = performance.now();
    let pendingFinal = false;
    const result = await runSymbolicLoop({
      goal: 'Extract labeled entries from context',
      baseState: {
        version: 1,
        mode: 'symbolic',
        context: {
          object_id: contextObject.index.object_id,
          index_path: contextObject.indexPath,
          chunk_count: chunks.length
        },
        symbolic_iterations: [],
        goal: 'Extract labeled entries',
        validator: 'none',
        roles: 'single',
        maxIterations,
        maxMinutes: null,
        iterations: []
      },
      maxIterations,
      maxMinutes: null,
      repoRoot: workDir,
      runDir,
      contextStore: new ContextStore(contextObject),
      budgets,
      runPlanner: async () => {
        planIndex += 1;
        if (pendingFinal && queue.length === 0) {
          return JSON.stringify({
            schema_version: 1,
            intent: 'final',
            final_answer: 'done'
          });
        }
        if (queue.length === 0) {
          pendingFinal = true;
          return JSON.stringify({
            schema_version: 1,
            intent: 'continue',
            subcalls: []
          });
        }
        const subcalls = queue.splice(0, maxSubcalls).map((chunk) => ({
          purpose: 'extract',
          snippets: [
            {
              pointer: `${pointerPrefix}${chunk.id}`,
              offset: 0,
              bytes: Math.min(chunk.end - chunk.start, budgets.maxBytesPerSnippet)
            }
          ],
          max_input_bytes: budgets.maxSubcallInputBytes,
          expected_output: 'labels'
        }));
        if (queue.length === 0) {
          pendingFinal = true;
        }
        return JSON.stringify({
          schema_version: 1,
          intent: 'continue',
          subcalls
        });
      },
      runSubcall: async (prompt) => {
        const snippetTexts = extractSnippetTexts(prompt);
        for (const snippet of snippetTexts) {
          const entries = extractEntries(snippet, seen);
          aggregated.push(...entries);
        }
        return JSON.stringify({ extracted: aggregated.length });
      }
    });
    const elapsedMs = Number((performance.now() - runStart).toFixed(3));

    if (result.state.final?.status !== 'passed') {
      throw new Error(`RLM loop status ${result.state.final?.status ?? 'unknown'}`);
    }

    return { entries: aggregated, elapsedMs };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export function extractSnippetTexts(prompt) {
  if (!prompt) {
    return [];
  }
  const texts = [];
  const regex = /Snippet\s+\d+:\n([\s\S]*?)(?=\n\nSnippet\s+\d+:|$)/g;
  let match;
  while ((match = regex.exec(prompt)) !== null) {
    texts.push(match[1] ?? '');
  }
  return texts;
}

function hashEntry(payload) {
  return createHash('sha256').update(payload).digest('hex');
}

function rowSortKey(row) {
  const length = row.context_len ?? row.context_length ?? 0;
  const id = row.context_window_id ?? '';
  const dataset = row.dataset ?? '';
  const task = row.task ?? '';
  return `${length}|${id}|${dataset}|${task}`;
}

function rowSignature(row) {
  if (row.context_window_id) {
    return `id:${row.context_window_id}`;
  }
  const context = row.context_window_text_with_labels ?? row.context_window_text ?? '';
  const question = row.question ?? '';
  const answer = row.answer ?? '';
  const length = row.context_len ?? row.context_length ?? '';
  return createHash('sha256')
    .update(`${length}|${question}|${answer}|${context}`)
    .digest('hex');
}

async function fetchRowsFromHf(datasetConfig, requiredFields) {
  const scriptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'oolong-fetch.py');
  const outputPath = path.join(os.tmpdir(), `oolong-fetch-${Date.now()}.json`);
  const args = [
    scriptPath,
    '--dataset',
    datasetConfig.name,
    '--split',
    datasetConfig.split ?? 'validation',
    '--config',
    datasetConfig.config ?? 'default',
    '--lengths',
    (datasetConfig.context_lengths ?? []).join(','),
    '--max-rows',
    String(datasetConfig.max_rows_per_length ?? 1),
    '--length-tolerance',
    String(datasetConfig.length_tolerance ?? 0),
    '--output',
    outputPath
  ];

  if (datasetConfig.revision) {
    args.push('--revision', datasetConfig.revision);
  }
  if (datasetConfig.dataset_filter) {
    args.push('--dataset-filter', datasetConfig.dataset_filter);
  }
  if (datasetConfig.task_groups && datasetConfig.task_groups.length > 0) {
    args.push('--task-groups', datasetConfig.task_groups.join(','));
  }
  if (datasetConfig.task_types && datasetConfig.task_types.length > 0) {
    args.push('--task-types', datasetConfig.task_types.join(','));
  }
  if (datasetConfig.sample_seed !== undefined && datasetConfig.sample_seed !== null) {
    args.push('--seed', String(datasetConfig.sample_seed));
  }
  if (requiredFields && requiredFields.length > 0) {
    args.push('--fields', requiredFields.join(','));
  }

  try {
    await execFileAsync('python3', args, { timeout: 10 * 60 * 1000 });
  } catch (error) {
    const message = error?.stderr ? String(error.stderr) : error?.message;
    throw new Error(`Failed to fetch OOLONG dataset rows: ${message}`);
  }

  const raw = await fs.readFile(outputPath, 'utf8');
  await fs.rm(outputPath, { force: true });
  const payload = JSON.parse(raw);
  return { raw, payload };
}

export async function loadRowsWithFallback(fixturePath, datasetConfig, requiredFields, options = {}) {
  const lengths = options.lengths ?? datasetConfig.context_lengths ?? [];
  const tolerance = typeof options.tolerance === 'number' ? options.tolerance : datasetConfig.length_tolerance ?? 0;
  const fallbackTolerance =
    typeof options.fallbackTolerance === 'number' ? options.fallbackTolerance : null;
  const cachePath = resolveCachePath(fixturePath, datasetConfig.cache_path);

  const baseRows = await loadRowsFromFixture(fixturePath, datasetConfig, requiredFields);
  const baseBuckets = groupRowsByLength(baseRows, lengths, tolerance);
  const missingLengths = lengths.filter((length) => (baseBuckets.get(length)?.length ?? 0) === 0);
  const fallbackInfo = {
    requested: missingLengths,
    used: [],
    missing: missingLengths,
    tolerance: fallbackTolerance,
    offline: Boolean(datasetConfig.offline)
  };

  if (
    missingLengths.length === 0 ||
    fallbackTolerance === null ||
    fallbackTolerance <= tolerance ||
    datasetConfig.source !== 'hf' ||
    datasetConfig.offline
  ) {
    return { rows: baseRows, buckets: baseBuckets, fallback: fallbackInfo };
  }

  const fallbackDatasetConfig = {
    ...datasetConfig,
    context_lengths: missingLengths,
    length_tolerance: fallbackTolerance
  };
  const { raw, payload } = await fetchRowsFromHf(fallbackDatasetConfig, requiredFields);
  const fallbackRows = Array.isArray(payload) ? payload : payload?.rows ?? [];
  const mergedRows = mergeRows(baseRows, fallbackRows);
  const mergedBuckets = groupRowsByLength(mergedRows, lengths, tolerance, {
    fallbackLengths: missingLengths,
    fallbackTolerance
  });
  const resolved = missingLengths.filter((length) => (mergedBuckets.get(length)?.length ?? 0) > 0);
  fallbackInfo.used = resolved;
  fallbackInfo.missing = missingLengths.filter((length) => !resolved.includes(length));

  if (cachePath && options.writeCache !== false) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(
      cachePath,
      JSON.stringify({ rows: mergedRows, meta: { fallback: fallbackInfo } }, null, 2),
      'utf8'
    );
  } else if (cachePath && options.writeCacheRawFallback === true) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, raw, 'utf8');
  }

  return { rows: mergedRows, buckets: mergedBuckets, fallback: fallbackInfo };
}
