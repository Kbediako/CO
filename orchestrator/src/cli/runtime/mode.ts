import type { RuntimeMode, RuntimeModeResolution } from './types.js';

const RUNTIME_MODES = new Set<RuntimeMode>(['cli', 'appserver']);
const DEFAULT_RUNTIME_MODE: RuntimeMode = 'cli';
const DEFAULT_RUNTIME_MODE_ENV_KEY = 'CODEX_ORCHESTRATOR_RUNTIME_MODE';

function normalizeRuntimeMode(value: string): RuntimeMode | null {
  const normalized = value.trim().toLowerCase();
  return RUNTIME_MODES.has(normalized as RuntimeMode) ? (normalized as RuntimeMode) : null;
}

function parseRuntimeModeFromSource(
  value: string,
  sourceLabel: string
): RuntimeMode {
  const parsed = normalizeRuntimeMode(value);
  if (!parsed) {
    throw new Error(
      `Invalid runtime mode "${value}" from ${sourceLabel}. Expected one of: cli, appserver.`
    );
  }
  return parsed;
}

export function parseRuntimeMode(value: string | null | undefined): RuntimeMode | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  return normalizeRuntimeMode(value);
}

export interface ResolveRuntimeModeOptions {
  flag?: RuntimeMode | string | null;
  env?: NodeJS.ProcessEnv;
  envKey?: string;
  configDefault?: RuntimeMode | string | null;
  manifestMode?: RuntimeMode | string | null;
  preferManifest?: boolean;
}

export function resolveRuntimeMode(options: ResolveRuntimeModeOptions = {}): RuntimeModeResolution {
  if (typeof options.flag === 'string' && options.flag.trim().length > 0) {
    return {
      mode: parseRuntimeModeFromSource(options.flag, 'CLI flag'),
      source: 'flag'
    };
  }

  const envKey = options.envKey ?? DEFAULT_RUNTIME_MODE_ENV_KEY;
  const envValue = options.env?.[envKey] ?? process.env[envKey];
  if (typeof envValue === 'string' && envValue.trim().length > 0) {
    return {
      mode: parseRuntimeModeFromSource(envValue, `env ${envKey}`),
      source: 'env'
    };
  }

  if (typeof options.configDefault === 'string' && options.configDefault.trim().length > 0) {
    return {
      mode: parseRuntimeModeFromSource(options.configDefault, 'config default'),
      source: 'config'
    };
  }

  if (options.preferManifest && typeof options.manifestMode === 'string' && options.manifestMode.trim().length > 0) {
    return {
      mode: parseRuntimeModeFromSource(options.manifestMode, 'manifest'),
      source: 'manifest'
    };
  }

  return {
    mode: DEFAULT_RUNTIME_MODE,
    source: 'default'
  };
}

export { DEFAULT_RUNTIME_MODE, DEFAULT_RUNTIME_MODE_ENV_KEY };
