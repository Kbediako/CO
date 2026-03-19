import http from 'node:http';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createAuthenticatedRouteDispatcherContext } from '../src/cli/control/authenticatedRouteComposition.js';
import { handleUiDataRequest } from '../src/cli/control/uiDataController.js';
import { handleControlActionRequest } from '../src/cli/control/controlActionController.js';
import { handleQuestionQueueRequest } from '../src/cli/control/questionQueueController.js';
import { handleConfirmationCreateRequest } from '../src/cli/control/confirmationCreateController.js';
import type { DispatchPilotEvaluation } from '../src/cli/control/trackerDispatchPilot.js';

vi.mock('../src/cli/control/uiDataController.js', () => ({
  handleUiDataRequest: vi.fn(async () => false)
}));

vi.mock('../src/cli/control/controlActionController.js', () => ({
  handleControlActionRequest: vi.fn(async () => undefined)
}));

vi.mock('../src/cli/control/questionQueueController.js', () => ({
  handleQuestionQueueRequest: vi.fn(async () => false)
}));

vi.mock('../src/cli/control/confirmationCreateController.js', () => ({
  handleConfirmationCreateRequest: vi.fn(async () => false)
}));

function createDispatchEvaluation(): DispatchPilotEvaluation {
  return {
    summary: {
      advisory_only: true,
      configured: false,
      enabled: false,
      kill_switch: false,
      status: 'disabled',
      source_status: 'disabled',
      reason: 'disabled',
      source_setup: null
    },
    recommendation: null,
    failure: null
  };
}

function createBaseContext(
  overrides: Partial<Parameters<typeof createAuthenticatedRouteDispatcherContext>[0]> = {}
): Parameters<typeof createAuthenticatedRouteDispatcherContext>[0] {
  const req = {
    method: 'GET',
    url: '/api/v1/state',
    headers: {}
  } as unknown as http.IncomingMessage;
  const res = {
    writeHead: vi.fn(),
    end: vi.fn()
  } as unknown as http.ServerResponse;
  return {
    pathname: overrides.pathname ?? '/api/v1/state',
    method: overrides.method ?? 'GET',
    authKind: overrides.authKind ?? 'control',
    req,
    res,
    clients: overrides.clients ?? new Set<http.ServerResponse>(),
    confirmAutoPause: overrides.confirmAutoPause ?? true,
    presenterContext:
      overrides.presenterContext ??
      ({
        controlStore: {},
        paths: {},
        readSelectedRunSnapshot: () => null,
        readCompatibilityProjection: () => null
      } as never),
    taskId: overrides.taskId ?? 'task-1064',
    manifestPath: overrides.manifestPath ?? '/tmp/run/manifest.json',
    controlStore:
      overrides.controlStore ??
      ({
        snapshot: () => ({
          run_id: 'run-1',
          latest_action: null
        }),
        updateAction: vi.fn(() => ({
          snapshot: {
            run_id: 'run-1',
            control_seq: 1,
            latest_action: null
          },
          idempotentReplay: false,
          replayEntry: null
        })),
        isTransportNonceConsumed: vi.fn(() => false),
        consumeTransportNonce: vi.fn(),
        rollbackTransportNonce: vi.fn()
      } as never),
    confirmationStore:
      overrides.confirmationStore ??
      ({
        validateNonce: vi.fn(() => ({ ok: true })),
        create: vi.fn(),
        listPending: vi.fn(() => []),
        approve: vi.fn(),
        get: vi.fn(),
        issue: vi.fn()
      } as never),
    questionQueue:
      overrides.questionQueue ??
      ({
        list: vi.fn(() => []),
        enqueue: vi.fn(),
        answer: vi.fn(),
        dismiss: vi.fn(),
        get: vi.fn()
      } as never),
    delegationTokens:
      overrides.delegationTokens ??
      ({
        register: vi.fn()
      } as never),
    persist:
      overrides.persist ??
      {
        control: vi.fn(async () => undefined),
        confirmations: vi.fn(async () => undefined),
        questions: vi.fn(async () => undefined),
        delegationTokens: vi.fn(async () => undefined)
      },
    runtime:
      overrides.runtime ??
      {
        publish: vi.fn(),
        requestRefresh: vi.fn()
      },
    readRequestBody: overrides.readRequestBody ?? vi.fn(async () => ({})),
    readDispatchEvaluation:
      overrides.readDispatchEvaluation ??
      vi.fn(async () => ({
        issueIdentifier: null,
        evaluation: createDispatchEvaluation()
      })),
    onDispatchEvaluated: overrides.onDispatchEvaluated ?? vi.fn(async () => undefined),
    emitControlEvent: overrides.emitControlEvent ?? vi.fn(async () => undefined),
    emitControlActionAuditEvent: overrides.emitControlActionAuditEvent ?? vi.fn(async () => undefined),
    writeControlError: overrides.writeControlError ?? vi.fn(),
    expireConfirmations: overrides.expireConfirmations ?? vi.fn(async () => undefined),
    expireQuestions: overrides.expireQuestions ?? vi.fn(async () => undefined),
    queueQuestionResolutions: overrides.queueQuestionResolutions ?? vi.fn(),
    readDelegationHeaders: overrides.readDelegationHeaders ?? vi.fn(() => null),
    validateDelegation: overrides.validateDelegation ?? vi.fn(() => false),
    resolveManifestPath: overrides.resolveManifestPath ?? vi.fn((rawPath: string) => rawPath),
    readManifest: overrides.readManifest ?? vi.fn(async () => null),
    resolveChildQuestion: overrides.resolveChildQuestion ?? vi.fn(async () => undefined)
  };
}

describe('AuthenticatedRouteComposition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves dispatcher routing metadata on the composed context', () => {
    const context = createBaseContext({
      pathname: '/questions/enqueue',
      method: 'POST',
      authKind: 'session'
    });

    const composed = createAuthenticatedRouteDispatcherContext(context);

    expect(composed.pathname).toBe('/questions/enqueue');
    expect(composed.method).toBe('POST');
    expect(composed.authKind).toBe('session');
  });

  it('wires UI data handling through the shared presenter context', async () => {
    const context = createBaseContext();
    const composed = createAuthenticatedRouteDispatcherContext(context);

    await composed.handleUiData();

    expect(handleUiDataRequest).toHaveBeenCalledWith({
      req: context.req,
      res: context.res,
      presenterContext: context.presenterContext
    });
  });

  it('forwards auth/task metadata to the control action controller', async () => {
    const context = createBaseContext({
      pathname: '/control/action',
      method: 'POST',
      authKind: 'session',
      taskId: 'task-xyz',
      manifestPath: '/tmp/task-xyz/manifest.json'
    });
    const composed = createAuthenticatedRouteDispatcherContext(context);

    await composed.handleControlAction('session');

    expect(handleControlActionRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        authKind: 'session',
        taskId: 'task-xyz',
        manifestPath: '/tmp/task-xyz/manifest.json',
        readRequestBody: context.readRequestBody,
        writeControlError: context.writeControlError
      })
    );
  });

  it('preserves confirmation auto-pause side effects behind the composed create handler', async () => {
    const persistControl = vi.fn(async () => undefined);
    const publish = vi.fn();
    const updateAction = vi.fn(() => ({
      snapshot: {
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          action: 'pause',
          requested_by: 'runner',
          requested_at: '2026-03-08T00:00:00.000Z',
          reason: 'confirmation_required'
        }
      },
      idempotentReplay: false,
      replayEntry: null
    }));
    const context = createBaseContext({
      pathname: '/confirmations/create',
      method: 'POST',
      confirmAutoPause: true,
      controlStore: {
        snapshot: () => ({
          run_id: 'run-1',
          latest_action: null
        }),
        updateAction,
        isTransportNonceConsumed: vi.fn(() => false),
        consumeTransportNonce: vi.fn(),
        rollbackTransportNonce: vi.fn()
      } as never,
      persist: {
        control: persistControl,
        confirmations: vi.fn(async () => undefined),
        questions: vi.fn(async () => undefined),
        delegationTokens: vi.fn(async () => undefined)
      },
      runtime: {
        publish,
        requestRefresh: vi.fn()
      }
    });
    const composed = createAuthenticatedRouteDispatcherContext(context);

    await composed.handleConfirmationCreate();

    const createContext = vi.mocked(handleConfirmationCreateRequest).mock.calls.at(-1)?.[0];
    expect(createContext).toBeDefined();
    if (!createContext) {
      throw new Error('expected confirmation create context');
    }

    await createContext.maybeAutoPause('confirm-req-1');

    expect(updateAction).toHaveBeenCalledWith({
      action: 'pause',
      requestedBy: 'runner',
      requestId: 'confirm-req-1',
      reason: 'confirmation_required'
    });
    expect(persistControl).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith({ source: 'control.action' });
  });

  it('rolls back consumed transport nonces when control persistence fails', async () => {
    const consumeTransportNonce = vi.fn();
    const rollbackTransportNonce = vi.fn();
    const persistControl = vi.fn(async () => {
      throw new Error('persist failed');
    });
    const context = createBaseContext({
      pathname: '/control/action',
      method: 'POST',
      controlStore: {
        snapshot: () => ({
          run_id: 'run-1',
          latest_action: null
        }),
        updateAction: vi.fn(() => ({
          snapshot: {
            run_id: 'run-1',
            control_seq: 1,
            latest_action: null
          },
          idempotentReplay: false,
          replayEntry: null
        })),
        isTransportNonceConsumed: vi.fn(() => false),
        consumeTransportNonce,
        rollbackTransportNonce
      } as never,
      persist: {
        control: persistControl,
        confirmations: vi.fn(async () => undefined),
        questions: vi.fn(async () => undefined),
        delegationTokens: vi.fn(async () => undefined)
      }
    });
    const composed = createAuthenticatedRouteDispatcherContext(context);

    await composed.handleControlAction('control');

    const controlContext = vi.mocked(handleControlActionRequest).mock.calls.at(-1)?.[0];
    expect(controlContext).toBeDefined();
    if (!controlContext) {
      throw new Error('expected control action context');
    }

    await expect(
      controlContext.persistControlAction({
        action: 'pause',
        requestId: 'request-1',
        intentId: 'intent-1',
        transportMutation: {
          transport: 'telegram',
          actorId: 'actor-1',
          actorSource: 'telegram',
          principal: 'chat/1',
          nonce: 'nonce-12345678',
          nonceExpiresAt: '2026-03-08T00:15:00.000Z',
          nonceExpiresAtMs: Date.parse('2026-03-08T00:15:00.000Z')
        }
      })
    ).rejects.toThrow('persist failed');

    expect(consumeTransportNonce).toHaveBeenCalledWith({
      nonce: 'nonce-12345678',
      action: 'pause',
      transport: 'telegram',
      requestId: 'request-1',
      intentId: 'intent-1',
      expiresAt: '2026-03-08T00:15:00.000Z'
    });
    expect(consumeTransportNonce.mock.invocationCallOrder[0]).toBeLessThan(
      persistControl.mock.invocationCallOrder[0]
    );
    expect(rollbackTransportNonce).toHaveBeenCalledWith('nonce-12345678');
  });

  it('wires question routes through the delegated resolution helpers', async () => {
    const context = createBaseContext({
      pathname: '/questions/enqueue',
      method: 'POST'
    });
    const composed = createAuthenticatedRouteDispatcherContext(context);

    await composed.handleQuestionQueue();

    expect(handleQuestionQueueRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        req: context.req,
        res: context.res,
        questionQueue: context.questionQueue,
        expireQuestions: context.expireQuestions,
        queueQuestionResolutions: context.queueQuestionResolutions,
        readDelegationHeaders: context.readDelegationHeaders,
        validateDelegation: context.validateDelegation,
        resolveManifestPath: context.resolveManifestPath,
        readManifest: context.readManifest,
        resolveChildQuestion: context.resolveChildQuestion
      })
    );
  });
});
