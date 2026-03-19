import { randomBytes } from 'node:crypto';

import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream } from '../events/runEventStream.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';
import { readControlServerSeeds } from './controlServerSeedLoading.js';
import { createControlServerSeededRuntimeAssembly } from './controlServerSeededRuntimeAssembly.js';

interface PrepareControlServerStartupInputsOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: Pick<RunEventStream, 'append'>;
  runId: string;
  sessionTtlMs: number;
}

export interface PreparedControlServerStartupInputs {
  requestContextShared: ControlRequestSharedContext;
  host: string;
  controlToken: string;
}

export async function prepareControlServerStartupInputs(
  options: PrepareControlServerStartupInputsOptions
): Promise<PreparedControlServerStartupInputs> {
  const controlToken = randomBytes(24).toString('hex');
  const {
    controlSeed,
    confirmationsSeed,
    questionsSeed,
    delegationSeed,
    linearAdvisorySeed
  } = await readControlServerSeeds(options.paths);

  const { requestContextShared } = createControlServerSeededRuntimeAssembly({
    runId: options.runId,
    token: controlToken,
    config: options.config,
    paths: options.paths,
    eventStream: options.eventStream,
    sessionTtlMs: options.sessionTtlMs,
    controlSeed,
    confirmationsSeed,
    questionsSeed,
    delegationSeed,
    linearAdvisorySeed
  });

  return {
    requestContextShared,
    host: options.config.ui.bindHost,
    controlToken
  };
}
