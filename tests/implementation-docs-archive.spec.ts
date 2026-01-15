import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    path: string;
  }>;
};

async function initRepository(options: InitOptions = {}): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'impl-docs-archive-'));
  createdDirs.push(dir);

  await mkdir(join(dir, 'docs'), { recursive: true });
  await mkdir(join(dir, 'tasks'), { recursive: true });

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
    path: 'docs/PRD-archive-test.md',
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
});
