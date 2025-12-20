import { describe, expect, it } from 'vitest';
import { resolveEnforcementMode } from '../src/cli/utils/enforcementMode.js';

describe('resolveEnforcementMode', () => {
  it('defaults to shadow when no values are provided', () => {
    expect(resolveEnforcementMode(null, null)).toBe('shadow');
  });

  it('trims and lowercases truthy values', () => {
    expect(resolveEnforcementMode(' EnFoRcE ', null)).toBe('enforce');
  });

  it('honors explicit mode over enforce fallback', () => {
    expect(resolveEnforcementMode('shadow', 'enforce')).toBe('shadow');
  });

  it('treats empty strings as shadow', () => {
    expect(resolveEnforcementMode('', 'enforce')).toBe('shadow');
  });
});
