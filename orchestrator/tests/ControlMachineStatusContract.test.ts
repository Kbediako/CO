import http from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  buildMachineStatusDataset,
  type ControlMachineStatusSnapshot
} from '../src/cli/control/controlMachineStatusPresenter.js';
import { createControlRuntime } from '../src/cli/control/controlRuntime.js';
import {
  __test__ as machineStatusControllerTest,
  handleMachineStatusRequest
} from '../src/cli/control/machineStatusController.js';
import type { ControlProviderWorkflowPayload } from '../src/cli/control/observabilityReadModel.js';
import type { ProviderIntakeClaimRecord } from '../src/cli/control/providerIntakeState.js';
import type { ProviderWorkflowConfigStore } from '../src/cli/control/providerWorkflowConfigStore.js';

function createResponseRecorder() {
  const state: {
    statusCode: number | null;
    headers: Record<string, string> | null;
    body: unknown;
  } = {
    statusCode: null,
    headers: null,
    body: null
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = headers;
      return this;
    },
    end(payload?: string) {
      state.body = payload ? JSON.parse(payload) : null;
      return this;
    }
  } as unknown as http.ServerResponse;

  return { res, state };
}

describe('control machine status contract', () => {
  it('keeps the machine-status endpoint/read model independent from compatibility projection', async () => {
    const controlDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli', 'control');
    const controlFiles = await readdir(controlDir);
    const machineStatusFiles = controlFiles
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => /machine.*status|status.*machine/iu.test(file));

    expect(
      machineStatusFiles,
      'expected a control machine-status endpoint/read-model source file such as controlMachineStatusController.ts'
    ).not.toEqual([]);

    const source = (
      await Promise.all(
        machineStatusFiles.map(async (file) => ({
          file,
          text: await readFile(join(controlDir, file), 'utf8')
        }))
      )
    ).map(({ file, text }) => `// ${file}\n${text}`).join('\n');

    expect(source).not.toMatch(/\breadCompatibilityProjection\s*\(/u);
  });

  it('preserves lightweight active-worker identity from provider-intake claims', () => {
    const claim = {
      provider: 'linear',
      provider_key: 'linear:issue-572',
      issue_id: 'issue-572',
      issue_identifier: 'CO-572',
      issue_title: 'Recover co-status machine readiness',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-05-21T12:30:00.000Z',
      task_id: 'linear-f7007d31-6a20-43e8-8f38-ca774a890683',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider worker active',
      accepted_at: '2026-05-21T12:25:00.000Z',
      updated_at: '2026-05-21T12:31:00.000Z',
      last_delivery_id: 'delivery-572',
      last_event: 'provider_worker_progress',
      last_action: 'poll',
      last_webhook_timestamp: null,
      run_id: 'run-572',
      run_manifest_path: null,
      worker_host: 'host-a',
      launch_source: 'control-host',
      launch_token: null,
      launch_started_at: '2026-05-21T12:26:00.000Z'
    } satisfies ProviderIntakeClaimRecord;

    const dataset = buildMachineStatusDataset({
      generatedAt: '2026-05-21T12:32:00.000Z',
      providerIntake: {
        provider: 'linear',
        summary_scope: 'single_claim',
        selection_strategy: null,
        claim_count: 1,
        active_claim_count: 1,
        running_claim_count: 1,
        active_issue_identifiers: ['CO-572'],
        running_issue_identifiers: ['CO-572'],
        selected_claim: {
          provider: 'linear',
          issue_id: 'issue-572',
          issue_identifier: 'CO-572',
          issue_title: 'Recover co-status machine readiness',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-05-21T12:30:00.000Z',
          issue_archived_at: null,
          issue_trashed: null,
          issue_viewer_id: null,
          issue_assignee_id: null,
          issue_assignee_name: null,
          task_id: 'linear-f7007d31-6a20-43e8-8f38-ca774a890683',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider worker active',
          run_id: 'run-572',
          worker_host: 'host-a',
          freshness: null,
          retry: null,
          updated_at: '2026-05-21T12:31:00.000Z'
        },
        rehydrated_at: null,
        is_rehydrated: false,
        updated_at: '2026-05-21T12:31:00.000Z'
      },
      runningClaims: [claim],
      polling: {
        enabled: true,
        interval_ms: 15000,
        checking: true,
        queued: true,
        stuck: true,
        restart_required: true,
        reason: 'provider_refresh_lifecycle_stuck',
        last_mode: 'poll',
        last_requested_at: '2026-05-21T12:31:00.000Z',
        last_completed_at: null,
        last_success_at: null,
        last_error_at: '2026-05-21T12:31:30.000Z',
        last_error: 'provider_refresh_lifecycle_stuck',
        next_poll_at: null,
        next_poll_in_ms: null
      }
    });

    expect(dataset.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-572',
        issue_id: 'issue-572',
        task_id: 'linear-f7007d31-6a20-43e8-8f38-ca774a890683',
        run_id: 'run-572',
        session_id: 'run-572',
        worker_host: 'host-a',
        started_at: '2026-05-21T12:26:00.000Z',
        last_event_at: '2026-05-21T12:31:00.000Z'
      })
    ]);
  });

  it('preserves persisted polling progress metadata for machine-status fail-closed checks', async () => {
    const runtime = createControlRuntime({
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      questionQueue: {
        list: () => []
      },
      paths: {
        manifestPath: '/repo/.runs/local-mcp/cli/control-host/manifest.json',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        logPath: '/repo/.runs/local-mcp/cli/control-host/run.log'
      },
      linearAdvisoryState: {
        tracked_issue: null
      },
      providerIntakeState: {
        schema_version: 1,
        updated_at: '2026-05-21T12:30:00.000Z',
        rehydrated_at: null,
        latest_provider_key: null,
        latest_reason: null,
        claims: [],
        polling: {
          enabled: true,
          interval_ms: 15000,
          checking: true,
          queued: false,
          last_mode: 'refresh',
          last_requested_at: '2026-05-21T12:20:00.000Z',
          last_completed_at: null,
          last_success_at: '2026-05-21T12:19:00.000Z',
          last_error_at: null,
          last_error: null,
          next_poll_at: null,
          next_poll_in_ms: null,
          operation_started_at: '2026-05-21T12:20:00.000Z',
          operation_elapsed_ms: 660_000,
          progress_updated_at: '2026-05-21T12:21:00.000Z',
          progress_elapsed_ms: 600_000,
          stalled_after_ms: 45_000,
          stuck: false,
          restart_required: false
        }
      }
    } as Parameters<typeof createControlRuntime>[0]);

    const machineStatus = await runtime.snapshot().readMachineStatus();

    expect(machineStatus.polling).toMatchObject({
      checking: true,
      progress_updated_at: '2026-05-21T12:21:00.000Z',
      progress_elapsed_ms: 600_000,
      stalled_after_ms: 45_000
    });
  });

  it('uses cached provider-workflow status for machine-status reads', async () => {
    let refreshCalled = false;
    const providerWorkflow = buildProviderWorkflowPayload();
    const providerWorkflowConfigStore = {
      bootstrap: async () => {
        throw new Error('machine-status must not bootstrap provider workflow');
      },
      refresh: async () => {
        refreshCalled = true;
        throw new Error('machine-status must not refresh provider workflow');
      },
      refreshStatus: async () => {
        refreshCalled = true;
        throw new Error('machine-status must not refresh provider workflow status');
      },
      snapshot: () => providerWorkflow,
      getLaunchConfigPath: async () => {
        throw new Error('machine-status must not resolve launch config');
      },
      recordTerminalCleanupResult: () => undefined,
      recordOperatorAutopilotResult: () => undefined
    } satisfies ProviderWorkflowConfigStore;
    const runtime = createControlRuntime({
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      questionQueue: {
        list: () => []
      },
      paths: {
        manifestPath: '/repo/.runs/local-mcp/cli/control-host/manifest.json',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        logPath: '/repo/.runs/local-mcp/cli/control-host/run.log'
      },
      linearAdvisoryState: {
        tracked_issue: null
      },
      providerIntakeState: {
        schema_version: 1,
        updated_at: '2026-05-21T12:30:00.000Z',
        rehydrated_at: null,
        latest_provider_key: null,
        latest_reason: null,
        claims: [],
        polling: null
      },
      providerWorkflowConfigStore
    } as Parameters<typeof createControlRuntime>[0]);

    const machineStatus = await runtime.snapshot().readMachineStatus();

    expect(refreshCalled).toBe(false);
    expect(machineStatus.providerWorkflow).toEqual(providerWorkflow);
  });

  it('returns degraded fail-closed machine-status json when the read path times out', async () => {
    vi.useFakeTimers();
    try {
      const { res, state } = createResponseRecorder();
      let observedSignal: AbortSignal | undefined;
      let abortReason: unknown;
      const handledPromise = handleMachineStatusRequest({
        req: {
          method: 'GET',
          url: '/ui/machine-status.json'
        } as Pick<http.IncomingMessage, 'method' | 'url'>,
        res,
        presenterContext: {
          readMachineStatus: async (signal?: AbortSignal) => {
            observedSignal = signal;
            return await new Promise<ControlMachineStatusSnapshot>((_resolve, reject) => {
              signal?.addEventListener(
                'abort',
                () => {
                  abortReason = signal.reason;
                  reject(signal.reason);
                },
                { once: true }
              );
            });
          }
        }
      });

      await vi.advanceTimersByTimeAsync(machineStatusControllerTest.DEFAULT_MACHINE_STATUS_READ_TIMEOUT_MS);

      await expect(handledPromise).resolves.toBe(true);
      expect(state.statusCode).toBe(200);
      expect(state.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      expect(state.body).toMatchObject({
        mode: 'control_machine_status',
        read_only: true,
        counts: {
          running: 0,
          retrying: 0,
          issues: 0,
          max_allowed: null
        },
        polling: null,
        running: [],
        retrying: [],
        issues: [],
        machine_status_degraded: {
          reason: 'read_timeout',
          source: 'machine_status_controller',
          message: `control-host machine-status read timed out after ${machineStatusControllerTest.DEFAULT_MACHINE_STATUS_READ_TIMEOUT_MS}ms`,
          timeout_ms: machineStatusControllerTest.DEFAULT_MACHINE_STATUS_READ_TIMEOUT_MS
        }
      });
      expect(observedSignal?.aborted).toBe(true);
      expect(abortReason).toBeInstanceOf(Error);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns degraded fail-closed machine-status json for non-string read error messages', async () => {
    const { res, state } = createResponseRecorder();

    await expect(handleMachineStatusRequest({
      req: {
        method: 'GET',
        url: '/ui/machine-status.json'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        readMachineStatus: async () => {
          throw { message: 123 };
        }
      }
    })).resolves.toBe(true);

    expect(state.statusCode).toBe(200);
    expect(state.body).toMatchObject({
      mode: 'control_machine_status',
      read_only: true,
      machine_status_degraded: {
        reason: 'read_failed',
        source: 'machine_status_controller',
        message: '123',
        timeout_ms: null
      }
    });
  });
});

function buildProviderWorkflowPayload(): ControlProviderWorkflowPayload {
  return {
    status: 'ready',
    pipeline_id: 'provider-linear-worker',
    source_path: '/repo/.codex-orchestrator.json',
    snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
    last_reload_attempt_at: '2026-05-21T12:30:00.000Z',
    last_success_at: '2026-05-21T12:30:00.000Z',
    last_error_at: null,
    last_error: null,
    worker_hosts: []
  };
}
