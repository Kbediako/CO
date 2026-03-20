export const PROVIDER_LAUNCH_SOURCE_ENV: 'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE';
export const PROVIDER_LAUNCH_TOKEN_ENV: 'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN';
export const PROVIDER_CONTROL_HOST_TASK_ID_ENV: 'CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID';
export const PROVIDER_CONTROL_HOST_RUN_ID_ENV: 'CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID';
export const PROVIDER_LAUNCH_SOURCE_CONTROL_HOST: 'control-host';
export function readProviderControlHostLocatorFromEnv(
  env: Record<string, unknown>
): { taskId: string; runId: string } | null;
export function readProviderControlHostLocatorFromManifest(
  record: Record<string, unknown>
): { taskId: string; runId: string } | null;
