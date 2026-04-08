import { describe, expect, it } from 'vitest';

import { resolveRunSource0Paths, type RunSource0Descriptor } from '../src/cli/run/source0.js';

function buildDescriptor(overrides: Partial<RunSource0Descriptor> = {}): RunSource0Descriptor {
  return {
    schema_version: 1,
    kind: 'context_object',
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
    inherited_from: null,
    ...overrides
  };
}

describe('run source 0 path resolution', () => {
  it('rejects source_0 paths that escape the repo root', () => {
    expect(() =>
      resolveRunSource0Paths('/tmp/repo', buildDescriptor({ dir_path: '../outside/source-0' }))
    ).toThrow('must not traverse outside the repo root');
  });

  it('rejects absolute source_0 paths', () => {
    expect(() =>
      resolveRunSource0Paths('/tmp/repo', buildDescriptor({ source_path: '/tmp/source.txt' }))
    ).toThrow('must be repo-relative');
  });
});
