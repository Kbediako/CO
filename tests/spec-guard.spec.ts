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
  await mkdir(join(dir, 'orchestrator/src'), { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  await writeFile(
    join(dir, 'tasks/specs/0001-initial.md'),
    `last_review: ${today}\n\nInitial spec.\n`
  );
  await writeFile(join(dir, 'src/index.ts'), 'export const value = 1;\n');
  await writeFile(join(dir, 'orchestrator/src/index.ts'), 'export const orchestratorValue = 1;\n');

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
      'code/migrations changed but no spec updated under tasks/specs, docs/design/specs, or tasks/index.json'
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

  it('reports missing spec updates when orchestrator/src changes without spec touch (dry-run)', async () => {
    const repo = await initRepository();

    await writeFile(join(repo, 'orchestrator/src/index.ts'), 'export const orchestratorValue = 2;\n');
    await execFileAsync('git', ['commit', '-am', 'update orchestrator code'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain(
      'code/migrations changed but no spec updated under tasks/specs, docs/design/specs, or tasks/index.json'
    );
    expect(stdout).toContain('Dry run: exiting successfully despite failures.');
  });

  it('passes when orchestrator/src changes include a fresh spec update', async () => {
    const repo = await initRepository();
    const today = new Date().toISOString().slice(0, 10);

    await writeFile(join(repo, 'orchestrator/src/index.ts'), 'export const orchestratorValue = 3;\n');
    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      `last_review: ${today}\n\nUpdated spec content for orchestrator change.\n`
    );

    await execFileAsync(
      'git',
      ['add', 'orchestrator/src/index.ts', 'tasks/specs/0001-initial.md'],
      {
        cwd: repo
      }
    );
    await execFileAsync('git', ['commit', '-m', 'orchestrator and spec update'], { cwd: repo });

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('skips completed specs during freshness checks', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: completed', 'last_review: 2000-01-01', '---', '', 'Completed spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('skips archived spec stubs during freshness checks', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      [
        '# Archived Document',
        '',
        'last_review: 2000-01-01',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-04-08. Full content: https://example.com/archive.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: tasks/specs/0001-initial.md',
        ''
      ].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('does not skip archive stubs whose archive path targets another file', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      [
        '# Archived Document',
        '',
        'last_review: 2000-01-01',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-04-08. Full content: https://example.com/archive.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: tasks/specs/other-spec.md',
        ''
      ].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain("tasks/specs/0001-initial.md: last_review 2000-01-01");
  });

  it('skips archived spec stubs when archive metadata uses Windows separators', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      [
        '# Archived Document',
        '',
        'last_review: 2000-01-01',
        '',
        '<!-- docs-archive:stub -->',
        '> Archived on 2026-04-08. Full content: https://example.com/archive.md',
        '',
        '- Archive branch: doc-archives',
        '- Archive path: tasks\\specs\\0001-initial.md',
        ''
      ].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout.trim()).toContain('✅ Spec guard: OK');
  });

  it('still reports stale active specs', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      ['---', 'status: in_progress', 'last_review: 2000-01-01', '---', '', 'Active spec.'].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain("tasks/specs/0001-initial.md: last_review 2000-01-01");
  });

  it('does not skip active specs that mention the archive marker in their body', async () => {
    const repo = await initRepository();

    await writeFile(
      join(repo, 'tasks/specs/0001-initial.md'),
      [
        '---',
        'status: in_progress',
        'last_review: 2000-01-01',
        '---',
        '',
        'Documentation can mention `<!-- docs-archive:stub -->` without becoming an archive stub.'
      ].join('\n')
    );

    const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
      cwd: repo,
      env: { ...process.env }
    });

    expect(stdout).toContain('❌ Spec guard: issues detected');
    expect(stdout).toContain("tasks/specs/0001-initial.md: last_review 2000-01-01");
  });
});
