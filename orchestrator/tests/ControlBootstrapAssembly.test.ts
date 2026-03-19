import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlBootstrapAssembly } from '../src/cli/control/controlBootstrapAssembly.js';
import { createControlExpiryLifecycle } from '../src/cli/control/controlExpiryLifecycle.js';
import { buildControlInternalContext } from '../src/cli/control/controlRequestContext.js';
import { createControlQuestionChildResolutionAdapter } from '../src/cli/control/controlQuestionChildResolution.js';
import { createControlTelegramBridgeBootstrapLifecycle } from '../src/cli/control/controlTelegramBridgeBootstrapLifecycle.js';

vi.mock('../src/cli/control/controlExpiryLifecycle.js', () => ({
  createControlExpiryLifecycle: vi.fn()
}));

vi.mock('../src/cli/control/controlRequestContext.js', () => ({
  buildControlInternalContext: vi.fn()
}));

vi.mock('../src/cli/control/controlQuestionChildResolution.js', () => ({
  createControlQuestionChildResolutionAdapter: vi.fn()
}));

vi.mock('../src/cli/control/controlTelegramBridgeBootstrapLifecycle.js', () => ({
  createControlTelegramBridgeBootstrapLifecycle: vi.fn()
}));

describe('createControlBootstrapAssembly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assembles expiry and bootstrap lifecycles with the existing lazy wiring intact', () => {
    const expiryLifecycle = {
      start: vi.fn(),
      close: vi.fn(),
      expireConfirmations: vi.fn(),
      expireQuestions: vi.fn()
    };
    const bootstrapLifecycle = {
      start: vi.fn(),
      close: vi.fn()
    };
    const internalContext = { token: 'internal' };
    const childResolutionAdapter = { resolveChildQuestion: vi.fn() };

    vi.mocked(createControlExpiryLifecycle).mockReturnValue(expiryLifecycle as never);
    vi.mocked(createControlTelegramBridgeBootstrapLifecycle).mockReturnValue(bootstrapLifecycle as never);
    vi.mocked(buildControlInternalContext).mockReturnValue(internalContext as never);
    vi.mocked(createControlQuestionChildResolutionAdapter).mockReturnValue(childResolutionAdapter as never);

    const emitControlEvent = vi.fn(async () => undefined);
    const emitDispatchPilotAuditEvents = vi.fn(async () => undefined);
    const eventTransport = {
      emitControlEvent
    };
    const persist = {
      control: vi.fn(async () => undefined),
      confirmations: vi.fn(async () => undefined),
      questions: vi.fn(async () => undefined)
    };
    const requestContextShared = {
      token: 'token',
      controlStore: {} as never,
      confirmationStore: { label: 'confirmations' } as never,
      questionQueue: { label: 'questions' } as never,
      delegationTokens: {} as never,
      sessionTokens: {} as never,
      config: {} as never,
      persist: persist as never,
      clients: new Set(),
      eventTransport: eventTransport as never,
      paths: {
        runDir: '/tmp/run',
        controlAuthPath: '/tmp/run/control-auth.json',
        controlEndpointPath: '/tmp/run/control-endpoint.json'
      } as never,
      linearAdvisoryState: {} as never,
      runtime: { publish: vi.fn() } as never
    };

    const result = createControlBootstrapAssembly({
      intervalMs: 15_000,
      requestContextShared: requestContextShared as never,
      emitDispatchPilotAuditEvents
    });

    expect(result).toEqual({
      expiryLifecycle,
      bootstrapLifecycle
    });

    const expiryInput = vi.mocked(createControlExpiryLifecycle).mock.calls[0]?.[0];
    expect(expiryInput?.intervalMs).toBe(15_000);
    expect(expiryInput?.confirmationStore).toBe(requestContextShared.confirmationStore);
    expect(expiryInput?.questionQueue).toBe(requestContextShared.questionQueue);
    expect(expiryInput?.runtime).toBe(requestContextShared.runtime);
    expect(expiryInput?.persist).toEqual({
      confirmations: persist.confirmations,
      questions: persist.questions
    });
    expect(expiryInput?.emitControlEvent).not.toBe(emitControlEvent);
    void expiryInput?.emitControlEvent({
      event: 'question_closed',
      actor: 'runner',
      payload: { question_id: 'q-1' }
    });
    expect(emitControlEvent).toHaveBeenCalledWith({
      event: 'question_closed',
      actor: 'runner',
      payload: { question_id: 'q-1' }
    });

    expiryInput?.createQuestionChildResolutionAdapter();
    expect(buildControlInternalContext).toHaveBeenCalledWith({
      ...requestContextShared,
      expiryLifecycle
    });
    expect(createControlQuestionChildResolutionAdapter).toHaveBeenCalledWith(internalContext);

    const bootstrapInput = vi.mocked(createControlTelegramBridgeBootstrapLifecycle).mock.calls[0]?.[0];
    expect(bootstrapInput?.paths).toEqual({
      runDir: '/tmp/run',
      controlAuthPath: '/tmp/run/control-auth.json',
      controlEndpointPath: '/tmp/run/control-endpoint.json'
    });
    expect(bootstrapInput?.persistControl).toBe(persist.control);
    expect(bootstrapInput?.requestContextShared).toBe(requestContextShared);
    expect(bootstrapInput?.emitDispatchPilotAuditEvents).toBe(emitDispatchPilotAuditEvents);
    expect(bootstrapInput?.getExpiryLifecycle()).toBe(expiryLifecycle);

    bootstrapInput?.startExpiryLifecycle();
    expect(expiryLifecycle.start).toHaveBeenCalledOnce();
  });
});
