import { createHmac } from 'node:crypto';
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  buildDelegationEnablementGuidance,
  buildDelegationDirectTransportGuidance,
  checkoutPostureBlocksDoctorStatus,
  formatDoctorCloudPreflightSummary,
  formatDoctorSummary,
  inspectCodexSandboxSecurityAdvisories,
  runDoctor,
  runDoctorCloudPreflight
} from '../src/cli/doctor.js';
import { CONFIG_AUTHORITY_MODE_ENV_KEY } from '../src/cli/config/repoConfigPolicy.js';
import { REPO_CONFIG_PATH_ENV_KEY } from '../src/cli/config/userConfig.js';
import { sanitizeProviderOverrideEnv } from '../src/cli/utils/providerOverrideEnv.js';
import * as cloudPreflight from '../src/cli/utils/cloudPreflight.js';

const TEST_AUTH_PROVENANCE_FINGERPRINT_KEY = 'doctor-test-fingerprint-key';
const RUN_DOCTOR_TEST_TIMEOUT_MS = 15_000;

function testFingerprint(value: string): string {
  return `hmac-sha256:${createHmac('sha256', TEST_AUTH_PROVENANCE_FINGERPRINT_KEY)
    .update(value)
    .digest('hex')
    .slice(0, 16)}`;
}

async function writeFakeCodexBinary(
  dir: string,
  featureLine: string,
  options: { exitCode?: number; stderr?: string; version?: string } = {}
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
  const version = options.version ?? 'codex 0.0.0-test';
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "--version" ]; then',
      `  echo ${JSON.stringify(version)}`,
      '  exit 0',
      'fi',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      featureOutput,
      stderrOutput,
      `  exit ${options.exitCode ?? 0}`,
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "--help" ]; then',
      '  exit 0',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "list" ]; then',
      '  echo "{\\"tasks\\":[{\\"id\\":\\"task-test\\",\\"environment_id\\":\\"$4\\"}]}"',
      '  exit 0',
      'fi',
      'exit 0'
    ].filter(Boolean).join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

async function writeManagedCodexConfig(codexHome: string, binaryPath: string): Promise<void> {
  const configDir = join(codexHome, 'orchestrator', 'codex-cli');
  await mkdir(configDir, { recursive: true });
  await writeFile(
    join(configDir, 'codex-cli.json'),
    JSON.stringify(
      {
        binary_path: binaryPath,
        method: 'build',
        installed_at: '2026-05-01T00:00:00.000Z',
        version: 'codex-cli managed-test'
      },
      null,
      2
    ),
    'utf8'
  );
}

async function withMissingCodexHome(run: (tempHome: string) => Promise<void>): Promise<void> {
  const originalCodexHome = process.env.CODEX_HOME;
  const originalCodexCliBin = process.env.CODEX_CLI_BIN;
  const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
  process.env.CODEX_HOME = tempHome;
  process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
  try {
    await run(tempHome);
  } finally {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    if (originalCodexCliBin === undefined) {
      delete process.env.CODEX_CLI_BIN;
    } else {
      process.env.CODEX_CLI_BIN = originalCodexCliBin;
    }
    await rm(tempHome, { recursive: true, force: true });
  }
}

async function writeFakeDelegationDistEntrypoint(rootDir: string): Promise<string> {
  const distDir = join(rootDir, 'dist', 'bin');
  const entryPath = join(distDir, 'codex-orchestrator.js');
  await mkdir(distDir, { recursive: true });
  await writeFile(
    entryPath,
    [
      "let input = '';",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('data', (chunk) => { input += chunk; });",
      "process.stdin.on('end', () => {",
      "  try {",
      "    if (process.argv[2] !== 'delegate-server') {",
      "      process.stderr.write('missing delegate-server argument');",
      "      process.exitCode = 1;",
      "      return;",
      "    }",
      "    const payload = input",
      "      .split(/\\r?\\n/)",
      "      .map((line) => line.trim())",
      "      .find((line) => line.length > 0);",
      "    const request = payload ? JSON.parse(payload) : null;",
      "    if (request?.id !== 1 || request?.method !== 'initialize') {",
      "      process.stderr.write('missing initialize request');",
      "      process.exitCode = 1;",
      "      return;",
      "    }",
      "    process.stdout.write(",
      "      JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2024-11-05' } }) + '\\n'",
      "    );",
      "  } catch (error) {",
      "    process.stderr.write(error instanceof Error ? error.message : 'invalid initialize request');",
      "    process.exitCode = 1;",
      "  }",
      "});"
    ].join('\n'),
    'utf8'
  );
  return entryPath;
}

function buildDoctorCloudEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...sanitizeProviderOverrideEnv(process.env),
    CODEX_CLOUD_ENV_ID: '',
    CODEX_CLOUD_BRANCH: '',
    [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'downstream-compatibility',
    CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: '',
    CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '',
    MCP_RUNNER_TASK_ID: '',
    TASK: '',
    CODEX_ORCHESTRATOR_TASK_ID: '',
    CODEX_ORCHESTRATOR_ROOT: '',
    CODEX_ORCHESTRATOR_RUNTIME_MODE: '',
    CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: '',
    [REPO_CONFIG_PATH_ENV_KEY]: '',
    CODEX_RUNTIME_MODE: '',
    ...overrides
  };
}

describe('runDoctor', { timeout: RUN_DOCTOR_TEST_TIMEOUT_MS }, () => {
  it('blocks an overall ok status for unavailable posture inside git worktrees only', () => {
    expect(
      checkoutPostureBlocksDoctorStatus({
        status: 'unavailable',
        inside_git_worktree: true,
        stale_docs_may_be: false
      })
    ).toBe(true);
    expect(
      checkoutPostureBlocksDoctorStatus({
        status: 'unavailable',
        inside_git_worktree: false,
        stale_docs_may_be: false
      })
    ).toBe(false);
    expect(
      checkoutPostureBlocksDoctorStatus({
        status: 'stale',
        inside_git_worktree: true,
        stale_docs_may_be: true
      })
    ).toBe(true);
  });

  it('reports source-root freshness separately from checkout posture', () => {
    const result = runDoctor(process.cwd());

    expect(result.checkout_posture).toHaveProperty('repo_root');
    expect(result.source_root_freshness).toMatchObject({
      schema_version: 1,
      base_ref: 'origin/main'
    });
    expect(formatDoctorSummary(result).join('\n')).toContain('Source root freshness:');
  });

  it('reports active Codex binary provenance without app bundle noise when the app binary is absent', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-binary-provenance-'));
    const activeBin = await writeFakeCodexBinary(tempHome, 'multi_agent stable true', {
      version: 'codex-cli 0.128.0'
    });
    try {
      process.env.CODEX_HOME = tempHome;
      process.env.CODEX_CLI_BIN = activeBin;
      const missingAppBundle = join(tempHome, 'Applications', 'Codex.app', 'Contents', 'Resources', 'codex');
      const result = runDoctor(process.cwd(), { codexAppBundlePath: missingAppBundle });
      expect(result.codex_cli.active.path).toBe(process.env.CODEX_CLI_BIN);
      expect(result.codex_cli.active.version).toBe('codex-cli 0.128.0');
      expect(result.codex_cli.app_bundle.status).toBe('absent');
      expect(result.codex_cli.version_drift.status).toBe('not_applicable');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain(`Codex CLI: ${process.env.CODEX_CLI_BIN}`);
      expect(summary).toContain(`  - active path: ${process.env.CODEX_CLI_BIN}`);
      expect(summary).toContain('  - active version: codex-cli 0.128.0');
      expect(summary).not.toContain('binary provenance drift');
      expect(summary).not.toContain('app bundle:');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('reports matching app-bundle Codex versions without drift advisory', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-binary-match-'));
    const appBundleDir = join(tempHome, 'Applications', 'Codex.app', 'Contents', 'Resources');
    await mkdir(appBundleDir, { recursive: true });
    const activeBin = await writeFakeCodexBinary(tempHome, 'multi_agent stable true', {
      version: 'codex-cli 0.128.0'
    });
    const appBundlePath = await writeFakeCodexBinary(appBundleDir, '', { version: 'codex-cli 0.128.0' });
    try {
      process.env.CODEX_HOME = tempHome;
      process.env.CODEX_CLI_BIN = activeBin;
      const result = runDoctor(process.cwd(), { codexAppBundlePath: appBundlePath });
      expect(result.codex_cli.app_bundle.status).toBe('ok');
      expect(result.codex_cli.app_bundle.version).toBe('codex-cli 0.128.0');
      expect(result.codex_cli.version_drift.status).toBe('ok');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain(`  - app bundle: ok (${appBundlePath})`);
      expect(summary).toContain('    version: codex-cli 0.128.0');
      expect(summary).not.toContain('binary provenance drift: advisory');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('surfaces divergent active CLI and app-bundle versions as advisory drift', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-binary-drift-'));
    const appBundleDir = join(tempHome, 'Applications', 'Codex.app', 'Contents', 'Resources');
    await mkdir(appBundleDir, { recursive: true });
    const activeBin = await writeFakeCodexBinary(tempHome, 'multi_agent stable true', {
      version: 'codex-cli 0.128.0'
    });
    const appBundlePath = await writeFakeCodexBinary(appBundleDir, '', { version: 'codex-cli 0.128.0-alpha.1' });
    try {
      process.env.CODEX_HOME = tempHome;
      process.env.CODEX_CLI_BIN = activeBin;
      const missingAppBundle = join(tempHome, 'missing-app-bundle-codex');
      const baseline = runDoctor(process.cwd(), { codexAppBundlePath: missingAppBundle });
      const result = runDoctor(process.cwd(), { codexAppBundlePath: appBundlePath });
      expect(result.codex_cli.version_drift.status).toBe('advisory');
      expect(result.codex_cli.version_drift.message).toContain('codex-cli 0.128.0');
      expect(result.codex_cli.version_drift.message).toContain('codex-cli 0.128.0-alpha.1');
      expect(result.status).toBe(baseline.status);

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('binary provenance drift: advisory');
      expect(summary).toContain(`(${process.env.CODEX_CLI_BIN})`);
      expect(summary).toContain(`(${appBundlePath})`);
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('reports bare codex provenance through PATH resolution', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const originalManagedFlag = process.env.CODEX_CLI_USE_MANAGED;
    const originalPath = process.env.PATH;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-binary-path-'));
    const activeBin = await writeFakeCodexBinary(tempHome, 'multi_agent stable true', {
      version: 'codex-cli path-selected'
    });
    try {
      process.env.CODEX_HOME = tempHome;
      delete process.env.CODEX_CLI_BIN;
      delete process.env.CODEX_CLI_USE_MANAGED;
      process.env.PATH = originalPath ? `${tempHome}${delimiter}${originalPath}` : tempHome;
      const result = runDoctor(process.cwd(), { codexAppBundlePath: join(tempHome, 'missing-app-codex') });
      expect(result.codex_cli.active.command).toBe('codex');
      expect(result.codex_cli.active.path).toBe(activeBin);
      expect(result.codex_cli.active.version).toBe('codex-cli path-selected');
      expect(result.codex_cli.version_drift.status).toBe('not_applicable');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      if (originalManagedFlag === undefined) {
        delete process.env.CODEX_CLI_USE_MANAGED;
      } else {
        process.env.CODEX_CLI_USE_MANAGED = originalManagedFlag;
      }
      if (originalPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = originalPath;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('keeps CODEX_CLI_BIN as the audited active binary when managed CLI is enabled', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const originalManagedFlag = process.env.CODEX_CLI_USE_MANAGED;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-binary-override-'));
    const explicitDir = join(tempHome, 'explicit');
    const managedDir = join(tempHome, 'managed');
    await mkdir(explicitDir, { recursive: true });
    await mkdir(managedDir, { recursive: true });
    const explicitBin = await writeFakeCodexBinary(explicitDir, 'multi_agent stable true', {
      version: 'codex-cli explicit'
    });
    const managedBin = await writeFakeCodexBinary(managedDir, 'multi_agent stable true', {
      version: 'codex-cli managed'
    });
    await writeManagedCodexConfig(tempHome, managedBin);
    try {
      process.env.CODEX_HOME = tempHome;
      process.env.CODEX_CLI_USE_MANAGED = '1';
      process.env.CODEX_CLI_BIN = explicitBin;
      const result = runDoctor(process.cwd(), { codexAppBundlePath: join(tempHome, 'missing-app-codex') });
      expect(result.codex_cli.active.command).toBe(explicitBin);
      expect(result.codex_cli.active.path).toBe(explicitBin);
      expect(result.codex_cli.active.version).toBe('codex-cli explicit');
      expect(result.codex_cli.active.managed_opt_in).toBe(true);
      expect(result.codex_cli.managed.binary.path).toBe(managedBin);
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      if (originalManagedFlag === undefined) {
        delete process.env.CODEX_CLI_USE_MANAGED;
      } else {
        process.env.CODEX_CLI_USE_MANAGED = originalManagedFlag;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('probes relative CODEX_CLI_BIN from the process working directory', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-binary-relative-'));
    const repoRoot = join(tempHome, 'repo-root');
    const invocationRoot = join(tempHome, 'invocation-root');
    const invocationBinDir = join(invocationRoot, 'bin');
    await mkdir(repoRoot, { recursive: true });
    await mkdir(invocationBinDir, { recursive: true });
    const activeBin = await writeFakeCodexBinary(invocationBinDir, 'multi_agent stable true', {
      version: 'codex-cli relative'
    });
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(invocationRoot);
    try {
      process.env.CODEX_HOME = tempHome;
      process.env.CODEX_CLI_BIN = join('bin', 'codex');
      const result = runDoctor(repoRoot, { codexAppBundlePath: join(tempHome, 'missing-app-codex') });
      expect(result.codex_cli.active.command).toBe(join('bin', 'codex'));
      expect(result.codex_cli.active.path).toBe(activeBin);
      expect(result.codex_cli.active.version).toBe('codex-cli relative');
    } finally {
      cwdSpy.mockRestore();
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

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
  }, 15000);

  it('surfaces danger-no-sandbox permission profiles in normal doctor output', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-profile-advisory-'));
    const codexHome = join(tempDir, 'codex-home');
    await mkdir(codexHome, { recursive: true });
    await writeFile(
      join(codexHome, 'config.toml'),
      [
        'model = "gpt-5.5"',
        'review_model = "gpt-5.5"',
        'model_reasoning_effort = "xhigh"',
        'default_permissions = ":danger-no-sandbox"',
        '',
        '[agents]',
        'max_threads = 12',
        'max_depth = 4'
      ].join('\n'),
      'utf8'
    );
    process.env.CODEX_HOME = codexHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');

    try {
      const result = runDoctor(process.cwd());
      const summary = formatDoctorSummary(result).join('\n');

      expect(result.status).toBe('warning');
      expect(result.security_advisories).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'codex_config_danger_no_sandbox_profile',
          scope: 'local-only',
          severity: 'warning',
          details: expect.objectContaining({ default_permissions: ':danger-no-sandbox' })
        })
      ]));
      expect(summary).toContain('Sandbox/security advisories: warning');
      expect(summary).toContain('[codex_config_danger_no_sandbox_profile/local-only]');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('skips missing-config max_threads recommendation when Codex feature output enables multi_agent_v2', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-missing-config-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, 'multi_agent_v2 experimental true');
    try {
      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.config.status).toBe('missing');
      expect(result.codex_defaults.checks.max_threads.status).toBe('skipped');
      expect(result.codex_defaults.checks.max_threads.actual).toBeNull();
      expect(result.codex_defaults.checks.max_threads.detail).toContain('omit agents.max_threads');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('agents.max_threads: skipped');
      expect(summary).toContain('features.multi_agent_v2=true; omit agents.max_threads');
      expect(summary).not.toContain('agents.max_threads: advisory');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

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
  }, 15000);

  it('accepts access-verified local gpt-5.5 models', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const originalDebugModelsJson = process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, 'multi_agent experimental true');
    process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON = JSON.stringify({
      models: [{ slug: 'gpt-5.4' }, { slug: 'gpt-5.5' }]
    });
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]',
          'max_threads = 12'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('ok');
      expect(result.codex_defaults.checks.model.status).toBe('ok');
      expect(result.codex_defaults.checks.review_model.status).toBe('ok');
      expect(result.codex_defaults.checks.model.actual).toBe('gpt-5.5');
      expect(result.codex_defaults.checks.review_model.actual).toBe('gpt-5.5');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain(
        'model: ok (actual: gpt-5.5, expected: gpt-5.5 when ChatGPT-auth access is verified (fallback: gpt-5.4))'
      );
      expect(summary).toContain(
        'review_model: ok (actual: gpt-5.5, expected: gpt-5.5 when ChatGPT-auth access is verified (fallback: gpt-5.4))'
      );
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      if (originalDebugModelsJson === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON;
      } else {
        process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON = originalDebugModelsJson;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('accepts unmarked gpt-5.5 defaults when access is verified', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const originalDebugModelsJson = process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, 'multi_agent experimental true');
    process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON = JSON.stringify({
      models: [{ slug: 'gpt-5.5' }]
    });
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]',
          'max_threads = 12'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('ok');
      expect(result.codex_defaults.checks.model.status).toBe('ok');
      expect(result.codex_defaults.checks.review_model.status).toBe('ok');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain(
        'model: ok (actual: gpt-5.5, expected: gpt-5.5 when ChatGPT-auth access is verified (fallback: gpt-5.4))'
      );
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      if (originalDebugModelsJson === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON;
      } else {
        process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON = originalDebugModelsJson;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('flags configured gpt-5.5 models when model access evidence is missing', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const originalDebugModelsJson = process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, 'multi_agent experimental true');
    process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON = JSON.stringify({
      models: [{ slug: 'gpt-5.4' }]
    });
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.5"',
          'review_model = "gpt-5.5"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]',
          'max_threads = 12'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.checks.model.status).toBe('advisory');
      expect(result.codex_defaults.checks.review_model.status).toBe('advisory');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain(
        'Configured local ChatGPT-auth model gpt-5.5 is not verified by `codex debug models`'
      );
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      if (originalDebugModelsJson === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON;
      } else {
        process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON = originalDebugModelsJson;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('ignores stale legacy markers when portable fallback defaults are active', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const originalDebugModelsJson = process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, 'multi_agent experimental true');
    process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON = JSON.stringify({
      models: [{ slug: 'gpt-5.4' }]
    });
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[codex_orchestrator]',
          'local_model_opt_in = "gpt-5.5"',
          '',
          '[agents]',
          'max_threads = 12'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('ok');
      expect(result.codex_defaults.checks.model.status).toBe('ok');
      expect(result.codex_defaults.checks.review_model.status).toBe('ok');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('Codex defaults advisory: ok');
      expect(summary).not.toContain('local model opt-in');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      if (originalDebugModelsJson === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON;
      } else {
        process.env.CODEX_ORCHESTRATOR_DEBUG_MODELS_JSON = originalDebugModelsJson;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('skips max_threads recommendation when multi_agent_v2 is enabled and the key is absent', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[features]',
          'multi_agent_v2 = true',
          '',
          '[agents]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('ok');
      expect(result.codex_defaults.checks.max_threads.status).toBe('skipped');
      expect(result.codex_defaults.checks.max_threads.actual).toBeNull();

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('agents.max_threads: skipped');
      expect(summary).toContain('features.multi_agent_v2=true; omit agents.max_threads');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('flags max_threads as invalid when multi_agent_v2 is enabled and the key is present', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-invalid-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[features]',
          'multi_agent_v2 = true',
          '',
          '[agents]',
          'max_threads = 12'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.checks.max_threads.status).toBe('advisory');
      expect(result.codex_defaults.checks.max_threads.actual).toBe(12);

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('features.multi_agent_v2=true; remove agents.max_threads');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('flags max_threads as invalid under multi_agent_v2 even when the value is nonnumeric', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-string-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[features]',
          'multi_agent_v2 = true',
          '',
          '[agents]',
          'max_threads = "12"'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.checks.max_threads.status).toBe('advisory');
      expect(result.codex_defaults.checks.max_threads.actual).toBeNull();

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('features.multi_agent_v2=true; remove agents.max_threads');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('uses Codex feature output to apply multi_agent_v2 max_threads rules', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-feature-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, 'multi_agent_v2 experimental true');
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('ok');
      expect(result.codex_defaults.checks.max_threads.status).toBe('skipped');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('features.multi_agent_v2=true; omit agents.max_threads');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('classifies missing MultiAgentV2 thread cap as user-owned on 0.128+ when v2 is enabled', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-thread-cap-user-owned-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, 'multi_agent_v2 experimental true', {
      version: 'codex-cli 0.128.0'
    });
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[agents]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.checks.max_threads.status).toBe('skipped');
      expect(result.codex_defaults.checks.multi_agent_v2_thread_cap.status).toBe('user_owned');
      expect(result.codex_defaults.checks.multi_agent_v2_thread_cap.actual).toBeNull();
      expect(result.codex_defaults.checks.multi_agent_v2_thread_cap.path).toBe(
        'features.multi_agent_v2.max_concurrent_threads_per_session'
      );

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('MultiAgentV2 thread cap: user_owned');
      expect(summary).toContain('features.multi_agent_v2.max_concurrent_threads_per_session');
      expect(summary).toContain('CO does not seed');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('reports configured feature-scoped MultiAgentV2 thread cap and omits agents.max_threads', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-thread-cap-configured-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[features.multi_agent_v2]',
          'enabled = true',
          'max_concurrent_threads_per_session = 7',
          '',
          '[agents]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.checks.max_threads.status).toBe('skipped');
      expect(result.codex_defaults.checks.multi_agent_v2_thread_cap.status).toBe('configured');
      expect(result.codex_defaults.checks.multi_agent_v2_thread_cap.actual).toBe(7);
      expect(result.codex_defaults.status).toBe('ok');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('MultiAgentV2 thread cap: configured (actual: 7');
      expect(summary).toContain('user-owned MultiAgentV2 cap configured');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('does not treat top-level MultiAgentV2 settings as feature enablement', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-top-level-settings-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[multi_agent_v2]',
          'enabled = true',
          'max_concurrent_threads_per_session = 7',
          '',
          '[agents]',
          'max_threads = 12'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.checks.max_threads.status).toBe('ok');
      expect(result.codex_defaults.checks.max_threads.actual).toBe(12);
      expect(result.codex_defaults.checks.multi_agent_v2_thread_cap.status).toBe('not_applicable');
      expect(result.codex_defaults.checks.multi_agent_v2_thread_cap.path).toBe(
        'features.multi_agent_v2.max_concurrent_threads_per_session'
      );

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('agents.max_threads: ok (actual: 12, expected >= 12)');
      expect(summary).toContain('MultiAgentV2 thread cap: not_applicable');
      expect(summary).not.toContain('features.multi_agent_v2=true; omit agents.max_threads');
      expect(summary).not.toContain('features.multi_agent_v2=true; remove agents.max_threads');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('advises when a configured MultiAgentV2 thread cap is invalid', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-thread-cap-invalid-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[features.multi_agent_v2]',
          'enabled = true',
          'max_concurrent_threads_per_session = "12"',
          '',
          '[agents]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.checks.multi_agent_v2_thread_cap.status).toBe('advisory');
      expect(result.codex_defaults.status).toBe('advisory');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('MultiAgentV2 thread cap: advisory');
      expect(summary).toContain('must be a positive integer thread cap');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('surfaces configured removed feature keys as Codex defaults advisory drift', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-removed-features-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(
      tempHome,
      [
        'js_repl removed false',
        'custom_removed removed false',
        'multi_agent_v2 experimental false'
      ].join('\n')
    );
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[features]',
          'js_repl = true',
          'custom_removed = false',
          'multi_agent_v2 = false',
          '',
          '[agents]',
          'max_threads = 12',
          'max_depth = 4'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.removed_features).toEqual({
        status: 'advisory',
        configured: ['custom_removed', 'js_repl'],
        co_managed_cleanup: ['js_repl'],
        detail: 'configured removed keys: custom_removed, js_repl; defaults cleanup will prune known CO-managed keys: js_repl'
      });

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('removed feature keys: advisory');
      expect(summary).toContain('Configured removed Codex feature keys detected in [features]: custom_removed, js_repl.');
      expect(summary).toContain(
        'Run `codex-orchestrator codex defaults --yes` to prune known CO-managed removed feature keys: js_repl.'
      );
      expect(summary).toContain(
        'Inspect non-CO-managed removed feature keys manually; defaults cleanup preserves them: custom_removed.'
      );
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('keeps max_threads baseline when the live feature probe explicitly disables multi_agent_v2', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-false-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, 'multi_agent_v2 experimental false', {
      stderr: 'invalid config: agents.max_threads is rejected when features.multi_agent_v2=true'
    });
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          'model = "gpt-5.4"',
          'review_model = "gpt-5.4"',
          'model_reasoning_effort = "xhigh"',
          '',
          '[features]',
          'multi_agent_v2 = true',
          '',
          '[agents]',
          'max_threads = 12'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('ok');
      expect(result.codex_defaults.checks.max_threads.status).toBe('ok');
      expect(result.codex_defaults.checks.max_threads.actual).toBe(12);

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('agents.max_threads: ok (actual: 12, expected >= 12)');
      expect(summary).not.toContain('features.multi_agent_v2=true; omit agents.max_threads');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('flags max_threads when Codex rejects the current config before feature flags can be listed', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-multi-agent-v2-reject-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempHome, '', {
      exitCode: 1,
      stderr: 'invalid config: agents.max_threads is rejected when features.multi_agent_v2=true'
    });
    try {
      await writeFile(join(tempHome, 'config.toml'), ['[agents]', 'max_threads = 12'].join('\n'), 'utf8');

      const result = runDoctor(process.cwd());
      expect(result.codex_defaults.status).toBe('advisory');
      expect(result.codex_defaults.checks.max_threads.status).toBe('advisory');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

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

  it('flags wrapper-based delegation config as warning', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
    try {
      await writeFile(
        join(tempHome, 'config.toml'),
        ['mcp_servers."delegation" = { command = "codex-orchestrator", args = ["delegate-server"] }'].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      expect(result.delegation.status).toBe('warning');
      expect(result.delegation.config.status).toBe('ok');
      expect(result.delegation.transport.kind).toBe('wrapper');
      expect(result.delegation.startup.status).toBe('skipped');
      expect(formatDoctorSummary(result).join('\n')).toContain('Delegation: warning');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  }, 15000);

  it('reports direct-dist delegation readiness and initialize latency', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-direct-dist-repo-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');
    try {
      const fakeDistEntrypoint = await writeFakeDelegationDistEntrypoint(tempRepo);
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          '[mcp_servers.delegation]',
          `command = "${process.execPath.replace(/\\/g, '\\\\')}"`,
          `args = ["${fakeDistEntrypoint.replace(/\\/g, '\\\\')}", "delegate-server"]`
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(tempRepo);
      expect(result.delegation.status).not.toBe('missing-config');
      expect(result.delegation.transport.kind).toBe('direct-dist');
      expect(result.delegation.startup.status).not.toBe('failed');
      expect(result.delegation.startup.latency_ms).not.toBeNull();
      expect(formatDoctorSummary(result).join('\n')).toContain('transport: safe (direct-dist)');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      await rm(tempHome, { recursive: true, force: true });
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  it('degrades delegation direct-transport guidance instead of throwing when dist is unavailable', () => {
    const guidance = buildDelegationDirectTransportGuidance(() => {
      throw new Error('Unable to locate packaged program. Expected /tmp/repo/dist/bin/codex-orchestrator.js.');
    });

    expect(guidance).toContain('Direct dist transport unavailable until dist is built:');
    expect(guidance).toContain('/tmp/repo/dist/bin/codex-orchestrator.js');
  });

  it('does not advertise doctor --apply as the quick fix when stale delegation processes are the only issue', () => {
    const guidance = buildDelegationEnablementGuidance({
      configStatus: 'ok',
      transportStatus: 'safe',
      directTransportGuidance:
        'Direct dist transport: /usr/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server --repo <path>'
    });

    expect(guidance).not.toContain('Quick fix: codex-orchestrator doctor --apply --yes');
    expect(guidance).toContain('Run: codex-orchestrator delegation cleanup-stale --yes');
  });

  it('does not advertise doctor --apply when startup is slow but delegation is already configured safely', () => {
    const guidance = buildDelegationEnablementGuidance({
      configStatus: 'ok',
      transportStatus: 'safe',
      directTransportGuidance:
        'Direct dist transport: /usr/bin/node /repo/dist/bin/codex-orchestrator.js delegate-server --repo <path>'
    });

    expect(guidance).not.toContain('Quick fix: codex-orchestrator doctor --apply --yes');
  });

  it('keeps top-level doctor status ok when delegation is advisory but the rest of the install is healthy', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const originalCodexCliBin = process.env.CODEX_CLI_BIN;
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
    const tempHome = await mkdtemp(join(tmpdir(), 'doctor-advisory-home-'));
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-advisory-repo-'));
    process.env.CODEX_HOME = tempHome;
    process.env.CODEX_CLI_BIN = join(tempHome, 'missing-codex');

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
          'args = ["-y", "chrome-devtools-mcp@latest"]',
          '',
          '[mcp_servers.delegation]',
          'command = "codex-orchestrator"',
          'args = ["delegate-server"]'
        ].join('\n'),
        'utf8'
      );

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
      expect(result.delegation.status).toBe('warning');
      expect(result.status).toBe('ok');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      if (originalCodexCliBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = originalCodexCliBin;
      }
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      await rm(tempHome, { recursive: true, force: true });
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  it('keeps overall doctor status at warning when providers are incomplete', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-providers-incomplete-'));
    try {
      await withMissingCodexHome(async (tempHome) => {
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
      });
    } finally {
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

      let result!: ReturnType<typeof runDoctor>;
      await withMissingCodexHome(async () => {
        result = runDoctor(tempRepo);
      });
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

      let result!: ReturnType<typeof runDoctor>;
      await withMissingCodexHome(async () => {
        result = runDoctor(nestedDir);
      });
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

  it('resolves provider readiness from seeded .codex repo roots when doctor runs in a nested directory', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-seeded-root-'));
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

      let result!: ReturnType<typeof runDoctor>;
      await withMissingCodexHome(async () => {
        result = runDoctor(nestedDir);
      });
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
  }, 15000);

  it('prefers task roots over nested provider templates when both signals exist', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-template-root-'));
    const templateDir = join(tempRepo, 'templates', 'codex');
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
      await mkdir(templateDir, { recursive: true });

      const repoProvidersDir = join(tempRepo, '.codex', 'providers');
      await mkdir(repoProvidersDir, { recursive: true });
      await writeFile(join(repoProvidersDir, 'README.md'), '# Providers', 'utf8');
      await writeFile(join(repoProvidersDir, 'provider.env.example'), 'CO_LINEAR_API_TOKEN=', 'utf8');
      await writeFile(
        join(repoProvidersDir, 'control.example.json'),
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

      const templateProvidersDir = join(templateDir, '.codex', 'providers');
      await mkdir(templateProvidersDir, { recursive: true });
      await writeFile(join(templateProvidersDir, 'README.md'), '# Template Providers', 'utf8');
      await writeFile(join(templateProvidersDir, 'provider.env.example'), 'CO_LINEAR_API_TOKEN=', 'utf8');
      await writeFile(
        join(templateProvidersDir, 'control.example.json'),
        JSON.stringify(
          {
            feature_toggles: {
              dispatch_pilot: {
                enabled: true,
                source: {
                  live: true,
                  workspace_id: 'template-workspace'
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
      process.env.CO_TELEGRAM_POLLING_ENABLED = 'true';
      process.env.CO_TELEGRAM_BOT_TOKEN = 'bot-token';
      process.env.CO_TELEGRAM_ALLOWED_CHAT_IDS = '12345,67890';
      process.env.CO_TELEGRAM_ENABLE_MUTATIONS = 'true';
      process.env.CO_TELEGRAM_PUSH_ENABLED = 'true';

      const result = runDoctor(templateDir);
      expect(result.providers.status).toBe('ok');
      expect(result.providers.repo_examples.root).toBe(join(tempRepo, '.codex', 'providers'));
      expect(result.providers.control_policy.status).toBe('ok');
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
  }, 15000);

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
  }, 15000);

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

  it('treats enabled dispatch pilot without a provider as invalid', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-providers-missing-provider-'));

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
                  live: true,
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

      const result = runDoctor(tempRepo);
      expect(result.providers.status).toBe('advisory');
      expect(result.providers.control_policy.status).toBe('invalid');
      expect(result.providers.control_policy.detail).toContain(
        'dispatch_pilot.source.provider is required when dispatch_pilot.enabled=true'
      );

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('Providers: advisory');
      expect(summary).toContain('control policy: invalid');
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
                    sourceProvider: 'Linear_Advisory',
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
      expect(result.providers.linear.dispatch_pilot_provider).toBe('linear');
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

  it('keeps Telegram incomplete when transport is allowed but mutations are disabled', async () => {
    const tempRepo = await mkdtemp(join(tmpdir(), 'doctor-telegram-mutations-'));
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
      process.env.CO_TELEGRAM_ENABLE_MUTATIONS = 'false';
      process.env.CO_TELEGRAM_PUSH_ENABLED = 'true';

      const result = runDoctor(tempRepo);
      expect(result.providers.status).toBe('advisory');
      expect(result.providers.telegram.telegram_transport_allowed).toBe(true);
      expect(result.providers.telegram.mutations_enabled).toBe(false);
      expect(result.providers.telegram.status).toBe('incomplete');

      const summary = formatDoctorSummary(result).join('\n');
      expect(summary).toContain('Providers: advisory');
      expect(summary).toContain('Telegram: incomplete');
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
        'review_model: advisory (actual: gpt-5.3-codex, expected: gpt-5.5 when ChatGPT-auth access is verified (fallback: gpt-5.4))'
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

  it('prints redacted auth provenance in doctor cloud preflight output', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-auth-'));
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
        env: buildDoctorCloudEnv({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_123',
          CODEX_CLOUD_BRANCH: 'refs/heads/linear/co-200',
          CODEX_AUTH_PROFILE: 'operator-profile',
          OPENAI_ACCOUNT_ID: 'acct_raw_123',
          CODEX_AUTH_PROVENANCE_FINGERPRINT_KEY: TEST_AUTH_PROVENANCE_FINGERPRINT_KEY,
          OPENAI_API_KEY: 'sk-test-redacted'
        })
      });
      const summary = formatDoctorCloudPreflightSummary(result).join('\n');
      expect(result.details.auth_provenance).toMatchObject({
        provider_kind: 'codex_cloud',
        active_profile_fingerprint: testFingerprint('operator-profile'),
        active_account_fingerprint: testFingerprint('acct_raw_123'),
        cloud_env_id: 'env_123',
        cloud_branch: 'linear/co-200',
        credential_source: 'env:OPENAI_API_KEY',
        auth_freshness: 'env_credential_present'
      });
      expect(runCloudPreflightSpy).toHaveBeenCalledOnce();
      const [request] = runCloudPreflightSpy.mock.calls[0] ?? [];
      expect(request?.repoRoot).toBe(tempDir);
      expect(request?.codexBin).toBe(fakeCodexBin);
      expect(request?.branch).toBe('refs/heads/linear/co-200');
      expect(summary).toContain('credential source: env:OPENAI_API_KEY');
      expect(summary).toContain(`profile fingerprint: ${testFingerprint('operator-profile')}`);
      expect(summary).toContain(`account fingerprint: ${testFingerprint('acct_raw_123')}`);
      expect(summary).not.toContain('operator-profile');
      expect(summary).not.toContain('acct_raw_123');
      expect(summary).not.toContain('sk-test-redacted');
    } finally {
      runCloudPreflightSpy.mockRestore();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('reports danger-full-access as a local-only advisory without failing cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-sandbox-advisory-'));
    const codexHome = join(tempDir, 'codex-home');
    await mkdir(codexHome, { recursive: true });
    await writeFile(join(codexHome, 'config.toml'), 'sandbox_mode = "danger-full-access"\n', 'utf8');
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');

    try {
      const result = await runDoctorCloudPreflight({
        cwd: process.cwd(),
        env: buildDoctorCloudEnv({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_123',
          CODEX_HOME: codexHome
        })
      });
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.security_advisories).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'codex_config_danger_full_access',
          scope: 'local-only',
          severity: 'warning',
          details: expect.objectContaining({ sandbox_mode: 'danger-full-access' })
        })
      ]));
      expect(formatDoctorCloudPreflightSummary(result).join('\n')).toContain(
        '[codex_config_danger_full_access/local-only]'
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('reports danger-no-sandbox permission profiles as local-only advisories without failing cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-profile-advisory-'));
    const codexHome = join(tempDir, 'codex-home');
    await mkdir(codexHome, { recursive: true });
    await writeFile(join(codexHome, 'config.toml'), 'default_permissions = ":danger-no-sandbox"\n', 'utf8');
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');

    try {
      const result = await runDoctorCloudPreflight({
        cwd: process.cwd(),
        env: buildDoctorCloudEnv({
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_123',
          CODEX_HOME: codexHome
        })
      });
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.security_advisories).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'codex_config_danger_no_sandbox_profile',
          scope: 'local-only',
          severity: 'warning',
          details: expect.objectContaining({ default_permissions: ':danger-no-sandbox' })
        })
      ]));
      expect(formatDoctorCloudPreflightSummary(result).join('\n')).toContain(
        '[codex_config_danger_no_sandbox_profile/local-only]'
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('classifies WSL1 bubblewrap risk as local-only without warning on WSL2', () => {
    const wsl1 = inspectCodexSandboxSecurityAdvisories({
      env: buildDoctorCloudEnv({ CODEX_HOME: join(tmpdir(), 'missing-codex-home') }),
      platform: 'linux',
      osRelease: '4.4.0-19041-Microsoft'
    });
    expect(wsl1).toEqual([
      expect.objectContaining({
        code: 'wsl1_bubblewrap_unsupported',
        scope: 'local-only',
        severity: 'warning'
      })
    ]);

    const wsl2 = inspectCodexSandboxSecurityAdvisories({
      env: buildDoctorCloudEnv({ CODEX_HOME: join(tmpdir(), 'missing-codex-home') }),
      platform: 'linux',
      osRelease: '5.15.90.1-microsoft-standard-WSL2'
    });
    expect(wsl2).toHaveLength(0);
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
          [CONFIG_AUTHORITY_MODE_ENV_KEY]: '',
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
          [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'downstream-compatibility',
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
