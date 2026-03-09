import { afterEach, describe, expect, it } from 'vitest';
import http from 'node:http';

import type { ControlRequestSharedContext } from '../src/cli/control/controlRequestContext.js';
import type { ControlExpiryLifecycle } from '../src/cli/control/controlExpiryLifecycle.js';
import { createControlServerRequestShell } from '../src/cli/control/controlServerRequestShell.js';

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('expected TCP server address');
  }
  return `http://127.0.0.1:${address.port}`;
}

function createSharedContext(): ControlRequestSharedContext {
  return {
    token: 'control-token',
    controlStore: { kind: 'control-store' } as unknown as ControlRequestSharedContext['controlStore'],
    confirmationStore: { kind: 'confirmation-store' } as unknown as ControlRequestSharedContext['confirmationStore'],
    questionQueue: { kind: 'question-queue' } as unknown as ControlRequestSharedContext['questionQueue'],
    delegationTokens: { kind: 'delegation-tokens' } as unknown as ControlRequestSharedContext['delegationTokens'],
    sessionTokens: {
      issue: () => ({ token: 'session-token', expiresAt: '2026-03-09T11:00:00.000Z' }),
      validate: () => true
    },
    config: { kind: 'config' } as unknown as ControlRequestSharedContext['config'],
    persist: {
      control: async () => undefined,
      confirmations: async () => undefined,
      questions: async () => undefined,
      delegationTokens: async () => undefined,
      linearAdvisory: async () => undefined
    },
    clients: new Set<http.ServerResponse>(),
    eventTransport: { kind: 'event-transport' } as unknown as ControlRequestSharedContext['eventTransport'],
    paths: { kind: 'paths' } as unknown as ControlRequestSharedContext['paths'],
    linearAdvisoryState: { kind: 'linear-advisory' } as unknown as ControlRequestSharedContext['linearAdvisoryState'],
    runtime: { kind: 'runtime' } as unknown as ControlRequestSharedContext['runtime']
  };
}

function createExpiryLifecycle(): ControlExpiryLifecycle {
  return {
    start: () => undefined,
    close: () => undefined,
    expireConfirmations: async () => undefined,
    expireQuestions: async () => undefined
  };
}

describe('createControlServerRequestShell', () => {
  const servers = new Set<http.Server>();

  afterEach(async () => {
    await Promise.all(
      [...servers].map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
          })
      )
    );
    servers.clear();
  });

  it('returns a 503 JSON error before the control runtime is available', async () => {
    const server = createControlServerRequestShell({
      readRuntime: () => null,
      handleRequest: async () => {
        throw new Error('request should not reach handler');
      }
    });
    servers.add(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/health', baseUrl));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'control_server_unavailable' });
  });

  it('builds the live request context from the current shared runtime and expiry lifecycle', async () => {
    const shared = createSharedContext();
    const expiryLifecycle = createExpiryLifecycle();
    let seenContext: Parameters<
      Parameters<typeof createControlServerRequestShell>[0]['handleRequest']
    >[0] | null = null;

    const server = createControlServerRequestShell({
      readRuntime: () => ({
        requestContextShared: shared,
        expiryLifecycle
      }),
      handleRequest: async (context) => {
        seenContext = context;
        context.res?.writeHead(204);
        context.res?.end();
      }
    });
    servers.add(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/test?probe=1', baseUrl));

    expect(res.status).toBe(204);
    expect(seenContext?.token).toBe(shared.token);
    expect(seenContext?.controlStore).toBe(shared.controlStore);
    expect(seenContext?.confirmationStore).toBe(shared.confirmationStore);
    expect(seenContext?.questionQueue).toBe(shared.questionQueue);
    expect(seenContext?.delegationTokens).toBe(shared.delegationTokens);
    expect(seenContext?.sessionTokens).toBe(shared.sessionTokens);
    expect(seenContext?.config).toBe(shared.config);
    expect(seenContext?.persist).toBe(shared.persist);
    expect(seenContext?.clients).toBe(shared.clients);
    expect(seenContext?.eventTransport).toBe(shared.eventTransport);
    expect(seenContext?.paths).toBe(shared.paths);
    expect(seenContext?.linearAdvisoryState).toBe(shared.linearAdvisoryState);
    expect(seenContext?.runtime).toBe(shared.runtime);
    expect(seenContext?.expiryLifecycle).toBe(expiryLifecycle);
    expect(seenContext?.req?.url).toBe('/test?probe=1');
    expect(seenContext?.res).toBeInstanceOf(http.ServerResponse);
  });

  it('maps top-level request failures to JSON using error.status and a 500 fallback', async () => {
    const shared = createSharedContext();
    const server = createControlServerRequestShell({
      readRuntime: () => ({
        requestContextShared: shared,
        expiryLifecycle: null
      }),
      handleRequest: async (context) => {
        if (context.req?.url === '/teapot') {
          throw Object.assign(new Error('teapot'), { status: 418 });
        }
        throw new Error('boom');
      }
    });
    servers.add(server);
    const baseUrl = await listen(server);

    const teapotRes = await fetch(new URL('/teapot', baseUrl));
    expect(teapotRes.status).toBe(418);
    await expect(teapotRes.json()).resolves.toEqual({ error: 'teapot' });

    const boomRes = await fetch(new URL('/boom', baseUrl));
    expect(boomRes.status).toBe(500);
    await expect(boomRes.json()).resolves.toEqual({ error: 'boom' });
  });
});
