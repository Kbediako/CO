import { describe, expect, it } from 'vitest';

import { DEFAULT_PROVIDER_WORKER_RECOVER_REQUEST_TIMEOUT_MS } from '../src/cli/controlHostProviderWorkerRecoverCliShell.js';

describe('control-host provider-worker recover CLI shell', () => {
  it('keeps the default request timeout above the explicit recovery operation budget', () => {
    expect(DEFAULT_PROVIDER_WORKER_RECOVER_REQUEST_TIMEOUT_MS).toBe(120_000);
  });
});
