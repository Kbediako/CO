import { afterEach, beforeEach } from 'vitest';

const LEAKY_ENV_KEYS = ['CODEX_ORCHESTRATOR_REPO_CONFIG_PATH', 'CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED'] as const;

function clearLeakyEnv(): void {
  for (const key of LEAKY_ENV_KEYS) {
    delete process.env[key];
  }
}

clearLeakyEnv();
beforeEach(clearLeakyEnv);
afterEach(clearLeakyEnv);
