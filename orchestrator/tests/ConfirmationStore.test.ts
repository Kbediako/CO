import { describe, expect, it } from 'vitest';
import { ConfirmationStore, buildActionParamsDigest } from '../src/cli/control/confirmations.js';

const now = () => new Date('2026-01-01T00:00:00Z');

const actionInput = {
  tool: 'delegate.cancel',
  params: {
    run_id: 'run-1',
    manifest_path: '.runs/task/cli/run-1/manifest.json'
  }
};

describe('ConfirmationStore', () => {
  it('excludes confirm_nonce from action digest', () => {
    const digestBase = buildActionParamsDigest(actionInput);
    const digestWithNonce = buildActionParamsDigest({
      tool: 'delegate.cancel',
      params: {
        ...actionInput.params,
        confirm_nonce: 'secret'
      }
    });
    expect(digestWithNonce).toBe(digestBase);
  });

  it('dedupes confirmation requests with identical digests', () => {
    const store = new ConfirmationStore({ now, expiresInMs: 1000, maxPending: 3 });
    const first = store.create({
      action: 'cancel',
      tool: actionInput.tool,
      params: actionInput.params
    });
    const second = store.create({
      action: 'cancel',
      tool: actionInput.tool,
      params: actionInput.params
    });

    expect(first.request_id).toBe(second.request_id);
    expect(store.listPending()).toHaveLength(1);
  });

  it('approves and consumes confirmations', () => {
    const store = new ConfirmationStore({ now, expiresInMs: 1000, maxPending: 3 });
    const request = store.create({
      action: 'cancel',
      tool: actionInput.tool,
      params: actionInput.params
    });
    store.approve(request.request_id, 'ui');
    const nonce = store.consume(request.request_id);

    expect(nonce.confirm_nonce).toMatch(/^[a-f0-9]{64}$/);
    expect(nonce.nonce_id).toMatch(/^nonce-/);
    expect(store.listPending()).toHaveLength(0);
  });

  it('expires pending confirmations after TTL', () => {
    let current = new Date('2026-01-01T00:00:00Z').getTime();
    const store = new ConfirmationStore({
      now: () => new Date(current),
      expiresInMs: 1000,
      maxPending: 3
    });

    store.create({
      action: 'cancel',
      tool: actionInput.tool,
      params: actionInput.params
    });

    current += 1500;
    const expired = store.expire();

    expect(expired).toHaveLength(1);
    expect(store.listPending()).toHaveLength(0);
  });
});
