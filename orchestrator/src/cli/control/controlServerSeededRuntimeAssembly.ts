import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeJsonAtomic } from '../utils/fs.js';
import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream } from '../events/runEventStream.js';
import {
  ControlStateStore,
  type ControlState
} from './controlState.js';
import {
  ConfirmationStore,
  type ConfirmationStoreSnapshot
} from './confirmations.js';
import { QuestionQueue, type QuestionRecord } from './questions.js';
import {
  DelegationTokenStore,
  type DelegationTokenRecord
} from './delegationTokens.js';
import {
  createControlRuntime
} from './controlRuntime.js';
import {
  createControlEventTransport
} from './controlEventTransport.js';
import {
  markLinearAdvisoryStateStaleFromProviderIntake,
  normalizeLinearAdvisoryState,
  type LinearAdvisoryState
} from './linearWebhookController.js';
import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';
import {
  clearProviderIntakeAuthority,
  isRecordLike,
  markProviderIntakeAuthorityUnavailable,
  normalizeProviderIntakeState,
  type ProviderIntakeState
} from './providerIntakeState.js';
import type { ProviderWorkflowConfigStore } from './providerWorkflowConfigStore.js';
import {
  LINEAR_ADVISORY_STATE_FILE,
  PROVIDER_INTAKE_STATE_FILE
} from './controlPersistenceFiles.js';
import type {
  ControlRequestPersist,
  ControlRequestSharedContext,
  ControlSessionTokens
} from './controlRequestContext.js';

interface ControlServerSeededRuntimeAssemblyOptions {
  runId: string;
  token: string;
  config: EffectiveDelegationConfig;
  paths: RunPaths;
  eventStream?: Pick<RunEventStream, 'append'>;
  sessionTtlMs: number;
  controlSeed: ControlState | null;
  confirmationsSeed: ConfirmationStoreSnapshot | null;
  questionsSeed: { questions?: QuestionRecord[] } | null;
  delegationSeed: { tokens?: DelegationTokenRecord[] } | null;
  linearAdvisorySeed: LinearAdvisoryState | null;
  providerIntakeSeed: ProviderIntakeState | null;
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore;
  createProviderIssueHandoff?: ((input: {
    providerIntakeState: ProviderIntakeState;
    persistProviderIntake: () => Promise<void>;
    publishRuntime: (source: string) => void;
    readFeatureToggles: () => ControlState['feature_toggles'];
  }) => ProviderIssueHandoffService) | null;
}

export interface ControlServerSeededRuntimeAssembly {
  requestContextShared: ControlRequestSharedContext;
}

class SessionTokenStore implements ControlSessionTokens {
  private readonly ttlMs: number;
  private readonly tokens = new Map<string, number>();

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  issue(): { token: string; expiresAt: string } {
    this.prune();
    const token = randomBytes(24).toString('hex');
    const expiresAt = Date.now() + this.ttlMs;
    this.tokens.set(token, expiresAt);
    return { token, expiresAt: new Date(expiresAt).toISOString() };
  }

  validate(token: string): boolean {
    this.prune();
    const expiresAt = this.tokens.get(token);
    if (!expiresAt) {
      return false;
    }
    if (expiresAt <= Date.now()) {
      this.tokens.delete(token);
      return false;
    }
    return true;
  }

  private prune(): void {
    const now = Date.now();
    for (const [token, expiresAt] of this.tokens.entries()) {
      if (expiresAt <= now) {
        this.tokens.delete(token);
      }
    }
  }
}

export function createControlServerSeededRuntimeAssembly(
  options: ControlServerSeededRuntimeAssemblyOptions
): ControlServerSeededRuntimeAssembly {
  const controlStore = new ControlStateStore({
    runId: options.runId,
    controlSeq: options.controlSeed?.control_seq ?? 0,
    latestAction: options.controlSeed?.latest_action ?? null,
    featureToggles: options.controlSeed?.feature_toggles ?? null,
    transportMutation: options.controlSeed?.transport_mutation ?? null
  });
  const defaultToggles = options.controlSeed?.feature_toggles ?? {};
  if (!('rlm' in defaultToggles)) {
    controlStore.updateFeatureToggles({ rlm: { policy: options.config.rlm.policy } });
  }

  const confirmationStore = new ConfirmationStore({
    runId: options.runId,
    expiresInMs: options.config.confirm.expiresInMs,
    maxPending: options.config.confirm.maxPending,
    seed: {
      pending: options.confirmationsSeed?.pending ?? [],
      issued: options.confirmationsSeed?.issued ?? [],
      consumed_nonce_ids: options.confirmationsSeed?.consumed_nonce_ids ?? []
    }
  });

  const questionQueue = new QuestionQueue({ seed: options.questionsSeed?.questions ?? [] });
  const delegationTokens = new DelegationTokenStore({ seed: options.delegationSeed?.tokens ?? [] });
  const sessionTokens = new SessionTokenStore(options.sessionTtlMs);
  const linearAdvisoryState = normalizeLinearAdvisoryState(options.linearAdvisorySeed);
  const providerIntakeState = normalizeProviderIntakeState(options.providerIntakeSeed);
  let persistedProviderIntakeState = options.providerIntakeSeed
    ? cloneProviderIntakeState(providerIntakeState)
    : null;
  let linearAdvisoryStaleWritePending = markLinearAdvisoryStateStaleFromProviderIntake(
    linearAdvisoryState,
    providerIntakeState
  );
  let providerIssueHandoff: ProviderIssueHandoffService | null = null;
  const controlRuntime = createControlRuntime({
    controlStore,
    questionQueue,
    paths: options.paths,
    linearAdvisoryState,
    providerIntakeState,
    readPersistedProviderIntakeState: () =>
      persistedProviderIntakeState ? cloneProviderIntakeState(persistedProviderIntakeState) : null,
    providerWorkflowConfigStore: options.providerWorkflowConfigStore,
    readProviderIssueHandoff: () => providerIssueHandoff
  });

  const clients = new Set<http.ServerResponse>();
  const eventTransport = createControlEventTransport({
    eventStream: options.eventStream,
    clients,
    runtime: controlRuntime
  });
  const linearAdvisoryStatePath = join(options.paths.runDir, LINEAR_ADVISORY_STATE_FILE);
  const providerIntakeStatePath = join(options.paths.runDir, PROVIDER_INTAKE_STATE_FILE);
  let providerIntakePersistChain = Promise.resolve();
  const queueProviderIntakePersist = async <T>(operation: () => Promise<T>): Promise<T> => {
    const nextOperation = providerIntakePersistChain.then(operation, operation);
    providerIntakePersistChain = nextOperation.then(
      () => undefined,
      () => undefined
    );
    return await nextOperation;
  };
  const readPersistedProviderIntakeState = async (): Promise<ProviderIntakeState | null> => {
    try {
      return normalizeProviderIntakeState(
        JSON.parse(await readFile(providerIntakeStatePath, 'utf8')) as ProviderIntakeState
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  };
  const persist = {
    control: async () => writeJsonAtomic(options.paths.controlPath, controlStore.snapshot()),
    confirmations: async () => writeJsonAtomic(options.paths.confirmationsPath, confirmationStore.snapshot()),
    questions: async () => writeJsonAtomic(options.paths.questionsPath, { questions: questionQueue.list() }),
    delegationTokens: async () =>
      writeJsonAtomic(options.paths.delegationTokensPath, { tokens: delegationTokens.list() }),
    linearAdvisory: async () => {
      await writeJsonAtomic(linearAdvisoryStatePath, linearAdvisoryState);
      linearAdvisoryStaleWritePending = false;
    },
    providerIntake: async () =>
      await queueProviderIntakePersist(async () => {
        if (shouldTrustProviderIntakePersist(providerIntakeState, persistedProviderIntakeState)) {
          clearProviderIntakeAuthority(providerIntakeState);
        } else {
          markProviderIntakeAuthorityUnavailable(providerIntakeState);
        }
        await writeJsonAtomic(providerIntakeStatePath, providerIntakeState);
        persistedProviderIntakeState = cloneProviderIntakeState(providerIntakeState);
        const linearAdvisoryMarkedStale = markLinearAdvisoryStateStaleFromProviderIntake(
          linearAdvisoryState,
          providerIntakeState
        );
        if (linearAdvisoryStaleWritePending || linearAdvisoryMarkedStale) {
          await writeJsonAtomic(linearAdvisoryStatePath, linearAdvisoryState);
          linearAdvisoryStaleWritePending = false;
          controlRuntime.publish({ source: 'linear-advisory.stale-source' });
        }
      }),
    providerIntakePolling: async (polling, updatedAt) =>
      await queueProviderIntakePersist(async () => {
        const persistedState = persistedProviderIntakeState
          ? cloneProviderIntakeState(persistedProviderIntakeState)
          : await readPersistedProviderIntakeState();
        const nextState = persistedState ?? normalizeProviderIntakeState(null);
        if (!persistedState) {
          markProviderIntakeAuthorityUnavailable(nextState);
        }
        const nextPolling = isRecordLike(polling) ? { ...polling } : null;
        nextState.polling = nextPolling;
        const nextPollingUpdatedAt =
          typeof nextPolling?.updated_at === 'string' && nextPolling.updated_at.trim().length > 0
            ? nextPolling.updated_at
            : isoTimestamp();
        const nextStateUpdatedAt =
          typeof updatedAt === 'string' && updatedAt.trim().length > 0 ? updatedAt : nextPollingUpdatedAt;
        nextState.updated_at = pickLatestTimestamp(nextState.updated_at, nextStateUpdatedAt);
        await writeJsonAtomic(providerIntakeStatePath, nextState);
        persistedProviderIntakeState = cloneProviderIntakeState(nextState);
        const linearAdvisoryMarkedStale = markLinearAdvisoryStateStaleFromProviderIntake(
          linearAdvisoryState,
          nextState
        );
        if (linearAdvisoryStaleWritePending || linearAdvisoryMarkedStale) {
          await writeJsonAtomic(linearAdvisoryStatePath, linearAdvisoryState);
          linearAdvisoryStaleWritePending = false;
          controlRuntime.publish({ source: 'linear-advisory.stale-source' });
        }
      })
  } satisfies ControlRequestPersist;
  providerIssueHandoff =
    options.createProviderIssueHandoff?.({
      providerIntakeState,
      persistProviderIntake: persist.providerIntake,
      publishRuntime: (source) => controlRuntime.publish({ source }),
      readFeatureToggles: () => controlStore.snapshot().feature_toggles
    }) ?? null;
  const requestContextShared = {
    token: options.token,
    controlStore,
    confirmationStore,
    questionQueue,
    delegationTokens,
    sessionTokens,
    config: options.config,
    persist,
    clients,
    eventTransport,
    paths: options.paths,
    linearAdvisoryState,
    providerIntakeState,
    readPersistedProviderIntakeState: () =>
      persistedProviderIntakeState ? cloneProviderIntakeState(persistedProviderIntakeState) : null,
    providerIssueHandoff,
    runtime: controlRuntime
  } satisfies ControlRequestSharedContext;

  return {
    requestContextShared
  };
}

function shouldTrustProviderIntakePersist(
  nextState: ProviderIntakeState,
  persistedState: ProviderIntakeState | null
): boolean {
  if (
    nextState.claims.length > 0 ||
    nextState.latest_provider_key !== null ||
    nextState.latest_reason !== null
  ) {
    return true;
  }
  return persistedState !== null && persistedState.authority?.status !== 'unavailable';
}

function cloneProviderIntakeState(state: ProviderIntakeState): ProviderIntakeState {
  return normalizeProviderIntakeState(
    JSON.parse(JSON.stringify(state)) as ProviderIntakeState
  );
}

function pickLatestTimestamp(currentIso: string | null | undefined, candidateIso: string): string {
  const currentMs = Date.parse(currentIso ?? '');
  const candidateMs = Date.parse(candidateIso);
  if (!Number.isFinite(currentMs)) {
    return candidateIso;
  }
  if (!Number.isFinite(candidateMs)) {
    return currentIso ?? candidateIso;
  }
  return candidateMs >= currentMs ? candidateIso : currentIso ?? candidateIso;
}
