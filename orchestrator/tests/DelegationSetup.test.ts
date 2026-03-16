import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runDelegationSetup } from '../src/cli/delegationSetup.js';

describe('runDelegationSetup', () => {
  it('uses config fallback readiness when the codex mcp probe is unavailable', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-setup-home-'));
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          '[mcp_servers."delegation"]',
          'command = "codex-orchestrator"',
          `args = ["delegate-server", "--repo", "${process.cwd().replace(/\\/g, '\\\\')}"]`
        ].join('\n'),
        'utf8'
      );

      const result = await runDelegationSetup({
        apply: false,
        repoRoot: process.cwd(),
        env: {
          ...process.env,
          CODEX_HOME: tempHome,
          CODEX_CLI_BIN: join(tempHome, 'missing-codex')
        }
      });

      expect(result.status).toBe('planned');
      expect(result.readiness.configured).toBe(true);
      expect(result.readiness.configPath).toBe(join(tempHome, 'config.toml'));
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
