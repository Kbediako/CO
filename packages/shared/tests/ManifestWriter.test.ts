import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  mergeToolRunRecord,
  persistDesignManifest,
  persistToolRunRecord,
  sanitizeToolRunRecord
} from '../manifest/writer.js';
import type { DesignArtifactRecord, DesignArtifactsSummary, ToolRunRecord } from '../manifest/types.js';

function createRecord(overrides: Partial<ToolRunRecord> = {}): ToolRunRecord {
  return {
    id: 'run-123',
    tool: 'shell',
    approvalSource: 'cache',
    retryCount: 0,
    sandboxState: 'sandboxed',
    status: 'succeeded',
    startedAt: '2025-01-01T00:00:00.000Z',
    completedAt: '2025-01-01T00:00:01.000Z',
    attemptCount: 1,
    ...overrides
  };
}

describe('manifest writer', () => {
  it('sanitizes retry and attempt counts', () => {
    const record = createRecord({ retryCount: -5, attemptCount: 0 });
    const sanitized = sanitizeToolRunRecord(record);
    expect(sanitized.retryCount).toBe(0);
    expect(sanitized.attemptCount).toBe(1);
  });

  it('merges tool runs onto a manifest', () => {
    const manifest = {};
    const entry = createRecord({ approvalSource: 'prompt', retryCount: 2, sandboxState: 'escalated' });
    const merged = mergeToolRunRecord(manifest, entry);
    expect(merged.toolRuns).toBeDefined();
    expect(merged.toolRuns).toHaveLength(1);
    const [stored] = merged.toolRuns!;
    expect(stored.approvalSource).toBe('prompt');
    expect(stored.retryCount).toBe(2);
    expect(stored.sandboxState).toBe('escalated');
  });

  it('persists tool runs to disk creating directories as needed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'manifest-writer-'));
    const manifestPath = join(root, 'nested', 'run', 'manifest.json');
    const record = createRecord({
      id: 'run-abc',
      sandboxState: 'escalated',
      approvalSource: 'prompt',
      retryCount: 1
    });

    await persistToolRunRecord(manifestPath, record);
    const raw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as { toolRuns: ToolRunRecord[] };
    expect(manifest.toolRuns).toHaveLength(1);
    expect(manifest.toolRuns[0].id).toBe('run-abc');
    expect(manifest.toolRuns[0].sandboxState).toBe('escalated');
    expect(manifest.toolRuns[0].retryCount).toBe(1);
  });

  it('updates existing tool run entries by id', async () => {
    const root = await mkdtemp(join(tmpdir(), 'manifest-writer-'));
    const manifestPath = join(root, 'manifest.json');
    const initial = {
      toolRuns: [
        createRecord({
          id: 'run-dup',
          retryCount: 0,
          sandboxState: 'sandboxed',
          approvalSource: 'cache'
        })
      ]
    };
    await writeFile(manifestPath, JSON.stringify(initial, null, 2));

    await persistToolRunRecord(
      manifestPath,
      createRecord({
        id: 'run-dup',
        retryCount: 3,
        sandboxState: 'escalated',
        approvalSource: 'prompt'
      })
    );

    const raw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as { toolRuns: ToolRunRecord[] };
    expect(manifest.toolRuns).toHaveLength(1);
    expect(manifest.toolRuns[0].retryCount).toBe(3);
    expect(manifest.toolRuns[0].approvalSource).toBe('prompt');
    expect(manifest.toolRuns[0].sandboxState).toBe('escalated');
  });

  it('persists exec lifecycle events when present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'manifest-writer-'));
    const manifestPath = join(root, 'manifest.json');
    const record = createRecord({
      id: 'run-events',
      events: [
        {
          type: 'exec:begin',
          timestamp: '2025-11-04T00:00:00.000Z',
          correlationId: 'corr-1',
          attempt: 1,
          command: 'echo',
          args: ['hello'],
          sessionId: 'session-1',
          sandboxState: 'sandboxed',
          persisted: true
        },
        {
          type: 'exec:retry',
          timestamp: '2025-11-04T00:00:00.750Z',
          correlationId: 'corr-1',
          attempt: 1,
          delayMs: 500,
          sandboxState: 'sandboxed',
          errorMessage: 'network hiccup'
        },
        {
          type: 'exec:end',
          timestamp: '2025-11-04T00:00:01.000Z',
          correlationId: 'corr-1',
          attempt: 1,
          exitCode: 0,
          signal: null,
          durationMs: 1000,
          stdout: 'hello\n',
          stderr: '',
          sandboxState: 'sandboxed',
          sessionId: 'session-1',
          status: 'succeeded'
        }
      ]
    });

    await persistToolRunRecord(manifestPath, record);
    const raw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as { toolRuns: ToolRunRecord[] };
    expect(manifest.toolRuns[0].events).toHaveLength(3);
    expect(manifest.toolRuns[0].events?.[0].type).toBe('exec:begin');
    expect(manifest.toolRuns[0].events?.[1].type).toBe('exec:retry');
    expect(manifest.toolRuns[0].events?.[2].type).toBe('exec:end');
  });

  it('persists design artifacts, summary, and config snapshot', async () => {
    const root = await mkdtemp(join(tmpdir(), 'design-manifest-'));
    const manifestPath = join(root, 'manifest.json');
    const artifacts: DesignArtifactRecord[] = [
      {
        stage: 'extract',
        status: 'succeeded',
        relative_path: 'design/reference/dom.json',
        approvals: [
          {
            id: 'approval-1',
            actor: 'designer@example.com',
            reason: 'Capture approved',
            timestamp: '2025-01-01T00:00:00.000Z'
          }
        ],
        quota: {
          type: 'runtime',
          limit: 60,
          unit: 'seconds',
          consumed: 45
        },
        privacy_notes: ['mask applied to .secret'],
        metadata: { viewport: 'desktop' }
      },
      {
        stage: 'visual-regression',
        status: 'skipped',
        relative_path: 'design/visual-regression/report.json',
        expiry: {
          date: '2025-02-15T00:00:00.000Z',
          policy: 'manual-override'
        }
      }
    ];

    const summary: DesignArtifactsSummary = {
      total_artifacts: 2,
      generated_at: '2025-01-01T00:00:00.000Z',
      storage_bytes: 1024,
      stages: [
        {
          stage: 'extract',
          succeeded: 1,
          failed: 0,
          skipped: 0,
          artifacts: 1
        },
        {
          stage: 'visual-regression',
          succeeded: 0,
          failed: 0,
          skipped: 1
        }
      ]
    };

    await persistDesignManifest(
      manifestPath,
      {
        artifacts,
        summary,
        configSnapshot: {
          metadata: {
            design: {
              enabled: true,
              retention: { days: 30, autoPurge: true }
            }
          }
        }
      },
      {
        retentionDays: 30,
        now: new Date('2025-01-01T00:00:00.000Z')
      }
    );

    const raw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as {
      design_artifacts: DesignArtifactRecord[];
      design_config_snapshot: Record<string, unknown>;
      design_artifacts_summary: DesignArtifactsSummary;
    };

    expect(manifest.design_artifacts).toHaveLength(2);
    const [first, second] = manifest.design_artifacts;
    expect(first.expiry?.policy).toBe('design.config.retention');
    expect(first.expiry?.date).toBe('2025-01-31T00:00:00.000Z');
    expect(second.expiry?.policy).toBe('manual-override');
    expect(manifest.design_config_snapshot).toMatchObject({ metadata: { design: { enabled: true } } });
    expect(manifest.design_artifacts_summary.total_artifacts).toBe(2);
    expect(manifest.design_artifacts_summary.stages).toHaveLength(2);
  });

  it('bounds design artifacts to 200 entries when merging', async () => {
    const root = await mkdtemp(join(tmpdir(), 'design-manifest-'));
    const manifestPath = join(root, 'manifest.json');
    const existing = {
      design_artifacts: Array.from({ length: 199 }, (_, index) => ({
        stage: 'components',
        status: 'succeeded',
        relative_path: `design/components/component-${index}.json`
      }))
    } satisfies { design_artifacts: DesignArtifactRecord[] };
    await writeFile(manifestPath, JSON.stringify(existing, null, 2));

    const newArtifacts: DesignArtifactRecord[] = [
      {
        stage: 'components',
        status: 'succeeded',
        relative_path: 'design/components/component-199.json'
      },
      {
        stage: 'components',
        status: 'succeeded',
        relative_path: 'design/components/component-200.json'
      }
    ];

    await persistDesignManifest(manifestPath, { artifacts: newArtifacts }, {});
    const raw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as { design_artifacts: DesignArtifactRecord[] };
    expect(manifest.design_artifacts).toHaveLength(200);
    expect(manifest.design_artifacts[199].relative_path).toBe('design/components/component-200.json');
  });
});
