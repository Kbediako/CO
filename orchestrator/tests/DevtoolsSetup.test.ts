import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runDevtoolsSetup } from '../src/cli/devtoolsSetup.js';

describe('runDevtoolsSetup', () => {
  it('returns a plan without applying changes by default', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'devtools-setup-'));
    try {
      const result = await runDevtoolsSetup({
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      expect(result.status).toBe('planned');
      expect(result.plan.configPath).toBe(join(tempHome, 'config.toml'));
      expect(result.plan.commandLine).toContain(
        'codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest'
      );
      expect(result.plan.configSnippet).toContain('[mcp_servers.chrome-devtools]');
      expect(result.readiness.config.status).toBe('missing');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
