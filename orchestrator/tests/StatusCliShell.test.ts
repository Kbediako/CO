import { describe, expect, it, vi } from 'vitest';

import { runStatusCliShell } from '../src/cli/statusCliShell.js';

describe('runStatusCliShell', () => {
  it('runs a single status lookup when watch is disabled', async () => {
    const manifest = { run_id: 'run-123', status: 'queued' } as never;
    const orchestrator = {
      status: vi.fn().mockResolvedValue(manifest)
    } as never;

    const result = await runStatusCliShell({
      orchestrator,
      runId: 'run-123',
      watch: false,
      format: 'json',
      interval: 10
    });

    expect(result).toBe(manifest);
    expect(orchestrator.status).toHaveBeenCalledTimes(1);
    expect(orchestrator.status).toHaveBeenCalledWith({
      runId: 'run-123',
      format: 'json'
    });
  });

  it('polls until a terminal manifest is returned when watch is enabled', async () => {
    const queuedManifest = { run_id: 'run-123', status: 'queued' } as never;
    const runningManifest = { run_id: 'run-123', status: 'in_progress' } as never;
    const terminalManifest = { run_id: 'run-123', status: 'succeeded' } as never;
    const orchestrator = {
      status: vi
        .fn()
        .mockResolvedValueOnce(queuedManifest)
        .mockResolvedValueOnce(runningManifest)
        .mockResolvedValueOnce(terminalManifest)
    } as never;
    const delay = vi.fn().mockResolvedValue(undefined);

    const result = await runStatusCliShell(
      {
        orchestrator,
        runId: 'run-123',
        watch: true,
        format: 'text',
        interval: 7
      },
      { delay }
    );

    expect(result).toBe(terminalManifest);
    expect(orchestrator.status).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenNthCalledWith(1, 7000);
    expect(delay).toHaveBeenNthCalledWith(2, 7000);
  });

  it('returns immediately when the first watched status is terminal', async () => {
    const manifest = { run_id: 'run-123', status: 'failed' } as never;
    const orchestrator = {
      status: vi.fn().mockResolvedValue(manifest)
    } as never;
    const delay = vi.fn().mockResolvedValue(undefined);

    const result = await runStatusCliShell(
      {
        orchestrator,
        runId: 'run-123',
        watch: true,
        format: 'text',
        interval: 10
      },
      { delay }
    );

    expect(result).toBe(manifest);
    expect(orchestrator.status).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });
});
