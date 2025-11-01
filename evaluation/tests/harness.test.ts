import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadScenarios, runAllScenarios, runScenario } from '../harness/index.js';

const tempDirs: string[] = [];

afterAll(async () => {
  for (const dir of tempDirs) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe('evaluation harness', () => {
  it('loads registered scenarios from disk', async () => {
    const scenarios = await loadScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(2);
    expect(scenarios.map((s) => s.id)).toContain('typescript-smoke');
  });

  it('runs the TypeScript smoke scenario successfully', async () => {
    const result = await runScenario('typescript-smoke', { mode: 'mcp' });
    const goalStatuses = result.goals.map((goal) => goal.status);
    expect(goalStatuses.every((status) => status === 'passed')).toBe(true);
  });

  it('writes results when outputDir is provided', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-eval-test-'));
    tempDirs.push(outputDir);

    const results = await runAllScenarios({ outputDir, mode: 'mcp' });
    expect(results.length).toBeGreaterThanOrEqual(2);

    for (const scenario of results) {
      const artifactPath = path.join(outputDir, `${scenario.scenario.id}.json`);
      const exists = await fs.access(artifactPath).then(
        () => true,
        () => false
      );
      expect(exists).toBe(true);
    }
  }, 60000);
});
