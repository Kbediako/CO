import type { PipelineDefinition } from '../types.js';

export const defaultDiagnosticsPipeline: PipelineDefinition = {
  id: 'diagnostics',
  title: 'Diagnostics Pipeline',
  description: 'Build, lint, test, and spec-guard the repository.',
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
      title: 'node scripts/spec-guard.mjs --dry-run',
      command: 'node scripts/spec-guard.mjs --dry-run'
    }
  ]
};
