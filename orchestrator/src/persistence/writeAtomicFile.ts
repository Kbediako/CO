import { rename, writeFile } from 'node:fs/promises';

export async function writeAtomicFile(destination: string, contents: string): Promise<void> {
  const tempPath = `${destination}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, contents, 'utf-8');
  await rename(tempPath, destination);
}
