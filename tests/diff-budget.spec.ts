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

async function setOriginMainRef(repo: string, ref: string): Promise<void> {
  await execFileAsync('git', ['update-ref', 'refs/remotes/origin/main', ref], { cwd: repo });
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
    if (!('BASE_SHA' in env)) {
      delete mergedEnv.BASE_SHA;
    }
    if (!('DIFF_BUDGET_BASE' in env)) {
      delete mergedEnv.DIFF_BUDGET_BASE;
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
  it('uses the working tree as the default hard gate and reports stacked aggregate scope as advisory', async () => {
    const repo = await initRepository();
    const initialCommit = await git(repo, ['rev-parse', 'HEAD']);
    await setOriginMainRef(repo, initialCommit);

    await writeFile(join(repo, 'stacked.txt'), 'history\n'.repeat(12), 'utf8');
    await execFileAsync('git', ['add', 'stacked.txt'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'stacked history'], { cwd: repo });

    await writeFile(join(repo, 'notes.txt'), 'one\ntwo\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '5']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (scope=working-tree');
    expect(result.stdout).toContain('Advisory stacked aggregate vs origin/main');
  });

  it('does not treat upstream-only origin/main commits as stacked advisory scope', async () => {
    const repo = await initRepository();
    const initialCommit = await git(repo, ['rev-parse', 'HEAD']);
    await execFileAsync('git', ['branch', '-M', 'main'], { cwd: repo });
    await setOriginMainRef(repo, initialCommit);
    await execFileAsync('git', ['checkout', '-b', 'feature'], { cwd: repo });

    await execFileAsync('git', ['checkout', 'main'], { cwd: repo });
    await writeFile(join(repo, 'upstream.txt'), 'upstream\n'.repeat(6), 'utf8');
    await execFileAsync('git', ['add', 'upstream.txt'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'upstream history'], { cwd: repo });
    const upstreamHead = await git(repo, ['rev-parse', 'HEAD']);
    await setOriginMainRef(repo, upstreamHead);
    await execFileAsync('git', ['checkout', 'feature'], { cwd: repo });

    await writeFile(join(repo, 'notes.txt'), 'one\ntwo\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '2']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (scope=working-tree');
    expect(result.stdout).not.toContain('Advisory stacked aggregate vs origin/main');
  });

  it('uses BASE_SHA as an explicit hard base scope', async () => {
    const repo = await initRepository();
    const initialCommit = await git(repo, ['rev-parse', 'HEAD']);
    await setOriginMainRef(repo, initialCommit);

    await writeFile(join(repo, 'stacked.txt'), 'history\n'.repeat(12), 'utf8');
    await execFileAsync('git', ['add', 'stacked.txt'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'stacked history'], { cwd: repo });

    await writeFile(join(repo, 'notes.txt'), 'one\ntwo\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '5'], { BASE_SHA: 'origin/main' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (base=origin/main)');
  });

  it('uses DIFF_BUDGET_BASE as the hard base when no higher-priority base is requested', async () => {
    const repo = await initRepository();
    const initialCommit = await git(repo, ['rev-parse', 'HEAD']);
    await setOriginMainRef(repo, initialCommit);

    await writeFile(join(repo, 'stacked.txt'), 'history\n'.repeat(12), 'utf8');
    await execFileAsync('git', ['add', 'stacked.txt'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'stacked history'], { cwd: repo });

    await writeFile(join(repo, 'notes.txt'), 'one\ntwo\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '5'], { DIFF_BUDGET_BASE: 'origin/main' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (base=origin/main)');
  });

  it('fails fast when BASE_SHA is invalid, even if DIFF_BUDGET_BASE is valid', async () => {
    const repo = await initRepository();
    const initialCommit = await git(repo, ['rev-parse', 'HEAD']);
    await setOriginMainRef(repo, initialCommit);

    await writeFile(join(repo, 'stacked.txt'), 'history\n'.repeat(12), 'utf8');
    await execFileAsync('git', ['add', 'stacked.txt'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'stacked history'], { cwd: repo });

    const result = await runDiffBudget(repo, ['--max-lines', '0'], {
      BASE_SHA: 'refs/does/not/exist',
      DIFF_BUDGET_BASE: 'origin/main'
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      'Diff budget failed: Explicit diff base requested but no valid ref was found (BASE_SHA=refs/does/not/exist).'
    );
  });

  it('fails fast when --base is invalid, even if BASE_SHA is valid', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'stacked.txt'), 'history\n'.repeat(12), 'utf8');
    await execFileAsync('git', ['add', 'stacked.txt'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'stacked history'], { cwd: repo });

    const result = await runDiffBudget(repo, ['--base', 'refs/does/not/exist', '--max-lines', '0'], {
      BASE_SHA: 'HEAD'
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      'Diff budget failed: Explicit diff base requested but no valid ref was found (--base=refs/does/not/exist).'
    );
  });

  it('defaults to a 1200-line budget', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'large.txt'), 'z\n'.repeat(900), 'utf8');

    const result = await runDiffBudget(repo, []);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('/1200');
  });

  it('counts untracked files by actual text lines when they end with a trailing newline', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'large.txt'), 'z\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '1']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('lines=1/1');
  });

  it('measures the final working tree scope once when a file has both staged and unstaged edits', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'notes.txt'), 'two\n', 'utf8');
    await execFileAsync('git', ['add', 'notes.txt'], { cwd: repo });
    await writeFile(join(repo, 'notes.txt'), 'three\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '2']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (scope=working-tree');
    expect(result.stdout).toContain('lines=2/2');
  });

  it('counts staged-only churn when unstaged edits restore the working tree content', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'notes.txt'), 'two\n', 'utf8');
    await execFileAsync('git', ['add', 'notes.txt'], { cwd: repo });
    await writeFile(join(repo, 'notes.txt'), 'one\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '1']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (scope=working-tree)');
    expect(result.stdout).toContain('total lines changed 2 > 1');
    expect(result.stdout).toContain('notes.txt: 2');
  });

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
