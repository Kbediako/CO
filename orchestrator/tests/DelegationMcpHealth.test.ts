import { describe, expect, it } from 'vitest';

import {
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
      terminatedPids: [],
      forcedPids: [],
      remainingPids: []
    });

    expect(lines[0]).toBe('Delegation cleanup: unavailable');
    expect(lines.join('\n')).not.toContain('Run with --yes');
  });
});
