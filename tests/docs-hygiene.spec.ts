import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runDocsCheck, runDocsSync } from '../scripts/docs-hygiene.js';
import { getSparkPolicyViolations } from '../scripts/lib/spark-policy-classifier.js';

const createdDirs: string[] = [];

type SparkPolicyViolationFixture = {
  line: number;
  reason: string;
};

type SparkPolicyDocsCheckErrorFixture = {
  file: string;
  rule: 'spark-policy-overbroad';
  reference: string;
};

type SparkPolicyFixtureCase = {
  id: string;
  title: string;
  category: string;
  document_path: string;
  doc_class: string;
  truth_checks: string[];
  content_lines: string[];
  expected: {
    passes: boolean;
    spark_policy_violations: SparkPolicyViolationFixture[];
    docs_check_errors: SparkPolicyDocsCheckErrorFixture[];
  };
};

type SparkPolicyFixtureFile = {
  schema_version: 1;
  cases: SparkPolicyFixtureCase[];
};

const sparkPolicyFixtures = JSON.parse(
  await readFile(new URL('./fixtures/docs-hygiene/spark-policy-cases.json', import.meta.url), 'utf8')
) as SparkPolicyFixtureFile;

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
    readmeBudget = { max_lines: 240, max_h2_sections: 9 },
    extraPolicies = {},
    codexPostureSourcePath = 'docs/guides/codex-version-policy.md'
  }: {
    entries?: Array<Record<string, unknown>>;
    patterns?: Array<Record<string, unknown>>;
    readmeBudget?: { max_lines: number; max_h2_sections: number };
    extraPolicies?: Record<string, unknown>;
    codexPostureSourcePath?: string;
  } = {}
) {
  await mkdir(join(repoRoot, 'docs', 'guides'), { recursive: true });
  await writeFile(
    join(repoRoot, 'docs', 'guides', 'codex-version-policy.md'),
    [
      '# Codex Version Policy (CO)',
      '',
      '- Current CO compatibility/adoption target remains stable Codex CLI `0.117.0` for the current upstream-aligned main baseline.',
      '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
      '- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
      '- When authenticating through ChatGPT, do not target delegated or review surfaces at `gpt-5.5-codex`; those runs currently fail immediately. Use `gpt-5.5` instead until provider compatibility changes.',
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
          public_guide: { label: 'Public Guide', report_order: 15 },
          repo_guide: { label: 'Repository Guide', report_order: 20 },
          active_guide: { label: 'Active Guide', report_order: 40 },
          task_packet: { label: 'Task Packet', report_order: 200 }
        },
        policies: {
          codex_posture: {
            source_path: codexPostureSourcePath
          },
          readme_front_door: readmeBudget,
          bundled_skills_roster: {
            doc_path: 'README.md',
            section_heading: '## Skills (bundled)',
            list_intro: 'Bundled skills'
          },
          ...extraPolicies
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

async function writeCodexPostureMatrixFixture(
  repoRoot: string,
  {
    current = {},
    surfaces = [],
    historicalReleaseEvidence = []
  }: {
    current?: Record<string, unknown>;
    surfaces?: Array<Record<string, unknown>>;
    historicalReleaseEvidence?: Array<Record<string, unknown>>;
  } = {}
) {
  await mkdir(join(repoRoot, 'docs'), { recursive: true });
  await writeFile(
    join(repoRoot, 'docs', 'codex-posture-matrix.json'),
    JSON.stringify(
      {
        version: 1,
        current: {
          codex_cli_version: '0.117.0',
          latest_audited_candidate_cli_version: '0.122.0',
          marketplace_smoke_cli_version: '0.121.0',
          cloud_canary_cli_version: '0.122.0',
          model: 'gpt-5.4',
          default_runtime: 'appserver',
          explorer_fast_model: 'gpt-5.3-codex-spark',
          unsupported_review_model: 'gpt-5.4-codex',
          ...current
        },
        surfaces,
        historical_release_evidence: historicalReleaseEvidence
      },
      null,
      2
    ),
    'utf8'
  );
}


async function writeSparkPolicyFixtureRepo(repoRoot: string, fixture: SparkPolicyFixtureCase) {
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
        path: fixture.document_path,
        doc_class: fixture.doc_class,
        truth_checks: fixture.truth_checks
      }
    ],
    readmeBudget: { max_lines: 500, max_h2_sections: 40 }
  });
  await mkdir(dirname(join(repoRoot, fixture.document_path)), { recursive: true });
  await writeFile(join(repoRoot, fixture.document_path), `${fixture.content_lines.join('\n')}\n`, 'utf8');
}

const releaseWorkflowFixture = [
  'name: release',
  '',
  'on:',
  '  workflow_dispatch:',
  '    inputs:',
  '      tag:',
  '        description: Existing release tag',
  '        required: false',
  '        type: string',
  '',
  'jobs:',
  '  build-release:',
  '    steps:',
  '      - name: Configure tag verification keys',
  '        env:',
  '          RELEASE_SIGNING_PUBLIC_KEYS: ${{ secrets.RELEASE_SIGNING_PUBLIC_KEYS }}',
  '          RELEASE_SIGNING_ALLOWED_SIGNERS: ${{ secrets.RELEASE_SIGNING_ALLOWED_SIGNERS }}',
  '      - name: Generate release notes',
  "        run: echo 'git for-each-ref refs/tags/$TAG --format=%(contents:body); readAnnotatedTagBody'",
  '      - name: Resolve release metadata',
  '        run: |',
  '          echo "dist_tag=latest" >> "$GITHUB_OUTPUT"',
  '          echo "prerelease=true" >> "$GITHUB_OUTPUT"',
  '      - run: npm run clean:dist',
  '      - run: npm run build',
  '  publish:',
  '    steps:',
  '      - name: Publish to npm',
  '        env:',
  '          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}',
  '        run: |',
  '          NODE_AUTH_TOKEN= NPM_CONFIG_USERCONFIG="$OIDC_NPMRC" npm publish "$TARBALL_PATH" --tag "$DIST_TAG" --provenance',
  '          echo "OIDC publish failed (exit ${OIDC_STATUS}); falling back to NPM_TOKEN if available."',
  ''
].join('\n');

const releaseRunbookCatalogEntry = (path: string) => ({
  path,
  doc_class: 'repo_guide',
  truth_checks: ['release-runbook']
});

async function writeReleaseRunbookFixtureRepo(
  repoRoot: string,
  {
    entries,
    skillContent = null,
    sopContent = null,
    addendumContent = null
  }: {
    entries: Array<Record<string, unknown>>;
    skillContent?: string | null;
    sopContent?: string | null;
    addendumContent?: string | null;
  }
) {
  await mkdir(join(repoRoot, '.agent', 'SOPs'), { recursive: true });
  await mkdir(join(repoRoot, '.github', 'workflows'), { recursive: true });
  await mkdir(join(repoRoot, 'docs'), { recursive: true });
  await mkdir(join(repoRoot, 'skills', 'release'), { recursive: true });

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
  await writeDocsCatalogFixture(repoRoot, { entries });
  await writeFile(join(repoRoot, '.github', 'workflows', 'release.yml'), releaseWorkflowFixture, 'utf8');
  await writeFile(join(repoRoot, 'docs', 'skills-release.md'), '# Skills release\n', 'utf8');

  if (skillContent !== null) {
    await writeFile(join(repoRoot, 'skills', 'release', 'SKILL.md'), skillContent, 'utf8');
  }
  if (sopContent !== null) {
    await writeFile(join(repoRoot, '.agent', 'SOPs', 'release.md'), sopContent, 'utf8');
  }
  if (addendumContent !== null) {
    await writeFile(join(repoRoot, 'docs', 'release-notes-template-addendum.md'), addendumContent, 'utf8');
  }
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
      JSON.stringify({ max_lines: 3, reserve_lines: 1 }, null, 2),
      'utf8'
    );
    await writeFile(join(repoRoot, 'docs', 'TASKS.md'), '# Snapshot\n# Detail\n', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'tasks-file-too-large')).toBeUndefined();
  });

  it('flags docs/TASKS.md once it reaches zero headroom at the hard ceiling', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-tasks-zero-headroom-'));
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
      JSON.stringify({ max_lines: 2, reserve_lines: 1 }, null, 2),
      'utf8'
    );
    await writeFile(join(repoRoot, 'docs', 'TASKS.md'), '# Snapshot\n# Detail', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/TASKS.md',
        rule: 'tasks-file-too-large',
        reference: 'lines=2 max=2 reserve=1 state=zero_headroom'
      })
    );
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

  it('allows a separately rebaselined marketplace compatibility version when the current posture is still present', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-compatibility-version-'));
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
        '## Current Posture',
        '- Current CO compatibility/adoption target remains stable Codex CLI `0.117.0` for the current upstream-aligned main baseline.',
        '- Marketplace/downstream-smoke compatibility is separately rebaselined to Codex CLI `0.125.0` by CO-355.',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
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
        '- Current CO compatibility/adoption target is stable Codex CLI `0.117.0`.',
        '- Marketplace setup for Codex CLI `0.125.0` uses `codex plugin marketplace add`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'doc-posture-stale')
    ).toBeUndefined();
  });

  it('reports a clear error when only compatibility Codex CLI versions are mentioned', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-compatibility-only-'));
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
        '## Current Posture',
        '- Current CO compatibility/adoption target remains stable Codex CLI `0.117.0`.',
        '- Marketplace/downstream-smoke compatibility is separately rebaselined to Codex CLI `0.125.0` by CO-355.',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Marketplace setup for Codex CLI `0.125.0` uses `codex plugin marketplace add`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference:
          'missing current Codex CLI version 0.117.0; mentioned compatibility version(s) 0.125.0'
      })
    );
  });

  it('does not allow historical Codex CLI compatibility versions from policy audit notes', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-posture-history-version-'));
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
        '## Current Posture',
        '- Current CO compatibility/adoption target remains stable Codex CLI `0.117.0`.',
        '- Marketplace/downstream-smoke compatibility is separately rebaselined to Codex CLI `0.125.0` by CO-355.',
        '',
        '## Candidate Audit Notes',
        '- 2026-04-21: CO-268 completed the marketplace follow-up and release-facing downstream-smoke compatibility moved to codex-cli 0.122.0.',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current CO compatibility/adoption target is stable Codex CLI `0.117.0`.',
        '- Marketplace setup for Codex CLI `0.122.0` uses `codex plugin marketplace add`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale'
      })
    );
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
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
        '- Current model posture: `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
        '- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
        '- When authenticating through ChatGPT, do not target delegated or review surfaces at `gpt-5.5-codex`; those runs currently fail immediately. Use `gpt-5.5` instead until provider compatibility changes.',
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
        '- Current model posture: `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
        '- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
        '- When authenticating through ChatGPT, do not target delegated/review surfaces at `gpt-5.5-codex`; those runs currently fail immediately. Use `gpt-5.5` instead until provider compatibility changes.',
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
        '- On ChatGPT-auth sessions, do not target delegated/review surfaces at `gpt-5.5-codex`; those runs currently fail immediately. Use `gpt-5.5` until provider compatibility changes.',
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
        '- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.',
        '- Keep delegated subagent and review surfaces on `gpt-5.5` as well when using ChatGPT auth; `gpt-5.5-codex` is currently unsupported there.',
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
        '- Keep delegated subagent and review surfaces on `gpt-5.5` as well when using ChatGPT auth; `gpt-5.5-codex` is currently unsupported there.',
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
        reference: 'model mention(s) gpt-5.3-codex-spark missing current policy gpt-5.5'
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
        '  - `model = "gpt-5.5"`',
        '  - `review_model = "gpt-5.5"`',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'missing model posture gpt-5.5'
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
        '- When authenticating through ChatGPT, do not target delegated or review surfaces at `gpt-5.5-codex`; those runs currently fail immediately. Use `gpt-5.5` instead until provider compatibility changes.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex missing current policy gpt-5.5'
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
        '- Keep delegated subagent and review surfaces on `gpt-5.5` as well when using ChatGPT auth.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex missing current policy gpt-5.5'
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
        '- For ChatGPT auth, this means `gpt-5.5`, not `gpt-5.5-codex`, unless new compatibility evidence exists.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(
      errors.find((error) => error.file === 'README.md' && error.rule === 'doc-posture-stale')
    ).toBeUndefined();
  });

  it('classifies spark policy fixture cases with stable reasons', () => {
    for (const fixture of sparkPolicyFixtures.cases) {
      const content = fixture.content_lines.join('\n');
      const actualViolations = getSparkPolicyViolations(content)
        .map((result) => ({ line: result.line, reason: result.reason }));

      expect(
        actualViolations,
        `${fixture.id}: expected=${JSON.stringify(fixture.expected.spark_policy_violations)} title=${fixture.title}`
      ).toEqual(fixture.expected.spark_policy_violations);

      expect(
        actualViolations.length === 0,
        `${fixture.id}: expected passes=${fixture.expected.passes} title=${fixture.title}`
      ).toBe(fixture.expected.passes);
    }
  });

  it('runs spark policy fixtures through the production docs:check path', async () => {
    for (const fixture of sparkPolicyFixtures.cases) {
      const repoRoot = await mkdtemp(join(tmpdir(), `docs-hygiene-spark-policy-fixture-${fixture.id}-`));
      createdDirs.push(repoRoot);
      await writeSparkPolicyFixtureRepo(repoRoot, fixture);

      const errors = await runDocsCheck(repoRoot);
      const actualErrors = errors
        .filter((error) => error.rule === 'spark-policy-overbroad')
        .map((error) => ({ file: error.file, rule: error.rule, reference: error.reference }));

      expect(
        actualErrors,
        `${fixture.id}: expected=${JSON.stringify(fixture.expected.docs_check_errors)} title=${fixture.title}`
      ).toEqual(fixture.expected.docs_check_errors);
    }
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
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
        reference: 'model mention(s) gpt-5.2-codex-spark missing current policy gpt-5.5'
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
        '- On ChatGPT-auth sessions, do not target delegated/review surfaces at `gpt-5.3-codex`; those runs currently fail immediately. Use `gpt-5.5` until provider compatibility changes.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex missing current policy gpt-5.5'
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces.',
        '- For ChatGPT auth, this means `gpt-5.5`, not `gpt-5.3-codex`, unless new compatibility evidence exists.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.3-codex missing current policy gpt-5.5'
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
        '- Current model posture is `gpt-5.5` for top-level, delegated subagent, and review surfaces; keep `explorer_fast` on `gpt-5.2-codex-spark`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'doc-posture-stale',
        reference: 'model mention(s) gpt-5.2-codex-spark missing current policy gpt-5.5'
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

  it('loads current posture from a machine-readable matrix and validates matrix surfaces', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'README.md',
          doc_class: 'front_door',
          truth_checks: ['codex-cli-version', 'model-posture', 'default-runtime']
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0',
        marketplace_smoke_cli_version: '0.124.0',
        cloud_canary_cli_version: '0.124.0'
      },
      surfaces: [
        {
          path: 'README.md',
          kind: 'front_door',
          status: 'current',
          requirements: [
            {
              label: 'current CLI target',
              contains: 'Codex CLI `{{current_cli_version}}`'
            },
            {
              label: 'workflow pin',
              contains: '@openai/codex@{{marketplace_smoke_cli_version}}'
            },
            {
              label: 'cloud canary posture',
              contains: 'Cloud canary remains Codex CLI `{{cloud_canary_cli_version}}`'
            }
          ]
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'README.md'),
      [
        '# Codex Orchestrator',
        '',
        '- Current CO compatibility/adoption target is stable Codex CLI `0.125.0`.',
        '- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.',
        '- Local appserver remains the expected default runtime path.',
        '- Release smoke stays on @openai/codex@0.124.0.',
        '- Cloud canary remains Codex CLI `0.124.0`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'codex-posture-matrix-drift')).toBeUndefined();
    expect(errors.find((error) => error.rule === 'doc-posture-stale')).toBeUndefined();
  });

  it('falls back to source_path when matrix_path is configured but empty', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-empty-path-fallback-'));
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
      extraPolicies: {
        codex_posture: {
          matrix_path: '',
          source_path: 'docs/codex-posture-matrix.json'
        }
      }
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0'
      },
      surfaces: [
        {
          path: 'README.md',
          kind: 'front_door',
          status: 'current',
          requirements: [
            {
              label: 'current CLI target',
              contains: 'Codex CLI `{{current_cli_version}}`'
            }
          ]
        }
      ]
    });
    await writeFile(join(repoRoot, 'README.md'), '# Fixture\n\nNo posture here.\n', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'README.md',
        rule: 'codex-posture-matrix-drift',
        reference: 'current CLI target: expected "Codex CLI `0.125.0`"'
      })
    );
  });

  it('fails closed when the configured posture matrix path escapes the repository', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-escape-'));
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
      codexPostureSourcePath: '../../../etc/passwd.json'
    });

    await expect(runDocsCheck(repoRoot)).rejects.toThrow('Invalid Codex posture matrix path outside repository');
  });

  it('fails closed when the configured posture matrix file resolves outside the repository', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-file-symlink-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    const outsidePath = join(dirname(repoRoot), 'outside-codex-posture-matrix.json');
    await writeFile(
      outsidePath,
      JSON.stringify(
        {
          version: 1,
          current: { codex_cli_version: '0.125.0', model: 'gpt-5.5', default_runtime: 'appserver' },
          surfaces: []
        },
        null,
        2
      ),
      'utf8'
    );
    await symlink(outsidePath, join(repoRoot, 'docs', 'codex-posture-matrix.json'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });

    await expect(runDocsCheck(repoRoot)).rejects.toThrow(
      'Invalid Codex posture matrix path resolves outside repository'
    );
  });

  it('flags drift when matrix-governed workflow or pack-smoke pin expectations disagree', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-drift-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, '.github', 'workflows'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      surfaces: [
        {
          path: '.github/workflows/core-lane.yml',
          kind: 'workflow_pin',
          status: 'current',
          requirements: [
            {
              label: 'marketplace smoke workflow pin',
              contains: 'npm install --global @openai/codex@{{marketplace_smoke_cli_version}}'
            }
          ]
        }
      ]
    });
    await writeFile(
      join(repoRoot, '.github', 'workflows', 'core-lane.yml'),
      ['name: core', 'jobs:', '  smoke:', '    steps:', '      - run: npm install --global @openai/codex@0.120.0', ''].join(
        '\n'
      ),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: '.github/workflows/core-lane.yml',
        rule: 'codex-posture-matrix-drift',
        reference: 'marketplace smoke workflow pin: expected "npm install --global @openai/codex@0.121.0"'
      })
    );
  });

  it('flags stale duplicate Codex package pins in matrix-managed pin surfaces', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-stale-pins-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, '.github', 'workflows'), { recursive: true });
    await mkdir(join(repoRoot, 'tests'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        marketplace_smoke_cli_version: '0.121.0',
        cloud_canary_cli_version: '0.122.0'
      },
      surfaces: [
        {
          path: '.github/workflows/core-lane.yml',
          kind: 'workflow_pin',
          status: 'current',
          requirements: [
            {
              label: 'marketplace smoke workflow pin',
              contains: 'npm install --global @openai/codex@{{marketplace_smoke_cli_version}}'
            }
          ]
        },
        {
          path: 'tests/pack-smoke.spec.ts',
          kind: 'pack_smoke_expectation',
          status: 'current',
          requirements: [
            {
              label: 'marketplace install expectation',
              contains: 'npm install --global @openai/codex@{{marketplace_smoke_cli_version}}'
            },
            {
              label: 'cloud install expectation',
              contains: 'npm install --global @openai/codex@{{cloud_canary_cli_version}}'
            }
          ]
        }
      ]
    });
    await writeFile(
      join(repoRoot, '.github', 'workflows', 'core-lane.yml'),
      [
        'name: core',
        'jobs:',
        '  smoke:',
        '    steps:',
        '      - run: npm install --global @openai/codex@0.121.0',
        '      - run: npm install --global @openai/codex@0.120.0',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'tests', 'pack-smoke.spec.ts'),
      [
        "const marketplace = 'npm install --global @openai/codex@0.121.0';",
        "const cloud = 'npm install --global @openai/codex@0.122.0';",
        "const stale = 'npm install --global @openai/codex@0.120.0';",
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: '.github/workflows/core-lane.yml',
        rule: 'codex-posture-matrix-drift',
        reference: 'unexpected Codex package pin(s) 0.120.0; expected 0.121.0'
      })
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'tests/pack-smoke.spec.ts',
        rule: 'codex-posture-matrix-drift',
        reference: 'unexpected Codex package pin(s) 0.120.0; expected 0.121.0, 0.122.0'
      })
    );
  });

  it('flags prerelease Codex package pins in matrix-managed exact pin surfaces', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-prerelease-pin-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, '.github', 'workflows'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        marketplace_smoke_cli_version: '0.121.0'
      },
      surfaces: [
        {
          path: '.github/workflows/core-lane.yml',
          kind: 'workflow_pin',
          status: 'current',
          requirements: [
            {
              label: 'marketplace smoke workflow pin',
              contains: 'npm install --global @openai/codex@{{marketplace_smoke_cli_version}}'
            }
          ]
        }
      ]
    });
    await writeFile(
      join(repoRoot, '.github', 'workflows', 'core-lane.yml'),
      [
        'name: core',
        'jobs:',
        '  smoke:',
        '    steps:',
        '      - run: npm install --global @openai/codex@0.121.0-beta.1',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: '.github/workflows/core-lane.yml',
        rule: 'codex-posture-matrix-drift',
        reference: 'unexpected Codex package pin(s) 0.121.0-beta.1; expected 0.121.0'
      })
    );
  });

  it('reports malformed matrix surfaces instead of silently dropping them', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-malformed-'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      surfaces: [
        {
          kind: 'workflow_pin',
          status: 'current',
          requirements: [
            {
              label: 'marketplace smoke workflow pin',
              contains: 'npm install --global @openai/codex@{{marketplace_smoke_cli_version}}'
            }
          ]
        }
      ]
    });

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/codex-posture-matrix.json',
        rule: 'codex-posture-matrix-unresolved',
        reference: 'matrix surface missing path'
      })
    );
  });

  it('reports posture matrices with no governed surfaces instead of silently disabling enforcement', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-no-surfaces-'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot);

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/codex-posture-matrix.json',
        rule: 'codex-posture-matrix-unresolved',
        reference: 'matrix surfaces missing'
      })
    );
  });

  it('reports matrix surface paths that escape the repository root', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-surface-escape-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(dirname(repoRoot), 'outside-codex-posture.md'), 'Codex CLI `0.117.0`\n', 'utf8');
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      surfaces: [
        {
          path: '../outside-codex-posture.md',
          kind: 'front_door',
          status: 'current',
          requirements: [
            {
              label: 'current CLI target',
              contains: 'Codex CLI `{{current_cli_version}}`'
            }
          ]
        }
      ]
    });

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/codex-posture-matrix.json',
        rule: 'codex-posture-matrix-unresolved',
        reference: '../outside-codex-posture.md:matrix surface path escapes repository'
      })
    );
  });

  it('reports matrix surface symlinks that resolve outside the repository root', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-surface-symlink-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    const outsidePath = join(dirname(repoRoot), 'outside-codex-posture-symlink.md');
    await writeFile(outsidePath, 'Codex CLI `0.117.0`\n', 'utf8');
    await symlink(outsidePath, join(repoRoot, 'docs', 'symlinked-codex-posture.md'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      surfaces: [
        {
          path: 'docs/symlinked-codex-posture.md',
          kind: 'front_door',
          status: 'current',
          requirements: [
            {
              label: 'current CLI target',
              contains: 'Codex CLI `{{current_cli_version}}`'
            }
          ]
        }
      ]
    });

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/codex-posture-matrix.json',
        rule: 'codex-posture-matrix-unresolved',
        reference: 'docs/symlinked-codex-posture.md:matrix surface path resolves outside repository'
      })
    );
  });

  it('reports malformed matrix requirements instead of silently dropping them', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-requirement-malformed-'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      surfaces: [
        {
          path: 'README.md',
          kind: 'front_door',
          status: 'current',
          requirements: [
            {
              label: 'current CLI target'
            }
          ]
        }
      ]
    });
    await writeFile(join(repoRoot, 'README.md'), '# Fixture\n', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/codex-posture-matrix.json',
        rule: 'codex-posture-matrix-unresolved',
        reference: 'README.md:current CLI target missing contains'
      })
    );
  });

  it('reports unresolved matrix requirement template tokens instead of silently dropping them', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-requirement-token-'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      surfaces: [
        {
          path: 'README.md',
          kind: 'front_door',
          status: 'current',
          requirements: [
            {
              label: 'marketplace typo',
              contains: '@openai/codex@{{marketplace_smoke_cli_versoin}}'
            }
          ]
        }
      ]
    });
    await writeFile(join(repoRoot, 'README.md'), '# Fixture\n', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/codex-posture-matrix.json',
        rule: 'codex-posture-matrix-unresolved',
        reference: 'README.md:marketplace typo unresolved token(s): marketplace_smoke_cli_versoin'
      })
    );
  });

  it('reports matrix surfaces with no requirements instead of silently skipping them', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-empty-requirements-'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      surfaces: [
        {
          path: 'README.md',
          kind: 'front_door',
          status: 'current'
        }
      ]
    });
    await writeFile(join(repoRoot, 'README.md'), '# Fixture\n', 'utf8');

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/codex-posture-matrix.json',
        rule: 'codex-posture-matrix-unresolved',
        reference: 'README.md:matrix surface missing requirements'
      })
    );
  });

  it('does not validate demoted historical matrix surfaces as current requirements', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-matrix-historical-surface-'));
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json'
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      surfaces: [
        {
          path: 'docs/archive/codex-0.124-adoption.md',
          kind: 'historical_evidence',
          status: 'historical',
          requirements: [
            {
              label: 'old active target',
              contains: 'Codex CLI `{{current_cli_version}}`'
            }
          ]
        }
      ],
      historicalReleaseEvidence: [
        {
          path: 'docs/archive/codex-0.124-adoption.md',
          status: 'historical',
          version: '0.124.0'
        }
      ]
    });
    await mkdir(join(repoRoot, 'docs', 'archive'), { recursive: true });
    await writeFile(
      join(repoRoot, 'docs', 'archive', 'codex-0.124-adoption.md'),
      '# Codex 0.124 adoption evidence\n\nArchived evidence for Codex CLI `0.124.0`.\n',
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'codex-posture-matrix-drift')).toBeUndefined();
  });

  it('fails stale active Codex release evidence pages without historical status', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-history-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/codex-0.124-adoption.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0',
        cloud_canary_cli_version: '0.124.0'
      }
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'codex-0.124-adoption.md'),
      [
        '# Codex 0.124 adoption evidence',
        '',
        'This page is still linked as current guidance for Codex CLI `0.124.0`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/book/codex-0.124-adoption.md',
        rule: 'codex-posture-history-active',
        reference:
          'active current-facing release evidence mentions Codex CLI version(s) 0.124.0 without current/historical/archive matrix status'
      })
    );
  });

  it('fails stale Codex release evidence links in current-facing navigation without historical status', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-history-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/index.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0',
        cloud_canary_cli_version: '0.124.0'
      }
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'index.md'),
      ['# Book', '', '- [Codex 0.124 adoption evidence](codex-0.124-adoption.md)', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/book/index.md',
        rule: 'codex-posture-history-active',
        reference:
          'active current-facing release evidence mentions Codex CLI version(s) 0.124.0 without current/historical/archive matrix status'
      })
    );
  });

  it('fails stale reference-style Codex release evidence links in current-facing navigation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-history-ref-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/index.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0',
        cloud_canary_cli_version: '0.124.0'
      }
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'index.md'),
      [
        '# Book',
        '',
        '- [Codex 0.124 adoption evidence][codex-0124]',
        '',
        '[codex-0124]: codex-cli-0124-adoption.md',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/book/index.md',
        rule: 'codex-posture-history-active',
        reference:
          'active current-facing release evidence mentions Codex CLI version(s) 0.124.0 without current/historical/archive matrix status'
      })
    );
  });

  it('fails stale shortcut-reference Codex release evidence links in current-facing navigation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-history-shortcut-ref-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/index.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0',
        cloud_canary_cli_version: '0.124.0'
      }
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'index.md'),
      ['# Book', '', '- [codex-cli-0124-adoption]', '', '[codex-cli-0124-adoption]: codex-cli-0124-adoption.md', ''].join(
        '\n'
      ),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/book/index.md',
        rule: 'codex-posture-history-active',
        reference:
          'active current-facing release evidence mentions Codex CLI version(s) 0.124.0 without current/historical/archive matrix status'
      })
    );
  });

  it('ignores external Codex release evidence links when checking current-facing navigation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-history-external-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/index.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0',
        cloud_canary_cli_version: '0.124.0'
      }
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'index.md'),
      ['# Book', '', '- [Codex 0.124 adoption evidence](https://example.com/codex-0.124-adoption)', ''].join(
        '\n'
      ),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'codex-posture-history-active')).toBeUndefined();
  });

  it('still scans release evidence links in current matrix-managed navigation docs', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-history-matrix-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/README.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0',
        cloud_canary_cli_version: '0.124.0'
      },
      surfaces: [
        {
          path: 'docs/book/README.md',
          kind: 'book_index',
          status: 'current',
          requirements: [
            {
              label: 'historical evidence demotion',
              contains: '[Historical Codex CLI 0.124.0 Evidence](archive/codex-cli-0124-adoption.md): archive-only'
            }
          ]
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'README.md'),
      [
        '# Book',
        '',
        '- [Historical Codex CLI 0.124.0 Evidence](archive/codex-cli-0124-adoption.md): archive-only',
        '- [Codex CLI 0.124.0 Adoption Evidence](codex-cli-0124-stray.md)',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: 'docs/book/README.md',
        rule: 'codex-posture-history-active',
        reference:
          'active current-facing release evidence mentions Codex CLI version(s) 0.124.0 without current/historical/archive matrix status'
      })
    );
  });

  it('allows current-facing navigation links to active matrix-managed candidate evidence', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-candidate-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/index.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.118.0',
        latest_audited_candidate_cli_version: '0.122.0'
      },
      surfaces: [
        {
          path: 'docs/book/codex-0.122-candidate-evidence.md',
          kind: 'candidate_evidence',
          status: 'candidate',
          requirements: [
            {
              label: 'candidate evidence title',
              contains: 'Codex 0.122 candidate evidence'
            }
          ]
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'codex-0.122-candidate-evidence.md'),
      '# Codex 0.122 candidate evidence\n\nCurrent candidate evidence for Codex CLI `0.122.0`.\n',
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'docs', 'book', 'index.md'),
      ['# Book', '', '- [Codex 0.122 candidate evidence](codex-0.122-candidate-evidence.md)', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'codex-posture-history-active')).toBeUndefined();
  });

  it('allows current-facing navigation links to zero-padded matrix-managed candidate evidence', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-candidate-zero-padded-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/index.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.118.0',
        latest_audited_candidate_cli_version: '0.122.0'
      },
      surfaces: [
        {
          path: 'docs/book/codex-cli-0122-adoption.md',
          kind: 'candidate_evidence',
          status: 'candidate',
          requirements: [
            {
              label: 'candidate evidence title',
              contains: 'Codex CLI 0.122.0 Adoption Evidence'
            }
          ]
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'codex-cli-0122-adoption.md'),
      '# Codex CLI 0.122.0 Adoption Evidence\n\nCurrent candidate evidence for Codex CLI `0.122.0`.\n',
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'docs', 'book', 'index.md'),
      ['# Book', '', '- [Codex CLI 0.122.0 Adoption Evidence](codex-cli-0122-adoption.md)', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'codex-posture-history-active')).toBeUndefined();
  });

  it('allows current-facing navigation links to explicitly matrix-managed candidate evidence', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-active-candidate-explicit-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/index.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.118.0',
        latest_audited_candidate_cli_version: '0.122.0'
      },
      surfaces: [
        {
          path: 'docs/book/latest-candidate.md',
          kind: 'candidate_evidence',
          status: 'candidate',
          requirements: [
            {
              label: 'candidate evidence title',
              contains: 'Latest candidate evidence'
            }
          ]
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'latest-candidate.md'),
      '# Latest candidate evidence\n\nCurrent candidate evidence for Codex CLI `0.122.0`.\n',
      'utf8'
    );
    await writeFile(
      join(repoRoot, 'docs', 'book', 'index.md'),
      ['# Book', '', '- [Codex CLI 0.122.0 candidate evidence](latest-candidate.md)', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'codex-posture-history-active')).toBeUndefined();
  });

  it('allows stale Codex release evidence pages with explicit historical matrix status', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-historical-history-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/codex-0.124-adoption.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0'
      },
      historicalReleaseEvidence: [
        {
          path: 'docs/book/codex-0.124-adoption.md',
          status: 'historical',
          version: '0.124.0',
          title: 'Codex 0.124 adoption evidence'
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'codex-0.124-adoption.md'),
      [
        '# Codex 0.124 adoption evidence',
        '',
        'This archived page preserves evidence for Codex CLI `0.124.0`.',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'codex-posture-history-active')).toBeUndefined();
  });

  it('allows current-facing navigation links to explicit historical release evidence', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-historical-history-nav-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs', 'book'), { recursive: true });
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
      codexPostureSourcePath: 'docs/codex-posture-matrix.json',
      entries: [
        {
          path: 'docs/book/index.md',
          status: 'active',
          doc_class: 'public_guide',
          truth_checks: []
        }
      ]
    });
    await writeCodexPostureMatrixFixture(repoRoot, {
      current: {
        codex_cli_version: '0.125.0'
      },
      historicalReleaseEvidence: [
        {
          path: 'docs/book/codex-0.124-adoption.md',
          status: 'historical',
          version: '0.124.0',
          title: 'Codex 0.124 adoption evidence'
        }
      ]
    });
    await writeFile(
      join(repoRoot, 'docs', 'book', 'index.md'),
      ['# Book', '', '- [Codex 0.124 adoption evidence](codex-0.124-adoption.md)', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.find((error) => error.rule === 'codex-posture-history-active')).toBeUndefined();
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

  it('flags release-runbook drift when the bundled release skill omits the current release posture', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-skill-'));
    createdDirs.push(repoRoot);

    await writeReleaseRunbookFixtureRepo(repoRoot, {
      entries: [releaseRunbookCatalogEntry('skills/release/SKILL.md')],
      skillContent: ['# Release', '', '- `npm run build:all`', '- `npm run test:adapters`', ''].join('\n')
    });

    const errors = await runDocsCheck(repoRoot);
    const releaseError = errors.find(
      (error) => error.file === 'skills/release/SKILL.md' && error.rule === 'release-runbook-stale'
    );

    expect(releaseError).toBeDefined();
    expect(releaseError?.reference).toContain('validation command npm run build');
    expect(releaseError?.reference).toContain('validation command npm run test');
    expect(releaseError?.reference).toContain('npm run repo:stewardship');
    expect(releaseError?.reference).toContain('package artifact clean-dist validation');
    expect(releaseError?.reference).toContain('local signing gate');
    expect(releaseError?.reference).toContain('exactly-one signer secret posture');
    expect(releaseError?.reference).toContain('manual-dispatch inputs.tag semantics');
    expect(releaseError?.reference).toContain('signed annotated tag body overview override');
    expect(releaseError?.reference).toContain('NPM_TOKEN fallback');
  });

  it('keeps release validation-floor commands distinct from package artifact commands', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-validation-floor-'));
    createdDirs.push(repoRoot);

    await writeReleaseRunbookFixtureRepo(repoRoot, {
      entries: [releaseRunbookCatalogEntry('skills/release/SKILL.md')],
      skillContent: [
        '# Release',
        '',
        'Run the full release validation floor before tagging:',
        '- `npm run lint`',
        '',
        'Validate the package artifact with `npm run clean:dist && npm run build`, `npm run pack:audit`, and `npm run pack:smoke`.',
        ''
      ].join('\n')
    });

    const errors = await runDocsCheck(repoRoot);
    const releaseError = errors.find(
      (error) => error.file === 'skills/release/SKILL.md' && error.rule === 'release-runbook-stale'
    );

    expect(releaseError).toBeDefined();
    expect(releaseError?.reference).toContain('validation command npm run build');
    expect(releaseError?.reference).toContain('validation command npm run pack:audit');
    expect(releaseError?.reference).toContain('validation command npm run pack:smoke');
    expect(releaseError?.reference).not.toContain('package artifact clean-dist validation');
  });

  it('flags release-runbook drift when the release SOP omits protected posture', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-sop-'));
    createdDirs.push(repoRoot);
    await writeReleaseRunbookFixtureRepo(repoRoot, {
      entries: [releaseRunbookCatalogEntry('.agent/SOPs/release.md')],
      sopContent: ['# Release SOP', '', '- `npm run build`', '- Publish the package.', ''].join('\n')
    });
    const errors = await runDocsCheck(repoRoot);
    const releaseError = errors.find((error) => error.file === '.agent/SOPs/release.md' && error.rule === 'release-runbook-stale');
    expect(releaseError).toBeDefined();
    expect(releaseError?.reference).toMatch(/exactly-one signer secret posture.*manual-dispatch inputs\.tag semantics.*OIDC or trusted publishing posture.*NPM_TOKEN fallback/);
  });

  it('flags release-runbook drift when the addendum omits overview and install guidance', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-addendum-'));
    createdDirs.push(repoRoot);
    await writeReleaseRunbookFixtureRepo(repoRoot, {
      entries: [releaseRunbookCatalogEntry('docs/release-notes-template-addendum.md')],
      addendumContent: ['# Release Notes Addendum', '', 'Mention shipped skill changes in release notes.', ''].join('\n')
    });
    const errors = await runDocsCheck(repoRoot);
    const releaseError = errors.find((error) => error.file === 'docs/release-notes-template-addendum.md' && error.rule === 'release-runbook-stale');
    expect(releaseError).toBeDefined();
    expect(releaseError?.reference).toMatch(/release notes placement under Overview.*signed annotated tag body overview override note.*codex-orchestrator skills install --force.*docs\/skills-release\.md link/);
  });

  it('passes release-runbook truth checks when the release docs match the workflow contract', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-pass-'));
    createdDirs.push(repoRoot);

    const releaseDocContent = [
      '# Release',
      '',
      '- `node scripts/delegation-guard.mjs`',
      '- `node scripts/spec-guard.mjs --dry-run`',
      '- `npm run build`',
      '- `npm run lint`',
      '- `npm run test`',
      '- `npm run docs:check`',
      '- `npm run docs:freshness`',
      '- `npm run repo:stewardship`',
      '- `node scripts/diff-budget.mjs`',
      '- `npm run review`',
      '- `npm run pack:audit`',
      '- `npm run pack:smoke`',
      '- `npm run build:all`',
      '- `npm run test:adapters`',
      '- `npm run test:evaluation`',
      '- `npm run eval:test`',
      '- Release is blocked unless commit/tag signing is configured on the release machine.',
      '- Preflight checks `git config commit.gpgsign` and `git config tag.gpgSign`.',
      '- Release tags stay signed annotated tags via `git tag -s`.',
      '- Validate the package artifact from a clean dist with `npm run clean:dist && npm run build` before pack smoke.',
      '- CI tag checks require exactly one signer secret: `RELEASE_SIGNING_PUBLIC_KEYS` or `RELEASE_SIGNING_ALLOWED_SIGNERS`.',
      '- Manual reruns use `workflow_dispatch` with `inputs.tag=v0.1.2`.',
      '- Optional overview override lives in the signed annotated tag body.',
      '- Stable releases publish to `latest`; prerelease releases keep a prerelease dist-tag.',
      '- Publish prefers OIDC trusted publishing with provenance and falls back to `NPM_TOKEN` only when needed.',
      '- `NPM_TOKEN` fallback must use an npm automation token.',
      ''
    ].join('\n');

    const addendumContent = [
      '# Release Notes Addendum — Shipped Skills',
      '',
      'Keep the bundled-skill bullets under **Overview**.',
      'If a one-shot override is needed, keep it in the signed annotated tag body.',
      '- Install/refresh command: `codex-orchestrator skills install --force`.',
      '- Include the docs link: `docs/skills-release.md`.',
      ''
    ].join('\n');

    await writeReleaseRunbookFixtureRepo(repoRoot, {
      entries: [
        releaseRunbookCatalogEntry('.agent/SOPs/release.md'),
        releaseRunbookCatalogEntry('skills/release/SKILL.md'),
        releaseRunbookCatalogEntry('docs/release-notes-template-addendum.md')
      ],
      skillContent: releaseDocContent,
      sopContent: releaseDocContent,
      addendumContent
    });

    const errors = await runDocsCheck(repoRoot);

    expect(errors.filter((error) => error.rule === 'release-runbook-stale')).toEqual([]);
  });

  it('flags Codex CLI release-intake template drift when a required marker is missing', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-intake-fail-'));
    createdDirs.push(repoRoot);

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
      extraPolicies: {
        codex_release_intake: {
          template_path: '.agent/task/templates/codex-cli-release-intake-template.md',
          required_markers: ['Release Evidence Axes', 'Supersedes / Holds Matrix']
        }
      }
    });
    await mkdir(join(repoRoot, '.agent', 'task', 'templates'), { recursive: true });
    await writeFile(
      join(repoRoot, '.agent', 'task', 'templates', 'codex-cli-release-intake-template.md'),
      ['# Codex CLI Release-Intake Issue Template', '', '## Release Evidence Axes', '- local CLI', ''].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: '.agent/task/templates/codex-cli-release-intake-template.md',
        rule: 'codex-release-intake-template-stale',
        reference: 'missing marker: Supersedes / Holds Matrix'
      })
    );
  });

  it('flags an invalid Codex CLI release-intake template path', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-intake-invalid-path-'));
    createdDirs.push(repoRoot);

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
      extraPolicies: {
        codex_release_intake: {
          template_path: '   ',
          required_markers: ['Release Evidence Axes']
        }
      }
    });

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: '.agent/task/templates/codex-cli-release-intake-template.md',
        rule: 'codex-release-intake-template-stale',
        reference: 'invalid template_path'
      })
    );
  });

  it('flags Codex CLI release-intake template paths outside the repository', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-intake-outside-path-'));
    createdDirs.push(repoRoot);

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
      extraPolicies: {
        codex_release_intake: {
          template_path: '../outside-template.md',
          required_markers: ['Release Evidence Axes']
        }
      }
    });

    const errors = await runDocsCheck(repoRoot);

    expect(errors).toContainEqual(
      expect.objectContaining({
        file: '../outside-template.md',
        rule: 'codex-release-intake-template-stale',
        reference: 'invalid template_path'
      })
    );
  });

  it('validates the default Codex CLI release-intake template when the policy is absent or disabled', async () => {
    for (const [policyCase, extraPolicies] of [
      ['absent', {}],
      [
        'disabled',
        {
          codex_release_intake: {
            enabled: false,
            template_path: 'docs/custom-release-intake-template.md',
            required_markers: ['Custom Disabled Marker']
          }
        }
      ]
    ] as const) {
      const repoRoot = await mkdtemp(join(tmpdir(), `docs-hygiene-release-intake-default-${policyCase}-`));
      createdDirs.push(repoRoot);

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
      await writeDocsCatalogFixture(repoRoot, { extraPolicies });
      await mkdir(join(repoRoot, '.agent', 'task', 'templates'), { recursive: true });
      await writeFile(
        join(repoRoot, '.agent', 'task', 'templates', 'codex-cli-release-intake-template.md'),
        ['# Codex CLI Release-Intake Issue Template', '', '## Release Evidence Axes', '- local CLI', ''].join('\n'),
        'utf8'
      );

      const errors = await runDocsCheck(repoRoot);

      expect(errors).toContainEqual(
        expect.objectContaining({
          file: '.agent/task/templates/codex-cli-release-intake-template.md',
          rule: 'codex-release-intake-template-stale',
          reference: 'missing marker: Supersedes / Holds Matrix'
        })
      );
    }
  });

  it('accepts the canonical Codex CLI release-intake template markers', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-hygiene-release-intake-pass-'));
    createdDirs.push(repoRoot);

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
      extraPolicies: {
        codex_release_intake: {
          template_path: '.agent/task/templates/codex-cli-release-intake-template.md',
          required_markers: [
            'Release Evidence Axes',
            'local CLI',
            'package/downstream smoke',
            'cloud-canary',
            'workflow pins',
            'model posture',
            'docs surfaces',
            'release notes',
            'Supersedes / Holds Matrix',
            'prior release evidence page',
            'posture surface',
            'Closeout Classification',
            'adopt latest',
            'intentionally hold',
            'demote/archive-only',
            'stale current-facing docs',
            'workflow pins remain unclassified'
          ]
        }
      }
    });
    await mkdir(join(repoRoot, '.agent', 'task', 'templates'), { recursive: true });
    await writeFile(
      join(repoRoot, '.agent', 'task', 'templates', 'codex-cli-release-intake-template.md'),
      [
        '# Codex CLI Release-Intake Issue Template',
        '',
        '## Release Evidence Axes',
        '- local CLI',
        '- package/downstream smoke',
        '- cloud-canary',
        '- workflow pins',
        '- model posture',
        '- docs surfaces',
        '- release notes',
        '',
        '## Supersedes / Holds Matrix',
        'Every prior release evidence page and posture surface gets a row.',
        '',
        '## Closeout Classification',
        '- adopt latest',
        '- intentionally hold',
        '- demote/archive-only',
        '- stale current-facing docs',
        '- workflow pins remain unclassified',
        ''
      ].join('\n'),
      'utf8'
    );

    const errors = await runDocsCheck(repoRoot);

    expect(errors.filter((error) => error.rule === 'codex-release-intake-template-stale')).toEqual([]);
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
