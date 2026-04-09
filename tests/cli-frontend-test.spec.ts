import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { REPO_CONFIG_PATH_ENV_KEY } from '../orchestrator/src/cli/config/userConfig.js';
import { sanitizeProviderOverrideEnv } from '../orchestrator/src/cli/utils/providerOverrideEnv.js';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const WORKSPACE_ROOT = process.cwd();
const CLI_ENTRY = join(WORKSPACE_ROOT, 'bin', 'codex-orchestrator.ts');
const DIST_CLI_ENTRY = join(WORKSPACE_ROOT, 'dist', 'bin', 'codex-orchestrator.js');
const SHIPPED_ORCHESTRATOR_CONFIG_PATH = join(WORKSPACE_ROOT, 'codex.orchestrator.json');
const TS_NODE_ESM_LOADER_PATH = require.resolve('ts-node/esm');
const SHIPPED_FRONTEND_TESTING_RUNNER_RELATIVE_PATH = join(
  'dist',
  'orchestrator',
  'src',
  'cli',
  'frontendTestingRunner.js'
);
const TEST_TIMEOUT = 60_000;
const RUNTIME_TEST_ENV_KEYS = [
  'CODEX_ORCHESTRATOR_RUNTIME_MODE',
  'CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE',
  'CODEX_RUNTIME_MODE',
  'CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED',
  REPO_CONFIG_PATH_ENV_KEY
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
let frontendTestingPackageRootPromise: Promise<string> | null = null;
let compiledFrontendTestingPackageRoot: string | null = null;

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

afterAll(async () => {
  if (compiledFrontendTestingPackageRoot) {
    await rm(compiledFrontendTestingPackageRoot, { recursive: true, force: true });
    compiledFrontendTestingPackageRoot = null;
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
  const distCliStat = await stat(DIST_CLI_ENTRY).catch(() => null);
  const cliArgs = distCliStat?.isFile()
    ? [DIST_CLI_ENTRY, 'frontend-test', '--format', 'json', ...extraArgs]
    : ['--loader', 'ts-node/esm', CLI_ENTRY, 'frontend-test', '--format', 'json', ...extraArgs];
  const { stdout } = await execFileAsync(
    process.execPath,
    cliArgs,
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

async function writeFrontendTestingFixtureConfig(
  rootDir: string,
  extraStageEnv: Record<string, string> = {}
): Promise<void> {
  const shippedConfig = JSON.parse(await readFile(SHIPPED_ORCHESTRATOR_CONFIG_PATH, 'utf8')) as {
    pipelines?: Array<{
      id?: string;
      title?: string;
      description?: string;
      tags?: string[];
      guardrailsRequired?: boolean;
      stages?: Array<Record<string, unknown>>;
    }>;
  };
  const frontendTestingPipeline = shippedConfig.pipelines?.find((pipeline) => pipeline.id === 'frontend-testing');
  if (!frontendTestingPipeline) {
    throw new Error('Unable to locate shipped frontend-testing pipeline in codex.orchestrator.json');
  }
  const config = {
    pipelines: [
      JSON.parse(JSON.stringify(frontendTestingPipeline)) as {
        id?: string;
        title?: string;
        description?: string;
        tags?: string[];
        guardrailsRequired?: boolean;
        stages?: Array<Record<string, unknown>>;
      }
    ]
  };
  const commandStages = config.pipelines[0]?.stages;
  const frontendTestingStage = Array.isArray(commandStages)
    ? commandStages.find((stage) => stage.id === 'frontend-testing')
    : null;
  if (!frontendTestingStage || frontendTestingStage.kind !== 'command') {
    throw new Error('Unable to locate the frontend-testing command stage in the shipped pipeline');
  }
  const existingEnv = isRecord(frontendTestingStage.env) ? frontendTestingStage.env : {};
  const frontendTestingPackageRoot = await resolveFrontendTestingPackageRoot();
  frontendTestingStage.env = {
    ...existingEnv,
    ...extraStageEnv,
    CODEX_ORCHESTRATOR_PACKAGE_ROOT: frontendTestingPackageRoot
  };
  await writeFile(join(rootDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  await writeGuardScriptProxy(rootDir, 'spec-guard.mjs');
  await writeGuardScriptProxy(rootDir, 'delegation-guard.mjs');
}

async function resolveFrontendTestingPackageRoot(): Promise<string> {
  if (!frontendTestingPackageRootPromise) {
    frontendTestingPackageRootPromise = buildFrontendTestingPackageRoot().catch((error) => {
      frontendTestingPackageRootPromise = null;
      throw error;
    });
  }
  return await frontendTestingPackageRootPromise;
}

async function buildFrontendTestingPackageRoot(): Promise<string> {
  const packageRoot = await realpath(await mkdtemp(join(tmpdir(), 'frontend-test-package-root-')));
  try {
    const runnerPath = join(packageRoot, SHIPPED_FRONTEND_TESTING_RUNNER_RELATIVE_PATH);
    await mkdir(dirname(runnerPath), { recursive: true });
    await writeFile(
      runnerPath,
      [
        'const { spawn } = require("node:child_process");',
        'const process = require("node:process");',
        `const sourceRunner = ${JSON.stringify(join(WORKSPACE_ROOT, 'orchestrator', 'src', 'cli', 'frontendTestingRunner.ts'))};`,
        `const tsNodeLoader = ${JSON.stringify(TS_NODE_ESM_LOADER_PATH)};`,
        'const childEnv = { ...process.env, CODEX_FRONTEND_TEST_RUNNER_ENTRY: __filename };',
        'const child = spawn(process.execPath, ["--loader", tsNodeLoader, sourceRunner], {',
        `  cwd: ${JSON.stringify(WORKSPACE_ROOT)},`,
        '  env: childEnv,',
        "  stdio: 'inherit'",
        '});',
        'child.once("error", (error) => {',
        '  console.error(error instanceof Error ? error.message : String(error));',
        '  process.exit(1);',
        '});',
        'child.once("exit", (code) => {',
        '  process.exit(code ?? 1);',
        '});'
      ].join('\n'),
      'utf8'
    );
    compiledFrontendTestingPackageRoot = packageRoot;
    return packageRoot;
  } catch (error) {
    await rm(packageRoot, { recursive: true, force: true });
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function writeGuardScriptProxy(rootDir: string, scriptName: 'delegation-guard.mjs' | 'spec-guard.mjs'): Promise<void> {
  const proxyPath = join(rootDir, 'scripts', scriptName);
  await mkdir(dirname(proxyPath), { recursive: true });
  await writeFile(
    proxyPath,
    [
      "import { spawn } from 'node:child_process';",
      "import process from 'node:process';",
      `const target = ${JSON.stringify(join(WORKSPACE_ROOT, 'scripts', scriptName))};`,
      'const child = spawn(process.execPath, [target, ...process.argv.slice(2)], {',
      '  cwd: process.cwd(),',
      '  env: process.env,',
      "  stdio: 'inherit'",
      '});',
      "child.once('error', (error) => {",
      "  console.error(error instanceof Error ? error.message : String(error));",
      '  process.exit(1);',
      '});',
      "child.once('exit', (code) => {",
      '  process.exit(code ?? 1);',
      '});'
    ].join('\n'),
    'utf8'
  );
}

async function writeFakeCodexBinary(dir: string): Promise<string> {
  const binPath = join(dir, 'codex');
  const logPath = join(dir, 'codex.log');
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      '{',
      `  printf "args=%s\\n" "$*"`,
      `  printf "devtools=%s\\n" "\${CODEX_REVIEW_DEVTOOLS:-}"`,
      `  printf "package_root=%s\\n" "\${CODEX_ORCHESTRATOR_PACKAGE_ROOT:-}"`,
      `  printf "runner_entry=%s\\n" "\${CODEX_FRONTEND_TEST_RUNNER_ENTRY:-}"`,
      `} >> ${JSON.stringify(logPath)}`,
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
    ['[mcp_servers.chrome-devtools]', 'command = "npx"', 'args = ["-y", "chrome-devtools-mcp@latest"]'].join(
      '\n'
    ),
    'utf8'
  );
  return codexHome;
}

describe('codex-orchestrator frontend-test', () => {
  it('selects the default frontend-testing pipeline', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const codexLogPath = join(tempDir, 'codex.log');
    await writeFrontendTestingFixtureConfig(tempDir);
    const fakeCodex = await writeFakeCodexBinary(tempDir);

    const { manifestPath } = await runFrontendTest([], {
      CODEX_CLI_BIN: fakeCodex
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
    expect(codexLog).toContain('devtools=');
    expect(codexLog).toContain(`package_root=${await resolveFrontendTestingPackageRoot()}`);
    expect(codexLog).toContain(
      `runner_entry=${join(await resolveFrontendTestingPackageRoot(), SHIPPED_FRONTEND_TESTING_RUNNER_RELATIVE_PATH)}`
    );
  }, TEST_TIMEOUT);

  it('selects the devtools pipeline when requested', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const codexLogPath = join(tempDir, 'codex.log');
    await writeFrontendTestingFixtureConfig(tempDir);
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const codexHome = await provisionDevtoolsCodexHome(tempDir);

    const { manifestPath } = await runFrontendTest(['--devtools'], {
      CODEX_CLI_BIN: fakeCodex,
      CODEX_HOME: codexHome
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
    expect(codexLog).toContain('args=-c mcp_servers.chrome-devtools.enabled=true exec ');
    expect(codexLog).toContain('devtools=1');
    expect(codexLog).toContain(`package_root=${await resolveFrontendTestingPackageRoot()}`);
    expect(codexLog).toContain(
      `runner_entry=${join(await resolveFrontendTestingPackageRoot(), SHIPPED_FRONTEND_TESTING_RUNNER_RELATIVE_PATH)}`
    );
  }, TEST_TIMEOUT);

  it('sanitizes ambient appserver runtime env before launching the frontend-testing CLI in-suite', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    await writeFrontendTestingFixtureConfig(tempDir);
    const fakeCodex = await writeFakeCodexBinary(tempDir);

    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE = 'appserver';
    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE = 'appserver';
    process.env.CODEX_RUNTIME_MODE = 'appserver';

    const result = await runFrontendTest([], {
      CODEX_CLI_BIN: fakeCodex
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
