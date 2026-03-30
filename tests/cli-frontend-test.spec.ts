import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { sanitizeProviderOverrideEnv } from '../orchestrator/src/cli/utils/providerOverrideEnv.js';

const execFileAsync = promisify(execFile);

const CLI_ENTRY = join(process.cwd(), 'bin', 'codex-orchestrator.ts');
const TEST_TIMEOUT = 30000;
const RUNTIME_TEST_ENV_KEYS = [
  'CODEX_ORCHESTRATOR_RUNTIME_MODE',
  'CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE',
  'CODEX_RUNTIME_MODE'
] as const;
const ISOLATED_RUNTIME_TEST_ENV = {
  CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli',
  CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'cli',
  CODEX_RUNTIME_MODE: 'cli'
} satisfies NodeJS.ProcessEnv;
const ORIGINAL_RUNTIME_TEST_ENV = {
  CODEX_ORCHESTRATOR_RUNTIME_MODE: process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE,
  CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE,
  CODEX_RUNTIME_MODE: process.env.CODEX_RUNTIME_MODE
} satisfies Partial<NodeJS.ProcessEnv>;

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
  for (const [key, value] of Object.entries(ORIGINAL_RUNTIME_TEST_ENV)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
});

function buildIsolatedFrontendTestEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const mergedEnv = sanitizeProviderOverrideEnv({
    ...process.env,
    ...extraEnv,
    CODEX_ORCHESTRATOR_ROOT: tempDir as string,
    CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir as string, '.runs'),
    CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir as string, 'out'),
    MCP_RUNNER_TASK_ID: 'frontend-test'
  });
  for (const key of RUNTIME_TEST_ENV_KEYS) {
    delete mergedEnv[key];
  }
  return {
    // Keep the spawned CLI run deterministic even when neighboring tests mutate
    // runtime-mode env vars in the shared Vitest process.
    ...mergedEnv,
    ...ISOLATED_RUNTIME_TEST_ENV
  };
}

function buildRawFrontendTestEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const mergedEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...extraEnv,
    CODEX_ORCHESTRATOR_ROOT: tempDir as string,
    CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir as string, '.runs'),
    CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir as string, 'out'),
    CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: '',
    CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '',
    MCP_RUNNER_TASK_ID: 'frontend-test'
  };
  for (const key of RUNTIME_TEST_ENV_KEYS) {
    delete mergedEnv[key];
  }
  return {
    ...mergedEnv,
    ...ISOLATED_RUNTIME_TEST_ENV
  };
}

async function runFrontendTest(
  extraArgs: string[],
  extraEnv: NodeJS.ProcessEnv = {}
): Promise<{ manifestPath: string; runtimeMode: string | null; runtimeProvider: string | null }> {
  return await runFrontendTestWithEnv(buildIsolatedFrontendTestEnv(extraEnv), extraArgs);
}

async function runFrontendTestWithRawEnv(
  extraArgs: string[],
  extraEnv: NodeJS.ProcessEnv = {}
): Promise<{ manifestPath: string; runtimeMode: string | null; runtimeProvider: string | null }> {
  return await runFrontendTestWithEnv(buildRawFrontendTestEnv(extraEnv), extraArgs);
}

async function runFrontendTestWithEnv(
  env: NodeJS.ProcessEnv,
  extraArgs: string[]
): Promise<{ manifestPath: string; runtimeMode: string | null; runtimeProvider: string | null }> {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--loader', 'ts-node/esm', CLI_ENTRY, 'frontend-test', '--format', 'json', ...extraArgs],
    {
      env,
      timeout: TEST_TIMEOUT
    }
  );
  const trimmed = stdout.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) {
    throw new Error(`Unable to locate JSON payload in stdout: ${trimmed}`);
  }
  const payload = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
    manifest: string;
    runtime_mode?: string | null;
    runtime_provider?: string | null;
  };
  return {
    manifestPath: join(tempDir as string, payload.manifest),
    runtimeMode: payload.runtime_mode ?? null,
    runtimeProvider: payload.runtime_provider ?? null
  };
}

async function writeFakeCodexBinary(dir: string, logPath: string): Promise<string> {
  const binPath = join(dir, 'codex');
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ -n "$CODEX_TEST_LOG" ]; then',
      '  {',
      '    printf "args=%s\\n" "$*"',
      '    printf "devtools=%s\\n" "${CODEX_REVIEW_DEVTOOLS:-}"',
      '  } >> "$CODEX_TEST_LOG"',
      'fi',
      'exit 0'
    ].join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

async function provisionDevtoolsCodexHome(rootDir: string): Promise<string> {
  const codexHome = join(rootDir, '.codex');
  const skillDir = join(codexHome, 'skills', 'chrome-devtools');
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '# devtools skill\n', 'utf8');
  await writeFile(
    join(codexHome, 'config.toml'),
    [
      '[mcp_servers.chrome-devtools]',
      'command = "npx"',
      'args = ["-y", "chrome-devtools-mcp@latest"]'
    ].join('\n'),
    'utf8'
  );
  return codexHome;
}

describe('codex-orchestrator frontend-test', () => {
  it('selects the default frontend-testing pipeline', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const codexLogPath = join(tempDir, 'codex.log');
    const fakeCodex = await writeFakeCodexBinary(tempDir, codexLogPath);

    const { manifestPath } = await runFrontendTest([], {
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_LOG: codexLogPath
    });
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      pipeline_id?: string;
      status?: string;
      commands?: Array<{ command?: string }>;
    };
    expect(manifest.pipeline_id).toBe('frontend-testing');
    expect(manifest.status).toBe('succeeded');
    expect(manifest.commands?.[0]?.command).toContain('frontendTestingRunner.js');

    const codexLog = await readFile(codexLogPath, 'utf8');
    expect(codexLog).toContain('args=exec You are running frontend testing for the current project.');
  }, TEST_TIMEOUT);

  it('selects the devtools pipeline when requested', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const codexLogPath = join(tempDir, 'codex.log');
    const fakeCodex = await writeFakeCodexBinary(tempDir, codexLogPath);
    const codexHome = await provisionDevtoolsCodexHome(tempDir);

    const { manifestPath } = await runFrontendTest(['--devtools'], {
      CODEX_CLI_BIN: fakeCodex,
      CODEX_HOME: codexHome,
      CODEX_TEST_LOG: codexLogPath
    });
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      pipeline_id?: string;
      status?: string;
    };
    expect(manifest.pipeline_id).toBe('frontend-testing');
    expect(manifest.status).toBe('succeeded');

    const codexLog = await readFile(codexLogPath, 'utf8');
    expect(codexLog).toContain('args=-c mcp_servers.chrome-devtools.enabled=true exec ');
    expect(codexLog).toContain('devtools=1');
  }, TEST_TIMEOUT);

  it('sanitizes ambient appserver runtime env before launching the frontend-testing CLI in-suite', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const codexLogPath = join(tempDir, 'codex.log');
    const fakeCodex = await writeFakeCodexBinary(tempDir, codexLogPath);

    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE = 'appserver';
    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE = 'appserver';
    process.env.CODEX_RUNTIME_MODE = 'appserver';

    const result = await runFrontendTest([], {
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_LOG: codexLogPath
    });

    expect(result.runtimeMode).toBe('cli');
    expect(result.runtimeProvider).toBe('CliRuntimeProvider');
  }, TEST_TIMEOUT);

  it('sanitizes ambient provider config env in the real frontend-test CLI', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const providerConfigPath = join(tempDir, 'provider.json');
    const workspaceConfig = {
      pipelines: [
        {
          id: 'frontend-testing',
          title: 'Frontend Testing',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'echo',
              title: 'echo',
              command: "node -e \"console.log('ok')\""
            }
          ]
        }
      ]
    };
    const providerConfig = {
      defaultPipeline: 'provider-linear-worker',
      pipelines: [
        {
          id: 'provider-linear-worker',
          title: 'Provider Worker',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'provider-only',
              title: 'provider-only',
              command: "node -e \"console.log('provider')\""
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(workspaceConfig, null, 2)}\n`);
    await writeFile(providerConfigPath, `${JSON.stringify(providerConfig, null, 2)}\n`);

    const { manifestPath } = await runFrontendTestWithRawEnv([], {
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
      CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host',
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
      CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH: providerConfigPath,
      CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT: '/tmp/provider-package-root',
      CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: providerConfigPath,
      CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1',
      CODEX_ORCHESTRATOR_PACKAGE_ROOT: '/tmp/provider-package-root'
    });
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { pipeline_id?: string };
    expect(manifest.pipeline_id).toBe('frontend-testing');
  }, TEST_TIMEOUT);
});
