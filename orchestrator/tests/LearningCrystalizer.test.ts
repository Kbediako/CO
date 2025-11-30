import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { CliManifest } from '../src/cli/types.js';
import { runCrystalizer, type CrystalizerClient } from '../src/learning/crystalizer.js';

function createManifest(taskId: string, runId: string): CliManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    task_id: taskId,
    task_slug: taskId,
    run_id: runId,
    parent_run_id: null,
    pipeline_id: 'learning',
    pipeline_title: 'learning',
    runner: 'codex-cli',
    approval_policy: null,
    status: 'queued',
    status_detail: null,
    started_at: now,
    completed_at: null,
    updated_at: now,
    heartbeat_at: now,
    heartbeat_interval_seconds: 5,
    heartbeat_stale_after_seconds: 30,
    artifact_root: `.runs/${taskId}/cli/${runId}`,
    compat_path: `.runs/${taskId}/cli/${runId}/compat`,
    log_path: `.runs/${taskId}/cli/${runId}/log.ndjson`,
    summary: null,
    metrics_recorded: false,
    resume_token: 'token',
    resume_events: [],
    approvals: [],
    commands: [],
    child_runs: [],
    run_summary_path: null,
    plan_target_id: null,
    instructions_hash: null,
    instructions_sources: []
  };
}

describe('LearningCrystalizer', () => {
  const client: CrystalizerClient = {
    async generate(prompt: string, options: { model: string }) {
      return {
        content: `Pattern for ${options.model}: ${prompt.slice(0, 20)}`,
        costUsd: 0.25,
        model: options.model
      };
    }
  };

  it('writes candidate markdown and updates manifest', async () => {
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-1');
    const outputDir = join(await mkdtemp(join(tmpdir(), 'crystalizer-out-')), 'candidates');

    const { candidatePath } = await runCrystalizer({
      manifest,
      client,
      problemStatement: 'Describe the fix',
      validatedPatch: 'diff --git a b',
      repoRoot: process.cwd(),
      outputDir
    });

    expect(candidatePath).toBeTruthy();
    expect(manifest.learning?.crystalizer?.status).toBe('succeeded');
    expect(manifest.learning?.crystalizer?.candidate_path).toContain('candidates');
  });

  it('fails when budget is exceeded', async () => {
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-2');
    const priceyClient: CrystalizerClient = {
      async generate(_, options: { model: string }) {
        return { content: 'expensive', costUsd: 1.0, model: options.model };
      }
    };

    await runCrystalizer({
      manifest,
      client: priceyClient,
      problemStatement: 'Budgeted fix',
      validatedPatch: 'diff --git a b',
      repoRoot: process.cwd(),
      budgetUsd: 0.5
    });

    expect(manifest.learning?.crystalizer?.status).toBe('failed');
    expect(manifest.learning?.alerts?.some((alert) => alert.type === 'budget_exceeded')).toBe(true);
  });
});
