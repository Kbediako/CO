import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { ConfirmationStoreSnapshot } from './confirmations.js';
import type { QuestionRecord } from './questions.js';
import type { DelegationTokenRecord } from './delegationTokens.js';
import type { LinearAdvisoryState } from './linearWebhookController.js';
import type { ProviderIntakeState } from './providerIntakeState.js';
import {
  LINEAR_ADVISORY_STATE_FILE,
  PROVIDER_INTAKE_STATE_FILE
} from './controlPersistenceFiles.js';

export interface ControlServerSeeds {
  controlSeed: ControlState | null;
  confirmationsSeed: ConfirmationStoreSnapshot | null;
  questionsSeed: { questions?: QuestionRecord[] } | null;
  delegationSeed: { tokens?: DelegationTokenRecord[] } | null;
  linearAdvisorySeed: LinearAdvisoryState | null;
  providerIntakeSeed: ProviderIntakeState | null;
}

export async function readControlServerSeeds(paths: RunPaths): Promise<ControlServerSeeds> {
  return {
    controlSeed: await readJsonFile<ControlState>(paths.controlPath),
    confirmationsSeed: await readJsonFile<ConfirmationStoreSnapshot>(paths.confirmationsPath),
    questionsSeed: await readJsonFile<{ questions?: QuestionRecord[] }>(paths.questionsPath),
    delegationSeed: await readJsonFile<{ tokens?: DelegationTokenRecord[] }>(paths.delegationTokensPath),
    linearAdvisorySeed: await readJsonFile<LinearAdvisoryState>(
      join(paths.runDir, LINEAR_ADVISORY_STATE_FILE)
    ),
    providerIntakeSeed: await readJsonFile<ProviderIntakeState>(
      join(paths.runDir, PROVIDER_INTAKE_STATE_FILE)
    )
  };
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    logger.warn(`Failed to read JSON file ${path}: ${(error as Error)?.message ?? error}`);
    return null;
  }
}
