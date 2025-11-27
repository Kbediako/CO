import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PipelineDefinition } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { logger } from '../../logger.js';

export interface UserConfig {
  pipelines?: PipelineDefinition[];
  defaultPipeline?: string;
}

export async function loadUserConfig(env: EnvironmentPaths): Promise<UserConfig | null> {
  const configPath = join(env.repoRoot, 'codex.orchestrator.json');
  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as UserConfig;
    logger.info(`[codex-config] Loaded user config from ${configPath}`);
    if (parsed && Array.isArray(parsed.pipelines)) {
      return parsed;
    }
    return parsed ?? null;
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
