import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const CLI_ENTRY = join(process.cwd(), 'bin', 'codex-orchestrator.ts');
const TEST_TIMEOUT = 15000;

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

async function runFrontendTest(extraArgs: string[]): Promise<{ manifestPath: string }> {
  const env = {
    ...process.env,
    CODEX_ORCHESTRATOR_ROOT: tempDir as string,
    CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir as string, '.runs'),
    CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir as string, 'out'),
    MCP_RUNNER_TASK_ID: 'frontend-test'
  };

  const { stdout } = await execFileAsync(
    process.execPath,
    ['--loader', 'ts-node/esm', CLI_ENTRY, 'frontend-test', '--format', 'json', ...extraArgs],
    { env }
  );
  const trimmed = stdout.trim();
  const jsonStart = trimmed.lastIndexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) {
    throw new Error(`Unable to locate JSON payload in stdout: ${trimmed}`);
  }
  const payload = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as { manifest: string };
  return { manifestPath: join(tempDir as string, payload.manifest) };
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
        },
        {
          id: 'frontend-testing-devtools',
          title: 'Frontend Testing (DevTools)',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'echo',
              title: 'echo',
              command: "node -e \"console.log('ok-devtools')\"",
              env: { CODEX_REVIEW_DEVTOOLS: '1' }
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
        },
        {
          id: 'frontend-testing-devtools',
          title: 'Frontend Testing (DevTools)',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'echo',
              title: 'echo',
              command: "node -e \"console.log('ok-devtools')\"",
              env: { CODEX_REVIEW_DEVTOOLS: '1' }
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);

    const { manifestPath } = await runFrontendTest(['--devtools']);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { pipeline_id?: string };
    expect(manifest.pipeline_id).toBe('frontend-testing-devtools');
  }, TEST_TIMEOUT);
});
