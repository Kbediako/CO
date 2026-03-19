import http from 'node:http';

import { logger } from '../../logger.js';
import type { ControlServerBootstrapLifecycle } from './controlServerBootstrapLifecycle.js';

interface ControlServerStartupSequenceOptions {
  server: http.Server;
  host: string;
  bootstrapLifecycle: ControlServerBootstrapLifecycle;
  controlToken: string;
  closeOnFailure: () => Promise<void>;
}

export async function startControlServerStartupSequence(
  options: ControlServerStartupSequenceOptions
): Promise<string> {
  await bindControlServer(options.server, options.host);
  const baseUrl = resolveControlServerBaseUrl(options.server, options.host);
  options.server.on('error', (error) => {
    logger.error(`Control server error: ${(error as Error)?.message ?? String(error)}`);
  });

  try {
    await options.bootstrapLifecycle.start({
      baseUrl,
      controlToken: options.controlToken
    });
  } catch (error) {
    await options.closeOnFailure();
    throw error;
  }

  return baseUrl;
}

async function bindControlServer(server: http.Server, host: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('error', onError);
      try {
        server.close(() => undefined);
      } catch {
        // Ignore close errors on a server that failed to bind.
      }
      reject(error);
    };
    server.once('error', onError);
    server.listen(0, host, () => {
      server.off('error', onError);
      resolve();
    });
  });
}

function resolveControlServerBaseUrl(server: http.Server, host: string): string {
  const address = server.address();
  const port = typeof address === 'string' || !address ? 0 : address.port;
  return `http://${formatHostForUrl(host)}:${port}`;
}

export function formatHostForUrl(host: string): string {
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`;
  }
  return host;
}
