import type { PipelineDefinition } from '../types.js';

const DESIGN_TOOLKIT_ENV = {
  DESIGN_PIPELINE: '1',
  DESIGN_TOOLKIT: '1'
} as const;

export const hiFiDesignToolkitPipeline: PipelineDefinition = {
  id: 'hi-fi-design-toolkit',
  title: 'Hi-Fi Design Toolkit',
  description: 'Runs the hi-fi design toolkit pipeline to extract, tokenize, self-correct, and publish design artifacts.',
  tags: ['design', 'hi-fi'],
  stages: [
    {
      kind: 'command',
      id: 'design-config',
      title: 'Resolve design configuration',
      command: 'node dist/scripts/design/pipeline/prepare.js',
      env: { ...DESIGN_TOOLKIT_ENV }
    },
    {
      kind: 'command',
      id: 'design-toolkit-extract',
      title: 'Wrap external toolkit extractor',
      command: 'node dist/scripts/design/pipeline/toolkit/extract.js',
      env: { ...DESIGN_TOOLKIT_ENV }
    },
    {
      kind: 'command',
      id: 'design-toolkit-tokens',
      title: 'Generate tokens and style guides',
      command: 'node dist/scripts/design/pipeline/toolkit/tokens.js',
      env: { ...DESIGN_TOOLKIT_ENV }
    },
    {
      kind: 'command',
      id: 'design-toolkit-reference',
      title: 'Build reference pages + self-correction',
      command: 'node dist/scripts/design/pipeline/toolkit/reference.js',
      env: { ...DESIGN_TOOLKIT_ENV }
    },
    {
      kind: 'command',
      id: 'design-toolkit-publish',
      title: 'Publish toolkit outputs to packages/design-system',
      command: 'node dist/scripts/design/pipeline/toolkit/publish.js',
      env: { ...DESIGN_TOOLKIT_ENV }
    },
    {
      kind: 'command',
      id: 'design-spec-guard',
      title: 'Validate specs via spec-guard',
      command: 'node scripts/spec-guard.mjs --dry-run',
      env: { ...DESIGN_TOOLKIT_ENV },
      summaryHint: 'Ensures HI-FI design specs are current before artifact write'
    },
    {
      kind: 'command',
      id: 'design-artifact-writer',
      title: 'Persist design manifests',
      command: 'node dist/scripts/design/pipeline/write-artifacts.js',
      env: { ...DESIGN_TOOLKIT_ENV }
    }
  ]
};
