export interface ControlAction {
  request_id?: string | null;
  requested_by: string;
  requested_at: string;
  action: 'pause' | 'resume' | 'cancel';
}

export interface ControlState {
  run_id: string;
  control_seq: number;
  latest_action?: ControlAction | null;
  feature_toggles?: Record<string, unknown> | null;
}

export interface ControlStateStoreOptions {
  runId: string;
  controlSeq?: number;
  latestAction?: ControlAction | null;
  featureToggles?: Record<string, unknown> | null;
  now?: () => string;
}

export class ControlStateStore {
  private readonly now: () => string;
  private state: ControlState;

  constructor(options: ControlStateStoreOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.state = {
      run_id: options.runId,
      control_seq: options.controlSeq ?? 0,
      latest_action: options.latestAction ?? null,
      feature_toggles: options.featureToggles ?? null
    };
  }

  updateAction(input: { action: ControlAction['action']; requestedBy: string; requestId?: string | null }): void {
    this.state.control_seq += 1;
    this.state.latest_action = {
      request_id: input.requestId ?? null,
      requested_by: input.requestedBy,
      requested_at: this.now(),
      action: input.action
    };
  }

  updateFeatureToggles(toggles: Record<string, unknown>): void {
    const current = this.state.feature_toggles ?? {};
    this.state.feature_toggles = mergeObjects(current, toggles);
  }

  snapshot(): ControlState {
    return structuredClone(this.state);
  }
}

function mergeObjects(base: Record<string, unknown>, update: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(update)) {
    if (Array.isArray(value)) {
      merged[key] = [...value];
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const current = (merged[key] as Record<string, unknown>) ?? {};
      merged[key] = mergeObjects(current, value as Record<string, unknown>);
      continue;
    }
    merged[key] = value;
  }
  return merged;
}
