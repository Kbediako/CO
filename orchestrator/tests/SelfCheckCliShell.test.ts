import { describe, expect, it, vi } from 'vitest';

import { runSelfCheckCliShell } from '../src/cli/selfCheckCliShell.js';

const MOCK_VERSION = '9.9.9-test';

describe('runSelfCheckCliShell', () => {
  it('emits text output in the expected field order', async () => {
    const log = vi.fn();

    await runSelfCheckCliShell({
      format: 'text',
      buildResult: () => ({
        status: 'ok',
        name: '@kbediako/codex-orchestrator',
        version: MOCK_VERSION,
        node: 'v22.0.0',
        timestamp: '2026-03-17T13:29:19.000Z'
      }),
      log
    });

    expect(log.mock.calls).toEqual([
      ['Status: ok'],
      ['Name: @kbediako/codex-orchestrator'],
      [`Version: ${MOCK_VERSION}`],
      ['Node: v22.0.0'],
      ['Timestamp: 2026-03-17T13:29:19.000Z']
    ]);
  });

  it('emits pretty JSON output', async () => {
    const log = vi.fn();

    await runSelfCheckCliShell({
      format: 'json',
      buildResult: () => ({
        status: 'ok',
        name: '@kbediako/codex-orchestrator',
        version: MOCK_VERSION,
        node: 'v22.0.0',
        timestamp: '2026-03-17T13:29:19.000Z'
      }),
      log
    });

    expect(log).toHaveBeenCalledWith(`{
  "status": "ok",
  "name": "@kbediako/codex-orchestrator",
  "version": "${MOCK_VERSION}",
  "node": "v22.0.0",
  "timestamp": "2026-03-17T13:29:19.000Z"
}`);
  });
});
