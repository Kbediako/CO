import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { buildContextObject, ContextStore } from '../src/cli/rlm/context.js';
import { runSymbolicLoop } from '../src/cli/rlm/symbolic.js';
import type { RlmState } from '../src/cli/rlm/types.js';
import type { SymbolicBudgets } from '../src/cli/rlm/symbolic.js';

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
});
