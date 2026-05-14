import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  hashPendingRowTexts,
  runDoneCloseoutProvenanceCheck
} from '../scripts/done-closeout-provenance-check.mjs';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function makeRepo(prefix = 'done-closeout-') {
  const repoRoot = await mkdtemp(join(tmpdir(), prefix));
  createdDirs.push(repoRoot);
  await mkdir(join(repoRoot, 'docs'), { recursive: true });
  return repoRoot;
}

function staleIssue(overrides: Record<string, unknown> = {}) {
  return {
    identifier: 'CO-1',
    linear_id: 'linear-id',
    linear_state: 'Done',
    classification: 'stale_mirror_only',
    pr: {
      number: 1,
      url: 'https://github.com/Kbediako/CO/pull/1',
      state: 'MERGED',
      merged_at: '2026-04-14T00:00:00Z',
      merge_commit: 'abc123',
      checks: [
        { name: 'Cloud Canary', conclusion: 'SUCCESS' },
        { name: 'Core Lane', conclusion: 'SUCCESS' },
        { name: 'CodeRabbit', state: 'SUCCESS' }
      ]
    },
    mirror_paths: ['tasks/tasks-linear-id.md'],
    waivers: [],
    ...overrides
  };
}

async function writeManifest(repoRoot: string, issues: Array<Record<string, unknown>>) {
  await writeFile(
    join(repoRoot, 'docs', 'done-closeout-provenance.json'),
    JSON.stringify(
      {
        version: 1,
        required_pr_checks: ['Cloud Canary', 'Core Lane', 'CodeRabbit'],
        issues
      },
      null,
      2
    ),
    'utf8'
  );
}

async function writeTaskIndex(repoRoot: string, items: Array<Record<string, unknown>>) {
  await mkdir(join(repoRoot, 'tasks'), { recursive: true });
  await writeFile(join(repoRoot, 'tasks', 'index.json'), JSON.stringify({ items }, null, 2), 'utf8');
}

async function writeMirror(repoRoot: string, relPath: string, content: string) {
  await mkdir(join(repoRoot, relPath.split('/').slice(0, -1).join('/')), { recursive: true });
  await writeFile(join(repoRoot, relPath), content, 'utf8');
}

describe('done closeout provenance check', () => {
  it('passes clean Done issue mirrors and writes a JSON report', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue()]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.ok).toBe(true);
    expect(report.status).toBe('succeeded');
    expect(report.totals.pending_rows).toBe(0);
    const written = JSON.parse(await readFile(join(repoRoot, report.report_path), 'utf8'));
    expect(written.ok).toBe(true);
    expect(written.status).toBe('succeeded');
  });

  it('fails when a Done mirror has an unwaived pending closeout row', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [ ] npm run test. Evidence: pending.\n');
    await writeManifest(repoRoot, [staleIssue()]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.ok).toBe(false);
    expect(report.status).toBe('failed');
    expect(report.totals.unwaived_pending_rows).toBe(1);
    expect(report.failures.map((failure) => failure.code)).toContain('unwaived_pending_closeout_row');
    const written = JSON.parse(await readFile(join(repoRoot, report.report_path), 'utf8'));
    expect(written.ok).toBe(false);
    expect(written.status).toBe('failed');
  });

  it('fails when a Done issue has a matching nonterminal tasks/index row', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue({ identifier: 'CO-525', linear_id: 'linear-done' })]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-done',
        title: 'CO-525 done closeout guard',
        status: 'in_progress',
        source_issue: {
          id: 'linear-done',
          identifier: 'CO-525'
        }
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.task_index_nonterminal_rows).toBe(1);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'done_issue_nonterminal_task_index_row',
          task_id: '20260514-linear-done',
          status: 'in_progress'
        })
      ])
    );
    expect(report.issues[0].task_index_nonterminal_rows).toEqual([
      {
        task_id: '20260514-linear-done',
        status: 'in_progress'
      }
    ]);
  });

  it('matches legacy tasks/index rows without source_issue metadata', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue({ identifier: 'CO-525', linear_id: 'linear-legacy' })]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-legacy',
        title: 'CO-525 legacy row',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-legacy.md'
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'done_issue_nonterminal_task_index_row',
          task_id: '20260514-linear-legacy'
        })
      ])
    );
  });

  it('matches legacy rows when source_issue metadata is stale but legacy fields still identify the issue', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue({ identifier: 'CO-525', linear_id: 'linear-legacy' })]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-legacy',
        title: 'CO-525 legacy row',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-legacy.md',
        source_issue: {
          id: 'linear-other',
          identifier: 'CO-999'
        }
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'done_issue_nonterminal_task_index_row',
          task_id: '20260514-linear-legacy'
        })
      ])
    );
  });

  it('validates task-index-only live issue authorities outside the waiver manifest', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue()]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-live',
        title: 'CO-525 live closeout row',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-live.md'
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture',
      taskIndexIssues: [
        {
          identifier: 'CO-525',
          linear_id: 'linear-live',
          linear_state: 'Done'
        }
      ]
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.issues).toBe(2);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: 'CO-525',
          code: 'done_issue_nonterminal_task_index_row',
          task_id: '20260514-linear-live'
        })
      ])
    );
  });

  it('deduplicates task-index-only authorities already present in the manifest', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue({ identifier: 'CO-525', linear_id: 'linear-live' })]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-live',
        title: 'CO-525 live closeout row',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-live.md'
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture',
      taskIndexIssues: [
        {
          identifier: 'CO-525',
          linear_id: 'linear-live',
          linear_state: 'Done'
        }
      ]
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.issues).toBe(1);
    expect(report.totals.task_index_nonterminal_rows).toBe(1);
    expect(report.failures.filter((failure) => failure.code === 'done_issue_nonterminal_task_index_row')).toHaveLength(1);
  });

  it('keeps live task-index authority when manifest identity only partially overlaps', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue({ identifier: 'CO-525', linear_id: 'stale-linear-id' })]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-live',
        title: 'live closeout row',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-live.md'
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture',
      taskIndexIssues: [
        {
          identifier: 'CO-525',
          linear_id: 'linear-live',
          linear_state: 'Done'
        }
      ]
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.issues).toBe(2);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: 'CO-525',
          code: 'done_issue_nonterminal_task_index_row',
          task_id: '20260514-linear-live'
        })
      ])
    );
  });

  it('does not collapse duplicate manifest entries while deduplicating runtime authorities', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [
      staleIssue({ identifier: 'CO-525', linear_id: 'linear-live' }),
      staleIssue({
        identifier: 'CO-525',
        linear_id: 'linear-live',
        classification: 'true_follow_up_needed',
        mirror_paths: []
      })
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture',
      taskIndexIssues: [
        {
          identifier: 'CO-525',
          linear_id: 'linear-live',
          linear_state: 'Done'
        }
      ]
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.issues).toBe(2);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: 'CO-525',
          code: 'true_follow_up_needed'
        })
      ])
    );
  });

  it('ignores partial task-index-only authorities before issue validation', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue()]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-live',
        title: 'CO-525 live closeout row',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-live.md'
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture',
      taskIndexIssues: [
        {
          identifier: 'CO-525',
          linear_state: 'Done'
        }
      ]
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.issues).toBe(1);
    expect(report.failures.map((failure) => failure.code)).not.toContain('issue_identity_incomplete');
  });

  it('rejects task-index-only classifications from the manifest', async () => {
    const repoRoot = await makeRepo();
    await writeManifest(repoRoot, [
      {
        identifier: 'CO-525',
        linear_id: 'linear-live',
        linear_state: 'Done',
        classification: 'task_index_only',
        mirror_paths: [],
        waivers: []
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: 'CO-525',
          code: 'invalid_classification',
          classification: 'task_index_only'
        })
      ])
    );
  });

  it('does not match title-only issue references when legacy ids point elsewhere', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue({ identifier: 'CO-525', linear_id: 'linear-done' })]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-other',
        title: 'Follow-up from CO-525',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-other.md'
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.task_index_nonterminal_rows).toBe(0);
  });

  it('does not match near issue identifiers in legacy tasks/index titles', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue({ identifier: 'CO-43', linear_id: 'linear-43' })]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-other',
        title: 'CO-430 unrelated row',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-other.md'
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.task_index_nonterminal_rows).toBe(0);
  });

  it('fails when tasks/index.json is present without an items array', async () => {
    const repoRoot = await makeRepo();
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, 'tasks', 'index.json'), JSON.stringify({ tasks: [] }, null, 2), 'utf8');
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue()]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'tasks_index_invalid_shape',
          path: 'tasks/index.json'
        })
      ])
    );
  });

  it('requires at least one valid mirror path for stale mirror entries', async () => {
    const repoRoot = await makeRepo();
    await writeManifest(repoRoot, [staleIssue({ mirror_paths: [] })]);

    const empty = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });
    expect(empty.hasFailures).toBe(true);
    expect(empty.report.failures.map((failure) => failure.code)).toContain('stale_mirror_paths_missing');

    await writeManifest(repoRoot, [staleIssue({ mirror_paths: ['../outside.md'] })]);
    const invalid = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });
    expect(invalid.hasFailures).toBe(true);
    expect(invalid.report.totals.invalid_mirror_paths).toBe(1);
    expect(invalid.report.failures.map((failure) => failure.code)).toContain('invalid_mirror_path');
    expect(invalid.report.failures.map((failure) => failure.code)).toContain('stale_mirror_paths_missing');

    await writeManifest(repoRoot, [staleIssue({ mirror_paths: ['..'] })]);
    const parentDir = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });
    expect(parentDir.hasFailures).toBe(true);
    expect(parentDir.report.totals.invalid_mirror_paths).toBe(1);
    expect(parentDir.report.failures.map((failure) => failure.code)).toContain('invalid_mirror_path');
    expect(parentDir.report.failures.map((failure) => failure.code)).toContain('stale_mirror_paths_missing');

    await writeManifest(repoRoot, [staleIssue({ mirror_paths: ['C:\\outside.md'] })]);
    const driveQualified = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });
    expect(driveQualified.hasFailures).toBe(true);
    expect(driveQualified.report.totals.invalid_mirror_paths).toBe(1);
    expect(driveQualified.report.failures.map((failure) => failure.code)).toContain('invalid_mirror_path');
    expect(driveQualified.report.failures.map((failure) => failure.code)).toContain('stale_mirror_paths_missing');
  });

  it('rejects mirror symlink escapes and non-file targets before reading', async () => {
    const symlinkRepo = await makeRepo();
    await mkdir(join(symlinkRepo, 'tasks'), { recursive: true });
    await symlink('/etc/passwd', join(symlinkRepo, 'tasks', 'tasks-linear-id.md'));
    await writeManifest(symlinkRepo, [staleIssue()]);

    const escaped = await runDoneCloseoutProvenanceCheck(symlinkRepo, {
      outRoot: join(symlinkRepo, 'out'),
      taskId: 'fixture'
    });
    expect(escaped.hasFailures).toBe(true);
    expect(escaped.report.failures.map((failure) => failure.code)).toContain('mirror_path_symlink_escape');
    expect(escaped.report.issues[0].missing_mirror_paths).toEqual(['tasks/tasks-linear-id.md']);

    const directoryRepo = await makeRepo();
    await mkdir(join(directoryRepo, 'tasks', 'tasks-linear-id.md'), { recursive: true });
    await writeManifest(directoryRepo, [staleIssue()]);

    const directoryTarget = await runDoneCloseoutProvenanceCheck(directoryRepo, {
      outRoot: join(directoryRepo, 'out'),
      taskId: 'fixture'
    });
    expect(directoryTarget.hasFailures).toBe(true);
    expect(directoryTarget.report.failures.map((failure) => failure.code)).toContain('mirror_path_non_file_target');
    expect(directoryTarget.report.issues[0].missing_mirror_paths).toEqual(['tasks/tasks-linear-id.md']);
  });

  it('rejects local closeout pointer symlink escapes', async () => {
    const repoRoot = await makeRepo();
    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await symlink('/etc/passwd', join(repoRoot, 'docs', 'closeout.md'));
    await writeManifest(repoRoot, [
      {
        identifier: 'CO-170',
        linear_id: 'linear-validation',
        linear_state: 'Done',
        classification: 'validation_only_provenance_gap',
        pr_required: false,
        mirror_paths: [],
        local_closeout_pointers: ['docs/closeout.md']
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.failures.map((failure) => failure.code)).toContain('local_closeout_pointer_symlink_escape');
  });

  it('rejects derived default report paths outside the repository', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', '# Task\n\n- [x] PR attached.\n');
    await writeManifest(repoRoot, [staleIssue()]);

    await expect(
      runDoneCloseoutProvenanceCheck(repoRoot, {
        outRoot: join(repoRoot, '..', 'outside-out'),
        taskId: 'fixture'
      })
    ).rejects.toThrow('Report path must be a relative repo path.');
  });

  it('detects pending docs/TASKS snapshot prose for the scoped issue', async () => {
    const repoRoot = await makeRepo();
    const snapshot =
      '# Task List Snapshot - CO sample (linear-id) - Update 2026-04-14: Remaining work is PR creation/attachment and the `pr ready-review` drain before `In Review`.';
    await writeMirror(repoRoot, 'docs/TASKS.md', `${snapshot}\n`);
    await writeManifest(repoRoot, [staleIssue({ mirror_paths: ['docs/TASKS.md'] })]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.unwaived_pending_rows).toBe(1);
    expect(report.issues[0].pending_rows[0]).toMatchObject({
      path: 'docs/TASKS.md',
      line: 1,
      text: snapshot,
      waived: false
    });
  });

  it('matches docs/TASKS snapshot prose by bounded issue identifier', async () => {
    const repoRoot = await makeRepo();
    const scopedSnapshot =
      '# Task List Snapshot - CO-9 retry repair - Update 2026-04-14: Remaining work is PR attachment.';
    const unrelatedSnapshot =
      '# Task List Snapshot - CO-94 memory lane - Update 2026-04-14: Remaining work is PR attachment.';
    const differentLinearIdentitySnapshot =
      '# Task List Snapshot - CO: Restore unrelated blocker for CO-9 handoff (linear-00000000-0000-4000-8000-000000000094) - Update 2026-04-14: Remaining work is PR attachment.';
    const evidenceOnlyLinearIdSnapshot =
      '# Task List Snapshot - CO-1 unrelated lane (linear-00000000-0000-4000-8000-000000000001) - Update 2026-04-14: Remaining work is PR attachment; evidence mentions linear-00000000-0000-4000-8000-000000000009.';
    await writeMirror(
      repoRoot,
      'docs/TASKS.md',
      `${scopedSnapshot}\n${unrelatedSnapshot}\n${differentLinearIdentitySnapshot}\n${evidenceOnlyLinearIdSnapshot}\n`
    );
    await writeManifest(repoRoot, [
      staleIssue({
        identifier: 'CO-9',
        linear_id: '00000000-0000-4000-8000-000000000009',
        mirror_paths: ['docs/TASKS.md']
      })
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.unwaived_pending_rows).toBe(1);
    expect(report.issues[0].pending_rows).toHaveLength(1);
    expect(report.issues[0].pending_rows[0]).toMatchObject({
      path: 'docs/TASKS.md',
      line: 1,
      text: scopedSnapshot,
      waived: false
    });
  });

  it('does not treat completed PR attachment evidence as pending docs/TASKS prose', async () => {
    const repoRoot = await makeRepo();
    const completedSnapshot =
      '# Task List Snapshot - CO sample (linear-id) - Update 2026-04-14: completed after PR attached and checks green.';
    await writeMirror(repoRoot, 'docs/TASKS.md', `${completedSnapshot}\n`);
    await writeManifest(repoRoot, [staleIssue({ mirror_paths: ['docs/TASKS.md'] })]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.pending_rows).toBe(0);
  });

  it('accepts a hash-bound stale mirror waiver for the exact pending row set', async () => {
    const repoRoot = await makeRepo();
    const pending = '- [ ] npm run test. Evidence: pending.';
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', `# Task\n\n${pending}\n`);
    await writeManifest(repoRoot, [
      staleIssue({
        waivers: [
          {
            path: 'tasks/tasks-linear-id.md',
            scope: 'pending_rows_hash',
            pending_rows_count: 1,
            pending_rows_sha256: hashPendingRowTexts([pending]),
            reason: 'stale_mirror_only',
            reviewed_at: '2026-04-14',
            evidence: ['https://github.com/Kbediako/CO/pull/1']
          }
        ]
      })
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.pending_rows).toBe(1);
    expect(report.totals.waived_pending_rows).toBe(1);
  });

  it('fails a hash-bound waiver when the pending row set changes', async () => {
    const repoRoot = await makeRepo();
    await writeMirror(
      repoRoot,
      'tasks/tasks-linear-id.md',
      '# Task\n\n- [ ] npm run test. Evidence: pending.\n- [ ] PR attached. Evidence: pending.\n'
    );
    await writeManifest(repoRoot, [
      staleIssue({
        waivers: [
          {
            path: 'tasks/tasks-linear-id.md',
            scope: 'pending_rows_hash',
            pending_rows_count: 1,
            pending_rows_sha256: hashPendingRowTexts(['- [ ] npm run test. Evidence: pending.']),
            reason: 'stale_mirror_only',
            reviewed_at: '2026-04-14',
            evidence: ['https://github.com/Kbediako/CO/pull/1']
          }
        ]
      })
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.failures.map((failure) => failure.code)).toContain('stale_mirror_waiver_mismatch');
    expect(report.totals.unwaived_pending_rows).toBe(2);
  });

  it('fails a stale mirror waiver without explicit evidence metadata', async () => {
    const repoRoot = await makeRepo();
    const pending = '- [ ] npm run test. Evidence: pending.';
    await writeMirror(repoRoot, 'tasks/tasks-linear-id.md', `# Task\n\n${pending}\n`);
    await writeManifest(repoRoot, [
      staleIssue({
        waivers: [
          {
            path: 'tasks/tasks-linear-id.md',
            scope: 'pending_rows_hash',
            pending_rows_count: 1,
            pending_rows_sha256: hashPendingRowTexts([pending]),
            reason: 'stale_mirror_only'
          }
        ]
      })
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.failures.map((failure) => failure.code)).toContain('stale_mirror_waiver_incomplete');
    expect(report.totals.waived_pending_rows).toBe(1);
  });

  it('requires local closeout pointers for no-PR validation-only Done issues', async () => {
    const repoRoot = await makeRepo();
    await writeManifest(repoRoot, [
      {
        identifier: 'CO-170',
        linear_id: 'linear-validation',
        linear_state: 'Done',
        classification: 'validation_only_provenance_gap',
        pr_required: false,
        mirror_paths: [],
        local_closeout_pointers: ['docs/closeout-provenance/co-170.md']
      }
    ]);

    const missing = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });
    expect(missing.hasFailures).toBe(true);
    expect(missing.report.failures.map((failure) => failure.code)).toContain('missing_local_closeout_pointer');

    await writeMirror(repoRoot, 'docs/closeout-provenance/co-170.md', '\n');
    const empty = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });
    expect(empty.hasFailures).toBe(true);
    expect(empty.report.failures.map((failure) => failure.code)).toContain('empty_local_closeout_pointer');

    await writeMirror(repoRoot, 'docs/closeout-provenance/co-170.md', '# CO-170 closeout pointer\n');
    const present = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });
    expect(present.hasFailures).toBe(false);
  });

  it('normalizes validation-only classification before enforcing closeout pointers', async () => {
    const repoRoot = await makeRepo();
    await writeManifest(repoRoot, [
      {
        identifier: 'CO-170',
        linear_id: 'linear-validation',
        linear_state: 'Done',
        classification: ' validation_only_provenance_gap ',
        pr_required: true,
        mirror_paths: [],
        local_closeout_pointers: []
      }
    ]);

    const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.failures.map((failure) => failure.code)).toContain('validation_only_pr_requirement_unclear');
    expect(report.failures.map((failure) => failure.code)).toContain('missing_local_closeout_pointer');
  });

  it('runs the CLI entrypoint from a checkout path with spaces', async () => {
    const repoRoot = await makeRepo('done closeout ');
    await mkdir(join(repoRoot, 'scripts', 'lib'), { recursive: true });
    await copyFile(
      join(process.cwd(), 'scripts', 'done-closeout-provenance-check.mjs'),
      join(repoRoot, 'scripts', 'done-closeout-provenance-check.mjs')
    );
    await copyFile(join(process.cwd(), 'scripts', 'lib', 'cli-args.js'), join(repoRoot, 'scripts', 'lib', 'cli-args.js'));
    await copyFile(
      join(process.cwd(), 'scripts', 'lib', 'run-manifests.js'),
      join(repoRoot, 'scripts', 'lib', 'run-manifests.js')
    );

    const result = spawnSync(process.execPath, [join(repoRoot, 'scripts', 'done-closeout-provenance-check.mjs'), '--help'], {
      encoding: 'utf8'
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: node scripts/done-closeout-provenance-check.mjs');
  });

  it('reads provider issue authority from environment for CLI closeout checks', async () => {
    const repoRoot = await makeRepo('done closeout env ');
    await mkdir(join(repoRoot, 'scripts', 'lib'), { recursive: true });
    await copyFile(
      join(process.cwd(), 'scripts', 'done-closeout-provenance-check.mjs'),
      join(repoRoot, 'scripts', 'done-closeout-provenance-check.mjs')
    );
    await copyFile(join(process.cwd(), 'scripts', 'lib', 'cli-args.js'), join(repoRoot, 'scripts', 'lib', 'cli-args.js'));
    await copyFile(
      join(process.cwd(), 'scripts', 'lib', 'run-manifests.js'),
      join(repoRoot, 'scripts', 'lib', 'run-manifests.js')
    );
    await writeManifest(repoRoot, [staleIssue()]);
    await writeTaskIndex(repoRoot, [
      {
        id: '20260514-linear-live',
        title: 'CO-525 live closeout row',
        status: 'in_progress',
        relates_to: 'tasks/tasks-linear-live.md'
      }
    ]);

    const result = spawnSync(
      process.execPath,
      [join(repoRoot, 'scripts', 'done-closeout-provenance-check.mjs'), '--format', 'json'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repoRoot,
          CODEX_ORCHESTRATOR_OUT_DIR: join(repoRoot, 'out'),
          CODEX_ORCHESTRATOR_RUNS_DIR: join(repoRoot, '.runs'),
          CODEX_ORCHESTRATOR_ISSUE_ID: 'linear-live',
          CODEX_ORCHESTRATOR_ISSUE_IDENTIFIER: 'CO-525',
          CODEX_ORCHESTRATOR_ISSUE_STATE: 'Done'
        }
      }
    );

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.totals.issues).toBe(2);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: 'CO-525',
          code: 'done_issue_nonterminal_task_index_row',
          task_id: '20260514-linear-live'
        })
      ])
    );
  });

  it('rejects partial CLI live issue authority before validation', async () => {
    const repoRoot = await makeRepo('done closeout cli ');
    await mkdir(join(repoRoot, 'scripts', 'lib'), { recursive: true });
    await copyFile(
      join(process.cwd(), 'scripts', 'done-closeout-provenance-check.mjs'),
      join(repoRoot, 'scripts', 'done-closeout-provenance-check.mjs')
    );
    await copyFile(join(process.cwd(), 'scripts', 'lib', 'cli-args.js'), join(repoRoot, 'scripts', 'lib', 'cli-args.js'));
    await copyFile(
      join(process.cwd(), 'scripts', 'lib', 'run-manifests.js'),
      join(repoRoot, 'scripts', 'lib', 'run-manifests.js')
    );

    const result = spawnSync(
      process.execPath,
      [join(repoRoot, 'scripts', 'done-closeout-provenance-check.mjs'), '--issue-id', 'linear-live'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repoRoot,
          CODEX_ORCHESTRATOR_OUT_DIR: join(repoRoot, 'out'),
          CODEX_ORCHESTRATOR_RUNS_DIR: join(repoRoot, '.runs')
        }
      }
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Both --issue-id and --issue-identifier are required');
  });
});
