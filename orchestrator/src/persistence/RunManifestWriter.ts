import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RunSummary } from '../types.js';

export interface RunManifestWriterOptions {
  runsDir?: string;
}

/**
 * Stores the run-level manifest under `.runs/<taskId>/<runId>/manifest.json`
 * so downstream tooling (cloud-sync worker, reviewers) can ingest the payload.
 */
export class RunManifestWriter {
  private readonly runsDir: string;

  constructor(options: RunManifestWriterOptions = {}) {
    this.runsDir = options.runsDir ?? join(process.cwd(), '.runs');
  }

  async write(summary: RunSummary): Promise<string> {
    const runDir = join(this.runsDir, summary.taskId, summary.runId.replace(/[:]/g, '-'));
    await mkdir(runDir, { recursive: true });
    const manifestPath = join(runDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(summary, null, 2), 'utf-8');
    return manifestPath;
  }
}
