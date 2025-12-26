import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import { appendMetricsEntry } from '../src/cli/metrics/metricsRecorder.js';

const ORIGINAL_PRIVACY_MAX = process.env.CODEX_METRICS_PRIVACY_EVENTS_MAX;

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'metrics-privacy-'));
});

afterEach(async () => {
  process.env.CODEX_METRICS_PRIVACY_EVENTS_MAX = ORIGINAL_PRIVACY_MAX;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('metricsRecorder privacy event caps', () => {
  it('truncates privacy events when a max is configured', async () => {
    process.env.CODEX_METRICS_PRIVACY_EVENTS_MAX = '1';
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'privacy-metrics'
    };
    const pipeline: PipelineDefinition = {
      id: 'pipeline',
      title: 'Pipeline',
      stages: [
        {
          kind: 'command',
          id: 'stage',
          title: 'Stage',
          command: 'echo ok'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-privacy', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const now = new Date().toISOString();
    manifest.status = 'succeeded';
    manifest.completed_at = now;
    manifest.privacy = {
      mode: 'enforce',
      decisions: [
        {
          handle_id: 'handle-1',
          sequence: 1,
          action: 'allow',
          stage_id: 'build',
          timestamp: now
        },
        {
          handle_id: 'handle-2',
          sequence: 2,
          action: 'allow',
          stage_id: 'build',
          timestamp: now
        }
      ],
      totals: {
        total_frames: 2,
        redacted_frames: 0,
        blocked_frames: 0,
        allowed_frames: 2
      },
      log_path: 'privacy-decisions.ndjson'
    };

    await appendMetricsEntry(env, paths, manifest);

    const metricsPath = join(env.runsRoot, env.taskId, 'metrics.json');
    const raw = await readFile(metricsPath, 'utf8');
    const entry = JSON.parse(raw.trim().split('\n')[0] ?? '{}') as Record<string, unknown>;

    expect(Array.isArray(entry.privacy_events)).toBe(true);
    expect((entry.privacy_events as Array<unknown>)).toHaveLength(1);
    expect(entry.privacy_event_count).toBe(2);
    expect(entry.privacy_events_truncated).toBe(true);
    expect(entry.privacy_log_path).toBe('privacy-decisions.ndjson');
  });
});
