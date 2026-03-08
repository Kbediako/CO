import { describe, expect, it, vi } from 'vitest';
import http from 'node:http';

import {
  buildControlInternalContext,
  buildControlPresenterRuntimeContext,
  buildControlRequestContext,
  type ControlRequestPersist,
  type ControlRequestSharedContext
} from '../src/cli/control/controlRequestContext.js';
import type { ConfirmationStore } from '../src/cli/control/confirmations.js';
import type { ControlEventTransport } from '../src/cli/control/controlEventTransport.js';
import type { ControlRuntime } from '../src/cli/control/controlRuntime.js';
import type { ControlStateStore } from '../src/cli/control/controlState.js';
import type { DelegationTokenStore } from '../src/cli/control/delegationTokens.js';
import type { LinearAdvisoryState } from '../src/cli/control/linearWebhookController.js';
import type { QuestionQueue } from '../src/cli/control/questions.js';
import type { RunPaths } from '../src/cli/run/runPaths.js';

function createPersist(): ControlRequestPersist {
  return {
    control: vi.fn(async () => undefined),
    confirmations: vi.fn(async () => undefined),
    questions: vi.fn(async () => undefined),
    delegationTokens: vi.fn(async () => undefined),
    linearAdvisory: vi.fn(async () => undefined)
  };
}

function createSharedContext(
  overrides: Partial<ControlRequestSharedContext> = {}
): ControlRequestSharedContext {
  const runtimeSnapshot = {
    readSelectedRunSnapshot: vi.fn(async () => ({ selected: null, dispatchPilot: null, tracked: null })),
    readCompatibilityProjection: vi.fn(async () => ({ selected: null, running: [], retrying: [], tracked: null })),
    readDispatchEvaluation: vi.fn(async () => ({
      issueIdentifier: null,
      evaluation: {
        summary: {
          status: 'ready',
          source_status: 'disabled',
          reason: 'ok'
        }
      }
    }))
  };
  const runtime = {
    snapshot: vi.fn(() => runtimeSnapshot),
    requestRefresh: vi.fn(async () => undefined),
    publish: vi.fn(),
    subscribe: vi.fn(() => () => undefined)
  } as unknown as ControlRuntime;

  return {
    token: 'token-123',
    controlStore: {
      snapshot: vi.fn(() => ({
        run_id: 'run-1',
        control_seq: 0,
        latest_action: null,
        feature_toggles: null,
        transport_mutation: null
      }))
    } as unknown as ControlStateStore,
    confirmationStore: {} as ConfirmationStore,
    questionQueue: {
      list: vi.fn(() => [])
    } as unknown as QuestionQueue,
    delegationTokens: {} as DelegationTokenStore,
    sessionTokens: {
      issue: vi.fn(() => ({ token: 'issued-token', expiresAt: '2026-03-08T00:00:00.000Z' })),
      validate: vi.fn(() => true)
    },
    config: {
      ui: {
        allowedRunRoots: [],
        allowedBindHosts: [],
        bindHost: '127.0.0.1'
      }
    } as unknown as ControlRequestSharedContext['config'],
    persist: createPersist(),
    clients: new Set<http.ServerResponse>(),
    eventTransport: {} as ControlEventTransport,
    paths: {
      manifestPath: '/tmp/.runs/task/cli/run/manifest.json',
      runDir: '/tmp/.runs/task/cli/run',
      logPath: '/tmp/.runs/task/cli/run/log.jsonl'
    } as unknown as RunPaths,
    linearAdvisoryState: {
      tracked_issue: null
    } as LinearAdvisoryState,
    runtime,
    ...overrides
  };
}

describe('controlRequestContext', () => {
  it('builds http request contexts without mutating the shared fields', () => {
    const shared = createSharedContext();
    const req = { method: 'GET', url: '/api/v1/state' } as http.IncomingMessage;
    const res = { writeHead: vi.fn(), end: vi.fn() } as unknown as http.ServerResponse;

    const context = buildControlRequestContext({
      ...shared,
      req,
      res,
      expiryLifecycle: null
    });

    expect(context.req).toBe(req);
    expect(context.res).toBe(res);
    expect(context.token).toBe(shared.token);
    expect(context.persist).toBe(shared.persist);
    expect(context.runtime).toBe(shared.runtime);
    expect(context.expiryLifecycle).toBeNull();
  });

  it('builds internal contexts with null request and response handles', () => {
    const shared = createSharedContext();
    const expiryLifecycle = {
      expireConfirmations: vi.fn(async () => undefined),
      expireQuestions: vi.fn(async () => undefined),
      start: vi.fn(),
      close: vi.fn()
    };

    const context = buildControlInternalContext({
      ...shared,
      expiryLifecycle: expiryLifecycle as never
    });

    expect(context.req).toBeNull();
    expect(context.res).toBeNull();
    expect(context.expiryLifecycle).toBe(expiryLifecycle);
    expect(context.controlStore).toBe(shared.controlStore);
    expect(context.sessionTokens).toBe(shared.sessionTokens);
  });

  it('builds a presenter context from a single runtime snapshot', async () => {
    const shared = createSharedContext();

    const { runtimeSnapshot, presenterContext } = buildControlPresenterRuntimeContext({
      controlStore: shared.controlStore,
      paths: shared.paths,
      runtime: shared.runtime
    });

    expect(shared.runtime.snapshot).toHaveBeenCalledTimes(1);
    expect(runtimeSnapshot.readSelectedRunSnapshot).toBeTypeOf('function');
    expect(runtimeSnapshot.readCompatibilityProjection).toBeTypeOf('function');

    await presenterContext.readSelectedRunSnapshot();
    await presenterContext.readCompatibilityProjection();

    expect(runtimeSnapshot.readSelectedRunSnapshot).toHaveBeenCalledTimes(1);
    expect(runtimeSnapshot.readCompatibilityProjection).toHaveBeenCalledTimes(1);
    expect(presenterContext.controlStore).toBe(shared.controlStore);
    expect(presenterContext.paths).toBe(shared.paths);
  });
});
