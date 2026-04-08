import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { __test__ } from '../src/cli/rlmRunner.js';

const {
  parseMaxIterations,
  parsePositiveInt,
  parseProbability,
  resolveAlignmentCheckerEnabled,
  resolveAlignmentCheckerEnforce,
  resolveContextSource,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_MAX_MINUTES,
  DEFAULT_ALIGNMENT_CHECKER_ENABLED,
  DEFAULT_ALIGNMENT_CHECKER_ENFORCE
} = __test__;

const sandboxes: string[] = [];

afterEach(async () => {
  await Promise.all(
    sandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('rlmRunner config parsing', () => {
  it('defaults max iterations when undefined', () => {
    expect(parseMaxIterations(undefined, DEFAULT_MAX_ITERATIONS)).toBe(DEFAULT_MAX_ITERATIONS);
  });

  it('accepts unbounded iteration aliases', () => {
    expect(parseMaxIterations('unlimited', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('UNBOUNDED', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('infinite', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('infinity', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('  unlimited  ', DEFAULT_MAX_ITERATIONS)).toBe(0);
    expect(parseMaxIterations('UnLiMiTeD', DEFAULT_MAX_ITERATIONS)).toBe(0);
  });

  it('parses numeric iteration values', () => {
    expect(parseMaxIterations('10', DEFAULT_MAX_ITERATIONS)).toBe(10);
    expect(parseMaxIterations('0', DEFAULT_MAX_ITERATIONS)).toBe(0);
  });

  it('rejects invalid iteration values', () => {
    expect(parseMaxIterations('-1', DEFAULT_MAX_ITERATIONS)).toBeNull();
    expect(parseMaxIterations('n/a', DEFAULT_MAX_ITERATIONS)).toBeNull();
  });

  it('defaults max minutes to 48 hours', () => {
    expect(DEFAULT_MAX_MINUTES).toBe(48 * 60);
    expect(parsePositiveInt(undefined, DEFAULT_MAX_MINUTES)).toBe(48 * 60);
  });

  it('parses probability ranges for alignment thresholds', () => {
    expect(parseProbability(undefined, 0.7)).toBe(0.7);
    expect(parseProbability('0.15', 0.7)).toBe(0.15);
    expect(parseProbability('0', 0.7)).toBe(0);
    expect(parseProbability('1', 0.7)).toBe(1);
    expect(parseProbability('-0.1', 0.7)).toBeNull();
    expect(parseProbability('1.1', 0.7)).toBeNull();
    expect(parseProbability('n/a', 0.7)).toBeNull();
  });

  it('resolves alignment checker toggle defaults and overrides', () => {
    expect(resolveAlignmentCheckerEnabled({} as NodeJS.ProcessEnv)).toBe(
      DEFAULT_ALIGNMENT_CHECKER_ENABLED
    );
    expect(resolveAlignmentCheckerEnabled({ RLM_ALIGNMENT_CHECKER: '0' } as NodeJS.ProcessEnv)).toBe(
      false
    );
    expect(resolveAlignmentCheckerEnabled({ RLM_ALIGNMENT_CHECKER: '1' } as NodeJS.ProcessEnv)).toBe(
      true
    );
  });

  it('resolves alignment checker enforce defaults and overrides', () => {
    expect(resolveAlignmentCheckerEnforce({} as NodeJS.ProcessEnv)).toBe(
      DEFAULT_ALIGNMENT_CHECKER_ENFORCE
    );
    expect(
      resolveAlignmentCheckerEnforce({ RLM_ALIGNMENT_CHECKER_ENFORCE: '1' } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      resolveAlignmentCheckerEnforce({ RLM_ALIGNMENT_CHECKER_ENFORCE: '0' } as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it('uses memory.source_0 from the manifest as an explicit context source when no RLM_CONTEXT_PATH is set', async () => {
    const sandbox = await mkdtemp(join(tmpdir(), 'rlm-runner-source0-'));
    sandboxes.push(sandbox);
    const contextDir = join(sandbox, '.runs', 'task-1', 'cli', 'run-1', 'memory', 'source-0');
    await mkdir(contextDir, { recursive: true });
    const manifestPath = join(sandbox, '.runs', 'task-1', 'cli', 'run-1', 'manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'run-1',
        task_id: 'task-1',
        memory: {
          source_0: {
            schema_version: 1,
            kind: 'context_object',
            object_id: 'sha256:source0',
            pointer: 'ctx:sha256:source0#chunk:c000001',
            dir_path: '.runs/task-1/cli/run-1/memory/source-0',
            index_path: '.runs/task-1/cli/run-1/memory/source-0/index.json',
            source_path: '.runs/task-1/cli/run-1/memory/source-0/source.txt',
            byte_length: 4096,
            chunk_count: 1,
            created_at: '2026-04-09T00:00:00.000Z',
            origin: {
              run_id: 'run-1',
              task_id: 'task-1',
              manifest_path: '.runs/task-1/cli/run-1/manifest.json'
            },
            inherited_from: null
          }
        }
      }),
      'utf8'
    );

    const resolved = await resolveContextSource(
      {
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      } as NodeJS.ProcessEnv,
      sandbox,
      'fallback goal text'
    );

    expect(resolved).toEqual({
      source: { type: 'dir', value: contextDir },
      bytes: 4096,
      explicit: true
    });
  });
});
