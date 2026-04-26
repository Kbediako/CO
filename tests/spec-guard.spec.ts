import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'spec-guard.mjs');

const createdDirs: string[] = [];

function reviewDateDaysAgo(daysOld: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysOld);
  return date.toISOString().slice(0, 10);
}

async function initRepository(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'spec-guard-'));
  createdDirs.push(dir);

  await execFileAsync('git', ['init'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.email', 'spec-guard@example.com'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.name', 'Spec Guard'], { cwd: dir });

  await mkdir(join(dir, 'tasks/specs'), { recursive: true });
  await mkdir(join(dir, 'src'), { recursive: true });
  await mkdir(join(dir, 'orchestrator/src'), { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  await writeFile(
    join(dir, 'tasks/specs/0001-initial.md'),
    `last_review: ${today}\n\nInitial spec.\n`
  );
  await writeFile(join(dir, 'src/index.ts'), 'export const value = 1;\n');
  await writeFile(join(dir, 'orchestrator/src/index.ts'), 'export const orchestratorValue = 1;\n');

  await execFileAsync('git', ['add', '.'], { cwd: dir });
  await execFileAsync('git', ['commit', '-m', 'initial commit'], { cwd: dir });

  return dir;
}

function rollingFreshnessPolicy(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    owner_issue: 'CO-175',
    policy_doc: 'docs/guides/docs-freshness-cohorts.md',
    window_days: 7,
    max_cohorts: 1,
    max_entries: 10,
    eligible_doc_classes: ['task_packet'],
    baseline_cohorts: [
      {
        id: 'fixture-spec-baseline',
        last_review: reviewDateDaysAgo(31),
        cadence_days: 30,
        path_families: ['tasks/specs'],
        task_number_range: { start: '0001', end: '0001' }
      }
    ],
    ...overrides
  };
}

async function writeDocsCatalog(repo: string, policy: Record<string, unknown> = rollingFreshnessPolicy()) {
  await mkdir(join(repo, 'docs'), { recursive: true });
  await writeFile(
    join(repo, 'docs/docs-catalog.json'),
    JSON.stringify(
      {
        version: 1,
        classes: {
          task_packet: { label: 'Task Packet', report_order: 200 }
        },
        policies: {
          rolling_freshness_cohorts: policy
        },
        entries: [],
        patterns: [
          {
            glob: 'tasks/**/*.md',
            doc_class: 'task_packet'
          }
        ]
      },
      null,
      2
    ),
    'utf8'
  );
}

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('spec-guard script', () => {
  it('reports missing spec updates when code changes without spec touch (dry-run)', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'src/index.ts'), 'export const value = 2;\n');
    await execFileAsync('git', ['commit', '-am', 'update code'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'code/migrations changed but no spec updated under tasks/specs, docs/design/specs, or tasks/index.json'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('passes when code changes include a fresh spec update', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(join(repo, 'src/index.ts'), 'export const value = 3;\n');
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nUpdated spec content.\n`
    );

    await execFileAsync('git', ['add', 'src/index.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'code and spec update'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('reports missing spec updates when orchestrator/src changes without spec touch (dry-run)', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'orchestrator/src/index.ts'), 'export const orchestratorValue = 2;\n');
    await execFileAsync('git', ['commit', '-am', 'update orchestrator code'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'code/migrations changed but no spec updated under tasks/specs, docs/design/specs, or tasks/index.json'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('passes when orchestrator/src changes include a fresh spec update', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(join(repo, 'orchestrator/src/index.ts'), 'export const orchestratorValue = 3;\n');
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nUpdated spec content for orchestrator change.\n`
    );

    await execFileAsync(
      'git',
      ['add', 'orchestrator/src/index.ts', 'tasks/specs/0001-initial.md'],
      {
        cwd: repo
      }
    );
    await execFileAsync('git', ['commit', '-m', 'orchestrator and spec update'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('skips completed specs during freshness checks', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: completed', 'last_review: 2000-01-01', '---', '', 'Completed spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('skips archived spec stubs during freshness checks', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      [
        '# Archived Document',
        '',
        'last_review: 2000-01-01',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-04-08. Full content: https://example.com/archive.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: tasks/specs/0001-initial.md',
        ''
      ].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('does not skip archive stubs whose archive path targets another file', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      [
        '# Archived Document',
        '',
        'last_review: 2000-01-01',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-04-08. Full content: https://example.com/archive.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: tasks/specs/other-spec.md',
        ''
      ].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain("tasks/specs/0001-initial.md: last_review 2000-01-01");
  });

  it('skips archived spec stubs when archive metadata uses Windows separators', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      [
        '# Archived Document',
        '',
        'last_review: 2000-01-01',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-04-08. Full content: https://example.com/archive.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: tasks\\specs\\0001-initial.md',
        ''
      ].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('normalizes Windows spec paths before rolling cohort provenance matching', async () => {
    const { specGuardInternalsForTests } = await import(pathToFileURL(scriptPath).href);
    const windowsSpecPath = 'tasks\\specs\\0001-initial.md';

    expect(specGuardInternalsForTests.normalizeSpecFilePath(windowsSpecPath)).toBe(
      'tasks/specs/0001-initial.md'
    );
    expect(specGuardInternalsForTests.classifySpecPathFamily(windowsSpecPath)).toBe('tasks/specs');
    expect(specGuardInternalsForTests.extractTaskNumber(windowsSpecPath)).toBe('0001');
    expect(
      specGuardInternalsForTests.matchesDeclaredPath(
        { file: windowsSpecPath, task_number: null },
        {
          path_prefixes: ['tasks/specs/0001-'],
          task_number_range: null
        }
      )
    ).toBe(true);
  });

  it('still reports stale active specs', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: in_progress', 'last_review: 2000-01-01', '---', '', 'Active spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain("tasks/specs/0001-initial.md: last_review 2000-01-01");
  });

  it('reports owner-backed stale active specs as rolling freshness cohort debt', async () => {
    const repo = await initRepository();
    const staleReviewDate = reviewDateDaysAgo(31);
    await writeDocsCatalog(repo);

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: in_progress', `last_review: ${staleReviewDate}`, '---', '', 'Active spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('Spec guard rolling freshness cohort entries: 1');
    expect(stdout).toContain('rolling cohort CO-175: 1 specs');
    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('keeps undeclared same-class active specs as blocking failures', async () => {
    const repo = await initRepository();
    const staleReviewDate = reviewDateDaysAgo(31);
    await writeDocsCatalog(
      repo,
      rollingFreshnessPolicy({
        baseline_cohorts: [
          {
            id: 'different-spec-baseline',
            last_review: staleReviewDate,
            cadence_days: 30,
            path_families: ['tasks/specs'],
            task_number_range: { start: '0002', end: '0002' }
          }
        ]
      })
    );

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: in_progress', `last_review: ${staleReviewDate}`, '---', '', 'Active spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).not.toContain('Spec guard rolling freshness cohort entries');
    expect(stdout).toContain(`tasks/specs/0001-initial.md: last_review ${staleReviewDate}`);
  });

  it('keeps expired declared active specs as blocking failures', async () => {
    const repo = await initRepository();
    const staleReviewDate = reviewDateDaysAgo(45);
    await writeDocsCatalog(
      repo,
      rollingFreshnessPolicy({
        baseline_cohorts: [
          {
            id: 'expired-spec-baseline',
            last_review: staleReviewDate,
            cadence_days: 30,
            path_families: ['tasks/specs'],
            task_number_range: { start: '0001', end: '0001' }
          }
        ]
      })
    );

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: in_progress', `last_review: ${staleReviewDate}`, '---', '', 'Active spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).not.toContain('Spec guard rolling freshness cohort entries');
    expect(stdout).toContain(`tasks/specs/0001-initial.md: last_review ${staleReviewDate}`);
  });

  it('keeps over-budget declared active specs as blocking failures', async () => {
    const repo = await initRepository();
    const staleReviewDate = reviewDateDaysAgo(31);
    await writeDocsCatalog(
      repo,
      rollingFreshnessPolicy({
        max_entries: 1,
        baseline_cohorts: [
          {
            id: 'over-budget-spec-baseline',
            last_review: staleReviewDate,
            cadence_days: 30,
            path_families: ['tasks/specs'],
            task_number_range: { start: '0001', end: '0002' }
          }
        ]
      })
    );

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: in_progress', `last_review: ${staleReviewDate}`, '---', '', 'Active spec.'].join('\n')
    );
    await writeFile(
      join(repo, 'tasks/specs/0002-second.md'),
      ['---', 'status: in_progress', `last_review: ${staleReviewDate}`, '---', '', 'Second spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).not.toContain('Spec guard rolling freshness cohort entries');
    expect(stdout).toContain(`tasks/specs/0001-initial.md: last_review ${staleReviewDate}`);
    expect(stdout).toContain(`tasks/specs/0002-second.md: last_review ${staleReviewDate}`);
  });

  it('does not skip stale active specs when rolling freshness classes are invalid', async () => {
    const repo = await initRepository();
    const staleReviewDate = reviewDateDaysAgo(31);
    await writeDocsCatalog(repo, rollingFreshnessPolicy({ eligible_doc_classes: [] }));

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: in_progress', `last_review: ${staleReviewDate}`, '---', '', 'Active spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(`tasks/specs/0001-initial.md: last_review ${staleReviewDate}`);
  });

  it('does not skip stale active specs when canonical owner overrides are malformed', async () => {
    const repo = await initRepository();
    const staleReviewDate = reviewDateDaysAgo(31);
    await writeDocsCatalog(
      repo,
      rollingFreshnessPolicy({
        canonical_owner_issues: {
          canonical_owner_key: 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/specs',
          owner_issue: 'CO-320'
        }
      })
    );

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: in_progress', `last_review: ${staleReviewDate}`, '---', '', 'Active spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).not.toContain('Spec guard rolling freshness cohort entries');
    expect(stdout).toContain(`tasks/specs/0001-initial.md: last_review ${staleReviewDate}`);
  });

  it('fails closed when docs catalog parsing fails', async () => {
    const repo = await initRepository();
    await mkdir(join(repo, 'docs'), { recursive: true });
    await writeFile(join(repo, 'docs/docs-catalog.json'), '{not json', 'utf8');

    await expect(
      execFileAsync('node', [scriptPath], {
        cwd: repo,
        env: { ...process.env }
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Spec guard failed:')
    });
  });

  it('does not skip active specs that mention the archive marker in their body', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      [
        '---',
        'status: in_progress',
        'last_review: 2000-01-01',
        '---',
        '',
        'Documentation can mention `<!-- docs-archive:stub -->` without becoming an archive stub.'
      ].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain("tasks/specs/0001-initial.md: last_review 2000-01-01");
  });
});
