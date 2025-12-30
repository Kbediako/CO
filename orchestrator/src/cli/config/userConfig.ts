import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PipelineDefinition, PipelineStage } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { logger } from '../../logger.js';

export interface UserConfig {
  pipelines?: PipelineDefinition[];
  defaultPipeline?: string;
}

type StageSetRef = { kind: 'stage-set'; ref: string };
type ConfigStage = PipelineStage | StageSetRef;
type ConfigPipelineDefinition = Omit<PipelineDefinition, 'stages'> & { stages: ConfigStage[] };

interface ConfigFile {
  pipelines?: ConfigPipelineDefinition[];
  defaultPipeline?: string;
  stageSets?: Record<string, PipelineStage[]>;
}

export async function loadUserConfig(env: EnvironmentPaths): Promise<UserConfig | null> {
  const configPath = join(env.repoRoot, 'codex.orchestrator.json');
  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as ConfigFile;
    logger.info(`[codex-config] Loaded user config from ${configPath}`);
    return normalizeUserConfig(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.warn(`[codex-config] Missing codex.orchestrator.json at ${configPath}`);
      return null;
    }
    throw error;
  }
}

export function findPipeline(config: UserConfig | null, id: string): PipelineDefinition | null {
  if (!config?.pipelines) {
    return null;
  }
  return config.pipelines.find((pipeline) => pipeline.id === id) ?? null;
}

function normalizeUserConfig(config: ConfigFile | null): UserConfig | null {
  if (!config) {
    return null;
  }
  const stageSets = normalizeStageSets(config.stageSets);
  const pipelines = Array.isArray(config.pipelines)
    ? config.pipelines.map((pipeline) => expandPipelineStages(pipeline, stageSets))
    : config.pipelines;
  return { pipelines, defaultPipeline: config.defaultPipeline };
}

function normalizeStageSets(
  stageSets: ConfigFile['stageSets']
): Record<string, PipelineStage[]> {
  if (!stageSets) {
    return {};
  }
  if (typeof stageSets !== 'object' || Array.isArray(stageSets)) {
    throw new Error('codex.orchestrator.json stageSets must be an object of stage arrays.');
  }
  const normalized: Record<string, PipelineStage[]> = {};
  for (const [key, value] of Object.entries(stageSets)) {
    if (!Array.isArray(value)) {
      throw new Error(`Stage set "${key}" must be an array.`);
    }
    if (value.some((stage) => isStageSetRef(stage as ConfigStage))) {
      throw new Error(`Stage set "${key}" cannot include stage-set references.`);
    }
    normalized[key] = value as PipelineStage[];
  }
  return normalized;
}

function expandPipelineStages(
  pipeline: ConfigPipelineDefinition,
  stageSets: Record<string, PipelineStage[]>
): PipelineDefinition {
  const expanded: PipelineStage[] = [];
  for (const stage of pipeline.stages ?? []) {
    if (isStageSetRef(stage)) {
      const sharedStages = stageSets[stage.ref];
      if (!sharedStages) {
        throw new Error(`Pipeline "${pipeline.id}" references unknown stage set "${stage.ref}".`);
      }
      expanded.push(...sharedStages);
    } else {
      expanded.push(stage);
    }
  }
  return { ...pipeline, stages: expanded };
}

function isStageSetRef(stage: ConfigStage): stage is StageSetRef {
  return stage.kind === 'stage-set';
}
