import { describe, expect, it } from 'vitest';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import type { UserConfig } from '../src/cli/config/userConfig.js';
import { resolvePipeline } from '../src/cli/pipelines/index.js';

const env: EnvironmentPaths = {
  repoRoot: '/repo',
  runsRoot: '/repo/.runs',
  outRoot: '/repo/out',
  taskId: 'task-1'
};

const diagnosticsPipeline: PipelineDefinition = {
  id: 'diagnostics',
  title: 'Diagnostics',
  stages: []
};

describe('resolvePipeline', () => {
  it('uses the configured default pipeline when pipelineId is omitted', () => {
    const config: UserConfig = {
      pipelines: [diagnosticsPipeline],
      defaultPipeline: 'diagnostics',
      source: 'repo'
    };

    const result = resolvePipeline(env, { config, pipelineId: undefined });

    expect(result.pipeline).toEqual(diagnosticsPipeline);
    expect(result.source).toBe('user');
  });

  it('throws with missing-config hint when pipelineId is not found', () => {
    expect(() => resolvePipeline(env, { pipelineId: 'missing', config: null }))
      .toThrow("Pipeline 'missing' not found (missing codex.orchestrator.json).");
  });

  it('throws when default pipeline is missing from config', () => {
    const config: UserConfig = {
      pipelines: [diagnosticsPipeline],
      defaultPipeline: 'unknown',
      source: 'repo'
    };

    expect(() => resolvePipeline(env, { config, pipelineId: undefined }))
      .toThrow("Pipeline 'unknown' not found");
  });
});
