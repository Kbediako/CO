import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { join, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import { writeDoctorIssueLog } from '../src/cli/doctorIssueLog.js';
import type { DoctorResult } from '../src/cli/doctor.js';

const doctor: DoctorResult = {
  status: 'ok',
  missing: [],
  dependencies: [],
  devtools: {
    status: 'ok',
    skill: { name: 'chrome-devtools', status: 'ok', path: '/tmp/skill' },
    config: { status: 'ok', path: '/tmp/config' },
    enablement: []
  },
  codex_cli: {
    active: { command: 'codex', managed_opt_in: false },
    managed: {
      status: 'missing',
      config: { path: '/tmp/config.toml' },
      binary: { status: 'missing', path: '/tmp/codex' },
      install: undefined
    }
  },
  collab: { status: 'ok', enabled: true, feature_key: 'multi_agent', enablement: [] },
  cloud: { status: 'ok', env_id_configured: true, branch: null, fallback_policy: 'allow', enablement: [] },
  delegation: { status: 'ok', config: { status: 'ok', path: '/tmp/config.toml' }, enablement: [] }
};

describe('repro', () => {
  it('picks newest run across tasks when task filter omitted', async () => {
    const root = await mkdtemp(join(tmpdir(), 'issue-log-task-'));
    const runsRoot = join(root, '.runs');
    const outRoot = join(root, 'out');
    await mkdir(join(runsRoot, 'task-a', 'cli', 'run-a'), { recursive: true });
    await mkdir(join(runsRoot, 'task-b', 'cli', 'run-b'), { recursive: true });
    await mkdir(outRoot, { recursive: true });
    await writeFile(join(runsRoot, 'task-a', 'cli', 'run-a', 'manifest.json'), JSON.stringify({
      task_id: 'task-a',
      run_id: 'run-a',
      pipeline_id: 'diagnostics',
      status: 'succeeded',
      started_at: '2026-02-19T00:00:00.000Z'
    }), 'utf8');
    await writeFile(join(runsRoot, 'task-b', 'cli', 'run-b', 'manifest.json'), JSON.stringify({
      task_id: 'task-b',
      run_id: 'run-b',
      pipeline_id: 'diagnostics',
      status: 'failed',
      started_at: '2026-02-19T01:00:00.000Z'
    }), 'utf8');

    const result = await writeDoctorIssueLog({
      doctor,
      cwd: root,
      issueTitle: 'x',
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: root,
        CODEX_ORCHESTRATOR_RUNS_DIR: runsRoot,
        CODEX_ORCHESTRATOR_OUT_DIR: outRoot,
        MCP_RUNNER_TASK_ID: 'task-a'
      }
    });
    await rm(root, { recursive: true, force: true });

    expect(result.run_context?.task_id).toBe('task-b');
    expect(result.bundle_path).toContain('task-b');
  });

  it('resolves repo-level runs/out paths when issue logging from nested cwd', async () => {
    const root = await mkdtemp(join(tmpdir(), 'issue-log-subdir-root-'));
    const nestedCwd = join(root, 'packages', 'app');
    await mkdir(join(root, 'tasks'), { recursive: true });
    await mkdir(join(root, '.runs', 'task-a', 'cli', 'run-a'), { recursive: true });
    await mkdir(join(root, 'out'), { recursive: true });
    await mkdir(nestedCwd, { recursive: true });
    await writeFile(
      join(root, 'tasks', 'index.json'),
      JSON.stringify({ items: [] }),
      'utf8'
    );
    await writeFile(
      join(root, '.runs', 'task-a', 'cli', 'run-a', 'manifest.json'),
      JSON.stringify({
        task_id: 'task-a',
        run_id: '2026-02-19T00-00-00-000Z-manual',
        pipeline_id: 'diagnostics',
        status: 'succeeded',
        started_at: '2026-02-19T00:00:00.000Z'
      }),
      'utf8'
    );

    const result = await writeDoctorIssueLog({
      doctor,
      cwd: nestedCwd,
      issueTitle: 'nested',
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'task-a'
      }
    });

    const issueLogAbsolute = resolvePath(nestedCwd, result.issue_log_path);
    const bundleAbsolute = resolvePath(nestedCwd, result.bundle_path);
    await access(issueLogAbsolute);
    await access(bundleAbsolute);
    await rm(root, { recursive: true, force: true });

    expect(result.run_context?.task_id).toBe('task-a');
    expect(issueLogAbsolute).toBe(join(root, 'docs', 'codex-orchestrator-issues.md'));
    expect(bundleAbsolute).toContain(join(root, 'out', 'task-a', 'doctor', 'issue-bundles'));
  });

  it('does not escape to parent workspaces when nested repo has its own git boundary', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'issue-log-parent-root-'));
    const childRepo = join(parent, 'downstream-repo');
    const nestedCwd = join(childRepo, 'packages', 'app');
    await mkdir(join(parent, 'tasks'), { recursive: true });
    await writeFile(join(parent, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    await mkdir(join(parent, '.runs', 'parent-task', 'cli', 'run-parent'), { recursive: true });
    await writeFile(
      join(parent, '.runs', 'parent-task', 'cli', 'run-parent', 'manifest.json'),
      JSON.stringify({
        task_id: 'parent-task',
        run_id: '2026-02-19T03-00-00-000Z-parent',
        pipeline_id: 'diagnostics',
        status: 'succeeded',
        started_at: '2026-02-19T03:00:00.000Z'
      }),
      'utf8'
    );

    await mkdir(join(childRepo, '.git'), { recursive: true });
    await mkdir(join(childRepo, '.runs', 'child-task', 'cli', 'run-child'), { recursive: true });
    await mkdir(join(childRepo, 'out'), { recursive: true });
    await mkdir(nestedCwd, { recursive: true });
    await writeFile(
      join(childRepo, '.runs', 'child-task', 'cli', 'run-child', 'manifest.json'),
      JSON.stringify({
        task_id: 'child-task',
        run_id: '2026-02-19T01-00-00-000Z-child',
        pipeline_id: 'diagnostics',
        status: 'succeeded',
        started_at: '2026-02-19T01:00:00.000Z'
      }),
      'utf8'
    );

    const result = await writeDoctorIssueLog({
      doctor,
      cwd: nestedCwd,
      issueTitle: 'git-boundary',
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: 'child-task'
      }
    });

    const issueLogAbsolute = resolvePath(nestedCwd, result.issue_log_path);
    const bundleAbsolute = resolvePath(nestedCwd, result.bundle_path);
    await access(issueLogAbsolute);
    await access(bundleAbsolute);
    await rm(parent, { recursive: true, force: true });

    expect(result.run_context?.task_id).toBe('child-task');
    expect(issueLogAbsolute).toBe(join(childRepo, 'docs', 'codex-orchestrator-issues.md'));
    expect(bundleAbsolute).toContain(join(childRepo, 'out', 'child-task', 'doctor', 'issue-bundles'));
  });
});
