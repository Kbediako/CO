import process from 'node:process';

import { logger } from '../../logger.js';
import {
  loadDelegationConfigFiles,
  computeEffectiveDelegationConfig,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides,
  type DelegationConfigLayer
} from '../config/delegationConfig.js';
import { ControlServer } from '../control/controlServer.js';
import { RunEventStream, attachRunEventAdapter, type RunEventStreamEntry } from '../events/runEventStream.js';
import type { RunEventEmitter } from '../events/runEvents.js';
import type { RunPaths } from '../run/runPaths.js';
import type { PipelineDefinition } from '../types.js';

const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];

function collectDelegationEnvOverrides(env: NodeJS.ProcessEnv = process.env): DelegationConfigLayer[] {
  const layers: DelegationConfigLayer[] = [];
  for (const key of CONFIG_OVERRIDE_ENV_KEYS) {
    const raw = env[key];
    if (!raw) {
      continue;
    }
    const values = splitDelegationConfigOverrides(raw);
    for (const value of values) {
      try {
        const layer = parseDelegationConfigOverride(value, 'env');
        if (layer) {
          layers.push(layer);
        }
      } catch (error) {
        logger.warn(
          `Invalid delegation config override (env): ${(error as Error)?.message ?? String(error)}`
        );
      }
    }
  }
  return layers;
}

export interface StartOrchestratorControlPlaneLifecycleOptions {
  repoRoot: string;
  paths: RunPaths;
  taskId: string;
  runId: string;
  pipeline: Pick<PipelineDefinition, 'id' | 'title'>;
  emitter: RunEventEmitter;
}

export interface OrchestratorControlPlaneLifecycle {
  eventStream: RunEventStream;
  onEventEntry: (entry: RunEventStreamEntry) => void;
  close(): Promise<void>;
}

export async function startOrchestratorControlPlaneLifecycle(
  options: StartOrchestratorControlPlaneLifecycleOptions
): Promise<OrchestratorControlPlaneLifecycle> {
  const eventStream = await RunEventStream.create({
    paths: options.paths,
    taskId: options.taskId,
    runId: options.runId,
    pipelineId: options.pipeline.id,
    pipelineTitle: options.pipeline.title
  });

  let controlServer: ControlServer | null = null;
  let detachStream: (() => void) | null = null;
  const onEventEntry = (entry: RunEventStreamEntry) => {
    controlServer?.broadcast(entry);
  };

  const close = async (): Promise<void> => {
    if (detachStream) {
      try {
        detachStream();
      } catch (error) {
        logger.warn(`Failed to detach run event stream: ${(error as Error)?.message ?? String(error)}`);
      }
      detachStream = null;
    }
    if (controlServer) {
      try {
        await controlServer.close();
      } catch (error) {
        logger.warn(`Failed to close control server: ${(error as Error)?.message ?? String(error)}`);
      }
      controlServer = null;
    }
    try {
      await eventStream.close();
    } catch (error) {
      logger.warn(`Failed to close run event stream: ${(error as Error)?.message ?? String(error)}`);
    }
  };

  try {
    const configFiles = await loadDelegationConfigFiles({ repoRoot: options.repoRoot });
    const envOverrideLayers = collectDelegationEnvOverrides();
    const layers = [configFiles.global, configFiles.repo, ...envOverrideLayers].filter(Boolean) as DelegationConfigLayer[];
    const effectiveConfig = computeEffectiveDelegationConfig({
      repoRoot: options.repoRoot,
      layers
    });

    controlServer = effectiveConfig.ui.controlEnabled
      ? await ControlServer.start({
          paths: options.paths,
          config: effectiveConfig,
          eventStream,
          runId: options.runId
        })
      : null;

    const onStreamError = (error: Error, payload: { event: string }) => {
      logger.warn(`Failed to append run event ${payload.event}: ${error.message}`);
    };

    detachStream = attachRunEventAdapter(options.emitter, eventStream, onEventEntry, onStreamError);

    return {
      eventStream,
      onEventEntry,
      close
    };
  } catch (error) {
    await close();
    throw error;
  }
}
