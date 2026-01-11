import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ControlWatcher } from '../src/cli/control/controlWatcher.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import type { RunEventStreamEntry } from '../src/cli/events/runEventStream.js';
import type { CliManifest } from '../src/cli/types.js';

async function createRunRoot(taskId: string) {
  const root = await mkdtemp(join(tmpdir(), 'control-watcher-'));
  const env = { repoRoot: root, runsRoot: join(root, '.runs'), outRoot: join(root, 'out'), taskId };
  const paths = resolveRunPaths(env, 'run-1');
  await mkdir(paths.runDir, { recursive: true });
  return { root, env, paths };
}

describe('ControlWatcher', () => {
  it('emits security_violation and ignores actions containing confirm_nonce', async () => {
    const { root, paths } = await createRunRoot('task-0940');
    await writeFile(
      paths.controlPath,
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          request_id: 'req-1',
          requested_by: 'user',
          requested_at: '2026-01-01T00:00:00Z',
          action: 'pause',
          reason: 'awaiting_question_answer',
          confirm_nonce: 'bad'
        }
      }),
      'utf8'
    );

    const manifest = {
      run_id: 'run-1',
      task_id: 'task-0940',
      status: 'in_progress',
      status_detail: null,
      started_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    } as CliManifest;

    const events: RunEventStreamEntry[] = [];
    const eventStream = {
      append: async (entry: { event: string; actor: string; payload: Record<string, unknown> }) => {
        const record: RunEventStreamEntry = {
          schema_version: 1,
          seq: events.length + 1,
          timestamp: '2026-01-01T00:00:00Z',
          task_id: 'task-0940',
          run_id: 'run-1',
          event: entry.event,
          actor: entry.actor,
          payload: entry.payload
        };
        events.push(record);
        return record;
      },
      close: async () => undefined
    } as unknown as import('../src/cli/events/runEventStream.js').RunEventStream;

    let persisted = false;
    const watcher = new ControlWatcher({
      paths,
      manifest,
      eventStream,
      persist: async () => {
        persisted = true;
      },
      now: () => '2026-01-01T00:00:00Z'
    });

    try {
      await watcher.sync();

      expect(persisted).toBe(false);
      expect(manifest.status_detail ?? null).toBeNull();

      const securityEvent = events.find((entry) => entry.event === 'security_violation');
      expect(securityEvent).toBeTruthy();
      expect(securityEvent?.payload).toMatchObject({
        kind: 'confirm_nonce_present'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('emits security_violation for confirmNonce variants', async () => {
    const { root, paths } = await createRunRoot('task-0940');
    await writeFile(
      paths.controlPath,
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          request_id: 'req-2',
          requested_by: 'user',
          requested_at: '2026-01-01T00:00:00Z',
          action: 'resume',
          reason: 'manual',
          confirmNonce: 'bad'
        }
      }),
      'utf8'
    );

    const manifest = {
      run_id: 'run-1',
      task_id: 'task-0940',
      status: 'in_progress',
      status_detail: null,
      started_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    } as CliManifest;

    const events: RunEventStreamEntry[] = [];
    const eventStream = {
      append: async (entry: { event: string; actor: string; payload: Record<string, unknown> }) => {
        const record: RunEventStreamEntry = {
          schema_version: 1,
          seq: events.length + 1,
          timestamp: '2026-01-01T00:00:00Z',
          task_id: 'task-0940',
          run_id: 'run-1',
          event: entry.event,
          actor: entry.actor,
          payload: entry.payload
        };
        events.push(record);
        return record;
      },
      close: async () => undefined
    } as unknown as import('../src/cli/events/runEventStream.js').RunEventStream;

    const watcher = new ControlWatcher({
      paths,
      manifest,
      eventStream,
      persist: async () => undefined,
      now: () => '2026-01-01T00:00:00Z'
    });

    try {
      await watcher.sync();
      const securityEvent = events.find((entry) => entry.event === 'security_violation');
      expect(securityEvent).toBeTruthy();
      expect(securityEvent?.payload).toMatchObject({
        kind: 'confirm_nonce_present'
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not throw when event stream append fails', async () => {
    const { root, paths } = await createRunRoot('task-0940');
    await writeFile(
      paths.controlPath,
      JSON.stringify({
        run_id: 'run-1',
        control_seq: 1,
        latest_action: {
          request_id: 'req-1',
          requested_by: 'user',
          requested_at: '2026-01-01T00:00:00Z',
          action: 'pause',
          reason: 'awaiting_question_answer',
          confirm_nonce: 'bad'
        }
      }),
      'utf8'
    );

    const manifest = {
      run_id: 'run-1',
      task_id: 'task-0940',
      status: 'in_progress',
      status_detail: null,
      started_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    } as CliManifest;

    let persisted = false;
    const eventStream = {
      append: async () => {
        throw new Error('append failed');
      },
      close: async () => undefined
    } as unknown as import('../src/cli/events/runEventStream.js').RunEventStream;

    const watcher = new ControlWatcher({
      paths,
      manifest,
      eventStream,
      persist: async () => {
        persisted = true;
      },
      now: () => '2026-01-01T00:00:00Z'
    });

    try {
      await expect(watcher.sync()).resolves.toBeUndefined();
      expect(persisted).toBe(false);
      expect(manifest.status_detail ?? null).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
