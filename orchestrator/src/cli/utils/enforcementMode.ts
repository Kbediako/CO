export type EnforcementMode = 'shadow' | 'enforce';

const TRUTHY_ENFORCE_VALUES = ['1', 'true', 'enforce', 'on', 'yes'];

export function resolveEnforcementMode(
  explicit: string | null | undefined,
  enforce: string | null | undefined
): EnforcementMode {
  const candidate = (explicit ?? null) ?? (enforce ?? null);
  if (!candidate) {
    return 'shadow';
  }
  const normalized = candidate.trim().toLowerCase();
  if (TRUTHY_ENFORCE_VALUES.includes(normalized)) {
    return 'enforce';
  }
  return 'shadow';
}
