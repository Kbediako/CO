import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { access, chmod, readFile, readdir, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

import {
  loadDelegationConfigFiles,
  computeEffectiveDelegationConfig,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides,
  type DelegationConfigLayer
} from './config/delegationConfig.js';
import { logger } from '../logger.js';
import { writeJsonAtomic } from './utils/fs.js';
import {
  evaluateDynamicToolBridgeRequest,
  type DynamicToolBridgeAction
} from './control/dynamicToolBridgePolicy.js';
import {
  buildToolList,
  createDelegationServerRpcHandler,
  handleDelegationServerToolCall
} from './delegationServerToolDispatchShell.js';
import {
  MAX_MCP_HEADER_BYTES,
  MAX_MCP_MESSAGE_BYTES,
  parseContentLengthHeader,
  runJsonRpcServer
} from './delegationServerTransport.js';

interface McpRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
  codex_private?: Record<string, unknown>;
}

interface DelegationServerOptions {
  repoRoot: string;
  mode?: DelegationMode;
  configOverrides?: ConfigOverride[];
}

const PROTOCOL_VERSION = '2024-11-05';
const QUESTION_POLL_INTERVAL_MS = 500;
const MAX_QUESTION_POLL_WAIT_MS = 10_000;
const DEFAULT_SPAWN_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_SPAWN_START_TIMEOUT_MS = 10_000;
const DEFAULT_SPAWN_START_POLL_INTERVAL_MS = 200;
const DEFAULT_GH_TIMEOUT_MS = 60_000;
const DEFAULT_DELEGATION_TOKEN_RETRY_MS = 2000;
const DEFAULT_DELEGATION_TOKEN_RETRY_INTERVAL_MS = 200;
const DEFAULT_CONTROL_ENDPOINT_TIMEOUT_MS = 15_000;
const DELEGATION_TOKEN_HEADER = 'x-codex-delegation-token';
const DELEGATION_RUN_HEADER = 'x-codex-delegation-run-id';
const DELEGATION_TOKEN_FILE = 'delegation_token.json';
const CSRF_HEADER = 'x-csrf-token';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const DYNAMIC_TOOL_BRIDGE_PUBLIC_TOKEN_KEYS = [
  'dynamic_tool_bridge_token',
  'dynamicToolBridgeToken',
  'bridge_token',
  'bridgeToken'
] as const;
const DYNAMIC_TOOL_BRIDGE_PUBLIC_ATTESTATION_KEYS = [
  'dynamic_tool_bridge_attestation',
  'dynamicToolBridgeAttestation',
  'bridge_attestation',
  'bridgeAttestation'
] as const;
const DYNAMIC_TOOL_BRIDGE_PRIVATE_ATTESTATION_KEYS = [
  'dynamic_tool_bridge_attestation',
  'dynamicToolBridgeAttestation',
  'bridge_attestation',
  'bridgeAttestation'
] as const;
const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];
const CONFIRMATION_ERROR_CODES = new Set([
  'confirmation_required',
  'missing_confirm_nonce',
  'confirmation_invalid',
  'confirmation_scope_mismatch',
  'confirmation_request_not_found',
  'confirmation_not_approved',
  'confirmation_expired',
  'nonce_already_consumed'
]);
const TOOL_PROFILE_ENTRY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const TERMINAL_RUN_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'canceled']);

interface ConfigOverride {
  source: 'env' | 'cli';
  value: string;
}

type DelegationMode = 'full' | 'question_only' | 'status_only';

export async function startDelegationServer(options: DelegationServerOptions): Promise<void> {
  const repoRoot = resolve(options.repoRoot);
  const configFiles = await loadDelegationConfigFiles({ repoRoot });
  const envOverrides = collectConfigOverridesFromEnv();
  const overrideLayers = buildConfigOverrideLayers([...envOverrides, ...(options.configOverrides ?? [])]);
  const layers = [configFiles.global, configFiles.repo, ...overrideLayers].filter(Boolean) as DelegationConfigLayer[];
  const effectiveConfig = computeEffectiveDelegationConfig({ repoRoot, layers });
  const mode = options.mode ?? effectiveConfig.delegate.mode ?? 'full';
  const allowNested = effectiveConfig.delegate.allowNested ?? false;
  const githubEnabled = effectiveConfig.github.enabled;
  const allowedGithubOps = new Set(effectiveConfig.github.operations);
  const allowedRoots = effectiveConfig.paths.allowedRoots;
  const allowedHosts = effectiveConfig.ui.allowedBindHosts;
  const toolProfile = effectiveConfig.delegate.toolProfile;

  const tools = buildToolList({ mode, githubEnabled, allowedGithubOps });

  const handler = createDelegationServerRpcHandler({
    protocolVersion: PROTOCOL_VERSION,
    tools,
    handleToolCall: (request) =>
      handleToolCall(request, {
        repoRoot,
        mode,
        allowNested,
        githubEnabled,
        allowedGithubOps,
        allowedRoots,
        allowedHosts,
        toolProfile,
        expiryFallback: effectiveConfig.delegate.expiryFallback
      })
  });

  await runJsonRpcServer(handler);
}

async function handleToolCall(
  request: McpRequest,
  context: {
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
): Promise<unknown> {
  return handleDelegationServerToolCall(request, context, {
    asRecord,
    readStringValue,
    containsSecret,
    reportSecurityViolation,
    getDelegateModeViolationMessage,
    handleDelegateStatus,
    handleDelegatePause,
    handleDelegateCancel,
    handleDelegateSpawn,
    handleQuestionEnqueue,
    handleQuestionPoll,
    handleCoordinatorDynamicToolCall,
    handleGithubCall
  });
}

async function handleDelegateStatus(
  input: Record<string, unknown>,
  allowedRoots: string[],
  allowedHosts: string[]
): Promise<Record<string, unknown>> {
  const manifestPath = resolveManifestPath(readStringValue(input, 'manifest_path', 'manifestPath'), allowedRoots);
  const manifest = await loadRunManifest(manifestPath);
  const eventsPath = resolve(dirname(manifestPath), 'events.jsonl');
  const intentId = readStringValue(input, 'intent_id', 'intentId') ?? null;
  const requestId = readStringValue(input, 'request_id', 'requestId') ?? null;
  if (!TERMINAL_RUN_STATUSES.has(manifest.status)) {
    await assertControlEndpoint(manifestPath, allowedHosts);
  }
  const control = await loadControlSnapshot(manifestPath);
  return {
    run_id: manifest.run_id,
    task_id: manifest.task_id,
    status: manifest.status,
    status_detail: manifest.status_detail ?? null,
    manifest_path: manifestPath,
    events_path: eventsPath,
    log_path: manifest.log_path ?? null,
    control,
    traceability: {
      intent_id: intentId,
      task_id: manifest.task_id ?? null,
      run_id: manifest.run_id ?? null,
      manifest_path: manifestPath,
      request_id: requestId
    }
  };
}

async function handleDelegatePause(
  input: Record<string, unknown>,
  allowedRoots: string[],
  allowedHosts: string[]
): Promise<unknown> {
  const manifestPath = resolveManifestPath(readStringValue(input, 'manifest_path', 'manifestPath'), allowedRoots);
  const manifest = await loadRunManifest(manifestPath);
  const paused = readBooleanValue(input, 'paused') ?? false;
  const action = paused ? 'pause' : 'resume';
  const intentId = readStringValue(input, 'intent_id', 'intentId') ?? null;
  const requestId =
    readStringValue(input, 'request_id', 'requestId') ??
    deriveIdempotentRequestId(action, intentId, manifestPath);
  const transportMetadata = readTransportMutationMetadata(input);
  const result = await callControlEndpoint(
    manifestPath,
    '/control/action',
    {
      action,
      requested_by: 'delegate',
      intent_id: intentId,
      request_id: requestId,
      ...(transportMetadata ?? {})
    },
    undefined,
    { allowedHosts }
  );
  const resultRecord = asRecord(result);
  const latestAction = asRecord(resultRecord.latest_action);
  const resultRequestId =
    readStringValue(resultRecord, 'request_id', 'requestId') ??
    readStringValue(latestAction, 'request_id', 'requestId') ??
    requestId;
  const canonicalTraceability = readCanonicalTraceability(resultRecord);
  return {
    ...resultRecord,
    traceability:
      canonicalTraceability ??
      ({
        intent_id: intentId,
        task_id: manifest.task_id ?? null,
        run_id: manifest.run_id ?? null,
        manifest_path: manifestPath,
        request_id: resultRequestId,
        ...(transportMetadata
          ? {
              transport: transportMetadata.transport,
              actor_id: transportMetadata.actor_id,
              actor_source: transportMetadata.actor_source,
              transport_principal: transportMetadata.transport_principal
            }
          : {})
      } as Record<string, unknown>)
  };
}

async function handleDelegateCancel(
  input: Record<string, unknown>,
  request: McpRequest,
  allowedRoots: string[],
  allowedHosts: string[]
): Promise<unknown> {
  const manifestPath = resolveManifestPath(readStringValue(input, 'manifest_path', 'manifestPath'), allowedRoots);
  const manifest = await loadRunManifest(manifestPath);
  const intentId = readStringValue(input, 'intent_id', 'intentId') ?? null;
  const requestId =
    readStringValue(input, 'request_id', 'requestId') ??
    deriveIdempotentRequestId('cancel', intentId, manifestPath);
  const transportMetadata = readTransportMutationMetadata(input);
  const privateNonce = request.codex_private?.confirm_nonce;
  if (!privateNonce) {
    const confirmation = await callControlEndpoint(
      manifestPath,
      '/confirmations/create',
      {
        action: 'cancel',
        tool: 'delegate.cancel',
        params: {
          manifest_path: manifestPath,
          intent_id: intentId,
          request_id: requestId,
          ...(transportMetadata
            ? {
                transport: transportMetadata.transport,
                actor_id: transportMetadata.actor_id,
                actor_source: transportMetadata.actor_source,
                transport_principal: transportMetadata.transport_principal
              }
            : {})
        }
      },
      undefined,
      { allowedHosts }
    );
    const confirmationRequestId = readStringValue(confirmation, 'request_id', 'requestId') ?? requestId;
    const confirmationRecord = asRecord(confirmation);
    const canonicalTraceability = readCanonicalTraceability(confirmationRecord);
    return {
      ...confirmationRecord,
      traceability:
        canonicalTraceability ??
        ({
          intent_id: intentId,
          task_id: manifest.task_id ?? null,
          run_id: manifest.run_id ?? null,
          manifest_path: manifestPath,
          request_id: confirmationRequestId,
          ...(transportMetadata
            ? {
                transport: transportMetadata.transport,
                actor_id: transportMetadata.actor_id,
                actor_source: transportMetadata.actor_source,
                transport_principal: transportMetadata.transport_principal
              }
            : {})
        } as Record<string, unknown>)
    };
  }

  try {
    const result = await callControlEndpoint(
      manifestPath,
      '/control/action',
      {
        action: 'cancel',
        requested_by: 'delegate',
        intent_id: intentId,
        request_id: requestId,
        confirm_nonce: String(privateNonce),
        tool: 'delegate.cancel',
        params: {
          manifest_path: manifestPath,
          intent_id: intentId,
          request_id: requestId,
          ...(transportMetadata
            ? {
                transport: transportMetadata.transport,
                actor_id: transportMetadata.actor_id,
                actor_source: transportMetadata.actor_source,
                transport_principal: transportMetadata.transport_principal
              }
            : {})
        },
        ...(transportMetadata ?? {})
      },
      undefined,
      { allowedHosts }
    );
    const resultRecord = asRecord(result);
    const latestAction = asRecord(resultRecord.latest_action);
    const resultRequestId =
      readStringValue(resultRecord, 'request_id', 'requestId') ??
      readStringValue(latestAction, 'request_id', 'requestId') ??
      requestId;
    const canonicalTraceability = readCanonicalTraceability(resultRecord);
    return {
      ...resultRecord,
      traceability:
        canonicalTraceability ??
        ({
          intent_id: intentId,
          task_id: manifest.task_id ?? null,
          run_id: manifest.run_id ?? null,
          manifest_path: manifestPath,
          request_id: resultRequestId,
          ...(transportMetadata
            ? {
                transport: transportMetadata.transport,
                actor_id: transportMetadata.actor_id,
                actor_source: transportMetadata.actor_source,
                transport_principal: transportMetadata.transport_principal
              }
            : {})
        } as Record<string, unknown>)
    };
  } catch (error) {
    if (!isConfirmationError(error)) {
      throw error;
    }
    const confirmation = await callControlEndpoint(
      manifestPath,
      '/confirmations/create',
      {
        action: 'cancel',
        tool: 'delegate.cancel',
        params: {
          manifest_path: manifestPath,
          intent_id: intentId,
          request_id: requestId,
          ...(transportMetadata
            ? {
                transport: transportMetadata.transport,
                actor_id: transportMetadata.actor_id,
                actor_source: transportMetadata.actor_source,
                transport_principal: transportMetadata.transport_principal
              }
            : {})
        }
      },
      undefined,
      { allowedHosts }
    );
    const confirmationRequestId = readStringValue(confirmation, 'request_id', 'requestId') ?? requestId;
    const confirmationRecord = asRecord(confirmation);
    const canonicalTraceability = readCanonicalTraceability(confirmationRecord);
    return {
      ...confirmationRecord,
      traceability:
        canonicalTraceability ??
        ({
          intent_id: intentId,
          task_id: manifest.task_id ?? null,
          run_id: manifest.run_id ?? null,
          manifest_path: manifestPath,
          request_id: confirmationRequestId,
          ...(transportMetadata
            ? {
                transport: transportMetadata.transport,
                actor_id: transportMetadata.actor_id,
                actor_source: transportMetadata.actor_source,
                transport_principal: transportMetadata.transport_principal
              }
            : {})
        } as Record<string, unknown>)
    };
  }
}

async function handleCoordinatorDynamicToolCall(
  toolName: 'coordinator.status' | 'coordinator.pause' | 'coordinator.resume' | 'coordinator.cancel',
  input: Record<string, unknown>,
  request: McpRequest,
  allowedRoots: string[],
  allowedHosts: string[]
): Promise<unknown> {
  if (containsAnySecret(input, DYNAMIC_TOOL_BRIDGE_PUBLIC_TOKEN_KEYS)) {
    await reportSecurityViolation(
      'dynamic_tool_bridge_token_present',
      'Model supplied dynamic tool bridge token.',
      toolName,
      allowedHosts
    );
    throw new Error('dynamic_tool_bridge_token_missing');
  }
  if (containsAnySecret(input, DYNAMIC_TOOL_BRIDGE_PUBLIC_ATTESTATION_KEYS)) {
    await reportSecurityViolation(
      'dynamic_tool_bridge_attestation_present',
      'Model supplied dynamic tool bridge attestation.',
      toolName,
      allowedHosts
    );
    throw new Error('dynamic_tool_bridge_attestation_missing');
  }

  const manifestPath = resolveManifestPath(readStringValue(input, 'manifest_path', 'manifestPath'), allowedRoots);
  const controlSnapshot = await loadControlSnapshot(manifestPath);
  const featureToggles = asRecord(controlSnapshot?.feature_toggles);
  const bridgeAction = resolveCoordinatorDynamicToolAction(toolName);
  const bridgeEvaluation = evaluateDynamicToolBridgeRequest({
    featureToggles,
    action: bridgeAction,
    args: input
  });
  if (!bridgeEvaluation.ok) {
    throw new Error(bridgeEvaluation.error ?? 'dynamic_tool_bridge_disabled');
  }
  verifyDynamicToolBridgeAttestation(request, featureToggles, bridgeEvaluation.sourceId ?? 'appserver_dynamic_tool');

  let result: unknown;
  if (bridgeAction === 'status') {
    result = await handleDelegateStatus(
      {
        ...input,
        manifest_path: manifestPath
      },
      allowedRoots,
      allowedHosts
    );
  } else if (bridgeAction === 'pause' || bridgeAction === 'resume') {
    result = await handleDelegatePause(
      {
        ...input,
        manifest_path: manifestPath,
        paused: bridgeAction === 'pause'
      },
      allowedRoots,
      allowedHosts
    );
  } else {
    result = await handleDelegateCancel(
      {
        ...input,
        manifest_path: manifestPath
      },
      request,
      allowedRoots,
      allowedHosts
    );
  }

  return appendCoordinatorBridgeTraceability(result, {
    action: bridgeAction,
    sourceId: bridgeEvaluation.sourceId ?? 'appserver_dynamic_tool'
  });
}

function resolveCoordinatorDynamicToolAction(toolName: string): DynamicToolBridgeAction {
  switch (toolName) {
    case 'coordinator.status':
      return 'status';
    case 'coordinator.pause':
      return 'pause';
    case 'coordinator.resume':
      return 'resume';
    case 'coordinator.cancel':
      return 'cancel';
    default:
      throw new Error('dynamic_tool_bridge_action_not_allowed');
  }
}

function appendCoordinatorBridgeTraceability(
  payload: unknown,
  input: { action: DynamicToolBridgeAction; sourceId: string }
): Record<string, unknown> {
  const record = asRecord(payload);
  const traceability = asRecord(record.traceability);
  return {
    ...record,
    traceability: {
      ...traceability,
      bridge_surface: 'coordinator_dynamic_tool',
      bridge_action: input.action,
      bridge_source_id: input.sourceId,
      bridge_token_validated: true
    }
  };
}

interface DynamicToolBridgePrivateAttestation {
  token: string;
  sourceId: string;
  principal: string;
}

interface DynamicToolBridgeExpectedAttestation {
  tokenSha256: string;
  sourceId: string;
  principal: string;
  expiresAt: string | null;
  revoked: boolean;
}

function verifyDynamicToolBridgeAttestation(
  request: McpRequest,
  featureToggles: Record<string, unknown>,
  sourceId: string
): DynamicToolBridgePrivateAttestation {
  const hiddenAttestation = readDynamicToolBridgePrivateAttestation(request);
  if (!hiddenAttestation) {
    throw new Error('dynamic_tool_bridge_attestation_missing');
  }
  const expectedAttestation = readDynamicToolBridgeExpectedAttestation(featureToggles);
  if (!expectedAttestation) {
    throw new Error('dynamic_tool_bridge_attestation_invalid');
  }
  if (expectedAttestation.revoked) {
    throw new Error('dynamic_tool_bridge_attestation_revoked');
  }
  if (expectedAttestation.expiresAt) {
    const expiresAtMs = Date.parse(expectedAttestation.expiresAt);
    if (!Number.isFinite(expiresAtMs)) {
      throw new Error('dynamic_tool_bridge_attestation_malformed');
    }
    if (expiresAtMs <= Date.now()) {
      throw new Error('dynamic_tool_bridge_attestation_expired');
    }
  }
  const normalizedSourceId = normalizeDynamicToolBridgeSourceId(sourceId);
  if (
    hiddenAttestation.sourceId !== normalizedSourceId ||
    hiddenAttestation.sourceId !== expectedAttestation.sourceId ||
    expectedAttestation.sourceId !== normalizedSourceId
  ) {
    throw new Error('dynamic_tool_bridge_attestation_source_mismatch');
  }
  if (hiddenAttestation.principal !== expectedAttestation.principal) {
    throw new Error('dynamic_tool_bridge_attestation_principal_mismatch');
  }
  const tokenSha256 = createHash('sha256').update(hiddenAttestation.token).digest('hex');
  if (tokenSha256 !== expectedAttestation.tokenSha256) {
    throw new Error('dynamic_tool_bridge_attestation_invalid');
  }
  return hiddenAttestation;
}

function readDynamicToolBridgePrivateAttestation(request: McpRequest): DynamicToolBridgePrivateAttestation | null {
  const privateRecord = request.codex_private;
  if (!privateRecord) {
    return null;
  }
  for (const key of DYNAMIC_TOOL_BRIDGE_PRIVATE_ATTESTATION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(privateRecord, key)) {
      continue;
    }
    const attestation = asRecord(privateRecord[key]);
    const token = readStringValue(attestation, 'token', 'bridge_token', 'bridgeToken');
    const sourceId = readStringValue(attestation, 'source_id', 'sourceId');
    const principal = readStringValue(attestation, 'principal');
    if (!token || !sourceId || !principal) {
      throw new Error('dynamic_tool_bridge_attestation_malformed');
    }
    return {
      token,
      sourceId: normalizeDynamicToolBridgeSourceId(sourceId),
      principal
    };
  }
  return null;
}

function readDynamicToolBridgeExpectedAttestation(
  featureToggles: Record<string, unknown>
): DynamicToolBridgeExpectedAttestation | null {
  const bridgePolicy = readDynamicToolBridgePolicyRecord(featureToggles);
  const rawAttestation = bridgePolicy.attestation;
  if (rawAttestation === undefined) {
    return null;
  }
  const attestation = asRecord(rawAttestation);
  const tokenSha256 = readStringValue(attestation, 'token_sha256', 'tokenSha256');
  const sourceId = readStringValue(attestation, 'source_id', 'sourceId');
  const principal = readStringValue(attestation, 'principal');
  const expiresAt = readStringValue(attestation, 'expires_at', 'expiresAt');
  const revoked = readBooleanValue(attestation, 'revoked') ?? false;
  const revokedAt = readStringValue(attestation, 'revoked_at', 'revokedAt');
  if (!tokenSha256 || !sourceId || !principal) {
    throw new Error('dynamic_tool_bridge_attestation_malformed');
  }
  if (!/^[a-f0-9]{64}$/i.test(tokenSha256)) {
    throw new Error('dynamic_tool_bridge_attestation_malformed');
  }
  return {
    tokenSha256: tokenSha256.toLowerCase(),
    sourceId: normalizeDynamicToolBridgeSourceId(sourceId),
    principal,
    expiresAt: expiresAt ?? null,
    revoked: revoked || Boolean(revokedAt)
  };
}

function readDynamicToolBridgePolicyRecord(featureToggles: Record<string, unknown>): Record<string, unknown> {
  const coordinatorPolicy = asRecord(asRecord(featureToggles.coordinator).dynamic_tool_bridge);
  if (Object.keys(coordinatorPolicy).length > 0) {
    return coordinatorPolicy;
  }
  return asRecord(featureToggles.dynamic_tool_bridge);
}

function normalizeDynamicToolBridgeSourceId(sourceId: string): string {
  return sourceId.trim().toLowerCase();
}

interface DelegationManifestSnapshot {
  status: string;
  run_id: string;
  task_id: string;
  status_detail?: string;
  log_path?: string | null;
}

interface TransportMutationMetadata {
  transport: 'discord' | 'telegram';
  actor_id?: string;
  actor_source?: string;
  transport_principal?: string;
  transport_nonce?: string;
  transport_nonce_expires_at?: string;
}

async function loadRunManifest(manifestPath: string): Promise<DelegationManifestSnapshot> {
  const raw = await readFile(manifestPath, 'utf8');
  return JSON.parse(raw) as DelegationManifestSnapshot;
}

async function loadControlSnapshot(manifestPath: string): Promise<Record<string, unknown> | null> {
  const controlPath = resolve(dirname(manifestPath), 'control.json');
  try {
    const raw = await readFile(controlPath, 'utf8');
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

function deriveIdempotentRequestId(
  action: 'pause' | 'resume' | 'cancel',
  intentId: string | null,
  manifestPath: string
): string | undefined {
  if (!intentId) {
    return undefined;
  }
  const digest = createHash('sha256')
    .update(`${action}:${intentId}:${manifestPath}`)
    .digest('hex')
    .slice(0, 24);
  return `intent-${digest}`;
}

async function handleDelegateSpawn(
  input: Record<string, unknown>,
  repoRoot: string,
  allowNested: boolean,
  allowedRoots: string[],
  allowedHosts: string[],
  toolProfile: string[]
): Promise<Record<string, unknown>> {
  const pipeline = requireString(readStringValue(input, 'pipeline'), 'pipeline');
  const repo = readStringValue(input, 'repo') ?? repoRoot ?? process.cwd();
  const resolvedRepo = resolve(repo);
  const resolvedRepoRoot = realpathSafe(resolvedRepo);
  if (!isPathWithinRoots(resolvedRepo, allowedRoots)) {
    throw new Error('repo_not_permitted');
  }
  const taskId = readStringValue(input, 'task_id', 'taskId');
  const startOnly = readBooleanValue(input, 'start_only', 'startOnly');
  const resolvedStartOnly = startOnly ?? true;
  if (resolvedStartOnly && !taskId) {
    throw new Error('task_id is required when start_only=true');
  }
  const args = ['start', pipeline, '--format', 'json', '--no-interactive'];
  if (taskId) {
    args.push('--task', taskId);
  }
  const parentRunId = readStringValue(input, 'parent_run_id', 'parentRunId') ?? process.env.CODEX_ORCHESTRATOR_RUN_ID;
  if (parentRunId) {
    args.push('--parent-run', parentRunId);
  }
  const requestedMode = readStringValue(input, 'delegate_mode', 'delegateMode') ?? 'question_only';
  const childMode = resolveChildDelegateMode(requestedMode, allowNested);

  const envOverrides = readStringMap(input, 'env');
  const delegationToken = randomBytes(32).toString('hex');
  const parentManifestPath = resolveParentManifestPath(input, allowedRoots);
  const mcpOverrides = buildDelegateMcpOverrides(toolProfile);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...(envOverrides ?? {}),
    CODEX_DELEGATE_MODE: childMode,
    ...(parentManifestPath ? { CODEX_DELEGATION_PARENT_MANIFEST_PATH: parentManifestPath } : {}),
    ...(mcpOverrides.length > 0 ? { CODEX_MCP_CONFIG_OVERRIDES: mcpOverrides.join(';') } : {})
  };
  if (!envOverrides || !Object.prototype.hasOwnProperty.call(envOverrides, 'CODEX_ORCHESTRATOR_ROOT')) {
    childEnv.CODEX_ORCHESTRATOR_ROOT = resolvedRepoRoot;
  }

  if (!resolvedStartOnly) {
    const child = spawn('codex-orchestrator', args, { cwd: resolvedRepo, env: childEnv });
    const output = await collectOutput(child, DEFAULT_SPAWN_TIMEOUT_MS);
    const parsedRecord = parseSpawnOutput(output.stdout);
    const manifestPath = readStringValue(parsedRecord, 'manifest');
    if (!manifestPath) {
      return { status: 'spawn_failed', stdout: output.stdout.trim(), stderr: output.stderr.trim() };
    }
    const runId = readStringValue(parsedRecord, 'run_id', 'runId');
    const logPath = readStringValue(parsedRecord, 'log_path', 'logPath');
    const resolvedManifestPath = resolveSpawnManifestPath(manifestPath, resolvedRepo, allowedRoots);
    if (!resolvedManifestPath) {
      return { status: 'spawn_failed', stdout: output.stdout.trim(), stderr: output.stderr.trim() };
    }
    const eventsPath = `${dirname(resolvedManifestPath)}/events.jsonl`;

    await persistDelegationToken(resolvedManifestPath, delegationToken, {
      parentRunId: parentRunId ?? null,
      childRunId: runId ?? null
    });

    if (parentManifestPath && parentRunId && runId) {
      try {
        await callControlEndpoint(
          parentManifestPath,
          '/delegation/register',
          {
            token: delegationToken,
            parent_run_id: parentRunId,
            child_run_id: runId
          },
          undefined,
          { allowedHosts }
        );
      } catch (error) {
        logger.warn(`Failed to register delegation token: ${(error as Error)?.message ?? error}`);
      }
    }

    return {
      run_id: runId,
      manifest_path: resolvedManifestPath,
      log_path: logPath,
      events_path: eventsPath
    };
  }

  const runsRepoRoot = resolveRepoRootForRuns(resolvedRepo, childEnv);
  const runsRoot = resolveRunsRoot(runsRepoRoot, childEnv);
  if (!isPathWithinRoots(runsRoot, allowedRoots)) {
    throw new Error('runs_root not permitted');
  }

  const taskRunsRoot = join(runsRoot, taskId as string, 'cli');
  const baselineRuns = await snapshotRunManifests(taskRunsRoot);
  const spawnStart = Date.now();

  const child = spawn('codex-orchestrator', args, {
    cwd: resolvedRepo,
    env: childEnv,
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore']
  });
  let spawnError: Error | null = null;
  const recordSpawnError = (message: string) => {
    if (!spawnError) {
      spawnError = new Error(message);
    }
  };
  child.once('error', (error) => {
    spawnError = error instanceof Error ? error : new Error(String(error));
  });
  child.once('exit', (code, signal) => {
    if (code === 0 && !signal) {
      return;
    }
    recordSpawnError(`delegate.spawn child exited with code ${code ?? 'null'} (${signal ?? 'no signal'})`);
  });
  child.once('close', (code, signal) => {
    if (code === 0 && !signal) {
      return;
    }
    recordSpawnError(`delegate.spawn child closed with code ${code ?? 'null'} (${signal ?? 'no signal'})`);
  });
  child.unref();

  const timeoutMs = resolveSpawnStartTimeoutMs(childEnv);
  const manifestInfo = await pollForSpawnManifest({
    taskId: taskId as string,
    taskRunsRoot,
    baselineRuns,
    spawnStart,
    timeoutMs,
    intervalMs: DEFAULT_SPAWN_START_POLL_INTERVAL_MS,
    getSpawnError: () => spawnError
  });

  if (!manifestInfo) {
    const candidates = await collectSpawnCandidates(taskRunsRoot, taskId as string);
    return {
      status: 'spawn_failed',
      task_id: taskId,
      runs_root: runsRoot,
      expected_manifest_glob: join(taskRunsRoot, '*', 'manifest.json'),
      candidates,
      error: (spawnError as Error | null)?.message ?? null
    };
  }

  const resolvedManifestPath = resolveSpawnManifestPath(manifestInfo.manifestPath, resolvedRepo, allowedRoots);
  if (!resolvedManifestPath) {
    return {
      status: 'spawn_failed',
      task_id: taskId,
      runs_root: runsRoot,
      expected_manifest_glob: join(taskRunsRoot, '*', 'manifest.json'),
      candidates: [
        {
          path: manifestInfo.manifestPath,
          reason: 'manifest_path not permitted'
        }
      ]
    };
  }

  const runId = manifestInfo.runId;
  const eventsPath = `${dirname(resolvedManifestPath)}/events.jsonl`;

  await persistDelegationToken(resolvedManifestPath, delegationToken, {
    parentRunId: parentRunId ?? null,
    childRunId: runId ?? null
  });

  if (parentManifestPath && parentRunId && runId) {
    try {
      await callControlEndpoint(
        parentManifestPath,
        '/delegation/register',
        {
          token: delegationToken,
          parent_run_id: parentRunId,
          child_run_id: runId
        },
        undefined,
        { allowedHosts }
      );
    } catch (error) {
      logger.warn(`Failed to register delegation token: ${(error as Error)?.message ?? error}`);
    }
  }

  return {
    run_id: runId,
    manifest_path: resolvedManifestPath,
    log_path: manifestInfo.logPath ?? null,
    events_path: eventsPath
  };
}

async function handleQuestionEnqueue(
  input: Record<string, unknown>,
  request: McpRequest,
  allowedRoots: string[],
  allowedHosts: string[],
  expiryFallback: 'pause' | 'resume' | 'fail'
): Promise<unknown> {
  const parentManifestPath = resolveParentManifestPath(input, allowedRoots);
  if (!parentManifestPath) {
    throw new Error('parent_manifest_path is required');
  }

  const delegationToken = await resolveDelegationToken(request, allowedRoots, {
    retryMs: DEFAULT_DELEGATION_TOKEN_RETRY_MS,
    intervalMs: DEFAULT_DELEGATION_TOKEN_RETRY_INTERVAL_MS
  });
  const childRunId = process.env.CODEX_ORCHESTRATOR_RUN_ID ?? readStringValue(input, 'from_run_id', 'fromRunId') ?? '';

  if (!delegationToken) {
    throw new Error('delegation_token missing');
  }

  const autoPause = readBooleanValue(input, 'auto_pause', 'autoPause') ?? true;
  const manifestFromEnv = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
  const manifestFromInput = readStringValue(input, 'from_manifest_path', 'fromManifestPath');
  const childManifestPath = manifestFromEnv ?? manifestFromInput;
  const result = await callControlEndpointWithRetry(
    parentManifestPath,
    '/questions/enqueue',
    {
      parent_run_id: readStringValue(input, 'parent_run_id', 'parentRunId') ?? '',
      parent_task_id: readStringValue(input, 'parent_task_id', 'parentTaskId') ?? null,
      from_run_id: childRunId,
      from_manifest_path: childManifestPath ?? null,
      prompt: requireString(readStringValue(input, 'prompt'), 'prompt'),
      urgency: readStringValue(input, 'urgency') ?? 'med',
      expires_in_ms: readNumberValue(input, 'expires_in_ms', 'expiresInMs'),
      auto_pause: autoPause,
      expiry_fallback: expiryFallback
    },
    {
      [DELEGATION_TOKEN_HEADER]: delegationToken,
      [DELEGATION_RUN_HEADER]: childRunId
    },
    {
      allowedHosts,
      allowedRoots,
      retryMs: DEFAULT_DELEGATION_TOKEN_RETRY_MS,
      retryIntervalMs: DEFAULT_DELEGATION_TOKEN_RETRY_INTERVAL_MS
    }
  );

  if (autoPause && manifestFromEnv) {
    const resolvedManifest = resolveRunManifestPath(manifestFromEnv, allowedRoots, 'manifest_path');
    await callControlEndpoint(
      resolvedManifest,
      '/control/action',
      {
        action: 'pause',
        requested_by: 'delegate',
        reason: 'awaiting_question_answer'
      },
      undefined,
      { allowedHosts, allowedRoots }
    );
  }

  return {
    ...result,
    fallback_action: expiryFallback
  };
}

async function handleQuestionPoll(
  input: Record<string, unknown>,
  request: McpRequest,
  allowedRoots: string[],
  allowedHosts: string[],
  expiryFallback: 'pause' | 'resume' | 'fail'
): Promise<unknown> {
  const parentManifestPath = resolveParentManifestPath(input, allowedRoots);
  if (!parentManifestPath) {
    throw new Error('parent_manifest_path is required');
  }

  const delegationToken = await resolveDelegationToken(request, allowedRoots, {
    retryMs: DEFAULT_DELEGATION_TOKEN_RETRY_MS,
    intervalMs: DEFAULT_DELEGATION_TOKEN_RETRY_INTERVAL_MS
  });
  const childRunId = process.env.CODEX_ORCHESTRATOR_RUN_ID ?? readStringValue(input, 'from_run_id', 'fromRunId') ?? '';

  if (!delegationToken) {
    throw new Error('delegation_token missing');
  }

  const questionId = requireString(readStringValue(input, 'question_id', 'questionId'), 'question_id');
  const requestedWaitMs = readNumberValue(input, 'wait_ms', 'waitMs') ?? 0;
  const waitMs = clampQuestionPollWaitMs(requestedWaitMs);
  const deadline = Date.now() + waitMs;
  const maxIterations = waitMs > 0 ? Math.max(1, Math.ceil(waitMs / QUESTION_POLL_INTERVAL_MS)) : 1;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const remainingMs = waitMs > 0 ? Math.max(0, deadline - Date.now()) : null;
    const timeoutMs =
      remainingMs === null ? undefined : Math.max(1, Math.min(DEFAULT_CONTROL_ENDPOINT_TIMEOUT_MS, remainingMs));
    const retryMs =
      remainingMs === null ? DEFAULT_DELEGATION_TOKEN_RETRY_MS : Math.min(DEFAULT_DELEGATION_TOKEN_RETRY_MS, remainingMs);
    const record = await callControlEndpointWithRetry(
      parentManifestPath,
      `/questions/${questionId}`,
      null,
      {
        [DELEGATION_TOKEN_HEADER]: delegationToken,
        [DELEGATION_RUN_HEADER]: childRunId
      },
      {
        allowedHosts,
        allowedRoots,
        retryMs,
        retryIntervalMs: DEFAULT_DELEGATION_TOKEN_RETRY_INTERVAL_MS,
        ...(timeoutMs !== undefined ? { timeoutMs } : {})
      }
    );
    const status = readStringValue(record, 'status');
    if (status !== 'queued' || waitMs <= 0 || Date.now() >= deadline) {
      const expiresAt = readStringValue(record, 'expires_at', 'expiresAt');
      if (status === 'expired') {
        await applyQuestionFallback(expiryFallback, allowedHosts, allowedRoots);
      }
      return {
        ...record,
        expired_at: status === 'expired' ? expiresAt ?? null : null,
        fallback_action: status === 'expired' ? expiryFallback : null
      };
    }
    await delay(QUESTION_POLL_INTERVAL_MS);
  }

  const remainingMs = waitMs > 0 ? Math.max(0, deadline - Date.now()) : null;
  const timeoutMs =
    remainingMs === null ? undefined : Math.max(1, Math.min(DEFAULT_CONTROL_ENDPOINT_TIMEOUT_MS, remainingMs));
  const record = await callControlEndpoint(
    parentManifestPath,
    `/questions/${questionId}`,
    null,
    {
      [DELEGATION_TOKEN_HEADER]: delegationToken,
      [DELEGATION_RUN_HEADER]: childRunId
    },
    {
      allowedHosts,
      ...(timeoutMs !== undefined ? { timeoutMs } : {})
    }
  );
  return {
    ...record,
    expired_at: null,
    fallback_action: null
  };
}

async function handleGithubCall(
  toolName: string,
  input: Record<string, unknown>,
  request: McpRequest,
  context: {
    githubEnabled: boolean;
    allowedGithubOps: Set<string>;
    allowedRoots: string[];
    allowedHosts: string[];
  }
): Promise<unknown> {
  const op = toolName.replace('github.', '');
  if (!context.githubEnabled || !context.allowedGithubOps.has(op)) {
    throw new Error('github_operation_disallowed');
  }

  if (toolName === 'github.merge') {
    const privateNonce = request.codex_private?.confirm_nonce;
    const manifestPath = resolveManifestPath(
      readStringValue(input, 'manifest_path', 'manifestPath') ?? process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH,
      context.allowedRoots
    );
    if (!privateNonce) {
      return await callControlEndpoint(manifestPath, '/confirmations/create', {
        action: 'merge',
        tool: toolName,
        params: { ...input, manifest_path: manifestPath }
      }, undefined, { allowedHosts: context.allowedHosts });
    }

    try {
      await callControlEndpoint(manifestPath, '/confirmations/validate', {
        confirm_nonce: String(privateNonce),
        tool: toolName,
        params: { ...input, manifest_path: manifestPath }
      }, undefined, { allowedHosts: context.allowedHosts });
    } catch (error) {
      if (!isConfirmationError(error)) {
        throw error;
      }
      return await callControlEndpoint(manifestPath, '/confirmations/create', {
        action: 'merge',
        tool: toolName,
        params: { ...input, manifest_path: manifestPath }
      }, undefined, { allowedHosts: context.allowedHosts });
    }
  }

  switch (toolName) {
    case 'github.open_pr':
      return await runGh([
        'pr',
        'create',
        ...(readStringValue(input, 'title') ? ['--title', readStringValue(input, 'title') as string] : []),
        ...(readStringValue(input, 'body') ? ['--body', readStringValue(input, 'body') as string] : ['--body', '']),
        ...(readStringValue(input, 'base') ? ['--base', readStringValue(input, 'base') as string] : []),
        ...(readStringValue(input, 'head') ? ['--head', readStringValue(input, 'head') as string] : []),
        ...(readBooleanValue(input, 'draft') ? ['--draft'] : []),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : [])
      ]);
    case 'github.comment':
      return await runGh([
        'issue',
        'comment',
        String(requireNumber(readNumberValue(input, 'issue_number', 'issueNumber'), 'issue_number')),
        ...(readStringValue(input, 'body') ? ['--body', readStringValue(input, 'body') as string] : []),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : [])
      ]);
    case 'github.review':
      return await runGh([
        'pr',
        'review',
        String(requireNumber(readNumberValue(input, 'pull_number', 'pullNumber'), 'pull_number')),
        ...(readStringValue(input, 'event') === 'APPROVE' ? ['--approve'] : []),
        ...(readStringValue(input, 'event') === 'REQUEST_CHANGES' ? ['--request-changes'] : []),
        ...(readStringValue(input, 'event') === 'COMMENT' ? ['--comment'] : []),
        ...(readStringValue(input, 'body') ? ['--body', readStringValue(input, 'body') as string] : []),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : [])
      ]);
    case 'github.get_checks': {
      const pullNumber = requireNumber(readNumberValue(input, 'pull_number', 'pullNumber'), 'pull_number');
      const result = await runGh([
        'pr',
        'view',
        String(pullNumber),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : []),
        '--json',
        'statusCheckRollup'
      ]);
      return safeJsonParse(result.stdout) ?? result;
    }
    case 'github.merge': {
      const mergeNumber = requireNumber(readNumberValue(input, 'pull_number', 'pullNumber'), 'pull_number');
      return await runGh([
        'pr',
        'merge',
        String(mergeNumber),
        ...(readStringValue(input, 'method') === 'squash'
          ? ['--squash']
          : readStringValue(input, 'method') === 'rebase'
            ? ['--rebase']
            : ['--merge']),
        ...(readBooleanValue(input, 'delete_branch', 'deleteBranch') ? ['--delete-branch'] : []),
        ...(readStringValue(input, 'repo') ? ['--repo', readStringValue(input, 'repo') as string] : [])
      ]);
    }
    default:
      throw new Error(`Unsupported GitHub tool: ${toolName}`);
  }
}

export async function callControlEndpointWithRetry(
  manifestPath: string,
  endpoint: string,
  payload: Record<string, unknown> | null,
  extraHeaders: Record<string, string> = {},
  options: {
    allowedHosts?: string[];
    allowedRoots?: string[];
    retryMs?: number;
    retryIntervalMs?: number;
    timeoutMs?: number;
  } = {}
): Promise<Record<string, unknown>> {
  const retryMs = options.retryMs ?? 0;
  const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_DELEGATION_TOKEN_RETRY_INTERVAL_MS;
  const deadline = Date.now() + retryMs;
  let attempt = 0;

  while (attempt === 0 || Date.now() < deadline) {
    try {
      return await callControlEndpoint(manifestPath, endpoint, payload, extraHeaders, options);
    } catch (error) {
      if (!shouldRetryControlError(error) || Date.now() >= deadline) {
        throw error;
      }
      attempt += 1;
      await delay(retryIntervalMs * Math.min(4, attempt));
    }
  }
  throw new Error('control endpoint retry exhausted');
}

async function callControlEndpoint(
  manifestPath: string,
  endpoint: string,
  payload: Record<string, unknown> | null,
  extraHeaders: Record<string, string> = {},
  options: { allowedHosts?: string[]; allowedRoots?: string[]; timeoutMs?: number } = {}
): Promise<Record<string, unknown>> {
  const { baseUrl, token } = await loadControlEndpoint(manifestPath, options);
  const url = new URL(endpoint, baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_CONTROL_ENDPOINT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: payload ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        [CSRF_HEADER]: token,
        ...extraHeaders
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('control endpoint request timeout');
    }
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
  if (!res.ok) {
    const raw = await res.text();
    let errorCode: string | null = null;
    let message = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: unknown };
      if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
        errorCode = parsed.error;
        message = parsed.error;
      }
    } catch {
      // ignore parse errors
    }
    const error = new Error(`control endpoint error: ${res.status} ${message}`);
    (error as Error & { code?: string }).code = errorCode ?? undefined;
    throw error;
  }
  return (await res.json()) as Record<string, unknown>;
}

function shouldRetryControlError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'delegation_token_invalid') {
    return true;
  }
  const message = (error as Error | null)?.message ?? '';
  return message.includes('delegation_token_invalid');
}

function isConfirmationError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return !!(code && CONFIRMATION_ERROR_CODES.has(code));
}

export async function loadControlEndpoint(
  manifestPath: string,
  options: { allowedHosts?: string[]; allowedRoots?: string[] } = {}
): Promise<{ baseUrl: URL; token: string }> {
  const resolvedManifest = resolveRunManifestPath(manifestPath, options.allowedRoots, 'manifest_path');
  const runDir = dirname(resolvedManifest);
  const endpointPath = resolve(runDir, 'control_endpoint.json');
  const raw = await readFile(endpointPath, 'utf8');
  const endpointInfo = JSON.parse(raw) as { base_url?: string; token_path?: string };
  const baseUrl = validateControlBaseUrl(endpointInfo.base_url, options.allowedHosts);
  const tokenPath = resolveControlTokenPath(endpointInfo.token_path, runDir);
  const token = await readControlToken(tokenPath);
  return { baseUrl, token };
}

async function assertControlEndpoint(manifestPath: string, allowedHosts: string[]): Promise<void> {
  await loadControlEndpoint(manifestPath, { allowedHosts });
}

function validateControlBaseUrl(raw: unknown, allowedHosts?: string[]): URL {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('control base_url missing');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('control base_url invalid');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('control base_url invalid');
  }
  if (parsed.username || parsed.password) {
    throw new Error('control base_url invalid');
  }
  const allowed = normalizeAllowedHosts(allowedHosts);
  if (allowed.size > 0 && !allowed.has(parsed.hostname.toLowerCase())) {
    throw new Error('control base_url not permitted');
  }
  return parsed;
}

function normalizeAllowedHosts(allowedHosts?: string[]): Set<string> {
  const values = allowedHosts && allowedHosts.length > 0 ? allowedHosts : Array.from(LOOPBACK_HOSTS);
  return new Set(values.map((entry) => entry.toLowerCase()));
}

function resolveControlTokenPath(tokenPath: unknown, runDir: string): string {
  const fallback = resolve(runDir, 'control_auth.json');
  const raw = typeof tokenPath === 'string' ? tokenPath.trim() : '';
  const resolved = raw ? resolve(runDir, raw) : fallback;
  if (!isPathWithinRoots(resolved, [runDir])) {
    throw new Error('control auth path invalid');
  }
  return resolved;
}

async function readControlToken(tokenPath: string): Promise<string> {
  const tokenRaw = await readFile(tokenPath, 'utf8');
  const parsedToken = safeJsonParse(tokenRaw);
  const tokenValue =
    parsedToken && typeof parsedToken === 'object' && !Array.isArray(parsedToken)
      ? (parsedToken as Record<string, unknown>).token
      : null;
  const token =
    typeof tokenValue === 'string' && tokenValue.trim().length > 0
      ? tokenValue.trim()
      : tokenRaw.trim();
  if (!token) {
    throw new Error('control auth token missing');
  }
  return token;
}

async function runGh(args: string[], timeoutMs = DEFAULT_GH_TIMEOUT_MS): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000);
      reject(new Error('gh command timed out'));
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || `gh exited with code ${code}`));
      }
    });
  });
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseSpawnOutput(stdout: string): Record<string, unknown> {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return {};
  }
  const direct = safeJsonParse(trimmed);
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return direct as Record<string, unknown>;
  }
  const lines = trimmed.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].trim().startsWith('{')) {
      continue;
    }
    for (let j = lines.length - 1; j >= i; j -= 1) {
      if (!lines[j].includes('}')) {
        continue;
      }
      const candidate = lines.slice(i, j + 1).join('\n');
      const parsed = safeJsonParse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    }
  }
  return {};
}

export const __test__ = {
  runJsonRpcServer,
  handleToolCall,
  buildToolList,
  createDelegationServerRpcHandler,
  resolveChildDelegateMode,
  parseContentLengthHeader,
  parseSpawnOutput,
  handleDelegateSpawn,
  MAX_MCP_MESSAGE_BYTES,
  MAX_MCP_HEADER_BYTES,
  MAX_QUESTION_POLL_WAIT_MS,
  QUESTION_POLL_INTERVAL_MS,
  clampQuestionPollWaitMs
};

function clampQuestionPollWaitMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(value, MAX_QUESTION_POLL_WAIT_MS);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveRepoRootForRuns(repoRoot: string, env: NodeJS.ProcessEnv): string {
  const configured = env.CODEX_ORCHESTRATOR_ROOT?.trim();
  if (!configured) {
    return repoRoot;
  }
  return isAbsolute(configured) ? configured : resolve(repoRoot, configured);
}

function resolveRunsRoot(repoRoot: string, env: NodeJS.ProcessEnv): string {
  const configured = env.CODEX_ORCHESTRATOR_RUNS_DIR?.trim();
  if (!configured) {
    return resolve(repoRoot, '.runs');
  }
  return isAbsolute(configured) ? configured : resolve(repoRoot, configured);
}

function resolveSpawnStartTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = env.CODEX_DELEGATION_SPAWN_START_TIMEOUT_MS ?? env.DELEGATION_SPAWN_START_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_SPAWN_START_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SPAWN_START_TIMEOUT_MS;
  }
  return parsed;
}

async function snapshotRunManifests(
  taskRunsRoot: string
): Promise<Map<string, { manifestExists: boolean }>> {
  const snapshot = new Map<string, { manifestExists: boolean }>();
  let entries: Array<import('node:fs').Dirent>;
  try {
    entries = await readdir(taskRunsRoot, { withFileTypes: true });
  } catch {
    return snapshot;
  }

  await Promise.all(entries.map(async (entry) => {
    if (!entry.isDirectory()) {
      return;
    }
    const runId = entry.name;
    const manifestPath = join(taskRunsRoot, runId, 'manifest.json');
    let exists = false;
    try {
      await access(manifestPath);
      exists = true;
    } catch {
      exists = false;
    }
    snapshot.set(runId, { manifestExists: exists });
  }));

  return snapshot;
}

async function findSpawnManifest(params: {
  taskId: string;
  taskRunsRoot: string;
  baselineRuns: Map<string, { manifestExists: boolean }>;
  spawnStart: number;
}): Promise<{ runId: string; manifestPath: string; logPath: string | null } | null> {
  let entries: Array<import('node:fs').Dirent>;
  try {
    entries = await readdir(params.taskRunsRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates: Array<{ runId: string; manifestPath: string; mtimeMs: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const runId = entry.name;
    const manifestPath = join(params.taskRunsRoot, runId, 'manifest.json');
    let stats;
    try {
      stats = await stat(manifestPath);
    } catch {
      continue;
    }
    const baseline = params.baselineRuns.get(runId);
    if (baseline?.manifestExists) {
      continue;
    }
    if (stats.mtimeMs < params.spawnStart) {
      continue;
    }
    candidates.push({ runId, manifestPath, mtimeMs: stats.mtimeMs });
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate.manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as { run_id?: string; task_id?: string; log_path?: string | null };
      if (parsed.task_id && parsed.task_id !== params.taskId) {
        continue;
      }
      const runId = typeof parsed.run_id === 'string' && parsed.run_id.trim()
        ? parsed.run_id.trim()
        : candidate.runId;
      if (!runId) {
        continue;
      }
      const logPath =
        typeof parsed.log_path === 'string' && parsed.log_path.trim().length > 0
          ? parsed.log_path.trim()
          : null;
      return { runId, manifestPath: candidate.manifestPath, logPath };
    } catch {
      continue;
    }
  }

  return null;
}

async function pollForSpawnManifest(params: {
  taskId: string;
  taskRunsRoot: string;
  baselineRuns: Map<string, { manifestExists: boolean }>;
  spawnStart: number;
  timeoutMs: number;
  intervalMs: number;
  getSpawnError: () => Error | null;
}): Promise<{ runId: string; manifestPath: string; logPath: string | null } | null> {
  const deadline = Date.now() + params.timeoutMs;
  while (Date.now() <= deadline) {
    if (params.getSpawnError()) {
      return null;
    }
    const manifest = await findSpawnManifest(params);
    if (manifest) {
      return manifest;
    }
    await delay(params.intervalMs);
  }
  return null;
}

async function collectSpawnCandidates(
  taskRunsRoot: string,
  taskId: string
): Promise<Array<{ path: string; reason: string }>> {
  let entries: Array<import('node:fs').Dirent>;
  try {
    entries = await readdir(taskRunsRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const candidates: Array<{ path: string; reason: string }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const manifestPath = join(taskRunsRoot, entry.name, 'manifest.json');
    try {
      await access(manifestPath);
    } catch {
      candidates.push({ path: manifestPath, reason: 'manifest.json missing' });
      if (candidates.length >= 3) {
        return candidates;
      }
      continue;
    }

    try {
      const raw = await readFile(manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as { run_id?: string; task_id?: string };
      if (parsed.task_id && parsed.task_id !== taskId) {
        candidates.push({ path: manifestPath, reason: 'task_id mismatch' });
      } else if (!parsed.run_id) {
        candidates.push({ path: manifestPath, reason: 'run_id missing' });
      } else {
        candidates.push({ path: manifestPath, reason: 'manifest present but not selected' });
      }
    } catch {
      candidates.push({ path: manifestPath, reason: 'manifest unreadable' });
    }

    if (candidates.length >= 3) {
      return candidates;
    }
  }

  return candidates;
}

async function collectOutput(
  child: ReturnType<typeof spawn>,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  let settled = false;
  let rejectPromise: ((error: Error) => void) | null = null;

  const timer = setTimeout(() => {
    if (settled) {
      return;
    }
    settled = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000);
    rejectPromise?.(new Error('delegate.spawn timed out'));
  }, timeoutMs);

  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  await new Promise<void>((resolvePromise, reject) => {
    rejectPromise = reject;
    child.once('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (code === 0 && !signal) {
        resolvePromise();
        return;
      }
      reject(
        new Error(
          `delegate.spawn exited with code ${code ?? 'null'} (${signal ?? 'no signal'}): ${stderr.trim()}`
        )
      );
    });
  });
  return { stdout, stderr };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readCanonicalTraceability(record: Record<string, unknown>): Record<string, unknown> | null {
  const traceability = asRecord(record.traceability);
  return Object.keys(traceability).length > 0 ? traceability : null;
}

const TRANSPORT_MUTATION_METADATA_KEYS = [
  'actor_id',
  'actorId',
  'actor_source',
  'actorSource',
  'transport_principal',
  'transportPrincipal',
  'principal',
  'transport_nonce',
  'transportNonce',
  'nonce',
  'transport_nonce_expires_at',
  'transportNonceExpiresAt',
  'nonce_expires_at',
  'nonceExpiresAt'
] as const;

function hasTransportMutationMetadata(input: Record<string, unknown>): boolean {
  return TRANSPORT_MUTATION_METADATA_KEYS.some((key) => Object.prototype.hasOwnProperty.call(input, key));
}

function readTransportMutationMetadata(input: Record<string, unknown>): TransportMutationMetadata | null {
  if (!Object.prototype.hasOwnProperty.call(input, 'transport')) {
    if (hasTransportMutationMetadata(input)) {
      throw new Error('transport_required');
    }
    return null;
  }
  const rawTransport = input.transport;
  if (typeof rawTransport !== 'string') {
    throw new Error('transport_invalid');
  }
  const normalizedTransport = rawTransport.trim();
  if (!normalizedTransport) {
    throw new Error('transport_invalid');
  }
  if (normalizedTransport !== 'discord' && normalizedTransport !== 'telegram') {
    throw new Error('transport_unsupported');
  }
  const transport = normalizedTransport;
  const actorId = readStringValue(input, 'actor_id', 'actorId');
  const actorSource = readStringValue(input, 'actor_source', 'actorSource');
  const principal = readStringValue(input, 'transport_principal', 'transportPrincipal', 'principal');
  const nonce = readStringValue(input, 'transport_nonce', 'transportNonce', 'nonce');
  const nonceExpiresAt = readStringValue(
    input,
    'transport_nonce_expires_at',
    'transportNonceExpiresAt',
    'nonce_expires_at',
    'nonceExpiresAt'
  );
  return {
    transport,
    ...(actorId ? { actor_id: actorId } : {}),
    ...(actorSource ? { actor_source: actorSource } : {}),
    ...(principal ? { transport_principal: principal } : {}),
    ...(nonce ? { transport_nonce: nonce } : {}),
    ...(nonceExpiresAt ? { transport_nonce_expires_at: nonceExpiresAt } : {})
  };
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumberValue(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readBooleanValue(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function readStringMap(record: Record<string, unknown>, key: string): Record<string, string> | undefined {
  const raw = record[key];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const entries: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof entryValue === 'string') {
      entries[entryKey] = entryValue;
    }
  }
  return Object.keys(entries).length > 0 ? entries : undefined;
}

function requireString(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`${field} is required`);
  }
  return value;
}

function requireNumber(value: number | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} is required`);
  }
  return value;
}

function getDelegateModeViolationMessage(mode: DelegationMode, toolName: string): string | null {
  if (toolName.startsWith('coordinator.') && mode !== 'full') {
    if (mode === 'status_only') {
      return `Tool ${toolName} blocked in status_only mode; only delegate.status is allowed.`;
    }
    return `Tool ${toolName} blocked in question_only mode.`;
  }
  if (mode === 'question_only' && isRestrictedTool(toolName)) {
    return `Tool ${toolName} blocked in question_only mode.`;
  }
  if (mode === 'status_only' && toolName !== 'delegate.status' && isDelegationOrGithubTool(toolName)) {
    return `Tool ${toolName} blocked in status_only mode; only delegate.status is allowed.`;
  }
  return null;
}

function isRestrictedTool(toolName: string): boolean {
  return toolName === 'delegate.spawn' || toolName === 'delegate.pause' || toolName === 'delegate.cancel';
}

function isDelegationOrGithubTool(toolName: string): boolean {
  return toolName.startsWith('delegate.') || toolName.startsWith('github.') || toolName.startsWith('coordinator.');
}

function resolveChildDelegateMode(requestedMode: string, allowNested: boolean): DelegationMode {
  if (requestedMode === 'status_only') {
    return 'status_only';
  }
  if (allowNested && requestedMode === 'full') {
    return 'full';
  }
  return 'question_only';
}

function containsSecret(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function containsAnySecret(record: Record<string, unknown>, keys: readonly string[]): boolean {
  for (const key of keys) {
    if (containsSecret(record, key)) {
      return true;
    }
  }
  return false;
}

async function reportSecurityViolation(
  kind: string,
  summary: string,
  toolName?: string,
  allowedHosts?: string[]
): Promise<void> {
  const manifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
  if (!manifestPath) {
    return;
  }
  try {
    await callControlEndpoint(
      resolve(manifestPath),
      '/security/violation',
      {
        kind,
        summary: toolName ? `${summary} Tool=${toolName}` : summary,
        severity: 'high'
      },
      undefined,
      { allowedHosts }
    );
  } catch {
    // ignore
  }
}

export async function resolveDelegationToken(
  request: McpRequest,
  allowedRoots?: string[],
  options: { retryMs?: number; intervalMs?: number } = {}
): Promise<string | null> {
  const privateToken = request.codex_private?.delegation_token;
  if (privateToken) {
    return String(privateToken);
  }
  const tokenPath = resolveDelegationTokenPath(allowedRoots);
  if (!tokenPath) {
    return null;
  }
  const retryMs = options.retryMs ?? 0;
  const intervalMs = options.intervalMs ?? DEFAULT_DELEGATION_TOKEN_RETRY_INTERVAL_MS;
  const deadline = Date.now() + retryMs;
  let token = await readDelegationTokenFile(tokenPath);
  while (!token && Date.now() < deadline) {
    await delay(intervalMs);
    token = await readDelegationTokenFile(tokenPath);
  }
  return token;
}

function resolveDelegationTokenPath(allowedRoots?: string[]): string | null {
  const explicit = process.env.CODEX_DELEGATION_TOKEN_PATH?.trim();
  const manifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH?.trim();
  let runDir: string | null = null;

  if (manifestPath) {
    try {
      const resolvedManifest = resolveRunManifestPath(manifestPath, allowedRoots, 'manifest_path');
      runDir = dirname(resolvedManifest);
    } catch {
      return null;
    }
  }

  if (explicit) {
    if (!runDir && !isAbsolute(explicit)) {
      return null;
    }
    const resolvedToken =
      runDir && !isAbsolute(explicit) ? resolve(runDir, explicit) : resolve(explicit);
    if (runDir) {
      if (!isPathWithinRoots(resolvedToken, [runDir])) {
        return null;
      }
    } else if (allowedRoots && allowedRoots.length > 0 && !isPathWithinRoots(resolvedToken, allowedRoots)) {
      return null;
    }
    return resolvedToken;
  }

  if (runDir) {
    return resolve(runDir, DELEGATION_TOKEN_FILE);
  }

  return null;
}

async function readDelegationTokenFile(tokenPath: string): Promise<string | null> {
  try {
    const raw = await readFile(tokenPath, 'utf8');
    const parsed = safeJsonParse(raw);
    const tokenValue =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>).token
        : null;
    const token =
      typeof tokenValue === 'string' && tokenValue.trim().length > 0 ? tokenValue.trim() : raw.trim();
    return token || null;
  } catch {
    return null;
  }
}

function buildDelegateMcpOverrides(toolProfile: string[]): string[] {
  const overrides: string[] = ['mcp_servers.delegation.enabled=true'];
  for (const entry of toolProfile) {
    const sanitized = sanitizeToolProfileEntry(entry);
    if (!sanitized) {
      continue;
    }
    overrides.push(`mcp_servers.${sanitized}.enabled=true`);
  }
  return dedupeOverrides(overrides);
}

function sanitizeToolProfileEntry(entry: string): string | null {
  const trimmed = entry.trim();
  if (!trimmed) {
    return null;
  }
  if (!TOOL_PROFILE_ENTRY_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function dedupeOverrides(overrides: string[]): string[] {
  return Array.from(new Set(overrides.filter((override) => override.trim().length > 0)));
}

function collectConfigOverridesFromEnv(env: NodeJS.ProcessEnv = process.env): ConfigOverride[] {
  const overrides: ConfigOverride[] = [];
  for (const key of CONFIG_OVERRIDE_ENV_KEYS) {
    const raw = env[key];
    if (!raw) {
      continue;
    }
    for (const value of splitDelegationConfigOverrides(raw)) {
      overrides.push({ source: 'env', value });
    }
  }
  return overrides;
}

function buildConfigOverrideLayers(overrides: ConfigOverride[]): DelegationConfigLayer[] {
  const layers: DelegationConfigLayer[] = [];
  for (const override of overrides) {
    try {
      const parsed = parseDelegationConfigOverride(override.value, override.source);
      if (parsed) {
        layers.push(parsed);
      }
    } catch (error) {
      logger.warn(
        `Invalid delegation config override (${override.source}): ${(error as Error)?.message ?? String(error)}`
      );
    }
  }
  return layers;
}

function resolveParentManifestPath(input: Record<string, unknown>, allowedRoots: string[]): string | null {
  const envPath = process.env.CODEX_DELEGATION_PARENT_MANIFEST_PATH?.trim();
  const rawPath = envPath ?? readStringValue(input, 'parent_manifest_path', 'parentManifestPath');
  if (!rawPath) {
    return null;
  }
  return resolveRunManifestPath(rawPath, allowedRoots, 'parent_manifest_path');
}

function resolveManifestPath(value: string | undefined, allowedRoots: string[]): string {
  const raw = requireString(value, 'manifest_path');
  return resolveRunManifestPath(raw, allowedRoots, 'manifest_path');
}

export function resolveRunManifestPath(
  rawPath: string,
  allowedRoots: string[] | undefined,
  label = 'manifest_path'
): string {
  const resolved = resolve(rawPath);
  const canonicalPath = realpathSafe(resolved);
  assertRunManifestPath(canonicalPath, label);
  if (allowedRoots && !isPathWithinRoots(canonicalPath, allowedRoots)) {
    throw new Error(`${label} not permitted`);
  }
  return canonicalPath;
}

function assertRunManifestPath(pathname: string, label: string): void {
  const resolvedPath = resolve(pathname);
  if (basename(resolvedPath) !== 'manifest.json') {
    throw new Error(`${label} invalid`);
  }
  const runDir = dirname(resolvedPath);
  const cliDir = dirname(runDir);
  if (basename(cliDir) !== 'cli') {
    throw new Error(`${label} invalid`);
  }
  const taskDir = dirname(cliDir);
  const runsDir = dirname(taskDir);
  if (!basename(runDir) || !basename(taskDir) || dirname(runsDir) === runsDir) {
    throw new Error(`${label} invalid`);
  }
}

function isPathWithinRoots(pathname: string, roots: string[]): boolean {
  const resolved = normalizePath(realpathSafe(pathname));
  return roots.some((root) => {
    const resolvedRoot = normalizePath(realpathSafe(root));
    if (resolvedRoot === resolved) {
      return true;
    }
    const relativePath = relative(resolvedRoot, resolved);
    if (!relativePath) {
      return true;
    }
    if (isAbsolute(relativePath)) {
      return false;
    }
    return !relativePath.startsWith(`..${sep}`) && relativePath !== '..';
  });
}

function realpathSafe(pathname: string): string {
  try {
    return realpathSync(pathname);
  } catch {
    return resolve(pathname);
  }
}

function normalizePath(pathname: string): string {
  return process.platform === 'win32' ? pathname.toLowerCase() : pathname;
}

function resolveSpawnManifestPath(
  manifestPath: string,
  repoRoot: string,
  allowedRoots?: string[]
): string | null {
  if (!manifestPath) {
    return null;
  }
  const resolved = isAbsolute(manifestPath) ? manifestPath : resolve(repoRoot, manifestPath);
  try {
    return resolveRunManifestPath(resolved, allowedRoots, 'manifest_path');
  } catch {
    return null;
  }
}

async function persistDelegationToken(
  manifestPath: string,
  token: string,
  info: { parentRunId: string | null; childRunId: string | null }
): Promise<void> {
  const tokenPath = resolve(dirname(manifestPath), DELEGATION_TOKEN_FILE);
  try {
    await writeJsonAtomic(tokenPath, {
      token,
      parent_run_id: info.parentRunId,
      child_run_id: info.childRunId,
      created_at: new Date().toISOString()
    });
    await chmod(tokenPath, 0o600).catch(() => undefined);
  } catch (error) {
    logger.warn(`Failed to persist delegation token: ${(error as Error)?.message ?? error}`);
  }
}

async function isRunAwaitingQuestion(
  manifestPath: string,
  allowedRoots?: string[]
): Promise<boolean> {
  try {
    const resolvedManifest = resolveRunManifestPath(manifestPath, allowedRoots, 'manifest_path');
    const controlPath = resolve(dirname(resolvedManifest), 'control.json');
    const raw = await readFile(controlPath, 'utf8');
    const snapshot = safeJsonParse(raw) as Record<string, unknown> | null;
    const latest =
      snapshot && snapshot.latest_action && typeof snapshot.latest_action === 'object'
        ? (snapshot.latest_action as Record<string, unknown>)
        : null;
    if (!latest) {
      return false;
    }
    return latest.action === 'pause' && latest.reason === 'awaiting_question_answer';
  } catch {
    return false;
  }
}

export async function applyQuestionFallback(
  fallback: 'pause' | 'resume' | 'fail',
  allowedHosts?: string[],
  allowedRoots?: string[]
): Promise<void> {
  const manifestPath = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
  if (!manifestPath) {
    return;
  }
  const shouldResolve = await isRunAwaitingQuestion(manifestPath, allowedRoots);
  if (!shouldResolve) {
    return;
  }
  const action = fallback === 'pause' ? 'pause' : fallback === 'resume' ? 'resume' : 'fail';
  try {
    await callControlEndpoint(
      resolveRunManifestPath(manifestPath, allowedRoots, 'manifest_path'),
      '/control/action',
      {
        action,
        requested_by: 'delegate',
        reason: 'question_expired'
      },
      undefined,
      { allowedHosts, allowedRoots }
    );
  } catch {
    // ignore
  }
}
