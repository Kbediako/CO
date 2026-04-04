import { afterEach, describe, expect, it } from 'vitest';

const ORIGINAL_CI = process.env.CI;
const ORIGINAL_CODEX_VITEST_PROGRESS = process.env.CODEX_VITEST_PROGRESS;
const ORIGINAL_CODEX_NON_INTERACTIVE = process.env.CODEX_NON_INTERACTIVE;
const ORIGINAL_CODEX_NONINTERACTIVE = process.env.CODEX_NONINTERACTIVE;
const ORIGINAL_CODEX_NO_INTERACTIVE = process.env.CODEX_NO_INTERACTIVE;

afterEach(() => {
  if (ORIGINAL_CI === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = ORIGINAL_CI;
  }

  if (ORIGINAL_CODEX_NON_INTERACTIVE === undefined) {
    delete process.env.CODEX_NON_INTERACTIVE;
  } else {
    process.env.CODEX_NON_INTERACTIVE = ORIGINAL_CODEX_NON_INTERACTIVE;
  }

  if (ORIGINAL_CODEX_NONINTERACTIVE === undefined) {
    delete process.env.CODEX_NONINTERACTIVE;
  } else {
    process.env.CODEX_NONINTERACTIVE = ORIGINAL_CODEX_NONINTERACTIVE;
  }

  if (ORIGINAL_CODEX_NO_INTERACTIVE === undefined) {
    delete process.env.CODEX_NO_INTERACTIVE;
  } else {
    process.env.CODEX_NO_INTERACTIVE = ORIGINAL_CODEX_NO_INTERACTIVE;
  }

  if (ORIGINAL_CODEX_VITEST_PROGRESS === undefined) {
    delete process.env.CODEX_VITEST_PROGRESS;
  } else {
    process.env.CODEX_VITEST_PROGRESS = ORIGINAL_CODEX_VITEST_PROGRESS;
  }
});

describe('vitest progress reporter config', () => {
  it('enables the progress reporter for standard truthy CI env values', async () => {
    for (const ciValue of ['1', 'true', 'yes']) {
      const config = await loadConfigForCiValue(ciValue);
      const reporters = config.test?.reporters;
      expect(reporters).toHaveLength(2);
      expect(reporters?.[0]).toBe('default');
      expect(reporters?.[1]).toBeTruthy();
    }
  });

  it('leaves the progress reporter disabled when CI is unset', async () => {
    const config = await loadConfigForCiValue(undefined);
    expect(config.test?.reporters).toBeUndefined();
    expect(config.test ? 'reporters' in config.test : false).toBe(false);
  });

  it('enables the progress reporter for CODEX_NON_INTERACTIVE worker runs', async () => {
    const config = await loadConfig({ CODEX_NON_INTERACTIVE: '1' });
    const reporters = config.test?.reporters;
    expect(reporters).toHaveLength(2);
    expect(reporters?.[0]).toBe('default');
    expect(reporters?.[1]).toBeTruthy();
  });

  it('enables the progress reporter for CODEX_NO_INTERACTIVE worker runs', async () => {
    const config = await loadConfig({ CODEX_NO_INTERACTIVE: 'true' });
    const reporters = config.test?.reporters;
    expect(reporters).toHaveLength(2);
    expect(reporters?.[0]).toBe('default');
    expect(reporters?.[1]).toBeTruthy();
  });

  it('enables the progress reporter for the legacy CODEX_NONINTERACTIVE worker alias', async () => {
    const config = await loadConfig({ CODEX_NONINTERACTIVE: 'yes' });
    const reporters = config.test?.reporters;
    expect(reporters).toHaveLength(2);
    expect(reporters?.[0]).toBe('default');
    expect(reporters?.[1]).toBeTruthy();
  });

  it('enables the progress reporter for CODEX_VITEST_PROGRESS stage-owned runs', async () => {
    const config = await loadConfig({ CODEX_VITEST_PROGRESS: '1' });
    const reporters = config.test?.reporters;
    expect(reporters).toHaveLength(2);
    expect(reporters?.[0]).toBe('default');
    expect(reporters?.[1]).toBeTruthy();
  });
});

async function loadConfig(env: Partial<NodeJS.ProcessEnv>) {
  if (env.CI === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = env.CI;
  }

  if (env.CODEX_NON_INTERACTIVE === undefined) {
    delete process.env.CODEX_NON_INTERACTIVE;
  } else {
    process.env.CODEX_NON_INTERACTIVE = env.CODEX_NON_INTERACTIVE;
  }

  if (env.CODEX_NONINTERACTIVE === undefined) {
    delete process.env.CODEX_NONINTERACTIVE;
  } else {
    process.env.CODEX_NONINTERACTIVE = env.CODEX_NONINTERACTIVE;
  }

  if (env.CODEX_NO_INTERACTIVE === undefined) {
    delete process.env.CODEX_NO_INTERACTIVE;
  } else {
    process.env.CODEX_NO_INTERACTIVE = env.CODEX_NO_INTERACTIVE;
  }

  if (env.CODEX_VITEST_PROGRESS === undefined) {
    delete process.env.CODEX_VITEST_PROGRESS;
  } else {
    process.env.CODEX_VITEST_PROGRESS = env.CODEX_VITEST_PROGRESS;
  }

  const configUrl = new URL(
    `../vitest.config.core.ts?ci=${env.CI ?? 'unset'}&noninteractive=${env.CODEX_NON_INTERACTIVE ?? 'unset'}&noninteractive_alias=${env.CODEX_NONINTERACTIVE ?? 'unset'}&nointeractive=${env.CODEX_NO_INTERACTIVE ?? 'unset'}&progress=${env.CODEX_VITEST_PROGRESS ?? 'unset'}&t=${Date.now()}`,
    import.meta.url
  ).href;
  const module = await import(/* @vite-ignore */ configUrl);
  return module.default;
}

async function loadConfigForCiValue(ciValue: string | undefined) {
  return await loadConfig({ CI: ciValue });
}
