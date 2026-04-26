export type RuntimeFallbackPolicy = 'auto' | 'strict';
export type RuntimeFallbackPolicySource = 'default' | 'env' | 'override';

export interface RuntimeFallbackPolicyResolution {
  policy: RuntimeFallbackPolicy;
  source: RuntimeFallbackPolicySource;
  raw_value: string | null;
  env_key: string | null;
}

export interface RuntimeFallbackPolicyOptions {
  env?: NodeJS.ProcessEnv;
  envKey: string;
  override?: RuntimeFallbackPolicy | boolean;
  defaultPolicy?: RuntimeFallbackPolicy;
}

const AUTO_VALUES = new Set(['1', 'true', 'yes', 'on', 'allow', 'allowed', 'enabled', 'auto']);
const STRICT_VALUES = new Set(['0', 'false', 'off', 'deny', 'denied', 'disabled', 'never', 'strict']);

function normalizePolicyValue(value: string, envKey: string): RuntimeFallbackPolicy {
  const normalized = value.trim().toLowerCase();
  if (AUTO_VALUES.has(normalized)) {
    return 'auto';
  }
  if (STRICT_VALUES.has(normalized)) {
    return 'strict';
  }
  throw new Error(
    `Invalid fallback policy "${value}" from ${envKey}; expected auto or strict ` +
      `(compatibility aliases: allow/deny, true/false, 1/0).`
  );
}

export function resolveRuntimeFallbackPolicy(
  options: RuntimeFallbackPolicyOptions
): RuntimeFallbackPolicyResolution {
  if (typeof options.override === 'string') {
    return {
      policy: options.override,
      source: 'override',
      raw_value: options.override,
      env_key: null
    };
  }

  if (typeof options.override === 'boolean') {
    return {
      policy: options.override ? 'auto' : 'strict',
      source: 'override',
      raw_value: String(options.override),
      env_key: null
    };
  }

  const raw = options.env?.[options.envKey];
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return {
      policy: normalizePolicyValue(raw, options.envKey),
      source: 'env',
      raw_value: raw,
      env_key: options.envKey
    };
  }

  return {
    policy: options.defaultPolicy ?? 'auto',
    source: 'default',
    raw_value: null,
    env_key: null
  };
}

export function describeFallbackTarget(value: string | null): string {
  return value && value.trim().length > 0 ? value : '<none>';
}
