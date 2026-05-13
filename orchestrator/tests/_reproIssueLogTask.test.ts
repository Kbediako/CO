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
  checkout_posture: {
    status: 'current',
    repo_root: '/tmp/repo',
    inside_git_worktree: true,
    base_ref: 'origin/main',
    ahead: 0,
    behind: 0,
    dirty: { status: 'clean', changed_paths: 0, detail: 'fixture' },
    head: null,
    upstream: null,
    stale_docs_may_be: false,
    posture_reference: {
      status: 'unavailable',
      commit: null,
      issue_ids: [],
      policy_lines: [],
      paths: [],
      detail: 'fixture'
    },
    guidance: [],
    detail: 'fixture'
  },
  source_root_freshness: {
    schema_version: 1,
    status: 'current',
    observed_at: '2026-05-03T00:00:00.000Z',
    intended_repo_root: '/tmp/repo',
    intended_repo_root_realpath: '/tmp/repo',
    command_path: null,
    command_path_realpath: null,
    package_root: null,
    package_root_realpath: null,
    source_root: null,
    source_root_realpath: null,
    entrypoint_kind: 'unknown',
    base_ref: 'origin/main',
    source_checkout: null,
    intended_checkout: null,
    drift_classes: [],
    provenance: {
      command_path_source: 'unresolved',
      package_root_source: 'unresolved',
      source_root_source: 'unresolved',
      command_path_inside_package: null,
      package_root_matches_intended: null,
      source_root_matches_intended: null,
      source_entry_exists: null,
      dist_entry_exists: null
    },
    guidance: [],
    detail: 'fixture'
  },
  codex_cli: {
    active: {
      command: 'codex',
      path: '/tmp/codex',
      version: 'codex-cli fixture',
      status: 'ok',
      managed_opt_in: false
    },
    app_bundle: {
      path: '/Applications/Codex.app/Contents/Resources/codex',
      version: null,
      status: 'absent'
    },
    version_drift: { status: 'not_applicable', message: null },
    managed: {
      status: 'missing',
      config: { status: 'missing', path: '/tmp/config.toml' },
      binary: { status: 'missing', path: '/tmp/codex' },
      install: undefined
    }
  },
  codex_defaults: {
    status: 'ok',
    config: { path: '/tmp/config.toml', status: 'ok' },
    checks: {
      model: { status: 'ok', expected: 'gpt-5.3-codex', actual: 'gpt-5.3-codex' },
      review_model: { status: 'ok', expected: 'gpt-5.3-codex', actual: 'gpt-5.3-codex' },
      model_reasoning_effort: { status: 'ok', expected_minimum: 'high', actual: 'xhigh' },
      max_threads: { status: 'ok', expected_minimum: 12, actual: 12 },
      max_depth: { status: 'ok', expected_minimum: 4, actual: 4 }
    },
    removed_features: {
      status: 'ok',
      configured: [],
      co_managed_cleanup: [],
      detail: 'No configured removed Codex feature keys detected.'
    },
    multi_agent_v2_thread_cap: {
      status: 'not_applicable',
      config_path: 'multi_agent_v2.max_concurrent_threads_per_session',
      actual: null,
      detail: 'stable features.multi_agent guidance continues to use agents.max_threads'
    },
    guidance: []
  },
  collab: { status: 'ok', enabled: true, feature_key: 'multi_agent', enablement: [] },
  cloud: {
    status: 'ok',
    env_id_configured: true,
    branch: null,
    fallback_policy: 'auto',
    fallback_policy_source: 'default',
    fallback_policy_raw: null,
    fallback_policy_error: null,
    enablement: []
  },
  delegation: {
    status: 'ok',
    config: { status: 'ok', path: '/tmp/config.toml' },
    transport: { status: 'safe', kind: 'direct-dist', command_line: 'node /tmp/dist.js', detail: 'fixture' },
    startup: { status: 'ok', latency_ms: 1, threshold_ms: 1000, detail: 'fixture' },
    processes: {
      status: 'ok',
      active_count: 0,
      stale_count: 0,
      active_pids: [],
      stale_pids: [],
      stale_rss_mb: 0,
      threshold_minutes: 30,
      detail: 'fixture',
      details: []
    },
    enablement: []
  },
  providers: {
    status: 'ok',
    repo_examples: {
      status: 'ok',
      root: '/tmp/repo/.codex/providers',
      paths: {
        readme: '/tmp/repo/.codex/providers/README.md',
        env_example: '/tmp/repo/.codex/providers/provider.env.example',
        control_example: '/tmp/repo/.codex/providers/control.example.json'
      },
      missing: []
    },
    control_policy: {
      status: 'ok',
      path: '/tmp/repo/.codex/providers/control.example.json',
      dispatch_pilot_enabled: true,
      dispatch_pilot_provider: 'linear',
      dispatch_pilot_source_setup: { workspace_id: 'workspace', team_id: 'team', project_id: 'project' },
      transport_mutating_enabled: true,
      telegram_transport_allowed: true
    },
    linear: {
      status: 'ready',
      credentials_present: true,
      binding_present: true,
      webhook_secret_present: true,
      dispatch_pilot_enabled: true,
      dispatch_pilot_provider: 'linear'
    },
    telegram: {
      status: 'ready',
      polling_enabled: true,
      bot_token_present: true,
      allowed_chat_ids: 1,
      mutations_enabled: true,
      push_enabled: true,
      telegram_transport_allowed: true
    },
    guidance: []
  }
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
    const foreignRoot = await mkdtemp(join(tmpdir(), 'issue-log-foreign-root-'));
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
    await mkdir(join(foreignRoot, 'tasks'), { recursive: true });
    await mkdir(join(foreignRoot, '.runs', 'foreign-task', 'cli', 'run-foreign'), { recursive: true });
    await writeFile(join(foreignRoot, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    await writeFile(
      join(foreignRoot, '.runs', 'foreign-task', 'cli', 'run-foreign', 'manifest.json'),
      JSON.stringify({
        task_id: 'foreign-task',
        run_id: '2026-02-19T05-00-00-000Z-foreign',
        pipeline_id: 'diagnostics',
        status: 'succeeded',
        started_at: '2026-02-19T05:00:00.000Z'
      }),
      'utf8'
    );

    const result = await writeDoctorIssueLog({
      doctor,
      cwd: nestedCwd,
      issueTitle: 'nested',
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: foreignRoot,
        MCP_RUNNER_TASK_ID: 'task-a'
      }
    });

    const issueLogAbsolute = resolvePath(nestedCwd, result.issue_log_path);
    const bundleAbsolute = resolvePath(nestedCwd, result.bundle_path);
    await access(issueLogAbsolute);
    await access(bundleAbsolute);
    await rm(root, { recursive: true, force: true });
    await rm(foreignRoot, { recursive: true, force: true });

    expect(result.run_context?.task_id).toBe('task-a');
    expect(issueLogAbsolute).toBe(join(root, 'docs', 'codex-orchestrator-issues.md'));
    expect(bundleAbsolute).toContain(join(root, 'out', 'task-a', 'doctor', 'issue-bundles'));
  });

  it('ignores foreign absolute runs/out env paths when explicit cwd resolves to local workspace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'issue-log-local-root-'));
    const nestedCwd = join(root, 'packages', 'app');
    const foreignRoot = await mkdtemp(join(tmpdir(), 'issue-log-foreign-config-'));
    await mkdir(join(root, 'tasks'), { recursive: true });
    await mkdir(join(root, '.runs', 'task-local', 'cli', 'run-local'), { recursive: true });
    await mkdir(join(root, 'out'), { recursive: true });
    await mkdir(nestedCwd, { recursive: true });
    await writeFile(join(root, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    await writeFile(
      join(root, '.runs', 'task-local', 'cli', 'run-local', 'manifest.json'),
      JSON.stringify({
        task_id: 'task-local',
        run_id: '2026-02-19T00-00-00-000Z-local',
        pipeline_id: 'diagnostics',
        status: 'succeeded',
        started_at: '2026-02-19T00:00:00.000Z'
      }),
      'utf8'
    );
    await mkdir(join(foreignRoot, 'tasks'), { recursive: true });
    await mkdir(join(foreignRoot, '.runs', 'task-foreign', 'cli', 'run-foreign'), { recursive: true });
    await mkdir(join(foreignRoot, 'out'), { recursive: true });
    await writeFile(join(foreignRoot, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    await writeFile(
      join(foreignRoot, '.runs', 'task-foreign', 'cli', 'run-foreign', 'manifest.json'),
      JSON.stringify({
        task_id: 'task-foreign',
        run_id: '2026-02-19T05-00-00-000Z-foreign',
        pipeline_id: 'diagnostics',
        status: 'succeeded',
        started_at: '2026-02-19T05:00:00.000Z'
      }),
      'utf8'
    );

    const result = await writeDoctorIssueLog({
      doctor,
      cwd: nestedCwd,
      issueTitle: 'runs-out-boundary',
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: foreignRoot,
        CODEX_ORCHESTRATOR_RUNS_DIR: join(foreignRoot, '.runs'),
        CODEX_ORCHESTRATOR_OUT_DIR: join(foreignRoot, 'out'),
        MCP_RUNNER_TASK_ID: 'task-local'
      }
    });

    const issueLogAbsolute = resolvePath(nestedCwd, result.issue_log_path);
    const bundleAbsolute = resolvePath(nestedCwd, result.bundle_path);
    await access(issueLogAbsolute);
    await access(bundleAbsolute);
    await rm(root, { recursive: true, force: true });
    await rm(foreignRoot, { recursive: true, force: true });

    expect(result.run_context?.task_id).toBe('task-local');
    expect(issueLogAbsolute).toBe(join(root, 'docs', 'codex-orchestrator-issues.md'));
    expect(bundleAbsolute).toContain(join(root, 'out', 'task-local', 'doctor', 'issue-bundles'));
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
        CODEX_ORCHESTRATOR_ROOT: parent,
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

  it('uses explicit CODEX_ORCHESTRATOR_ROOT when cwd has no workspace signals', async () => {
    const root = await mkdtemp(join(tmpdir(), 'issue-log-configured-root-'));
    const plainCwd = await mkdtemp(join(tmpdir(), 'issue-log-plain-cwd-'));
    await mkdir(join(root, 'tasks'), { recursive: true });
    await mkdir(join(root, '.runs', 'configured-task', 'cli', 'run-configured'), { recursive: true });
    await writeFile(join(root, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    await writeFile(
      join(root, '.runs', 'configured-task', 'cli', 'run-configured', 'manifest.json'),
      JSON.stringify({
        task_id: 'configured-task',
        run_id: '2026-02-19T06-00-00-000Z-configured',
        pipeline_id: 'diagnostics',
        status: 'succeeded',
        started_at: '2026-02-19T06:00:00.000Z'
      }),
      'utf8'
    );

    const result = await writeDoctorIssueLog({
      doctor,
      cwd: plainCwd,
      issueTitle: 'configured-root',
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: root
      }
    });

    const issueLogAbsolute = resolvePath(plainCwd, result.issue_log_path);
    const bundleAbsolute = resolvePath(plainCwd, result.bundle_path);
    await access(issueLogAbsolute);
    await access(bundleAbsolute);
    await rm(root, { recursive: true, force: true });
    await rm(plainCwd, { recursive: true, force: true });

    expect(result.run_context?.task_id).toBe('configured-task');
    expect(issueLogAbsolute).toBe(join(root, 'docs', 'codex-orchestrator-issues.md'));
    expect(bundleAbsolute).toContain(join(root, 'out', 'configured-task', 'doctor', 'issue-bundles'));
  });
});
