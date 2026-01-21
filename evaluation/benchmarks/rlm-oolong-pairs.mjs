import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import {
  aggregateEntriesRlm,
  buildUserStats,
  extractEntries,
  groupRowsByLength,
  loadRowsWithFallback,
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
const defaultOutputRoot = path.join(os.tmpdir(), 'codex-rlm-oolong-pairs');
const defaultOutputPath = path.join(defaultOutputRoot, `results-${Date.now()}.json`);
const outputPath = outputOverride ? path.resolve(outputOverride) : defaultOutputPath;

const DEFAULT_SIZES = [8000, 16000, 33000, 66000, 131000, 262000, 524000, 1000000];

const configRaw = await fs.readFile(configPath, 'utf8');
const config = JSON.parse(configRaw);

const sizes = Array.from(
  new Set((Array.isArray(config.sizes) ? config.sizes : DEFAULT_SIZES).map((size) => Math.max(1, Math.floor(size))))
).sort((a, b) => a - b);

const datasetConfig = config.dataset ? { ...config.dataset } : { source: 'local' };
if (!datasetConfig.source) {
  datasetConfig.source = 'local';
}
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

datasetConfig.context_lengths = sizes;

const { rows, buckets: baseBuckets, fallback } = await loadRowsWithFallback(
  fixturePath,
  datasetConfig,
  [
    'context_window_id',
    'context_len',
    'context_window_text_with_labels',
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
  ? expandPairRowsForSynthetic(rows, sizes, baselineMaxTokens, syntheticConfig)
  : rows;
const buckets = syntheticEnabled
  ? groupRowsByLength(expandedRows, sizes, tolerance)
  : baseBuckets;

const DATE_JAN_6 = new Date(Date.UTC(2023, 0, 6));
const DATE_MAR_15 = new Date(Date.UTC(2023, 2, 15));
const DATE_FEB_1 = new Date(Date.UTC(2023, 1, 1));
const DATE_APR_10 = new Date(Date.UTC(2023, 3, 10));
const DATE_MAY_20 = new Date(Date.UTC(2023, 4, 20));

const PAIR_TASKS = [
  {
    id: 1,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) => hasAny(user, ['numeric', 'location']))
      )
  },
  {
    id: 2,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) => hasAny(user, ['entity', 'human']))
      )
  },
  {
    id: 3,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) => hasAny(user, ['description', 'abbreviation']))
      )
  },
  {
    id: 4,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) =>
          hasAny(user, ['human', 'location']) && allDatesAfter(user, 'human', DATE_JAN_6)
        )
      )
  },
  {
    id: 5,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) =>
          hasAny(user, ['entity', 'numeric']) && allDatesBefore(user, 'entity', DATE_MAR_15)
        )
      )
  },
  {
    id: 6,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) => hasAny(user, ['location', 'abbreviation']))
      )
  },
  {
    id: 7,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) =>
          hasAny(user, ['description', 'numeric']) && allDatesAfter(user, 'numeric', DATE_FEB_1)
        )
      )
  },
  {
    id: 8,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) => hasAny(user, ['human', 'description']))
      )
  },
  {
    id: 9,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) =>
          hasAny(user, ['entity', 'location']) && allDatesAfter(user, 'location', DATE_APR_10)
        )
      )
  },
  {
    id: 10,
    buildPairs: (stats) =>
      makePairsFromEligible(
        userIdsFor(stats, (user) =>
          hasAny(user, ['numeric', 'abbreviation']) && allDatesBefore(user, 'abbreviation', DATE_MAY_20)
        )
      )
  },
  {
    id: 11,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasAtLeast(user, 'entity', 1) && hasAtLeast(user, 'abbreviation', 1)),
        userIdsFor(stats, (user) => hasExactly(user, 'entity', 1))
      )
  },
  {
    id: 12,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasAtLeast(user, 'numeric', 2)),
        userIdsFor(stats, (user) => hasAtLeast(user, 'location', 1) && hasAtLeast(user, 'human', 1))
      )
  },
  {
    id: 13,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasExactly(user, 'description', 1)),
        userIdsFor(stats, (user) => hasAtLeast(user, 'abbreviation', 1) && hasAtLeast(user, 'entity', 1))
      )
  },
  {
    id: 14,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasAtLeast(user, 'human', 1) && hasAtLeast(user, 'numeric', 1)),
        userIdsFor(stats, (user) => hasExactly(user, 'location', 2))
      )
  },
  {
    id: 15,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) =>
          hasAtLeast(user, 'entity', 1) &&
          hasAtLeast(user, 'location', 1) &&
          hasAtLeast(user, 'abbreviation', 1)
        ),
        userIdsFor(stats, (user) => hasExactly(user, 'numeric', 1))
      )
  },
  {
    id: 16,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasAtLeast(user, 'description', 1) && hasAtLeast(user, 'human', 1)),
        userIdsFor(stats, (user) => hasAtLeast(user, 'entity', 2) && hasExactly(user, 'abbreviation', 1))
      )
  },
  {
    id: 17,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasExactly(user, 'numeric', 1)),
        userIdsFor(stats, (user) => hasAtLeast(user, 'location', 1) && hasAtLeast(user, 'description', 1))
      )
  },
  {
    id: 18,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasAtLeast(user, 'abbreviation', 1) && hasExactly(user, 'human', 1)),
        userIdsFor(stats, (user) => hasAtLeast(user, 'entity', 1) && hasAtLeast(user, 'numeric', 1))
      )
  },
  {
    id: 19,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasAtLeast(user, 'location', 2) && hasAtLeast(user, 'entity', 1)),
        userIdsFor(stats, (user) => hasExactly(user, 'description', 1) && hasExactly(user, 'abbreviation', 1))
      )
  },
  {
    id: 20,
    buildPairs: (stats) =>
      makePairsFromGroups(
        userIdsFor(stats, (user) => hasAtLeast(user, 'numeric', 1) && hasAtLeast(user, 'human', 1)),
        userIdsFor(stats, (user) =>
          hasAtLeast(user, 'location', 1) &&
          hasAtLeast(user, 'entity', 1) &&
          hasExactly(user, 'abbreviation', 1)
        )
      )
  }
];

const fallbackNotes = buildFallbackNotesMap(sizes, fallback, buckets);
const results = [];

try {
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
} finally {
  // no-op
}

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
        task_count: 0,
        baseline_f1_avg: 0,
        rlm_f1_avg: 0,
        baseline_perfect_pct: 0,
        rlm_perfect_pct: 0,
        baseline_avg_ms: 0,
        rlm_avg_ms: 0,
        notes
      });
      continue;
    }

    let baselineF1 = 0;
    let rlmF1 = 0;
    let baselinePerfect = 0;
    let rlmPerfect = 0;
    let baselineMs = 0;
    let rlmMs = 0;
    let taskCount = 0;

    for (const row of limited) {
      const contextText = row.context_window_text_with_labels ?? row.context_window_text ?? '';
      const goldEntries = extractEntries(contextText);
      const goldStats = buildUserStats(goldEntries);

      const startBaseline = performance.now();
      const truncated = truncateContext(contextText, row.context_len, baselineMaxTokens);
      const baselineEntries = extractEntries(truncated);
      baselineMs += performance.now() - startBaseline;
      const baselineStats = buildUserStats(baselineEntries);

      const startRlm = performance.now();
      const rlmResult = await aggregateEntriesRlm(contextText, rlmConfig);
      rlmMs += performance.now() - startRlm;
      const rlmStats = buildUserStats(rlmResult.entries);

      for (const task of PAIR_TASKS) {
        const goldPairs = task.buildPairs(goldStats);
        const baselinePairs = task.buildPairs(baselineStats);
        const rlmPairs = task.buildPairs(rlmStats);

        const baselineF1Score = f1Score(baselinePairs, goldPairs);
        const rlmF1Score = f1Score(rlmPairs, goldPairs);

        baselineF1 += baselineF1Score;
        rlmF1 += rlmF1Score;
        baselinePerfect += baselineF1Score === 1 ? 1 : 0;
        rlmPerfect += rlmF1Score === 1 ? 1 : 0;
        taskCount += 1;
      }
    }

    const totalTasks = Math.max(1, taskCount);
    const samples = limited.length;
    const note = fallbackNotes.get(size);
    runResults.push({
      context_length: size,
      sample_count: samples,
      task_count: totalTasks,
      baseline_f1_avg: Number((baselineF1 / totalTasks).toFixed(4)),
      rlm_f1_avg: Number((rlmF1 / totalTasks).toFixed(4)),
      baseline_perfect_pct: Number(((baselinePerfect / totalTasks) * 100).toFixed(2)),
      rlm_perfect_pct: Number(((rlmPerfect / totalTasks) * 100).toFixed(2)),
      baseline_avg_ms: Number((baselineMs / samples).toFixed(3)),
      rlm_avg_ms: Number((rlmMs / samples).toFixed(3)),
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
    task_count: row.task_count,
    baseline_f1_avg: row.baseline_f1_avg,
    rlm_f1_avg: row.rlm_f1_avg,
    baseline_perfect_pct: row.baseline_perfect_pct,
    rlm_perfect_pct: row.rlm_perfect_pct
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

function expandPairRowsForSynthetic(rows, targetSizes, baselineMaxTokens, config) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return rows;
  }
  const prefixPadding =
    typeof config?.prefix_padding === 'number' ? Math.max(0, Math.floor(config.prefix_padding)) : 512;
  const instancePadding =
    typeof config?.instance_padding === 'number' ? Math.max(0, Math.floor(config.instance_padding)) : 24;

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
      const synthetic = buildSyntheticPairRow(template, size, baselineMaxTokens, {
        prefixPadding,
        instancePadding
      });
      expanded.push(synthetic);
    }
  }
  return expanded;
}

function buildSyntheticPairRow(template, targetLength, baselineMaxTokens, options) {
  const contextText = buildSyntheticPairsContext(
    template.context_window_text_with_labels ?? template.context_window_text ?? '',
    targetLength,
    baselineMaxTokens,
    options
  );
  return {
    ...template,
    context_len: targetLength,
    context_window_id: `${template.context_window_id ?? 'oolong-pairs'}-synthetic-${targetLength}`,
    context_window_text_with_labels: contextText,
    dataset: 'synthetic',
    synthetic: true
  };
}

function buildSyntheticPairsContext(sourceText, targetLength, baselineMaxTokens, options) {
  const prefixLines = extractContextLines(sourceText);
  const existingUsers = extractUserIds(prefixLines);
  const prefixTarget = Math.min(targetLength, baselineMaxTokens + (options?.prefixPadding ?? 512));

  const lines = [...prefixLines];
  let totalLen = lines.reduce((sum, line) => sum + line.length + 1, 0);
  let padIndex = 0;

  while (totalLen < prefixTarget) {
    const userId = existingUsers[padIndex % existingUsers.length] ?? 1001;
    const instance = `Padding entry ${padIndex} ${'x'.repeat(options?.instancePadding ?? 24)}`;
    const line = buildPairLine({
      date: formatSyntheticDate(padIndex + 200),
      userId,
      instance,
      label: 'other'
    });
    lines.push(line);
    totalLen += line.length + 1;
    padIndex += 1;
  }

  const profiles = [
    [
      { label: 'numeric value', date: 'Feb 10, 2023' },
      { label: 'location', date: 'Apr 20, 2023' }
    ],
    [
      { label: 'entity', date: 'Mar 01, 2023' },
      { label: 'human being', date: 'Jan 10, 2023' }
    ],
    [
      { label: 'description and abstract concept', date: 'Mar 20, 2023' },
      { label: 'abbreviation', date: 'May 01, 2023' }
    ]
  ];

  let syntheticUserId = 3001;
  let profileIndex = 0;
  while (totalLen < targetLength) {
    const entries = profiles[profileIndex % profiles.length];
    const userId = syntheticUserId;
    syntheticUserId += 1;
    profileIndex += 1;

    for (const entry of entries) {
      const instance = `Synthetic entry ${userId}-${profileIndex} ${'x'.repeat(options?.instancePadding ?? 24)}`;
      const line = buildPairLine({
        date: entry.date,
        userId,
        instance,
        label: entry.label
      });
      lines.push(line);
      totalLen += line.length + 1;
      if (totalLen >= targetLength) {
        break;
      }
    }
  }

  const lineCount = lines.length;
  const header =
    `The following lines contain ${lineCount} questions, one per line. ` +
    'Each line consists of a date, a user id, and an instance.';
  const recall = `Recall: the preceding lines contain ${lineCount} questions, one per line.`;
  return [header, ...lines, recall].join('\n');
}

function extractContextLines(text) {
  if (!text) {
    return [];
  }
  return text.split('\n').filter((line) => line.startsWith('Date:'));
}

function extractUserIds(lines) {
  const ids = [];
  for (const line of lines) {
    const match = line.match(/User:\s*([0-9]+)/);
    if (match?.[1]) {
      ids.push(Number(match[1]));
    }
  }
  return ids.length > 0 ? ids : [1001];
}

function buildPairLine({ date, userId, instance, label }) {
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

function f1Score(predicted, gold) {
  if (predicted.size === 0 && gold.size === 0) {
    return 1;
  }
  if (predicted.size === 0 || gold.size === 0) {
    return 0;
  }
  let tp = 0;
  for (const pair of predicted) {
    if (gold.has(pair)) {
      tp += 1;
    }
  }
  const precision = tp / predicted.size;
  const recall = tp / gold.size;
  if (precision + recall === 0) {
    return 0;
  }
  return (2 * precision * recall) / (precision + recall);
}

function makePairsFromEligible(userIds) {
  const sorted = Array.from(userIds).sort();
  const pairs = new Set();
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      pairs.add(`${sorted[i]}|${sorted[j]}`);
    }
  }
  return pairs;
}

function makePairsFromGroups(groupA, groupB) {
  const pairs = new Set();
  for (const a of groupA) {
    for (const b of groupB) {
      if (a === b) {
        continue;
      }
      const first = a < b ? a : b;
      const second = a < b ? b : a;
      pairs.add(`${first}|${second}`);
    }
  }
  return pairs;
}

function hasAtLeast(user, label, count) {
  return (user.counts.get(label) ?? 0) >= count;
}

function hasExactly(user, label, count) {
  return (user.counts.get(label) ?? 0) === count;
}

function hasAny(user, labels) {
  return labels.some((label) => (user.counts.get(label) ?? 0) > 0);
}

function allDatesAfter(user, label, date) {
  const dates = user.dates.get(label) ?? [];
  if (dates.length === 0) {
    return true;
  }
  return dates.every((value) => value.getTime() > date.getTime());
}

function allDatesBefore(user, label, date) {
  const dates = user.dates.get(label) ?? [];
  if (dates.length === 0) {
    return true;
  }
  return dates.every((value) => value.getTime() < date.getTime());
}

function userIdsFor(stats, predicate) {
  const ids = new Set();
  for (const [userId, user] of stats.entries()) {
    if (predicate(user)) {
      ids.add(userId);
    }
  }
  return ids;
}
