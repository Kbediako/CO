import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createSelectedRunProjectionReader,
  discoverAuthoritativeRetryCollectionContexts,
  discoverCompatibilityCollectionContexts
} from '../orchestrator/src/cli/control/selectedRunProjection.js';
import { buildCompatibilityProjectionSnapshot } from '../orchestrator/src/cli/control/compatibilityIssuePresenter.js';
import { buildUiDataset } from '../orchestrator/src/cli/control/operatorDashboardPresenter.js';
import { normalizeProviderIntakeState } from '../orchestrator/src/cli/control/providerIntakeState.js';
import type { ControlState } from '../orchestrator/src/cli/control/controlState.js';
import type {
  ProviderIntakeClaimRecord,
  ProviderIntakeState
} from '../orchestrator/src/cli/control/providerIntakeState.js';

const sandboxes: string[] = [];

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'selected-run-projection-'));
  sandboxes.push(sandbox);
  return sandbox;
}

async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload), 'utf8');
}

async function writeRunManifest(
  sandbox: string,
  taskId: string,
  runId: string,
  manifest: Record<string, unknown>
): Promise<string> {
  const manifestPath = join(sandbox, '.runs', taskId, 'cli', runId, 'manifest.json');
  await writeJsonFile(manifestPath, manifest);
  return manifestPath;
}

async function writeProviderLinearWorkerProof(
  manifestPath: string,
  proof: Record<string, unknown>
): Promise<void> {
  await writeJsonFile(join(dirname(manifestPath), 'provider-linear-worker-proof.json'), proof);
}

function buildIssueReviewHandoffProof(
  issueId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    issue_id: issueId,
    issue_identifier: 'CO-562',
    owner_phase: 'ended',
    owner_status: 'succeeded',
    end_reason: 'issue_review_handoff',
    attempt_started_at: '2026-05-19T04:04:52.083Z',
    updated_at: '2026-05-19T07:10:46.377Z',
    ...overrides
  };
}

function buildMergedPrCloseout(): ProviderIntakeClaimRecord['merge_closeout'] {
  return {
    status: 'merged',
    pr: {
      url: 'https://github.com/asabeko/CO/pull/840',
      owner: 'asabeko',
      repo: 'CO',
      number: 840
    },
    snapshot: {
      state: 'MERGED',
      merged_at: '2026-05-19T07:30:01.000Z'
    }
  } as ProviderIntakeClaimRecord['merge_closeout'];
}

function buildProviderWorkerManifest(
  taskId: string,
  runId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    task_id: taskId,
    run_id: runId,
    issue_provider: 'linear',
    issue_id: 'issue-id-co-398',
    issue_identifier: 'CO-398',
    pipeline_id: 'provider-linear-worker',
    pipeline_title: 'Provider Linear Worker',
    status: 'in_progress',
    started_at: '2026-04-27T08:00:00.000Z',
    updated_at: '2026-04-27T08:02:00.000Z',
    summary: 'Provider worker retained manifest still reports in_progress',
    ...overrides
  };
}

function buildProviderIntakeState(
  claims: ProviderIntakeClaimRecord[],
  overrides: Partial<ProviderIntakeState> = {}
): ProviderIntakeState {
  return {
    schema_version: 1,
    updated_at: '2026-04-27T08:08:00.000Z',
    rehydrated_at: null,
    latest_provider_key: null,
    latest_reason: null,
    claims,
    ...overrides
  };
}

function buildProviderIntakeClaim(
  taskId: string,
  runId: string,
  manifestPath: string,
  overrides: Partial<ProviderIntakeClaimRecord> = {}
): ProviderIntakeClaimRecord {
  return {
    provider: 'linear',
    provider_key: 'linear:issue-id-co-398',
    issue_id: 'issue-id-co-398',
    issue_identifier: 'CO-398',
    issue_title: 'CO-398 control-host status fallback projection expiry',
    issue_state: 'Done',
    issue_state_type: 'completed',
    issue_updated_at: '2026-04-27T08:06:00.000Z',
    task_id: taskId,
    mapping_source: 'provider_id_fallback',
    state: 'completed',
    reason: 'provider_issue_done',
    accepted_at: '2026-04-27T08:00:05.000Z',
    updated_at: '2026-04-27T08:07:00.000Z',
    last_delivery_id: null,
    last_event: null,
    last_action: null,
    last_webhook_timestamp: null,
    run_id: runId,
    run_manifest_path: manifestPath,
    launch_source: 'control-host',
    launch_token: null,
    ...overrides
  };
}

function buildProjectionContext(params: {
  manifestPath: string;
  runId: string;
  providerIntakeState?: ProviderIntakeState;
}) {
  const controlState: ControlState = {
    run_id: params.runId,
    control_seq: 0
  };

  return {
    controlStore: {
      snapshot: () => controlState
    },
    questionQueue: {
      list: () => []
    },
    paths: {
      manifestPath: params.manifestPath,
      runDir: dirname(params.manifestPath)
    },
    linearAdvisoryState: {
      tracked_issue: null
    },
    providerIntakeState: params.providerIntakeState
  };
}

afterEach(async () => {
  await Promise.all(
    sandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('createSelectedRunProjectionReader', () => {
  it('derives the task id from the task directory when the run id is "cli"', async () => {
    const sandbox = await makeSandbox();
    const manifestPath = join(sandbox, '.runs', 'task-under-test', 'cli', 'cli', 'manifest.json');
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify({ run: 'selected' }), 'utf8');
    const controlState: ControlState = {
      run_id: 'cli',
      control_seq: 0
    };

    const projection = createSelectedRunProjectionReader({
      controlStore: {
        snapshot: () => controlState
      },
      questionQueue: {
        list: () => []
      },
      paths: {
        manifestPath,
        runDir: dirname(manifestPath)
      },
      linearAdvisoryState: {
        tracked_issue: null
      }
    });

    const snapshot = await projection.readSelectedRunManifestSnapshot();

    expect(snapshot?.taskId).toBe('task-under-test');
    expect(snapshot?.runId).toBe('cli');
  });

  it('expires retained selected-run provider-worker status when provider intake completed the claim', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-f04ab1c2-79e6-4a98-84e1-85efb6583116';
    const runId = '2026-04-27T08-00-00-000Z-retained';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId)
    );
    const claim = buildProviderIntakeClaim(taskId, runId, manifestPath);
    const providerIntakeState = buildProviderIntakeState([claim]);
    const projection = createSelectedRunProjectionReader(
      buildProjectionContext({ manifestPath, runId, providerIntakeState })
    );

    const selected = await projection.buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'succeeded',
      displayStatus: 'succeeded',
      statusReason: 'provider_claim_completed',
      completedAt: claim.updated_at,
      latestEvent: {
        event: 'succeeded',
        reason: 'provider_claim_completed'
      }
    });
    expect(selected?.summary).toContain('Provider worker artifact reconciled as succeeded');

    const reconciliation = JSON.parse(
      await readFile(join(dirname(manifestPath), 'provider-linear-worker-reconciliation.json'), 'utf8')
    );
    expect(reconciliation).toMatchObject({
      status: 'reconciled',
      reconciled_status: 'succeeded',
      reason: 'provider_claim_completed'
    });
  });

  it('expires retained compatibility collection status instead of counting completed provider workers as running', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-f04ab1c2-79e6-4a98-84e1-85efb6583116';
    const runId = '2026-04-27T08-00-00-000Z-retained';
    const controlRunId = 'control-host';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId)
    );
    const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', controlRunId, {
      task_id: 'local-mcp',
      run_id: controlRunId,
      status: 'in_progress',
      started_at: '2026-04-27T08:00:00.000Z',
      updated_at: '2026-04-27T08:01:00.000Z'
    });
    const providerIntakeState = buildProviderIntakeState([
      buildProviderIntakeClaim(taskId, runId, manifestPath)
    ]);

    const collection = await discoverCompatibilityCollectionContexts(
      buildProjectionContext({
        manifestPath: controlManifestPath,
        runId: controlRunId,
        providerIntakeState
      })
    );

    expect(collection.running).toHaveLength(0);
    expect(collection.all).toHaveLength(1);
    expect(collection.all[0]).toMatchObject({
      issueIdentifier: 'CO-398',
      rawStatus: 'succeeded',
      displayStatus: 'succeeded',
      statusReason: 'provider_claim_completed'
    });
  });

  it('keeps selected provider-worker status active while the matching provider claim is still running', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-f04ab1c2-79e6-4a98-84e1-85efb6583116';
    const runId = '2026-04-27T08-00-00-000Z-active';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId)
    );
    const providerIntakeState = buildProviderIntakeState([
      buildProviderIntakeClaim(taskId, runId, manifestPath, {
        state: 'running',
        reason: 'provider_issue_running',
        issue_state: 'In Progress',
        issue_state_type: 'started'
      })
    ]);
    const projection = createSelectedRunProjectionReader(
      buildProjectionContext({ manifestPath, runId, providerIntakeState })
    );

    const selected = await projection.buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      statusReason: null,
      providerRetryState: null
    });
  });

  it('reconciles selected passive released Backlog owner failed run summaries', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-b9447b5a-224d-4731-bab9-95bb0597dbe0';
    const runId = '2026-05-19T03-40-00-000Z-selected-stale-failed';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        status: 'failed',
        completed_at: '2026-05-19T03:52:14.000Z',
        updated_at: '2026-05-19T03:52:14.000Z',
        summary: 'Selected stale failed run summary remained after PR #838 merged.'
      })
    );
    const providerIntakeState = buildProviderIntakeState(
      [
        buildProviderIntakeClaim(taskId, runId, manifestPath, {
          provider_key: 'linear:b9447b5a-224d-4731-bab9-95bb0597dbe0',
          issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
          issue_identifier: 'CO-558',
          issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
          issue_state: 'Backlog',
          issue_state_type: 'backlog',
          issue_updated_at: '2026-05-19T04:02:22.625Z',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-05-19T04:04:34.521Z',
          retry_queued: null,
          retry_attempt: null,
          retry_due_at: null,
          retry_error: null
        })
      ],
      { updated_at: '2026-05-19T04:04:34.521Z' }
    );
    const projection = createSelectedRunProjectionReader(
      buildProjectionContext({ manifestPath, runId, providerIntakeState })
    );

    const selected = await projection.buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-558',
      rawStatus: 'cancelled',
      displayStatus: 'cancelled',
      statusReason: 'provider_claim_released',
      lastError: null,
      providerRetryState: null
    });
    expect(selected?.summary).toContain('provider claim is released');
  });

  it('reconciles passive released Backlog owner failed runs with idle retry metadata', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-b9447b5a-224d-4731-bab9-95bb0597dbe0';
    const runId = '2026-05-19T03-40-00-000Z-idle-retry-metadata';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        status: 'failed',
        completed_at: '2026-05-19T03:52:14.000Z',
        updated_at: '2026-05-19T03:52:14.000Z',
        summary: 'Passive owner release retained idle retry metadata.'
      })
    );
    const providerIntakeState = buildProviderIntakeState([
      buildProviderIntakeClaim(taskId, runId, manifestPath, {
        provider_key: 'linear:b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        issue_state: 'Backlog',
        issue_state_type: 'backlog',
        issue_updated_at: '2026-05-19T04:02:22.625Z',
        state: 'released',
        reason: 'provider_issue_released:not_active',
        updated_at: '2026-05-19T04:04:34.521Z',
        retry_queued: false,
        retry_attempt: 2,
        retry_due_at: null,
        retry_error: null
      })
    ]);
    const projection = createSelectedRunProjectionReader(
      buildProjectionContext({ manifestPath, runId, providerIntakeState })
    );

    const selected = await projection.buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-558',
      rawStatus: 'cancelled',
      displayStatus: 'cancelled',
      statusReason: 'provider_claim_released',
      lastError: null,
      providerRetryState: null
    });
  });

  it('keeps failed run summaries visible when the passive release belongs to a different run', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-b9447b5a-224d-4731-bab9-95bb0597dbe0';
    const runId = '2026-05-19T03-40-00-000Z-real-failed';
    const releasedRunId = '2026-05-19T04-10-00-000Z-passive-owner-release';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        status: 'failed',
        completed_at: '2026-05-19T03:52:14.000Z',
        updated_at: '2026-05-19T03:52:14.000Z',
        summary: 'Real failed run summary must not be hidden by a later passive release.'
      })
    );
    const releasedManifestPath = await writeRunManifest(
      sandbox,
      taskId,
      releasedRunId,
      buildProviderWorkerManifest(taskId, releasedRunId, {
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        status: 'succeeded',
        completed_at: '2026-05-19T04:12:00.000Z',
        updated_at: '2026-05-19T04:12:00.000Z'
      })
    );
    const providerIntakeState = buildProviderIntakeState([
      buildProviderIntakeClaim(taskId, releasedRunId, releasedManifestPath, {
        provider_key: 'linear:b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        issue_state: 'Backlog',
        issue_state_type: 'backlog',
        issue_updated_at: '2026-05-19T04:02:22.625Z',
        state: 'released',
        reason: 'provider_issue_released:not_active',
        updated_at: '2026-05-19T04:14:34.521Z',
        retry_queued: null,
        retry_attempt: null,
        retry_due_at: null,
        retry_error: null
      })
    ]);
    const projection = createSelectedRunProjectionReader(
      buildProjectionContext({ manifestPath, runId, providerIntakeState })
    );

    const selected = await projection.buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-558',
      rawStatus: 'failed',
      displayStatus: 'failed',
      statusReason: null,
      providerRetryState: null
    });
  });

  it('keeps released Backlog failed run summaries visible when retry metadata is absent', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-b9447b5a-224d-4731-bab9-95bb0597dbe0';
    const runId = '2026-05-19T03-40-00-000Z-missing-retry-metadata';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        status: 'failed',
        completed_at: '2026-05-19T03:52:14.000Z',
        updated_at: '2026-05-19T03:52:14.000Z',
        summary: 'Released Backlog run summary without explicit empty retry metadata.'
      })
    );
    const providerIntakeState = normalizeProviderIntakeState(
      buildProviderIntakeState([
        buildProviderIntakeClaim(taskId, runId, manifestPath, {
          provider_key: 'linear:b9447b5a-224d-4731-bab9-95bb0597dbe0',
          issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
          issue_identifier: 'CO-558',
          issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
          issue_state: 'Backlog',
          issue_state_type: 'backlog',
          issue_updated_at: '2026-05-19T04:02:22.625Z',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-05-19T04:04:34.521Z'
        })
      ])
    );
    const projection = createSelectedRunProjectionReader(
      buildProjectionContext({ manifestPath, runId, providerIntakeState })
    );

    const selected = await projection.buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-558',
      rawStatus: 'failed',
      displayStatus: 'failed',
      statusReason: null,
      providerRetryState: null
    });
  });

  it('reconciles passive released Backlog owner failed run summaries out of current failed status', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-b9447b5a-224d-4731-bab9-95bb0597dbe0';
    const runId = '2026-05-19T03-40-00-000Z-stale-failed';
    const controlRunId = 'control-host';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        status: 'failed',
        completed_at: '2026-05-19T03:52:14.000Z',
        updated_at: '2026-05-19T03:52:14.000Z',
        summary: 'Old failed run summary remained after PR #838 merged.'
      })
    );
    const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', controlRunId, {
      task_id: 'local-mcp',
      run_id: controlRunId,
      status: 'in_progress',
      started_at: '2026-05-19T04:00:00.000Z',
      updated_at: '2026-05-19T04:04:00.000Z'
    });
    const providerIntakeState = buildProviderIntakeState(
      [
        buildProviderIntakeClaim(taskId, runId, manifestPath, {
          provider_key: 'linear:b9447b5a-224d-4731-bab9-95bb0597dbe0',
          issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
          issue_identifier: 'CO-558',
          issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
          issue_state: 'Backlog',
          issue_state_type: 'backlog',
          issue_updated_at: '2026-05-19T04:02:22.625Z',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-05-19T04:04:34.521Z',
          retry_queued: null,
          retry_attempt: null,
          retry_due_at: null,
          retry_error: null
        })
      ],
      { updated_at: '2026-05-19T04:04:34.521Z' }
    );

    const collection = await discoverCompatibilityCollectionContexts(
      buildProjectionContext({
        manifestPath: controlManifestPath,
        runId: controlRunId,
        providerIntakeState
      })
    );

    expect(collection.running).toHaveLength(0);
    expect(collection.retrying).toHaveLength(0);
    expect(collection.all).toHaveLength(1);
    expect(collection.all[0]).toMatchObject({
      issueIdentifier: 'CO-558',
      rawStatus: 'cancelled',
      displayStatus: 'cancelled',
      statusReason: 'provider_claim_released',
      lastError: null,
      providerRetryState: null
    });
    expect(collection.all[0]?.summary).toContain('provider claim is released');

    const statusProjection = buildCompatibilityProjectionSnapshot({
      selected: null,
      running: collection.running,
      retrying: collection.retrying,
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        reasoning_output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null,
      providerWorkflow: null,
      polling: null
    });

    expect(statusProjection.running).toHaveLength(0);
    expect(statusProjection.retrying).toHaveLength(0);
    expect(statusProjection.issues).toHaveLength(0);
  });

  it('reconciles passive released Backlog owner failed runs in scoped large intake discovery', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-b9447b5a-224d-4731-bab9-95bb0597dbe0';
    const runId = '2026-05-19T03-40-00-000Z-large-intake-stale-failed';
    const controlRunId = 'control-host';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        status: 'failed',
        completed_at: '2026-05-19T03:52:14.000Z',
        updated_at: '2026-05-19T03:52:14.000Z',
        summary: 'Old failed run summary remained after PR #838 merged.'
      })
    );
    const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', controlRunId, {
      task_id: 'local-mcp',
      run_id: controlRunId,
      status: 'in_progress',
      started_at: '2026-05-19T04:00:00.000Z',
      updated_at: '2026-05-19T04:04:00.000Z'
    });
    const fillerClaims = Array.from({ length: 16 }, (_, index) =>
      buildProviderIntakeClaim(
        `linear-filler-${index.toString().padStart(2, '0')}`,
        `2026-05-19T03-30-${index.toString().padStart(2, '0')}-000Z-filler`,
        join(
          sandbox,
          '.runs',
          `linear-filler-${index.toString().padStart(2, '0')}`,
          'cli',
          `2026-05-19T03-30-${index.toString().padStart(2, '0')}-000Z-filler`,
          'manifest.json'
        ),
        {
          issue_id: `filler-${index}`,
          issue_identifier: `CO-FILLER-${index}`,
          issue_title: `Filler claim ${index}`,
          issue_state: 'Done',
          issue_state_type: 'completed',
          state: 'completed',
          reason: 'provider_issue_done'
        }
      )
    );
    const providerIntakeState = buildProviderIntakeState(
      [
        ...fillerClaims,
        buildProviderIntakeClaim(taskId, runId, manifestPath, {
          provider_key: 'linear:b9447b5a-224d-4731-bab9-95bb0597dbe0',
          issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
          issue_identifier: 'CO-558',
          issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
          issue_state: 'Backlog',
          issue_state_type: 'backlog',
          issue_updated_at: '2026-05-19T04:02:22.625Z',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-05-19T04:04:34.521Z',
          retry_queued: null,
          retry_attempt: null,
          retry_due_at: null,
          retry_error: null
        })
      ],
      { updated_at: '2026-05-19T04:04:34.521Z' }
    );

    const collection = await discoverCompatibilityCollectionContexts(
      buildProjectionContext({
        manifestPath: controlManifestPath,
        runId: controlRunId,
        providerIntakeState
      })
    );

    expect(collection.running).toHaveLength(0);
    expect(collection.retrying).toHaveLength(0);
    expect(collection.all).toHaveLength(1);
    expect(collection.all[0]).toMatchObject({
      issueIdentifier: 'CO-558',
      rawStatus: 'cancelled',
      displayStatus: 'cancelled',
      statusReason: 'provider_claim_released',
      lastError: null,
      providerRetryState: null
    });
  });

  it('keeps real failed provider-worker run summaries visible without passive release evidence', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-b9447b5a-224d-4731-bab9-95bb0597dbe0';
    const runId = '2026-05-19T03-40-00-000Z-real-failed';
    const controlRunId = 'control-host';
    await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: 'b9447b5a-224d-4731-bab9-95bb0597dbe0',
        issue_identifier: 'CO-558',
        issue_title: 'CO: replace terminal docs freshness maintenance owner after May 19',
        status: 'failed',
        completed_at: '2026-05-19T03:52:14.000Z',
        updated_at: '2026-05-19T03:52:14.000Z',
        summary: 'Real failed run summary with no released passive owner evidence.'
      })
    );
    const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', controlRunId, {
      task_id: 'local-mcp',
      run_id: controlRunId,
      status: 'in_progress',
      started_at: '2026-05-19T04:00:00.000Z',
      updated_at: '2026-05-19T04:04:00.000Z'
    });

    const collection = await discoverCompatibilityCollectionContexts(
      buildProjectionContext({
        manifestPath: controlManifestPath,
        runId: controlRunId,
        providerIntakeState: buildProviderIntakeState([], {
          updated_at: '2026-05-19T04:04:34.521Z'
        })
      })
    );

    expect(collection.running).toHaveLength(0);
    expect(collection.all).toHaveLength(1);
    expect(collection.all[0]).toMatchObject({
      issueIdentifier: 'CO-558',
      rawStatus: 'failed',
      displayStatus: 'failed',
      statusReason: null
    });
  });

  it('reconciles failed outer provider wrapper after successful worker handoff out of current failed status', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-aa075f78-940e-423b-a886-6f0f8012ae18';
    const runId = '2026-05-19T04-04-49-244Z-066924c1';
    const controlRunId = 'control-host';
    const issueId = 'aa075f78-940e-423b-a886-6f0f8012ae18';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: issueId,
        issue_identifier: 'CO-562',
        issue_title: 'CO: hide passive owner claims from retry and failed status',
        status: 'failed',
        completed_at: '2026-05-19T07:10:47.354Z',
        updated_at: '2026-05-19T07:10:47.389Z',
        summary:
          "Configuration mode: repo-authoritative.\nStage 'Run provider linear worker' failed with exit code 1.",
        commands: [
          {
            id: 'provider-linear-worker',
            title: 'Run provider linear worker',
            status: 'failed',
            completed_at: '2026-05-19T07:10:47.347Z',
            exit_code: 1,
            summary: 'Provider linear worker failed after successful issue_review_handoff.'
          }
        ]
      })
    );
    await writeProviderLinearWorkerProof(manifestPath, buildIssueReviewHandoffProof(issueId));
    const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', controlRunId, {
      task_id: 'local-mcp',
      run_id: controlRunId,
      status: 'in_progress',
      started_at: '2026-05-19T07:30:00.000Z',
      updated_at: '2026-05-19T07:35:00.000Z'
    });
    const providerIntakeState = buildProviderIntakeState(
      [
        buildProviderIntakeClaim(taskId, runId, manifestPath, {
          provider_key: `linear:${issueId}`,
          issue_id: issueId,
          issue_identifier: 'CO-562',
          issue_title: 'CO: hide passive owner claims from retry and failed status',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-05-19T07:10:46.377Z',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-05-19T07:10:46.377Z',
          retry_queued: null,
          retry_attempt: null,
          retry_due_at: null,
          retry_error: null,
          merge_closeout: buildMergedPrCloseout()
        })
      ],
      { updated_at: '2026-05-19T07:33:21.789Z' }
    );

    const collection = await discoverCompatibilityCollectionContexts(
      buildProjectionContext({
        manifestPath: controlManifestPath,
        runId: controlRunId,
        providerIntakeState
      })
    );

    expect(collection.running).toHaveLength(0);
    expect(collection.retrying).toHaveLength(0);
    expect(collection.all).toHaveLength(1);
    expect(collection.all[0]).toMatchObject({
      issueIdentifier: 'CO-562',
      rawStatus: 'succeeded',
      displayStatus: 'succeeded',
      statusReason: 'provider_worker_successful_handoff',
      lastError: null,
      providerRetryState: null,
      providerDebugSnapshot: {
        worker: {
          owner_phase: 'ended',
          owner_status: 'succeeded'
        }
      }
    });
    expect(collection.all[0]?.summary).toContain('failed outer provider wrapper');
    expect(collection.all[0]?.summary).toContain('issue_review_handoff');

    const statusProjection = buildCompatibilityProjectionSnapshot({
      selected: null,
      running: collection.running,
      retrying: collection.retrying,
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        reasoning_output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null,
      providerWorkflow: null,
      polling: null
    });
    expect(statusProjection.running).toHaveLength(0);
    expect(statusProjection.retrying).toHaveLength(0);
    expect(statusProjection.issues).toHaveLength(0);

    const reconciliation = JSON.parse(
      await readFile(join(dirname(manifestPath), 'provider-linear-worker-reconciliation.json'), 'utf8')
    );
    expect(reconciliation).toMatchObject({
      status: 'reconciled',
      reconciled_status: 'succeeded',
      reason: 'provider_worker_successful_handoff',
      manifest: {
        status: 'failed',
        run_id: runId,
        task_id: taskId
      },
      provider_claim: {
        state: 'released',
        reason: 'provider_issue_released:not_active',
        issue_state: 'Done',
        issue_state_type: 'completed'
      }
    });
    expect(reconciliation.summary).toContain('failed outer provider wrapper');
  });

  it('suppresses failed owner proof from current status when terminal released Linear truth supersedes it', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-aa075f78-940e-423b-a886-6f0f8012ae18';
    const runId = '2026-05-19T04-04-49-244Z-failed-proof';
    const controlRunId = 'control-host';
    const issueId = 'aa075f78-940e-423b-a886-6f0f8012ae18';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: issueId,
        issue_identifier: 'CO-562',
        status: 'failed',
        completed_at: '2026-05-19T07:10:47.354Z',
        updated_at: '2026-05-19T07:10:47.389Z',
        summary:
          "Configuration mode: repo-authoritative.\nStage 'Run provider linear worker' failed with exit code 1."
      })
    );
    await writeProviderLinearWorkerProof(manifestPath, buildIssueReviewHandoffProof(issueId, {
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'implementation_failed'
    }));
    const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', controlRunId, {
      task_id: 'local-mcp',
      run_id: controlRunId,
      status: 'in_progress',
      started_at: '2026-05-19T07:30:00.000Z',
      updated_at: '2026-05-19T07:35:00.000Z'
    });
    const providerIntakeState = buildProviderIntakeState([
      buildProviderIntakeClaim(taskId, runId, manifestPath, {
        provider_key: `linear:${issueId}`,
        issue_id: issueId,
        issue_identifier: 'CO-562',
        issue_state: 'Done',
        issue_state_type: 'completed',
        state: 'released',
        reason: 'provider_issue_released:not_active',
        updated_at: '2026-05-19T07:33:21.789Z',
        retry_queued: null,
        retry_attempt: null,
        retry_due_at: null,
        retry_error: null
      })
    ]);

    const collection = await discoverCompatibilityCollectionContexts(
      buildProjectionContext({
        manifestPath: controlManifestPath,
        runId: controlRunId,
        providerIntakeState
      })
    );

    expect(collection.running).toHaveLength(0);
    expect(collection.retrying).toHaveLength(0);
    expect(collection.all).toHaveLength(1);
    expect(collection.all[0]).toMatchObject({
      issueIdentifier: 'CO-562',
      rawStatus: 'succeeded',
      displayStatus: 'succeeded',
      statusReason: 'provider_claim_released',
      lastError: null,
      providerDebugSnapshot: {
        worker: {
          owner_phase: 'ended',
          owner_status: 'failed'
        }
      }
    });
    expect(collection.all[0]?.summary).toContain('provider claim is released');

    const statusProjection = buildCompatibilityProjectionSnapshot({
      selected: collection.all[0] ?? null,
      running: collection.running,
      retrying: collection.retrying,
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        reasoning_output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null,
      providerWorkflow: null,
      polling: null
    });
    expect(statusProjection.selected).toBeNull();
    expect(statusProjection.issues).toHaveLength(0);

    const reconciliation = JSON.parse(
      await readFile(join(dirname(manifestPath), 'provider-linear-worker-reconciliation.json'), 'utf8')
    );
    expect(reconciliation).toMatchObject({
      status: 'reconciled',
      reconciled_status: 'succeeded',
      reason: 'provider_claim_released',
      manifest: {
        status: 'failed',
        run_id: runId,
        task_id: taskId
      },
      provider_claim: {
        state: 'released',
        reason: 'provider_issue_released:not_active',
        issue_state: 'Done',
        issue_state_type: 'completed'
      }
    });
  });

  it('keeps released non-terminal failed owner proof visible without active retry metadata', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-aa075f78-940e-423b-a886-6f0f8012ae18';
    const runId = '2026-05-19T04-04-49-244Z-failed-proof-active';
    const controlRunId = 'control-host';
    const issueId = 'aa075f78-940e-423b-a886-6f0f8012ae18';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: issueId,
        issue_identifier: 'CO-562',
        status: 'failed',
        completed_at: '2026-05-19T07:10:47.354Z',
        updated_at: '2026-05-19T07:10:47.389Z',
        summary:
          "Configuration mode: repo-authoritative.\nStage 'Run provider linear worker' failed with exit code 1."
      })
    );
    await writeProviderLinearWorkerProof(manifestPath, buildIssueReviewHandoffProof(issueId, {
      owner_phase: 'ended',
      owner_status: 'failed',
      end_reason: 'implementation_failed'
    }));
    const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', controlRunId, {
      task_id: 'local-mcp',
      run_id: controlRunId,
      status: 'in_progress',
      started_at: '2026-05-19T07:30:00.000Z',
      updated_at: '2026-05-19T07:35:00.000Z'
    });
    const providerIntakeState = buildProviderIntakeState([
      buildProviderIntakeClaim(taskId, runId, manifestPath, {
        provider_key: `linear:${issueId}`,
        issue_id: issueId,
        issue_identifier: 'CO-562',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        state: 'released',
        reason: 'provider_issue_released:not_active',
        updated_at: '2026-05-19T07:33:21.789Z',
        retry_queued: null,
        retry_attempt: null,
        retry_due_at: null,
        retry_error: null
      })
    ]);

    const collection = await discoverCompatibilityCollectionContexts(
      buildProjectionContext({
        manifestPath: controlManifestPath,
        runId: controlRunId,
        providerIntakeState
      })
    );

    expect(collection.running).toHaveLength(0);
    expect(collection.retrying).toHaveLength(0);
    expect(collection.all).toHaveLength(1);
    expect(collection.all[0]).toMatchObject({
      issueIdentifier: 'CO-562',
      rawStatus: 'failed',
      displayStatus: 'failed',
      statusReason: null,
      providerDebugSnapshot: {
        worker: {
          owner_phase: 'ended',
          owner_status: 'failed'
        }
      }
    });
    expect(collection.all[0]?.lastError).toContain("Stage 'Run provider linear worker' failed");
  });

  it('keeps active retry metadata visible despite successful handoff proof', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-aa075f78-940e-423b-a886-6f0f8012ae18';
    const runId = '2026-05-19T04-04-49-244Z-retry-metadata';
    const controlRunId = 'control-host';
    const issueId = 'aa075f78-940e-423b-a886-6f0f8012ae18';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        issue_id: issueId,
        issue_identifier: 'CO-562',
        status: 'failed',
        completed_at: '2026-05-19T07:10:47.354Z',
        updated_at: '2026-05-19T07:10:47.389Z',
        summary:
          "Configuration mode: repo-authoritative.\nStage 'Run provider linear worker' failed with exit code 1."
      })
    );
    await writeProviderLinearWorkerProof(manifestPath, buildIssueReviewHandoffProof(issueId));
    const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', controlRunId, {
      task_id: 'local-mcp',
      run_id: controlRunId,
      status: 'in_progress',
      started_at: '2026-05-19T07:30:00.000Z',
      updated_at: '2026-05-19T07:35:00.000Z'
    });
    const providerIntakeState = buildProviderIntakeState([
      buildProviderIntakeClaim(taskId, runId, manifestPath, {
        provider_key: `linear:${issueId}`,
        issue_id: issueId,
        issue_identifier: 'CO-562',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        state: 'resumable',
        reason: 'worker_failed_retryable',
        updated_at: '2026-05-19T07:33:21.789Z',
        retry_queued: true,
        retry_attempt: 2,
        retry_due_at: '2026-05-19T08:00:00.000Z',
        retry_error: 'old failure'
      })
    ]);

    const collection = await discoverCompatibilityCollectionContexts(
      buildProjectionContext({
        manifestPath: controlManifestPath,
        runId: controlRunId,
        providerIntakeState
      })
    );

    expect(collection.running).toHaveLength(0);
    expect(collection.retrying).toHaveLength(0);
    expect(collection.all).toHaveLength(1);
    expect(collection.all[0]).toMatchObject({
      issueIdentifier: 'CO-562',
      rawStatus: 'failed',
      displayStatus: 'failed',
      statusReason: null,
      providerRetryState: {
        active: true,
        attempt: 2,
        due_at: '2026-05-19T08:00:00.000Z',
        error: 'old failure'
      }
    });
  });

  it('separates successful handoff proof from terminal released claim reconciliation', async () => {
    const cases = [
      {
        name: 'custom completed issue label',
        claim: {
          issue_state: 'Complete',
          issue_state_type: 'completed',
          state: 'released',
          merge_closeout: buildMergedPrCloseout()
        },
        expected: {
          rawStatus: 'succeeded',
          displayStatus: 'succeeded',
          statusReason: 'provider_worker_successful_handoff'
        }
      },
      {
        name: 'cancelled terminal issue',
        claim: {
          issue_state: 'Canceled',
          issue_state_type: 'canceled',
          state: 'released',
          merge_closeout: buildMergedPrCloseout()
        },
        expected: {
          rawStatus: 'cancelled',
          displayStatus: 'cancelled',
          statusReason: 'provider_claim_released'
        }
      },
      {
        name: 'canceled type with done label',
        claim: {
          issue_state: 'Done',
          issue_state_type: 'canceled',
          state: 'released',
          merge_closeout: buildMergedPrCloseout()
        },
        expected: {
          rawStatus: 'cancelled',
          displayStatus: 'cancelled',
          statusReason: 'provider_claim_released'
        }
      },
      {
        name: 'missing merged closeout',
        claim: {
          issue_state: 'Done',
          issue_state_type: 'completed',
          state: 'released',
          merge_closeout: null
        },
        expected: {
          rawStatus: 'succeeded',
          displayStatus: 'succeeded',
          statusReason: 'provider_claim_released'
        }
      },
      {
        name: 'stale successful handoff proof',
        claim: {
          issue_state: 'Done',
          issue_state_type: 'completed',
          state: 'released',
          launch_started_at: '2026-05-19T07:10:47.000Z',
          merge_closeout: buildMergedPrCloseout()
        },
        expected: {
          rawStatus: 'succeeded',
          displayStatus: 'succeeded',
          statusReason: 'provider_claim_released'
        }
      },
      {
        name: 'handoff failed claim',
        claim: {
          issue_state: 'Done',
          issue_state_type: 'completed',
          state: 'handoff_failed',
          reason: 'provider_issue_merge_closeout_action_required',
          merge_closeout: buildMergedPrCloseout()
        },
        expected: {
          rawStatus: 'failed',
          displayStatus: 'failed',
          statusReason: null
        }
      }
    ];

    for (const testCase of cases) {
      const sandbox = await makeSandbox();
      const taskId = `linear-aa075f78-940e-423b-a886-6f0f8012ae18-${testCase.name.replaceAll(' ', '-')}`;
      const runId = '2026-05-19T04-04-49-244Z-incomplete-authority';
      const issueId = `aa075f78-940e-423b-a886-6f0f8012ae18-${testCase.name.replaceAll(' ', '-')}`;
      const manifestPath = await writeRunManifest(
        sandbox,
        taskId,
        runId,
        buildProviderWorkerManifest(taskId, runId, {
          issue_id: issueId,
          issue_identifier: 'CO-562',
          status: 'failed',
          completed_at: '2026-05-19T07:10:47.354Z',
          updated_at: '2026-05-19T07:10:47.389Z',
          summary: "Stage 'Run provider linear worker' failed with exit code 1."
        })
      );
      await writeProviderLinearWorkerProof(manifestPath, buildIssueReviewHandoffProof(issueId));
      const controlManifestPath = await writeRunManifest(sandbox, 'local-mcp', 'control-host', {
        task_id: 'local-mcp',
        run_id: 'control-host',
        status: 'in_progress',
        started_at: '2026-05-19T07:30:00.000Z',
        updated_at: '2026-05-19T07:35:00.000Z'
      });
      const providerIntakeState = buildProviderIntakeState([
        buildProviderIntakeClaim(taskId, runId, manifestPath, {
          provider_key: `linear:${issueId}`,
          issue_id: issueId,
          issue_identifier: 'CO-562',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-05-19T07:33:21.789Z',
          retry_queued: null,
          retry_attempt: null,
          retry_due_at: null,
          retry_error: null,
          ...testCase.claim
        })
      ]);

      const collection = await discoverCompatibilityCollectionContexts(
        buildProjectionContext({
          manifestPath: controlManifestPath,
          runId: 'control-host',
          providerIntakeState
        })
      );

      expect(collection.all[0], testCase.name).toMatchObject({
        issueIdentifier: 'CO-562',
        ...testCase.expected
      });
    }
  });

  it('keeps terminal retry claims out of authoritative retry collection', async () => {
    const sandbox = await makeSandbox();
    const taskId = 'linear-b9447b5a-224d-4731-bab9-95bb0597dbe0';
    const runId = '2026-05-19T03-40-00-000Z-terminal-retry';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId, {
        status: 'failed',
        completed_at: '2026-05-19T03:52:14.000Z',
        updated_at: '2026-05-19T03:52:14.000Z'
      })
    );
    const providerIntakeState = buildProviderIntakeState([
      buildProviderIntakeClaim(taskId, runId, manifestPath, {
        state: 'resumable',
        reason: 'worker_failed_retryable',
        issue_state: 'Done',
        issue_state_type: 'completed',
        retry_queued: true,
        retry_attempt: 2,
        retry_due_at: '2026-05-19T04:10:00.000Z',
        retry_error: 'old failure'
      })
    ]);

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      buildProjectionContext({ manifestPath, runId, providerIntakeState })
    );

    expect(retrying).toHaveLength(0);
  });

  it('exposes CO-398 fallback expiry metadata on compatibility status projections', async () => {
    const sandbox = await makeSandbox();
    const legacyProofFallback = 'legacy proof fields projected into status output';
    const taskId = 'linear-f04ab1c2-79e6-4a98-84e1-85efb6583116';
    const runId = '2026-04-27T08-00-00-000Z-active';
    const manifestPath = await writeRunManifest(
      sandbox,
      taskId,
      runId,
      buildProviderWorkerManifest(taskId, runId)
    );
    const projection = createSelectedRunProjectionReader(
      buildProjectionContext({ manifestPath, runId })
    );
    const compatibilitySource = await projection.buildCompatibilitySourceContext();
    expect(compatibilitySource).not.toBeNull();

    const statusProjection = buildCompatibilityProjectionSnapshot({
      selected: compatibilitySource,
      running: compatibilitySource ? [compatibilitySource] : [],
      retrying: [],
      codexTotals: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null,
      providerWorkflow: null,
      polling: null
    });

    expect(statusProjection.fallbackExpiry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: 'control-host status surfaces',
          fallback: 'selected-run projection fallback',
          decision: 'expire fallback',
          owner: 'CO-398',
          review_date: '2026-05-10',
          maximum_lifetime: '2026-05-26'
        }),
        expect.objectContaining({
          fallback: 'compatibility issue projection fallback',
          decision: 'expire fallback'
        }),
        expect.objectContaining({
          fallback: 'synthetic identity/status fallback that hides CLI/API/UI disagreement',
          decision: 'remove fallback'
        })
      ])
    );
    expect(statusProjection.selected?.fallback_expiry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fallback: 'selected-run projection fallback',
          decision: 'expire fallback'
        }),
        expect.objectContaining({
          fallback: 'CLI/API/UI /ui/data.json source labels and authority/proof split',
          decision: 'justify retaining fallback'
        })
      ])
    );
    expect(statusProjection.selected?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      legacyProofFallback
    );
    expect(statusProjection.running[0]?.fallback_expiry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fallback: 'selected-run projection fallback',
          decision: 'expire fallback'
        }),
        expect.objectContaining({
          fallback: 'CLI/API/UI /ui/data.json source labels and authority/proof split',
          decision: 'justify retaining fallback'
        })
      ])
    );
    expect(statusProjection.issues[0]?.payload.fallback_expiry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fallback: 'compatibility issue projection fallback',
          decision: 'expire fallback'
        }),
        expect.objectContaining({
          fallback: 'CLI/API/UI /ui/data.json source labels and authority/proof split',
          decision: 'justify retaining fallback'
        })
      ])
    );
    expect(statusProjection.issues[0]?.payload.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      legacyProofFallback
    );

    const uiDataset = buildUiDataset({
      projection: statusProjection,
      generatedAt: '2026-04-27T08:00:00.000Z'
    });
    expect(uiDataset.fallback_expiry).toEqual(statusProjection.fallbackExpiry);
    expect(uiDataset.selected?.fallback_expiry).toEqual(statusProjection.selected?.fallback_expiry);
    expect(uiDataset.selected?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      legacyProofFallback
    );
    expect(uiDataset.running[0]?.fallback_expiry).toEqual(statusProjection.running[0]?.fallback_expiry);
    expect(uiDataset.issues[0]?.fallback_expiry).toEqual(
      statusProjection.issues[0]?.payload.fallback_expiry
    );
    expect(uiDataset.issues[0]?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      legacyProofFallback
    );
  });

  it('projects docs freshness maintain repo gate separately from provider WIP', () => {
    const statusProjection = buildCompatibilityProjectionSnapshot({
      selected: null,
      running: [],
      retrying: [],
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        reasoning_output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: {
        summary_scope: 'all',
        selection_strategy: 'none',
        claim_count: 0,
        active_claim_count: 0,
        running_claim_count: 0,
        active_issue_identifiers: [],
        running_issue_identifiers: [],
        selected_claim: null,
        retry: null,
        rehydrated_at: null,
        is_rehydrated: false,
        updated_at: null
      },
      providerIntakeUnavailable: null,
      providerWorkflow: null,
      repoGates: {
        docs_freshness_maintain: {
          id: 'docs_freshness_maintain',
          severity: 'blocking',
          freshness_decision: 'block_policy_over_budget',
          owner: {
            issue: 'CO-522',
            active_remediation_issue: 'CO-522',
            canonical_owner_key: 'docs:freshness:maintain',
            action: 'update_existing',
            reason: 'canonical_owner_key_match',
            state: 'Blocked',
            state_type: 'started',
            verified: true
          },
          spec_guard: {
            status: 'succeeded',
            action_required_count: 0
          },
          capacity: {
            status: 'over_budget',
            current_entries: 741,
            max_entries: 300,
            current_cohorts: 11,
            max_cohorts: 2,
            expired_entries: 0,
            entry_excess: 441,
            cohort_excess: 9,
            over_entry_budget: true,
            over_cohort_budget: true
          },
          capacity_excess: {
            entries: 441,
            cohorts: 9,
            expired_entries: 0
          },
          canonical_owner_key: 'docs:freshness:maintain',
          active_remediation_issue: 'CO-522',
          next_expiry: '2026-05-20',
          action_required_count: 33,
          blocks_unrelated_lanes: true,
          blocks_handoff: true,
          handoff_blocking: true,
          provider_wip_impact: 'excluded_repo_gate'
        }
      },
      polling: null
    });

    const uiDataset = buildUiDataset({
      projection: statusProjection,
      generatedAt: '2026-05-13T00:00:00.000Z'
    });

    expect(statusProjection.running).toHaveLength(0);
    expect(uiDataset.counts.running).toBe(0);
    expect(uiDataset.repo_gates?.docs_freshness_maintain).toMatchObject({
      severity: 'blocking',
      owner: {
        issue: 'CO-522',
        active_remediation_issue: 'CO-522',
        canonical_owner_key: 'docs:freshness:maintain'
      },
      action_required_count: 33,
      capacity: {
        status: 'over_budget',
        current_entries: 741,
        max_entries: 300,
        entry_excess: 441,
        current_cohorts: 11,
        max_cohorts: 2,
        cohort_excess: 9,
        expired_entries: 0
      },
      capacity_excess: {
        entries: 441,
        cohorts: 9,
        expired_entries: 0
      },
      canonical_owner_key: 'docs:freshness:maintain',
      active_remediation_issue: 'CO-522',
      blocks_handoff: true,
      handoff_blocking: true,
      provider_wip_impact: 'excluded_repo_gate'
    });
  });
});
