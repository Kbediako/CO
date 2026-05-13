import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createSelectedRunProjectionReader,
  discoverCompatibilityCollectionContexts
} from '../orchestrator/src/cli/control/selectedRunProjection.js';
import { buildCompatibilityProjectionSnapshot } from '../orchestrator/src/cli/control/compatibilityIssuePresenter.js';
import { buildUiDataset } from '../orchestrator/src/cli/control/operatorDashboardPresenter.js';
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
            action: 'update_existing',
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
            max_entries: 300
          },
          next_expiry: '2026-05-20',
          action_required_count: 33,
          blocks_unrelated_lanes: true,
          blocks_handoff: true,
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
      owner: { issue: 'CO-522' },
      action_required_count: 33,
      provider_wip_impact: 'excluded_repo_gate'
    });
  });
});
