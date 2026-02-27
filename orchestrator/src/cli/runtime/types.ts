import type { ExecutionMode } from '../../types.js';

export type RuntimeMode = 'cli' | 'appserver';

export type RuntimeModeSource = 'default' | 'config' | 'env' | 'flag' | 'manifest';

export type RuntimeProviderName = 'CliRuntimeProvider' | 'AppServerRuntimeProvider';

export interface RuntimeModeResolution {
  mode: RuntimeMode;
  source: RuntimeModeSource;
}

export interface RuntimeFallbackMetadata {
  occurred: boolean;
  code: string | null;
  reason: string | null;
  from_mode: RuntimeMode | null;
  to_mode: RuntimeMode | null;
  checked_at: string | null;
}

export interface RuntimeSelection {
  requested_mode: RuntimeMode;
  selected_mode: RuntimeMode;
  source: RuntimeModeSource;
  provider: RuntimeProviderName;
  env_overrides: NodeJS.ProcessEnv;
  runtime_session_id: string | null;
  fallback: RuntimeFallbackMetadata;
}

export interface RuntimeSelectionOptions {
  requestedMode: RuntimeMode;
  source: RuntimeModeSource;
  executionMode: ExecutionMode;
  repoRoot: string;
  env: NodeJS.ProcessEnv;
  runId: string;
  allowFallback?: boolean;
  now?: () => string;
}
