import { describe, expect, it, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, mkdir, readdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    appendFile: vi.fn(actual.appendFile)
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('metricsAggregator streaming flush', () => {
  it('flushes a multi-line pending file multiple times when line caps are low', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'metrics-aggregator-flush-count-'));
    const runsRoot = join(repoRoot, '.runs');
    const outRoot = join(repoRoot, 'out');
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot,
      outRoot,
      taskId: 'autonomy-upgrade'
    };

    const previousLines = process.env.CODEX_METRICS_PENDING_BATCH_MAX_LINES;
    try {
      process.env.CODEX_METRICS_PENDING_BATCH_MAX_LINES = '2';

      const metricsRoot = join(runsRoot, env.taskId);
      await mkdir(metricsRoot, { recursive: true });
      const pendingDir = join(metricsRoot, 'metrics.pending');
      await mkdir(pendingDir, { recursive: true });
      await writeFile(
        join(pendingDir, 'entry-multi.jsonl'),
        [
          JSON.stringify({ run_id: 'run-1' }),
          JSON.stringify({ run_id: 'run-2' }),
          JSON.stringify({ run_id: 'run-3' }),
          JSON.stringify({ run_id: 'run-4' }),
          JSON.stringify({ run_id: 'run-5' })
        ].join('\n') + '\n',
        { encoding: 'utf8', flag: 'w' }
      );

      const { mergePendingMetricsEntries } = await import('../src/cli/metrics/metricsAggregator.js');
      const merged = await mergePendingMetricsEntries(env);

      expect(merged).toBe(5);
      expect(appendFile).toHaveBeenCalledTimes(3);
      const remaining = await readdir(pendingDir);
      expect(remaining).toHaveLength(0);
    } finally {
      if (previousLines === undefined) {
        delete process.env.CODEX_METRICS_PENDING_BATCH_MAX_LINES;
      } else {
        process.env.CODEX_METRICS_PENDING_BATCH_MAX_LINES = previousLines;
      }
    }
  });
});
