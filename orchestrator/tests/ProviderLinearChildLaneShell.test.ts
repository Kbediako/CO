import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  runProviderLinearChildLaneShell
} from '../src/cli/providerLinearChildLaneShell.js';
import {
  PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV,
  PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV,
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
    patch_artifact_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-impl-a`, 'cli', 'child-run-1', 'provider-linear-child-lane.patch'),
    patch_bytes: 128,
    decision: 'pending',
    decision_at: null,
    decision_reason: null,
    ...overrides
  };
}

describe('runProviderLinearChildLaneShell', () => {
  it('launches a same-issue child lane and records parent-owned lineage', async () => {
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

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'launch',
        streamName: 'impl-a',
        purpose: 'Implement bounded child lane support',
        files: ['orchestrator/src/cli/providerLinearChildStreamShell.ts'],
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_RUNS_DIR: join('/tmp', 'shared-runs'),
          CODEX_ORCHESTRATOR_OUT_DIR: join('/tmp', 'shared-out')
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
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        run_id: 'child-run-1',
        decision: 'pending'
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
        execRunner: execRunner as never
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
        execRunner: execRunner as never
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

  it('ignores child-lane artifact paths when checking phase-scoped parent dirtiness', async () => {
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
        files: [],
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
          files: [],
          phases: ['implementation']
        }
      }
    });
    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(await readProviderLinearWorkerChildLanes(runDir)).toEqual([
      expect.objectContaining({
        stream: 'impl-a',
        decision: 'pending',
        scope: {
          files: [],
          phases: ['implementation']
        }
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
        readChildLanes: vi.fn(async () => {
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

  it('accepts a non-stale child lane by applying the patch artifact and updating the decision', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const childLane = createLaneRecord();
    await appendProviderLinearWorkerChildLaneRecord(runDir, childLane);
    const applyPatchArtifact = vi.fn(async () => undefined);

    const result = await runProviderLinearChildLaneShell(
      {
        action: 'accept',
        streamName: childLane.stream,
        reason: 'Parent integrated the bounded lane patch.',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        applyPatchArtifact,
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
        decision_reason: 'Parent integrated the bounded lane patch.'
      })
    ]);
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
      [PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV]:
        process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV],
      [PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV]:
        process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV],
      [PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV]:
        process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV]
    };
    process.env[PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV] = 'stale instructions';
    process.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV] = 'stale-base';
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
          refreshProofSnapshot: vi.fn(async () => undefined)
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
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV]).toBe('2026-03-30T07:10:00.000Z');
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV]).toBe('');
    expect(request?.env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV]).toBe('');
  });
});
