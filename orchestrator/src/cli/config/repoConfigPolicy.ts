import process from 'node:process';

export const REPO_CONFIG_REQUIRED_ENV_KEY = 'CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED';
export const CONFIG_AUTHORITY_MODE_ENV_KEY = 'CODEX_ORCHESTRATOR_CONFIG_MODE';
const REPO_CONFIG_REQUIRED_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const REPO_CONFIG_REQUIRED_FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

export type ConfigAuthorityMode = 'repo-authoritative' | 'downstream-compatibility';

export interface ConfigAuthorityModeResolution {
  mode: ConfigAuthorityMode;
  reason: string;
}

export function isRepoConfigRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveConfigAuthorityMode(env).mode === 'repo-authoritative';
}

export function resolveConfigAuthorityMode(
  env: NodeJS.ProcessEnv = process.env
): ConfigAuthorityModeResolution {
  const explicitMode = normalizeConfigAuthorityMode(env[CONFIG_AUTHORITY_MODE_ENV_KEY]);
  if (explicitMode) {
    return {
      mode: explicitMode,
      reason:
        explicitMode === 'repo-authoritative'
          ? `${CONFIG_AUTHORITY_MODE_ENV_KEY}=repo-authoritative`
          : `${CONFIG_AUTHORITY_MODE_ENV_KEY}=downstream-compatibility`
    };
  }

  const raw = env[REPO_CONFIG_REQUIRED_ENV_KEY];
  if (typeof raw !== 'string') {
    return {
      mode: 'repo-authoritative',
      reason: 'default repo-authoritative mode'
    };
  }
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return {
      mode: 'repo-authoritative',
      reason: 'default repo-authoritative mode'
    };
  }
  if (REPO_CONFIG_REQUIRED_TRUE_VALUES.has(normalized)) {
    return {
      mode: 'repo-authoritative',
      reason: `${REPO_CONFIG_REQUIRED_ENV_KEY}=1 legacy strict alias`
    };
  }
  if (REPO_CONFIG_REQUIRED_FALSE_VALUES.has(normalized)) {
    return {
      mode: 'downstream-compatibility',
      reason: `${REPO_CONFIG_REQUIRED_ENV_KEY}=0 legacy compatibility alias`
    };
  }
  return {
    mode: 'repo-authoritative',
    reason: 'default repo-authoritative mode'
  };
}

export function formatRepoConfigRequiredError(repoConfigPath: string): string {
  return [
    `Repo-local codex.orchestrator.json is required in repo-authoritative config mode.`,
    `Expected: ${repoConfigPath}.`,
    'Run `codex-orchestrator init codex` to scaffold repo-local config, or rerun with `--config-mode downstream-compatibility` to use the packaged compatibility config explicitly.'
  ].join(' ');
}

function normalizeConfigAuthorityMode(value: unknown): ConfigAuthorityMode | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (
    normalized === 'repo-authoritative' ||
    normalized === 'repo_authoritative' ||
    normalized === 'repo' ||
    normalized === 'authoritative'
  ) {
    return 'repo-authoritative';
  }
  if (
    normalized === 'downstream-compatibility' ||
    normalized === 'downstream_compatibility' ||
    normalized === 'compatibility' ||
    normalized === 'compat'
  ) {
    return 'downstream-compatibility';
  }
  throw new Error(
    `Invalid ${CONFIG_AUTHORITY_MODE_ENV_KEY} value "${value}". Expected repo-authoritative or downstream-compatibility.`
  );
}
