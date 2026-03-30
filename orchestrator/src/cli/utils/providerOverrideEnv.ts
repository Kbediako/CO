import { join } from 'node:path';

import { readProviderControlHostLocatorFromEnv } from '../../../../scripts/lib/provider-run-contract.js';
import { REPO_CONFIG_REQUIRED_ENV_KEY } from '../config/repoConfigPolicy.js';
import { REPO_CONFIG_PATH_ENV_KEY } from '../config/userConfig.js';

const PROVIDER_REPO_CONFIG_PATH_ENV_KEY = 'CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH';
const PROVIDER_PACKAGE_ROOT_ENV_KEY = 'CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT';
const PROVIDER_OVERRIDE_ENV_KEYS = [
  REPO_CONFIG_PATH_ENV_KEY,
  'CODEX_ORCHESTRATOR_PACKAGE_ROOT'
] as const;
const PROVIDER_OVERRIDE_MARKER_ENV_KEYS = [
  PROVIDER_REPO_CONFIG_PATH_ENV_KEY,
  PROVIDER_PACKAGE_ROOT_ENV_KEY
] as const;

export {
  PROVIDER_OVERRIDE_ENV_KEYS,
  PROVIDER_OVERRIDE_MARKER_ENV_KEYS,
  PROVIDER_PACKAGE_ROOT_ENV_KEY,
  PROVIDER_REPO_CONFIG_PATH_ENV_KEY
};

export function sanitizeProviderOverrideEnv(
  env: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = { ...env };
  const controlHostLocator = readProviderControlHostLocatorFromEnv(sanitized);
  if (!controlHostLocator) {
    return sanitized;
  }
  const currentRepoConfigPath = normalizeEnvString(sanitized[REPO_CONFIG_PATH_ENV_KEY]);
  const currentPackageRoot = normalizeEnvString(sanitized.CODEX_ORCHESTRATOR_PACKAGE_ROOT);
  const providerPackageRootMarker = normalizeEnvString(sanitized[PROVIDER_PACKAGE_ROOT_ENV_KEY]);
  const providerRepoConfigPath =
    normalizeEnvString(sanitized[PROVIDER_REPO_CONFIG_PATH_ENV_KEY]) ??
    deriveProviderRepoConfigPath(
      providerPackageRootMarker ?? currentPackageRoot,
      controlHostLocator.taskId,
      controlHostLocator.runId
    );
  const providerPackageRoot =
    providerPackageRootMarker ??
    (currentRepoConfigPath && providerRepoConfigPath && currentRepoConfigPath === providerRepoConfigPath
      ? currentPackageRoot
      : null);
  const shouldStripRepoConfig =
    currentRepoConfigPath !== null &&
    providerRepoConfigPath !== null &&
    currentRepoConfigPath === providerRepoConfigPath;
  const shouldStripPackageRoot =
    currentPackageRoot !== null &&
    providerPackageRoot !== null &&
    currentPackageRoot === providerPackageRoot;
  if (shouldStripRepoConfig) {
    delete sanitized[REPO_CONFIG_PATH_ENV_KEY];
    delete sanitized[REPO_CONFIG_REQUIRED_ENV_KEY];
  }
  if (shouldStripPackageRoot) {
    delete sanitized.CODEX_ORCHESTRATOR_PACKAGE_ROOT;
  }
  for (const key of PROVIDER_OVERRIDE_MARKER_ENV_KEYS) {
    delete sanitized[key];
  }
  return sanitized;
}

function deriveProviderRepoConfigPath(
  packageRoot: string | null,
  controlHostTaskId: string,
  controlHostRunId: string
): string | null {
  if (!packageRoot) {
    return null;
  }
  return join(
    packageRoot,
    '.runs',
    controlHostTaskId,
    'cli',
    controlHostRunId,
    'provider-workflow.last-known-good.json'
  );
}

function normalizeEnvString(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
