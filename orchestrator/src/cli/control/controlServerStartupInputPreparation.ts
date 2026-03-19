import { randomBytes } from 'node:crypto';

import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream } from '../events/runEventStream.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';
import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';
import type { ProviderIntakeState } from './providerIntakeState.js';
import { readControlServerSeeds } from './controlServerSeedLoading.js';
import { createControlServerSeededRuntimeAssembly } from './controlServerSeededRuntimeAssembly.js';

interface PrepareControlServerStartupInputsOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: Pick<RunEventStream, 'append'>;
  runId: string;
  sessionTtlMs: number;
  createProviderIssueHandoff?: ((input: {
    providerIntakeState: ProviderIntakeState;
    persistProviderIntake: () => Promise<void>;
  }) => ProviderIssueHandoffService) | null;
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
    linearAdvisorySeed,
    providerIntakeSeed
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
    linearAdvisorySeed,
    providerIntakeSeed,
    createProviderIssueHandoff: options.createProviderIssueHandoff
  });

  return {
    requestContextShared,
    host: options.config.ui.bindHost,
    controlToken
  };
}
