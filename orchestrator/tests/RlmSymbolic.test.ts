import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { buildContextObject, ContextStore } from '../src/cli/rlm/context.js';
import { runSymbolicLoop, __test__ as symbolicTest } from '../src/cli/rlm/symbolic.js';
import type { RlmState } from '../src/cli/rlm/types.js';
import type { SymbolicBudgets } from '../src/cli/rlm/symbolic.js';

const { parsePlannerOutput } = symbolicTest;

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('symbolic rlm loop', () => {
  it('writes subcall artifacts and state', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-symbolic-'));
    const repoRoot = tempDir;
    const runDir = join(repoRoot, 'rlm');
    const contextObject = await buildContextObject({
      source: { type: 'text', value: 'alpha beta gamma delta epsilon' },
      targetDir: join(runDir, 'context'),
      chunking: { targetBytes: 32, overlapBytes: 0, strategy: 'byte' }
    });

    const contextInfo = {
      object_id: contextObject.index.object_id,
      index_path: relative(repoRoot, contextObject.indexPath),
      chunk_count: contextObject.index.chunks.length
    };

    const baseState: RlmState = {
      version: 1,
      mode: 'symbolic',
      context: contextInfo,
      symbolic_iterations: [],
      goal: 'Summarize context',
      validator: 'none',
      roles: 'single',
      maxIterations: 2,
      maxMinutes: null,
      iterations: []
    };

    const budgets: SymbolicBudgets = {
      maxSubcallsPerIteration: 2,
      maxSearchesPerIteration: 2,
      maxChunkReadsPerIteration: 2,
      maxBytesPerChunkRead: 64,
      maxSnippetsPerSubcall: 2,
      maxBytesPerSnippet: 64,
      maxSubcallInputBytes: 512,
      maxPlannerPromptBytes: 4096,
      searchTopK: 5,
      maxPreviewBytes: 32,
      maxConcurrency: 1
    };

    const pointer = `ctx:${contextInfo.object_id}#chunk:${contextObject.index.chunks[0].id}`;
    const plans = [
      JSON.stringify({
        schema_version: 1,
        intent: 'continue',
        subcalls: [
          {
            purpose: 'summarize',
            snippets: [{ pointer, offset: 0, bytes: 16 }],
            max_input_bytes: 256,
            expected_output: 'summary'
          }
        ]
      }),
      JSON.stringify({ schema_version: 1, intent: 'final', final_answer: 'done' })
    ];
    let planIndex = 0;

    const result = await runSymbolicLoop({
      goal: baseState.goal,
      baseState,
      maxIterations: 2,
      maxMinutes: null,
      repoRoot,
      runDir,
      contextStore: new ContextStore(contextObject),
      budgets,
      runPlanner: async () => plans[planIndex++] ?? plans[plans.length - 1],
      runSubcall: async () => 'summary output'
    });

    expect(result.exitCode).toBe(0);
    expect(result.state.final?.final_answer).toBe('done');
    expect(result.state.symbolic_iterations.length).toBeGreaterThan(0);
    const firstIteration = result.state.symbolic_iterations[0];
    expect(firstIteration.planner_prompt_bytes).toBeLessThanOrEqual(budgets.maxPlannerPromptBytes);
    expect(firstIteration.subcalls.length).toBe(1);
    const artifacts = firstIteration.subcalls[0]?.artifact_paths;
    expect(artifacts?.output).toBeTruthy();
    expect(artifacts).toBeDefined();
    const outputText = await readFile(join(repoRoot, artifacts.output), 'utf8');
    expect(outputText).toContain('summary output');
  });

  it('renders JSONL search hits and records clamped top_k', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-symbolic-'));
    const repoRoot = tempDir;
    const runDir = join(repoRoot, 'rlm');
    const text = 'alpha beta gamma alpha';
    const contextObject = await buildContextObject({
      source: { type: 'text', value: text },
      targetDir: join(runDir, 'context'),
      chunking: { targetBytes: 64, overlapBytes: 0, strategy: 'byte' }
    });

    const baseState: RlmState = {
      version: 1,
      mode: 'symbolic',
      context: {
        object_id: contextObject.index.object_id,
        index_path: relative(repoRoot, contextObject.indexPath),
        chunk_count: contextObject.index.chunks.length
      },
      symbolic_iterations: [],
      goal: 'Locate alpha',
      validator: 'none',
      roles: 'single',
      maxIterations: 2,
      maxMinutes: null,
      iterations: []
    };

    const budgets: SymbolicBudgets = {
      maxSubcallsPerIteration: 1,
      maxSearchesPerIteration: 1,
      maxChunkReadsPerIteration: 0,
      maxBytesPerChunkRead: 64,
      maxSnippetsPerSubcall: 1,
      maxBytesPerSnippet: 64,
      maxSubcallInputBytes: 512,
      maxPlannerPromptBytes: 4096,
      searchTopK: 1,
      maxPreviewBytes: 32,
      maxConcurrency: 1
    };

    const pointer = `ctx:${contextObject.index.object_id}#chunk:${contextObject.index.chunks[0].id}`;
    const plans = [
      JSON.stringify({
        schema_version: 1,
        intent: 'continue',
        searches: [{ query: 'alpha', top_k: 5 }],
        subcalls: [
          {
            purpose: 'summarize',
            snippets: [{ pointer, offset: 0, bytes: 8 }],
            max_input_bytes: 256
          }
        ]
      }),
      JSON.stringify({ schema_version: 1, intent: 'final', final_answer: 'done' })
    ];
    let planIndex = 0;
    const prompts: string[] = [];

    const result = await runSymbolicLoop({
      goal: baseState.goal,
      baseState,
      maxIterations: 2,
      maxMinutes: null,
      repoRoot,
      runDir,
      contextStore: new ContextStore(contextObject),
      budgets,
      runPlanner: async (prompt) => {
        prompts.push(prompt);
        return plans[planIndex++] ?? plans[plans.length - 1];
      },
      runSubcall: async () => 'summary output'
    });

    const searchEntry = result.state.symbolic_iterations[0].searches?.[0];
    expect(searchEntry?.top_k).toBe(budgets.searchTopK);
    expect(searchEntry?.clamped_top_k).toBe(true);
    expect(searchEntry?.hits?.length).toBeGreaterThan(0);
    expect(searchEntry?.hits?.[0]).toEqual(
      expect.objectContaining({
        pointer: expect.any(String),
        offset: expect.any(Number),
        start_byte: expect.any(Number),
        match_bytes: Buffer.byteLength('alpha', 'utf8'),
        score: expect.any(Number),
        preview: expect.any(String)
      })
    );

    const jsonLines = (prompts[1] ?? '')
      .split('\n')
      .filter((line) => line.startsWith('{"pointer":'));
    expect(jsonLines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(jsonLines[0] ?? '{}');
    expect(parsed).toEqual(
      expect.objectContaining({
        pointer: expect.any(String),
        offset: expect.any(Number),
        start_byte: expect.any(Number),
        match_bytes: expect.any(Number),
        score: expect.any(Number),
        preview: expect.any(String)
      })
    );
  });

  it('clamps span reads to maxBytesPerSnippet', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-symbolic-'));
    const repoRoot = tempDir;
    const runDir = join(repoRoot, 'rlm');
    const text = 'abcdefghijklmnopqrstuvwxyz'.repeat(4);
    const contextObject = await buildContextObject({
      source: { type: 'text', value: text },
      targetDir: join(runDir, 'context'),
      chunking: { targetBytes: 64, overlapBytes: 0, strategy: 'byte' }
    });

    const baseState: RlmState = {
      version: 1,
      mode: 'symbolic',
      context: {
        object_id: contextObject.index.object_id,
        index_path: relative(repoRoot, contextObject.indexPath),
        chunk_count: contextObject.index.chunks.length
      },
      symbolic_iterations: [],
      goal: 'Summarize span',
      validator: 'none',
      roles: 'single',
      maxIterations: 2,
      maxMinutes: null,
      iterations: []
    };

    const budgets: SymbolicBudgets = {
      maxSubcallsPerIteration: 1,
      maxSearchesPerIteration: 0,
      maxChunkReadsPerIteration: 0,
      maxBytesPerChunkRead: 64,
      maxSnippetsPerSubcall: 1,
      maxBytesPerSnippet: 8,
      maxSubcallInputBytes: 512,
      maxPlannerPromptBytes: 4096,
      searchTopK: 5,
      maxPreviewBytes: 32,
      maxConcurrency: 1
    };

    const plans = [
      JSON.stringify({
        schema_version: 1,
        intent: 'continue',
        subcalls: [
          {
            purpose: 'summarize',
            spans: [{ start_byte: 0, end_byte: 1000 }],
            max_input_bytes: 256,
            expected_output: 'summary'
          }
        ]
      }),
      JSON.stringify({ schema_version: 1, intent: 'final', final_answer: 'done' })
    ];
    let planIndex = 0;
    let capturedPrompt = '';

    const result = await runSymbolicLoop({
      goal: baseState.goal,
      baseState,
      maxIterations: 2,
      maxMinutes: null,
      repoRoot,
      runDir,
      contextStore: new ContextStore(contextObject),
      budgets,
      runPlanner: async () => plans[planIndex++] ?? plans[plans.length - 1],
      runSubcall: async (prompt) => {
        capturedPrompt = prompt;
        return 'span summary';
      }
    });

    const snippetText = capturedPrompt.split('Snippet 1:\n')[1] ?? '';
    expect(Buffer.byteLength(snippetText.trim(), 'utf8')).toBeLessThanOrEqual(budgets.maxBytesPerSnippet);
    expect(result.state.symbolic_iterations[0].subcalls[0]?.clamped?.bytes).toBe(true);
  });

  it('caps combined snippets and spans per subcall', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-symbolic-'));
    const repoRoot = tempDir;
    const runDir = join(repoRoot, 'rlm');
    const contextObject = await buildContextObject({
      source: { type: 'text', value: 'alpha beta gamma delta epsilon' },
      targetDir: join(runDir, 'context'),
      chunking: { targetBytes: 64, overlapBytes: 0, strategy: 'byte' }
    });

    const baseState: RlmState = {
      version: 1,
      mode: 'symbolic',
      context: {
        object_id: contextObject.index.object_id,
        index_path: relative(repoRoot, contextObject.indexPath),
        chunk_count: contextObject.index.chunks.length
      },
      symbolic_iterations: [],
      goal: 'Summarize context',
      validator: 'none',
      roles: 'single',
      maxIterations: 2,
      maxMinutes: null,
      iterations: []
    };

    const budgets: SymbolicBudgets = {
      maxSubcallsPerIteration: 1,
      maxSearchesPerIteration: 0,
      maxChunkReadsPerIteration: 0,
      maxBytesPerChunkRead: 64,
      maxSnippetsPerSubcall: 2,
      maxBytesPerSnippet: 16,
      maxSubcallInputBytes: 512,
      maxPlannerPromptBytes: 4096,
      searchTopK: 5,
      maxPreviewBytes: 32,
      maxConcurrency: 1
    };

    const pointer = `ctx:${contextObject.index.object_id}#chunk:${contextObject.index.chunks[0].id}`;
    const plans = [
      JSON.stringify({
        schema_version: 1,
        intent: 'continue',
        subcalls: [
          {
            purpose: 'summarize',
            snippets: [
              { pointer, offset: 0, bytes: 8 },
              { pointer, offset: 8, bytes: 8 }
            ],
            spans: [
              { start_byte: 0, end_byte: 8 },
              { start_byte: 8, end_byte: 16 }
            ],
            max_input_bytes: 256
          }
        ]
      }),
      JSON.stringify({ schema_version: 1, intent: 'final', final_answer: 'done' })
    ];
    let planIndex = 0;

    const result = await runSymbolicLoop({
      goal: baseState.goal,
      baseState,
      maxIterations: 2,
      maxMinutes: null,
      repoRoot,
      runDir,
      contextStore: new ContextStore(contextObject),
      budgets,
      runPlanner: async () => plans[planIndex++] ?? plans[plans.length - 1],
      runSubcall: async () => 'summary output'
    });

    const subcall = result.state.symbolic_iterations[0].subcalls[0];
    expect(subcall?.snippets?.length).toBe(2);
    expect(subcall?.spans).toBeUndefined();
    expect(subcall?.clamped?.snippets).toBe(true);
  });

  it('serializes subcalls when maxConcurrency is 1', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-symbolic-'));
    const repoRoot = tempDir;
    const runDir = join(repoRoot, 'rlm');
    const contextObject = await buildContextObject({
      source: { type: 'text', value: 'alpha beta gamma delta epsilon' },
      targetDir: join(runDir, 'context'),
      chunking: { targetBytes: 32, overlapBytes: 0, strategy: 'byte' }
    });

    const baseState: RlmState = {
      version: 1,
      mode: 'symbolic',
      context: {
        object_id: contextObject.index.object_id,
        index_path: relative(repoRoot, contextObject.indexPath),
        chunk_count: contextObject.index.chunks.length
      },
      symbolic_iterations: [],
      goal: 'Summarize context',
      validator: 'none',
      roles: 'single',
      maxIterations: 2,
      maxMinutes: null,
      iterations: []
    };

    const budgets: SymbolicBudgets = {
      maxSubcallsPerIteration: 3,
      maxSearchesPerIteration: 0,
      maxChunkReadsPerIteration: 0,
      maxBytesPerChunkRead: 64,
      maxSnippetsPerSubcall: 1,
      maxBytesPerSnippet: 64,
      maxSubcallInputBytes: 512,
      maxPlannerPromptBytes: 4096,
      searchTopK: 5,
      maxPreviewBytes: 32,
      maxConcurrency: 1
    };

    const pointer = `ctx:${contextObject.index.object_id}#chunk:${contextObject.index.chunks[0].id}`;
    const plans = [
      JSON.stringify({
        schema_version: 1,
        intent: 'continue',
        subcalls: [
          { purpose: 'summarize', snippets: [{ pointer, offset: 0, bytes: 8 }], max_input_bytes: 256 },
          { purpose: 'summarize', snippets: [{ pointer, offset: 8, bytes: 8 }], max_input_bytes: 256 },
          { purpose: 'summarize', snippets: [{ pointer, offset: 16, bytes: 8 }], max_input_bytes: 256 }
        ]
      }),
      JSON.stringify({ schema_version: 1, intent: 'final', final_answer: 'done' })
    ];
    let planIndex = 0;
    let inFlight = 0;
    let maxInFlight = 0;
    const started: string[] = [];

    const result = await runSymbolicLoop({
      goal: baseState.goal,
      baseState,
      maxIterations: 2,
      maxMinutes: null,
      repoRoot,
      runDir,
      contextStore: new ContextStore(contextObject),
      budgets,
      runPlanner: async () => plans[planIndex++] ?? plans[plans.length - 1],
      runSubcall: async (_prompt, meta) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        started.push(meta.id);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return `out-${meta.id}`;
      }
    });

    expect(maxInFlight).toBe(1);
    expect(started).toEqual(['sc0001', 'sc0002', 'sc0003']);
    expect(result.state.symbolic_iterations[0].subcalls.map((subcall) => subcall.id)).toEqual([
      'sc0001',
      'sc0002',
      'sc0003'
    ]);
  });

  it('retries when intent=final appears before any subcall', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-symbolic-'));
    const repoRoot = tempDir;
    const runDir = join(repoRoot, 'rlm');
    const contextObject = await buildContextObject({
      source: { type: 'text', value: 'alpha beta gamma delta epsilon' },
      targetDir: join(runDir, 'context'),
      chunking: { targetBytes: 32, overlapBytes: 0, strategy: 'byte' }
    });

    const baseState: RlmState = {
      version: 1,
      mode: 'symbolic',
      context: {
        object_id: contextObject.index.object_id,
        index_path: relative(repoRoot, contextObject.indexPath),
        chunk_count: contextObject.index.chunks.length
      },
      symbolic_iterations: [],
      goal: 'Summarize context',
      validator: 'none',
      roles: 'single',
      maxIterations: 2,
      maxMinutes: null,
      iterations: []
    };

    const budgets: SymbolicBudgets = {
      maxSubcallsPerIteration: 1,
      maxSearchesPerIteration: 0,
      maxChunkReadsPerIteration: 0,
      maxBytesPerChunkRead: 64,
      maxSnippetsPerSubcall: 1,
      maxBytesPerSnippet: 64,
      maxSubcallInputBytes: 512,
      maxPlannerPromptBytes: 4096,
      searchTopK: 5,
      maxPreviewBytes: 32,
      maxConcurrency: 1
    };

    const pointer = `ctx:${contextObject.index.object_id}#chunk:${contextObject.index.chunks[0].id}`;
    const plans = [
      JSON.stringify({ schema_version: 1, intent: 'final', final_answer: 'too-early' }),
      JSON.stringify({
        schema_version: 1,
        intent: 'continue',
        subcalls: [
          { purpose: 'summarize', snippets: [{ pointer, offset: 0, bytes: 8 }], max_input_bytes: 256 }
        ]
      }),
      JSON.stringify({ schema_version: 1, intent: 'final', final_answer: 'done' })
    ];
    let planIndex = 0;

    const result = await runSymbolicLoop({
      goal: baseState.goal,
      baseState,
      maxIterations: 2,
      maxMinutes: null,
      repoRoot,
      runDir,
      contextStore: new ContextStore(contextObject),
      budgets,
      runPlanner: async () => plans[planIndex++] ?? plans[plans.length - 1],
      runSubcall: async () => 'summary output'
    });

    expect(result.exitCode).toBe(0);
    expect(result.state.final?.final_answer).toBe('done');
    expect(result.state.symbolic_iterations[0].planner_errors).toContain('final_requires_subcall');
    expect(result.state.symbolic_iterations[0].subcalls.length).toBeGreaterThan(0);
  });
});

describe('planner output parsing', () => {
  it('selects the last valid plan from noisy output', () => {
    const raw = [
      'preamble text',
      '{"note":"ignore"}',
      '```json',
      '{"schema_version":1,"intent":"continue","subcalls":[]}',
      '```',
      '{"schema_version":1,"intent":"final","final_answer":"done"}'
    ].join('\n');

    const plan = parsePlannerOutput(raw);
    expect(plan.intent).toBe('final');
    expect(plan.final_answer).toBe('done');
  });

  it('normalizes schema_version strings when parsing', () => {
    const raw = '{"schema_version":"1","intent":"continue","subcalls":[]}';
    const plan = parsePlannerOutput(raw);
    expect(plan.schema_version).toBe(1);
  });
});
