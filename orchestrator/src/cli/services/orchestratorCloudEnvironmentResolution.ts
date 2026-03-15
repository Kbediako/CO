import process from 'node:process';

import type { TaskContext, PlanItem } from '../../types.js';

function readCloudEnvironmentString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function resolveCloudEnvironmentId(
  task: TaskContext,
  target: PlanItem,
  envOverrides?: NodeJS.ProcessEnv
): string | null {
  const metadata = (target.metadata ?? {}) as Record<string, unknown>;
  const taskMetadata = (task.metadata ?? {}) as Record<string, unknown>;
  const taskCloud = (taskMetadata.cloud ?? null) as Record<string, unknown> | null;

  const candidates: Array<string | null> = [
    readCloudEnvironmentString(metadata.cloudEnvId),
    readCloudEnvironmentString(metadata.cloud_env_id),
    readCloudEnvironmentString(metadata.envId),
    readCloudEnvironmentString(metadata.environmentId),
    readCloudEnvironmentString(taskCloud?.envId),
    readCloudEnvironmentString(taskCloud?.environmentId),
    readCloudEnvironmentString(taskMetadata.cloudEnvId),
    readCloudEnvironmentString(taskMetadata.cloud_env_id),
    readCloudEnvironmentString(envOverrides?.CODEX_CLOUD_ENV_ID),
    readCloudEnvironmentString(process.env.CODEX_CLOUD_ENV_ID)
  ];

  return candidates.find((candidate) => candidate !== null) ?? null;
}
