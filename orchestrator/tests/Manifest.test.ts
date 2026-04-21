import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  appendCommandError,
  backfillProviderControlHostLocatorFromEnv,
  bootstrapManifest,
  buildGuardrailSummary,
  ensureGuardrailStatus,
  loadManifest,
  recordResumeEvent,
  saveManifest,
  stripNonApplicableGuardrailSummaryLines,
  upsertGuardrailSummary
} from '../src/cli/run/manifest.js';
import { readRunSource0Payload } from '../src/cli/run/source0.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { CliManifestCommand, PipelineDefinition } from '../src/cli/types.js';
import {
  computePromptPackStamp,
  type PromptPackSectionSource
} from '../../packages/orchestrator/src/instructions/promptPacks.js';

const MAX_ERROR_DETAIL_CHARS = 8 * 1024;

describe('appendCommandError', () => {
  it('truncates oversized stderr payloads and flags the truncation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-error-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'test-task'
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    const runId = 'run-append-error';
    const { manifest, paths } = await bootstrapManifest(runId, {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const command: CliManifestCommand = {
      index: 1,
      id: 'stage-test',
      title: 'Stage Test',
      command: 'echo test',
      kind: 'command',
      status: 'failed',
      started_at: null,
      completed_at: null,
      exit_code: null,
      summary: null,
      log_path: null,
      error_file: null,
      sub_run_id: null
    };

    const longStderr = 'x'.repeat(MAX_ERROR_DETAIL_CHARS + 500);
    const relativePath = await appendCommandError(env, paths, manifest, command, 'command-failed', {
      exit_code: 1,
      stderr: longStderr,
      stdout_truncated: true
    });

    const errorPath = join(repoRoot, relativePath);
    const payload = JSON.parse(await readFile(errorPath, 'utf-8')) as {
      details: Record<string, unknown>;
    };

    expect(typeof payload.details.stderr).toBe('string');
    const stderr = payload.details.stderr as string;
    expect(stderr.length).toBe(MAX_ERROR_DETAIL_CHARS + 1);
    expect(stderr.endsWith('…')).toBe(true);
    expect(payload.details.stderr_truncated).toBe(true);
    expect(payload.details.stdout_truncated).toBe(true);
  });
});

describe('bootstrapManifest', () => {
  it('persists control-host locator provenance from the ambient provider launch env', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-provider-control-host-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    const previousProviderEnv = {
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE,
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID,
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID
    } as const;

    process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE = 'control-host';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID = 'provider-host-task';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID = 'provider-host-run';

    try {
      const { manifest } = await bootstrapManifest('run-provider-contract', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null,
        issueProvider: 'linear',
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-2',
        issueUpdatedAt: '2026-03-20T00:00:00.000Z'
      });

      expect(manifest.provider_launch_source).toBe('control-host');
      expect(manifest.provider_control_host_task_id).toBe('provider-host-task');
      expect(manifest.provider_control_host_run_id).toBe('provider-host-run');
      expect(manifest.workspace_path).toBe(repoRoot);
    } finally {
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE;
      }
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID;
      }
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID;
      }
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('backfills missing control-host provenance fields without overwriting conflicting manifest provenance', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-provider-control-host-backfill-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    const previousProviderEnv = {
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE,
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID,
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID
    } as const;

    process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE = 'control-host';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID = 'provider-host-task';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID = 'provider-host-run';

    try {
      const { manifest } = await bootstrapManifest('run-provider-contract-backfill', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      manifest.provider_launch_source = null;
      manifest.provider_control_host_task_id = null;
      manifest.provider_control_host_run_id = null;

      expect(backfillProviderControlHostLocatorFromEnv(manifest)).toBe(true);
      expect(manifest.provider_launch_source).toBe('control-host');
      expect(manifest.provider_control_host_task_id).toBe('provider-host-task');
      expect(manifest.provider_control_host_run_id).toBe('provider-host-run');

      manifest.provider_control_host_task_id = 'different-control-host';
      expect(backfillProviderControlHostLocatorFromEnv(manifest)).toBe(false);
      expect(manifest.provider_control_host_task_id).toBe('different-control-host');
      expect(manifest.provider_launch_source).toBe('control-host');
      expect(manifest.provider_control_host_run_id).toBe('provider-host-run');
    } finally {
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE;
      }
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID;
      }
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID;
      }
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('reapplies missing control-host launch provenance before saving provider-worker manifests', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-provider-control-host-save-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const pipeline: PipelineDefinition = {
      id: 'provider-linear-worker',
      title: 'Provider Linear Worker',
      stages: []
    };
    const previousProviderEnv = {
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE,
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID,
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID
    } as const;

    process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE = 'control-host';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID = 'provider-host-task';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID = 'provider-host-run';

    try {
      const { manifest, paths } = await bootstrapManifest('run-provider-contract-save', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      manifest.provider_launch_source = null;
      await saveManifest(paths, manifest);

      const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
        provider_launch_source?: string | null;
        provider_control_host_task_id?: string | null;
        provider_control_host_run_id?: string | null;
      };
      expect(persisted.provider_launch_source).toBe('control-host');
      expect(persisted.provider_control_host_task_id).toBe('provider-host-task');
      expect(persisted.provider_control_host_run_id).toBe('provider-host-run');
      expect(manifest.provider_launch_source).toBe('control-host');
    } finally {
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE;
      }
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID;
      }
      if (previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID;
      } else {
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID =
          previousProviderEnv.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID;
      }
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('creates a source_0 contract and preserves the anchor across child manifests', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });
      const parentSource0 = parent.manifest.memory?.source_0;
      expect(parentSource0).toBeTruthy();
      expect(parentSource0?.kind).toBe('context_object');
      expect(parentSource0?.origin).toEqual({
        run_id: 'run-parent',
        task_id: 'task-parent',
        manifest_path: join('.runs', 'task-parent', 'cli', 'run-parent', 'manifest.json')
      });
      expect(parentSource0?.inherited_from).toBeNull();
      expect(parent.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'root',
          pointer: parentSource0?.pointer,
          object_id: parentSource0?.object_id
        },
        rejected_candidates: [],
        rediscovered_memory: null,
        counters: {
          contradiction_count: 0,
          rediscovery_count: 0,
          manual_repair_count: 0,
          repeated_failure_streak: 0,
          retrieval_hits: 0,
          retrieval_misses: 0
        }
      });

      const payload = parentSource0
        ? await readRunSource0Payload(repoRoot, parentSource0)
        : null;
      expect(payload?.kind).toBe('run_source_0');
      expect(payload?.run_contract.run_id).toBe('run-parent');
      expect(payload?.artifacts.manifest_path).toBe(
        join('.runs', 'task-parent', 'cli', 'run-parent', 'manifest.json')
      );

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });
      const childSource0 = child.manifest.memory?.source_0;
      expect(childSource0).toBeTruthy();
      expect(childSource0?.object_id).toBe(parentSource0?.object_id);
      expect(childSource0?.pointer).toBe(parentSource0?.pointer);
      expect(childSource0?.origin).toEqual(parentSource0?.origin);
      expect(childSource0?.dir_path).toBe(
        join('.runs', 'task-child', 'cli', 'run-child', 'memory', 'source-0')
      );
      expect(childSource0?.inherited_from).toEqual({
        run_id: 'run-parent',
        task_id: 'task-parent',
        manifest_path: join('.runs', 'task-parent', 'cli', 'run-parent', 'manifest.json')
      });
      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'inherited_reuse',
          pointer: childSource0?.pointer,
          object_id: childSource0?.object_id
        },
        rejected_candidates: [],
        rediscovered_memory: null,
        counters: {
          contradiction_count: 0,
          rediscovery_count: 0,
          manual_repair_count: 0,
          repeated_failure_streak: 0,
          retrieval_hits: 1,
          retrieval_misses: 0
        }
      });

      const childPayload = childSource0
        ? await readRunSource0Payload(repoRoot, childSource0)
        : null;
      const childIndex = childSource0
        ? (JSON.parse(await readFile(join(repoRoot, childSource0.index_path), 'utf8')) as {
            object_id?: string;
            source?: { byte_length?: number };
          })
        : null;
      expect(childPayload?.kind).toBe('run_source_0');
      expect(childPayload?.run_contract.run_id).toBe('run-parent');
      expect(childPayload?.artifacts.manifest_path).toBe(
        join('.runs', 'task-parent', 'cli', 'run-parent', 'manifest.json')
      );
      expect(childIndex?.object_id).toBe(parentSource0?.object_id);
      expect(childIndex?.source?.byte_length).toBe(parentSource0?.byte_length);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('falls back to a fresh child-local source_0 payload when inherited source artifacts are missing', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-missing-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });
      const parentSource0 = parent.manifest.memory?.source_0;
      expect(parentSource0).toBeTruthy();

      if (parentSource0) {
        await rm(join(repoRoot, parentSource0.dir_path), { recursive: true, force: true });
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });
      const childSource0 = child.manifest.memory?.source_0;
      expect(childSource0).toBeTruthy();
      expect(childSource0?.object_id).not.toBe(parentSource0?.object_id);
      expect(childSource0?.pointer).not.toBe(parentSource0?.pointer);
      expect(childSource0?.origin).toEqual({
        run_id: 'run-child',
        task_id: 'task-child',
        manifest_path: join('.runs', 'task-child', 'cli', 'run-child', 'manifest.json')
      });
      expect(childSource0?.inherited_from).toEqual({
        run_id: 'run-parent',
        task_id: 'task-parent',
        manifest_path: join('.runs', 'task-parent', 'cli', 'run-parent', 'manifest.json')
      });
      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild',
          pointer: childSource0?.pointer,
          object_id: childSource0?.object_id
        },
        rejected_candidates: [
          {
            pointer: parentSource0?.pointer,
            object_id: parentSource0?.object_id,
            reason: 'missing_artifacts',
            detail: 'inherited source_0 artifacts are missing'
          }
        ],
        rediscovered_memory: {
          from_pointer: parentSource0?.pointer,
          from_object_id: parentSource0?.object_id,
          to_pointer: childSource0?.pointer,
          to_object_id: childSource0?.object_id,
          reason: 'missing_artifacts'
        },
        counters: {
          contradiction_count: 0,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });

      const payload = childSource0
        ? await readRunSource0Payload(repoRoot, childSource0)
        : null;
      expect(payload?.kind).toBe('run_source_0');
      expect(payload?.run_contract.run_id).toBe('run-child');
      expect(payload?.artifacts.manifest_path).toBe(
        join('.runs', 'task-child', 'cli', 'run-child', 'manifest.json')
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('records a provenance contradiction when inherited source_0 payload lineage is invalid', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-contradiction-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });
      const parentSource0 = parent.manifest.memory?.source_0;
      expect(parentSource0).toBeTruthy();

      if (parentSource0) {
        await writeFile(join(repoRoot, parentSource0.source_path), '{}\n', 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            pointer: parentSource0?.pointer,
            object_id: parentSource0?.object_id,
            reason: 'provenance_contradiction',
            detail: 'inherited source_0 payload is invalid'
          }
        ],
        rediscovered_memory: {
          from_pointer: parentSource0?.pointer,
          from_object_id: parentSource0?.object_id,
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('records a provenance contradiction when inherited source_0 index integrity is invalid', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-index-contradiction-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });
      const parentSource0 = parent.manifest.memory?.source_0;
      expect(parentSource0).toBeTruthy();

      if (parentSource0) {
        const indexPath = join(repoRoot, parentSource0.index_path);
        const rawIndex = JSON.parse(await readFile(indexPath, 'utf8')) as { object_id: string };
        rawIndex.object_id = 'sha256:tampered-index';
        await writeFile(indexPath, JSON.stringify(rawIndex, null, 2), 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            pointer: parentSource0?.pointer,
            object_id: parentSource0?.object_id,
            reason: 'provenance_contradiction',
            detail: 'context index object_id mismatch'
          }
        ],
        rediscovered_memory: {
          from_pointer: parentSource0?.pointer,
          from_object_id: parentSource0?.object_id,
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('records a provenance contradiction when inherited source_0 descriptor fields do not match artifacts', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-descriptor-contradiction-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const parentManifestPath = parent.paths.manifestPath;
      const parentManifest = JSON.parse(await readFile(parentManifestPath, 'utf8')) as {
        memory?: { source_0?: { object_id?: string; pointer?: string } };
      };
      if (parentManifest.memory?.source_0) {
        parentManifest.memory.source_0.object_id = 'sha256:tampered-descriptor';
        parentManifest.memory.source_0.pointer =
          'ctx:sha256:tampered-descriptor#chunk:c000001';
        await writeFile(parentManifestPath, JSON.stringify(parentManifest, null, 2), 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            pointer: 'ctx:sha256:tampered-descriptor#chunk:c000001',
            object_id: 'sha256:tampered-descriptor',
            reason: 'provenance_contradiction',
            detail: 'inherited source_0 descriptor object_id does not match artifacts'
          }
        ],
        rediscovered_memory: {
          from_pointer: 'ctx:sha256:tampered-descriptor#chunk:c000001',
          from_object_id: 'sha256:tampered-descriptor',
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('records a provenance contradiction when the inherited source_0 descriptor is malformed', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-malformed-descriptor-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const parentManifestPath = parent.paths.manifestPath;
      const parentManifest = JSON.parse(await readFile(parentManifestPath, 'utf8')) as {
        memory?: { source_0?: Record<string, unknown> };
      };
      if (parentManifest.memory?.source_0) {
        delete parentManifest.memory.source_0.origin;
        await writeFile(parentManifestPath, JSON.stringify(parentManifest, null, 2), 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            reason: 'provenance_contradiction',
            detail: 'inherited source_0 descriptor is invalid'
          }
        ],
        rediscovered_memory: {
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('records a provenance contradiction when the inherited source_0 field is non-object', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-non-object-descriptor-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const parentManifestPath = parent.paths.manifestPath;
      const parentManifest = JSON.parse(await readFile(parentManifestPath, 'utf8')) as {
        memory?: { source_0?: unknown };
      };
      if (parentManifest.memory) {
        parentManifest.memory.source_0 = 'broken descriptor';
        await writeFile(parentManifestPath, JSON.stringify(parentManifest, null, 2), 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            pointer: 'ctx:sha256:invalid-inherited-source0-descriptor#chunk:invalid',
            object_id: 'sha256:invalid-inherited-source0-descriptor',
            reason: 'provenance_contradiction',
            detail: 'inherited source_0 descriptor is invalid'
          }
        ],
        rediscovered_memory: {
          from_pointer: 'ctx:sha256:invalid-inherited-source0-descriptor#chunk:invalid',
          from_object_id: 'sha256:invalid-inherited-source0-descriptor',
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('refreshes manual repair and resume latency signals from accepted manual-resume events', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-repair-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-repair'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const { manifest } = await bootstrapManifest('run-repair', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      recordResumeEvent(manifest, {
        actor: 'operator',
        reason: 'manual-resume',
        outcome: 'accepted',
        detail: 'memory-repair: repaired source_0 lineage'
      });

      expect(manifest.memory?.observability?.manual_repairs).toEqual([
        {
          timestamp: manifest.resume_events[0]?.timestamp,
          actor: 'operator',
          reason: 'manual-resume',
          outcome: 'accepted',
          detail: 'memory-repair: repaired source_0 lineage'
        }
      ]);
      expect(manifest.memory?.observability?.counters.manual_repair_count).toBe(1);
      expect(manifest.memory?.observability?.counters.resume_latency_ms).toBeGreaterThanOrEqual(0);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('ignores accepted manual-resume events without an explicit memory-repair marker', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-non-memory-resume-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-repair'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const { manifest } = await bootstrapManifest('run-repair', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      recordResumeEvent(manifest, {
        actor: 'operator',
        reason: 'manual-resume',
        outcome: 'accepted',
        detail: 'resume after operator confirmation'
      });

      expect(manifest.memory?.observability?.manual_repairs).toEqual([]);
      expect(manifest.memory?.observability?.counters.manual_repair_count).toBe(0);
      expect(manifest.memory?.observability?.counters.resume_latency_ms).toBeNull();
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('records a provenance contradiction when inherited source_0 descriptor paths escape the repo root', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-path-contradiction-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const parentManifestPath = parent.paths.manifestPath;
      const parentManifest = JSON.parse(await readFile(parentManifestPath, 'utf8')) as {
        memory?: { source_0?: { dir_path?: string } };
      };
      if (parentManifest.memory?.source_0) {
        parentManifest.memory.source_0.dir_path = '../outside';
        await writeFile(parentManifestPath, JSON.stringify(parentManifest, null, 2), 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            dir_path: 'invalid-source0/dir_path',
            reason: 'provenance_contradiction',
            detail: 'source_0 dir_path must not traverse outside the repo root'
          }
        ],
        rediscovered_memory: {
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('sanitizes rejected candidate paths when inherited source_0 descriptor paths contain control characters', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-path-control-char-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const parentManifestPath = parent.paths.manifestPath;
      const parentManifest = JSON.parse(await readFile(parentManifestPath, 'utf8')) as {
        memory?: { source_0?: { dir_path?: string } };
      };
      if (parentManifest.memory?.source_0) {
        parentManifest.memory.source_0.dir_path = 'bad\npath';
        await writeFile(parentManifestPath, JSON.stringify(parentManifest, null, 2), 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            dir_path: 'invalid-source0/dir_path',
            reason: 'provenance_contradiction',
            detail: 'source_0 dir_path must not contain control characters or line separators'
          }
        ],
        rediscovered_memory: {
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('sanitizes rejected candidate paths when inherited source_0 descriptor paths contain Unicode line separators', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-path-line-separator-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const parentManifestPath = parent.paths.manifestPath;
      const parentManifest = JSON.parse(await readFile(parentManifestPath, 'utf8')) as {
        memory?: { source_0?: { dir_path?: string } };
      };
      if (parentManifest.memory?.source_0) {
        parentManifest.memory.source_0.dir_path = 'bad\u2028path';
        await writeFile(parentManifestPath, JSON.stringify(parentManifest, null, 2), 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            dir_path: 'invalid-source0/dir_path',
            reason: 'provenance_contradiction',
            detail: 'source_0 dir_path must not contain control characters or line separators'
          }
        ],
        rediscovered_memory: {
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('sanitizes rejected candidate paths when inherited source_0 descriptor paths use UNC-style backslash roots', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-source0-path-unc-root-'));
    const parentEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-parent'
    };
    const childEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-child'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const parent = await bootstrapManifest('run-parent', {
        env: parentEnv,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const parentManifestPath = parent.paths.manifestPath;
      const parentManifest = JSON.parse(await readFile(parentManifestPath, 'utf8')) as {
        memory?: { source_0?: { dir_path?: string } };
      };
      if (parentManifest.memory?.source_0) {
        parentManifest.memory.source_0.dir_path = '\\\\server\\share';
        await writeFile(parentManifestPath, JSON.stringify(parentManifest, null, 2), 'utf8');
      }

      const child = await bootstrapManifest('run-child', {
        env: childEnv,
        pipeline,
        parentRunId: 'run-parent',
        taskSlug: null,
        approvalPolicy: null
      });

      expect(child.manifest.memory?.observability).toMatchObject({
        selected_memory: {
          selection: 'fresh_rebuild'
        },
        rejected_candidates: [
          {
            dir_path: 'invalid-source0/dir_path',
            reason: 'provenance_contradiction',
            detail: 'source_0 dir_path must be repo-relative'
          }
        ],
        rediscovered_memory: {
          reason: 'provenance_contradiction'
        },
        counters: {
          contradiction_count: 1,
          rediscovery_count: 1,
          manual_repair_count: 0,
          repeated_failure_streak: 1,
          retrieval_hits: 0,
          retrieval_misses: 1
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('persists prompt-pack retrieval policy and competitive-selection diagnostics', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-retrieval-policy-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-retrieval'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const promptRel = '.agent/prompts/sample.md';
      await mkdir(join(repoRoot, '.agent', 'prompts', 'prompt-packs', 'sample'), {
        recursive: true
      });
      await writeFile(join(repoRoot, promptRel), '# Prompt\nUse experiences.', 'utf8');
      const sections: PromptPackSectionSource[] = [
        { section: 'system', path: promptRel, content: '# Prompt\nUse experiences.' },
        { section: 'inject', path: promptRel, content: '# Prompt\nUse experiences.' },
        { section: 'summarize', path: promptRel, content: '# Prompt\nUse experiences.' },
        { section: 'extract', path: promptRel, content: '# Prompt\nUse experiences.' },
        { section: 'optimize', path: promptRel, content: '# Prompt\nUse experiences.' }
      ];
      const stamp = computePromptPackStamp(sections, {
        experienceSlots: 2,
        retrievalPolicy: {
          kind: 'competitive_scoring_v1',
          minScore: 0.1,
          scoreWeights: { gtScore: 1, relativeRank: 1 },
          antiDominanceNormalization: {
            enabled: true,
            strength: 0.5,
            sourceGrouping: 'provenance_fallback_v1'
          }
        }
      });
      await writeFile(
        join(repoRoot, '.agent', 'prompts', 'prompt-packs', 'sample', 'manifest.json'),
        JSON.stringify(
          {
            id: 'sample-pack',
            domain: 'implementation',
            stamp,
            experienceSlots: 2,
            retrievalPolicy: {
              kind: 'competitive_scoring_v1',
              minScore: 0.1,
              scoreWeights: {
                gtScore: 1,
                relativeRank: 1
              },
              antiDominanceNormalization: {
                enabled: true,
                strength: 0.5,
                sourceGrouping: 'provenance_fallback_v1'
              }
            },
            system: promptRel,
            inject: [promptRel],
            summarize: [promptRel],
            extract: [promptRel],
            optimize: [promptRel]
          },
          null,
          2
        ),
        'utf8'
      );

      await mkdir(join(env.outRoot, env.taskId), { recursive: true });
      await writeFile(
        join(env.outRoot, env.taskId, 'experiences.jsonl'),
        [
          {
            id: 'exp-a1',
            runId: 'run-a',
            taskId: env.taskId,
            epoch: 1,
            groupId: 'source-a',
            summary32: 'source a strongest',
            reward: { gtScore: 0.9, relativeRank: 0.45 },
            toolStats: [],
            stampSignature: stamp,
            domain: 'implementation',
            createdAt: '2026-04-01T00:00:00.000Z',
            manifestPath: '.runs/task-retrieval/cli/run-a/manifest.json'
          },
          {
            id: 'exp-a2',
            runId: 'run-b',
            taskId: env.taskId,
            epoch: 1,
            groupId: 'source-a',
            summary32: 'source a repeated',
            reward: { gtScore: 0.88, relativeRank: 0.42 },
            toolStats: [],
            stampSignature: stamp,
            domain: 'implementation',
            createdAt: '2026-04-01T00:00:01.000Z',
            manifestPath: '.runs/task-retrieval/cli/run-b/manifest.json'
          },
          {
            id: 'exp-b1',
            runId: 'run-c',
            taskId: env.taskId,
            epoch: 1,
            groupId: 'source-b',
            summary32: 'source b diverse',
            reward: { gtScore: 0.82, relativeRank: 0.4 },
            toolStats: [],
            stampSignature: stamp,
            domain: 'implementation',
            createdAt: '2026-04-01T00:00:02.000Z',
            manifestPath: '.runs/task-retrieval/cli/run-c/manifest.json'
          }
        ]
          .map((record) => JSON.stringify(record))
          .join('\n') + '\n',
        'utf8'
      );

      const { manifest } = await bootstrapManifest('run-retrieval', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const pack = manifest.prompt_packs?.[0];
      expect(pack?.retrieval_policy?.kind).toBe('competitive_scoring_v1');
      expect(pack?.retrieval_policy?.min_score).toBe(0.1);
      expect(pack?.retrieval_selection?.selected_ids).toEqual(['exp-a1', 'exp-b1']);
      expect(pack?.retrieval_selection?.suppressed_source_keys).toContain('group_id:source-a');
      expect(pack?.experiences?.[0]).toContain('competitive');
      expect(pack?.experiences?.[0]).toContain('source group_id:source-a');
      expect(pack?.experiences?.[1]).toContain('source group_id:source-b');

      const diagnosticsPath = pack?.retrieval_selection?.diagnostics_path;
      expect(diagnosticsPath).toBeTruthy();
      const diagnostics = JSON.parse(
        await readFile(join(repoRoot, diagnosticsPath as string), 'utf8')
      ) as {
        candidate_count: number;
        selected_count: number;
        selected: Array<{ id: string }>;
        candidates: Array<{ id: string; selected: boolean; exclusion_reason: string | null }>;
      };
      expect(diagnostics.candidate_count).toBe(3);
      expect(diagnostics.selected_count).toBe(2);
      expect(diagnostics.selected.map((entry) => entry.id)).toEqual(['exp-a1', 'exp-b1']);
      expect(
        diagnostics.candidates.find((entry) => entry.id === 'exp-a2')
      ).toMatchObject({ selected: false, exclusion_reason: 'outcompeted' });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('writes unique retrieval diagnostics paths for prompt packs that share an id', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-retrieval-diagnostics-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'task-retrieval'
    };
    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };

    try {
      const promptRel = '.agent/prompts/sample.md';
      const promptContent = '# Prompt\nUse experiences.';
      await mkdir(join(repoRoot, '.agent', 'prompts'), { recursive: true });
      await writeFile(join(repoRoot, promptRel), promptContent, 'utf8');
      const sections: PromptPackSectionSource[] = [
        { section: 'system', path: promptRel, content: promptContent },
        { section: 'inject', path: promptRel, content: promptContent },
        { section: 'summarize', path: promptRel, content: promptContent },
        { section: 'extract', path: promptRel, content: promptContent },
        { section: 'optimize', path: promptRel, content: promptContent }
      ];
      const stamp = computePromptPackStamp(sections, {
        experienceSlots: 1,
        retrievalPolicy: {
          kind: 'competitive_scoring_v1',
          minScore: 0.1,
          scoreWeights: { gtScore: 1, relativeRank: 1 },
          antiDominanceNormalization: {
            enabled: true,
            strength: 0.5,
            sourceGrouping: 'provenance_fallback_v1'
          }
        }
      });
      const sharedManifest = {
        id: 'shared-pack',
        stamp,
        experienceSlots: 1,
        retrievalPolicy: {
          kind: 'competitive_scoring_v1',
          minScore: 0.1,
          scoreWeights: {
            gtScore: 1,
            relativeRank: 1
          },
          antiDominanceNormalization: {
            enabled: true,
            strength: 0.5,
            sourceGrouping: 'provenance_fallback_v1'
          }
        },
        system: promptRel,
        inject: [promptRel],
        summarize: [promptRel],
        extract: [promptRel],
        optimize: [promptRel]
      };

      await mkdir(join(repoRoot, '.agent', 'prompts', 'prompt-packs', 'implementation'), {
        recursive: true
      });
      await writeFile(
        join(repoRoot, '.agent', 'prompts', 'prompt-packs', 'implementation', 'manifest.json'),
        JSON.stringify(
          {
            ...sharedManifest,
            domain: 'implementation'
          },
          null,
          2
        ),
        'utf8'
      );

      await mkdir(join(repoRoot, '.agent', 'prompts', 'prompt-packs', 'diagnostics'), {
        recursive: true
      });
      await writeFile(
        join(repoRoot, '.agent', 'prompts', 'prompt-packs', 'diagnostics', 'manifest.json'),
        JSON.stringify(
          {
            ...sharedManifest,
            domain: 'diagnostics'
          },
          null,
          2
        ),
        'utf8'
      );

      const { manifest } = await bootstrapManifest('run-retrieval', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const paths =
        manifest.prompt_packs
          ?.map((pack) => pack.retrieval_selection?.diagnostics_path)
          .filter((value): value is string => Boolean(value)) ?? [];
      expect(paths).toHaveLength(2);
      expect(new Set(paths).size).toBe(2);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('loadManifest', () => {
  it('resolves manifests by run id across task directories', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-test';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const loaded = await loadManifest(requesterEnv, runId);
    expect(loaded.manifest.task_id).toBe(targetTask);
    expect(loaded.paths.manifestPath).toContain(
      join('.runs', targetTask, 'cli', runId, 'manifest.json')
    );
  });

  it('resolves manifests by run id across task directories under custom runs roots', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-custom-runs-'));
    const customRunsRoot = join(repoRoot, 'custom-runs');
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-custom-runs';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: customRunsRoot,
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: customRunsRoot,
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const loaded = await loadManifest(requesterEnv, runId);
    expect(loaded.manifest.task_id).toBe(targetTask);
    expect(loaded.paths.manifestPath).toContain(
      join('custom-runs', targetTask, 'cli', runId, 'manifest.json')
    );
  });

  it('resolves legacy-layout manifests by run id across task directories', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-legacy-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-legacy';
    const legacyManifestPath = join(repoRoot, '.runs', targetTask, runId, 'manifest.json');

    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    await mkdir(join(repoRoot, '.runs', targetTask, runId), { recursive: true });
    await writeFile(
      legacyManifestPath,
      JSON.stringify({ task_id: targetTask, run_id: runId, status: 'succeeded' }),
      'utf8'
    );

    const loaded = await loadManifest(requesterEnv, runId);
    expect(loaded.manifest.task_id).toBe(targetTask);
    expect(loaded.paths.manifestPath).toContain(
      join('.runs', targetTask, runId, 'manifest.json')
    );
  });

  it('ignores non-manifest local-mcp stubs and falls back to task cli manifests', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-stub-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-stub';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const localCompatPath = join(repoRoot, '.runs', 'local-mcp', runId, 'manifest.json');
    await mkdir(join(repoRoot, '.runs', 'local-mcp', runId), { recursive: true });
    await writeFile(localCompatPath, JSON.stringify({ redirect_to: '.runs/invalid-path' }), 'utf8');

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const loaded = await loadManifest(requesterEnv, runId);
    expect(loaded.manifest.task_id).toBe(targetTask);
    expect(loaded.paths.manifestPath).toContain(
      join('.runs', targetTask, 'cli', runId, 'manifest.json')
    );
  });

  it('falls back when local-mcp symlink is dangling', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-dangling-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-dangling';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const localCompatPath = join(repoRoot, '.runs', 'local-mcp', runId, 'manifest.json');
    await rm(localCompatPath, { force: true });
    await symlink('missing-manifest.json', localCompatPath);

    const loaded = await loadManifest(requesterEnv, runId);
    expect(loaded.manifest.task_id).toBe(targetTask);
    expect(loaded.paths.manifestPath).toContain(
      join('.runs', targetTask, 'cli', runId, 'manifest.json')
    );
  });

  it('ignores local-mcp symlink targets that escape runs root', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-escape-symlink-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'manifest-load-outside-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-escape-symlink';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const outsideRunDir = join(outsideRoot, '.runs', 'outside-task', 'cli', runId);
    await mkdir(outsideRunDir, { recursive: true });
    await writeFile(
      join(outsideRunDir, 'manifest.json'),
      JSON.stringify({ task_id: 'outside-task', run_id: runId, status: 'succeeded' }),
      'utf8'
    );

    const localCompatPath = join(repoRoot, '.runs', 'local-mcp', runId, 'manifest.json');
    await rm(localCompatPath, { force: true });
    await symlink(join(outsideRunDir, 'manifest.json'), localCompatPath);

    try {
      const loaded = await loadManifest(requesterEnv, runId);
      expect(loaded.manifest.task_id).toBe(targetTask);
      expect(loaded.paths.manifestPath).toContain(
        join('.runs', targetTask, 'cli', runId, 'manifest.json')
      );
    } finally {
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it('ignores local-mcp redirect manifest targets that escape runs root', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-load-escape-redirect-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'manifest-load-outside-'));
    const targetTask = 'task-target';
    const requesterTask = 'task-requester';
    const runId = '2026-02-14T00-00-00-000Z-load-escape-redirect';

    const targetEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: targetTask
    };
    const requesterEnv: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: requesterTask
    };

    const pipeline: PipelineDefinition = { id: 'test', title: 'Test Pipeline', stages: [] };
    await bootstrapManifest(runId, {
      env: targetEnv,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    const outsideRunDir = join(outsideRoot, '.runs', 'outside-task', 'cli', runId);
    await mkdir(outsideRunDir, { recursive: true });
    const outsideManifest = join(outsideRunDir, 'manifest.json');
    await writeFile(outsideManifest, JSON.stringify({ task_id: 'outside-task', run_id: runId }), 'utf8');

    const localCompatPath = join(repoRoot, '.runs', 'local-mcp', runId, 'manifest.json');
    await rm(localCompatPath, { force: true });
    await mkdir(join(repoRoot, '.runs', 'local-mcp', runId), { recursive: true });
    await writeFile(localCompatPath, JSON.stringify({ manifest: outsideManifest }), 'utf8');

    try {
      const loaded = await loadManifest(requesterEnv, runId);
      expect(loaded.manifest.task_id).toBe(targetTask);
      expect(loaded.paths.manifestPath).toContain(
        join('.runs', targetTask, 'cli', runId, 'manifest.json')
      );
    } finally {
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
});

describe('buildGuardrailSummary', () => {
  it('reports when spec-guard is not configured for the pipeline', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-guardrail-not-configured-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'guardrail-task'
    };
    try {
      const pipeline: PipelineDefinition = {
        id: 'guardrail-pipeline',
        title: 'Guardrail Pipeline',
        stages: []
      };

      const { manifest } = await bootstrapManifest('run-guardrail-not-configured', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      expect(manifest.guardrails_required).toBe(false);
      const summary = buildGuardrailSummary(manifest);
      expect(summary).toBe('Guardrails: spec-guard not configured for this pipeline.');

      const snapshot = ensureGuardrailStatus(manifest);
      expect(snapshot.recommendation).toBeNull();
      expect(snapshot.counts.total).toBe(0);
      expect(snapshot.present).toBe(false);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('preserves explicit required-missing guardrail truth', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-guardrail-required-missing-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'guardrail-task'
    };
    try {
      const pipeline: PipelineDefinition = {
        id: 'guardrail-pipeline',
        title: 'Guardrail Pipeline',
        guardrailsRequired: true,
        stages: []
      };

      const { manifest } = await bootstrapManifest('run-guardrail-required-missing', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      expect(manifest.guardrails_required).toBe(true);
      expect(buildGuardrailSummary(manifest)).toBe('Guardrails: spec-guard command not found.');
      const snapshot = ensureGuardrailStatus(manifest);
      expect(snapshot.recommendation).toContain('Guardrail command missing;');

      upsertGuardrailSummary(manifest);

      expect(manifest.summary).toContain('Guardrail command missing;');
      expect(manifest.summary).toContain('Guardrails: spec-guard command not found.');
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('strips legacy provider-worker default missing guardrail summaries', () => {
    const summary = stripNonApplicableGuardrailSummaryLines(
      {
        pipeline_id: 'provider-linear-worker',
        guardrails_required: true,
        commands: [
          {
            id: 'provider-linear-worker',
            title: 'Provider Linear Worker',
            command: 'node dist/orchestrator/src/cli/providerLinearWorkerRunner.js'
          }
        ]
      },
      "Stage 'fail once' failed with exit code 1.\nGuardrails: spec-guard command not found."
    );

    expect(summary).toBe("Stage 'fail once' failed with exit code 1.");
  });

  it('preserves explicit required missing guardrail summaries when another stage also failed', () => {
    const summary = stripNonApplicableGuardrailSummaryLines(
      {
        guardrails_required: true,
        commands: []
      },
      "Stage 'fail once' failed with exit code 1.\nGuardrails: spec-guard command not found."
    );

    expect(summary).toBe(
      "Stage 'fail once' failed with exit code 1.\nGuardrails: spec-guard command not found."
    );
  });

  it('preserves optional spec-guard outcomes when a command exists', () => {
    const summary = stripNonApplicableGuardrailSummaryLines(
      {
        guardrails_required: false,
        commands: [
          {
            index: 1,
            id: 'spec-guard',
            title: 'Spec guard',
            command: 'node scripts/spec-guard.mjs',
            kind: 'command',
            status: 'failed',
            started_at: null,
            completed_at: null,
            exit_code: 1,
            summary: 'Guardrails: spec-guard failed (1/1 failed).',
            log_path: null,
            error_file: null,
            sub_run_id: null
          }
        ]
      },
      "Stage 'fail once' failed with exit code 1.\nGuardrails: spec-guard failed (1/1 failed)."
    );

    expect(summary).toBe(
      "Stage 'fail once' failed with exit code 1.\nGuardrails: spec-guard failed (1/1 failed)."
    );
  });

  it('treats explicit spec-guard skip summaries as skipped', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-guardrail-skip-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'guardrail-task'
    };

    try {
      const pipeline: PipelineDefinition = {
        id: 'guardrail-pipeline',
        title: 'Guardrail Pipeline',
        stages: [{ kind: 'command', id: 'spec-guard', title: 'Spec guard', command: 'echo skip' }]
      };

      const { manifest } = await bootstrapManifest('run-guardrail-skip', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const command = manifest.commands[0];
      if (!command) {
        throw new Error('Expected spec-guard command in manifest.');
      }
      command.status = 'succeeded';
      command.summary = '[spec-guard] skipped: no guard script found';

      const summary = buildGuardrailSummary(manifest);
      expect(summary).toBe('Guardrails: spec-guard skipped (all 1 skipped).');

      const snapshot = ensureGuardrailStatus(manifest);
      expect(snapshot.counts.skipped).toBe(1);
      expect(snapshot.counts.succeeded).toBe(0);
      expect(snapshot.present).toBe(false);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('preserves real failure summaries when guardrails are not configured', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-guardrail-summary-preserve-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'guardrail-task'
    };

    try {
      const pipeline: PipelineDefinition = {
        id: 'guardrail-pipeline',
        title: 'Guardrail Pipeline',
        guardrailsRequired: false,
        stages: []
      };

      const { manifest } = await bootstrapManifest('run-guardrail-summary-preserve', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      manifest.summary = "Stage 'fail once' failed with exit code 1.";
      upsertGuardrailSummary(manifest);

      expect(manifest.summary).toBe("Stage 'fail once' failed with exit code 1.");
      expect(buildGuardrailSummary(manifest)).toBe(
        'Guardrails: spec-guard not configured for this pipeline.'
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('strips stale guardrail recommendations when guardrails are not configured', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-guardrail-recommendation-strip-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'guardrail-task'
    };

    const pipeline: PipelineDefinition = {
      id: 'guardrail-pipeline',
      title: 'Guardrail Pipeline',
      guardrailsRequired: false,
      stages: []
    };

    const { manifest } = await bootstrapManifest('run-guardrail-recommendation-strip', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: null,
      approvalPolicy: null
    });

    manifest.summary =
      "Stage 'fail once' failed with exit code 1.\n" +
      'Guardrail command missing; run "codex-orchestrator start diagnostics --approval-policy never --format json --no-interactive" to capture reviewer diagnostics.';

    upsertGuardrailSummary(manifest);

    expect(manifest.summary).toBe("Stage 'fail once' failed with exit code 1.");
  });

  it('replaces stale guardrail recommendations when a resumed guardrail later succeeds', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'manifest-guardrail-recommendation-refresh-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'guardrail-task'
    };

    try {
      const pipeline: PipelineDefinition = {
        id: 'guardrail-pipeline',
        title: 'Guardrail Pipeline',
        stages: [
          {
            kind: 'command',
            id: 'spec-guard',
            title: 'Spec guard',
            command: 'echo ok'
          }
        ]
      };

      const { manifest } = await bootstrapManifest('run-guardrail-recommendation-refresh', {
        env,
        pipeline,
        parentRunId: null,
        taskSlug: null,
        approvalPolicy: null
      });

      const command = manifest.commands[0];
      if (!command) {
        throw new Error('Expected spec-guard command in manifest.');
      }
      command.status = 'succeeded';
      manifest.summary =
        "Stage 'fail once' failed with exit code 1.\n" +
        'Guardrail command failed; re-run "codex-orchestrator start diagnostics --approval-policy never --format json --no-interactive" to gather failure artifacts.';

      upsertGuardrailSummary(manifest);

      expect(manifest.summary).toBe(
        "Stage 'fail once' failed with exit code 1.\n" +
          'Guardrails: spec-guard succeeded (1 passed).'
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});
