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

async function writeDocsCatalogFixture(
  repoRoot: string,
  {
    entries = [],
    patterns = [],
    readmeBudget = { max_lines: 240, max_h2_sections: 9 }
  }: {
    entries?: Array<Record<string, unknown>>;
    patterns?: Array<Record<string, unknown>>;
    readmeBudget?: { max_lines: number; max_h2_sections: number };
  } = {}
) {
  await mkdir(join(repoRoot, 'docs', 'guides'), { recursive: true });
  await writeFile(
    join(repoRoot, 'docs', 'guides', 'codex-version-policy.md'),
    [
      '# Codex Version Policy (CO)',
      '',
      '- Current CO compatibility/adoption target remains stable Codex CLI `0.117.0` for the current upstream-aligned main baseline.',
      '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
      '- Local appserver remains the expected default runtime path after the `CO-22` canary.',
      ''
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    join(repoRoot, 'docs', 'docs-catalog.json'),
    JSON.stringify(
      {
        version: 1,
        classes: {
          front_door: { label: 'Front Door', report_order: 10 },
          repo_guide: { label: 'Repository Guide', report_order: 20 },
          task_packet: { label: 'Task Packet', report_order: 200 }
        },
        policies: {
          codex_posture: {
            source_path: 'docs/guides/codex-version-policy.md'
          },
          readme_front_door: readmeBudget,
          bundled_skills_roster: {
            doc_path: 'README.md',
            section_heading: '## Skills (bundled)',
            list_intro: 'Bundled skills'
          }
        },
        entries,
        patterns
      },
      null,
      2
    ),
    'utf8'
  );
}

describe('docs hygiene tooling', () => {
  it('fails closed when the docs catalog is missing', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-missing-catalog-'));
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
    await writeFile(join(repoRoot, 'README.md'), '# Front door\n', 'utf8');

    await expect(runDocsCheck(repoRoot)).rejects.toThrow('docs/docs-catalog.json');
  });

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
    await writeDocsCatalogFixture(repoRoot);

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

  it('fails closed when tasks/index.json contains non-canonical top-level keys', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-index-shape-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
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
    await writeDocsCatalogFixture(repoRoot);
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify({ items: [], tasks: [] }, null, 2),
      'utf8'
    );
    await writeFile(join(repoRoot, 'docs', 'test.md'), '# Docs\n', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'tasks/index.json',
        rule: 'tasks-index-non-canonical',
        reference: 'non-canonical top-level keys: tasks (allowed: items, specs)'
      })
    );
  });

  it('does not count a trailing newline as an extra docs/TASKS line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-tasks-size-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });

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
    await writeDocsCatalogFixture(repoRoot);
    await writeFile(join(repoRoot, 'tasks', 'index.json'), JSON.stringify({ items: [] }, null, 2), 'utf8');
    await writeFile(
      join(repoRoot, 'docs', 'tasks-archive-policy.json'),
      JSON.stringify({ max_lines: 2 }, null, 2),
      'utf8'
    );
    await writeFile(join(repoRoot, 'docs', 'TASKS.md'), '# Snapshot\n# Detail\n', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'tasks-file-too-large')).toBeUndefined();
  });

  it('flags stale Codex posture references for catalogued front-door docs', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-'));
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
    await writeDocsCatalogFixture(repoRoot, {
      entries: [
        {
          path: 'README.md',
          doc_class: 'front_door',
          truth_checks: ['codex-cli-version']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      ['# Codex Orchestrator', '', 'In Codex CLI `0.111.0`, built-in explorer inherits defaults.', ''].join(
        '\n'
      ),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'Codex CLI version(s) 0.111.0 != current policy 0.117.0'
      })
    );
  });

  it('flags bundled skill roster drift for the README roster source', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-roster-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await mkdir(join(repoRoot, 'skills', 'codex-orchestrator'), { recursive: true });
    await mkdir(join(repoRoot, 'skills', 'linear'), { recursive: true });
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
    await writeDocsCatalogFixture(repoRoot, {
      entries: [
        {
          path: 'README.md',
          doc_class: 'front_door',
          truth_checks: ['bundled-skills-roster']
        }
      ]
    });
    await writeFile(join(repoRoot, 'skills', 'codex-orchestrator', 'SKILL.md'), '# Skill\n', 'utf8');
    await writeFile(join(repoRoot, 'skills', 'linear', 'SKILL.md'), '# Skill\n', 'utf8');
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '## Skills (bundled)',
        '',
        'Bundled skills (may vary by release):',
        '- `codex-orchestrator`',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'bundled-skill-roster-drift',
        reference: 'documented=[codex-orchestrator] shipped=[codex-orchestrator, linear]'
      })
    );
  });

  it('flags front-door budget overflow for README', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-budget-'));
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
    await writeDocsCatalogFixture(repoRoot, {
      entries: [
        {
          path: 'README.md',
          doc_class: 'front_door',
          truth_checks: ['front-door-budget']
        }
      ],
      readmeBudget: { max_lines: 4, max_h2_sections: 1 }
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      ['# Codex Orchestrator', '', '## One', 'a', 'b', '## Two', 'c', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'front-door-budget-exceeded',
        reference: 'lines=7/4 h2=2/1'
      })
    );
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

  it('repairs legacy docs/TASKS sections missing managed markers', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-legacy-'));
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
        '## Checklist Mirror',
        'Old content',
        ''
      ].join('\n'),
      'utf8'
    );

    await runDocsSync(repoRoot, '0906-docs-hygiene-automation');
    const updatedTasks = await readFile(join(repoRoot, 'docs', 'TASKS.md'), 'utf8');

    expect(updatedTasks).toContain('<!-- docs-sync:begin 0906-docs-hygiene-automation -->');
    expect(updatedTasks).toContain('<!-- docs-sync:end 0906-docs-hygiene-automation -->');
    expect(updatedTasks).toContain('### Foundation');
    expect(updatedTasks).not.toContain('Old content');
  });

  it('resolves date-prefixed task ids through normalized task keys during docs sync', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-date-prefixed-'));
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
              id: '20260314-1167-orchestrator-auto-scout-evidence-recorder-extraction',
              path: 'tasks/tasks-1167-orchestrator-auto-scout-evidence-recorder-extraction.md'
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );

    await writeFile(
      join(repoRoot, 'tasks', 'tasks-1167-orchestrator-auto-scout-evidence-recorder-extraction.md'),
      [
        '# Task 1167 — Orchestrator Auto-Scout Evidence Recorder Extraction',
        '',
        '## Checklist',
        '### Foundation',
        '- [x] Docs-first packet exists.',
        ''
      ].join('\n'),
      'utf8'
    );

    await writeFile(
      join(repoRoot, 'docs', 'TASKS.md'),
      [
        '# Task List Snapshot — Orchestrator Auto-Scout Evidence Recorder Extraction (1167)',
        '',
        '<!-- docs-sync:begin 1167-orchestrator-auto-scout-evidence-recorder-extraction -->',
        'Old content',
        '<!-- docs-sync:end 1167-orchestrator-auto-scout-evidence-recorder-extraction -->',
        ''
      ].join('\n'),
      'utf8'
    );

    await runDocsSync(repoRoot, '1167');
    const updatedTasks = await readFile(join(repoRoot, 'docs', 'TASKS.md'), 'utf8');
    expect(updatedTasks).toContain('Mirror status with `tasks/tasks-1167-orchestrator-auto-scout-evidence-recorder-extraction.md`');

    await runDocsSync(repoRoot, '1167-orchestrator-auto-scout-evidence-recorder-extraction');
    const updatedAgent = await readFile(
      join(repoRoot, '.agent', 'task', '1167-orchestrator-auto-scout-evidence-recorder-extraction.md'),
      'utf8'
    );
    expect(updatedAgent).toContain('# Task Checklist — Orchestrator Auto-Scout Evidence Recorder Extraction (1167)');
  });
});
