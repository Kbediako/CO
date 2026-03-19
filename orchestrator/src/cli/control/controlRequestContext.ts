import http from 'node:http';

import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ConfirmationStore } from './confirmations.js';
import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import type { ControlEventTransport } from './controlEventTransport.js';
import type { ControlRuntime, ControlRuntimeSnapshot } from './controlRuntime.js';
import type { ControlStateStore } from './controlState.js';
import type { DelegationTokenStore } from './delegationTokens.js';
import type { LinearAdvisoryState } from './linearWebhookController.js';
import type {
  ObservabilityPresenterContext
} from './observabilitySurface.js';
import type { QuestionQueue } from './questions.js';
import type { SelectedRunPresenterContext } from './selectedRunPresenter.js';

export interface ControlRequestPersist {
  control(): Promise<void>;
  confirmations(): Promise<void>;
  questions(): Promise<void>;
  delegationTokens(): Promise<void>;
  linearAdvisory(): Promise<void>;
}

export interface ControlSessionTokens {
  issue(): { token: string; expiresAt: string };
  validate(token: string): boolean;
}

export interface ControlRequestSharedContext {
  token: string;
  controlStore: ControlStateStore;
  confirmationStore: ConfirmationStore;
  questionQueue: QuestionQueue;
  delegationTokens: DelegationTokenStore;
  sessionTokens: ControlSessionTokens;
  config: EffectiveDelegationConfig;
  persist: ControlRequestPersist;
  clients: Set<http.ServerResponse>;
  eventTransport: ControlEventTransport;
  paths: RunPaths;
  linearAdvisoryState: LinearAdvisoryState;
  runtime: ControlRuntime;
}

export interface ControlRequestContext extends ControlRequestSharedContext {
  req: http.IncomingMessage | null;
  res: http.ServerResponse | null;
  expiryLifecycle: ControlExpiryLifecycle | null;
}

export type ControlPresenterContext = SelectedRunPresenterContext & ObservabilityPresenterContext;

export interface ControlPresenterRuntimeContext {
  runtimeSnapshot: ControlRuntimeSnapshot;
  presenterContext: ControlPresenterContext;
}

export function buildControlRequestContext(
  input: ControlRequestSharedContext & {
    req: http.IncomingMessage | null;
    res: http.ServerResponse | null;
    expiryLifecycle: ControlExpiryLifecycle | null;
  }
): ControlRequestContext {
  return {
    req: input.req,
    res: input.res,
    token: input.token,
    controlStore: input.controlStore,
    confirmationStore: input.confirmationStore,
    questionQueue: input.questionQueue,
    delegationTokens: input.delegationTokens,
    sessionTokens: input.sessionTokens,
    config: input.config,
    persist: input.persist,
    clients: input.clients,
    eventTransport: input.eventTransport,
    paths: input.paths,
    linearAdvisoryState: input.linearAdvisoryState,
    runtime: input.runtime,
    expiryLifecycle: input.expiryLifecycle
  };
}

export function buildControlInternalContext(
  input: ControlRequestSharedContext & {
    expiryLifecycle: ControlExpiryLifecycle | null;
  }
): ControlRequestContext {
  return buildControlRequestContext({
    ...input,
    req: null,
    res: null,
    expiryLifecycle: input.expiryLifecycle
  });
}

export function buildControlPresenterRuntimeContext(
  input: Pick<ControlRequestContext, 'controlStore' | 'paths' | 'runtime'>
): ControlPresenterRuntimeContext {
  const runtimeSnapshot = input.runtime.snapshot();
  return {
    runtimeSnapshot,
    presenterContext: {
      controlStore: input.controlStore,
      paths: input.paths,
      readSelectedRunSnapshot: () => runtimeSnapshot.readSelectedRunSnapshot(),
      readCompatibilityProjection: () => runtimeSnapshot.readCompatibilityProjection()
    }
  };
}
