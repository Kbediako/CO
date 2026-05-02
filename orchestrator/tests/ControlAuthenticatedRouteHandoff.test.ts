import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlAuthenticatedRouteContext } from '../src/cli/control/controlAuthenticatedRouteHandoff.js';
import { createControlQuestionChildResolutionAdapter } from '../src/cli/control/controlQuestionChildResolution.js';
import {
  emitControlActionAuditEvent,
  emitDispatchPilotAuditEvents,
  writeControlError
} from '../src/cli/control/controlServerAuditAndErrorHelpers.js';
import {
  runProviderIssueHandoffRecover,
  runProviderIssueHandoffRefresh
} from '../src/cli/control/controlServerPublicLifecycle.js';

vi.mock('../src/cli/control/controlQuestionChildResolution.js', () => ({
  createControlQuestionChildResolutionAdapter: vi.fn()
}));

vi.mock('../src/cli/control/controlServerAuditAndErrorHelpers.js', () => ({
  emitControlActionAuditEvent: vi.fn(),
  emitDispatchPilotAuditEvents: vi.fn(),
  writeControlError: vi.fn()
}));

vi.mock('../src/cli/control/controlServerPublicLifecycle.js', () => ({
  runProviderIssueHandoffRecover: vi.fn((providerIssueHandoff, recoverInput) =>
    providerIssueHandoff.recoverIssue(recoverInput)
  ),
  runProviderIssueHandoffRefresh: vi.fn((providerIssueHandoff) => providerIssueHandoff.refresh())
}));

function createInput() {
  const req = {
    method: 'POST',
    url: '/control/action',
    headers: {}
  } as unknown as http.IncomingMessage;
  const res = {
    writeHead: vi.fn(),
    end: vi.fn()
  } as unknown as http.ServerResponse;
  const eventTransport = {
    emitControlEvent: vi.fn(async () => undefined)
  };
  const providerIntakeState = {
    schema_version: 1,
    updated_at: '2026-04-27T20:00:00.000Z',
    rehydrated_at: null,
    latest_provider_key: null,
    latest_reason: null,
    claims: [] as Array<Record<string, unknown>>
  };
  const persistedProviderIntakeState = {
    ...providerIntakeState,
    claims: [] as Array<Record<string, unknown>>
  };
  const context = {
    clients: new Set<http.ServerResponse>(),
    config: {
      confirm: { autoPause: true }
    },
    paths: {
      manifestPath: '/tmp/.runs/task-1092/cli/run-1/manifest.json'
    },
    controlStore: {},
    confirmationStore: {},
    questionQueue: {},
    delegationTokens: {},
    persist: {},
    runtime: {},
    eventTransport,
    providerIntakeState,
    readPersistedProviderIntakeState: vi.fn(() => persistedProviderIntakeState),
    providerIssueHandoff: {
      handleAcceptedTrackedIssue: vi.fn(),
      recoverIssue: vi.fn(async (recoverInput) => ({
        provider: recoverInput.provider,
        issue_id: recoverInput.issueId,
        action: recoverInput.action,
        kind: 'skipped',
        reason: 'provider_issue_recover_resolution_unavailable',
        claim: null
      })),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => ({
        queued: true,
        coalesced: false
      }))
    },
    expiryLifecycle: {
      expireConfirmations: vi.fn(async () => undefined),
      expireQuestions: vi.fn(async () => undefined)
    }
  };
  const runtimeSnapshot = {
    readDispatchEvaluation: vi.fn(async () => ({
      issueIdentifier: 'ISSUE-1',
      evaluation: { ready: true }
    }))
  };
  const presenterContext = { sentinel: 'presenter' };
  const adapter = {
    queueQuestionResolutions: vi.fn(),
    readDelegationHeaders: vi.fn(() => ({ token: 'tok', childRunId: 'child-1' })),
    validateDelegation: vi.fn(() => true),
    resolveManifestPath: vi.fn((rawPath: string) => `/resolved/${rawPath}`),
    readManifest: vi.fn(async () => ({ run_id: 'child-1' })),
    resolveChildQuestion: vi.fn(async () => undefined)
  };

  vi.mocked(createControlQuestionChildResolutionAdapter).mockReturnValue(adapter as never);

  return {
    input: {
      pathname: '/api/v1/state',
      authKind: 'control' as const,
      req,
      res,
      context: context as never,
      runtimeSnapshot: runtimeSnapshot as never,
      presenterContext: presenterContext as never
    },
    req,
    res,
    context,
    providerIntakeState,
    persistedProviderIntakeState,
    runtimeSnapshot,
    presenterContext,
    adapter,
    eventTransport
  };
}

describe('ControlAuthenticatedRouteHandoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assembles the authenticated route context from the control request state', async () => {
    const {
      input,
      req,
      res,
      context,
      persistedProviderIntakeState,
      runtimeSnapshot,
      presenterContext,
      adapter,
      eventTransport
    } = createInput();
    const auditRecord = {
      surface: 'api_v1_dispatch' as const,
      issueIdentifier: 'ISSUE-1',
      evaluation: { ready: true }
    };
    const controlAuditInput = {
      action: 'pause',
      requestedBy: 'runner' as const,
      transport: null,
      outcome: 'applied' as const
    };
    const emittedEvent = {
      event: 'question_queued',
      actor: 'delegate',
      payload: { question_id: 'q-1' }
    };

    const assembled = createControlAuthenticatedRouteContext(input);

    expect(createControlQuestionChildResolutionAdapter).toHaveBeenCalledWith(context);
    expect(assembled.pathname).toBe('/api/v1/state');
    expect(assembled.method).toBe(req.method);
    expect(assembled.authKind).toBe('control');
    expect(assembled.req).toBe(req);
    expect(assembled.res).toBe(res);
    expect(assembled.presenterContext).toBe(presenterContext);
    expect(assembled.confirmAutoPause).toBe(true);
    expect(assembled.taskId).toBe('task-1092');

    await expect(assembled.readDispatchEvaluation()).resolves.toEqual({
      issueIdentifier: 'ISSUE-1',
      evaluation: { ready: true }
    });
    expect(runtimeSnapshot.readDispatchEvaluation).toHaveBeenCalledTimes(1);

    await assembled.onDispatchEvaluated(auditRecord);
    expect(emitDispatchPilotAuditEvents).toHaveBeenCalledWith(context, auditRecord);

    await assembled.emitControlEvent(emittedEvent);
    expect(eventTransport.emitControlEvent).toHaveBeenCalledWith(emittedEvent);

    await assembled.emitControlActionAuditEvent(controlAuditInput as never);
    expect(emitControlActionAuditEvent).toHaveBeenCalledWith(context, controlAuditInput);

    assembled.writeControlError(403, 'forbidden', { requestId: 'req-1' });
    expect(writeControlError).toHaveBeenCalledWith(res, 403, 'forbidden', { requestId: 'req-1' });

    await assembled.expireConfirmations();
    expect(context.expiryLifecycle.expireConfirmations).toHaveBeenCalledTimes(1);

    await assembled.expireQuestions();
    expect(context.expiryLifecycle.expireQuestions).toHaveBeenCalledWith(adapter);

    const questionRecords = [{ question_id: 'q-1' }];
    assembled.queueQuestionResolutions(questionRecords as never);
    expect(adapter.queueQuestionResolutions).toHaveBeenCalledWith(questionRecords);

    expect(assembled.readDelegationHeaders()).toEqual({ token: 'tok', childRunId: 'child-1' });
    expect(adapter.readDelegationHeaders).toHaveBeenCalledWith(req);
    expect(assembled.validateDelegation({ token: 'tok', childRunId: 'child-1' })).toBe(true);
    expect(adapter.validateDelegation).toHaveBeenCalledWith({ token: 'tok', childRunId: 'child-1' });
    expect(assembled.resolveManifestPath('child/manifest.json')).toBe('/resolved/child/manifest.json');
    expect(adapter.resolveManifestPath).toHaveBeenCalledWith('child/manifest.json');
    await expect(assembled.readManifest('child')).resolves.toEqual({ run_id: 'child-1' });
    expect(adapter.readManifest).toHaveBeenCalledWith('child');
    await assembled.resolveChildQuestion({ question_id: 'q-1' } as never, 'answered');
    expect(adapter.resolveChildQuestion).toHaveBeenCalledWith({ question_id: 'q-1' }, 'answered');

    await expect(assembled.refreshProviderIssues?.()).resolves.toEqual({
      queued: true,
      coalesced: false
    });
    expect(runProviderIssueHandoffRefresh).toHaveBeenCalledWith(context.providerIssueHandoff, {
      queueIfBusy: true,
      acknowledgeAccepted: true,
      allowIdleRestartRequiredRetry: true
    });
    await expect(assembled.requestProviderWorkerRecover?.({
      provider: 'linear',
      issueId: 'CO-404',
      action: 'nudge'
    })).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'CO-404',
      action: 'nudge',
      kind: 'skipped',
      reason: 'provider_issue_recover_resolution_unavailable'
    });
    expect(context.providerIssueHandoff.recoverIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'CO-404',
      action: 'nudge'
    });
    expect(runProviderIssueHandoffRecover).toHaveBeenCalledWith(context.providerIssueHandoff, {
      provider: 'linear',
      issueId: 'CO-404',
      action: 'nudge'
    });
    expect(assembled.readProviderWorkerRecoverAccepted?.({
      provider: 'linear',
      issueId: 'CO-404',
      action: 'nudge',
      requestedAt: '2026-04-27T20:00:00.000Z'
    })).toBeNull();
    const acceptedClaim = {
      provider: 'linear',
      provider_key: 'linear:co-404-id',
      issue_id: 'co-404-id',
      issue_identifier: 'CO-404',
      issue_title: 'Recover issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-27T20:00:00.000Z',
      issue_archived_at: null,
      issue_trashed: false,
      task_id: 'linear-co-404-id',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-04-27T20:00:00.000Z',
      updated_at: '2026-04-27T20:00:01.000Z',
      last_delivery_id: null,
      last_event: 'control_host_provider_worker_recover',
      last_action: 'nudge',
      last_webhook_timestamp: null,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token',
      launch_started_at: null
    };
    context.providerIntakeState.claims.push(acceptedClaim);
    expect(assembled.readProviderWorkerRecoverAccepted?.({
      provider: 'linear',
      issueId: 'CO-404',
      action: 'nudge',
      requestedAt: '2026-04-27T20:00:00.000Z'
    })).toBeNull();
    persistedProviderIntakeState.claims.push(acceptedClaim);
    expect(assembled.readProviderWorkerRecoverAccepted?.({
      provider: 'linear',
      issueId: 'co-404',
      action: 'nudge',
      requestedAt: '2026-04-27T20:00:00.000Z'
    })).toMatchObject({
      issue_id: 'co-404-id',
      issue_identifier: 'CO-404',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      state: 'starting',
      task_id: 'linear-co-404-id',
      run_id: null,
      run_manifest_path: null,
      worker_host: null,
      launch_source: 'control-host',
      launch_token_present: true
    });
    const noLaunchAcceptedClaim = {
      ...acceptedClaim,
      provider_key: 'linear:co-468-id',
      issue_id: 'co-468-id',
      issue_identifier: 'CO-468',
      issue_title: 'Reject no-run recover acknowledgement',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      task_id: 'linear-co-468-id',
      state: 'accepted',
      reason: 'provider_issue_rehydration_pending_revalidation',
      updated_at: '2026-05-01T13:00:01.000Z',
      last_action: 'recover',
      run_id: null,
      run_manifest_path: null,
      worker_host: null,
      launch_source: null,
      launch_token: null,
      launch_started_at: null
    };
    persistedProviderIntakeState.claims.push(noLaunchAcceptedClaim);
    expect(assembled.readProviderWorkerRecoverAccepted?.({
      provider: 'linear',
      issueId: 'CO-468',
      action: 'recover',
      requestedAt: '2026-05-01T13:00:00.000Z'
    })).toMatchObject({
      issue_id: 'co-468-id',
      issue_identifier: 'CO-468',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      state: 'accepted',
      reason: 'provider_issue_rehydration_pending_revalidation',
      task_id: 'linear-co-468-id',
      run_id: null,
      run_manifest_path: null,
      worker_host: null,
      launch_source: null,
      launch_token_present: false,
      updated_at: '2026-05-01T13:00:01.000Z'
    });
    expect(assembled.readProviderWorkerRecoverAccepted?.({
      provider: 'linear',
      issueId: 'CO-468',
      action: 'recover',
      requestedAt: '2026-05-01T13:00:02.000Z'
    })).toBeNull();
  });

  it('returns a null task id when the manifest path does not live under a cli task root', () => {
    const { input } = createInput();
    input.context = {
      ...input.context,
      paths: { manifestPath: '/tmp/not-a-cli-root/manifest.json' }
    } as never;

    const assembled = createControlAuthenticatedRouteContext(input);

    expect(assembled.taskId).toBeNull();
  });

  it('preserves session auth and falls back when no expiry lifecycle is present', async () => {
    const { input } = createInput();
    input.authKind = 'session';
    input.context = {
      ...input.context,
      expiryLifecycle: null
    } as never;

    const assembled = createControlAuthenticatedRouteContext(input);

    expect(assembled.authKind).toBe('session');
    await expect(assembled.expireConfirmations()).resolves.toBeUndefined();
    await expect(assembled.expireQuestions()).resolves.toBeUndefined();
  });

  it('returns a null provider refresh outcome when no provider handoff is present', async () => {
    const { input } = createInput();
    input.context = {
      ...input.context,
      providerIssueHandoff: null
    } as never;

    const assembled = createControlAuthenticatedRouteContext(input);

    await expect(assembled.refreshProviderIssues?.()).resolves.toBeNull();
    expect(assembled.requestProviderWorkerRecover).toBeUndefined();
    expect(assembled.readProviderWorkerRecoverAccepted).toBeUndefined();
    expect(runProviderIssueHandoffRecover).not.toHaveBeenCalled();
    expect(runProviderIssueHandoffRefresh).not.toHaveBeenCalled();
  });
});
