import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDocsCheck, runDocsSync } from '../scripts/docs-hygiene.js';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('docs hygiene tooling', () => {
  it('flags missing npm scripts, missing pipelines, and missing backticked paths', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-check-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });

    await writeFile(
      join(repoRoot, 'package.json'),
      JSON.stringify({ name: 'fixture', scripts: { lint: 'echo ok' } }, null, 2),
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'codex.orchestrator.json'),
      JSON.stringify({ pipelines: [{ id: 'diagnostics' }] }, null, 2),
      'utf8'
    );

    await writeFile(join(repoRoot, 'docs', 'existing.md'), '# Exists\n', 'utf8');
    await writeFile(
      join(repoRoot, 'docs', 'test.md'),
      [
        'Run `npm run lint` and `npm run missing-script`.',
        'Then `codex-orchestrator start diagnostics` and `codex-orchestrator start missing-pipeline`.',
        '',
        'Paths:',
        '- `docs/existing.md`',
        '- `docs/missing.md`',
        '- `.runs/0906-docs-hygiene-automation/cli/whatever/manifest.json`',
        '- `out/0906-docs-hygiene-automation/state.json`',
        '- `archives/some/pruned/artifact.json`',
        '- `packages/{foo,bar}/public/**`',
        '- `node scripts/spec-guard.mjs --dry-run`',
        '- `.runs/<task-id>/cli/<run-id>/manifest.json`',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'docs/test.md',
          rule: 'npm-script-missing',
          reference: 'npm run missing-script'
        }),
        expect.objectContaining({
          file: 'docs/test.md',
          rule: 'pipeline-id-missing',
          reference: 'codex-orchestrator start missing-pipeline'
        }),
        expect.objectContaining({
          file: 'docs/test.md',
          rule: 'backticked-path-missing',
          reference: 'docs/missing.md'
        })
      ])
    );

    expect(errors.find((error) => error.reference.includes('.runs/'))).toBeUndefined();
    expect(errors.find((error) => error.reference.includes('out/'))).toBeUndefined();
    expect(errors.find((error) => error.reference.includes('archives/'))).toBeUndefined();
  });

  it('syncs mirrors for an active task idempotently', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-sync-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await mkdir(join(repoRoot, '.agent', 'task'), { recursive: true });

    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '0906',
              slug: 'docs-hygiene-automation',
              path: 'tasks/tasks-0906-docs-hygiene-automation.md'
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );

    await writeFile(
      join(repoRoot, 'tasks', 'tasks-0906-docs-hygiene-automation.md'),
      [
        '# Task 0906 — Docs Hygiene Automation & Review Handoff Gate',
        '',
        '## Checklist',
        '### Foundation',
        '- [x] Collateral drafted — Evidence: this commit.',
        '',
        '### Docs hygiene tool',
        '- [ ] Add `docs:check`.',
        ''
      ].join('\n'),
      'utf8'
    );

    await writeFile(
      join(repoRoot, 'docs', 'TASKS.md'),
      [
        '# Task List Snapshot — Docs Hygiene Automation & Review Handoff Gate (0906)',
        '',
        '- Notes.',
        '',
        '<!-- docs-sync:begin 0906-docs-hygiene-automation -->',
        '## Checklist Mirror',
        'Old content',
        '<!-- docs-sync:end 0906-docs-hygiene-automation -->',
        ''
      ].join('\n'),
      'utf8'
    );

    await runDocsSync(repoRoot, '0906');
    const firstAgent = await readFile(join(repoRoot, '.agent', 'task', '0906-docs-hygiene-automation.md'), 'utf8');
    const firstTasks = await readFile(join(repoRoot, 'docs', 'TASKS.md'), 'utf8');

    await runDocsSync(repoRoot, '0906-docs-hygiene-automation');
    const secondAgent = await readFile(join(repoRoot, '.agent', 'task', '0906-docs-hygiene-automation.md'), 'utf8');
    const secondTasks = await readFile(join(repoRoot, 'docs', 'TASKS.md'), 'utf8');

    expect(secondAgent).toBe(firstAgent);
    expect(secondTasks).toBe(firstTasks);

    expect(firstAgent).toContain('# Task Checklist — Docs Hygiene Automation & Review Handoff Gate (0906)');
    expect(firstAgent).toContain('## Foundation');
    expect(firstAgent).not.toContain('### Foundation');

    expect(firstTasks).toContain('<!-- docs-sync:begin 0906-docs-hygiene-automation -->');
    expect(firstTasks).toContain('### Foundation');
    expect(firstTasks).toContain('Mirror status with `tasks/tasks-0906-docs-hygiene-automation.md`');
  });
});
