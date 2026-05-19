import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  inspectSourceRootFreshness,
  refreshSourceRootFreshnessInspection
} from '../src/cli/utils/sourceRootFreshness.js';

const roots: string[] = [];

describe('source root freshness inspection', () => {
  afterEach(async () => {
    vi.useRealTimers();
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('detects a stale linked package root while the intended checkout is current', async () => {
    const intendedRoot = await createPackageRepo('source-root-intended-', { stale: false });
    const stalePackageRoot = await createPackageRepo('source-root-linked-package-', { stale: true });
    const globalRoot = await mkdtemp(join(tmpdir(), 'source-root-global-'));
    roots.push(globalRoot);
    const linkedPackageRoot = join(globalRoot, '@kbediako', 'codex-orchestrator');
    await mkdir(join(globalRoot, '@kbediako'), { recursive: true });
    await symlink(stalePackageRoot, linkedPackageRoot, 'dir');
    const stalePackageRealpath = await realpath(stalePackageRoot);

    const result = inspectSourceRootFreshness({
      intendedRepoRoot: intendedRoot,
      packageRoot: linkedPackageRoot,
      argv: ['node', join(stalePackageRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: intendedRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result.status).toBe('warning');
    expect(result.package_root).toBe(linkedPackageRoot);
    expect(result.package_root_realpath).toBe(stalePackageRealpath);
    expect(result.source_checkout).toMatchObject({
      status: 'stale',
      behind: 1
    });
    expect(result.intended_checkout).toMatchObject({
      status: 'current',
      behind: 0
    });
    expect(result.drift_classes).toEqual(
      expect.arrayContaining([
        'supervised_source_root_drift',
        'global_binary_package_provenance_drift'
      ])
    );
  });

  it('flags source-vs-dist drift when dist is used while a source entry exists', async () => {
    const repoRoot = await createPackageRepo('source-root-dist-', { stale: false });
    await mkdir(join(repoRoot, 'dist', 'bin'), { recursive: true });
    await writeFile(join(repoRoot, 'dist', 'bin', 'codex-orchestrator.js'), 'console.log("dist");\n', 'utf8');

    const result = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'dist', 'bin', 'codex-orchestrator.js')],
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result.status).toBe('warning');
    expect(result.entrypoint_kind).toBe('dist');
    expect(result.provenance.source_entry_exists).toBe(true);
    expect(result.drift_classes).toContain('source_vs_dist_drift');
  });

  it('captures extensionless argv launchers and resolves their real entrypoint kind', async () => {
    const repoRoot = await createPackageRepo('source-root-extensionless-', { stale: false });
    const globalRoot = await mkdtemp(join(tmpdir(), 'source-root-extensionless-global-'));
    roots.push(globalRoot);
    await mkdir(join(repoRoot, 'dist', 'bin'), { recursive: true });
    await mkdir(join(globalRoot, 'node_modules', '.bin'), { recursive: true });
    const distEntrypoint = join(repoRoot, 'dist', 'bin', 'codex-orchestrator.js');
    const shimPath = join(globalRoot, 'node_modules', '.bin', 'codex-orchestrator');
    await writeFile(distEntrypoint, 'console.log("dist");\n', 'utf8');
    await symlink(distEntrypoint, shimPath);

    const result = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', shimPath],
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result.provenance.command_path_source).toBe('argv');
    expect(result.command_path).toBe(shimPath);
    expect(result.command_path_realpath).toBe(await realpath(distEntrypoint));
    expect(result.entrypoint_kind).toBe('dist');
    expect(result.drift_classes).toContain('source_vs_dist_drift');
  });

  it('does not let an explicit package root hide an argv entrypoint outside that package', async () => {
    const intendedRoot = await createPackageRepo('source-root-explicit-package-', { stale: false });
    const staleSourceRoot = await createPackageRepo('source-root-explicit-command-', { stale: true });
    const staleSourceRealpath = await realpath(staleSourceRoot);

    const result = inspectSourceRootFreshness({
      intendedRepoRoot: intendedRoot,
      packageRoot: intendedRoot,
      argv: ['node', join(staleSourceRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: intendedRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result.status).toBe('warning');
    expect(result.package_root_realpath).toBe(await realpath(intendedRoot));
    expect(result.source_root_realpath).toBe(staleSourceRealpath);
    expect(result.provenance.command_path_inside_package).toBe(false);
    expect(result.provenance.source_root_source).toBe('command_path');
    expect(result.source_checkout).toMatchObject({
      status: 'stale',
      behind: 1
    });
    expect(result.drift_classes).toContain('supervised_source_root_drift');
  });

  it('warns when an outside command path has no resolvable package root', async () => {
    const repoRoot = await createPackageRepo('source-root-wrapper-package-', { stale: false });
    const wrapperRoot = await mkdtemp(join(tmpdir(), 'source-root-wrapper-command-'));
    roots.push(wrapperRoot);

    const result = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      commandPath: join(wrapperRoot, 'codex-orchestrator'),
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result.status).toBe('warning');
    expect(result.source_root_realpath).toBe(await realpath(repoRoot));
    expect(result.provenance.command_path_inside_package).toBe(false);
    expect(result.provenance.source_root_source).toBe('package_root');
    expect(result.drift_classes).toContain('global_binary_package_provenance_drift');
    expect(result.drift_classes).not.toContain('supervised_source_root_drift');
  });

  it('does not treat an unverified bin parent as the command package root', async () => {
    const repoRoot = await createPackageRepo('source-root-global-wrapper-package-', { stale: false });
    const wrapperRoot = await mkdtemp(join(tmpdir(), 'source-root-global-wrapper-'));
    roots.push(wrapperRoot);
    await mkdir(join(wrapperRoot, 'bin'), { recursive: true });

    const result = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      commandPath: join(wrapperRoot, 'bin', 'codex-orchestrator'),
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result.status).toBe('warning');
    expect(result.package_root_realpath).toBe(await realpath(repoRoot));
    expect(result.source_root_realpath).toBe(await realpath(repoRoot));
    expect(result.provenance.package_root_source).toBe('explicit');
    expect(result.provenance.source_root_source).toBe('package_root');
    expect(result.provenance.command_path_inside_package).toBe(false);
    expect(result.drift_classes).toEqual(['global_binary_package_provenance_drift']);
  });

  it('keeps missing origin/main freshness unavailable instead of source-root drift', async () => {
    const repoRoot = await createPackageRepo('source-root-missing-origin-', { stale: false });
    git(repoRoot, ['update-ref', '-d', 'refs/remotes/origin/main']);

    const result = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result.status).toBe('unavailable');
    expect(result.source_checkout).toMatchObject({
      status: 'unavailable',
      detail: 'origin/main is not available locally.'
    });
    expect(result.drift_classes).not.toContain('supervised_source_root_drift');
    expect(result.drift_classes).not.toContain('shared_checkout_drift');
  });

  it('warns on ahead source checkout posture when no intended checkout is available', async () => {
    const repoRoot = await createPackageRepo('source-root-ahead-only-', { stale: false });
    await writeFile(join(repoRoot, 'ahead.txt'), 'ahead\n', 'utf8');
    git(repoRoot, ['add', '.']);
    git(repoRoot, ['commit', '-m', 'ahead local work']);

    const result = inspectSourceRootFreshness({
      packageRoot: repoRoot,
      commandPath: join(repoRoot, 'bin', 'codex-orchestrator.ts'),
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result.status).toBe('warning');
    expect(result.intended_checkout).toBeNull();
    expect(result.source_checkout).toMatchObject({
      status: 'ahead',
      ahead: 1
    });
    expect(result.drift_classes).toContain('supervised_source_root_drift');
  });

  it('keeps a current source checkout clean when it matches the intended root', async () => {
    const repoRoot = await createPackageRepo('source-root-current-', { stale: false });

    const result = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(result).toMatchObject({
      status: 'current',
      entrypoint_kind: 'source',
      drift_classes: []
    });
    expect(result.source_checkout).toMatchObject({
      status: 'current',
      ahead: 0,
      behind: 0
    });
  });

  it('preserves original provenance source labels when refreshing saved freshness', async () => {
    const repoRoot = await createPackageRepo('source-root-refresh-provenance-', { stale: false });
    const prior = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    expect(prior.provenance).toMatchObject({
      command_path_source: 'argv',
      package_root_source: 'command_path',
      source_root_source: 'package_root'
    });

    const refreshed = refreshSourceRootFreshnessInspection(prior, repoRoot);

    expect(refreshed.provenance).toMatchObject({
      command_path_source: 'argv',
      package_root_source: 'command_path',
      source_root_source: 'package_root'
    });
  });

  it('does not let a shared-root fast-forward hide stale resident source freshness', async () => {
    const repoRoot = await createPackageRepo('source-root-resident-fast-forward-', { stale: false });
    const prior = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-18T23:00:00.000Z'
    });
    const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();

    await writeFile(join(repoRoot, 'co-555-recurrence.txt'), 'terminal claims after main advance\n', 'utf8');
    git(repoRoot, ['add', '.']);
    git(repoRoot, ['commit', '-m', 'CO-555 main advance']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    const currentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T23:05:00.000Z'));
    const refreshed = refreshSourceRootFreshnessInspection(prior, repoRoot);

    expect(refreshed.status).toBe('warning');
    expect(refreshed.observed_at).toBe('2026-05-18T23:05:00.000Z');
    expect(refreshed.source_checkout).toMatchObject({
      status: 'stale',
      behind: 1,
      head: { hash: residentHash },
      upstream: { hash: currentHash }
    });
    expect(refreshed.intended_checkout).toMatchObject({
      status: 'current',
      head: { hash: currentHash },
      upstream: { hash: currentHash }
    });
    expect(refreshed.drift_classes).toEqual(['supervised_source_root_drift']);
  });
});

async function createPackageRepo(
  prefix: string,
  options: { stale: boolean }
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  await mkdir(join(root, 'bin'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    `${JSON.stringify({ name: '@kbediako/codex-orchestrator' }, null, 2)}\n`,
    'utf8'
  );
  await writeFile(join(root, 'bin', 'codex-orchestrator.ts'), 'console.log("source");\n', 'utf8');
  git(root, ['init', '-b', 'main']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  const baseHash = git(root, ['rev-parse', 'HEAD']).stdout.trim();
  await writeFile(join(root, 'README.md'), 'fresh main\n', 'utf8');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'fresh main']);
  git(root, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  if (options.stale) {
    git(root, ['reset', '--hard', baseHash]);
  }
  return root;
}

function git(cwd: string, args: string[]): { stdout: string } {
  const result = spawnSync(
    'git',
    ['-c', 'user.name=Codex Test', '-c', 'user.email=codex@example.test', ...args],
    {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr || result.error?.message || 'unknown error'}`
    );
  }
  return { stdout: String(result.stdout ?? '') };
}
