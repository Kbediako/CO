import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { buildContextObject, ContextStore } from '../src/cli/rlm/context.js';
import { runSymbolicLoop } from '../src/cli/rlm/symbolic.js';
import type { SymbolicBudgets } from '../src/cli/rlm/symbolic.js';
import type { RlmState } from '../src/cli/rlm/types.js';

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

function buildBaseState(params: {
  repoRoot: string;
  contextObject: Awaited<ReturnType<typeof buildContextObject>>;
  goal: string;
  maxIterations: number;
}): RlmState {
  return {
    version: 1,
    mode: 'symbolic',
    context: {
      object_id: params.contextObject.index.object_id,
      index_path: relative(params.repoRoot, params.contextObject.indexPath),
      chunk_count: params.contextObject.index.chunks.length
    },
    symbolic_iterations: [],
    goal: params.goal,
    validator: 'none',
    roles: 'single',
    maxIterations: params.maxIterations,
    maxMinutes: null,
    iterations: []
  };
}

const budgets: SymbolicBudgets = {
  maxSubcallsPerIteration: 1,
  maxSearchesPerIteration: 1,
  maxChunkReadsPerIteration: 1,
  maxBytesPerChunkRead: 128,
  maxSnippetsPerSubcall: 1,
  maxBytesPerSnippet: 128,
  maxSubcallInputBytes: 512,
  maxPlannerPromptBytes: 4096,
  searchTopK: 5,
  maxPreviewBytes: 64,
  maxConcurrency: 1
};

describe('symbolic alignment integration', () => {
  it('records alignment decisions and ledger artifacts in advisory mode', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-symbolic-alignment-'));
    const repoRoot = tempDir;
    const runDir = join(repoRoot, 'rlm');

    const contextObject = await buildContextObject({
      source: { type: 'text', value: 'alpha beta gamma delta epsilon zeta eta theta' },
      targetDir: join(runDir, 'context'),
      chunking: { targetBytes: 64, overlapBytes: 0, strategy: 'byte' }
    });

    const baseState = buildBaseState({
      repoRoot,
      contextObject,
      goal: 'Summarize context safely',
      maxIterations: 2
    });

    const pointer = `ctx:${contextObject.index.object_id}#chunk:${contextObject.index.chunks[0].id}`;
    const plans = [
      JSON.stringify({
        schema_version: 1,
        intent: 'continue',
        reads: [{ pointer, offset: 0, bytes: 16 }],
        subcalls: [
          { purpose: 'summarize', snippets: [{ pointer, offset: 0, bytes: 16 }], max_input_bytes: 256 }
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
      alignment: {
        enabled: true,
        enforce: false,
        task_id: 'task-a',
        run_id: 'run-a',
        thread_id: 'thread-a',
        agent_id: 'agent-a',
        policy: {
          route: {
            high_reasoning_available: false
          }
        }
      },
      runPlanner: async () => plans[planIndex++] ?? plans[plans.length - 1],
      runSubcall: async () => 'summary output'
    });

    expect(result.exitCode).toBe(0);
    expect(result.state.final?.status).toBe('passed');
    expect(result.state.symbolic_iterations[1]?.alignment?.requires_confirmation).toBe(true);
    expect(result.state.final?.alignment).toBeDefined();

    const ledgerPath = result.state.final?.alignment?.ledger.ledger_path;
    const projectionPath = result.state.final?.alignment?.ledger.projection_path;
    expect(ledgerPath).toBeTruthy();
    expect(projectionPath).toBeTruthy();
    await expect(readFile(join(repoRoot, ledgerPath ?? ''), 'utf8')).resolves.toContain('"event_type":"sentinel"');
    await expect(readFile(join(repoRoot, projectionPath ?? ''), 'utf8')).resolves.toContain('"events"');
  });

  it('blocks finalization in enforce mode when confirmation is required', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-symbolic-alignment-'));
    const repoRoot = tempDir;
    const runDir = join(repoRoot, 'rlm');

    const contextObject = await buildContextObject({
      source: { type: 'text', value: 'alpha beta gamma delta epsilon zeta eta theta' },
      targetDir: join(runDir, 'context'),
      chunking: { targetBytes: 64, overlapBytes: 0, strategy: 'byte' }
    });

    const baseState = buildBaseState({
      repoRoot,
      contextObject,
      goal: 'Summarize context safely',
      maxIterations: 2
    });

    const pointer = `ctx:${contextObject.index.object_id}#chunk:${contextObject.index.chunks[0].id}`;
    const plans = [
      JSON.stringify({
        schema_version: 1,
        intent: 'continue',
        reads: [{ pointer, offset: 0, bytes: 16 }],
        subcalls: [
          { purpose: 'summarize', snippets: [{ pointer, offset: 0, bytes: 16 }], max_input_bytes: 256 }
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
      alignment: {
        enabled: true,
        enforce: true,
        task_id: 'task-b',
        run_id: 'run-b',
        thread_id: 'thread-b',
        agent_id: 'agent-b',
        policy: {
          route: {
            high_reasoning_available: false
          }
        }
      },
      runPlanner: async () => plans[planIndex++] ?? plans[plans.length - 1],
      runSubcall: async () => 'summary output'
    });

    expect(result.exitCode).toBe(5);
    expect(result.state.final?.status).toBe('invalid_config');
    expect(result.state.symbolic_iterations[1]?.alignment?.enforcement_blocked).toBe(true);
  });
});
