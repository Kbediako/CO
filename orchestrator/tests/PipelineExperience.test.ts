import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { bootstrapManifest } from '../src/cli/run/manifest.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import {
  persistPipelineExperience,
  resolveExperienceDomain,
  summarizePipelineOutcome
} from '../src/cli/services/pipelineExperience.js';

describe('pipeline experience persistence', () => {
  let workspaceRoot: string;
  let env: EnvironmentPaths;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'pipeline-experience-'));
    env = {
      repoRoot: process.cwd(),
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'pipeline-exp-task'
    };
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('records a success experience for pipeline runs', async () => {
    const pipeline: PipelineDefinition = {
      id: 'diagnostics',
      title: 'Diagnostics Pipeline',
      tags: ['diagnostics'],
      stages: []
    };
    const { manifest, paths } = await bootstrapManifest('run-pipeline-exp', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    manifest.status = 'succeeded';
    manifest.summary = 'Diagnostics completed with green checks.';
    manifest.completed_at = new Date(Date.parse(manifest.started_at) + 2000).toISOString();

    await persistPipelineExperience({ env, pipeline, manifest, paths });

    const experiencePath = join(env.outRoot, env.taskId, 'experiences.jsonl');
    const raw = await readFile(experiencePath, 'utf8');
    const lines = raw.trim().split('\n');
    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0] as string) as {
      domain: string;
      reward: { gtScore: number };
      summary32: string;
      toolStats: Array<{ tool: string }>;
    };
    expect(record.domain).toBe('diagnostics');
    expect(record.reward.gtScore).toBe(1);
    expect(record.summary32).toContain('Diagnostics completed');
    expect(record.toolStats[0]?.tool).toContain('pipeline:diagnostics');
  });

  it('skips persistence for non-success terminal states', async () => {
    const pipeline: PipelineDefinition = {
      id: 'implementation-gate',
      title: 'Implementation Gate',
      tags: ['implementation-gate'],
      stages: []
    };
    const { manifest, paths } = await bootstrapManifest('run-pipeline-fail', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    manifest.status = 'failed';
    manifest.completed_at = new Date().toISOString();

    await persistPipelineExperience({ env, pipeline, manifest, paths });

    const experiencePath = join(env.outRoot, env.taskId, 'experiences.jsonl');
    await expect(readFile(experiencePath, 'utf8')).rejects.toThrow();
  });
});

describe('pipeline experience helpers', () => {
  it('prefers direct domain matches and falls back to implementation', () => {
    const diagnosticsDomain = resolveExperienceDomain(
      { id: 'diagnostics-with-eval', title: 'Diagnostics', tags: ['diagnostics'] },
      [
        { domain: 'implementation', stamp: 'a', experienceSlots: 1 },
        { domain: 'diagnostics', stamp: 'b', experienceSlots: 1 }
      ]
    );
    expect(diagnosticsDomain).toBe('diagnostics');

    const fallbackDomain = resolveExperienceDomain(
      { id: 'docs-review', title: 'Docs', tags: ['docs'] },
      [
        { domain: 'implementation', stamp: 'a', experienceSlots: 1 },
        { domain: 'diagnostics', stamp: 'b', experienceSlots: 1 }
      ]
    );
    expect(fallbackDomain).toBe('implementation');
  });

  it('builds a summary from manifest summary and stage highlights', () => {
    const summary = summarizePipelineOutcome(
      {
        summary: 'Gate checks passed.',
        commands: [
          {
            index: 1,
            id: 'build',
            title: 'Build',
            command: 'npm run build',
            kind: 'command',
            status: 'succeeded',
            started_at: null,
            completed_at: null,
            exit_code: 0,
            summary: 'build succeeded',
            log_path: null,
            error_file: null,
            sub_run_id: null
          }
        ]
      }
    );
    expect(summary).toContain('Gate checks passed.');
    expect(summary).toContain('build succeeded');
  });
});
