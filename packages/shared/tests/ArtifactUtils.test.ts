import { describe, it, expect } from 'vitest';

import { isIsoDate } from '../manifest/artifactUtils.js';

describe('isIsoDate', () => {
  it('accepts strict ISO-8601 timestamps', () => {
    expect(isIsoDate('2025-01-01T00:00:00.000Z')).toBe(true);
    expect(isIsoDate('2025-01-01T00:00:00Z')).toBe(true);
    expect(isIsoDate('2025-01-01T00:00:00+02:00')).toBe(true);
  });

  it('rejects non-ISO but parseable dates', () => {
    expect(isIsoDate('01/02/2025')).toBe(false);
    expect(isIsoDate('2025-01-01')).toBe(false);
    expect(isIsoDate('not-a-date')).toBe(false);
  });
});

