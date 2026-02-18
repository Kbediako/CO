import { describe, expect, it } from 'vitest';

import { __test__ } from '../src/cli/rlmRunner.js';

const { buildCollabSubcallPrompt, parseCollabToolCallsFromJsonl, validateCollabLifecycle } = __test__;
const { isRolePolicyValidationReason, resolveCollabRolePolicy } = __test__;

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

describe('rlmRunner collab lifecycle parsing', () => {
  it('extracts collab tool calls from jsonl output', () => {
    const raw = [
      'not-json',
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        agentType: 'explorer',
        prompt: '[agent_type:explorer]\nFind ownership'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    const parsed = parseCollabToolCallsFromJsonl(raw);
    expect(parsed).toHaveLength(3);
    expect(parsed.map((entry) => entry.tool)).toEqual(['spawn_agent', 'wait', 'close_agent']);
  });
});

describe('rlmRunner collab lifecycle validation', () => {
  it('passes when each spawned agent is waited and closed', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        agentType: 'explorer',
        prompt: '[agent_type:explorer]\nSummarize module responsibilities'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({ ok: true });
  });

  it('passes when item.completed events omit status fields', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', undefined, ['agent-1'], {
        agentType: 'worker',
        prompt: '[agent_type:worker]\nImplement narrow fix'
      }),
      makeCollabLine('item.completed', 'wait', undefined, ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', undefined, ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({ ok: true });
  });

  it('fails when wait is missing for a spawned agent', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        agentType: 'explorer',
        prompt: '[agent_type:explorer]\nTrace this API path'
      }),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason: 'missing wait for spawned agent(s): agent-1',
      reasonCode: 'missing_wait'
    });
  });

  it('fails when close_agent is missing for a spawned agent', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        agentType: 'explorer',
        prompt: '[agent_type:explorer]\nTrace this API path'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason: 'missing close_agent for spawned agent(s): agent-1',
      reasonCode: 'missing_close'
    });
  });

  it('fails when close_agent appears before wait', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        agentType: 'explorer',
        prompt: '[agent_type:explorer]\nTrace this API path'
      }),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason: 'close_agent before wait for agent(s): agent-1',
      reasonCode: 'close_before_wait'
    });
  });

  it('fails fast on thread-limit errors', () => {
    const raw = JSON.stringify({
      type: 'item.failed',
      item: {
        type: 'collab_tool_call',
        tool: 'spawn_agent',
        status: 'failed',
        receiver_thread_ids: [],
        error: 'agent thread limit reached (max 6)'
      }
    });
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason: 'collab spawn hit thread limit',
      reasonCode: 'thread_limit'
    });
  });

  it('does not fail when plain agent message mentions thread limits', () => {
    const raw = JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'agent_message',
        text: 'Avoid errors like agent thread limit reached by closing agents quickly.'
      }
    });
    expect(validateCollabLifecycle(raw)).toEqual({ ok: true });
  });

  it('fails when spawn_agent omits explicit role evidence', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        prompt: 'Analyze this without role marker'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason:
        'missing explicit role for spawn_agent call(s): agent-1. Prefix prompts with [agent_type:<role>] and set spawn_agent.agent_type when supported.',
      reasonCode: 'missing_role'
    });
  });

  it('passes when prompt role tag is present and agent_type is omitted', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        prompt: '[agent_type:explorer]\nAnalyze this'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({ ok: true });
  });

  it('fails when spawn_agent resolves to default role', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        agentType: 'default',
        prompt: '[agent_type:default]\nAnalyze this'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason:
        'spawn_agent used disallowed default role for: agent-1. Set a non-default agent_type explicitly.',
      reasonCode: 'default_role_disallowed'
    });
  });

  it('prioritizes lifecycle failures ahead of role-policy failures', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        prompt: 'No role marker and no explicit agent_type'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason: 'missing close_agent for spawned agent(s): agent-1',
      reasonCode: 'missing_close'
    });
  });

  it('allows default role when explicitly configured', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        agentType: 'default',
        prompt: '[agent_type:default]\nAnalyze this'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw, { allowDefaultRole: true })).toEqual({ ok: true });
  });

  it('skips role-policy enforcement when role checks are disabled', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1'], {
        agentType: 'default',
        prompt: '[agent_type:worker]\nAnalyze this'
      }),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw, { requireSpawnRole: false })).toEqual({ ok: true });
  });
});

describe('rlmRunner collab subcall prompt', () => {
  it('includes explicit spawn/wait/close lifecycle instructions', () => {
    const prompt = buildCollabSubcallPrompt('hello');
    expect(prompt).toContain('1) spawn_agent');
    expect(prompt).toContain('explicit agent_type');
    expect(prompt).toContain('[agent_type:<same-role>]');
    expect(prompt).toContain('2) wait (for that same id)');
    expect(prompt).toContain('3) close_agent (for that same id)');
    expect(prompt).toContain('Never leave spawned agents unclosed');
  });
});

describe('rlmRunner collab role policy helpers', () => {
  it('classifies role-policy validation failures', () => {
    expect(isRolePolicyValidationReason('missing_role')).toBe(true);
    expect(isRolePolicyValidationReason('default_role_disallowed')).toBe(true);
    expect(isRolePolicyValidationReason('role_mismatch')).toBe(true);
    expect(isRolePolicyValidationReason('missing_wait')).toBe(false);
    expect(isRolePolicyValidationReason('thread_limit')).toBe(false);
  });

  it('parses collab role policy values', () => {
    expect(resolveCollabRolePolicy(undefined)).toBe('enforce');
    expect(resolveCollabRolePolicy('warn')).toBe('warn');
    expect(resolveCollabRolePolicy('off')).toBe('off');
    expect(resolveCollabRolePolicy('false')).toBe('off');
    expect(resolveCollabRolePolicy('enforce')).toBe('enforce');
    expect(resolveCollabRolePolicy('strict')).toBe('enforce');
    expect(resolveCollabRolePolicy('unexpected-value')).toBe('enforce');
  });
});
