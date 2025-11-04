import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  mergeToolRunRecord,
  persistToolRunRecord,
  sanitizeToolRunRecord
} from '../manifest/writer.js';
import type { ToolRunRecord } from '../manifest/types.js';

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
});
