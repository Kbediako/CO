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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/ACTION_PLAN-linear-example.md',
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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/ACTION_PLAN-linear-example.md',
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

  it('ignores archive stub marker examples inside fenced code blocks', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(join(repo, 'docs', 'example.md'), '# Example\n\nThis document explains archive stubs.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'example.md'),
      [
        '# Example',
        '',
        'Archive stubs use this shape:',
        '',
        '```md',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/example.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/example.md',
        '```',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'document stub format']);

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

  it('fails when a registry-only archive hides a linked open checklist packet', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'tasks/specs/linear-example.md',
              status: 'active',
              last_review: '2026-05-01',
              cadence_days: 30
            },
            {
              path: 'tasks/tasks-linear-example.md',
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
              id: 'linear-example',
              paths: {
                spec: 'tasks/specs/linear-example.md',
                task: 'tasks/tasks-linear-example.md'
              }
            }
          ]
        },
        null,
        2
      )
    );
    await mkdir(join(repo, 'tasks', 'specs'), { recursive: true });
    await writeFile(
      join(repo, 'tasks', 'specs', 'linear-example.md'),
      ['---', 'status: in_progress', 'last_review: 2026-05-01', '---', '', '# Spec', ''].join('\n')
    );
    await writeFile(
      join(repo, 'tasks', 'tasks-linear-example.md'),
      '# Checklist\n\n- [ ] Complete review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'tasks/specs/linear-example.md',
              status: 'archived',
              last_review: '2026-05-18',
              cadence_days: 365
            },
            {
              path: 'tasks/tasks-linear-example.md',
              status: 'active',
              last_review: '2026-05-18',
              cadence_days: 30
            }
          ]
        },
        null,
        2
      )
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'archive registry only']);

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
      path: 'tasks/specs/linear-example.md',
      registry_archive_without_stub: true,
      active_source_reasons: expect.arrayContaining([
        'frontmatter status in_progress',
        'linked checklist has unchecked items'
      ]),
      linked_unchecked_checklists: [
        expect.objectContaining({
          path: 'tasks/tasks-linear-example.md',
          unchecked_checklist_items: 1,
          unchecked_checklist_samples: ['- [ ] Complete review handoff before archiving.']
        })
      ]
    });
  });

  it('fails when a registry-only archive hides a legacy tasks[] linked open checklist packet', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'tasks/specs/linear-legacy-example.md',
              status: 'active',
              last_review: '2026-05-01',
              cadence_days: 30
            },
            {
              path: 'tasks/tasks-linear-legacy-example.md',
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
          items: [],
          tasks: [
            {
              id: 'linear-legacy-example',
              paths: {
                spec: 'tasks/specs/linear-legacy-example.md',
                task: 'tasks/tasks-linear-legacy-example.md'
              }
            }
          ]
        },
        null,
        2
      )
    );
    await mkdir(join(repo, 'tasks', 'specs'), { recursive: true });
    await writeFile(
      join(repo, 'tasks', 'specs', 'linear-legacy-example.md'),
      ['---', 'status: in_progress', 'last_review: 2026-05-01', '---', '', '# Spec', ''].join('\n')
    );
    await writeFile(
      join(repo, 'tasks', 'tasks-linear-legacy-example.md'),
      '# Checklist\n\n- [ ] Complete legacy review handoff before archiving.\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'tasks/specs/linear-legacy-example.md',
              status: 'archived',
              last_review: '2026-05-18',
              cadence_days: 365
            },
            {
              path: 'tasks/tasks-linear-legacy-example.md',
              status: 'active',
              last_review: '2026-05-18',
              cadence_days: 30
            }
          ]
        },
        null,
        2
      )
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'archive registry only']);

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
      path: 'tasks/specs/linear-legacy-example.md',
      registry_archive_without_stub: true,
      active_source_reasons: expect.arrayContaining([
        'frontmatter status in_progress',
        'linked checklist has unchecked items'
      ]),
      linked_unchecked_checklists: [
        expect.objectContaining({
          path: 'tasks/tasks-linear-legacy-example.md',
          unchecked_checklist_items: 1,
          unchecked_checklist_samples: ['- [ ] Complete legacy review handoff before archiving.']
        })
      ]
    });
  });

  it('fails when a registry-only archive hides normal document content without packet hints', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/guide.md',
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
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(join(repo, 'docs', 'guide.md'), '# Guide\n\nCurrent implementation guidance.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/guide.md',
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
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'archive registry only']);

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
      path: 'docs/guide.md',
      registry_archive_without_stub: true,
      active_source_reasons: ['registry status active -> archived without valid stub'],
      unchecked_checklist_items: 0,
      linked_unchecked_checklists: []
    });
  });

  it('fails when a staged registry-only archive is hidden by the worktree registry', async () => {
    const repo = await initGitRepo();
    const activeRegistry = {
      entries: [
        {
          path: 'docs/guide.md',
          status: 'active',
          last_review: '2026-05-01',
          cadence_days: 30
        }
      ]
    };
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(join(repo, 'docs', 'guide.md'), '# Guide\n\nCurrent implementation guidance.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/guide.md',
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
    await runGit(repo, ['add', 'docs/docs-freshness-registry.json']);
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
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
      path: 'docs/guide.md',
      registry_archive_without_stub: true,
      active_source_reasons: ['registry status active -> archived without valid stub'],
      registry: {
        status: 'archived',
        last_review: '2026-05-18',
        cadence_days: 365
      }
    });
  });

  it('fails when a staged registry-only archive is paired only with an unstaged valid stub', async () => {
    const repo = await initGitRepo();
    const activeRegistry = {
      entries: [
        {
          path: 'docs/guide.md',
          status: 'active',
          last_review: '2026-05-01',
          cadence_days: 30
        }
      ]
    };
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(join(repo, 'docs', 'guide.md'), '# Guide\n\nCurrent implementation guidance.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/guide.md',
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
    await runGit(repo, ['add', 'docs/docs-freshness-registry.json']);
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
    );
    await writeFile(
      join(repo, 'docs', 'guide.md'),
      [
        '# Archived Guide',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/guide.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/guide.md',
        ''
      ].join('\n')
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
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/guide.md',
      registry_archive_without_stub: true,
      active_source_reasons: ['registry status active -> archived without valid stub'],
      registry: {
        status: 'archived',
        last_review: '2026-05-18',
        cadence_days: 365
      }
    });
  });

  it('fails when an unstaged registry archive is paired only with a staged valid stub', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/guide.md',
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
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(join(repo, 'docs', 'guide.md'), '# Guide\n\nCurrent implementation guidance.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/guide.md',
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
      join(repo, 'docs', 'guide.md'),
      [
        '# Archived Guide',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/guide.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/guide.md',
        ''
      ].join('\n')
    );
    await runGit(repo, ['add', 'docs/docs-freshness-registry.json', 'docs/guide.md']);
    await writeFile(join(repo, 'docs', 'guide.md'), '# Guide\n\nWorktree no longer has a stub.\n');

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
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/guide.md',
      registry_archive_without_stub: true,
      active_source_reasons: ['registry status active -> archived without valid stub'],
      registry: {
        status: 'archived',
        last_review: '2026-05-18',
        cadence_days: 365
      }
    });
  });

  it('passes when a staged report-only archive is paired with a staged docs catalog update', async () => {
    const repo = await initGitRepo();
    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const activeRegistry = {
      entries: [
        {
          path: 'docs/findings/research.md',
          status: 'active',
          last_review: '2026-05-01',
          cadence_days: 30
        }
      ]
    };
    const referenceCatalog = {
      version: 1,
      classes: {
        reference: {
          label: 'Reference',
          report_order: 1
        },
        report_only: {
          label: 'Report Only',
          report_order: 2
        }
      },
      patterns: [
        {
          glob: 'docs/findings/**/*.md',
          status: 'active',
          doc_class: 'reference'
        }
      ]
    };
    const reportOnlyCatalog = {
      ...referenceCatalog,
      patterns: [
        {
          glob: 'docs/findings/**/*.md',
          status: 'active',
          doc_class: 'report_only'
        }
      ]
    };
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
    );
    await writeFile(join(repo, 'docs', 'docs-catalog.json'), JSON.stringify(referenceCatalog, null, 2));
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(join(repo, 'docs', 'findings', 'research.md'), '# Findings\n\nHistorical evidence.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/findings/research.md',
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
    await writeFile(join(repo, 'docs', 'docs-catalog.json'), JSON.stringify(reportOnlyCatalog, null, 2));
    await runGit(repo, ['add', 'docs/docs-freshness-registry.json', 'docs/docs-catalog.json']);
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
    );
    await writeFile(join(repo, 'docs', 'docs-catalog.json'), JSON.stringify(referenceCatalog, null, 2));

    const { stdout } = await execFileAsync('node', [scriptPath, '--base', 'HEAD', '--format', 'json'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo
      }
    });
    const report = JSON.parse(stdout);

    expect(report.findings_count).toBe(0);
  });

  it('fails when a staged registry archive is paired only with an unstaged report-only catalog', async () => {
    const repo = await initGitRepo();
    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/findings/research.md',
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
    await writeFile(join(repo, 'tasks', 'index.json'), JSON.stringify({ items: [] }, null, 2));
    await writeFile(join(repo, 'docs', 'findings', 'research.md'), '# Findings\n\nHistorical evidence.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/findings/research.md',
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
    await runGit(repo, ['add', 'docs/docs-freshness-registry.json']);
    await writeFile(
      join(repo, 'docs', 'docs-catalog.json'),
      JSON.stringify(
        {
          version: 1,
          classes: {
            report_only: {
              label: 'Report Only',
              report_order: 1
            }
          },
          patterns: [
            {
              glob: 'docs/findings/**/*.md',
              status: 'active',
              doc_class: 'report_only'
            }
          ]
        },
        null,
        2
      )
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
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/findings/research.md',
      registry_archive_without_stub: true,
      active_source_reasons: ['registry status active -> archived without valid stub']
    });
  });

  it('fails when an unstaged registry archive deletes its same-source report-only catalog', async () => {
    const repo = await initGitRepo();
    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/findings/research.md',
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
      join(repo, 'docs', 'docs-catalog.json'),
      JSON.stringify(
        {
          version: 1,
          classes: {
            report_only: {
              label: 'Report Only',
              report_order: 1
            }
          },
          patterns: [
            {
              glob: 'docs/findings/**/*.md',
              status: 'active',
              doc_class: 'report_only'
            }
          ]
        },
        null,
        2
      )
    );
    await writeFile(join(repo, 'tasks', 'index.json'), JSON.stringify({ items: [] }, null, 2));
    await writeFile(join(repo, 'docs', 'findings', 'research.md'), '# Findings\n\nHistorical evidence.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/findings/research.md',
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
    await rm(join(repo, 'docs', 'docs-catalog.json'));

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
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/findings/research.md',
      registry_archive_without_stub: true,
      active_source_reasons: ['registry status active -> archived without valid stub']
    });
  });

  it('fails when an invalid worktree archive shares a path with a staged report-only archive', async () => {
    const repo = await initGitRepo();
    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const activeRegistry = {
      entries: [
        {
          path: 'docs/findings/research.md',
          status: 'active',
          last_review: '2026-05-01',
          cadence_days: 30
        }
      ]
    };
    const referenceCatalog = {
      version: 1,
      classes: {
        reference: {
          label: 'Reference',
          report_order: 1
        },
        report_only: {
          label: 'Report Only',
          report_order: 2
        }
      },
      patterns: [
        {
          glob: 'docs/findings/**/*.md',
          status: 'active',
          doc_class: 'reference'
        }
      ]
    };
    const reportOnlyCatalog = {
      ...referenceCatalog,
      patterns: [
        {
          glob: 'docs/findings/**/*.md',
          status: 'active',
          doc_class: 'report_only'
        }
      ]
    };
    const archivedRegistry = {
      entries: [
        {
          path: 'docs/findings/research.md',
          status: 'archived',
          last_review: '2026-05-18',
          cadence_days: 365
        }
      ]
    };
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
    );
    await writeFile(join(repo, 'docs', 'docs-catalog.json'), JSON.stringify(referenceCatalog, null, 2));
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(join(repo, 'docs', 'findings', 'research.md'), '# Findings\n\nHistorical evidence.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(archivedRegistry, null, 2)
    );
    await writeFile(join(repo, 'docs', 'docs-catalog.json'), JSON.stringify(reportOnlyCatalog, null, 2));
    await runGit(repo, ['add', 'docs/docs-freshness-registry.json', 'docs/docs-catalog.json']);
    await writeFile(join(repo, 'docs', 'docs-catalog.json'), JSON.stringify(referenceCatalog, null, 2));

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
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/findings/research.md',
      registry_archive_without_stub: true,
      active_source_reasons: ['registry status active -> archived without valid stub'],
      registry: {
        status: 'archived',
        last_review: '2026-05-18',
        cadence_days: 365
      }
    });
  });

  it('passes when a staged report-only archive is paired with a staged terminal task index', async () => {
    const repo = await initGitRepo();
    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const activeRegistry = {
      entries: [
        {
          path: 'docs/findings/research.md',
          status: 'active',
          last_review: '2026-05-01',
          cadence_days: 30
        }
      ]
    };
    const docsCatalog = {
      version: 1,
      classes: {
        report_only: {
          label: 'Report Only',
          report_order: 1
        }
      },
      patterns: [
        {
          glob: 'docs/findings/**/*.md',
          status: 'active',
          doc_class: 'report_only'
        }
      ]
    };
    const openTaskIndex = {
      items: [
        {
          id: 'linear-example',
          status: 'in_progress',
          paths: {
            doc: 'docs/findings/research.md'
          }
        }
      ]
    };
    const doneTaskIndex = {
      items: [
        {
          id: 'linear-example',
          status: 'done',
          paths: {
            doc: 'docs/findings/research.md'
          }
        }
      ]
    };
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
    );
    await writeFile(join(repo, 'docs', 'docs-catalog.json'), JSON.stringify(docsCatalog, null, 2));
    await writeFile(join(repo, 'tasks', 'index.json'), JSON.stringify(openTaskIndex, null, 2));
    await writeFile(join(repo, 'docs', 'findings', 'research.md'), '# Findings\n\nHistorical evidence.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/findings/research.md',
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
    await writeFile(join(repo, 'tasks', 'index.json'), JSON.stringify(doneTaskIndex, null, 2));
    await runGit(repo, ['add', 'docs/docs-freshness-registry.json', 'tasks/index.json']);
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(activeRegistry, null, 2)
    );
    await writeFile(join(repo, 'tasks', 'index.json'), JSON.stringify(openTaskIndex, null, 2));

    const { stdout } = await execFileAsync('node', [scriptPath, '--base', 'HEAD', '--format', 'json'], {
      cwd: repo,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repo
      }
    });
    const report = JSON.parse(stdout);

    expect(report.findings_count).toBe(0);
  });

  it('fails when a registry-only archive deletes source content with open checklist items', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/ACTION_PLAN-x.md',
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
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-x.md'),
      '# Action Plan\n\n- [ ] still open\n'
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await rm(join(repo, 'docs', 'ACTION_PLAN-x.md'));
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/ACTION_PLAN-x.md',
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
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'delete and archive']);

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
      path: 'docs/ACTION_PLAN-x.md',
      registry_archive_without_stub: true,
      active_source_reasons: ['registry status active -> archived without valid stub'],
      unchecked_checklist_items: 1,
      unchecked_checklist_samples: ['- [ ] still open']
    });
  });

  it('allows registry-only archive for cataloged report-only preserved source content', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-catalog.json'),
      JSON.stringify(
        {
          version: 1,
          classes: {
            report_only: {
              label: 'Report Only',
              report_order: 220
            }
          },
          patterns: [
            {
              glob: 'docs/findings/**/*.md',
              status: 'active',
              doc_class: 'report_only'
            }
          ]
        },
        null,
        2
      )
    );
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/findings/research.md',
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
      JSON.stringify({ items: [] }, null, 2)
    );
    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    await writeFile(join(repo, 'docs', 'findings', 'research.md'), '# Findings\n\nHistorical evidence.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          entries: [
            {
              path: 'docs/findings/research.md',
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
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'archive report-only registry row']);

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

  it('fails when a changed archive stub has invalid metadata even without open checklist items', async () => {
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
        '',
        '- Archive branch:',
        '- Archive path: docs/ACTION_PLAN-linear-example.md',
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
      invalid_archive_stub_metadata: true,
      unchecked_checklist_items: 0
    });
    expect(report.findings[0].archive_stub_metadata_errors).toContain('archive branch must be non-empty');
  });

  it('fails when a newly added archive stub has invalid metadata', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-new.md'),
      [
        '# Archived Action Plan',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/ACTION_PLAN-new.md',
        '',
        '- Archive branch:',
        '- Archive path: docs/ACTION_PLAN-new.md',
        ''
      ].join('\n')
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
    expect(report.findings_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      path: 'docs/ACTION_PLAN-new.md',
      invalid_archive_stub_metadata: true,
      unchecked_checklist_items: 0
    });
    expect(report.findings[0].archive_stub_metadata_errors).toContain('archive branch must be non-empty');
  });

  it('reports archive path mismatches with actionable metadata errors', async () => {
    const repo = await initGitRepo();
    await writeFile(
      join(repo, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify({ entries: [] }, null, 2)
    );
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }, null, 2)
    );
    await writeFile(join(repo, 'docs', 'ACTION_PLAN-linear-example.md'), '# Action Plan\n\n- [x] Done.\n');
    await runGit(repo, ['add', '.']);
    await runGit(repo, ['commit', '-m', 'base']);

    await writeFile(
      join(repo, 'docs', 'ACTION_PLAN-linear-example.md'),
      [
        '# Archived Action Plan',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-05-18. Full content: https://github.com/example/repo/blob/doc-archives/docs/ACTION_PLAN-other.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/ACTION_PLAN-other.md',
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
    expect(report.findings[0].archive_stub_metadata_errors).toContain(
      'archive path must match the current file path'
    );
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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/ACTION_PLAN-linear-example.md',
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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/TECH_SPEC-linear-example.md',
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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/TECH_SPEC-linear-example.md',
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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/TECH_SPEC-linear-example.md',
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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/ACTION_PLAN-linear-example.md',
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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/ACTION_PLAN-linear-example.md',
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
        '',
        '- Archive branch: doc-archives',
        '- Archive path: docs/ACTION_PLAN-linear-example.md',
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
