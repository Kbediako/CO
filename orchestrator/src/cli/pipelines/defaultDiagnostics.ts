import type { PipelineDefinition } from '../types.js';

export const defaultDiagnosticsPipeline: PipelineDefinition = {
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
