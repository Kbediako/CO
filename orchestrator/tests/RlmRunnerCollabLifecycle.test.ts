import { describe, expect, it } from 'vitest';

import { __test__ } from '../src/cli/rlmRunner.js';

const { buildCollabSubcallPrompt, parseCollabToolCallsFromJsonl, validateCollabLifecycle } = __test__;

function makeCollabLine(
  type: 'item.started' | 'item.updated' | 'item.completed',
  tool: 'spawn_agent' | 'wait' | 'close_agent',
  status: 'in_progress' | 'completed' | 'failed' | undefined,
  receiverIds: string[]
): string {
  return JSON.stringify({
    type,
    item: {
      type: 'collab_tool_call',
      tool,
      ...(status ? { status } : {}),
      receiver_thread_ids: receiverIds
    }
  });
}

describe('rlmRunner collab lifecycle parsing', () => {
  it('extracts collab tool calls from jsonl output', () => {
    const raw = [
      'not-json',
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1']),
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
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({ ok: true });
  });

  it('passes when item.completed events omit status fields', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', undefined, ['agent-1']),
      makeCollabLine('item.completed', 'wait', undefined, ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', undefined, ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({ ok: true });
  });

  it('fails when wait is missing for a spawned agent', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason: 'missing wait for spawned agent(s): agent-1'
    });
  });

  it('fails when close_agent is missing for a spawned agent', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason: 'missing close_agent for spawned agent(s): agent-1'
    });
  });

  it('fails when close_agent appears before wait', () => {
    const raw = [
      makeCollabLine('item.completed', 'spawn_agent', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'close_agent', 'completed', ['agent-1']),
      makeCollabLine('item.completed', 'wait', 'completed', ['agent-1'])
    ].join('\n');
    expect(validateCollabLifecycle(raw)).toEqual({
      ok: false,
      reason: 'close_agent before wait for agent(s): agent-1'
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
      reason: 'collab spawn hit thread limit'
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
});

describe('rlmRunner collab subcall prompt', () => {
  it('includes explicit spawn/wait/close lifecycle instructions', () => {
    const prompt = buildCollabSubcallPrompt('hello');
    expect(prompt).toContain('1) spawn_agent');
    expect(prompt).toContain('2) wait (for that same id)');
    expect(prompt).toContain('3) close_agent (for that same id)');
    expect(prompt).toContain('Never leave spawned agents unclosed');
  });
});
