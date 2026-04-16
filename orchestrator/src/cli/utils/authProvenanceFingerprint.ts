import { createHmac } from 'node:crypto';
import process from 'node:process';

export const AUTH_PROVENANCE_FINGERPRINT_KEY_ENV_KEYS = [
  'CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY',
  'CODEX_ORCHESTRATOR_AUTH_PROVENANCE_KEY'
] as const;

function normalizeFingerprintValue(value: unknown): string | null {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveAuthProvenanceFingerprintKey(
  env: NodeJS.ProcessEnv | undefined = process.env
): string | null {
  for (const key of AUTH_PROVENANCE_FINGERPRINT_KEY_ENV_KEYS) {
    const value = normalizeFingerprintValue(env?.[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

export function fingerprintAuthProvenanceValue(
  value: unknown,
  env: NodeJS.ProcessEnv | undefined = process.env
): string | null {
  const raw = normalizeFingerprintValue(value);
  const key = resolveAuthProvenanceFingerprintKey(env);
  if (!raw || !key) {
    return null;
  }
  return `hmac-sha256:${createHmac('sha256', key).update(raw).digest('hex').slice(0, 16)}`;
}
