import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { runCodexDefaultsSetup } from '../src/cli/codexDefaultsSetup.js';
import { parseCodexFeaturesFromText } from '../src/cli/utils/codexFeatures.js';

const require = createRequire(import.meta.url);
const toml = require('@iarna/toml') as {
  parse: (source: string) => Record<string, unknown>;
};

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(TEST_DIR, '..', '..');
const ROLE_TEMPLATE_DIR = join(PACKAGE_ROOT, 'templates', 'codex', '.codex', 'agents');

function buildDefaultsEnv(tempHome: string, codexBin = join(tempHome, 'missing-codex')): NodeJS.ProcessEnv {
  return { CODEX_HOME: tempHome, CODEX_CLI_BIN: codexBin } as NodeJS.ProcessEnv;
}

async function writeFakeCodexBinary(
  dir: string,
  featureLine: string,
  options: { exitCode?: number; stderr?: string } = {}
): Promise<string> {
  const binPath = join(dir, 'codex');
  const featureOutput =
    featureLine.length > 0
      ? featureLine
          .split(/\r?\n/u)
          .map((line) => `  printf '%s\\n' ${JSON.stringify(line)}`)
          .join('\n')
      : '';
  const stderrOutput = options.stderr ? `  printf '%s\n' ${JSON.stringify(options.stderr)} >&2` : '';
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      featureOutput,
      stderrOutput,
      `  exit ${options.exitCode ?? 0}`,
      'fi',
      'exit 0'
    ].filter(Boolean).join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

async function writeEnvAwareCodexBinary(dir: string): Promise<string> {
  const binPath = join(dir, 'codex-env-aware');
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      '  if [ -n "$CODEX_HOME" ] && [ -f "$CODEX_HOME/multi-agent-v2.enabled" ]; then',
      "    printf '%s\\n' 'multi_agent_v2 experimental true'",
      '  else',
      "    printf '%s\\n' 'multi_agent_v2 experimental false'",
      '  fi',
      '  exit 0',
      'fi',
      'exit 0'
    ].join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

async function buildPriorManagedRole(
  fileName: 'worker-complex.toml' | 'awaiter-high.toml'
): Promise<string> {
  const template = await readFile(join(ROLE_TEMPLATE_DIR, fileName), 'utf8');
  return template
    .replace(/gpt-5\.4/g, 'gpt-5.5')
    .replace(
      /^model_reasoning_effort\s*=\s*"[^"]*"$/m,
      'model_reasoning_effort = "xhigh"'
    )
    .replace(
      /^# with CO override to use .+ at .+ reasoning\.$/m,
      '# with CO override to use gpt-5.5 at xhigh reasoning.'
    );
}

const LEGACY_CHATGPT_AUTH_AWAITER_ROLE = `# Synced from codex-rs/core/src/agent/builtins/awaiter.toml (0.105.0)
# with CO portable override to use gpt-5.4 at high reasoning.
background_terminal_max_timeout = 3600000
model = "gpt-5.5"
model_reasoning_effort = "high"
developer_instructions="""You are an awaiter.
Your role is to await the completion of a specific command or task and report its status only when it is finished.

Behavior rules:

1. When given a command or task identifier, you must:
   - Execute or await it using the appropriate tool
   - Continue awaiting until the task reaches a terminal state.

2. You must NOT:
   - Modify the task.
   - Interpret or optimize the task.
   - Perform unrelated actions.
   - Stop awaiting unless explicitly instructed.

3. Awaiting behavior:
   - If the task is still running, continue polling using tool calls.
   - Use repeated tool calls if necessary.
   - Do not hallucinate completion.
   - Use long timeouts when awaiting for something. If you need multiple awaits, increase the timeouts/yield times exponentially.

4. If asked for status:
   - Return the current known status.
   - Immediately resume awaiting afterward.

5. Termination:
   - Only exit awaiting when:
     - The task completes successfully, OR
     - The task fails, OR
     - You receive an explicit stop instruction.

You must behave deterministically and conservatively.
"""
`;

describe('parseCodexFeaturesFromText', () => {
  it('captures removed status without losing enabled flags', () => {
    const features = parseCodexFeaturesFromText(
      [
        'js_repl removed false',
        'multi_agent_v2 experimental true',
        'custom_feature false',
        'malformed_feature maybe'
      ].join('\n')
    );

    expect(features.js_repl).toEqual({
      name: 'js_repl',
      status: 'removed',
      enabled: false,
      removed: true
    });
    expect(features.multi_agent_v2).toEqual({
      name: 'multi_agent_v2',
      status: 'experimental',
      enabled: true,
      removed: false
    });
    expect(features.custom_feature).toEqual({
      name: 'custom_feature',
      status: null,
      enabled: false,
      removed: false
    });
    expect(features.malformed_feature).toBeUndefined();
  });
});

describe('runCodexDefaultsSetup', () => {
  it('returns a dry-run plan by default', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-plan-'));
    try {
      const result = await runCodexDefaultsSetup({
        env: buildDefaultsEnv(tempHome)
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

  it('applies additive portable config defaults and preserves existing role files without --force', async () => {
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
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.status).toBe('applied');
      expect(result.plan.authScope).toBe('portable');
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

      expect(parsed.model).toBe('gpt-5.4');
      expect(parsed.review_model).toBe('gpt-5.4');
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
      expect(workerRoleFile).toContain('model = "gpt-5.4"');
      expect(workerRoleFile).toContain('model_reasoning_effort = "xhigh"');
      const awaiterRoleFile = await readFile(awaiterPath, 'utf8');
      expect(awaiterRoleFile).toContain('# with CO override to use gpt-5.4 at high reasoning.');
      expect(awaiterRoleFile).toContain('model = "gpt-5.4"');
      expect(awaiterRoleFile).toContain('model_reasoning_effort = "high"');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('seeds delegated and review defaults on gpt-5.5 for ChatGPT-auth scope', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-chatgpt-'));
    const configPath = join(tempHome, 'config.toml');
    const workerPath = join(tempHome, 'agents', 'worker-complex.toml');
    const awaiterPath = join(tempHome, 'agents', 'awaiter-high.toml');
    try {
      const result = await runCodexDefaultsSetup({
        apply: true,
        authScope: 'chatgpt',
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.status).toBe('applied');
      expect(result.plan.authScope).toBe('chatgpt');

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
        model_reasoning_effort?: string;
        codex_orchestrator?: Record<string, unknown>;
      };

      expect(parsed.model).toBe('gpt-5.5');
      expect(parsed.review_model).toBe('gpt-5.5');
      expect(parsed.model_reasoning_effort).toBe('xhigh');
      expect(parsed.codex_orchestrator?.local_model_opt_in).toBeUndefined();

      const workerRoleFile = await readFile(workerPath, 'utf8');
      expect(workerRoleFile).toContain('model = "gpt-5.5"');
      expect(workerRoleFile).toContain('model_reasoning_effort = "xhigh"');

      const awaiterRoleFile = await readFile(awaiterPath, 'utf8');
      expect(awaiterRoleFile).toContain('# with CO override to use gpt-5.5 at xhigh reasoning.');
      expect(awaiterRoleFile).toContain('model = "gpt-5.5"');
      expect(awaiterRoleFile).toContain('model_reasoning_effort = "xhigh"');

      const secondResult = await runCodexDefaultsSetup({
        apply: true,
        authScope: 'chatgpt',
        env: buildDefaultsEnv(tempHome)
      });

      expect(secondResult.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ target: 'config', status: 'unchanged' }),
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'unchanged'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'unchanged'
          })
        ])
      );

      const secondParsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
        codex_orchestrator?: Record<string, unknown>;
      };
      expect(secondParsed.model).toBe('gpt-5.5');
      expect(secondParsed.review_model).toBe('gpt-5.5');
      expect(secondParsed.codex_orchestrator?.local_model_opt_in).toBeUndefined();
      expect(await readFile(workerPath, 'utf8')).toContain('model = "gpt-5.5"');
      expect(await readFile(awaiterPath, 'utf8')).toContain('model = "gpt-5.5"');

      const plainRerunResult = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      expect(plainRerunResult.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ target: 'config', status: 'unchanged' }),
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'unchanged'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'unchanged'
          })
        ])
      );

      const plainRerunParsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
        codex_orchestrator?: Record<string, unknown>;
      };
      expect(plainRerunParsed.model).toBe('gpt-5.5');
      expect(plainRerunParsed.review_model).toBe('gpt-5.5');
      expect(plainRerunParsed.codex_orchestrator?.local_model_opt_in).toBeUndefined();
      expect(await readFile(workerPath, 'utf8')).toContain('model = "gpt-5.5"');
      expect(await readFile(awaiterPath, 'utf8')).toContain('model = "gpt-5.5"');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('removes the local gpt-5.5 marker when portable scope is requested explicitly', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-portable-scope-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '[codex_orchestrator]',
          'local_model_opt_in = "gpt-5.5"',
          ''
        ].join('\n'),
        'utf8'
      );

      const result = await runCodexDefaultsSetup({
        apply: true,
        authScope: 'portable',
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.status).toBe('applied');
      expect(result.plan.authScope).toBe('portable');

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
        codex_orchestrator?: Record<string, unknown>;
      };
      expect(parsed.model).toBe('gpt-5.4');
      expect(parsed.review_model).toBe('gpt-5.4');
      expect(parsed.codex_orchestrator).toBeUndefined();
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('ignores stale legacy markers during implicit portable defaults runs', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-stale-marker-'));
    const configPath = join(tempHome, 'config.toml');
    const workerPath = join(tempHome, 'agents', 'worker-complex.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '[codex_orchestrator]',
          'local_model_opt_in = "gpt-5.5"',
          ''
        ].join('\n'),
        'utf8'
      );

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.status).toBe('applied');
      expect(result.plan.authScope).toBe('portable');

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
        codex_orchestrator?: Record<string, unknown>;
      };
      expect(parsed.model).toBe('gpt-5.4');
      expect(parsed.review_model).toBe('gpt-5.4');
      expect(parsed.codex_orchestrator).toBeUndefined();
      expect(await readFile(workerPath, 'utf8')).toContain('model = "gpt-5.4"');
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
        env: buildDefaultsEnv(tempHome)
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

  it('preserves local gpt-5.5 config and removes legacy markers', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-local-opt-in-'));
    const configPath = join(tempHome, 'config.toml');
    const workerPath = join(tempHome, 'agents', 'worker-complex.toml');
    const awaiterPath = join(tempHome, 'agents', 'awaiter-high.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          'custom_flag = "keep"',
          '[codex_orchestrator]',
          'local_model_opt_in = "gpt-5.5"',
          '[agents]',
          'max_threads = 2',
          ''
        ].join('\n'),
        'utf8'
      );

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.status).toBe('applied');

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
        model_reasoning_effort?: string;
        custom_flag?: string;
        agents?: Record<string, unknown>;
        codex_orchestrator?: Record<string, unknown>;
      };

      expect(parsed.model).toBe('gpt-5.5');
      expect(parsed.review_model).toBe('gpt-5.5');
      expect(parsed.model_reasoning_effort).toBe('xhigh');
      expect(parsed.custom_flag).toBe('keep');
      expect(parsed.codex_orchestrator).toBeUndefined();
      expect(parsed.agents?.max_threads).toBe(12);
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

  it('preserves unmarked gpt-5.5 defaults as current ChatGPT-auth posture', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-legacy-gpt55-'));
    const configPath = join(tempHome, 'config.toml');
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      await writeFile(
        configPath,
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '[agents]',
          'max_threads = 12',
          ''
        ].join('\n'),
        'utf8'
      );
      const priorWorker = await buildPriorManagedRole('worker-complex.toml');
      const priorAwaiter = await buildPriorManagedRole('awaiter-high.toml');
      await writeFile(workerPath, priorWorker, 'utf8');
      await writeFile(awaiterPath, priorAwaiter, 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ target: 'config', status: 'updated' }),
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'unchanged'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'unchanged'
          })
        ])
      );

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
      };
      expect(parsed.model).toBe('gpt-5.5');
      expect(parsed.review_model).toBe('gpt-5.5');

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

  it('updates legacy ChatGPT-auth awaiter role files to current gpt-5.5 comments', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-legacy-awaiter-portable-'));
    const configPath = join(tempHome, 'config.toml');
    const agentsDir = join(tempHome, 'agents');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      await writeFile(
        configPath,
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '[agents]',
          'max_threads = 12',
          ''
        ].join('\n'),
        'utf8'
      );
      await writeFile(awaiterPath, LEGACY_CHATGPT_AUTH_AWAITER_ROLE, 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ target: 'config', status: 'updated' }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'updated'
          })
        ])
      );

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        model?: string;
        review_model?: string;
      };
      expect(parsed.model).toBe('gpt-5.5');
      expect(parsed.review_model).toBe('gpt-5.5');

      const awaiterRoleFile = await readFile(awaiterPath, 'utf8');
      expect(awaiterRoleFile).not.toBe(LEGACY_CHATGPT_AUTH_AWAITER_ROLE);
      expect(awaiterRoleFile).toContain('# with CO override to use gpt-5.5 at xhigh reasoning.');
      expect(awaiterRoleFile).toContain('model = "gpt-5.5"');
      expect(awaiterRoleFile).toContain('model_reasoning_effort = "xhigh"');
      expect(awaiterRoleFile).not.toContain('portable override');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps exact prior gpt-5.5 role files when config uses gpt-5.5', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-local-role-opt-in-'));
    const configPath = join(tempHome, 'config.toml');
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      await writeFile(
        configPath,
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '[codex_orchestrator]',
          'local_model_opt_in = "gpt-5.5"',
          '[agents]',
          'max_threads = 12',
          ''
        ].join('\n'),
        'utf8'
      );
      const priorWorker = await buildPriorManagedRole('worker-complex.toml');
      const priorAwaiter = await buildPriorManagedRole('awaiter-high.toml');
      await writeFile(workerPath, priorWorker, 'utf8');
      await writeFile(awaiterPath, priorAwaiter, 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'unchanged'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'unchanged'
          })
        ])
      );
      expect(await readFile(workerPath, 'utf8')).toBe(priorWorker);
      expect(await readFile(awaiterPath, 'utf8')).toBe(priorAwaiter);

      const explicitChatGptRerun = await runCodexDefaultsSetup({
        apply: true,
        authScope: 'chatgpt',
        env: buildDefaultsEnv(tempHome)
      });

      expect(explicitChatGptRerun.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ target: 'config', status: 'unchanged' }),
          expect.objectContaining({
            target: 'role_file',
            name: 'worker_complex',
            status: 'unchanged'
          }),
          expect.objectContaining({
            target: 'role_file',
            name: 'awaiter',
            status: 'unchanged'
          })
        ])
      );
      expect(await readFile(workerPath, 'utf8')).toBe(priorWorker);
      expect(await readFile(awaiterPath, 'utf8')).toBe(priorAwaiter);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('updates managed gpt-5.4 role files when config uses gpt-5.5', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-local-role-migration-'));
    const configPath = join(tempHome, 'config.toml');
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      await writeFile(
        configPath,
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '[codex_orchestrator]',
          'local_model_opt_in = "gpt-5.5"',
          '[agents]',
          'max_threads = 12',
          ''
        ].join('\n'),
        'utf8'
      );
      const packagedWorker = await readFile(join(ROLE_TEMPLATE_DIR, 'worker-complex.toml'), 'utf8');
      const packagedAwaiter = await readFile(join(ROLE_TEMPLATE_DIR, 'awaiter-high.toml'), 'utf8');
      await writeFile(workerPath, packagedWorker, 'utf8');
      await writeFile(awaiterPath, packagedAwaiter, 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
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
      expect(workerRoleFile).not.toBe(packagedWorker);
      expect(workerRoleFile).toContain('model = "gpt-5.5"');
      expect(workerRoleFile).toContain('model_reasoning_effort = "xhigh"');

      const awaiterRoleFile = await readFile(awaiterPath, 'utf8');
      expect(awaiterRoleFile).not.toBe(packagedAwaiter);
      expect(awaiterRoleFile).toContain('# with CO override to use gpt-5.5 at xhigh reasoning.');
      expect(awaiterRoleFile).toContain('model = "gpt-5.5"');
      expect(awaiterRoleFile).toContain('model_reasoning_effort = "xhigh"');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('force-overwrites role files to the active gpt-5.5 posture', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-local-role-force-'));
    const configPath = join(tempHome, 'config.toml');
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      await writeFile(
        configPath,
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '[codex_orchestrator]',
          'local_model_opt_in = "gpt-5.5"',
          '[agents]',
          'max_threads = 12',
          ''
        ].join('\n'),
        'utf8'
      );
      await writeFile(workerPath, '# custom worker\nmodel = "custom-model"\nmodel_reasoning_effort = "low"\n', 'utf8');
      await writeFile(
        awaiterPath,
        '# custom awaiter\nmodel = "custom-model"\nmodel_reasoning_effort = "low"\n',
        'utf8'
      );

      const result = await runCodexDefaultsSetup({
        apply: true,
        force: true,
        env: buildDefaultsEnv(tempHome)
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
      expect(workerRoleFile).not.toContain('custom-model');
      expect(workerRoleFile).toContain('model = "gpt-5.5"');
      expect(workerRoleFile).toContain('model_reasoning_effort = "xhigh"');

      const awaiterRoleFile = await readFile(awaiterPath, 'utf8');
      expect(awaiterRoleFile).not.toContain('custom-model');
      expect(awaiterRoleFile).toContain('# with CO override to use gpt-5.5 at xhigh reasoning.');
      expect(awaiterRoleFile).toContain('model = "gpt-5.5"');
      expect(awaiterRoleFile).toContain('model_reasoning_effort = "xhigh"');
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
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.status).toBe('applied');
      const explorerFastRoleFile = await readFile(explorerPath, 'utf8');
      expect(explorerFastRoleFile).toContain('model = "gpt-5.3-codex-spark"');
      expect(explorerFastRoleFile).not.toContain('gpt-5.5');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('migrates prior CO-managed gpt-5.5 role files to portable fallback without --force', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-managed-migration-'));
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      const priorWorker = await buildPriorManagedRole('worker-complex.toml');
      const priorAwaiter = await buildPriorManagedRole('awaiter-high.toml');
      await writeFile(workerPath, priorWorker, 'utf8');
      await writeFile(awaiterPath, priorAwaiter, 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.plan.authScope).toBe('portable');
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
      expect(workerRoleFile).not.toBe(priorWorker);
      expect(workerRoleFile).toContain('model = "gpt-5.4"');
      expect(workerRoleFile).toContain('model_reasoning_effort = "xhigh"');

      const awaiterRoleFile = await readFile(awaiterPath, 'utf8');
      expect(awaiterRoleFile).not.toBe(priorAwaiter);
      expect(awaiterRoleFile).toContain('# with CO override to use gpt-5.4 at high reasoning.');
      expect(awaiterRoleFile).toContain('model = "gpt-5.4"');
      expect(awaiterRoleFile).toContain('model_reasoning_effort = "high"');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('preserves customized gpt-5.5 role files without --force', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-custom-role-'));
    const agentsDir = join(tempHome, 'agents');
    const workerPath = join(agentsDir, 'worker-complex.toml');
    const awaiterPath = join(agentsDir, 'awaiter-high.toml');
    try {
      await mkdir(agentsDir, { recursive: true });
      const customizedWorker = `${await buildPriorManagedRole('worker-complex.toml')}# local override\n`;
      const customizedAwaiter = LEGACY_CHATGPT_AUTH_AWAITER_ROLE.replace(
        'background_terminal_max_timeout = 3600000',
        'background_terminal_max_timeout = 7200000'
      );
      await writeFile(workerPath, customizedWorker, 'utf8');
      await writeFile(awaiterPath, customizedAwaiter, 'utf8');

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
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

  it('omits max_threads when multi_agent_v2 is enabled in existing config', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          '',
          '[features]',
          'multi_agent_v2 = true',
          '',
          '[agents]',
          'max_threads = 2',
          'extra_agent_key = "keep"',
          ''
        ].join('\n'),
        'utf8'
      );

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      expect(result.status).toBe('applied');
      expect(result.changes).toEqual(
        expect.arrayContaining([expect.objectContaining({ target: 'config', status: 'updated' })])
      );

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        features?: Record<string, unknown>;
        agents?: Record<string, unknown>;
      };

      expect(parsed.features?.multi_agent_v2).toBe(true);
      expect(parsed.agents?.max_threads).toBeUndefined();
      expect(parsed.agents?.extra_agent_key).toBe('keep');
      expect(parsed.agents?.worker_complex).toEqual(
        expect.objectContaining({
          config_file: './agents/worker-complex.toml'
        })
      );
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('omits max_threads when multi_agent_v2 is enabled by the Codex feature surface', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-feature-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          '',
          '[agents]',
          'max_threads = 2',
          'extra_agent_key = "keep"',
          ''
        ].join('\n'),
        'utf8'
      );
      const codexBin = await writeFakeCodexBinary(tempHome, 'multi_agent_v2 experimental true');

      await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome, codexBin)
      });

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        agents?: Record<string, unknown>;
      };

      expect(parsed.agents?.max_threads).toBeUndefined();
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('omits max_threads when multi_agent_v2 is enabled in table form with a user-owned cap', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-table-cap-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          '',
          '[features.multi_agent_v2]',
          'enabled = true',
          'max_concurrent_threads_per_session = 7',
          '',
          '[agents]',
          'max_threads = 2',
          'extra_agent_key = "keep"',
          ''
        ].join('\n'),
        'utf8'
      );

      await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        features?: { multi_agent_v2?: Record<string, unknown> };
        agents?: Record<string, unknown>;
      };

      expect(parsed.features?.multi_agent_v2?.enabled).toBe(true);
      expect(parsed.features?.multi_agent_v2?.max_concurrent_threads_per_session).toBe(7);
      expect(parsed.agents?.max_threads).toBeUndefined();
      expect(parsed.agents?.extra_agent_key).toBe('keep');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps stable max_threads when only top-level multi_agent_v2 settings are configured', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-top-level-settings-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          '',
          '[multi_agent_v2]',
          'enabled = true',
          'max_concurrent_threads_per_session = 7',
          '',
          '[agents]',
          'max_threads = 2',
          ''
        ].join('\n'),
        'utf8'
      );

      await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome)
      });

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        multi_agent_v2?: Record<string, unknown>;
        agents?: Record<string, unknown>;
      };

      expect(parsed.multi_agent_v2?.enabled).toBe(true);
      expect(parsed.multi_agent_v2?.max_concurrent_threads_per_session).toBe(7);
      expect(parsed.agents?.max_threads).toBe(12);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('reports and prunes only CO-managed removed feature keys through explicit apply', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-removed-features-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          '',
          '[features]',
          'js_repl = true',
          'js_repl_tools_only = false',
          'custom_removed = true',
          'multi_agent_v2 = false',
          '',
          '[agents]',
          'max_threads = 2',
          'extra_agent_key = "keep"',
          ''
        ].join('\n'),
        'utf8'
      );
      const codexBin = await writeFakeCodexBinary(
        tempHome,
        [
          'js_repl removed false',
          'js_repl_tools_only removed false',
          'custom_removed removed true',
          'multi_agent_v2 experimental false'
        ].join('\n')
      );

      const plan = await runCodexDefaultsSetup({
        env: buildDefaultsEnv(tempHome, codexBin)
      });
      expect(plan.status).toBe('planned');
      expect(plan.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'config',
            status: 'pending',
            detail: expect.stringContaining(
              'pruned stale CO-managed removed feature keys: js_repl, js_repl_tools_only'
            )
          })
        ])
      );

      let parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        features?: Record<string, unknown>;
        agents?: Record<string, unknown>;
      };
      expect(parsed.features?.js_repl).toBe(true);
      expect(parsed.features?.js_repl_tools_only).toBe(false);

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome, codexBin)
      });
      expect(result.status).toBe('applied');
      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: 'config',
            status: 'updated',
            detail: expect.stringContaining(
              'pruned stale CO-managed removed feature keys: js_repl, js_repl_tools_only'
            )
          })
        ])
      );

      parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        features?: Record<string, unknown>;
        agents?: Record<string, unknown>;
      };
      expect(parsed.features?.js_repl).toBeUndefined();
      expect(parsed.features?.js_repl_tools_only).toBeUndefined();
      expect(parsed.features?.custom_removed).toBe(true);
      expect(parsed.features?.multi_agent_v2).toBe(false);
      expect(parsed.agents?.extra_agent_key).toBe('keep');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps max_threads when the live feature probe explicitly disables multi_agent_v2', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-false-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          '',
          '[features]',
          'multi_agent_v2 = true',
          '',
          '[agents]',
          'max_threads = 2',
          'extra_agent_key = "keep"',
          ''
        ].join('\n'),
        'utf8'
      );
      const codexBin = await writeFakeCodexBinary(tempHome, 'multi_agent_v2 experimental false');

      await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome, codexBin)
      });

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        agents?: Record<string, unknown>;
      };

      expect(parsed.agents?.max_threads).toBe(12);
      expect(parsed.agents?.extra_agent_key).toBe('keep');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps max_threads when the Codex feature surface explicitly disables multi_agent_v2', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-false-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          '',
          '[agents]',
          'max_threads = 2',
          'extra_agent_key = "keep"',
          ''
        ].join('\n'),
        'utf8'
      );
      const codexBin = await writeFakeCodexBinary(tempHome, 'multi_agent_v2 experimental false', {
        stderr: 'invalid config: agents.max_threads is rejected when features.multi_agent_v2=true'
      });

      await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome, codexBin)
      });

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        agents?: Record<string, unknown>;
      };

      expect(parsed.agents?.max_threads).toBe(12);
      expect(parsed.agents?.extra_agent_key).toBe('keep');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('uses the target env when probing Codex features during defaults setup', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-env-'));
    const ambientHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-ambient-'));
    const configPath = join(tempHome, 'config.toml');
    const originalCodexHome = process.env.CODEX_HOME;
    try {
      process.env.CODEX_HOME = ambientHome;
      await writeFile(
        configPath,
        [
          'model = "legacy-model"',
          '',
          '[agents]',
          'max_threads = 2',
          'extra_agent_key = "keep"',
          ''
        ].join('\n'),
        'utf8'
      );
      await writeFile(join(tempHome, 'multi-agent-v2.enabled'), '1\n', 'utf8');
      const codexBin = await writeEnvAwareCodexBinary(tempHome);

      await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome, codexBin)
      });

      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        agents?: Record<string, unknown>;
      };

      expect(parsed.agents?.max_threads).toBeUndefined();
      expect(parsed.agents?.extra_agent_key).toBe('keep');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
      await rm(ambientHome, { recursive: true, force: true });
    }
  });

  it('omits max_threads when Codex rejects the current config before feature flags can be listed', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-defaults-multi-agent-v2-reject-'));
    const configPath = join(tempHome, 'config.toml');
    try {
      await writeFile(
        configPath,
        [
          '[agents]',
          'max_threads = 12',
          'extra_agent_key = "keep"',
          ''
        ].join('\n'),
        'utf8'
      );
      const codexBin = await writeFakeCodexBinary(tempHome, '', {
        exitCode: 1,
        stderr: 'invalid config: agents.max_threads is rejected when features.multi_agent_v2=true'
      });

      const result = await runCodexDefaultsSetup({
        apply: true,
        env: buildDefaultsEnv(tempHome, codexBin)
      });

      expect(result.status).toBe('applied');
      const parsed = toml.parse(await readFile(configPath, 'utf8')) as {
        agents?: Record<string, unknown>;
      };

      expect(parsed.agents?.max_threads).toBeUndefined();
      expect(parsed.agents?.extra_agent_key).toBe('keep');
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
          env: buildDefaultsEnv(tempHome)
        })
      ).rejects.toThrow(`Failed to parse Codex config TOML at ${configPath}`);

      await expect(readFile(workerPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
