import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { completeOrchestratorRunLifecycle } from '../src/cli/services/orchestratorRunLifecycleCompletion.js';
import type { ControlPlaneValidationResult } from '../src/control-plane/types.js';
import type { RunEventPublisher } from '../src/cli/events/runEvents.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { RunPaths } from '../src/cli/run/runPaths.js';
import type { CliManifest, RunSummary } from '../src/cli/types.js';
import type { SchedulerPlan } from '../src/scheduler/types.js';

async function createLifecycleFixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), 'co-1161-'));
  const env = {
    repoRoot,
    runsRoot: join(repoRoot, '.runs'),
    outRoot: join(repoRoot, 'out'),
    taskId: 'task-1161'
  } as EnvironmentPaths;
  const runDir = join(env.runsRoot, env.taskId, 'cli', 'run-1161');
  await mkdir(runDir, { recursive: true });

  const paths = {
    runDir,
    manifestPath: join(runDir, 'manifest.json'),
    heartbeatPath: join(runDir, '.heartbeat'),
    resumeTokenPath: join(runDir, '.resume-token'),
    logPath: join(runDir, 'runner.ndjson'),
    eventsPath: join(runDir, 'events.jsonl'),
    controlPath: join(runDir, 'control.json'),
    controlAuthPath: join(runDir, 'control_auth.json'),
    controlEndpointPath: join(runDir, 'control_endpoint.json'),
    confirmationsPath: join(runDir, 'confirmations.json'),
    questionsPath: join(runDir, 'questions.json'),
    delegationTokensPath: join(runDir, 'delegation_tokens.json'),
    commandsDir: join(runDir, 'commands'),
    errorsDir: join(runDir, 'errors'),
    compatDir: join(env.runsRoot, env.taskId, 'mcp', 'run-1161'),
    compatManifestPath: join(env.runsRoot, env.taskId, 'mcp', 'run-1161', 'manifest.json'),
    localCompatDir: join(env.runsRoot, 'local-mcp', 'run-1161')
  } as RunPaths;

  const manifest = {
    run_id: 'run-1161',
    task_id: env.taskId,
    status: 'succeeded',
    summary: 'completed',
    run_summary_path: null,
    runtime_mode_requested: 'appserver',
    runtime_mode: 'appserver',
    runtime_provider: 'AppServerRuntimeProvider',
    runtime_fallback: {
      occurred: false,
      code: null,
      reason: null,
      from_mode: null,
      to_mode: null,
      checked_at: '2026-03-13T00:00:00.000Z'
    }
  } as unknown as CliManifest;

  const schedulerPlan = {
    mode: 'multi-instance',
    requestedAt: '2026-03-13T00:00:00.000Z',
    minInstances: 1,
    maxInstances: 1,
    recovery: {
      heartbeatIntervalSeconds: 30,
      missingHeartbeatTimeoutSeconds: 120,
      maxRetries: 3
    },
    assignments: [
      {
        instanceId: 'task-1161-general-01',
        capability: 'general',
        status: 'succeeded',
        assignedAt: '2026-03-13T00:00:00.000Z',
        completedAt: '2026-03-13T00:01:00.000Z',
        attempts: [
          {
            number: 1,
            assignedAt: '2026-03-13T00:00:00.000Z',
            startedAt: '2026-03-13T00:00:05.000Z',
            completedAt: '2026-03-13T00:01:00.000Z',
            status: 'completed',
            recoveryCheckpoints: []
          }
        ],
        metadata: { weight: 1, maxConcurrency: 1 }
      }
    ]
  } as SchedulerPlan;

  const controlPlaneResult = {
    request: {
      schema: 'schema',
      version: '1',
      requestId: 'req-1161'
    },
    outcome: {
      mode: 'shadow',
      status: 'passed',
      timestamp: '2026-03-13T00:00:00.000Z',
      errors: [],
      drift: {
        mode: 'shadow',
        absoluteReportPath: join(repoRoot, 'out', 'drift.json'),
        totalSamples: 3,
        invalidSamples: 0,
        invalidRate: 0,
        lastSampledAt: null
      }
    }
  } as unknown as ControlPlaneValidationResult;

  return {
    env,
    paths,
    manifest,
    schedulerPlan,
    controlPlaneResult
  };
}

describe('completeOrchestratorRunLifecycle', () => {
  it('finalizes, applies, persists, emits, and returns the existing manifest + run summary', async () => {
    const { env, paths, manifest, schedulerPlan, controlPlaneResult } = await createLifecycleFixture();
    const runSummary = {} as RunSummary;
    const callOrder: string[] = [];

    const finalizePlan = vi.fn(async () => {
      callOrder.push('finalize');
    });
    const applySchedulerToRunSummary = vi.fn((summary: RunSummary, plan: SchedulerPlan) => {
      callOrder.push('scheduler-apply');
      summary.scheduler = {
        mode: plan.mode,
        recovery: plan.recovery,
        assignments: plan.assignments.map((assignment) => ({
          instanceId: assignment.instanceId,
          capability: assignment.capability,
          status: assignment.status,
          attempts: assignment.attempts.length,
          lastCompletedAt: assignment.completedAt
        }))
      };
    });
    const applyControlPlaneToRunSummary = vi.fn(
      (summary: RunSummary, result: ControlPlaneValidationResult) => {
        callOrder.push('control-plane-apply');
        summary.controlPlane = {
          schemaId: result.request.schema,
          schemaVersion: result.request.version,
          requestId: result.request.requestId,
          validation: {
            mode: result.outcome.mode,
            status: result.outcome.status,
            timestamp: result.outcome.timestamp,
            errors: result.outcome.errors
          },
          drift: result.outcome.drift
            ? {
                totalSamples: result.outcome.drift.totalSamples,
                invalidSamples: result.outcome.drift.invalidSamples,
                invalidRate: result.outcome.drift.invalidRate,
                lastSampledAt: result.outcome.drift.lastSampledAt,
                mode: result.outcome.drift.mode
              }
            : undefined
        };
      }
    );
    const runCompleted = vi.fn((payload: Parameters<RunEventPublisher['runCompleted']>[0]) => {
      callOrder.push('runCompleted');
      expect(manifest.run_summary_path).toBe('.runs/task-1161/cli/run-1161/run-summary.json');
      expect(payload).toMatchObject({
        pipelineId: 'pipeline-1161',
        status: 'succeeded',
        manifestPath: paths.manifestPath,
        runSummaryPath: '.runs/task-1161/cli/run-1161/run-summary.json',
        metricsPath: join(env.runsRoot, env.taskId, 'metrics.json'),
        summary: 'completed'
      });
    });

    const result = await completeOrchestratorRunLifecycle({
      env,
      pipeline: { id: 'pipeline-1161' },
      manifest,
      paths,
      runSummary,
      schedulerPlan,
      controlPlaneResult,
      runEvents: { runCompleted } as never,
      persister: undefined,
      finalizePlan,
      applySchedulerToRunSummary,
      applyControlPlaneToRunSummary
    });

    expect(finalizePlan).toHaveBeenCalledOnce();
    expect(applySchedulerToRunSummary).toHaveBeenCalledOnce();
    expect(applyControlPlaneToRunSummary).toHaveBeenCalledOnce();
    expect(runCompleted).toHaveBeenCalledOnce();
    expect(callOrder).toEqual(['finalize', 'scheduler-apply', 'control-plane-apply', 'runCompleted']);
    expect(result).toEqual({ manifest, runSummary });

    const persistedSummary = JSON.parse(await readFile(join(paths.runDir, 'run-summary.json'), 'utf8')) as RunSummary;
    expect(persistedSummary).toMatchObject({
      runtime: {
        modeRequested: 'appserver',
        modeUsed: 'appserver',
        provider: 'AppServerRuntimeProvider'
      },
      scheduler: {
        mode: 'multi-instance',
        assignments: [{ instanceId: 'task-1161-general-01' }]
      },
      controlPlane: {
        requestId: 'req-1161'
      }
    });
  });

  it('stops before apply and runCompleted when finalizePlan fails', async () => {
    const { env, paths, manifest, schedulerPlan, controlPlaneResult } = await createLifecycleFixture();
    const runSummary = {} as RunSummary;
    const finalizeError = new Error('finalize failed');
    const applySchedulerToRunSummary = vi.fn();
    const applyControlPlaneToRunSummary = vi.fn();
    const runCompleted = vi.fn();

    await expect(
      completeOrchestratorRunLifecycle({
        env,
        pipeline: { id: 'pipeline-1161' },
        manifest,
        paths,
        runSummary,
        schedulerPlan,
        controlPlaneResult,
        runEvents: { runCompleted } as never,
        persister: undefined,
        finalizePlan: vi.fn(async () => {
          throw finalizeError;
        }),
        applySchedulerToRunSummary,
        applyControlPlaneToRunSummary
      })
    ).rejects.toThrow('finalize failed');

    expect(applySchedulerToRunSummary).not.toHaveBeenCalled();
    expect(applyControlPlaneToRunSummary).not.toHaveBeenCalled();
    expect(runCompleted).not.toHaveBeenCalled();
    expect(manifest.run_summary_path).toBeNull();
  });
});
