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
      `# Task List Snapshot - Completed linear archive candidate (linear-6ed6ef11-538e-48f0-936c-8547632bf92e) - Update ${completedAt}: completed`,
      '',
      '<!-- docs-sync:begin linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
      '## Checklist Mirror',
      '- [x] archived by proactive reserve restoration.',
      '<!-- docs-sync:end linear-6ed6ef11-538e-48f0-936c-8547632bf92e -->',
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
    const repo = await initRepository();

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
});
