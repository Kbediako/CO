import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'spec-guard.mjs');

const createdDirs: string[] = [];

function specGuardEnv(overrides: NodeJS.ProcessEnv = {}) {
  const env = { ...process.env, ...overrides };
  if (!Object.prototype.hasOwnProperty.call(overrides, 'BASE_SHA')) {
    delete env.BASE_SHA;
  }
  return env;
}

function reviewDateDaysAgo(daysOld: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysOld);
  return date.toISOString().slice(0, 10);
}

function reviewDateDaysFromNow(daysFromNow: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + daysFromNow);
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

type FallbackPacketOptions = {
  decisionBody: string;
  policyBody?: string;
  phraseStyle?: 'space' | 'hyphen';
  sourceDecisionBodies?: Partial<
    Record<'prd' | 'taskSpec' | 'techSpecMirror' | 'actionPlan' | 'taskChecklist' | 'agentTask', string>
  >;
};

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

function fallbackDecisionTable(rows: string[]) {
  return [
    '| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows
  ].join('\n');
}

function completeExpireFallbackRow(overrides: Record<string, string> = {}) {
  const row = {
    surface: '`provider workflow`',
    fallback: 'Provider id mapping fallback retained for provider drift',
    decision: 'expire fallback',
    owner: 'CO-399 parent lane',
    trigger: 'Provider claim payload omits providerIssueId while providerId remains present.',
    introducedDate: reviewDateDaysAgo(1),
    reviewDate: reviewDateDaysFromNow(14),
    maximumLifetime: reviewDateDaysFromNow(28),
    removalCondition: 'Provider claim payload always includes providerIssueId in focused fixture evidence.',
    validation: 'Focused spec-guard fallback expiry regression test.',
    ...overrides
  };

  return `| ${row.surface} | ${row.fallback} | ${row.decision} | ${row.owner} | ${row.trigger} | ${row.introducedDate} | ${row.reviewDate} | ${row.maximumLifetime} | ${row.removalCondition} | ${row.validation} |`;
}

function durableRetentionRow(overrides: Record<string, string> = {}) {
  const row = {
    surface: '`repo guards`',
    fallback: 'Fallback-expiry owner routing and durable guard compatibility',
    decision: 'justify retaining fallback',
    owner: 'CO-399 parent lane',
    trigger: 'Guard routes existing surface-specific cleanup to owner references without absorbing scope.',
    introducedDate: reviewDateDaysAgo(1),
    reviewDate: reviewDateDaysFromNow(28),
    maximumLifetime: 'Non-expiring durable retention only with rationale',
    removalCondition: 'Remove only if CO-382 policy supersedes owner routing or cleanup scope changes.',
    validation: 'Focused durable-retention spec-guard regression test.',
    ...overrides
  };

  return `| ${row.surface} | ${row.fallback} | ${row.decision} | ${row.owner} | ${row.trigger} | ${row.introducedDate} | ${row.reviewDate} | ${row.maximumLifetime} | ${row.removalCondition} | ${row.validation} |`;
}

function fallbackPolicyGuide(includeAllOwnerReferences = true) {
  const docsFreshnessOwner = includeAllOwnerReferences ? 'Owner follow-up: `CO-397`.' : 'Owner follow-up: pending.';
  return [
    '# Fallback Expiry and Refactor Policy',
    '',
    'Last reviewed: 2026-04-27',
    '',
    'Every touched fallback or seam must choose `remove fallback`, `expire fallback`, or `justify retaining fallback`.',
    '',
    '## Existing Fallback-Heavy Areas',
    '',
    '- Provider workflow: provider-id mapping fallbacks. Owner follow-up: `CO-394`.',
    '- Review wrapper: scoped prompt retry and generated fallback notes. Owner follow-up: `CO-395`.',
    '- Runtime routing: appserver-to-CLI and cloud fallback contracts. Owner follow-up: `CO-396`.',
    `- Docs freshness ownership: owned rolling debt and canonical owner reuse. ${docsFreshnessOwner}`,
    '- Control-host status surfaces: legacy proof/status fallback projection paths. Owner follow-up: `CO-398`.',
    ''
  ].join('\n');
}

async function writeFallbackPacket(
  repo: string,
  { decisionBody, policyBody, phraseStyle = 'space', sourceDecisionBodies }: FallbackPacketOptions
) {
  const today = new Date().toISOString().slice(0, 10);
  const sourceDecision = (source: keyof NonNullable<FallbackPacketOptions['sourceDecisionBodies']>) =>
    sourceDecisionBodies?.[source] ?? decisionBody;
  const largeRefactorTerm = phraseStyle === 'hyphen' ? 'large-refactor' : 'large refactor';
  const minorSeamTerm = phraseStyle === 'hyphen' ? 'minor-seam' : 'minor seam';
  await mkdir(join(repo, 'docs/guides'), { recursive: true });
  await mkdir(join(repo, '.agent/task'), { recursive: true });
  await mkdir(join(repo, 'tasks'), { recursive: true });

  await writeFile(join(repo, 'docs/guides/fallback-expiry-and-refactor-policy.md'), policyBody ?? fallbackPolicyGuide());
  await writeFile(
    join(repo, 'docs/PRD-linear-fallback-fixture.md'),
    [
      '# PRD - fallback-expiry guard fixture',
      '',
      '## User Intent',
      `- Enforce CO-382 fallback expiry and ${largeRefactorTerm} decisions in repo guards.`,
      '',
      '## CO-382 Fallback Metadata',
      sourceDecision('prd'),
      ''
    ].join('\n')
  );
  await writeFile(
    join(repo, 'tasks/specs/linear-fallback-fixture.md'),
    [
      '---',
      'id: fallback-fixture',
      'title: "fallback-expiry guard fixture"',
      `last_review: ${today}`,
      '---',
      '',
      '# TECH_SPEC - fallback-expiry guard fixture',
      '',
      '## Fallback Expiry / Refactor Decision',
      sourceDecision('taskSpec'),
      '',
      '## Large-Refactor Check',
      `- ${minorSeamTerm} behavior is acceptable only when one bounded fallback decision exists.`,
      ''
    ].join('\n')
  );
  await writeFile(
    join(repo, 'docs/TECH_SPEC-linear-fallback-fixture.md'),
    [
      '# TECH_SPEC mirror - fallback-expiry guard fixture',
      '',
      '## Parseable Contract',
      '- PRD, TECH_SPEC, ACTION_PLAN, and task checklist surfaces carry the same decision contract.',
      '',
      '## Fallback Expiry / Refactor Decision',
      sourceDecision('techSpecMirror'),
      ''
    ].join('\n')
  );
  await writeFile(
    join(repo, 'docs/ACTION_PLAN-linear-fallback-fixture.md'),
    [
      '# ACTION_PLAN - fallback-expiry guard fixture',
      '',
      '## Issue Readiness Gate',
      '- Fallback / refactor decision:',
      sourceDecision('actionPlan'),
      '',
      `- ${largeRefactorTerm} check: keep the fixture scoped to one governed surface and one lifecycle phase.`,
      ''
    ].join('\n')
  );
  await writeFile(
    join(repo, 'tasks/tasks-linear-fallback-fixture.md'),
    [
      '# Task Checklist - fallback-expiry guard fixture',
      '',
      '## Parent-Owned Implementation',
      '- [x] Fallback / refactor decision captured.',
      sourceDecision('taskChecklist'),
      '',
      '- [x] Focused guard validation evidence recorded.',
      ''
    ].join('\n')
  );
  await writeFile(
    join(repo, '.agent/task/linear-fallback-fixture.md'),
    [
      '# Task Checklist Mirror - fallback-expiry guard fixture',
      '',
      '## Decision Evidence',
      sourceDecision('agentTask'),
      ''
    ].join('\n')
  );
  await writeFile(
    join(repo, 'tasks/index.json'),
    JSON.stringify(
      {
        items: [
          {
            id: 'fallback-fixture',
            title: 'fallback-expiry guard fixture',
            canonical_owner_key: 'fallback-expiry:large-refactor:repo-guards',
            paths: {
              docs: 'tasks/specs/linear-fallback-fixture.md'
            },
            summary:
              'Fixture preserves CO-394, CO-395, CO-396, CO-397, and CO-398 as owner references for fallback-expiry guard enforcement.'
          }
        ]
      },
      null,
      2
    )
  );
}

async function commitFallbackGuardChange(repo: string, options: FallbackPacketOptions) {
  await mkdir(join(repo, 'orchestrator/src/cli/control'), { recursive: true });
  await writeFile(
    join(repo, 'orchestrator/src/cli/control/providerIssueHandoff.ts'),
    [
      'export function selectProviderIssueId(input: { providerIssueId?: string; legacyProviderId?: string }) {',
      "  return input.providerIssueId ?? input.legacyProviderId ?? 'legacy_provider_id_fallback';",
      '}',
      ''
    ].join('\n')
  );
  await writeFallbackPacket(repo, options);
  await execFileAsync('git', ['add', '.'], { cwd: repo });
  await execFileAsync('git', ['commit', '-m', 'fallback guard fixture'], { cwd: repo });
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
      env: specGuardEnv()
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
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('reports missing spec updates when orchestrator/src changes without spec touch (dry-run)', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'orchestrator/src/index.ts'), 'export const orchestratorValue = 2;\n');
    await execFileAsync('git', ['commit', '-am', 'update orchestrator code'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
      env: specGuardEnv()
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
        env: specGuardEnv()
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
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain("tasks/specs/0001-initial.md: last_review 2000-01-01");
  });

  it('passes fallback-sensitive changes with complete temporary expiry metadata', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('accepts URL autolinks as concrete fallback decision evidence', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      `| \`repo guards\` | Legacy provider fallback removal proof | remove fallback | CO-399 parent lane | Provider fallback removed from guard fixture. | ${reviewDateDaysAgo(1)} | N/A after removal | N/A after removal | <https://example.com/remove-fallback-proof> | <https://example.com/remove-validation-proof> |`,
      completeExpireFallbackRow({
        removalCondition: '<https://example.com/expire-removal-proof>',
        validation: '<https://example.com/expire-validation-proof>'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('accepts URL autolinks as large-refactor and minor-seam decision evidence', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);

    await commitFallbackGuardChange(repo, { decisionBody });
    const actionPlanPath = join(repo, 'docs/ACTION_PLAN-linear-fallback-fixture.md');
    const taskSpecPath = join(repo, 'tasks/specs/linear-fallback-fixture.md');
    const actionPlan = await readFile(actionPlanPath, 'utf8');
    const taskSpec = await readFile(taskSpecPath, 'utf8');
    await writeFile(
      actionPlanPath,
      actionPlan.replace(
        /- large refactor check: .+\n/,
        '- Large-refactor check: <https://example.com/large-refactor-proof>\n'
      )
    );
    await writeFile(
      taskSpecPath,
      taskSpec.replace(
        /- minor seam behavior is acceptable .+\n/,
        '- Minor-seam decision: <https://example.com/minor-seam-proof>\n'
      )
    );
    await execFileAsync('git', ['add', actionPlanPath, taskSpecPath], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'autolink refactor decision evidence'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('accepts underscore large-refactor and minor-seam decision labels', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);

    await commitFallbackGuardChange(repo, { decisionBody });
    const actionPlanPath = join(repo, 'docs/ACTION_PLAN-linear-fallback-fixture.md');
    const taskSpecPath = join(repo, 'tasks/specs/linear-fallback-fixture.md');
    const actionPlan = await readFile(actionPlanPath, 'utf8');
    const taskSpec = await readFile(taskSpecPath, 'utf8');
    await writeFile(
      actionPlanPath,
      actionPlan.replace(
        /- large refactor check: .+\n/,
        '- large_refactor decision: keep this fixture scoped to one governed surface.\n'
      )
    );
    await writeFile(
      taskSpecPath,
      taskSpec.replace(
        /- minor seam behavior is acceptable .+\n/,
        '- minor_seam decision: acceptable with one bounded fallback decision.\n'
      )
    );
    await execFileAsync('git', ['add', actionPlanPath, taskSpecPath], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'underscore refactor decision evidence'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('rejects blank fallback decisions even when a sibling row is valid', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow(),
      completeExpireFallbackRow({
        fallback: 'Provider workflow fallback retained for an undecided compatibility seam.',
        decision: ''
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback decision must be exactly one of remove fallback, expire fallback, or justify retaining fallback'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects remove fallback rows without removal evidence', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      '|  |  | remove fallback |  |  |  |  |  |  |  |'
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('remove fallback decision requires non-empty surface');
    expect(stdout).toContain('remove fallback decision requires non-empty fallback/seam');
    expect(stdout).toContain('remove fallback decision requires non-empty removal condition');
    expect(stdout).toContain('remove fallback decision requires non-empty validation');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('reports fallback-sensitive changes when the guard uses the HEAD~1 fallback diff range', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'src/index.ts'),
      "export const value = 'legacy_provider_fallback_without_packet';\n"
    );
    await execFileAsync('git', ['commit', '-am', 'fallback code without packet'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv({ BASE_SHA: 'HEAD' })
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback/seam-touching changes require updated PRD decision evidence (src/index.ts)'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('reports fallback-sensitive renames from the old path even when the new path is neutral', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(join(repo, 'src/legacyFallback.ts'), 'export const value = 1;\n');
    await execFileAsync('git', ['add', 'src/legacyFallback.ts'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'add legacy fallback file'], { cwd: repo });

    await execFileAsync('git', ['mv', 'src/legacyFallback.ts', 'src/current.ts'], { cwd: repo });
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nGeneric spec update without fallback decision evidence.\n`
    );
    await execFileAsync('git', ['add', 'src/current.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'rename fallback path with generic spec'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv({ BASE_SHA: 'HEAD~1' })
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback/seam-touching changes require updated PRD decision evidence (src/legacyFallback.ts)'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('requires decision evidence for governed fallback surfaces even without literal fallback wording', async () => {
    const repo = await initRepository();
    await mkdir(join(repo, 'scripts'), { recursive: true });
    await writeFile(
      join(repo, 'scripts/run-review.ts'),
      "export const reviewTransportMode = 'scoped-title-retry';\n"
    );
    await execFileAsync('git', ['add', 'scripts/run-review.ts'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'touch governed review wrapper surface'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback/seam-touching changes require updated PRD decision evidence (scripts/run-review.ts)'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not treat ordinary cache identifiers as fallback behavior', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(
      join(repo, 'src/cache.ts'),
      "export const cacheKey = 'cacheDir';\nexport const cachedValue = cacheKey;\n"
    );
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nSpec update for an ordinary cache module.\n`
    );
    await execFileAsync('git', ['add', 'src/cache.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'ordinary cache module'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('does not treat lowercase fallback-sensitive prefixes as camelCase seams', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(
      join(repo, 'src/names.ts'),
      [
        "export const seamless = 'ordinary adjective';",
        "export const breakglasshouse = 'ordinary lowercase word';",
        "export const minorseamless = 'ordinary lowercase continuation';",
        ''
      ].join('\n')
    );
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nSpec update for ordinary lowercase identifiers.\n`
    );
    await execFileAsync('git', ['add', 'src/names.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'ordinary lowercase identifiers'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('requires decision evidence for camelCase compatibility seams', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(
      join(repo, 'src/adapter.ts'),
      "export const compatibilityMode = 'compatShim';\n"
    );
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nSpec update intentionally omits fallback decision evidence.\n`
    );
    await execFileAsync('git', ['add', 'src/adapter.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'compatibility seam without decision'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback/seam-touching changes require updated PRD decision evidence (src/adapter.ts)'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('requires decision evidence for prefixed camelCase fallback-sensitive identifiers', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(
      join(repo, 'src/names.ts'),
      [
        'export const providerBreakGlassMode = true;',
        'export const routingMinorSeamDecision = true;',
        'export const statusLastKnownGoodRun = true;',
        'export const workerCompatShim = true;',
        ''
      ].join('\n')
    );
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nGeneric spec update intentionally omits decision metadata.\n`
    );
    await execFileAsync('git', ['add', 'src/names.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'prefixed camelcase sensitive identifiers'], {
      cwd: repo
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback/seam-touching changes require updated PRD decision evidence (src/names.ts)'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('requires decision evidence for all-caps fallback-sensitive identifiers', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(
      join(repo, 'src/constants.ts'),
      [
        'export const COMPAT_MODE = true;',
        'export const COMPATIBILITY_MODE = true;',
        'export const SEAM_MODE = true;',
        ''
      ].join('\n')
    );
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nGeneric spec update intentionally omits decision metadata.\n`
    );
    await execFileAsync('git', ['add', 'src/constants.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'uppercase sensitive identifiers'], {
      cwd: repo
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback/seam-touching changes require updated PRD decision evidence (src/constants.ts)'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('preserves fallback scanning for large diffs', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);
    const filler = '// ordinary filler line that makes the diff exceed the default exec buffer\n'.repeat(20_000);

    await writeFile(join(repo, 'src/big.ts'), `export const marker = 'legacy provider fallback';\n${filler}`);
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nSpec update intentionally omits fallback decision evidence.\n`
    );
    await execFileAsync('git', ['add', '.'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'large fallback-sensitive diff'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require updated PRD decision evidence (src/big.ts');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('fails closed when fallback diff text cannot be scanned', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);
    const filler = '// ordinary filler line that forces the configured diff buffer to overflow\n'.repeat(50);

    await writeFile(join(repo, 'src/big.ts'), `export const value = 2;\n${filler}`);
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nGeneric spec update without fallback decision metadata.\n`
    );
    await execFileAsync('git', ['add', 'src/big.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'large code diff with unreadable text scan'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv({ BASE_SHA: 'HEAD~1', SPEC_GUARD_DIFF_TEXT_MAX_BUFFER: '16' })
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback/seam-touching changes require updated PRD decision evidence (src/big.ts)'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('accepts docs/design specs as TECH_SPEC fallback decision evidence', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);
    const sourceBody = [
      'Large-refactor check: keep the fixture scoped to one governed surface and one lifecycle phase.',
      'Minor-seam behavior is acceptable only when one bounded fallback decision exists.',
      '',
      decisionBody
    ].join('\n');

    await mkdir(join(repo, 'docs/design/specs'), { recursive: true });
    await mkdir(join(repo, 'docs'), { recursive: true });
    await mkdir(join(repo, 'tasks'), { recursive: true });
    await writeFile(
      join(repo, 'src/index.ts'),
      "export const fallbackMode = 'legacy provider fallback retained for compatibility';\n"
    );
    await writeFile(join(repo, 'docs/PRD-design-spec-fixture.md'), sourceBody);
    await writeFile(
      join(repo, 'docs/design/specs/design-spec-fixture.md'),
      `last_review: ${today}\n\n${sourceBody}\n`
    );
    await writeFile(join(repo, 'docs/ACTION_PLAN-design-spec-fixture.md'), sourceBody);
    await writeFile(join(repo, 'tasks/tasks-design-spec-fixture.md'), sourceBody);
    await execFileAsync('git', ['add', '.'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'fallback evidence in design spec'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('ignores unrelated Not applicable decision tables when fallback evidence is complete', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([completeExpireFallbackRow()]),
      '',
      '| Surface | Decision | Rationale |',
      '| --- | --- | --- |',
      '| Parity matrix | Not applicable | This unrelated table is not fallback metadata. |'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('requires parseable fallback decision rows in every changed packet source', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);

    await commitFallbackGuardChange(repo, {
      decisionBody,
      sourceDecisionBodies: {
        actionPlan: [
          'Fallback / refactor decision evidence is intentionally missing from this source.',
          '',
          'Large-refactor check: minor-seam behavior still requires source-local metadata.'
        ].join('\n')
      }
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'docs/ACTION_PLAN-linear-fallback-fixture.md: fallback/seam-touching changes require a parseable CO-382 fallback decision table'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects contradictory fallback decisions for the same surface and seam across packet sources', async () => {
    const repo = await initRepository();
    const expireDecisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);
    const removeDecisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        decision: 'remove fallback',
        owner: 'CO-399 parent lane',
        trigger: 'Provider id mapping fallback is removed during the guard fixture cleanup.',
        reviewDate: reviewDateDaysFromNow(14),
        maximumLifetime: reviewDateDaysFromNow(28),
        removalCondition: 'Provider id mapping fallback is removed from the guard fixture.',
        validation: 'Focused same-surface contradictory decision regression test.'
      })
    ]);

    await commitFallbackGuardChange(repo, {
      decisionBody: expireDecisionBody,
      sourceDecisionBodies: {
        actionPlan: removeDecisionBody
      }
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('contradictory fallback decisions');
    expect(stdout).toContain('provider workflow');
    expect(stdout).toContain('Provider id mapping fallback retained for provider drift');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not accept unrelated decision tables as fallback decision evidence', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);

    await commitFallbackGuardChange(repo, {
      decisionBody,
      sourceDecisionBodies: {
        actionPlan: [
          '| Area | Decision |',
          '| --- | --- |',
          '| Unrelated cleanup | remove fallback |',
          '',
          'Large-refactor check: minor-seam behavior still requires source-local metadata.'
        ].join('\n')
      }
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'docs/ACTION_PLAN-linear-fallback-fixture.md: fallback/seam-touching changes require a parseable CO-382 fallback decision table'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects partial fallback decision table shapes', async () => {
    const repo = await initRepository();
    const decisionBody = [
      '| Surface | Fallback / seam | Decision | Owner |',
      '| --- | --- | --- | --- |',
      '| `provider workflow` | Provider id mapping fallback retained for provider drift | remove fallback | CO-399 parent lane |'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require a parseable CO-382 fallback decision table');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('accepts hyphenated large-refactor and minor-seam policy wording', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);

    await commitFallbackGuardChange(repo, {
      decisionBody,
      phraseStyle: 'hyphen'
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('does not accept protected-term boilerplate as large-refactor decision evidence', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);
    const boilerplate = [
      '- Protected term: `large refactor`.',
      '- Protected term: `minor seam`.',
      decisionBody
    ].join('\n');

    await writeFallbackPacket(repo, {
      decisionBody: boilerplate,
      sourceDecisionBodies: {
        taskSpec: boilerplate,
        actionPlan: boilerplate
      }
    });
    await writeFile(
      join(repo, 'tasks/specs/linear-fallback-fixture.md'),
      [
        '---',
        'id: fallback-fixture',
        'title: "fallback-expiry guard fixture"',
        `last_review: ${today}`,
        '---',
        '',
        '# TECH_SPEC - fallback-expiry guard fixture',
        '',
        '## Fallback Expiry / Refactor Decision',
        boilerplate,
        ''
      ].join('\n')
    );
    await writeFile(
      join(repo, 'docs/ACTION_PLAN-linear-fallback-fixture.md'),
      [
        '# ACTION_PLAN - fallback-expiry guard fixture',
        '',
        '## Issue Readiness Gate',
        '- Fallback / refactor decision:',
        boilerplate,
        ''
      ].join('\n')
    );
    await mkdir(join(repo, 'orchestrator/src/cli/control'), { recursive: true });
    await writeFile(
      join(repo, 'orchestrator/src/cli/control/providerIssueHandoff.ts'),
      [
        'export function selectProviderIssueId(input: { providerIssueId?: string; legacyProviderId?: string }) {',
        '  return input.providerIssueId ?? input.legacyProviderId ?? "legacy-provider";',
        '}',
        ''
      ].join('\n')
    );
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nSpec update for fallback-sensitive implementation.\n`
    );
    await execFileAsync('git', ['add', '.'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'fallback guard without structured refactor decisions'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require large refactor and minor seam decision evidence');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects placeholder large-refactor and minor-seam decision values', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);

    await commitFallbackGuardChange(repo, { decisionBody });
    const actionPlanPath = join(repo, 'docs/ACTION_PLAN-linear-fallback-fixture.md');
    const taskSpecPath = join(repo, 'tasks/specs/linear-fallback-fixture.md');
    const actionPlan = await readFile(actionPlanPath, 'utf8');
    const taskSpec = await readFile(taskSpecPath, 'utf8');
    await writeFile(
      actionPlanPath,
      actionPlan.replace(/- large refactor check: .+\n/, '- Large-refactor check: TBD\n')
    );
    await writeFile(
      taskSpecPath,
      taskSpec.replace(/- minor seam behavior is acceptable .+\n/, '- Minor-seam decision: pending\n')
    );
    await execFileAsync('git', ['add', actionPlanPath, taskSpecPath], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'placeholder refactor decision evidence'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require large refactor and minor seam decision evidence');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects placeholder minor-seam labels with valid large-refactor evidence', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([completeExpireFallbackRow()]);

    await commitFallbackGuardChange(repo, { decisionBody });
    const taskSpecPath = join(repo, 'tasks/specs/linear-fallback-fixture.md');
    const taskSpec = await readFile(taskSpecPath, 'utf8');
    await writeFile(
      taskSpecPath,
      taskSpec.replace(/- minor seam behavior is acceptable .+\n/, '- Minor-seam decision: pending\n')
    );
    await execFileAsync('git', ['add', taskSpecPath], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'placeholder minor seam decision evidence'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require large refactor and minor seam decision evidence');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects placeholder refactor labels even when other concrete evidence exists', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Large-refactor check: keep the fixture scoped to one governed surface and one lifecycle phase.',
      'Minor-seam behavior is acceptable only when one bounded fallback decision exists.',
      'Large-refactor decision: TBD',
      'Minor-seam decision: pending',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require large refactor and minor seam decision evidence');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects blank refactor labels even when other concrete evidence exists', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Large-refactor check: keep the fixture scoped to one governed surface and one lifecycle phase.',
      'Minor-seam behavior is acceptable only when one bounded fallback decision exists.',
      'Large-refactor decision:',
      'Minor-seam decision:',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require large refactor and minor seam decision evidence');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects punctuated placeholder refactor labels', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Large-refactor decision: Not applicable.',
      'Minor-seam decision: N/A.',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require large refactor and minor seam decision evidence');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects qualified placeholder refactor labels', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Large-refactor decision: Not applicable (docs-only).',
      'Minor-seam decision: none',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require large refactor and minor seam decision evidence');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects underscore placeholder refactor labels', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'large_refactor decision: TBD',
      'minor_seam decision: pending',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require large refactor and minor seam decision evidence');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('ignores explanatory Not applicable fallback labels when the decision table is complete', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Fallback / refactor decision: Not applicable only when no fallback or seam behavior changed.',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('ignores policy-form Not applicable fallback labels when the decision table is complete', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Fallback / refactor decision: Not applicable only when the task does not add, retain, or touch any fallback, compatibility branch, legacy projection, cached proof path, break-glass route, or minor seam.',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('rejects qualified Not applicable assertions when fallback-sensitive paths changed', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Fallback / refactor decision: Not applicable (docs-only change).',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('Not applicable is only valid when no fallback/seam behavior changed');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects generic Not applicable if labels when fallback-sensitive paths changed', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Fallback / refactor decision: Not applicable if docs-only change.',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('Not applicable is only valid when no fallback/seam behavior changed');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects punctuated Not applicable assertions when fallback-sensitive paths changed', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Fallback / refactor decision: Not applicable, docs-only change.',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('Not applicable is only valid when no fallback/seam behavior changed');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('requires tests/docs evidence for durable fallback retention', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([durableRetentionRow()]),
      '',
      '- Contract name: fallback-expiry owner routing and durable guard compatibility.',
      '- Owning surface: repo guards.',
      '- Steady-state proof: guard rejects missing and stale decisions while accepting durable metadata.',
      '- Non-expiring rationale: owner routing is a supported guard contract, not temporary fallback debt.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('justify retaining fallback evidence requires tests/docs');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not let owner references elsewhere exempt unrelated durable retention rows', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([
        durableRetentionRow({
          fallback: 'Unrelated durable compatibility fallback retained for repo guard fixtures'
        })
      ]),
      '',
      '- Owner references: CO-394, CO-395, CO-396, CO-397, CO-398.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('justify retaining fallback evidence requires contract name');
    expect(stdout).toContain('justify retaining fallback evidence requires tests/docs');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not let all owner references inside an unrelated durable row bypass rationale checks', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      durableRetentionRow({
        fallback: 'Durable compatibility fallback listing CO-394, CO-395, CO-396, CO-397, and CO-398 as historical context',
        trigger: 'Legacy fixture keeps a compatible parser branch during docs migration.',
        removalCondition:
          'Remove only if historical context CO-394, CO-395, CO-396, CO-397, and CO-398 is superseded by a new canonical issue.'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('justify retaining fallback evidence requires contract name');
    expect(stdout).toContain('justify retaining fallback evidence requires tests/docs');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('reports missing fallback-expiry decisions for fallback-sensitive changes', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Fallback / refactor decision will be captured later.',
      '',
      'Large-refactor check: pending.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'fallback/seam-touching changes require exactly one decision: remove fallback, expire fallback, or justify retaining fallback'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('detects camelCase fallback-sensitive identifiers without explicit fallback wording', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(
      join(repo, 'src/index.ts'),
      [
        'export const breakGlassMode = true;',
        'export const minorSeamDecision = true;',
        'export const lastKnownGoodRun = true;',
        ''
      ].join('\n')
    );
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nGeneric spec update without fallback decision metadata.\n`
    );
    await execFileAsync('git', ['add', '.'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'camelcase fallback-sensitive identifiers'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback/seam-touching changes require updated PRD decision evidence (src/index.ts)');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects Not applicable when fallback-sensitive paths changed', async () => {
    const repo = await initRepository();
    const decisionBody = [
      'Fallback / refactor decision: Not applicable.',
      '',
      'This fixture claims no fallback, compatibility, legacy, cached, break-glass, or minor-seam behavior is touched.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('Not applicable is only valid when no fallback/seam behavior changed');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects checkbox Not applicable labels when fallback-sensitive paths changed', async () => {
    const repo = await initRepository();
    const decisionBody = [
      '- [x] Fallback / refactor decision: Not applicable.',
      '',
      fallbackDecisionTable([completeExpireFallbackRow()])
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('Not applicable is only valid when no fallback/seam behavior changed');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not treat docs-only Not applicable decision text as fallback behavior', async () => {
    const repo = await initRepository();

    await mkdir(join(repo, 'docs'), { recursive: true });
    await writeFile(
      join(repo, 'docs/ACTION_PLAN-linear-docs-only.md'),
      [
        '# Docs-only fixture',
        '',
        '- Fallback / refactor decision: Not applicable.',
        '- This task does not add, retain, or touch fallback/seam behavior; the wording is policy evidence only.',
        ''
      ].join('\n')
    );
    await execFileAsync('git', ['add', 'docs/ACTION_PLAN-linear-docs-only.md'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'docs-only fallback decision evidence'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('reports expired retained fallback metadata', async () => {
    const repo = await initRepository();
    const expiredMaximumLifetime = reviewDateDaysAgo(1);
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        introducedDate: reviewDateDaysAgo(45),
        reviewDate: expiredMaximumLifetime,
        maximumLifetime: expiredMaximumLifetime
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback expiry metadata is stale');
    expect(stdout).toContain(expiredMaximumLifetime);
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects expire fallback rows without a target surface and fallback seam', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '-',
        fallback: '-'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback decision requires non-empty surface');
    expect(stdout).toContain('expire fallback decision requires non-empty fallback/seam');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects durable fallback rows without a target surface and fallback seam', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([
        durableRetentionRow({
          surface: '-',
          fallback: '-'
        })
      ]),
      '',
      '- Contract name: fallback-expiry owner routing and durable guard compatibility.',
      '- Owning surface: repo guards.',
      '- Steady-state proof: guard rejects missing and stale decisions while accepting durable metadata.',
      '- Tests/docs: focused durable-retention spec-guard regression test.',
      '- Non-expiring rationale: owner routing is a supported guard contract, not temporary fallback debt.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('justify retaining fallback decision requires non-empty surface');
    expect(stdout).toContain('justify retaining fallback decision requires non-empty fallback/seam');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects placeholder metadata in expire fallback rows', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        owner: 'N/A until owner assigned',
        trigger: 'none',
        removalCondition: 'Not applicable (docs-only)',
        validation: 'N/A.'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback decision requires non-empty owner');
    expect(stdout).toContain('expire fallback decision requires non-empty trigger');
    expect(stdout).toContain('expire fallback decision requires non-empty removal condition');
    expect(stdout).toContain('expire fallback decision requires non-empty validation');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects angle-bracket placeholders that are not URL autolinks', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        owner: '<owner>',
        validation: '<validation proof>'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback decision requires non-empty owner');
    expect(stdout).toContain('expire fallback decision requires non-empty validation');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects bracketed placeholder fallback metadata', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        owner: '[pending owner]',
        trigger: '[TODO]',
        removalCondition: '[not recorded]',
        validation: '[unknown]'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback decision requires non-empty owner');
    expect(stdout).toContain('expire fallback decision requires non-empty trigger');
    expect(stdout).toContain('expire fallback decision requires non-empty removal condition');
    expect(stdout).toContain('expire fallback decision requires non-empty validation');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects unparseable expire fallback maximum lifetime values', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        maximumLifetime: '30 days'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback decision requires parseable maximum lifetime');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects expire fallback dates beyond the high-churn surface cap', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        reviewDate: reviewDateDaysFromNow(15),
        maximumLifetime: reviewDateDaysFromNow(31)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback review date');
    expect(stdout).toContain('high-churn control surface fallback cap');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('applies the high-churn cap to colon-delimited docs freshness surface names', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`docs:freshness:maintain`',
        fallback: 'Owned rolling debt fallback retained for docs:freshness maintenance.',
        trigger: 'docs:freshness:maintain owner verification keeps a temporary fallback active.',
        reviewDate: reviewDateDaysFromNow(15),
        maximumLifetime: reviewDateDaysFromNow(31)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback review date');
    expect(stdout).toContain('high-churn control surface fallback cap');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not apply high-churn caps from validation-only wording', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`unclassified adapter`',
        fallback: 'General repo fallback retained during adapter cleanup.',
        trigger: 'Adapter cleanup keeps a general fallback until the removal fixture lands.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(59),
        validation: 'Run docs:freshness and runtime routing checks after adapter cleanup.'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('keeps high-churn caps stricter than external migration caps when both match', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`runtime routing`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'Runtime routing release compatibility bridge has a deprecation plan and reviewer approval granted.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(89)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback review date');
    expect(stdout).toContain('high-churn control surface fallback cap');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('applies the safety cap to customer-impacting fallbacks', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Customer-impacting fallback retained during a staged rollout.',
        trigger: 'Customer-impacting rollout protection still routes through a temporary fallback.',
        reviewDate: reviewDateDaysFromNow(8),
        maximumLifetime: reviewDateDaysFromNow(15)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('security/auth/PII/customer-impact fallback cap');
    expect(stdout).toContain('expire fallback review date');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('applies the safety cap to snake_case safety-impacting fallbacks', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'customer_impacting fallback retained during a staged production_impact rollout.',
        trigger: 'customer_impacting rollout protection still routes through a temporary fallback.',
        reviewDate: reviewDateDaysFromNow(8),
        maximumLifetime: reviewDateDaysFromNow(15)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('security/auth/PII/customer-impact fallback cap');
    expect(stdout).toContain('expire fallback review date');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('preserves snake_case safety terms before safety-cap matching', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'auth_boundary fallback retained for pii_data and financial_impact handling.',
        trigger: 'auth_boundary protection still routes through a temporary fallback.',
        reviewDate: reviewDateDaysFromNow(8),
        maximumLifetime: reviewDateDaysFromNow(15)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('security/auth/PII/customer-impact fallback cap');
    expect(stdout).toContain('expire fallback review date');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap without reviewer approval evidence', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        trigger: 'Release compatibility bridge mentions a deprecation plan but has no reviewer approval.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap when approval evidence is negated', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'Release compatibility bridge has a deprecation plan but no reviewer approval granted.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap when reviewer-approved evidence is negated', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'Release compatibility bridge has a deprecation plan but no reviewer-approved evidence.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap when approved-by-reviewer evidence is negated', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'External ecosystem migration bridge has a deprecation plan but not approved by reviewer.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap for false reviewer-approval labels', async () => {
    for (const trigger of [
      'External ecosystem migration bridge has a deprecation plan and reviewer approved:',
      'External ecosystem migration bridge has a deprecation plan and approved-by-reviewer:',
      'External ecosystem migration bridge has a deprecation plan and reviewer approval granted: no.',
      'External ecosystem migration bridge has a deprecation plan and reviewer approval recorded=false.',
      'External ecosystem migration bridge has a deprecation plan and reviewer approved: no.',
      'External ecosystem migration bridge has a deprecation plan and approved-by-reviewer: false.',
      'External ecosystem migration bridge has a deprecation plan and reviewer approved: not available.',
      'External ecosystem migration bridge has a deprecation plan and approved-by-reviewer: not applicable.',
      'External ecosystem migration bridge has a deprecation plan and reviewer approved: TBD.',
      'External ecosystem migration bridge has a deprecation plan and approved-by-reviewer: todo.',
      'External ecosystem migration bridge has a deprecation plan and reviewer approval granted: later.',
      'External ecosystem migration bridge has a deprecation plan and reviewer approved: [pending approval].'
    ]) {
      const repo = await initRepository();
      const decisionBody = fallbackDecisionTable([
        completeExpireFallbackRow({
          surface: '`repo guards`',
          fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
          owner: 'CO-410',
          trigger,
          reviewDate: reviewDateDaysFromNow(30),
          maximumLifetime: reviewDateDaysFromNow(90)
        })
      ]);

      await commitFallbackGuardChange(repo, { decisionBody });

      const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
        cwd: repo,
        env: specGuardEnv()
      });

      expect(stdout).toContain('❌ Spec guard: issues detected');
      expect(stdout).toContain('expire fallback maximum lifetime');
      expect(stdout).toContain('general repo fallback cap');
      expect(stdout).toContain('Dry run: exiting successfully despite failures.');
    }
  });

  it('does not grant the external migration cap when the owner issue is outside the owner cell', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'Migration team',
        trigger: 'External ecosystem migration bridge has a deprecation plan and reviewer approval granted for CO-410.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap for non-external deprecation-plan evidence', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'General repo fallback retained during a cleanup migration.',
        owner: 'CO-410',
        trigger: 'Deprecation plan and reviewer approval granted for local cleanup.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap for negated external signals', async () => {
    for (const trigger of [
      'Local cleanup is not an external migration; it has a deprecation plan and reviewer approval granted.',
      'Local cleanup is not a release compatibility bridge; it has a deprecation plan and reviewer approval granted.'
    ]) {
      const repo = await initRepository();
      const decisionBody = fallbackDecisionTable([
        completeExpireFallbackRow({
          surface: '`repo guards`',
          fallback: 'General repo fallback retained during local cleanup.',
          owner: 'CO-410',
          trigger,
          reviewDate: reviewDateDaysFromNow(30),
          maximumLifetime: reviewDateDaysFromNow(90)
        })
      ]);

      await commitFallbackGuardChange(repo, { decisionBody });

      const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
        cwd: repo,
        env: specGuardEnv()
      });

      expect(stdout).toContain('❌ Spec guard: issues detected');
      expect(stdout).toContain('expire fallback maximum lifetime');
      expect(stdout).toContain('general repo fallback cap');
      expect(stdout).toContain('Dry run: exiting successfully despite failures.');
    }
  });

  it('does not grant the external migration cap when deprecation-plan evidence is negated', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'External ecosystem migration bridge runs without a deprecation plan but reviewer approval granted.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap for labeled absent deprecation plans', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'External ecosystem migration bridge lists Deprecation plan: absent, but reviewer approval granted.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap for labeled unapproved deprecation plans', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'External ecosystem migration bridge lists Deprecation plan: not approved while reviewer approval granted.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap for deprecation plans labeled not recorded', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'External ecosystem migration bridge lists Deprecation plan: not recorded while reviewer approval granted.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('does not grant the external migration cap for unavailable deprecation-plan labels', async () => {
    for (const trigger of [
      'External ecosystem migration bridge lists Deprecation plan: not available while reviewer approval granted.',
      'External ecosystem migration bridge lists Deprecation plan: not yet ready while reviewer approval granted.'
    ]) {
      const repo = await initRepository();
      const decisionBody = fallbackDecisionTable([
        completeExpireFallbackRow({
          surface: '`repo guards`',
          fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
          owner: 'CO-410',
          trigger,
          reviewDate: reviewDateDaysFromNow(30),
          maximumLifetime: reviewDateDaysFromNow(90)
        })
      ]);

      await commitFallbackGuardChange(repo, { decisionBody });

      const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
        cwd: repo,
        env: specGuardEnv()
      });

      expect(stdout).toContain('❌ Spec guard: issues detected');
      expect(stdout).toContain('expire fallback maximum lifetime');
      expect(stdout).toContain('general repo fallback cap');
      expect(stdout).toContain('Dry run: exiting successfully despite failures.');
    }
  });

  it('does not grant the external migration cap for empty deprecation-plan labels', async () => {
    for (const trigger of [
      'External ecosystem migration bridge lists Deprecation plan:',
      'External ecosystem migration bridge lists Deprecation plan: false while reviewer approval granted.',
      'External ecosystem migration bridge lists Deprecation plan: none while reviewer approval granted.',
      'External ecosystem migration bridge lists Deprecation plan: not applicable while reviewer approval granted.',
      'External ecosystem migration bridge lists Deprecation plan: not planned while reviewer approval granted.',
      'External ecosystem migration bridge lists Deprecation plan: unplanned while reviewer approval granted.',
      'External ecosystem migration bridge lists Deprecation plan: [TBD] while reviewer approval granted.',
      'External ecosystem migration bridge lists Deprecation plan: [not recorded] while reviewer approval granted.'
    ]) {
      const repo = await initRepository();
      const decisionBody = fallbackDecisionTable([
        completeExpireFallbackRow({
          surface: '`repo guards`',
          fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
          owner: 'CO-410',
          trigger,
          reviewDate: reviewDateDaysFromNow(30),
          maximumLifetime: reviewDateDaysFromNow(90)
        })
      ]);

      await commitFallbackGuardChange(repo, { decisionBody });

      const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
        cwd: repo,
        env: specGuardEnv()
      });

      expect(stdout).toContain('❌ Spec guard: issues detected');
      expect(stdout).toContain('expire fallback maximum lifetime');
      expect(stdout).toContain('general repo fallback cap');
      expect(stdout).toContain('Dry run: exiting successfully despite failures.');
    }
  });

  it('does not grant the external migration cap for weak deprecation-plan placeholders', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'External ecosystem migration bridge lists Deprecation plan: TBD while reviewer approval granted.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(90)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('general repo fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('allows the external migration cap with owner issue, deprecation plan, and reviewer approval', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'External ecosystem migration bridge has a deprecation plan and reviewer approval granted.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(89)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('allows the external migration cap with reviewer-approved wording', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`repo guards`',
        fallback: 'Release compatibility fallback retained for an external ecosystem migration.',
        owner: 'CO-410',
        trigger: 'External ecosystem migration bridge has a deprecation plan and reviewer-approved evidence.',
        reviewDate: reviewDateDaysFromNow(30),
        maximumLifetime: reviewDateDaysFromNow(89)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('parses escaped pipes in fallback decision table cells', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        trigger: 'Runtime routing bridge keeps executionMode=mcp\\|cloud while provider migration completes.',
        removalCondition: 'Remove when the executionMode=mcp\\|cloud compatibility fixture is retired.'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('caps expire fallback maximum lifetime from the introduced date', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        introducedDate: reviewDateDaysAgo(45),
        reviewDate: reviewDateDaysFromNow(1),
        maximumLifetime: reviewDateDaysFromNow(1)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback maximum lifetime');
    expect(stdout).toContain('high-churn control surface fallback cap');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects expire fallback review dates after the maximum lifetime', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        surface: '`unclassified adapter`',
        fallback: 'General repo fallback retained during adapter cleanup.',
        trigger: 'Adapter cleanup keeps a general fallback until the removal fixture lands.',
        reviewDate: reviewDateDaysFromNow(10),
        maximumLifetime: reviewDateDaysFromNow(5)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback review date');
    expect(stdout).toContain('cannot be after maximum lifetime');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects future expire fallback introduced dates before lifetime cap checks', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        introducedDate: reviewDateDaysFromNow(10),
        reviewDate: reviewDateDaysFromNow(1),
        maximumLifetime: reviewDateDaysFromNow(40)
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('expire fallback introduced date');
    expect(stdout).toContain('cannot be in the future');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('passes durable fallback retention with complete rationale metadata', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([durableRetentionRow()]),
      '',
      '- Contract name: fallback-expiry owner routing and durable guard compatibility.',
      '- Owning surface: repo guards.',
      '- Steady-state proof: guard rejects missing and stale decisions while accepting complete durable metadata.',
      '- Tests/docs: focused durable-retention spec-guard regression test.',
      '- Non-expiring rationale: owner routing is a supported guard contract, not temporary fallback debt.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('does not reuse one durable rationale block across multiple durable rows', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([
        durableRetentionRow({
          fallback: 'First durable compatibility fallback retained for repo guards.'
        }),
        durableRetentionRow({
          fallback: 'Second durable compatibility fallback retained for review wrapper compatibility.'
        })
      ]),
      '',
      '- Contract name: fallback-expiry owner routing and durable guard compatibility.',
      '- Owning surface: repo guards.',
      '- Steady-state proof: guard rejects missing and stale decisions while accepting complete durable metadata.',
      '- Tests/docs: focused durable-retention spec-guard regression test.',
      '- Non-expiring rationale: owner routing is a supported guard contract, not temporary fallback debt.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('justify retaining fallback evidence requires contract name');
    expect(stdout).toContain('justify retaining fallback evidence requires tests/docs');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('rejects label-only durable fallback rationale evidence', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([
        durableRetentionRow({
          trigger: '-',
          maximumLifetime: '-',
          validation: '-'
        })
      ]),
      '',
      '- Contract name:',
      '- Owning surface:',
      '- Steady-state proof:',
      '- Tests/docs:',
      '- Non-expiring rationale:'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('justify retaining fallback evidence requires contract name');
    expect(stdout).toContain('justify retaining fallback evidence requires tests/docs');
    expect(stdout).toContain('justify retaining fallback evidence requires non-expiring rationale');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('allows scoped fallback decisions with a single canonical owner reference', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        fallback: 'Provider workflow fallback retained for one scoped owner lane',
        owner: 'CO-394',
        trigger: 'Provider workflow cleanup remains owned by CO-394 without routing all cleanup lanes.'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('allows single-owner surface-specific cleanup rows without aggregate owner routing', async () => {
    const repo = await initRepository();
    const decisionBody = fallbackDecisionTable([
      completeExpireFallbackRow({
        fallback: 'CO-394 provider workflow surface-specific cleanup fallback',
        owner: 'CO-394',
        trigger: 'Provider workflow surface-specific cleanup remains scoped to CO-394 only.'
      })
    ]);

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('allows scoped durable fallback decisions that mention owner routing for one owner', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([
        durableRetentionRow({
          fallback: 'Provider workflow owner routing retained only for one scoped cleanup lane',
          owner: 'CO-394',
          trigger: 'Provider workflow cleanup remains scoped to CO-394 without aggregate cleanup routing.'
        })
      ]),
      '',
      '- Contract name: provider workflow scoped durable compatibility.',
      '- Owning surface: provider workflow repo guard evidence.',
      '- Steady-state proof: guard accepts the scoped durable row through rationale checks, not aggregate owner routing.',
      '- Tests/docs: focused durable single-owner owner-routing regression test.',
      '- Non-expiring rationale: this scoped compatibility label is not governed as an expiring fallback.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('rejects incomplete aggregate owner-routing rows even with durable rationale', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([
        durableRetentionRow({
          fallback: 'CO-394, CO-395, CO-396, and CO-397 owner references for surface-specific cleanup routing',
          trigger: 'Guard needs to recognize aggregate owner lanes without absorbing implementation scope.'
        })
      ]),
      '',
      '- Contract name: fallback-expiry owner routing and durable guard compatibility.',
      '- Owning surface: repo guards.',
      '- Steady-state proof: guard rejects incomplete aggregate owner routing rows.',
      '- Tests/docs: focused incomplete owner-routing regression test.',
      '- Non-expiring rationale: owner routing is a supported guard contract, not temporary fallback debt.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain('fallback owner routing evidence must preserve CO-398');
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('accepts CO-394 through CO-398 owner references as owner-routing evidence', async () => {
    const repo = await initRepository();
    const decisionBody = [
      fallbackDecisionTable([
        durableRetentionRow({
          fallback: 'CO-394, CO-395, CO-396, CO-397, and CO-398 owner references for surface-specific cleanup routing',
          trigger: 'Guard needs to recognize owner lanes without absorbing their implementation scope.',
          validation: 'Focused owner-reference spec-guard regression test.'
        })
      ]),
      '',
      '- Owner references: CO-394, CO-395, CO-396, CO-397, CO-398.',
      '- Non-goal: do not absorb provider workflow, review-wrapper, runtime routing, docs freshness, or control-host cleanup scope.'
    ].join('\n');

    await commitFallbackGuardChange(repo, { decisionBody });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: specGuardEnv()
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });
});
