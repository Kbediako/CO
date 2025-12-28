import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'diff-budget.mjs');

const createdDirs: string[] = [];

async function initRepository(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'diff-budget-'));
  createdDirs.push(dir);

  await execFileAsync('git', ['init'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.email', 'diff-budget@example.com'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.name', 'Diff Budget'], { cwd: dir });

  await writeFile(join(dir, 'notes.txt'), 'one\n', 'utf8');
  await execFileAsync('git', ['add', '.'], { cwd: dir });
  await execFileAsync('git', ['commit', '-m', 'initial commit'], { cwd: dir });

  return dir;
}

async function git(repo: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: repo });
  return String(stdout ?? '').trim();
}

async function runDiffBudget(
  repo: string,
  args: string[],
  env: Record<string, string | undefined> = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const mergedEnv: Record<string, string | undefined> = { ...process.env, ...env };
    if (!('DIFF_BUDGET_OVERRIDE_REASON' in env)) {
      delete mergedEnv.DIFF_BUDGET_OVERRIDE_REASON;
    }
    const { stdout, stderr } = await execFileAsync('node', [scriptPath, ...args], {
      cwd: repo,
      env: mergedEnv
    });
    return { exitCode: 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { code?: number; stdout?: unknown; stderr?: unknown };
    const stdout =
      typeof err.stdout === 'string' ? err.stdout : err.stdout ? Buffer.from(err.stdout as never).toString() : '';
    const stderr =
      typeof err.stderr === 'string' ? err.stderr : err.stderr ? Buffer.from(err.stderr as never).toString() : '';
    return { exitCode: Number(err.code ?? 1), stdout, stderr };
  }
}

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('diff-budget script', () => {
  it('--commit mode ignores working tree state', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'notes.txt'), 'one\ntwo\n', 'utf8');
    await execFileAsync('git', ['add', 'notes.txt'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'append small change'], { cwd: repo });
    const commit = await git(repo, ['rev-parse', 'HEAD']);

    const largeWorkingTree = Array.from({ length: 100 }, (_, index) => `line-${index}`).join('\n') + '\n';
    await writeFile(join(repo, 'notes.txt'), `one\ntwo\n${largeWorkingTree}`, 'utf8');

    const result = await runDiffBudget(repo, ['--commit', commit, '--max-lines', '5']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`✅ Diff budget: OK (commit=${commit}`);
  });

  it('fails when an untracked file is too large to measure', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'too-large.bin'), Buffer.alloc(1024 * 1024 + 100, 0));

    const result = await runDiffBudget(repo, ['--base', 'HEAD']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('untracked files could not be measured: 1');
    expect(result.stdout).toContain('too-large.bin: too large to measure');
  });

  it('ignores exact and prefix ignored paths', async () => {
    const repo = await initRepository();

    await mkdir(join(repo, '.runs'), { recursive: true });
    await writeFile(join(repo, '.runs', 'ignored.txt'), 'x\n'.repeat(2000), 'utf8');
    await writeFile(join(repo, 'package-lock.json'), 'y\n'.repeat(2000), 'utf8');

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-files', '0', '--max-lines', '0']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (base=HEAD');
  });

  it('accepts a diff budget override reason', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'large.txt'), 'z\n'.repeat(10), 'utf8');

    const result = await runDiffBudget(
      repo,
      ['--base', 'HEAD', '--max-files', '0', '--max-lines', '0'],
      { DIFF_BUDGET_OVERRIDE_REASON: 'tests: override accepted' }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('⚠️ Diff budget exceeded (override applied)');
    expect(result.stdout).toContain('Override accepted via DIFF_BUDGET_OVERRIDE_REASON: tests: override accepted');
  });
});
