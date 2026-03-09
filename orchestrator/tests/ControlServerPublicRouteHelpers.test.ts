import type http from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import { handlePublicControlRoute } from '../src/cli/control/controlServerPublicRouteHelpers.js';

function createResponse() {
  return {
    writeHead: vi.fn(),
    end: vi.fn()
  } as unknown as Pick<http.ServerResponse, 'writeHead' | 'end'>;
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
