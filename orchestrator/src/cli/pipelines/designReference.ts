import type { PipelineDefinition } from '../types.js';

const DESIGN_PIPELINE_ENV = {
  DESIGN_PIPELINE: '1'
} as const;

export const designReferencePipeline: PipelineDefinition = {
  id: 'design-reference',
  title: 'Design Reference Pipeline',
  description:
    'Extracts design reference assets, stages Storybook-ready components, and records manifest evidence.',
  tags: ['design', 'reference'],
  stages: [
    {
      kind: 'command',
      id: 'design-config',
      title: 'Resolve design configuration',
      command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/scripts/design/pipeline/prepare.js"',
      env: { ...DESIGN_PIPELINE_ENV }
    },
    {
      kind: 'command',
      id: 'design-extract',
      title: 'Run Playwright design extractor',
      command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/scripts/design/pipeline/extract.js"',
      env: { ...DESIGN_PIPELINE_ENV }
    },
    {
      kind: 'command',
      id: 'design-reference',
      title: 'Build motherduck reference page',
      command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/scripts/design/pipeline/reference.js"',
      env: { ...DESIGN_PIPELINE_ENV }
    },
    {
      kind: 'command',
      id: 'design-componentize',
      title: 'Componentize artifacts via packages/design-system',
      command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/scripts/design/pipeline/componentize.js"',
      env: { ...DESIGN_PIPELINE_ENV }
    },
    {
      kind: 'command',
      id: 'design-advanced-assets',
      title: 'Generate advanced design assets',
      command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/scripts/design/pipeline/advanced-assets.js"',
      env: { ...DESIGN_PIPELINE_ENV },
      allowFailure: true,
      summaryHint: 'Optional Framer Motion and FFmpeg assets'
    },
    {
      kind: 'command',
      id: 'design-visual-regression',
      title: 'Run visual regression tests',
      command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/scripts/design/pipeline/visual-regression.js"',
      env: { ...DESIGN_PIPELINE_ENV },
      allowFailure: true,
      summaryHint: 'Visual regression diffs stored under design/visual-regression/'
    },
    {
      kind: 'command',
      id: 'design-spec-guard',
      title: 'Optional spec-guard (if scripts/spec-guard.mjs exists)',
      command:
        'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/utils/specGuardRunner.js" --dry-run',
      env: { ...DESIGN_PIPELINE_ENV },
      summaryHint: 'Ensures design specs are fresh before artifact write'
    },
    {
      kind: 'command',
      id: 'design-artifact-writer',
      title: 'Persist design artifact manifests',
      command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/scripts/design/pipeline/write-artifacts.js"',
      env: { ...DESIGN_PIPELINE_ENV }
    }
  ]
};
