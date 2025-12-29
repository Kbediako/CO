import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatDoctorSummary, runDoctor } from '../src/cli/doctor.js';

describe('runDoctor', () => {
  it('reports all known optional dependencies and devtools readiness', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      const result = runDoctor(process.cwd());
      const names = result.dependencies.map((dep) => dep.name);
      expect(names).toEqual(['playwright', 'pngjs', 'pixelmatch', 'cheerio']);

      const missingCount = result.dependencies.filter((dep) => dep.status === 'missing').length;
      const expectedMissing = missingCount + (result.devtools.status === 'missing' ? 1 : 0);
      expect(result.missing).toHaveLength(expectedMissing);
      expect(result.status).toBe(expectedMissing === 0 ? 'ok' : 'warning');
      expect(result.devtools.skill.name).toBe('chrome-devtools');

      const summary = formatDoctorSummary(result).join('\n');
      for (const name of names) {
        expect(summary).toContain(name);
      }
      expect(summary).toContain('DevTools:');
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
