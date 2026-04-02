import { afterEach, describe, expect, it } from 'vitest';

const ORIGINAL_CI = process.env.CI;

afterEach(() => {
  if (ORIGINAL_CI === undefined) {
    delete process.env.CI;
    return;
  }

  process.env.CI = ORIGINAL_CI;
});

describe('vitest progress reporter config', () => {
  it('enables the progress reporter for standard truthy CI env values', async () => {
    for (const ciValue of ['1', 'true', 'yes']) {
      const config = await loadConfigForCiValue(ciValue);
      expect(config.test?.reporters).toHaveLength(2);
    }
  });

  it('leaves the progress reporter disabled when CI is unset', async () => {
    const config = await loadConfigForCiValue(undefined);
    expect(config.test?.reporters).toBeUndefined();
  });
});

async function loadConfigForCiValue(ciValue: string | undefined) {
  if (ciValue === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = ciValue;
  }

  const configUrl = new URL(
    `../vitest.config.core.ts?ci=${ciValue ?? 'unset'}&t=${Date.now()}`,
    import.meta.url
  ).href;
  const module = await import(/* @vite-ignore */ configUrl);
  return module.default;
}
