import type { ApprovalSource, SandboxState, ToolRunRecord } from '../../shared/manifest/types.js';

export type ApprovalPolicy = 'never' | 'on-request' | 'auto' | string;

export interface ApprovalGrant {
  granted: boolean;
  reason?: string;
  timestamp?: string;
}

export interface ApprovalCache {
  get(key: string): ApprovalGrant | undefined;
  set(key: string, value: ApprovalGrant): void;
}

export interface ToolApprovalContext {
  toolId: string;
  description?: string;
}

export interface ApprovalPrompter {
  requestApproval(key: string, context: ToolApprovalContext): Promise<ApprovalGrant>;
}

export interface SandboxRetryDecision {
  retry: boolean;
  nextState?: SandboxState;
}

export interface SandboxRetryContext {
  attempt: number;
  delayMs: number;
  sandboxState: SandboxState;
  error: unknown;
}

export interface ToolSandboxOptions {
  initialState?: SandboxState;
  classifyError?: (error: unknown) => SandboxRetryDecision;
  onRetry?: (context: SandboxRetryContext) => void | Promise<void>;
}

export interface ToolAttemptContext {
  attempt: number;
  sandboxState: SandboxState;
}

export interface ToolInvocation<TOutput = unknown> {
  id: string;
  tool: string;
  description?: string;
  approvalRequired?: boolean;
  approvalKey?: string;
  run: (context: ToolAttemptContext) => Promise<TOutput>;
  sandbox?: ToolSandboxOptions;
  metadata?: Record<string, unknown>;
}

export interface ToolInvocationResult<TOutput> {
  output: TOutput;
  record: ToolRunRecord;
}

export interface ToolOrchestratorOptions {
  approvalPolicy?: ApprovalPolicy;
  approvalCache?: ApprovalCache;
  approvalPrompter?: ApprovalPrompter;
  maxAttempts?: number;
  initialBackoffMs?: number;
  wait?: (ms: number) => Promise<void>;
  now?: () => Date;
}

export class SandboxRetryableError extends Error {
  constructor(
    message: string,
    public readonly nextState: SandboxState | undefined = undefined
  ) {
    super(message);
    this.name = 'SandboxRetryableError';
  }
}

export class ApprovalRequiredError extends Error {
  constructor(
    message: string,
    public readonly context: ToolApprovalContext,
    public readonly policy: ApprovalPolicy
  ) {
    super(message);
    this.name = 'ApprovalRequiredError';
  }
}

export class ApprovalDeniedError extends Error {
  constructor(message: string, public readonly context: ToolApprovalContext) {
    super(message);
    this.name = 'ApprovalDeniedError';
  }
}

export class ToolInvocationFailedError extends Error {
  constructor(message: string, public readonly record: ToolRunRecord, public readonly cause: unknown) {
    super(message);
    this.name = 'ToolInvocationFailedError';
  }
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 250;

export class ToolOrchestrator {
  private readonly approvalPolicy: ApprovalPolicy;
  private readonly approvalCache?: ApprovalCache;
  private readonly approvalPrompter?: ApprovalPrompter;
  private readonly maxAttempts: number;
  private readonly initialBackoffMs: number;
  private readonly wait: (ms: number) => Promise<void>;
  private readonly now: () => Date;

  constructor(options: ToolOrchestratorOptions = {}) {
    this.approvalPolicy = options.approvalPolicy ?? 'on-request';
    this.approvalCache = options.approvalCache;
    this.approvalPrompter = options.approvalPrompter;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.initialBackoffMs = Math.max(0, options.initialBackoffMs ?? DEFAULT_BACKOFF_MS);
    this.wait =
      options.wait ??
      ((ms) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, ms);
        }));
    this.now = options.now ?? (() => new Date());
  }

  async invoke<TOutput>(invocation: ToolInvocation<TOutput>): Promise<ToolInvocationResult<TOutput>> {
    if (!invocation.id) {
      throw new Error('Tool invocation id is required.');
    }
    if (!invocation.tool) {
      throw new Error('Tool invocation tool name is required.');
    }

    const approvalSource = await this.resolveApproval(invocation);
    let sandboxState: SandboxState = invocation.sandbox?.initialState ?? 'sandboxed';
    const startedAt = this.now().toISOString();

    let attempt = 1;
    let lastError: unknown = null;

    while (attempt <= this.maxAttempts) {
      try {
        const output = await invocation.run({ attempt, sandboxState });
        const completedAt = this.now().toISOString();
        const record = this.createRecord(invocation, approvalSource, sandboxState, attempt, completedAt, startedAt, 'succeeded');
        return { output, record };
      } catch (error: unknown) {
        lastError = error;

        const decision = this.classifySandboxDecision(invocation.sandbox, error);
        const reachedMaxAttempts = attempt >= this.maxAttempts;
        if (!decision.retry || reachedMaxAttempts) {
          const completedAt = this.now().toISOString();
          const record = this.createRecord(invocation, approvalSource, decision.nextState ?? sandboxState, attempt, completedAt, startedAt, 'failed');
          throw new ToolInvocationFailedError(
            `Tool invocation ${invocation.id} failed after ${attempt} attempt${attempt === 1 ? '' : 's'}.`,
            record,
            error
          );
        }

        const delay = this.initialBackoffMs * 2 ** (attempt - 1);
        await invocation.sandbox?.onRetry?.({
          attempt,
          delayMs: delay,
          sandboxState,
          error
        });
        await this.wait(delay);
        sandboxState = decision.nextState ?? sandboxState;
        attempt += 1;
      }
    }

    // This branch is defensive; the loop should always return or throw earlier.
    throw lastError instanceof Error ? lastError : new Error('Tool invocation aborted unexpectedly.');
  }

  private async resolveApproval(invocation: ToolInvocation): Promise<ApprovalSource> {
    if (!invocation.approvalRequired) {
      return 'not-required';
    }
    if (!invocation.approvalKey) {
      throw new Error(`Tool invocation ${invocation.id} requires an approvalKey when approvalRequired is true.`);
    }

    const context: ToolApprovalContext = {
      toolId: invocation.tool,
      description: invocation.description
    };

    const cached = this.approvalCache?.get(invocation.approvalKey);
    if (cached?.granted) {
      return 'cache';
    }

    if (this.approvalPolicy === 'never') {
      throw new ApprovalRequiredError(
        `Approval required for ${invocation.tool} but approval policy forbids new prompts.`,
        context,
        this.approvalPolicy
      );
    }

    if (!this.approvalPrompter) {
      throw new ApprovalRequiredError(
        `Approval required for ${invocation.tool} but no approval prompter is available.`,
        context,
        this.approvalPolicy
      );
    }

    const grant = await this.approvalPrompter.requestApproval(invocation.approvalKey, context);
    if (!grant.granted) {
      throw new ApprovalDeniedError(`Approval denied for ${invocation.tool}.`, context);
    }

    const stampedGrant: ApprovalGrant = {
      ...grant,
      granted: true,
      timestamp: grant.timestamp ?? this.now().toISOString()
    };
    this.approvalCache?.set(invocation.approvalKey, stampedGrant);
    return 'prompt';
  }

  private classifySandboxDecision(
    sandbox: ToolSandboxOptions | undefined,
    error: unknown
  ): SandboxRetryDecision {
    const decision = sandbox?.classifyError?.(error);
    if (decision) {
      return decision;
    }
    if (error instanceof SandboxRetryableError) {
      return { retry: true, nextState: error.nextState };
    }
    return { retry: false };
  }

  private createRecord(
    invocation: ToolInvocation,
    approvalSource: ApprovalSource,
    sandboxState: SandboxState,
    attemptCount: number,
    completedAt: string,
    startedAt: string,
    status: ToolRunRecord['status']
  ): ToolRunRecord {
    const metadata = invocation.metadata ? { ...invocation.metadata } : undefined;
    return {
      id: invocation.id,
      tool: invocation.tool,
      approvalSource,
      retryCount: Math.max(0, attemptCount - 1),
      sandboxState,
      status,
      startedAt,
      completedAt,
      attemptCount,
      ...(metadata ? { metadata } : {})
    };
  }
}
