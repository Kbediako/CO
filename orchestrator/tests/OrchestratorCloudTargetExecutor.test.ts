import { afterEach, describe, expect, it, vi } from 'vitest';
import process from 'node:process';

import type { PlanItem, TaskContext } from '../src/types.js';
import type { CliManifest, PipelineDefinition } from '../src/cli/types.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { RunPaths } from '../src/cli/run/runPaths.js';
import { buildCloudPrompt } from '../src/cli/services/orchestratorCloudPromptBuilder.js';
import { executeOrchestratorCloudTarget } from '../src/cli/services/orchestratorCloudTargetExecutor.js';
import {
  CodexCloudTaskExecutor,
  type CloudExecutionManifest,
  type CloudTaskExecutorInput
} from '../src/cloud/CodexCloudTaskExecutor.js';

const ORIGINAL_ENV = {
  CODEX_CLI_BIN: process.env.CODEX_CLI_BIN,
  CODEX_CLOUD_ENV_ID: process.env.CODEX_CLOUD_ENV_ID,
  CODEX_CLOUD_POLL_INTERVAL_SECONDS: process.env.CODEX_CLOUD_POLL_INTERVAL_SECONDS,
  CODEX_CLOUD_TIMEOUT_SECONDS: process.env.CODEX_CLOUD_TIMEOUT_SECONDS,
  CODEX_CLOUD_EXEC_ATTEMPTS: process.env.CODEX_CLOUD_EXEC_ATTEMPTS,
  CODEX_CLOUD_STATUS_RETRY_LIMIT: process.env.CODEX_CLOUD_STATUS_RETRY_LIMIT,
  CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS: process.env.CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS,
  CODEX_CLOUD_BRANCH: process.env.CODEX_CLOUD_BRANCH,
  CODEX_CLOUD_ENABLE_FEATURES: process.env.CODEX_CLOUD_ENABLE_FEATURES,
  CODEX_CLOUD_DISABLE_FEATURES: process.env.CODEX_CLOUD_DISABLE_FEATURES,
  CODEX_NON_INTERACTIVE: process.env.CODEX_NON_INTERACTIVE,
  CODEX_NO_INTERACTIVE: process.env.CODEX_NO_INTERACTIVE,
  CODEX_INTERACTIVE: process.env.CODEX_INTERACTIVE
};

function restoreEnv(): void {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
}

function buildCloudExecution(overrides: Partial<CloudExecutionManifest> = {}): CloudExecutionManifest {
  return {
    task_id: 'task_e_1234567890abcdef1234567890abcdef',
    environment_id: 'env-123',
    status: 'ready',
    status_url: 'https://chatgpt.com/codex/tasks/task_e_1234567890abcdef1234567890abcdef',
    submitted_at: '2026-03-14T03:00:00.000Z',
    completed_at: '2026-03-14T03:00:10.000Z',
    last_polled_at: '2026-03-14T03:00:10.000Z',
    poll_count: 1,
    poll_interval_seconds: 10,
    timeout_seconds: 1800,
    attempts: 1,
    diff_path: null,
    diff_url: null,
    diff_status: 'unavailable',
    apply_status: 'not_requested',
    log_path: 'cloud/commands.ndjson',
    error: null,
    ...overrides
  };
}

function buildManifest(): CliManifest {
  return {
    commands: [
      {
        index: 1,
        id: 'stage-1',
        kind: 'command',
        title: 'Stage 1',
        command: 'echo ok',
        status: 'pending',
        log_path: null,
        summary: null,
        started_at: null,
        completed_at: null,
        exit_code: null,
        cwd: null,
        env: null,
        timeout_ms: null,
        allow_failure: false,
        optional: false,
        child_pipeline_id: null,
        child_run_id: null
      }
    ],
    prompt_packs: [
      {
        id: 'pp-impl',
        domain: 'implementation',
        stamp: 'impl',
        experience_slots: 3,
        sources: [],
        experiences: ['[exp impl-1] Keep cloud request shaping deterministic.']
      }
    ]
  } as unknown as CliManifest;
}

function buildOptions(envOverrides?: NodeJS.ProcessEnv) {
  const task: TaskContext = {
    id: 'task-1',
    title: 'Ship cloud request helper',
    description: 'Extract a bounded cloud request contract.',
    metadata: {}
  };
  const pipeline: PipelineDefinition = {
    id: 'implementation',
    title: 'Implementation Pipeline',
    tags: ['implementation'],
    stages: [{ kind: 'command', id: 'stage-1', title: 'Stage 1', command: 'echo ok' }]
  };
  const target: PlanItem = {
    id: 'implementation:stage-1',
    description: 'Run stage 1 in cloud.',
    metadata: { stageId: 'stage-1', cloudEnvId: 'env-123' }
  };
  const env = { repoRoot: '/repo/root' } as EnvironmentPaths;
  const paths = { runDir: '/repo/root/.runs/task-1/cli/run-1' } as RunPaths;

  return {
    env,
    pipeline,
    manifest: buildManifest(),
    paths,
    target,
    task,
    envOverrides,
    controlWatcher: {
      sync: vi.fn(async () => undefined),
      waitForResume: vi.fn(async () => undefined),
      isCanceled: vi.fn(() => false)
    },
    schedulePersist: vi.fn(async () => undefined)
  };
}

afterEach(() => {
  restoreEnv();
  vi.restoreAllMocks();
});

describe('executeOrchestratorCloudTarget request shaping', () => {
  it('assembles the cloud executor request from explicit env overrides', async () => {
    let captured: CloudTaskExecutorInput | null = null;
    vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute').mockImplementationOnce(async (input) => {
      captured = input;
      return {
        success: true,
        summary: 'Cloud task completed.',
        notes: [],
        cloudExecution: buildCloudExecution({
          environment_id: input.environmentId,
          poll_interval_seconds: input.pollIntervalSeconds,
          timeout_seconds: input.timeoutSeconds,
          attempts: input.attempts
        })
      };
    });

    const options = buildOptions({
      CODEX_CLI_BIN: '/custom/codex',
      CODEX_CLOUD_POLL_INTERVAL_SECONDS: '25',
      CODEX_CLOUD_TIMEOUT_SECONDS: '600',
      CODEX_CLOUD_EXEC_ATTEMPTS: '3',
      CODEX_CLOUD_STATUS_RETRY_LIMIT: '9',
      CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS: '2100',
      CODEX_CLOUD_BRANCH: ' refs/heads/feature/test ',
      CODEX_CLOUD_ENABLE_FEATURES: 'js_repl, memories js_repl',
      CODEX_CLOUD_DISABLE_FEATURES: 'audio, audio telemetry',
      CODEX_NON_INTERACTIVE: '0',
      CODEX_NO_INTERACTIVE: '0',
      CODEX_INTERACTIVE: '1',
      CUSTOM_ENV: 'present'
    });

    const result = await executeOrchestratorCloudTarget(options);

    expect(result.success).toBe(true);
    expect(captured).toBeTruthy();
    expect(captured?.codexBin).toBe('/custom/codex');
    expect(captured?.environmentId).toBe('env-123');
    expect(captured?.repoRoot).toBe('/repo/root');
    expect(captured?.runDir).toBe('/repo/root/.runs/task-1/cli/run-1');
    expect(captured?.pollIntervalSeconds).toBe(25);
    expect(captured?.timeoutSeconds).toBe(600);
    expect(captured?.attempts).toBe(3);
    expect(captured?.statusRetryLimit).toBe(9);
    expect(captured?.statusRetryBackoffMs).toBe(2100);
    expect(captured?.branch).toBe('refs/heads/feature/test');
    expect(captured?.enableFeatures).toEqual(['js_repl', 'memories']);
    expect(captured?.disableFeatures).toEqual(['audio', 'telemetry']);
    expect(captured?.env?.CUSTOM_ENV).toBe('present');
    expect(captured?.env?.CODEX_NON_INTERACTIVE).toBe('0');
    expect(captured?.env?.CODEX_NO_INTERACTIVE).toBe('0');
    expect(captured?.env?.CODEX_INTERACTIVE).toBe('1');
    expect(captured?.prompt).toBe(
      buildCloudPrompt({
        task: options.task,
        target: options.target,
        pipeline: options.pipeline,
        stage: options.pipeline.stages[0]!,
        manifest: options.manifest
      })
    );
    expect(captured?.prompt).toContain('Task ID: task-1');
    expect(captured?.prompt).toContain('Target stage: stage-1 (Run stage 1 in cloud.)');
    expect(captured?.prompt).toContain('Relevant prior experiences');
    expect(typeof captured?.onUpdate).toBe('function');
  });

  it('builds the cloud prompt from the resolved non-first target stage', async () => {
    let captured: CloudTaskExecutorInput | null = null;
    vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute').mockImplementationOnce(async (input) => {
      captured = input;
      return {
        success: true,
        summary: 'Cloud task completed.',
        notes: [],
        cloudExecution: buildCloudExecution({
          environment_id: input.environmentId,
          poll_interval_seconds: input.pollIntervalSeconds,
          timeout_seconds: input.timeoutSeconds,
          attempts: input.attempts
        })
      };
    });

    const options = buildOptions();
    options.pipeline = {
      ...options.pipeline,
      stages: [
        { kind: 'command', id: 'stage-1', title: 'Stage 1', command: 'echo stage-1' },
        { kind: 'command', id: 'stage-2', title: 'Stage 2', command: 'echo stage-2' }
      ]
    };
    options.manifest = {
      ...options.manifest,
      commands: [
        {
          index: 1,
          id: 'stage-1',
          kind: 'command',
          title: 'Stage 1',
          command: 'echo stage-1',
          status: 'pending',
          log_path: null,
          summary: null,
          started_at: null,
          completed_at: null,
          exit_code: null,
          cwd: null,
          env: null,
          timeout_ms: null,
          allow_failure: false,
          optional: false,
          child_pipeline_id: null,
          child_run_id: null
        },
        {
          index: 2,
          id: 'stage-2',
          kind: 'command',
          title: 'Stage 2',
          command: 'echo stage-2',
          status: 'pending',
          log_path: null,
          summary: null,
          started_at: null,
          completed_at: null,
          exit_code: null,
          cwd: null,
          env: null,
          timeout_ms: null,
          allow_failure: false,
          optional: false,
          child_pipeline_id: null,
          child_run_id: null
        }
      ]
    } as CliManifest;
    options.target = {
      id: 'implementation:stage-2',
      description: 'Run stage 2 in cloud.',
      metadata: { stageId: 'stage-2', cloudEnvId: 'env-123' }
    };

    const result = await executeOrchestratorCloudTarget(options);

    expect(result.success).toBe(true);
    expect(captured?.prompt).toBe(
      buildCloudPrompt({
        task: options.task,
        target: options.target,
        pipeline: options.pipeline,
        stage: options.pipeline.stages[1]!,
        manifest: options.manifest
      })
    );
    expect(captured?.prompt).toContain('Target stage: stage-2 (Run stage 2 in cloud.)');
    expect(captured?.prompt).not.toContain('Target stage: stage-1');
  });

  it('falls back to defaults when optional request env values are blank or invalid', async () => {
    let captured: CloudTaskExecutorInput | null = null;
    vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute').mockImplementationOnce(async (input) => {
      captured = input;
      return {
        success: true,
        summary: 'Cloud task completed.',
        notes: [],
        cloudExecution: buildCloudExecution({
          environment_id: input.environmentId,
          poll_interval_seconds: input.pollIntervalSeconds,
          timeout_seconds: input.timeoutSeconds,
          attempts: input.attempts
        })
      };
    });

    const result = await executeOrchestratorCloudTarget(
      buildOptions({
        CODEX_CLI_BIN: '/fallback/codex',
        CODEX_CLOUD_POLL_INTERVAL_SECONDS: '0',
        CODEX_CLOUD_TIMEOUT_SECONDS: '-5',
        CODEX_CLOUD_EXEC_ATTEMPTS: 'abc',
        CODEX_CLOUD_STATUS_RETRY_LIMIT: '0',
        CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS: 'bad',
        CODEX_CLOUD_BRANCH: '   ',
        CODEX_CLOUD_ENABLE_FEATURES: ' ',
        CODEX_CLOUD_DISABLE_FEATURES: ''
      })
    );

    expect(result.success).toBe(true);
    expect(captured).toBeTruthy();
    expect(captured?.codexBin).toBe('/fallback/codex');
    expect(captured?.pollIntervalSeconds).toBe(10);
    expect(captured?.timeoutSeconds).toBe(1800);
    expect(captured?.attempts).toBe(1);
    expect(captured?.statusRetryLimit).toBe(12);
    expect(captured?.statusRetryBackoffMs).toBe(1500);
    expect(captured?.branch).toBeNull();
    expect(captured?.enableFeatures).toEqual([]);
    expect(captured?.disableFeatures).toEqual([]);
    expect(captured?.env?.CODEX_NON_INTERACTIVE).toBe('1');
    expect(captured?.env?.CODEX_NO_INTERACTIVE).toBe('1');
    expect(captured?.env?.CODEX_INTERACTIVE).toBe('0');
  });

  it('uses process env for omitted request fields while preserving explicit overrides', async () => {
    process.env.CODEX_CLOUD_POLL_INTERVAL_SECONDS = '14';
    process.env.CODEX_CLOUD_EXEC_ATTEMPTS = '2';
    process.env.CODEX_CLOUD_STATUS_RETRY_LIMIT = '7';
    process.env.CODEX_CLOUD_STATUS_RETRY_BACKOFF_MS = '1750';
    process.env.CODEX_CLOUD_BRANCH = ' process-branch ';
    process.env.CODEX_CLOUD_ENABLE_FEATURES = 'memories js_repl memories';
    process.env.CODEX_CLOUD_DISABLE_FEATURES = 'audio';
    process.env.CODEX_NON_INTERACTIVE = '0';
    process.env.CODEX_NO_INTERACTIVE = '0';
    process.env.CODEX_INTERACTIVE = '1';

    let captured: CloudTaskExecutorInput | null = null;
    vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute').mockImplementationOnce(async (input) => {
      captured = input;
      return {
        success: true,
        summary: 'Cloud task completed.',
        notes: [],
        cloudExecution: buildCloudExecution({
          environment_id: input.environmentId,
          poll_interval_seconds: input.pollIntervalSeconds,
          timeout_seconds: input.timeoutSeconds,
          attempts: input.attempts
        })
      };
    });

    const result = await executeOrchestratorCloudTarget(
      buildOptions({
        CODEX_CLI_BIN: '/mixed/codex',
        CODEX_CLOUD_TIMEOUT_SECONDS: '1200'
      })
    );

    expect(result.success).toBe(true);
    expect(captured).toBeTruthy();
    expect(captured?.codexBin).toBe('/mixed/codex');
    expect(captured?.pollIntervalSeconds).toBe(14);
    expect(captured?.timeoutSeconds).toBe(1200);
    expect(captured?.attempts).toBe(2);
    expect(captured?.statusRetryLimit).toBe(7);
    expect(captured?.statusRetryBackoffMs).toBe(1750);
    expect(captured?.branch).toBe('process-branch');
    expect(captured?.enableFeatures).toEqual(['memories', 'js_repl']);
    expect(captured?.disableFeatures).toEqual(['audio']);
    expect(captured?.env?.CODEX_NON_INTERACTIVE).toBe('0');
    expect(captured?.env?.CODEX_NO_INTERACTIVE).toBe('0');
    expect(captured?.env?.CODEX_INTERACTIVE).toBe('1');
  });

  it('applies the missing-env failure contract before executor handoff', async () => {
    delete process.env.CODEX_CLOUD_ENV_ID;
    const options = buildOptions({ CODEX_CLOUD_ENV_ID: ' ' });
    options.target.metadata = { stageId: 'stage-1' };

    const executeSpy = vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute');

    const result = await executeOrchestratorCloudTarget(options);

    expect(result.success).toBe(false);
    expect(result.notes).toEqual([
      'Cloud execution requested but no environment id is configured. Set CODEX_CLOUD_ENV_ID or provide target metadata.cloudEnvId.'
    ]);
    expect(executeSpy).not.toHaveBeenCalled();
    expect(options.schedulePersist).not.toHaveBeenCalled();
    expect(options.manifest.status_detail).toBe('cloud-env-missing');
    expect(options.manifest.summary).toBe(
      'Cloud execution requested but no environment id is configured. Set CODEX_CLOUD_ENV_ID or provide target metadata.cloudEnvId.'
    );
    expect(options.manifest.cloud_execution).toMatchObject({
      task_id: null,
      environment_id: null,
      status: 'failed',
      status_url: null,
      submitted_at: null,
      last_polled_at: null,
      poll_count: 0,
      poll_interval_seconds: 10,
      timeout_seconds: 1800,
      attempts: 1,
      diff_path: null,
      diff_url: null,
      diff_status: 'unavailable',
      apply_status: 'not_requested',
      log_path: null,
      error:
        'Cloud execution requested but no environment id is configured. Set CODEX_CLOUD_ENV_ID or provide target metadata.cloudEnvId.'
    });
    expect(options.manifest.cloud_execution?.completed_at).toBeTruthy();
    expect(options.manifest.commands[0]).toMatchObject({
      status: 'failed',
      exit_code: 1,
      summary:
        'Cloud execution requested but no environment id is configured. Set CODEX_CLOUD_ENV_ID or provide target metadata.cloudEnvId.'
    });
    expect(options.manifest.commands[0]?.started_at).toBeTruthy();
    expect(options.manifest.commands[0]?.completed_at).toBeTruthy();
  });

  it('preserves an existing target started_at when applying the missing-env failure contract', async () => {
    delete process.env.CODEX_CLOUD_ENV_ID;
    const options = buildOptions({ CODEX_CLOUD_ENV_ID: '' });
    options.target.metadata = { stageId: 'stage-1' };
    options.manifest.commands[0]!.started_at = '2026-03-14T03:00:00.000Z';

    const result = await executeOrchestratorCloudTarget(options);

    expect(result.success).toBe(false);
    expect(options.manifest.commands[0]?.started_at).toBe('2026-03-14T03:00:00.000Z');
    expect(options.manifest.commands[0]?.completed_at).toBeTruthy();
    expect(options.manifest.commands[0]?.exit_code).toBe(1);
  });

  it('returns run-canceled before target preflight continues', async () => {
    const options = buildOptions();
    options.controlWatcher.isCanceled = vi.fn(() => true);
    const executeSpy = vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute');

    const result = await executeOrchestratorCloudTarget(options);

    expect(result).toEqual({ success: false, notes: [] });
    expect(options.manifest.status_detail).toBe('run-canceled');
    expect(options.manifest.commands[0]?.status).toBe('pending');
    expect(executeSpy).not.toHaveBeenCalled();
    expect(options.schedulePersist).not.toHaveBeenCalled();
  });

  it('fails when the cloud target cannot be resolved during preflight', async () => {
    const options = buildOptions();
    options.target.id = 'implementation:missing-stage';
    options.target.metadata = {};
    const executeSpy = vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute');

    const result = await executeOrchestratorCloudTarget(options);

    expect(result.success).toBe(false);
    expect(result.notes).toEqual(['Cloud execution target "implementation:missing-stage" could not be resolved.']);
    expect(options.manifest.status_detail).toBe('cloud-target-missing');
    expect(options.manifest.summary).toBe('Cloud execution target "implementation:missing-stage" could not be resolved.');
    expect(options.manifest.commands[0]?.status).toBe('pending');
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('marks non-target siblings as skipped during preflight before missing-env failure returns', async () => {
    delete process.env.CODEX_CLOUD_ENV_ID;
    const options = buildOptions({ CODEX_CLOUD_ENV_ID: '' });
    options.target.metadata = { stageId: 'stage-1' };
    options.pipeline.stages.push({
      kind: 'command',
      id: 'stage-2',
      title: 'Stage 2',
      command: 'echo second'
    });
    options.manifest.commands.push({
      index: 2,
      id: 'stage-2',
      kind: 'command',
      title: 'Stage 2',
      command: 'echo second',
      status: 'pending',
      log_path: null,
      summary: null,
      started_at: null,
      completed_at: null,
      exit_code: null,
      cwd: null,
      env: null,
      timeout_ms: null,
      allow_failure: false,
      optional: false,
      child_pipeline_id: null,
      child_run_id: null
    });

    const result = await executeOrchestratorCloudTarget(options);

    expect(result.success).toBe(false);
    expect(options.manifest.commands[0]).toMatchObject({
      status: 'failed',
      exit_code: 1
    });
    expect(options.manifest.commands[1]).toMatchObject({
      status: 'skipped',
      summary: 'Skipped in cloud mode (target stage: stage-1).'
    });
    expect(options.manifest.commands[1]?.started_at).toBeTruthy();
    expect(options.manifest.commands[1]?.completed_at).toBeTruthy();
  });

  it('enters running state before executor handoff and persists intermediate cloud updates', async () => {
    const runEvents = {
      stageStarted: vi.fn(),
      stageCompleted: vi.fn()
    };
    const options = {
      ...buildOptions(),
      runEvents
    };
    const intermediateExecution = buildCloudExecution({
      status: 'running',
      completed_at: null,
      last_polled_at: '2026-03-14T03:00:05.000Z',
      log_path: 'cloud/intermediate.ndjson'
    });
    const finalExecution = buildCloudExecution({
      status: 'completed',
      log_path: 'cloud/final.ndjson'
    });

    vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute').mockImplementationOnce(async (input) => {
      expect(options.manifest.commands[0]).toMatchObject({
        status: 'running',
        started_at: expect.any(String)
      });
      expect(options.schedulePersist).toHaveBeenCalledTimes(1);
      expect(options.schedulePersist).toHaveBeenNthCalledWith(1, { manifest: true, force: true });
      expect(runEvents.stageStarted).toHaveBeenCalledTimes(1);
      expect(runEvents.stageStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          stageId: 'stage-1',
          stageIndex: 1,
          status: 'running',
          logPath: null
        })
      );

      await input.onUpdate?.(intermediateExecution);

      expect(options.manifest.cloud_execution).toEqual(intermediateExecution);
      expect(options.manifest.commands[0]?.log_path).toBe('cloud/intermediate.ndjson');
      expect(options.schedulePersist).toHaveBeenCalledTimes(2);
      expect(options.schedulePersist).toHaveBeenNthCalledWith(2, { manifest: true, force: true });

      return {
        success: true,
        summary: 'Cloud task completed.',
        notes: [],
        cloudExecution: finalExecution
      };
    });

    const result = await executeOrchestratorCloudTarget(options);

    expect(result.success).toBe(true);
    expect(options.manifest.cloud_execution).toEqual(finalExecution);
    expect(options.manifest.commands[0]).toMatchObject({
      status: 'succeeded',
      exit_code: 0,
      log_path: 'cloud/final.ndjson',
      summary: 'Cloud task completed.'
    });
    expect(options.schedulePersist).toHaveBeenCalledTimes(3);
    expect(options.schedulePersist).toHaveBeenNthCalledWith(3, { manifest: true, force: true });
    expect(runEvents.stageCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        stageId: 'stage-1',
        stageIndex: 1,
        status: 'succeeded',
        exitCode: 0,
        logPath: 'cloud/final.ndjson'
      })
    );
  });

  it('applies the failed completion shell after executor returns', async () => {
    const runEvents = {
      stageStarted: vi.fn(),
      stageCompleted: vi.fn()
    };
    const options = {
      ...buildOptions(),
      runEvents
    };
    const failedExecution = buildCloudExecution({
      status: 'failed',
      log_path: 'cloud/failed.ndjson'
    });

    vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute').mockResolvedValueOnce({
      success: false,
      summary: 'Cloud task failed.',
      notes: ['Remote runner failed.'],
      cloudExecution: failedExecution
    });

    const result = await executeOrchestratorCloudTarget(options);

    expect(result.success).toBe(false);
    expect(options.manifest.cloud_execution).toEqual(failedExecution);
    expect(options.manifest.status_detail).toBe('cloud:stage-1:failed');
    expect(options.manifest.summary).toBe('Cloud task failed.');
    expect(options.manifest.commands[0]).toMatchObject({
      status: 'failed',
      exit_code: 1,
      log_path: 'cloud/failed.ndjson',
      summary: 'Cloud task failed.'
    });
    expect(options.manifest.commands[0]?.completed_at).toBeTruthy();
    expect(options.schedulePersist).toHaveBeenCalledTimes(2);
    expect(options.schedulePersist).toHaveBeenNthCalledWith(2, { manifest: true, force: true });
    expect(runEvents.stageCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        stageId: 'stage-1',
        stageIndex: 1,
        status: 'failed',
        exitCode: 1,
        summary: 'Cloud task failed.',
        logPath: 'cloud/failed.ndjson'
      })
    );
  });
});
