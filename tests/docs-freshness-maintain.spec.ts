import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  buildDocsFreshnessMaintenanceDecision,
  collectChangedPaths,
  runDocsFreshnessMaintain
} from '../scripts/docs-freshness-maintain.mjs';

const createdDirs: string[] = [];
const execFileAsync = promisify(execFile);

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

function reviewDateDaysAgo(daysOld: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysOld);
  return date.toISOString().slice(0, 10);
}

function rollingFreshnessPolicy(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    owner_issue: 'CO-175',
    policy_doc: 'docs/guides/docs-freshness-cohorts.md',
    window_days: 7,
    max_cohorts: 2,
    max_entries: 300,
    eligible_doc_classes: ['task_packet', 'task_mirror', 'report_only'],
    baseline_cohorts: [
      {
        id: 'co-175-apr-14-march-14-tasks-1164-1195',
        last_review: reviewDateDaysAgo(31),
        cadence_days: 30,
        path_families: ['tasks/tasks-*'],
        task_number_range: { start: '1164', end: '1164' }
      }
    ],
    action_after_window: 'refresh_archive_or_reclassify_before_provider_handoff',
    ...overrides
  };
}

async function writeFixture(
  repoRoot: string,
  {
    entries,
    policy = rollingFreshnessPolicy(),
    catalogEntries = [],
    catalogPatterns = [
      { glob: 'tasks/tasks-*.md', doc_class: 'task_packet' },
      { glob: 'docs/PRD-*.md', doc_class: 'task_packet' },
      { glob: '.agent/task/*.md', doc_class: 'task_mirror' },
      { glob: 'docs/findings/*.md', doc_class: 'report_only' },
      { glob: 'docs/*.md', doc_class: 'repo_guide' }
    ]
  }: {
    entries: Array<{ path: string; daysOld?: number; lastReview?: string; cadenceDays?: number }>;
    policy?: Record<string, unknown>;
    catalogEntries?: Array<Record<string, unknown>>;
    catalogPatterns?: Array<Record<string, unknown>>;
  }
) {
  for (const entry of entries) {
    const parent = entry.path.split('/').slice(0, -1).join('/');
    if (parent) {
      await mkdir(join(repoRoot, parent), { recursive: true });
    }
    await writeFile(join(repoRoot, entry.path), '# Fixture doc\n', 'utf8');
  }

  await mkdir(join(repoRoot, 'docs'), { recursive: true });
  await writeFile(
    join(repoRoot, 'docs/docs-catalog.json'),
    JSON.stringify(
      {
        version: 1,
        classes: {
          task_packet: { label: 'Task Packet', report_order: 200 },
          task_mirror: { label: 'Task Mirror', report_order: 210 },
          report_only: { label: 'Report Only', report_order: 220 },
          repo_guide: { label: 'Repository Guide', report_order: 20 },
          uncatalogued: { label: 'Uncatalogued', report_order: 999 }
        },
        policies: {
          rolling_freshness_cohorts: policy
        },
        entries: catalogEntries,
        patterns: catalogPatterns
      },
      null,
      2
    ),
    'utf8'
  );
  await writeFile(
    join(repoRoot, 'docs/docs-freshness-registry.json'),
    JSON.stringify(
      {
        version: 1,
        entries: entries.map((entry) => ({
          path: entry.path,
          owner: 'Codex',
          status: 'active',
          last_review: entry.lastReview ?? reviewDateDaysAgo(entry.daysOld ?? 0),
          cadence_days: entry.cadenceDays ?? 30
        }))
      },
      null,
      2
    ),
    'utf8'
  );
}

async function runMaintain(
  repoRoot: string,
  {
    changedPaths = [],
    taskId = 'fixture'
  }: {
    changedPaths?: string[];
    taskId?: string;
  } = {}
) {
  return runDocsFreshnessMaintain(repoRoot, {
    outRoot: join(repoRoot, 'out'),
    taskId,
    changedPaths,
    skipSpecGuard: true
  });
}

async function git(repoRoot: string, args: string[]) {
  await execFileAsync('git', ['-C', repoRoot, ...args], {
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Codex Test',
      GIT_AUTHOR_EMAIL: 'codex-test@example.com',
      GIT_COMMITTER_NAME: 'Codex Test',
      GIT_COMMITTER_EMAIL: 'codex-test@example.com'
    }
  });
}

async function createGitRepo(prefix: string) {
  const repoRoot = await mkdtemp(join(tmpdir(), prefix));
  createdDirs.push(repoRoot);
  await git(repoRoot, ['init']);
  await git(repoRoot, ['config', 'user.name', 'Codex Test']);
  await git(repoRoot, ['config', 'user.email', 'codex-test@example.com']);
  return repoRoot;
}

describe('docs freshness maintenance decisions', () => {
  it('passes owned in-window historical debt when the current diff is clean', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-owned-'));
    createdDirs.push(repoRoot);
    const historicalPath = 'tasks/tasks-1164-historical.md';
    await writeFixture(repoRoot, {
      entries: [{ path: historicalPath, daysOld: 31 }]
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(false);
    expect(decision.freshness_decision).toBe('pass_with_owned_rolling_debt');
    expect(decision.owner_issue).toBe('CO-175');
    expect(decision.blocking_changed_paths).toEqual([]);
    expect(decision.policy_capacity_status).toEqual(expect.objectContaining({ status: 'within_policy' }));
    expect(decision.candidate_cohorts).toEqual([
      expect.objectContaining({
        canonical_owner_key: 'baseline_cohort_id:co-175-apr-14-march-14-tasks-1164-1195',
        canonical_owner_marker:
          'codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-175-apr-14-march-14-tasks-1164-1195',
        stale_entries: 1,
        sample_paths: [historicalPath]
      })
    ]);
  });

  it('blocks owned rolling debt when the diff base is unavailable', () => {
    const policy = rollingFreshnessPolicy();
    const baseline = policy.baseline_cohorts[0];
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: policy,
        stale_entries: [],
        rolling_cohort_entries: [
          {
            path: 'tasks/tasks-1164-historical.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1164',
            last_review: baseline.last_review,
            cadence_days: baseline.cadence_days,
            age_days: 31,
            overdue_days: 1,
            baseline_cohort_id: baseline.id
          }
        ],
        totals: {
          docs_scanned: 1,
          registry_entries: 1,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 0,
          rolling_cohort_entries: 1,
          uncatalogued_docs: 0
        }
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        specGuard: { status: 'succeeded' },
        diffStatus: 'missing_base',
        diffBaseRef: null
      }
    );

    expect(decision.freshness_decision).toBe('block_diff_local');
    expect(decision.diff_status).toBe('missing_base');
    expect(decision.recommended_action).toContain('--base');
  });

  it('fails closed when the configured owner issue is terminal', () => {
    const lastReview = reviewDateDaysAgo(31);
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          is_valid: true,
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-2001-historical.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '2001',
            last_review: lastReview,
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          }
        ],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 1,
          registry_entries: 1,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 1,
          rolling_cohort_entries: 0,
          uncatalogued_docs: 0
        }
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        specGuard: { status: 'succeeded' },
        diffStatus: 'ok',
        diffBaseRef: 'origin/main'
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.owner_issue).toBe('CO-175');
    expect(decision.owner_issue_action).toEqual(
      expect.objectContaining({
        mode: 'create_required',
        existing_issue: 'CO-175',
        reason: 'configured_owner_terminal',
        issue_state: 'Done',
        issue_state_type: 'completed'
      })
    );
    expect(decision.owner_issue_verification).toEqual(
      expect.objectContaining({
        issue: 'CO-175',
        state: 'Done',
        state_type: 'completed',
        is_terminal: true,
        usable: false,
        verification_status: 'policy_metadata',
        source: 'rolling_freshness_policy'
      })
    );
    expect(decision.policy_capacity_status).toEqual(expect.objectContaining({ status: 'invalid_policy' }));
    expect(decision.recommended_action).toContain('configured owner CO-175 is terminal');
    expect(decision.recommended_action).toContain('do not reuse it as the live owner path');
    expect(decision.recommended_action).not.toContain('update_existing');
  });

  it('fails closed when helper verification is unavailable but policy metadata marks the owner terminal', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-terminal-unavailable-'));
    createdDirs.push(repoRoot);
    await writeFixture(repoRoot, {
      entries: [{ path: 'tasks/tasks-1164-historical.md', daysOld: 31 }],
      policy: rollingFreshnessPolicy({
        owner_issue_state: 'Done',
        owner_issue_state_type: 'completed',
        owner_issue_is_terminal: true
      })
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.owner_issue_action).toEqual(
      expect.objectContaining({
        mode: 'create_required',
        existing_issue: 'CO-175',
        reason: 'configured_owner_terminal',
        issue_state: 'Done',
        issue_state_type: 'completed'
      })
    );
    expect(decision.owner_issue_verification).toEqual(
      expect.objectContaining({
        issue: 'CO-175',
        state: 'Done',
        state_type: 'completed',
        is_terminal: true,
        usable: false,
        verification_status: 'unavailable',
        source: 'rolling_freshness_policy',
        error: 'helper_missing'
      })
    );
  });

  it('treats Duplicate owner state as terminal when state_type is absent', () => {
    const lastReview = reviewDateDaysAgo(31);
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          is_valid: true,
          owner_issue_state: 'Duplicate',
          owner_issue_state_type: null,
          owner_issue_is_terminal: null
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-2001-historical.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '2001',
            last_review: lastReview,
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          }
        ],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 1,
          registry_entries: 1,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 1,
          rolling_cohort_entries: 0,
          uncatalogued_docs: 0
        }
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        specGuard: { status: 'succeeded' },
        diffStatus: 'ok',
        diffBaseRef: 'origin/main'
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.owner_issue_action).toEqual(
      expect.objectContaining({
        mode: 'create_required',
        existing_issue: 'CO-175',
        reason: 'configured_owner_terminal',
        issue_state: 'Duplicate'
      })
    );
  });

  it('fails closed when owner issue verification cannot confirm the configured owner', () => {
    const lastReview = reviewDateDaysAgo(31);
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          is_valid: true,
          owner_issue: 'CO-300'
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-2001-historical.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '2001',
            last_review: lastReview,
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          }
        ],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 1,
          registry_entries: 1,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 1,
          rolling_cohort_entries: 0,
          uncatalogued_docs: 0
        }
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        specGuard: { status: 'succeeded' },
        diffStatus: 'ok',
        diffBaseRef: 'origin/main',
        ownerIssueVerification: {
          issue: 'CO-300',
          issue_id: null,
          state: null,
          state_type: null,
          is_terminal: null,
          usable: null,
          verification_status: 'failed',
          checked_at: null,
          source: 'linear issue-context',
          error: 'timeout'
        }
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.owner_issue_action).toEqual(
      expect.objectContaining({
        mode: 'create_required',
        existing_issue: 'CO-300',
        reason: 'owner_verification_failed',
        verification_status: 'failed',
        verification_error: 'timeout'
      })
    );
    expect(decision.policy_capacity_status).toEqual(expect.objectContaining({ status: 'invalid_policy' }));
    expect(decision.recommended_action).toContain('could not be verified');
    expect(decision.recommended_action).not.toContain('update_existing');
  });

  it('skips owner verification on fully clean runs', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-clean-'));
    createdDirs.push(repoRoot);
    await writeFixture(repoRoot, {
      entries: [{ path: 'docs/current.md', daysOld: 0 }]
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(false);
    expect(decision.freshness_decision).toBe('clean');
    expect(decision.owner_issue_verification).toBeNull();
  });

  it('keeps undeclared historical candidates blocking until owner action declares or refreshes them', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-undeclared-'));
    createdDirs.push(repoRoot);
    const undeclaredPath = 'tasks/tasks-2001-historical.md';
    const lastReview = reviewDateDaysAgo(31);
    await writeFixture(repoRoot, {
      entries: [{ path: undeclaredPath, lastReview }]
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.totals.blocking_candidate_entries).toBe(1);
    expect(decision.totals.owned_rolling_entries).toBe(0);
    expect(decision.candidate_cohorts).toEqual([
      expect.objectContaining({
        canonical_owner_key:
          `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:${lastReview}|cadence_days:30`,
        canonical_owner_marker:
          `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:${lastReview}|cadence_days:30`,
        declared_baseline_ids: [],
        sample_paths: [undeclaredPath]
      })
    ]);
  });

  it('bounds oversized machine-derived canonical owner keys before follow-up creation consumes them', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-long-key-'));
    createdDirs.push(repoRoot);
    const oversizedBaselineCohortId = `co-oversized-${'x'.repeat(700)}`;
    const historicalPath = 'tasks/tasks-2001-historical.md';
    await writeFixture(repoRoot, {
      entries: [{ path: historicalPath, daysOld: 31 }],
      policy: rollingFreshnessPolicy({
        baseline_cohorts: [
          {
            id: oversizedBaselineCohortId,
            last_review: reviewDateDaysAgo(31),
            cadence_days: 30,
            path_families: ['tasks/tasks-*'],
            task_number_range: { start: '2001', end: '2001' }
          }
        ]
      })
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(false);
    expect(decision.candidate_cohorts).toHaveLength(1);
    const cohort = decision.candidate_cohorts[0];
    expect(cohort.id).toBe(oversizedBaselineCohortId);
    expect(cohort.canonical_owner_key).toMatch(/^baseline_cohort_id_sha256:[a-f0-9]{64}$/u);
    expect(cohort.canonical_owner_key.length).toBeLessThanOrEqual(512);
    expect(cohort.canonical_owner_marker).toBe(
      `codex-orchestrator:canonical-owner-key=${cohort.canonical_owner_key}`
    );
  });

  it('blocks owned historical debt when the current diff touches the stale task packet', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-diff-local-'));
    createdDirs.push(repoRoot);
    const taskPacketPath = 'tasks/tasks-2001-current.md';
    await writeFixture(repoRoot, {
      entries: [{ path: taskPacketPath, daysOld: 31 }]
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot, {
      changedPaths: [taskPacketPath],
      taskId: 'linear-current-task'
    });

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_diff_local');
    expect(decision.blocking_changed_paths).toEqual([taskPacketPath]);
    expect(decision.recommended_action).toContain('current diff');
  });

  it('blocks declared historical debt after the rolling window expires', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-expired-'));
    createdDirs.push(repoRoot);
    await writeFixture(repoRoot, {
      entries: [{ path: 'tasks/tasks-1164-expired.md', daysOld: 39 }]
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_policy_expired');
    expect(decision.policy_capacity_status).toEqual(expect.objectContaining({ status: 'expired' }));
  });

  it('routes the Apr 15 CO-184 over-cap shape to owner action instead of broadening policy', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-over-budget-'));
    createdDirs.push(repoRoot);
    const entries = [
      ...Array.from({ length: 221 }, (_, index) => ({
        path: `tasks/tasks-1164-co175-${String(index).padStart(3, '0')}.md`,
        daysOld: 31
      })),
      ...Array.from({ length: 173 }, (_, index) => ({
        path: `docs/PRD-co184-${String(index).padStart(3, '0')}.md`,
        daysOld: 31
      }))
    ];
    await writeFixture(repoRoot, {
      entries,
      policy: rollingFreshnessPolicy({
        max_entries: 300,
        max_cohorts: 2
      })
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_policy_over_budget');
    expect(decision.totals.rolling_cohort_entries).toBe(221);
    expect(decision.totals.stale_entries).toBe(173);
    expect(decision.totals.candidate_entries).toBe(394);
    expect(decision.policy_capacity_status).toEqual(
      expect.objectContaining({
        status: 'over_budget',
        current_entries: 394,
        max_entries: 300,
        over_entry_budget: true
      })
    );
    expect(decision.recommended_action).toContain('do not expand rolling caps');
  });

  it('counts distinct declared baseline cohorts even when their review dates match', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-over-cohort-budget-'));
    createdDirs.push(repoRoot);
    const lastReview = reviewDateDaysAgo(31);
    await writeFixture(repoRoot, {
      entries: [
        { path: 'tasks/tasks-1164-first.md', lastReview },
        { path: 'tasks/tasks-1165-second.md', lastReview }
      ],
      policy: rollingFreshnessPolicy({
        max_entries: 10,
        max_cohorts: 1,
        baseline_cohorts: [
          {
            id: 'fixture-baseline-1164',
            last_review: lastReview,
            cadence_days: 30,
            path_families: ['tasks/tasks-*'],
            task_number_range: { start: '1164', end: '1164' }
          },
          {
            id: 'fixture-baseline-1165',
            last_review: lastReview,
            cadence_days: 30,
            path_families: ['tasks/tasks-*'],
            task_number_range: { start: '1165', end: '1165' }
          }
        ]
      })
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_policy_over_budget');
    expect(decision.policy_capacity_status).toEqual(
      expect.objectContaining({
        status: 'over_budget',
        current_cohorts: 2,
        max_cohorts: 1,
        over_cohort_budget: true
      })
    );
    expect(decision.candidate_cohorts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ declared_baseline_ids: ['fixture-baseline-1164'] }),
        expect.objectContaining({ declared_baseline_ids: ['fixture-baseline-1165'] })
      ])
    );
  });

  it('keeps uncatalogued docs as missing-or-invalid registry blockers', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-uncatalogued-'));
    createdDirs.push(repoRoot);
    await writeFixture(repoRoot, {
      entries: [{ path: 'README.md', daysOld: 0 }],
      catalogPatterns: []
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_missing_or_invalid_registry');
    expect(decision.totals.uncatalogued_docs).toBe(1);
  });

  it('wires docs-review and implementation-gate freshness to the maintenance decision command', async () => {
    const config = JSON.parse(await readFile(join(process.cwd(), 'codex.orchestrator.json'), 'utf8'));
    const docsReviewChecks = config.stageSets['docs-review-checks'] as Array<Record<string, unknown>>;
    const pipelines = config.pipelines as Array<{ id: string; stages: Array<Record<string, unknown>> }>;
    const freshnessStage = docsReviewChecks.find((stage) => stage.id === 'docs-freshness-maintain');

    expect(freshnessStage).toEqual(
      expect.objectContaining({
        command: expect.stringContaining('npm run docs:freshness:maintain'),
        title: expect.stringContaining('--format json')
      })
    );
    expect(pipelines.find((pipeline) => pipeline.id === 'docs-review')?.stages).toEqual(
      expect.arrayContaining([expect.objectContaining({ ref: 'docs-review-checks' })])
    );
    expect(pipelines.find((pipeline) => pipeline.id === 'implementation-gate')?.stages).toEqual(
      expect.arrayContaining([expect.objectContaining({ ref: 'docs-review-checks' })])
    );
  });

  it('does not use HEAD~1 as a proven diff base', async () => {
    const repoRoot = await createGitRepo('docs-freshness-maintain-head-fallback-');
    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'docs/first.md'), '# First\n', 'utf8');
    await git(repoRoot, ['add', '.']);
    await git(repoRoot, ['commit', '-m', 'first']);
    await writeFile(join(repoRoot, 'docs/second.md'), '# Second\n', 'utf8');
    await git(repoRoot, ['add', '.']);
    await git(repoRoot, ['commit', '-m', 'second']);
    await writeFile(join(repoRoot, 'docs/untracked.md'), '# Untracked\n', 'utf8');

    const diff = await collectChangedPaths(repoRoot);

    expect(diff.base_ref).toBeNull();
    expect(diff.status).toBe('missing_base');
    expect(diff.paths).toContain('docs/untracked.md');
  });

  it('keeps status fail-closed when the selected base diff fails', async () => {
    const repoRoot = await createGitRepo('docs-freshness-maintain-base-diff-failed-');
    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'docs/base.md'), '# Base\n', 'utf8');
    await git(repoRoot, ['add', '.']);
    await git(repoRoot, ['commit', '-m', 'base']);
    await git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    await git(repoRoot, ['checkout', '--orphan', 'feature']);
    await git(repoRoot, ['rm', '-rf', '.']);
    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'docs/feature.md'), '# Feature\n', 'utf8');
    await git(repoRoot, ['add', '.']);
    await git(repoRoot, ['commit', '-m', 'feature']);
    await writeFile(join(repoRoot, 'docs/untracked.md'), '# Untracked\n', 'utf8');

    const diff = await collectChangedPaths(repoRoot);

    expect(diff.base_ref).toBe('origin/main');
    expect(diff.status).toBe('base_diff_failed');
    expect(diff.paths).toContain('docs/untracked.md');
  });
});
