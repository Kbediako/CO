import { describe, expect, it, vi } from 'vitest';

import { createTelegramOversightApiClient } from '../src/cli/control/telegramOversightApiClient.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('TelegramOversightApiClient', () => {
  it('builds the expected getUpdates query shape', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true, result: [] }));
    const client = createTelegramOversightApiClient({
      botToken: 'test-token',
      fetchImpl
    });
    const controller = new AbortController();

    await client.getUpdates({
      offset: 42,
      timeoutSeconds: 20,
      signal: controller.signal
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = fetchImpl.mock.calls[0] ?? [];
    const url = new URL(String(requestUrl));
    expect(url.origin).toBe('https://api.telegram.org');
    expect(url.pathname).toBe('/bottest-token/getUpdates');
    expect(url.searchParams.get('offset')).toBe('42');
    expect(url.searchParams.get('timeout')).toBe('20');
    expect(url.searchParams.get('allowed_updates')).toBe('["message"]');
    expect(init).toMatchObject({ signal: controller.signal });
  });

  it('posts the expected sendMessage payload', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true, result: { message_id: 1 } }));
    const client = createTelegramOversightApiClient({
      botToken: 'test-token',
      fetchImpl
    });

    await client.sendMessage('1234', 'hello');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(requestUrl)).toBe('https://api.telegram.org/bottest-token/sendMessage');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    expect(JSON.parse(String(init?.body ?? '{}'))).toEqual({
      chat_id: '1234',
      text: 'hello'
    });
  });

  it('propagates Telegram descriptions for getMe failures', async () => {
    const client = createTelegramOversightApiClient({
      botToken: 'test-token',
      fetchImpl: vi.fn(async () =>
        jsonResponse(
          {
            ok: false,
            description: 'telegram_identity_failed'
          },
          500
        )
      )
    });

    await expect(client.getMe()).rejects.toThrow('telegram_identity_failed');
  });

  it('propagates Telegram descriptions for fetchUpdates failures', async () => {
    const client = createTelegramOversightApiClient({
      botToken: 'test-token',
      fetchImpl: vi.fn(async () =>
        jsonResponse(
          {
            ok: false,
            description: 'telegram_updates_failed'
          },
          500
        )
      )
    });

    await expect(client.getUpdates({ offset: 0, timeoutSeconds: 20 })).rejects.toThrow(
      'telegram_updates_failed'
    );
  });

  it('falls back to the historical sendMessage error code when Telegram omits a description', async () => {
    const client = createTelegramOversightApiClient({
      botToken: 'test-token',
      fetchImpl: vi.fn(async () => jsonResponse({ ok: false }, 500))
    });

    await expect(client.sendMessage('1234', 'hello')).rejects.toThrow('telegram_send_message_failed_500');
  });
});
