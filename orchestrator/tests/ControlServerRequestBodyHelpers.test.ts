import type http from 'node:http';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import {
  readJsonBody,
  readRawBody
} from '../src/cli/control/controlServerRequestBodyHelpers.js';

function createRequest(body: Buffer | string | Array<Buffer | string>): http.IncomingMessage {
  const chunks = Array.isArray(body) ? body : [body];
  return Readable.from(chunks) as unknown as http.IncomingMessage;
}

describe('controlServerRequestBodyHelpers', () => {
  it('reads and concatenates the raw request body', async () => {
    const body = await readRawBody(createRequest(['{"action"', ':"pause"}']));

    expect(body.toString('utf8')).toBe('{"action":"pause"}');
  });

  it('returns an empty object for empty request bodies', async () => {
    await expect(readJsonBody(createRequest([]))).resolves.toEqual({});
  });

  it('returns an empty object for whitespace-only request bodies', async () => {
    await expect(readJsonBody(createRequest(' \n\t '))).resolves.toEqual({});
  });

  it('throws a 400 status error for invalid JSON', async () => {
    await expect(readJsonBody(createRequest('{"action":'))).rejects.toMatchObject({
      status: 400,
      message: 'invalid_json'
    });
  });

  it('throws a 413 status error when the request body exceeds the size limit', async () => {
    await expect(readRawBody(createRequest(Buffer.alloc(1024 * 1024 + 1, 'a')))).rejects.toMatchObject({
      status: 413,
      message: 'request_body_too_large'
    });
  });
});
