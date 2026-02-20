import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import { PipelineResolver } from '../src/cli/services/pipelineResolver.js';
import { loadUserConfig } from '../src/cli/config/userConfig.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import { logger } from '../src/logger.js';

const ORIGINAL_ENV = {
  designPipeline: process.env.DESIGN_PIPELINE,
  designConfigPath: process.env.DESIGN_CONFIG_PATH,
  repoConfigRequired: process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'pipeline-resolver-'));
  delete process.env.DESIGN_PIPELINE;
  delete process.env.DESIGN_CONFIG_PATH;
  delete process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED;
});

afterEach(async () => {
  vi.restoreAllMocks();
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
  if (ORIGINAL_ENV.repoConfigRequired === undefined) {
    delete process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED;
  } else {
    process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED = ORIGINAL_ENV.repoConfigRequired;
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

  it('logs design defaults usage when repo design config is missing', async () => {
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-design'
    };
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);

    const resolver = new PipelineResolver();
    await resolver.resolve(env, { pipelineId: 'design-reference' });

    expect(infoSpy).toHaveBeenCalledWith(
      `[design-config] using defaults (missing file at ${join(workspaceRoot, 'design.config.yaml')})`
    );
  });

  it('logs repo design config path when the file exists', async () => {
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-design'
    };
    await writeFile(join(workspaceRoot, 'design.config.yaml'), 'metadata:\n  design:\n    enabled: true\n');
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);

    const resolver = new PipelineResolver();
    await resolver.resolve(env, { pipelineId: 'design-reference' });

    expect(infoSpy).toHaveBeenCalledWith(
      `[design-config] loaded repo file at ${join(workspaceRoot, 'design.config.yaml')}`
    );
  });

  it('fails fast when strict repo-config mode is enabled and repo config is missing', async () => {
    process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED = '1';
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-strict'
    };

    const resolver = new PipelineResolver();
    await expect(resolver.resolve(env, { pipelineId: 'docs-review' })).rejects.toThrow(
      /Repo-local codex\.orchestrator\.json is required/
    );
  });

  it('fails closed for rlm when strict repo-config mode is enabled and repo config omits rlm', async () => {
    process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED = '1';
    await writeFile(
      join(workspaceRoot, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'docs-review',
          pipelines: [
            {
              id: 'docs-review',
              title: 'Docs Review',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'docs',
                  title: 'Docs',
                  command: 'echo docs'
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-strict-rlm'
    };

    const resolver = new PipelineResolver();
    await expect(resolver.resolve(env, { pipelineId: 'rlm' })).rejects.toThrow(
      /missing the rlm pipeline/
    );
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
