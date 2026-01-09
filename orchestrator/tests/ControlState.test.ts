import { describe, expect, it } from 'vitest';
import { ControlStateStore } from '../src/cli/control/controlState.js';

describe('ControlStateStore', () => {
  it('preserves feature toggles when actions update latest_action', () => {
    const store = new ControlStateStore({
      runId: 'run-1',
      featureToggles: { rlm: { policy: 'always' } }
    });

    store.updateAction({ action: 'pause', requestedBy: 'ui' });
    expect(store.snapshot().feature_toggles?.rlm?.policy).toBe('always');

    store.updateFeatureToggles({ rlm: { policy: 'off' } });
    expect(store.snapshot().latest_action?.action).toBe('pause');
    expect(store.snapshot().feature_toggles?.rlm?.policy).toBe('off');
  });
});
