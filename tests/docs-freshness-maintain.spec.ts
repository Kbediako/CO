import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  buildDocsFreshnessOwnerActionEvidence,
  buildDocsFreshnessMaintenanceDecision,
  buildDocsFreshnessRepoGate,
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
    is_valid: true,
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

async function writeLinearIssueContextHelper(repoRoot: string, output: Record<string, unknown>) {
  await mkdir(join(repoRoot, 'bin'), { recursive: true });
  await writeFile(
    join(repoRoot, 'bin/codex-orchestrator.js'),
    `#!/usr/bin/env node
process.stdout.write(${JSON.stringify(JSON.stringify(output))});
`,
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
    skipSpecGuard: true,
    env: {} as NodeJS.ProcessEnv
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
  it('surfaces terminal lifecycle debt as an action-required repo gate outside provider WIP', () => {
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        totals: {
          docs_scanned: 1,
          registry_entries: 1,
          stale_entries: 0,
          rolling_cohort_entries: 0,
          terminal_lifecycle_entries: 1,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          uncatalogued_docs: 0
        },
        stale_entries: [],
        rolling_cohort_entries: [],
        terminal_lifecycle_entries: [
          {
            path: 'tasks/tasks-linear-terminal.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            last_review: '2026-04-01',
            cadence_days: 30,
            age_days: 42,
            overdue_days: 12,
            registry_status: 'active',
            lifecycle_state: 'terminal_pending_archive',
            task_id: '20260401-linear-terminal',
            task_key: 'linear-terminal',
            status: 'done',
            source_issue: {
              identifier: 'CO-999'
            }
          }
        ],
        rolling_freshness_policy: rollingFreshnessPolicy()
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        diffStatus: 'provided',
        specGuard: { status: 'succeeded' }
      }
    );

    expect(decision.freshness_decision).toBe('block_terminal_lifecycle');
    expect(decision.lifecycle_actions).toEqual([
      expect.objectContaining({
        type: 'terminal_task_packet_archive_or_reclassify',
        path: 'tasks/tasks-linear-terminal.md',
        lifecycle_state: 'terminal_pending_archive',
        task_key: 'linear-terminal'
      })
    ]);
    expect(decision.repo_gate).toMatchObject({
      id: 'docs_freshness_maintain',
      severity: 'action_required',
      action_required_count: 1,
      blocks_handoff: true,
      blocks_unrelated_lanes: false,
      provider_wip_impact: 'excluded_repo_gate'
    });
    expect(buildDocsFreshnessRepoGate(decision)).toMatchObject(decision.repo_gate);
  });

  it('keeps unrelated lanes blocked when terminal lifecycle debt coexists with repo-wide debt', () => {
    const lastReview = reviewDateDaysAgo(31);
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        totals: {
          docs_scanned: 2,
          registry_entries: 2,
          stale_entries: 1,
          rolling_cohort_entries: 0,
          terminal_lifecycle_entries: 1,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          uncatalogued_docs: 0
        },
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
        terminal_lifecycle_entries: [
          {
            path: 'tasks/tasks-linear-terminal.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            last_review: lastReview,
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1,
            registry_status: 'active',
            lifecycle_state: 'terminal_pending_archive',
            task_key: 'linear-terminal',
            status: 'done'
          }
        ],
        rolling_freshness_policy: rollingFreshnessPolicy({
          max_entries: 0,
          max_cohorts: 0
        })
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        diffStatus: 'provided',
        specGuard: { status: 'succeeded' }
      }
    );

    expect(decision.freshness_decision).toBe('block_terminal_lifecycle');
    expect(decision.policy_capacity_status.status).toBe('over_budget');
    expect(decision.repo_gate).toMatchObject({
      blocks_handoff: true,
      blocks_unrelated_lanes: true
    });
  });

  it('keeps unrelated lanes blocked when spec-guard failure coexists with repo-wide debt', () => {
    const lastReview = reviewDateDaysAgo(31);
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        totals: {
          docs_scanned: 2,
          registry_entries: 2,
          stale_entries: 1,
          rolling_cohort_entries: 0,
          terminal_lifecycle_entries: 0,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          uncatalogued_docs: 0
        },
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
        terminal_lifecycle_entries: [],
        rolling_freshness_policy: rollingFreshnessPolicy({
          max_entries: 0,
          max_cohorts: 0
        })
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        diffStatus: 'provided',
        specGuard: {
          status: 'failed',
          parsed_failures: [
            {
              path: 'tasks/specs/linear-co-428.md',
              path_family: 'tasks/specs',
              last_review: lastReview,
              cadence_days: 30,
              age_days: 31,
              overdue_days: 1
            }
          ]
        }
      }
    );

    expect(decision.freshness_decision).toBe('block_diff_local');
    expect(decision.policy_capacity_status.status).toBe('over_budget');
    expect(decision.repo_gate).toMatchObject({
      spec_guard: {
        status: 'failed',
        action_required_count: 1
      },
      blocks_handoff: true,
      blocks_unrelated_lanes: true
    });
  });

  it('surfaces strict public-doc pre-expiry actions without treating them as rolling deferral', () => {
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        totals: {
          docs_scanned: 1,
          registry_entries: 1,
          stale_entries: 0,
          rolling_cohort_entries: 0,
          terminal_lifecycle_entries: 0,
          pre_expiry_entries: 1,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          uncatalogued_docs: 0
        },
        stale_entries: [],
        rolling_cohort_entries: [],
        terminal_lifecycle_entries: [],
        pre_expiry_entries: [
          {
            path: 'docs/public/provider-onboarding.md',
            doc_class: 'public_guide',
            doc_class_label: 'Public Guide',
            path_family: 'docs/public',
            last_review: '2026-04-16',
            cadence_days: 30,
            age_days: 27,
            days_until_expiry: 3,
            next_review: '2026-05-16',
            direct_action_required: true,
            rolling_deferral_eligible: false
          }
        ],
        rolling_freshness_policy: rollingFreshnessPolicy()
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        diffStatus: 'provided',
        specGuard: { status: 'succeeded' }
      }
    );

    expect(decision.freshness_decision).toBe('clean');
    expect(decision.public_current_actions).toEqual([
      expect.objectContaining({
        type: 'strict_pre_expiry_review',
        path: 'docs/public/provider-onboarding.md',
        days_until_expiry: 3,
        rolling_deferral_eligible: false
      })
    ]);
    expect(decision.repo_gate).toMatchObject({
      severity: 'warning',
      action_required_count: 1,
      blocks_handoff: false,
      blocks_unrelated_lanes: false
    });
    expect(decision.recommended_action).toContain('Review or assign direct action for 1 public/current doc');
  });

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

  it('fails closed when required live owner verification is unavailable', () => {
    const policy = rollingFreshnessPolicy({
      canonical_owner_key: 'docs:freshness:maintain',
      require_live_owner_verification: true,
      owner_issue_project_id: 'project-1'
    });
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
        diffStatus: 'ok',
        diffBaseRef: 'origin/main',
        ownerIssueVerification: {
          issue: 'CO-175',
          issue_id: null,
          state: null,
          state_type: null,
          is_terminal: null,
          usable: null,
          workspace_id: null,
          team_id: null,
          project_id: null,
          project_name: null,
          expected_project_id: 'project-1',
          same_project: null,
          verification_status: 'unavailable',
          checked_at: null,
          source: 'linear issue-context',
          error: 'helper_missing'
        }
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.owner_issue_action).toEqual(
      expect.objectContaining({
        mode: 'create_required',
        existing_issue: 'CO-175',
        duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
        canonical_owner_key: 'docs:freshness:maintain',
        reason: 'owner_verification_unavailable'
      })
    );
    expect(decision.recommended_action).toContain('not proven as a live same-project owner');
  });

  it('fails closed when required owner verification finds a project mismatch', () => {
    const policy = rollingFreshnessPolicy({
      canonical_owner_key: 'docs:freshness:maintain',
      require_live_owner_verification: true,
      owner_issue_project_id: 'project-1'
    });
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
        diffStatus: 'ok',
        diffBaseRef: 'origin/main',
        ownerIssueVerification: {
          issue: 'CO-175',
          issue_id: 'owner-id',
          state: 'In Progress',
          state_type: 'started',
          is_terminal: false,
          usable: false,
          workspace_id: 'workspace-1',
          team_id: 'team-1',
          project_id: 'project-2',
          project_name: 'Other project',
          expected_project_id: 'project-1',
          same_project: false,
          verification_status: 'succeeded',
          checked_at: null,
          source: 'linear issue-context',
          error: null
        }
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.owner_issue_action).toEqual(
      expect.objectContaining({
        mode: 'create_required',
        existing_issue: 'CO-175',
        duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
        canonical_owner_key: 'docs:freshness:maintain',
        reason: 'configured_owner_project_mismatch',
        expected_project_id: 'project-1',
        actual_project_id: 'project-2'
      })
    );
    expect(decision.recommended_action).toContain('canonical docs:freshness:maintain owner');
    expect(decision.recommended_action).toContain('same-project live owner path');
  });

  it.each([
    ['null', { same_project: null }],
    ['omitted', {}]
  ])(
    'fails closed when required live owner verification has %s same_project',
    (_label, sameProjectFields) => {
      const policy = rollingFreshnessPolicy({
        canonical_owner_key: 'docs:freshness:maintain',
        require_live_owner_verification: true,
        owner_issue_project_id: 'project-1'
      });
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
          diffStatus: 'ok',
          diffBaseRef: 'origin/main',
          ownerIssueVerification: {
            issue: 'CO-175',
            issue_id: 'owner-id',
            state: 'In Progress',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            workspace_id: 'workspace-1',
            team_id: 'team-1',
            project_id: 'project-1',
            project_name: 'CO Control and Advisory',
            expected_project_id: 'project-1',
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null,
            ...sameProjectFields
          }
        }
      );

      expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
      expect(decision.owner_issue_action).toEqual(
        expect.objectContaining({
          mode: 'create_required',
          existing_issue: 'CO-175',
          duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
          canonical_owner_key: 'docs:freshness:maintain',
          reason: 'owner_verification_unavailable',
          verification_status: 'succeeded'
        })
      );
      expect(decision.recommended_action).toContain('not proven as a live same-project owner');
    }
  );

  it('emits fallback expiry metadata when live same-project owner verification passes', () => {
    const policy = rollingFreshnessPolicy({
      canonical_owner_key: 'docs:freshness:maintain',
      require_live_owner_verification: true,
      owner_issue_project_id: 'project-1'
    });
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
        diffStatus: 'ok',
        diffBaseRef: 'origin/main',
        generatedAt: '2026-04-27T00:00:00.000Z',
        ownerIssueVerification: {
          issue: 'CO-175',
          issue_id: 'owner-id',
          state: 'In Progress',
          state_type: 'started',
          is_terminal: false,
          usable: true,
          workspace_id: 'workspace-1',
          team_id: 'team-1',
          project_id: 'project-1',
          project_name: 'CO Control and Advisory',
          expected_project_id: 'project-1',
          same_project: true,
          verification_status: 'succeeded',
          checked_at: null,
          source: 'linear issue-context',
          error: null
        }
      }
    );

    expect(decision.freshness_decision).toBe('pass_with_owned_rolling_debt');
    expect(decision.fallback_expiry).toEqual(
      expect.objectContaining({
        decision: 'expire fallback',
        canonical_owner_key: 'docs:freshness:maintain',
        review_date: '2026-04-27',
        maximum_lifetime_days: 7
      })
    );
    expect(decision.candidate_cohorts[0].fallback_expiry).toEqual(
      expect.objectContaining({
        decision: 'expire fallback',
        owner_issue: 'CO-175',
        maximum_lifetime_days: 7,
        removal_condition: expect.stringContaining('re-home docs/docs-catalog.json intentionally')
      })
    );
  });

  it('reuses an exact canonical owner without repointing the global terminal owner', () => {
    const lastReview = '2026-03-23';
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true,
          canonical_owner_issues: [
            {
              canonical_owner_key: canonicalOwnerKey,
              owner_issue: 'CO-320'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1321',
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            issue_id: '2b99df6c-e17c-4fac-a146-ed4dedc989e5',
            state: 'Blocked',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('pass_with_owned_rolling_debt');
    expect(decision.owner_issue).toBe('CO-300');
    expect(decision.owner_issue_action).toEqual(
      expect.objectContaining({
        mode: 'create_required',
        existing_issue: 'CO-300',
        reason: 'configured_owner_terminal'
      })
    );
    expect(decision.candidate_cohorts).toHaveLength(1);
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        canonical_owner_key: canonicalOwnerKey,
        owner_issue: 'CO-320',
        configured_owner_issue: 'CO-300',
        owner_issue_action: expect.objectContaining({
          mode: 'update_existing',
          issue: 'CO-320',
          duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
          canonical_owner_key: canonicalOwnerKey
        }),
        owner_issue_resolution: expect.objectContaining({
          mode: 'canonical_owner_key_match',
          source: 'rolling_freshness_policy.canonical_owner_issues'
        })
      })
    );
    expect(decision.recommended_action).toContain('owner issue CO-320');
    expect(decision.repo_gate.owner).toMatchObject({
      issue: 'CO-320',
      action: 'update_existing',
      state: 'Blocked',
      state_type: 'started',
      verified: true
    });
    const ownerActionEvidence = buildDocsFreshnessOwnerActionEvidence(decision, {
      env: { LINEAR_API_KEY: 'token' } as NodeJS.ProcessEnv
    });
    expect(ownerActionEvidence).toEqual(
      expect.objectContaining({
        status: 'resolved',
        should_block: false,
        actions: [
          expect.objectContaining({
            route_id: 'co-429-completed-lane-registry-residue',
            mode: 'update_existing',
            owner_issue: 'CO-320',
            copyable_command: null
          })
        ]
      })
    );
  });

  it('routes stale active spec-guard cohorts through CO-428 owner action evidence', () => {
    const lastReview = reviewDateDaysAgo(31);
    const tasksSpecKey =
      `spec_guard_active_spec|path_family:tasks/specs|last_review:${lastReview}|cadence_days:30`;
    const designSpecKey =
      `spec_guard_active_spec|path_family:docs/design/specs|last_review:${lastReview}|cadence_days:30`;
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          canonical_owner_key: 'docs:freshness:maintain',
          owner_issue: 'CO-522',
          require_live_owner_verification: true,
          owner_issue_project_id: 'project-1'
        }),
        stale_entries: [],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 0,
          registry_entries: 0,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 0,
          rolling_cohort_entries: 0,
          uncatalogued_docs: 0
        }
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        specGuard: {
          status: 'failed',
          parsed_failures: [
            {
              path: 'tasks/specs/linear-co-428.md',
              path_family: 'tasks/specs',
              last_review: lastReview,
              cadence_days: 30,
              age_days: 31,
              overdue_days: 1
            },
            {
              path: 'docs/design/specs/CO-428-design.md',
              path_family: 'docs/design/specs',
              last_review: lastReview,
              cadence_days: 30,
              age_days: 31,
              overdue_days: 1
            }
          ],
          stdout_sample: [
            `tasks/specs/linear-co-428.md: last_review ${lastReview} is 31 days old (must be <=30 days)`
          ],
          stderr_sample: []
        },
        diffStatus: 'ok',
        diffBaseRef: 'origin/main',
        ownerIssueVerification: {
          issue: 'CO-444',
          issue_id: 'owner-id',
          state: 'In Progress',
          state_type: 'started',
          is_terminal: false,
          usable: true,
          project_id: 'project-1',
          expected_project_id: 'project-1',
          same_project: true,
          verification_status: 'succeeded',
          checked_at: null,
          source: 'linear issue-context',
          error: null
        }
      }
    );

    expect(decision.freshness_decision).toBe('block_diff_local');
    expect(decision.totals.spec_guard_candidate_cohorts).toBe(2);
    expect(decision.candidate_cohorts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        route_id: 'co-428-stale-active-spec',
        canonical_owner_key: tasksSpecKey,
        source_breakdown: { spec_guard: 1 },
        sample_paths: ['tasks/specs/linear-co-428.md']
      }),
      expect.objectContaining({
        route_id: 'co-428-stale-active-spec',
        canonical_owner_key: designSpecKey,
        source_breakdown: { spec_guard: 1 },
        sample_paths: ['docs/design/specs/CO-428-design.md']
      })
    ]));
    const ownerActionEvidence = buildDocsFreshnessOwnerActionEvidence(decision, {
      env: {} as NodeJS.ProcessEnv
    });
    const tasksAction = ownerActionEvidence.actions.find((action) => action.canonical_owner_key === tasksSpecKey);
    const designAction = ownerActionEvidence.actions.find((action) => action.canonical_owner_key === designSpecKey);
    expect(tasksAction).toEqual(
      expect.objectContaining({
        route_id: 'co-428-stale-active-spec',
        mode: 'create_or_update_required',
        canonical_owner_key: tasksSpecKey,
        body: expect.objectContaining({
          canonical_owner_marker:
            `codex-orchestrator:canonical-owner-key=${tasksSpecKey}`,
          description: expect.stringContaining('Recent recurrence shapes: `CO-428`, `CO-429`, `CO-430`')
        })
      })
    );
    expect(designAction).toEqual(
      expect.objectContaining({
        route_id: 'co-428-stale-active-spec',
        mode: 'create_or_update_required',
        canonical_owner_key: designSpecKey,
        body: expect.objectContaining({
          canonical_owner_marker: `codex-orchestrator:canonical-owner-key=${designSpecKey}`
        })
      })
    );
  });

  it('does not derive spec-guard canonical owner cohorts from truncated samples alone', () => {
    const lastReview = reviewDateDaysAgo(31);
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          canonical_owner_key: 'docs:freshness:maintain',
          owner_issue: 'CO-522',
          require_live_owner_verification: true,
          owner_issue_project_id: 'project-1'
        }),
        stale_entries: [],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 0,
          registry_entries: 0,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 0,
          rolling_cohort_entries: 0,
          uncatalogued_docs: 0
        }
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        specGuard: {
          status: 'failed',
          stdout_sample: [
            `tasks/specs/linear-co-428.md: last_review ${lastReview} is 31 days old (must be <=30 days)`
          ],
          stderr_sample: []
        },
        diffStatus: 'ok',
        diffBaseRef: 'origin/main'
      }
    );

    expect(decision.freshness_decision).toBe('block_diff_local');
    expect(decision.totals.spec_guard_candidate_cohorts).toBe(0);
    expect(decision.candidate_cohorts).toEqual([]);
  });

  it('parses bullet-prefixed spec-guard stale active spec output from full output', () => {
    const lastReview = reviewDateDaysAgo(31);
    const canonicalOwnerKey =
      `spec_guard_active_spec|path_family:tasks/specs|last_review:${lastReview}|cadence_days:30`;
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          canonical_owner_key: 'docs:freshness:maintain',
          require_live_owner_verification: true,
          owner_issue_project_id: 'project-1'
        }),
        stale_entries: [],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 0,
          registry_entries: 0,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 0,
          rolling_cohort_entries: 0,
          uncatalogued_docs: 0
        }
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        specGuard: {
          status: 'failed',
          full_output: [
            'Spec guard failed:',
            ` - tasks/specs/linear-co-428.md: last_review ${lastReview} is 31 days old (must be ≤30 days)`
          ].join('\n')
        },
        diffStatus: 'ok',
        diffBaseRef: 'origin/main'
      }
    );

    expect(decision.totals.spec_guard_candidate_cohorts).toBe(1);
    expect(decision.candidate_cohorts).toEqual([
      expect.objectContaining({
        route_id: 'co-428-stale-active-spec',
        canonical_owner_key: canonicalOwnerKey,
        source_breakdown: { spec_guard: 1 },
        sample_paths: ['tasks/specs/linear-co-428.md']
      })
    ]);
  });

  it('routes non-date spec-guard fallback metadata failures through owner action evidence', () => {
    const canonicalOwnerKey =
      'spec_guard_fallback_seam|path_family:.agent/task|failure_kind:fallback_expiry_metadata_stale';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          canonical_owner_key: 'docs:freshness:maintain',
          owner_issue: 'CO-522',
          require_live_owner_verification: true,
          owner_issue_project_id: 'project-1'
        }),
        stale_entries: [],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 0,
          registry_entries: 0,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 0,
          rolling_cohort_entries: 0,
          uncatalogued_docs: 0
        }
      },
      {
        changedPaths: [],
        taskId: 'fixture',
        specGuard: {
          status: 'failed',
          full_output: [
            'Spec guard failed:',
            ' - .agent/task/linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md: fallback expiry metadata is stale; review date 2026-05-12 is stale'
          ].join('\n')
        },
        diffStatus: 'ok',
        diffBaseRef: 'origin/main',
        ownerIssueVerification: {
          issue: 'CO-522',
          issue_id: 'owner-id',
          state: 'Blocked',
          state_type: 'started',
          is_terminal: false,
          usable: true,
          project_id: 'project-1',
          expected_project_id: 'project-1',
          same_project: true,
          verification_status: 'succeeded',
          checked_at: null,
          source: 'linear issue-context',
          error: null
        }
      }
    );

    expect(decision.freshness_decision).toBe('block_diff_local');
    expect(decision.spec_guard.parsed_failures).toEqual([
      expect.objectContaining({
        path: '.agent/task/linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md',
        path_family: '.agent/task',
        failure_kind: 'fallback_expiry_metadata_stale',
        message: 'fallback expiry metadata is stale; review date 2026-05-12 is stale',
        evidence_date: '2026-05-12'
      })
    ]);
    expect(decision.totals.spec_guard_candidate_cohorts).toBe(1);
    expect(decision.candidate_cohorts).toEqual([
      expect.objectContaining({
        route_id: 'co-382-fallback-seam-metadata',
        status: 'spec_guard_fallback_seam_candidate',
        canonical_owner_key: canonicalOwnerKey,
        source_breakdown: { spec_guard: 1 },
        sample_paths: ['.agent/task/linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md'],
        sample_messages: ['fallback expiry metadata is stale; review date 2026-05-12 is stale']
      })
    ]);
    expect(decision.repo_gate.spec_guard).toEqual({
      status: 'failed',
      action_required_count: 1
    });
    expect(decision.repo_gate.sample_paths.spec_guard_paths).toEqual([
      '.agent/task/linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md'
    ]);

    const ownerActionEvidence = buildDocsFreshnessOwnerActionEvidence(decision, {
      env: {} as NodeJS.ProcessEnv
    });
    expect(ownerActionEvidence.actions).toEqual([
      expect.objectContaining({
        route_id: 'co-382-fallback-seam-metadata',
        mode: 'create_or_update_required',
        owner_issue: 'CO-522',
        canonical_owner_key: canonicalOwnerKey,
        body: expect.objectContaining({
          description: expect.stringContaining('fallback/seam metadata routing')
        })
      })
    ]);
  });

  it('does not reuse canonical owner verification across different scoped configs for the same issue', () => {
    const lastReview = '2026-03-23';
    const tasksCanonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const prdCanonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:docs/PRD-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true,
          canonical_owner_issues: [
            {
              canonical_owner_key: tasksCanonicalOwnerKey,
              owner_issue: 'CO-320',
              owner_issue_project_id: 'project-1'
            },
            {
              canonical_owner_key: prdCanonicalOwnerKey,
              owner_issue: 'CO-320',
              owner_issue_project_id: 'project-2'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'docs/PRD-co397.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'docs/PRD-*',
            task_number: null,
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            canonical_owner_key: tasksCanonicalOwnerKey,
            issue_id: 'owner-id',
            state: 'In Progress',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            project_id: 'project-1',
            expected_project_id: 'project-1',
            same_project: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          },
          {
            issue: 'CO-320',
            canonical_owner_key: prdCanonicalOwnerKey,
            issue_id: 'owner-id',
            state: 'In Progress',
            state_type: 'started',
            is_terminal: false,
            usable: false,
            project_id: 'project-1',
            expected_project_id: 'project-2',
            same_project: false,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        canonical_owner_key: prdCanonicalOwnerKey,
        owner_issue_action: expect.objectContaining({
          mode: 'create_required',
          existing_issue: 'CO-320',
          reason: 'configured_owner_project_mismatch',
          expected_project_id: 'project-2',
          actual_project_id: 'project-1'
        })
      })
    );
  });

  it('does not accept stale same-key canonical owner verification from another scope', () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:docs/PRD-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true,
          require_live_owner_verification: true,
          canonical_owner_issues: [
            {
              canonical_owner_key: canonicalOwnerKey,
              owner_issue: 'CO-320',
              owner_issue_project_id: 'project-2'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'docs/PRD-co397.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'docs/PRD-*',
            task_number: null,
            last_review: '2026-03-23',
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            canonical_owner_key: canonicalOwnerKey,
            issue_id: 'owner-id',
            state: 'In Progress',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            project_id: 'project-1',
            expected_project_id: 'project-1',
            same_project: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        canonical_owner_key: canonicalOwnerKey,
        owner_issue_action: expect.objectContaining({
          mode: 'create_required',
          existing_issue: 'CO-320',
          reason: 'owner_verification_unavailable',
          canonical_owner_key: canonicalOwnerKey
        })
      })
    );
  });

  it('accepts env-derived extra canonical owner scope when explicit catalog scope matches', () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:docs/PRD-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true,
          require_live_owner_verification: true,
          canonical_owner_issues: [
            {
              canonical_owner_key: canonicalOwnerKey,
              owner_issue: 'CO-320',
              owner_issue_team_id: 'team-1',
              owner_issue_project_id: 'project-1'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'docs/PRD-co397.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'docs/PRD-*',
            task_number: null,
            last_review: '2026-03-23',
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            canonical_owner_key: canonicalOwnerKey,
            issue_id: 'owner-id',
            state: 'In Progress',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            project_id: 'project-1',
            expected_workspace_id: 'workspace-from-env',
            expected_team_id: 'team-1',
            expected_project_id: 'project-1',
            same_project: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('pass_with_owned_rolling_debt');
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        canonical_owner_key: canonicalOwnerKey,
        owner_issue_action: expect.objectContaining({
          mode: 'update_existing',
          issue: 'CO-320',
          reason: 'succeeded',
          canonical_owner_key: canonicalOwnerKey
        })
      })
    );
  });

  it('skips canonical owner verification when the rolling policy is invalid', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-invalid-owner-'));
    createdDirs.push(repoRoot);
    const lastReview = reviewDateDaysAgo(31);
    const canonicalOwnerKey = `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:${lastReview}|cadence_days:30`;
    await writeFixture(repoRoot, {
      entries: [{ path: 'tasks/tasks-1321-historical.md', lastReview }],
      policy: rollingFreshnessPolicy({
        max_cohorts: 0,
        owner_issue: 'CO-300',
        owner_issue_state: 'Done',
        owner_issue_state_type: 'completed',
        owner_issue_is_terminal: true,
        canonical_owner_issues: [
          {
            canonical_owner_key: canonicalOwnerKey,
            owner_issue: 'CO-320'
          }
        ]
      })
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.canonical_owner_issue_verifications).toEqual([]);
    expect(decision.candidate_cohorts).toHaveLength(1);
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        canonical_owner_key: canonicalOwnerKey,
        owner_issue: 'CO-300',
        configured_owner_issue: 'CO-300',
        owner_issue_action: expect.objectContaining({
          mode: 'create_required',
          existing_issue: 'CO-300',
          reason: 'configured_owner_terminal'
        }),
        owner_issue_resolution: expect.objectContaining({
          mode: 'rolling_freshness_policy_owner'
        })
      })
    );
  });

  it('skips canonical owner verification when only hard-stale non-candidates exist', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-hard-stale-owner-'));
    createdDirs.push(repoRoot);
    await writeFixture(repoRoot, {
      entries: [{ path: 'docs/guide.md', daysOld: 31 }],
      policy: rollingFreshnessPolicy({
        canonical_owner_issues: [
          {
            canonical_owner_key:
              'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30',
            owner_issue: 'CO-320'
          }
        ]
      })
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.canonical_owner_issue_verifications).toEqual([]);
    expect(decision.candidate_cohorts).toEqual([]);
    expect(decision.totals.hard_stale_entries).toBe(1);
    expect(decision.sample_paths.hard_stale_paths).toEqual(['docs/guide.md']);
  });

  it('preserves multiple resolved canonical owners in passing guidance', () => {
    const tasksCanonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const prdCanonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:docs/PRD-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true,
          max_cohorts: 2,
          canonical_owner_issues: [
            {
              canonical_owner_key: tasksCanonicalOwnerKey,
              owner_issue: 'CO-320'
            },
            {
              canonical_owner_key: prdCanonicalOwnerKey,
              owner_issue: 'CO-321'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1321',
            last_review: '2026-03-23',
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          },
          {
            path: 'docs/PRD-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'docs/PRD-*',
            task_number: null,
            last_review: '2026-03-23',
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          }
        ],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 2,
          registry_entries: 2,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 2,
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            issue_id: '2b99df6c-e17c-4fac-a146-ed4dedc989e5',
            state: 'Blocked',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          },
          {
            issue: 'CO-321',
            issue_id: 'b7a661ff-cc61-4be8-bbf0-5a06fd8c4f6d',
            state: 'In Progress',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('pass_with_owned_rolling_debt');
    expect(decision.recommended_action).toContain('owner issues CO-320 and CO-321');
    expect(decision.recommended_action).not.toContain('configured owner CO-300 is terminal');
  });

  it('keeps a copyable command on consolidated owner action evidence', () => {
    const evidence = buildDocsFreshnessOwnerActionEvidence(
      {
        freshness_decision: 'block_unowned_repo_debt',
        owner_issue: 'CO-522',
        owner_issue_action: {
          mode: 'update_existing',
          canonical_owner_key: 'docs:freshness:maintain'
        },
        candidate_cohorts: [
          {
            id: 'cohort-a',
            canonical_owner_key: 'key-a',
            canonical_owner_marker: 'codex-orchestrator:canonical-owner-key=key-a',
            owner_issue: 'CO-522',
            owner_issue_action: { mode: 'create_required' },
            source_breakdown: { blocking_candidate: 1 },
            sample_paths: ['tasks/tasks-a.md']
          },
          {
            id: 'cohort-b',
            canonical_owner_key: 'key-b',
            canonical_owner_marker: 'codex-orchestrator:canonical-owner-key=key-b',
            owner_issue: 'CO-522',
            owner_issue_action: { mode: 'create_required' },
            source_breakdown: { blocking_candidate: 1 },
            sample_paths: ['tasks/tasks-b.md']
          }
        ],
        repo_gate: {
          severity: 'blocking',
          action_required_count: 2
        }
      },
      { env: {} as NodeJS.ProcessEnv }
    );

    expect(evidence).toEqual(
      expect.objectContaining({
        status: 'credentials_missing',
        should_block: true,
        actions: [
          expect.objectContaining({
            route_id: 'docs-freshness-maintain-owner-workpad',
            owner_issue: 'CO-522',
            copyable_command: expect.stringContaining('--canonical-owner-key "docs:freshness:maintain"')
          })
        ]
      })
    );
  });

  it('blocks exact canonical owner reuse when the rolling policy is invalid', () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          is_valid: false,
          owner_issue: 'CO-300',
          canonical_owner_issues: [
            {
              canonical_owner_key: canonicalOwnerKey,
              owner_issue: 'CO-320'
            },
            {
              canonical_owner_key: canonicalOwnerKey,
              owner_issue: 'CO-321'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1321',
            last_review: '2026-03-23',
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            issue_id: '2b99df6c-e17c-4fac-a146-ed4dedc989e5',
            state: 'Blocked',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.policy_capacity_status).toEqual(expect.objectContaining({ status: 'invalid_policy' }));
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        owner_issue: 'CO-300',
        owner_issue_action: expect.objectContaining({
          duplicate_policy: 'one_owner_issue_per_historical_batch'
        }),
        owner_issue_resolution: expect.objectContaining({
          mode: 'rolling_freshness_policy_owner',
          source: 'rolling_freshness_policy.owner_issue'
        })
      })
    );
    expect(decision.candidate_cohorts[0].owner_issue_action).not.toEqual(
      expect.objectContaining({ duplicate_policy: 'one_owner_issue_per_canonical_owner_key' })
    );
    expect(decision.recommended_action).not.toContain('Proceed only');
  });

  it('does not route unrelated candidate cohorts to a canonical owner for another key', () => {
    const exactCanonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const unrelatedCanonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:docs/PRD-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true,
          canonical_owner_issues: [
            {
              canonical_owner_key: exactCanonicalOwnerKey,
              owner_issue: 'CO-320'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1321',
            last_review: '2026-03-23',
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          },
          {
            path: 'docs/PRD-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'docs/PRD-*',
            task_number: null,
            last_review: '2026-03-23',
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          }
        ],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 2,
          registry_entries: 2,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 2,
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            issue_id: '2b99df6c-e17c-4fac-a146-ed4dedc989e5',
            state: 'Blocked',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    const exactCohort = decision.candidate_cohorts.find(
      (cohort) => cohort.canonical_owner_key === exactCanonicalOwnerKey
    );
    const unrelatedCohort = decision.candidate_cohorts.find(
      (cohort) => cohort.canonical_owner_key === unrelatedCanonicalOwnerKey
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(exactCohort).toEqual(expect.objectContaining({ owner_issue: 'CO-320' }));
    expect(unrelatedCohort).toEqual(
      expect.objectContaining({
        owner_issue: 'CO-300',
        configured_owner_issue: 'CO-300',
        owner_issue_action: expect.objectContaining({
          mode: 'create_required',
          existing_issue: 'CO-300',
          reason: 'configured_owner_terminal'
        })
      })
    );
  });

  it('does not recommend an exact canonical owner for mixed over-budget cohorts', () => {
    const exactCanonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true,
          max_cohorts: 1,
          canonical_owner_issues: [
            {
              canonical_owner_key: exactCanonicalOwnerKey,
              owner_issue: 'CO-320'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1321',
            last_review: '2026-03-23',
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          },
          {
            path: 'docs/PRD-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'docs/PRD-*',
            task_number: null,
            last_review: '2026-03-23',
            cadence_days: 30,
            age_days: 31,
            overdue_days: 1
          }
        ],
        rolling_cohort_entries: [],
        totals: {
          docs_scanned: 2,
          registry_entries: 2,
          missing_in_registry: 0,
          missing_on_disk: 0,
          invalid_entries: 0,
          stale_entries: 2,
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            issue_id: '2b99df6c-e17c-4fac-a146-ed4dedc989e5',
            state: 'Blocked',
            state_type: 'started',
            is_terminal: false,
            usable: true,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('block_policy_over_budget');
    expect(decision.recommended_action).toContain('configured owner CO-300 is terminal');
    expect(decision.recommended_action).not.toContain('owner issue CO-320');
  });

  it('does not treat a terminal exact canonical owner as a live owner path', () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          canonical_owner_issues: [
            {
              canonical_owner_key: canonicalOwnerKey,
              owner_issue: 'CO-320'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1321',
            last_review: '2026-03-23',
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            issue_id: '2b99df6c-e17c-4fac-a146-ed4dedc989e5',
            state: 'Done',
            state_type: 'completed',
            is_terminal: true,
            usable: false,
            verification_status: 'succeeded',
            checked_at: null,
            source: 'linear issue-context',
            error: null
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        owner_issue: 'CO-320',
        owner_issue_action: expect.objectContaining({
          mode: 'create_required',
          existing_issue: 'CO-320',
          reason: 'configured_owner_terminal',
          duplicate_policy: 'one_owner_issue_per_canonical_owner_key'
        })
      })
    );
  });

  it('does not resolve an exact canonical owner when helper verification is unavailable without policy metadata', () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          canonical_owner_issues: [
            {
              canonical_owner_key: canonicalOwnerKey,
              owner_issue: 'CO-320'
            }
          ]
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1321',
            last_review: '2026-03-23',
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            issue_id: null,
            state: null,
            state_type: null,
            is_terminal: null,
            usable: null,
            verification_status: 'unavailable',
            checked_at: null,
            source: 'linear issue-context',
            error: 'helper_missing'
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        owner_issue: 'CO-320',
        owner_issue_action: expect.objectContaining({
          mode: 'create_required',
          existing_issue: 'CO-320',
          reason: 'owner_verification_unavailable',
          verification_status: 'unavailable',
          verification_error: 'helper_missing',
          duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
          canonical_owner_key: canonicalOwnerKey
        })
      })
    );
    expect(decision.recommended_action).not.toContain('owner issue CO-320');
  });

  it('allows an exact canonical owner when unavailable helper verification has explicit non-terminal policy metadata', () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30';
    const decision = buildDocsFreshnessMaintenanceDecision(
      {
        rolling_freshness_policy: rollingFreshnessPolicy({
          owner_issue: 'CO-300',
          owner_issue_state: 'Done',
          owner_issue_state_type: 'completed',
          owner_issue_is_terminal: true,
          canonical_owner_issues: [
            {
              canonical_owner_key: canonicalOwnerKey,
              owner_issue: 'CO-320',
              owner_issue_state: 'In Progress',
              owner_issue_state_type: 'started',
              owner_issue_is_terminal: false
            }
          ]
        }),
        stale_entries: [
          {
            path: 'tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md',
            doc_class: 'task_packet',
            doc_class_label: 'Task Packet',
            path_family: 'tasks/tasks-*',
            task_number: '1321',
            last_review: '2026-03-23',
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
        canonicalOwnerIssueVerifications: [
          {
            issue: 'CO-320',
            issue_id: null,
            state: null,
            state_type: null,
            is_terminal: null,
            usable: null,
            verification_status: 'unavailable',
            checked_at: null,
            source: 'linear issue-context',
            error: 'helper_missing'
          }
        ]
      }
    );

    expect(decision.freshness_decision).toBe('pass_with_owned_rolling_debt');
    expect(decision.candidate_cohorts[0]).toEqual(
      expect.objectContaining({
        owner_issue: 'CO-320',
        owner_issue_action: expect.objectContaining({
          mode: 'update_existing',
          issue: 'CO-320',
          reason: 'policy_metadata',
          duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
          canonical_owner_key: canonicalOwnerKey
        })
      })
    );
    expect(decision.recommended_action).toContain('owner issue CO-320');
  });

  it('fails closed when helper verification is unavailable but policy metadata marks the owner terminal', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-terminal-unavailable-'));
    createdDirs.push(repoRoot);
    const baselineCanonicalOwnerKey = 'baseline_cohort_id:co-175-apr-14-march-14-tasks-1164-1195';
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
    expect(decision.owner_action_evidence).toEqual(
      expect.objectContaining({
        status: 'credentials_missing',
        write_status: 'credentials_missing',
        should_block: true,
        required_actions: 1,
        actions: [
          expect.objectContaining({
            route_id: 'co-430-terminal-owner-replacement',
            mode: 'replace_terminal_owner',
            canonical_owner_key: baselineCanonicalOwnerKey,
            copyable_command: expect.stringContaining(`--canonical-owner-key "${baselineCanonicalOwnerKey}"`),
            body: expect.objectContaining({
              canonical_owner_marker: `codex-orchestrator:canonical-owner-key=${baselineCanonicalOwnerKey}`,
              description: expect.stringContaining('Escaped historical root-cause attempts: `CO-188`, `CO-323`')
            })
          })
        ]
      })
    );
  });

  it('fails closed when linear issue-context falls back to cached output', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-maintain-cache-fallback-'));
    createdDirs.push(repoRoot);
    await writeFixture(repoRoot, {
      entries: [{ path: 'tasks/tasks-1164-historical.md', daysOld: 31 }],
      policy: rollingFreshnessPolicy({
        require_live_owner_verification: true,
        owner_issue_project_id: 'project-1'
      })
    });
    await writeLinearIssueContextHelper(repoRoot, {
      issue: {
        id: 'owner-id',
        state: { name: 'In Progress', type: 'started', is_terminal: false },
        workspace_id: 'workspace-1',
        team: { id: 'team-1' },
        project: { id: 'project-1', name: 'CO Control and Advisory' }
      },
      source_setup: {
        workspace_id: 'workspace-1',
        team_id: 'team-1',
        project_id: 'project-1',
        cache_fallback_used: true
      }
    });

    const { decision, shouldBlock } = await runMaintain(repoRoot);

    expect(shouldBlock).toBe(true);
    expect(decision.freshness_decision).toBe('block_unowned_repo_debt');
    expect(decision.owner_issue_verification).toEqual(
      expect.objectContaining({
        issue: 'CO-175',
        usable: false,
        expected_project_id: 'project-1',
        same_project: null,
        verification_status: 'failed',
        source: 'linear issue-context',
        error: expect.stringContaining('cache_fallback_used')
      })
    );
    expect(decision.owner_issue_action).toEqual(
      expect.objectContaining({
        mode: 'create_required',
        existing_issue: 'CO-175',
        reason: 'owner_verification_failed',
        verification_status: 'failed'
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
    expect(decision.owner_action_evidence).toEqual(
      expect.objectContaining({
        status: 'credentials_missing',
        should_block: true,
        actions: [
          expect.objectContaining({
            route_id: 'co-429-completed-lane-registry-residue',
            copyable_command: expect.stringContaining('--canonical-owner-key'),
            body: expect.objectContaining({
              description: expect.stringContaining('completed-lane registry residue')
            })
          })
        ]
      })
    );
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

  it('keeps the guide declared baseline cohorts in catalog policy parity', async () => {
    const guide = await readFile(join(process.cwd(), 'docs/guides/docs-freshness-cohorts.md'), 'utf8');
    const catalog = JSON.parse(await readFile(join(process.cwd(), 'docs/docs-catalog.json'), 'utf8'));
    const declaredLine = guide.match(/^- Declared baseline cohorts: (?<cohorts>.+)$/mu);
    const declaredCohorts = declaredLine?.groups?.cohorts;

    expect(declaredCohorts).toBeTruthy();
    if (!declaredCohorts) {
      throw new Error('docs freshness guide must declare baseline cohorts');
    }

    const guideCohorts = declaredCohorts
      .split(',')
      .map((cohort) => cohort.trim().replace(/^`|`$/gu, ''));
    const catalogCohorts = catalog.policies.rolling_freshness_cohorts.baseline_cohorts.map(
      (cohort: { id: string }) => cohort.id
    );

    expect(new Set(guideCohorts).size).toBe(guideCohorts.length);
    expect(new Set(catalogCohorts).size).toBe(catalogCohorts.length);
    expect(catalogCohorts).toEqual(guideCohorts);
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
