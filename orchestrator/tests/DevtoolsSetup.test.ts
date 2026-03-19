import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runDevtoolsSetup } from '../src/cli/devtoolsSetup.js';
import { resolveDevtoolsReadiness } from '../src/cli/utils/devtools.js';

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

describe('resolveDevtoolsReadiness', () => {
  const configCases = [
    {
      name: 'direct table with inline comments and blank lines',
      config: [
        '# keep the devtools server ready',
        '',
        '[mcp_servers.chrome-devtools] # comment',
        'command = "npx"',
        'args = ["-y", "chrome-devtools-mcp@latest"]'
      ].join('\n')
    },
    {
      name: 'single-quoted table name',
      config: [
        "[mcp_servers.'chrome-devtools']",
        'command = "npx"',
        'args = ["-y", "chrome-devtools-mcp@latest"]'
      ].join('\n')
    },
    {
      name: 'double-quoted inline table entry with whitespace before equals',
      config: [
        'mcp_servers."chrome-devtools" = { command = "npx", args = ["-y", "chrome-devtools-mcp@latest"] } # comment'
      ].join('\n')
    },
    {
      name: 'single-quoted key inside mcp_servers table',
      config: [
        '[mcp_servers]',
        "'chrome-devtools' = { command = \"npx\", args = [\"-y\", \"chrome-devtools-mcp@latest\"] }"
      ].join('\n')
    },
    {
      name: 'dotted property entries',
      config: [
        'mcp_servers.chrome-devtools.enabled = true',
        'mcp_servers.chrome-devtools.args = ["-y", "chrome-devtools-mcp@latest"]'
      ].join('\n')
    }
  ] as const;

  for (const testCase of configCases) {
    it(`detects ${testCase.name}`, async () => {
      const tempHome = await mkdtemp(join(tmpdir(), 'devtools-readiness-'));
      try {
        await writeFile(join(tempHome, 'config.toml'), testCase.config, 'utf8');

        const result = resolveDevtoolsReadiness({
          CODEX_HOME: tempHome
        } as NodeJS.ProcessEnv);

        expect(result.config.status).toBe('ok');
        expect(result.status).toBe('missing-skill');
      } finally {
        await rm(tempHome, { recursive: true, force: true });
      }
    });
  }
});
