import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { logger } from '../../logger.js';
import {
  findPipeline,
  parseUserConfigRaw,
  resolveRepoConfigPath
} from '../config/userConfig.js';
import type { PipelineDefinition } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { isoTimestamp } from '../utils/time.js';
import {
  resolveProviderOperatorAutopilotAuditPath,
  resolveProviderOperatorAutopilotConfig,
  type ProviderOperatorAutopilotResult
} from './providerOperatorAutopilot.js';
import {
  resolveProviderTerminalCleanupConfig,
  type ProviderTerminalCleanupResult
} from './providerTerminalCleanup.js';
import {
  cloneProviderWorkerHostConfigs,
  resolveProviderWorkerHostConfig
} from './providerWorkerHosts.js';
import type {
  ControlProviderOperatorAutopilotLastResultPayload,
  ControlProviderTerminalCleanupLastResultPayload,
  ControlProviderWorkflowPayload
} from './observabilityReadModel.js';

export interface ProviderWorkflowConfigStore {
  bootstrap(): Promise<ControlProviderWorkflowPayload>;
  refresh(): Promise<ControlProviderWorkflowPayload>;
  snapshot(): ControlProviderWorkflowPayload;
  getLaunchConfigPath(): Promise<string>;
  recordTerminalCleanupResult(result: ProviderTerminalCleanupResult): void;
  recordOperatorAutopilotResult(result: ProviderOperatorAutopilotResult): void;
}

interface CreateProviderWorkflowConfigStoreOptions {
  env: EnvironmentPaths;
  runDir: string;
  pipelineId: string;
}

const PROVIDER_WORKFLOW_SNAPSHOT_FILE = 'provider-workflow.last-known-good.json';

export function createProviderWorkflowConfigStore(
  createOptions: CreateProviderWorkflowConfigStoreOptions
): ProviderWorkflowConfigStore {
  const cloneState = (
    value: ControlProviderWorkflowPayload
  ): ControlProviderWorkflowPayload =>
    JSON.parse(JSON.stringify(value)) as ControlProviderWorkflowPayload;
  const sourcePath = resolveRepoConfigPath(createOptions.env);
  const snapshotPath = join(createOptions.runDir, PROVIDER_WORKFLOW_SNAPSHOT_FILE);
  // This store assumes serialized access from the single-threaded control-host
  // runtime loop. Public reload helpers still take an explicit lock because
  // observability reads and provider launches can overlap through async call
  // paths even on a single Node event loop.
  let bootstrapped = false;
  let lastObservedRevision: string | null = null;
  let reloadQueue: Promise<void> = Promise.resolve();
  let state: ControlProviderWorkflowPayload = {
    status: 'reload_failed',
    pipeline_id: createOptions.pipelineId,
    source_path: sourcePath,
    snapshot_path: null,
    last_reload_attempt_at: null,
    last_success_at: null,
    last_error_at: null,
    last_error: null,
    terminal_cleanup: buildDefaultTerminalCleanupPayload(),
    worker_hosts: [],
    operator_autopilot: buildDefaultOperatorAutopilotPayload(createOptions.runDir)
  };

  async function snapshotIsUsable(path: string | null): Promise<boolean> {
    if (!path) {
      return false;
    }
    try {
      if (!(await stat(path)).isFile()) {
        return false;
      }
      const raw = await readFile(path, 'utf8');
      const config = parseUserConfigRaw(raw, 'repo');
      const pipeline = config ? findPipeline(config, createOptions.pipelineId) : null;
      if (!pipeline) {
        return false;
      }
      buildWorkerHostsPayload(pipeline.metadata);
      return true;
    } catch {
      return false;
    }
  }

  async function replaceSnapshotAtomically(raw: string): Promise<void> {
    const tempSnapshotPath = `${snapshotPath}.tmp`;
    try {
      await writeFile(tempSnapshotPath, raw, 'utf8');
      await rename(tempSnapshotPath, snapshotPath);
    } catch (error) {
      await rm(tempSnapshotPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async function runWithReloadLock<T>(action: () => Promise<T>): Promise<T> {
    const previous = reloadQueue;
    let release!: () => void;
    reloadQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous.catch(() => undefined);
    try {
      return await action();
    } finally {
      release();
    }
  }

  async function bootstrapUnlocked(): Promise<ControlProviderWorkflowPayload> {
    const nextState = await attemptReload({ startup: true });
    bootstrapped = true;
    return nextState;
  }

  async function refreshUnlocked(): Promise<ControlProviderWorkflowPayload> {
    if (!bootstrapped) {
      return await bootstrapUnlocked();
    }
    return await attemptReload({ startup: false });
  }

  async function bootstrap(): Promise<ControlProviderWorkflowPayload> {
    return cloneState(await runWithReloadLock(() => bootstrapUnlocked()));
  }

  async function refresh(): Promise<ControlProviderWorkflowPayload> {
    return cloneState(await runWithReloadLock(() => refreshUnlocked()));
  }

  async function getLaunchConfigPath(): Promise<string> {
    return await runWithReloadLock(async () => {
      let nextState = await refreshUnlocked();
      if (!(await snapshotIsUsable(nextState.snapshot_path))) {
        nextState = await attemptReload({
          startup: false,
          forceSnapshotRewrite: true
        });
      }
      if (!nextState.snapshot_path || !(await snapshotIsUsable(nextState.snapshot_path))) {
        throw new Error(
          nextState.last_error
            ? `Provider workflow config snapshot is unavailable: ${nextState.last_error}`
            : 'Provider workflow config snapshot is unavailable.'
        );
      }
      return nextState.snapshot_path;
    });
  }

  async function attemptReload(reloadOptions: {
    startup: boolean;
    forceSnapshotRewrite?: boolean;
  }): Promise<ControlProviderWorkflowPayload> {
    const attemptedAt = isoTimestamp();
    let revision: string | null = null;
    try {
      const sourceStat = await stat(sourcePath);
      revision = `${sourceStat.mtimeMs}:${sourceStat.size}`;
      // Only short-circuit when the current revision is healthy. Failed reloads
      // must be retried even if `mtime:size` is unchanged so transient errors or
      // same-metadata repairs can recover.
      if (
        !reloadOptions.startup &&
        !reloadOptions.forceSnapshotRewrite &&
        revision === lastObservedRevision &&
        state.status === 'ready' &&
        (await snapshotIsUsable(state.snapshot_path))
      ) {
        return state;
      }

      const raw = await readFile(sourcePath, 'utf8');
      const pipeline = parseRequiredPipelineFromRaw(raw, sourcePath, createOptions.pipelineId);
      const nextTerminalCleanup = buildTerminalCleanupPayload(
        pipeline.metadata,
        state.terminal_cleanup?.last_result ?? null
      );
      const nextWorkerHosts = buildWorkerHostsPayload(pipeline.metadata);

      await mkdir(dirname(snapshotPath), { recursive: true });
      await replaceSnapshotAtomically(raw);
      lastObservedRevision = revision;
      const previousStatus = state.status;
      state = {
        status: 'ready',
        pipeline_id: createOptions.pipelineId,
        source_path: sourcePath,
        snapshot_path: snapshotPath,
        last_reload_attempt_at: attemptedAt,
        last_success_at: attemptedAt,
        last_error_at: null,
        last_error: null,
        terminal_cleanup: nextTerminalCleanup,
        worker_hosts: nextWorkerHosts,
        operator_autopilot: buildOperatorAutopilotPayload(
          pipeline.metadata,
          state.operator_autopilot?.last_result ?? null,
          createOptions.runDir
        )
      };
      if (!reloadOptions.startup && previousStatus === 'reload_failed') {
        logger.info(
          `[provider-workflow] Reloaded config from ${sourcePath}; cleared prior reload error.`
        );
      }
      return state;
    } catch (error) {
      const reason = (error as Error).message;
      lastObservedRevision = revision ?? 'missing';
      const fallbackSnapshotPath = await resolveUsableSnapshotPath(state.snapshot_path, snapshotPath);
      if (fallbackSnapshotPath) {
        logger.error(
          `[provider-workflow] Failed to reload config path=${sourcePath} reason=${reason}; keeping last known good configuration`
        );
        const snapshotRaw = await readFile(fallbackSnapshotPath, 'utf8');
        const pipeline = parseRequiredPipelineFromRaw(
          snapshotRaw,
          fallbackSnapshotPath,
          createOptions.pipelineId
        );
        state = {
          ...state,
          status: 'reload_failed',
          pipeline_id: createOptions.pipelineId,
          source_path: sourcePath,
          snapshot_path: fallbackSnapshotPath,
          last_reload_attempt_at: attemptedAt,
          last_success_at: state.last_success_at ?? attemptedAt,
          last_error_at: attemptedAt,
          last_error: reason,
          terminal_cleanup: buildTerminalCleanupPayload(
            pipeline.metadata,
            state.terminal_cleanup?.last_result ?? null
          ),
          worker_hosts: buildWorkerHostsPayload(pipeline.metadata),
          operator_autopilot: buildOperatorAutopilotPayload(
            pipeline.metadata,
            state.operator_autopilot?.last_result ?? null,
            createOptions.runDir
          )
        };
        return state;
      }
      if (reloadOptions.startup) {
        throw new Error(`Failed to load provider workflow config path=${sourcePath}: ${reason}`);
      }
      state = {
        ...state,
        status: 'reload_failed',
        last_reload_attempt_at: attemptedAt,
        last_error_at: attemptedAt,
        last_error: reason
      };
      return state;
    }
  }

  async function resolveUsableSnapshotPath(
    preferredPath: string | null,
    defaultPath: string
  ): Promise<string | null> {
    if (await snapshotIsUsable(preferredPath)) {
      return preferredPath;
    }
    return (await snapshotIsUsable(defaultPath)) ? defaultPath : null;
  }

  return {
    bootstrap,
    refresh,
    snapshot: () => cloneState(state),
    getLaunchConfigPath,
    recordTerminalCleanupResult: (result) => {
      state = {
        ...state,
        terminal_cleanup: {
          ...(state.terminal_cleanup ?? buildDefaultTerminalCleanupPayload()),
          last_result: mapTerminalCleanupResult(result)
        }
      };
    },
    recordOperatorAutopilotResult: (result) => {
      state = {
        ...state,
        operator_autopilot: {
          ...(state.operator_autopilot ?? buildDefaultOperatorAutopilotPayload(createOptions.runDir)),
          last_result: cloneOperatorAutopilotLastResult(result)
        }
      };
    }
  };
}

function buildDefaultTerminalCleanupPayload(): NonNullable<
  ControlProviderWorkflowPayload['terminal_cleanup']
> {
  return {
    enabled: false,
    close_attached_pr: {
      enabled: false,
      comment_template:
        resolveProviderTerminalCleanupConfig(null).closeAttachedPr.commentTemplate
    },
    last_result: null
  };
}

function buildDefaultOperatorAutopilotPayload(
  runDir: string
): NonNullable<ControlProviderWorkflowPayload['operator_autopilot']> {
  const config = resolveProviderOperatorAutopilotConfig(null);
  return {
    enabled: config.enabled,
    backlog_promotion: {
      enabled: config.backlog_promotion.enabled,
      state_name: config.backlog_promotion.state_name,
      target_state_name: config.backlog_promotion.target_state_name
    },
    review_handoff_rework: {
      enabled: config.review_handoff_rework.enabled,
      target_state_name: config.review_handoff_rework.target_state_name,
      excluded_action_required_reasons: [
        ...config.review_handoff_rework.excluded_action_required_reasons
      ]
    },
    post_merge_rollout: {
      enabled: config.post_merge_rollout.enabled,
      summary: config.post_merge_rollout.summary
    },
    audit_path: resolveProviderOperatorAutopilotAuditPath(runDir),
    last_result: null
  };
}

function parseRequiredPipelineFromRaw(
  raw: string,
  path: string,
  pipelineId: string
): PipelineDefinition {
  const config = parseUserConfigRaw(raw, 'repo');
  if (!config) {
    throw new Error(`Missing codex.orchestrator.json at ${path}`);
  }
  const pipeline = findPipeline(config, pipelineId);
  if (!pipeline) {
    throw new Error(
      `Repo-local codex.orchestrator.json is missing required pipeline "${pipelineId}".`
    );
  }
  return pipeline;
}

function buildTerminalCleanupPayload(
  metadata: unknown,
  lastResult: ControlProviderTerminalCleanupLastResultPayload | null
): NonNullable<ControlProviderWorkflowPayload['terminal_cleanup']> {
  const config = resolveProviderTerminalCleanupConfig(metadata);
  return {
    enabled: config.enabled,
    close_attached_pr: {
      enabled: config.closeAttachedPr.enabled,
      comment_template: config.closeAttachedPr.commentTemplate
    },
    last_result: lastResult ? cloneTerminalCleanupLastResult(lastResult) : null
  };
}

function buildOperatorAutopilotPayload(
  metadata: unknown,
  lastResult: ControlProviderOperatorAutopilotLastResultPayload | null,
  runDir: string
): NonNullable<ControlProviderWorkflowPayload['operator_autopilot']> {
  const config = resolveProviderOperatorAutopilotConfig(metadata);
  return {
    enabled: config.enabled,
    backlog_promotion: {
      enabled: config.backlog_promotion.enabled,
      state_name: config.backlog_promotion.state_name,
      target_state_name: config.backlog_promotion.target_state_name
    },
    review_handoff_rework: {
      enabled: config.review_handoff_rework.enabled,
      target_state_name: config.review_handoff_rework.target_state_name,
      excluded_action_required_reasons: [
        ...config.review_handoff_rework.excluded_action_required_reasons
      ]
    },
    post_merge_rollout: {
      enabled: config.post_merge_rollout.enabled,
      summary: config.post_merge_rollout.summary
    },
    audit_path: resolveProviderOperatorAutopilotAuditPath(runDir),
    last_result: lastResult ? cloneOperatorAutopilotLastResult(lastResult) : null
  };
}

function mapTerminalCleanupResult(
  result: ProviderTerminalCleanupResult
): ControlProviderTerminalCleanupLastResultPayload {
  return {
    attempted_at: result.attemptedAt,
    status: result.status,
    summary: result.summary,
    error: result.error,
    issue_id: result.issueId,
    issue_identifier: result.issueIdentifier,
    workspace_path: result.workspacePath,
    branch: result.branch,
    attached_pr_urls: [...result.attachedPrUrls],
    matching_open_pr_urls: [...result.matchingOpenPrUrls],
    closed_pr_urls: [...result.closedPrUrls]
  };
}

function cloneTerminalCleanupLastResult(
  result: ControlProviderTerminalCleanupLastResultPayload
): ControlProviderTerminalCleanupLastResultPayload {
  return {
    attempted_at: result.attempted_at,
    status: result.status,
    summary: result.summary,
    error: result.error,
    issue_id: result.issue_id,
    issue_identifier: result.issue_identifier,
    workspace_path: result.workspace_path,
    branch: result.branch,
    attached_pr_urls: [...result.attached_pr_urls],
    matching_open_pr_urls: [...result.matching_open_pr_urls],
    closed_pr_urls: [...result.closed_pr_urls]
  };
}

function buildWorkerHostsPayload(metadata: unknown): ControlProviderWorkflowPayload['worker_hosts'] {
  return cloneProviderWorkerHostConfigs(resolveProviderWorkerHostConfig(metadata));
}

function cloneOperatorAutopilotLastResult(
  result: ControlProviderOperatorAutopilotLastResultPayload
): ControlProviderOperatorAutopilotLastResultPayload {
  return {
    recorded_at: result.recorded_at,
    status: result.status,
    summary: result.summary,
    error: result.error,
    actions: result.actions.map((action) => ({
      kind: action.kind,
      issue_id: action.issue_id,
      issue_identifier: action.issue_identifier,
      reason: action.reason,
      summary: action.summary,
      transition: {
        status: action.transition.status,
        attempted_at: action.transition.attempted_at,
        previous_state: action.transition.previous_state,
        target_state: action.transition.target_state,
        issue_state: action.transition.issue_state,
        issue_state_type: action.transition.issue_state_type,
        issue_updated_at: action.transition.issue_updated_at,
        error: action.transition.error
      },
      action_required_reasons: [...action.action_required_reasons]
    })),
    holds: result.holds.map((hold) => ({
      kind: hold.kind,
      issue_id: hold.issue_id,
      issue_identifier: hold.issue_identifier,
      reason: hold.reason,
      summary: hold.summary,
      action_required_reasons: [...hold.action_required_reasons]
    })),
    pending_actions: result.pending_actions.map((pendingAction) => ({
      kind: pendingAction.kind,
      issue_id: pendingAction.issue_id,
      issue_identifier: pendingAction.issue_identifier,
      summary: pendingAction.summary,
      merge_closeout_reason: pendingAction.merge_closeout_reason,
      shared_root_status: pendingAction.shared_root_status,
      linear_transition_status: pendingAction.linear_transition_status
    }))
  };
}
