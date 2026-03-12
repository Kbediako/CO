import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeJsonAtomic } from '../utils/fs.js';
import {
  createDefaultTelegramOversightState,
  type TelegramOversightBridgeState,
  type TelegramOversightStatePatch
} from './controlTelegramPushState.js';

const TELEGRAM_STATE_FILE = 'telegram-oversight-state.json';

export interface TelegramOversightBridgeStateStore {
  loadState(): Promise<TelegramOversightBridgeState>;
  saveState(state: TelegramOversightBridgeState): Promise<void>;
}

export function createTelegramOversightBridgeStateStore(runDir: string): TelegramOversightBridgeStateStore {
  const statePath = join(runDir, TELEGRAM_STATE_FILE);
  return {
    loadState: async () => readTelegramOversightState(statePath),
    saveState: async (state) => writeJsonAtomic(statePath, state)
  };
}

export function advanceTelegramOversightBridgeStateNextUpdateId(
  state: TelegramOversightBridgeState,
  nextUpdateId: number,
  observedAt: string
): TelegramOversightBridgeState {
  return {
    ...state,
    next_update_id: nextUpdateId,
    updated_at: pickLatestTimestamp(state.updated_at, observedAt)
  };
}

export function applyTelegramOversightBridgeStatePatch(
  state: TelegramOversightBridgeState,
  patch: TelegramOversightStatePatch
): TelegramOversightBridgeState {
  return {
    ...state,
    updated_at: pickLatestTimestamp(state.updated_at, patch.updated_at),
    push: patch.push
  };
}

async function readTelegramOversightState(path: string): Promise<TelegramOversightBridgeState> {
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

function pickLatestTimestamp(currentIso: string, candidateIso: string): string {
  const currentMs = Date.parse(currentIso);
  const candidateMs = Date.parse(candidateIso);
  if (!Number.isFinite(currentMs)) {
    return candidateIso;
  }
  if (!Number.isFinite(candidateMs)) {
    return currentIso;
  }
  return candidateMs >= currentMs ? candidateIso : currentIso;
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
