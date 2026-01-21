import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { buildContextObject, ContextStore } from '../../orchestrator/src/cli/rlm/context.ts';
import { runSymbolicLoop } from '../../orchestrator/src/cli/rlm/symbolic.ts';

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
const defaultOutputRoot = path.join(os.tmpdir(), 'codex-rlm-context-scale');
const defaultOutputPath = path.join(defaultOutputRoot, `results-${Date.now()}.json`);
const outputPath = outputOverride ? path.resolve(outputOverride) : defaultOutputPath;

const DEFAULT_SIZES = [8000, 16000, 33000, 66000, 131000, 262000, 524000, 1000000];
const DEFAULT_NEEDLE = '<<NEEDLE:ORCH-RLM>>';
const DEFAULT_INSERT_RATIOS = [0.1, 0.3, 0.5, 0.7, 0.9];
const DEFAULT_INSERT_RATIO = 0.7;
const DEFAULT_CHUNKING = {
  targetBytes: 1024,
  overlapBytes: 0,
  strategy: 'byte'
};
const DEFAULT_BUDGETS = {
  maxSubcallsPerIteration: 1,
  maxSearchesPerIteration: 1,
  maxChunkReadsPerIteration: 1,
  maxBytesPerChunkRead: 1024,
  maxSnippetsPerSubcall: 1,
  maxBytesPerSnippet: 128,
  maxSubcallInputBytes: 512,
  maxPlannerPromptBytes: 8192,
  searchTopK: 5,
  maxPreviewBytes: 64,
  maxConcurrency: 1
};

const configRaw = await fs.readFile(configPath, 'utf8');
const config = JSON.parse(configRaw);

const sizes = Array.from(
  new Set((Array.isArray(config.sizes) ? config.sizes : DEFAULT_SIZES).map((size) => Math.max(1, Math.floor(size))))
).sort((a, b) => a - b);
const needle = typeof config.needle === 'string' ? config.needle : DEFAULT_NEEDLE;
const insertRatios = Array.isArray(config.insert_ratios) && config.insert_ratios.length > 0
  ? config.insert_ratios
  : (typeof config.insert_ratio === 'number' ? [config.insert_ratio] : DEFAULT_INSERT_RATIOS);
const trials = typeof config.trials === 'number' && config.trials > 0 ? Math.floor(config.trials) : insertRatios.length;
const baselineMaxChars = Number.isFinite(config.baseline_max_context_chars)
  ? Math.floor(config.baseline_max_context_chars)
  : null;
if (baselineMaxChars === null) {
  if (config.baseline_max_context_tokens !== undefined && config.baseline_max_context_tokens !== null) {
    throw new Error(
      'baseline_max_context_tokens is not supported for rlm-context-scale; use baseline_max_context_chars.'
    );
  }
  throw new Error('baseline_max_context_chars is required for rlm-context-scale.');
}
if (baselineMaxChars < 1) {
  throw new Error('baseline_max_context_chars must be >= 1.');
}
const chunking = { ...DEFAULT_CHUNKING, ...(config.chunking ?? {}) };
const budgets = { ...DEFAULT_BUDGETS, ...(config.budgets ?? {}) };
const maxIterations = typeof config.maxIterations === 'number' ? config.maxIterations : 2;

function ratioForTrial(index) {
  if (insertRatios.length === 0) {
    return DEFAULT_INSERT_RATIO;
  }
  const ratio = insertRatios[index % insertRatios.length];
  if (typeof ratio === 'number' && ratio >= 0 && ratio <= 1) {
    return ratio;
  }
  return DEFAULT_INSERT_RATIO;
}

function buildContextText(length, insertRatio) {
  if (length <= needle.length) {
    return needle.slice(0, length);
  }
  const base =
    'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega\n';
  let text = '';
  while (text.length < length) {
    text += base;
  }
  text = text.slice(0, length);
  const insertAt = Math.max(0, Math.min(length - needle.length, Math.floor(length * insertRatio)));
  return text.slice(0, insertAt) + needle + text.slice(insertAt + needle.length);
}

async function baselineSearch(filePath) {
  const start = performance.now();
  const buffer = await fs.readFile(filePath);
  const limitedBuffer =
    baselineMaxChars && buffer.length > baselineMaxChars ? buffer.subarray(0, baselineMaxChars) : buffer;
  const idx = limitedBuffer.indexOf(needle);
  const ms = Number((performance.now() - start).toFixed(3));
  return { ms, found: idx >= 0 };
}

async function rlmSearch(filePath, runDir) {
  const contextDir = path.join(runDir, 'context');
  await fs.mkdir(contextDir, { recursive: true });

  const buildStart = performance.now();
  const contextObject = await buildContextObject({
    source: { type: 'file', value: filePath },
    targetDir: contextDir,
    chunking
  });
  const buildMs = Number((performance.now() - buildStart).toFixed(3));

  const chunks = contextObject.index.chunks;
  if (!chunks || chunks.length === 0) {
    throw new Error('Context index produced no chunks.');
  }

  const contextInfo = {
    object_id: contextObject.index.object_id,
    index_path: contextObject.indexPath,
    chunk_count: chunks.length
  };

  const baseState = {
    version: 1,
    mode: 'symbolic',
    context: contextInfo,
    symbolic_iterations: [],
    goal: 'Locate the needle and summarize context',
    validator: 'none',
    roles: 'single',
    maxIterations,
    maxMinutes: null,
    iterations: []
  };

  const pointer = `ctx:${contextInfo.object_id}#chunk:${chunks[0].id}`;
  const plans = [
    JSON.stringify({
      schema_version: 1,
      intent: 'continue',
      searches: [{ query: needle, top_k: budgets.searchTopK ?? 5 }],
      subcalls: [
        {
          purpose: 'summarize',
          snippets: [{ pointer, offset: 0, bytes: budgets.maxBytesPerSnippet ?? 128 }],
          max_input_bytes: budgets.maxSubcallInputBytes ?? 512,
          expected_output: 'summary'
        }
      ]
    }),
    JSON.stringify({ schema_version: 1, intent: 'final', final_answer: 'done' })
  ];

  let planIndex = 0;
  const loopStart = performance.now();
  const result = await runSymbolicLoop({
    goal: baseState.goal,
    baseState,
    maxIterations,
    maxMinutes: null,
    repoRoot: runDir,
    runDir: path.join(runDir, 'rlm'),
    contextStore: new ContextStore(contextObject),
    budgets,
    runPlanner: async () => plans[planIndex++] ?? plans[plans.length - 1],
    runSubcall: async () => 'summary output'
  });
  const loopMs = Number((performance.now() - loopStart).toFixed(3));

  const found = result.state.symbolic_iterations.some((iteration) =>
    (iteration.searches ?? []).some((search) =>
      (search.hits ?? []).some((hit) => hit.preview.includes(needle))
    )
  );

  return { buildMs, loopMs, status: result.state.final?.status ?? 'unknown', found };
}

const workingRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-rlm-context-'));
const results = [];

try {
for (const size of sizes) {
  let baselineCorrect = 0;
  let rlmCorrect = 0;
  let baselineMs = 0;
  let rlmTotalMs = 0;
  let contextBytes = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const ratio = ratioForTrial(trial);
    const text = buildContextText(size, ratio);
    contextBytes = Buffer.byteLength(text, 'utf8');
    const filePath = path.join(workingRoot, `context-${size}-trial-${trial}.txt`);
    await fs.writeFile(filePath, text, 'utf8');

    const baseline = await baselineSearch(filePath);
    baselineMs += baseline.ms;
    if (baseline.found) {
      baselineCorrect += 1;
    }

    const runDir = path.join(workingRoot, `run-${size}-trial-${trial}`);
    await fs.mkdir(runDir, { recursive: true });
    const rlm = await rlmSearch(filePath, runDir);
    rlmTotalMs += rlm.buildMs + rlm.loopMs;
    if (rlm.found) {
      rlmCorrect += 1;
    }

    if (rlm.status !== 'passed') {
      throw new Error(`RLM loop status ${rlm.status} for size ${size}.`);
    }
  }

  results.push({
    context_length: size,
    context_bytes: contextBytes,
    trials,
    baseline_correct_pct: Number(((baselineCorrect / trials) * 100).toFixed(2)),
    rlm_correct_pct: Number(((rlmCorrect / trials) * 100).toFixed(2)),
    baseline_avg_ms: Number((baselineMs / trials).toFixed(3)),
    rlm_avg_ms: Number((rlmTotalMs / trials).toFixed(3))
  });
}

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify({
      fixture: path.relative(repoRoot, fixturePath),
      sizes,
      needle,
      results
    }, null, 2),
    'utf8'
  );

  console.log(`Wrote ${outputPath}`);
} finally {
  await fs.rm(workingRoot, { recursive: true, force: true });
}
