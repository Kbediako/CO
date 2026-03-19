import { readFile } from 'node:fs/promises';

import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';

export async function validateOrchestratorResumeToken(
  paths: RunPaths,
  manifest: CliManifest,
  provided: string | null,
  readFileImpl: typeof readFile = readFile
): Promise<void> {
  let stored = manifest.resume_token;
  if (!stored) {
    try {
      stored = (await readFileImpl(paths.resumeTokenPath, 'utf8')).trim();
    } catch (error) {
      throw new Error(`Resume token missing for run ${manifest.run_id}: ${(error as Error)?.message ?? String(error)}`);
    }
  }
  if (provided && stored !== provided) {
    throw new Error('Resume token mismatch.');
  }
}
