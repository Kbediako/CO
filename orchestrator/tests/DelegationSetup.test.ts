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

  it('uses config fallback readiness for single-quoted delegation sections with env vars', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-setup-home-'));
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          "[mcp_servers.'delegation']",
          'command = "codex-orchestrator"',
          `args = ["delegate-server", "--repo", "${process.cwd().replace(/\\/g, '\\\\')}"]`,
          '',
          "[mcp_servers.'delegation'.env]",
          'CODEX_LOG_LEVEL = "debug"'
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

  it('uses config fallback readiness for inline delegation entries in the mcp_servers table', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-setup-home-'));
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          '[mcp_servers]',
          `"delegation" = { command = "codex-orchestrator", args = ["delegate-server", "--repo", "${process.cwd().replace(/\\/g, '\\\\')}"], env = { CODEX_LOG_LEVEL = "debug" } }`
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

  it('does not mark non-delegation inline entries as configured during fallback readiness', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-setup-home-'));
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          '[mcp_servers]',
          `"delegation" = { command = "python", args = ["echo", "--repo", "${process.cwd().replace(/\\/g, '\\\\')}"], env = { CODEX_LOG_LEVEL = "debug" } }`
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
      expect(result.readiness.configured).toBe(false);
      expect(result.readiness.configPath).toBe(join(tempHome, 'config.toml'));
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
