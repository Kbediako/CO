import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function writeJsonAtomic(targetPath: string, data: unknown): Promise<void> {
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await writeFileAtomic(targetPath, payload);
}

export async function writeFileAtomic(targetPath: string, contents: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(tmpPath, contents, 'utf8');
  await rename(tmpPath, targetPath);
}
