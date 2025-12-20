import { writeAtomicFile as writeAtomicFileInternal } from '../../utils/atomicWrite.js';

export async function writeJsonAtomic(targetPath: string, data: unknown): Promise<void> {
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await writeFileAtomic(targetPath, payload);
}

export async function writeFileAtomic(targetPath: string, contents: string): Promise<void> {
  await writeAtomicFileInternal(targetPath, contents, { ensureDir: true, encoding: 'utf8' });
}
