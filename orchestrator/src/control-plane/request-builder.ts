import {
  CONTROL_PLANE_RUN_REQUEST_SCHEMA,
  CONTROL_PLANE_RUN_REQUEST_VERSION,
  type RunRequestConstraints,
  type RunRequestStage,
  type RunRequestV2
} from '../../../packages/control-plane-schemas/src/index.js';
import type { PipelineDefinition, CliManifest } from '../cli/types.js';
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

  const minInstances = 1;
  const maxInstances = Math.max(1, fanOut.length);

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
  const tfgrpoMetadata = resolveTfgrpoMetadata();
  if (tfgrpoMetadata) {
    metadata.tfgrpo = tfgrpoMetadata;
  }

  return {
    schema: CONTROL_PLANE_RUN_REQUEST_SCHEMA,
    version: CONTROL_PLANE_RUN_REQUEST_VERSION,
    requestId: runId,
    task: {
      id: task.id,
      slug: task.metadata?.slug ? String(task.metadata.slug) : undefined,
      title: task.title,
      description: task.description,
      metadata: task.metadata,
      tags: capabilities
    },
    pipeline: {
      id: pipeline.id,
      version: '1.0.0',
      title: pipeline.title,
      capabilities,
      stages
    },
    schedule: {
      strategy: 'auto',
      minInstances,
      maxInstances,
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

function resolveTfgrpoMetadata(): Record<string, unknown> | null {
  const sampleSize = parsePositiveInteger(process.env.TFGRPO_SAMPLE_SIZE);
  const epochs = parsePositiveInteger(process.env.TFGRPO_EPOCHS);
  const trainTemp = parseFloatSafe(process.env.TFGRPO_TRAIN_TEMP);
  const evalTemp = parseFloatSafe(process.env.TFGRPO_EVAL_TEMP);
  if (sampleSize === null && epochs === null && trainTemp === null && evalTemp === null) {
    return null;
  }
  return {
    sampleSize: sampleSize ?? DEFAULT_TFGRPO_SAMPLE_SIZE,
    epochs: epochs ?? DEFAULT_TFGRPO_EPOCHS,
    temperature: {
      train: trainTemp ?? DEFAULT_TFGRPO_TRAIN_TEMP,
      eval: evalTemp ?? DEFAULT_TFGRPO_EVAL_TEMP
    }
  };
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
