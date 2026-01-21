import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import {
  aggregateEntriesRlm,
  countLabels,
  chooseLabel,
  extractEntries,
  groupRowsByLength,
  isLabelAnswerCorrect,
  loadRowsWithFallback,
  parseGoldAnswer,
  parseUserIds,
  sortRowsDeterministically,
  truncateContext
} from './oolong-shared.mjs';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  if (idx === -1) {
    return undefined;
  }
  return args[idx + 1];
};

const fixturePath = getArg('--fixture') ?? process.cwd();
const configPath = getArg('--config') ?? path.join(fixturePath, 'fixture.json');
const outputOverride = getArg('--output');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const defaultOutputRoot = path.join(os.tmpdir(), 'codex-rlm-oolong');
const defaultOutputPath = path.join(defaultOutputRoot, `results-${Date.now()}.json`);
const outputPath = outputOverride ? path.resolve(outputOverride) : defaultOutputPath;

const DEFAULT_SIZES = [8000, 16000, 33000, 66000, 131000, 262000, 524000, 1000000];
const DEFAULT_TASK_TYPES = ['TASK_TYPE.MOST_FREQ', 'TASK_TYPE.LEAST_FREQ'];

const configRaw = await fs.readFile(configPath, 'utf8');
const config = JSON.parse(configRaw);

const sizes = Array.from(
  new Set((Array.isArray(config.sizes) ? config.sizes : DEFAULT_SIZES).map((size) => Math.max(1, Math.floor(size))))
).sort((a, b) => a - b);

const datasetConfig = config.dataset ? { ...config.dataset } : { source: 'local' };
if (!datasetConfig.source) {
  datasetConfig.source = 'local';
}
const taskTypes = Array.isArray(config.task_types) && config.task_types.length > 0
  ? config.task_types
  : DEFAULT_TASK_TYPES;
const maxRowsPerLength = typeof config.max_rows_per_length === 'number' ? config.max_rows_per_length : 1;
const baselineMaxTokens = typeof config.baseline_max_context_tokens === 'number'
  ? config.baseline_max_context_tokens
  : 131000;
const tolerance = typeof config.length_tolerance === 'number' ? config.length_tolerance : 0;
const fallbackConfig = config.fallback ?? {};
const fallbackTolerance =
  typeof fallbackConfig.length_tolerance === 'number' ? fallbackConfig.length_tolerance : null;
const syntheticConfig = config.synthetic ?? null;
const repeatabilityConfig = config.repeatability ?? {};
const repeatRuns =
  typeof repeatabilityConfig.runs === 'number' ? Math.max(1, Math.floor(repeatabilityConfig.runs)) : 1;
const rlmConfig = config.rlm ?? {};

datasetConfig.task_types = taskTypes;
datasetConfig.context_lengths = sizes;

const { rows, buckets: baseBuckets, fallback } = await loadRowsWithFallback(
  fixturePath,
  datasetConfig,
  [
    'context_window_id',
    'context_len',
    'context_window_text_with_labels',
    'question',
    'answer',
    'task',
    'task_group',
    'input_subset',
    'answer_type',
    'dataset'
  ],
  {
    lengths: sizes,
    tolerance,
    fallbackTolerance,
    writeCache: fallbackConfig.write_cache
  }
);

const syntheticEnabled = Boolean(syntheticConfig?.enabled);
const expandedRows = syntheticEnabled
  ? expandRowsForSynthetic(rows, sizes, baselineMaxTokens, syntheticConfig)
  : rows;
const buckets = syntheticEnabled
  ? groupRowsByLength(expandedRows, sizes, tolerance)
  : baseBuckets;

const fallbackNotes = buildFallbackNotesMap(sizes, fallback, buckets);
const results = [];

const benchmarkResults = await runBenchmark(buckets);
results.push(...benchmarkResults);

const repeatability =
  repeatRuns > 1 ? await runRepeatabilityChecks(buckets, benchmarkResults) : null;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      fixture: path.relative(repoRoot, fixturePath),
      sizes,
      dataset: datasetConfig,
      task_types: taskTypes,
      fallback,
      repeatability,
      results
    },
    null,
    2
  ),
  'utf8'
);

console.log(`Wrote ${outputPath}`);

async function runBenchmark(bucketMap) {
  const runResults = [];
  for (const size of sizes) {
    const bucket = bucketMap.get(size) ?? [];
    const limited = sortRowsDeterministically(bucket).slice(0, maxRowsPerLength);
    if (limited.length === 0) {
      const note = fallbackNotes.get(size);
      const notes = note ? `no matching samples; ${note}` : 'no matching samples';
      runResults.push({
        context_length: size,
        sample_count: 0,
        baseline_correct_pct: 0,
        rlm_correct_pct: 0,
        baseline_avg_ms: 0,
        rlm_avg_ms: 0,
        notes
      });
      continue;
    }

    let baselineCorrect = 0;
    let rlmCorrect = 0;
    let baselineMs = 0;
    let rlmMs = 0;
    let evaluated = 0;

    for (const row of limited) {
      const contextText = row.context_window_text_with_labels ?? row.context_window_text ?? '';
      const question = row.question ?? '';
      const taskType = row.task ?? '';
      if (!taskTypes.includes(taskType)) {
        continue;
      }

      const gold = parseGoldAnswer(row.answer);

      const startBaseline = performance.now();
      const truncated = truncateContext(contextText, row.context_len, baselineMaxTokens);
      const baselineEntries = extractEntries(truncated);
      const baselineAnswer = solveOolong(taskType, question, baselineEntries);
      baselineMs += performance.now() - startBaseline;
      if (isLabelAnswerCorrect(baselineAnswer, gold)) {
        baselineCorrect += 1;
      }

      const startRlm = performance.now();
      const rlmResult = await aggregateEntriesRlm(contextText, rlmConfig);
      rlmMs += performance.now() - startRlm;
      const rlmAnswer = solveOolong(taskType, question, rlmResult.entries);
      if (isLabelAnswerCorrect(rlmAnswer, gold)) {
        rlmCorrect += 1;
      }
      evaluated += 1;
    }

    const trials = Math.max(1, evaluated);
    const note = fallbackNotes.get(size);
    runResults.push({
      context_length: size,
      sample_count: evaluated,
      baseline_correct_pct: Number(((baselineCorrect / trials) * 100).toFixed(2)),
      rlm_correct_pct: Number(((rlmCorrect / trials) * 100).toFixed(2)),
      baseline_avg_ms: Number((baselineMs / trials).toFixed(3)),
      rlm_avg_ms: Number((rlmMs / trials).toFixed(3)),
      ...(note ? { notes: note } : {})
    });
  }
  return runResults;
}

async function runRepeatabilityChecks(bucketMap, baselineResults) {
  const baselineHash = hashResults(baselineResults);
  let matched = true;
  let mismatchRun = null;
  for (let idx = 2; idx <= repeatRuns; idx += 1) {
    const nextResults = await runBenchmark(bucketMap);
    const nextHash = hashResults(nextResults);
    if (nextHash !== baselineHash) {
      matched = false;
      mismatchRun = idx;
      break;
    }
  }
  return {
    runs: repeatRuns,
    matched,
    hash: baselineHash,
    ...(mismatchRun ? { mismatch_run: mismatchRun } : {})
  };
}

function hashResults(rows) {
  const normalized = rows.map((row) => ({
    context_length: row.context_length,
    sample_count: row.sample_count,
    baseline_correct_pct: row.baseline_correct_pct,
    rlm_correct_pct: row.rlm_correct_pct
  }));
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function buildFallbackNotesMap(targetSizes, fallbackInfo, bucketMap = null) {
  const notes = new Map();
  if (!fallbackInfo) {
    return notes;
  }
  const requested = new Set(fallbackInfo.requested ?? []);
  const used = new Set(fallbackInfo.used ?? []);
  const missing = new Set(fallbackInfo.missing ?? []);
  for (const size of targetSizes) {
    if (!requested.has(size)) {
      continue;
    }
    const hasBucket = bucketMap?.get?.(size)?.length > 0;
    const parts = [];
    if (used.has(size)) {
      parts.push(`fallback tolerance ${fallbackInfo.tolerance}`);
    }
    if (!hasBucket && missing.has(size)) {
      parts.push('fallback missing');
    }
    if (fallbackInfo.offline) {
      parts.push('offline');
    }
    if (parts.length > 0) {
      notes.set(size, parts.join('; '));
    }
  }
  return notes;
}

function expandRowsForSynthetic(rows, targetSizes, baselineMaxTokens, config) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return rows;
  }
  const prefixLabel = config?.prefix_label ?? 'spam';
  const suffixLabel = config?.suffix_label ?? (prefixLabel === 'spam' ? 'ham' : 'spam');
  const prefixPadding =
    typeof config?.prefix_padding === 'number' ? Math.max(0, Math.floor(config.prefix_padding)) : 512;
  const instancePadding =
    typeof config?.instance_padding === 'number' ? Math.max(0, Math.floor(config.instance_padding)) : 32;
  const expanded = [];

  for (const size of targetSizes) {
    for (const template of rows) {
      const contextLen = Number(template.context_len ?? 0);
      if (size <= baselineMaxTokens && contextLen === size) {
        expanded.push(template);
        continue;
      }
      if (size <= baselineMaxTokens && contextLen !== size) {
        continue;
      }
      const synthetic = buildSyntheticRow(template, size, baselineMaxTokens, {
        prefixLabel,
        suffixLabel,
        prefixPadding,
        instancePadding
      });
      expanded.push(synthetic);
    }
  }

  return expanded;
}

function buildSyntheticRow(template, targetLength, baselineMaxTokens, options) {
  const { text, counts } = buildSyntheticLinearContext(targetLength, baselineMaxTokens, options);
  const labelCounts = new Map(Object.entries(counts));
  const goldLabel =
    template.task === 'TASK_TYPE.LEAST_FREQ'
      ? chooseLabel(labelCounts, 'min')
      : chooseLabel(labelCounts, 'max');
  return {
    ...template,
    context_len: targetLength,
    context_window_id: `${template.context_window_id ?? 'oolong'}-synthetic-${targetLength}`,
    context_window_text_with_labels: text,
    answer: goldLabel ? `['${goldLabel}']` : template.answer,
    dataset: 'synthetic',
    synthetic: true
  };
}

function buildSyntheticLinearContext(targetLength, baselineMaxTokens, options) {
  const prefixMajor = options?.prefixLabel ?? 'spam';
  const prefixMinor = prefixMajor === 'spam' ? 'ham' : 'spam';
  const suffixMajor = options?.suffixLabel ?? (prefixMajor === 'spam' ? 'ham' : 'spam');
  const suffixMinor = suffixMajor === 'spam' ? 'ham' : 'spam';
  const prefixPadding = options?.prefixPadding ?? 512;
  const instancePadding = options?.instancePadding ?? 32;
  const prefixTarget = Math.min(targetLength, baselineMaxTokens + prefixPadding);

  const lines = [];
  const counts = {};
  let prefixLen = 0;
  let totalLen = 0;
  let lineIndex = 0;

  while (prefixLen < prefixTarget) {
    const label = lineIndex % 10 === 0 ? prefixMinor : prefixMajor;
    const line = buildSyntheticLine(lineIndex, label, instancePadding);
    lines.push(line);
    const lineLen = line.length + 1;
    prefixLen += lineLen;
    totalLen += lineLen;
    counts[label] = (counts[label] ?? 0) + 1;
    lineIndex += 1;
  }

  while (totalLen < targetLength) {
    const label = lineIndex % 10 === 0 ? suffixMinor : suffixMajor;
    const line = buildSyntheticLine(lineIndex, label, instancePadding);
    lines.push(line);
    const lineLen = line.length + 1;
    totalLen += lineLen;
    counts[label] = (counts[label] ?? 0) + 1;
    lineIndex += 1;
  }

  const lineCount = lines.length;
  const header =
    `The following lines contain ${lineCount} text messages, one per line. ` +
    'Each line consists of a date, a user id, and an instance.';
  const recall = `Recall: the preceding lines contain ${lineCount} text messages, one per line.`;
  return {
    text: [header, ...lines, recall].join('\n'),
    counts
  };
}

function buildSyntheticLine(index, label, instancePadding) {
  const date = formatSyntheticDate(index);
  const userId = 10000 + (index % 9000);
  const instance = `Synthetic entry ${index} ${'x'.repeat(instancePadding)}`;
  return `Date: ${date} || User: ${userId} || Instance: ${instance} || Label: ${label}`;
}

function formatSyntheticDate(offset) {
  const base = new Date(Date.UTC(2023, 0, 1 + offset));
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = months[base.getUTCMonth()];
  const day = String(base.getUTCDate()).padStart(2, '0');
  return `${month} ${day}, ${base.getUTCFullYear()}`;
}

function solveOolong(taskType, question, entries) {
  const scopedEntries = filterEntriesByQuestion(entries, question);
  const counts = countLabels(scopedEntries);

  if (taskType === 'TASK_TYPE.MOST_FREQ') {
    return chooseLabel(counts, 'max');
  }
  if (taskType === 'TASK_TYPE.LEAST_FREQ') {
    return chooseLabel(counts, 'min');
  }
  if (taskType === 'TASK_TYPE.COUNT_LABEL') {
    const label = chooseLabelFromQuestion(question, counts);
    if (!label) {
      return null;
    }
    return String(counts.get(label) ?? 0);
  }
  if (taskType === 'TASK_TYPE.COUNT_LABEL_COMPARISON') {
    const [first, second] = chooseLabelPairFromQuestion(question, counts);
    if (!first || !second) {
      return null;
    }
    return counts.get(first) > counts.get(second) ? 'yes' : 'no';
  }
  return null;
}

function filterEntriesByQuestion(entries, question) {
  if (!question) {
    return entries;
  }
  const userIds = parseUserIds(question);
  if (userIds.length === 0) {
    return entries;
  }
  const userSet = new Set(userIds);
  return entries.filter((entry) => userSet.has(entry.userId));
}

function chooseLabelFromQuestion(question, counts) {
  const lower = String(question).toLowerCase();
  for (const label of counts.keys()) {
    if (lower.includes(label)) {
      return label;
    }
  }
  return counts.keys().next().value ?? null;
}

function chooseLabelPairFromQuestion(question, counts) {
  const lower = String(question).toLowerCase();
  const matches = [];
  for (const label of counts.keys()) {
    if (lower.includes(label)) {
      matches.push(label);
    }
  }
  if (matches.length >= 2) {
    return matches.slice(0, 2);
  }
  const keys = Array.from(counts.keys());
  return [keys[0] ?? null, keys[1] ?? null];
}
