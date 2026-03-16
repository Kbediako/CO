import type { McpRequest } from './delegationServerTransport.js';

export type DelegationMode = 'full' | 'question_only' | 'status_only';

export interface DelegationServerToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface DelegationServerToolCallContext {
  repoRoot: string;
  mode: DelegationMode;
  allowNested: boolean;
  githubEnabled: boolean;
  allowedGithubOps: Set<string>;
  allowedRoots: string[];
  allowedHosts: string[];
  toolProfile: string[];
  expiryFallback: 'pause' | 'resume' | 'fail';
}

type GithubToolName =
  | 'github.open_pr'
  | 'github.comment'
  | 'github.review'
  | 'github.get_checks'
  | 'github.merge';

type CoordinatorDynamicToolName =
  | 'coordinator.status'
  | 'coordinator.pause'
  | 'coordinator.resume'
  | 'coordinator.cancel';

interface DelegationServerToolDispatchDeps {
  asRecord(value: unknown): Record<string, unknown>;
  readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined;
  containsSecret(input: Record<string, unknown>, key: string): boolean;
  reportSecurityViolation(
    code: string,
    message: string,
    toolName: string,
    allowedHosts: string[]
  ): Promise<void>;
  getDelegateModeViolationMessage(mode: DelegationMode, toolName: string): string | null;
  handleDelegateStatus(input: Record<string, unknown>, allowedRoots: string[], allowedHosts: string[]): Promise<unknown>;
  handleDelegatePause(input: Record<string, unknown>, allowedRoots: string[], allowedHosts: string[]): Promise<unknown>;
  handleDelegateCancel(
    input: Record<string, unknown>,
    request: McpRequest,
    allowedRoots: string[],
    allowedHosts: string[]
  ): Promise<unknown>;
  handleDelegateSpawn(
    input: Record<string, unknown>,
    repoRoot: string,
    allowNested: boolean,
    allowedRoots: string[],
    allowedHosts: string[],
    toolProfile: string[]
  ): Promise<unknown>;
  handleQuestionEnqueue(
    input: Record<string, unknown>,
    request: McpRequest,
    allowedRoots: string[],
    allowedHosts: string[],
    expiryFallback: 'pause' | 'resume' | 'fail'
  ): Promise<unknown>;
  handleQuestionPoll(
    input: Record<string, unknown>,
    request: McpRequest,
    allowedRoots: string[],
    allowedHosts: string[],
    expiryFallback: 'pause' | 'resume' | 'fail'
  ): Promise<unknown>;
  handleCoordinatorDynamicToolCall(
    toolName: CoordinatorDynamicToolName,
    input: Record<string, unknown>,
    request: McpRequest,
    allowedRoots: string[],
    allowedHosts: string[]
  ): Promise<unknown>;
  handleGithubCall(
    toolName: GithubToolName,
    input: Record<string, unknown>,
    request: McpRequest,
    context: DelegationServerToolCallContext
  ): Promise<unknown>;
}

export function createDelegationServerRpcHandler(options: {
  protocolVersion: string;
  tools: DelegationServerToolDefinition[];
  handleToolCall: (request: McpRequest) => Promise<unknown>;
  serverInfo?: { name: string; version: string };
}): (request: McpRequest) => Promise<unknown> {
  const serverInfo = options.serverInfo ?? { name: 'codex-delegation', version: '0.1.0' };
  return async (request: McpRequest): Promise<unknown> => {
    switch (request.method) {
      case 'initialize':
        return {
          protocolVersion: options.protocolVersion,
          serverInfo,
          capabilities: { tools: {} }
        };
      case 'tools/list':
        return { tools: options.tools };
      case 'tools/call':
        return await options.handleToolCall(request);
      default:
        throw new Error(`Unsupported method: ${request.method}`);
    }
  };
}

export function buildToolList(options: {
  mode: DelegationMode;
  githubEnabled: boolean;
  allowedGithubOps: Set<string>;
}): DelegationServerToolDefinition[] {
  const tools: DelegationServerToolDefinition[] = [];
  const includeFull = options.mode === 'full';
  const includeQuestionAndGithub = options.mode !== 'status_only';

  if (includeFull) {
    tools.push(toolDefinition('delegate.spawn', 'Spawn a delegated run', {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        pipeline: { type: 'string' },
        repo: { type: 'string' },
        parent_run_id: { type: 'string' },
        parent_manifest_path: { type: 'string' },
        env: { type: 'object', additionalProperties: { type: 'string' } },
        delegate_mode: { type: 'string', enum: ['full', 'question_only', 'status_only'] },
        start_only: { type: 'boolean' }
      },
      required: ['pipeline', 'repo']
    }));
    tools.push(toolDefinition('delegate.pause', 'Pause or resume a run', {
      type: 'object',
      properties: {
        manifest_path: { type: 'string' },
        paused: { type: 'boolean' },
        intent_id: { type: 'string' },
        request_id: { type: 'string' },
        transport: { type: 'string', enum: ['discord', 'telegram'] },
        actor_id: { type: 'string' },
        actor_source: { type: 'string' },
        transport_principal: { type: 'string' },
        transport_nonce: { type: 'string' },
        transport_nonce_expires_at: { type: 'string' }
      },
      required: ['manifest_path', 'paused']
    }));
    tools.push(toolDefinition('delegate.cancel', 'Cancel a run (confirmation required)', {
      type: 'object',
      properties: {
        manifest_path: { type: 'string' },
        intent_id: { type: 'string' },
        request_id: { type: 'string' },
        transport: { type: 'string', enum: ['discord', 'telegram'] },
        actor_id: { type: 'string' },
        actor_source: { type: 'string' },
        transport_principal: { type: 'string' },
        transport_nonce: { type: 'string' },
        transport_nonce_expires_at: { type: 'string' }
      },
      required: ['manifest_path']
    }));

    tools.push(toolDefinition('coordinator.status', 'Experimental coordinator dynamic-tool status bridge', {
      type: 'object',
      properties: {
        manifest_path: { type: 'string' },
        intent_id: { type: 'string' },
        request_id: { type: 'string' },
        ...dynamicToolBridgeSourceSchemaProperties()
      },
      required: ['manifest_path']
    }));
    tools.push(toolDefinition('coordinator.pause', 'Experimental coordinator dynamic-tool pause bridge', {
      type: 'object',
      properties: {
        manifest_path: { type: 'string' },
        intent_id: { type: 'string' },
        request_id: { type: 'string' },
        transport: { type: 'string', enum: ['discord', 'telegram'] },
        actor_id: { type: 'string' },
        actor_source: { type: 'string' },
        transport_principal: { type: 'string' },
        transport_nonce: { type: 'string' },
        transport_nonce_expires_at: { type: 'string' },
        ...dynamicToolBridgeSourceSchemaProperties()
      },
      required: ['manifest_path']
    }));
    tools.push(toolDefinition('coordinator.resume', 'Experimental coordinator dynamic-tool resume bridge', {
      type: 'object',
      properties: {
        manifest_path: { type: 'string' },
        intent_id: { type: 'string' },
        request_id: { type: 'string' },
        transport: { type: 'string', enum: ['discord', 'telegram'] },
        actor_id: { type: 'string' },
        actor_source: { type: 'string' },
        transport_principal: { type: 'string' },
        transport_nonce: { type: 'string' },
        transport_nonce_expires_at: { type: 'string' },
        ...dynamicToolBridgeSourceSchemaProperties()
      },
      required: ['manifest_path']
    }));
    tools.push(toolDefinition('coordinator.cancel', 'Experimental coordinator dynamic-tool cancel bridge', {
      type: 'object',
      properties: {
        manifest_path: { type: 'string' },
        intent_id: { type: 'string' },
        request_id: { type: 'string' },
        transport: { type: 'string', enum: ['discord', 'telegram'] },
        actor_id: { type: 'string' },
        actor_source: { type: 'string' },
        transport_principal: { type: 'string' },
        transport_nonce: { type: 'string' },
        transport_nonce_expires_at: { type: 'string' },
        ...dynamicToolBridgeSourceSchemaProperties()
      },
      required: ['manifest_path']
    }));
  }

  tools.push(toolDefinition('delegate.status', 'Fetch run status', {
    type: 'object',
    properties: {
      manifest_path: { type: 'string' },
      intent_id: { type: 'string' },
      request_id: { type: 'string' }
    },
    required: ['manifest_path']
  }));

  if (includeQuestionAndGithub) {
    tools.push(toolDefinition('delegate.question.enqueue', 'Enqueue a question to the parent run', {
      type: 'object',
      properties: {
        parent_manifest_path: { type: 'string' },
        parent_run_id: { type: 'string' },
        parent_task_id: { type: 'string' },
        from_manifest_path: { type: 'string' },
        prompt: { type: 'string' },
        urgency: { type: 'string', enum: ['low', 'med', 'high'] },
        expires_in_ms: { type: 'number' },
        auto_pause: { type: 'boolean' }
      },
      required: ['parent_manifest_path', 'prompt']
    }));
    tools.push(toolDefinition('delegate.question.poll', 'Poll for a question answer', {
      type: 'object',
      properties: {
        parent_manifest_path: { type: 'string' },
        question_id: { type: 'string' },
        wait_ms: { type: 'number' }
      },
      required: ['parent_manifest_path', 'question_id']
    }));
  }

  if (includeQuestionAndGithub && options.githubEnabled) {
    if (options.allowedGithubOps.has('open_pr')) {
      tools.push(toolDefinition('github.open_pr', 'Open a pull request', {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          base: { type: 'string' },
          head: { type: 'string' },
          draft: { type: 'boolean' }
        },
        required: ['title']
      }));
    }
    if (options.allowedGithubOps.has('comment')) {
      tools.push(toolDefinition('github.comment', 'Create a PR/issue comment', {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          issue_number: { type: 'number' },
          body: { type: 'string' }
        },
        required: ['issue_number', 'body']
      }));
    }
    if (options.allowedGithubOps.has('review')) {
      tools.push(toolDefinition('github.review', 'Submit a PR review', {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          pull_number: { type: 'number' },
          event: { type: 'string', enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'] },
          body: { type: 'string' }
        },
        required: ['pull_number', 'event']
      }));
    }
    if (options.allowedGithubOps.has('get_checks')) {
      tools.push(toolDefinition('github.get_checks', 'Fetch PR checks', {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          pull_number: { type: 'number' }
        },
        required: ['pull_number']
      }));
    }
    if (options.allowedGithubOps.has('merge')) {
      tools.push(toolDefinition('github.merge', 'Merge a PR', {
        type: 'object',
        properties: {
          manifest_path: { type: 'string' },
          repo: { type: 'string' },
          pull_number: { type: 'number' },
          method: { type: 'string', enum: ['merge', 'squash', 'rebase'] },
          delete_branch: { type: 'boolean' }
        },
        required: ['pull_number']
      }));
    }
  }

  return tools;
}

export async function handleDelegationServerToolCall(
  request: McpRequest,
  context: DelegationServerToolCallContext,
  deps: DelegationServerToolDispatchDeps
): Promise<unknown> {
  const params = deps.asRecord(request.params);
  const toolName = deps.readStringValue(params, 'name');
  if (!toolName) {
    throw new Error('Invalid tool call: missing name');
  }
  const input = deps.asRecord(params.arguments);

  const delegateModeViolationMessage = deps.getDelegateModeViolationMessage(context.mode, toolName);
  if (delegateModeViolationMessage) {
    await deps.reportSecurityViolation(
      'delegate_mode_violation',
      delegateModeViolationMessage,
      toolName,
      context.allowedHosts
    );
    throw new Error(context.mode === 'question_only' ? 'delegate_mode_forbidden' : delegateModeViolationMessage);
  }

  if (deps.containsSecret(input, 'confirm_nonce') || deps.containsSecret(input, 'confirmNonce')) {
    await deps.reportSecurityViolation(
      'confirm_nonce_present',
      'Model supplied confirm_nonce.',
      toolName,
      context.allowedHosts
    );
    throw new Error('confirm_nonce must be injected by the runner');
  }
  if (deps.containsSecret(input, 'delegation_token') || deps.containsSecret(input, 'delegationToken')) {
    await deps.reportSecurityViolation(
      'delegation_token_present',
      'Model supplied delegation_token.',
      toolName,
      context.allowedHosts
    );
    throw new Error('delegation_token must be injected by the runner');
  }

  switch (toolName) {
    case 'delegate.status':
      return wrapResult(await deps.handleDelegateStatus(input, context.allowedRoots, context.allowedHosts));
    case 'delegate.pause':
      return wrapResult(await deps.handleDelegatePause(input, context.allowedRoots, context.allowedHosts));
    case 'delegate.cancel':
      return wrapResult(await deps.handleDelegateCancel(input, request, context.allowedRoots, context.allowedHosts));
    case 'delegate.spawn':
      return wrapResult(
        await deps.handleDelegateSpawn(
          input,
          context.repoRoot,
          context.allowNested,
          context.allowedRoots,
          context.allowedHosts,
          context.toolProfile
        )
      );
    case 'delegate.question.enqueue':
      return wrapResult(
        await deps.handleQuestionEnqueue(
          input,
          request,
          context.allowedRoots,
          context.allowedHosts,
          context.expiryFallback
        )
      );
    case 'delegate.question.poll':
      return wrapResult(
        await deps.handleQuestionPoll(
          input,
          request,
          context.allowedRoots,
          context.allowedHosts,
          context.expiryFallback
        )
      );
    case 'coordinator.status':
    case 'coordinator.pause':
    case 'coordinator.resume':
    case 'coordinator.cancel':
      return wrapResult(
        await deps.handleCoordinatorDynamicToolCall(
          toolName,
          input,
          request,
          context.allowedRoots,
          context.allowedHosts
        )
      );
    case 'github.open_pr':
    case 'github.comment':
    case 'github.review':
    case 'github.get_checks':
    case 'github.merge':
      return wrapResult(await deps.handleGithubCall(toolName, input, request, context));
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function toolDefinition(
  name: string,
  description: string,
  inputSchema: Record<string, unknown>
): DelegationServerToolDefinition {
  return { name, description, inputSchema };
}

function dynamicToolBridgeSourceSchemaProperties(): Record<string, unknown> {
  return {
    source: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        source_id: { type: 'string' },
        sourceId: { type: 'string' },
        bridge_source: { type: 'string' },
        bridgeSource: { type: 'string' }
      },
      additionalProperties: true
    },
    source_id: { type: 'string' },
    sourceId: { type: 'string' },
    bridge_source: { type: 'string' },
    bridgeSource: { type: 'string' }
  };
}

function wrapResult(payload: unknown): { content: Array<{ type: 'text'; text: string }>; isError: false } {
  return {
    content: [
      {
        type: 'text',
        text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
      }
    ],
    isError: false
  };
}
