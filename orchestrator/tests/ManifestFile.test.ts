import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  patchRunManifestFile,
  writeRunManifestSnapshot
} from '../src/cli/run/manifestFile.js';
import {
  markManifestGoalEvidenceExplicitClear,
  saveManifest
} from '../src/cli/run/manifest.js';
import type { RunPaths } from '../src/cli/run/runPaths.js';
import type { CliManifest } from '../src/cli/types.js';

let tempRoot: string | null = null;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

describe('run manifest file writes', () => {
  it('keeps concurrent unrelated snapshot updates and goal evidence patches', async () => {
    const manifestPath = await createManifest({
      version: 1,
      run_id: 'run-1',
      task_id: 'task-1',
      summary: null
    });
    const goalEvidence = buildGoalEvidence('concurrent goal evidence');

    await Promise.all([
      patchRunManifestFile(manifestPath, (manifest) => {
        manifest.goal_evidence = goalEvidence;
        return true;
      }),
      writeRunManifestSnapshot(manifestPath, {
        version: 1,
        run_id: 'run-1',
        task_id: 'task-1',
        summary: 'command runner completed',
        status: 'succeeded'
      })
    ]);

    const persisted = await readManifest(manifestPath);
    expect(persisted).toMatchObject({
      summary: 'command runner completed',
      status: 'succeeded',
      goal_evidence: goalEvidence
    });
  });

  it('keeps concurrent provider-worker metadata patches when advisory goal evidence is patched', async () => {
    const manifestPath = await createManifest({
      version: 1,
      run_id: 'run-1',
      task_id: 'task-1',
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      summary: null,
      provider_launch_source: null,
      provider_control_host_task_id: null,
      provider_control_host_run_id: null,
      provider_worker_control: {
        authority: 'appserver',
        transport: 'app-server',
        state_read_model: 'provider-linear-worker-proof'
      }
    });
    const goalEvidence = buildGoalEvidence('provider-worker advisory goal evidence');

    await Promise.all([
      patchRunManifestFile(
        manifestPath,
        (manifest) => {
          manifest.goal_evidence = goalEvidence;
          return true;
        },
        { taskId: 'provider-linear-worker-goal-evidence', missing: 'skip' }
      ),
      patchRunManifestFile(
        manifestPath,
        (manifest) => {
          manifest.provider_launch_source = 'control-host';
          manifest.provider_control_host_task_id = 'control-task-1';
          manifest.provider_control_host_run_id = 'control-run-1';
          manifest.summary = 'control host locator backfilled';
          return true;
        },
        { taskId: 'provider-linear-worker-control-host', missing: 'error' }
      )
    ]);

    const persisted = await readManifest(manifestPath);
    expect(persisted).toMatchObject({
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      summary: 'control host locator backfilled',
      provider_launch_source: 'control-host',
      provider_control_host_task_id: 'control-task-1',
      provider_control_host_run_id: 'control-run-1',
      provider_worker_control: {
        authority: 'appserver',
        transport: 'app-server',
        state_read_model: 'provider-linear-worker-proof'
      },
      goal_evidence: goalEvidence
    });

    const persistedGoalEvidence = persisted.goal_evidence as Record<string, unknown>;
    expect(persistedGoalEvidence).toMatchObject({
      authority: 'advisory_only',
      linear_authority_preserved: true
    });
    expect(persistedGoalEvidence.not_authorized_for).toEqual(goalEvidence.not_authorized_for);
  });

  it('preserves current goal evidence when saveManifest writes a stale null snapshot', async () => {
    const goalEvidence = buildGoalEvidence('preserved advisory goal evidence');
    const manifestPath = await createManifest({
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      pipeline_id: 'diagnostics',
      status: 'in_progress',
      goal_evidence: goalEvidence
    });
    const staleManifest = {
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      pipeline_id: 'diagnostics',
      status: 'succeeded',
      updated_at: '2026-05-12T00:00:00.000Z',
      goal_evidence: null
    } as unknown as CliManifest;

    await saveManifest({ manifestPath } as RunPaths, staleManifest);

    const persisted = await readManifest(manifestPath);
    expect(persisted).toMatchObject({
      status: 'succeeded',
      goal_evidence: goalEvidence
    });
    expect((staleManifest as unknown as Record<string, unknown>).goal_evidence).toEqual(goalEvidence);
  });

  it('lets marked saveManifest snapshots clear current goal evidence explicitly', async () => {
    const manifestPath = await createManifest({
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      pipeline_id: 'diagnostics',
      status: 'in_progress',
      goal_evidence: buildGoalEvidence('must clear stale advisory goal evidence')
    });
    const clearingManifest = {
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      pipeline_id: 'diagnostics',
      status: 'succeeded',
      updated_at: '2026-05-12T00:00:00.000Z',
      goal_evidence: null
    } as unknown as CliManifest;

    markManifestGoalEvidenceExplicitClear(clearingManifest);
    await saveManifest({ manifestPath } as RunPaths, clearingManifest);

    const persisted = await readManifest(manifestPath);
    expect(persisted).toMatchObject({
      status: 'succeeded',
      goal_evidence: null
    });
    expect((clearingManifest as unknown as Record<string, unknown>).goal_evidence).toBeNull();
  });

  it('lets field-level goal evidence patches clear current evidence explicitly', async () => {
    const manifestPath = await createManifest({
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      goal_evidence: buildGoalEvidence('cleared advisory goal evidence')
    });

    await patchRunManifestFile(manifestPath, (manifest) => {
      manifest.goal_evidence = null;
      return true;
    });

    const persisted = await readManifest(manifestPath);
    expect(persisted.goal_evidence).toBeNull();
  });

  it('preserves provider-worker runtime patches when stale snapshots save later', async () => {
    const runtimeFallback = {
      occurred: true,
      code: 'appserver_unavailable',
      reason: 'fallback reason',
      from_mode: 'appserver',
      to_mode: 'cli'
    };
    const providerWorkerControl = {
      authority: 'legacy_cli_break_glass',
      transport: 'codex-exec-jsonl',
      state_read_model: 'provider-linear-worker-proof'
    };
    const manifestPath = await createManifest({
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      runtime_mode_requested: 'appserver',
      runtime_mode: 'cli',
      runtime_provider: 'CliRuntimeProvider',
      runtime_fallback: runtimeFallback,
      provider_worker_control: providerWorkerControl
    });
    const staleManifest = {
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      pipeline_id: 'provider-linear-worker',
      status: 'succeeded',
      updated_at: '2026-05-12T00:00:00.000Z',
      runtime_mode_requested: 'appserver',
      runtime_mode: 'appserver',
      runtime_provider: 'AppServerRuntimeProvider',
      runtime_fallback: {
        occurred: false,
        code: null,
        reason: null,
        from_mode: null,
        to_mode: null
      }
    } as unknown as CliManifest;

    await saveManifest({ manifestPath } as RunPaths, staleManifest);

    const persisted = await readManifest(manifestPath);
    expect(persisted).toMatchObject({
      status: 'succeeded',
      runtime_mode_requested: 'appserver',
      runtime_mode: 'cli',
      runtime_provider: 'CliRuntimeProvider',
      runtime_fallback: runtimeFallback,
      provider_worker_control: providerWorkerControl
    });
    expect((staleManifest as unknown as Record<string, unknown>).runtime_mode).toBe('cli');
    expect((staleManifest as unknown as Record<string, unknown>).provider_worker_control).toEqual(providerWorkerControl);
  });

  it('does not preserve malformed current goal evidence across stale null snapshots', async () => {
    const manifestPath = await createManifest({
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      pipeline_id: 'diagnostics',
      status: 'in_progress',
      goal_evidence: {
        authority: 'advisory_only',
        linear_authority_preserved: true,
        not_authorized_for: ['linear_transition']
      }
    });
    const staleManifest = {
      version: 1,
      task_id: 'task-1',
      run_id: 'run-1',
      pipeline_id: 'diagnostics',
      status: 'succeeded',
      updated_at: '2026-05-12T00:00:00.000Z',
      goal_evidence: null
    } as unknown as CliManifest;

    await saveManifest({ manifestPath } as RunPaths, staleManifest);

    const persisted = await readManifest(manifestPath);
    expect(persisted.goal_evidence).toBeNull();
  });
});

async function createManifest(payload: Record<string, unknown>): Promise<string> {
  tempRoot = await mkdtemp(join(tmpdir(), 'manifest-file-'));
  const manifestPath = join(tempRoot, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return manifestPath;
}

async function readManifest(manifestPath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
}

function buildGoalEvidence(objective: string): Record<string, unknown> {
  return {
    source: 'codex-goals',
    feature_available: true,
    feature_enabled: true,
    capture_mode: 'captured',
    capture_timestamp: '2026-05-12T00:00:00.000Z',
    thread_id: 'thread-1',
    turn_id: 'turn-1',
    objective,
    status: 'in_progress',
    token_budget: null,
    tokens_used: 1,
    elapsed_seconds: 1,
    created_at: '2026-05-12T00:00:00.000Z',
    updated_at: '2026-05-12T00:00:01.000Z',
    authority: 'advisory_only',
    linear_authority_preserved: true,
    not_authorized_for: [
      'linear_transition',
      'workpad_replacement',
      'pr_attachment',
      'review_handoff',
      'ready_review_success',
      'merge_closeout',
      'hook_recovery_success',
      'long_poll_terminal_status',
      'hook_resume_control_integration',
      'tui_automation'
    ],
    reason: null
  };
}
