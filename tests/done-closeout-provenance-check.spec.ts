import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
});
