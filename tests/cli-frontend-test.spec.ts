import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

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
  const mergedEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...extraEnv,
    CODEX_ORCHESTRATOR_ROOT: tempDir as string,
    CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir as string, '.runs'),
    CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir as string, 'out'),
    MCP_RUNNER_TASK_ID: 'frontend-test'
  };
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

async function runFrontendTest(
  extraArgs: string[],
  extraEnv: NodeJS.ProcessEnv = {}
): Promise<{ manifestPath: string; runtimeMode: string | null; runtimeProvider: string | null }> {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--loader', 'ts-node/esm', CLI_ENTRY, 'frontend-test', '--format', 'json', ...extraArgs],
    {
      env: buildIsolatedFrontendTestEnv(extraEnv),
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

describe('codex-orchestrator frontend-test', () => {
  it('selects the default frontend-testing pipeline', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const config = {
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
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);

    const { manifestPath } = await runFrontendTest([]);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { pipeline_id?: string };
    expect(manifest.pipeline_id).toBe('frontend-testing');
  }, TEST_TIMEOUT);

  it('selects the devtools pipeline when requested', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const markerPath = join(tempDir, 'devtools.txt');
    const config = {
      pipelines: [
        {
          id: 'frontend-testing',
          title: 'Frontend Testing',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'mark-devtools',
              title: 'mark-devtools',
              command: `node -e "require('fs').writeFileSync('${markerPath}', process.env.CODEX_REVIEW_DEVTOOLS ?? '')"`
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);

    const { manifestPath } = await runFrontendTest(['--devtools']);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { pipeline_id?: string };
    expect(manifest.pipeline_id).toBe('frontend-testing');
    const marker = await readFile(markerPath, 'utf8');
    expect(marker.trim()).toBe('1');
  }, TEST_TIMEOUT);

  it('sanitizes ambient appserver runtime env before launching the frontend-testing CLI in-suite', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-cli-'));
    const config = {
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
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);

    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE = 'appserver';
    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE = 'appserver';
    process.env.CODEX_RUNTIME_MODE = 'appserver';

    const result = await runFrontendTest([]);

    expect(result.runtimeMode).toBe('cli');
    expect(result.runtimeProvider).toBe('CliRuntimeProvider');
  }, TEST_TIMEOUT);
});
