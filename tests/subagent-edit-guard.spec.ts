import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), 'scripts', 'subagent-edit-guard.mjs');

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

async function runScript(
  repoDir: string,
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [scriptPath, ...args], {
      cwd: repoDir,
      env: {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: repoDir
      }
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return {
      code: Number((error as { code?: number }).code ?? 1),
      stdout: String((error as { stdout?: string }).stdout ?? ''),
      stderr: String((error as { stderr?: string }).stderr ?? '')
    };
  }
}

async function initRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'subagent-edit-guard-'));
  await mkdir(join(dir, 'src'), { recursive: true });
  await mkdir(join(dir, 'docs'), { recursive: true });
  await writeFile(join(dir, 'src', 'app.js'), "export const value = 'base';\n");
  await writeFile(join(dir, 'docs', 'README.md'), '# docs\n');

  await execFileAsync('git', ['init'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
  await execFileAsync('git', ['add', '.'], { cwd: dir });
  await execFileAsync('git', ['commit', '-m', 'init'], { cwd: dir });
  return dir;
}

describe('subagent-edit-guard script', () => {
  it('passes when changed paths stay within declared scopes', async () => {
    tempDir = await initRepo();

    const start = await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src']);
    expect(start.code).toBe(0);

    await writeFile(join(tempDir, 'src', 'app.js'), "export const value = 'changed';\n");

    const finish = await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(finish.code).toBe(0);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      out_of_scope_paths: string[];
    };
    expect(payload.status).toBe('ok');
    expect(payload.out_of_scope_paths).toEqual([]);

    const listed = await runScript(tempDir, ['list', '--format', 'json']);
    expect(listed.code).toBe(0);
    const listPayload = JSON.parse(listed.stdout) as { stream_count: number };
    expect(listPayload.stream_count).toBe(0);
  });

  it('fails when changed paths are outside declared scopes', async () => {
    tempDir = await initRepo();

    const start = await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src']);
    expect(start.code).toBe(0);

    await writeFile(join(tempDir, 'docs', 'README.md'), '# docs updated\n');

    const finish = await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(finish.code).toBe(1);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      out_of_scope_paths: string[];
    };
    expect(payload.status).toBe('out_of_scope_changes');
    expect(payload.out_of_scope_paths).toContain('docs/README.md');
  });

  it('fails read-only streams when any non-allowed file changes', async () => {
    tempDir = await initRepo();

    const start = await runScript(tempDir, ['start', '--stream', 'scout', '--mode', 'read-only', '--scopes', 'docs']);
    expect(start.code).toBe(0);

    await writeFile(join(tempDir, 'src', 'app.js'), "export const value = 'mutated';\n");

    const finish = await runScript(tempDir, ['finish', '--stream', 'scout', '--format', 'json']);
    expect(finish.code).toBe(1);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      violations: string[];
    };
    expect(payload.status).toBe('read_only_violation');
    expect(payload.violations).toContain('src/app.js');
  });

  it('allows peer stream changes when another write-enabled stream is still active', async () => {
    tempDir = await initRepo();

    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src'])
      ).code
    ).toBe(0);
    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'docs', '--mode', 'write-enabled', '--scopes', 'docs'])
      ).code
    ).toBe(0);

    await writeFile(join(tempDir, 'src', 'app.js'), "export const value = 'impl';\n");
    await writeFile(join(tempDir, 'docs', 'README.md'), '# docs from peer stream\n');

    const finish = await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(finish.code).toBe(0);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      peer_scope_paths: string[];
      out_of_scope_paths: string[];
    };
    expect(payload.status).toBe('ok');
    expect(payload.peer_scope_paths).toContain('docs/README.md');
    expect(payload.out_of_scope_paths).toEqual([]);
  });

  it('keeps peer ownership after one stream finishes first', async () => {
    tempDir = await initRepo();

    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src'])
      ).code
    ).toBe(0);
    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'docs', '--mode', 'write-enabled', '--scopes', 'docs'])
      ).code
    ).toBe(0);

    await writeFile(join(tempDir, 'src', 'app.js'), "export const value = 'impl';\n");
    await writeFile(join(tempDir, 'docs', 'README.md'), '# docs from peer stream\n');

    expect((await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json'])).code).toBe(0);

    const secondFinish = await runScript(tempDir, ['finish', '--stream', 'docs', '--format', 'json']);
    expect(secondFinish.code).toBe(0);
    const payload = JSON.parse(secondFinish.stdout) as {
      status: string;
      peer_scope_paths: string[];
      out_of_scope_paths: string[];
    };
    expect(payload.status).toBe('ok');
    expect(payload.peer_scope_paths).toContain('src/app.js');
    expect(payload.out_of_scope_paths).toEqual([]);
  });

  it('fails when a closed peer scope changes after the peer stream finished', async () => {
    tempDir = await initRepo();

    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src'])
      ).code
    ).toBe(0);
    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'docs', '--mode', 'write-enabled', '--scopes', 'docs'])
      ).code
    ).toBe(0);

    await writeFile(join(tempDir, 'docs', 'README.md'), '# docs by docs stream\n');
    expect((await runScript(tempDir, ['finish', '--stream', 'docs', '--format', 'json'])).code).toBe(0);

    await writeFile(join(tempDir, 'docs', 'README.md'), '# docs changed after docs stream closed\n');
    await writeFile(join(tempDir, 'src', 'app.js'), "export const value = 'impl';\n");

    const finish = await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(finish.code).toBe(1);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      out_of_scope_paths: string[];
    };
    expect(payload.status).toBe('out_of_scope_changes');
    expect(payload.out_of_scope_paths).toContain('docs/README.md');
  });

  it('flags overlapping scope edits as ownership collisions', async () => {
    tempDir = await initRepo();
    await mkdir(join(tempDir, 'src', 'utils'), { recursive: true });
    await writeFile(join(tempDir, 'src', 'utils', 'helper.ts'), "export const helper = 'base';\n");
    await execFileAsync('git', ['add', '.'], { cwd: tempDir });
    await execFileAsync('git', ['commit', '-m', 'add helper'], { cwd: tempDir });

    expect(
      (await runScript(tempDir, ['start', '--stream', 'a', '--mode', 'write-enabled', '--scopes', 'src'])).code
    ).toBe(0);
    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'b', '--mode', 'write-enabled', '--scopes', 'src/utils'])
      ).code
    ).toBe(0);

    await writeFile(join(tempDir, 'src', 'utils', 'helper.ts'), "export const helper = 'changed';\n");

    const finish = await runScript(tempDir, ['finish', '--stream', 'a', '--format', 'json']);
    expect(finish.code).toBe(1);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      collision_paths: string[];
    };
    expect(payload.status).toBe('ownership_collision');
    expect(payload.collision_paths).toContain('src/utils/helper.ts');
  });

  it('handles in-scope files with spaces', async () => {
    tempDir = await initRepo();
    await writeFile(join(tempDir, 'src', 'a b.txt'), 'base\n');
    await execFileAsync('git', ['add', '.'], { cwd: tempDir });
    await execFileAsync('git', ['commit', '-m', 'add spaced file'], { cwd: tempDir });

    const start = await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src']);
    expect(start.code).toBe(0);

    await writeFile(join(tempDir, 'src', 'a b.txt'), 'changed\n');

    const finish = await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(finish.code).toBe(0);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      out_of_scope_paths: string[];
      own_scope_paths: string[];
    };
    expect(payload.status).toBe('ok');
    expect(payload.own_scope_paths).toContain('src/a b.txt');
    expect(payload.out_of_scope_paths).toEqual([]);
  });

  it('flags cross-scope renames using the destination path', async () => {
    tempDir = await initRepo();
    await writeFile(join(tempDir, 'src', 'rename-me.ts'), "export const value = 'x';\n");
    await execFileAsync('git', ['add', '.'], { cwd: tempDir });
    await execFileAsync('git', ['commit', '-m', 'add rename fixture'], { cwd: tempDir });

    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src'])
      ).code
    ).toBe(0);

    await execFileAsync('git', ['mv', 'src/rename-me.ts', 'docs/rename-me.ts'], { cwd: tempDir });

    const finish = await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(finish.code).toBe(1);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      out_of_scope_paths: string[];
    };
    expect(payload.status).toBe('out_of_scope_changes');
    expect(payload.out_of_scope_paths).toContain('docs/rename-me.ts');
  });

  it('rolls baseline forward when finish uses --keep', async () => {
    tempDir = await initRepo();

    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src'])
      ).code
    ).toBe(0);

    await writeFile(join(tempDir, 'src', 'app.js'), "export const value = 'first';\n");
    const firstFinish = await runScript(tempDir, ['finish', '--stream', 'impl', '--keep', '--format', 'json']);
    expect(firstFinish.code).toBe(0);

    const secondFinish = await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(secondFinish.code).toBe(0);
    const payload = JSON.parse(secondFinish.stdout) as {
      status: string;
      changed_paths: string[];
    };
    expect(payload.status).toBe('ok');
    expect(payload.changed_paths).toEqual([]);
  });

  it('detects edits to already-dirty files with unchanged porcelain status', async () => {
    tempDir = await initRepo();

    await writeFile(join(tempDir, 'docs', 'README.md'), '# docs pre-dirty\n');

    expect(
      (
        await runScript(tempDir, ['start', '--stream', 'impl', '--mode', 'write-enabled', '--scopes', 'src'])
      ).code
    ).toBe(0);

    await writeFile(join(tempDir, 'docs', 'README.md'), '# docs mutated during stream\n');

    const finish = await runScript(tempDir, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(finish.code).toBe(1);
    const payload = JSON.parse(finish.stdout) as {
      status: string;
      out_of_scope_paths: string[];
      changed_paths: string[];
    };
    expect(payload.status).toBe('out_of_scope_changes');
    expect(payload.changed_paths).toContain('docs/README.md');
    expect(payload.out_of_scope_paths).toContain('docs/README.md');
  });

  it('uses a worktree-safe default state path', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'subagent-edit-guard-worktree-'));
    const mainRepo = join(tempDir, 'main');
    const worktreeRepo = join(tempDir, 'wt');

    await mkdir(join(mainRepo, 'src'), { recursive: true });
    await writeFile(join(mainRepo, 'src', 'app.js'), "export const value = 'base';\n");

    await execFileAsync('git', ['init'], { cwd: mainRepo });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: mainRepo });
    await execFileAsync('git', ['config', 'user.name', 'Test User'], { cwd: mainRepo });
    await execFileAsync('git', ['add', '.'], { cwd: mainRepo });
    await execFileAsync('git', ['commit', '-m', 'init'], { cwd: mainRepo });
    await execFileAsync('git', ['worktree', 'add', worktreeRepo, '-b', 'guard-worktree-branch'], { cwd: mainRepo });

    const start = await runScript(worktreeRepo, [
      'start',
      '--stream',
      'impl',
      '--mode',
      'write-enabled',
      '--scopes',
      'src'
    ]);
    expect(start.code).toBe(0);

    const finish = await runScript(worktreeRepo, ['finish', '--stream', 'impl', '--format', 'json']);
    expect(finish.code).toBe(0);
  });
});
