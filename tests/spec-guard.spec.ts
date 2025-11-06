import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'spec-guard.mjs');

const createdDirs: string[] = [];

async function initRepository(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'spec-guard-'));
  createdDirs.push(dir);

  await execFileAsync('git', ['init'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.email', 'spec-guard@example.com'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.name', 'Spec Guard'], { cwd: dir });

  await mkdir(join(dir, 'tasks/specs'), { recursive: true });
  await mkdir(join(dir, 'src'), { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  await writeFile(
    join(dir, 'tasks/specs/0001-initial.md'),
    `last_review: ${today}\n\nInitial spec.\n`
  );
  await writeFile(join(dir, 'src/index.ts'), 'export const value = 1;\n');

  await execFileAsync('git', ['add', '.'], { cwd: dir });
  await execFileAsync('git', ['commit', '-m', 'initial commit'], { cwd: dir });

  return dir;
}

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('spec-guard script', () => {
  it('reports missing spec updates when code changes without spec touch (dry-run)', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'src/index.ts'), 'export const value = 2;\n');
    await execFileAsync('git', ['commit', '-am', 'update code'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'code/migrations changed but no spec updated under tasks/specs or tasks/index.json'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('passes when code changes include a fresh spec update', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(join(repo, 'src/index.ts'), 'export const value = 3;\n');
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nUpdated spec content.\n`
    );

    await execFileAsync('git', ['add', 'src/index.ts', 'tasks/specs/0001-initial.md'], {
      cwd: repo
    });
    await execFileAsync('git', ['commit', '-m', 'code and spec update'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });
});
