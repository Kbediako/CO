import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { isManagedCodexCliEnabled, resolveCodexCliBin } from '../src/cli/utils/codexCli.js';

describe('resolveCodexCliBin', () => {
  it('defaults to stock codex even when managed config exists', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-cli-resolution-'));
    try {
      await writeManagedConfig(tempHome, '/tmp/managed-codex');
      const resolved = resolveCodexCliBin({ CODEX_HOME: tempHome } as NodeJS.ProcessEnv);
      expect(resolved).toBe('codex');
      expect(isManagedCodexCliEnabled({ CODEX_HOME: tempHome } as NodeJS.ProcessEnv)).toBe(false);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('uses managed binary when CODEX_CLI_USE_MANAGED is enabled', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-cli-resolution-'));
    try {
      await writeManagedConfig(tempHome, '/tmp/managed-codex');
      const env = {
        CODEX_HOME: tempHome,
        CODEX_CLI_USE_MANAGED: '1'
      } as NodeJS.ProcessEnv;
      expect(isManagedCodexCliEnabled(env)).toBe(true);
      expect(resolveCodexCliBin(env)).toBe('/tmp/managed-codex');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('prefers CODEX_CLI_BIN override over managed selection', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-cli-resolution-'));
    try {
      await writeManagedConfig(tempHome, '/tmp/managed-codex');
      const env = {
        CODEX_HOME: tempHome,
        CODEX_CLI_USE_MANAGED: '1',
        CODEX_CLI_BIN: '/tmp/explicit-codex'
      } as NodeJS.ProcessEnv;
      expect(resolveCodexCliBin(env)).toBe('/tmp/explicit-codex');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});

async function writeManagedConfig(codexHome: string, binaryPath: string): Promise<void> {
  const configPath = join(codexHome, 'orchestrator', 'codex-cli', 'codex-cli.json');
  await mkdir(join(codexHome, 'orchestrator', 'codex-cli'), { recursive: true });
  await writeFile(
    configPath,
    JSON.stringify(
      {
        binary_path: binaryPath,
        method: 'build',
        installed_at: '2026-02-18T00:00:00.000Z'
      },
      null,
      2
    ),
    'utf8'
  );
}
