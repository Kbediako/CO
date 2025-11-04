import { describe, expect, it, vi } from 'vitest';
import {
  ApprovalDeniedError,
  ApprovalRequiredError,
  SandboxRetryableError,
  ToolInvocationFailedError,
  ToolOrchestrator,
  type ApprovalGrant,
  type ApprovalCache,
  type ApprovalPrompter
} from '../src/tool-orchestrator.js';

function createMemoryApprovalCache(initial: Record<string, ApprovalGrant> = {}): ApprovalCache & {
  snapshot: () => Map<string, ApprovalGrant>;
} {
  const store = new Map<string, ApprovalGrant>(Object.entries(initial));
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    snapshot: () => store
  };
}

describe('ToolOrchestrator', () => {
  it('reuses cached approvals without prompting', async () => {
    const cache = createMemoryApprovalCache({
      'shell:ls': { granted: true, timestamp: '2025-01-01T00:00:00Z' }
    });
    const prompter: ApprovalPrompter = {
      requestApproval: vi.fn()
    };
    const orchestrator = new ToolOrchestrator({
      approvalCache: cache,
      approvalPrompter: prompter
    });

    const result = await orchestrator.invoke({
      id: 'run-001',
      tool: 'shell',
      approvalRequired: true,
      approvalKey: 'shell:ls',
      run: async () => 'done'
    });

    expect(result.output).toBe('done');
    expect(result.record.approvalSource).toBe('cache');
    expect(prompter.requestApproval).not.toHaveBeenCalled();
  });

  it('requests approval once and caches the grant for subsequent invocations', async () => {
    const cache = createMemoryApprovalCache();
    const prompter: ApprovalPrompter = {
      requestApproval: vi.fn(async () => ({ granted: true }))
    };
    const orchestrator = new ToolOrchestrator({
      approvalCache: cache,
      approvalPrompter: prompter
    });

    const first = await orchestrator.invoke({
      id: 'run-002',
      tool: 'shell',
      approvalRequired: true,
      approvalKey: 'shell:rm',
      run: async () => 'first'
    });
    expect(first.record.approvalSource).toBe('prompt');
    expect(prompter.requestApproval).toHaveBeenCalledTimes(1);

    const second = await orchestrator.invoke({
      id: 'run-003',
      tool: 'shell',
      approvalRequired: true,
      approvalKey: 'shell:rm',
      run: async () => 'second'
    });
    expect(second.record.approvalSource).toBe('cache');
    expect(prompter.requestApproval).toHaveBeenCalledTimes(1);
    expect(cache.snapshot().get('shell:rm')?.granted).toBe(true);
  });

  it('throws when policy forbids prompting for approval and cache is empty', async () => {
    const cache = createMemoryApprovalCache();
    const prompter: ApprovalPrompter = {
      requestApproval: vi.fn()
    };
    const orchestrator = new ToolOrchestrator({
      approvalPolicy: 'never',
      approvalCache: cache,
      approvalPrompter: prompter
    });

    await expect(
      orchestrator.invoke({
        id: 'run-004',
        tool: 'shell',
        approvalRequired: true,
        approvalKey: 'shell:rm -rf /',
        run: async () => 'never'
      })
    ).rejects.toBeInstanceOf(ApprovalRequiredError);
    expect(prompter.requestApproval).not.toHaveBeenCalled();
  });

  it('retries sandbox failures up to the configured limit with exponential backoff', async () => {
    const delays: number[] = [];
    let attempt = 0;
    const now = createSequencedNow();
    const orchestrator = new ToolOrchestrator({
      wait: async (ms) => {
        delays.push(ms);
      },
      now
    });

    const result = await orchestrator.invoke({
      id: 'run-005',
      tool: 'shell',
      run: async () => {
        attempt += 1;
        if (attempt < 3) {
          throw new SandboxRetryableError(`sandbox denied on attempt ${attempt}`, 'escalated');
        }
        return `attempt-${attempt}`;
      },
      sandbox: {
        onRetry: ({ attempt: retryAttempt }) => {
          expect(retryAttempt).toBeLessThanOrEqual(2);
        }
      }
    });

    expect(result.output).toBe('attempt-3');
    expect(result.record.retryCount).toBe(2);
    expect(result.record.attemptCount).toBe(3);
    expect(result.record.sandboxState).toBe('escalated');
    expect(delays).toEqual([250, 500]);
  });

  it('surfaces failure metadata when attempts are exhausted', async () => {
    const orchestrator = new ToolOrchestrator({
      wait: async () => {},
      now: createSequencedNow()
    });

    await expect(
      orchestrator.invoke({
        id: 'run-006',
        tool: 'shell',
        run: async () => {
          throw new SandboxRetryableError('still blocked', 'escalated');
        }
      })
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ToolInvocationFailedError)) {
        return false;
      }
      expect(error.record.retryCount).toBe(2);
      expect(error.record.attemptCount).toBe(3);
      expect(error.record.sandboxState).toBe('escalated');
      expect(error.record.status).toBe('failed');
      return true;
    });
  });

  it('does not retry non-sandbox errors', async () => {
    const orchestrator = new ToolOrchestrator({
      wait: async () => {
        throw new Error('wait should not be called');
      }
    });

    await expect(
      orchestrator.invoke({
        id: 'run-007',
        tool: 'shell',
        run: async () => {
          throw new Error('fatal');
        }
      })
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof ToolInvocationFailedError)) {
        return false;
      }
      expect(error.record.retryCount).toBe(0);
      expect(error.record.attemptCount).toBe(1);
      expect(error.record.status).toBe('failed');
      return true;
    });
  });

  it('throws when approval is denied by the prompter', async () => {
    const cache = createMemoryApprovalCache();
    const prompter: ApprovalPrompter = {
      requestApproval: vi.fn(async () => ({ granted: false }))
    };
    const orchestrator = new ToolOrchestrator({
      approvalCache: cache,
      approvalPrompter: prompter
    });

    await expect(
      orchestrator.invoke({
        id: 'run-008',
        tool: 'shell',
        approvalRequired: true,
        approvalKey: 'shell:danger',
        run: async () => 'nope'
      })
    ).rejects.toBeInstanceOf(ApprovalDeniedError);
    expect(prompter.requestApproval).toHaveBeenCalledTimes(1);
  });
});

function createSequencedNow(start = Date.parse('2025-01-01T00:00:00.000Z')): () => Date {
  let index = 0;
  return () => new Date(start + index++ * 1000);
}
