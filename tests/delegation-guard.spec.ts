import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'delegation-guard.mjs');

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

async function initRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'delegation-guard-'));
  await mkdir(join(dir, 'tasks'), { recursive: true });
  await writeFile(
    join(dir, 'tasks', 'index.json'),
    JSON.stringify(
      {
        items: [
          {
            id: '0951',
            slug: 'delegation-rlm-quick-wins',
            status: 'approved'
          }
        ]
      },
      null,
      2
    )
  );
  return dir;
}

describe('delegation-guard script', () => {
  it('reports missing MCP_RUNNER_TASK_ID with export example', async () => {
    tempDir = await initRepo();

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: { ...process.env, MCP_RUNNER_TASK_ID: '', CODEX_ORCHESTRATOR_ROOT: tempDir }
    });

    expect(stdout).toContain('MCP_RUNNER_TASK_ID is required');
    expect(stdout).toContain('export MCP_RUNNER_TASK_ID=0951-delegation-rlm-quick-wins');
  });

  it('lists candidate manifests and expected paths when none found', async () => {
    tempDir = await initRepo();
    const taskId = '0951-delegation-rlm-quick-wins';

    const runsRoot = join(tempDir, 'custom-runs');
    await mkdir(join(runsRoot, `${taskId}-guard`, 'cli'), { recursive: true });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: tempDir,
      env: {
        ...process.env,
        MCP_RUNNER_TASK_ID: taskId,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_RUNS_DIR: 'custom-runs'
      }
    });

    expect(stdout).toContain('No subagent manifests found');
    expect(stdout).toContain('Candidate manifests (rejected):');
    expect(stdout).toContain('no run directories');
    expect(stdout).toContain(`${runsRoot}/${taskId}-*/cli/<run-id>/manifest.json`);
  });
});
