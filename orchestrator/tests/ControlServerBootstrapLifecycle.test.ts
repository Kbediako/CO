import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createControlServerBootstrapLifecycle } from '../src/cli/control/controlServerBootstrapLifecycle.js';

async function createLifecycleRoot() {
  const root = await mkdtemp(join(tmpdir(), 'control-bootstrap-lifecycle-'));
  const runDir = join(root, 'run');
  await mkdir(runDir, { recursive: true });
  return {
    root,
    runDir,
    paths: {
      runDir,
      controlAuthPath: join(runDir, 'control-auth.json'),
      controlEndpointPath: join(runDir, 'control-endpoint.json')
    }
  };
}

describe('createControlServerBootstrapLifecycle', () => {
  it('persists metadata before the bridge starts', async () => {
    const { root, runDir, paths } = await createLifecycleRoot();
    const controlPath = join(runDir, 'control.json');
    const order: string[] = [];
    const telegramBridgeLifecycle = {
      start: vi.fn(async () => {
        order.push('startBridge');
      const authPayload = JSON.parse(await readFile(paths.controlAuthPath, 'utf8')) as {
        token?: string;
        created_at?: string;
      };
      const endpointPayload = JSON.parse(await readFile(paths.controlEndpointPath, 'utf8')) as {
        base_url?: string;
        token_path?: string;
      };
      const controlPayload = JSON.parse(await readFile(controlPath, 'utf8')) as { control_seq?: number };
      expect(authPayload.token).toBe('token-1');
      expect(typeof authPayload.created_at).toBe('string');
      expect(endpointPayload).toEqual({
        base_url: 'http://127.0.0.1:4321',
        token_path: paths.controlAuthPath
      });
      if (process.platform !== 'win32') {
        const authStats = await stat(paths.controlAuthPath);
        const endpointStats = await stat(paths.controlEndpointPath);
        expect(authStats.mode & 0o777).toBe(0o600);
        expect(endpointStats.mode & 0o777).toBe(0o600);
      }
      expect(controlPayload.control_seq).toBe(0);
      return null;
      }),
      close: vi.fn(async () => undefined)
    };

    const lifecycle = createControlServerBootstrapLifecycle({
      paths,
      persistControl: async () => {
        order.push('persistControl');
        await writeFile(controlPath, JSON.stringify({ control_seq: 0 }), 'utf8');
      },
      startExpiryLifecycle: () => {
        order.push('startExpiryLifecycle');
      },
      telegramBridgeLifecycle
    });

    try {
      await lifecycle.start({
        baseUrl: 'http://127.0.0.1:4321',
        controlToken: 'token-1'
      });

      expect(order).toEqual(['persistControl', 'startExpiryLifecycle', 'startBridge']);
      expect(telegramBridgeLifecycle.start).toHaveBeenCalledOnce();
    } finally {
      await lifecycle.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('delegates lifecycle close to the telegram bridge lifecycle', async () => {
    const { root, runDir, paths } = await createLifecycleRoot();
    const controlPath = join(runDir, 'control.json');
    const order: string[] = [];
    const telegramBridgeLifecycle = {
      start: vi.fn(async () => {
        order.push('startBridge');
      }),
      close: vi.fn(async () => {
        order.push('closeBridge');
      })
    };
    const lifecycle = createControlServerBootstrapLifecycle({
      paths,
      persistControl: async () => {
        await writeFile(controlPath, JSON.stringify({ control_seq: 1 }), 'utf8');
      },
      telegramBridgeLifecycle
    });

    try {
      await lifecycle.start({
        baseUrl: 'http://127.0.0.1:4321',
        controlToken: 'token-1'
      });
      await lifecycle.close();

      expect(order).toEqual(['startBridge', 'closeBridge']);
      expect(telegramBridgeLifecycle.close).toHaveBeenCalledOnce();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('treats telegram bridge lifecycle startup failure as non-fatal', async () => {
    const { root, runDir, paths } = await createLifecycleRoot();
    const controlPath = join(runDir, 'control.json');
    const telegramBridgeLifecycle = {
      start: vi.fn(async () => {
        throw new Error('bridge-boom');
      }),
      close: vi.fn(async () => undefined)
    };
    const lifecycle = createControlServerBootstrapLifecycle({
      paths,
      persistControl: async () => {
        await writeFile(controlPath, JSON.stringify({ control_seq: 2 }), 'utf8');
      },
      telegramBridgeLifecycle
    });

    try {
      await expect(
        lifecycle.start({
          baseUrl: 'http://127.0.0.1:4321',
          controlToken: 'token-1'
        })
      ).resolves.toBeUndefined();

      expect(telegramBridgeLifecycle.start).toHaveBeenCalledOnce();
      expect(JSON.parse(await readFile(controlPath, 'utf8'))).toEqual({ control_seq: 2 });
    } finally {
      await lifecycle.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
