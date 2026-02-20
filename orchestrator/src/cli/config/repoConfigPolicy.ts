import { join } from 'node:path';
import process from 'node:process';

export const REPO_CONFIG_REQUIRED_ENV_KEY = 'CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED';
const REPO_CONFIG_REQUIRED_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function isRepoConfigRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env[REPO_CONFIG_REQUIRED_ENV_KEY];
  if (typeof raw !== 'string') {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return REPO_CONFIG_REQUIRED_TRUE_VALUES.has(normalized);
}

export function formatRepoConfigRequiredError(repoRoot: string): string {
  return [
    `Repo-local codex.orchestrator.json is required when ${REPO_CONFIG_REQUIRED_ENV_KEY}=1.`,
    `Expected: ${join(repoRoot, 'codex.orchestrator.json')}.`,
    'Run `codex-orchestrator init codex` to scaffold repo-local config.'
  ].join(' ');
}
