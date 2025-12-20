import { writeAtomicFile as writeAtomicFileInternal } from '../utils/atomicWrite.js';

export async function writeAtomicFile(destination: string, contents: string): Promise<void> {
  await writeAtomicFileInternal(destination, contents, { ensureDir: false, encoding: 'utf-8' });
}
