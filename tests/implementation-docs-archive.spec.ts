import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    relates_to: string;
    paths: {
      docs?: string;
      task?: string;
      spec?: string;
      agent_task?: string;
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
