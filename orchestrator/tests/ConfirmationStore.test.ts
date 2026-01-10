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
    const store = new ConfirmationStore({ runId: 'run-1', now, expiresInMs: 1000, maxPending: 3 });
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

    expect(first.confirmation.request_id).toBe(second.confirmation.request_id);
    expect(first.wasCreated).toBe(true);
    expect(second.wasCreated).toBe(false);
    expect(store.listPending()).toHaveLength(1);
  });

  it('issues and validates nonces, enforcing single-use', () => {
    const store = new ConfirmationStore({ runId: 'run-1', now, expiresInMs: 1000, maxPending: 3 });
    const request = store.create({
      action: 'cancel',
      tool: actionInput.tool,
      params: actionInput.params
    }).confirmation;
    store.approve(request.request_id, 'ui');
    const nonce = store.issue(request.request_id);

    expect(nonce.confirm_nonce).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
    expect(nonce.nonce_id).toMatch(/^nonce-/);
    const validation = store.validateNonce({
      confirmNonce: nonce.confirm_nonce,
      tool: actionInput.tool,
      params: actionInput.params
    });

    expect(validation.request.request_id).toBe(request.request_id);
    expect(store.listPending()).toHaveLength(0);
    expect(store.snapshot().consumed_nonce_ids).toContain(nonce.nonce_id);

    expect(() =>
      store.validateNonce({
        confirmNonce: nonce.confirm_nonce,
        tool: actionInput.tool,
        params: actionInput.params
      })
    ).toThrowError(/nonce_already_consumed/);
  });

  it('expires pending confirmations after TTL', () => {
    let current = new Date('2026-01-01T00:00:00Z').getTime();
    const store = new ConfirmationStore({
      runId: 'run-1',
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
