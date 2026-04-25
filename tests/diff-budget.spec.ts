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

async function initUnbornRepository(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'diff-budget-unborn-'));
  createdDirs.push(dir);

  await execFileAsync('git', ['init'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.email', 'diff-budget@example.com'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.name', 'Diff Budget'], { cwd: dir });

  return dir;
}

async function git(repo: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: repo });
  return String(stdout ?? '').trim();
}

async function setOriginMainRef(repo: string, ref: string): Promise<void> {
  await execFileAsync('git', ['update-ref', 'refs/remotes/origin/main', ref], { cwd: repo });
}

async function writeAcceptedChildLaneEvidence(
  repo: string,
  laneWorkspace: string,
  options: { taskId?: string; issueId?: string; issueIdentifier?: string } = {}
): Promise<void> {
  const taskId = options.taskId ?? 'linear-test-child-lane-artifacts';
  const issueId = options.issueId ?? 'test-child-lane-artifacts';
  const issueIdentifier = options.issueIdentifier ?? 'CO-328';
  const parentRunId = 'parent-run-1';
  const childRunId = 'child-run-1';
  const artifactRoot = join(repo, '.runs', `${taskId}-tests`, 'cli', childRunId);
  const patchArtifactPath = join(artifactRoot, 'provider-linear-child-lane.patch');
  const runDir = join(repo, '.runs', taskId, 'cli', parentRunId);
  const scope = { files: ['tests/diff-budget.spec.ts'], phases: ['tests'] };

  await mkdir(artifactRoot, { recursive: true });
  await mkdir(runDir, { recursive: true });
  await writeFile(patchArtifactPath, 'diff --git a/tests/diff-budget.spec.ts b/tests/diff-budget.spec.ts\n', 'utf8');
  await writeFile(
    join(artifactRoot, 'provider-linear-child-lane-proof.json'),
    JSON.stringify({
      issue_id: issueId,
      issue_identifier: issueIdentifier,
      task_id: `${taskId}-tests`,
      run_id: childRunId,
      parent_run_id: parentRunId,
      stream: 'tests',
      scope,
      lane_workspace_path: laneWorkspace,
      patch_artifact_path: patchArtifactPath,
      patch_bytes: 128,
      status: 'succeeded',
      updated_at: '2026-04-23T09:15:16.094Z'
    }),
    'utf8'
  );
  await writeFile(
    join(runDir, 'provider-linear-worker-child-lanes.json'),
    JSON.stringify([
      {
        stream: 'tests',
        pipeline_id: 'provider-linear-child-lane',
        task_id: `${taskId}-tests`,
        run_id: childRunId,
        status: 'succeeded',
        artifact_root: artifactRoot,
        patch_artifact_path: patchArtifactPath,
        patch_bytes: 128,
        issue_id: issueId,
        issue_identifier: issueIdentifier,
        workspace_path: repo,
        lane_workspace_path: laneWorkspace,
        scope,
        decision: 'accepted',
        decision_at: '2026-04-23T09:20:00.000Z',
        decision_reason: 'Parent accepted the bounded child-lane patch.',
        in_flight_started_at: null
      }
    ]),
    'utf8'
  );
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
    if (!('MCP_RUNNER_TASK_ID' in env)) {
      delete mergedEnv.MCP_RUNNER_TASK_ID;
    }
    if (!('CODEX_ORCHESTRATOR_TASK_ID' in env)) {
      delete mergedEnv.CODEX_ORCHESTRATOR_TASK_ID;
    }
    if (!('TASK' in env)) {
      delete mergedEnv.TASK;
    }
    if (!('CODEX_ORCHESTRATOR_RUNS_DIR' in env)) {
      delete mergedEnv.CODEX_ORCHESTRATOR_RUNS_DIR;
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
  const childLaneTaskEnv = { MCP_RUNNER_TASK_ID: 'linear-test-child-lane-artifacts' };

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

  it('counts staged and unstaged churn when a file has both pending deltas', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'notes.txt'), 'two\n', 'utf8');
    await execFileAsync('git', ['add', 'notes.txt'], { cwd: repo });
    await writeFile(join(repo, 'notes.txt'), 'three\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '4']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (scope=working-tree');
    expect(result.stdout).toContain('lines=4/4');
  });

  it('counts both staged and unstaged churn when worktree edits restore HEAD content', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'notes.txt'), 'two\n', 'utf8');
    await execFileAsync('git', ['add', 'notes.txt'], { cwd: repo });
    await writeFile(join(repo, 'notes.txt'), 'one\n', 'utf8');

    const result = await runDiffBudget(repo, ['--max-lines', '3']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (scope=working-tree)');
    expect(result.stdout).toContain('total lines changed 4 > 3');
    expect(result.stdout).toContain('notes.txt: 4');
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

    await mkdir(join(repo, '.agent', 'task'), { recursive: true });
    await mkdir(join(repo, '.runs'), { recursive: true });
    await mkdir(join(repo, 'tasks'), { recursive: true });
    await writeFile(join(repo, '.agent', 'task', 'ignored.md'), 'z\n'.repeat(2000), 'utf8');
    await writeFile(join(repo, '.runs', 'ignored.txt'), 'x\n'.repeat(2000), 'utf8');
    await writeFile(join(repo, 'package-lock.json'), 'y\n'.repeat(2000), 'utf8');
    await writeFile(join(repo, 'tasks', 'tasks-ignored.md'), 'q\n'.repeat(2000), 'utf8');

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-files', '0', '--max-lines', '0'], childLaneTaskEnv);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (base=HEAD');
  });

  it('ignores accepted same-issue child-lane workspace artifacts with durable acceptance evidence', async () => {
    const repo = await initRepository();
    const laneWorkspace = join(repo, '.child-lanes', 'tests-child-run-1');
    await mkdir(laneWorkspace, { recursive: true });
    await writeFile(join(laneWorkspace, 'artifact.txt'), 'accepted child artifact\n'.repeat(10), 'utf8');
    await writeAcceptedChildLaneEvidence(repo, laneWorkspace);

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-files', '0', '--max-lines', '0'], childLaneTaskEnv);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (base=HEAD');
    expect(result.stdout).toContain('files=0/0, lines=0/0');
  });

  it('matches accepted child-lane evidence when the active task id has a dated canonical prefix', async () => {
    const repo = await initRepository();
    const laneWorkspace = join(repo, '.child-lanes', 'tests-child-run-1');
    await mkdir(laneWorkspace, { recursive: true });
    await writeFile(join(laneWorkspace, 'artifact.txt'), 'accepted dated task artifact\n'.repeat(10), 'utf8');
    await writeAcceptedChildLaneEvidence(repo, laneWorkspace, {
      taskId: 'linear-37c1035e-d319-4306-8a41-648f2ab836e6',
      issueId: '37c1035e-d319-4306-8a41-648f2ab836e6',
      issueIdentifier: 'CO-328'
    });

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-files', '0', '--max-lines', '0'], {
      MCP_RUNNER_TASK_ID: '20260423-linear-37c1035e-d319-4306-8a41-648f2ab836e6'
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (base=HEAD');
    expect(result.stdout).toContain('files=0/0, lines=0/0');
  });

  it('still counts unrelated untracked files next to accepted child-lane workspace artifacts', async () => {
    const repo = await initRepository();
    const laneWorkspace = join(repo, '.child-lanes', 'tests-child-run-1');
    await mkdir(laneWorkspace, { recursive: true });
    await writeFile(join(laneWorkspace, 'artifact.txt'), 'accepted child artifact\n'.repeat(10), 'utf8');
    await writeAcceptedChildLaneEvidence(repo, laneWorkspace);
    await writeFile(join(repo, 'unrelated.txt'), 'still counted\n', 'utf8');

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-lines', '0'], childLaneTaskEnv);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (base=HEAD)');
    expect(result.stdout).toContain('total lines changed 1 > 0');
    expect(result.stdout).toContain('unrelated.txt: 1');
    expect(result.stdout).not.toContain('.child-lanes/tests-child-run-1/artifact.txt');
  });

  it('counts child-lane workspace artifacts when durable acceptance evidence is missing', async () => {
    const repo = await initRepository();
    const laneWorkspace = join(repo, '.child-lanes', 'tests-child-run-1');
    await mkdir(laneWorkspace, { recursive: true });
    await writeFile(join(laneWorkspace, 'artifact.txt'), 'unaccepted child artifact\n'.repeat(2), 'utf8');

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-lines', '0']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (base=HEAD)');
    expect(result.stdout).toContain('total lines changed 2 > 0');
    expect(result.stdout).toContain('.child-lanes/tests-child-run-1/artifact.txt: 2');
  });

  it('counts child-lane workspace artifacts when acceptance evidence belongs to another task', async () => {
    const repo = await initRepository();
    const laneWorkspace = join(repo, '.child-lanes', 'tests-child-run-1');
    await mkdir(laneWorkspace, { recursive: true });
    await writeFile(join(laneWorkspace, 'artifact.txt'), 'other task artifact\n'.repeat(2), 'utf8');
    await writeAcceptedChildLaneEvidence(repo, laneWorkspace, {
      taskId: 'linear-other-issue',
      issueId: 'other-issue',
      issueIdentifier: 'CO-999'
    });

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-lines', '0'], childLaneTaskEnv);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (base=HEAD)');
    expect(result.stdout).toContain('total lines changed 2 > 0');
    expect(result.stdout).toContain('.child-lanes/tests-child-run-1/artifact.txt: 2');
  });

  it('counts child-lane workspace artifacts when acceptance evidence belongs to another workspace', async () => {
    const repo = await initRepository();
    const otherRepo = await initRepository();
    const workspaceName = 'tests-child-run-1';
    const laneWorkspace = join(repo, '.child-lanes', workspaceName);
    const otherLaneWorkspace = join(otherRepo, '.child-lanes', workspaceName);
    await mkdir(laneWorkspace, { recursive: true });
    await mkdir(otherLaneWorkspace, { recursive: true });
    await writeFile(join(laneWorkspace, 'artifact.txt'), 'current workspace artifact\n'.repeat(2), 'utf8');
    await writeAcceptedChildLaneEvidence(otherRepo, otherLaneWorkspace);

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-lines', '0'], {
      ...childLaneTaskEnv,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(otherRepo, '.runs')
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (base=HEAD)');
    expect(result.stdout).toContain('total lines changed 2 > 0');
    expect(result.stdout).toContain('.child-lanes/tests-child-run-1/artifact.txt: 2');
  });

  it('counts staged child-lane workspace content even with durable acceptance evidence', async () => {
    const repo = await initRepository();
    const laneWorkspace = join(repo, '.child-lanes', 'tests-child-run-1');
    await mkdir(laneWorkspace, { recursive: true });
    await writeFile(join(laneWorkspace, 'artifact.txt'), 'staged child artifact\n'.repeat(2), 'utf8');
    await writeAcceptedChildLaneEvidence(repo, laneWorkspace);
    await execFileAsync('git', ['add', join('.child-lanes', 'tests-child-run-1', 'artifact.txt')], { cwd: repo });

    const result = await runDiffBudget(repo, ['--base', 'HEAD', '--max-lines', '0'], childLaneTaskEnv);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌ Diff budget exceeded (base=HEAD)');
    expect(result.stdout).toContain('total lines changed 2 > 0');
    expect(result.stdout).toContain('.child-lanes/tests-child-run-1/artifact.txt: 2');
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

  it('counts staged files before the first commit exists', async () => {
    const repo = await initUnbornRepository();

    await writeFile(join(repo, 'draft.txt'), 'hello\nworld\n', 'utf8');
    await execFileAsync('git', ['add', 'draft.txt'], { cwd: repo });

    const result = await runDiffBudget(repo, ['--max-lines', '2']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅ Diff budget: OK (scope=working-tree');
    expect(result.stdout).toContain('lines=2/2');
  });
});
