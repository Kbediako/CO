import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface PersistIOOptions {
  read?: (path: string, encoding: 'utf-8') => Promise<string>;
  write?: (path: string, data: string) => Promise<void>;
  ensureDir?: (path: string) => Promise<void>;
}

export interface PersistIO {
  read: (path: string, encoding: 'utf-8') => Promise<string>;
  write: (path: string, data: string) => Promise<void>;
  ensureDir: (path: string) => Promise<void>;
}

export function resolveIO(options: PersistIOOptions = {}): PersistIO {
  const read = options.read ?? ((path, encoding) => readFile(path, { encoding }));
  const write = options.write ?? ((path, data) => writeFile(path, data, { encoding: 'utf-8' }));
  const ensureDir =
    options.ensureDir ??
    (async (path: string) => {
      await mkdir(path, { recursive: true });
    });

  return { read, write, ensureDir };
}

export async function loadJsonManifest<T>(
  manifestPath: string,
  io: PersistIO
): Promise<T | null> {
  try {
    const raw = await io.read(manifestPath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException | undefined;
    if (!err || err.code !== 'ENOENT') {
      throw error;
    }
    await io.ensureDir(dirname(manifestPath));
    return null;
  }
}

export async function writeJsonManifest(
  manifestPath: string,
  manifest: unknown,
  io: PersistIO
): Promise<void> {
  const serialized = JSON.stringify(manifest, null, 2);
  await io.write(manifestPath, `${serialized}\n`);
}
