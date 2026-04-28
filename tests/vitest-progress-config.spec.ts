import { afterEach, describe, expect, it } from 'vitest';

const ORIGINAL_CI = process.env.CI;
const ORIGINAL_CODEX_VITEST_PROGRESS = process.env.CODEX_VITEST_PROGRESS;
const ORIGINAL_CODEX_NON_INTERACTIVE = process.env.CODEX_NON_INTERACTIVE;
const ORIGINAL_CODEX_NONINTERACTIVE = process.env.CODEX_NONINTERACTIVE;
const ORIGINAL_CODEX_NO_INTERACTIVE = process.env.CODEX_NO_INTERACTIVE;
const TRACKED_ENV_KEYS = [
  'CI',
  'CODEX_VITEST_PROGRESS',
  'CODEX_NON_INTERACTIVE',
  'CODEX_NONINTERACTIVE',
  'CODEX_NO_INTERACTIVE'
] as const;
const ORIGINAL_ENV_BY_KEY = {
  CI: ORIGINAL_CI,
  CODEX_VITEST_PROGRESS: ORIGINAL_CODEX_VITEST_PROGRESS,
  CODEX_NON_INTERACTIVE: ORIGINAL_CODEX_NON_INTERACTIVE,
  CODEX_NONINTERACTIVE: ORIGINAL_CODEX_NONINTERACTIVE,
  CODEX_NO_INTERACTIVE: ORIGINAL_CODEX_NO_INTERACTIVE
} satisfies Record<(typeof TRACKED_ENV_KEYS)[number], string | undefined>;

afterEach(() => {
  restoreTrackedEnv();
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

  it('leaves the progress reporter disabled for falsy CODEX env values', async () => {
    for (const falsyValue of ['0', 'false', 'no', '']) {
      const config = await loadConfig({ CODEX_VITEST_PROGRESS: falsyValue });
      expect(config.test?.reporters).toBeUndefined();
      expect(config.test ? 'reporters' in config.test : false).toBe(false);
    }
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

describe('vitest worker-cap config', () => {
  it('caps workers for CI broad-lane runs', async () => {
    const config = await loadConfig({ CI: '1' });
    expect(config.test?.maxWorkers).toBe(2);
    expect(config.test?.minWorkers).toBe(1);
  });

  it('caps workers for explicit stage-owned Vitest progress runs', async () => {
    const config = await loadConfig({ CODEX_VITEST_PROGRESS: '1' });
    expect(config.test?.maxWorkers).toBe(2);
    expect(config.test?.minWorkers).toBe(1);
  });

  it.each([
    { label: 'CODEX_NON_INTERACTIVE', env: { CODEX_NON_INTERACTIVE: '1' } },
    { label: 'CODEX_NO_INTERACTIVE', env: { CODEX_NO_INTERACTIVE: 'true' } },
    { label: 'CODEX_NONINTERACTIVE', env: { CODEX_NONINTERACTIVE: 'yes' } }
  ])('caps workers for $label worker runs', async ({ env }) => {
    const config = await loadConfig(env);
    expect(config.test?.maxWorkers).toBe(2);
    expect(config.test?.minWorkers).toBe(1);
  });

  it('leaves workers uncapped for plain interactive local runs', async () => {
    const config = await loadConfig({});
    expect(config.test?.maxWorkers).toBeUndefined();
    expect(config.test?.minWorkers).toBeUndefined();
  });
});

async function loadConfig(env: Partial<NodeJS.ProcessEnv>) {
  applyTrackedEnv(env);

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

function applyTrackedEnv(env: Partial<NodeJS.ProcessEnv>) {
  for (const key of TRACKED_ENV_KEYS) {
    const value = env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function restoreTrackedEnv() {
  for (const key of TRACKED_ENV_KEYS) {
    const original = ORIGINAL_ENV_BY_KEY[key];
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
}
