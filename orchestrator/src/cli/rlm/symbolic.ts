import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type {
  RlmAlignmentRiskLevel,
  RlmAlignmentFinalSummary,
  RlmLoopResult,
  RlmState,
  RlmSymbolicDeliberation,
  RlmSymbolicIteration,
  RlmSymbolicRead,
  RlmSymbolicSearch,
  RlmSymbolicSearchHit,
  RlmSymbolicSnippet,
  RlmSymbolicSpan,
  RlmSymbolicSubcall,
  RlmSymbolicVariableBinding
} from './types.js';
import { ContextStore } from './context.js';
import { AlignmentChecker, type AlignmentCheckerConfig } from './alignment.js';

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
  deliberation?: {
    enabled: boolean;
    strategy: 'collab' | 'single-agent';
    minIntervalIterations: number;
    maxRuns: number;
    maxSummaryBytes: number;
    includeInPlannerPrompt: boolean;
    logArtifacts?: boolean;
    run: (prompt: string, meta: { iteration: number; reason: string }) => Promise<string>;
  };
  alignment?: {
    enabled: boolean;
    enforce: boolean;
    task_id: string;
    run_id: string;
    thread_id: string;
    agent_id: string;
    policy?: AlignmentCheckerConfig['policy'];
  };
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
  final_var?: string;
}

interface PlannerValidationResult {
  plan: PlannerPlan;
  reads: RlmSymbolicRead[];
  searches: RlmSymbolicSearch[];
  subcalls: Array<{
    id: string;
    purpose: string;
    parent_pointer?: string;
    output_var?: string;
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

type DeliberationReason = 'bootstrap' | 'cadence' | 'planner_recovery' | 'no_subcall_progress';
type SubcallPointerRecord = {
  pointer: string;
  iteration: number;
  subcallId: string;
  outputPath: string;
  outputBytes: number;
};
type VariableBindingRecord = {
  name: string;
  pointer: string;
  iteration: number;
  subcallId: string;
  outputPath: string;
  outputBytes: number;
};
type PriorSubcallSummary = {
  id: string;
  pointer: string;
  preview: string;
  output_bytes: number;
  output_var?: string;
};
const SUBCALL_POINTER_PREFIX = 'subcall:';

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

function isContextPointer(pointer: string): boolean {
  return pointer.startsWith('ctx:');
}

function parseSubcallPointer(pointer: string): { iteration: number; subcallId: string } | null {
  if (!pointer.startsWith(SUBCALL_POINTER_PREFIX)) {
    return null;
  }
  const body = pointer.slice(SUBCALL_POINTER_PREFIX.length);
  const separatorIndex = body.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= body.length - 1) {
    return null;
  }
  const iterationRaw = body.slice(0, separatorIndex);
  const subcallId = body.slice(separatorIndex + 1);
  const iteration = Number.parseInt(iterationRaw, 10);
  if (!Number.isFinite(iteration) || iteration <= 0 || !subcallId) {
    return null;
  }
  return { iteration, subcallId };
}

function buildSubcallPointer(iteration: number, subcallId: string): string {
  return `${SUBCALL_POINTER_PREFIX}${iteration}:${subcallId}`;
}

async function readSubcallPointerSnippet(
  pointerStore: Map<string, SubcallPointerRecord>,
  pointer: string,
  offset: number,
  bytes: number
): Promise<string> {
  const record = pointerStore.get(pointer);
  if (!record) {
    throw new Error('plan_validation_error');
  }
  const raw = await readFile(record.outputPath, 'utf8');
  const sourceBytes = Buffer.from(raw, 'utf8');
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeBytes = Math.max(0, Math.floor(bytes));
  if (safeOffset >= sourceBytes.length || safeBytes <= 0) {
    return '';
  }
  const end = Math.min(sourceBytes.length, safeOffset + safeBytes);
  return sourceBytes.subarray(safeOffset, end).toString('utf8');
}

async function mapWithConcurrency<T, R>(
  items: T[],
  maxConcurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const limit = Math.max(1, Math.floor(maxConcurrency));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
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

function deriveAlignmentRiskLevel(params: {
  intent: PlannerPlan['intent'];
  plannerErrors: string[];
  readCount: number;
  searchCount: number;
  subcallCount: number;
}): RlmAlignmentRiskLevel {
  if (params.intent === 'final' || params.intent === 'fail') {
    return 'high';
  }
  if (params.intent === 'pause') {
    return 'medium';
  }
  if (params.plannerErrors.length > 0) {
    return 'medium';
  }
  const evidenceCount = params.readCount + params.searchCount + params.subcallCount;
  return evidenceCount === 0 ? 'medium' : 'low';
}

function extractJsonCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  const candidates: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }
    if (char === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          candidates.push(trimmed.slice(start, index + 1));
          start = -1;
        }
      }
    }
  }

  return candidates;
}

function normalizePlannerPlan(value: unknown): PlannerPlan | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const schemaVersion = record.schema_version;
  const normalizedSchemaVersion =
    typeof schemaVersion === 'string' ? Number(schemaVersion) : schemaVersion;
  if (normalizedSchemaVersion !== 1) {
    return null;
  }
  if (typeof record.intent !== 'string') {
    return null;
  }
  if (typeof schemaVersion === 'string' && Number.isFinite(normalizedSchemaVersion)) {
    record.schema_version = normalizedSchemaVersion;
  }
  return record as unknown as PlannerPlan;
}

function unwrapPlannerPlan(value: unknown): PlannerPlan | null {
  const direct = normalizePlannerPlan(value);
  if (direct) {
    return direct;
  }
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const normalized = normalizePlannerPlan(value[index]);
      if (normalized) {
        return normalized;
      }
    }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.plan) {
      const normalized = normalizePlannerPlan(record.plan);
      if (normalized) {
        return normalized;
      }
    }
    const plans = record.plans;
    if (Array.isArray(plans)) {
      for (let index = plans.length - 1; index >= 0; index -= 1) {
        const normalized = normalizePlannerPlan(plans[index]);
        if (normalized) {
          return normalized;
        }
      }
    }
  }
  return null;
}

function parsePlannerOutput(raw: string): PlannerPlan {
  const candidates = extractJsonCandidates(raw);
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const candidate = candidates[index];
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const normalized = unwrapPlannerPlan(parsed);
      if (normalized) {
        return normalized;
      }
    } catch {
      // ignore parse errors and try earlier candidates
    }
  }

  if (!candidates.length) {
    try {
      const parsed = JSON.parse(raw.trim()) as unknown;
      const normalized = unwrapPlannerPlan(parsed);
      if (normalized) {
        return normalized;
      }
    } catch {
      // fall through
    }
  }

  throw new Error('plan_parse_error');
}

function buildPlannerRetryPrompt(prompt: string, errors: string[]): string {
  const headerLines = ['Return valid JSON only.'];
  if (errors.includes('final_requires_subcall')) {
    headerLines.push('Do not return intent=final until after at least one subcall.');
  }
  if (errors.includes('final_var_unbound')) {
    headerLines.push('Use final_var only when it matches a previously declared subcalls[].output_var.');
  }
  if (errors.length > 0) {
    headerLines.push(`Previous error: ${errors.join('; ')}`);
  }
  return `${headerLines.join(' ')}\n\n${prompt}`;
}

async function recordPlannerFailure(params: {
  runDir: string;
  iteration: number;
  attempt: number;
  errors: string[];
  raw: string;
}): Promise<void> {
  const raw = params.raw ?? '';
  const plannerDir = join(params.runDir, 'planner');
  await mkdir(plannerDir, { recursive: true });
  const filename = `iteration-${params.iteration}-attempt-${params.attempt + 1}.txt`;
  const header = params.errors.length ? `# errors: ${params.errors.join('; ')}\n` : '';
  const body = raw.length > 0 ? raw : '[empty planner output]';
  await writeFile(join(plannerDir, filename), `${header}${body}`, 'utf8');
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
  const finalVarRaw = plan.final_var;
  const finalVar =
    typeof finalVarRaw === 'string' && finalVarRaw.trim().length > 0
      ? finalVarRaw.trim()
      : undefined;
  if (finalVarRaw !== undefined && !finalVar) {
    throw new Error('plan_validation_error');
  }
  if (finalVar) {
    plan.final_var = finalVar;
  }
  if (plan.intent === 'final') {
    const finalAnswer =
      typeof plan.final_answer === 'string' && plan.final_answer.trim().length > 0
        ? plan.final_answer.trim()
        : null;
    if (!finalAnswer && !finalVar) {
      throw new Error('plan_validation_error');
    }
    if (finalAnswer) {
      plan.final_answer = finalAnswer;
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
    const requestedTopK = toNumber(entry?.top_k);
    const normalizedTopK = requestedTopK && requestedTopK > 0 ? Math.floor(requestedTopK) : budgets.searchTopK;
    const clampedTopK = Math.min(normalizedTopK, budgets.searchTopK);
    searches.push({
      query,
      top_k: clampedTopK,
      reason: typeof entry?.reason === 'string' ? entry.reason : undefined,
      clamped_top_k: normalizedTopK > budgets.searchTopK
    });
  }

  const subcalls: PlannerValidationResult['subcalls'] = [];
  const rawSubcalls = Array.isArray(plan.subcalls) ? plan.subcalls : [];
  for (const entry of rawSubcalls) {
    const purposeInfo = normalizePurpose(entry?.purpose);
    const parentPointerRaw = entry?.parent_pointer;
    if (parentPointerRaw !== undefined && typeof parentPointerRaw !== 'string') {
      throw new Error('plan_validation_error');
    }
    const outputVarRaw = entry?.output_var;
    if (outputVarRaw !== undefined && typeof outputVarRaw !== 'string') {
      throw new Error('plan_validation_error');
    }
    const parentPointer =
      typeof parentPointerRaw === 'string' && parentPointerRaw.trim().length > 0
        ? parentPointerRaw.trim()
        : undefined;
    const outputVar =
      typeof outputVarRaw === 'string' && outputVarRaw.trim().length > 0
        ? outputVarRaw.trim()
        : undefined;
    if (outputVarRaw !== undefined && !outputVar) {
      throw new Error('plan_validation_error');
    }
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
      parent_pointer: parentPointer,
      output_var: outputVar,
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

function validatePlanPointers(
  validation: PlannerValidationResult,
  contextStore: ContextStore,
  subcallPointers: Map<string, SubcallPointerRecord>
): void {
  const ensurePointer = (pointer?: string) => {
    if (!pointer) {
      return;
    }
    if (isContextPointer(pointer)) {
      if (!contextStore.validatePointer(pointer)) {
        throw new Error('plan_validation_error');
      }
      return;
    }
    if (parseSubcallPointer(pointer)) {
      if (!subcallPointers.has(pointer)) {
        throw new Error('plan_validation_error');
      }
      return;
    }
    throw new Error('plan_validation_error');
  };

  for (const read of validation.reads) {
    ensurePointer(read.pointer);
  }
  for (const subcall of validation.subcalls) {
    ensurePointer(subcall.parent_pointer);
    for (const snippet of subcall.snippets) {
      ensurePointer(snippet.pointer);
    }
  }
}

function formatSubcallSummary(entry: PriorSubcallSummary): string {
  const preview = truncateUtf8ToBytes(entry.preview ?? '', 160).replace(/\s+/g, ' ').trim();
  const outputVarSuffix = entry.output_var ? ` output_var=${entry.output_var}` : '';
  if (!preview) {
    return `${entry.id}: ${entry.pointer} (${entry.output_bytes} bytes)${outputVarSuffix}`;
  }
  return `${entry.id}: ${entry.pointer} (${entry.output_bytes} bytes)${outputVarSuffix} preview="${preview}"`;
}

function buildPointerReferenceHint(): string {
  return 'ctx:<object_id>#chunk:<chunk_id> | subcall:<iteration>:<subcall_id>';
}

function buildSubcallHints(): string {
  return '"parent_pointer": "optional pointer for recursion lineage", "output_var": "optional variable name",';
}

function hasSubcallPointer(pointer: string): boolean {
  return parseSubcallPointer(pointer) !== null;
}

async function resolveSnippetText(params: {
  snippet: RlmSymbolicSnippet;
  contextStore: ContextStore;
  subcallPointers: Map<string, SubcallPointerRecord>;
}): Promise<string> {
  const { snippet, contextStore, subcallPointers } = params;
  if (snippet.pointer) {
    if (isContextPointer(snippet.pointer)) {
      const result = await contextStore.read(
        snippet.pointer,
        snippet.offset ?? 0,
        snippet.bytes
      );
      return result.text;
    }
    if (hasSubcallPointer(snippet.pointer)) {
      return readSubcallPointerSnippet(
        subcallPointers,
        snippet.pointer,
        snippet.offset ?? 0,
        snippet.bytes
      );
    }
    throw new Error('plan_validation_error');
  }
  if (typeof snippet.start_byte === 'number') {
    const result = await contextStore.readSpan(snippet.start_byte, snippet.bytes);
    return result.text;
  }
  throw new Error('plan_validation_error');
}

async function resolveReadExcerpt(params: {
  read: RlmSymbolicRead;
  contextStore: ContextStore;
  subcallPointers: Map<string, SubcallPointerRecord>;
  maxBytes: number;
}): Promise<{ pointer: string; excerpt: string } | null> {
  const { read, contextStore, subcallPointers, maxBytes } = params;
  if (read.pointer) {
    if (isContextPointer(read.pointer)) {
      const result = await contextStore.read(
        read.pointer,
        read.offset ?? 0,
        read.bytes
      );
      return {
        pointer: read.pointer,
        excerpt: truncateUtf8ToBytes(result.text, maxBytes)
      };
    }
    if (hasSubcallPointer(read.pointer)) {
      const text = await readSubcallPointerSnippet(
        subcallPointers,
        read.pointer,
        read.offset ?? 0,
        read.bytes
      );
      return {
        pointer: read.pointer,
        excerpt: truncateUtf8ToBytes(text, maxBytes)
      };
    }
    throw new Error('plan_validation_error');
  }
  if (typeof read.start_byte === 'number') {
    const result = await contextStore.readSpan(read.start_byte, read.bytes);
    return {
      pointer: `start_byte=${read.start_byte} bytes=${read.bytes}`,
      excerpt: truncateUtf8ToBytes(result.text, maxBytes)
    };
  }
  return null;
}

function buildPlannerPrompt(params: {
  goal: string;
  contextStore: ContextStore;
  budgets: SymbolicBudgets;
  priorReads: Array<{ pointer: string; excerpt: string }>;
  priorSearches: Array<{ query: string; results: RlmSymbolicSearchHit[] }>;
  priorSubcalls: PriorSubcallSummary[];
  deliberationBrief?: string | null;
}): { prompt: string; truncation: RlmSymbolicIteration['truncation'] } {
  const { goal, contextStore, budgets, priorReads, priorSearches, priorSubcalls, deliberationBrief } = params;

  const baseLines: string[] = [
    'You are a symbolic RLM planner. Return JSON only (no prose).',
    `Goal: ${goal}`,
    `Context object_id: ${contextStore.objectId}`,
    `Chunk count: ${contextStore.chunkCount}`,
    `Pointer format: ${buildPointerReferenceHint()}`,
    '',
    'Schema (v1):',
    '{',
    '  "schema_version": 1,',
    '  "intent": "continue | final | pause | fail",',
    `  "reads": [{ "pointer": "${buildPointerReferenceHint()}", "offset": 0, "bytes": 4096, "reason": "..." }],`,
    '  "searches": [{ "query": "...", "top_k": 20, "reason": "..." }],',
    `  "subcalls": [{ "purpose": "summarize | extract | classify | verify", ${buildSubcallHints()} "snippets": [{ "pointer": "${buildPointerReferenceHint()}", "offset": 0, "bytes": 2048 }], "max_input_bytes": 120000, "expected_output": "short summary" }],`,
    '  "final_answer": "required when intent=final unless final_var is set",',
    '  "final_var": "optional variable name bound by subcalls[].output_var"',
    '}',
    '',
    'Constraints:',
    `- Limit reads to ${budgets.maxChunkReadsPerIteration}, searches to ${budgets.maxSearchesPerIteration}, subcalls to ${budgets.maxSubcallsPerIteration}.`,
    `- Max bytes per read: ${budgets.maxBytesPerChunkRead}.`,
    `- Max bytes per snippet: ${budgets.maxBytesPerSnippet}.`,
    '- Do not include full context; use pointers.',
    '- Prefer prior subcall pointers for recursive chaining.',
    '- Request at least one subcall before intent=final.',
    ''
  ];

  const sections: Array<{ key: keyof NonNullable<RlmSymbolicIteration['truncation']>; lines: string[] }> = [];
  if (priorSearches.length > 0) {
    const lines = ['Prior search results (JSONL):'];
    for (const entry of priorSearches) {
      for (const result of entry.results) {
        lines.push(JSON.stringify({
          pointer: result.pointer,
          offset: result.offset,
          start_byte: result.start_byte,
          match_bytes: result.match_bytes,
          score: result.score,
          preview: result.preview
        }));
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
    const lines = ['Prior subcall references:'];
    for (const entry of priorSubcalls) {
      lines.push(`- ${formatSubcallSummary(entry)}`);
    }
    sections.push({ key: 'subcalls_dropped', lines });
  }
  if (typeof deliberationBrief === 'string' && deliberationBrief.trim().length > 0) {
    sections.push({
      key: 'deliberation_dropped',
      lines: ['Deliberation brief:', deliberationBrief.trim()]
    });
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

function formatDeliberationReason(reason: DeliberationReason): string {
  switch (reason) {
    case 'bootstrap':
      return 'bootstrap';
    case 'cadence':
      return 'cadence';
    case 'planner_recovery':
      return 'planner_recovery';
    case 'no_subcall_progress':
      return 'no_subcall_progress';
    default:
      return 'cadence';
  }
}

type DeliberationRunError = Error & {
  artifactPaths?: RlmSymbolicDeliberation['artifact_paths'];
};

function attachDeliberationArtifactPaths(
  error: unknown,
  artifactPaths: RlmSymbolicDeliberation['artifact_paths'] | undefined
): DeliberationRunError {
  const normalized = error instanceof Error ? error : new Error(String(error));
  if (artifactPaths) {
    (normalized as DeliberationRunError).artifactPaths = artifactPaths;
  }
  return normalized as DeliberationRunError;
}

function extractDeliberationArtifactPaths(
  error: unknown
): RlmSymbolicDeliberation['artifact_paths'] | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const rawPaths = (error as { artifactPaths?: unknown }).artifactPaths;
  if (!rawPaths || typeof rawPaths !== 'object') {
    return undefined;
  }
  const typed = rawPaths as Partial<NonNullable<RlmSymbolicDeliberation['artifact_paths']>>;
  if (
    typeof typed.prompt !== 'string' ||
    typeof typed.output !== 'string' ||
    typeof typed.meta !== 'string'
  ) {
    return undefined;
  }
  return {
    prompt: typed.prompt,
    output: typed.output,
    meta: typed.meta
  };
}

function selectDeliberationReason(params: {
  iteration: number;
  previousIteration: RlmSymbolicIteration | null;
  lastDeliberationIteration: number;
  minIntervalIterations: number;
}): DeliberationReason | null {
  if (params.iteration === 1) {
    return 'bootstrap';
  }
  if ((params.previousIteration?.planner_errors?.length ?? 0) > 0) {
    return 'planner_recovery';
  }
  const noSearches = (params.previousIteration?.searches?.length ?? 0) === 0;
  const noReads = (params.previousIteration?.reads?.length ?? 0) === 0;
  const noSubcalls = (params.previousIteration?.subcalls?.length ?? 0) === 0;
  if (noSearches && noReads && noSubcalls) {
    return 'no_subcall_progress';
  }
  const minInterval = Math.max(1, Math.floor(params.minIntervalIterations));
  if (
    params.lastDeliberationIteration <= 0 ||
    params.iteration - params.lastDeliberationIteration >= minInterval
  ) {
    return 'cadence';
  }
  return null;
}

function buildDeliberationPrompt(params: {
  goal: string;
  iteration: number;
  reason: DeliberationReason;
  contextStore: ContextStore;
  priorReads: Array<{ pointer: string; excerpt: string }>;
  priorSearches: Array<{ query: string; results: RlmSymbolicSearchHit[] }>;
  priorSubcalls: PriorSubcallSummary[];
  maxSummaryBytes: number;
}): string {
  const maxBytes = Math.max(256, Math.floor(params.maxSummaryBytes));
  const lines: string[] = [
    'You are a deliberation coordinator for an iterative symbolic planning loop.',
    `Goal: ${params.goal}`,
    `Iteration: ${params.iteration}`,
    `Trigger: ${formatDeliberationReason(params.reason)}`,
    `Context object_id: ${params.contextStore.objectId}`,
    `Context chunks: ${params.contextStore.chunkCount}`,
    'Respond with exactly four labeled lines:',
    'Decision focus: <what to optimize next>',
    'Risks: <top failure modes to avoid>',
    'Context gaps: <missing evidence/plans>',
    'Planner directives: <3 concise directives>',
    `Keep total output under ${maxBytes} bytes and avoid markdown tables.`
  ];
  if (params.priorSearches.length > 0) {
    const latestSearch = params.priorSearches[params.priorSearches.length - 1];
    const hitCount = latestSearch?.results?.length ?? 0;
    lines.push(
      `Latest search: query="${latestSearch?.query ?? ''}" hits=${hitCount}`
    );
  }
  if (params.priorReads.length > 0) {
    const latestRead = params.priorReads[params.priorReads.length - 1];
    lines.push(`Latest read pointer: ${latestRead?.pointer ?? ''}`);
  }
  if (params.priorSubcalls.length > 0) {
    const latestSubcall = params.priorSubcalls[params.priorSubcalls.length - 1];
    lines.push(`Latest subcall id: ${latestSubcall?.id ?? ''}`);
    lines.push(`Latest subcall pointer: ${latestSubcall?.pointer ?? ''}`);
    lines.push(`Latest subcall preview: ${truncateUtf8ToBytes(latestSubcall?.preview ?? '', 320)}`);
  }
  return lines.join('\n');
}

async function runDeliberationStep(params: {
  options: NonNullable<SymbolicLoopOptions['deliberation']>;
  goal: string;
  iteration: number;
  reason: DeliberationReason;
  runDir: string;
  repoRoot: string;
  contextStore: ContextStore;
  priorReads: Array<{ pointer: string; excerpt: string }>;
  priorSearches: Array<{ query: string; results: RlmSymbolicSearchHit[] }>;
  priorSubcalls: PriorSubcallSummary[];
}): Promise<{ record: RlmSymbolicDeliberation; brief: string }> {
  const prompt = buildDeliberationPrompt({
    goal: params.goal,
    iteration: params.iteration,
    reason: params.reason,
    contextStore: params.contextStore,
    priorReads: params.priorReads,
    priorSearches: params.priorSearches,
    priorSubcalls: params.priorSubcalls,
    maxSummaryBytes: params.options.maxSummaryBytes
  });
  const promptBytes = byteLength(prompt);

  const shouldLogArtifacts = params.options.logArtifacts === true;
  let artifactPaths: RlmSymbolicDeliberation['artifact_paths'] | undefined;
  let outputPath: string | null = null;
  let metaPath: string | null = null;
  if (shouldLogArtifacts) {
    const deliberationDir = join(params.runDir, 'deliberation');
    await mkdir(deliberationDir, { recursive: true });
    const baseName = `iteration-${String(params.iteration).padStart(4, '0')}`;
    const promptPath = join(deliberationDir, `${baseName}-prompt.txt`);
    outputPath = join(deliberationDir, `${baseName}-output.txt`);
    metaPath = join(deliberationDir, `${baseName}-meta.json`);
    await writeFile(promptPath, prompt, 'utf8');
    artifactPaths = {
      prompt: relative(params.repoRoot, promptPath),
      output: relative(params.repoRoot, outputPath),
      meta: relative(params.repoRoot, metaPath)
    };
  }

  let output: string;
  try {
    output = await params.options.run(prompt, {
      iteration: params.iteration,
      reason: formatDeliberationReason(params.reason)
    });
  } catch (error) {
    if (shouldLogArtifacts && outputPath && metaPath) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await writeFile(outputPath, '', 'utf8');
      await writeFile(
        metaPath,
        JSON.stringify(
          {
            iteration: params.iteration,
            reason: formatDeliberationReason(params.reason),
            strategy: params.options.strategy,
            prompt_bytes: promptBytes,
            output_bytes: 0,
            error: errorMessage
          },
          null,
          2
        ),
        'utf8'
      );
    }
    throw attachDeliberationArtifactPaths(error, artifactPaths);
  }

  const brief = truncateUtf8ToBytes(output ?? '', params.options.maxSummaryBytes);
  const outputBytes = byteLength(brief);
  if (shouldLogArtifacts && outputPath && metaPath) {
    await writeFile(outputPath, brief, 'utf8');
    await writeFile(
      metaPath,
      JSON.stringify(
        {
          iteration: params.iteration,
          reason: formatDeliberationReason(params.reason),
          strategy: params.options.strategy,
          prompt_bytes: promptBytes,
          output_bytes: outputBytes
        },
        null,
        2
      ),
      'utf8'
    );
  }

  return {
    record: {
      status: 'ran',
      reason: formatDeliberationReason(params.reason),
      strategy: params.options.strategy,
      prompt_bytes: promptBytes,
      output_bytes: outputBytes,
      artifact_paths: artifactPaths
    },
    brief
  };
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

  const alignmentChecker =
    options.alignment?.enabled
      ? new AlignmentChecker({
          enabled: options.alignment.enabled,
          enforce: options.alignment.enforce,
          repo_root: options.repoRoot,
          run_dir: runDir,
          task_id: options.alignment.task_id,
          run_id: options.alignment.run_id,
          thread_id: options.alignment.thread_id,
          agent_id: options.alignment.agent_id,
          goal: options.goal,
          policy: options.alignment.policy,
          now: options.now
        })
      : null;

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
  let priorSearches: Array<{ query: string; results: RlmSymbolicSearchHit[] }> = [];
  let priorSubcalls: PriorSubcallSummary[] = [];
  const subcallPointers = new Map<string, SubcallPointerRecord>();
  const variableBindings = new Map<string, VariableBindingRecord>();
  let lastDeliberationIteration = 0;
  let deliberationRuns = 0;
  let latestDeliberationBrief: string | null = null;
  let finalizedAlignmentSummary: RlmAlignmentFinalSummary | undefined;

  const finalize = async (status: RlmState['final']): Promise<RlmLoopResult> => {
    if (alignmentChecker && finalizedAlignmentSummary === undefined) {
      finalizedAlignmentSummary = await alignmentChecker.finalize();
    }
    state.final = status ?? { status: 'error', exitCode: 10 };
    if (state.final && finalizedAlignmentSummary) {
      state.final = {
        ...state.final,
        alignment: finalizedAlignmentSummary
      };
    }
    await writeState(statePath, state);
    return { state, exitCode: state.final.exitCode };
  };

  try {
    for (let iteration = 1; maxIterations === 0 || iteration <= maxIterations; iteration += 1) {
      if (timeExceeded()) {
        return await finalize({ status: 'max_minutes', exitCode: 3 });
      }

      const previousIteration = state.symbolic_iterations[state.symbolic_iterations.length - 1] ?? null;
      let deliberation: RlmSymbolicDeliberation | undefined;
      const deliberationOptions = options.deliberation;
      if (!deliberationOptions?.enabled) {
        if (deliberationOptions) {
          deliberation = {
            status: 'skipped',
            reason: 'disabled',
            strategy: deliberationOptions.strategy
          };
        }
      } else {
        const reason = selectDeliberationReason({
          iteration,
          previousIteration,
          lastDeliberationIteration,
          minIntervalIterations: deliberationOptions.minIntervalIterations
        });
        if (!reason) {
          deliberation = {
            status: 'skipped',
            reason: 'not_due',
            strategy: deliberationOptions.strategy
          };
        } else if (deliberationRuns >= deliberationOptions.maxRuns) {
          deliberation = {
            status: 'skipped',
            reason: 'max_runs_reached',
            strategy: deliberationOptions.strategy
          };
        } else {
          deliberationRuns += 1;
          try {
            const result = await runDeliberationStep({
              options: deliberationOptions,
              goal: options.goal,
              iteration,
              reason,
              runDir,
              repoRoot: options.repoRoot,
              contextStore: options.contextStore,
              priorReads,
              priorSearches,
              priorSubcalls
            });
            deliberation = result.record;
            latestDeliberationBrief = result.brief;
            lastDeliberationIteration = iteration;
            log(
              `Deliberation ${formatDeliberationReason(reason)} ran for iteration ${iteration} (${result.record.strategy}).`
            );
          } catch (error) {
            deliberation = {
              status: 'error',
              reason: formatDeliberationReason(reason),
              strategy: deliberationOptions.strategy,
              artifact_paths: extractDeliberationArtifactPaths(error),
              error: error instanceof Error ? error.message : String(error)
            };
            log(
              `Deliberation ${formatDeliberationReason(reason)} failed for iteration ${iteration}: ${
                deliberation.error
              }`
            );
          }
        }
      }

      const promptResult = buildPlannerPrompt({
        goal: options.goal,
        contextStore: options.contextStore,
        budgets: options.budgets,
        priorReads,
        priorSearches,
        priorSubcalls,
        deliberationBrief:
          deliberationOptions?.enabled && deliberationOptions.includeInPlannerPrompt
            ? latestDeliberationBrief
            : null
      });
      const plannerPrompt = promptResult.prompt;
      const plannerPromptBytes = byteLength(plannerPrompt);

      let plan: PlannerPlan | null = null;
      let validation: PlannerValidationResult | null = null;
      const plannerErrors: string[] = [];
      const hasPriorSubcalls = priorSubcalls.length > 0;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const raw = await options.runPlanner(
          attempt === 0 ? plannerPrompt : buildPlannerRetryPrompt(plannerPrompt, plannerErrors),
          attempt
        );
        try {
          plan = parsePlannerOutput(raw);
        } catch {
          plannerErrors.push('plan_parse_error');
          await recordPlannerFailure({
            runDir: options.runDir,
            iteration,
            attempt,
            errors: plannerErrors,
            raw
          });
          if (attempt === 0) {
            continue;
          }
          return await finalize({ status: 'invalid_config', exitCode: 5 });
        }
        let validationError: string | null = null;
        try {
          validation = validatePlan(plan, options.budgets);
          validatePlanPointers(validation, options.contextStore, subcallPointers);
        } catch {
          validationError = 'plan_validation_error';
        }
        if (!validationError && plan.intent === 'final' && !hasPriorSubcalls) {
          validationError = 'final_requires_subcall';
        }
        if (!validationError && plan.intent === 'final' && plan.final_var) {
          if (!variableBindings.has(plan.final_var)) {
            validationError = 'final_var_unbound';
          }
        }
        if (validationError) {
          plannerErrors.push(validationError);
          await recordPlannerFailure({
            runDir: options.runDir,
            iteration,
            attempt,
            errors: plannerErrors,
            raw
          });
          if (attempt === 0) {
            continue;
          }
          return await finalize({ status: 'invalid_config', exitCode: 5 });
        }
        break;
      }

      if (!plan || !validation) {
        return await finalize({ status: 'invalid_config', exitCode: 5 });
      }

      const reads: RlmSymbolicRead[] = [];
      const subcalls: RlmSymbolicSubcall[] = [];
      const searches: RlmSymbolicSearch[] = [];
      const iterationVariableBindings: RlmSymbolicVariableBinding[] = [];
      const alignmentRiskLevel = deriveAlignmentRiskLevel({
        intent: plan.intent,
        plannerErrors,
        readCount: validation.reads.length,
        searchCount: validation.searches.length,
        subcallCount: validation.subcalls.length
      });
      const evidenceRefs = [
        ...validation.reads.slice(0, 2).map((entry) =>
          entry.pointer ?? `start_byte:${entry.start_byte ?? 0}`
        ),
        ...priorSubcalls.slice(0, 2).map((entry) => entry.pointer)
      ];
      const alignmentEvaluation = alignmentChecker
        ? await alignmentChecker.evaluateTurn({
            turn: iteration,
            intent: plan.intent,
            planner_prompt_bytes: plannerPromptBytes,
            planner_errors: plannerErrors,
            read_count: validation.reads.length,
            search_count: validation.searches.length,
            subcall_count: validation.subcalls.length,
            risk_level: alignmentRiskLevel,
            evidence_refs: evidenceRefs
          })
        : null;
      const alignmentDecision = alignmentEvaluation?.decision;

      if (alignmentEvaluation?.enforce_block) {
        log(
          `Alignment gate blocked iteration ${iteration}: ${
            alignmentEvaluation.enforce_reason ?? 'confirmation_required'
          }`
        );
        state.symbolic_iterations.push({
          iteration,
          planner_prompt_bytes: plannerPromptBytes,
          reads,
          subcalls,
          variable_bindings:
            iterationVariableBindings.length > 0 ? iterationVariableBindings : undefined,
          deliberation,
          alignment: alignmentDecision,
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

      if (plan.intent === 'final') {
        let finalAnswer = plan.final_answer;
        if (plan.final_var) {
          const binding = variableBindings.get(plan.final_var);
          if (!binding) {
            return await finalize({ status: 'invalid_config', exitCode: 5 });
          }
          try {
            finalAnswer = await readFile(binding.outputPath, 'utf8');
          } catch {
            return await finalize({ status: 'invalid_config', exitCode: 5 });
          }
        }
        state.symbolic_iterations.push({
          iteration,
          planner_prompt_bytes: plannerPromptBytes,
          reads,
          subcalls,
          deliberation,
          alignment: alignmentDecision,
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
        return await finalize({ status: 'passed', exitCode: 0, final_answer: finalAnswer });
      }

      if (plan.intent === 'pause' || plan.intent === 'fail') {
        state.symbolic_iterations.push({
          iteration,
          planner_prompt_bytes: plannerPromptBytes,
          reads,
          subcalls,
          deliberation,
          alignment: alignmentDecision,
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

      const currentSearches: Array<{ query: string; results: RlmSymbolicSearchHit[] }> = [];
      for (const search of validation.searches) {
        const results = await options.contextStore.search(
          search.query,
          search.top_k ?? options.budgets.searchTopK,
          options.budgets.maxPreviewBytes
        );
        currentSearches.push({
          query: search.query,
          results
        });
        searches.push({
          query: search.query,
          top_k: search.top_k,
          reason: search.reason,
          clamped_top_k: search.clamped_top_k,
          hits: results
        });
      }
      priorSearches = currentSearches;

      const readExcerpts: Array<{ pointer: string; excerpt: string }> = [];
      for (const read of validation.reads) {
        const excerpt = await resolveReadExcerpt({
          read,
          contextStore: options.contextStore,
          subcallPointers,
          maxBytes: options.budgets.maxBytesPerChunkRead
        });
        if (excerpt) {
          readExcerpts.push(excerpt);
        }
        reads.push(read);
      }

      priorReads = readExcerpts;

      const subcallRoot = join(runDir, 'subcalls', String(iteration));
      await mkdir(subcallRoot, { recursive: true });

      const subcallPlans = validation.subcalls.map((rawSubcall, index) => {
        const subcallId = `sc${String(index + 1).padStart(4, '0')}`;
        return {
          rawSubcall,
          subcallId,
          subcallDir: join(subcallRoot, subcallId)
        };
      });
      const maxConcurrency = Math.max(1, Math.floor(options.budgets.maxConcurrency));
      const subcallResults = await mapWithConcurrency(subcallPlans, maxConcurrency, async (plan) => {
        const { rawSubcall, subcallId, subcallDir } = plan;
        await mkdir(subcallDir, { recursive: true });

        const maxSnippets = options.budgets.maxSnippetsPerSubcall;
        const rawSnippets = rawSubcall.snippets;
        const rawSpans = rawSubcall.spans;
        const snippetCap = Math.max(0, Math.floor(maxSnippets));
        const snippets = rawSnippets.slice(0, snippetCap);
        const remaining = Math.max(0, snippetCap - snippets.length);
        const unclampedSpans = rawSpans.slice(0, remaining);
        const clampedSnippets = rawSnippets.length > snippets.length || rawSpans.length > unclampedSpans.length;

        let spanBytesClamped = false;
        const spans = unclampedSpans.map((span) => {
          const spanBytes = Math.max(0, span.end_byte - span.start_byte);
          const cappedBytes = Math.min(spanBytes, options.budgets.maxBytesPerSnippet);
          const endByte = span.start_byte + cappedBytes;
          if (endByte < span.end_byte) {
            spanBytesClamped = true;
          }
          return {
            start_byte: span.start_byte,
            end_byte: endByte
          };
        });

        const resolvedSnippets: Array<{ meta: RlmSymbolicSnippet | RlmSymbolicSpan; text: string }> = [];
        for (const snippet of snippets) {
          const text = await resolveSnippetText({
            snippet,
            contextStore: options.contextStore,
            subcallPointers
          });
          resolvedSnippets.push({ meta: snippet, text });
        }
        for (const span of spans) {
          const spanBytes = Math.max(0, span.end_byte - span.start_byte);
          const result = await options.contextStore.readSpan(span.start_byte, spanBytes);
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
        const promptBytes = byteLength(subcallPrompt);

        const output = await options.runSubcall(subcallPrompt, { id: subcallId, purpose: rawSubcall.purpose });

        const inputPath = join(subcallDir, 'input.json');
        const promptPath = join(subcallDir, 'prompt.txt');
        const outputPath = join(subcallDir, 'output.txt');
        const metaPath = join(subcallDir, 'meta.json');
        const outputPointer = buildSubcallPointer(iteration, subcallId);

        await writeFile(inputPath, JSON.stringify({
          id: subcallId,
          purpose: rawSubcall.purpose,
          parent_pointer: rawSubcall.parent_pointer,
          output_var: rawSubcall.output_var,
          max_input_bytes: maxInput,
          snippets,
          spans
        }, null, 2), 'utf8');
        await writeFile(promptPath, subcallPrompt, 'utf8');
        await writeFile(outputPath, output, 'utf8');
        await writeFile(metaPath, JSON.stringify({
          id: subcallId,
          purpose: rawSubcall.purpose,
          status: 'succeeded',
          input_bytes: promptBytes,
          clipped
        }, null, 2), 'utf8');

        const relativeBase = (filePath: string) => relative(options.repoRoot, filePath);
        const outputPreview = truncateUtf8ToBytes(output, options.budgets.maxPreviewBytes);
        subcallPointers.set(outputPointer, {
          pointer: outputPointer,
          iteration,
          subcallId,
          outputPath,
          outputBytes: byteLength(output)
        });

        return {
          subcall: {
            id: subcallId,
            purpose: rawSubcall.purpose,
            parent_pointer: rawSubcall.parent_pointer,
            output_pointer: outputPointer,
            output_var: rawSubcall.output_var,
            snippets: snippets.length > 0 ? snippets : undefined,
            spans: spans.length > 0 ? spans : undefined,
            max_input_bytes: rawSubcall.max_input_bytes,
            artifact_paths: {
              input: relativeBase(inputPath),
              prompt: relativeBase(promptPath),
              output: relativeBase(outputPath),
              meta: relativeBase(metaPath)
            },
            clamped: {
              snippets: clampedSnippets,
              bytes: clipped || maxInputClamped || spanBytesClamped
            },
            status: 'succeeded'
          },
          output: {
            id: subcallId,
            pointer: outputPointer,
            preview: outputPreview,
            output_bytes: byteLength(output),
            output_var: rawSubcall.output_var
          },
          binding:
            rawSubcall.output_var
              ? {
                  name: rawSubcall.output_var,
                  pointer: outputPointer,
                  iteration,
                  subcallId,
                  outputPath,
                  outputBytes: byteLength(output)
                }
              : null
        };
      });

      for (const result of subcallResults) {
        subcalls.push(result.subcall);
        if (result.binding) {
          variableBindings.set(result.binding.name, result.binding);
          iterationVariableBindings.push({
            name: result.binding.name,
            pointer: result.binding.pointer,
            iteration: result.binding.iteration,
            subcall_id: result.binding.subcallId,
            output_bytes: result.binding.outputBytes,
            output_path: relative(options.repoRoot, result.binding.outputPath)
          });
        }
      }
      priorSubcalls = subcallResults.map((result) => result.output);

      state.symbolic_iterations.push({
        iteration,
        planner_prompt_bytes: plannerPromptBytes,
        reads,
        subcalls,
        variable_bindings:
          iterationVariableBindings.length > 0 ? iterationVariableBindings : undefined,
        deliberation,
        alignment: alignmentDecision,
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
