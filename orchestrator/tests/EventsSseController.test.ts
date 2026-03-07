import { EventEmitter } from 'node:events';
import http from 'node:http';

import { describe, expect, it } from 'vitest';

import { handleEventsSseRequest } from '../src/cli/control/eventsSseController.js';

function createResponseRecorder() {
  const state: {
    statusCode: number | null;
    headers: Record<string, string> | null;
    chunks: string[];
  } = {
    statusCode: null,
    headers: null,
    chunks: []
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = headers;
      return this;
    },
    write(payload: string | Buffer) {
      state.chunks.push(payload.toString());
      return true;
    }
  } as unknown as http.ServerResponse;

  return { res, state };
}

function createRequestEmitter(): http.IncomingMessage {
  return Object.assign(new EventEmitter(), {
    method: 'GET',
    url: '/events'
  }) as unknown as http.IncomingMessage;
}

describe('EventsSseController', () => {
  it('writes the SSE bootstrap response and registers the client', () => {
    const req = createRequestEmitter();
    const { res, state } = createResponseRecorder();
    const clients = new Set<http.ServerResponse>();

    handleEventsSseRequest({
      req,
      res,
      clients
    });

    expect(state.statusCode).toBe(200);
    expect(state.headers).toEqual({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    expect(state.chunks.join('')).toBe(': ok\n\n');
    expect(clients.has(res)).toBe(true);
  });

  it('removes the client when the request closes', () => {
    const req = createRequestEmitter();
    const { res } = createResponseRecorder();
    const clients = new Set<http.ServerResponse>();

    handleEventsSseRequest({
      req,
      res,
      clients
    });

    expect(clients.has(res)).toBe(true);
    req.emit('close');
    expect(clients.has(res)).toBe(false);
  });
});
