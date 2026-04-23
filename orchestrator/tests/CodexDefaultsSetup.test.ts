import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runCodexDefaultsSetup } from '../src/cli/codexDefaultsSetup.js';

const require = createRequire(import.meta.url);
const toml = require('@iarna/toml') as {
  parse: (source: string) => Record<string, unknown>;
};

const ROLE_TEMPLATE_DIR = join(process.cwd(), 'templates', 'codex', '.codex', 'agents');

async function buildPriorManagedRole(
  fileName: 'worker-complex.toml' | 'awaiter-high.toml',
  modelReasoningEffort: 'high' | 'xhigh'
): Promise<string> {
  const template = await readFile(join(ROLE_TEMPLATE_DIR, fileName), 'utf8');
  return template
    .replace(/gpt-5\.5/g, 'gpt-5.4')
    .replace(/at xhigh reasoning\./g, `at ${modelReasoningEffort} reasoning.`)
    .replace(
      /^model_reasoning_effort\s*=\s*"[^"]*"$/m,
      `model_reasoning_effort = "${modelReasoningEffort}"`
    );
}

describe('runCodexDefaultsSetup', () => {
  it('returns a dry-run plan by default', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-plan-'));
    try {
      const result = await runCodexDefaultsSetup({
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      expect(result.status).toBe('planned');
      expect(result.plan.configPath).toBe(join(tempHome, 'config.toml'));
      expect(result.plan.agentsDir).toBe(join(tempHome, 'agents'));
      expect(result.changes).toEqual([
        expect.objectContaining({
          target: 'config',
          status: 'pending'
        }),
        expect.objectContaining({
          target: 'role_file',
          name: 'explorer_fast',
          status: 'pending'
        }),
        expect.objectContaining({
          target: 'role_file',
          name: 'worker_complex',
          status: 'pending'
        }),
        expect.objectContaining({
          target: 'role_file',
          name: 'awaiter',
          status: 'pending'
        })
      ]);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('applies additive config defaults and preserves existing role files without --force', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-apply-'));
    const configPath = join(tempHome, 'config.toml');
    const agentsDir = join(tempHome, 'agents');
    const explorerPath = join(agentsDir, 'explorer-fast.toml');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          'review_model = "legacy-review-model"',
          'custom_flag = "keep"',
          '[agents]',
          'max_threads = 2',
          'max_depth = 2',
          'max_spawn_depth = 2',
          'extra_agent_key = "keep"',
          '[agents.awaiter]',
          'description = "keep-this-extra-value"',
          'config_file = "./legacy.toml"',
          'custom = "still-here"',
          '[mcp_servers.delegation]',
          'enabled = true',
          ''
        ].join('\n'),
        'utf8'
      );
      await writeFile(explorerPath, 'MARKER\n', 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      expect(result.status).toBe('applied');
      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ target: 'config', status: 'updated' }),
          expect.objectContaining({
            target: 'role_file',
            name: 'explorer_fast',
            status: 'preserved'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'created'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'created'
          })
        ])
      );

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
        model_reasoning_effort?: string;
        custom_flag?: string;
        agents?: Record<string, unknown>;
        mcp_servers?: {
          delegation?: {
            enabled?: boolean;
          };
        };
      };

      expect(parsed.model).toBe('gpt-5.5');
      expect(parsed.review_model).toBe('gpt-5.5');
      expect(parsed.model_reasoning_effort).toBe('xhigh');
      expect(parsed.custom_flag).toBe('keep');
      expect(parsed.mcp_servers?.delegation?.enabled).toBe(true);
      expect(parsed.agents?.max_threads).toBe(12);
      expect(parsed.agents?.max_depth).toBe(2);
      expect(parsed.agents?.max_spawn_depth).toBe(2);
      expect(parsed.agents?.extra_agent_key).toBe('keep');

      const awaiterRole = parsed.agents?.awaiter as Record<string, unknown> | undefined;
      const explorerFastRole = parsed.agents?.explorer_fast as Record<string, unknown> | undefined;
      expect(explorerFastRole?.description).toBe('Fast explorer (spark file/codebase search only).');
      expect(awaiterRole?.config_file).toBe('./agents/awaiter-high.toml');
      expect(awaiterRole?.custom).toBe('still-here');
      expect(await readFile(explorerPath, 'utf8')).toBe('MARKER\n');
      const workerRoleFile = await readFile(workerPath, 'utf8');
      expect(workerRoleFile).toContain('model = "gpt-5.5"');
      expect(workerRoleFile).toContain('model_reasoning_effort = "xhigh"');
      const awaiterRoleFile = await readFile(awaiterPath, 'utf8');
      expect(awaiterRoleFile).toContain('# with CO override to use gpt-5.5 at xhigh reasoning.');
      expect(awaiterRoleFile).toContain('model = "gpt-5.5"');
      expect(awaiterRoleFile).toContain('model_reasoning_effort = "xhigh"');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('does not seed agent depth caps when the source config omits them', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-no-depth-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        ['model = "legacy-model"', '[agents]', 'max_threads = 2', ''].join('\n'),
        'utf8'
      );

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      expect(result.status).toBe('applied');

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        agents?: Record<string, unknown>;
      };

      expect(parsed.agents?.max_threads).toBe(12);
      expect(parsed.agents?.max_depth).toBeUndefined();
      expect(parsed.agents?.max_spawn_depth).toBeUndefined();
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps explorer_fast on spark when creating role files', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-explorer-fast-'));
    const explorerPath = join(tempHome, 'agents', 'explorer-fast.toml');
    try {
      const result = await runCodexDefaultsSetup({
        apply: true,
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      expect(result.status).toBe('applied');
      const explorerFastRoleFile = await readFile(explorerPath, 'utf8');
      expect(explorerFastRoleFile).toContain('model = "gpt-5.3-codex-spark"');
      expect(explorerFastRoleFile).not.toContain('gpt-5.5');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('migrates prior CO-managed role files without --force', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-managed-migration-'));
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      await writeFile(workerPath, await buildPriorManagedRole('worker-complex.toml', 'xhigh'), 'utf8');
      await writeFile(awaiterPath, await buildPriorManagedRole('awaiter-high.toml', 'high'), 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'updated'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'updated'
          })
        ])
      );

      const workerRoleFile = await readFile(workerPath, 'utf8');
      expect(workerRoleFile).toContain('model = "gpt-5.5"');
      expect(workerRoleFile).toContain('model_reasoning_effort = "xhigh"');
      expect(workerRoleFile).not.toContain('gpt-5.4');

      const awaiterRoleFile = await readFile(awaiterPath, 'utf8');
      expect(awaiterRoleFile).toContain('# with CO override to use gpt-5.5 at xhigh reasoning.');
      expect(awaiterRoleFile).toContain('model = "gpt-5.5"');
      expect(awaiterRoleFile).toContain('model_reasoning_effort = "xhigh"');
      expect(awaiterRoleFile).not.toContain('gpt-5.4');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('preserves customized role files that only resemble the prior baseline', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-custom-role-'));
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      const customizedWorker = `${await buildPriorManagedRole('worker-complex.toml', 'xhigh')}# local override\n`;
      const customizedAwaiter = (await buildPriorManagedRole('awaiter-high.toml', 'high')).replace(
        'background_terminal_max_timeout = 3600000',
        'background_terminal_max_timeout = 7200000'
      );
      await writeFile(workerPath, customizedWorker, 'utf8');
      await writeFile(awaiterPath, customizedAwaiter, 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'preserved'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'preserved'
          })
        ])
      );
      expect(await readFile(workerPath, 'utf8')).toBe(customizedWorker);
      expect(await readFile(awaiterPath, 'utf8')).toBe(customizedAwaiter);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('does not migrate role files with non-managed prior reasoning levels', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-custom-reasoning-role-'));
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      const customWorkerHigh = await buildPriorManagedRole('worker-complex.toml', 'high');
      const customAwaiterXhigh = await buildPriorManagedRole('awaiter-high.toml', 'xhigh');
      await writeFile(workerPath, customWorkerHigh, 'utf8');
      await writeFile(awaiterPath, customAwaiterXhigh, 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
      });

      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'preserved'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'preserved'
          })
        ])
      );
      expect(await readFile(workerPath, 'utf8')).toBe(customWorkerHigh);
      expect(await readFile(awaiterPath, 'utf8')).toBe(customAwaiterXhigh);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('throws a clear error and skips writes when config TOML is invalid', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-invalid-'));
    const configPath = join(tempHome, 'config.toml');
    const workerPath = join(tempHome, 'agents', 'worker-complex.toml');
    try {
      await writeFile(configPath, 'model = "bad"\n[agents\nmax_threads = 1\n', 'utf8');

      await expect(
        runCodexDefaultsSetup({
          apply: true,
          env: { CODEX_HOME: tempHome } as NodeJS.ProcessEnv
        })
      ).rejects.toThrow(`Failed to parse Codex config TOML at ${configPath}`);

      await expect(readFile(workerPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
