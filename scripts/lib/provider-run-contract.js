export const PROVIDER_LAUNCH_SOURCE_ENV = 'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE';
export const PROVIDER_LAUNCH_TOKEN_ENV = 'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN';
export const PROVIDER_CONTROL_HOST_TASK_ID_ENV =
  'CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID';
export const PROVIDER_CONTROL_HOST_RUN_ID_ENV =
  'CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID';
export const PROVIDER_LAUNCH_SOURCE_CONTROL_HOST = 'control-host';

function readNonEmptyString(record, key) {
  const value = record?.[key];
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

export function readProviderControlHostLocatorFromEnv(env) {
  const launchSource = readNonEmptyString(env, PROVIDER_LAUNCH_SOURCE_ENV);
  const taskId = readNonEmptyString(env, PROVIDER_CONTROL_HOST_TASK_ID_ENV);
  const runId = readNonEmptyString(env, PROVIDER_CONTROL_HOST_RUN_ID_ENV);
  return launchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST && taskId && runId
    ? { taskId, runId }
    : null;
}

export function readProviderControlHostLocatorFromManifest(record) {
  const taskId = readNonEmptyString(record, 'provider_control_host_task_id');
  const runId = readNonEmptyString(record, 'provider_control_host_run_id');
  return taskId && runId ? { taskId, runId } : null;
}
