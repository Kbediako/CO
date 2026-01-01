import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import { PipelineResolver } from '../src/cli/services/pipelineResolver.js';
import { loadUserConfig } from '../src/cli/config/userConfig.js';
import type { PipelineDefinition } from '../src/cli/types.js';

const ORIGINAL_ENV = {
  designPipeline: process.env.DESIGN_PIPELINE,
  designConfigPath: process.env.DESIGN_CONFIG_PATH
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'pipeline-resolver-'));
  delete process.env.DESIGN_PIPELINE;
  delete process.env.DESIGN_CONFIG_PATH;
});

afterEach(async () => {
  if (ORIGINAL_ENV.designPipeline === undefined) {
    delete process.env.DESIGN_PIPELINE;
  } else {
    process.env.DESIGN_PIPELINE = ORIGINAL_ENV.designPipeline;
  }
  if (ORIGINAL_ENV.designConfigPath === undefined) {
    delete process.env.DESIGN_CONFIG_PATH;
  } else {
    process.env.DESIGN_CONFIG_PATH = ORIGINAL_ENV.designConfigPath;
  }
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('PipelineResolver env overrides', () => {
  it('returns design env overrides without mutating process.env', async () => {
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-design'
    };

    const resolver = new PipelineResolver();
    const result = await resolver.resolve(env, { pipelineId: 'design-reference' });

    expect(process.env.DESIGN_CONFIG_PATH).toBeUndefined();
    expect(process.env.DESIGN_PIPELINE).toBeUndefined();
    expect(result.envOverrides.DESIGN_CONFIG_PATH).toBe(join(workspaceRoot, 'design.config.yaml'));
    expect(result.envOverrides.DESIGN_PIPELINE).toBe('1');
  });

  it('does not override DESIGN_PIPELINE when already set', async () => {
    process.env.DESIGN_PIPELINE = '0';
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-design'
    };

    const resolver = new PipelineResolver();
    const result = await resolver.resolve(env, { pipelineId: 'design-reference' });

    expect(result.envOverrides.DESIGN_PIPELINE).toBeUndefined();
    expect(result.envOverrides.DESIGN_CONFIG_PATH).toBe(join(workspaceRoot, 'design.config.yaml'));
  });

  // Uses the real repo config to catch drift between shipped pipelines and docs.
  it('wires frontend testing pipeline with explicit devtools opt-in', async () => {
    const testDir = fileURLToPath(new URL('.', import.meta.url));
    const repoRoot = resolve(testDir, '..', '..');
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'frontend-testing'
    };

    const config = await loadUserConfig(env);
    const frontend = config?.pipelines?.find((pipeline) => pipeline.id === 'frontend-testing');
    expect(frontend).toBeTruthy();
    expect(config?.pipelines?.find((pipeline) => pipeline.id === 'frontend-testing-devtools')).toBeFalsy();

    const frontendEnv = findFirstCommandEnv(frontend);
    expect(frontendEnv.CODEX_REVIEW_DEVTOOLS).toBeUndefined();
    expect(frontendEnv.CODEX_NON_INTERACTIVE).toBe('1');

    const resolver = new PipelineResolver();
    const resolved = await resolver.resolve(env, { pipelineId: 'frontend-testing-devtools' });
    expect(resolved.pipeline.id).toBe('frontend-testing');
    expect(resolved.envOverrides.CODEX_REVIEW_DEVTOOLS).toBe('1');
  });
});

function findFirstCommandEnv(pipeline?: PipelineDefinition): Record<string, string> {
  if (!pipeline) {
    return {};
  }
  for (const stage of pipeline.stages) {
    if (stage.kind === 'command') {
      return stage.env ?? {};
    }
  }
  return {};
}
