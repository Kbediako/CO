import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

export function resolveCodexHome(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.CODEX_HOME?.trim();
  if (override) {
    return override;
  }
  return join(homedir(), '.codex');
}

export function resolveCodexOrchestratorHome(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveCodexHome(env), 'orchestrator');
}
