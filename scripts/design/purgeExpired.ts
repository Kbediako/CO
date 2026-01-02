import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { loadDesignConfig } from '../../packages/shared/config/index.js';
import { resolveRepoRoot, resolveRunsDir } from '../lib/run-manifests.js';

async function main(): Promise<void> {
  const repoRoot = resolveRepoRoot();
  const runsRoot = resolveRunsDir(repoRoot);
  const taskId = process.env.MCP_RUNNER_TASK_ID ?? '0410-hi-fi-design-toolkit';
  const targetDir = join(runsRoot, taskId, 'cli');

  const designConfig = await loadDesignConfig({ rootDir: repoRoot });
  const toolkitConfig = designConfig.config.pipelines.hiFiDesignToolkit;
  const retention = toolkitConfig.retention ?? designConfig.config.metadata.design.retention;

  if (!retention.autoPurge) {
    console.log('[design:purge-expired] auto purge disabled; nothing to do.');
    return;
  }

  const cutoff = Date.now() - retention.days * 24 * 60 * 60 * 1000;
  let removed = 0;

  try {
    const entries = await readdir(targetDir, { withFileTypes: true });
    for (const dirent of entries) {
      if (!dirent.isDirectory()) {
        continue;
      }
      const runDir = join(targetDir, dirent.name);
      const stats = await stat(runDir);
      if (stats.mtimeMs < cutoff) {
        await rm(runDir, { recursive: true, force: true });
        removed += 1;
        console.log(`[design:purge-expired] removed ${dirent.name}`);
      }
    }
  } catch (error) {
    console.error('[design:purge-expired] failed to scan runs directory');
    throw error;
  }

  if (removed === 0) {
    console.log('[design:purge-expired] no expired runs found');
  }
}

main().catch((error) => {
  console.error('[design:purge-expired] unexpected failure');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
