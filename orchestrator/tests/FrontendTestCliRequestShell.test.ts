import { describe, expect, it, vi } from 'vitest';

import { runFrontendTestCliRequestShell } from '../src/cli/frontendTestCliRequestShell.js';

describe('runFrontendTestCliRequestShell', () => {
  it('shapes a frontend-test request and delegates to runFrontendTestCliShell', async () => {
    const runFrontendTestCliShellMock = vi.fn(async () => undefined);
    const resolveRuntimeModeFlag = vi.fn(() => 'appserver' as const);
    const applyRepoConfigRequiredPolicy = vi.fn(() => true);
    const resolveTargetStageId = vi.fn(() => 'target-stage');
    const runWithUi = vi.fn(async () => undefined);
    const emitRunOutput = vi.fn();
    const warn = vi.fn();

    await runFrontendTestCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: ['extra-one', 'extra-two'],
        flags: {
          format: 'json',
          devtools: true,
          task: ' task-id ',
          'parent-run': ' parent-run ',
          'approval-policy': ' never ',
          'target-stage': 'target-stage'
        },
        resolveRuntimeModeFlag,
        applyRepoConfigRequiredPolicy,
        resolveTargetStageId,
        runWithUi,
        emitRunOutput,
        warn
      },
      { runFrontendTestCliShell: runFrontendTestCliShellMock as never }
    );

    expect(resolveRuntimeModeFlag).toHaveBeenCalled();
    expect(applyRepoConfigRequiredPolicy).toHaveBeenCalled();
    expect(resolveTargetStageId).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[frontend-test] ignoring extra arguments: extra-one extra-two');
    expect(runFrontendTestCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'json',
        devtoolsEnabled: true,
        runtimeMode: 'appserver',
        taskId: ' task-id ',
        parentRunId: ' parent-run ',
        approvalPolicy: ' never ',
        targetStageId: 'target-stage',
        emitRunOutput
      })
    );

    const request = runFrontendTestCliShellMock.mock.calls[0]?.[0];
    await request.runWithUi(async () => undefined);
    expect(runWithUi).toHaveBeenCalled();
  });

  it('defaults format to text and omits optional string fields when unset', async () => {
    const runFrontendTestCliShellMock = vi.fn(async () => undefined);

    await runFrontendTestCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: [],
        flags: {},
        resolveRuntimeModeFlag: vi.fn(() => undefined),
        applyRepoConfigRequiredPolicy: vi.fn(() => false),
        resolveTargetStageId: vi.fn(() => undefined),
        runWithUi: vi.fn(async () => undefined),
        emitRunOutput: vi.fn(),
        warn: vi.fn()
      },
      { runFrontendTestCliShell: runFrontendTestCliShellMock as never }
    );

    expect(runFrontendTestCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'text',
        devtoolsEnabled: false,
        runtimeMode: undefined,
        taskId: undefined,
        parentRunId: undefined,
        approvalPolicy: undefined,
        targetStageId: undefined
      })
    );
  });

  it('scrubs provider-owned ambient overrides for the command and restores process env afterward', async () => {
    const runFrontendTestCliShellMock = vi.fn(async () => {
      expect(process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBeUndefined();
      expect(process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBeUndefined();
      expect(process.env.CODEX_ORCHESTRATOR_CONFIG_MODE).toBe('downstream-compatibility');
      expect(process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED).toBe('0');
    });
    const originalEnv = {
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID,
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID,
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE,
      CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH,
      CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT:
        process.env.CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT,
      CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH,
      CODEX_ORCHESTRATOR_PACKAGE_ROOT: process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT,
      CODEX_ORCHESTRATOR_CONFIG_MODE: process.env.CODEX_ORCHESTRATOR_CONFIG_MODE,
      CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED:
        process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED
    };
    process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID = 'local-mcp';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID = 'control-host';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE = 'control-host';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH =
      '/tmp/provider-workflow.last-known-good.json';
    process.env.CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT = '/tmp/provider-package-root';
    process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH = '/tmp/provider-workflow.last-known-good.json';
    process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT = '/tmp/provider-package-root';
    process.env.CODEX_ORCHESTRATOR_CONFIG_MODE = 'repo-authoritative';
    process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED = '1';

    try {
      await runFrontendTestCliRequestShell(
        {
          orchestrator: { start: vi.fn() } as never,
          positionals: [],
          flags: {},
          resolveRuntimeModeFlag: vi.fn(() => undefined),
          applyRepoConfigRequiredPolicy: vi.fn(() => {
            process.env.CODEX_ORCHESTRATOR_CONFIG_MODE = 'downstream-compatibility';
            process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED = '0';
            return false;
          }),
          resolveTargetStageId: vi.fn(() => undefined),
          runWithUi: vi.fn(async () => undefined),
          emitRunOutput: vi.fn(),
          warn: vi.fn()
        },
        { runFrontendTestCliShell: runFrontendTestCliShellMock as never }
      );
      expect(runFrontendTestCliShellMock).toHaveBeenCalledTimes(1);
      expect(process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBe(
        '/tmp/provider-workflow.last-known-good.json'
      );
      expect(process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBe('/tmp/provider-package-root');
      expect(process.env.CODEX_ORCHESTRATOR_CONFIG_MODE).toBe('repo-authoritative');
      expect(process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED).toBe('1');
    } finally {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
