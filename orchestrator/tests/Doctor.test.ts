import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  formatDoctorCloudPreflightSummary,
  formatDoctorSummary,
  runDoctor,
  runDoctorCloudPreflight
} from '../src/cli/doctor.js';
import { REPO_CONFIG_PATH_ENV_KEY } from '../src/cli/config/userConfig.js';
import { sanitizeProviderOverrideEnv } from '../src/cli/utils/providerOverrideEnv.js';
import * as cloudPreflight from '../src/cli/utils/cloudPreflight.js';

async function writeFakeCodexBinary(dir: string, featureLine: string): Promise<string> {
  const binPath = join(dir, 'codex');
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "--version" ]; then',
      '  echo "codex 0.0.0-test"',
      '  exit 0',
      'fi',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      `  echo "${featureLine}"`,
      '  exit 0',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "--help" ]; then',
      '  exit 0',
      'fi',
      'exit 0'
    ].join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

function buildDoctorCloudEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...sanitizeProviderOverrideEnv(process.env),
    CODEX_CLOUD_ENV_ID: '',
    CODEX_CLOUD_BRANCH: '',
    CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: '',
    CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '',
    MCP_RUNNER_TASK_ID: '',
    TASK: '',
    CODEX_ORCHESTRATOR_TASK_ID: '',
    CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '',
    CODEX_ORCHESTRATOR_ROOT: '',
    CODEX_ORCHESTRATOR_RUNTIME_MODE: '',
    CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: '',
    [REPO_CONFIG_PATH_ENV_KEY]: '',
    CODEX_RUNTIME_MODE: '',
    ...overrides
  };
}

describe('runDoctor', () => {
  it('reports missing devtools config and skill when absent', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      const result = runDoctor(process.cwd());
      expect(result.devtools.status).toBe('missing-both');
      expect(result.devtools.skill.name).toBe('chrome-devtools');
      expect(result.devtools.config.status).toBe('missing');
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.config.status).toBe('missing');
      expect(result.missing).toContain('chrome-devtools');
      expect(result.missing).toContain('chrome-devtools-config');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('reports devtools readiness when config and skill exist', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      const skillDir = join(tempHome, 'skills', 'chrome-devtools');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# devtools skill', 'utf8');
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]',
          'max_threads = 12',
          '',
          '[mcp_servers.chrome-devtools]',
          'command = "npx"',
          'args = ["-y", "chrome-devtools-mcp@latest"]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      const names = result.dependencies.map((dep) => dep.name);
      expect(names).toEqual(['playwright', 'pngjs', 'pixelmatch', 'cheerio']);
      expect(result.devtools.status).toBe('ok');
      expect(result.devtools.config.status).toBe('ok');
      expect(result.codex_defaults.status).toBe('ok');
      expect(result.codex_defaults.checks.model.status).toBe('ok');
      expect(result.codex_defaults.checks.review_model.status).toBe('ok');
      expect(result.codex_defaults.checks.model_reasoning_effort.status).toBe('ok');
      expect(result.codex_defaults.checks.max_threads.status).toBe('ok');
      expect(result.codex_defaults.checks.max_depth.status).toBe('ok');
      expect(result.codex_defaults.checks.max_depth.actual).toBeNull();

      const summary = formatDoctorSummary(result).join('\n');
      for (const name of names) {
        expect(summary).toContain(name);
      }
      expect(summary).toContain('DevTools: ok');
      expect(summary).toContain('Codex defaults advisory: ok');
      expect(summary).toContain('review_model: ok');
      expect(summary).toContain('agents.max_depth: ok (actual: <unset>, expected >= 4 when set; <unset> accepted)');
      expect(summary).not.toContain('  - agents.max_spawn_depth:');
      expect(summary).toContain('Current CO baseline no longer seeds or expects `agents.max_spawn_depth`');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('flags legacy max_spawn_depth when it still constrains older runtimes', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]',
          'max_threads = 12',
          'max_depth = 4',
          'max_spawn_depth = 1'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.legacy_max_spawn_depth).toEqual({
        present: true,
        status: 'advisory',
        actual: 1,
        detail: 'older parser/runtime may still treat this as a hard cap below the CO baseline depth; raise it to >= 4 or remove it'
      });
      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('legacy agents.max_spawn_depth: advisory (actual: 1;');
      expect(summary).toContain('raise it to >= 4 or remove it');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('reports delegation readiness when config declares the delegation MCP entry', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        ['mcp_servers."delegation" = { command = "codex-orchestrator" } # keep enabled'].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.delegation.status).toBe('ok');
      expect(result.delegation.config.status).toBe('ok');
      expect(formatDoctorSummary(result).join('\n')).toContain('Delegation: ok');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps overall doctor status at warning when providers are incomplete', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-providers-incomplete-'));
    process.env.CODEX_HOME = tempHome;
    try {
      const skillDir = join(tempHome, 'skills', 'chrome-devtools');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# devtools skill', 'utf8');
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]',
          'max_threads = 12',
          '',
          '[mcp_servers.chrome-devtools]',
          'command = "npx"',
          'args = ["-y", "chrome-devtools-mcp@latest"]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(tempRepo);
      expect(result.providers.status).toBe('advisory');
      expect(result.status).toBe('warning');
      expect(formatDoctorSummary(result).join('\n')).toContain('Providers: advisory');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  it('reports provider readiness when the repo is seeded and env is configured', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-providers-'));
    const previousEnv = {
      CO_LINEAR_API_TOKEN: process.env.CO_LINEAR_API_TOKEN,
      CO_LINEAR_WORKSPACE_ID: process.env.CO_LINEAR_WORKSPACE_ID,
      CO_LINEAR_WEBHOOK_SECRET: process.env.CO_LINEAR_WEBHOOK_SECRET,
      CO_TELEGRAM_POLLING_ENABLED: process.env.CO_TELEGRAM_POLLING_ENABLED,
      CO_TELEGRAM_BOT_TOKEN: process.env.CO_TELEGRAM_BOT_TOKEN,
      CO_TELEGRAM_ALLOWED_CHAT_IDS: process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS,
      CO_TELEGRAM_ENABLE_MUTATIONS: process.env.CO_TELEGRAM_ENABLE_MUTATIONS,
      CO_TELEGRAM_PUSH_ENABLED: process.env.CO_TELEGRAM_PUSH_ENABLED
    };

    try {
      const providersDir = join(tempRepo, '.codex', 'providers');
      await mkdir(providersDir, { recursive: true });
      await writeFile(join(providersDir, 'README.md'), '# Providers', 'utf8');
      await writeFile(join(providersDir, 'provider.env.example'), 'CO_LINEAR_API_TOKEN=', 'utf8');
      await writeFile(
        join(providersDir, 'control.example.json'),
        JSON.stringify(
          {
            feature_toggles: {
              dispatch_pilot: {
                enabled: true,
                source: {
                  provider: 'linear',
                  live: true,
                  workspace_id: 'workspace-id'
                }
              },
              transport_mutating_controls: {
                enabled: true,
                allowed_transports: ['telegram']
              }
            }
          },
          null,
          2
        ),
        'utf8'
      );

      process.env.CO_LINEAR_API_TOKEN = 'token';
      process.env.CO_LINEAR_WORKSPACE_ID = 'workspace-id';
      process.env.CO_LINEAR_WEBHOOK_SECRET = 'secret';
      process.env.CO_TELEGRAM_POLLING_ENABLED = 'true';
      process.env.CO_TELEGRAM_BOT_TOKEN = 'bot-token';
      process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS = '12345,67890';
      process.env.CO_TELEGRAM_ENABLE_MUTATIONS = 'true';
      process.env.CO_TELEGRAM_PUSH_ENABLED = 'true';

      const result = runDoctor(tempRepo);
      expect(result.providers.status).toBe('ok');
      expect(result.providers.repo_examples.status).toBe('ok');
      expect(result.providers.control_policy.status).toBe('ok');
      expect(result.providers.linear.status).toBe('ready');
      expect(result.providers.telegram.status).toBe('ready');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('Providers: ok');
      expect(summary).toContain('Linear: ready');
      expect(summary).toContain('Telegram: ready');
      expect(summary).toContain('dispatch_pilot: enabled (linear)');
      expect(summary).toContain('transport policy: telegram allowed');
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  it('resolves provider readiness from the repo root when doctor runs in a nested directory', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-providers-root-'));
    const nestedDir = join(tempRepo, 'packages', 'demo');
    const previousEnv = {
      CO_LINEAR_API_TOKEN: process.env.CO_LINEAR_API_TOKEN,
      CO_LINEAR_WORKSPACE_ID: process.env.CO_LINEAR_WORKSPACE_ID,
      CO_LINEAR_WEBHOOK_SECRET: process.env.CO_LINEAR_WEBHOOK_SECRET,
      CO_TELEGRAM_POLLING_ENABLED: process.env.CO_TELEGRAM_POLLING_ENABLED,
      CO_TELEGRAM_BOT_TOKEN: process.env.CO_TELEGRAM_BOT_TOKEN,
      CO_TELEGRAM_ALLOWED_CHAT_IDS: process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS,
      CO_TELEGRAM_ENABLE_MUTATIONS: process.env.CO_TELEGRAM_ENABLE_MUTATIONS,
      CO_TELEGRAM_PUSH_ENABLED: process.env.CO_TELEGRAM_PUSH_ENABLED
    };

    try {
      await mkdir(join(tempRepo, 'tasks'), { recursive: true });
      await writeFile(join(tempRepo, 'tasks', 'index.json'), '{"items":[]}', 'utf8');
      await mkdir(nestedDir, { recursive: true });
      const providersDir = join(tempRepo, '.codex', 'providers');
      await mkdir(providersDir, { recursive: true });
      await writeFile(join(providersDir, 'README.md'), '# Providers', 'utf8');
      await writeFile(join(providersDir, 'provider.env.example'), 'CO_LINEAR_API_TOKEN=', 'utf8');
      await writeFile(
        join(providersDir, 'control.example.json'),
        JSON.stringify(
          {
            feature_toggles: {
              dispatch_pilot: {
                enabled: true,
                source: {
                  provider: 'linear',
                  workspace_id: 'workspace-id'
                }
              },
              transport_mutating_controls: {
                enabled: true,
                allowed_transports: ['telegram']
              }
            }
          },
          null,
          2
        ),
        'utf8'
      );

      process.env.CO_LINEAR_API_TOKEN = 'token';
      process.env.CO_LINEAR_WORKSPACE_ID = 'workspace-id';
      process.env.CO_LINEAR_WEBHOOK_SECRET = 'secret';
      process.env.CO_TELEGRAM_POLLING_ENABLED = 'true';
      process.env.CO_TELEGRAM_BOT_TOKEN = 'bot-token';
      process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS = '12345,67890';
      process.env.CO_TELEGRAM_ENABLE_MUTATIONS = 'true';
      process.env.CO_TELEGRAM_PUSH_ENABLED = 'true';

      const result = runDoctor(nestedDir);
      expect(result.providers.status).toBe('ok');
      expect(result.providers.repo_examples.root).toBe(join(tempRepo, '.codex', 'providers'));
      expect(result.providers.linear.status).toBe('ready');
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  it('treats disabled providers as neutral for an ok aggregate provider status', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-providers-linear-only-'));
    const previousEnv = {
      CO_LINEAR_API_TOKEN: process.env.CO_LINEAR_API_TOKEN,
      CO_LINEAR_WORKSPACE_ID: process.env.CO_LINEAR_WORKSPACE_ID,
      CO_LINEAR_WEBHOOK_SECRET: process.env.CO_LINEAR_WEBHOOK_SECRET,
      CO_TELEGRAM_POLLING_ENABLED: process.env.CO_TELEGRAM_POLLING_ENABLED,
      CO_TELEGRAM_BOT_TOKEN: process.env.CO_TELEGRAM_BOT_TOKEN,
      CO_TELEGRAM_ALLOWED_CHAT_IDS: process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS,
      CO_TELEGRAM_ENABLE_MUTATIONS: process.env.CO_TELEGRAM_ENABLE_MUTATIONS,
      CO_TELEGRAM_PUSH_ENABLED: process.env.CO_TELEGRAM_PUSH_ENABLED
    };

    try {
      const providersDir = join(tempRepo, '.codex', 'providers');
      await mkdir(providersDir, { recursive: true });
      await writeFile(join(providersDir, 'README.md'), '# Providers', 'utf8');
      await writeFile(join(providersDir, 'provider.env.example'), 'CO_LINEAR_API_TOKEN=', 'utf8');
      await writeFile(
        join(providersDir, 'control.example.json'),
        JSON.stringify(
          {
            feature_toggles: {
              dispatch_pilot: {
                enabled: true,
                source: {
                  provider: 'linear',
                  workspace_id: 'workspace-id'
                }
              }
            }
          },
          null,
          2
        ),
        'utf8'
      );

      process.env.CO_LINEAR_API_TOKEN = 'token';
      process.env.CO_LINEAR_WORKSPACE_ID = 'workspace-id';
      process.env.CO_LINEAR_WEBHOOK_SECRET = 'secret';
      delete process.env.CO_TELEGRAM_POLLING_ENABLED;
      delete process.env.CO_TELEGRAM_BOT_TOKEN;
      delete process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS;
      delete process.env.CO_TELEGRAM_ENABLE_MUTATIONS;
      delete process.env.CO_TELEGRAM_PUSH_ENABLED;

      const result = runDoctor(tempRepo);
      expect(result.providers.status).toBe('ok');
      expect(result.providers.linear.status).toBe('ready');
      expect(result.providers.telegram.status).toBe('incomplete');
      expect(result.status).toBe('ok');
      expect(formatDoctorSummary(result).join('\n')).toContain('Providers: ok');
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  it('treats non-object provider control payloads as invalid', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-providers-invalid-policy-'));

    try {
      const providersDir = join(tempRepo, '.codex', 'providers');
      await mkdir(providersDir, { recursive: true });
      await writeFile(join(providersDir, 'README.md'), '# Providers', 'utf8');
      await writeFile(join(providersDir, 'provider.env.example'), 'CO_LINEAR_API_TOKEN=', 'utf8');
      await writeFile(join(providersDir, 'control.example.json'), '[]', 'utf8');

      const result = runDoctor(tempRepo);
      expect(result.providers.control_policy.status).toBe('invalid');
      expect(result.providers.control_policy.detail).toContain('provider control policy must be a JSON object');
      expect(result.providers.status).toBe('advisory');
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  it('treats missing transport allowlists as unrestricted when mutating controls are enabled', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-providers-'));
    const previousEnv = {
      CO_LINEAR_API_TOKEN: process.env.CO_LINEAR_API_TOKEN,
      CO_LINEAR_WORKSPACE_ID: process.env.CO_LINEAR_WORKSPACE_ID,
      CO_LINEAR_WEBHOOK_SECRET: process.env.CO_LINEAR_WEBHOOK_SECRET,
      CO_TELEGRAM_POLLING_ENABLED: process.env.CO_TELEGRAM_POLLING_ENABLED,
      CO_TELEGRAM_BOT_TOKEN: process.env.CO_TELEGRAM_BOT_TOKEN,
      CO_TELEGRAM_ALLOWED_CHAT_IDS: process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS,
      CO_TELEGRAM_ENABLE_MUTATIONS: process.env.CO_TELEGRAM_ENABLE_MUTATIONS,
      CO_TELEGRAM_PUSH_ENABLED: process.env.CO_TELEGRAM_PUSH_ENABLED
    };

    try {
      const providersDir = join(tempRepo, '.codex', 'providers');
      await mkdir(providersDir, { recursive: true });
      await writeFile(join(providersDir, 'README.md'), '# Providers', 'utf8');
      await writeFile(join(providersDir, 'provider.env.example'), 'CO_LINEAR_API_TOKEN=', 'utf8');
      await writeFile(
        join(providersDir, 'control.example.json'),
        JSON.stringify(
          {
            feature_toggles: {
              coordinator: {
                dispatch_pilot: {
                  enabled: true,
                  source: {
                    sourceProvider: 'linear',
                    live: true,
                    workspaceId: 'workspace-id'
                  }
                }
              },
              transport_mutating_controls: {
                enabled: true
              }
            }
          },
          null,
          2
        ),
        'utf8'
      );

      process.env.CO_LINEAR_API_TOKEN = 'token';
      process.env.CO_LINEAR_WEBHOOK_SECRET = 'secret';
      process.env.CO_TELEGRAM_POLLING_ENABLED = 'true';
      process.env.CO_TELEGRAM_BOT_TOKEN = 'bot-token';
      process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS = '12345,67890';
      process.env.CO_TELEGRAM_ENABLE_MUTATIONS = 'true';
      process.env.CO_TELEGRAM_PUSH_ENABLED = 'true';

      const result = runDoctor(tempRepo);
      expect(result.providers.status).toBe('ok');
      expect(result.providers.control_policy.transport_mutating_enabled).toBe(true);
      expect(result.providers.control_policy.dispatch_pilot_provider).toBe('linear');
      expect(result.providers.linear.binding_present).toBe(true);
      expect(result.providers.linear.status).toBe('ready');
      expect(result.providers.telegram.telegram_transport_allowed).toBe(true);
      expect(result.providers.telegram.status).toBe('ready');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('Providers: ok');
      expect(summary).toContain('Linear: ready');
      expect(summary).toContain('Telegram: ready');
      expect(summary).toContain('dispatch_pilot: enabled (linear)');
      expect(summary).toContain('transport policy: telegram allowed');
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  it('flags review_model when it does not match the baseline', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.3-codex"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]',
          'max_threads = 12'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.checks.model.status).toBe('ok');
      expect(result.codex_defaults.checks.review_model.status).toBe('advisory');
      expect(result.codex_defaults.checks.review_model.actual).toBe('gpt-5.3-codex');
      expect(formatDoctorSummary(result).join('\n')).toContain(
        'review_model: advisory (actual: gpt-5.3-codex, expected: gpt-5.4)'
      );
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('prefers multi_agent feature key when reported by codex features list', async () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-codex-bin-'));
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = runDoctor(process.cwd());
      expect(result.collab.enabled).toBe(true);
      expect(result.collab.feature_key).toBe('multi_agent');
      expect(formatDoctorSummary(result).join('\n')).toContain('feature key: multi_agent');
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to legacy collab feature key when canonical key is absent', async () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-codex-bin-'));
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'collab experimental true');
    try {
      const result = runDoctor(process.cwd());
      expect(result.collab.enabled).toBe(true);
      expect(result.collab.feature_key).toBe('collab');
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('reports missing cloud env id in doctor cloud preflight output', async () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-'));
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: process.cwd(),
        env: buildDoctorCloudEnv()
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing_environment' })]));
      expect(formatDoctorCloudPreflightSummary(result).join('\n')).toContain('Cloud preflight: failed');
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('passes doctor cloud preflight when env id is provided', async () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-'));
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: process.cwd(),
        env: buildDoctorCloudEnv({ CODEX_CLOUD_ENV_ID: 'env_123' })
      });
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(formatDoctorCloudPreflightSummary(result).join('\n')).toContain('Cloud preflight: ok');
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses repo pipeline stage cloudEnvId for doctor cloud preflight when env var is unset', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-metadata-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_stage_meta');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('ignores ambient provider snapshot env when doctor cloud preflight resolves repo-local metadata', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-provider-env-scrub-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_repo_local' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host',
          CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
          CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH: join(
            tempDir,
            'provider-workflow.last-known-good.json'
          ),
          CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT: '/tmp/provider-package-root',
          CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: join(tempDir, 'provider-workflow.last-known-good.json'),
          CODEX_ORCHESTRATOR_PACKAGE_ROOT: '/tmp/provider-package-root',
          CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_repo_local');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('honors explicit repo config overrides when doctor cloud preflight is not provider-launched', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-explicit-override-'));
    const overridePath = join(tempDir, 'override.json');
    await writeFile(
      overridePath,
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_custom' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...sanitizeProviderOverrideEnv(process.env),
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: overridePath,
          CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_custom');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('ignores unsupported stage envId aliases in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-envid-alias-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { envId: 'env_alias_only' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(false);
      expect(result.details.environment_id).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain('missing_environment');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses runtime-selected pipeline metadata for doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-runtime-pipeline-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'diag',
                  title: 'Diagnostics stage',
                  command: 'echo diagnostics',
                  plan: { cloudEnvId: 'env_diag' }
                }
              ]
            },
            {
              id: 'design-reference',
              title: 'Design reference',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'design',
                  title: 'Design stage',
                  command: 'echo design'
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      join(tempDir, 'design.config.yaml'),
      ['metadata:', '  design:', '    enabled: true'].join('\n'),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(false);
      expect(result.details.environment_id).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain('missing_environment');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to diagnostics pipeline when defaultPipeline is unset in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-diagnostics-fallback-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          pipelines: [
            {
              id: 'alpha',
              title: 'Alpha',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'alpha-stage',
                  title: 'Alpha stage',
                  command: 'echo alpha',
                  plan: { cloudEnvId: 'env_alpha' }
                }
              ]
            },
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_diagnostics' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_diagnostics');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to CODEX_CLOUD_ENV_ID when defaultPipeline is invalid in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-invalid-default-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'missing-default',
          pipelines: [
            {
              id: 'alpha',
              title: 'Alpha',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'alpha-stage',
                  title: 'Alpha stage',
                  command: 'echo alpha',
                  plan: { cloudEnvId: 'env_alpha' }
                }
              ]
            },
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_diagnostics' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_from_env'
        })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_from_env');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('fails doctor cloud preflight when strict repo-config mode blocks pipeline resolution', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-strict-repo-config-'));
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        environmentId: 'env_override',
        env: buildDoctorCloudEnv({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
        })
      });
      expect(result.ok).toBe(false);
      expect(result.details.environment_id).toBe('env_override');
      expect(result.issues.map((issue) => issue.code)).toContain('pipeline_resolution_failed');
      expect(
        result.issues.find((issue) => issue.code === 'pipeline_resolution_failed')?.message
      ).toContain('Repo-local codex.orchestrator.json is required');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses the first runnable stage for doctor cloud preflight when no default target is declared', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-runnable-target-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'bootstrap',
                  title: 'Bootstrap',
                  command: 'echo bootstrap',
                  plan: { runnable: false }
                },
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_runnable' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_runnable');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('matches runtime target selection when earlier runnable stages have no cloud metadata', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-metadata-target-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'bootstrap',
                  title: 'Bootstrap',
                  command: 'echo bootstrap'
                },
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_second_stage' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(false);
      expect(result.details.environment_id).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain('missing_environment');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers repo stage metadata over CODEX_CLOUD_ENV_ID in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-metadata-priority-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_from_env'
        })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_stage_meta');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('passes the shared cloud-preflight request contract while preserving doctor precedence', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-shared-contract-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    const runCloudPreflightSpy = vi
      .spyOn(cloudPreflight, 'runCloudPreflight')
      .mockImplementation(async (request) => ({
        ok: true,
        issues: [],
        details: {
          codexBin: request.codexBin,
          environmentId: request.environmentId,
          branch: typeof request.branch === 'string' ? request.branch.replace(/^refs\/heads\//u, '') : null
        }
      }));

    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        branch: ' refs/heads/option-branch ',
        env: buildDoctorCloudEnv({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_from_env',
          CODEX_CLOUD_BRANCH: 'refs/heads/env-branch'
        })
      });

      expect(runCloudPreflightSpy).toHaveBeenCalledOnce();
      const [request] = runCloudPreflightSpy.mock.calls[0] ?? [];
      expect(request).toBeDefined();
      expect(request?.repoRoot).toBe(tempDir);
      expect(request?.codexBin).toBe(fakeCodexBin);
      expect(request?.environmentId).toBe('env_stage_meta');
      expect(request?.branch).toBe('refs/heads/option-branch');
      expect(request?.env).toEqual(
        expect.objectContaining({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_from_env',
          CODEX_CLOUD_BRANCH: 'refs/heads/env-branch'
        })
      );
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_stage_meta');
      expect(result.details.branch).toBe('option-branch');
    } finally {
      runCloudPreflightSpy.mockRestore();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers explicit cwd over ambient CODEX_ORCHESTRATOR_ROOT during doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-explicit-cwd-'));
    const previousRoot = process.env.CODEX_ORCHESTRATOR_ROOT;
    const runCloudPreflightSpy = vi
      .spyOn(cloudPreflight, 'runCloudPreflight')
      .mockImplementation(async (request) => ({
        ok: true,
        issues: [],
        details: {
          codexBin: request.codexBin,
          environmentId: request.environmentId,
          branch: null
        }
      }));

    process.env.CODEX_ORCHESTRATOR_ROOT = process.cwd();

    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        environmentId: 'env_explicit',
        env: {
          ...process.env,
          CODEX_CLI_BIN: '/tmp/fake-codex',
          CODEX_CLOUD_BRANCH: '',
          CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: '',
          CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: ''
        }
      });

      expect(runCloudPreflightSpy).toHaveBeenCalledOnce();
      const [request] = runCloudPreflightSpy.mock.calls[0] ?? [];
      expect(request?.repoRoot).toBe(tempDir);
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_explicit');
    } finally {
      runCloudPreflightSpy.mockRestore();
      if (previousRoot === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_ROOT;
      } else {
        process.env.CODEX_ORCHESTRATOR_ROOT = previousRoot;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves cloud env id from stageSets references in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-set-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          stageSets: {
            sharedCloud: [
              {
                kind: 'command',
                id: 'review',
                title: 'Review',
                command: 'echo review',
                plan: { cloudEnvId: 'env_stage_set' }
              }
            ]
          },
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [{ kind: 'stage-set', ref: 'sharedCloud' }]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_stage_set');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves default target from expanded stageSets in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-set-default-target-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          stageSets: {
            sharedCloud: [
              {
                kind: 'command',
                id: 'bootstrap',
                title: 'Bootstrap',
                command: 'echo bootstrap',
                plan: { cloudEnvId: 'env_first' }
              },
              {
                kind: 'command',
                id: 'review',
                title: 'Review',
                command: 'echo review',
                plan: { cloudEnvId: 'env_default', defaultTarget: true }
              }
            ]
          },
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [{ kind: 'stage-set', ref: 'sharedCloud' }]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_default');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to CODEX_CLOUD_ENV_ID when stage-set references are invalid in doctor preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-set-invalid-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                { kind: 'stage-set', ref: 'missingSharedSet' },
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: buildDoctorCloudEnv({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_from_env'
        })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_from_env');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers explicit cloud env id override over repo stage metadata in doctor preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-override-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        environmentId: 'env_override',
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_override');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses task metadata cloud env id for doctor cloud preflight when env var is unset', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-task-metadata-'));
    await mkdir(join(tempDir, 'tasks'), { recursive: true });
    await writeFile(
      join(tempDir, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '0974-cloud-adoption-preflight-reliability',
            slug: '0974-cloud-adoption-preflight-reliability',
            title: 'Cloud preflight task',
            metadata: {
              cloud: {
                envId: 'env_task_meta'
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        taskId: '0974-cloud-adoption-preflight-reliability',
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_task_meta');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves task metadata cloud env id when doctor runs from a subdirectory', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-task-metadata-subdir-'));
    const subdir = join(tempDir, 'packages', 'app');
    await mkdir(join(tempDir, 'tasks'), { recursive: true });
    await mkdir(subdir, { recursive: true });
    await writeFile(
      join(tempDir, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '0974-cloud-adoption-preflight-reliability',
            slug: '0974-cloud-adoption-preflight-reliability',
            title: 'Cloud preflight task',
            metadata: {
              cloud: {
                envId: 'env_task_meta_subdir'
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: subdir,
        taskId: '0974-cloud-adoption-preflight-reliability',
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_task_meta_subdir');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses parent task metadata cloud env id for delegated task IDs', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-task-metadata-delegated-'));
    await mkdir(join(tempDir, 'tasks'), { recursive: true });
    await writeFile(
      join(tempDir, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '0974-cloud-adoption-preflight-reliability',
            slug: '0974-cloud-adoption-preflight-reliability',
            title: 'Cloud preflight task',
            metadata: {
              cloud: {
                envId: 'env_task_meta'
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        taskId: '0974-cloud-adoption-preflight-reliability-scout',
        env: buildDoctorCloudEnv({ CODEX_CLI_BIN: fakeCodexBin })
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_task_meta');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
