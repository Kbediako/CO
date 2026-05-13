import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'implementation-docs-archive.mjs');

const createdDirs: string[] = [];

type InitOptions = {
  policyOverrides?: Record<string, unknown>;
  registry?: Record<string, unknown>;
  taskOverrides?: Partial<{
    id: string;
    slug: string;
    status: string;
    completed_at: string;
    last_review: string;
    path: string;
    relates_to: string;
    paths: {
      docs?: string;
      task?: string;
      spec?: string;
      agent_task?: string;
      prd?: string;
      action_plan?: string;
      findings?: string;
      docs_review_manifest?: string;
    };
  }>;
};

async function initRepository(options: InitOptions = {}): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'impl-docs-archive-'));
  createdDirs.push(dir);

  await mkdir(join(dir, 'docs'), { recursive: true });
  await mkdir(join(dir, 'tasks'), { recursive: true });
  await mkdir(join(dir, 'tasks', 'specs'), { recursive: true });
  await mkdir(join(dir, '.agent', 'task'), { recursive: true });

  const policy = {
    version: 1,
    archive_branch: 'doc-archives',
    repo_url: 'https://github.com/example/repo',
    retain_days: 0,
    stray_retain_days: 0,
    max_lines: 1,
    archived_cadence_days: 365,
    doc_patterns: ['docs/PRD-*.md'],
    exclude_paths: [],
    allowlist_task_keys: [],
    allowlist_paths: [],
    ...(options.policyOverrides ?? {})
  };

  await writeFile(
    join(dir, 'docs', 'implementation-docs-archive-policy.json'),
    JSON.stringify(policy, null, 2)
  );

  const registry = options.registry ?? { generated_at: '2025-01-01', entries: [] };
  await writeFile(
    join(dir, 'docs', 'docs-freshness-registry.json'),
    JSON.stringify(registry, null, 2)
  );

  const task = {
    id: '9999',
    slug: 'archive-test',
    status: 'succeeded',
    completed_at: '2025-01-01',
    relates_to: 'tasks/tasks-9999-archive-test.md',
    paths: {
      docs: 'docs/PRD-archive-test.md'
    },
    ...(options.taskOverrides ?? {})
  };

  await writeFile(
    join(dir, 'tasks', 'index.json'),
    JSON.stringify(
      {
        items: [task]
      },
      null,
      2
    )
  );

  await writeFile(
    join(dir, 'docs', 'PRD-archive-test.md'),
    '# PRD Archive Test\n\nSome content.\n'
  );

  return dir;
}

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('implementation-docs-archive script', () => {
  it('writes archive payloads before stubs and links to payload paths', async () => {
    const repo = await initRepository();

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const stubPath = join(repo, 'docs', 'PRD-archive-test.md');
    const payloadPath = join(
      repo,
      'out',
      'implementation-docs-archive-automation',
      'docs-archive',
      'docs',
      'PRD-archive-test.md'
    );

    const stubContent = await readFile(stubPath, 'utf8');
    const payloadContent = await readFile(payloadPath, 'utf8');

    expect(stubContent).toContain('<!-- docs-archive:stub -->');
    expect(stubContent).toContain(
      'https://github.com/example/repo/blob/doc-archives/docs/PRD-archive-test.md'
    );
    expect(payloadContent).toContain('# PRD Archive Test');
  });

  it('archives docs when tasks/index marks the task as completed', async () => {
    const repo = await initRepository({
      taskOverrides: {
        status: 'completed',
        completed_at: '2025-01-01'
      }
    });

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const stubContent = await readFile(join(repo, 'docs', 'PRD-archive-test.md'), 'utf8');
    const payloadContent = await readFile(
      join(
        repo,
        'out',
        'implementation-docs-archive-automation',
        'docs-archive',
        'docs',
        'PRD-archive-test.md'
      ),
      'utf8'
    );

    expect(stubContent).toContain('<!-- docs-archive:stub -->');
    expect(payloadContent).toContain('# PRD Archive Test');
  });

  it('writes dry-run self-heal report for terminal task packets without changing source docs', async () => {
    const repo = await initRepository({
      policyOverrides: {
        retain_days: 99999,
        max_lines: 99999
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'docs/PRD-archive-test.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: new Date().toISOString().slice(0, 10),
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        status: 'done',
        completed_at: new Date().toISOString().slice(0, 10)
      }
    });

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'docs-truthfulness-maintenance',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const sourceContent = await readFile(join(repo, 'docs', 'PRD-archive-test.md'), 'utf8');
    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'docs-truthfulness-maintenance',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );

    expect(sourceContent).toContain('# PRD Archive Test');
    expect(sourceContent).not.toContain('<!-- docs-archive:stub -->');
    expect(report.totals.archived).toBe(1);
    expect(report.archived[0]).toMatchObject({
      path: 'docs/PRD-archive-test.md',
      reason: 'terminal_task_lifecycle'
    });
    expect(report.action_path).toMatchObject({
      kind: 'implementation_docs_archive_self_heal_pr',
      dry_run: true,
      action_required: true,
      archive_payload_required: true,
      registry_repair_required: false,
      workflow: '.github/workflows/implementation-docs-archive-automation.yml'
    });
  });

  it('does not archive linked active docs through terminal packet self-heal', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const repo = await initRepository({
      policyOverrides: {
        retain_days: 99999,
        max_lines: 99999,
        doc_patterns: ['docs/PRD-*.md']
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'docs/PRD-archive-test.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: today,
            cadence_days: 30
          },
          {
            path: 'docs/PRD-active-other.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: today,
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        status: 'done',
        completed_at: today
      }
    });
    await writeFile(
      join(repo, 'docs', 'PRD-archive-test.md'),
      '# PRD Archive Test\n\nSee `docs/PRD-active-other.md`.\n'
    );
    await writeFile(join(repo, 'docs', 'PRD-active-other.md'), '# Active Other\n\nStill current.\n');

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'docs-truthfulness-maintenance',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'docs-truthfulness-maintenance',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );
    const archivedPaths = report.archived.map((entry: { path: string }) => entry.path);
    const skippedPaths = report.skipped.map((entry: { path: string }) => entry.path);

    expect(report.totals.archived).toBe(1);
    expect(archivedPaths).toContain('docs/PRD-archive-test.md');
    expect(archivedPaths).not.toContain('docs/PRD-active-other.md');
    expect(skippedPaths).not.toContain('docs/PRD-active-other.md');
  });

  it('writes terminal self-heal actions when terminal task rows omit completed_at', async () => {
    const repo = await initRepository({
      policyOverrides: {
        retain_days: 99999,
        max_lines: 99999
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'docs/PRD-archive-test.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: new Date().toISOString().slice(0, 10),
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        status: 'completed',
        completed_at: undefined,
        last_review: new Date().toISOString().slice(0, 10)
      }
    });

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'docs-truthfulness-maintenance',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'docs-truthfulness-maintenance',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );

    expect(report.totals.archived).toBe(1);
    expect(report.archived[0]).toMatchObject({
      path: 'docs/PRD-archive-test.md',
      reason: 'terminal_task_lifecycle',
      context: {
        completedAt: null
      }
    });
  });

  it('uses timestamp-form completed_at for terminal lifecycle age evidence', async () => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const completedDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const completedDay = completedDate.toISOString().slice(0, 10);
    const repo = await initRepository({
      policyOverrides: {
        retain_days: 99999,
        max_lines: 99999
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'docs/PRD-archive-test.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        status: 'done',
        completed_at: `${completedDay}T06:59:43.056Z`,
        last_review: '2025-01-01'
      }
    });

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'docs-truthfulness-maintenance',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'docs-truthfulness-maintenance',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );

    expect(report.archived[0]).toMatchObject({
      path: 'docs/PRD-archive-test.md',
      reason: 'terminal_task_lifecycle',
      context: {
        completedAt: completedDay,
        ageDays: 3
      }
    });
  });

  it('archives terminal_pending_archive packet rows without waiting for age or size triggers', async () => {
    const repo = await initRepository({
      policyOverrides: {
        retain_days: 99999,
        max_lines: 99999
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'docs/PRD-archive-test.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'terminal_pending_archive',
            last_review: new Date().toISOString().slice(0, 10),
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        status: 'done',
        completed_at: new Date().toISOString().slice(0, 10)
      }
    });

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'docs-truthfulness-maintenance',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'docs-truthfulness-maintenance',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );

    expect(report.totals.archived).toBe(1);
    expect(report.archived[0]).toMatchObject({
      path: 'docs/PRD-archive-test.md',
      reason: 'terminal_task_lifecycle'
    });
  });

  it('archives explicit terminal_pending_archive packet rows even without task-index linkage', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const repo = await initRepository({
      policyOverrides: {
        doc_patterns: ['tasks/tasks-*.md'],
        retain_days: 99999,
        stray_retain_days: 99999,
        max_lines: 99999
      },
      registry: {
        generated_at: today,
        entries: [
          {
            path: 'tasks/tasks-explicit-terminal.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'terminal_pending_archive',
            last_review: today,
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        status: 'in_progress',
        paths: {}
      }
    });

    await writeFile(join(repo, 'tasks', 'tasks-explicit-terminal.md'), '# Explicit Terminal Pending\n');

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'docs-truthfulness-maintenance',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'docs-truthfulness-maintenance',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );

    expect(report.totals.archived).toBe(1);
    expect(report.action_path.action_required).toBe(true);
    expect(report.archived).toEqual([
      expect.objectContaining({
        path: 'tasks/tasks-explicit-terminal.md',
        reason: 'terminal_task_lifecycle',
        context: expect.objectContaining({
          type: 'stray',
          status: 'terminal_pending_archive'
        })
      })
    ]);
  });

  it('does not archive non-packet path fields from terminal task index rows', async () => {
    const manifestPath = '.runs/linear-archive-test/cli/run/manifest.json';
    const repo = await initRepository({
      policyOverrides: {
        retain_days: 0,
        max_lines: 1,
        exclude_paths: ['docs/PRD-archive-test.md']
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: manifestPath,
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        status: 'done',
        completed_at: '2025-01-01',
        paths: {
          docs_review_manifest: manifestPath
        }
      }
    });
    await mkdir(join(repo, '.runs', 'linear-archive-test', 'cli', 'run'), { recursive: true });
    await writeFile(join(repo, manifestPath), '{\n  "run": "evidence"\n}\n');

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'docs-truthfulness-maintenance',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'docs-truthfulness-maintenance',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );

    expect(report.archived.map((entry: { path: string }) => entry.path)).not.toContain(manifestPath);
    expect(report.totals.archived).toBe(0);
  });

  it('archives every indexed terminal task packet surface without relying on markdown cross-links', async () => {
    const repo = await initRepository({
      taskOverrides: {
        status: 'done',
        completed_at: '2025-01-01',
        paths: {
          prd: 'docs/PRD-9999-archive-test.md',
          docs: 'docs/TECH_SPEC-9999-archive-test.md',
          action_plan: 'docs/ACTION_PLAN-9999-archive-test.md',
          task: 'tasks/tasks-9999-archive-test.md',
          spec: 'tasks/specs/9999-archive-test.md',
          agent_task: '.agent/task/9999-archive-test.md'
        }
      },
      policyOverrides: {
        doc_patterns: [
          'docs/PRD-*.md',
          'docs/TECH_SPEC-*.md',
          'docs/ACTION_PLAN-*.md',
          'tasks/tasks-*.md',
          'tasks/specs/*.md',
          '.agent/task/*.md'
        ]
      }
    });
    const packetPaths = [
      'docs/PRD-9999-archive-test.md',
      'docs/TECH_SPEC-9999-archive-test.md',
      'docs/ACTION_PLAN-9999-archive-test.md',
      'tasks/tasks-9999-archive-test.md',
      'tasks/specs/9999-archive-test.md',
      '.agent/task/9999-archive-test.md'
    ];
    for (const relativePath of packetPaths) {
      await writeFile(join(repo, relativePath), `# ${relativePath}\n\nPacket content.\n`);
    }

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    for (const relativePath of packetPaths) {
      const stubContent = await readFile(join(repo, relativePath), 'utf8');
      const payloadContent = await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive', relativePath),
        'utf8'
      );
      expect(stubContent).toContain('<!-- docs-archive:stub -->');
      expect(payloadContent).toContain(`Packet content.`);
    }
  });

  it('archives implementation-docs policy packet families from indexed terminal tasks', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const packetPaths = [
      'docs/PRD_legacy.md',
      'docs/TECH_SPEC_legacy.md',
      'docs/design/PRD-design.md',
      'tasks/legacy-prd-packet.md'
    ];
    const repo = await initRepository({
      taskOverrides: {
        id: 'legacy-packet',
        slug: 'legacy-packet',
        status: 'done',
        completed_at: today,
        path: 'docs/design/PRD-design.md',
        relates_to: 'tasks/legacy-prd-packet.md',
        paths: {
          prd: 'docs/PRD_legacy.md',
          docs: 'docs/TECH_SPEC_legacy.md'
        }
      },
      policyOverrides: {
        retain_days: 99999,
        max_lines: 99999,
        doc_patterns: [
          'docs/PRD_*.md',
          'docs/TECH_SPEC_*.md',
          'docs/design/PRD-*.md',
          'tasks/*-prd-*.md'
        ],
        exclude_paths: ['docs/PRD-archive-test.md']
      },
      registry: {
        generated_at: today,
        entries: packetPaths.map((relativePath) => ({
          path: relativePath,
          owner: 'Codex (top-level agent), Review agent',
          status: 'active',
          last_review: today,
          cadence_days: 30
        }))
      }
    });
    await mkdir(join(repo, 'docs', 'design'), { recursive: true });
    for (const relativePath of packetPaths) {
      await writeFile(join(repo, relativePath), `# ${relativePath}\n\nPacket content.\n`);
    }

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'docs-truthfulness-maintenance',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'docs-truthfulness-maintenance',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );

    expect(report.totals.archived).toBe(4);
    expect(report.archived).toEqual(
      expect.arrayContaining(
        packetPaths.map((relativePath) =>
          expect.objectContaining({
            path: relativePath,
            reason: 'terminal_task_lifecycle'
          })
        )
      )
    );
  });

  it('preserves indexed report-only findings content while archiving payload evidence', async () => {
    const findingsRelativePath = 'docs/findings/linear-archive-test-findings.md';
    const repo = await initRepository({
      taskOverrides: {
        status: 'done',
        completed_at: '2025-01-01',
        paths: {
          docs: 'docs/PRD-archive-test.md',
          findings: findingsRelativePath
        }
      }
    });
    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const findingsBefore = '# Findings\n\nReviewer evidence that should stay readable on main.\n';
    await writeFile(join(repo, findingsRelativePath), findingsBefore);

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const registry = JSON.parse(await readFile(join(repo, 'docs', 'docs-freshness-registry.json'), 'utf8'));
    const findingsEntry = registry.entries.find(
      (entry: { path?: string }) => entry.path === findingsRelativePath
    );
    const payloadContent = await readFile(
      join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive', findingsRelativePath),
      'utf8'
    );

    expect(findingsEntry).toMatchObject({
      path: findingsRelativePath,
      status: 'archived'
    });
    expect(await readFile(join(repo, findingsRelativePath), 'utf8')).toBe(findingsBefore);
    expect(payloadContent).toBe(findingsBefore);
  });

  it('does not re-archive preserved findings after the registry marks them archived', async () => {
    const findingsRelativePath = 'docs/findings/linear-archive-test-findings.md';
    const repo = await initRepository({
      taskOverrides: {
        status: 'done',
        completed_at: '2025-01-01',
        paths: {
          findings: findingsRelativePath
        }
      }
    });
    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const findingsBefore = '# Findings\n\nReviewer evidence that should stay readable on main.\n';
    await writeFile(join(repo, findingsRelativePath), findingsBefore);

    const env = {
      ...process.env,
      MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
      CODEX_ORCHESTRATOR_ROOT: repo,
      CODEX_ORCHESTRATOR_OUT_DIR: 'out'
    };
    await execFileAsync('node', [scriptPath], { cwd: repo, env });
    await execFileAsync('node', [scriptPath], { cwd: repo, env });

    const report = JSON.parse(
      await readFile(
        join(
          repo,
          'out',
          'implementation-docs-archive-automation',
          'docs-archive-report.json'
        ),
        'utf8'
      )
    );

    expect(await readFile(join(repo, findingsRelativePath), 'utf8')).toBe(findingsBefore);
    expect(report.totals.archived).toBe(0);
    expect(report.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: findingsRelativePath,
          reason: 'already_archived_preserved_findings'
        })
      ])
    );
  });

  it('archives stale report-only findings when the linked task is terminal', async () => {
    const repo = await initRepository({
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'docs/findings/9999-archive-test-deliberation.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      }
    });

    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const findingsPath = join(repo, 'docs', 'findings', '9999-archive-test-deliberation.md');
    const findingsBefore = '# Findings\n\nHistorical deliberation.\n';
    await writeFile(findingsPath, findingsBefore);

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const registry = JSON.parse(await readFile(join(repo, 'docs', 'docs-freshness-registry.json'), 'utf8'));
    const findingsEntry = registry.entries.find(
      (entry: { path?: string }) => entry.path === 'docs/findings/9999-archive-test-deliberation.md'
    );
    const payloadContent = await readFile(
      join(
        repo,
        'out',
        'implementation-docs-archive-automation',
        'docs-archive',
        'docs',
        'findings',
        '9999-archive-test-deliberation.md'
      ),
      'utf8'
    );

    expect(findingsEntry).toMatchObject({
      path: 'docs/findings/9999-archive-test-deliberation.md',
      status: 'archived'
    });
    expect(await readFile(findingsPath, 'utf8')).toBe(findingsBefore);
    expect(payloadContent).toBe(findingsBefore);
  });

  it('archives terminal report-only findings matched by task number before stale age', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const findingsRelativePath = 'docs/findings/9999-archive-test-risk-map.md';
    const repo = await initRepository({
      policyOverrides: {
        retain_days: 99999,
        max_lines: 99999
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: findingsRelativePath,
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: today,
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        status: 'done',
        completed_at: today
      }
    });

    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const findingsPath = join(repo, 'docs', 'findings', '9999-archive-test-risk-map.md');
    const findingsBefore = '# Risk Map\n\nCurrent but terminal-task-owned finding.\n';
    await writeFile(findingsPath, findingsBefore);

    await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive-report.json'),
        'utf8'
      )
    );

    expect(await readFile(findingsPath, 'utf8')).toBe(findingsBefore);
    expect(report.archived).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: findingsRelativePath,
          reason: 'terminal_task_lifecycle'
        })
      ])
    );
  });

  it('keeps excluded stale report-only findings active when the linked task is terminal', async () => {
    const repo = await initRepository({
      policyOverrides: {
        exclude_paths: ['docs/findings/9999-archive-test-deliberation.md']
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'docs/findings/9999-archive-test-deliberation.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      }
    });

    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const findingsPath = join(repo, 'docs', 'findings', '9999-archive-test-deliberation.md');
    const findingsBefore = '# Findings\n\nHistorical deliberation.\n';
    await writeFile(findingsPath, findingsBefore);

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const registry = JSON.parse(await readFile(join(repo, 'docs', 'docs-freshness-registry.json'), 'utf8'));
    const findingsEntry = registry.entries.find(
      (entry: { path?: string }) => entry.path === 'docs/findings/9999-archive-test-deliberation.md'
    );

    expect(findingsEntry).toMatchObject({
      path: 'docs/findings/9999-archive-test-deliberation.md',
      status: 'active',
      last_review: '2025-01-01'
    });
    expect(await readFile(findingsPath, 'utf8')).toBe(findingsBefore);
  });

  it('keeps report-only findings active when another item with the same numeric task id is still active', async () => {
    const repo = await initRepository({
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'docs/findings/9999-archive-test-deliberation.md',
            owner: 'Codex (top-level agent), Review agent',
            status: 'active',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      }
    });

    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '9999',
              slug: 'archive-test',
              status: 'succeeded',
              completed_at: '2025-01-01',
              relates_to: 'tasks/tasks-9999-archive-test.md',
              paths: {
                docs: 'docs/PRD-archive-test.md'
              }
            },
            {
              id: '9999',
              slug: 'archive-test-active',
              status: 'in_progress',
              gate: {
                status: 'succeeded'
              },
              relates_to: 'tasks/tasks-9999-archive-test-active.md',
              paths: {
                docs: 'docs/PRD-archive-test-active.md'
              }
            }
          ]
        },
        null,
        2
      )
    );

    await mkdir(join(repo, 'docs', 'findings'), { recursive: true });
    const findingsPath = join(repo, 'docs', 'findings', '9999-archive-test-deliberation.md');
    const findingsBefore = '# Findings\n\nStill active.\n';
    await writeFile(findingsPath, findingsBefore);

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const registry = JSON.parse(await readFile(join(repo, 'docs', 'docs-freshness-registry.json'), 'utf8'));
    const findingsEntry = registry.entries.find(
      (entry: { path?: string }) => entry.path === 'docs/findings/9999-archive-test-deliberation.md'
    );

    expect(findingsEntry).toMatchObject({
      path: 'docs/findings/9999-archive-test-deliberation.md',
      status: 'active',
      last_review: '2025-01-01'
    });
    expect(await readFile(findingsPath, 'utf8')).toBe(findingsBefore);
    await expect(
      readFile(
        join(
          repo,
          'out',
          'implementation-docs-archive-automation',
          'docs-archive',
          'docs',
          'findings',
          '9999-archive-test-deliberation.md'
        ),
        'utf8'
      )
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps docs freshness registry unchanged when no archives are produced', async () => {
    const repo = await initRepository({
      policyOverrides: { retain_days: 99999, max_lines: 99999 }
    });

    const registryPath = join(repo, 'docs', 'docs-freshness-registry.json');
    const before = JSON.parse(await readFile(registryPath, 'utf8'));

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const after = JSON.parse(await readFile(registryPath, 'utf8'));
    expect(after).toEqual(before);
  });

  it('repairs active registry rows when terminal packet sources are already archive stubs', async () => {
    const repo = await initRepository({
      policyOverrides: {
        doc_patterns: ['tasks/tasks-*.md'],
        retain_days: 0,
        max_lines: 1
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'tasks/tasks-9999-archive-test.md',
            owner: 'Codex',
            status: 'active',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        paths: {
          task: 'tasks/tasks-9999-archive-test.md'
        }
      }
    });

    const taskPath = join(repo, 'tasks', 'tasks-9999-archive-test.md');
    const alreadyStubbed = [
      '# Archived Task Packet',
      '',
      '<!-- docs-archive:stub -->',
      '> Archived on 2026-05-01. Full content: https://github.com/example/repo/blob/doc-archives/tasks/tasks-9999-archive-test.md',
      ''
    ].join('\n');
    await writeFile(taskPath, alreadyStubbed);

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive-report.json'),
        'utf8'
      )
    );
    const registry = JSON.parse(await readFile(join(repo, 'docs', 'docs-freshness-registry.json'), 'utf8'));
    const repairedEntry = registry.entries.find(
      (entry: { path?: string }) => entry.path === 'tasks/tasks-9999-archive-test.md'
    );

    expect(report.totals.archived).toBe(0);
    expect(report.totals.registry_repairs).toBe(1);
    expect(report.action_path).toMatchObject({
      action_required: false,
      archive_payload_required: false,
      registry_repair_required: true
    });
    expect(report.registry_repairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tasks/tasks-9999-archive-test.md',
          reason: 'already_stubbed_active_registry'
        })
      ])
    );
    expect(report.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tasks/tasks-9999-archive-test.md',
          reason: 'already_stubbed',
          registry_repaired: true
        })
      ])
    );
    expect(repairedEntry).toMatchObject({
      path: 'tasks/tasks-9999-archive-test.md',
      status: 'archived',
      cadence_days: 365
    });
    expect(await readFile(taskPath, 'utf8')).toBe(alreadyStubbed);
    await expect(
      readFile(
        join(
          repo,
          'out',
          'implementation-docs-archive-automation',
          'docs-archive',
          'tasks',
          'tasks-9999-archive-test.md'
        ),
        'utf8'
      )
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not auto-archive preserved historical stubs for completed task packets', async () => {
    const repo = await initRepository({
      policyOverrides: {
        doc_patterns: ['tasks/tasks-*.md'],
        retain_days: 0,
        max_lines: 1
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'tasks/tasks-9999-archive-test.md',
            status: 'preserved_historical_stub',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        paths: {
          task: 'tasks/tasks-9999-archive-test.md'
        }
      }
    });

    const taskPath = join(repo, 'tasks', 'tasks-9999-archive-test.md');
    const taskContent = '# Historical stub\n\nCanonical key continuity only.\n';
    await writeFile(taskPath, taskContent);

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const registry = JSON.parse(await readFile(join(repo, 'docs', 'docs-freshness-registry.json'), 'utf8'));
    const preservedEntry = registry.entries.find(
      (entry: { path?: string }) => entry.path === 'tasks/tasks-9999-archive-test.md'
    );
    const report = JSON.parse(
      await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive-report.json'),
        'utf8'
      )
    );

    expect(report.totals.archived).toBe(0);
    expect(report.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tasks/tasks-9999-archive-test.md',
          reason: 'preserved_historical_stub'
        })
      ])
    );
    expect(preservedEntry).toMatchObject({
      path: 'tasks/tasks-9999-archive-test.md',
      status: 'preserved_historical_stub',
      last_review: '2025-01-01'
    });
    expect(await readFile(taskPath, 'utf8')).toBe(taskContent);
    await expect(
      readFile(
        join(
          repo,
          'out',
          'implementation-docs-archive-automation',
          'docs-archive',
          'tasks',
          'tasks-9999-archive-test.md'
        ),
        'utf8'
      )
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not auto-archive preserved historical stub stray files', async () => {
    const repo = await initRepository({
      taskOverrides: {
        status: 'in_progress'
      },
      policyOverrides: {
        doc_patterns: ['tasks/tasks-*.md'],
        stray_retain_days: 0,
        max_lines: 1
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'tasks/tasks-linear-stub.md',
            status: 'preserved_historical_stub',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      }
    });

    const strayPath = join(repo, 'tasks', 'tasks-linear-stub.md');
    const strayContent = '# Historical stub\n\nStill authoritative.\n';
    await writeFile(strayPath, strayContent);

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive-report.json'),
        'utf8'
      )
    );

    expect(report.totals.archived).toBe(0);
    expect(report.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tasks/tasks-linear-stub.md',
          reason: 'preserved_historical_stub'
        })
      ])
    );
    expect(await readFile(strayPath, 'utf8')).toBe(strayContent);
    await expect(
      readFile(
        join(
          repo,
          'out',
          'implementation-docs-archive-automation',
          'docs-archive',
          'tasks',
          'tasks-linear-stub.md'
        ),
        'utf8'
      )
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not let ordinary task packets bypass archiving via preserved historical stub status', async () => {
    const repo = await initRepository({
      policyOverrides: {
        doc_patterns: ['tasks/tasks-*.md'],
        retain_days: 0,
        max_lines: 1
      },
      registry: {
        generated_at: '2025-01-01',
        entries: [
          {
            path: 'tasks/tasks-9999-archive-test.md',
            status: 'preserved_historical_stub',
            last_review: '2025-01-01',
            cadence_days: 30
          }
        ]
      },
      taskOverrides: {
        paths: {
          task: 'tasks/tasks-9999-archive-test.md'
        }
      }
    });

    const taskPath = join(repo, 'tasks', 'tasks-9999-archive-test.md');
    await writeFile(taskPath, '# Task Checklist\n\nOrdinary packet content.\n\n# Historical stub\n');

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive-report.json'),
        'utf8'
      )
    );

    expect(report.archived).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tasks/tasks-9999-archive-test.md'
        })
      ])
    );
    expect(report.skipped).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tasks/tasks-9999-archive-test.md',
          reason: 'preserved_historical_stub'
        })
      ])
    );
    const stubContent = await readFile(taskPath, 'utf8');
    expect(stubContent).toContain('<!-- docs-archive:stub -->');
  });

  it('archives linked PRD, TECH_SPEC, and ACTION_PLAN docs for plain star patterns', async () => {
    const repo = await initRepository({
      policyOverrides: {
        doc_patterns: ['docs/PRD-*.md', 'docs/TECH_SPEC-*.md', 'docs/ACTION_PLAN-*.md']
      }
    });

    await writeFile(
      join(repo, 'docs', 'PRD-archive-test.md'),
      [
        '# PRD Archive Test',
        '',
        '- TECH_SPEC: `docs/TECH_SPEC-archive-test.md`',
        '- ACTION_PLAN: `docs/ACTION_PLAN-archive-test.md`',
        ''
      ].join('\n')
    );
    await writeFile(join(repo, 'docs', 'TECH_SPEC-archive-test.md'), '# TECH_SPEC\n\nSome content.\n');
    await writeFile(join(repo, 'docs', 'ACTION_PLAN-archive-test.md'), '# ACTION_PLAN\n\nSome content.\n');

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    for (const relativePath of [
      'docs/PRD-archive-test.md',
      'docs/TECH_SPEC-archive-test.md',
      'docs/ACTION_PLAN-archive-test.md'
    ]) {
      const stubContent = await readFile(join(repo, relativePath), 'utf8');
      const payloadContent = await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive', relativePath),
        'utf8'
      );

      expect(stubContent).toContain('<!-- docs-archive:stub -->');
      expect(payloadContent).toMatch(/^# /m);
    }
  });

  it('archives linked docs when tasks/index uses canonical paths.docs entries', async () => {
    const repo = await initRepository({
      taskOverrides: {
        paths: {
          docs: 'docs/TECH_SPEC-archive-test.md'
        }
      },
      policyOverrides: {
        doc_patterns: ['docs/PRD-*.md', 'docs/TECH_SPEC-*.md', 'docs/ACTION_PLAN-*.md']
      }
    });

    await writeFile(join(repo, 'docs', 'PRD-archive-test.md'), '# PRD\n\nSome content.\n');
    await writeFile(
      join(repo, 'docs', 'TECH_SPEC-archive-test.md'),
      [
        '# TECH_SPEC Archive Test',
        '',
        '- PRD: `docs/PRD-archive-test.md`',
        '- ACTION_PLAN: `docs/ACTION_PLAN-archive-test.md`',
        ''
      ].join('\n')
    );
    await writeFile(join(repo, 'docs', 'ACTION_PLAN-archive-test.md'), '# ACTION_PLAN\n\nSome content.\n');

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    for (const relativePath of [
      'docs/PRD-archive-test.md',
      'docs/TECH_SPEC-archive-test.md',
      'docs/ACTION_PLAN-archive-test.md'
    ]) {
      const stubContent = await readFile(join(repo, relativePath), 'utf8');
      const payloadContent = await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive', relativePath),
        'utf8'
      );

      expect(stubContent).toContain('<!-- docs-archive:stub -->');
      expect(payloadContent).toMatch(/^# /m);
    }
  });

  it('ignores indexed paths that resolve outside the repo root', async () => {
    const repo = await initRepository();
    const outsideDir = await mkdtemp(join(tmpdir(), 'impl-docs-archive-outside-'));
    createdDirs.push(outsideDir);

    const outsideFile = join(outsideDir, 'outside.md');
    const outsideRelative = relative(repo, outsideFile).split(sep).join('/');
    const outsideContent = '# Outside\n\nSensitive content.\n';

    await writeFile(outsideFile, outsideContent);
    await writeFile(
      join(repo, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '9999',
              slug: 'archive-test',
              status: 'succeeded',
              completed_at: '2025-01-01',
              relates_to: 'tasks/tasks-9999-archive-test.md',
              paths: {
                docs: outsideRelative
              }
            }
          ]
        },
        null,
        2
      )
    );

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    expect(await readFile(outsideFile, 'utf8')).toBe(outsideContent);
  });

  it('skips derived task packet symlinks outside the repo before preflight reads', async () => {
    const repo = await initRepository({
      policyOverrides: {
        retain_days: 99999,
        max_lines: 99999
      }
    });
    const outsideDir = await mkdtemp(join(tmpdir(), 'impl-docs-archive-symlink-outside-'));
    createdDirs.push(outsideDir);

    const outsideDocDir = join(outsideDir, 'outside-doc-dir');
    await mkdir(outsideDocDir);
    await symlink(outsideDocDir, join(repo, 'tasks', 'tasks-9999-archive-test.md'));

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    const report = JSON.parse(
      await readFile(
        join(repo, 'out', 'implementation-docs-archive-automation', 'docs-archive-report.json'),
        'utf8'
      )
    );

    expect(report.totals.archived).toBe(0);
    expect(report.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tasks/tasks-9999-archive-test.md',
          reason: 'outside_repo'
        })
      ])
    );
    await expect(
      readFile(
        join(
          repo,
          'out',
          'implementation-docs-archive-automation',
          'docs-archive',
          'tasks',
          'tasks-9999-archive-test.md'
        ),
        'utf8'
      )
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps explicit task packet paths out of stray archiving', async () => {
    const repo = await initRepository({
      taskOverrides: {
        status: 'in_progress',
        paths: {
          docs: 'docs/TECH_SPEC-archive-test.md',
          task: 'tasks/tasks-custom-archive-test.md',
          spec: 'tasks/specs/custom-archive-test.md',
          agent_task: '.agent/task/custom-archive-test.md'
        }
      },
      policyOverrides: {
        doc_patterns: ['tasks/tasks-*.md', 'tasks/specs/*.md', '.agent/task/*.md']
      }
    });

    const packetFiles = [
      ['tasks/tasks-custom-archive-test.md', '# Task Checklist\n\nCustom checklist.\n'],
      ['tasks/specs/custom-archive-test.md', '# TECH_SPEC\n\nCustom spec.\n'],
      ['.agent/task/custom-archive-test.md', '# Agent Task\n\nCustom agent task.\n']
    ] as const;

    for (const [relativePath, content] of packetFiles) {
      await writeFile(join(repo, relativePath), content);
    }

    await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'implementation-docs-archive-automation',
        CODEX_ORCHESTRATOR_ROOT: repo,
        CODEX_ORCHESTRATOR_OUT_DIR: 'out'
      }
    });

    for (const [relativePath, content] of packetFiles) {
      expect(await readFile(join(repo, relativePath), 'utf8')).toBe(content);
    }
  });
});
