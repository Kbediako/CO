import type { PipelineDefinition } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { UserConfig } from '../config/userConfig.js';
import { findPipeline } from '../config/userConfig.js';

export interface PipelineResolution {
  pipeline: PipelineDefinition;
  source: 'default' | 'user';
}

const fallbackDiagnosticsPipeline: PipelineDefinition = {
  id: 'diagnostics',
  title: 'Diagnostics Pipeline',
  description: 'Build, lint, test, and optionally run spec-guard for the repository.',
  tags: ['diagnostics-primary', 'diagnostics-secondary'],
  stages: [
    {
      kind: 'command',
      id: 'build',
      title: 'npm run build',
      command: 'npm run build'
    },
    {
      kind: 'command',
      id: 'lint',
      title: 'npm run lint',
      command: 'npm run lint'
    },
    {
      kind: 'command',
      id: 'test',
      title: 'npm run test',
      command: 'npm run test'
    },
    {
      kind: 'command',
      id: 'spec-guard',
      title: 'Optional spec-guard (if scripts/spec-guard.mjs exists)',
      command:
        'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/utils/specGuardRunner.js" --dry-run'
    }
  ]
};

function resolveConfigSource(config: UserConfig | null): 'default' | 'user' {
  return config?.source === 'package' ? 'default' : 'user';
}

export function resolvePipeline(
  _env: EnvironmentPaths,
  options: { pipelineId?: string; config: UserConfig | null }
): PipelineResolution {
  const { pipelineId, config } = options;
  const configSource = resolveConfigSource(config);
  if (pipelineId) {
    const fromUser = findPipeline(config, pipelineId);
    if (fromUser) {
      return { pipeline: fromUser, source: configSource };
    }
    if (pipelineId === fallbackDiagnosticsPipeline.id) {
      return { pipeline: fallbackDiagnosticsPipeline, source: 'default' };
    }
    throw new Error(`Pipeline '${pipelineId}' not found.`);
  }

  const defaultId = config?.defaultPipeline ?? fallbackDiagnosticsPipeline.id;
  const userPipeline = findPipeline(config, defaultId);
  if (userPipeline) {
    return { pipeline: userPipeline, source: configSource };
  }
  return { pipeline: fallbackDiagnosticsPipeline, source: 'default' };
}
