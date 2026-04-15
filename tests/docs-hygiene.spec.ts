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
      '- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
      '- When authenticating through ChatGPT, do not target delegated or review surfaces at `gpt-5.4-codex`; those runs currently fail immediately. Use `gpt-5.4` instead until provider compatibility changes.',
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

  it('accepts the current Codex CLI version when docs use the parenthesized posture form', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-parenthesized-version-'));
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
      ['# Codex Orchestrator', '', '- Current CO compatibility/adoption target is stable Codex CLI (`0.117.0`).', ''].join(
        '\n'
      ),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'doc-posture-stale')
    ).toBeUndefined();
  });

  it('matches docs catalog entries after normalizing relative and Windows-style paths', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-catalog-normalized-entry-'));
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
          path: './README.md',
          doc_class: 'front_door',
          truth_checks: ['codex-cli-version']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      ['# Codex Orchestrator', '', '- Current CO compatibility/adoption target is stable Codex CLI (`0.117.0`).', ''].join(
        '\n'
      ),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find(
        (error) =>
          error.file === 'README.md' &&
          (error.rule === 'doc-posture-unresolved' || error.rule === 'doc-posture-stale')
      )
    ).toBeUndefined();
  });

  it('fails closed when a checked doc drops the current Codex CLI version mention entirely', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-missing-version-'));
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
      ['# Codex Orchestrator', '', 'This front door mentions no explicit Codex CLI version.', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'missing Codex CLI version 0.117.0'
      })
    );
  });

  it('accepts the parenthesized Codex CLI form when resolving the policy source posture', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-parenthesized-source-'));
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
      join(repoRoot, 'docs', 'guides', 'codex-version-policy.md'),
      [
        '# Codex Version Policy (CO)',
        '',
        '- Current CO compatibility/adoption target remains stable Codex CLI (`0.117.0`) for the current upstream-aligned main baseline.',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Local appserver remains the expected default runtime path after the `CO-22` canary.',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'README.md'),
      ['# Codex Orchestrator', '', '- Current CO compatibility/adoption target is stable Codex CLI (`0.117.0`).', ''].join(
        '\n'
      ),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find(
        (error) =>
          error.file === 'README.md' &&
          (error.rule === 'doc-posture-unresolved' || error.rule === 'doc-posture-stale')
      )
    ).toBeUndefined();
  });

  it('accepts the colon model-posture form when resolving the policy source posture', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-colon-source-model-posture-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'guides', 'codex-version-policy.md'),
      [
        '# Codex Version Policy (CO)',
        '',
        '- Current CO compatibility/adoption target remains stable Codex CLI (`0.117.0`) for the current upstream-aligned main baseline.',
        '- Current model posture: `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
        '- When authenticating through ChatGPT, do not target delegated or review surfaces at `gpt-5.4-codex`; those runs currently fail immediately. Use `gpt-5.4` instead until provider compatibility changes.',
        '- Local appserver remains the expected default runtime path after the `CO-22` canary.',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture: `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` remains the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find(
        (error) =>
          error.file === 'README.md' &&
          (error.rule === 'doc-posture-unresolved' || error.rule === 'doc-posture-stale')
      )
    ).toBeUndefined();
  });

  it('accepts the slash unsupported-review form when resolving the policy source posture', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-slash-source-warning-posture-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'guides', 'codex-version-policy.md'),
      [
        '# Codex Version Policy (CO)',
        '',
        '- Current CO compatibility/adoption target remains stable Codex CLI (`0.117.0`) for the current upstream-aligned main baseline.',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
        '- When authenticating through ChatGPT, do not target delegated/review surfaces at `gpt-5.4-codex`; those runs currently fail immediately. Use `gpt-5.4` instead until provider compatibility changes.',
        '- Local appserver remains the expected default runtime path after the `CO-22` canary.',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- On ChatGPT-auth sessions, do not target delegated/review surfaces at `gpt-5.4-codex`; those runs currently fail immediately. Use `gpt-5.4` until provider compatibility changes.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find(
        (error) =>
          error.file === 'README.md' &&
          (error.rule === 'doc-posture-unresolved' || error.rule === 'doc-posture-stale')
      )
    ).toBeUndefined();
  });

  it('accepts the positive unsupported-review form when resolving the policy source posture', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-positive-source-warning-posture-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'guides', 'codex-version-policy.md'),
      [
        '# Codex Version Policy (CO)',
        '',
        '- Current CO compatibility/adoption target remains stable Codex CLI (`0.117.0`) for the current upstream-aligned main baseline.',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
        '- Keep delegated subagent and review surfaces on `gpt-5.4` as well when using ChatGPT auth; `gpt-5.4-codex` is currently unsupported there.',
        '- Local appserver remains the expected default runtime path after the `CO-22` canary.',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Keep delegated subagent and review surfaces on `gpt-5.4` as well when using ChatGPT auth; `gpt-5.4-codex` is currently unsupported there.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find(
        (error) =>
          error.file === 'README.md' &&
          (error.rule === 'doc-posture-unresolved' || error.rule === 'doc-posture-stale')
      )
    ).toBeUndefined();
  });

  it('requires the current model posture when a doc opts into model truth checks', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        'Current model posture: `gpt-5.3-codex-spark` for top-level, delegated subagent, and review surfaces.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex-spark missing current policy gpt-5.4'
      })
    );
  });

  it('does not let incidental config examples satisfy the model posture truth check', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-config-only-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Recommended baseline:',
        '  - `model = "gpt-5.4"`',
        '  - `review_model = "gpt-5.4"`',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'missing model posture gpt-5.4'
      })
    );
  });

  it('does not let a compatibility warning line hide a stale model posture line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-warning-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.3-codex` for top-level, delegated subagent, and review surfaces.',
        '- When authenticating through ChatGPT, do not target delegated or review surfaces at `gpt-5.4-codex`; those runs currently fail immediately. Use `gpt-5.4` instead until provider compatibility changes.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex missing current policy gpt-5.4'
      })
    );
  });

  it('does not let a current secondary posture line hide a stale primary posture line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-mixed-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.3-codex` for top-level, delegated subagent, and review surfaces.',
        '- Keep delegated subagent and review surfaces on `gpt-5.4` as well when using ChatGPT auth.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex missing current policy gpt-5.4'
      })
    );
  });

  it('accepts a current secondary ChatGPT-auth evidence line alongside the current primary posture line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-chatgpt-auth-current-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- For ChatGPT auth, this means `gpt-5.4`, not `gpt-5.4-codex`, unless new compatibility evidence exists.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'doc-posture-stale')
    ).toBeUndefined();
  });

  it('accepts a current split explorer_fast exception line alongside the current primary posture line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-explorer-fast-split-current-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` remains the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
        '- `explorer_fast` is limited to file/codebase search only.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'doc-posture-stale')
    ).toBeUndefined();
    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'spark-policy-overbroad')
    ).toBeUndefined();
  });

  it('rejects overbroad spark role wording in posture-checked docs', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-overbroad-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` remains the only explicit `gpt-5.3-codex-spark` exception for fast search/synthesis.',
        '- The spark policy permits planning.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 4: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 5: spark role must be file/codebase search only'
      })
    );
  });

  it('accepts restrictive non-use wording for spark planning and review', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-restrictive-wording-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` remains the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only; do not use it for planning or review.',
        '- For planning or review, do not use spark roles.',
        '- For planning or review, do not use `explorer_fast`.',
        '- For planning or review, do not use `gpt-5.3-codex-spark`.',
        '- Planning or review should not use spark roles.',
        '- For planning, do not route to spark roles.',
        '- For review, do not choose the spark role.',
        '- Do not use spark for planning, only use gpt-5.4.',
        '- Do not use spark for planning and only use gpt-5.4.',
        '- For planning, do not use spark because non-spark roles are limited.',
        '- Do not use spark, limit planning to gpt-5.4.',
        '- The spark policy must not permit planning.',
        '- For planning or review, do not use',
        '  `explorer_fast`.',
        '- Spark roles are file/codebase search only, but do not use spark for planning.',
        '- Spark roles are file/codebase search only, but planning should not use spark roles.',
        '- Use `explorer_fast` for file/codebase search without planning or review.',
        '- For file/codebase search, `explorer_fast` is limited to search only.',
        '- For codebase-search, spark roles are search-only.',
        '1. For file/codebase search, spark roles are search-only.',
        '- Only for file/codebase search, use explorer_fast.',
        '- When choosing roles, for file/codebase search, use explorer_fast.',
        '- Use `explorer_fast` and spark roles for file/codebase search only.',
        '- Spark roles are file/codebase search only, and the spark policy should stay locked.',
        '- Spark roles are file/codebase search only, and search-policy docs should stay locked.',
        '- Spark roles are file/codebase search only and search-policy docs should stay locked.',
        '- Spark policy scope',
        '  lives in AGENTS.md.',
        '- Spark policy scope lives in AGENTS.md.',
        '- Spark policy scope lives in AGENTS.md, and spark roles remain file/codebase search only.',
        '- Spark policy scope lives in docs/search-policy.md.',
        '- Spark policy scope lives in AGENTS.md; docs should stay locked.',
        '- Spark policy scope lives in AGENTS.md. Docs should stay locked.',
        '- Spark policy review notes were updated.',
        '- Spark support docs were updated.',
        '- Spark role support notes live in AGENTS.md.',
        '- Spark roles support notes live in AGENTS.md.',
        '- `explorer_fast` support docs were updated.',
        '- `gpt-5.3-codex-spark` support docs were updated.',
        '- `explorer_fast` remains the only explicit exception, for file/codebase search only.',
        '- _explorer_fast_, limited to file/codebase search, remains the only exception.',
        '- Leave `explorer_fast` unset by default.',
        '- Keep spark roles disabled unless a file/codebase search lane opts in.',
        '- Keep spark roles disabled until file/codebase search lanes need them.',
        '- `gpt-5.3-codex-spark` remains inactive by default.',
        '- Spark roles are off by default.',
        '- Spark roles are off by default, and docs should use gpt-5.4 terminology.',
        '- Spark roles are off by default and not available for search lanes.',
        '- Spark roles are off by default and are not available for search lanes.',
        '- Spark roles are off by default and not intended for search lanes.',
        '- Spark roles are off by default and not used for search lanes.',
        '- Spark roles are off by default and may be used for file/codebase search.',
        '- Spark roles are off by default, not globally enabled, but may be used for codebase search.',
        '- Spark roles are off by default; enabled only for file/codebase search.',
        '- Spark roles are off by default and may be used for file/codebase search, and `explorer_fast` remains inactive and can be used for file/codebase search.',
        '- Spark roles are off by default and file/codebase search-only when enabled.',
        '- Spark roles are file/codebase search only and can be used for file/codebase search lanes.',
        '- Use `explorer_fast`, spark roles, and `gpt-5.3-codex-spark` for file/codebase search only.',
        '- `explorer_fast` can help with file/codebase search debugging.',
        '- For file/codebase search diagnostics, spark roles can assist.',
        '- `gpt-5.3-codex-spark` is useful for codebase-search troubleshooting.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'spark-policy-overbroad')
    ).toBeUndefined();
  });

  it('rejects generic spark capability wording without file/codebase search scope', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-generic-capability-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` can help with debugging.',
        '- Spark roles can assist with diagnostics.',
        '- `gpt-5.3-codex-spark` is helpful for incident triage.',
        '- Spark roles are useful for repository troubleshooting.',
        '- For debugging, spark roles can help quickly.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    for (const lineNumber of [4, 5, 6, 7, 8]) {
      expect(errors).toContainEqual(
        expect.objectContaining({
          file: 'README.md',
          rule: 'spark-policy-overbroad',
          reference: `line ${lineNumber}: spark role missing file/codebase search-only scope`
        })
      );
    }
  });

  it('rejects disabled spark wording that resumes active unqualified use', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-disabled-active-use-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Spark roles are off by default and may be used for search.',
        '- Keep spark roles disabled by default and use them for search lanes.',
        '- `explorer_fast` remains inactive by default and can be used for search.',
        '- Spark roles are off by default and only available for search.',
        '- Spark roles remain disabled by default but are only for search lanes.',
        '- Spark roles are off by default and search-only.',
        '- Spark roles are off by default and search only.',
        '- Spark roles remain inactive and only-search.',
        '- Spark roles are disabled by default, search-only when enabled.',
        '- Spark roles are off by default and may be used for file/codebase search, and `explorer_fast` remains inactive and can be used for search.',
        '- Keep spark roles disabled unless a search lane opts in.',
        '- Spark roles are off by default, not globally enabled, but may be used for search.',
        '- Spark roles are off by default, not globally enabled, and may be used for search.',
        '- Spark roles are off by default and are not used globally, but may be used for search lanes.',
        '- Spark roles are off by default and should be selected for search lanes.',
        '- Spark roles are off by default but may be used for image inputs.',
        '- Spark roles are off by default and can be selected for visual tasks.',
        '- Keep spark roles disabled until search lanes need them.',
        '- Spark roles are off by default; enabled only for search.',
        '- Spark roles are off by default and keep search lanes enabled.',
        '- Spark roles are off by default and make search lanes available.',
        '- Spark roles are off by default and leave search lanes enabled.',
        '- Spark roles support image inputs.',
        '- Spark roles support documentation generation.',
        '- Spark roles support image inputs for file/codebase search.',
        '- Spark roles support image generation.',
        '- Spark roles support visual analysis.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 4: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 5: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 6: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 7: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 8: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 9: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 10: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 11: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 12: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 13: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 14: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 15: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 16: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 17: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 18: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 19: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 20: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 21: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 22: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 23: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 24: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 25: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 26: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 27: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 28: spark role missing file/codebase search-only scope'
      })
    );
  });

  it('rejects spark policy noun wording that asserts unqualified scope or other work', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-noun-scope-assertions-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- The spark policy must be search-only.',
        '- The spark policy permits image inputs.',
        '- The spark policy remains text-only.',
        '- The spark policy should stay text-only.',
        '- The spark policy',
        '  permits planning.',
        '- Spark policy scope lives in AGENTS.md, and spark roles should stay enabled.',
        '- The spark policy should stay enabled.',
        '- The spark policy must remain only for search lanes.',
        '- Spark policy scope lives in AGENTS.md, and permits planning.',
        '- Spark policy scope lives in AGENTS.md, and remains only for search lanes.',
        '- Spark policy scope lives in AGENTS.md; permits planning.',
        '- Spark policy scope lives in AGENTS.md; remains only for search lanes.',
        '- Spark policy scope lives in AGENTS.md. It permits planning.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 4: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 5: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 6: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 7: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 8: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 10: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 11: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 12: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 13: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 14: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 15: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 16: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 17: spark role must be file/codebase search only'
      })
    );
  });

  it('accepts non-spark redirect wording for planning and review', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-non-spark-redirect-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Spark roles are file/codebase search only; use non-spark roles for planning or review.',
        '- Spark roles are file/codebase search only, but use non-spark roles for implementation.',
        '- For planning or review, use non-spark roles.',
        '- Choose a non-spark role instead of `explorer_fast`.',
        '- Prefer a non-spark role over `explorer_fast`.',
        '- Select a non-spark model rather than `gpt-5.3-codex-spark`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'spark-policy-overbroad')
    ).toBeUndefined();
  });

  it('accepts plain and restrictive spark references without requiring a repeated scope phrase', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-plain-caveat-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Reference note: `gpt-5.3-codex-spark` compatibility can change.',
        '- Do not use spark for planning or review.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'spark-policy-overbroad')
    ).toBeUndefined();
  });

  it('rejects non-restrictive negation for spark planning usage', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-non-restrictive-negation-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` is not limited to file/codebase search and can help with planning.',
        '- Spark roles can help with planning, but do not use spark for images.',
        '- Spark roles can help with review, do not use spark for images.',
        '- For planning, spark roles can help, do not use spark for images.',
        '- Do not use spark for images, but spark roles can help with planning.',
        '- Use non-spark roles for images, but spark roles can help with review.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 4: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 5: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 6: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 7: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 8: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 9: spark role must be file/codebase search only'
      })
    );
  });

  it('rejects wrapped markdown spark role policy violations', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-wrapped-overbroad-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` remains the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only,',
        '  but can help with planning.',
        '- For planning or review, use',
        '  `explorer_fast` for file/codebase search only.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 4: spark role must be file/codebase search only'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 7: spark role must be file/codebase search only'
      })
    );
  });

  it('rejects negated file search-only scope for spark roles', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-negated-scope-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` is not limited to file/codebase search.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 4: spark role must be file/codebase search only'
      })
    );
  });

  it('requires spark role lines to name file or codebase search scope', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-spark-policy-missing-scope-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` remains the only explicit `gpt-5.3-codex-spark` exception.',
        '- Keep `explorer_fast` on `gpt-5.3-codex-spark` without changing defaults.',
        '- `explorer_fast` is limited to search.',
        '- `explorer_fast` is limited to search; do not use it for planning.',
        '- Do not use spark for planning; `explorer_fast` is limited to search.',
        '- Do not use spark for planning, and `explorer_fast` is limited to search.',
        '- Do not use spark for planning, and `explorer_fast`, limited to search, remains the only spark exception.',
        '- Do not use spark for planning, and the `explorer_fast` role, limited to search, remains the only spark exception.',
        '- Confining `explorer_fast` to search keeps it narrow.',
        '- Spark roles are file/codebase search only; `explorer_fast` is limited to search.',
        '- `explorer_fast` is limited to search and spark roles are file/codebase search only.',
        '- Spark roles are file/codebase search only; `explorer_fast` is search only.',
        '- Spark roles are file/codebase search only; `explorer_fast` is only search.',
        '- Spark roles are file/codebase search only and `explorer_fast` is limited to search.',
        '- Spark roles are file/codebase search only and `explorer_fast` is search-only.',
        '- Spark roles are file/codebase search only and `explorer_fast` is only-search.',
        '- Spark roles are file/codebase search only or `explorer_fast` is search-only.',
        '- Spark roles are file/codebase search only and `explorer_fast` remains the only explicit exception.',
        '- Do not use spark for planning and keep `explorer_fast` limited to search.',
        '- Spark roles are file/codebase search only and use `explorer_fast` for search.',
        '- Spark roles are file/codebase search only and using `explorer_fast` for search.',
        '- Spark roles are file/codebase search only and may use `explorer_fast` for search.',
        '- Spark roles are file/codebase search only and allow `explorer_fast` for search.',
        '- Spark roles are file/codebase search only and permit `explorer_fast` for search.',
        '- Spark roles are file/codebase search only and limit `explorer_fast` to search.',
        '- Spark roles are file/codebase search only and restrict `explorer_fast` to search.',
        '- Spark roles are file/codebase search only and confine `explorer_fast` to search.',
        '- Spark roles are file/codebase search only and _explorer_fast_, limited to search, remains the exception.',
        '- Use `explorer_fast`, spark roles, and `gpt-5.3-codex-spark` for search only.',
        '- Spark roles are file/codebase search only and can be used for search lanes.',
        '- Spark roles are file/codebase search only and should be used for search lanes.',
        '- Spark roles are file/codebase search only and may be used for search.',
        '- Spark roles are file/codebase search only, and may be used for search.',
        '- Spark roles may be used for search and are file/codebase search only.',
        '- Spark roles may be used for search lanes and are file/codebase search only.',
        '- Spark roles are search-only and file/codebase search only.',
        '- Spark roles are file/codebase search only and may be used for image inputs.',
        '- Spark roles are file/codebase search only and can be selected for visual tasks.',
        '- Spark roles are file/codebase search only and support image generation.',
        '- Spark roles are file/codebase search only and support visual analysis.',
        '- Spark roles are file/codebase search only, and they remain only for search lanes.',
        '- Spark roles are file/codebase search only, and they stay only for search lanes.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 4: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 5: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 6: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 7: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 8: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 9: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 10: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 11: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 12: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 13: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 14: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 15: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 16: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 17: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 18: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 19: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 20: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 21: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 22: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 23: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 24: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 25: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 26: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 27: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 28: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 29: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 30: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 31: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 32: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 33: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 34: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 35: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 36: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 37: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 38: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 39: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 40: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 41: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 42: spark role missing file/codebase search-only scope'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'spark-policy-overbroad',
        reference: 'line 43: spark role missing file/codebase search-only scope'
      })
    );
  });

  it('does not let a stale split explorer_fast exception line hide behind a current primary posture line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-explorer-fast-split-stale-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- `explorer_fast` remains the only explicit `gpt-5.2-codex-spark` exception.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.2-codex-spark missing current policy gpt-5.4'
      })
    );
  });

  it('does not let a stale split unsupported-review warning line hide behind a current primary posture line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-warning-split-stale-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- On ChatGPT-auth sessions, do not target delegated/review surfaces at `gpt-5.3-codex`; those runs currently fail immediately. Use `gpt-5.4` until provider compatibility changes.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex missing current policy gpt-5.4'
      })
    );
  });

  it('does not let a stale secondary ChatGPT-auth evidence line hide behind a current primary posture line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-chatgpt-auth-stale-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- For ChatGPT auth, this means `gpt-5.4`, not `gpt-5.3-codex`, unless new compatibility evidence exists.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex missing current policy gpt-5.4'
      })
    );
  });

  it('does not let a stale explorer_fast exception hide on an otherwise current posture line', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-model-explorer-fast-'));
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
          truth_checks: ['model-posture']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces; keep `explorer_fast` on `gpt-5.2-codex-spark`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.2-codex-spark missing current policy gpt-5.4'
      })
    );
  });

  it('fails closed when the current posture cannot be resolved from the policy source', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-unresolved-'));
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
          truth_checks: ['codex-cli-version', 'default-runtime']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'guides', 'codex-version-policy.md'),
      ['# Codex Version Policy (CO)', '', '- Current posture text without machine-readable CLI or runtime lines.', ''].join(
        '\n'
      ),
      'utf8'
    );
    await writeFile(join(repoRoot, 'README.md'), '# Codex Orchestrator\n', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'README.md',
          rule: 'doc-posture-unresolved',
          reference: 'missing current Codex CLI version in docs/guides/codex-version-policy.md'
        }),
        expect.objectContaining({
          file: 'README.md',
          rule: 'doc-posture-unresolved',
          reference: 'missing current default runtime in docs/guides/codex-version-policy.md'
        })
      ])
    );
  });

  it('fails the default-runtime truth check when the runtime sentence is missing entirely', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-runtime-line-'));
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
          truth_checks: ['default-runtime']
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      ['# Codex Orchestrator', '', 'This front door mentions no default runtime sentence.', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-runtime-posture-stale',
        reference: 'expected default runtime appserver from docs/guides/codex-version-policy.md'
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
