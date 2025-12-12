import { describe, expect, it, vi } from 'vitest';
import { ExecSessionManager, type ExecSessionHandle } from '../src/exec/session-manager.js';

function createHandle(label: string) {
  return {
    label,
    dispose: vi.fn(async () => {})
  };
}

describe('ExecSessionManager', () => {
  it('reuses persisted sessions when available', async () => {
    const factory = vi.fn(async ({ id }) => createHandle(`${id}-1`));
    const manager = new ExecSessionManager({
      factory,
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });

    const first = await manager.acquire({ id: 'shell' });
    const second = await manager.acquire({ id: 'shell' });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first.handle).toBe(second.handle);
    expect(second.reused).toBe(true);
    expect(second.persisted).toBe(true);
  });

  it('updates env snapshot on reuse when overrides are provided', async () => {
    const factory = vi.fn(async ({ id }) => createHandle(id));
    const manager = new ExecSessionManager({
      factory,
      baseEnv: { FOO: '1' },
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });

    const first = await manager.acquire({ id: 'shell', env: { FOO: '2' } });
    expect(first.envSnapshot.FOO).toBe('2');

    const second = await manager.acquire({ id: 'shell', env: { FOO: '3' } });
    expect(second.reused).toBe(true);
    expect(second.envSnapshot.FOO).toBe('3');
  });

  it('creates a fresh persisted session when reuse is disabled', async () => {
    const handles: ExecSessionHandle[] = [];
    const factory = vi.fn(async ({ id }) => {
      const handle = createHandle(`${id}-${factory.mock.calls.length + 1}`);
      handles.push(handle);
      return handle;
    });

    const manager = new ExecSessionManager({
      factory,
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });

    const first = await manager.acquire({ id: 'shell' });
    const events: string[] = [];
    manager.on('session:disposed', (event) => {
      events.push(event.session.id);
    });

    const second = await manager.acquire({ id: 'shell', reuse: false });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(first.handle).not.toBe(second.handle);
    expect(events).toContain('shell');
    expect(second.reused).toBe(false);
    expect(second.persisted).toBe(true);

    const third = await manager.acquire({ id: 'shell' });
    expect(third.handle).toBe(second.handle);
  });

  it('creates ephemeral sessions when no id provided and disposes on release', async () => {
    const handle = createHandle('ephemeral');
    const factory = vi.fn(async () => handle);
    const manager = new ExecSessionManager({
      factory,
      baseEnv: { TEST_ENV: '1' },
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });

    const lease = await manager.acquire({ env: { TEST_ENV: '2' } });
    expect(lease.persisted).toBe(false);
    expect(lease.reused).toBe(false);
    expect(lease.envSnapshot.TEST_ENV).toBe('2');

    await lease.release();
    expect(handle.dispose).toHaveBeenCalledTimes(1);
  });

  it('emits session lifecycle events', async () => {
    const handle = createHandle('with-events');
    const factory = vi.fn(async () => handle);
    const manager = new ExecSessionManager({
      factory,
      now: () => new Date('2025-11-04T00:00:00.000Z')
    });

    const created = vi.fn();
    const disposed = vi.fn();
    manager.on('session:created', created);
    manager.on('session:disposed', disposed);

    const lease = await manager.acquire({ id: 'pty-1' });
    await manager.dispose('pty-1');

    expect(created).toHaveBeenCalledTimes(1);
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(disposed.mock.calls[0][0].session.id).toBe(lease.id);
  });
});
