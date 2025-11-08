import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { resolveRunPaths, relativeToRepo } from '../src/cli/run/runPaths.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';

const baseEnv: EnvironmentPaths = {
  repoRoot: '/repo',
  runsRoot: '/repo/.runs',
  outRoot: '/repo/out',
  taskId: '0001'
};

describe('resolveRunPaths', () => {
  it('returns directories scoped to the task runs root', () => {
    const paths = resolveRunPaths(baseEnv, 'run-safe');
    expect(paths.runDir).toBe(join(baseEnv.runsRoot, baseEnv.taskId, 'cli', 'run-safe'));
    expect(paths.compatDir).toBe(join(baseEnv.runsRoot, baseEnv.taskId, 'mcp', 'run-safe'));
    expect(paths.localCompatDir).toBe(join(baseEnv.runsRoot, 'local-mcp', 'run-safe'));
    const relativePath = relativeToRepo(baseEnv, paths.runDir);
    expect(relativePath).toBe(join('.runs', baseEnv.taskId, 'cli', 'run-safe'));
  });

  it('rejects run IDs with traversal attempts', () => {
    expect(() => resolveRunPaths(baseEnv, '../escape')).toThrow(/Invalid run ID/);
  });

  it('rejects run IDs with control characters', () => {
    expect(() => resolveRunPaths(baseEnv, `bad\u0000id`)).toThrow(/control characters/);
  });

  it('rejects run IDs with Windows-unsafe characters', () => {
    expect(() => resolveRunPaths(baseEnv, 'run:unsafe')).toThrow(/Invalid run ID/);
  });
});
