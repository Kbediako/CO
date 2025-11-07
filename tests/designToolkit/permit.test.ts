import { describe, expect, it } from 'vitest';
import { ensureSourcePermitted } from '../../scripts/design/pipeline/toolkit/common.js';

describe('toolkit permit validation', () => {
  it('allows permitted origins and rejects others', () => {
    const permit = {
      allowedSources: [{ origin: 'https://example.com' }]
    };

    expect(() => ensureSourcePermitted('https://example.com/dashboard', permit)).not.toThrow();
    expect(() => ensureSourcePermitted('https://other.com', permit)).toThrow();
  });
});
