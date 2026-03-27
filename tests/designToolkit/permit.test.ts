import { describe, expect, it } from 'vitest';
import {
  ensureSourcePermitted
} from '../../scripts/design/pipeline/toolkit/common.js';
import { resolveRuntimeProofCapabilities } from '../../scripts/design/pipeline/permit.js';

describe('toolkit permit validation', () => {
  it('allows permitted origins and rejects others', () => {
    const permit = {
      allowedSources: [{ origin: 'https://example.com' }]
    };

    expect(ensureSourcePermitted('https://example.com/dashboard', permit)).toBe(true);
    expect(ensureSourcePermitted('https://other.com', permit)).toBe(false);
  });

  it('reads explicit runtime proof flags and legacy video fallback from permit entries', () => {
    expect(
      resolveRuntimeProofCapabilities({
        origin: 'https://example.com',
        allow_video_capture: true,
        runtime_proof: {
          allow_screenshot: true,
          allow_external_link: false
        }
      })
    ).toEqual({
      screenshot: true,
      external_link: false,
      video: true
    });

    expect(
      resolveRuntimeProofCapabilities({
        origin: 'https://example.com',
        allow_video_capture: true,
        runtime_proof: {
          allow_video: false
        }
      })
    ).toEqual({
      screenshot: false,
      external_link: false,
      video: false
    });
  });
});
