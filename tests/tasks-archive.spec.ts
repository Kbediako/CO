import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'tasks-archive.mjs');
const createdDirs: string[] = [];
const completedAt = '2026-04-13';
const archiveYear = completedAt.slice(0, 4);

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function initRepository(options?: {
  maxLines?: number;
  reserveLines?: number;
  completedTaskIndexEntry?: Record<string, unknown>;
  completedSnapshotLines?: string[];
}): Promise<string> {
  const repo = await mkdtemp(join(tmpdir(), 'tasks-archive-'));
  createdDirs.push(repo);

  const maxLines = options?.maxLines ?? 11;
  const reserveLines = options?.reserveLines ?? 2;
  const completedTaskIndexEntry = {
    id: '20260413-linear-6ed6ef11-538e-48f0-936c-8547632bf92e',
    title: 'Completed linear archive candidate',
    paths: {
      task: 'tasks/tasks-linear-6ed6ef11-538e-48f0-936c-8547632bf92e.md'
    },
    ...options?.completedTaskIndexEntry
  };

  await mkdir(join(repo, 'docs'), { recursive: true });
  await mkdir(join(repo, 'tasks'), { recursive: true });

  await writeFile(
    join(repo, 'docs', 'tasks-archive-policy.json'),
    JSON.stringify(
      {
        version: 1,
        max_lines: maxLines,
        reserve_lines: reserveLines,
        archive_branch: 'task-archives',
        archive_file_pattern: 'docs/TASKS-archive-YYYY.md',
        repo_url: 'https://github.com/example/repo'
      },
      null,
      2
    )
  );

  await writeFile(
    join(repo, 'tasks', 'index.json'),
    JSON.stringify(
      {
        items: [
          completedTaskIndexEntry,
          {
            id: '1001',
            title: 'Active numeric task',
            status: 'in_progress',
            paths: {
              task: 'tasks/tasks-1001-active-task.md'
            }
          },
          {
            id: '1002',
            title: 'Still active task with a succeeded gate',
            status: 'in_progress',
            gate: {
              status: 'succeeded',
              run_id: '2026-04-10T02-03-04-000Z-activegate1'
            },
            paths: {
              task: 'tasks/tasks-1002-still-active-task.md'
            }
          }
        ]
      },
      null,
      2
    )
  );

  await writeFile(
    join(repo, 'docs', 'TASKS.md'),
    [
      ...(options?.completedSnapshotLines ?? [
        `# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e) - Update ${completedAt}: completed`,
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] archived by proactive reserve restoration.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]),
      '',
      `<!-- tasks-archive-index:begin --> ## Archive index - archived task snapshots live on the task-archives branch. ${archiveYear}: https://github.com/example/repo/blob/task-archives/docs/TASKS-archive-${archiveYear}.md <!-- tasks-archive-index:end -->`,
      '',
      '# Task List Snapshot - Active numeric task (1001-active-task)',
      '',
      '# Task List Snapshot - Still active task with a succeeded gate (1002-still-active-task)',
      ''
    ].join('\n')
  );

  return repo;
}

describe('tasks-archive script', () => {
  it('archives completed linear snapshots proactively once reserve headroom is exhausted', async () => {
    const repo = await initRepository({
      maxLines: 13,
      reserveLines: 2
    });

    const preArchiveTasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const preArchiveLineCount = preArchiveTasksContent.trimEnd().split('\n').length;
    expect(preArchiveLineCount).toBeGreaterThan(11);
    expect(preArchiveLineCount).toBeLessThanOrEqual(13);

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).toContain('1001-active-task');
    expect(tasksContent).toContain('1002-still-active-task');
    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain('<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->');
    expect(archiveContent).not.toContain('1002-still-active-task');
    expect(archiveContent).toContain('Task Archive');
  });

  it('archives at the hard ceiling when reserve_lines is zero', async () => {
    const repo = await initRepository({
      maxLines: 12,
      reserveLines: 0
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
  });

  it('archives completed snapshots when the terminal state is phrased as is closed', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        `# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e) - Update ${completedAt}: \`CO-221\` is closed.`,
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] archived after closed phrasing.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain('Update 2026-04-13: `CO-221` is closed.');
  });

  it('archives completed snapshots when the header uses implementation complete phrasing', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        `# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e) - Update ${completedAt}: implementation complete for \`CO-221\`.`,
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] archived after implementation-complete phrasing.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain('implementation complete for `CO-221`.');
  });

  it('archives completed snapshots when the header uses completed parenthetical closeout phrasing', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        `# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e) - Update ${completedAt}: completed (bounded closeout recorded with final validation evidence).`,
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] archived after parenthetical completed phrasing.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain(
      'Update 2026-04-13: completed (bounded closeout recorded with final validation evidence).'
    );
  });

  it('archives completed snapshots when the header uses completed with closeout phrasing', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        `# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e) - Update ${completedAt}: completed with final validation evidence.`,
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] archived after completed-with phrasing.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain(
      'Update 2026-04-13: completed with final validation evidence.'
    );
  });

  it('archives completed snapshots when the header uses rework update phrasing', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        `# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e) - Rework Update ${completedAt}: completed with final validation evidence.`,
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] archived after rework-update phrasing.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain(
      'Rework Update 2026-04-13: completed with final validation evidence.'
    );
  });

  it('archives completed snapshots when the dated terminal update appears later in the section', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        '# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e)',
        '',
        `- **Update — ${completedAt}:** \`CO-221\` is complete.`,
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] archived after a later section update line.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain('**Update — 2026-04-13:** `CO-221` is complete.');
  });

  it('does not archive snapshots when completed only appears inside a non-terminal blocker phrase', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        '# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e)',
        '',
        '- Update 2026-04-13: opened to track a non-completed blocker while follow-up validation remains active.',
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [ ] still active',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await expect(
      execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo,
          CODEX_ORCHESTRATOR_OUT_DIR: 'out'
        }
      })
    ).rejects.toThrow(/no eligible tasks can be archived/i);

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    expect(tasksContent).toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
  });

  it('does not archive snapshots when completed is negated as not completed yet', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        '# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e)',
        '',
        '- Update 2026-04-13: not completed yet; QA follow-up remains.',
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [ ] still active',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await expect(
      execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo,
          CODEX_ORCHESTRATOR_OUT_DIR: 'out'
        }
      })
    ).rejects.toThrow(/no eligible tasks can be archived/i);

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    expect(tasksContent).toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
  });

  it('does not treat checklist notes that mention an old update as the latest terminal update', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        '# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e)',
        '',
        '- Update 2026-04-13: reopened for QA follow-up.',
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] Historical note: Update 2026-04-10: completed via the earlier dry-run, but the current lane remains active.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await expect(
      execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo,
          CODEX_ORCHESTRATOR_OUT_DIR: 'out'
        }
      })
    ).rejects.toThrow(/no eligible tasks can be archived/i);

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    expect(tasksContent).toContain('Historical note: Update 2026-04-10: completed via the earlier dry-run');
  });

  it('does not archive status-less snapshots when another task completion is referenced first', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        '# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e)',
        '',
        '- Update 2026-04-13: `1224` completed; current task remains the bounded docs-first lane for the non-interactive handoff shell.',
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] packet inherited from the prior task while the current lane continues.',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await expect(
      execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo,
          CODEX_ORCHESTRATOR_OUT_DIR: 'out'
        }
      })
    ).rejects.toThrow(/no eligible tasks can be archived/i);

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    expect(tasksContent).toContain('`1224` completed; current task remains the bounded docs-first lane');
  });

  it('does not archive snapshots when the latest dated update is non-terminal', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        '# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e)',
        '',
        '- Update 2026-04-10: this lane is complete.',
        '- Update 2026-04-13: reopened for QA follow-up.',
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [ ] still active',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await expect(
      execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo,
          CODEX_ORCHESTRATOR_OUT_DIR: 'out'
        }
      })
    ).rejects.toThrow(/no eligible tasks can be archived/i);

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    expect(tasksContent).toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
  });

  it('uses the latest terminal update date when multiple terminal updates exist', async () => {
    const repo = await initRepository({
      completedSnapshotLines: [
        '# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e)',
        '',
        '- Update 2025-12-31: this lane is complete.',
        '- Update 2026-01-02: `CO-221` is closed.',
        '',
        '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
        '## Checklist Mirror',
        '- [x] closed in 2026',
        '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->'
      ]
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const archive2025 = await readFile(join(repo, 'docs', 'TASKS-archive-2025.md'), 'utf8').catch(
      () => null
    );
    const archive2026 = await readFile(join(repo, 'docs', 'TASKS-archive-2026.md'), 'utf8');

    expect(archive2025).toBeNull();
    expect(archive2026).toContain('Update 2026-01-02: `CO-221` is closed.');
  });

  it('preserves legacy gate-only completion fallback for status-less index rows', async () => {
    const repo = await initRepository({
      completedTaskIndexEntry: {
        gate: {
          status: 'succeeded',
          run_id: '2026-04-13T02-03-04-000Z-completedgate1'
        }
      }
    });

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(
      join(repo, 'docs', `TASKS-archive-${archiveYear}.md`),
      'utf8'
    );

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveContent).not.toContain('1002-still-active-task');
  });

  it('does not archive snapshots when index status is still active despite historical completed_at', async () => {
    const repo = await initRepository({
      completedTaskIndexEntry: {
        status: 'in_progress',
        completed_at: completedAt
      }
    });

    await expect(
      execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo,
          CODEX_ORCHESTRATOR_OUT_DIR: 'out'
        }
      })
    ).rejects.toThrow(/no eligible tasks can be archived/i);

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    expect(tasksContent).toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
  });

  it('reports terminal-looking snapshots blocked by nonterminal index status', async () => {
    const repo = await initRepository({
      completedTaskIndexEntry: {
        status: 'approved'
      }
    });

    await expect(
      execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo,
          CODEX_ORCHESTRATOR_OUT_DIR: 'out'
        }
      })
    ).rejects.toThrow(
      /Terminal-looking snapshots blocked by nonterminal tasks\/index\.json status: linear-6ed6ef11-538e-48f0-936c-8547632bf92e \(status=approved\)/i
    );
  });

  it('does not append duplicate header-only archive sections when the archive already contains the task key', async () => {
    const repo = await initRepository();
    const existingArchivePath = join(repo, 'docs', `TASKS-archive-${archiveYear}.md`);

    await writeFile(
      existingArchivePath,
      [
        `# Task Archive — ${archiveYear}`,
        '',
        `# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e) - Update ${completedAt}: completed`,
        ''
      ].join('\n'),
      'utf8'
    );

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(existingArchivePath, 'utf8');
    const archiveMatches =
      archiveContent.match(/linear-6ed6ef11-538e-48f0-936c-8547632bf92e/g)?.length ?? 0;

    expect(tasksContent).not.toContain('linear-6ed6ef11-538e-48f0-936c-8547632bf92e');
    expect(archiveMatches).toBe(1);
  });

  it('archives enough sections when inserting the archive index consumes extra lines', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'tasks-archive-index-growth-'));
    createdDirs.push(repo);

    await mkdir(join(repo, 'docs'), { recursive: true });
    await mkdir(join(repo, 'tasks'), { recursive: true });

    await writeFile(
      join(repo, 'docs', 'tasks-archive-policy.json'),
      JSON.stringify(
        {
          version: 1,
          max_lines: 8,
          reserve_lines: 2,
          archive_branch: 'task-archives',
          archive_file_pattern: 'docs/TASKS-archive-YYYY.md',
          repo_url: 'https://github.com/example/repo'
        },
        null,
        2
      )
    );
    await writeFile(join(repo, 'tasks', 'index.json'), JSON.stringify({ items: [] }, null, 2), 'utf8');
    await writeFile(
      join(repo, 'docs', 'TASKS.md'),
      [
        '# Task List Snapshot - Completed candidate one (1001-candidate-one) - Update 2026-04-10: completed',
        '',
        '# Task List Snapshot - Completed candidate two (1002-candidate-two) - Update 2026-04-11: completed',
        '',
        '# Task List Snapshot - Completed candidate three (1003-candidate-three) - Update 2026-04-12: completed',
        '',
        '# Task List Snapshot - Active task (1004-active-task)',
        ''
      ].join('\n'),
      'utf8'
    );

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const normalizedLineCount = tasksContent.trimEnd().split('\n').length;
    const remainingCompletedCandidates = [
      '1001-candidate-one',
      '1002-candidate-two',
      '1003-candidate-three'
    ].filter((taskKey) => tasksContent.includes(taskKey));

    expect(tasksContent).toContain('1004-active-task');
    expect(remainingCompletedCandidates).toHaveLength(1);
    expect(normalizedLineCount).toBeLessThanOrEqual(6);
  });

  it('does not archive the structural archive index with an adjacent header-only snapshot', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'tasks-archive-index-adjacent-'));
    createdDirs.push(repo);

    await mkdir(join(repo, 'docs'), { recursive: true });
    await mkdir(join(repo, 'tasks'), { recursive: true });

    await writeFile(
      join(repo, 'docs', 'tasks-archive-policy.json'),
      JSON.stringify(
        {
          version: 1,
          max_lines: 5,
          reserve_lines: 1,
          archive_branch: 'task-archives',
          archive_file_pattern: 'docs/TASKS-archive-YYYY.md',
          repo_url: 'https://github.com/example/repo'
        },
        null,
        2
      )
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '1302',
              title: 'Header-only completed candidate',
              paths: {
                task: 'tasks/tasks-1302-header-only-completed-candidate.md'
              }
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      join(repo, 'docs', 'TASKS.md'),
      [
        '# Task List Snapshot - Header-only completed candidate (1302-header-only-completed-candidate) - Update 2026-04-13: completed',
        '',
        '<!-- tasks-archive-index:begin --> ## Archive index - archived task snapshots live on the task-archives branch. 2026: https://github.com/example/repo/blob/task-archives/docs/TASKS-archive-2026.md <!-- tasks-archive-index:end -->',
        '',
        '# Task List Snapshot - Active task (1303-active-task)',
        ''
      ].join('\n'),
      'utf8'
    );

    await execFileAsync('node', [scriptPath, '--out', 'docs/TASKS-archive-YYYY.md'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const tasksContent = await readFile(join(repo, 'docs', 'TASKS.md'), 'utf8');
    const archiveContent = await readFile(join(repo, 'docs', 'TASKS-archive-2026.md'), 'utf8');
    const normalizedLineCount = tasksContent.trimEnd().split('\n').length;

    expect(tasksContent).toContain('tasks-archive-index:begin');
    expect(tasksContent).toContain('1303-active-task');
    expect(tasksContent).not.toContain('1302-header-only-completed-candidate');
    expect(archiveContent).toContain('1302-header-only-completed-candidate');
    expect(archiveContent).not.toContain('tasks-archive-index:begin');
    expect(normalizedLineCount).toBeLessThanOrEqual(4);
  });
});
