import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type {
  RlmLoopResult,
  RlmState,
  RlmSymbolicIteration,
  RlmSymbolicRead,
  RlmSymbolicSearch,
  RlmSymbolicSnippet,
  RlmSymbolicSpan,
  RlmSymbolicSubcall
} from './types.js';
import { ContextStore } from './context.js';

const DEFAULT_ALLOWED_PURPOSES = new Set(['summarize', 'extract', 'classify', 'verify']);

export interface SymbolicBudgets {
  maxSubcallsPerIteration: number;
  maxSearchesPerIteration: number;
  maxChunkReadsPerIteration: number;
  maxBytesPerChunkRead: number;
  maxSnippetsPerSubcall: number;
  maxBytesPerSnippet: number;
  maxSubcallInputBytes: number;
  maxPlannerPromptBytes: number;
  searchTopK: number;
  maxPreviewBytes: number;
  maxConcurrency: number;
}

export interface SymbolicLoopOptions {
  goal: string;
  baseState: RlmState;
  maxIterations: number;
  maxMinutes: number | null;
  repoRoot: string;
  runDir: string;
  contextStore: ContextStore;
  budgets: SymbolicBudgets;
  runPlanner: (prompt: string, attempt: number) => Promise<string>;
  runSubcall: (prompt: string, meta: { id: string; purpose: string }) => Promise<string>;
  now?: () => string;
  logger?: (line: string) => void;
}

interface PlannerPlan {
  schema_version: number;
  intent: 'continue' | 'final' | 'pause' | 'fail';
  reads?: Array<Record<string, unknown>>;
  searches?: Array<Record<string, unknown>>;
  subcalls?: Array<Record<string, unknown>>;
  final_answer?: string;
}

interface PlannerValidationResult {
  plan: PlannerPlan;
  reads: RlmSymbolicRead[];
  searches: RlmSymbolicSearch[];
  subcalls: Array<{
    id: string;
    purpose: string;
    snippets: RlmSymbolicSnippet[];
    spans: RlmSymbolicSpan[];
    max_input_bytes: number;
  }>;
  clamped: {
    reads: boolean;
    searches: boolean;
    subcalls: boolean;
  };
}

function byteLength(value: string): number {
  return Buffer.byteLength(value ?? '', 'utf8');
}

function truncateUtf8ToBytes(value: string, maxBytes: number): string {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    return '';
  }
  const limit = Math.floor(maxBytes);
  if (limit <= 0) {
    return '';
  }
  const buffer = Buffer.from(value ?? '', 'utf8');
  if (buffer.length <= limit) {
    return value ?? '';
  }
  let end = limit;
  let start = end - 1;
  while (start >= 0 && (buffer[start] & 0b1100_0000) === 0b1000_0000) {
    start -= 1;
  }
  if (start < 0) {
    return '';
  }
  const lead = buffer[start];
  let length = 1;
  if ((lead & 0b1111_1000) === 0b1111_0000) {
    length = 4;
  } else if ((lead & 0b1111_0000) === 0b1110_0000) {
    length = 3;
  } else if ((lead & 0b1110_0000) === 0b1100_0000) {
    length = 2;
  }
  if (start + length > end) {
    end = start;
  }
  return buffer.slice(0, end).toString('utf8');
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function extractJsonCandidate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return null;
}

function parsePlannerOutput(raw: string): PlannerPlan {
  const candidate = extractJsonCandidate(raw);
  if (!candidate) {
    throw new Error('plan_parse_error');
  }
  const parsed = JSON.parse(candidate) as PlannerPlan;
  return parsed;
}

function normalizePurpose(raw: unknown): { value: string; replaced: boolean } {
  if (typeof raw === 'string' && DEFAULT_ALLOWED_PURPOSES.has(raw)) {
    return { value: raw, replaced: false };
  }
  return { value: 'summarize', replaced: true };
}

function validatePlan(
  plan: PlannerPlan,
  budgets: SymbolicBudgets
): PlannerValidationResult {
  if (plan.schema_version !== 1) {
    throw new Error('plan_validation_error');
  }
  if (!['continue', 'final', 'pause', 'fail'].includes(plan.intent)) {
    throw new Error('plan_validation_error');
  }
  if (plan.intent === 'final') {
    if (typeof plan.final_answer !== 'string' || plan.final_answer.trim().length === 0) {
      throw new Error('plan_validation_error');
    }
  }

  const reads: RlmSymbolicRead[] = [];
  const rawReads = Array.isArray(plan.reads) ? plan.reads : [];
  for (const entry of rawReads) {
    const bytes = toNumber(entry?.bytes);
    if (!bytes || bytes <= 0) {
      throw new Error('plan_validation_error');
    }
    const pointer = typeof entry?.pointer === 'string' ? entry.pointer : undefined;
    const offset = toNumber(entry?.offset);
    const startByte = toNumber(entry?.start_byte);
    if (!pointer && startByte === null) {
      throw new Error('plan_validation_error');
    }
    reads.push({
      pointer,
      offset: pointer ? (offset ?? 0) : undefined,
      start_byte: !pointer ? (startByte ?? undefined) : undefined,
      bytes: Math.min(bytes, budgets.maxBytesPerChunkRead),
      reason: typeof entry?.reason === 'string' ? entry.reason : undefined
    });
  }

  const searches: RlmSymbolicSearch[] = [];
  const rawSearches = Array.isArray(plan.searches) ? plan.searches : [];
  for (const entry of rawSearches) {
    const query = typeof entry?.query === 'string' ? entry.query.trim() : '';
    if (!query) {
      throw new Error('plan_validation_error');
    }
    const topK = toNumber(entry?.top_k);
    searches.push({
      query,
      top_k: topK && topK > 0 ? Math.floor(topK) : budgets.searchTopK,
      reason: typeof entry?.reason === 'string' ? entry.reason : undefined
    });
  }

  const subcalls: PlannerValidationResult['subcalls'] = [];
  const rawSubcalls = Array.isArray(plan.subcalls) ? plan.subcalls : [];
  for (const entry of rawSubcalls) {
    const purposeInfo = normalizePurpose(entry?.purpose);
    const maxInputBytes = toNumber(entry?.max_input_bytes);
    if (!maxInputBytes || maxInputBytes <= 0) {
      throw new Error('plan_validation_error');
    }
    const snippets: RlmSymbolicSnippet[] = [];
    const spans: RlmSymbolicSpan[] = [];
    const rawSnippets = Array.isArray(entry?.snippets) ? entry.snippets : [];
    const rawSpans = Array.isArray(entry?.spans) ? entry.spans : [];

    for (const snippet of rawSnippets) {
      const bytes = toNumber(snippet?.bytes);
      if (!bytes || bytes <= 0) {
        throw new Error('plan_validation_error');
      }
      const pointer = typeof snippet?.pointer === 'string' ? snippet.pointer : undefined;
      const offset = toNumber(snippet?.offset);
      const startByte = toNumber(snippet?.start_byte);
      if (!pointer && startByte === null) {
        throw new Error('plan_validation_error');
      }
      snippets.push({
        pointer,
        offset: pointer ? (offset ?? 0) : undefined,
        start_byte: !pointer ? (startByte ?? undefined) : undefined,
        bytes: Math.min(bytes, budgets.maxBytesPerSnippet)
      });
    }

    for (const span of rawSpans) {
      const startByte = toNumber(span?.start_byte);
      const endByte = toNumber(span?.end_byte);
      if (startByte === null || endByte === null || endByte <= startByte) {
        throw new Error('plan_validation_error');
      }
      spans.push({
        start_byte: Math.floor(startByte),
        end_byte: Math.floor(endByte)
      });
    }

    if (snippets.length === 0 && spans.length === 0) {
      throw new Error('plan_validation_error');
    }

    subcalls.push({
      id: '',
      purpose: purposeInfo.value,
      snippets,
      spans,
      max_input_bytes: Math.floor(maxInputBytes)
    });
  }

  const readsClamped = reads.length > budgets.maxChunkReadsPerIteration;
  const searchesClamped = searches.length > budgets.maxSearchesPerIteration;
  const subcallsClamped = subcalls.length > budgets.maxSubcallsPerIteration;

  return {
    plan,
    reads: reads.slice(0, budgets.maxChunkReadsPerIteration),
    searches: searches.slice(0, budgets.maxSearchesPerIteration),
    subcalls: subcalls.slice(0, budgets.maxSubcallsPerIteration),
    clamped: {
      reads: readsClamped,
      searches: searchesClamped,
      subcalls: subcallsClamped
    }
  };
}

function buildPlannerPrompt(params: {
  goal: string;
  contextStore: ContextStore;
  budgets: SymbolicBudgets;
  priorReads: Array<{ pointer: string; excerpt: string }>;
  priorSearches: Array<{ query: string; results: Array<{ pointer: string; preview: string }> }>;
  priorSubcalls: Array<{ id: string; output: string }>;
}): { prompt: string; truncation: RlmSymbolicIteration['truncation'] } {
  const { goal, contextStore, budgets, priorReads, priorSearches, priorSubcalls } = params;

  const baseLines: string[] = [
    'You are a symbolic RLM planner. Return JSON only (no prose).',
    `Goal: ${goal}`,
    `Context object_id: ${contextStore.objectId}`,
    `Chunk count: ${contextStore.chunkCount}`,
    `Pointer format: ctx:<object_id>#chunk:<chunk_id>`,
    '',
    'Schema (v1):',
    '{',
    '  "schema_version": 1,',
    '  "intent": "continue | final | pause | fail",',
    '  "reads": [{ "pointer": "ctx:<object_id>#chunk:<chunk_id>", "offset": 0, "bytes": 4096, "reason": "..." }],',
    '  "searches": [{ "query": "...", "top_k": 20, "reason": "..." }],',
    '  "subcalls": [{ "purpose": "summarize | extract | classify | verify", "snippets": [{ "pointer": "ctx:<object_id>#chunk:<chunk_id>", "offset": 0, "bytes": 2048 }], "max_input_bytes": 120000, "expected_output": "short summary" }],',
    '  "final_answer": "required when intent=final"',
    '}',
    '',
    'Constraints:',
    `- Limit reads to ${budgets.maxChunkReadsPerIteration}, searches to ${budgets.maxSearchesPerIteration}, subcalls to ${budgets.maxSubcallsPerIteration}.`,
    `- Max bytes per read: ${budgets.maxBytesPerChunkRead}.`,
    `- Max bytes per snippet: ${budgets.maxBytesPerSnippet}.`,
    '- Do not include full context; use pointers.',
    '- Request at least one subcall before intent=final.',
    ''
  ];

  const sections: Array<{ key: keyof NonNullable<RlmSymbolicIteration['truncation']>; lines: string[] }> = [];
  if (priorSearches.length > 0) {
    const lines = ['Prior search results:'];
    for (const entry of priorSearches) {
      lines.push(`- query: ${entry.query}`);
      for (const result of entry.results) {
        lines.push(`  - ${result.pointer}: ${result.preview}`);
      }
    }
    sections.push({ key: 'searches_dropped', lines });
  }
  if (priorReads.length > 0) {
    const lines = ['Prior read excerpts:'];
    for (const entry of priorReads) {
      lines.push(`- ${entry.pointer}: ${entry.excerpt}`);
    }
    sections.push({ key: 'reads_dropped', lines });
  }
  if (priorSubcalls.length > 0) {
    const lines = ['Prior subcall outputs:'];
    for (const entry of priorSubcalls) {
      lines.push(`- ${entry.id}: ${entry.output}`);
    }
    sections.push({ key: 'subcalls_dropped', lines });
  }

  let truncation: NonNullable<RlmSymbolicIteration['truncation']> = {};
  let prompt = [...baseLines];
  for (const section of sections) {
    prompt.push('', ...section.lines);
  }

  const maxBytes = budgets.maxPlannerPromptBytes;
  let promptString = prompt.join('\n');
  if (byteLength(promptString) <= maxBytes) {
    return { prompt: promptString, truncation };
  }

  for (const section of sections) {
    truncation = { ...truncation, [section.key]: true };
    prompt = prompt.filter((line) => !section.lines.includes(line));
    promptString = prompt.join('\n');
    if (byteLength(promptString) <= maxBytes) {
      return { prompt: promptString, truncation };
    }
  }

  if (byteLength(promptString) > maxBytes) {
    truncation = { ...truncation, prompt_truncated: true };
    promptString = truncateUtf8ToBytes(promptString, maxBytes);
  }

  return { prompt: promptString, truncation };
}

async function writeState(path: string, state: RlmState): Promise<void> {
  await writeFile(path, JSON.stringify(state, null, 2), 'utf8');
}

export async function runSymbolicLoop(options: SymbolicLoopOptions): Promise<RlmLoopResult> {
  const log = options.logger ?? (() => undefined);
  const runDir = options.runDir;
  const statePath = join(runDir, 'state.json');

  const state: RlmState = {
    ...options.baseState,
    symbolic_iterations: [],
    iterations: options.baseState.iterations ?? []
  };

  await mkdir(runDir, { recursive: true });

  const maxIterations = options.maxIterations;
  const maxMinutes = options.maxMinutes ?? null;
  const startTime = Date.now();
  const deadline = maxMinutes && maxMinutes > 0 ? startTime + maxMinutes * 60 * 1000 : null;

  if (maxIterations === 0 && !deadline) {
    state.final = { status: 'invalid_config', exitCode: 5 };
    await writeState(statePath, state);
    return { state, exitCode: 5, error: 'unbounded symbolic run' };
  }

  const timeExceeded = (): boolean => deadline !== null && Date.now() >= deadline;

  let priorReads: Array<{ pointer: string; excerpt: string }> = [];
  let priorSearches: Array<{ query: string; results: Array<{ pointer: string; preview: string }> }> = [];
  let priorSubcalls: Array<{ id: string; output: string }> = [];

  const finalize = async (status: RlmState['final']): Promise<RlmLoopResult> => {
    state.final = status ?? { status: 'error', exitCode: 10 };
    await writeState(statePath, state);
    return { state, exitCode: state.final.exitCode };
  };

  try {
    for (let iteration = 1; maxIterations === 0 || iteration <= maxIterations; iteration += 1) {
      if (timeExceeded()) {
        return await finalize({ status: 'max_minutes', exitCode: 3 });
      }

      const promptResult = buildPlannerPrompt({
        goal: options.goal,
        contextStore: options.contextStore,
        budgets: options.budgets,
        priorReads,
        priorSearches,
        priorSubcalls
      });
      const plannerPrompt = promptResult.prompt;
      const plannerPromptBytes = byteLength(plannerPrompt);

      let plan: PlannerPlan | null = null;
      let validation: PlannerValidationResult | null = null;
      const plannerErrors: string[] = [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const raw = await options.runPlanner(
          attempt === 0
            ? plannerPrompt
            : `Return valid JSON only. Previous error: ${plannerErrors.join('; ')}\n\n${plannerPrompt}`,
          attempt
        );
        try {
          plan = parsePlannerOutput(raw);
        } catch {
          plannerErrors.push('plan_parse_error');
          if (attempt === 0) {
            continue;
          }
          return await finalize({ status: 'invalid_config', exitCode: 5 });
        }
        try {
          validation = validatePlan(plan, options.budgets);
          break;
        } catch {
          plannerErrors.push('plan_validation_error');
          if (attempt === 0) {
            continue;
          }
          return await finalize({ status: 'invalid_config', exitCode: 5 });
        }
      }

      if (!plan || !validation) {
        return await finalize({ status: 'invalid_config', exitCode: 5 });
      }

      const reads: RlmSymbolicRead[] = [];
      const subcalls: RlmSymbolicSubcall[] = [];
      const searches: RlmSymbolicSearch[] = [];

      if (plan.intent === 'final') {
        state.symbolic_iterations.push({
          iteration,
          planner_prompt_bytes: plannerPromptBytes,
          reads,
          subcalls,
          searches,
          planner_errors: plannerErrors.length > 0 ? plannerErrors : undefined,
          clamped: {
            reads: validation.clamped.reads,
            searches: validation.clamped.searches,
            subcalls: validation.clamped.subcalls
          },
          truncation: promptResult.truncation
        });
        await writeState(statePath, state);
        return await finalize({ status: 'passed', exitCode: 0, final_answer: plan.final_answer });
      }

      if (plan.intent === 'pause' || plan.intent === 'fail') {
        state.symbolic_iterations.push({
          iteration,
          planner_prompt_bytes: plannerPromptBytes,
          reads,
          subcalls,
          searches,
          planner_errors: plannerErrors.length > 0 ? plannerErrors : undefined,
          clamped: {
            reads: validation.clamped.reads,
            searches: validation.clamped.searches,
            subcalls: validation.clamped.subcalls
          },
          truncation: promptResult.truncation
        });
        await writeState(statePath, state);
        return await finalize({ status: 'invalid_config', exitCode: 5 });
      }

      const currentSearches: Array<{ query: string; results: Array<{ pointer: string; preview: string }> }> = [];
      for (const search of validation.searches) {
        const topK = search.top_k ?? options.budgets.searchTopK;
        const results = await options.contextStore.search(
          search.query,
          topK,
          options.budgets.maxPreviewBytes
        );
        currentSearches.push({
          query: search.query,
          results: results.map((hit) => ({ pointer: hit.pointer, preview: hit.preview }))
        });
        searches.push(search);
      }
      priorSearches = currentSearches;

      const readExcerpts: Array<{ pointer: string; excerpt: string }> = [];
      for (const read of validation.reads) {
        if (read.pointer) {
          const result = await options.contextStore.read(
            read.pointer,
            read.offset ?? 0,
            read.bytes
          );
          readExcerpts.push({
            pointer: read.pointer,
            excerpt: truncateUtf8ToBytes(result.text, options.budgets.maxBytesPerChunkRead)
          });
        } else if (typeof read.start_byte === 'number') {
          const result = await options.contextStore.readSpan(read.start_byte, read.bytes);
          readExcerpts.push({
            pointer: `start_byte:${read.start_byte}`,
            excerpt: truncateUtf8ToBytes(result.text, options.budgets.maxBytesPerChunkRead)
          });
        }
        reads.push(read);
      }

      priorReads = readExcerpts;

      const subcallRoot = join(runDir, 'subcalls', String(iteration));
      await mkdir(subcallRoot, { recursive: true });

      let subcallIndex = 0;
      const currentSubcallOutputs: Array<{ id: string; output: string }> = [];
      for (const rawSubcall of validation.subcalls) {
        subcallIndex += 1;
        const subcallId = `sc${String(subcallIndex).padStart(4, '0')}`;
        const subcallDir = join(subcallRoot, subcallId);
        await mkdir(subcallDir, { recursive: true });

        const maxSnippets = options.budgets.maxSnippetsPerSubcall;
        const snippets = rawSubcall.snippets.slice(0, maxSnippets);
        const spans = rawSubcall.spans.slice(0, maxSnippets);
        const clampedSnippets = rawSubcall.snippets.length > snippets.length || rawSubcall.spans.length > spans.length;

        const resolvedSnippets: Array<{ meta: RlmSymbolicSnippet | RlmSymbolicSpan; text: string }> = [];
        for (const snippet of snippets) {
          if (snippet.pointer) {
            const result = await options.contextStore.read(
              snippet.pointer,
              snippet.offset ?? 0,
              snippet.bytes
            );
            resolvedSnippets.push({ meta: snippet, text: result.text });
          } else if (typeof snippet.start_byte === 'number') {
            const result = await options.contextStore.readSpan(snippet.start_byte, snippet.bytes);
            resolvedSnippets.push({ meta: snippet, text: result.text });
          }
        }
        for (const span of spans) {
          const bytes = span.end_byte - span.start_byte;
          const result = await options.contextStore.readSpan(span.start_byte, bytes);
          resolvedSnippets.push({ meta: span, text: result.text });
        }

        let totalBytes = 0;
        const maxInput = Math.min(rawSubcall.max_input_bytes, options.budgets.maxSubcallInputBytes);
        const maxInputClamped = rawSubcall.max_input_bytes > maxInput;
        const snippetBlocks: string[] = [];
        let clipped = false;
        for (const snippet of resolvedSnippets) {
          const text = snippet.text;
          const nextBytes = totalBytes + byteLength(text);
          if (nextBytes > maxInput) {
            const remaining = Math.max(0, maxInput - totalBytes);
            if (remaining > 0) {
              const truncated = truncateUtf8ToBytes(text, remaining);
              snippetBlocks.push(truncated);
            }
            clipped = true;
            break;
          }
          snippetBlocks.push(text);
          totalBytes = nextBytes;
        }

        const promptLines: string[] = [
          `Purpose: ${rawSubcall.purpose}`,
          'Instructions: respond with the requested output only.',
          '',
          ...snippetBlocks.map((text, idx) => `Snippet ${idx + 1}:\n${text}`)
        ];
        const subcallPrompt = promptLines.join('\n\n');

        const output = await options.runSubcall(subcallPrompt, { id: subcallId, purpose: rawSubcall.purpose });

        const inputPath = join(subcallDir, 'input.json');
        const promptPath = join(subcallDir, 'prompt.txt');
        const outputPath = join(subcallDir, 'output.txt');
        const metaPath = join(subcallDir, 'meta.json');

        await writeFile(inputPath, JSON.stringify({
          id: subcallId,
          purpose: rawSubcall.purpose,
          max_input_bytes: maxInput,
          snippets: rawSubcall.snippets,
          spans: rawSubcall.spans
        }, null, 2), 'utf8');
        await writeFile(promptPath, subcallPrompt, 'utf8');
        await writeFile(outputPath, output, 'utf8');
        await writeFile(metaPath, JSON.stringify({
          id: subcallId,
          purpose: rawSubcall.purpose,
          status: 'succeeded',
          input_bytes: totalBytes,
          clipped
        }, null, 2), 'utf8');

        const relativeBase = (filePath: string) => relative(options.repoRoot, filePath);

        subcalls.push({
          id: subcallId,
          purpose: rawSubcall.purpose,
          snippets: rawSubcall.snippets.length > 0 ? rawSubcall.snippets : undefined,
          spans: rawSubcall.spans.length > 0 ? rawSubcall.spans : undefined,
          max_input_bytes: rawSubcall.max_input_bytes,
          artifact_paths: {
            input: relativeBase(inputPath),
            prompt: relativeBase(promptPath),
            output: relativeBase(outputPath),
            meta: relativeBase(metaPath)
          },
          clamped: {
            snippets: clampedSnippets,
            bytes: clipped || maxInputClamped
          },
          status: 'succeeded'
        });

        currentSubcallOutputs.push({
          id: subcallId,
          output: truncateUtf8ToBytes(output, options.budgets.maxBytesPerSnippet)
        });
      }
      priorSubcalls = currentSubcallOutputs;

      state.symbolic_iterations.push({
        iteration,
        planner_prompt_bytes: plannerPromptBytes,
        reads,
        subcalls,
        searches,
        planner_errors: plannerErrors.length > 0 ? plannerErrors : undefined,
        clamped: {
          reads: validation.clamped.reads,
          searches: validation.clamped.searches,
          subcalls: validation.clamped.subcalls
        },
        truncation: promptResult.truncation
      });

      await writeState(statePath, state);

      if (maxIterations > 0 && iteration >= maxIterations) {
        return await finalize({ status: 'max_iterations', exitCode: 3 });
      }

      if (timeExceeded()) {
        return await finalize({ status: 'max_minutes', exitCode: 3 });
      }

      log(`Symbolic iteration ${iteration} complete; continuing.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finalize({ status: 'error', exitCode: 10 });
    return { state, exitCode: 10, error: message };
  }

  return await finalize({ status: 'error', exitCode: 10 });
}

export const __test__ = {
  parsePlannerOutput,
  validatePlan,
  buildPlannerPrompt
};
