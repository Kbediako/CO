import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readDelegationFallbackConfig } from '../src/cli/utils/delegationConfigParser.js';

describe('readDelegationFallbackConfig', () => {
  it('parses args and env vars from a quoted delegation section', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-config-parser-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          '[mcp_servers."delegation"]',
          'command = "codex-orchestrator"',
          'args = ["delegate-server", "--repo", "/tmp/repo", "--label", "qa \\"lane\\""]',
          '',
          '[mcp_servers."delegation".env]',
          'CODEX_LOG_LEVEL = "debug"',
          "CUSTOM_FLAG = 'x\\'y'"
        ].join('\n'),
        'utf8'
      );

      expect(readDelegationFallbackConfig(configPath)).toEqual({
        args: ['delegate-server', '--repo', '/tmp/repo', '--label', 'qa "lane"'],
        envVars: {
          CODEX_LOG_LEVEL: 'debug',
          CUSTOM_FLAG: "x'y"
        }
      });
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('parses args and env vars from an inline delegation entry inside the mcp_servers table', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-config-parser-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          '[mcp_servers]',
          '"delegation" = { command = "codex-orchestrator", args = ["delegate-server", "--repo", "/tmp/repo"], env = { CODEX_LOG_LEVEL = "debug", CUSTOM_FLAG = "trace" } }'
        ].join('\n'),
        'utf8'
      );

      expect(readDelegationFallbackConfig(configPath)).toEqual({
        args: ['delegate-server', '--repo', '/tmp/repo'],
        envVars: {
          CODEX_LOG_LEVEL: 'debug',
          CUSTOM_FLAG: 'trace'
        }
      });
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('parses inline delegation entries with quoted hash values and trailing TOML comments', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-config-parser-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          '[mcp_servers]',
          '"delegation" = { command = "codex-orchestrator", args = ["delegate-server", "--repo", "/tmp/repo", "topic #1"] } # keep local fallback pinned'
        ].join('\n'),
        'utf8'
      );

      expect(readDelegationFallbackConfig(configPath)).toEqual({
        args: ['delegate-server', '--repo', '/tmp/repo', 'topic #1'],
        envVars: {}
      });
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('skips commented delegation sections before the active inline table', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-config-parser-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          '# [mcp_servers."delegation"]',
          '# command = "old-wrapper"',
          '# args = ["delegate-server", "--repo", "/tmp/old"]',
          '',
          '[mcp_servers]',
          '"delegation" = { command = "codex-orchestrator", args = ["delegate-server", "--repo", "/tmp/repo"] }'
        ].join('\n'),
        'utf8'
      );

      expect(readDelegationFallbackConfig(configPath)).toEqual({
        args: ['delegate-server', '--repo', '/tmp/repo'],
        envVars: {}
      });
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('parses inline env blocks when quoted values contain braces', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-config-parser-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          '[mcp_servers]',
          `"delegation" = { command = "codex-orchestrator", args = ["delegate-server", "--repo", "/tmp/repo"], env = { PAYLOAD = "{\\"a\\":1}", MODE = "debug" } }`
        ].join('\n'),
        'utf8'
      );

      expect(readDelegationFallbackConfig(configPath)).toEqual({
        args: ['delegate-server', '--repo', '/tmp/repo'],
        envVars: {
          PAYLOAD: '{"a":1}',
          MODE: 'debug'
        }
      });
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('returns null when the delegation entry is absent', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'delegation-config-parser-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(configPath, '[mcp_servers.chrome-devtools]\ncommand = "npx"\n', 'utf8');

      expect(readDelegationFallbackConfig(configPath)).toBeNull();
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
