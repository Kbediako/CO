import {
  CONTROL_PLANE_RUN_REQUEST_SCHEMA,
  CONTROL_PLANE_RUN_REQUEST_VERSION,
  type RunRequestConstraints,
  type RunRequestStage,
  type RunRequestV2
} from '../../../packages/control-plane-schemas/src/index.js';
import type { PipelineDefinition, CliManifest } from '../cli/types.js';
import { logger } from '../logger.js';
import type { EnvironmentPaths } from '../cli/run/environment.js';
import type { TaskContext } from '../types.js';

const DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 30;
const DEFAULT_HEARTBEAT_TIMEOUT_SECONDS = 120;
const DEFAULT_RECOVERY_RETRIES = 3;
const DEFAULT_MAX_SUBSCRIBERS = 8;
const DEFAULT_BACKPRESSURE_MS = 250;
const DEFAULT_POLICY_VERSION = '2025-10-01';
const DEFAULT_METRIC_INTERVAL_SECONDS = 30;
const DEFAULT_REQUIRED_DIMENSIONS = ['instanceId', 'phase', 'status'];
const DEFAULT_TFGRPO_EPOCHS = 3;
const DEFAULT_TFGRPO_SAMPLE_SIZE = 100;
const DEFAULT_TFGRPO_TRAIN_TEMP = 0.7;
const DEFAULT_TFGRPO_EVAL_TEMP = 0.3;
const DEFAULT_TFGRPO_GROUP_SIZE = 2;

export interface BuildRunRequestOptions {
  runId: string;
  task: TaskContext;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  env: EnvironmentPaths;
  requestedBy?: {
    actorId: string;
    channel: string;
    name?: string;
  };
  now?: () => Date;
}

export function buildRunRequestV2(options: BuildRunRequestOptions): RunRequestV2 {
  const { runId, task, pipeline, manifest, env } = options;
  const now = options.now ?? (() => new Date());

  const capabilities =
    pipeline.tags && pipeline.tags.length > 0 ? [...pipeline.tags] : ['general'];

  const stages = pipeline.stages.map((stage): RunRequestStage => {
    if (stage.kind === 'command') {
      const entry: RunRequestStage = {
        id: stage.id,
        kind: 'command',
        title: stage.title,
        optional: Boolean(stage.allowFailure)
      };
      if (stage.session?.id) {
        entry.capabilities = [`session:${stage.session.id}`];
      }
      return entry;
    }
    return {
      id: stage.id,
      kind: 'subpipeline',
      title: stage.title,
      optional: Boolean(stage.optional)
    };
  });

  const fanOut = capabilities.map((capability) => ({
    capability,
    weight: 1,
    maxConcurrency: capability === 'general' ? 2 : 1
  }));
  const fanOutCapacity = computeFanOutCapacity(fanOut);
  const groupSize = resolveGroupSize(manifest);
  const scheduleBounds = resolveScheduleBounds({
    defaultMin: 1,
    defaultMax: Math.max(1, fanOut.length),
    fanOutCapacity,
    groupSize
  });

  const constraints: RunRequestConstraints = {
    privacyLevel: 'standard',
    policyVersion: DEFAULT_POLICY_VERSION
  };

  const metadata: Record<string, unknown> = {
    artifactRoot: manifest.artifact_root,
    runsRoot: env.runsRoot,
    outRoot: env.outRoot,
    pipelineId: pipeline.id,
    taskSlug: task.metadata?.slug ?? null
  };
  const tfgrpoMetadata = resolveTfgrpoMetadata(groupSize);
  if (tfgrpoMetadata) {
    metadata.tfgrpo = tfgrpoMetadata;
  }

  const taskPayload: RunRequestV2['task'] = {
    id: task.id,
    title: task.title,
    tags: capabilities,
    ...(task.metadata?.slug ? { slug: String(task.metadata.slug) } : {}),
    ...(typeof task.description === 'string' ? { description: task.description } : {}),
    ...(task.metadata ? { metadata: task.metadata } : {})
  };

  return {
    schema: CONTROL_PLANE_RUN_REQUEST_SCHEMA,
    version: CONTROL_PLANE_RUN_REQUEST_VERSION,
    requestId: runId,
    task: taskPayload,
    pipeline: {
      id: pipeline.id,
      version: '1.0.0',
      title: pipeline.title,
      capabilities,
      stages
    },
    schedule: {
      strategy: 'auto',
      minInstances: scheduleBounds.minInstances,
      maxInstances: scheduleBounds.maxInstances,
      fanOut,
      recovery: {
        heartbeatIntervalSeconds: DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
        missingHeartbeatTimeoutSeconds: DEFAULT_HEARTBEAT_TIMEOUT_SECONDS,
        maxRetries: DEFAULT_RECOVERY_RETRIES
      }
    },
    streaming: {
      handles: true,
      resumeSupported: true,
      observers: {
        maxSubscribers: DEFAULT_MAX_SUBSCRIBERS,
        defaultBackpressureMs: DEFAULT_BACKPRESSURE_MS
      }
    },
    constraints,
    metrics: {
      emitIntervalSeconds: DEFAULT_METRIC_INTERVAL_SECONDS,
      requiredDimensions: DEFAULT_REQUIRED_DIMENSIONS
    },
    requestedAt: now().toISOString(),
    requestedBy: options.requestedBy ?? {
      actorId: 'codex-cli',
      channel: 'cli',
      name: 'Codex CLI'
    },
    metadata
  };
}

function resolveTfgrpoMetadata(groupSize: number | null): Record<string, unknown> | null {
  const sampleSize = parsePositiveInteger(process.env.TFGRPO_SAMPLE_SIZE);
  const epochs = parsePositiveInteger(process.env.TFGRPO_EPOCHS);
  const trainTemp = parseFloatSafe(process.env.TFGRPO_TRAIN_TEMP);
  const evalTemp = parseFloatSafe(process.env.TFGRPO_EVAL_TEMP);
  const hasGroupSize = groupSize !== null;
  if (!hasGroupSize && sampleSize === null && epochs === null && trainTemp === null && evalTemp === null) {
    return null;
  }
  const metadata: Record<string, unknown> = {
    sampleSize: sampleSize ?? DEFAULT_TFGRPO_SAMPLE_SIZE,
    epochs: epochs ?? DEFAULT_TFGRPO_EPOCHS,
    temperature: {
      train: trainTemp ?? DEFAULT_TFGRPO_TRAIN_TEMP,
      eval: evalTemp ?? DEFAULT_TFGRPO_EVAL_TEMP
    }
  };
  if (hasGroupSize && groupSize !== null) {
    metadata.groupSize = groupSize;
  }
  return metadata;
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseFloatSafe(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function computeFanOutCapacity(
  fanOut: Array<{ maxConcurrency?: number | null }>
): number {
  return fanOut.reduce((total, entry) => {
    const capacity = entry?.maxConcurrency ?? 1;
    return total + Math.max(1, capacity);
  }, 0);
}

function resolveGroupSize(manifest: CliManifest, env: NodeJS.ProcessEnv = process.env): number | null {
  const envSize = parsePositiveInteger(env.TFGRPO_GROUP_SIZE);
  if (envSize !== null) {
    return envSize;
  }
  const manifestSize =
    typeof manifest.tfgrpo?.group_size === 'number' && Number.isFinite(manifest.tfgrpo.group_size)
      ? manifest.tfgrpo.group_size
      : null;
  if (manifestSize !== null && manifestSize > 0) {
    return manifestSize;
  }
  if (isFeatureEnabled(env.FEATURE_TFGRPO_GROUP)) {
    return DEFAULT_TFGRPO_GROUP_SIZE;
  }
  return null;
}

function resolveScheduleBounds(params: {
  defaultMin: number;
  defaultMax: number;
  fanOutCapacity: number;
  groupSize: number | null;
}): { minInstances: number; maxInstances: number } {
  if (params.groupSize === null) {
    const maxInstances = Math.min(params.defaultMax, params.fanOutCapacity);
    return {
      minInstances: params.defaultMin,
      maxInstances: Math.max(params.defaultMin, maxInstances)
    };
  }
  if (params.groupSize < 2) {
    logGroupGuard(
      `TF-GRPO groupSize ${params.groupSize} violates guardrail (must be ≥ 2). ` +
        'Set TFGRPO_GROUP_SIZE>=2 or disable FEATURE_TFGRPO_GROUP.'
    );
    throw new Error('TF-GRPO groupSize guardrail violated (expected ≥ 2).');
  }
  if (params.groupSize > params.fanOutCapacity) {
    logGroupGuard(
      `TF-GRPO groupSize ${params.groupSize} exceeds available fan-out capacity (${params.fanOutCapacity}). ` +
        'Increase pipeline fan-out or lower TFGRPO_GROUP_SIZE.'
    );
    throw new Error('TF-GRPO groupSize exceeds available scheduling capacity.');
  }
  const cappedMax = Math.min(params.fanOutCapacity, params.groupSize);
  return {
    minInstances: params.groupSize,
    maxInstances: cappedMax
  };
}

function isFeatureEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'on', 'yes'].includes(normalized);
}

function logGroupGuard(message: string): void {
  logger.error(`[control-plane.guard] ${message}`);
}
