import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCodexCliSetup } from '../src/cli/codexCliSetup.js';

describe('runCodexCliSetup', () => {
  it('returns a plan without applying changes by default', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-cli-setup-'));
    try {
      const result = await runCodexCliSetup({
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      const binaryName = process.platform === 'win32' ? 'codex.exe' : 'codex';
      expect(result.status).toBe('planned');
      expect(result.plan.binPath).toBe(
        join(tempHome, 'orchestrator', 'codex-cli', 'bin', binaryName)
      );
      expect(result.plan.configPath).toBe(
        join(tempHome, 'orchestrator', 'codex-cli', 'codex-cli.json')
      );
      expect(result.plan.method).toBe('build');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
