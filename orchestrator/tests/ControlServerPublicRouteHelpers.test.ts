import type http from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import { logger } from '../src/logger.js';
import { handlePublicControlRoute } from '../src/cli/control/controlServerPublicRouteHelpers.js';

function createResponse() {
  return {
    writeHead: vi.fn(),
    end: vi.fn()
  } as unknown as Pick<http.ServerResponse, 'writeHead' | 'end'>;
}

function createRequest(headers: Record<string, string> = {}) {
  return {
    headers
  } as Pick<http.IncomingMessage, 'headers'>;
}

describe('controlServerPublicRouteHelpers', () => {
  it('handles /health with canonical JSON', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/health',
      search: '',
      res
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(res.end.mock.calls[0]?.[0])) as {
      status?: string;
      timestamp?: string;
    };
    expect(payload.status).toBe('ok');
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles /healthz as cheap liveness distinct from readiness diagnostics', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/healthz',
      search: '',
      req: createRequest({ authorization: 'Bearer control-token' }),
      res,
      controlToken: 'control-token',
      readCommittedMachineStatusDataset: () => {
        throw new Error('/healthz must not read readiness diagnostics');
      }
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    const payload = JSON.parse(String(res.end.mock.calls[0]?.[0])) as {
      status?: string;
      mode?: string;
      readiness?: unknown;
      machine_status?: unknown;
    };
    expect(payload).toMatchObject({
      status: 'ok',
      mode: 'control_host_liveness'
    });
    expect(payload).not.toHaveProperty('readiness');
    expect(payload).not.toHaveProperty('machine_status');
  });

  it('requires the control token for /healthz liveness', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/healthz',
      search: '',
      req: createRequest({ authorization: 'Bearer wrong-token' }),
      res,
      controlToken: 'control-token',
      readCommittedMachineStatusDataset: () => {
        throw new Error('/healthz auth failure must not read readiness diagnostics');
      }
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'unauthorized' }));
  });

  it('rejects same-character-length non-matching /healthz tokens without throwing', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/healthz',
      search: '',
      req: createRequest({ authorization: `Bearer ${'e'.repeat(48)}` }),
      res,
      controlToken: 'é'.repeat(48)
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'unauthorized' }));
  });

  it('handles /readyz as degraded readiness from the committed machine-status snapshot', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/readyz',
      search: '',
      res,
      readCommittedMachineStatusDataset: () =>
        ({
          polling: {
            stuck: true,
            restart_required: true,
            last_error: 'provider_refresh_lifecycle_stuck'
          }
        }) as never
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    const payload = JSON.parse(String(res.end.mock.calls[0]?.[0])) as {
      status?: string;
      mode?: string;
      liveness?: unknown;
      diagnostics?: unknown;
    };
    expect(payload).toMatchObject({
      status: 'degraded',
      mode: 'control_host_readiness',
      diagnostics: {
        machine_status_snapshot: 'available',
        polling_status: 'degraded',
        polling_stuck: true,
        restart_required: true,
        last_error: 'provider_refresh_lifecycle_stuck',
        reason: null
      }
    });
    expect(payload).not.toHaveProperty('liveness');
  });

  it('handles /readyz as degraded when polling diagnostics are unavailable', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/readyz',
      search: '',
      res,
      readCommittedMachineStatusDataset: () =>
        ({
          polling: null
        }) as never
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    const payload = JSON.parse(String(res.end.mock.calls[0]?.[0])) as {
      status?: string;
      mode?: string;
      diagnostics?: unknown;
    };
    expect(payload).toMatchObject({
      status: 'degraded',
      mode: 'control_host_readiness',
      diagnostics: {
        machine_status_snapshot: 'available',
        polling_status: 'unavailable'
      }
    });
  });

  it('handles /readyz as degraded when the committed snapshot read throws', async () => {
    const res = createResponse();
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    try {
      const handled = await handlePublicControlRoute({
        pathname: '/readyz',
        search: '',
        res,
        readCommittedMachineStatusDataset: () => {
          throw new Error('snapshot read failed');
        }
      });

      expect(handled).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to read committed machine-status dataset for /readyz: snapshot read failed'
      );
      expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
      const payload = JSON.parse(String(res.end.mock.calls[0]?.[0])) as {
        status?: string;
        mode?: string;
        diagnostics?: unknown;
      };
      expect(payload).toMatchObject({
        status: 'degraded',
        mode: 'control_host_readiness',
        diagnostics: {
          machine_status_snapshot: 'unavailable',
          polling_status: 'unavailable'
        }
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it.each([
    {
      label: 'last_error',
      polling: {
        stuck: false,
        restart_required: false,
        last_error: 'provider_refresh_failed',
        reason: null
      }
    },
    {
      label: 'reason',
      polling: {
        stuck: false,
        restart_required: false,
        last_error: null,
        reason: 'provider_refresh_lifecycle_stuck'
      }
    }
  ])('handles /readyz as degraded when polling carries $label', async ({ polling }) => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/readyz',
      search: '',
      res,
      readCommittedMachineStatusDataset: () =>
        ({
          polling
        }) as never
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    const payload = JSON.parse(String(res.end.mock.calls[0]?.[0])) as {
      status?: string;
      mode?: string;
      diagnostics?: unknown;
    };
    expect(payload).toMatchObject({
      status: 'degraded',
      mode: 'control_host_readiness',
      diagnostics: {
        machine_status_snapshot: 'available',
        polling_status: 'degraded',
        polling_stuck: false,
        restart_required: false,
        last_error: polling.last_error,
        reason: polling.reason
      }
    });
  });

  it('redirects / to /ui preserving the search string', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/',
      search: '?view=compact',
      res
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(302, { Location: '/ui?view=compact' });
    expect(res.end).toHaveBeenCalledWith();
  });

  it('serves /ui with HTML and no-store caching', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/ui',
      search: '',
      res
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    const payload = res.end.mock.calls[0]?.[0];
    expect(Buffer.isBuffer(payload)).toBe(true);
    expect(Buffer.from(payload).toString('utf8')).toContain('<!doctype html>');
  });

  it('serves /ui/app.js with javascript content type', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/ui/app.js',
      search: '',
      res
    });

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    const payload = res.end.mock.calls[0]?.[0];
    expect(Buffer.isBuffer(payload)).toBe(true);
    expect(Buffer.from(payload).toString('utf8')).toContain('fetch');
  });

  it('returns false for non-public routes', async () => {
    const res = createResponse();

    const handled = await handlePublicControlRoute({
      pathname: '/control/action',
      search: '',
      res
    });

    expect(handled).toBe(false);
    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
