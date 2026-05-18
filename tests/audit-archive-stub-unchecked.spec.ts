import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'audit-archive-stub-unchecked.mjs');

const createdDirs: string[] = [];

async function runGit(repo: string, args: string[]) {
  await execFileAsync('git', args, { cwd: repo });
}

async function gitOutput(repo: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: repo });
  return stdout.trim();
}

async function initGitRepo(): Promise<string> {
  const repo = await mkdtemp(join(tmpdir(), 'archive-stub-audit-'));
  createdDirs.push(repo);
  await mkdir(join(repo, 'docs'), { recursive: true });
  await mkdir(join(repo, 'tasks'), { recursive: true });
  await runGit(repo, ['init']);
  await runGit(repo, ['config', 'user.email', 'codex@example.com']);
  await runGit(repo, ['config', 'user.name', 'Codex Test']);
  return repo;
}

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('audit-archive-stub-unchecked script', () => {
  it('fails when a changed archive stub replaces base content with open checklist items', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/ACTION_PLAN-linear-example.md',
              status: 'active',
              last_review: '2026-05-01',
              cadence_days: 30
            }
          ]
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
              id: '20260501-linear-example',
              status: 'in_progress',
              paths: {
                action_plan: 'docs/ACTION_PLAN-linear-example.md'
              }
            }
          ]
        },
        null,
        2
      )
    );
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      '# Action Plan\n\n- [ ] Finish review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      [
        '# Archived Action Plan',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/ACTION_PLAN-linear-example.md',
        ''
      ].join('\n')
    );
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/ACTION_PLAN-linear-example.md',
              status: 'archived',
              last_review: '2026-05-18',
              cadence_days: 365
            }
          ]
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
              id: '20260501-linear-example',
              status: 'done',
              paths: {
                action_plan: 'docs/ACTION_PLAN-linear-example.md'
              }
            }
          ]
        },
        null,
        2
      )
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'stub']);

    let failure: (Error & { stdout?: string }) | null = null;
    try {
      await execFileAsync('node', [scriptPath, '--base', 'HEAD~1', '--format', 'json'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo
        }
      });
    } catch (error) {
      failure = error as Error & { stdout?: string };
    }

    expect(failure).not.toBeNull();
    const report = JSON.parse(failure?.stdout ?? '{}');
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/ACTION_PLAN-linear-example.md',
      unchecked_checklist_items: 1,
      unchecked_checklist_samples: ['- [ ] Finish review handoff before archiving.'],
      registry: {
        status: 'archived',
        last_review: '2026-05-18',
        cadence_days: 365
      },
      task_index: [
        {
          id: '20260501-linear-example',
          status: 'done'
        }
      ]
    });
  });

  it('passes when the changed archive stub replaces closed checklist content', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      '# Action Plan\n\n- [x] Finish review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      [
        '# Archived Action Plan',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/ACTION_PLAN-linear-example.md',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'stub']);

    const { stdout } = await execFileAsync('node', [scriptPath, '--base', 'HEAD~1', '--format', 'json'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo
      }
    });
    const report = JSON.parse(stdout);

    expect(report.findings_count).toBe(0);
  });

  it('fails when a changed archive stub replaces ordered open checklist content', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      '# Action Plan\n\n1. [ ] Finish review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      [
        '# Archived Action Plan',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/ACTION_PLAN-linear-example.md',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'stub']);

    let failure: (Error & { stdout?: string }) | null = null;
    try {
      await execFileAsync('node', [scriptPath, '--base', 'HEAD~1', '--format', 'json'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo
        }
      });
    } catch (error) {
      failure = error as Error & { stdout?: string };
    }

    expect(failure).not.toBeNull();
    const report = JSON.parse(failure?.stdout ?? '{}');
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/ACTION_PLAN-linear-example.md',
      unchecked_checklist_items: 1,
      unchecked_checklist_samples: ['1. [ ] Finish review handoff before archiving.']
    });
  });

  it('fails when a changed packet stub has a linked task checklist with open items', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '20260501-linear-example',
              status: 'done',
              paths: {
                docs: 'docs/TECH_SPEC-linear-example.md',
                task: 'tasks/tasks-linear-example.md'
              }
            }
          ]
        },
        null,
        2
      )
    );
    await writeFile(
      join(repo, 'docs', 'TECH_SPEC-linear-example.md'),
      '# Technical Spec\n\nNo local checklist in this doc.\n'
    );
    await writeFile(
      join(repo, 'tasks', 'tasks-linear-example.md'),
      '# Task Checklist\n\n- [ ] PR ready-review drain completed.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'TECH_SPEC-linear-example.md'),
      [
        '# Archived Technical Spec',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/TECH_SPEC-linear-example.md',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'stub']);

    let failure: (Error & { stdout?: string }) | null = null;
    try {
      await execFileAsync('node', [scriptPath, '--base', 'HEAD~1', '--format', 'json'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo
        }
      });
    } catch (error) {
      failure = error as Error & { stdout?: string };
    }

    expect(failure).not.toBeNull();
    const report = JSON.parse(failure?.stdout ?? '{}');
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/TECH_SPEC-linear-example.md',
      linked_unchecked_checklists: [
        {
          path: 'tasks/tasks-linear-example.md',
          task_id: '20260501-linear-example',
          task_status: 'done',
          unchecked_checklist_items: 1,
          unchecked_checklist_samples: ['- [ ] PR ready-review drain completed.']
        }
      ]
    });
  });

  it('fails when a changed packet stub is linked to an open top-level task path', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '20260501-linear-example',
              status: 'done',
              path: 'tasks/tasks-linear-example.md',
              paths: {
                docs: 'docs/TECH_SPEC-linear-example.md'
              }
            }
          ]
        },
        null,
        2
      )
    );
    await writeFile(
      join(repo, 'docs', 'TECH_SPEC-linear-example.md'),
      '# Technical Spec\n\nNo local checklist in this doc.\n'
    );
    await writeFile(
      join(repo, 'tasks', 'tasks-linear-example.md'),
      '# Task Checklist\n\n- [ ] PR ready-review drain completed.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'TECH_SPEC-linear-example.md'),
      [
        '# Archived Technical Spec',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/TECH_SPEC-linear-example.md',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'stub']);

    let failure: (Error & { stdout?: string }) | null = null;
    try {
      await execFileAsync('node', [scriptPath, '--base', 'HEAD~1', '--format', 'json'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo
        }
      });
    } catch (error) {
      failure = error as Error & { stdout?: string };
    }

    expect(failure).not.toBeNull();
    const report = JSON.parse(failure?.stdout ?? '{}');
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/TECH_SPEC-linear-example.md',
      linked_unchecked_checklists: [
        {
          path: 'tasks/tasks-linear-example.md',
          task_id: '20260501-linear-example',
          task_status: 'done',
          unchecked_checklist_items: 1,
          unchecked_checklist_samples: ['- [ ] PR ready-review drain completed.']
        }
      ]
    });
  });

  it('fails when the same diff removes the task-index checklist link for a changed stub', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '20260501-linear-example',
              status: 'done',
              paths: {
                docs: 'docs/TECH_SPEC-linear-example.md',
                task: 'tasks/tasks-linear-example.md'
              }
            }
          ]
        },
        null,
        2
      )
    );
    await writeFile(
      join(repo, 'docs', 'TECH_SPEC-linear-example.md'),
      '# Technical Spec\n\nNo local checklist in this doc.\n'
    );
    await writeFile(
      join(repo, 'tasks', 'tasks-linear-example.md'),
      '# Task Checklist\n\n- [ ] PR ready-review drain completed.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'TECH_SPEC-linear-example.md'),
      [
        '# Archived Technical Spec',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/TECH_SPEC-linear-example.md',
        ''
      ].join('\n')
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '20260501-linear-example',
              status: 'done',
              paths: {
                docs: 'docs/TECH_SPEC-linear-example.md'
              }
            }
          ]
        },
        null,
        2
      )
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'stub and drop task link']);

    let failure: (Error & { stdout?: string }) | null = null;
    try {
      await execFileAsync('node', [scriptPath, '--base', 'HEAD~1', '--format', 'json'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo
        }
      });
    } catch (error) {
      failure = error as Error & { stdout?: string };
    }

    expect(failure).not.toBeNull();
    const report = JSON.parse(failure?.stdout ?? '{}');
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/TECH_SPEC-linear-example.md',
      linked_unchecked_checklists: [
        {
          path: 'tasks/tasks-linear-example.md',
          task_id: '20260501-linear-example',
          task_status: 'done',
          unchecked_checklist_items: 1,
          unchecked_checklist_samples: ['- [ ] PR ready-review drain completed.']
        }
      ]
    });
  });

  it('uses the merge-base content when the base ref advanced after branch cut', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      '# Action Plan\n\n- [ ] Finish review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);
    const trunk = await gitOutput(repo, ['branch', '--show-current']);

    await runGit(repo, ['checkout', '-b', 'feature']);
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      [
        '# Archived Action Plan',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/ACTION_PLAN-linear-example.md',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'stub']);

    await runGit(repo, ['checkout', trunk]);
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      '# Action Plan\n\n- [x] Finish review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'close checklist on trunk']);
    const trunkTip = await gitOutput(repo, ['rev-parse', trunk]);

    await runGit(repo, ['checkout', 'feature']);

    let failure: (Error & { stdout?: string }) | null = null;
    try {
      await execFileAsync('node', [scriptPath, '--base', trunk, '--format', 'json'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo
        }
      });
    } catch (error) {
      failure = error as Error & { stdout?: string };
    }

    expect(failure).not.toBeNull();
    const report = JSON.parse(failure?.stdout ?? '{}');
    expect(report.base).toBe(trunk);
    expect(report.comparison_base).not.toBe(trunkTip);
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/ACTION_PLAN-linear-example.md',
      unchecked_checklist_samples: ['- [ ] Finish review handoff before archiving.']
    });
  });

  it('fails before commit when a staged archive stub replaces open checklist content', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      '# Action Plan\n\n- [ ] Finish review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      [
        '# Archived Action Plan',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/ACTION_PLAN-linear-example.md',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', 'docs/ACTION_PLAN-linear-example.md']);

    let failure: (Error & { stdout?: string }) | null = null;
    try {
      await execFileAsync('node', [scriptPath, '--base', 'HEAD', '--format', 'json'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo
        }
      });
    } catch (error) {
      failure = error as Error & { stdout?: string };
    }

    expect(failure).not.toBeNull();
    const report = JSON.parse(failure?.stdout ?? '{}');
    expect(report.changed_files).toBe(1);
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/ACTION_PLAN-linear-example.md',
      unchecked_checklist_items: 1
    });
  });

  it('fails when an archive stub is staged even if the worktree was edited back', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      '# Action Plan\n\n- [ ] Finish review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      [
        '# Archived Action Plan',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/ACTION_PLAN-linear-example.md',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', 'docs/ACTION_PLAN-linear-example.md']);
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      '# Action Plan\n\nWorktree no longer contains an archive stub.\n'
    );

    let failure: (Error & { stdout?: string }) | null = null;
    try {
      await execFileAsync('node', [scriptPath, '--base', 'HEAD', '--format', 'json'], {
        cwd: repo,
        env: {
          ...process.env,
          CODEX_ORCHESTRATOR_ROOT: repo
        }
      });
    } catch (error) {
      failure = error as Error & { stdout?: string };
    }

    expect(failure).not.toBeNull();
    const report = JSON.parse(failure?.stdout ?? '{}');
    expect(report.changed_files).toBe(1);
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/ACTION_PLAN-linear-example.md',
      unchecked_checklist_items: 1
    });
  });
});
