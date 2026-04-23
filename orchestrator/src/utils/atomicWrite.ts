import { chmod, mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface AtomicWriteOptions {
  ensureDir?: boolean;
  encoding?: BufferEncoding;
  now?: () => number;
  pid?: number;
}

let atomicWriteCounter = 0;

export function buildAtomicTempPath(
  destination: string,
  now: () => number = Date.now,
  pid: number = process.pid
): string {
  atomicWriteCounter = (atomicWriteCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${destination}.tmp-${pid}-${now()}-${atomicWriteCounter}`;
}

export async function writeAtomicFile(
  destination: string,
  contents: string,
  options: AtomicWriteOptions = {}
): Promise<void> {
  const tmpPath = buildAtomicTempPath(
    destination,
    options.now ?? Date.now,
    options.pid ?? process.pid
  );
  if (options.ensureDir) {
    await mkdir(dirname(destination), { recursive: true });
  }
  let existingMode: number | null = null;
  try {
    existingMode = (await stat(destination)).mode & 0o777;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  await writeFile(tmpPath, contents, {
    encoding: options.encoding ?? 'utf8',
    mode: existingMode ?? undefined
  });
  if (existingMode !== null) {
    await chmod(tmpPath, existingMode);
  }
  await rename(tmpPath, destination);
}
