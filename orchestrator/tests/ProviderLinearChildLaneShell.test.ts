import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PROVIDER_LINEAR_CHILD_LANE_PARALLEL_FIRST_CAP,
  runProviderLinearChildLaneShell
} from '../src/cli/providerLinearChildLaneShell.js';
import {
  PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME,
  type ProviderLinearChildLaneProof
} from '../src/cli/providerLinearChildLaneRunner.js';
import {
  appendProviderLinearWorkerChildLaneRecord,
  readProviderLinearWorkerChildLanes,
  type ProviderLinearWorkerChildLaneRecord
} from '../src/cli/providerLinearWorkerRunner.js';
import { resolveProviderLinearChildLaneScopeContract } from '../src/cli/providerLinearChildLanePhaseContract.js';

let tempRoot: string | null = null;
let externalRoot: string | null = null;

const RUN_ID = 'provider-run-1';
const TASK_ID = 'linear-lin-issue-1';
const CONTROL_HOST_TASK_ID = 'local-mcp';
const CONTROL_HOST_RUN_ID = 'control-host-run-1';
const ISSUE = { issue_id: 'lin-issue-1', issue_identifier: 'CO-35' };

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
  if (externalRoot) {
    await rm(externalRoot, { recursive: true, force: true });
    externalRoot = null;
  }
});

async function createProviderWorkerManifest(runsRootOverride: string | null = null) {
  tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-'));
  const runsRoot = runsRootOverride ?? tempRoot;
  const runDir = join(runsRoot, '.runs', TASK_ID, 'cli', RUN_ID);
  const manifestPath = join(runDir, 'manifest.json');
  await mkdir(runDir, { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      run_id: RUN_ID,
      task_id: TASK_ID,
      pipeline_id: 'provider-linear-worker',
      ...ISSUE,
      issue_updated_at: '2026-03-30T07:10:00.000Z',
      provider_control_host_task_id: CONTROL_HOST_TASK_ID,
      provider_control_host_run_id: CONTROL_HOST_RUN_ID,
      workspace_path: tempRoot
    }),
    'utf8'
  );
  return { manifestPath, runDir };
}

function buildProviderWorkerEnv(
  manifestPath: string,
  overrides: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv {
  return {
    CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
    CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
    CODEX_ORCHESTRATOR_RUN_ID: RUN_ID,
    CODEX_ORCHESTRATOR_TASK_ID: TASK_ID,
    CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
    CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: CONTROL_HOST_TASK_ID,
    CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: CONTROL_HOST_RUN_ID,
    ...overrides
  };
}

function createLaneRecord(overrides: Partial<ProviderLinearWorkerChildLaneRecord> = {}): ProviderLinearWorkerChildLaneRecord {
  const defaultScope = resolveProviderLinearChildLaneScopeContract({
    files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
    phases: []
  });
  const { scope: overrideScope, ...restOverrides } = overrides;
  return {
    stream: 'impl-a',
    pipeline_id: 'provider-linear-child-lane',
    task_id: `${TASK_ID}-impl-a`,
    run_id: 'child-run-1',
    status: 'succeeded',
    manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'manifest.json'),
    artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1'),
    log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'run.log'),
    summary: 'child lane finished',
    issue_id: ISSUE.issue_id,
    issue_identifier: ISSUE.issue_identifier,
    workspace_path: tempRoot,
    source_setup: null,
    launched_at: '2026-03-30T07:12:00.000Z',
    purpose: 'Implement bounded child lane support',
    instructions: null,
    scope: overrideScope ? resolveProviderLinearChildLaneScopeContract(overrideScope) : defaultScope,
    parent_snapshot: {
      base_sha: 'parent-base-sha',
      issue_updated_at: '2026-03-30T07:10:00.000Z',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      captured_at: '2026-03-30T07:11:00.000Z'
    },
    lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
    patch_artifact_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'provider-linear-child-lane.patch'),
    patch_bytes: 128,
    decision: 'pending',
    in_flight_started_at: null,
    decision_at: null,
    decision_reason: null,
    ...restOverrides
  };
}

async function writePatchArtifact(patchPath: string, filePath: string): Promise<void> {
  await mkdir(dirname(patchPath), { recursive: true });
  await writeFile(
    patchPath,
    `diff --git a/${filePath} b/${filePath}\n`,
    'utf8'
  );
}

async function writeChildLaneProof(
  childLane: ProviderLinearWorkerChildLaneRecord,
  overrides: Partial<ProviderLinearChildLaneProof> = {}
): Promise<ProviderLinearChildLaneProof> {
  const artifactRoot = childLane.artifact_root;
  if (!artifactRoot) {
    throw new Error('child lane artifact root is required for proof fixtures');
  }
  const proof: ProviderLinearChildLaneProof = {
    issue_id: childLane.issue_id,
    issue_identifier: childLane.issue_identifier,
    task_id: childLane.task_id,
    run_id: childLane.run_id,
    parent_run_id: RUN_ID,
    stream: childLane.stream,
    purpose: childLane.purpose,
    instructions: childLane.instructions,
    scope: childLane.scope,
    parent_snapshot: childLane.parent_snapshot,
    lane_workspace_path: childLane.lane_workspace_path ?? join(tempRoot ?? '', '.child-lanes', `${childLane.stream}-${childLane.run_id}`),
    lane_branch: `child-lane/${childLane.stream}-${childLane.run_id}`,
    patch_artifact_path: childLane.patch_artifact_path ?? join(artifactRoot, 'provider-linear-child-lane.patch'),
    patch_bytes: childLane.patch_bytes ?? 128,
    thread_id: 'thread-1',
    latest_turn_id: 'turn-1',
    latest_session_id: 'thread-1-turn-1',
    latest_session_id_source: 'derived_from_thread_and_turn',
    last_event: 'task_complete',
    last_message: 'child lane complete',
    last_event_at: '2026-03-30T07:12:00.000Z',
    tokens: {
      input_tokens: 10,
      output_tokens: 12,
      total_tokens: 22
    },
    rate_limits: null,
    status: childLane.status === 'failed' ? 'failed' : 'succeeded',
    updated_at: '2026-03-30T07:12:00.000Z',
    ...overrides
  };
  await mkdir(artifactRoot, { recursive: true });
  await writeFile(
    join(artifactRoot, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
    JSON.stringify(proof),
    'utf8'
  );
  return proof;
}

async function writeChildLaneManifest(
  childLane: ProviderLinearWorkerChildLaneRecord,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await mkdir(dirname(childLane.manifest_path), { recursive: true });
  await writeFile(
    childLane.manifest_path,
    JSON.stringify({
      run_id: childLane.run_id,
      task_id: childLane.task_id,
      pipeline_id: childLane.pipeline_id,
      parent_run_id: RUN_ID,
      issue_id: childLane.issue_id,
      issue_identifier: childLane.issue_identifier,
      status: childLane.status,
      artifact_root: childLane.artifact_root,
      manifest_path: childLane.manifest_path,
      log_path: childLane.log_path,
      summary: childLane.summary,
      ...overrides
    }),
    'utf8'
  );
}

describe('runProviderLinearChildLaneShell', () => {
  it('launches a same-issue child lane and records parent-owned lineage', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const env = buildProviderWorkerEnv(manifestPath, {
      CODEX_ORCHESTRATOR_RUNS_DIR: join('/tmp', 'shared-runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join('/tmp', 'shared-out'),
      CODEX_HOME: join(tempRoot ?? '', 'codex-home'),
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    });
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-impl-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'impl-a',
      purpose: 'Implement bounded child lane support',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-30T07:10:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      lane_branch: 'child-lane/impl-a-child-run-1',
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'child lane complete',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const execRunner = vi.fn(async () => {
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify(childProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: [
          'Advanced mode (auto) enabled.',
          JSON.stringify({
            run_id: 'child-run-1',
            status: 'succeeded',
            artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
            manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
            log_path: `.runs/${TASK_ID}-impl-a/cli/child-run-1/run.log`,
            summary: 'child lane finished'
          }, null, 2)
        ].join('\n'),
        stderr: ''
      };
    });
    const refreshProofSnapshot = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'launched',
      stream: 'impl-a',
      child_run: {
        run_id: 'child-run-1',
        task_id: `${TASK_ID}-impl-a`,
        status: 'succeeded'
      },
      child_lane: {
        decision: 'pending',
        patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
        parent_snapshot: {
          base_sha: 'parent-base-sha'
        }
      }
    });
    expect(execRunner).toHaveBeenCalledWith(expect.objectContaining({
      args: expect.arrayContaining([
        'start',
        'provider-linear-child-lane',
        '--task',
        `${TASK_ID}-impl-a`,
        '--parent-run',
        RUN_ID
      ])
    }));
    const request = execRunner.mock.calls[0]?.[0];
    expect(request?.env.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(join(tempRoot ?? '', '.runs'));
    expect(request?.env.CODEX_ORCHESTRATOR_OUT_DIR).toBe(join(tempRoot ?? '', 'out'));
    expect(refreshProofSnapshot).toHaveBeenCalledWith(runDir, null, env);
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        run_id: 'child-run-1',
        decision: 'pending'
      })
    ]);
  });

  it('classifies zero-byte child-lane patches as no-output advisory evidence', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-analysis-a`, 'cli', 'child-run-1');
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-analysis-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'analysis-a',
      purpose: 'Read-only advisory check',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-30T07:10:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'analysis-a-child-run-1'),
      lane_branch: 'child-lane/analysis-a-child-run-1',
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 0,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'no code changes needed',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const execRunner = vi.fn(async () => {
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify(childProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-analysis-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-analysis-a/cli/child-run-1/manifest.json`,
          log_path: `.runs/${TASK_ID}-analysis-a/cli/child-run-1/run.log`,
          summary: 'read-only advisory complete'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'analysis-a',
        purpose: 'Read-only advisory check',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'launched',
      child_lane: {
        decision: 'rejected',
        patch_bytes: 0,
        decision_reason: expect.stringContaining('No-output advisory')
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'analysis-a',
        decision: 'rejected',
        decision_reason: expect.stringContaining('parent owns any implementation patch')
      })
    ]);
  });

  it('keeps failed zero-byte child-lane runs in the failure decision flow', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childTaskId = `${TASK_ID}-analysis-failed`;
    const childRunId = 'child-run-failed';
    const childRunDir = join(tempRoot ?? '', '.runs', childTaskId, 'cli', childRunId);
    const failedLane = createLaneRecord({
      stream: 'analysis-failed',
      task_id: childTaskId,
      run_id: childRunId,
      status: 'failed',
      artifact_root: childRunDir,
      manifest_path: join(childRunDir, 'manifest.json'),
      log_path: join(childRunDir, 'run.log'),
      summary: 'read-only advisory failed',
      purpose: 'Read-only advisory check',
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'analysis-failed-child-run-failed'),
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 0
    });
    const execRunner = vi.fn(async () => {
      await writeChildLaneProof(failedLane, {
        last_event: 'task_failed',
        last_message: 'child failed before edits'
      });
      return {
        exitCode: 1,
        stdout: JSON.stringify({
          run_id: childRunId,
          status: 'failed',
          artifact_root: `.runs/${childTaskId}/cli/${childRunId}`,
          manifest: `.runs/${childTaskId}/cli/${childRunId}/manifest.json`,
          log_path: `.runs/${childTaskId}/cli/${childRunId}/run.log`,
          summary: 'read-only advisory failed'
        }),
        stderr: 'child failed'
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'analysis-failed',
        purpose: 'Read-only advisory check',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      error: {
        code: 'provider_worker_child_lane_run_failed'
      },
      child_lane: {
        stream: 'analysis-failed',
        status: 'failed',
        patch_bytes: 0,
        decision: 'pending',
        decision_reason: null
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'analysis-failed',
        status: 'failed',
        patch_bytes: 0,
        decision: 'pending',
        decision_reason: null
      })
    ]);
  });

  it('keeps nonzero-exit zero-byte child-lane outputs in the failure decision flow', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childTaskId = `${TASK_ID}-analysis-nonzero`;
    const childRunId = 'child-run-nonzero';
    const childRunDir = join(tempRoot ?? '', '.runs', childTaskId, 'cli', childRunId);
    const inconsistentLane = createLaneRecord({
      stream: 'analysis-nonzero',
      task_id: childTaskId,
      run_id: childRunId,
      status: 'succeeded',
      artifact_root: childRunDir,
      manifest_path: join(childRunDir, 'manifest.json'),
      log_path: join(childRunDir, 'run.log'),
      summary: 'wrapper reported nonzero exit',
      purpose: 'Read-only advisory check',
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'analysis-nonzero-child-run-nonzero'),
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 0
    });
    const execRunner = vi.fn(async () => {
      await writeChildLaneProof(inconsistentLane, {
        last_message: 'child output said succeeded but wrapper exited nonzero'
      });
      return {
        exitCode: 1,
        stdout: JSON.stringify({
          run_id: childRunId,
          status: 'succeeded',
          artifact_root: `.runs/${childTaskId}/cli/${childRunId}`,
          manifest: `.runs/${childTaskId}/cli/${childRunId}/manifest.json`,
          log_path: `.runs/${childTaskId}/cli/${childRunId}/run.log`,
          summary: 'wrapper reported nonzero exit'
        }),
        stderr: 'wrapper failed'
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'analysis-nonzero',
        purpose: 'Read-only advisory check',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      error: {
        code: 'provider_worker_child_lane_run_failed'
      },
      child_lane: {
        stream: 'analysis-nonzero',
        status: 'succeeded',
        patch_bytes: 0,
        decision: 'pending',
        decision_reason: null
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'analysis-nonzero',
        status: 'succeeded',
        patch_bytes: 0,
        decision: 'pending',
        decision_reason: null
      })
    ]);
  });

  it('reserves the child lane ledger before spawning the child run', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-impl-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'impl-a',
      purpose: 'Implement bounded child lane support',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-30T07:10:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      lane_branch: 'child-lane/impl-a-child-run-1',
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'child lane complete',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const execRunner = vi.fn(async () => {
      const reserved = await readProviderLinearWorkerChildLanes(runDir);
      expect(reserved).toEqual([
        expect.objectContaining({
          stream: 'impl-a',
          task_id: `${TASK_ID}-impl-a`,
          status: 'launching',
          decision: 'pending',
          patch_artifact_path: null
        })
      ]);
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify(childProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
          log_path: `.runs/${TASK_ID}-impl-a/cli/child-run-1/run.log`,
          summary: 'child lane finished'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      action: 'launched',
      child_lane: {
        run_id: 'child-run-1',
        status: 'succeeded'
      }
    });
  });

  it('fails closed when the same-issue parallel-first child-lane cap is exhausted', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    await appendProviderLinearWorkerChildLaneRecord(
      runDir,
      createLaneRecord({
        stream: 'impl-a',
        task_id: `${TASK_ID}-impl-a`,
        run_id: 'child-run-1',
        scope: {
          files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
          phases: []
        }
      })
    );
    await appendProviderLinearWorkerChildLaneRecord(
      runDir,
      createLaneRecord({
        stream: 'impl-b',
        task_id: `${TASK_ID}-impl-b`,
        run_id: 'child-run-2',
        status: 'running',
        scope: {
          files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
          phases: []
        }
      })
    );
    const execRunner = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-c',
        purpose: 'Implement another independent bounded slice',
        files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      child_lane: null,
      error: {
        code: 'provider_worker_child_lane_cap_exhausted',
        status: 409
      }
    });
    if (result.ok) {
      throw new Error('expected cap exhaustion failure');
    }
    expect(result.error?.message).toContain(
      `${PROVIDER_LINEAR_CHILD_LANE_PARALLEL_FIRST_CAP}/${PROVIDER_LINEAR_CHILD_LANE_PARALLEL_FIRST_CAP} active, pending, or unaccepted`
    );
    expect(result.error?.message).toContain('stay_serial');
    expect(result.error?.message).toContain('existing_child_lane_active');
    expect(result.error?.message).toContain('cap_exhausted');
    expect(execRunner).not.toHaveBeenCalled();
    expect(await readProviderLinearWorkerChildLanes(runDir)).toHaveLength(
      PROVIDER_LINEAR_CHILD_LANE_PARALLEL_FIRST_CAP
    );
  });

  it('excludes stale in-flight accept claims from the parallel-first cap for independent launches', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    await appendProviderLinearWorkerChildLaneRecord(
      runDir,
      createLaneRecord({
        stream: 'impl-a',
        task_id: `${TASK_ID}-impl-a`,
        run_id: 'child-run-1',
        scope: {
          files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
          phases: []
        }
      })
    );
    await appendProviderLinearWorkerChildLaneRecord(
      runDir,
      createLaneRecord({
        stream: 'impl-b',
        task_id: `${TASK_ID}-impl-b`,
        run_id: 'child-run-2',
        in_flight_action: 'accept',
        in_flight_started_at: '2026-03-30T07:00:00.000Z',
        scope: {
          files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
          phases: []
        }
      })
    );
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-c`, 'cli', 'child-run-3');
    const launchedLane = createLaneRecord({
      stream: 'impl-c',
      task_id: `${TASK_ID}-impl-c`,
      run_id: 'child-run-3',
      artifact_root: childRunDir,
      manifest_path: join(childRunDir, 'manifest.json'),
      log_path: join(childRunDir, 'run.log'),
      scope: {
        files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
        phases: []
      }
    });
    const execRunner = vi.fn(async () => {
      await writeChildLaneProof(launchedLane);
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-3',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-impl-c/cli/child-run-3`,
          manifest: `.runs/${TASK_ID}-impl-c/cli/child-run-3/manifest.json`,
          log_path: `.runs/${TASK_ID}-impl-c/cli/child-run-3/run.log`,
          summary: 'child lane finished'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-c',
        purpose: 'Implement another independent bounded slice',
        files: ['orchestrator/src/cli/providerLinearWorkerRunner.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        now: vi.fn(() => '2026-03-30T07:45:00.000Z'),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'launched',
      stream: 'impl-c',
      child_lane: {
        stream: 'impl-c',
        decision: 'pending'
      }
    });
    expect(execRunner).toHaveBeenCalledOnce();
  });

  it('preserves parent invalidation when a launching reservation later records child output', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const env = buildProviderWorkerEnv(manifestPath);
    const completedLane = createLaneRecord();
    const invalidationReason = 'Parent invalidated pre-launch reservation before child output landed.';
    const execRunner = vi.fn(async () => {
      expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
        expect.objectContaining({
          stream: 'impl-a',
          task_id: `${TASK_ID}-impl-a`,
          status: 'launching',
          decision: 'pending',
          patch_artifact_path: null
        })
      ]);
      const invalidation = await runProviderLinearChildLaneShell(
        {
          action: 'invalidate',
          streamName: 'impl-a',
          reason: invalidationReason,
          env
        },
        {
          refreshProofSnapshot: vi.fn(async () => undefined)
        }
      );
      expect(invalidation).toMatchObject({
        ok: true,
        action: 'invalidated',
        child_lane: {
          decision: 'invalidated',
          decision_reason: invalidationReason
        }
      });
      expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
        expect.objectContaining({
          stream: 'impl-a',
          status: 'launching',
          decision: 'invalidated',
          decision_reason: invalidationReason
        })
      ]);
      await writeChildLaneProof(completedLane);
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: completedLane.run_id,
          status: completedLane.status,
          artifact_root: completedLane.artifact_root,
          manifest: completedLane.manifest_path,
          log_path: completedLane.log_path,
          summary: completedLane.summary
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      action: 'launched',
      child_lane: {
        run_id: completedLane.run_id,
        status: 'succeeded',
        patch_artifact_path: completedLane.patch_artifact_path,
        decision: 'invalidated',
        decision_reason: invalidationReason
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        run_id: completedLane.run_id,
        status: 'succeeded',
        patch_artifact_path: completedLane.patch_artifact_path,
        decision: 'invalidated',
        decision_reason: invalidationReason
      })
    ]);
  });

  it('preserves parent invalidation when launch cleanup follows malformed child output', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const env = buildProviderWorkerEnv(manifestPath);
    const invalidationReason = 'Parent invalidated pre-launch reservation before malformed child output landed.';
    const execRunner = vi.fn(async () => {
      const invalidation = await runProviderLinearChildLaneShell(
        {
          action: 'invalidate',
          streamName: 'impl-a',
          reason: invalidationReason,
          env
        },
        {
          refreshProofSnapshot: vi.fn(async () => undefined)
        }
      );
      expect(invalidation).toMatchObject({
        ok: true,
        action: 'invalidated',
        child_lane: {
          decision: 'invalidated',
          decision_reason: invalidationReason
        }
      });
      return {
        exitCode: 0,
        stdout: 'malformed child lane output',
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'provider_worker_child_lane_output_invalid'
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        status: 'launching',
        decision: 'invalidated',
        decision_reason: invalidationReason
      })
    ]);
  });

  it('lets the parent invalidate a launching reservation so stale cap slots are recoverable', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const launchingLane = createLaneRecord({
      run_id: 'launching-stale-1',
      status: 'launching',
      patch_artifact_path: null,
      patch_bytes: null,
      lane_workspace_path: null
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, launchingLane);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'invalidate',
        streamName: launchingLane.stream,
        reason: 'Parent invalidated stale pre-launch reservation.',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'invalidated',
      child_lane: {
        stream: launchingLane.stream,
        status: 'launching',
        decision: 'invalidated',
        decision_reason: 'Parent invalidated stale pre-launch reservation.'
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: launchingLane.stream,
        decision: 'invalidated'
      })
    ]);
  });

  it('fails closed when prelude logs precede a malformed final child-lane payload', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const badStdout = [
      'Advanced mode (auto) enabled.',
      '{',
      '  "run_id": "child-run-1",',
      '  "status": "succeeded",',
      `  "artifact_root": ".runs/${TASK_ID}-impl-a/cli/child-run-1",`,
      `  "manifest": ".runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json"`
    ].join('\n');

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: vi.fn(async () => ({ exitCode: 0, stdout: badStdout, stderr: '' })) as never,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      stream: 'impl-a',
      child_run: null,
      child_lane: null,
      error: {
        code: 'provider_worker_child_lane_output_invalid',
        status: 502
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([]);
  });

  it('preserves the parent repo-config override when launching a child lane', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const repoConfigOverride = join(tempRoot ?? '', '.runs', CONTROL_HOST_TASK_ID, 'cli', CONTROL_HOST_RUN_ID, 'provider-workflow.last-known-good.json');
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-impl-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'impl-a',
      purpose: 'Implement bounded child lane support',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-30T07:10:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      lane_branch: 'child-lane/impl-a-child-run-1',
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'child lane complete',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const execRunner = vi.fn(async (request) => {
      expect(request.env.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBe(repoConfigOverride);
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify(childProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
          log_path: `.runs/${TASK_ID}-impl-a/cli/child-run-1/run.log`,
          summary: 'child lane finished'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: repoConfigOverride
        })
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      action: 'launched',
      child_lane: {
        run_id: 'child-run-1',
        status: 'succeeded'
      }
    });
  });

  it('keeps launch success when proof refresh fails after recording the child lane', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const patchPath = join(childRunDir, 'provider-linear-child-lane.patch');
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-impl-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'impl-a',
      purpose: 'Implement bounded child lane support',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-30T07:10:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      lane_branch: 'child-lane/impl-a-child-run-1',
      patch_artifact_path: patchPath,
      patch_bytes: 128,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'child lane complete',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const warn = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: vi.fn(async () => {
          await mkdir(childRunDir, { recursive: true });
          await writeFile(
            join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
            JSON.stringify(childProof),
            'utf8'
          );
          await writePatchArtifact(patchPath, 'orchestrator/src/cli/providerLinearChildStreamShell.ts');
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              run_id: 'child-run-1',
              status: 'succeeded',
              artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
              manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
              log_path: `.runs/${TASK_ID}-impl-a/cli/child-run-1/run.log`,
              summary: 'child lane finished'
            }),
            stderr: ''
          };
        }) as never,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => {
          throw new Error('proof refresh exploded');
        }) as never,
        warn
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'launched',
      stream: 'impl-a',
      child_run: {
        run_id: 'child-run-1',
        task_id: `${TASK_ID}-impl-a`
      }
    });
    expect(warn).toHaveBeenCalledWith(
      'provider-linear-child-lane warning: failed to refresh proof snapshot after recording child lane impl-a: proof refresh exploded'
    );
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        run_id: 'child-run-1'
      })
    ]);
  });

  it('accepts workspace-local child output when the parent manifest lives under an external shared runs root', async () => {
    externalRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-shared-'));
    const { manifestPath } = await createProviderWorkerManifest(externalRoot);
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-impl-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'impl-a',
      purpose: 'Implement bounded child lane support',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-30T07:10:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      lane_branch: 'child-lane/impl-a-child-run-1',
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'child lane complete',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const execRunner = vi.fn(async () => {
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify(childProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
          log_path: `.runs/${TASK_ID}-impl-a/cli/child-run-1/run.log`,
          summary: 'child lane finished'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_RUNS_DIR: join(externalRoot, '.runs')
        })
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      child_run: {
        manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'manifest.json')
      },
      child_lane: {
        patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch')
      }
    });
  });

  it('rejects overlapping pending scopes before launching another child lane', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    await appendProviderLinearWorkerChildLaneRecord(runDir, createLaneRecord());
    const execRunner = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-b',
        purpose: 'Attempt overlapping work',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: execRunner as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha')
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      stream: 'impl-b',
      error: {
        code: 'provider_worker_child_lane_scope_conflict',
        status: 409
      }
    });
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('serializes same-stream child lanes until the earlier lane is resolved', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    await appendProviderLinearWorkerChildLaneRecord(runDir, createLaneRecord());
    const execRunner = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Attempt same-stream relaunch',
        files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: execRunner as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha')
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      stream: 'impl-a',
      error: {
        code: 'provider_worker_child_lane_scope_conflict',
        message: 'Child lane stream impl-a already has unresolved lane child-run-1; accept, reject, or invalidate that lane before relaunching the same stream.',
        status: 409
      }
    });
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('rejects launch when the parent workspace already has in-scope pending changes', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-b',
        purpose: 'Attempt overlapping work',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: execRunner as never,
        readParentDirtyPaths: vi.fn(async () => ['orchestrator/src/cli/providerLinearChildStreamShell.ts']) as never
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      error: {
        code: 'provider_worker_child_lane_parent_dirty',
        status: 409
      }
    });
    if (!result.ok) {
      expect(result.error?.message).toContain('move scratch workpad/temp artifacts outside the repo');
    }
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('ignores repo-local temp workpad artifacts before phase-scoped launch', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-docs-a`, 'cli', 'child-run-1');
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-docs-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'docs-a',
      purpose: 'Create docs packet',
      instructions: null,
      scope: {
        files: [],
        phases: ['docs']
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-30T07:10:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'docs-a-child-run-1'),
      lane_branch: 'child-lane/docs-a-child-run-1',
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'docs lane complete',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const execRunner = vi.fn(async () => {
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify(childProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-docs-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-docs-a/cli/child-run-1/manifest.json`,
          log_path: `.runs/${TASK_ID}-docs-a/cli/child-run-1/run.log`,
          summary: 'docs lane complete'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'docs-a',
        purpose: 'Create docs packet',
        phases: ['docs'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => ['.tmp/workpad.md']) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'launched',
      stream: 'docs-a'
    });
    expect(execRunner).toHaveBeenCalledTimes(1);
  });

  it('keeps non-workpad temp paths visible to phase-scoped dirty checks', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'docs-a',
        purpose: 'Create docs packet',
        phases: ['docs'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: execRunner as never,
        readParentDirtyPaths: vi.fn(async () => ['.tmp/notes.md']) as never
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      error: {
        code: 'provider_worker_child_lane_parent_dirty',
        message: expect.stringContaining('.tmp/notes.md'),
        status: 409
      }
    });
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('normalizes file scopes before comparing them against dirty parent paths', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-b',
        purpose: 'Attempt overlapping work',
        files: ['./orchestrator/src/cli/../cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: execRunner as never,
        readParentDirtyPaths: vi.fn(async () => ['orchestrator/src/cli/providerLinearChildStreamShell.ts']) as never
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      error: {
        code: 'provider_worker_child_lane_parent_dirty',
        status: 409
      }
    });
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('normalizes repo-root absolute file scopes before comparing them against dirty parent paths', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-b',
        purpose: 'Attempt overlapping work',
        files: [join(tempRoot ?? '', 'orchestrator/src/cli/providerLinearChildStreamShell.ts')],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: execRunner as never,
        readParentDirtyPaths: vi.fn(async () => ['orchestrator/src/cli/providerLinearChildStreamShell.ts']) as never
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      error: {
        code: 'provider_worker_child_lane_parent_dirty',
        status: 409
      }
    });
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('launches phase-only child lanes when the proof scope matches the phase contract', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const expectedScope = resolveProviderLinearChildLaneScopeContract({
      files: [],
      phases: ['implementation']
    });
    const execRunner = vi.fn(async () => {
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify({
          issue_id: ISSUE.issue_id,
          issue_identifier: ISSUE.issue_identifier,
          task_id: `${TASK_ID}-impl-a`,
          run_id: 'child-run-1',
          parent_run_id: RUN_ID,
          stream: 'impl-a',
          purpose: 'Implement bounded child lane support',
          instructions: null,
          scope: expectedScope,
          parent_snapshot: {
            base_sha: 'parent-base-sha',
            issue_updated_at: '2026-03-30T07:10:00.000Z',
            issue_state: 'In Progress',
            issue_state_type: 'started',
            captured_at: '2026-03-30T07:11:00.000Z'
          },
          lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
          lane_branch: 'child-lane/impl-a-child-run-1',
          patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
          patch_bytes: 128,
          thread_id: 'thread-1',
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          last_event: 'task_complete',
          last_message: 'child lane complete',
          last_event_at: '2026-03-30T07:12:00.000Z',
          tokens: {
            input_tokens: 10,
            output_tokens: 12,
            total_tokens: 22
          },
          rate_limits: null,
          status: 'succeeded',
          updated_at: '2026-03-30T07:12:00.000Z'
        } satisfies ProviderLinearChildLaneProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
          log_path: `.runs/${TASK_ID}-impl-a/cli/child-run-1/run.log`,
          summary: 'child lane finished'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        phases: ['implementation'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: execRunner as never,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'launched',
      child_lane: {
        stream: 'impl-a',
        decision: 'pending',
        scope: expectedScope
      }
    });
    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(await readProviderLinearWorkerChildLanes(join(tempRoot ?? '', '.runs', TASK_ID, 'cli', RUN_ID))).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        decision: 'pending',
        scope: expectedScope
      })
    ]);
  });

  it('ignores child-lane artifact paths when mixed file-and-phase scopes inspect parent dirtiness', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-impl-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'impl-a',
      purpose: 'Implement bounded child lane support',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
        phases: ['implementation']
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-30T07:10:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      lane_branch: 'child-lane/impl-a-child-run-1',
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'child lane complete',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const execRunner = vi.fn(async () => {
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify(childProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
          summary: 'child lane finished'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
        phases: ['implementation'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => [
          '.child-lanes/impl-a-child-run-0/provider-linear-child-lane-proof.json'
        ]) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'launched',
      child_lane: {
        stream: 'impl-a',
        decision: 'pending',
        scope: {
          files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
          phases: ['implementation']
        }
      }
    });
    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        decision: 'pending',
        scope: expect.objectContaining({
          files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
          phases: ['implementation']
        })
      })
    ]);
  });

  it('fails launch when a succeeded child lane does not write a readable proof bundle with a patch artifact', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const execRunner = vi.fn(async () => {
      await mkdir(childRunDir, { recursive: true });
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
          summary: 'child lane finished'
        }),
        stderr: ''
      };
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner,
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: '2026-03-30T07:10:00.000Z',
          state: 'In Progress',
          state_type: 'started'
        })) as never,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      child_run: {
        run_id: 'child-run-1'
      },
      error: {
        code: 'provider_worker_child_lane_proof_missing',
        status: 502
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([]);
  });

  it('returns a failure envelope when launch dependencies throw unexpectedly', async () => {
    const { manifestPath } = await createProviderWorkerManifest();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
        transactChildLanes: vi.fn(async () => {
          throw new Error('ledger exploded');
        }) as never
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'launch',
      stream: 'impl-a',
      error: {
        code: 'provider_worker_child_lane_unhandled_failure',
        message: 'ledger exploded',
        status: 502
      }
    });
  });

  it('invalidates stale child lane output when the parent head has moved', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        readParentHeadSha: vi.fn(async () => 'new-parent-head'),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_stale',
        status: 409
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: childLane.stream,
        decision: 'invalidated'
      })
    ]);
  });

  it('keeps stale-lane invalidation recorded when proof refresh fails after finalizing the lane', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    const warn = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        readParentHeadSha: vi.fn(async () => 'new-parent-head'),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => {
          throw new Error('proof refresh exploded');
        }) as never,
        warn
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_stale',
        status: 409
      }
    });
    expect(warn).toHaveBeenCalledWith(
      'provider-linear-child-lane warning: failed to refresh proof snapshot after invalidating stale child lane impl-a: proof refresh exploded'
    );
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: childLane.stream,
        decision: 'invalidated'
      })
    ]);
  });

  it('releases the accept claim when parent snapshot reads fail before stale checks', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        readParentHeadSha: vi.fn(async () => {
          throw new Error('rev-parse exploded');
        }) as never
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_unhandled_failure',
        message: 'rev-parse exploded',
        status: 502
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: childLane.stream,
        decision: 'pending',
        in_flight_action: null
      })
    ]);
  });

  it('rejects acceptance when the pending child lane is not bound to the expected parent-owned task id', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      task_id: `${TASK_ID}-other-stream`
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_provenance_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('accepts a non-stale child lane by applying the patch artifact and updating the decision', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await writePatchArtifact(childLane.patch_artifact_path ?? '', childLane.scope.files[0] ?? '');
    const applyPatchArtifact = vi.fn(async () => {
      const claimed = await readProviderLinearWorkerChildLanes(runDir);
      expect(claimed).toEqual([
        expect.objectContaining({
          stream: childLane.stream,
          run_id: childLane.run_id,
          in_flight_action: 'accept'
        })
      ]);
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        reason: 'Parent integrated the bounded lane patch.',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'accepted',
      child_lane: {
        stream: childLane.stream,
        decision: 'accepted',
        decision_reason: 'Parent integrated the bounded lane patch.'
      }
    });
    expect(applyPatchArtifact).toHaveBeenCalledWith(tempRoot, childLane.patch_artifact_path);
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: childLane.stream,
        decision: 'accepted',
        decision_reason: 'Parent integrated the bounded lane patch.',
        in_flight_action: null
      })
    ]);
  });

  it('repairs a stale launching reservation before accepting the recovered child lane', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const launchingLane = createLaneRecord({
      run_id: 'launching-stale-1',
      status: 'launching',
      manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-1', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-1'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-1', 'run.log'),
      summary: 'Child lane reserved before child run startup.',
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null
    });
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, launchingLane);
    await writeChildLaneManifest(childLane);
    await writeChildLaneProof(childLane, {
      parent_snapshot: {
        ...childLane.parent_snapshot,
        captured_at: '2026-03-30T07:12:30.000Z'
      }
    });
    await writePatchArtifact(childLane.patch_artifact_path ?? '', childLane.scope.files[0] ?? '');
    const applyPatchArtifact = vi.fn(async () => {
      const claimed = await readProviderLinearWorkerChildLanes(runDir);
      expect(claimed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            run_id: launchingLane.run_id,
            decision: 'invalidated',
            decision_reason: expect.stringContaining(childLane.run_id)
          }),
          expect.objectContaining({
            run_id: childLane.run_id,
            decision: 'pending',
            in_flight_action: 'accept'
          })
        ])
      );
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        reason: 'Parent accepted the repaired child lane patch.',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'accepted',
      child_lane: {
        run_id: childLane.run_id,
        decision: 'accepted',
        decision_reason: 'Parent accepted the repaired child lane patch.'
      }
    });
    expect(applyPatchArtifact).toHaveBeenCalledWith(tempRoot, childLane.patch_artifact_path);
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          run_id: launchingLane.run_id,
          decision: 'invalidated',
          decision_reason: expect.stringContaining(childLane.run_id)
        }),
        expect.objectContaining({
          run_id: childLane.run_id,
          decision: 'accepted',
          decision_reason: 'Parent accepted the repaired child lane patch.',
          in_flight_action: null
        })
      ])
    );
  });

  it('keeps repaired child lanes blocked when the recovered run already has a live in-flight decision', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      run_id: 'child-run-existing-pending',
      manifest_path: join(
        tempRoot ?? '',
        '.runs',
        `${TASK_ID}-impl-a`,
        'cli',
        'child-run-existing-pending',
        'manifest.json'
      ),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-existing-pending'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-existing-pending', 'run.log'),
      patch_artifact_path: join(
        tempRoot ?? '',
        '.runs',
        `${TASK_ID}-impl-a`,
        'cli',
        'child-run-existing-pending',
        'provider-linear-child-lane.patch'
      ),
      in_flight_action: 'accept',
      in_flight_started_at: '2026-03-30T07:25:00.000Z'
    });
    const launchingLane = createLaneRecord({
      run_id: 'launching-stale-1b',
      status: 'launching',
      manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-1b', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-1b'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-1b', 'run.log'),
      summary: 'Child lane reserved before child run startup.',
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await appendProviderLinearWorkerChildLaneRecord(runDir, launchingLane);
    await writeChildLaneManifest(childLane);
    await writeChildLaneProof(childLane);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'reject',
        streamName: childLane.stream,
        reason: 'Parent rejected the recovered child lane output.',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        now: vi.fn(() => '2026-03-30T07:30:00.000Z'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'reject',
      error: {
        code: 'provider_worker_child_lane_decision_in_flight',
        status: 409
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          run_id: launchingLane.run_id,
          decision: 'invalidated',
          decision_reason: expect.stringContaining(childLane.run_id)
        }),
        expect.objectContaining({
          run_id: childLane.run_id,
          decision: 'pending',
          in_flight_action: 'accept',
          in_flight_started_at: '2026-03-30T07:25:00.000Z'
        })
      ])
    );
  });

  it('repairs a stale launching reservation before rejecting the recovered child lane', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const launchingLane = createLaneRecord({
      run_id: 'launching-stale-2',
      status: 'launching',
      manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-2', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-2'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-2', 'run.log'),
      summary: 'Child lane reserved before child run startup.',
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null
    });
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, launchingLane);
    await writeChildLaneManifest(childLane);
    await writeChildLaneProof(childLane);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'reject',
        streamName: childLane.stream,
        reason: 'Parent rejected the repaired child lane output.',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'rejected',
      child_lane: {
        run_id: childLane.run_id,
        decision: 'rejected',
        decision_reason: 'Parent rejected the repaired child lane output.'
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          run_id: launchingLane.run_id,
          decision: 'invalidated',
          decision_reason: expect.stringContaining(childLane.run_id)
        }),
        expect.objectContaining({
          run_id: childLane.run_id,
          decision: 'rejected',
          decision_reason: 'Parent rejected the repaired child lane output.'
        })
      ])
    );
  });

  it('repairs a stale launching reservation before rejecting a recovered child lane without a patch artifact', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const launchingLane = createLaneRecord({
      run_id: 'launching-stale-2b',
      status: 'launching',
      manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-2b', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-2b'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-2b', 'run.log'),
      summary: 'Child lane reserved before child run startup.',
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null
    });
    const childLane = createLaneRecord({
      run_id: 'child-run-failed-no-patch',
      status: 'failed',
      manifest_path: join(
        tempRoot ?? '',
        '.runs',
        `${TASK_ID}-impl-a`,
        'cli',
        'child-run-failed-no-patch',
        'manifest.json'
      ),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-failed-no-patch'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-failed-no-patch', 'run.log'),
      patch_artifact_path: null,
      patch_bytes: null,
      summary: 'child lane failed before producing a patch'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, launchingLane);
    await writeChildLaneManifest(childLane);
    await writeChildLaneProof(childLane, {
      patch_artifact_path: null,
      patch_bytes: null
    });

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'reject',
        streamName: childLane.stream,
        reason: 'Parent rejected the recovered failed child lane output.',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'rejected',
      child_lane: {
        run_id: childLane.run_id,
        decision: 'rejected',
        decision_reason: 'Parent rejected the recovered failed child lane output.'
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          run_id: launchingLane.run_id,
          decision: 'invalidated',
          decision_reason: expect.stringContaining(childLane.run_id)
        }),
        expect.objectContaining({
          run_id: childLane.run_id,
          status: 'failed',
          patch_artifact_path: null,
          decision: 'rejected',
          decision_reason: 'Parent rejected the recovered failed child lane output.'
        })
      ])
    );
  });

  it('fails closed when recovered child-lane proof lineage does not match the launching reservation', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const launchingLane = createLaneRecord({
      run_id: 'launching-stale-3',
      status: 'launching',
      manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-3', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-3'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-3', 'run.log'),
      summary: 'Child lane reserved before child run startup.',
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null
    });
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, launchingLane);
    await writeChildLaneManifest(childLane);
    await writeChildLaneProof(childLane, {
      parent_run_id: 'other-parent-run'
    });
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_not_ready',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        run_id: launchingLane.run_id,
        decision: 'pending',
        status: 'launching'
      })
    ]);
  });

  it('keeps repaired child lanes non-accepted when the recovered patch artifact is missing', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const launchingLane = createLaneRecord({
      run_id: 'launching-stale-4',
      status: 'launching',
      manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-4', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-4'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-4', 'run.log'),
      summary: 'Child lane reserved before child run startup.',
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null
    });
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, launchingLane);
    await writeChildLaneManifest(childLane);
    await writeChildLaneProof(childLane);
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_patch_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          run_id: launchingLane.run_id,
          decision: 'invalidated',
          decision_reason: expect.stringContaining(childLane.run_id)
        }),
        expect.objectContaining({
          run_id: childLane.run_id,
          decision: 'pending',
          status: 'succeeded',
          in_flight_action: null
        })
      ])
    );
  });

  it('fails closed without retiring the live reservation when the only recovered run is already finalized in the ledger', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const launchingLane = createLaneRecord({
      run_id: 'launching-stale-5',
      status: 'launching',
      manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-5', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-5'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'launching-stale-5', 'run.log'),
      summary: 'Child lane reserved before child run startup.',
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null
    });
    const finalizedLane = createLaneRecord({
      run_id: 'child-run-existing',
      manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-existing', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-existing'),
      log_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-existing', 'run.log'),
      decision: 'rejected',
      decision_at: '2026-03-30T07:13:00.000Z',
      decision_reason: 'Older child lane was already rejected.'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, finalizedLane);
    await appendProviderLinearWorkerChildLaneRecord(runDir, launchingLane);
    await writeChildLaneManifest(finalizedLane);
    await writeChildLaneProof(finalizedLane);
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: launchingLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => launchingLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: launchingLane.parent_snapshot.issue_updated_at,
          state: launchingLane.parent_snapshot.issue_state,
          state_type: launchingLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_not_ready',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          run_id: launchingLane.run_id,
          decision: 'pending',
          status: 'launching'
        }),
        expect.objectContaining({
          run_id: finalizedLane.run_id,
          decision: 'rejected',
          decision_reason: 'Older child lane was already rejected.'
        })
      ])
    );
  });

  it('accepts a non-stale child lane rooted under an in-repo custom runs directory', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      manifest_path: join(tempRoot ?? '', 'artifacts', 'runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'manifest.json'),
      artifact_root: join(tempRoot ?? '', 'artifacts', 'runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1'),
      log_path: join(tempRoot ?? '', 'artifacts', 'runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'run.log'),
      patch_artifact_path: join(tempRoot ?? '', 'artifacts', 'runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'provider-linear-child-lane.patch')
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await writePatchArtifact(childLane.patch_artifact_path ?? '', childLane.scope.files[0] ?? '');
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_RUNS_DIR: join(tempRoot ?? '', 'artifacts', 'runs')
        })
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'accepted',
      child_lane: {
        stream: childLane.stream,
        decision: 'accepted'
      }
    });
    expect(applyPatchArtifact).toHaveBeenCalledWith(tempRoot, childLane.patch_artifact_path);
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: childLane.stream,
        decision: 'accepted'
      })
    ]);
  });

  it('rejects acceptance when the persisted patch artifact escapes the child run artifact root', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      patch_artifact_path: join(tempRoot ?? '', 'escape.patch')
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_patch_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when the persisted artifact root is not the expected child run directory', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      artifact_root: join(tempRoot ?? '', 'tampered', `${TASK_ID}-impl-a`, 'cli', 'child-run-1'),
      patch_artifact_path: join(tempRoot ?? '', 'tampered', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'provider-linear-child-lane.patch')
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_patch_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when the patch touches files outside the declared file scope', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'orchestrator/src/cli/providerLinearChildLaneShell.ts'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_patch_scope_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when a rename or copy diff touches an out-of-scope source path', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await mkdir(dirname(childLane.patch_artifact_path ?? ''), { recursive: true });
    await writeFile(
      childLane.patch_artifact_path ?? '',
      'diff --git a/orchestrator/src/cli/providerLinearChildLaneShell.ts b/orchestrator/src/cli/providerLinearChildStreamShell.ts\n',
      'utf8'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_patch_scope_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('accepts quoted git diff headers when patch scope uses non-ascii paths', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: ['orchestrator/src/cli/caf\u00e9.ts'],
        phases: []
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await mkdir(dirname(childLane.patch_artifact_path ?? ''), { recursive: true });
    await writeFile(
      childLane.patch_artifact_path ?? '',
      'diff --git "a/orchestrator/src/cli/caf\\303\\251.ts" "b/orchestrator/src/cli/caf\\303\\251.ts"\n',
      'utf8'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'accepted',
      child_lane: {
        stream: childLane.stream,
        decision: 'accepted'
      }
    });
    expect(applyPatchArtifact).toHaveBeenCalledWith(tempRoot, childLane.patch_artifact_path);
  });

  it('rejects acceptance when the parent workspace picked up in-scope pending edits after launch', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await writePatchArtifact(childLane.patch_artifact_path ?? '', childLane.scope.files[0] ?? '');
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => ['orchestrator/src/cli/providerLinearChildStreamShell.ts']) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_parent_dirty',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('accepts when the parent only dirtied declared files that the child patch does not touch', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [
          'orchestrator/src/cli/providerLinearChildStreamShell.ts',
          'orchestrator/src/cli/providerLinearChildLaneShell.ts'
        ],
        phases: []
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await writePatchArtifact(childLane.patch_artifact_path ?? '', childLane.scope.files[0] ?? '');
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => ['orchestrator/src/cli/providerLinearChildLaneShell.ts']) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'accepted',
      child_lane: {
        stream: childLane.stream,
        decision: 'accepted'
      }
    });
    expect(applyPatchArtifact).toHaveBeenCalledWith(tempRoot, childLane.patch_artifact_path);
  });

  it('keeps acceptance success when proof refresh fails after finalizing the accepted lane', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await writePatchArtifact(childLane.patch_artifact_path ?? '', childLane.scope.files[0] ?? '');
    const warn = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact: vi.fn(async () => undefined),
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => {
          throw new Error('proof refresh exploded');
        }) as never,
        warn
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'accepted',
      child_lane: {
        stream: childLane.stream,
        decision: 'accepted'
      }
    });
    expect(warn).toHaveBeenCalledWith(
      'provider-linear-child-lane warning: failed to refresh proof snapshot after accepting child lane impl-a: proof refresh exploded'
    );
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: childLane.stream,
        decision: 'accepted'
      })
    ]);
  });

  it('keeps rejection success when proof refresh fails after finalizing the lane', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    const warn = vi.fn();

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'reject',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        refreshProofSnapshot: vi.fn(async () => {
          throw new Error('proof refresh exploded');
        }) as never,
        warn
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'rejected',
      child_lane: {
        stream: childLane.stream,
        decision: 'rejected'
      }
    });
    expect(warn).toHaveBeenCalledWith(
      'provider-linear-child-lane warning: failed to refresh proof snapshot after finalizing rejected child lane impl-a: proof refresh exploded'
    );
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: childLane.stream,
        decision: 'rejected'
      })
    ]);
  });

  it('rejects concurrent child-lane decisions while acceptance is already in flight', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      in_flight_action: 'accept',
      in_flight_started_at: '2026-03-30T07:25:00.000Z'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'reject',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        now: vi.fn(() => '2026-03-30T07:30:00.000Z'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'reject',
      error: {
        code: 'provider_worker_child_lane_decision_in_flight',
        status: 409
      }
    });
  });

  it('lets the parent invalidate a legacy in-flight acceptance claim without a timestamp', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      in_flight_action: 'accept'
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'invalidate',
        streamName: childLane.stream,
        reason: 'Parent invalidated stale in-flight accept claim.',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        now: vi.fn(() => '2026-03-30T07:45:00.000Z'),
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'invalidated',
      child_lane: {
        stream: childLane.stream,
        decision: 'invalidated',
        in_flight_action: null,
        in_flight_started_at: null,
        decision_reason: 'Parent invalidated stale in-flight accept claim.'
      }
    });
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: childLane.stream,
        decision: 'invalidated',
        in_flight_action: null,
        in_flight_started_at: null
      })
    ]);
  });

  it('accepts phase-scoped patches when the proof and patch both satisfy the declared contract', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [],
        phases: ['implementation']
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'orchestrator/src/cli/providerLinearChildLaneShell.ts'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'accepted',
      child_lane: {
        stream: childLane.stream,
        decision: 'accepted'
      }
    });
    expect(applyPatchArtifact).toHaveBeenCalledWith(tempRoot, childLane.patch_artifact_path);
  });

  it('rejects acceptance when a phase-scoped patch touches files outside the declared contract', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [],
        phases: ['implementation']
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane);
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'orchestrator/tests/ProviderLinearChildLaneShell.test.ts'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_patch_scope_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when the proof scope contract is tampered after launch', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [],
        phases: ['implementation']
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane, {
      scope: {
        ...childLane.scope,
        allowed_path_selectors: resolveProviderLinearChildLaneScopeContract({
          files: [],
          phases: ['docs']
        }).allowed_path_selectors
      }
    });
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'orchestrator/src/cli/providerLinearChildLaneShell.ts'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_proof_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when the proof selector provenance is tampered after launch', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [],
        phases: ['docs']
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane, {
      scope: {
        ...childLane.scope,
        allowed_path_selectors: (childLane.scope.allowed_path_selectors ?? []).map((selector) =>
          selector.kind === 'prefix' && selector.value === 'docs/' && selector.source === 'phase'
            ? { ...selector, phase: 'implementation' }
            : selector
        )
      }
    });
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'docs/PRD-linear-50228784-e908-4b2f-81b5-d94dbcf6707c.md'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_proof_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when a phase-scoped proof omits scope contract metadata', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [],
        phases: ['implementation']
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    await writeChildLaneProof(childLane, {
      scope: {
        files: [],
        phases: ['implementation']
      } as unknown as ProviderLinearChildLaneProof['scope']
    });
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'orchestrator/src/cli/providerLinearChildLaneShell.ts'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_proof_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when the parent ledger scope contract is tampered after launch', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [],
        phases: ['implementation']
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      ...childLane,
      scope: resolveProviderLinearChildLaneScopeContract({
        files: [],
        phases: ['docs']
      })
    });
    await writeChildLaneProof(childLane);
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'orchestrator/src/cli/providerLinearChildLaneShell.ts'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_proof_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when the parent ledger strips phases after launch but the proof remains phase-scoped', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [],
        phases: ['implementation']
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      ...childLane,
      scope: resolveProviderLinearChildLaneScopeContract({
        files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
        phases: []
      })
    });
    await writeChildLaneProof(childLane);
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'orchestrator/src/cli/providerLinearChildLaneShell.ts'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_proof_invalid',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('rejects acceptance when stripped phase metadata is paired with a missing proof bundle', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord({
      scope: {
        files: [],
        phases: ['implementation']
      }
    });
    await appendProviderLinearWorkerChildLaneRecord(runDir, {
      ...childLane,
      scope: resolveProviderLinearChildLaneScopeContract({
        files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
        phases: []
      })
    });
    await writePatchArtifact(
      childLane.patch_artifact_path ?? '',
      'orchestrator/src/cli/providerLinearChildLaneShell.ts'
    );
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
        readParentDirtyPaths: vi.fn(async () => []) as never,
        readParentHeadSha: vi.fn(async () => childLane.parent_snapshot.base_sha),
        readTrackedIssue: vi.fn(async () => ({
          id: ISSUE.issue_id,
          identifier: ISSUE.issue_identifier,
          updated_at: childLane.parent_snapshot.issue_updated_at,
          state: childLane.parent_snapshot.issue_state,
          state_type: childLane.parent_snapshot.issue_state_type
        })) as never,
        refreshProofSnapshot: vi.fn(async () => undefined)
      }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-lane',
      action: 'accept',
      error: {
        code: 'provider_worker_child_lane_proof_missing',
        status: 409
      }
    });
    expect(applyPatchArtifact).not.toHaveBeenCalled();
  });

  it('clears stale optional child-lane env before layering the new launch context', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const childRunDir = join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1');
    const childProof: ProviderLinearChildLaneProof = {
      issue_id: ISSUE.issue_id,
      issue_identifier: ISSUE.issue_identifier,
      task_id: `${TASK_ID}-impl-a`,
      run_id: 'child-run-1',
      parent_run_id: RUN_ID,
      stream: 'impl-a',
      purpose: 'Implement bounded child lane support',
      instructions: null,
      scope: {
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: null,
        issue_state: null,
        issue_state_type: null,
        captured_at: '2026-03-30T07:11:00.000Z'
      },
      lane_workspace_path: join(tempRoot ?? '', '.child-lanes', 'impl-a-child-run-1'),
      lane_branch: 'child-lane/impl-a-child-run-1',
      patch_artifact_path: join(childRunDir, 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      last_event: 'task_complete',
      last_message: 'child lane complete',
      last_event_at: '2026-03-30T07:12:00.000Z',
      tokens: {
        input_tokens: 10,
        output_tokens: 12,
        total_tokens: 22
      },
      rate_limits: null,
      status: 'succeeded',
      updated_at: '2026-03-30T07:12:00.000Z'
    };
    const execRunner = vi.fn(async () => {
      await mkdir(childRunDir, { recursive: true });
      await writeFile(
        join(childRunDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME),
        JSON.stringify(childProof),
        'utf8'
      );
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          run_id: 'child-run-1',
          status: 'succeeded',
          artifact_root: `.runs/${TASK_ID}-impl-a/cli/child-run-1`,
          manifest: `.runs/${TASK_ID}-impl-a/cli/child-run-1/manifest.json`,
          summary: 'child lane finished'
        }),
        stderr: ''
      };
    });
    const priorOptionalEnv = {
      [PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV]: process.env[PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV],
      [PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV]:
        process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV],
      [PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV]:
        process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV],
      [PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV]:
        process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV],
      [PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV]:
        process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV],
      [PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV]:
        process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV]
    };
    process.env[PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV] = 'stale instructions';
    process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV] = 'stale-base';
    process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV] = 'stale-captured-at';
    process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV] = 'stale-updated-at';
    process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV] = 'stale-state';
    process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV] = 'stale-state-type';

    try {
      await runProviderLinearChildLaneShell(
        {
          action: 'launch',
          streamName: 'impl-a',
          purpose: 'Implement bounded child lane support',
          files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
          env: buildProviderWorkerEnv(manifestPath)
        },
        {
          execRunner,
          readTrackedIssue: vi.fn(async () => null) as never,
          readParentDirtyPaths: vi.fn(async () => []) as never,
          readParentHeadSha: vi.fn(async () => 'parent-base-sha'),
          refreshProofSnapshot: vi.fn(async () => undefined),
          now: vi.fn(() => '2026-03-30T07:11:00.000Z')
        }
      );
    } finally {
      for (const [key, value] of Object.entries(priorOptionalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }

    const request = execRunner.mock.calls[0]?.[0];
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV]).toBe('');
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV]).toBe('parent-base-sha');
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV]).toBe('2026-03-30T07:11:00.000Z');
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV]).toBe('2026-03-30T07:10:00.000Z');
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV]).toBe('');
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV]).toBe('');
  });
});
