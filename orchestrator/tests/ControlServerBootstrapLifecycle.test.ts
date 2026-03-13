import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlServerBootstrapLifecycle } from '../src/cli/control/controlServerBootstrapLifecycle.js';
import { runControlServerBootstrapStartSequence } from '../src/cli/control/controlServerBootstrapStartSequence.js';

vi.mock('../src/cli/control/controlServerBootstrapStartSequence.js', () => ({
  runControlServerBootstrapStartSequence: vi.fn()
}));

describe('createControlServerBootstrapLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates start sequencing to the extracted helper', async () => {
    const persistControl = vi.fn(async () => undefined);
    const startExpiryLifecycle = vi.fn(async () => undefined);
    const telegramBridgeLifecycle = {
      start: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    };
    const lifecycle = createControlServerBootstrapLifecycle({
      paths: {
        controlAuthPath: '/tmp/run/control-auth.json',
        controlEndpointPath: '/tmp/run/control-endpoint.json'
      },
      persistControl,
      startExpiryLifecycle,
      telegramBridgeLifecycle
    });

    await lifecycle.start({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });

    expect(runControlServerBootstrapStartSequence).toHaveBeenCalledOnce();
    expect(vi.mocked(runControlServerBootstrapStartSequence).mock.calls[0]?.[0]).toEqual({
      paths: {
        controlAuthPath: '/tmp/run/control-auth.json',
        controlEndpointPath: '/tmp/run/control-endpoint.json'
      },
      persistControl,
      startExpiryLifecycle,
      telegramBridgeLifecycle
    });
    expect(vi.mocked(runControlServerBootstrapStartSequence).mock.calls[0]?.[1]).toEqual({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });
  });

  it('normalizes optional expiry and telegram bridge inputs before delegating', async () => {
    const persistControl = vi.fn(async () => undefined);
    const lifecycle = createControlServerBootstrapLifecycle({
      paths: {
        controlAuthPath: '/tmp/run/control-auth.json',
        controlEndpointPath: '/tmp/run/control-endpoint.json'
      },
      persistControl
    });

    await lifecycle.start({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });

    const context = vi.mocked(runControlServerBootstrapStartSequence).mock.calls[0]?.[0];
    expect(context?.persistControl).toBe(persistControl);
    expect(context?.telegramBridgeLifecycle).toBeNull();
    expect(context?.startExpiryLifecycle()).toBeUndefined();
  });

  it('delegates lifecycle close to the telegram bridge lifecycle', async () => {
    const telegramBridgeLifecycle = {
      start: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    };
    const lifecycle = createControlServerBootstrapLifecycle({
      paths: {
        controlAuthPath: '/tmp/run/control-auth.json',
        controlEndpointPath: '/tmp/run/control-endpoint.json'
      },
      persistControl: async () => undefined,
      telegramBridgeLifecycle
    });

    await lifecycle.close();

    expect(telegramBridgeLifecycle.close).toHaveBeenCalledOnce();
  });
});
