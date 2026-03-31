import process from 'node:process';

import type { RunEventEmitter } from './events/runEvents.js';
import { REPO_CONFIG_REQUIRED_ENV_KEY } from './config/repoConfigPolicy.js';
import type { RunFrontendTestCliShellParams } from './frontendTestCliShell.js';
import { runFrontendTestCliShell } from './frontendTestCliShell.js';
import {
  PROVIDER_OVERRIDE_MARKER_ENV_KEYS,
  PROVIDER_OVERRIDE_ENV_KEYS,
  sanitizeProviderOverrideEnv
} from './utils/providerOverrideEnv.js';

type OutputFormat = 'json' | 'text';
type RuntimeModeOption = 'cli' | 'appserver';
type ArgMap = Record<string, string | boolean>;

export interface RunFrontendTestCliRequestShellParams {
  orchestrator: RunFrontendTestCliShellParams['orchestrator'];
  positionals: string[];
  flags: ArgMap;
  resolveRuntimeModeFlag: (flags: ArgMap) => RuntimeModeOption | undefined;
  applyRepoConfigRequiredPolicy: (flags: ArgMap) => boolean;
  resolveTargetStageId: (flags: ArgMap) => string | undefined;
  runWithUi: (
    format: OutputFormat,
    action: (runEvents: RunEventEmitter) => Promise<void>
  ) => Promise<void>;
  emitRunOutput: RunFrontendTestCliShellParams['emitRunOutput'];
  warn: (line: string) => void;
}

interface FrontendTestCliRequestShellDependencies {
  runFrontendTestCliShell: typeof runFrontendTestCliShell;
}

const DEFAULT_DEPENDENCIES: FrontendTestCliRequestShellDependencies = {
  runFrontendTestCliShell
};

export async function runFrontendTestCliRequestShell(
  params: RunFrontendTestCliRequestShellParams,
  overrides: Partial<FrontendTestCliRequestShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const format = resolveOutputFormat(params.flags);
  const devtoolsEnabled = Boolean(params.flags['devtools']);
  const runtimeMode = params.resolveRuntimeModeFlag(params.flags);
  const restoreProcessEnv = applyProviderOverrideSanitizationToProcessEnv();
  try {
    params.applyRepoConfigRequiredPolicy(params.flags);

    if (params.positionals.length > 0) {
      params.warn(`[frontend-test] ignoring extra arguments: ${params.positionals.join(' ')}`);
    }

    await dependencies.runFrontendTestCliShell({
      orchestrator: params.orchestrator,
      format,
      devtoolsEnabled,
      runtimeMode,
      taskId: readRawStringFlagValue(params.flags['task']),
      parentRunId: readRawStringFlagValue(params.flags['parent-run']),
      approvalPolicy: readRawStringFlagValue(params.flags['approval-policy']),
      targetStageId: params.resolveTargetStageId(params.flags),
      runWithUi: async (action) => await params.runWithUi(format, action),
      emitRunOutput: params.emitRunOutput
    });
  } finally {
    restoreProcessEnv();
  }
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return flags['format'] === 'json' ? 'json' : 'text';
}

function readRawStringFlagValue(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function applyProviderOverrideSanitizationToProcessEnv(
  env: NodeJS.ProcessEnv = process.env
): () => void {
  const previous = {
    trackedOverrides: Object.fromEntries(
      [...PROVIDER_OVERRIDE_ENV_KEYS, ...PROVIDER_OVERRIDE_MARKER_ENV_KEYS].map((key) => [key, env[key]])
    ) as Partial<NodeJS.ProcessEnv>,
    repoConfigRequired: env[REPO_CONFIG_REQUIRED_ENV_KEY]
  };
  const sanitized = sanitizeProviderOverrideEnv(env);
  for (const key of [...PROVIDER_OVERRIDE_ENV_KEYS, ...PROVIDER_OVERRIDE_MARKER_ENV_KEYS]) {
    const value = sanitized[key];
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  if (sanitized[REPO_CONFIG_REQUIRED_ENV_KEY] === undefined) {
    delete env[REPO_CONFIG_REQUIRED_ENV_KEY];
  } else {
    env[REPO_CONFIG_REQUIRED_ENV_KEY] = sanitized[REPO_CONFIG_REQUIRED_ENV_KEY];
  }
  return () => {
    for (const key of [...PROVIDER_OVERRIDE_ENV_KEYS, ...PROVIDER_OVERRIDE_MARKER_ENV_KEYS]) {
      const value = previous.trackedOverrides[key];
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }
    if (previous.repoConfigRequired === undefined) {
      delete env[REPO_CONFIG_REQUIRED_ENV_KEY];
    } else {
      env[REPO_CONFIG_REQUIRED_ENV_KEY] = previous.repoConfigRequired;
    }
  };
}
