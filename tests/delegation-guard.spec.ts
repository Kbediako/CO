import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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
  'CODEX_ORCHESTRATOR_PIPELINE_ID',
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

async function createProviderDocsReviewChildFixture(options: {
  childTaskId?: string;
  parentTaskId?: string;
  claimTaskId?: string;
  claimLaunchSource?: string | null;
  claimLaunchToken?: string | null;
  childIssueId?: string;
  childIssueIdentifier?: string;
  childIssueProvider?: string;
  childIssueIdCamelCase?: string;
  childIssueIdentifierCamelCase?: string;
  childIssueProviderCamelCase?: string;
  childManifestCase?: 'snake' | 'camel';
  parentManifestCase?: 'snake' | 'camel';
  staleParentRunBefore?: string;
  registeredParentKey?: string;
} = {}): Promise<{
  dir: string;
  taskId: string;
  parentTaskId: string;
  parentRunId: string;
  manifestPath: string;
  parentManifestPath: string;
}> {
  const dir = await initRepo();
  const parentTaskId = options.parentTaskId ?? 'linear-lin-issue-1';
  const taskId = options.childTaskId ?? `${parentTaskId}-docs-review`;
  const parentRunId = 'run-parent';
  const childRunId = 'run-docs-review';
  const manifestDir = join(dir, '.runs', taskId, 'cli', childRunId);
  const manifestPath = join(manifestDir, 'manifest.json');
  const parentRunDir = join(dir, '.runs', parentTaskId, 'cli', parentRunId);
  const parentManifestPath = join(parentRunDir, 'manifest.json');
  const childIssueProvider = options.childIssueProvider ?? 'linear';
  const childIssueId = options.childIssueId ?? 'lin-issue-1';
  const childIssueIdentifier = options.childIssueIdentifier ?? 'CO-2';
  await mkdir(manifestDir, { recursive: true });
  await mkdir(parentRunDir, { recursive: true });
  let staleParentManifestPath = '';
  if (options.staleParentRunBefore) {
    const staleParentRunDir = join(dir, '.runs', parentTaskId, 'cli', options.staleParentRunBefore);
    staleParentManifestPath = join(staleParentRunDir, 'manifest.json');
    await mkdir(staleParentRunDir, { recursive: true });
    await writeJson(staleParentManifestPath, {
      task_id: parentTaskId,
      run_id: options.staleParentRunBefore,
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2'
    });
  }
  if (options.registeredParentKey) {
    await writeTaskIndex(dir, [
      {
        id: options.registeredParentKey,
        relates_to: `tasks/tasks-${options.registeredParentKey}.md`
      }
    ]);
  }
  await writeJson(
    manifestPath,
    options.childManifestCase === 'camel'
      ? {
          taskId,
          runId: childRunId,
          status: 'in_progress',
          parentRunId,
          issueProvider: childIssueProvider,
          issueId: childIssueId,
          issueIdentifier: childIssueIdentifier
        }
      : {
          task_id: taskId,
          run_id: childRunId,
          status: 'in_progress',
          parent_run_id: parentRunId,
          issue_provider: childIssueProvider,
          issue_id: childIssueId,
          issue_identifier: childIssueIdentifier,
          ...(options.childIssueProviderCamelCase === undefined
            ? {}
            : { issueProvider: options.childIssueProviderCamelCase }),
          ...(options.childIssueIdCamelCase === undefined ? {} : { issueId: options.childIssueIdCamelCase }),
          ...(options.childIssueIdentifierCamelCase === undefined
            ? {}
            : { issueIdentifier: options.childIssueIdentifierCamelCase })
        }
  );
  await writeJson(
    parentManifestPath,
    options.parentManifestCase === 'camel'
      ? {
          taskId: parentTaskId,
          runId: parentRunId,
          status: 'in_progress',
          issueProvider: 'linear',
          issueId: 'lin-issue-1',
          issueIdentifier: 'CO-2'
        }
      : {
          task_id: parentTaskId,
          run_id: parentRunId,
          status: 'in_progress',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2'
        }
  );

  const controlHostDir = join(dir, '.runs', 'local-mcp', 'cli', 'control-host');
  await mkdir(controlHostDir, { recursive: true });
  await writeJson(join(controlHostDir, 'linear-advisory-state.json'), {
    schema_version: 1,
    updated_at: '2026-03-20T00:00:01.000Z',
    tracked_issue: null
  });
  const baseClaim = {
    provider: 'linear',
    provider_key: 'linear:lin-issue-1',
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-2',
    issue_title: 'Autonomous intake handoff',
    issue_state: 'In Progress',
    issue_state_type: 'started',
    issue_updated_at: '2026-03-20T00:00:00.000Z',
    task_id: options.claimTaskId ?? parentTaskId,
    mapping_source: 'provider_id_fallback',
    state: 'running',
    reason: 'provider_issue_rehydrated_active_run',
    accepted_at: '2026-03-20T00:00:00.000Z',
    updated_at: '2026-03-20T00:00:01.000Z',
    last_delivery_id: 'delivery-1',
    last_event: 'Issue',
    last_action: 'update',
    last_webhook_timestamp: 1_742_430_000_000,
    run_id: parentRunId,
    run_manifest_path: parentManifestPath,
    launch_source: options.claimLaunchSource === undefined ? 'control-host' : options.claimLaunchSource,
    launch_token: options.claimLaunchToken === undefined ? 'launch-token-1' : options.claimLaunchToken
  };
  const claims = options.staleParentRunBefore
    ? [
        {
          ...baseClaim,
          run_id: options.staleParentRunBefore,
          run_manifest_path: staleParentManifestPath
        },
        baseClaim
      ]
    : [baseClaim];
  await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
    schema_version: 1,
    updated_at: '2026-03-20T00:00:01.000Z',
    rehydrated_at: '2026-03-20T00:00:01.000Z',
    latest_provider_key: 'linear:lin-issue-1',
    latest_reason: 'provider_issue_rehydrated_active_run',
    claims
  });

  return { dir, taskId, parentTaskId, parentRunId, manifestPath, parentManifestPath };
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

  it('accepts provider-worker workspace-scoped child manifests even when the parent env still points runsDir at the shared root', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'delegation-guard-provider-worker-'));
    const taskId = 'linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be';
    const workspacePath = join(tempDir, '.workspaces', taskId);
    await mkdir(join(workspacePath, 'tasks'), { recursive: true });
    await writeTaskIndex(workspacePath, [
      {
        id: `20260331-${taskId}`,
        title: 'CO: Reconcile provider-worker child-stream delegation evidence with delegation guard',
        relates_to: `tasks/tasks-${taskId}.md`
      }
    ]);

    const sharedRunsDir = join(tempDir, '.runs');
    const parentRunId = '2026-03-31T08-12-50-673Z-86806a3a';
    const parentManifestPath = join(sharedRunsDir, taskId, 'cli', parentRunId, 'manifest.json');
    await mkdir(dirname(parentManifestPath), { recursive: true });
    await mkdir(workspacePath, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: taskId,
      run_id: parentRunId,
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'fabdf855-dd07-4f8d-8ffa-f02d22cb27be',
      issue_identifier: 'CO-56',
      workspace_path: workspacePath
    });

    const docsReviewManifestPath = join(
      workspacePath,
      '.runs',
      `${taskId}-docs-review`,
      'cli',
      '2026-03-31T08-23-01-823Z-0c86b6cb',
      'manifest.json'
    );
    await mkdir(dirname(docsReviewManifestPath), { recursive: true });
    await writeJson(docsReviewManifestPath, {
      task_id: `${taskId}-docs-review`,
      run_id: '2026-03-31T08-23-01-823Z-0c86b6cb',
      parent_run_id: parentRunId,
      status: 'succeeded'
    });

    const childLaneManifestPath = join(
      workspacePath,
      '.runs',
      `${taskId}-impl-a`,
      'cli',
      'child-run-1',
      'manifest.json'
    );
    await mkdir(dirname(childLaneManifestPath), { recursive: true });
    await writeJson(childLaneManifestPath, {
      task_id: `${taskId}-impl-a`,
      run_id: 'child-run-1',
      parent_run_id: parentRunId,
      pipeline_id: 'provider-linear-child-lane',
      status: 'succeeded'
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: workspacePath,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: workspacePath,
        CODEX_ORCHESTRATOR_RUNS_DIR: sharedRunsDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: parentManifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker'
      })
    });

    expect(stdout).toContain('Delegation guard: OK (2 subagent manifest(s) found).');
  });

  it('resolves provider-child parent proof through the shared control-host root from a child workspace', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'delegation-guard-provider-child-shared-root-'));
    const parentTaskId = 'linear-lin-issue-1';
    const driftedTaskKey = `${parentTaskId}-source-freshness-recheck`;
    const childTaskId = `${parentTaskId}-docs-review`;
    const parentRunId = 'run-parent';
    const workspacePath = join(tempDir, '.workspaces', parentTaskId);
    const workspaceRunsDir = join(workspacePath, '.runs');
    const sharedRunsDir = join(tempDir, '.runs');
    await mkdir(join(workspacePath, 'tasks'), { recursive: true });
    await writeTaskIndex(workspacePath, [
      {
        id: `20260525-${parentTaskId}`,
        title: 'CO-557 provider issue parent',
        relates_to: `tasks/tasks-${parentTaskId}.md`
      },
      {
        id: `20260519-${driftedTaskKey}`,
        title: 'CO-515 source freshness recheck packet',
        paths: {
          task: `tasks/tasks-${driftedTaskKey}.md`,
          spec: `tasks/specs/${driftedTaskKey}.md`,
          agent_task: `.agent/task/${driftedTaskKey}.md`
        }
      }
    ]);

    const childManifestPath = join(workspaceRunsDir, childTaskId, 'cli', 'run-docs-review', 'manifest.json');
    await mkdir(dirname(childManifestPath), { recursive: true });
    await writeJson(childManifestPath, {
      task_id: childTaskId,
      run_id: 'run-docs-review',
      parent_run_id: parentRunId,
      pipeline_id: 'docs-review',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-515',
      workspace_path: workspacePath
    });

    const docsPacketManifestPath = join(
      workspaceRunsDir,
      `${parentTaskId}-docs-packet`,
      'cli',
      'run-docs-packet',
      'manifest.json'
    );
    await mkdir(dirname(docsPacketManifestPath), { recursive: true });
    await writeJson(docsPacketManifestPath, {
      task_id: `${parentTaskId}-docs-packet`,
      run_id: 'run-docs-packet',
      parent_run_id: parentRunId,
      pipeline_id: 'provider-linear-child-lane',
      status: 'succeeded',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-515',
      workspace_path: workspacePath
    });

    const parentManifestPath = join(sharedRunsDir, parentTaskId, 'cli', parentRunId, 'manifest.json');
    await mkdir(dirname(parentManifestPath), { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: parentRunId,
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-515',
      workspace_path: workspacePath
    });

    const controlHostDir = join(sharedRunsDir, 'local-mcp', 'cli', 'control-host');
    await mkdir(controlHostDir, { recursive: true });
    await writeJson(join(controlHostDir, 'control.json'), {
      status: 'ready',
      task_id: 'local-mcp',
      run_id: 'control-host'
    });
    await writeJson(join(controlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-05-19T00:00:01.000Z',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-515',
          issue_title: 'CO recheck control-host source freshness',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-05-19T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-05-19T00:00:00.000Z',
          updated_at: '2026-05-19T00:00:01.000Z',
          run_id: parentRunId,
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: workspacePath,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: childTaskId,
        CODEX_ORCHESTRATOR_ROOT: workspacePath,
        CODEX_ORCHESTRATOR_RUNS_DIR: workspaceRunsDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: childManifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'docs-review'
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${childTaskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
    expect(stdout).toContain(join(controlHostDir, 'provider-intake-state.json'));
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('rejects provider-child parent proof from a foreign workspace root', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'delegation-guard-provider-child-foreign-root-'));
    const parentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${parentTaskId}-docs-review`;
    const parentRunId = 'run-parent';
    const currentRoot = join(tempDir, 'current-clone');
    const foreignRoot = join(tempDir, 'foreign-clone');
    const workspacePath = join(currentRoot, '.workspaces', parentTaskId);
    const foreignWorkspacePath = join(foreignRoot, '.workspaces', parentTaskId);
    const workspaceRunsDir = join(workspacePath, '.runs');
    const foreignSharedRunsDir = join(foreignRoot, '.runs');
    await mkdir(join(workspacePath, 'tasks'), { recursive: true });
    await writeTaskIndex(workspacePath, [
      {
        id: `20260525-${parentTaskId}`,
        title: 'CO-557 provider issue parent',
        relates_to: `tasks/tasks-${parentTaskId}.md`
      }
    ]);

    const childManifestPath = join(workspaceRunsDir, childTaskId, 'cli', 'run-docs-review', 'manifest.json');
    await mkdir(dirname(childManifestPath), { recursive: true });
    await writeJson(childManifestPath, {
      task_id: childTaskId,
      run_id: 'run-docs-review',
      parent_run_id: parentRunId,
      pipeline_id: 'docs-review',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-515',
      workspace_path: foreignWorkspacePath
    });

    const parentManifestPath = join(foreignSharedRunsDir, parentTaskId, 'cli', parentRunId, 'manifest.json');
    await mkdir(dirname(parentManifestPath), { recursive: true });
    await mkdir(foreignWorkspacePath, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: parentTaskId,
      run_id: parentRunId,
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-515',
      workspace_path: foreignWorkspacePath
    });

    const foreignControlHostDir = join(foreignSharedRunsDir, 'local-mcp', 'cli', 'control-host');
    await mkdir(foreignControlHostDir, { recursive: true });
    await writeJson(join(foreignControlHostDir, 'provider-intake-state.json'), {
      schema_version: 1,
      updated_at: '2026-05-19T00:00:01.000Z',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-515',
          issue_title: 'CO recheck control-host source freshness',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-05-19T00:00:00.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-05-19T00:00:00.000Z',
          updated_at: '2026-05-19T00:00:01.000Z',
          run_id: parentRunId,
          run_manifest_path: parentManifestPath,
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: workspacePath,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: childTaskId,
        CODEX_ORCHESTRATOR_ROOT: workspacePath,
        CODEX_ORCHESTRATOR_RUNS_DIR: workspaceRunsDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: childManifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'docs-review'
      })
    });

    expect(stdout).toContain(
      `Provider docs-review task id '${childTaskId}' requires sanctioned provider parent proof for registered parent task '${parentTaskId}'`
    );
    expect(stdout).not.toContain(join(foreignControlHostDir, 'provider-intake-state.json'));
    expect(stdout).not.toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('keeps provider-worker workspace-scoped searches fail-closed when no delegated child manifests exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'delegation-guard-provider-worker-missing-'));
    const taskId = 'linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be';
    const workspacePath = join(tempDir, '.workspaces', taskId);
    await mkdir(join(workspacePath, 'tasks'), { recursive: true });
    await writeTaskIndex(workspacePath, [
      {
        id: `20260331-${taskId}`,
        title: 'CO: Reconcile provider-worker child-stream delegation evidence with delegation guard',
        relates_to: `tasks/tasks-${taskId}.md`
      }
    ]);

    const sharedRunsDir = join(tempDir, '.runs');
    const parentRunId = '2026-03-31T08-12-50-673Z-86806a3a';
    const parentManifestPath = join(sharedRunsDir, taskId, 'cli', parentRunId, 'manifest.json');
    await mkdir(dirname(parentManifestPath), { recursive: true });
    await mkdir(workspacePath, { recursive: true });
    await writeJson(parentManifestPath, {
      task_id: taskId,
      run_id: parentRunId,
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'fabdf855-dd07-4f8d-8ffa-f02d22cb27be',
      issue_identifier: 'CO-56',
      workspace_path: workspacePath
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: workspacePath,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: workspacePath,
        CODEX_ORCHESTRATOR_RUNS_DIR: sharedRunsDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: parentManifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker'
      })
    });

    expect(stdout).toContain(`No subagent manifests found for '${taskId}'.`);
    expect(stdout).toContain(`${workspacePath}/.runs/${taskId}-*/cli/<run-id>/manifest.json`);
    expect(stdout).not.toContain(`${sharedRunsDir}/${taskId}-*/cli/<run-id>/manifest.json`);
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('ignores a provider-worker manifest whose workspace_path does not match the current workspace', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'delegation-guard-provider-worker-foreign-'));
    const taskId = 'linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be';
    const workspacePath = join(tempDir, '.workspaces', taskId);
    const foreignWorkspacePath = join(tempDir, '.workspaces', `${taskId}-foreign`);
    await mkdir(join(workspacePath, 'tasks'), { recursive: true });
    await writeTaskIndex(workspacePath, [
      {
        id: `20260331-${taskId}`,
        title: 'CO: Reconcile provider-worker child-stream delegation evidence with delegation guard',
        relates_to: `tasks/tasks-${taskId}.md`
      }
    ]);

    const sharedRunsDir = join(tempDir, '.runs');
    const parentRunId = '2026-03-31T08-12-50-673Z-86806a3a';
    const foreignManifestPath = join(sharedRunsDir, taskId, 'cli', parentRunId, 'manifest.json');
    await mkdir(dirname(foreignManifestPath), { recursive: true });
    await mkdir(foreignWorkspacePath, { recursive: true });
    await writeJson(foreignManifestPath, {
      task_id: taskId,
      run_id: parentRunId,
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'fabdf855-dd07-4f8d-8ffa-f02d22cb27be',
      issue_identifier: 'CO-56',
      workspace_path: foreignWorkspacePath
    });

    const foreignChildManifestPath = join(
      foreignWorkspacePath,
      '.runs',
      `${taskId}-docs-review`,
      'cli',
      '2026-03-31T08-23-01-823Z-0c86b6cb',
      'manifest.json'
    );
    await mkdir(dirname(foreignChildManifestPath), { recursive: true });
    await writeJson(foreignChildManifestPath, {
      task_id: `${taskId}-docs-review`,
      run_id: '2026-03-31T08-23-01-823Z-0c86b6cb',
      parent_run_id: parentRunId,
      status: 'succeeded'
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: workspacePath,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: workspacePath,
        CODEX_ORCHESTRATOR_RUNS_DIR: sharedRunsDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: foreignManifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker'
      })
    });

    expect(stdout).toContain(`No subagent manifests found for '${taskId}'.`);
    expect(stdout).toContain(`${workspacePath}/.runs/${taskId}-*/cli/<run-id>/manifest.json`);
    expect(stdout).not.toContain(`${sharedRunsDir}/${taskId}-*/cli/<run-id>/manifest.json`);
    expect(stdout).not.toContain(`${foreignWorkspacePath}/.runs/${taskId}-*/cli/<run-id>/manifest.json`);
    expect(stdout).not.toContain('Delegation guard: OK (1 subagent manifest(s) found).');
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

  it('rejects provider-started fallback runs when the manifest locator is stale even if another control-host lane matches', async () => {
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
      `Provider-started task id '${taskId}' did not match any control-host provider-intake claim in ${join(
        staleControlHostDir,
        'provider-intake-state.json'
      )}`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('accepted via provider-intake contract');
  });

  it('rejects provider-started fallback runs when an explicit locator is stale even if another fallback lane matches', async () => {
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
      `Provider-started task id '${taskId}' did not match any control-host provider-intake claim in ${join(
        staleControlHostDir,
        'provider-intake-state.json'
      )}`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('accepted via provider-intake contract');
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

  it('does not bypass earlier task-index failures when a provider-started contract matches', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const controlHostRunId = 'control-host-run-1';
    const providerIntakeStatePath = join(
      tempDir,
      '.runs',
      'local-mcp',
      'cli',
      controlHostRunId,
      'provider-intake-state.json'
    );

    await mkdir(manifestDir, { recursive: true });
    await writeJson(join(manifestDir, 'manifest.json'), {
      run_id: runId,
      task_id: taskId
    });
    await mkdir(join(tempDir, '.runs', 'local-mcp', 'cli', controlHostRunId), { recursive: true });
    await writeJson(providerIntakeStatePath, {
      schema_version: 1,
      updated_at: '2026-03-20T00:00:00.000Z',
      rehydrated_at: null,
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
          updated_at: '2026-03-20T00:00:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_428_800_000,
          run_id: runId,
          run_manifest_path: join(manifestDir, 'manifest.json'),
          launch_source: 'control-host',
          launch_token: 'launch-token-1'
        }
      ]
    });
    await writeFile(join(tempDir, 'tasks', 'index.json'), '{not-json');

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run', '--task', taskId], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
        CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'launch-token-1'
      })
    });

    expect(stdout).toContain('Unable to read tasks/index.json');
    expect(stdout).not.toContain('Delegation guard: OK (provider-started run contract matched).');
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

  it('accepts provider docs-review child runs with issue fields when the sanctioned provider parent matches', async () => {
    const fixture = await createProviderDocsReviewChildFixture({
      registeredParentKey: 'linear-lin-issue-1'
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${fixture.taskId}' treated as subagent run for sanctioned provider task '${fixture.parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
    expect(stdout).not.toContain(`Provider-started task id '${fixture.taskId}' is missing control-host launch provenance`);
    expect(stdout).not.toContain(`Task id '${fixture.taskId}' is not registered in tasks/index.json`);
  });

  it('rejects provider docs-review child runs when only a drifted sibling task key is registered', async () => {
    const fixture = await createProviderDocsReviewChildFixture({
      registeredParentKey: 'linear-lin-issue-1-source-freshness-recheck'
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'docs-review'
      })
    });

    expect(stdout).toContain(
      `Provider docs-review task id '${fixture.taskId}' matched sanctioned provider parent '${fixture.parentTaskId}' but that parent task is not registered in tasks/index.json`
    );
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
    expect(stdout).not.toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('rejects provider docs-review child runs nested under a registered drifted provider task key', async () => {
    const driftedParentTaskId = 'linear-lin-issue-1-source-freshness-recheck';
    const fixture = await createProviderDocsReviewChildFixture({
      parentTaskId: driftedParentTaskId,
      registeredParentKey: driftedParentTaskId
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'docs-review'
      })
    });

    expect(stdout).toContain(
      `Provider docs-review task id '${fixture.taskId}' must use provider issue task key 'linear-lin-issue-1' as its parent, not '${driftedParentTaskId}'`
    );
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
    expect(stdout).not.toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('rejects active docs-review runs that use the registered provider issue task key as the task id', async () => {
    tempDir = await initRepo();
    const parentTaskId = 'linear-lin-issue-1';
    await writeTaskIndex(tempDir, [
      {
        id: parentTaskId,
        relates_to: `tasks/tasks-${parentTaskId}.md`
      }
    ]);

    const unrelatedChildManifestPath = join(
      tempDir,
      '.runs',
      `${parentTaskId}-docs-packet`,
      'cli',
      'run-docs-packet',
      'manifest.json'
    );
    await mkdir(dirname(unrelatedChildManifestPath), { recursive: true });
    await writeJson(unrelatedChildManifestPath, {
      task_id: `${parentTaskId}-docs-packet`,
      run_id: 'run-docs-packet',
      status: 'succeeded'
    });
    const activeDocsReviewManifestPath = join(
      tempDir,
      '.runs',
      parentTaskId,
      'cli',
      'run-docs-review',
      'manifest.json'
    );
    await mkdir(dirname(activeDocsReviewManifestPath), { recursive: true });
    await writeJson(activeDocsReviewManifestPath, {
      task_id: parentTaskId,
      run_id: 'run-docs-review',
      pipeline_id: 'docs-review',
      status: 'in_progress'
    });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: parentTaskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: activeDocsReviewManifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'docs-review'
      })
    });

    expect(stdout).toContain(
      `Provider docs-review task id '${parentTaskId}' must run as a child task '<registered-provider-issue-task>-docs-review', not as a registered top-level task`
    );
    expect(stdout).not.toContain('Delegation guard: OK');
  });

  it('requires sanctioned provider proof when a registered provider parent prefixes docs-review', async () => {
    const fixture = await createProviderDocsReviewChildFixture({
      registeredParentKey: 'linear-lin-issue-1'
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'docs-review'
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${fixture.taskId}' treated as subagent run for sanctioned provider task '${fixture.parentTaskId}'`
    );
    expect(stdout).not.toContain(`Delegation guard: '${fixture.taskId}' treated as subagent run for '${fixture.parentTaskId}'.`);
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it.each(['docs-packet', 'source-freshness-recheck', 'retry-1'] as const)(
    'rejects provider docs-review task-key drift through %s before generic parent-prefix exemption',
    async (suffix) => {
      const fixture = await createProviderDocsReviewChildFixture({
        childTaskId: `linear-lin-issue-1-${suffix}`,
        registeredParentKey: 'linear-lin-issue-1'
      });
      tempDir = fixture.dir;

      const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
        cwd: fixture.dir,
        env: cleanGuardOverrideEnv({
          MCP_RUNNER_TASK_ID: fixture.taskId,
          CODEX_ORCHESTRATOR_ROOT: fixture.dir,
          CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath,
          CODEX_ORCHESTRATOR_PIPELINE_ID: 'docs-review'
        })
      });

      expect(stdout).toContain(
        `Provider docs-review task id '${fixture.taskId}' must not resolve through sibling provider task key '${fixture.parentTaskId}-${suffix}'`
      );
      expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
      expect(stdout).not.toContain('Delegation guard: OK (subagent runs are exempt).');
    }
  );

  it('keeps non-provider docs-review child tasks on the generic subagent path', async () => {
    tempDir = await initRepo();
    const parentTaskId = '1320-coordinator-follow-up';
    const taskId = `${parentTaskId}-docs-review`;
    await writeTaskIndex(tempDir, [
      {
        id: parentTaskId,
        relates_to: `tasks/tasks-${parentTaskId}.md`
      }
    ]);

    const manifestPath = join(tempDir, '.runs', taskId, 'cli', 'run-docs-review', 'manifest.json');
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: 'run-docs-review',
      pipeline_id: 'docs-review',
      status: 'in_progress'
    });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_PIPELINE_ID: 'docs-review'
      })
    });

    expect(stdout).toContain(`Delegation guard: '${taskId}' treated as subagent run for '${parentTaskId}'.`);
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
    expect(stdout).not.toContain('Provider docs-review task id');
  });

  it('accepts provider docs-review child runs when child and parent manifests use camelCase aliases', async () => {
    const fixture = await createProviderDocsReviewChildFixture({
      childManifestCase: 'camel',
      parentManifestCase: 'camel',
      registeredParentKey: 'linear-lin-issue-1'
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath
      })
    });

    expect(stdout).toContain(
      `Delegation guard: '${fixture.taskId}' treated as subagent run for sanctioned provider task '${fixture.parentTaskId}'`
    );
    expect(stdout).toContain('Delegation guard: OK (subagent runs are exempt).');
    expect(stdout).not.toContain(`Task id '${fixture.taskId}' is not registered in tasks/index.json`);
  });

  it('rejects provider docs-review child runs with issue fields when parent provenance is missing', async () => {
    const fixture = await createProviderDocsReviewChildFixture({
      claimLaunchSource: null,
      claimLaunchToken: null
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath
      })
    });

    expect(stdout).toContain(
      `Provider-started task id '${fixture.taskId}' is missing control-host launch provenance`
    );
    expect(stdout).toContain(`Task id '${fixture.taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
  });

  it('rejects provider docs-review child runs when child issue fields mismatch the sanctioned parent', async () => {
    const fixture = await createProviderDocsReviewChildFixture({
      childIssueId: 'foreign-issue'
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath
      })
    });

    expect(stdout).toContain(
      `Provider-child task id '${fixture.taskId}' issue_id 'foreign-issue' does not match sanctioned provider parent issue_id 'lin-issue-1'`
    );
    expect(stdout).toContain(`Task id '${fixture.taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
  });

  it('reports child issue-field mismatches before stale parent-run mismatches', async () => {
    const fixture = await createProviderDocsReviewChildFixture({
      childIssueId: 'foreign-issue',
      staleParentRunBefore: 'run-stale-parent'
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath
      })
    });

    expect(stdout).toContain(
      `Provider-child task id '${fixture.taskId}' issue_id 'foreign-issue' does not match sanctioned provider parent issue_id 'lin-issue-1'`
    );
    expect(stdout).not.toContain(
      `Provider-child task id '${fixture.taskId}' parent_run_id '${fixture.parentRunId}' does not match sanctioned provider parent run 'run-stale-parent'`
    );
  });

  it('rejects provider docs-review child runs when camelCase child issue fields mismatch the sanctioned parent', async () => {
    const fixture = await createProviderDocsReviewChildFixture({
      childIssueIdCamelCase: 'foreign-issue'
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath
      })
    });

    expect(stdout).toContain(
      `Provider-child task id '${fixture.taskId}' issueId 'foreign-issue' does not match sanctioned provider parent issue_id 'lin-issue-1'`
    );
    expect(stdout).toContain(`Task id '${fixture.taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain('treated as subagent run for sanctioned provider task');
  });

  it('rejects provider docs-review child runs when the registered parent prefix does not match', async () => {
    const registeredParentKey = 'CO-458-source-root-freshness-drift';
    const observedUnregisteredChildTask = 'linear-lin-issue-1-docs-review';
    const fixture = await createProviderDocsReviewChildFixture({
      parentTaskId: registeredParentKey,
      childTaskId: observedUnregisteredChildTask,
      registeredParentKey
    });
    tempDir = fixture.dir;

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: fixture.dir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: fixture.taskId,
        CODEX_ORCHESTRATOR_ROOT: fixture.dir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: fixture.manifestPath
      })
    });

    expect(stdout).toContain(`Task id '${fixture.taskId}' is not registered in tasks/index.json`);
    expect(stdout).toContain('Use MCP_RUNNER_TASK_ID="<registered-parent-task>-<stream>"');
    expect(stdout).toContain('--parent-run <provider-parent-run-id>');
    expect(stdout).toContain('Do not append another nested stream to an unregistered child task id');
    expect(stdout).not.toContain(
      `Delegation guard: '${fixture.taskId}' treated as subagent run for sanctioned provider task '${registeredParentKey}'`
    );
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

  it('accepts provider-child runs when the provider parent claim path is stale but the canonical parent manifest matches', async () => {
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
          run_manifest_path: join(tempDir, '.runs', parentTaskId, 'cli', 'relocated-run-parent', 'manifest.json'),
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

  it('preserves prior failures before accepting a sanctioned provider parent subagent run', async () => {
    tempDir = await initRepo();
    await rm(join(tempDir, 'tasks', 'index.json'));
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

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain('Delegation guard: issues detected');
    expect(stdout).toContain('Unable to read tasks/index.json');
    expect(stdout).not.toContain('Delegation guard: OK (subagent runs are exempt).');
  });

  it('rejects delegated child runs when the manifest locator is stale even if another control-host lane matches', async () => {
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

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(
      `Provider-child task id '${taskId}' parent_run_id 'run-parent-new' does not match sanctioned provider parent run 'run-parent-old'`
    );
    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
  });

  it('rejects delegated child runs when an explicit locator is stale even if another fallback lane matches', async () => {
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

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: cleanGuardOverrideEnv({
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
      })
    });

    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain(
      `Delegation guard: '${taskId}' treated as subagent run for sanctioned provider task '${parentTaskId}'`
    );
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

    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain(
      `Provider-child task id '${taskId}' is missing parent_run_id in active manifest '${manifestPath}'`
    );
  });

  it('rejects ordinary unregistered top-level runs without emitting provider-child diagnostics', async () => {
    tempDir = await initRepo();
    const taskId = 'ad-hoc-top-level-run';
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

    expect(stdout).toContain(`Task id '${taskId}' is not registered in tasks/index.json`);
    expect(stdout).not.toContain(`Provider-child task id '${taskId}'`);
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

  it('accepts provider-started fallback runs when the claim manifest path is stale but the claim run id matches', async () => {
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

    expect(stdout).toContain(`'${taskId}' accepted via provider-intake contract`);
    expect(stdout).toContain('Delegation guard: OK (provider-started run contract matched).');
  });

  it('rejects provider-started fallback runs when the claim points at a different canonical run id', async () => {
    tempDir = await initRepo();
    const taskId = 'linear-lin-issue-1';
    const runId = '2026-03-20T00-00-00-000Z-run-1';
    const manifestDir = join(tempDir, '.runs', taskId, 'cli', runId);
    const manifestPath = join(manifestDir, 'manifest.json');
    await mkdir(manifestDir, { recursive: true });
    await writeJson(manifestPath, {
      task_id: taskId,
      run_id: runId,
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
          run_id: 'different-run',
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
