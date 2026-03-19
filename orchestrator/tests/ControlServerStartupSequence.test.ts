import { describe, expect, it, vi } from 'vitest';
import type http from 'node:http';

import {
  formatHostForUrl,
  startControlServerStartupSequence
} from '../src/cli/control/controlServerStartupSequence.js';

function createServerDouble(options?: {
  port?: number;
  listenError?: Error;
}) {
  let onceErrorHandler: ((error: Error) => void) | null = null;
  let onErrorHandler: ((error: Error) => void) | null = null;
  const server = {
    listening: false,
    once: vi.fn((event: string, handler: (error: Error) => void) => {
      if (event === 'error') {
        onceErrorHandler = handler;
      }
      return server;
    }),
    off: vi.fn((event: string, handler: (error: Error) => void) => {
      if (event === 'error' && onceErrorHandler === handler) {
        onceErrorHandler = null;
      }
      return server;
    }),
    on: vi.fn((event: string, handler: (error: Error) => void) => {
      if (event === 'error') {
        onErrorHandler = handler;
      }
      return server;
    }),
    listen: vi.fn((_: number, __: string, callback?: () => void) => {
      if (options?.listenError) {
        onceErrorHandler?.(options.listenError);
        return server;
      }
      server.listening = true;
      callback?.();
      return server;
    }),
    close: vi.fn((callback?: () => void) => {
      server.listening = false;
      callback?.();
      return server;
    }),
    address: vi.fn(() => ({ port: options?.port ?? 4321 })),
    emitSteadyError(error: Error) {
      onErrorHandler?.(error);
    }
  };

  return server as unknown as http.Server & {
    emitSteadyError(error: Error): void;
  };
}

describe('startControlServerStartupSequence', () => {
  it('binds the server, derives the base url, and starts bootstrap lifecycle', async () => {
    const order: string[] = [];
    const server = createServerDouble({ port: 4321 });
    const bootstrapLifecycle = {
      start: vi.fn(async ({ baseUrl, controlToken }: { baseUrl: string; controlToken: string }) => {
        order.push(`start:${baseUrl}:${controlToken}`);
      }),
      close: vi.fn(async () => undefined)
    };

    const baseUrl = await startControlServerStartupSequence({
      server,
      host: '127.0.0.1',
      bootstrapLifecycle,
      controlToken: 'token-1',
      closeOnFailure: async () => {
        order.push('closeOnFailure');
      }
    });

    expect(baseUrl).toBe('http://127.0.0.1:4321');
    expect(server.listen).toHaveBeenCalledOnce();
    expect(server.on).toHaveBeenCalledTimes(1);
    expect(bootstrapLifecycle.start).toHaveBeenCalledWith({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });
    expect(order).toEqual(['start:http://127.0.0.1:4321:token-1']);
  });

  it('closes the server and rejects when listen fails', async () => {
    const server = createServerDouble({ listenError: new Error('listen-failed') });
    const bootstrapLifecycle = {
      start: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    };

    await expect(
      startControlServerStartupSequence({
        server,
        host: '127.0.0.1',
        bootstrapLifecycle,
        controlToken: 'token-1',
        closeOnFailure: async () => undefined
      })
    ).rejects.toThrow('listen-failed');

    expect(server.close).toHaveBeenCalledOnce();
    expect(bootstrapLifecycle.start).not.toHaveBeenCalled();
  });

  it('closes on bootstrap failure after deriving the base url', async () => {
    const server = createServerDouble({ port: 9876 });
    const order: string[] = [];
    const bootstrapLifecycle = {
      start: vi.fn(async ({ baseUrl }: { baseUrl: string }) => {
        order.push(`start:${baseUrl}`);
        throw new Error('bootstrap-failed');
      }),
      close: vi.fn(async () => undefined)
    };

    await expect(
      startControlServerStartupSequence({
        server,
        host: '::1',
        bootstrapLifecycle,
        controlToken: 'token-1',
        closeOnFailure: async () => {
          order.push('closeOnFailure');
        }
      })
    ).rejects.toThrow('bootstrap-failed');

    expect(order).toEqual(['start:http://[::1]:9876', 'closeOnFailure']);
  });
});

describe('formatHostForUrl', () => {
  it('keeps IPv4 hosts unchanged and wraps raw IPv6 hosts', () => {
    expect(formatHostForUrl('127.0.0.1')).toBe('127.0.0.1');
    expect(formatHostForUrl('::1')).toBe('[::1]');
    expect(formatHostForUrl('[::1]')).toBe('[::1]');
  });
});
