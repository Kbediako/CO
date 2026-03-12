export interface TelegramOversightPushState {
  last_sent_projection_hash: string | null;
  last_sent_at: string | null;
  last_event_seq: number | null;
  pending_projection_hash: string | null;
  pending_projection_observed_at: string | null;
}

export interface TelegramOversightBridgeState {
  next_update_id: number;
  updated_at: string;
  push: TelegramOversightPushState;
}

export type TelegramOversightStatePatch = Pick<TelegramOversightBridgeState, 'updated_at' | 'push'>;

export interface TelegramProjectionStateTransition {
  kind: 'skip' | 'pending' | 'send';
  statePatch: TelegramOversightStatePatch;
}

export function createDefaultTelegramOversightState(): TelegramOversightBridgeState {
  return {
    next_update_id: 0,
    updated_at: new Date(0).toISOString(),
    push: {
      last_sent_projection_hash: null,
      last_sent_at: null,
      last_event_seq: null,
      pending_projection_hash: null,
      pending_projection_observed_at: null
    }
  };
}

export function computeTelegramProjectionStateTransition(input: {
  pushState: TelegramOversightPushState;
  projectionHash: string | null;
  eventSeq?: number | null;
  nowMs: number;
  pushCooldownMs: number;
}): TelegramProjectionStateTransition {
  const nextEventSeq =
    typeof input.eventSeq === 'number' && Number.isFinite(input.eventSeq)
      ? Math.floor(input.eventSeq)
      : input.pushState.last_event_seq;
  const nowIso = new Date(input.nowMs).toISOString();

  if (!input.projectionHash || input.projectionHash === input.pushState.last_sent_projection_hash) {
    return {
      kind: 'skip',
      statePatch: {
        updated_at: nowIso,
        push: {
          ...input.pushState,
          last_event_seq: nextEventSeq,
          pending_projection_hash: null,
          pending_projection_observed_at: null
        }
      }
    };
  }

  const lastSentAtMs = input.pushState.last_sent_at ? Date.parse(input.pushState.last_sent_at) : Number.NaN;
  if (Number.isFinite(lastSentAtMs) && input.nowMs - lastSentAtMs < input.pushCooldownMs) {
    return {
      kind: 'pending',
      statePatch: {
        updated_at: nowIso,
        push: {
          ...input.pushState,
          last_event_seq: nextEventSeq,
          pending_projection_hash: input.projectionHash,
          pending_projection_observed_at:
            input.projectionHash === input.pushState.pending_projection_hash
              ? input.pushState.pending_projection_observed_at ?? nowIso
              : nowIso
        }
      }
    };
  }

  return {
    kind: 'send',
    statePatch: {
      updated_at: nowIso,
      push: {
        last_sent_projection_hash: input.projectionHash,
        last_sent_at: nowIso,
        last_event_seq: nextEventSeq,
        pending_projection_hash: null,
        pending_projection_observed_at: null
      }
    }
  };
}
