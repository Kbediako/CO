import { describe, expect, it } from 'vitest';

import { formatDoctorSummary, runDoctor } from '../src/cli/doctor.js';

describe('runDoctor', () => {
  it('reports all known optional dependencies', () => {
    const result = runDoctor(process.cwd());
    const names = result.dependencies.map((dep) => dep.name);
    expect(names).toEqual(['playwright', 'pngjs', 'pixelmatch', 'cheerio']);

    const missingCount = result.dependencies.filter((dep) => dep.status === 'missing').length;
    expect(result.missing).toHaveLength(missingCount);
    expect(result.status).toBe(missingCount === 0 ? 'ok' : 'warning');

    const summary = formatDoctorSummary(result).join('\n');
    for (const name of names) {
      expect(summary).toContain(name);
    }
  });
});
