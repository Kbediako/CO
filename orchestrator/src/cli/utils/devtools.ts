import { EnvUtils } from '../../../../packages/shared/config/env.js';

export const DEVTOOLS_CONFIG_OVERRIDE = 'mcp_servers.chrome-devtools.enabled=true';

export function isDevtoolsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.CODEX_REVIEW_DEVTOOLS;
  if (!raw) {
    return false;
  }
  return EnvUtils.isTrue(raw.trim().toLowerCase());
}

export function resolveCodexCommand(
  args: string[],
  env: NodeJS.ProcessEnv = process.env
): { command: string; args: string[] } {
  if (!isDevtoolsEnabled(env)) {
    return { command: 'codex', args };
  }
  return {
    command: 'codex',
    args: ['-c', DEVTOOLS_CONFIG_OVERRIDE, ...args]
  };
}
