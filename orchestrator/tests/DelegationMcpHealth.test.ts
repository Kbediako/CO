import { describe, expect, it } from 'vitest';

import {
  cleanupStaleDelegateServerProcesses,
  classifyDelegationTransport,
  formatDelegateServerCleanupSummary,
  inspectDelegateServerProcesses
} from '../src/cli/utils/delegationMcpHealth.js';

describe('delegationMcpHealth', () => {
  it('classifies direct-dist and wrapper delegation transports distinctly', () => {
    expect(
      classifyDelegationTransport({
        source: 'fallback',
        command: '/opt/homebrew/bin/node',
        args: ['/repo/dist/bin/codex-orchestrator.js', 'delegate-server'],
        envVars: {},
        pinnedRepo: '/repo',
        commandLine: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
      })
    ).toMatchObject({ status: 'safe', kind: 'direct-dist' });

    expect(
      classifyDelegationTransport({
        source: 'fallback',
        command: 'codex-orchestrator',
        args: ['delegate-server'],
        envVars: {},
        pinnedRepo: null,
        commandLine: 'codex-orchestrator delegate-server'
      })
    ).toMatchObject({ status: 'unsafe', kind: 'wrapper' });
  });

  it('detects active vs stale delegate-server processes from a process snapshot', () => {
    const snapshot = [
      '101     1 00:20  10240 codex exec --model gpt-5.4 "task"',
      '202   101 00:10   4096 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '303     1 15:00  65536 /opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server',
      '404     1 00:05   2048 zsh -lc codex mcp add delegation -- codex-orchestrator delegate-server'
    ].join('\n');

    const result = inspectDelegateServerProcesses({ snapshot });
    expect(result.activeCount).toBe(1);
    expect(result.activePids).toEqual([202]);
    expect(result.staleCount).toBe(1);
    expect(result.stalePids).toEqual([303]);
  });

  it('formats unavailable cleanup results without claiming a successful apply', () => {
    const lines = formatDelegateServerCleanupSummary({
      status: 'unavailable',
      activeCount: 0,
      staleCount: 0,
      activePids: [],
      stalePids: [],
      staleRssKb: 0,
      thresholdSeconds: 600,
      detail: 'ps failed',
      dryRun: false,
      replacedPids: [],
      terminatedPids: [],
      forcedPids: [],
      remainingPids: []
    });

    expect(lines[0]).toBe('Delegation cleanup: unavailable');
    expect(lines.join('\n')).not.toContain('Run with --yes');
  });

  it('revalidates stale pids and returns partial cleanup results without throwing', async () => {
    const processTable = new Map<number, { ppid: number; elapsedSeconds: number; command: string }>([
      [606, { ppid: 9, elapsedSeconds: 60, command: '/usr/bin/python other-service.py' }],
      [
        505,
        {
          ppid: 1,
          elapsedSeconds: 900,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ],
      [
        404,
        {
          ppid: 1,
          elapsedSeconds: 850,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ],
      [
        303,
        {
          ppid: 1,
          elapsedSeconds: 800,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ],
      [
        202,
        {
          ppid: 1,
          elapsedSeconds: 700,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ]
    ]);
    const signalLog: Array<{ pid: number; signal: string }> = [];
    let waitCount = 0;

    const result = await cleanupStaleDelegateServerProcesses(
      { apply: true },
      {
        inspect: () => ({
          inspection: {
            status: 'stale',
            activeCount: 0,
            staleCount: 5,
            activePids: [],
            stalePids: [606, 505, 404, 303, 202],
            staleRssKb: 0,
            thresholdSeconds: 600,
            detail: 'Detected stale delegate-server processes.'
          },
          staleRecords: [
            {
              pid: 606,
              ppid: 1,
              elapsedSeconds: 950,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            },
            {
              pid: 505,
              ppid: 1,
              elapsedSeconds: 900,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            },
            {
              pid: 404,
              ppid: 1,
              elapsedSeconds: 850,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            },
            {
              pid: 303,
              ppid: 1,
              elapsedSeconds: 800,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            },
            {
              pid: 202,
              ppid: 1,
              elapsedSeconds: 700,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            }
          ]
        }),
        readProcessRecord: (pid) => {
          const record = processTable.get(pid);
          if (!record) {
            return null;
          }
          return { pid, rssKb: 0, ...record };
        },
        isProcessAlive: (pid) => processTable.has(pid),
        tryKillProcess: (pid, signal) => {
          signalLog.push({ pid, signal });
          if (signal === 'SIGTERM') {
            if (pid === 303) {
              processTable.delete(pid);
            }
            return { status: 'signaled' };
          }
          if (pid === 404) {
            return { status: 'blocked', code: 'EPERM', detail: 'blocked by permissions' };
          }
          if (pid === 202) {
            processTable.delete(pid);
          }
          return { status: 'signaled' };
        },
        waitForMs: async () => {
          waitCount += 1;
          if (waitCount === 1) {
            processTable.set(404, {
              ppid: 77,
              elapsedSeconds: 900,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            });
            processTable.set(505, {
              ppid: 77,
              elapsedSeconds: 10,
              command: '/usr/bin/python other-service.py'
            });
          }
        }
      }
    );

    expect(signalLog).toEqual([
      { pid: 505, signal: 'SIGTERM' },
      { pid: 404, signal: 'SIGTERM' },
      { pid: 303, signal: 'SIGTERM' },
      { pid: 202, signal: 'SIGTERM' },
      { pid: 404, signal: 'SIGKILL' },
      { pid: 202, signal: 'SIGKILL' }
    ]);
    expect(result.replacedPids).toEqual([606, 505]);
    expect(result.terminatedPids).toEqual([303, 202]);
    expect(result.forcedPids).toEqual([202]);
    expect(result.remainingPids).toEqual([404]);
  });

  it('rechecks blocked stale pids before reporting them as remaining', async () => {
    const processTable = new Map<number, { ppid: number; elapsedSeconds: number; command: string }>([
      [
        404,
        {
          ppid: 1,
          elapsedSeconds: 850,
          command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
        }
      ]
    ]);
    const signalLog: Array<{ pid: number; signal: string }> = [];
    let waitCount = 0;

    const result = await cleanupStaleDelegateServerProcesses(
      { apply: true },
      {
        inspect: () => ({
          inspection: {
            status: 'stale',
            activeCount: 0,
            staleCount: 1,
            activePids: [],
            stalePids: [404],
            staleRssKb: 0,
            thresholdSeconds: 600,
            detail: 'Detected stale delegate-server processes.'
          },
          staleRecords: [
            {
              pid: 404,
              ppid: 1,
              elapsedSeconds: 850,
              rssKb: 0,
              command: '/opt/homebrew/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server'
            }
          ]
        }),
        readProcessRecord: (pid) => {
          const record = processTable.get(pid);
          if (!record) {
            return null;
          }
          return { pid, rssKb: 0, ...record };
        },
        isProcessAlive: (pid) => processTable.has(pid),
        tryKillProcess: (pid, signal) => {
          signalLog.push({ pid, signal });
          return { status: 'blocked', code: 'EPERM', detail: 'blocked by permissions' };
        },
        waitForMs: async () => {
          waitCount += 1;
          if (waitCount === 1) {
            processTable.delete(404);
          }
        }
      }
    );

    expect(signalLog).toEqual([{ pid: 404, signal: 'SIGTERM' }]);
    expect(result.replacedPids).toEqual([]);
    expect(result.terminatedPids).toEqual([404]);
    expect(result.forcedPids).toEqual([]);
    expect(result.remainingPids).toEqual([]);
  });
});
