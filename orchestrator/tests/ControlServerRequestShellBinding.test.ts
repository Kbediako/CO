import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ControlRequestSharedContext } from '../src/cli/control/controlRequestContext.js';
import type { ControlExpiryLifecycle } from '../src/cli/control/controlExpiryLifecycle.js';
import { handleControlRequest } from '../src/cli/control/controlRequestController.js';
import { createControlServerRequestShell } from '../src/cli/control/controlServerRequestShell.js';
import { createBoundControlServerRequestShell } from '../src/cli/control/controlServerRequestShellBinding.js';

vi.mock('../src/cli/control/controlRequestController.js', () => ({
  handleControlRequest: vi.fn(async () => undefined)
}));

vi.mock('../src/cli/control/controlServerRequestShell.js', () => ({
  createControlServerRequestShell: vi.fn(() => ({ kind: 'server' } as unknown as http.Server))
}));

describe('createBoundControlServerRequestShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('binds the request handler and returns the created server', () => {
    const readRequestContextShared = vi.fn(() => null);
    const readExpiryLifecycle = vi.fn(() => null);

    const server = createBoundControlServerRequestShell({
      readRequestContextShared,
      readExpiryLifecycle
    });

    expect(server).toEqual({ kind: 'server' });
    expect(createControlServerRequestShell).toHaveBeenCalledWith({
      readRuntime: expect.any(Function),
      handleRequest: handleControlRequest
    });
  });

  it('assembles the live runtime from the supplied readers', () => {
    const requestContextShared = {
      kind: 'request-context-shared'
    } as unknown as ControlRequestSharedContext;
    const expiryLifecycle = {
      kind: 'expiry-lifecycle'
    } as unknown as ControlExpiryLifecycle;
    const readRequestContextShared = vi.fn(() => requestContextShared);
    const readExpiryLifecycle = vi.fn(() => expiryLifecycle);

    createBoundControlServerRequestShell({
      readRequestContextShared,
      readExpiryLifecycle
    });

    const [[{ readRuntime }]] = vi.mocked(createControlServerRequestShell).mock.calls;
    expect(readRuntime()).toEqual({
      requestContextShared,
      expiryLifecycle
    });
    expect(readRequestContextShared).toHaveBeenCalledTimes(1);
    expect(readExpiryLifecycle).toHaveBeenCalledTimes(1);
  });

  it('re-reads the current runtime instead of snapshotting the initial reader values', () => {
    let requestContextShared: ControlRequestSharedContext | null = null;
    let expiryLifecycle: ControlExpiryLifecycle | null = null;

    createBoundControlServerRequestShell({
      readRequestContextShared: () => requestContextShared,
      readExpiryLifecycle: () => expiryLifecycle
    });

    const [[{ readRuntime }]] = vi.mocked(createControlServerRequestShell).mock.calls;
    expect(readRuntime()).toBeNull();

    requestContextShared = {
      kind: 'request-context-shared'
    } as unknown as ControlRequestSharedContext;
    expiryLifecycle = {
      kind: 'expiry-lifecycle'
    } as unknown as ControlExpiryLifecycle;

    expect(readRuntime()).toEqual({
      requestContextShared,
      expiryLifecycle
    });
  });

  it('returns null runtime when the shared request context is unavailable', () => {
    const readRequestContextShared = vi.fn(() => null);
    const readExpiryLifecycle = vi.fn(() => {
      throw new Error('expiry reader should not run');
    });

    createBoundControlServerRequestShell({
      readRequestContextShared,
      readExpiryLifecycle
    });

    const [[{ readRuntime }]] = vi.mocked(createControlServerRequestShell).mock.calls;
    expect(readRuntime()).toBeNull();
    expect(readRequestContextShared).toHaveBeenCalledTimes(1);
  });
});
