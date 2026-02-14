import { describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PlanItem, TaskContext } from '../src/types.js';
import { CodexOrchestrator } from '../src/cli/orchestrator.js';
import type { PipelineDefinition } from '../src/cli/types.js';
function invokeBuildCloudPrompt(params: {
  task: TaskContext;
  target: PlanItem;
  pipeline: PipelineDefinition;
  manifest: Record<string, unknown>;
}): string {
  const orchestrator = new CodexOrchestrator({
    repoRoot: tmpdir(),
    runsRoot: join(tmpdir(), 'runs'),
    outRoot: join(tmpdir(), 'out'),
    taskId: params.task.id
  });
  const method = (orchestrator as unknown as {
    buildCloudPrompt: (
      task: TaskContext,
      target: PlanItem,
      pipeline: PipelineDefinition,
      stage: PipelineDefinition['stages'][number],
      manifest: Record<string, unknown>
    ) => string;
  }).buildCloudPrompt;
  return method.call(orchestrator, params.task, params.target, params.pipeline, params.pipeline.stages[0], params.manifest);
}
describe('buildCloudPrompt experience injection', () => {
  const task: TaskContext = {
    id: 'task-1',
    title: 'Improve diagnostics reliability',
    description: 'Investigate and fix diagnostics regressions.',
    metadata: {}
  };
  const pipeline: PipelineDefinition = {
    id: 'diagnostics',
    title: 'Diagnostics Pipeline',
    tags: ['diagnostics', 'implementation'],
    stages: [
      {
        kind: 'command',
        id: 'run-diagnostics',
        title: 'Run Diagnostics',
        command: 'npm run diagnostics'
      }
    ]
  };
  const target: PlanItem = {
    id: 'run-diagnostics',
    description: 'Run diagnostics and summarize failures.'
  };
  it('injects matching-domain experience snippets into cloud prompts', () => {
    const prompt = invokeBuildCloudPrompt({
      task,
      target,
      pipeline,
      manifest: {
        prompt_packs: [
          {
            id: 'pp-impl',
            domain: 'implementation',
            stamp: 'impl',
            experience_slots: 3,
            sources: [],
            experiences: ['[exp impl-1] Implementation fallback snippet.']
          },
          {
            id: 'pp-diagnostics',
            domain: 'diagnostics',
            stamp: 'diag',
            experience_slots: 3,
            sources: [],
            experiences: [
              '[exp diag-1] Diagnostics fix improved flaky test detection.',
              '[exp diag-2] Keep log parsing deterministic for error summaries.'
            ]
          }
        ]
      }
    });
    expect(prompt).toContain('Relevant prior experiences (hints, not strict instructions):');
    expect(prompt).toContain('Domain: diagnostics');
    expect(prompt).toContain('[exp diag-1]');
    expect(prompt).toContain('[exp diag-2]');
    expect(prompt).not.toContain('[exp impl-1]');
  });
  it('falls back to implementation-domain snippets when no direct domain match exists', () => {
    const prompt = invokeBuildCloudPrompt({
      task,
      target: { id: 'stage-1', description: 'unknown stage' },
      pipeline: {
        ...pipeline,
        id: 'custom-pipeline',
        title: 'Custom Pipeline',
        tags: ['custom']
      },
      manifest: {
        prompt_packs: [
          {
            id: 'pp-impl',
            domain: 'implementation',
            stamp: 'impl',
            experience_slots: 3,
            sources: [],
            experiences: ['[exp impl-1] Implementation fallback snippet.']
          },
          {
            id: 'pp-review',
            domain: 'review',
            stamp: 'review',
            experience_slots: 3,
            sources: [],
            experiences: ['[exp review-1] Review snippet.']
          }
        ]
      }
    });
    expect(prompt).toContain('Domain: implementation');
    expect(prompt).toContain('[exp impl-1]');
    expect(prompt).not.toContain('[exp review-1]');
  });
  it('ignores malformed prompt packs with non-string domains and non-string snippets', () => {
    const prompt = invokeBuildCloudPrompt({
      task,
      target,
      pipeline,
      manifest: {
        prompt_packs: [
          {
            id: 'pp-malformed',
            domain: 42,
            stamp: 'bad',
            experience_slots: 3,
            sources: [],
            experiences: ['[exp bad-1] malformed domain should be ignored.']
          },
          {
            id: 'pp-diagnostics',
            domain: 'diagnostics',
            stamp: 'diag',
            experience_slots: 3,
            sources: [],
            experiences: [99, '[exp diag-1] valid diagnostics snippet.']
          }
        ]
      }
    });
    expect(prompt).toContain('Domain: diagnostics');
    expect(prompt).toContain('[exp diag-1]');
    expect(prompt).not.toContain('[exp bad-1]');
    expect(prompt).not.toContain('99');
  });
  it('omits experience section when no snippets are present', () => {
    const prompt = invokeBuildCloudPrompt({
      task,
      target,
      pipeline,
      manifest: {
        prompt_packs: [
          {
            id: 'pp-diagnostics',
            domain: 'diagnostics',
            stamp: 'diag',
            experience_slots: 3,
            sources: [],
            experiences: []
          }
        ]
      }
    });
    expect(prompt).not.toContain('Relevant prior experiences');
    expect(prompt).not.toContain('Domain:');
  });
  it('caps experience snippets at three entries', () => {
    const prompt = invokeBuildCloudPrompt({
      task,
      target,
      pipeline,
      manifest: {
        prompt_packs: [
          {
            id: 'pp-diagnostics',
            domain: 'diagnostics',
            stamp: 'diag',
            experience_slots: 5,
            sources: [],
            experiences: [
              '[exp diag-1] one',
              '[exp diag-2] two',
              '[exp diag-3] three',
              '[exp diag-4] four'
            ]
          }
        ]
      }
    });
    expect(prompt).toContain('[exp diag-1]');
    expect(prompt).toContain('[exp diag-2]');
    expect(prompt).toContain('[exp diag-3]');
    expect(prompt).not.toContain('[exp diag-4]');
  });
});
