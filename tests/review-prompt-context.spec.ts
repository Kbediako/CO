import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

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
});
