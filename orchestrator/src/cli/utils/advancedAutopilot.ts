export type AdvancedMode = 'auto' | 'on' | 'off';

export interface AdvancedAutopilotDecision {
  mode: AdvancedMode;
  source: 'target' | 'task' | 'env' | 'default';
  enabled: boolean;
  autoScout: boolean;
  reason: string;
}

export interface AutoScoutEvidence {
  generated_at: string;
  task_id: string;
  pipeline_id: string;
  target_id: string;
  target_description: string;
  execution_mode: 'mcp' | 'cloud';
  advanced_mode: AdvancedMode;
  advanced_mode_source: AdvancedAutopilotDecision['source'];
  advanced_mode_enabled: boolean;
  advanced_mode_reason: string;
  cloud: {
    requested: boolean;
    environment_id: string | null;
    branch: string | null;
  };
  rlm: {
    context_path_configured: boolean;
  };
}

const TRUTHY = new Set(['on', 'true', '1', 'yes', 'enabled', 'always']);
const FALSY = new Set(['off', 'false', '0', 'no', 'disabled', 'never']);
const NON_TRIVIAL_PIPELINES = new Set(['docs-review', 'implementation-gate']);

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseAdvancedMode(raw: string | null): AdvancedMode {
  if (!raw) {
    return 'auto';
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'auto') {
    return 'auto';
  }
  if (TRUTHY.has(normalized)) {
    return 'on';
  }
  if (FALSY.has(normalized)) {
    return 'off';
  }
  return 'auto';
}

function readAdvancedModeFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata) {
    return null;
  }
  return (
    readString(metadata.advancedMode) ??
    readString(metadata.advanced_mode) ??
    readString(metadata['advanced-mode'])
  );
}

function isNonTrivialPipeline(pipelineId: string): boolean {
  return NON_TRIVIAL_PIPELINES.has(pipelineId);
}

export function resolveAdvancedAutopilotDecision(params: {
  pipelineId: string;
  targetMetadata?: Record<string, unknown> | null;
  taskMetadata?: Record<string, unknown> | null;
  env?: NodeJS.ProcessEnv;
}): AdvancedAutopilotDecision {
  const targetRaw = readAdvancedModeFromMetadata(params.targetMetadata);
  const taskRaw = readAdvancedModeFromMetadata(params.taskMetadata);
  const envRaw = readString(params.env?.CODEX_ORCHESTRATOR_ADVANCED_MODE);

  const sourced =
    targetRaw !== null
      ? ({ raw: targetRaw, source: 'target' } as const)
      : taskRaw !== null
        ? ({ raw: taskRaw, source: 'task' } as const)
        : envRaw !== null
          ? ({ raw: envRaw, source: 'env' } as const)
          : ({ raw: null, source: 'default' } as const);

  const mode = parseAdvancedMode(sourced.raw);
  const nonTrivial = isNonTrivialPipeline(params.pipelineId);

  if (mode === 'on') {
    return {
      mode,
      source: sourced.source,
      enabled: true,
      autoScout: true,
      reason: `forced on via ${sourced.source}`
    };
  }

  if (mode === 'off') {
    return {
      mode,
      source: sourced.source,
      enabled: false,
      autoScout: false,
      reason: `disabled via ${sourced.source}`
    };
  }

  if (!nonTrivial) {
    return {
      mode,
      source: sourced.source,
      enabled: false,
      autoScout: false,
      reason: `auto disabled for pipeline '${params.pipelineId}'`
    };
  }

  return {
    mode,
    source: sourced.source,
    enabled: true,
    autoScout: true,
    reason: `auto enabled for non-trivial pipeline '${params.pipelineId}'`
  };
}

function readCloudString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildAutoScoutEvidence(params: {
  taskId: string;
  pipelineId: string;
  targetId: string;
  targetDescription: string;
  executionMode: 'mcp' | 'cloud';
  advanced: AdvancedAutopilotDecision;
  cloudEnvironmentId: string | null;
  cloudBranch: string | null;
  env?: NodeJS.ProcessEnv;
  generatedAt: string;
}): AutoScoutEvidence {
  return {
    generated_at: params.generatedAt,
    task_id: params.taskId,
    pipeline_id: params.pipelineId,
    target_id: params.targetId,
    target_description: params.targetDescription,
    execution_mode: params.executionMode,
    advanced_mode: params.advanced.mode,
    advanced_mode_source: params.advanced.source,
    advanced_mode_enabled: params.advanced.enabled,
    advanced_mode_reason: params.advanced.reason,
    cloud: {
      requested: params.executionMode === 'cloud',
      environment_id: params.cloudEnvironmentId,
      branch: readCloudString(params.cloudBranch)
    },
    rlm: {
      context_path_configured: Boolean(readCloudString(params.env?.RLM_CONTEXT_PATH))
    }
  };
}

