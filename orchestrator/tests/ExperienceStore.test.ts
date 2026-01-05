import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  ExperienceStore,
  ExperienceStoreLockError,
  type ExperienceInput,
  type ExperienceRecord
} from '../src/persistence/ExperienceStore.js';

function createInput(overrides: Partial<ExperienceInput> = {}): ExperienceInput {
  return {
    runId: overrides.runId ?? 'run-1',
    taskId: overrides.taskId ?? 'task-0506',
    epoch: overrides.epoch ?? 1,
    groupId: overrides.groupId ?? 'group-1',
    summary:
      overrides.summary ??
      'This is a synthetic experience summary that should be trimmed to the configured word limit for TF-GRPO runs.',
    reward: overrides.reward ?? { gtScore: 1, relativeRank: 0.5 },
    toolStats: overrides.toolStats ?? [
      {
        tool: 'cli:command',
        tokens: 120,
        latencyMs: 900,
        costUsd: 0.0024
      }
    ],
    stampSignature: overrides.stampSignature ?? 'a'.repeat(64),
    domain: overrides.domain ?? 'implementation'
  };
}

describe('ExperienceStore', () => {
  let workspace: string;
  let outDir: string;
  let runsDir: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'experience-store-'));
    outDir = join(workspace, 'out');
    runsDir = join(workspace, '.runs');
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('records batches and enforces the summary word limit', async () => {
    const store = new ExperienceStore({ outDir, runsDir, maxSummaryWords: 5 });
    const [record] = await store.recordBatch([createInput()], 'manifests/run.json');
    expect(record.summary32.split(' ')).toHaveLength(5);

    const filePath = join(outDir, 'task-0506', 'experiences.jsonl');
    const raw = await readFile(filePath, 'utf8');
    expect(raw.trim().split('\n')).toHaveLength(1);
  });

  it('does not clobber retry defaults with undefined overrides', () => {
    const store = new ExperienceStore({
      outDir,
      runsDir,
      lockRetry: { maxAttempts: undefined }
    });

    expect((store as unknown as { lockRetry: { maxAttempts: number } }).lockRetry.maxAttempts).toBe(5);
  });

  it('retries lock acquisition before throwing an ExperienceStoreLockError', async () => {
    const store = new ExperienceStore({
      outDir,
      runsDir,
      lockRetry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 1 }
    });

    await mkdir(runsDir, { recursive: true });
    const lockPath = join(runsDir, 'task-0506.experiences.lock');
    await writeFile(lockPath, 'locked', 'utf8');

    await expect(store.recordBatch([createInput()], 'manifests/run.json')).rejects.toBeInstanceOf(
      ExperienceStoreLockError
    );
  });

  it('appends new records without parsing existing file contents', async () => {
    const store = new ExperienceStore({ outDir, runsDir });
    const taskDir = join(outDir, 'task-0506');
    await mkdir(taskDir, { recursive: true });
    const filePath = join(taskDir, 'experiences.jsonl');
    await writeFile(filePath, '{not-json}\n', 'utf8');

    await store.recordBatch([createInput({ runId: 'run-append' })], 'manifests/run.json');

    const raw = await readFile(filePath, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"runId":"run-append"');
  });

  it('inserts a newline when the existing file is missing a trailing line break', async () => {
    const store = new ExperienceStore({ outDir, runsDir });
    const taskDir = join(outDir, 'task-0506');
    await mkdir(taskDir, { recursive: true });
    const filePath = join(taskDir, 'experiences.jsonl');
    await writeFile(filePath, '{"runId":"run-old"}', 'utf8');

    await store.recordBatch([createInput({ runId: 'run-new' })], 'manifests/run.json');

    const raw = await readFile(filePath, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"runId":"run-old"');
    expect(lines[1]).toContain('"runId":"run-new"');
  });

  it('skips malformed lines when fetching top experiences', async () => {
    const store = new ExperienceStore({ outDir, runsDir });
    const taskDir = join(outDir, 'task-0506');
    await mkdir(taskDir, { recursive: true });
    const filePath = join(taskDir, 'experiences.jsonl');
    await writeFile(filePath, '{not-json}\n', 'utf8');

    await store.recordBatch([createInput({ runId: 'run-top' })], 'manifests/run.json');

    const top = await store.fetchTop({ domain: 'implementation', limit: 1, taskId: 'task-0506' });
    expect(top).toHaveLength(1);
    expect(top[0]?.runId).toBe('run-top');
  });

  it('fetches top experiences by reward and domain', async () => {
    const store = new ExperienceStore({ outDir, runsDir });
    await store.recordBatch(
      [
        createInput({
          runId: 'run-a',
          reward: { gtScore: 0.2, relativeRank: 0.1 },
          domain: 'implementation'
        }),
        createInput({
          runId: 'run-b',
          reward: { gtScore: 0.8, relativeRank: 0.1 },
          domain: 'implementation',
          summary: 'higher reward summary'
        }),
        createInput({
          runId: 'run-c',
          reward: { gtScore: 0.9, relativeRank: 0.9 },
          domain: 'diagnostics'
        })
      ],
      'manifests/run.json'
    );

    const top = await store.fetchTop({ domain: 'implementation', limit: 1, taskId: 'task-0506' });
    expect(top).toHaveLength(1);
    expect(top[0]?.runId).toBe('run-b');
  });

  it('verifies stamp signatures and rejects invalid entries', async () => {
    const store = new ExperienceStore({ outDir, runsDir });
    const valid = await store.recordBatch([createInput()], 'manifests/run.json');
    expect(store.verifyStamp(valid[0] as ExperienceRecord)).toBe(true);

    await expect(
      store.recordBatch([createInput({ stampSignature: 'not-hex' })], 'manifests/run.json')
    ).rejects.toThrow(/stamp/i);
  });
});
