import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface AtomicWriteOptions {
  ensureDir?: boolean;
  encoding?: BufferEncoding;
  now?: () => number;
  pid?: number;
}

export function buildAtomicTempPath(
  destination: string,
  now: () => number = Date.now,
  pid: number = process.pid
): string {
  return `${destination}.tmp-${pid}-${now()}`;
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
  await writeFile(tmpPath, contents, options.encoding ?? 'utf8');
  await rename(tmpPath, destination);
}
