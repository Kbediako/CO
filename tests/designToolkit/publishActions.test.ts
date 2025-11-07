import { describe, expect, it } from 'vitest';
import { resolveToolkitPublishActions } from '../../scripts/design/pipeline/toolkit/publishActions.js';

describe('resolveToolkitPublishActions', () => {
  it('returns true defaults when config omitted', () => {
    const pipeline = {
      publish: {
        updateTokens: true,
        updateComponents: true,
        runVisualRegression: true
      }
    } as any;
    expect(resolveToolkitPublishActions(pipeline)).toEqual({
      updateTokens: true,
      updateComponents: true,
      runVisualRegression: true
    });
  });

  it('honors disabled flags', () => {
    const pipeline = {
      publish: {
        updateTokens: false,
        updateComponents: true,
        runVisualRegression: false
      }
    } as any;
    expect(resolveToolkitPublishActions(pipeline)).toEqual({
      updateTokens: false,
      updateComponents: true,
      runVisualRegression: false
    });
  });
});
