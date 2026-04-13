import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readRunBlockMemoryIndex, type RunBlockMemoryDescriptor } from '../orchestrator/src/cli/run/blockMemory.js';
import {
  buildActiveCloseoutProvenanceLines,
  buildReviewPromptContext,
  resolveReviewNotes
} from '../scripts/lib/review-prompt-context.js';

const createdSandboxes: string[] = [];

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-prompt-context-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function writeTaskDocsFirstContext(
  sandbox: string,
  taskId: string,
  options: { includeArchitectureBaseline?: boolean } = {}
): Promise<void> {
  await mkdir(join(sandbox, 'tasks', 'specs'), { recursive: true });
  await mkdir(join(sandbox, 'docs'), { recursive: true });
  await writeFile(
    join(sandbox, 'tasks', `tasks-${taskId}.md`),
    [
      `# Task Checklist - ${taskId}`,
      '',
      `- MCP Task ID: \`${taskId}\``,
      `- Primary PRD: \`docs/PRD-${taskId}.md\``,
      `- TECH_SPEC: \`tasks/specs/${taskId}.md\``,
      `- ACTION_PLAN: \`docs/ACTION_PLAN-${taskId}.md\``,
      ''
    ].join('\n'),
    'utf8'
  );
  await writeFile(join(sandbox, 'docs', `PRD-${taskId}.md`), '# PRD\n', 'utf8');
  await writeFile(join(sandbox, 'tasks', 'specs', `${taskId}.md`), '# TECH_SPEC\n', 'utf8');
  await writeFile(join(sandbox, 'docs', `ACTION_PLAN-${taskId}.md`), '# ACTION_PLAN\n', 'utf8');
  if (options.includeArchitectureBaseline) {
    await mkdir(join(sandbox, '.agent', 'system'), { recursive: true });
    await writeFile(join(sandbox, '.agent', 'system', 'architecture.md'), '# Architecture\n', 'utf8');
  }
}

async function makeCloseoutBundle(
  sandbox: string,
  taskId: string,
  bundleName: string
): Promise<string> {
  const bundleDir = join(sandbox, 'out', taskId, 'manual', bundleName);
  await mkdir(bundleDir, { recursive: true });
  await writeFile(join(bundleDir, '09-review.log'), 'placeholder\n', 'utf8');
  return bundleDir;
}

function buildSource0Descriptor(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    schema_version: 1,
    kind: 'context_object',
    object_id: 'sha256:source0',
    pointer: 'ctx:sha256:source0#chunk:c000001',
    dir_path: '.runs/sample-task/cli/sample-run/memory/source-0',
    index_path: '.runs/sample-task/cli/sample-run/memory/source-0/index.json',
    source_path: '.runs/sample-task/cli/sample-run/memory/source-0/source.txt',
    byte_length: 128,
    chunk_count: 1,
    created_at: '2026-04-01T00:00:00.000Z',
    origin: {
      run_id: 'sample-run',
      task_id: 'sample-task',
      manifest_path: '.runs/sample-task/cli/sample-run/manifest.json'
    },
    inherited_from: null,
    ...overrides
  };
}

function buildBlockMemoryDescriptor(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    schema_version: 1,
    kind: 'index',
    index_path: '.runs/sample-task/cli/sample-run/memory/block-memory/index.json',
    generated_at: '2026-04-01T00:00:00.000Z',
    block_count: 2,
    ...overrides
  };
}

function buildBlockMemoryIndex(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    schema_version: 1,
    kind: 'run_block_memory',
    generated_at: '2026-04-01T00:00:00.000Z',
    run_contract: {
      task_id: 'sample-task',
      run_id: 'sample-run',
      pipeline_id: 'implementation-gate',
      pipeline_title: 'Implementation Gate'
    },
    artifacts: {
      manifest_path: '.runs/sample-task/cli/sample-run/manifest.json',
      run_summary_path: '.runs/sample-task/cli/sample-run/run-summary.json',
      events_path: '.runs/sample-task/cli/sample-run/events.jsonl',
      runner_log_path: '.runs/sample-task/cli/sample-run/runner.ndjson'
    },
    blocks: [
      {
        id: 'run:completion',
        phase_kind: 'run',
        title: 'Run completion',
        status: 'succeeded',
        summary: 'completed',
        pointer: 'ctx:sha256:block-run#chunk:c000001',
        object_id: 'sha256:block-run',
        dir_path: '.runs/sample-task/cli/sample-run/memory/block-memory/blocks/00-run-completion',
        index_path: '.runs/sample-task/cli/sample-run/memory/block-memory/blocks/00-run-completion/index.json',
        source_path: '.runs/sample-task/cli/sample-run/memory/block-memory/blocks/00-run-completion/source.txt',
        byte_length: 256,
        chunk_count: 1,
        created_at: '2026-04-01T00:00:00.000Z',
        traceability: {
          manifest_path: '.runs/sample-task/cli/sample-run/manifest.json',
          run_summary_path: '.runs/sample-task/cli/sample-run/run-summary.json',
          events_path: '.runs/sample-task/cli/sample-run/events.jsonl',
          runner_log_path: '.runs/sample-task/cli/sample-run/runner.ndjson',
          command_log_path: null,
          sub_run_manifest_path: null,
          event_query: {
            event_types: ['run_started', 'run_completed'],
            stage_id: null,
            stage_index: null
          }
        }
      },
      {
        id: 'stage:docs-review',
        phase_kind: 'stage',
        title: 'Docs review',
        status: 'succeeded',
        summary: 'docs ok',
        pointer: 'ctx:sha256:block-stage#chunk:c000001',
        object_id: 'sha256:block-stage',
        dir_path: '.runs/sample-task/cli/sample-run/memory/block-memory/blocks/01-docs-review',
        index_path: '.runs/sample-task/cli/sample-run/memory/block-memory/blocks/01-docs-review/index.json',
        source_path: '.runs/sample-task/cli/sample-run/memory/block-memory/blocks/01-docs-review/source.txt',
        byte_length: 256,
        chunk_count: 1,
        created_at: '2026-04-01T00:00:00.000Z',
        traceability: {
          manifest_path: '.runs/sample-task/cli/sample-run/manifest.json',
          run_summary_path: '.runs/sample-task/cli/sample-run/run-summary.json',
          events_path: '.runs/sample-task/cli/sample-run/events.jsonl',
          runner_log_path: '.runs/sample-task/cli/sample-run/runner.ndjson',
          command_log_path: '.runs/sample-task/cli/sample-run/commands/docs-review.ndjson',
          sub_run_manifest_path: null,
          event_query: {
            event_types: ['step_started', 'step_completed', 'step_failed'],
            stage_id: 'docs-review',
            stage_index: 0
          }
        }
      }
    ],
    ...overrides
  };
}

afterEach(async () => {
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('review-prompt-context', () => {
  it('returns generated fallback notes when NOTES is absent', () => {
    const fallback = resolveReviewNotes({
      notes: undefined,
      taskLabel: 'sample-task',
      surface: 'diff'
    });

    expect(fallback).toContain('Goal: standalone review handoff');
    expect(fallback).toContain('task=sample-task');
    expect(fallback).toContain('surface=diff');
  });

  it('returns architecture context paths and prompt lines from docs-first task metadata', async () => {
    const sandbox = await makeSandbox();
    await writeTaskDocsFirstContext(sandbox, 'sample-task', { includeArchitectureBaseline: true });

    const result = await buildReviewPromptContext({
      repoRoot: sandbox,
      taskKey: 'sample-task',
      taskLabel: 'sample-task',
      reviewSurface: 'architecture',
      relativeManifest: '.runs/sample-task/cli/sample-run/manifest.json',
      runnerLogExists: true,
      relativeRunnerLog: '.runs/sample-task/cli/sample-run/runner.ndjson',
      notes: 'Goal: helper test | Summary: architecture surface | Risks: none',
      scopeMode: 'uncommitted'
    });

    expect(result.promptLines).toContain('Review surface: architecture');
    expect(result.promptLines).toContain('Task context:');
    expect(result.promptLines).toContain('- Task checklist: `tasks/tasks-sample-task.md`');
    expect(result.promptLines).toContain('- Primary PRD: `docs/PRD-sample-task.md`');
    expect(result.promptLines).toContain('- TECH_SPEC: `tasks/specs/sample-task.md`');
    expect(result.promptLines).toContain('- ACTION_PLAN: `docs/ACTION_PLAN-sample-task.md`');
    expect(result.promptLines).toContain('- Repo architecture baseline: `.agent/system/architecture.md`');
    expect(result.reviewTaskContext.architectureSurfacePaths).toEqual([
      join(sandbox, 'tasks', 'tasks-sample-task.md'),
      join(sandbox, 'docs', 'PRD-sample-task.md'),
      join(sandbox, 'tasks', 'specs', 'sample-task.md'),
      join(sandbox, 'docs', 'ACTION_PLAN-sample-task.md'),
      join(sandbox, '.agent', 'system', 'architecture.md')
    ]);
    expect(result.activeCloseoutBundleRoots).toEqual([]);
  });

  it('keeps active closeout roots separate from the prompt scaffold on diff surface', async () => {
    const sandbox = await makeSandbox();
    const todoCloseout = await makeCloseoutBundle(sandbox, 'sample-task', 'TODO-closeout');
    const olderCloseout = await makeCloseoutBundle(sandbox, 'sample-task', '20260315T010000Z-closeout');
    await makeCloseoutBundle(sandbox, 'sample-task', '20260315T020000Z-closeout');

    const result = await buildReviewPromptContext({
      repoRoot: sandbox,
      taskKey: 'sample-task',
      taskLabel: 'sample-task',
      reviewSurface: 'diff',
      relativeManifest: '.runs/sample-task/cli/sample-run/manifest.json',
      runnerLogExists: false,
      relativeRunnerLog: '.runs/sample-task/cli/sample-run/runner.ndjson',
      notes: undefined,
      scopeMode: 'base'
    });

    expect(result.promptLines).toContain('Review surface: diff');
    expect(result.promptLines).toContain('Agent notes:');
    expect(result.promptLines.join('\n')).toContain('auto-generated NOTES fallback');
    expect(result.promptLines.join('\n')).not.toContain('Active closeout provenance:');
    expect(result.activeCloseoutBundleRoots).toEqual([
      todoCloseout,
      join(sandbox, 'out', 'sample-task', 'manual', '20260315T020000Z-closeout')
    ]);
    expect(buildActiveCloseoutProvenanceLines(sandbox, result.activeCloseoutBundleRoots)).toEqual([
      'Active closeout provenance:',
      '- Resolved active closeout root: `out/sample-task/manual/TODO-closeout`',
      '- Resolved active closeout root: `out/sample-task/manual/20260315T020000Z-closeout`',
      '- These roots are already-resolved self-referential review surfaces for this task; do not re-derive or re-enumerate them unless directly necessary to assess code correctness.'
    ]);
    expect(olderCloseout).not.toBe(result.activeCloseoutBundleRoots[1]);
  });

  it('adds shared source 0 prompt lines when the manifest exposes the anchor', async () => {
    const sandbox = await makeSandbox();
    const manifestDir = join(sandbox, '.runs', 'sample-task', 'cli', 'sample-run');
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      join(manifestDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'sample-run',
        task_id: 'sample-task',
        memory: {
          source_0: buildSource0Descriptor({
            inherited_from: {
              run_id: 'parent-run',
              task_id: 'parent-task',
              manifest_path: '.runs/parent-task/cli/parent-run/manifest.json'
            }
          })
        }
      }),
      'utf8'
    );

    const result = await buildReviewPromptContext({
      repoRoot: sandbox,
      taskKey: 'sample-task',
      taskLabel: 'sample-task',
      reviewSurface: 'diff',
      relativeManifest: '.runs/sample-task/cli/sample-run/manifest.json',
      runnerLogExists: false,
      relativeRunnerLog: '.runs/sample-task/cli/sample-run/runner.ndjson',
      notes: 'Goal: helper test | Summary: source 0 | Risks: none',
      scopeMode: 'uncommitted'
    });

    expect(result.promptLines).toContain('Shared source 0 anchor:');
    expect(result.promptLines).toContain('- Pointer: `ctx:sha256:source0#chunk:c000001`');
    expect(result.promptLines).toContain('- Source payload: `.runs/sample-task/cli/sample-run/memory/source-0/source.txt`');
    expect(result.promptLines).toContain(
      '- Origin: run=`sample-run`, task=`sample-task`, manifest=`.runs/sample-task/cli/sample-run/manifest.json`'
    );
    expect(result.promptLines).toContain(
      '- Inherited from: run=`parent-run`, task=`parent-task`, manifest=`.runs/parent-task/cli/parent-run/manifest.json`'
    );
  });

  it('adds shared block memory prompt lines when the manifest exposes the index', async () => {
    const sandbox = await makeSandbox();
    const manifestDir = join(sandbox, '.runs', 'sample-task', 'cli', 'sample-run', 'memory', 'block-memory');
    await mkdir(manifestDir, { recursive: true });
    await writeFile(join(manifestDir, 'index.json'), JSON.stringify(buildBlockMemoryIndex()), 'utf8');
    await writeFile(
      join(sandbox, '.runs', 'sample-task', 'cli', 'sample-run', 'manifest.json'),
      JSON.stringify({
        run_id: 'sample-run',
        task_id: 'sample-task',
        memory: {
          block_memory: buildBlockMemoryDescriptor()
        }
      }),
      'utf8'
    );

    const result = await buildReviewPromptContext({
      repoRoot: sandbox,
      taskKey: 'sample-task',
      taskLabel: 'sample-task',
      reviewSurface: 'diff',
      relativeManifest: '.runs/sample-task/cli/sample-run/manifest.json',
      runnerLogExists: false,
      relativeRunnerLog: '.runs/sample-task/cli/sample-run/runner.ndjson',
      notes: 'Goal: helper test | Summary: block memory | Risks: none',
      scopeMode: 'uncommitted'
    });

    expect(result.promptLines).toContain('Shared block memory:');
    expect(result.promptLines).toContain(
      '- Index: `.runs/sample-task/cli/sample-run/memory/block-memory/index.json`'
    );
    expect(result.promptLines).toContain('- Blocks: 2');
    expect(result.promptLines).toContain(
      '- Block `run:completion` (run, succeeded): `ctx:sha256:block-run#chunk:c000001`'
    );
    expect(result.promptLines).toContain(
      '- Block `stage:docs-review` (stage, succeeded): `ctx:sha256:block-stage#chunk:c000001`'
    );
  });

  it('rejects Windows drive-relative block memory index paths', async () => {
    await expect(
      readRunBlockMemoryIndex(
        '/tmp/repo',
        buildBlockMemoryDescriptor({ index_path: 'C:foo\\index.json' }) as RunBlockMemoryDescriptor
      )
    ).rejects.toThrow('block_memory index_path must be repo-relative');
  });
});
