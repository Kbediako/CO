import { describe, expect, it, vi } from 'vitest';

import {
  COLLAB_FEATURE_LEGACY,
  createRlmCodexRuntimeShell
} from '../src/cli/rlm/rlmCodexRuntimeShell.js';

function makeCollabLine(
  type: 'item.started' | 'item.updated' | 'item.completed',
  tool: 'spawn_agent' | 'wait' | 'close_agent',
  status: 'in_progress' | 'completed' | 'failed' | undefined,
  receiverIds: string[],
  options: { prompt?: string; agentType?: string } = {}
): string {
  return JSON.stringify({
    type,
    item: {
      type: 'collab_tool_call',
      tool,
      ...(status ? { status } : {}),
      ...(typeof options.prompt === 'string' ? { prompt: options.prompt } : {}),
      ...(typeof options.agentType === 'string' ? { agent_type: options.agentType } : {}),
      receiver_thread_ids: receiverIds
    }
  });
}

describe('rlmCodexRuntimeShell', () => {
  it('caches runtime context and shapes exec env', async () => {
    const createRuntimeContextImpl = vi.fn(async () => ({ runtime: { provider: 'CliRuntimeProvider' } }) as never);
    const resolveRuntimeCommandImpl = vi.fn((args: string[]) => ({ command: 'codex', args }));
    const formatRuntimeSelectionSummaryImpl = vi.fn(() => 'provider=CliRuntimeProvider');
    const execRunner = vi
      .fn<
        (request: {
          command: string;
          args: string[];
          cwd: string;
          env: NodeJS.ProcessEnv;
          mirrorOutput: boolean;
        }) => Promise<{ stdout: string; stderr: string }>
      >()
      .mockResolvedValue({ stdout: 'ok', stderr: '' });
    const log = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

    const shell = createRlmCodexRuntimeShell({
      env: { CODEX_ORCHESTRATOR_RUN_ID: 'rlm-test' },
      repoRoot: '/repo',
      createRuntimeContextImpl,
      resolveRuntimeCommandImpl: resolveRuntimeCommandImpl as never,
      formatRuntimeSelectionSummaryImpl,
      execRunner,
      log
    });

    await shell.runCompletion('first prompt', {
      nonInteractive: true,
      subagentsEnabled: true,
      mirrorOutput: false
    });
    await shell.runCompletion('second prompt', {
      nonInteractive: false,
      subagentsEnabled: false,
      mirrorOutput: false
    });

    expect(createRuntimeContextImpl).toHaveBeenCalledTimes(1);
    expect(formatRuntimeSelectionSummaryImpl).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledTimes(1);
    expect(resolveRuntimeCommandImpl).toHaveBeenNthCalledWith(
      1,
      ['exec', 'first prompt'],
      expect.anything()
    );

    const firstRequest = execRunner.mock.calls[0]?.[0];
    expect(firstRequest?.command).toBe('codex');
    expect(firstRequest?.args).toEqual(['exec', 'first prompt']);
    expect(firstRequest?.cwd).toBe('/repo');
    expect(firstRequest?.env.CODEX_NON_INTERACTIVE).toBe('1');
    expect(firstRequest?.env.CODEX_NO_INTERACTIVE).toBe('1');
    expect(firstRequest?.env.CODEX_INTERACTIVE).toBe('0');
    expect(firstRequest?.env.CODEX_SUBAGENTS).toBe('1');

    const secondRequest = execRunner.mock.calls[1]?.[0];
    expect(secondRequest?.env.CODEX_SUBAGENTS).toBe('0');
    expect(secondRequest?.env.CODEX_NON_INTERACTIVE).toBeUndefined();
  });

  it('returns the last agent message and warns for role-policy failures in warn mode', async () => {
    const execRunner = vi.fn().mockResolvedValue({
      stdout: [
        makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
          agentType: 'default',
          prompt: '[agent_type:default]\nAnalyze this'
        }),
        makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
        makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1']),
        JSON.stringify({
          type: 'item.updated',
          item: { type: 'agent_message', text: 'intermediate response' }
        }),
        JSON.stringify({
          type: 'item.completed',
          item: { type: 'agent_message', text: 'final response' }
        })
      ].join('\n'),
      stderr: 'unused stderr'
    });
    const log = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

    const shell = createRlmCodexRuntimeShell({
      env: {},
      repoRoot: '/repo',
      createRuntimeContextImpl: vi.fn(async () => ({ runtime: { provider: 'CliRuntimeProvider' } }) as never),
      resolveRuntimeCommandImpl: vi.fn((args: string[]) => ({ command: 'codex', args })) as never,
      formatRuntimeSelectionSummaryImpl: vi.fn(() => 'provider=CliRuntimeProvider'),
      execRunner,
      log
    });

    await expect(
      shell.runJsonlCompletion('prompt', {
        nonInteractive: false,
        mirrorOutput: false,
        validateCollabLifecycle: true,
        collabRolePolicy: 'warn'
      })
    ).resolves.toBe('final response');

    expect(log.warn).toHaveBeenCalledWith(
      'Collab lifecycle validation warning: spawn_agent used disallowed default role for: agent-1. Set a non-default agent_type explicitly.'
    );
  });

  it('throws for non-role lifecycle failures during jsonl completion', async () => {
    const execRunner = vi.fn().mockResolvedValue({
      stdout: [
        makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
          agentType: 'explorer',
          prompt: '[agent_type:explorer]\nAnalyze this'
        }),
        makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
      ].join('\n'),
      stderr: ''
    });

    const shell = createRlmCodexRuntimeShell({
      env: {},
      repoRoot: '/repo',
      createRuntimeContextImpl: vi.fn(async () => ({ runtime: { provider: 'CliRuntimeProvider' } }) as never),
      resolveRuntimeCommandImpl: vi.fn((args: string[]) => ({ command: 'codex', args })) as never,
      formatRuntimeSelectionSummaryImpl: vi.fn(() => 'provider=CliRuntimeProvider'),
      execRunner
    });

    await expect(
      shell.runJsonlCompletion('prompt', {
        nonInteractive: false,
        mirrorOutput: false,
        validateCollabLifecycle: true,
        collabRolePolicy: 'warn'
      })
    ).rejects.toThrow(
      'Collab lifecycle validation failed: missing wait for spawned agent(s): agent-1'
    );
  });

  it('falls back to the legacy collab feature key when features listing fails', async () => {
    const log = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    const shell = createRlmCodexRuntimeShell({
      env: {},
      repoRoot: '/repo',
      createRuntimeContextImpl: vi.fn(async () => ({ runtime: { provider: 'CliRuntimeProvider' } }) as never),
      resolveRuntimeCommandImpl: vi.fn((args: string[]) => ({ command: 'codex', args })) as never,
      formatRuntimeSelectionSummaryImpl: vi.fn(() => 'provider=CliRuntimeProvider'),
      execRunner: vi.fn().mockRejectedValue(new Error('features unavailable')),
      log
    });

    await expect(shell.resolveCollabFeatureKey(false)).resolves.toBe(COLLAB_FEATURE_LEGACY);
    expect(log.debug).toHaveBeenCalledWith(
      'Unable to resolve Codex collab feature key via `codex features list`: features unavailable'
    );
  });
});
