import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

import { writeJsonAtomic } from '../utils/fs.js';
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
  createControlRuntime,
  type ControlRuntime
} from './controlRuntime.js';
import {
  createControlEventTransport,
  type ControlEventTransport
} from './controlEventTransport.js';
import {
  normalizeLinearAdvisoryState,
  type LinearAdvisoryState
} from './linearWebhookController.js';
import type {
  ControlRequestPersist,
  ControlRequestSharedContext,
  ControlSessionTokens
} from './controlRequestContext.js';

export const LINEAR_ADVISORY_STATE_FILE = 'linear-advisory-state.json';

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
}

export interface ControlServerSeededRuntimeAssembly {
  controlStore: ControlStateStore;
  confirmationStore: ConfirmationStore;
  questionQueue: QuestionQueue;
  delegationTokens: DelegationTokenStore;
  sessionTokens: ControlSessionTokens;
  clients: Set<http.ServerResponse>;
  eventTransport: ControlEventTransport;
  persist: ControlRequestPersist;
  requestContextShared: ControlRequestSharedContext;
  linearAdvisoryState: LinearAdvisoryState;
  controlRuntime: ControlRuntime;
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
  const controlRuntime = createControlRuntime({
    controlStore,
    questionQueue,
    paths: options.paths,
    linearAdvisoryState
  });

  const clients = new Set<http.ServerResponse>();
  const eventTransport = createControlEventTransport({
    eventStream: options.eventStream,
    clients,
    runtime: controlRuntime
  });
  const linearAdvisoryStatePath = join(options.paths.runDir, LINEAR_ADVISORY_STATE_FILE);
  const persist = {
    control: async () => writeJsonAtomic(options.paths.controlPath, controlStore.snapshot()),
    confirmations: async () => writeJsonAtomic(options.paths.confirmationsPath, confirmationStore.snapshot()),
    questions: async () => writeJsonAtomic(options.paths.questionsPath, { questions: questionQueue.list() }),
    delegationTokens: async () =>
      writeJsonAtomic(options.paths.delegationTokensPath, { tokens: delegationTokens.list() }),
    linearAdvisory: async () => writeJsonAtomic(linearAdvisoryStatePath, linearAdvisoryState)
  } satisfies ControlRequestPersist;
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
    runtime: controlRuntime
  } satisfies ControlRequestSharedContext;

  return {
    controlStore,
    confirmationStore,
    questionQueue,
    delegationTokens,
    sessionTokens,
    clients,
    eventTransport,
    persist,
    requestContextShared,
    linearAdvisoryState,
    controlRuntime
  };
}
