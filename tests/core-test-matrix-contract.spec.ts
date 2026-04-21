import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const createdDirs: string[] = [];

type PackageJson = {
  scripts?: Record<string, string>;
};

type VitestInvocation = {
  lifecycle: string | undefined;
  argv: string[];
};

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('core test matrix command contract', () => {
  it('declares the package scripts that split core, adapter, and evaluation lanes', async () => {
    const scripts = await readPackageScripts();

    expect(scripts.test).toBe('npm run test:core --');
    expect(scripts['test:core']).toBe('vitest run --config vitest.config.core.ts');
    expect(scripts['test:orchestrator']).toBe('npm run test:core --');
    expect(scripts['test:adapters']).toBe('vitest run --passWithNoTests --config vitest.config.adapters.ts');
    expect(scripts['test:evaluation']).toBe(
      'vitest run --passWithNoTests --config vitest.config.evaluation.ts'
    );
    expect(scripts['eval:test']).toBe('npm run test:evaluation --');

    expect(scripts['test:all']).toBe('node scripts/run-test-all.mjs');
  });

  it('forwards npm-run arguments through delegated package-script aliases', async () => {
    const harness = await createNpmScriptHarness(await readPackageScripts());
    const forwardedArgs = ['--run', 'tests/focused.spec.ts', '-t', 'argument forwarding'];

    await runPackageScript(harness, 'test', forwardedArgs);
    expect(await readVitestInvocations(harness.logPath)).toEqual([
      {
        lifecycle: 'test:core',
        argv: ['run', '--config', 'vitest.config.core.ts', ...forwardedArgs]
      }
    ]);

    await runPackageScript(harness, 'test:orchestrator', forwardedArgs);
    expect(await readVitestInvocations(harness.logPath)).toEqual([
      {
        lifecycle: 'test:core',
        argv: ['run', '--config', 'vitest.config.core.ts', ...forwardedArgs]
      }
    ]);

    await runPackageScript(harness, 'test:adapters', forwardedArgs);
    expect(await readVitestInvocations(harness.logPath)).toEqual([
      {
        lifecycle: 'test:adapters',
        argv: ['run', '--passWithNoTests', '--config', 'vitest.config.adapters.ts', ...forwardedArgs]
      }
    ]);

    await runPackageScript(harness, 'eval:test', forwardedArgs);
    expect(await readVitestInvocations(harness.logPath)).toEqual([
      {
        lifecycle: 'test:evaluation',
        argv: ['run', '--passWithNoTests', '--config', 'vitest.config.evaluation.ts', ...forwardedArgs]
      }
    ]);
  });

  it('forwards npm-run arguments to both delegated test:all lanes', async () => {
    const harness = await createNpmScriptHarness(await readPackageScripts());
    const forwardedArgs = ['--run', 'tests/focused.spec.ts'];

    await runPackageScript(harness, 'test:all', forwardedArgs);

    expect(await readVitestInvocations(harness.logPath)).toEqual([
      {
        lifecycle: 'test:core',
        argv: ['run', '--config', 'vitest.config.core.ts', '--passWithNoTests', ...forwardedArgs]
      },
      {
        lifecycle: 'test:adapters',
        argv: ['run', '--passWithNoTests', '--config', 'vitest.config.adapters.ts', ...forwardedArgs]
      }
    ]);
  });

  it('lets adapter-only filters reach the adapter lane', async () => {
    const harness = await createNpmScriptHarness(await readPackageScripts());
    const forwardedArgs = ['adapters/tests/registry.test.ts'];

    await runPackageScript(harness, 'test:all', forwardedArgs, {
      VITEST_FAIL_CORE_ADAPTER_FILTER: '1'
    });

    expect(await readVitestInvocations(harness.logPath)).toEqual([
      {
        lifecycle: 'test:core',
        argv: ['run', '--config', 'vitest.config.core.ts', '--passWithNoTests', ...forwardedArgs]
      },
      {
        lifecycle: 'test:adapters',
        argv: ['run', '--passWithNoTests', '--config', 'vitest.config.adapters.ts', ...forwardedArgs]
      }
    ]);
  });

  it('keeps GitHub Core Lane pointed at the core Vitest lane', async () => {
    const workflow = await readFile(join(repoRoot, '.github', 'workflows', 'core-lane.yml'), 'utf8');

    expect(extractWorkflowStepRun(workflow, 'Test (core matrix)')).toBe('npm run test:core');
    expect(extractWorkflowStepRun(workflow, 'Test')).toBeUndefined();
  });
});

async function readPackageScripts(): Promise<Record<string, string>> {
  const raw = await readFile(join(repoRoot, 'package.json'), 'utf8');
  const pkg = JSON.parse(raw) as PackageJson;
  return pkg.scripts ?? {};
}

async function createNpmScriptHarness(scripts: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'core-test-matrix-contract-'));
  createdDirs.push(root);

  const binDir = join(root, 'bin');
  const scriptsDir = join(root, 'scripts');
  const logPath = join(root, 'vitest-calls.jsonl');
  await mkdir(binDir, { recursive: true });
  await mkdir(scriptsDir, { recursive: true });
  await writeFile(join(root, 'package.json'), `${JSON.stringify({ private: true, scripts }, null, 2)}\n`, 'utf8');
  await writeFile(
    join(scriptsDir, 'run-test-all.mjs'),
    await readFile(join(repoRoot, 'scripts', 'run-test-all.mjs'), 'utf8'),
    'utf8'
  );
  await writeFile(
    join(binDir, 'vitest'),
    [
      '#!/usr/bin/env node',
      "const { appendFileSync } = require('node:fs');",
      'const lifecycle = process.env.npm_lifecycle_event;',
      'const argv = process.argv.slice(2);',
      'appendFileSync(',
      '  process.env.VITEST_CALL_LOG,',
      "  JSON.stringify({ lifecycle, argv }) + '\\n'",
      ');',
      "if (process.env.VITEST_FAIL_CORE_ADAPTER_FILTER === '1' && lifecycle === 'test:core' && argv.some((arg) => arg.startsWith('adapters/')) && !argv.includes('--passWithNoTests')) {",
      '  process.exit(1);',
      '}',
      ''
    ].join('\n'),
    'utf8'
  );
  await chmod(join(binDir, 'vitest'), 0o755);

  return { root, binDir, logPath };
}

async function runPackageScript(
  harness: { root: string; binDir: string; logPath: string },
  script: string,
  args: string[],
  extraEnv: NodeJS.ProcessEnv = {}
) {
  await writeFile(harness.logPath, '', 'utf8');
  await execFileAsync(npmBin(), ['run', '--silent', script, '--', ...args], {
    cwd: harness.root,
    env: {
      ...process.env,
      ...extraEnv,
      PATH: `${harness.binDir}${delimiter}${process.env.PATH ?? ''}`,
      VITEST_CALL_LOG: harness.logPath
    },
    timeout: 30_000
  });
}

async function readVitestInvocations(logPath: string): Promise<VitestInvocation[]> {
  const raw = await readFile(logPath, 'utf8');
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as VitestInvocation);
}

function npmBin(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function extractWorkflowStepRun(workflow: string, stepName: string): string | undefined {
  const lines = workflow.split(/\r?\n/);
  const stepLine = `- name: ${stepName}`;
  const start = lines.findIndex((line) => line.trim() === stepLine);

  if (start === -1) {
    return undefined;
  }

  for (let index = start + 1; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith('- name: ')) {
      return undefined;
    }
    if (trimmed.startsWith('run: ')) {
      return trimmed.slice('run: '.length);
    }
  }

  return undefined;
}
