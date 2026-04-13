import { describe, expect, it } from 'vitest';

import {
  buildRunMemoryPromptLines,
  selectRunMemoryForRole
} from '../src/cli/run/runMemoryController.js';

function buildManifest() {
  return {
    memory: {
      source_0: {
        schema_version: 1,
        kind: 'context_object' as const,
        object_id: 'sha256:source0',
        pointer: 'ctx:sha256:source0#chunk:c000001',
        dir_path: '.runs/task-1/cli/run-1/memory/source-0',
        index_path: '.runs/task-1/cli/run-1/memory/source-0/index.json',
        source_path: '.runs/task-1/cli/run-1/memory/source-0/source.txt',
        byte_length: 256,
        chunk_count: 1,
        created_at: '2026-04-01T00:00:00.000Z',
        origin: {
          run_id: 'run-1',
          task_id: 'task-1',
          manifest_path: '.runs/task-1/cli/run-1/manifest.json'
        },
        inherited_from: null
      }
    },
    prompt_packs: [
      {
        id: 'pp-implementation',
        domain: 'implementation',
        stamp: 'impl',
        experience_slots: 3,
        sources: ['docs/PRD-task-1.md'],
        experiences: [
          '[exp impl-1] Keep implementation changes narrowly scoped.',
          '[exp impl-2] Reuse existing runtime seams instead of adding new ones.'
        ]
      },
      {
        id: 'pp-diagnostics',
        domain: 'diagnostics',
        stamp: 'diag',
        experience_slots: 3,
        sources: ['docs/TECH_SPEC-task-1.md'],
        experiences: [
          '',
          42,
          '[exp diag-1] Diagnostics fixes should keep log parsing deterministic.',
          '[exp diag-2] Prefer stable evidence artifacts when debugging flaky checks.'
        ]
      }
    ]
  };
}

describe('run memory controller', () => {
  it('selects structured planner refs using hint-matched prompt-pack experiences', () => {
    const selection = selectRunMemoryForRole({
      role: 'planner',
      manifest: buildManifest(),
      hints: ['Need a diagnostics plan for flaky review checks']
    });

    expect(selection.role).toBe('planner');
    expect(selection.profile.include_prompt_pack_experiences).toBe(true);
    expect(selection.refs[0]?.kind).toBe('source_0');

    const experienceRefs = selection.refs.filter(
      (ref) => ref.kind === 'prompt_pack_experience'
    );
    expect(experienceRefs).toHaveLength(2);
    expect(experienceRefs[0]).toMatchObject({
      kind: 'prompt_pack_experience',
      selection_reason: 'hint',
      pack: {
        id: 'pp-diagnostics',
        domain: 'diagnostics',
        stamp: 'diag',
        sources: ['docs/TECH_SPEC-task-1.md']
      },
      experience_index: 2
    });
  });

  it('narrows reviewer and delegate retrieval to source-0 refs only', () => {
    const reviewerSelection = selectRunMemoryForRole({
      role: 'reviewer',
      manifest: buildManifest(),
      hints: ['diagnostics']
    });
    const delegateSelection = selectRunMemoryForRole({
      role: 'delegate',
      manifest: buildManifest(),
      hints: ['implementation']
    });

    expect(reviewerSelection.refs).toHaveLength(1);
    expect(reviewerSelection.refs[0]?.kind).toBe('source_0');
    expect(delegateSelection.refs).toHaveLength(1);
    expect(delegateSelection.refs[0]?.kind).toBe('source_0');
    expect(buildRunMemoryPromptLines(reviewerSelection)).not.toContain(
      'Relevant prior experiences (hints, not strict instructions):'
    );
  });

  it('falls back executor retrieval to implementation experiences when no hint matches', () => {
    const selection = selectRunMemoryForRole({
      role: 'executor',
      manifest: buildManifest(),
      hints: ['unrelated domain']
    });
    const promptLines = buildRunMemoryPromptLines(selection);
    const experienceRefs = selection.refs.filter(
      (ref) => ref.kind === 'prompt_pack_experience'
    );

    expect(experienceRefs).toHaveLength(2);
    expect(experienceRefs[0]).toMatchObject({
      kind: 'prompt_pack_experience',
      selection_reason: 'fallback',
      pack: {
        id: 'pp-implementation',
        domain: 'implementation'
      }
    });
    expect(promptLines).toContain('Relevant prior experiences (hints, not strict instructions):');
    expect(promptLines).toContain('- Retrieval profile: executor');
    expect(promptLines).toContain('- Pack id: pp-implementation');
    expect(promptLines).toContain('- Pack stamp: impl');
    expect(promptLines).toContain('- Selection reason: fallback');
  });
});
