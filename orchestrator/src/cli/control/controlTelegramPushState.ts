import { readFile } from 'node:fs/promises';

import { writeJsonAtomic } from '../utils/fs.js';

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

export interface TelegramProjectionStateTransition {
  kind: 'skip' | 'pending' | 'send';
  nextState: TelegramOversightBridgeState;
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

export async function readTelegramOversightState(path: string): Promise<TelegramOversightBridgeState> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TelegramOversightBridgeState>;
    const parsedPush = isRecord(parsed.push) ? parsed.push : null;
    const nextUpdateId =
      typeof parsed.next_update_id === 'number' && Number.isInteger(parsed.next_update_id) && parsed.next_update_id >= 0
        ? parsed.next_update_id
        : 0;
    return {
      next_update_id: nextUpdateId,
      updated_at:
        typeof parsed.updated_at === 'string' && parsed.updated_at.trim().length > 0
          ? parsed.updated_at
          : new Date(0).toISOString(),
      push: {
        last_sent_projection_hash: parsedPush ? readStringValue(parsedPush, 'last_sent_projection_hash') ?? null : null,
        last_sent_at: parsedPush ? readStringValue(parsedPush, 'last_sent_at') ?? null : null,
        last_event_seq:
          parsedPush && typeof parsedPush.last_event_seq === 'number' && Number.isInteger(parsedPush.last_event_seq)
            ? parsedPush.last_event_seq
            : null,
        pending_projection_hash: parsedPush ? readStringValue(parsedPush, 'pending_projection_hash') ?? null : null,
        pending_projection_observed_at:
          parsedPush ? readStringValue(parsedPush, 'pending_projection_observed_at') ?? null : null
      }
    };
  } catch {
    return createDefaultTelegramOversightState();
  }
}

export async function writeTelegramOversightState(
  path: string,
  state: TelegramOversightBridgeState
): Promise<void> {
  await writeJsonAtomic(path, state);
}

export function computeTelegramProjectionStateTransition(input: {
  state: TelegramOversightBridgeState;
  projectionHash: string | null;
  eventSeq?: number | null;
  nowMs: number;
  pushCooldownMs: number;
}): TelegramProjectionStateTransition {
  const nextEventSeq =
    typeof input.eventSeq === 'number' && Number.isFinite(input.eventSeq) ? Math.floor(input.eventSeq) : input.state.push.last_event_seq;
  const nowIso = new Date(input.nowMs).toISOString();

  if (!input.projectionHash || input.projectionHash === input.state.push.last_sent_projection_hash) {
    return {
      kind: 'skip',
      nextState: {
        ...input.state,
        updated_at: nowIso,
        push: {
          ...input.state.push,
          last_event_seq: nextEventSeq,
          pending_projection_hash: null,
          pending_projection_observed_at: null
        }
      }
    };
  }

  const lastSentAtMs = input.state.push.last_sent_at ? Date.parse(input.state.push.last_sent_at) : Number.NaN;
  if (Number.isFinite(lastSentAtMs) && input.nowMs - lastSentAtMs < input.pushCooldownMs) {
    return {
      kind: 'pending',
      nextState: {
        ...input.state,
        updated_at: nowIso,
        push: {
          ...input.state.push,
          last_event_seq: nextEventSeq,
          pending_projection_hash: input.projectionHash,
          pending_projection_observed_at:
            input.projectionHash === input.state.push.pending_projection_hash
              ? input.state.push.pending_projection_observed_at ?? nowIso
              : nowIso
        }
      }
    };
  }

  return {
    kind: 'send',
    nextState: {
      ...input.state,
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

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
