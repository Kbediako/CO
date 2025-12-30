import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatDoctorSummary, runDoctor } from '../src/cli/doctor.js';

describe('runDoctor', () => {
  it('reports missing devtools config and skill when absent', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      const result = runDoctor(process.cwd());
      expect(result.devtools.status).toBe('missing-both');
      expect(result.devtools.skill.name).toBe('chrome-devtools');
      expect(result.devtools.config.status).toBe('missing');
      expect(result.missing).toContain('chrome-devtools');
      expect(result.missing).toContain('chrome-devtools-config');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('reports devtools readiness when config and skill exist', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      const skillDir = join(tempHome, 'skills', 'chrome-devtools');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# devtools skill', 'utf8');
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          '[mcp_servers.chrome-devtools]',
          'command = "npx"',
          'args = ["-y", "chrome-devtools-mcp@latest"]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      const names = result.dependencies.map((dep) => dep.name);
      expect(names).toEqual(['playwright', 'pngjs', 'pixelmatch', 'cheerio']);
      expect(result.devtools.status).toBe('ok');
      expect(result.devtools.config.status).toBe('ok');

      const summary = formatDoctorSummary(result).join('\n');
      for (const name of names) {
        expect(summary).toContain(name);
      }
      expect(summary).toContain('DevTools: ok');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
