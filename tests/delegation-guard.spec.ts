import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'delegation-guard.mjs');

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

  async function initRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'delegation-guard-'));
  await mkdir(join(dir, 'tasks'), { recursive: true });
  await writeFile(
    join(dir, 'tasks', 'index.json'),
    JSON.stringify(
      {
        items: [
          {
            id: '0951',
            slug: 'delegation-rlm-quick-wins',
            status: 'approved'
          }
        ]
      },
      null,
      2
    )
  );
    return dir;
  }

  async function writeTaskIndex(dir: string, items: unknown[]): Promise<void> {
    await writeFile(join(dir, 'tasks', 'index.json'), JSON.stringify({ items }, null, 2));
  }

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2));
}

const guardInheritedEnvKeys = [
  'DELEGATION_GUARD_OVERRIDE_REASON',
  'TASK',
  'MCP_RUNNER_TASK_ID',
  'CODEX_ORCHESTRATOR_TASK_ID',
  'CODEX_ORCHESTRATOR_ROOT',
  'CODEX_ORCHESTRATOR_RUNS_DIR',
  'CODEX_ORCHESTRATOR_OUT_DIR',
  'CODEX_ORCHESTRATOR_MANIFEST_PATH',
  'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE',
  'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN',
  'CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID',
  'CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID'
] as const;

function cleanGuardOverrideEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const sanitizedBase = { ...process.env };
  for (const key of guardInheritedEnvKeys) {
    delete sanitizedBase[key];
  }
  return { ...sanitizedBase, ...overrides };
}

describe('delegation-guard script', () => {
  it('reports missing task id with export example', async () => {
    tempDir = await initRepo();

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: '',
        CODEX_ORCHESTRATOR_ROOT: tempDir
      })
    });

    expect(stdout).toContain('Task id is required');
    expect(stdout).toContain('export MCP_RUNNER_TASK_ID=0951-delegation-rlm-quick-wins');
  });

  it('accepts TASK env var as task-id fallback', async () => {
    tempDir = await initRepo();
    const taskId = '0951-delegation-rlm-quick-wins';
    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        TASK: taskId,
        MCP_RUNNER_TASK_ID: '',
        CODEX_ORCHESTRATOR_ROOT: tempDir
      })
    });

    expect(stdout).not.toContain('Task id is required');
    expect(stdout).toContain('No subagent manifests found');
  });

  it('accepts --task flag as highest-priority task id source', async () => {
    tempDir = await initRepo();
    const taskId = '0951-delegation-rlm-quick-wins';
    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run', '--task', taskId], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        TASK: 'should-not-be-used',
        MCP_RUNNER_TASK_ID: '',
        CODEX_ORCHESTRATOR_ROOT: tempDir
      })
    });

    expect(stdout).not.toContain('Task id is required');
    expect(stdout).toContain(`No subagent manifests found for '${taskId}'`);
  });

  it('lists candidate manifests and expected paths when none found', async () => {
    tempDir = await initRepo();
    const taskId = '0951-delegation-rlm-quick-wins';

    const runsRoot = join(tempDir, 'custom-runs');
    await mkdir(join(runsRoot, `${taskId}-guard`, 'cli'), { recursive: true });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_RUNS_DIR: 'custom-runs'
      })
    });

    expect(stdout).toContain('No subagent manifests found');
    expect(stdout).toContain('Candidate manifests (rejected):');
    expect(stdout).toContain('no run directories');
    expect(stdout).toContain(`${runsRoot}/${taskId}-*/cli/<run-id>/manifest.json`);
  });

  it('accepts date-prefixed task index entries via relates_to-derived slug', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'delegation-guard-dated-'));
    await mkdir(join(tempDir, 'tasks'), { recursive: true });
    await writeFile(
      join(tempDir, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '20260308-1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction',
              title: 'Coordinator Symphony-Aligned Standalone Review Execution State Extraction',
              relates_to:
                'tasks/tasks-1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction.md'
            }
          ]
        },
        null,
        2
      )
    );

    const taskId = '1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction';
    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run', '--task', taskId], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: '',
        CODEX_ORCHESTRATOR_ROOT: tempDir
      })
    });

    expect(stdout).not.toContain('is not registered in tasks/index.json');
    expect(stdout).toContain(`No subagent manifests found for '${taskId}'`);
  });

  it('preserves explicit provider launch overrides when the parent env already carries control-host provenance', () => {
    const ambientEnv = {
      CODEX_ORCHESTRATOR_TASK_ID: 'linear-ambient-parent',
      CODEX_ORCHESTRATOR_MANIFEST_PATH: '/tmp/ambient-parent-manifest.json',
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'ambient-launch-token'
    } as const;
    const previousEnv = new Map<string, string | undefined>();

    for (const [key, value] of Object.entries(ambientEnv)) {
      previousEnv.set(key, process.env[key]);
      process.env[key] = value;
    }

    try {
      const env = cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: 'linear-lin-issue-1',
        CODEX_ORCHESTRATOR_ROOT: '/tmp/delegation-guard-hermetic',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      });

      expect(env.MCP_RUNNER_TASK_ID).toBe('linear-lin-issue-1');
      expect(env.CODEX_ORCHESTRATOR_ROOT).toBe('/tmp/delegation-guard-hermetic');
      expect(env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE).toBe('control-host');
      expect(env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN).toBe('launch-token-1');
      expect(env.CODEX_ORCHESTRATOR_TASK_ID).toBeUndefined();
      expect(env.CODEX_ORCHESTRATOR_MANIFEST_PATH).toBeUndefined();
    } finally {
      for (const [key, value] of previousEnv) {
        if (value === undefined) {
          delete process.env[key];
          continue;
        }
        process.env[key] = value;
      }
    }
  });

  it('accepts provider-started fallback runs when the active manifest matches control-host intake state', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(`'${taskId}' accepted via provider-intake contract`);
    expect(stdout).toContain('Delegation guard: OK (provider-started run contract matched).');
  });

  it('accepts provider-started fallback runs without requiring linear-advisory-state.json', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(`'${taskId}' accepted via provider-intake contract`);
    expect(stdout).toContain('Delegation guard: OK (provider-started run contract matched).');
  });

  it('accepts provider-started fallback runs when the manifest carries a non-default control-host locator', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'provider-host-run'
    });

    const controlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: runId,
          run_manifest_path: manifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(`'${taskId}' accepted via provider-intake contract`);
    expect(stdout).toContain('Delegation guard: OK (provider-started run contract matched).');
  });

  it('accepts provider-started fallback runs from a non-default control-host lane when older manifests lack locator fields', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: runId,
          run_manifest_path: manifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(`'${taskId}' accepted via provider-intake contract`);
    expect(stdout).toContain('Delegation guard: OK (provider-started run contract matched).');
  });

  it('accepts provider-started fallback runs when the manifest locator is stale but a fallback control-host lane matches', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      provider_control_host_task_id: 'stale-provider-host-task',
      provider_control_host_run_id: 'stale-provider-host-run'
    });

    const staleControlHostDir = join(
      tempDir,
      '.runs',
      'stale-provider-host-task',
      'cli',
      'stale-provider-host-run'
    );
    await mkdir(staleControlHostDir, { recursive: true });
    await writeJson(join(staleControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: []
    });

    const fallbackControlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(fallbackControlHostDir, { recursive: true });
    await writeJson(join(fallbackControlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(fallbackControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: runId,
          run_manifest_path: manifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(`'${taskId}' accepted via provider-intake contract`);
    expect(stdout).toContain('Delegation guard: OK (provider-started run contract matched).');
  });

  it('accepts provider-started fallback runs when the fallback lane has only provider-intake state and another fallback lane is malformed', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      provider_control_host_task_id: 'stale-provider-host-task',
      provider_control_host_run_id: 'stale-provider-host-run'
    });

    const staleControlHostDir = join(
      tempDir,
      '.runs',
      'stale-provider-host-task',
      'cli',
      'stale-provider-host-run'
    );
    await mkdir(staleControlHostDir, { recursive: true });
    await writeJson(join(staleControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: []
    });

    const fallbackControlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(fallbackControlHostDir, { recursive: true });
    await writeJson(join(fallbackControlHostDir, 'control.json'), {
      status: 'ready',
      task_id: 'provider-host-task',
      run_id: 'provider-host-run'
    });
    await writeJson(join(fallbackControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: runId,
          run_manifest_path: manifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const malformedControlHostDir = join(tempDir, '.runs', 'corrupt-provider-host-task', 'cli', 'corrupt-run');
    await mkdir(malformedControlHostDir, { recursive: true });
    await writeFile(join(malformedControlHostDir, 'provider-intake-state.json'), '{not-json');

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(`'${taskId}' accepted via provider-intake contract`);
    expect(stdout).toContain('Delegation guard: OK (provider-started run contract matched).');
    expect(stdout).not.toContain('could not be read');
  });

  it('rejects provider-started fallback runs when the manifest-selected control-host ledger is unreadable', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      provider_control_host_task_id: 'stale-provider-host-task',
      provider_control_host_run_id: 'stale-provider-host-run'
    });

    const staleControlHostDir = join(
      tempDir,
      '.runs',
      'stale-provider-host-task',
      'cli',
      'stale-provider-host-run'
    );
    await mkdir(staleControlHostDir, { recursive: true });
    await writeFile(join(staleControlHostDir, 'provider-intake-state.json'), '{not-json');

    const fallbackControlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(fallbackControlHostDir, { recursive: true });
    await writeJson(join(fallbackControlHostDir, 'control.json'), {
      status: 'ready',
      task_id: 'provider-host-task',
      run_id: 'provider-host-run'
    });
    await writeJson(join(fallbackControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: runId,
          run_manifest_path: manifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(
      `Control-host provider-intake state '${join(staleControlHostDir, 'provider-intake-state.json')}' could not be read`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('accepted via provider-intake contract');
  });

  it('accepts provider-started fallback runs even when tasks/index.json has no registered items', async () => {
    tempDir = await initRepo();
    await writeTaskIndex(tempDir, []);
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(`'${taskId}' accepted via provider-intake contract`);
    expect(stdout).toContain('Delegation guard: OK (provider-started run contract matched).');
  });

  it('rejects provider-started fallback runs when only a non-control-host intake ledger matches', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const controlHostStatePath = join(
      tempDir,
      '.runs',
      'local-mcp',
      'cli',
      'control-host',
      'provider-intake-state.json'
    );
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const shadowHostDir = join(tempDir, '.runs', 'shadow-provider', 'cli', 'shadow-run');
    await mkdir(shadowHostDir, { recursive: true });
    await writeJson(join(shadowHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(
      `Provider-started task id '${taskId}' did not match any control-host provider-intake claim in ${controlHostStatePath}`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
  });

  it('rejects provider-started fallback runs when the active manifest is no longer in progress', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'succeeded',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: runId,
          run_manifest_path: manifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(
      `Provider-run manifest '${manifestPath}' for '${taskId}' must remain in_progress`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
  });

  it('accepts delegated child runs under a sanctioned provider-started parent task id', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('accepts provider-child runs when provider parent claim lacks run_manifest_path before rehydrate completes', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
    expect(stdout).not.toContain('missing parent_run_id');
    expect(stdout).not.toContain('did not match any control-host provider-intake claim');
  });

  it('rejects delegated child runs when only a non-control-host intake ledger sanctions the parent', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const shadowHostDir = join(tempDir, '.runs', 'shadow-provider', 'cli', 'shadow-run');
    await mkdir(shadowHostDir, { recursive: true });
    await writeJson(join(shadowHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).not.toContain(`sanctioned provider task '${parentTaskId}'`);
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
  });

  it('accepts delegated child runs without requiring linear-advisory-state.json when the provider parent manifest is active', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('accepts delegated child runs when the child manifest carries a non-default control-host locator', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null,
      provider_control_host_task_id: 'provider-host-task',
      provider_control_host_run_id: 'provider-host-run'
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('accepts delegated child runs from a non-default control-host lane when older manifests lack locator fields', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('accepts delegated child runs when the default local-mcp claim is stale but a fallback control-host lane matches the active parent run', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const staleParentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent-old');
    const staleParentManifestPath = join(staleParentRunDir, 'manifest.json');
    const activeParentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent-new');
    const activeParentManifestPath = join(activeParentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent-new',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(staleParentRunDir, { recursive: true });
    await writeJson(staleParentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent-old',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });
    await mkdir(activeParentRunDir, { recursive: true });
    await writeJson(activeParentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent-new',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const defaultControlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(defaultControlHostDir, { recursive: true });
    await writeJson(join(defaultControlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(defaultControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent-old',
          run_manifest_path: staleParentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const fallbackControlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(fallbackControlHostDir, { recursive: true });
    await writeJson(join(fallbackControlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(fallbackControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent-new',
          run_manifest_path: activeParentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
    expect(stdout).not.toContain('does not match sanctioned provider parent run');
  });

  it('accepts delegated child runs under a sanctioned provider parent even when tasks/index.json has no registered items', async () => {
    tempDir = await initRepo();
    await writeTaskIndex(tempDir, []);
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('accepts delegated child runs when the manifest locator is stale but a fallback control-host lane matches the active parent run', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const staleParentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent-old');
    const staleParentManifestPath = join(staleParentRunDir, 'manifest.json');
    const activeParentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent-new');
    const activeParentManifestPath = join(activeParentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent-new',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null,
      provider_control_host_task_id: 'stale-provider-host-task',
      provider_control_host_run_id: 'stale-provider-host-run'
    });
    await mkdir(staleParentRunDir, { recursive: true });
    await writeJson(staleParentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent-old',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });
    await mkdir(activeParentRunDir, { recursive: true });
    await writeJson(activeParentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent-new',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const staleControlHostDir = join(
      tempDir,
      '.runs',
      'stale-provider-host-task',
      'cli',
      'stale-provider-host-run'
    );
    await mkdir(staleControlHostDir, { recursive: true });
    await writeJson(join(staleControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent-old',
          run_manifest_path: staleParentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const fallbackControlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(fallbackControlHostDir, { recursive: true });
    await writeJson(join(fallbackControlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(fallbackControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent-new',
          run_manifest_path: activeParentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('accepts delegated child runs when the fallback lane has only provider-intake state and another fallback lane is malformed', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const staleParentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent-old');
    const staleParentManifestPath = join(staleParentRunDir, 'manifest.json');
    const activeParentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent-new');
    const activeParentManifestPath = join(activeParentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent-new',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null,
      provider_control_host_task_id: 'stale-provider-host-task',
      provider_control_host_run_id: 'stale-provider-host-run'
    });
    await mkdir(staleParentRunDir, { recursive: true });
    await writeJson(staleParentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent-old',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });
    await mkdir(activeParentRunDir, { recursive: true });
    await writeJson(activeParentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent-new',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const staleControlHostDir = join(
      tempDir,
      '.runs',
      'stale-provider-host-task',
      'cli',
      'stale-provider-host-run'
    );
    await mkdir(staleControlHostDir, { recursive: true });
    await writeJson(join(staleControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent-old',
          run_manifest_path: staleParentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const fallbackControlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(fallbackControlHostDir, { recursive: true });
    await writeJson(join(fallbackControlHostDir, 'control.json'), {
      status: 'ready',
      task_id: 'provider-host-task',
      run_id: 'provider-host-run'
    });
    await writeJson(join(fallbackControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent-new',
          run_manifest_path: activeParentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const malformedControlHostDir = join(tempDir, '.runs', 'corrupt-provider-host-task', 'cli', 'corrupt-run');
    await mkdir(malformedControlHostDir, { recursive: true });
    await writeFile(join(malformedControlHostDir, 'provider-intake-state.json'), '{not-json');

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
    expect(stdout).not.toContain('could not be read');
  });

  it('rejects delegated child runs when the manifest-selected control-host ledger is unreadable', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const activeParentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent-new');
    const activeParentManifestPath = join(activeParentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent-new',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null,
      provider_control_host_task_id: 'stale-provider-host-task',
      provider_control_host_run_id: 'stale-provider-host-run'
    });
    await mkdir(activeParentRunDir, { recursive: true });
    await writeJson(activeParentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent-new',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const staleControlHostDir = join(
      tempDir,
      '.runs',
      'stale-provider-host-task',
      'cli',
      'stale-provider-host-run'
    );
    await mkdir(staleControlHostDir, { recursive: true });
    await writeFile(join(staleControlHostDir, 'provider-intake-state.json'), '{not-json');

    const fallbackControlHostDir = join(tempDir, '.runs', 'provider-host-task', 'cli', 'provider-host-run');
    await mkdir(fallbackControlHostDir, { recursive: true });
    await writeJson(join(fallbackControlHostDir, 'control.json'), {
      status: 'ready',
      task_id: 'provider-host-task',
      run_id: 'provider-host-run'
    });
    await writeJson(join(fallbackControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent-new',
          run_manifest_path: activeParentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Control-host provider-intake state '${join(staleControlHostDir, 'provider-intake-state.json')}' could not be read`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
  });

  it('rejects delegated child runs when the active child manifest is missing parent_run_id', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Provider-child task id '${taskId}' is missing parent_run_id in active manifest '${manifestPath}'`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
  });

  it('rejects delegated child runs when the active child manifest is missing parent_run_id and no provider ledger exists', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Provider-child task id '${taskId}' is missing parent_run_id in active manifest '${manifestPath}'`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
  });

  it('rejects delegated child runs once the provider parent claim is already completed', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_run_already_completed',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'completed',
          reason: 'provider_issue_run_already_completed',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent', 'manifest.json'),
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
  });

  it('rejects delegated child runs when stale control-host state points at a no-longer-active parent run', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    const parentRunDir = join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent');
    const parentManifestPath = join(parentRunDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });
    await mkdir(parentRunDir, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-parent',
      status: 'succeeded',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
  });

  it('rejects delegated child runs when the provider parent claim lacks control-host provenance', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    const taskId = `${parentTaskId}-guard`;
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
      status: 'in_progress',
      parent_run_id: 'run-parent',
      issue_provider: null,
      issue_id: null,
      issue_identifier: null
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: 'run-parent',
          run_manifest_path: join(tempDir, '.runs', parentTaskId, 'cli', 'run-parent', 'manifest.json'),
          launch_source: null,
          launch_token: null
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
  });

  it('rejects provider-started fallback runs without control-host launch provenance', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_launched',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'starting',
          reason: 'provider_issue_start_launched',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Provider-started task id '${taskId}' is missing control-host launch provenance`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain(`Provider-child task id '${taskId}'`);
  });

  it('rejects provider-started fallback runs when the claim manifest path points at a different run', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: runId,
          run_manifest_path: join(tempDir, '.runs', taskId, 'cli', 'different-run', 'manifest.json'),
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(
      `Provider-started task id '${taskId}' did not match any control-host provider-intake claim`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
  });

  it('rejects forged provider issue fields without matching control-host intake state', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });

    const controlHostDir = join(tempDir, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      tracked_issue: null
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:01.000Z',
      rehydrated_at: '2026-03-20T00:00:01.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_state_not_started',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'Backlog',
          issue_state_type: 'unstarted',
          issue_updated_at: '2026-03-20T00:00:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'ignored',
          reason: 'provider_issue_state_not_started',
          accepted_at: '2026-03-20T00:00:00.000Z',
          updated_at: '2026-03-20T00:00:01.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_430_000_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain(
      `Provider-started task id '${taskId}' did not match any control-host provider-intake claim`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
  });
});
