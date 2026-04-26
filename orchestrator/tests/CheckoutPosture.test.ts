import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatCheckoutPostureSummary, inspectCheckoutPosture } from '../src/cli/utils/checkoutPosture.js';

interface PostureRepoFixture {
  root: string;
  repo: string;
  initialCommit: string;
  latestCommit: string;
}

describe('inspectCheckoutPosture', () => {
  it('warns when local checkout posture is stale and keeps dirty work separate', async () => {
    const fixture = await createPostureRepoFixture();
    try {
      runGit(fixture.repo, ['reset', '--hard', fixture.initialCommit]);
      await writeFile(join(fixture.repo, 'local-notes.md'), 'local draft\n', 'utf8');

      const result = inspectCheckoutPosture(fixture.repo);

      expect(result.status).toBe('stale');
      expect(result.inside_git_worktree).toBe(true);
      expect(result.ahead).toBe(0);
      expect(result.behind).toBe(1);
      expect(result.dirty.status).toBe('dirty');
      expect(result.dirty.detail).toContain('tracked separately from branch posture');
      expect(result.stale_docs_may_be).toBe(true);
      expect(result.posture_reference.commit?.hash).toBe(fixture.latestCommit);
      expect(result.posture_reference.issue_ids).toContain('CO-999');
      expect(result.posture_reference.policy_lines.join('\n')).toContain('gpt-5.5');
      expect(result.posture_reference.policy_lines.join('\n')).toContain(
        'Portable packaged/generated defaults still keep `gpt-5.4` / `xhigh` as fallback values.'
      );
      expect(result.posture_reference.policy_lines.length).toBeLessThanOrEqual(16);

      const summary = formatCheckoutPostureSummary(result).join('\n');
      expect(summary).toContain('Checkout posture: stale');
      expect(summary).toContain('HEAD is 0 ahead, 1 behind origin/main');
      expect(summary).toContain('dirty local work: dirty');
      expect(summary).toContain('local posture docs may be stale');
      expect(summary).toContain('CO-999');
      expect(summary).toContain('Portable packaged/generated defaults still keep `gpt-5.4` / `xhigh`');
      expect(summary).toContain('Doctor only reports checkout posture; it does not fetch, rebase, checkout, or discard local work.');
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('reports current posture when HEAD matches origin/main', async () => {
    const fixture = await createPostureRepoFixture();
    try {
      const result = inspectCheckoutPosture(fixture.repo);

      expect(result.status).toBe('current');
      expect(result.inside_git_worktree).toBe(true);
      expect(result.ahead).toBe(0);
      expect(result.behind).toBe(0);
      expect(result.dirty.status).toBe('clean');
      expect(result.stale_docs_may_be).toBe(false);
      expect(formatCheckoutPostureSummary(result).join('\n')).toContain('Checkout posture: current');
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('does not classify ahead-only worktrees as stale posture drift', async () => {
    const fixture = await createPostureRepoFixture();
    try {
      await writeFile(join(fixture.repo, 'local-change.md'), 'local branch work\n', 'utf8');
      runGit(fixture.repo, ['add', 'local-change.md']);
      runGit(fixture.repo, ['commit', '-m', 'Local branch work']);

      const result = inspectCheckoutPosture(fixture.repo);

      expect(result.status).toBe('ahead');
      expect(result.inside_git_worktree).toBe(true);
      expect(result.ahead).toBe(1);
      expect(result.behind).toBe(0);
      expect(result.stale_docs_may_be).toBe(false);
      expect(formatCheckoutPostureSummary(result).join('\n')).toContain(
        'Ahead-only release or PR worktrees are not stale-posture drift by themselves.'
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('reports unavailable comparison when origin/main is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'checkout-posture-no-remote-'));
    const repo = join(root, 'repo');
    try {
      await mkdir(repo, { recursive: true });
      runGit(repo, ['init', '-b', 'main']);
      runGit(repo, ['config', 'user.name', 'Doctor Test']);
      runGit(repo, ['config', 'user.email', 'doctor@example.invalid']);
      await writeFile(join(repo, 'README.md'), '# no remote\n', 'utf8');
      runGit(repo, ['add', 'README.md']);
      runGit(repo, ['commit', '-m', 'Initial no remote repo']);

      const result = inspectCheckoutPosture(repo);

      expect(result.status).toBe('unavailable');
      expect(result.inside_git_worktree).toBe(true);
      expect(result.ahead).toBeNull();
      expect(result.behind).toBeNull();
      expect(result.dirty.status).toBe('clean');
      expect(result.detail).toContain('origin/main is not available locally');
      expect(result.stale_docs_may_be).toBe(false);
      expect(formatCheckoutPostureSummary(result).join('\n')).toContain(
        'comparison: unavailable against origin/main'
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps unborn-HEAD git worktrees distinguishable from non-git directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'checkout-posture-unborn-'));
    const repo = join(root, 'repo');
    const nonGitDir = join(root, 'non-git');
    try {
      await mkdir(repo, { recursive: true });
      await mkdir(nonGitDir, { recursive: true });
      runGit(repo, ['init', '-b', 'main']);

      const result = inspectCheckoutPosture(repo);
      const nonGitResult = inspectCheckoutPosture(nonGitDir);

      expect(result.status).toBe('unavailable');
      expect(result.inside_git_worktree).toBe(true);
      expect(result.head).toBeNull();
      expect(result.detail).toContain('origin/main is not available locally');
      expect(nonGitResult.status).toBe('unavailable');
      expect(nonGitResult.inside_git_worktree).toBe(false);
      expect(nonGitResult.detail).toContain('not inside a git worktree');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not report git probe failures as non-git directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'checkout-posture-git-probe-failure-'));
    const missingRepo = join(root, 'missing-repo');
    try {
      const result = inspectCheckoutPosture(missingRepo);

      expect(result.status).toBe('unavailable');
      expect(result.inside_git_worktree).toBe(true);
      expect(result.detail).toContain('Unable to determine whether the current directory is inside a git worktree');
      expect(result.detail).not.toContain('not inside a git worktree');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not report broken git metadata as a non-git directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'checkout-posture-broken-gitdir-'));
    const repo = join(root, 'repo');
    try {
      await mkdir(repo, { recursive: true });
      await writeFile(join(repo, '.git'), 'gitdir: /definitely/missing/gitdir\n', 'utf8');

      const result = inspectCheckoutPosture(repo);

      expect(result.status).toBe('unavailable');
      expect(result.inside_git_worktree).toBe(true);
      expect(result.detail).toContain('Unable to determine whether the current directory is inside a git worktree');
      expect(result.detail).not.toContain('Current directory is not inside a git worktree');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('ignores inherited git config while classifying plain non-git directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'checkout-posture-bad-global-config-'));
    const nonGitDir = join(root, 'plain-dir');
    const badConfig = join(root, 'bad-gitconfig');
    const originalGlobalConfig = process.env.GIT_CONFIG_GLOBAL;
    try {
      await mkdir(nonGitDir, { recursive: true });
      await writeFile(badConfig, '[broken\n', 'utf8');
      process.env.GIT_CONFIG_GLOBAL = badConfig;

      const result = inspectCheckoutPosture(nonGitDir);

      expect(result.status).toBe('unavailable');
      expect(result.inside_git_worktree).toBe(false);
      expect(result.detail).toContain('not inside a git worktree');
    } finally {
      if (originalGlobalConfig === undefined) {
        delete process.env.GIT_CONFIG_GLOBAL;
      } else {
        process.env.GIT_CONFIG_GLOBAL = originalGlobalConfig;
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function createPostureRepoFixture(): Promise<PostureRepoFixture> {
  const root = await mkdtemp(join(tmpdir(), 'checkout-posture-'));
  const origin = join(root, 'origin.git');
  const repo = join(root, 'repo');
  runGit(root, ['init', '--bare', origin]);
  runGit(root, ['clone', origin, repo]);
  runGit(repo, ['switch', '-c', 'main']);
  runGit(repo, ['config', 'user.name', 'Doctor Test']);
  runGit(repo, ['config', 'user.email', 'doctor@example.invalid']);

  await mkdir(join(repo, 'docs', 'guides'), { recursive: true });
  await writeFile(
    join(repo, 'docs', 'guides', 'codex-version-policy.md'),
    [
      '# Codex Version Policy',
      '',
      '## Current Posture',
      '- Current model posture is `gpt-5.4` / `xhigh` for CO-100.',
      '',
      '## Evidence'
    ].join('\n'),
    'utf8'
  );
  runGit(repo, ['add', 'docs/guides/codex-version-policy.md']);
  runGit(repo, ['commit', '-m', 'CO-100 seed posture']);
  runGit(repo, ['push', '-u', 'origin', 'main']);
  const initialCommit = runGit(repo, ['rev-parse', 'HEAD']);

  await writeFile(
    join(repo, 'docs', 'guides', 'codex-version-policy.md'),
    [
      '# Codex Version Policy',
      '',
      '## Current Posture',
      '- Current CO-local ChatGPT-auth/appserver model posture is `gpt-5.5` / `xhigh` on Codex CLI `0.125.0`. CO-999 adopted that posture after live smoke evidence passed.',
      '- Current release-facing package/downstream-smoke compatibility target is Codex CLI `0.125.0`.',
      '- Current cloud execution candidate remains Codex CLI `0.124.0`.',
      '- Latest app-server control-seam candidate audited by CO-998 is Codex CLI `0.125.0`.',
      '- Marketplace/downstream-smoke compatibility is separately rebaselined to Codex CLI `0.125.0` by CO-997.',
      '- `cloud-canary` pins `@openai/codex@0.124.0` as the explicit cloud execution candidate.',
      '- The current `0.125.0` local CLI/package posture keeps the previously recorded onboarding-sensitive help guarantees.',
      '- Current model posture is `gpt-5.5` / `xhigh` when available in ChatGPT-auth Codex sessions.',
      ...Array.from(
        { length: 12 },
        (_, index) => `- Current optional posture note ${index + 1} for Codex CLI context.`
      ),
      '- Portable packaged/generated defaults still keep `gpt-5.4` / `xhigh` as fallback values.',
      '- CO-local `gpt-5.5` / `xhigh` configuration is the current ChatGPT-auth/appserver posture after live app-server/model smoke evidence.',
      '- `codex-orchestrator doctor` treats `gpt-5.5` as non-drift when `codex debug models` verifies current model access.',
      '',
      '## Evidence'
    ].join('\n'),
    'utf8'
  );
  runGit(repo, ['add', 'docs/guides/codex-version-policy.md']);
  runGit(repo, ['commit', '-m', 'CO-999 adopt current posture']);
  runGit(repo, ['push', 'origin', 'main']);
  runGit(repo, ['fetch', 'origin', 'main:refs/remotes/origin/main']);
  const latestCommit = runGit(repo, ['rev-parse', 'HEAD']);

  return { root, repo, initialCommit, latestCommit };
}

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      [
        `git ${args.join(' ')} failed`,
        `cwd: ${cwd}`,
        `status: ${result.status ?? '<unknown>'}`,
        `error: ${result.error?.message ?? '<none>'}`,
        `stdout: ${String(result.stdout ?? '').trim()}`,
        `stderr: ${String(result.stderr ?? '').trim()}`
      ].join('\n')
    );
  }
  return String(result.stdout ?? '').trim();
}
