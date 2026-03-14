import type { CliManifest } from '../types.js';
import type { RuntimeMode, RuntimeSelection } from '../runtime/types.js';
import { isoTimestamp } from '../utils/time.js';

export function applyRequestedRuntimeModeToManifest(
  manifest: CliManifest,
  mode: RuntimeMode,
  isoTimestampImpl: typeof isoTimestamp = isoTimestamp
): void {
  manifest.runtime_mode_requested = mode;
  manifest.runtime_mode = mode;
  manifest.runtime_provider = mode === 'appserver' ? 'AppServerRuntimeProvider' : 'CliRuntimeProvider';
  manifest.runtime_fallback = {
    occurred: false,
    code: null,
    reason: null,
    from_mode: null,
    to_mode: null,
    checked_at: isoTimestampImpl()
  };
}

export function applyRuntimeSelectionToManifest(manifest: CliManifest, selection: RuntimeSelection): void {
  manifest.runtime_mode_requested = selection.requested_mode;
  manifest.runtime_mode = selection.selected_mode;
  manifest.runtime_provider = selection.provider;
  manifest.runtime_fallback = selection.fallback;
}
