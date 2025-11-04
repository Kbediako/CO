import { describe, expect, it, vi } from 'vitest';

import { createNotificationSink } from '../src/notifications/index.js';
import type { RunSummaryEvent } from '../../shared/events/types.js';

describe('NotificationSink', () => {
  it('respects CLI > env > config precedence', () => {
    const sinkCli = createNotificationSink({
      targets: ['https://cli.example']
    });
    expect(sinkCli.targets).toEqual(['https://cli.example']);

    const sinkEnv = createNotificationSink({
      envTargets: ['https://env.example'],
      configTargets: ['https://config.example']
    });
    expect(sinkEnv.targets).toEqual(['https://env.example']);

    const sinkConfig = createNotificationSink({
      configTargets: ['https://config.example']
    });
    expect(sinkConfig.targets).toEqual(['https://config.example']);
  });

  it('returns delivery outcome without throwing on failures', async () => {
    const dispatcher = vi.fn(async (target: string) => {
      if (target.includes('fail')) {
        throw new Error('boom');
      }
    });

    const sink = createNotificationSink({
      targets: ['https://ok.example', 'https://fail.example'],
      dispatcher,
      logger: { warn: vi.fn() }
    });

    const summary: RunSummaryEvent = {
      type: 'run:summary',
      timestamp: '2025-11-04T00:00:00.000Z',
      payload: {
        status: 'succeeded',
        run: {
          id: 'run-1',
          taskId: 'task',
          pipelineId: 'exec',
          manifest: 'manifest.json',
          artifactRoot: '.runs',
          summary: 'done'
        },
        result: {
          exitCode: 0,
          signal: null,
          durationMs: 10,
          status: 'succeeded',
          sandboxState: 'sandboxed',
          correlationId: 'corr',
          attempts: 1
        },
        command: {
          argv: ['npm'],
          shell: 'npm',
          cwd: null,
          sessionId: 's',
          persisted: false
        },
        outputs: { stdout: '', stderr: '' },
        logs: { runner: 'runner', command: 'command' },
        toolRun: null,
        notifications: { targets: [], delivered: [], failures: [] }
      }
    };

    const result = await sink.notify(summary);
    expect(result.delivered).toEqual(['https://ok.example']);
    expect(result.failures).toEqual([{ target: 'https://fail.example', error: 'boom' }]);
  });
});
