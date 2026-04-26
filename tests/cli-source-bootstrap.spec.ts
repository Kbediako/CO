import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const BOOTSTRAP_PATH = join(process.cwd(), 'bin', 'codex-orchestrator.js');

let tempRoot: string | null = null;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

describe('checked-in CLI bootstrap', () => {
  it('prefers the source entrypoint when a checkout-local ts-node loader is available', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-source-'));
    await writeFakePackageRoot(tempRoot, {
      sourceBody: 'console.log("source-runner");\n',
      distBody: 'console.log("dist-runner");\n',
      withTsNodeLoader: true
    });

    const result = await runBootstrap(tempRoot);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('source-runner');
    expect(result.stderr).toBe('');
  });

  it('does not force strict repo-config mode when the caller left it unset', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-source-env-'));
    await writeFakePackageRoot(tempRoot, {
      sourceBody:
        'console.log(`repo-config-required=${process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED ?? ""}`);\n',
      distBody: 'console.log("dist-runner");\n',
      withTsNodeLoader: true
    });

    const result = await runBootstrap(tempRoot);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('repo-config-required=');
    expect(result.stderr).toBe('');
  });

  it('preserves an explicit repo-config override from the caller', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-source-env-override-'));
    await writeFakePackageRoot(tempRoot, {
      sourceBody:
        'console.log(`repo-config-required=${process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED ?? ""}`);\n',
      distBody: 'console.log("dist-runner");\n',
      withTsNodeLoader: true
    });

    const result = await runBootstrap(tempRoot, {
      CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('repo-config-required=1');
    expect(result.stderr).toBe('');
  });

  it('forwards outer Node exec flags into the re-execed source entrypoint', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-execargv-'));
    await writeFakePackageRoot(tempRoot, {
      sourceBody: 'console.log(JSON.stringify(process.execArgv));\n',
      distBody: 'console.log("dist-runner");\n',
      withTsNodeLoader: true
    });

    const result = await runBootstrap(tempRoot, {}, { nodeArgs: ['--conditions=review-check'] });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.trim()) as string[]).toContain('--conditions=review-check');
    expect(result.stderr).toBe('');
  });

  it('pins TS_NODE_PROJECT to the package root when source mode runs from another cwd', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-project-'));
    await writeFakePackageRoot(tempRoot, {
      sourceBody: 'console.log(`ts-node-project=${process.env.TS_NODE_PROJECT ?? ""}`);\n',
      distBody: 'console.log("dist-runner");\n',
      withTsNodeLoader: true
    });

    const callerCwd = await mkdtemp(join(tmpdir(), 'cli-bootstrap-caller-'));
    try {
      const result = await runBootstrap(tempRoot, {}, { cwd: callerCwd });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim().startsWith('ts-node-project=')).toBe(true);
      expect(result.stdout.trim().endsWith(join(tempRoot, 'tsconfig.json'))).toBe(true);
      expect(result.stderr).toBe('');
    } finally {
      await rm(callerCwd, { recursive: true, force: true });
    }
  });

  it('forwards termination signals to the re-execed source entrypoint', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-signal-forwarding-'));
    await writeFakePackageRoot(tempRoot, {
      sourceBody: [
        "import { writeFile } from 'node:fs/promises';",
        'const keepAlive = setInterval(() => {}, 1_000);',
        "process.once('SIGTERM', () => {",
        '  clearInterval(keepAlive);',
        "  void writeFile(new URL('../child-signal.txt', import.meta.url), 'SIGTERM\\n', 'utf8').then(() => {",
        '    process.exit(0);',
        '  });',
        '});',
        "process.stdout.write('ready\\n');"
      ].join('\n'),
      distBody: 'console.log("dist-runner");\n',
      withTsNodeLoader: true
    });

    const result = await runBootstrapInteractive(tempRoot, async ({ child, waitForStdout }) => {
      await waitForStdout('ready\n');
      child.kill('SIGTERM');
    });

    expect(result.stdout).toContain('ready');
    await waitForFileContents(join(tempRoot, 'child-signal.txt'), 'SIGTERM\n');
    expect(result.stderr).toBe('');
  }, 15_000);

  it('falls back to dist with an explicit warning when the source runtime is unavailable', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-dist-'));
    await writeFakePackageRoot(tempRoot, {
      sourceBody: 'console.log("source-runner");\n',
      distBody: 'console.log("dist-runner");\n',
      withTsNodeLoader: false
    });

    const result = await runBootstrap(tempRoot);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('dist-runner');
    expect(result.stderr).toContain('Source checkout fallback');
    expect(result.stderr).toContain('Fresh merged TypeScript changes may remain stale until dist is rebuilt.');
  });

  it('ignores inherited package-root overrides that point at a different checkout', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-foreign-root-'));
    await writeFakePackageRoot(tempRoot, {
      sourceBody: 'console.log("package-dist-source");\n',
      distBody: 'console.log("package-dist-runner");\n',
      withTsNodeLoader: false
    });

    const foreignRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-foreign-root-source-'));
    try {
      await writeFakePackageRoot(foreignRoot, {
        sourceBody: 'console.log("foreign-source-runner");\n',
        distBody: 'console.log("foreign-dist-runner");\n',
        withTsNodeLoader: true
      });

      const result = await runBootstrap(tempRoot, {
        CODEX_ORCHESTRATOR_PACKAGE_ROOT: foreignRoot
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('package-dist-runner');
      expect(result.stdout).not.toContain('foreign-source-runner');
      expect(result.stderr).toContain('Source checkout fallback');
      expect(result.stderr).toContain(join(tempRoot, 'bin', 'codex-orchestrator.ts'));
    } finally {
      await rm(foreignRoot, { recursive: true, force: true });
    }
  });

  it('ignores ancestor package-root overrides for nested worktrees', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'cli-bootstrap-parent-repo-'));
    const worktreesRoot = join(repoRoot, '.workspaces');
    tempRoot = join(worktreesRoot, 'issue-checkout');
    await mkdir(tempRoot, { recursive: true });
    await writeFakePackageRoot(tempRoot, {
      sourceBody: 'console.log("nested-worktree-source");\n',
      distBody: 'console.log("nested-worktree-dist");\n',
      withTsNodeLoader: false
    });

    try {
      for (const ancestorRoot of [repoRoot, worktreesRoot]) {
        const result = await runBootstrap(tempRoot, {
          CODEX_ORCHESTRATOR_PACKAGE_ROOT: ancestorRoot
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('nested-worktree-dist');
        expect(result.stderr).toContain('Source checkout fallback');
        expect(result.stderr).toContain(join(tempRoot, 'bin', 'codex-orchestrator.ts'));
      }
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
      tempRoot = null;
    }
  });
});

async function writeFakePackageRoot(
  packageRoot: string,
  options: { sourceBody: string; distBody: string; withTsNodeLoader: boolean }
): Promise<void> {
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name: 'cli-bootstrap-fixture', type: 'module' }),
    'utf8'
  );
  await writeFile(join(packageRoot, 'tsconfig.json'), '{ "compilerOptions": { "module": "nodenext" } }\n', 'utf8');
  await mkdir(join(packageRoot, 'bin'), { recursive: true });
  await mkdir(join(packageRoot, 'dist', 'bin'), { recursive: true });
  await writeFile(join(packageRoot, 'bin', 'codex-orchestrator.js'), await readFile(BOOTSTRAP_PATH, 'utf8'), 'utf8');
  await writeFile(join(packageRoot, 'bin', 'codex-orchestrator.ts'), options.sourceBody, 'utf8');
  await writeFile(join(packageRoot, 'dist', 'bin', 'codex-orchestrator.js'), options.distBody, 'utf8');
  if (!options.withTsNodeLoader) {
    return;
  }

  const tsNodeRoot = join(packageRoot, 'node_modules', 'ts-node');
  await mkdir(tsNodeRoot, { recursive: true });
  await writeFile(
    join(tsNodeRoot, 'package.json'),
    JSON.stringify({
      name: 'ts-node',
      exports: {
        './esm': './esm.mjs'
      }
    }),
    'utf8'
  );
  await writeFile(
    join(tsNodeRoot, 'esm.mjs'),
    [
      "import { readFile } from 'node:fs/promises'",
      '',
      'export async function resolve(specifier, context, nextResolve) {',
      '  return await nextResolve(specifier, context)',
      '}',
      '',
      'export async function load(url, context, nextLoad) {',
      "  if (url.endsWith('.ts')) {",
      '    return {',
      "      format: 'module',",
      "      shortCircuit: true,",
      "      source: await readFile(new URL(url), 'utf8')",
      '    }',
      '  }',
      '  return await nextLoad(url, context)',
      '}',
      ''
    ].join('\n'),
    'utf8'
  );
}

async function runBootstrap(
  packageRoot: string,
  envOverrides: Record<string, string | undefined> = {},
  options: { nodeArgs?: string[]; entryArgs?: string[]; cwd?: string } = {}
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        ...(options.nodeArgs ?? []),
        join(packageRoot, 'bin', 'codex-orchestrator.js'),
        ...(options.entryArgs ?? [])
      ],
      {
        cwd: options.cwd ?? packageRoot,
        env: buildBootstrapEnv(envOverrides),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', reject);
    child.once('close', (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

async function runBootstrapInteractive(
  packageRoot: string,
  interact: (helpers: {
    child: ReturnType<typeof spawn>;
    waitForStdout: (expected: string) => Promise<void>;
  }) => Promise<void>,
  envOverrides: Record<string, string | undefined> = {},
  options: { nodeArgs?: string[]; entryArgs?: string[]; cwd?: string } = {}
): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        ...(options.nodeArgs ?? []),
        join(packageRoot, 'bin', 'codex-orchestrator.js'),
        ...(options.entryArgs ?? [])
      ],
      {
        cwd: options.cwd ?? packageRoot,
        env: buildBootstrapEnv(envOverrides),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let settled = false;
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const rejectOnce = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
      reject(error);
    };

    child.once('error', rejectOnce);
    child.once('close', (exitCode, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        exitCode,
        signal: typeof signal === 'string' ? signal : null,
        stdout,
        stderr
      });
    });

    void interact({
      child,
      waitForStdout: (expected) => waitForOutput(() => stdout, expected)
    }).catch(rejectOnce);
  });
}

async function waitForOutput(readOutput: () => string, expected: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (readOutput().includes(expected)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for output: ${expected}`);
}

function buildBootstrapEnv(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of [
    'CODEX_ORCHESTRATOR_PACKAGE_ROOT',
    'CODEX_ORCHESTRATOR_CONFIG_MODE',
    'CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED',
    'TS_NODE_PROJECT'
  ]) {
    delete env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
      continue;
    }
    env[key] = value;
  }
  return env;
}

async function waitForFileContents(path: string, expected: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      if ((await readFile(path, 'utf8')) === expected) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error(`Timed out waiting for file contents: ${path}`);
}
