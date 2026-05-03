import http from 'node:http';
import { mkdtemp, mkdir, readFile, realpath, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ATTACH_REQUEST_TIMEOUT_MS } from '../src/cli/coStatusAttachCliShell.js';
import {
  __test__ as coStatusCliShellTest,
  readCoStatusJsonDataset,
  runCoStatusCliShell
} from '../src/cli/coStatusCliShell.js';
import { runCoStatusOperatorAutopilotCliShell } from '../src/cli/coStatusOperatorAutopilotCliShell.js';
import { appendProviderOperatorAutopilotLifecycleRecord } from '../src/cli/control/providerOperatorAutopilotLifecycle.js';

const tempDirs: string[] = [];
const servers = new Set<http.Server>();

afterEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  delete process.env.CODEX_ORCHESTRATOR_ROOT;
  delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
  delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
  await Promise.all(
    Array.from(servers, (server) =>
      new Promise<void>((resolve) => {
        try {
          server.close(() => resolve());
        } catch {
          resolve();
        }
      })
    )
  );
  servers.clear();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe('runCoStatusCliShell', () => {
  it('emits the authenticated operator-dashboard snapshot for --format json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });

    const server = await startUiServer();
    servers.add(server.instance);

    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'snapshot-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(server.requests).toEqual([
      {
        authorization: 'Bearer snapshot-token',
        csrfToken: 'snapshot-token'
      }
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toEqual(buildUiPayload());
  });

  it('re-resolves endpoint artifacts for direct json mode when the current endpoint is stale', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);

    const currentServer = await startUiServer();
    servers.add(currentServer.instance);
    const staleServer = await startFailingUiServer(async () => {
      await writeControlEndpointArtifacts(runDir, currentServer.baseUrl);
    });
    servers.add(staleServer.instance);
    await writeControlEndpointArtifacts(runDir, staleServer.baseUrl);

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(staleServer.requests).toEqual([
      {
        authorization: 'Bearer snapshot-token',
        csrfToken: 'snapshot-token'
      }
    ]);
    expect(currentServer.requests).toEqual([
      {
        authorization: 'Bearer snapshot-token',
        csrfToken: 'snapshot-token'
      }
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toEqual(buildUiPayload());
  });

  it('does not use degraded local fallback for rotated endpoint auth failures', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeProviderIntakeState(runDir, {
      claimState: 'running',
      updatedAtMsAgo: 1_000
    });

    const refreshedServer = await startUiServer();
    servers.add(refreshedServer.instance);
    const staleServer = await startFailingUiServer(async () => {
      await writeControlEndpointArtifacts(runDir, refreshedServer.baseUrl, 'rotated-bad-token');
    });
    servers.add(staleServer.instance);
    await writeControlEndpointArtifacts(runDir, staleServer.baseUrl);

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(
      runCoStatusCliShell({
        flags: {
          format: 'json',
          'run-dir': runDir
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow(/control-host ui auth failed: 401 Unauthorized/u);

    expect(log).not.toHaveBeenCalled();
    expect(staleServer.requests).toHaveLength(1);
    expect(refreshedServer.requests).toEqual([
      {
        authorization: 'Bearer rotated-bad-token',
        csrfToken: 'rotated-bad-token'
      }
    ]);
  });

  it('does not use degraded local fallback when endpoint re-resolution fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeProviderIntakeState(runDir, {
      claimState: 'running',
      updatedAtMsAgo: 1_000
    });

    const staleServer = await startFailingUiServer(async () => {
      await writeFile(join(runDir, 'control_endpoint.json'), '{not-json', 'utf8');
    });
    servers.add(staleServer.instance);
    await writeControlEndpointArtifacts(runDir, staleServer.baseUrl);

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(
      runCoStatusCliShell({
        flags: {
          format: 'json',
          'run-dir': runDir
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow(/Re-resolving control_endpoint\.json failed/u);

    expect(log).not.toHaveBeenCalled();
    expect(staleServer.requests).toHaveLength(1);
  });

  it('retries a direct json current-endpoint timeout once when endpoint artifacts do not rotate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    const healthyPayload = buildUiPayload({
      polling: {
        ...(buildUiPayload().polling as Record<string, unknown>),
        stuck: false,
        restart_required: false
      },
      running: [
        {
          run_id: 'running-claim-1',
          issue_identifier: 'CO-296',
          status: 'running'
        }
      ]
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(buildAbortError())
      .mockResolvedValueOnce(
        new Response(JSON.stringify(healthyPayload), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        })
      );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      'http://127.0.0.1:65535/ui/data.json',
      'http://127.0.0.1:65535/ui/data.json'
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toEqual(healthyPayload);
  });

  it('classifies repeated direct json current-endpoint timeouts without stale-endpoint guidance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(buildAbortError())
      .mockRejectedValueOnce(buildAbortError());

    let thrown: unknown;
    try {
      await runCoStatusCliShell({
        flags: {
          format: 'json',
          'run-dir': runDir
        },
        printHelp: vi.fn()
      });
    } catch (error) {
      thrown = error;
    }

    expect((thrown as Error)?.message ?? String(thrown)).toMatch(
      /current resolved \/ui\/data\.json endpoint .* timed out again after endpoint re-resolution returned the same endpoint\/token/u
    );
    expect((thrown as Error)?.message ?? String(thrown)).not.toMatch(/control_endpoint\.json has not rotated/u);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('falls back to fresh supervisor truth after repeated direct json current-endpoint timeouts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    await writeProviderIntakeState(runDir, {
      claimState: 'running',
      updatedAtMsAgo: 1_000
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(buildAbortError())
      .mockRejectedValueOnce(buildAbortError());

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      'http://127.0.0.1:65535/ui/data.json',
      'http://127.0.0.1:65535/ui/data.json'
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    const rawPayload = String(log.mock.calls[0]?.[0]);
    expect(rawPayload).not.toMatch(/control_endpoint\.json has not rotated/u);
    const payload = JSON.parse(rawPayload) as {
      selected_issue_identifier?: unknown;
      selected?: {
        issue_identifier?: unknown;
        task_id?: unknown;
        run_id?: unknown;
        raw_status?: unknown;
        display_status?: unknown;
        status_reason?: unknown;
        fallback_expiry?: Array<Record<string, unknown>>;
      };
      counts?: {
        running?: unknown;
        issues?: unknown;
      };
      running?: Array<{
        issue_identifier?: unknown;
        task_id?: unknown;
        run_id?: unknown;
        last_event?: unknown;
        fallback_expiry?: Array<Record<string, unknown>>;
      }>;
      issues?: Array<{
        issue_identifier?: unknown;
        status?: unknown;
        display_status?: unknown;
        is_selected?: unknown;
        fallback_expiry?: Array<Record<string, unknown>>;
      }>;
      degraded_read?: {
        reason?: unknown;
        source?: unknown;
        freshness_verdict?: unknown;
        artifact_root?: unknown;
        finding_codes?: unknown;
      };
      provider_intake?: {
        selected_claim?: {
          issue_identifier?: unknown;
          freshness?: unknown;
        };
      };
      fallback_expiry?: Array<Record<string, unknown>>;
    };
    expect(payload.degraded_read).toMatchObject({
      reason: 'ui_request_timeout',
      source: 'local_seeded_runtime',
      freshness_verdict: 'unknown',
      finding_codes: ['active_worker_proof_missing']
    });
    expect(payload.selected_issue_identifier).toBe('CO-296');
    expect(payload.selected).toMatchObject({
      issue_identifier: 'CO-296',
      task_id: 'local-mcp',
      run_id: 'provider-run-1',
      raw_status: 'in_progress',
      display_status: 'running',
      status_reason: 'provider intake advanced after ui timeout'
    });
    expect(payload.counts).toMatchObject({
      running: 1,
      issues: 1
    });
    expect(payload.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-296',
        task_id: 'local-mcp',
        run_id: 'provider-run-1',
        last_event: 'provider_intake_refresh'
      })
    ]);
    expect(payload.issues).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-296',
        status: 'running',
        display_status: 'running',
        is_selected: true
      })
    ]);
    expect(String(payload.degraded_read?.artifact_root ?? '')).toMatch(/\/\.runs\/local-mcp\/cli\/control-host$/u);
    expect(payload.provider_intake?.selected_claim).toMatchObject({
      issue_identifier: 'CO-296',
      freshness: 'fresh'
    });
    const selectedRunExpiry = expect.objectContaining({
      fallback: 'selected-run projection fallback',
      decision: 'expire fallback',
      owner: 'CO-398'
    });
    const legacyProofFallback = 'legacy proof fields projected into status output';
    const syntheticIdentityFallback =
      'synthetic identity/status fallback that hides CLI/API/UI disagreement';
    expect(payload.fallback_expiry).toEqual(expect.arrayContaining([selectedRunExpiry]));
    expect(payload.selected?.fallback_expiry).toEqual(expect.arrayContaining([selectedRunExpiry]));
    expect(payload.selected?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      legacyProofFallback
    );
    expect(payload.selected?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      syntheticIdentityFallback
    );
    expect(payload.running?.[0]?.fallback_expiry).toEqual(expect.arrayContaining([selectedRunExpiry]));
    expect(payload.running?.[0]?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      legacyProofFallback
    );
    expect(payload.running?.[0]?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      syntheticIdentityFallback
    );
    expect(payload.issues?.[0]?.fallback_expiry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fallback: 'compatibility issue projection fallback',
          decision: 'expire fallback',
          owner: 'CO-398'
        })
      ])
    );
    expect(payload.issues?.[0]?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      legacyProofFallback
    );
    expect(payload.issues?.[0]?.fallback_expiry?.map((entry) => entry.fallback)).not.toContain(
      syntheticIdentityFallback
    );
  });

  it('does not project stale retained tracked.linear advisory in local degraded json fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    await writeLinearAdvisoryState(runDir);
    await writeProviderIntakeState(runDir, {
      claimState: 'running',
      rehydratedAt: '2026-05-01T02:52:40.455Z',
      claims: [
        {
          issueIdentifier: 'CO-460',
          issueId: 'lin-issue-460',
          issueTitle: 'CO STATUS stale advisory fallback regression',
          runId: 'provider-run-460',
          claimState: 'running',
          updatedAtMsAgo: 1_000
        }
      ]
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(buildAbortError())
      .mockRejectedValueOnce(buildAbortError());

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      tracked?: { linear?: unknown };
      selected_issue_identifier?: unknown;
      provider_intake?: {
        selected_claim?: {
          issue_identifier?: unknown;
        };
      };
    };
    expect(payload.tracked?.linear ?? null).toBeNull();
    expect(payload.selected_issue_identifier).toBe('CO-460');
    expect(payload.provider_intake?.selected_claim).toMatchObject({
      issue_identifier: 'CO-460'
    });
  });

  it('uses a direct json timeout budget that leaves room for degraded fallback before 15s monitors expire', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    await writeProviderIntakeState(runDir, {
      claimState: 'running',
      updatedAtMsAgo: 1_000
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(buildAbortError())
      .mockRejectedValueOnce(buildAbortError());
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const requestTimeouts = timeoutSpy.mock.calls
      .map((call) => Number(call[1]))
      .filter((delay) => Number.isFinite(delay));
    expect(
      requestTimeouts.filter(
        (delay) => delay === coStatusCliShellTest.DEFAULT_CO_STATUS_JSON_REQUEST_TIMEOUT_MS
      )
    ).toHaveLength(2);
    expect(requestTimeouts).not.toContain(DEFAULT_ATTACH_REQUEST_TIMEOUT_MS);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      degraded_read?: {
        reason?: unknown;
        source?: unknown;
      };
    };
    expect(payload.degraded_read).toMatchObject({
      reason: 'ui_request_timeout',
      source: 'local_seeded_runtime'
    });
  });

  it('falls back for a slow live current /ui/data.json response without stale endpoint recovery', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeProviderIntakeState(runDir, {
      claimState: 'running',
      updatedAtMsAgo: 1_000
    });
    const slowServer = await startUiServer(buildUiPayload(), { responseDelayMs: 1_000 });
    servers.add(slowServer.instance);
    await writeControlEndpointArtifacts(runDir, slowServer.baseUrl);

    const payload = await readCoStatusJsonDataset({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      requestTimeoutMs: 250
    });

    expect(slowServer.requests).toEqual([
      {
        authorization: 'Bearer snapshot-token',
        csrfToken: 'snapshot-token'
      },
      {
        authorization: 'Bearer snapshot-token',
        csrfToken: 'snapshot-token'
      }
    ]);
    expect(payload.degraded_read).toMatchObject({
      reason: 'ui_request_timeout',
      source: 'local_seeded_runtime'
    });
    expect(payload.selected_issue_identifier).toBe('CO-296');
    expect(JSON.stringify(payload)).not.toMatch(/control_endpoint\.json has not rotated/u);
  });

  it('matches degraded metadata identity when both run ids are null before worker launch', () => {
    const acceptedClaim = {
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-296',
      issue_title: 'Accepted operator issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-27T13:45:00.000Z',
      task_id: 'local-mcp',
      mapping_source: 'provider_id_fallback',
      state: 'accepted',
      reason: 'provider accepted before worker launch',
      accepted_at: '2026-04-27T13:44:00.000Z',
      updated_at: '2026-04-27T13:45:00.000Z',
      last_delivery_id: 'delivery-1',
      last_event: 'provider_intake_refresh',
      last_action: 'poll',
      last_webhook_timestamp: null,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: null
    } satisfies Parameters<typeof coStatusCliShellTest.isDegradedMetadataPayloadMatchingClaim>[1];

    expect(
      coStatusCliShellTest.isDegradedMetadataPayloadMatchingClaim(
        {
          issue_identifier: 'CO-296',
          issue_id: 'lin-issue-1',
          task_id: 'local-mcp',
          run_id: null
        },
        acceptedClaim
      )
    ).toBe(true);
    expect(
      coStatusCliShellTest.isDegradedMetadataPayloadMatchingClaim(
        {
          issue_identifier: 'CO-296',
          issue_id: 'lin-issue-1',
          task_id: 'local-mcp',
          run_id: 'stale-run'
        },
        acceptedClaim
      )
    ).toBe(false);
  });

  it('does not reuse stale degraded item fallback metadata across provider-intake run changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;
    const customRunsRoot = join(root, 'custom-runs-root');
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = customRunsRoot;

    const runDir = await writeCoStatusRunDir(root, {
      runsRoot: process.env.CODEX_ORCHESTRATOR_RUNS_DIR
    });
    const startedAt = new Date(Date.now() - 5_000).toISOString();
    const updatedAt = new Date(Date.now() - 1_000).toISOString();
    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        issue_provider: 'linear',
        issue_id: 'lin-issue-stale',
        issue_identifier: 'CO-296',
        started_at: startedAt,
        updated_at: updatedAt,
        summary: 'retained provider run with legacy proof',
        commands: []
      }),
      'utf8'
    );
    await writeProviderLinearWorkerProof(runDir, {
      issue_id: 'lin-issue-stale',
      issue_identifier: 'CO-296',
      last_event_at: updatedAt,
      updated_at: updatedAt,
      workspace_path: '/tmp/stale-co-workspace'
    });
    const staleServer = await startUiServer();
    await closeServer(staleServer.instance);
    await writeControlEndpointArtifacts(runDir, staleServer.baseUrl);
    await writeProviderIntakeState(runDir, {
      claims: [
        {
          issueIdentifier: 'CO-296',
          issueId: 'lin-issue-current',
          issueTitle: 'Current operator issue',
          runId: 'provider-run-current',
          updatedAtMsAgo: 1_000
        }
      ]
    });

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      selected?: {
        run_id?: unknown;
        started_at?: unknown;
        latest_action?: unknown;
        workspace?: {
          path?: unknown;
        };
        question_summary?: unknown;
        tracked?: {
          linear?: unknown;
        };
        fallback_expiry?: Array<Record<string, unknown>>;
      };
      running?: Array<{
        run_id?: unknown;
        fallback_expiry?: Array<Record<string, unknown>>;
      }>;
      issues?: Array<{
        issue_id?: unknown;
        run_id?: unknown;
        url?: unknown;
        workspace?: {
          path?: unknown;
        };
        session?: {
          session_id?: unknown;
          thread_id?: unknown;
          turn_count?: unknown;
        };
        owner?: {
          phase?: unknown;
          status?: unknown;
        };
        tokens?: unknown;
        rate_limits?: unknown;
        recent_agent_activity?: unknown[];
        linear_activity?: unknown[];
        retry?: unknown;
        tracked?: {
          linear?: unknown;
        };
        provider_linear_worker_proof?: unknown;
        provider_debug_snapshot?: unknown;
        running?: {
          run_id?: unknown;
          fallback_expiry?: Array<Record<string, unknown>>;
        } | null;
        fallback_expiry?: Array<Record<string, unknown>>;
      }>;
    };
    const fallbackNames = (entries: Array<Record<string, unknown>> | undefined): unknown[] =>
      entries?.map((entry) => entry.fallback) ?? [];
    const legacyProofFallback = 'legacy proof fields projected into status output';

    expect(payload.selected?.run_id).toBe('provider-run-current');
    expect(payload.running?.[0]?.run_id).toBe('provider-run-current');
    expect(payload.issues?.[0]?.run_id).toBe('provider-run-current');
    expect(payload.issues?.[0]).toMatchObject({
      issue_id: 'lin-issue-current',
      url: null,
      session: {
        session_id: null,
        thread_id: null,
        turn_count: null
      },
      owner: {
        phase: null,
        status: null
      },
      tokens: null,
      rate_limits: null,
      recent_agent_activity: [],
      linear_activity: [],
      retry: null,
      tracked: {
        linear: null
      },
      provider_linear_worker_proof: null,
      provider_debug_snapshot: null
    });
    const expectedWorkspacePath = await realpath(customRunsRoot);
    expect(payload.selected?.workspace?.path).not.toBe('/tmp/stale-co-workspace');
    expect(payload.selected?.workspace?.path).toBe(expectedWorkspacePath);
    expect(payload.selected?.started_at).toBeNull();
    expect(payload.selected?.latest_action).toBeNull();
    expect(payload.selected?.question_summary).toEqual({
      queued_count: 0,
      latest_question: null
    });
    expect(payload.selected?.tracked).toEqual({ linear: null });
    expect(payload.issues?.[0]?.workspace?.path).not.toBe('/tmp/stale-co-workspace');
    expect(fallbackNames(payload.selected?.fallback_expiry)).not.toContain(legacyProofFallback);
    expect(fallbackNames(payload.running?.[0]?.fallback_expiry)).not.toContain(legacyProofFallback);
    expect(fallbackNames(payload.issues?.[0]?.running?.fallback_expiry)).not.toContain(legacyProofFallback);
    expect(fallbackNames(payload.issues?.[0]?.fallback_expiry)).not.toContain(legacyProofFallback);
    expect(JSON.stringify(payload.issues?.[0])).not.toContain('thread-old');
    expect(JSON.stringify(payload.issues?.[0])).not.toContain('legacy proof message');
  });

  it('scopes selected fallback metadata by full degraded claim identity', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    const startedAt = new Date(Date.now() - 30_000).toISOString();
    const updatedAt = new Date(Date.now() - 5_000).toISOString();
    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'provider-run-selected',
        task_id: 'local-mcp',
        status: 'in_progress',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        issue_provider: 'linear',
        issue_id: 'lin-issue-selected',
        issue_identifier: 'CO-296',
        started_at: startedAt,
        updated_at: updatedAt,
        summary: 'selected provider run with legacy proof',
        commands: []
      }),
      'utf8'
    );
    await writeProviderLinearWorkerProof(runDir, {
      issue_id: 'lin-issue-selected',
      issue_identifier: 'CO-296',
      run_id: 'provider-run-selected',
      last_event_at: updatedAt,
      updated_at: updatedAt
    });
    const staleServer = await startUiServer();
    await closeServer(staleServer.instance);
    await writeControlEndpointArtifacts(runDir, staleServer.baseUrl);
    await writeProviderIntakeState(runDir, {
      claims: [
        {
          issueIdentifier: 'CO-296',
          issueId: 'lin-issue-selected',
          issueTitle: 'Selected operator issue',
          runId: 'provider-run-selected',
          updatedAtMsAgo: 1_000
        },
        {
          issueIdentifier: 'CO-296',
          issueId: 'lin-issue-sibling',
          issueTitle: 'Sibling operator issue',
          runId: 'provider-run-sibling',
          updatedAtMsAgo: 2_000
        }
      ]
    });

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      selected?: {
        fallback_expiry?: Array<Record<string, unknown>>;
      };
      running?: Array<{
        run_id?: unknown;
        fallback_expiry?: Array<Record<string, unknown>>;
      }>;
      issues?: Array<{
        run_id?: unknown;
        running?: {
          fallback_expiry?: Array<Record<string, unknown>>;
        } | null;
        fallback_expiry?: Array<Record<string, unknown>>;
      }>;
    };
    const fallbackNames = (entries: Array<Record<string, unknown>> | undefined): unknown[] =>
      entries?.map((entry) => entry.fallback) ?? [];
    const legacyProofFallback = 'legacy proof fields projected into status output';
    const siblingRunning = payload.running?.find((entry) => entry.run_id === 'provider-run-sibling');
    const siblingIssue = payload.issues?.find((entry) => entry.run_id === 'provider-run-sibling');

    expect(fallbackNames(payload.selected?.fallback_expiry)).toContain(legacyProofFallback);
    expect(fallbackNames(siblingRunning?.fallback_expiry)).not.toContain(legacyProofFallback);
    expect(fallbackNames(siblingIssue?.running?.fallback_expiry)).not.toContain(legacyProofFallback);
    expect(fallbackNames(siblingIssue?.fallback_expiry)).not.toContain(legacyProofFallback);
  });

  it('uses degraded json fallback for current attach-shell unhealthy wording without the canonical token', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    await writeProviderIntakeState(runDir, {
      claimState: 'running',
      updatedAtMsAgo: 1_000
    });
    const attachErrorMessage = [
      'control-host unavailable; stale endpoint after control-host restart.',
      'control_endpoint.json has not rotated to a reachable host.',
      'Waiting for control_endpoint.json to rotate or rerun co-status attach.'
    ].join(' ');
    expect(attachErrorMessage).not.toContain('current-host-unhealthy');

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await withMockedAttachDatasetFailure(attachErrorMessage, async ({ runCoStatusCliShell: runWithMockedAttach }) => {
      await runWithMockedAttach({
        flags: {
          format: 'json',
          'run-dir': runDir
        },
        printHelp: vi.fn()
      });
    });

    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      degraded_read?: {
        reason?: unknown;
        source?: unknown;
      };
      selected_issue_identifier?: unknown;
    };
    expect(payload.degraded_read).toMatchObject({
      reason: 'current_host_unhealthy',
      source: 'local_seeded_runtime'
    });
    expect(payload.selected_issue_identifier).toBe('CO-296');
  });

  it('readCoStatusJsonDataset uses degraded fallback for legacy stale-endpoint wording', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    await writeProviderIntakeState(runDir, {
      claimState: 'running',
      updatedAtMsAgo: 1_000
    });
    const attachErrorMessage =
      'control-host unavailable; control_endpoint.json has not rotated to a reachable host. Waiting for control_endpoint.json to rotate or rerun co-status attach.';
    expect(attachErrorMessage).not.toContain('current-host-unhealthy');

    const payload = await withMockedAttachDatasetFailure(
      attachErrorMessage,
      async ({ readCoStatusJsonDataset }) =>
        await readCoStatusJsonDataset({
          flags: {
            format: 'json',
            'run-dir': runDir
          }
        })
    );

    expect(payload.degraded_read).toMatchObject({
      reason: 'current_host_unhealthy',
      source: 'local_seeded_runtime'
    });
    expect(payload.selected_issue_identifier).toBe('CO-296');
  });

  it('surfaces every fresh running intake claim during degraded json fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    await writeProviderIntakeState(runDir, {
      claims: [
        {
          issueIdentifier: 'CO-295',
          issueId: 'lin-issue-1',
          issueTitle: 'First operator issue',
          runId: 'provider-run-1',
          updatedAtMsAgo: 3_000
        },
        {
          issueIdentifier: 'CO-299',
          issueId: 'lin-issue-2',
          issueTitle: 'Second operator issue',
          runId: 'provider-run-2',
          updatedAtMsAgo: 2_000
        },
        {
          issueIdentifier: 'CO-302',
          issueId: 'lin-issue-3',
          issueTitle: 'Third operator issue',
          runId: 'provider-run-3',
          updatedAtMsAgo: 1_000
        }
      ]
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(buildAbortError())
      .mockRejectedValueOnce(buildAbortError());

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      selected_issue_identifier?: unknown;
      counts?: {
        running?: unknown;
        issues?: unknown;
      };
      running?: Array<{
        issue_identifier?: unknown;
      }>;
      issues?: Array<{
        issue_identifier?: unknown;
      }>;
      provider_intake?: {
        running_claim_count?: unknown;
      };
    };

    expect(payload.selected_issue_identifier).toBe('CO-302');
    expect(payload.counts).toMatchObject({
      running: 3,
      issues: 3
    });
    expect(payload.provider_intake?.running_claim_count).toBe(3);
    expect(payload.running?.map((entry) => entry.issue_identifier)).toEqual(['CO-302', 'CO-299', 'CO-295']);
    expect(payload.issues?.map((entry) => entry.issue_identifier)).toEqual(['CO-302', 'CO-299', 'CO-295']);
  });

  it('falls back to active provider-intake projection when the current endpoint is dead without rotation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    const staleServer = await startUiServer();
    await closeServer(staleServer.instance);
    await writeControlEndpointArtifacts(runDir, staleServer.baseUrl);
    await writeProviderIntakeState(runDir, {
      claims: [
        {
          issueIdentifier: 'CO-345',
          issueId: 'lin-issue-done',
          issueTitle: 'Already finished issue',
          runId: 'provider-run-done',
          claimState: 'completed',
          issueState: 'Done',
          issueStateType: 'completed',
          reason: 'terminal issue retained in intake history',
          updatedAtMsAgo: 500
        },
        {
          issueIdentifier: 'CO-330',
          issueId: 'lin-issue-reopened',
          issueTitle: 'Reopened stale-owner issue',
          runId: 'provider-run-reopened',
          claimState: 'running',
          issueState: 'In Progress',
          issueStateType: 'started',
          reason: 'reopened issue metadata refreshed from provider intake',
          updatedAtMsAgo: 2_000
        },
        {
          issueIdentifier: 'CO-356',
          issueId: 'lin-issue-active',
          issueTitle: 'Active archive automation issue',
          runId: 'provider-run-active',
          claimState: 'running',
          issueState: 'In Progress',
          issueStateType: 'started',
          reason: 'active issue remains in provider intake',
          updatedAtMsAgo: 1_000
        }
      ]
    });

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        format: 'json',
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(log).toHaveBeenCalledTimes(1);
    const rawPayload = String(log.mock.calls[0]?.[0]);
    expect(rawPayload).toMatch(/current_host_unhealthy/u);
    const payload = JSON.parse(rawPayload) as {
      selected_issue_identifier?: unknown;
      counts?: {
        running?: unknown;
        issues?: unknown;
      };
      degraded_read?: {
        reason?: unknown;
        source?: unknown;
      };
      provider_intake?: {
        active_claim_count?: unknown;
        active_issue_identifiers?: unknown[];
        running_issue_identifiers?: unknown[];
        selected_claim?: {
          issue_identifier?: unknown;
          issue_state?: unknown;
          issue_state_type?: unknown;
        };
      };
      running?: Array<{
        issue_identifier?: unknown;
      }>;
      issues?: Array<{
        issue_identifier?: unknown;
        status?: unknown;
        status_reason?: unknown;
      }>;
    };

    expect(payload.degraded_read).toMatchObject({
      reason: 'current_host_unhealthy',
      source: 'local_seeded_runtime'
    });
    expect(payload.selected_issue_identifier).toBe('CO-356');
    expect(payload.counts).toMatchObject({
      running: 2,
      issues: 2
    });
    expect(payload.provider_intake).toMatchObject({
      active_claim_count: 2,
      active_issue_identifiers: ['CO-356', 'CO-330'],
      running_issue_identifiers: ['CO-356', 'CO-330'],
      selected_claim: {
        issue_identifier: 'CO-356',
        issue_state: 'In Progress',
        issue_state_type: 'started'
      }
    });
    expect(payload.running?.map((entry) => entry.issue_identifier)).toEqual(['CO-356', 'CO-330']);
    expect(payload.issues?.map((entry) => entry.issue_identifier)).toEqual(['CO-356', 'CO-330']);
    expect(payload.issues).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-356',
        status: 'running',
        status_reason: 'active issue remains in provider intake'
      }),
      expect.objectContaining({
        issue_identifier: 'CO-330',
        status: 'running',
        status_reason: 'reopened issue metadata refreshed from provider intake'
      })
    ]);
    expect(payload.issues?.some((entry) => entry.issue_identifier === 'CO-345')).toBe(false);
  });

  it('fails closed when supervisor truth is stale after repeated direct json current-endpoint timeouts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);
    await writeControlEndpointArtifacts(runDir, 'http://127.0.0.1:65535');
    await writeProviderIntakeState(runDir, {
      claimState: 'stale',
      updatedAtMsAgo: 86_400_000
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(buildAbortError())
      .mockRejectedValueOnce(buildAbortError());

    let thrown: unknown;
    try {
      await runCoStatusCliShell({
        flags: {
          format: 'json',
          'run-dir': runDir
        },
        printHelp: vi.fn()
      });
    } catch (error) {
      thrown = error;
    }

    expect((thrown as Error)?.message ?? String(thrown)).toMatch(
      /current resolved \/ui\/data\.json endpoint .* timed out again after endpoint re-resolution returned the same endpoint\/token/u
    );
    expect((thrown as Error)?.message ?? String(thrown)).not.toMatch(/control_endpoint\.json has not rotated/u);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('fails with stale-endpoint guidance when direct json mode hits a dead endpoint that does not rotate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = await writeCoStatusRunDir(root);

    const staleServer = await startUiServer();
    await closeServer(staleServer.instance);
    await writeControlEndpointArtifacts(runDir, staleServer.baseUrl);

    await expect(
      runCoStatusCliShell({
        flags: {
          format: 'json',
          'run-dir': runDir
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow(
      /current-host-unhealthy: control_endpoint\.json; control-host unavailable; stale endpoint after control-host restart\. control_endpoint\.json has not rotated to a reachable host\./u
    );
  });

  it('uses the attach path for default text-mode status instead of starting a control host', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });

    const server = await startUiServer();
    servers.add(server.instance);

    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'snapshot-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runCoStatusCliShell({
      flags: {
        'run-dir': runDir
      },
      printHelp: vi.fn()
    });

    expect(server.requests).toEqual([]);
    const loggedLines = log.mock.calls.map((call) => String(call[0]));
    expect(loggedLines).toHaveLength(5);
    expect(loggedLines[0]).toBe(`CO STATUS attach target: ${new URL(server.baseUrl).toString()}`);
    expect(loggedLines[1]).toBe('Task: local-mcp');
    expect(loggedLines[2]).toBe('Run: control-host');
    expect(loggedLines[3]).toContain('/.runs/local-mcp/cli/control-host');
    expect(loggedLines[4]).toContain('/.runs/local-mcp/cli/control-host/manifest.json');
  });

  it('rejects launch-only flags now that co-status is attach-only', async () => {
    await expect(
      runCoStatusCliShell({
        flags: {
          pipeline: 'docs-review'
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow(
      'co-status attaches to an existing control host and does not accept launch-only flags: --pipeline. Use `control-host` to start a control host with launch settings.'
    );
  });

  it('rejects local rollout lifecycle commands with both selectors', async () => {
    await expect(
      runCoStatusOperatorAutopilotCliShell({
        positionals: ['local-rollout', 'clear'],
        flags: {
          'action-id': 'local_rollout:test-action',
          issue: 'CO-118',
          reason: 'operator handled the rollout'
        },
        printHelp: vi.fn()
      })
    ).rejects.toThrow(
      'co-status operator-autopilot local-rollout accepts exactly one selector: --issue or --action-id.'
    );
  });

  it('records local rollout lifecycle metadata through the co-status operator-autopilot surface', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    process.env.CODEX_ORCHESTRATOR_ROOT = root;

    const runDir = join(root, '.runs', 'local-mcp', 'cli', 'control-host');
    await mkdir(runDir, { recursive: true });
    const lifecyclePath = join(runDir, 'provider-operator-autopilot-lifecycle.json');

    const server = await startUiServer(buildUiPayload({
      provider_workflow: {
        status: 'ready',
        pipeline_id: 'provider-linear-worker',
        source_path: join(root, 'codex.orchestrator.json'),
        snapshot_path: null,
        last_reload_attempt_at: '2026-04-03T08:29:00.000Z',
        last_success_at: '2026-04-03T08:29:00.000Z',
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [],
        operator_autopilot: {
          enabled: true,
          backlog_promotion: {
            enabled: true,
            state_name: 'Backlog',
            target_state_name: 'Ready'
          },
          review_handoff_rework: {
            enabled: true,
            target_state_name: 'Rework',
            excluded_action_required_reasons: []
          },
          post_merge_rollout: {
            enabled: true,
            summary: 'Merge closeout completed; local rollout follow-up may still be required.'
          },
          audit_path: join(runDir, 'provider-operator-autopilot.jsonl'),
          lifecycle_path: lifecyclePath,
          last_result: {
            recorded_at: '2026-04-03T08:30:00.000Z',
            status: 'acted',
            summary: 'Surfaced 1 pending local rollout action (CO-118).',
            error: null,
            actions: [],
            holds: [],
            pending_actions: [
              {
                kind: 'local_rollout',
                action_instance_id: 'local_rollout:test-action',
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-118',
                summary: 'rollout pending',
                merge_closeout_recorded_at: '2026-04-03T08:20:00.000Z',
                merge_closeout_reason: 'merged_and_transitioned_done',
                shared_root_status: 'reconciled',
                linear_transition_status: 'transitioned',
                lifecycle_state: 'pending',
                lifecycle_actor: null,
                lifecycle_reason: null,
                lifecycle_recorded_at: null
              }
            ],
            resolved_actions: [],
            lifecycle_records: []
          }
        }
      }
    }));
    servers.add(server.instance);

    await writeFile(
      join(runDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'local-mcp',
        status: 'in_progress'
      }),
      'utf8'
    );
    await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token: 'snapshot-token' }), 'utf8');
    await writeFile(
      join(runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: server.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const originalUser = process.env.USER;
    process.env.USER = '   ';
    try {
      await runCoStatusOperatorAutopilotCliShell({
        positionals: ['local-rollout', 'dismiss'],
        flags: {
          'action-id': '   ',
          issue: 'CO-118',
          reason: 'rollout reminder is not actionable',
          'run-dir': runDir,
          format: 'json'
        },
        printHelp: vi.fn()
      });
    } finally {
      if (originalUser === undefined) {
        delete process.env.USER;
      } else {
        process.env.USER = originalUser;
      }
    }

    expect(server.requests).toEqual([
      {
        authorization: 'Bearer snapshot-token',
        csrfToken: 'snapshot-token'
      }
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      status: 'recorded',
      state: 'dismissed',
      action: 'dismiss',
      lifecycle_path: lifecyclePath
    });
    const store = JSON.parse(await readFile(lifecyclePath, 'utf8')) as Record<string, unknown>;
    expect(store).toMatchObject({
      version: 1,
      records: [
        {
          action_instance_id: 'local_rollout:test-action',
          state: 'dismissed',
          actor: 'operator',
          reason: 'rollout reminder is not actionable',
          source: 'co-status'
        }
      ]
    });
  });

  it('serializes concurrent local rollout lifecycle sidecar appends', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    const lifecyclePath = join(
      root,
      '.runs',
      'local-mcp',
      'cli',
      'control-host',
      'provider-operator-autopilot-lifecycle.json'
    );

    await Promise.all(
      ['acknowledged', 'cleared'].map((state, index) =>
        appendProviderOperatorAutopilotLifecycleRecord(lifecyclePath, {
          action_instance_id: 'local_rollout:test-action',
          kind: 'local_rollout',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-118',
          state: state as 'acknowledged' | 'cleared',
          actor: `operator-${index}`,
          reason: `operator decision ${index}`,
          recorded_at: `2026-04-09T10:2${index}:00.000Z`,
          source: 'co-status'
        })
      )
    );

    const store = JSON.parse(await readFile(lifecyclePath, 'utf8')) as {
      records?: Array<Record<string, unknown>>;
    };
    expect(store.records).toHaveLength(2);
    expect(store.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: 'acknowledged',
          actor: 'operator-0'
        }),
        expect.objectContaining({
          state: 'cleared',
          actor: 'operator-1'
        })
      ])
    );
  });

  it('recovers stale local rollout lifecycle sidecar locks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'co-status-shell-'));
    tempDirs.push(root);
    const lifecyclePath = join(
      root,
      '.runs',
      'local-mcp',
      'cli',
      'control-host',
      'provider-operator-autopilot-lifecycle.json'
    );
    const lockPath = `${lifecyclePath}.lock`;
    await mkdir(dirname(lockPath), { recursive: true });
    await writeFile(lockPath, 'interrupted-owner', 'utf8');
    const staleAt = new Date(Date.now() - 60_000);
    await utimes(lockPath, staleAt, staleAt);

    await appendProviderOperatorAutopilotLifecycleRecord(lifecyclePath, {
      action_instance_id: 'local_rollout:test-action',
      kind: 'local_rollout',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-118',
      state: 'cleared',
      actor: 'operator',
      reason: 'local rollout completed',
      recorded_at: '2026-04-09T10:25:00.000Z',
      source: 'co-status'
    });

    const store = JSON.parse(await readFile(lifecyclePath, 'utf8')) as {
      records?: Array<Record<string, unknown>>;
    };
    expect(store.records).toEqual([
      expect.objectContaining({
        state: 'cleared',
        actor: 'operator'
      })
    ]);
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

async function startUiServer(
  payload: Record<string, unknown> = buildUiPayload(),
  options: { responseDelayMs?: number } = {}
): Promise<{
  instance: http.Server;
  baseUrl: string;
  requests: Array<{ authorization: string | null; csrfToken: string | null }>;
}> {
  const requests: Array<{ authorization: string | null; csrfToken: string | null }> = [];
  const server = http.createServer(async (req, res) => {
    if (req.url === '/ui/data.json') {
      requests.push({
        authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : null,
        csrfToken: typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : null
      });
      if (req.headers.authorization !== 'Bearer snapshot-token') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorised' }));
        return;
      }
      if (req.headers['x-csrf-token'] !== 'snapshot-token') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'csrf required' }));
        return;
      }
      if (options.responseDelayMs && options.responseDelayMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, options.responseDelayMs));
      }
      if (res.destroyed) {
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify(payload));
      return;
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('expected loopback http server address');
  }
  return {
    instance: server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests
  };
}

async function startFailingUiServer(
  beforeNetworkFailure?: () => Promise<void> | void
): Promise<{
  instance: http.Server;
  baseUrl: string;
  requests: Array<{ authorization: string | null; csrfToken: string | null }>;
}> {
  const requests: Array<{ authorization: string | null; csrfToken: string | null }> = [];
  const server = http.createServer(async (req) => {
    if (req.url === '/ui/data.json') {
      requests.push({
        authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : null,
        csrfToken: typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : null
      });
      await beforeNetworkFailure?.();
      req.socket.destroy();
      return;
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('expected loopback http server address');
  }
  return {
    instance: server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests
  };
}

async function writeCoStatusRunDir(
  root: string,
  options: { runsRoot?: string } = {}
): Promise<string> {
  const runDir = join(options.runsRoot ?? join(root, '.runs'), 'local-mcp', 'cli', 'control-host');
  await mkdir(runDir, { recursive: true });
  await writeFile(
    join(runDir, 'manifest.json'),
    JSON.stringify({
      run_id: 'control-host',
      task_id: 'local-mcp',
      status: 'in_progress'
    }),
    'utf8'
  );
  return runDir;
}

async function writeControlEndpointArtifacts(
  runDir: string,
  baseUrl: string,
  token = 'snapshot-token'
): Promise<void> {
  await writeFile(join(runDir, 'control_auth.json'), JSON.stringify({ token }), 'utf8');
  await writeFile(
    join(runDir, 'control_endpoint.json'),
    JSON.stringify({
      base_url: baseUrl,
      token_path: 'control_auth.json'
    }),
    'utf8'
  );
}

async function writeProviderIntakeState(
  runDir: string,
  options: Parameters<typeof buildProviderIntakeState>[0] = {}
): Promise<void> {
  await writeFile(
    join(runDir, 'provider-intake-state.json'),
    JSON.stringify(buildProviderIntakeState(options)),
    'utf8'
  );
}

async function writeLinearAdvisoryState(runDir: string): Promise<void> {
  await writeFile(
    join(runDir, 'linear-advisory-state.json'),
    JSON.stringify({
      schema_version: 1,
      updated_at: '2026-03-22T04:01:03.255Z',
      latest_delivery_id: 'delivery-co-1-stale',
      latest_result: 'accepted',
      latest_reason: 'linear_delivery_accepted',
      latest_event: null,
      latest_accepted_at: '2026-03-22T04:01:03.255Z',
      tracked_issue: {
        provider: 'linear',
        id: 'lin-issue-1',
        identifier: 'CO-1',
        title: 'Stale retained CO-1 advisory',
        description: null,
        url: null,
        state: 'In Progress',
        state_type: 'started',
        archived_at: null,
        trashed: false,
        viewer_id: 'viewer-1',
        assignee_id: 'viewer-1',
        assignee_name: 'Codex',
        workspace_id: 'workspace-1',
        team_id: 'team-1',
        team_key: 'CO',
        team_name: 'CO',
        project_id: 'project-1',
        project_name: 'CO',
        updated_at: '2026-03-22T04:01:03.255Z',
        blocked_by: [],
        recent_activity: []
      },
      seen_deliveries: []
    }),
    'utf8'
  );
}

async function writeProviderLinearWorkerProof(
  runDir: string,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await writeFile(
    join(runDir, 'provider-linear-worker-proof.json'),
    JSON.stringify({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-296',
      pid: null,
      thread_id: 'thread-old',
      latest_turn_id: 'turn-old',
      latest_session_id: 'thread-old-turn-old',
      latest_session_id_source: 'derived_from_thread_and_turn',
      turn_count: 2,
      last_event: 'provider_worker_started',
      last_message: 'legacy proof message',
      last_event_at: '2026-04-03T08:10:00.000Z',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: null,
      owner_phase: 'implementation',
      owner_status: 'in_progress',
      workspace_path: null,
      linear_audit: null,
      end_reason: null,
      updated_at: '2026-04-03T08:10:00.000Z',
      ...overrides
    }),
    'utf8'
  );
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    try {
      server.close(() => resolve());
    } catch {
      resolve();
    }
  });
  servers.delete(server);
}

async function withMockedAttachDatasetFailure<T>(
  message: string,
  run: (module: typeof import('../src/cli/coStatusCliShell.js')) => Promise<T>
): Promise<T> {
  vi.resetModules();
  vi.doMock('../src/cli/coStatusAttachCliShell.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/cli/coStatusAttachCliShell.js')>();
    return {
      ...actual,
      readUiDatasetWithEndpointRecovery: vi.fn(async () => {
        throw new Error(message);
      })
    };
  });
  try {
    const module = await import('../src/cli/coStatusCliShell.js');
    return await run(module);
  } finally {
    vi.doUnmock('../src/cli/coStatusAttachCliShell.js');
    vi.resetModules();
  }
}

function buildUiPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    generated_at: '2026-04-03T08:30:00.000Z',
    mode: 'operator_dashboard',
    read_only: true,
    host: 'test-host',
    counts: { running: 1, retrying: 1, issues: 2 },
    totals: {
      input_tokens: 12,
      output_tokens: 8,
      total_tokens: 20,
      seconds_running: 61
    },
    rate_limits: {
      source: 'control-host-polling',
      requests: {
        remaining: 19,
        limit: 30,
        reset_in_seconds: 42
      }
    },
    polling: {
      enabled: true,
      interval_ms: 15000,
      checking: false,
      queued: false,
      last_mode: 'poll',
      last_requested_at: '2026-04-03T08:29:45.000Z',
      last_completed_at: '2026-04-03T08:29:46.000Z',
      last_success_at: '2026-04-03T08:29:46.000Z',
      last_error_at: null,
      last_error: null,
      next_poll_at: '2026-04-03T08:30:15.000Z',
      next_poll_in_ms: 15000
    },
    selected_issue_identifier: 'CO-76',
    selected: null,
    running: [],
    retrying: [],
    issues: [],
    ...overrides
  };
}

function buildProviderIntakeState(options: {
  claimState?: 'running' | 'stale' | 'completed';
  updatedAtMsAgo?: number;
  rehydratedAt?: string | null;
  claims?: Array<{
    issueIdentifier: string;
    issueId: string;
    issueTitle: string;
    runId: string;
    claimState?: 'running' | 'stale' | 'completed';
    issueState?: string;
    issueStateType?: string;
    reason?: string;
    updatedAtMsAgo?: number;
  }>;
} = {}): Record<string, unknown> {
  const updatedAtMsAgo = options.updatedAtMsAgo ?? 1_000;
  const updatedAt = new Date(Date.now() - updatedAtMsAgo).toISOString();
  const claimState = options.claimState ?? 'running';
  const claims = options.claims ?? [
    {
      issueIdentifier: 'CO-296',
      issueId: 'lin-issue-1',
      issueTitle: 'Current operator issue',
      runId: 'provider-run-1',
      claimState,
      updatedAtMsAgo
    }
  ];
  const freshestClaim =
    claims.reduce<typeof claims[number] | null>((best, claim) => {
      const bestAge = best?.updatedAtMsAgo ?? updatedAtMsAgo;
      const claimAge = claim.updatedAtMsAgo ?? updatedAtMsAgo;
      return best === null || claimAge < bestAge ? claim : best;
    }, null) ?? claims[0];
  const freshestState = freshestClaim?.claimState ?? claimState;
  const freshestReason = freshestClaim?.reason
    ?? (freshestState === 'stale'
      ? 'supervisor truth stale after ui timeout'
      : freshestState === 'completed'
        ? 'terminal issue retained in intake history'
        : 'provider intake advanced after ui timeout');
  return {
    schema_version: 1,
    updated_at: updatedAt,
    rehydrated_at: options.rehydratedAt ?? null,
    latest_provider_key: `linear:${freshestClaim?.issueId ?? 'lin-issue-1'}`,
    latest_reason: freshestReason,
    polling: {
      source: 'provider-intake-state.json',
      last_requested_at: updatedAt,
      last_completed_at: updatedAt,
      last_success_at: updatedAt,
      last_error_at: null,
      last_error: null
    },
    claims: claims.map((claim, index) => {
      const claimUpdatedAtMsAgo = claim.updatedAtMsAgo ?? updatedAtMsAgo;
      const claimUpdatedAt = new Date(Date.now() - claimUpdatedAtMsAgo).toISOString();
      const state = claim.claimState ?? claimState;
      return {
        provider: 'linear',
        provider_key: `linear:${claim.issueId}`,
        issue_id: claim.issueId,
        issue_identifier: claim.issueIdentifier,
        issue_title: claim.issueTitle,
        issue_state: claim.issueState ?? (state === 'completed' ? 'Done' : 'In Progress'),
        issue_state_type: claim.issueStateType ?? (state === 'completed' ? 'completed' : 'started'),
        issue_updated_at: new Date(Date.now() - claimUpdatedAtMsAgo - 5_000).toISOString(),
        task_id: 'local-mcp',
        mapping_source: 'provider_id_fallback',
        state,
        reason:
          claim.reason ??
          (state === 'stale'
            ? 'supervisor truth stale after ui timeout'
            : state === 'completed'
              ? 'terminal issue retained in intake history'
              : 'provider intake advanced after ui timeout'),
        accepted_at: new Date(Date.now() - claimUpdatedAtMsAgo - 60_000).toISOString(),
        updated_at: claimUpdatedAt,
        last_delivery_id: `delivery-${index + 1}`,
        last_event: 'provider_intake_refresh',
        last_action: 'poll',
        last_webhook_timestamp: null,
        run_id: claim.runId,
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: null
      };
    })
  };
}

function buildAbortError(): Error {
  const error = new Error('operation aborted');
  error.name = 'AbortError';
  return error;
}
