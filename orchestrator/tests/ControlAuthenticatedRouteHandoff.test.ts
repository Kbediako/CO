import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlAuthenticatedRouteContext } from '../src/cli/control/controlAuthenticatedRouteHandoff.js';
import { createControlQuestionChildResolutionAdapter } from '../src/cli/control/controlQuestionChildResolution.js';
import {
  emitControlActionAuditEvent,
  emitDispatchPilotAuditEvents,
  writeControlError
} from '../src/cli/control/controlServerAuditAndErrorHelpers.js';

vi.mock('../src/cli/control/controlQuestionChildResolution.js', () => ({
  createControlQuestionChildResolutionAdapter: vi.fn()
}));

vi.mock('../src/cli/control/controlServerAuditAndErrorHelpers.js', () => ({
  emitControlActionAuditEvent: vi.fn(),
  emitDispatchPilotAuditEvents: vi.fn(),
  writeControlError: vi.fn()
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
    const { input, req, res, context, runtimeSnapshot, presenterContext, adapter, eventTransport } =
      createInput();
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
});
