import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { logger } from '../../logger.js';
import {
  findPipeline,
  parseUserConfigRaw,
  resolveRepoConfigPath
} from '../config/userConfig.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { isoTimestamp } from '../utils/time.js';
import type { ControlProviderWorkflowPayload } from './observabilityReadModel.js';

export interface ProviderWorkflowConfigStore {
  bootstrap(): Promise<ControlProviderWorkflowPayload>;
  refresh(): Promise<ControlProviderWorkflowPayload>;
  snapshot(): ControlProviderWorkflowPayload;
  getLaunchConfigPath(): Promise<string>;
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
  const sourcePath = resolveRepoConfigPath(createOptions.env);
  const snapshotPath = join(createOptions.runDir, PROVIDER_WORKFLOW_SNAPSHOT_FILE);
  let bootstrapped = false;
  let lastObservedRevision: string | null = null;
  let state: ControlProviderWorkflowPayload = {
    status: 'reload_failed',
    pipeline_id: createOptions.pipelineId,
    source_path: sourcePath,
    snapshot_path: null,
    last_reload_attempt_at: null,
    last_success_at: null,
    last_error_at: null,
    last_error: null
  };

  async function bootstrap(): Promise<ControlProviderWorkflowPayload> {
    const nextState = await attemptReload({ startup: true });
    bootstrapped = true;
    return nextState;
  }

  async function refresh(): Promise<ControlProviderWorkflowPayload> {
    if (!bootstrapped) {
      return await bootstrap();
    }
    return await attemptReload({ startup: false });
  }

  async function getLaunchConfigPath(): Promise<string> {
    const nextState = await refresh();
    if (!nextState.snapshot_path) {
      throw new Error('Provider workflow config snapshot is unavailable.');
    }
    return nextState.snapshot_path;
  }

  async function attemptReload(reloadOptions: {
    startup: boolean;
  }): Promise<ControlProviderWorkflowPayload> {
    const attemptedAt = isoTimestamp();
    let revision: string | null = null;
    try {
      const sourceStat = await stat(sourcePath);
      revision = `${sourceStat.mtimeMs}:${sourceStat.size}`;
      if (!reloadOptions.startup && revision === lastObservedRevision) {
        return state;
      }

      const raw = await readFile(sourcePath, 'utf8');
      const config = parseUserConfigRaw(raw, 'repo');
      if (!config) {
        throw new Error(`Missing codex.orchestrator.json at ${sourcePath}`);
      }
      if (!findPipeline(config, createOptions.pipelineId)) {
        throw new Error(
          `Repo-local codex.orchestrator.json is missing required pipeline "${createOptions.pipelineId}".`
        );
      }

      await mkdir(dirname(snapshotPath), { recursive: true });
      await writeFile(snapshotPath, raw, 'utf8');
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
        last_error: null
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
      if (reloadOptions.startup || !state.snapshot_path) {
        throw new Error(`Failed to load provider workflow config path=${sourcePath}: ${reason}`);
      }
      logger.error(
        `[provider-workflow] Failed to reload config path=${sourcePath} reason=${reason}; keeping last known good configuration`
      );
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

  return {
    bootstrap,
    refresh,
    snapshot: () => state,
    getLaunchConfigPath
  };
}
