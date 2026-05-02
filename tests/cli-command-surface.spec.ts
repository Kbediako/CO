import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDirectExecution, runCodexOrchestratorCli } from '../bin/codex-orchestrator.ts';
import { REPO_CONFIG_PATH_ENV_KEY } from '../orchestrator/src/cli/config/userConfig.js';
import * as delegationMcpHealth from '../orchestrator/src/cli/utils/delegationMcpHealth.js';
import {
  PROVIDER_OVERRIDE_ENV_KEYS,
  sanitizeProviderOverrideEnv
} from '../orchestrator/src/cli/utils/providerOverrideEnv.js';
import { shouldUseFreshDist } from './helpers/distFreshness.js';
import { runEntrypointLikeExec } from './helpers/inProcessEntrypoint.js';

const execFileAsync = promisify(execFile);
const CLI_ENTRY = join(process.cwd(), 'bin', 'codex-orchestrator.ts');
const CLI_ENTRY_DIST = join(process.cwd(), 'dist', 'bin', 'codex-orchestrator.js');
const PACKAGE_JSON_PATH = fileURLToPath(new URL('../package.json', import.meta.url));
const CLI_BOOT_TIMEOUT = 30000;
const CLI_SOURCE_ENTRY_TIMEOUT = 60000;
const TEST_TIMEOUT = CLI_BOOT_TIMEOUT;
const CLI_EXEC_TIMEOUT_MS = TEST_TIMEOUT;
const CLI_BINARY_SHELL_TIMEOUT = 60000;
const FLOW_TARGET_TEST_TIMEOUT = 70000;
const SKILLS_INSTALL_JSON_TIMEOUT = 70000;
const RUNTIME_TEST_ENV_KEYS = [
  'CODEX_ORCHESTRATOR_RUNTIME_MODE',
  'CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE',
  'CODEX_RUNTIME_MODE'
] as const;
const REPO_CONFIG_TEST_ENV_KEYS = [
  'CODEX_ORCHESTRATOR_CONFIG_MODE',
  'CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED',
  REPO_CONFIG_PATH_ENV_KEY
] as const;
const CLI_SANITIZED_ENV_KEYS = [...RUNTIME_TEST_ENV_KEYS, ...REPO_CONFIG_TEST_ENV_KEYS] as const;
const DEFAULT_RUNTIME_TEST_ENV = {
  CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli',
  CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'cli',
  CODEX_RUNTIME_MODE: 'cli'
} satisfies NodeJS.ProcessEnv;
const DEFAULT_REPO_CONFIG_TEST_ENV = {
  [REPO_CONFIG_PATH_ENV_KEY]: '',
  CODEX_ORCHESTRATOR_CONFIG_MODE: '',
  CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: ''
} satisfies NodeJS.ProcessEnv;

let tempDir: string | null = null;
afterEach(async () => {
  vi.restoreAllMocks();
  if (!tempDir) {
    return;
  }
  await rm(tempDir, { recursive: true, force: true });
  tempDir = null;
});

async function runCli(
  args: string[],
  env?: NodeJS.ProcessEnv,
  _timeoutMs: number = CLI_EXEC_TIMEOUT_MS,
  explicitProviderOverrideKeys: ReadonlySet<string> = new Set()
): Promise<{ stdout: string; stderr: string }> {
  return await runEntrypointLikeExec({
    args,
    env: buildCliEnv(env, explicitProviderOverrideKeys),
    runner: runCodexOrchestratorCli
  });
}

async function runCliSubprocess(
  args: string[],
  env?: NodeJS.ProcessEnv,
  timeoutMs: number = CLI_EXEC_TIMEOUT_MS,
  explicitProviderOverrideKeys: ReadonlySet<string> = new Set()
): Promise<{ stdout: string; stderr: string }> {
  const cliEnv = buildCliEnv(env, explicitProviderOverrideKeys);
  const entryArgs = (await shouldUseFreshDist(CLI_ENTRY, CLI_ENTRY_DIST))
    ? [CLI_ENTRY_DIST, ...args]
    : ['--loader', 'ts-node/esm', CLI_ENTRY, ...args];
  return await execFileAsync(process.execPath, entryArgs, {
    env: cliEnv,
    timeout: timeoutMs
  });
}

async function runCliSourceSubprocess(
  args: string[],
  env?: NodeJS.ProcessEnv,
  timeoutMs: number = CLI_SOURCE_ENTRY_TIMEOUT,
  explicitProviderOverrideKeys: ReadonlySet<string> = new Set()
): Promise<{ stdout: string; stderr: string }> {
  return await execFileAsync(process.execPath, ['--loader', 'ts-node/esm', CLI_ENTRY, ...args], {
    env: buildCliEnv(env, explicitProviderOverrideKeys),
    timeout: timeoutMs
  });
}

function mockDelegationServerInvocation(distPath: string): void {
  vi.spyOn(delegationMcpHealth, 'resolveDelegationServerInvocation').mockReturnValue({
    command: process.execPath,
    args: [distPath, 'delegate-server'],
    distPath,
    commandLine: `${process.execPath} ${distPath} delegate-server`
  });
}

describe('shouldUseFreshDist', () => {
  it('uses dist when the source entry is missing but the built entry exists', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const distEntry = join(tempRoot, 'dist-entry.js');
    try {
      await writeFile(distEntry, 'console.log("dist");', 'utf8');
      await expect(shouldUseFreshDist(join(tempRoot, 'missing-source.ts'), distEntry)).resolves.toBe(
        true
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('treats dist as stale when a newer transitive CLI dependency exists', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'bin', 'codex-orchestrator.ts');
    const transitiveDependency = join(
      tempRoot,
      'orchestrator',
      'src',
      'cli',
      'controlHostCliShell.ts'
    );
    const deeperDependency = join(tempRoot, 'scripts', 'lib', 'provider-run-contract.ts');
    const distEntry = join(tempRoot, 'dist', 'bin', 'codex-orchestrator.js');

    try {
      await mkdir(join(tempRoot, 'bin'), { recursive: true });
      await mkdir(join(tempRoot, 'orchestrator', 'src', 'cli'), { recursive: true });
      await mkdir(join(tempRoot, 'scripts', 'lib'), { recursive: true });
      await mkdir(join(tempRoot, 'dist', 'bin'), { recursive: true });
      await writeFile(
        sourceEntry,
        "import { runControlHostCliShell } from '../orchestrator/src/cli/controlHostCliShell.js';\nexport { runControlHostCliShell };\n",
        'utf8'
      );
      await writeFile(
        transitiveDependency,
        "export { runProviderContract } from '../../../scripts/lib/provider-run-contract.js';\n",
        'utf8'
      );
      await writeFile(deeperDependency, 'export function runProviderContract() {}\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:01.000Z');
      const dependencyAt = new Date('2026-01-01T00:00:02.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(transitiveDependency, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);
      await utimes(deeperDependency, dependencyAt, dependencyAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('ignores newer sibling files outside the tracked CLI dependency closure', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'bin', 'codex-orchestrator.ts');
    const transitiveDependency = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.ts');
    const unrelatedSibling = join(tempRoot, 'orchestrator', 'src', 'cli', 'unusedCliShell.ts');
    const distEntry = join(tempRoot, 'dist', 'bin', 'codex-orchestrator.js');

    try {
      await mkdir(join(tempRoot, 'bin'), { recursive: true });
      await mkdir(join(tempRoot, 'orchestrator', 'src', 'cli'), { recursive: true });
      await mkdir(join(tempRoot, 'dist', 'bin'), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { runDoctorCliShell } from '../orchestrator/src/cli/doctorCliShell.js';\n",
        'utf8'
      );
      await writeFile(transitiveDependency, 'export function runDoctorCliShell() {}\n', 'utf8');
      await writeFile(unrelatedSibling, 'export const unused = true;\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:01.000Z');
      const siblingAt = new Date('2026-01-01T00:00:02.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(transitiveDependency, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);
      await utimes(unrelatedSibling, siblingAt, siblingAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('refreshes a cached dependency closure when a tracked file adds a new runtime import', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'bin', 'codex-orchestrator.ts');
    const transitiveDependency = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.ts');
    const newlyTrackedDependency = join(tempRoot, 'scripts', 'lib', 'provider-run-contract.ts');
    const distEntry = join(tempRoot, 'dist', 'bin', 'codex-orchestrator.js');

    try {
      await mkdir(join(tempRoot, 'bin'), { recursive: true });
      await mkdir(join(tempRoot, 'orchestrator', 'src', 'cli'), { recursive: true });
      await mkdir(join(tempRoot, 'scripts', 'lib'), { recursive: true });
      await mkdir(join(tempRoot, 'dist', 'bin'), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { runDoctorCliShell } from '../orchestrator/src/cli/doctorCliShell.js';\n",
        'utf8'
      );
      await writeFile(transitiveDependency, 'export function runDoctorCliShell() {}\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:01.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(transitiveDependency, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      const trackedUpdateAt = new Date('2026-01-01T00:00:02.000Z');
      await writeFile(
        transitiveDependency,
        "export { runProviderContract } from '../../../scripts/lib/provider-run-contract.js';\n",
        'utf8'
      );
      await writeFile(newlyTrackedDependency, 'export function runProviderContract() {}\n', 'utf8');
      await utimes(transitiveDependency, trackedUpdateAt, trackedUpdateAt);
      await utimes(newlyTrackedDependency, trackedUpdateAt, trackedUpdateAt);

      await writeFile(distEntry, 'export const rebuiltProviderContract = true;\n', 'utf8');

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      await writeFile(newlyTrackedDependency, 'export function runProviderContract() { return true; }\n', 'utf8');

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('refreshes a cached dependency closure when a higher-priority source candidate appears with an older mtime', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'bin', 'codex-orchestrator.ts');
    const transitiveDependencyTs = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.ts');
    const transitiveDependencyJs = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.js');
    const distEntry = join(tempRoot, 'dist', 'bin', 'codex-orchestrator.js');

    try {
      await mkdir(join(tempRoot, 'bin'), { recursive: true });
      await mkdir(join(tempRoot, 'orchestrator', 'src', 'cli'), { recursive: true });
      await mkdir(join(tempRoot, 'dist', 'bin'), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { runDoctorCliShell } from '../orchestrator/src/cli/doctorCliShell.js';\n",
        'utf8'
      );
      await writeFile(transitiveDependencyTs, 'export function runDoctorCliShell() {}\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:05.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(transitiveDependencyTs, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      const higherPriorityAt = new Date('2026-01-01T00:00:01.000Z');
      await writeFile(
        transitiveDependencyJs,
        'export function runDoctorCliShell() { return true; }\n',
        'utf8'
      );
      await utimes(transitiveDependencyJs, higherPriorityAt, higherPriorityAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('keeps dist stale after a higher-priority source candidate appears until dist mtime changes', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'bin', 'codex-orchestrator.ts');
    const transitiveDependencyTs = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.ts');
    const transitiveDependencyJs = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.js');
    const distEntry = join(tempRoot, 'dist', 'bin', 'codex-orchestrator.js');

    try {
      await mkdir(join(tempRoot, 'bin'), { recursive: true });
      await mkdir(join(tempRoot, 'orchestrator', 'src', 'cli'), { recursive: true });
      await mkdir(join(tempRoot, 'dist', 'bin'), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { runDoctorCliShell } from '../orchestrator/src/cli/doctorCliShell.js';\n",
        'utf8'
      );
      await writeFile(transitiveDependencyTs, 'export function runDoctorCliShell() {}\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:05.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(transitiveDependencyTs, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      const higherPriorityAt = new Date('2026-01-01T00:00:01.000Z');
      await writeFile(
        transitiveDependencyJs,
        'export function runDoctorCliShell() { return true; }\n',
        'utf8'
      );
      await utimes(transitiveDependencyJs, higherPriorityAt, higherPriorityAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);

      await chmod(distEntry, 0o755);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('treats dist as stale when the winning CLI source candidate disappears and resolution falls back to an older file', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'bin', 'codex-orchestrator.ts');
    const transitiveDependencyTs = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.ts');
    const transitiveDependencyJs = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.js');
    const distEntry = join(tempRoot, 'dist', 'bin', 'codex-orchestrator.js');

    try {
      await mkdir(join(tempRoot, 'bin'), { recursive: true });
      await mkdir(join(tempRoot, 'orchestrator', 'src', 'cli'), { recursive: true });
      await mkdir(join(tempRoot, 'dist', 'bin'), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { runDoctorCliShell } from '../orchestrator/src/cli/doctorCliShell.js';\n",
        'utf8'
      );
      await writeFile(transitiveDependencyTs, 'export function runDoctorCliShell() { return "ts"; }\n', 'utf8');
      await writeFile(transitiveDependencyJs, 'export function runDoctorCliShell() { return "js"; }\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const fallbackAt = new Date('2026-01-01T00:00:00.000Z');
      const winningAt = new Date('2026-01-01T00:00:01.000Z');
      const distAt = new Date('2026-01-01T00:00:05.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(transitiveDependencyTs, fallbackAt, fallbackAt);
      await utimes(transitiveDependencyJs, winningAt, winningAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      await rm(transitiveDependencyJs);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('keeps dist fresh when the winning CLI source candidate disappears and dist is rebuilt first', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'bin', 'codex-orchestrator.ts');
    const transitiveDependencyTs = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.ts');
    const transitiveDependencyJs = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.js');
    const distEntry = join(tempRoot, 'dist', 'bin', 'codex-orchestrator.js');

    try {
      await mkdir(join(tempRoot, 'bin'), { recursive: true });
      await mkdir(join(tempRoot, 'orchestrator', 'src', 'cli'), { recursive: true });
      await mkdir(join(tempRoot, 'dist', 'bin'), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { runDoctorCliShell } from '../orchestrator/src/cli/doctorCliShell.js';\n",
        'utf8'
      );
      await writeFile(transitiveDependencyTs, 'export function runDoctorCliShell() { return "ts"; }\n', 'utf8');
      await writeFile(transitiveDependencyJs, 'export function runDoctorCliShell() { return "js"; }\n', 'utf8');
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const fallbackAt = new Date('2026-01-01T00:00:00.000Z');
      const winningAt = new Date('2026-01-01T00:00:01.000Z');
      const distAt = new Date('2026-01-01T00:00:05.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(transitiveDependencyTs, fallbackAt, fallbackAt);
      await utimes(transitiveDependencyJs, winningAt, winningAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);

      await rm(transitiveDependencyJs);

      await writeFile(distEntry, 'export const rebuiltDoctorCliShell = "ts";\n', 'utf8');

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('refreshes a cached unresolved dependency when the missing runtime import becomes resolvable', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-fresh-dist-'));
    const sourceEntry = join(tempRoot, 'bin', 'codex-orchestrator.ts');
    const transitiveDependency = join(tempRoot, 'orchestrator', 'src', 'cli', 'doctorCliShell.ts');
    const initiallyMissingDependency = join(tempRoot, 'scripts', 'lib', 'provider-run-contract.ts');
    const distEntry = join(tempRoot, 'dist', 'bin', 'codex-orchestrator.js');

    try {
      await mkdir(join(tempRoot, 'bin'), { recursive: true });
      await mkdir(join(tempRoot, 'orchestrator', 'src', 'cli'), { recursive: true });
      await mkdir(join(tempRoot, 'scripts', 'lib'), { recursive: true });
      await mkdir(join(tempRoot, 'dist', 'bin'), { recursive: true });
      await writeFile(
        sourceEntry,
        "export { runDoctorCliShell } from '../orchestrator/src/cli/doctorCliShell.js';\n",
        'utf8'
      );
      await writeFile(
        transitiveDependency,
        "export { runProviderContract } from '../../../scripts/lib/provider-run-contract.js';\n",
        'utf8'
      );
      await writeFile(distEntry, 'export {};\n', 'utf8');

      const sourceAt = new Date('2026-01-01T00:00:00.000Z');
      const distAt = new Date('2026-01-01T00:00:01.000Z');
      await utimes(sourceEntry, sourceAt, sourceAt);
      await utimes(transitiveDependency, sourceAt, sourceAt);
      await utimes(distEntry, distAt, distAt);

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(false);

      const dependencyAt = new Date('2026-01-01T00:00:02.000Z');
      await writeFile(
        initiallyMissingDependency,
        'export function runProviderContract() { return true; }\n',
        'utf8'
      );
      await utimes(initiallyMissingDependency, dependencyAt, dependencyAt);

      await writeFile(distEntry, 'export const rebuiltProviderContract = true;\n', 'utf8');

      await expect(shouldUseFreshDist(sourceEntry, distEntry)).resolves.toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('isDirectExecution', () => {
  it('treats symlink-preserved entrypoints as direct execution', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'cli-direct-exec-'));
    const targetEntry = join(tempRoot, 'target.js');
    const symlinkEntry = join(tempRoot, 'symlink.js');
    try {
      await writeFile(targetEntry, 'export {};', 'utf8');
      await symlink(targetEntry, symlinkEntry);

      expect(isDirectExecution(symlinkEntry, pathToFileURL(await realpath(symlinkEntry)).href)).toBe(
        true
      );
      expect(isDirectExecution(symlinkEntry, pathToFileURL(symlinkEntry).href)).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

function buildCliEnv(
  env?: NodeJS.ProcessEnv,
  explicitProviderOverrideKeys: ReadonlySet<string> = new Set()
): NodeJS.ProcessEnv {
  const mergedEnv = sanitizeProviderOverrideEnv({
    ...process.env,
    ...(env ?? {})
  });
  const explicitRuntimeOverrides = Object.fromEntries(
    RUNTIME_TEST_ENV_KEYS.flatMap((key) => {
      if (!env || !Object.prototype.hasOwnProperty.call(env, key)) {
        return [];
      }
      if (env[key] === process.env[key] && Object.prototype.hasOwnProperty.call(process.env, key)) {
        return [];
      }
      return [[key, env[key]]];
    })
  ) as NodeJS.ProcessEnv;
  const explicitProviderOverrides = Object.fromEntries(
    REPO_CONFIG_TEST_ENV_KEYS.flatMap((key) => {
      if (!env || !Object.prototype.hasOwnProperty.call(env, key)) {
        return [];
      }
      if (
        !explicitProviderOverrideKeys.has(key) &&
        env[key] === process.env[key] &&
        Object.prototype.hasOwnProperty.call(process.env, key)
      ) {
        return [];
      }
      return [[key, env[key]]];
    })
  ) as NodeJS.ProcessEnv;
  for (const key of CLI_SANITIZED_ENV_KEYS) {
    delete mergedEnv[key];
  }
  for (const key of PROVIDER_OVERRIDE_ENV_KEYS) {
    delete mergedEnv[key];
  }
  return {
    ...mergedEnv,
    ...DEFAULT_RUNTIME_TEST_ENV,
    ...DEFAULT_REPO_CONFIG_TEST_ENV,
    NODE_NO_WARNINGS: '1',
    ...explicitProviderOverrides,
    ...explicitRuntimeOverrides
  };
}

function parseCliFailure(error: unknown): { stdout: string; stderr: string; exitCode: number } {
  const typed = error as NodeJS.ErrnoException & {
    stdout?: string | Buffer;
    stderr?: string | Buffer;
    code?: number | string;
    message?: string;
  };
  const hasCliFailureShape =
    typed &&
    (typed.code !== undefined || typed.stdout !== undefined || typed.stderr !== undefined);
  if (!hasCliFailureShape) {
    throw error;
  }
  const stdout = typeof typed.stdout === 'string' ? typed.stdout : typed.stdout?.toString() ?? '';
  const stderr = typeof typed.stderr === 'string' ? typed.stderr : typed.stderr?.toString() ?? '';
  const trimmedMessage = typeof typed.message === 'string' ? typed.message.trim() : '';
  const messageDetailStart = trimmedMessage.indexOf('\n');
  const messageDetail =
    messageDetailStart >= 0 ? trimmedMessage.slice(messageDetailStart + 1).trim() : trimmedMessage;
  const parsedExitCode =
    typeof typed.code === 'number'
      ? typed.code
      : typeof typed.code === 'string'
        ? Number(typed.code)
        : NaN;
  return {
    stdout,
    stderr: stderr || messageDetail,
    exitCode: Number.isInteger(parsedExitCode) && Number.isFinite(parsedExitCode) ? parsedExitCode : 1
  };
}

async function writeFakeCodexBinary(dir: string): Promise<string> {
  const binPath = join(dir, 'codex');
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "--version" ]; then',
      '  echo "codex 0.0.0-test"',
      '  exit 0',
      'fi',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      '  echo "multi_agent experimental true"',
      '  exit 0',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "--help" ]; then',
      '  exit 0',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "list" ]; then',
      '  if [ -n "$CODEX_TEST_CLOUD_LIST_LOG" ]; then',
      '    printf "%s\\n" "$*" >> "$CODEX_TEST_CLOUD_LIST_LOG"',
      '  fi',
      '  if [ -n "$CODEX_TEST_CLOUD_LIST_FAIL_MESSAGE" ]; then',
      '    echo "$CODEX_TEST_CLOUD_LIST_FAIL_MESSAGE" 1>&2',
      '    exit "${CODEX_TEST_CLOUD_LIST_FAIL_CODE:-1}"',
      '  fi',
      '  echo "{\\"tasks\\":[{\\"id\\":\\"task-test\\",\\"environment_id\\":\\"${CODEX_CLOUD_ENV_ID:-env-test}\\"}]}"',
      '  exit 0',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "exec" ]; then',
      '  if [ -n "$CODEX_TEST_CLOUD_EXEC_LOG" ]; then',
      '    printf "%s\\n" "$*" >> "$CODEX_TEST_CLOUD_EXEC_LOG"',
      '  fi',
      '  if [ -n "$CODEX_TEST_CLOUD_EXEC_FAIL_MESSAGE" ]; then',
      '    echo "$CODEX_TEST_CLOUD_EXEC_FAIL_MESSAGE" 1>&2',
      '    exit "${CODEX_TEST_CLOUD_EXEC_FAIL_CODE:-1}"',
      '  fi',
      '  echo "cloud exec mock ok"',
      '  exit 0',
      'fi',
      'if [ "$1" = "mcp" ] && [ "$2" = "list" ] && [ "$3" = "--json" ]; then',
      '  if [ -n "$CODEX_TEST_MCP_LIST_JSON" ]; then',
      '    echo "$CODEX_TEST_MCP_LIST_JSON"',
      '  else',
      '    echo "[]"',
      '  fi',
      '  exit 0',
      'fi',
      'if [ "$1" = "mcp" ] && [ "$2" = "add" ]; then',
      '  if [ -n "$CODEX_TEST_MCP_ADD_LOG" ]; then',
      '    printf "%s\\n" "$*" >> "$CODEX_TEST_MCP_ADD_LOG"',
      '  fi',
      '  if [ -n "$CODEX_TEST_MCP_ADD_FAIL" ]; then',
      '    echo "${CODEX_TEST_MCP_ADD_FAIL_MESSAGE:-simulated mcp add failure}" 1>&2',
      '    exit 1',
      '  fi',
      '  exit 0',
      'fi',
      'exit 0'
    ].join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

describe('codex-orchestrator command surface', () => {
  it('prints root help with quickstart guidance', async () => {
    const { stdout } = await runCliSourceSubprocess(['--help'], undefined, CLI_SOURCE_ENTRY_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator <command> [options]');
    expect(stdout).toContain('review [options]');
    expect(stdout).toContain('codex defaults');
    expect(stdout).toContain('--auth-scope <portable|chatgpt>');
    expect(stdout).toContain('Quickstart (agent-first):');
    expect(stdout).toContain('codex-orchestrator flow --task <task-id>');
    expect(stdout).toContain('NOTES="Goal: ... | Summary: ... | Risks: ..." codex-orchestrator review --task <task-id>');
    expect(stdout).toContain('codex-orchestrator doctor --usage --window-days 30');
  }, CLI_SOURCE_ENTRY_TIMEOUT);

  it('prints usage for unknown commands and exits non-zero', async () => {
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-unknown-command-'));
    const stdoutPath = join(tempDir, 'stdout.txt');
    const stderrPath = join(tempDir, 'stderr.txt');
    const exitCodePath = join(tempDir, 'exit-code.txt');

    await execFileAsync(
      '/bin/sh',
      [
        '-c',
        '"$NODE_BIN" --loader ts-node/esm "$CLI_ENTRY_PATH" unknown-command >"$CLI_STDOUT_PATH" 2>"$CLI_STDERR_PATH"; printf "%s" "$?" >"$CLI_EXIT_CODE_PATH"'
      ],
      {
        env: {
          ...buildCliEnv(),
          NODE_BIN: process.execPath,
          CLI_ENTRY_PATH: CLI_ENTRY,
          CLI_STDOUT_PATH: stdoutPath,
          CLI_STDERR_PATH: stderrPath,
          CLI_EXIT_CODE_PATH: exitCodePath
        },
        timeout: CLI_BINARY_SHELL_TIMEOUT
      }
    );

    stdout = await readFile(stdoutPath, 'utf8');
    stderr = await readFile(stderrPath, 'utf8');
    exitCode = Number((await readFile(exitCodePath, 'utf8')).trim());

    expect(exitCode).not.toBe(0);
    if (stderr.trim().length > 0) {
      expect(stderr).toMatch(/Unknown command: unknown-command|Command failed:/);
    }
    expect(stdout).toContain('Usage: codex-orchestrator <command> [options]');
  }, CLI_BINARY_SHELL_TIMEOUT);

  it('falls back to exec failure message detail when stderr is empty', () => {
    const parsed = parseCliFailure({
      code: 1,
      stdout: 'Usage: codex-orchestrator <command> [options]\n',
      stderr: '',
      message:
        'Command failed: node --loader ts-node/esm bin/codex-orchestrator.ts unknown-command\n' +
        'Unknown command: unknown-command\n'
    });

    expect(parsed.exitCode).toBe(1);
    expect(parsed.stderr).toContain('Unknown command: unknown-command');
    expect(parsed.stdout).toContain('Usage: codex-orchestrator <command> [options]');
  });

  it('preserves single-line exec failure messages when stderr is empty', () => {
    const parsed = parseCliFailure({
      code: 1,
      stdout: '',
      stderr: '',
      message: 'Command failed: unknown-command'
    });

    expect(parsed.exitCode).toBe(1);
    expect(parsed.stderr).toBe('Command failed: unknown-command');
  });

  it('prints status help without requiring a run id', async () => {
    const { stdout } = await runCli(['status', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator status --run <id>');
  }, CLI_BOOT_TIMEOUT);

  it('requires a run id for status', async () => {
    await expect(runCli(['status'], undefined, CLI_BOOT_TIMEOUT)).rejects.toMatchObject({
      stderr: expect.stringContaining('status requires --run <run-id>.')
    });
  }, CLI_BOOT_TIMEOUT);

  it('rejects skills install --only when no skill list is provided', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-skills-only-'));
    await expect(
      runCli(
        ['skills', 'install', '--only', '--codex-home', tempDir, '--format', 'json'],
        undefined,
        CLI_BOOT_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('--only requires a comma-separated list of skill names.')
    });
  }, CLI_BOOT_TIMEOUT);

  it('emits skills install JSON output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-skills-json-'));

    const { stdout } = await runCli(
      ['skills', 'install', '--only', 'long-poll-wait', '--codex-home', tempDir, '--format', 'json'],
      undefined,
      SKILLS_INSTALL_JSON_TIMEOUT
    );
    const payload = JSON.parse(stdout) as {
      targetRoot?: string;
      skills?: string[];
      written?: string[];
    };

    expect(payload.targetRoot).toBe(join(tempDir, 'skills'));
    expect(payload.skills).toEqual(['long-poll-wait']);
    expect(payload.written).toEqual(
      expect.arrayContaining([
        join(tempDir, 'skills', 'long-poll-wait', 'SKILL.md')
      ])
    );
  }, SKILLS_INSTALL_JSON_TIMEOUT);

  it('prints resume help without requiring a run id', async () => {
    const { stdout } = await runCli(['resume', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator resume --run <id>');
  }, CLI_BOOT_TIMEOUT);

  it('rejects resume without a run id through the binary shell', async () => {
    await expect(runCli(['resume'], undefined, CLI_BOOT_TIMEOUT)).rejects.toMatchObject({
      stderr: expect.stringContaining('resume requires --run <run-id>.')
    });
  }, CLI_BOOT_TIMEOUT);

  it('prints delegate-server help', async () => {
    const { stdout } = await runCli(['delegate-server', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator delegate-server');
    expect(stdout).toContain('--mode <full|question_only|status_only>');
  }, CLI_BOOT_TIMEOUT);

  it('prints delegation-server help', async () => {
    const { stdout } = await runCli(['delegation-server', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator delegate-server');
    expect(stdout).toContain('--mode <full|question_only|status_only>');
  }, CLI_BOOT_TIMEOUT);

  it('prints pr help', async () => {
    const { stdout } = await runCli(['pr', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator pr <subcommand>');
    expect(stdout).toContain('resolve-merge');
    expect(stdout).toContain('ready-review');
    expect(stdout).toContain('docs/guides/review-artifacts.md');
  }, CLI_BOOT_TIMEOUT);

  it('prints pr help when no subcommand is provided', async () => {
    const { stdout } = await runCli(['pr'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator pr <subcommand>');
    expect(stdout).toContain('watch-merge');
    expect(stdout).toContain('ready-review');
  }, CLI_BOOT_TIMEOUT);

  it('prints pr watch-merge help', async () => {
    const { stdout } = await runCli(['pr', 'watch-merge', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator pr watch-merge');
  }, CLI_BOOT_TIMEOUT);

  it('prints pr resolve-merge help', async () => {
    const { stdout } = await runCli(['pr', 'resolve-merge', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator pr resolve-merge');
    expect(stdout).toContain('--exit-on-action-required');
  }, CLI_BOOT_TIMEOUT);

  it('prints pr ready-review help', async () => {
    const { stdout } = await runCliSubprocess(
      ['pr', 'ready-review', '--help'],
      undefined,
      CLI_BOOT_TIMEOUT
    );
    expect(stdout).toContain('Usage: codex-orchestrator pr ready-review');
    expect(stdout).toContain('review handoff is safe after a bounded automated-feedback drain');
    expect(stdout).not.toContain('--auto-merge');
  }, CLI_BOOT_TIMEOUT);

  it('does not treat help-like option values as pr help requests', async () => {
    await expect(
      runCli(['pr', 'ready-review', '--interval-seconds', 'help'], undefined, CLI_BOOT_TIMEOUT)
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('--interval-seconds must be a number > 0')
    });
  }, CLI_BOOT_TIMEOUT);

  it('rejects unknown pr subcommands through the binary shell', async () => {
    await expect(runCli(['pr', 'ship-it'], undefined, CLI_BOOT_TIMEOUT)).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown pr subcommand: ship-it')
    });
  }, CLI_BOOT_TIMEOUT);

  it('prints setup help', async () => {
    const { stdout } = await runCli(['setup', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator setup');
    expect(stdout).toContain('--refresh-skills');
  }, CLI_BOOT_TIMEOUT);

  it('prints frontend-test help', async () => {
    const { stdout } = await runCli(['frontend-test', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator frontend-test [options]');
    expect(stdout).toContain('Runs the frontend-testing pipeline.');
    expect(stdout).toContain('--devtools');
  }, CLI_BOOT_TIMEOUT);

  it('prints frontend-test help via positional help', async () => {
    const { stdout } = await runCli(['frontend-test', 'help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator frontend-test [options]');
    expect(stdout).toContain('--format json');
  }, CLI_BOOT_TIMEOUT);

  it('prints codex subcommand help', async () => {
    const { stdout } = await runCli(['codex', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator codex <subcommand> [options]');
    expect(stdout).toContain('defaults');
    expect(stdout).toContain('--force');
  }, CLI_BOOT_TIMEOUT);

  it('emits codex setup plan json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-codex-setup-json-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };

    const { stdout } = await runCli(['codex', 'setup', '--format', 'json'], env, CLI_BOOT_TIMEOUT);
    const payload = JSON.parse(stdout) as {
      status?: string;
      plan?: { method?: string; installRoot?: string };
    };
    expect(payload.status).toBe('planned');
    expect(payload.plan?.method).toBe('build');
    expect(payload.plan?.installRoot).toBe(join(tempDir, 'orchestrator', 'codex-cli'));
  }, CLI_BOOT_TIMEOUT);

  it('emits codex defaults plan json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-codex-defaults-json-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };

    const { stdout } = await runCli(['codex', 'defaults', '--format', 'json'], env, CLI_BOOT_TIMEOUT);
    const payload = JSON.parse(stdout) as {
      status?: string;
      plan?: { configPath?: string; authScope?: string };
      changes?: Array<{ target?: string; status?: string }>;
    };
    expect(payload.status).toBe('planned');
    expect(payload.plan?.configPath).toBe(join(tempDir, 'config.toml'));
    expect(payload.plan?.authScope).toBe('portable');
    expect(payload.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: 'config', status: 'pending' })
      ])
    );
  }, CLI_BOOT_TIMEOUT);

  it('prints flow help', async () => {
    const { stdout } = await runCli(['flow', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator flow');
    expect(stdout).toContain('docs-review');
    expect(stdout).toContain('implementation-gate');
    expect(stdout).toContain('--auto-issue-log [true|false]');
    expect(stdout).toContain('--config-mode <repo-authoritative|downstream-compatibility>');
    expect(stdout).toContain('--repo-config-required [true|false]');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('codex-orchestrator flow --task <task-id>');
    expect(stdout).toContain('Post-run check:');
  }, CLI_BOOT_TIMEOUT);

  it('prints review help without invoking run-review', async () => {
    const { stdout } = await runCliSubprocess(['review', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator review');
    expect(stdout).toContain('Runs the standalone review wrapper');
    expect(stdout).toContain('--manifest <path>');
    expect(stdout).toContain('CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1');
  }, CLI_BOOT_TIMEOUT);

  it('launches review via the CLI shell in non-interactive handoff mode', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-review-launch-'));
    const taskId = 'review-cli-launch-shell';
    const runDir = join(tempDir, '.runs', taskId, 'cli', 'sample-run');
    await mkdir(runDir, { recursive: true });
    const manifestPath = join(runDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify({ run: 'sample' }), 'utf8');
    await writeFile(join(runDir, 'runner.ndjson'), '{"event":"sample"}\n', 'utf8');

    const { stdout } = await runCliSubprocess(
      ['review', '--manifest', manifestPath, '--non-interactive', '--surface', 'audit', '--task', taskId],
      {
        ...process.env,
        NOTES: 'Goal: launch review via CLI shell | Summary: non-interactive handoff | Risks: arg forwarding',
        CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '0',
        FORCE_CODEX_REVIEW: '0',
        CODEX_REVIEW_NON_INTERACTIVE: '0',
        CODEX_NON_INTERACTIVE: '0',
        CODEX_NO_INTERACTIVE: '0',
        CODEX_NONINTERACTIVE: '0',
        CODEX_REVIEW_LARGE_SCOPE_OVERRIDE_REASON:
          'cli command-surface review shell test intentionally exercises unscoped non-interactive handoff',
        DIFF_BUDGET_OVERRIDE_REASON:
          'cli command-surface review shell test exercises non-interactive handoff against the stacked branch baseline'
      },
      CLI_BOOT_TIMEOUT
    );

    expect(stdout).toContain('Codex review handoff (non-interactive):');
    expect(stdout).toContain(`Review task: ${taskId}`);
    expect(stdout).toContain('Review surface: audit');
    const prompt = await readFile(join(runDir, 'review', 'prompt.txt'), 'utf8');
    expect(prompt).toContain('Evidence manifest:');
    expect(prompt).toContain('sample-run/manifest.json');
  }, CLI_BOOT_TIMEOUT);

  it('prints start help without preparing a run', async () => {
    const { stdout } = await runCli(['start', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator start');
    expect(stdout).toContain('Start a new run');
    expect(stdout).toContain('--auto-issue-log [true|false]');
    expect(stdout).toContain('--config-mode <repo-authoritative|downstream-compatibility>');
    expect(stdout).toContain('--repo-config-required [true|false]');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('codex-orchestrator start docs-review --task <task-id>');
    expect(stdout).toContain('Post-run check:');
    expect(stdout).not.toContain('Run started:');
  }, CLI_BOOT_TIMEOUT);

  it('fails fast when --runtime-mode is provided without a value', async () => {
    await expect(runCli(['start', 'docs-review', '--runtime-mode'])).rejects.toMatchObject({
      stderr: expect.stringContaining('--runtime-mode requires a value')
    });
  }, TEST_TIMEOUT);

  it('emits an adoption hint after successful start runs in text mode', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-adoption-hint-'));
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'ok',
              title: 'ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_CLOUD_ENV_ID: '',
      MCP_RUNNER_TASK_ID: 'start-adoption-hint'
    };

    const { stdout } = await runCli(['start', 'diagnostics', '--task', 'start-adoption-hint'], env, FLOW_TARGET_TEST_TIMEOUT);
    expect(stdout).toContain('Run started:');
    expect(stdout).toContain('Adoption hint: ');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('does not emit an adoption hint when start run fails', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-adoption-fail-'));
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'fail',
              title: 'fail',
              command: 'node -e "process.exit(3)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_CLOUD_ENV_ID: '',
      MCP_RUNNER_TASK_ID: 'start-adoption-fail'
    };

    let stdout = '';
    let exitCode = 0;
    try {
      await runCli(['start', 'diagnostics', '--task', 'start-adoption-fail'], env, FLOW_TARGET_TEST_TIMEOUT);
      throw new Error('expected start-adoption-fail to exit non-zero');
    } catch (error) {
      ({ stdout, exitCode } = parseCliFailure(error));
    }
    expect(exitCode).not.toBe(0);
    expect(stdout).toContain('Status: failed');
    expect(stdout).not.toContain('Adoption hint: ');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('does not emit an adoption hint when default start pipeline resolves to rlm', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-default-rlm-hint-'));
    const config = {
      defaultPipeline: 'rlm',
      pipelines: [
        {
          id: 'rlm',
          title: 'RLM',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'ok',
              title: 'ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_CLOUD_ENV_ID: '',
      MCP_RUNNER_TASK_ID: 'start-default-rlm-hint'
    };

    const { stdout } = await runCli(['start', '--task', 'start-default-rlm-hint'], env, FLOW_TARGET_TEST_TIMEOUT);
    expect(stdout).toContain('Run started:');
    expect(stdout).not.toContain('Adoption hint: ');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('keeps start --format json output free of adoption hint text', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-adoption-json-'));
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'ok',
              title: 'ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_CLOUD_ENV_ID: '',
      MCP_RUNNER_TASK_ID: 'start-adoption-json'
    };

    const { stdout } = await runCli(
      ['start', 'diagnostics', '--format', 'json', '--task', 'start-adoption-json'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    expect(stdout).not.toContain('Adoption hint: ');
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as { status?: string };
    expect(payload.status).toBe('succeeded');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('emits an adoption hint at the end of successful flow runs in text mode', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-adoption-hint-'));
    const config = {
      defaultPipeline: 'docs-review',
      pipelines: [
        {
          id: 'docs-review',
          title: 'Docs Review',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'docs-ok',
              title: 'docs-ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        },
        {
          id: 'implementation-gate',
          title: 'Implementation Gate',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'impl-ok',
              title: 'impl-ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_CLOUD_ENV_ID: '',
      MCP_RUNNER_TASK_ID: 'flow-adoption-hint'
    };

    const { stdout } = await runCli(['flow', '--task', 'flow-adoption-hint'], env, FLOW_TARGET_TEST_TIMEOUT);
    expect(stdout).toContain('Flow complete: docs-review -> implementation-gate.');
    expect(stdout).toContain('Adoption hint: ');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('does not emit an adoption hint when flow stops at docs-review failure', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-adoption-docs-fail-'));
    const config = {
      defaultPipeline: 'docs-review',
      pipelines: [
        {
          id: 'docs-review',
          title: 'Docs Review',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'docs-fail',
              title: 'docs-fail',
              command: 'node -e "process.exit(4)"'
            }
          ]
        },
        {
          id: 'implementation-gate',
          title: 'Implementation Gate',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'impl-ok',
              title: 'impl-ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_CLOUD_ENV_ID: '',
      MCP_RUNNER_TASK_ID: 'flow-adoption-docs-fail'
    };

    let stdout = '';
    try {
      await runCli(['flow', '--task', 'flow-adoption-docs-fail'], env, FLOW_TARGET_TEST_TIMEOUT);
      throw new Error('expected flow to fail at docs-review');
    } catch (error) {
      stdout = (error as { stdout?: string }).stdout ?? '';
    }
    expect(stdout).toContain('Flow halted: docs-review failed.');
    expect(stdout).not.toContain('Adoption hint: ');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('does not emit an adoption hint when flow stops at implementation-gate failure', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-adoption-impl-fail-'));
    const config = {
      defaultPipeline: 'docs-review',
      pipelines: [
        {
          id: 'docs-review',
          title: 'Docs Review',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'docs-ok',
              title: 'docs-ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        },
        {
          id: 'implementation-gate',
          title: 'Implementation Gate',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'impl-fail',
              title: 'impl-fail',
              command: 'node -e "process.exit(5)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_CLOUD_ENV_ID: '',
      MCP_RUNNER_TASK_ID: 'flow-adoption-impl-fail'
    };

    let stdout = '';
    try {
      await runCli(['flow', '--task', 'flow-adoption-impl-fail'], env, FLOW_TARGET_TEST_TIMEOUT);
      throw new Error('expected flow to fail at implementation-gate');
    } catch (error) {
      stdout = (error as { stdout?: string }).stdout ?? '';
    }
    expect(stdout).toContain('Flow halted: implementation-gate failed.');
    expect(stdout).not.toContain('Adoption hint: ');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('keeps flow --format json output free of adoption hint text', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-adoption-json-'));
    const config = {
      defaultPipeline: 'docs-review',
      pipelines: [
        {
          id: 'docs-review',
          title: 'Docs Review',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'docs-ok',
              title: 'docs-ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        },
        {
          id: 'implementation-gate',
          title: 'Implementation Gate',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'impl-ok',
              title: 'impl-ok',
              command: 'node -e "process.exit(0)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_CLOUD_ENV_ID: '',
      MCP_RUNNER_TASK_ID: 'flow-adoption-json'
    };

    const { stdout } = await runCli(['flow', '--format', 'json', '--task', 'flow-adoption-json'], env, FLOW_TARGET_TEST_TIMEOUT);
    expect(stdout).not.toContain('Adoption hint: ');
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as { status?: string };
    expect(payload.status).toBe('succeeded');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('prints plan help', async () => {
    const { stdout } = await runCli(['plan', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator plan');
    expect(stdout).toContain('Preview pipeline stages without executing.');
  }, CLI_BOOT_TIMEOUT);

  it('prints init help without executing init', async () => {
    const { stdout } = await runCli(['init', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator init codex');
    expect(stdout).toContain('codex.orchestrator.json');
  }, CLI_BOOT_TIMEOUT);

  it('rejects init without a template', async () => {
    await expect(runCli(['init'], undefined, CLI_BOOT_TIMEOUT)).rejects.toMatchObject({
      stderr: expect.stringContaining('init requires a template name (e.g. init codex).')
    });
  }, CLI_BOOT_TIMEOUT);

  it('rejects unknown init templates', async () => {
    await expect(runCli(['init', 'ship-it'], undefined, CLI_BOOT_TIMEOUT)).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown init template: ship-it')
    });
  }, CLI_BOOT_TIMEOUT);

  it('writes init codex templates to the requested cwd', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-init-codex-'));

    const { stdout } = await runCli(['init', 'codex', '--cwd', tempDir]);
    const orchestratorConfig = await readFile(join(tempDir, 'codex.orchestrator.json'), 'utf8');
    const agentsDoc = await readFile(join(tempDir, 'AGENTS.md'), 'utf8');

    expect(stdout).toContain('Written:');
    expect(stdout).toContain('codex.orchestrator.json');
    expect(stdout).toContain('Next steps (recommended):');
    expect(orchestratorConfig.trim().length).toBeGreaterThan(0);
    expect(orchestratorConfig).toContain('"pipelines"');
    expect(agentsDoc).toContain('codex:instruction-stamp');
    expect(agentsDoc).toContain('# Agent Instructions (Template)');
  }, TEST_TIMEOUT);

  it('appends the managed codex setup summary when --codex-cli is requested', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-init-codex-cli-'));
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home')
    };

    const { stdout } = await runCli(['init', 'codex', '--cwd', tempDir, '--codex-cli'], env);
    const writtenIndex = stdout.indexOf('Written:');
    const codexSetupIndex = stdout.indexOf('Codex CLI setup: planned');

    expect(writtenIndex).toBeGreaterThanOrEqual(0);
    expect(codexSetupIndex).toBeGreaterThan(writtenIndex);
    expect(stdout).toContain('cargo build -p codex-cli --release');
    expect(stdout).toContain('Selection: stock `codex` stays default.');
  }, TEST_TIMEOUT);

  it('accepts scoped aliases for the matching flow pipeline and rejects scope-mismatched aliases', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-target-'));
    const config = {
      defaultPipeline: 'docs-review',
      pipelines: [
        {
          id: 'docs-review',
          title: 'Docs',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'docs-default',
              title: 'docs default',
              command: 'node -e "console.log(\'docs default\')"',
              plan: { aliases: ['docs-alias'] }
            }
          ]
        },
        {
          id: 'implementation-gate',
          title: 'Impl',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'impl-ok',
              title: 'impl ok',
              command: 'node -e "console.log(\'impl ok\')"',
              plan: { aliases: ['impl-alias', 'impl:quick'] }
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);

    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'flow-target'
    };

    const { stdout } = await runCli(
      ['flow', '--format', 'json', '--task', 'flow-target', '--target', 'implementation-gate:impl-alias'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    expect(stdout).toContain('"status": "succeeded"');

    const { stdout: unscopedColonStdout } = await runCli(
      ['flow', '--format', 'json', '--task', 'flow-target', '--target', 'impl:quick'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    expect(unscopedColonStdout).toContain('"status": "succeeded"');

    await expect(
      runCli(
        ['flow', '--format', 'json', '--task', 'flow-target', '--target', 'docs-review:impl-alias'],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        'Target stage "docs-review:impl-alias" is not defined in docs-review or implementation-gate.'
      )
    });

    await expect(
      runCli(
        ['flow', '--format', 'json', '--task', 'flow-target', '--target', ':impl-alias'],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        'Target stage ":impl-alias" is not defined in docs-review or implementation-gate.'
      )
    });
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('prints rlm help without running when help flag is passed before goal', async () => {
    const { stdout } = await runCli(['rlm', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator rlm');
    expect(stdout).toContain('--multi-agent [auto|true|false]');
    expect(stdout).toContain('--collab [auto|true|false]  Legacy alias for --multi-agent.');
    expect(stdout).not.toContain('Task:');
  }, CLI_BOOT_TIMEOUT);

  it('prints rlm help without running when help flag is accidentally given a value', async () => {
    const { stdout } = await runCli(['rlm', '--help', 'write tests'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator rlm');
    expect(stdout).not.toContain('Task:');
  }, CLI_BOOT_TIMEOUT);

  it('prints rlm help without running when help flag follows the goal', async () => {
    const { stdout } = await runCli(['rlm', 'write tests', '--help'], undefined, CLI_BOOT_TIMEOUT);
    expect(stdout).toContain('Usage: codex-orchestrator rlm');
    expect(stdout).not.toContain('Task:');
  }, CLI_BOOT_TIMEOUT);

  it('rejects conflicting multi-agent and collab flag values', async () => {
    await expect(
      runCliSourceSubprocess(
        ['rlm', 'write tests', '--multi-agent', 'true', '--collab', 'false'],
        undefined,
        CLI_SOURCE_ENTRY_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Conflicting --multi-agent and --collab values.')
    });
  }, CLI_SOURCE_ENTRY_TIMEOUT);

  it('requires a goal for rlm runs', async () => {
    await expect(runCliSourceSubprocess(['rlm'], undefined, CLI_SOURCE_ENTRY_TIMEOUT)).rejects.toMatchObject({
      stderr: expect.stringContaining('rlm requires a goal. Use: codex-orchestrator rlm "<goal>".')
    });
  }, CLI_SOURCE_ENTRY_TIMEOUT);

  it('prints self-check text output through the binary shell', async () => {
    const packageVersion = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf8')) as {
      version: string;
    };
    const { stdout } = await runCliSubprocess(['self-check'], undefined, CLI_BINARY_SHELL_TIMEOUT);
    expect(stdout).toContain('Status: ok');
    expect(stdout).toContain('Name: @kbediako/codex-orchestrator');
    expect(stdout).toContain(`Version: ${packageVersion.version}`);
    expect(stdout).toContain(`Node: ${process.version}`);
    expect(stdout).toContain('Timestamp: ');
  }, CLI_BINARY_SHELL_TIMEOUT);

  it('prints self-check json output through the binary shell', async () => {
    const packageVersion = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf8')) as {
      version: string;
    };
    const { stdout } = await runCliSubprocess(
      ['self-check', '--format', 'json'],
      undefined,
      CLI_BINARY_SHELL_TIMEOUT
    );
    const payload = JSON.parse(stdout) as {
      status?: string;
      name?: string;
      version?: string;
      node?: string;
      timestamp?: string;
    };

    expect(payload.status).toBe('ok');
    expect(payload.name).toBe('@kbediako/codex-orchestrator');
    expect(payload.version).toBe(packageVersion.version);
    expect(payload.node).toBe(process.version);
    expect(new Date(String(payload.timestamp)).toISOString()).toBe(payload.timestamp);
  }, CLI_BINARY_SHELL_TIMEOUT);

  it('prints doctor apply plan when wiring is missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-doctor-apply-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCliSubprocess(['doctor', '--apply'], env, CLI_BINARY_SHELL_TIMEOUT);
    expect(stdout).toContain('Doctor apply plan:');
    expect(stdout).toContain('chrome-devtools');
    expect(stdout).toContain('delegation');
  }, CLI_BINARY_SHELL_TIMEOUT);

  it('rejects doctor --apply with --format json', async () => {
    await expect(runCli(['doctor', '--apply', '--format', 'json'])).rejects.toMatchObject({
      stderr: expect.stringContaining('doctor --apply does not support --format json.')
    });
  }, TEST_TIMEOUT);

  it('rejects devtools without a subcommand', async () => {
    await expect(runCli(['devtools'])).rejects.toMatchObject({
      stderr: expect.stringContaining('devtools requires a subcommand (setup).')
    });
  }, CLI_BOOT_TIMEOUT);

  it('rejects unknown devtools subcommands', async () => {
    await expect(runCli(['devtools', 'ship-it'])).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown devtools subcommand: ship-it')
    });
  }, CLI_BOOT_TIMEOUT);

  it('emits devtools setup plan json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-devtools-setup-json-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };

    const { stdout } = await runCli(['devtools', 'setup', '--format', 'json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      plan?: { commandLine?: string };
    };

    expect(payload.status).toBe('planned');
    expect(payload.plan?.commandLine).toContain('chrome-devtools');
  }, TEST_TIMEOUT);

  it('rejects devtools setup --format json with --yes', async () => {
    await expect(runCli(['devtools', 'setup', '--format', 'json', '--yes'])).rejects.toMatchObject({
      stderr: expect.stringContaining('devtools setup does not support --format json with --yes.')
    });
  }, TEST_TIMEOUT);

  it('rejects doctor issue-log metadata flags without --issue-log', async () => {
    await expect(runCli(['doctor', '--issue-title', 'Example issue'])).rejects.toMatchObject({
      stderr: expect.stringContaining('--issue-title/--issue-notes/--issue-log-path require --issue-log.')
    });
  }, TEST_TIMEOUT);

  it('rejects doctor cloud override flags without --cloud-preflight', async () => {
    await expect(runCli(['doctor', '--cloud-env-id', 'env_123'])).rejects.toMatchObject({
      stderr: expect.stringContaining('--cloud-env-id/--cloud-branch require --cloud-preflight.')
    });
  }, TEST_TIMEOUT);

  it('rejects invalid doctor --window-days values', async () => {
    await expect(runCli(['doctor', '--usage', '--window-days', '0'])).rejects.toMatchObject({
      stderr: expect.stringContaining("Invalid --window-days value '0'. Expected a positive integer.")
    });
  }, TEST_TIMEOUT);

  it('reports invalid cloud fallback policy in doctor JSON without crashing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-doctor-invalid-cloud-fallback-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'bogus',
      CODEX_CLOUD_ENV_ID: '',
      CODEX_CLOUD_BRANCH: ''
    };
    const { stdout } = await runCli(['doctor', '--format', 'json'], env);
    const payload = JSON.parse(stdout) as {
      cloud?: {
        status?: string;
        fallback_policy?: string;
        fallback_policy_source?: string;
        fallback_policy_raw?: string | null;
        fallback_policy_error?: string | null;
      };
    };

    expect(payload.cloud?.status).toBe('invalid_policy');
    expect(payload.cloud?.fallback_policy).toBe('invalid');
    expect(payload.cloud?.fallback_policy_source).toBe('invalid');
    expect(payload.cloud?.fallback_policy_raw).toBe('bogus');
    expect(payload.cloud?.fallback_policy_error).toContain('Invalid fallback policy "bogus"');
  }, TEST_TIMEOUT);

  it('emits doctor cloud preflight payload in JSON output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-doctor-cloud-preflight-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_CLOUD_ENV_ID: '',
      CODEX_CLOUD_BRANCH: ''
    };
    const { stdout } = await runCli(['doctor', '--format', 'json', '--cloud-preflight'], env);
    const payload = JSON.parse(stdout) as {
      cloud_preflight?: {
        ok?: boolean;
        details?: { codex_bin?: string };
        issues?: Array<{ code?: string }>;
        guidance?: string[];
      };
    };
    expect(payload.cloud_preflight).toBeTruthy();
    expect(payload.cloud_preflight?.ok).toBe(false);
    expect(payload.cloud_preflight?.details?.codex_bin).toBe(fakeCodex);
    expect(payload.cloud_preflight?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing_environment' })])
    );
    expect(payload.cloud_preflight?.guidance?.join('\n')).toContain('CODEX_CLOUD_ENV_ID');
  }, TEST_TIMEOUT);

  it('emits distinct doctor cloud preflight issue for configured but not-found env ids', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-doctor-cloud-preflight-not-found-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_CLOUD_ENV_ID: 'env-missing',
      CODEX_CLOUD_BRANCH: '',
      CODEX_TEST_CLOUD_LIST_FAIL_MESSAGE:
        "Error: environment 'env-missing' not found; run `codex cloud` to list available environments"
    };
    const { stdout } = await runCli(['doctor', '--format', 'json', '--cloud-preflight'], env);
    const payload = JSON.parse(stdout) as {
      cloud_preflight?: {
        ok?: boolean;
        issues?: Array<{ code?: string; message?: string }>;
        guidance?: string[];
      };
    };
    const issueCodes = payload.cloud_preflight?.issues?.map((issue) => issue.code) ?? [];
    expect(payload.cloud_preflight?.ok).toBe(false);
    expect(issueCodes).toContain('environment_not_found');
    expect(issueCodes).not.toContain('missing_environment');
    expect(payload.cloud_preflight?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'environment_not_found',
          message: expect.stringContaining("environment 'env-missing' not found")
        })
      ])
    );
    expect(payload.cloud_preflight?.guidance?.join('\n')).toContain('codex cloud');
  }, TEST_TIMEOUT);

  it('writes doctor issue logs and bundles with downstream run context', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-doctor-issue-log-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const issueLogPath = join(tempDir, 'docs', 'codex-orchestrator-issues.md');
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'smoke',
              title: 'smoke',
              command: 'node -e "console.log(\'scenario-ok\')"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'scenario-issue-log',
      CODEX_CLOUD_ENV_ID: '',
      CODEX_CLOUD_BRANCH: ''
    };

    const { stdout: startStdout } = await runCli(
      ['start', 'diagnostics', '--format', 'json', '--task', 'scenario-issue-log'],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    const startJsonOffset = startStdout.indexOf('{');
    const startPayload = JSON.parse(startJsonOffset >= 0 ? startStdout.slice(startJsonOffset) : startStdout) as {
      run_id?: string;
    };
    expect(startPayload.run_id).toBeTruthy();

    const { stdout } = await runCli(
      [
        'doctor',
        '--format',
        'json',
        '--issue-log',
        '--issue-title',
        'Scenario issue capture',
        '--issue-notes',
        'Simulated downstream failure reproduction.',
        '--issue-log-path',
        issueLogPath,
        '--task',
        'scenario-issue-log',
        '--cloud-preflight'
      ],
      env,
      FLOW_TARGET_TEST_TIMEOUT
    );
    const payload = JSON.parse(stdout) as {
      issue_log?: {
        issue_log_path?: string;
        bundle_path?: string;
        run_context?: {
          run_id?: string;
        } | null;
      };
      cloud_preflight?: {
        ok?: boolean;
        issues?: Array<{ code?: string }>;
      };
    };
    expect(payload.issue_log).toBeTruthy();
    expect(payload.issue_log?.run_context?.run_id).toBe(startPayload.run_id);
    expect(payload.cloud_preflight?.ok).toBe(false);
    expect(payload.cloud_preflight?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing_environment' })])
    );

    const issueLogOutputPath = payload.issue_log?.issue_log_path ?? issueLogPath;
    const issueLogOutputResolved = isAbsolute(issueLogOutputPath)
      ? issueLogOutputPath
      : join(process.cwd(), issueLogOutputPath);
    const issueLogContent = await readFile(issueLogOutputResolved, 'utf8');
    expect(issueLogContent).toContain('Scenario issue capture');
    expect(issueLogContent).toContain('missing_environment');
    expect(issueLogContent).toContain(startPayload.run_id ?? '');

    const bundleOutputPath = payload.issue_log?.bundle_path ?? '';
    const bundleOutputResolved = isAbsolute(bundleOutputPath)
      ? bundleOutputPath
      : join(process.cwd(), bundleOutputPath);
    const bundlePayload = JSON.parse(await readFile(bundleOutputResolved, 'utf8')) as {
      run_context?: {
        run_id?: string;
      } | null;
      cloud_preflight?: {
        issues?: Array<{ code?: string }>;
      } | null;
    };
    expect(bundlePayload.run_context?.run_id).toBe(startPayload.run_id);
    expect(bundlePayload.cloud_preflight?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing_environment' })])
    );
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('auto-captures failure issue log for start when --auto-issue-log is enabled', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-auto-issue-log-'));
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'fail-stage',
              title: 'fail-stage',
              command: 'node -e "process.exit(3)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'start-auto-issue-log'
    };
    let stdout = '';
    let exitCode = 0;
    try {
      await runCli(
        ['start', 'diagnostics', '--format', 'json', '--task', 'start-auto-issue-log', '--auto-issue-log'],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      );
      throw new Error('expected start-auto-issue-log to exit non-zero');
    } catch (error) {
      ({ stdout, exitCode } = parseCliFailure(error));
    }
    expect(exitCode).not.toBe(0);
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      status?: string;
      run_id?: string;
      issue_log?: {
        issue_log_path?: string;
        bundle_path?: string;
        run_context?: {
          run_id?: string;
        } | null;
      } | null;
      issue_log_error?: string | null;
    };
    expect(payload.status).toBe('failed');
    expect(payload.issue_log_error ?? null).toBeNull();
    expect(payload.issue_log).toBeTruthy();
    expect(payload.issue_log?.run_context?.run_id).toBe(payload.run_id);

    const issueLogOutputPath = payload.issue_log?.issue_log_path ?? '';
    const issueLogOutputResolved = isAbsolute(issueLogOutputPath)
      ? issueLogOutputPath
      : join(process.cwd(), issueLogOutputPath);
    const issueLogContent = await readFile(issueLogOutputResolved, 'utf8');
    expect(issueLogContent).toContain('Auto issue log: start diagnostics failed');
    expect(issueLogContent).toContain(payload.run_id ?? '');

    const bundleOutputPath = payload.issue_log?.bundle_path ?? '';
    const bundleOutputResolved = isAbsolute(bundleOutputPath)
      ? bundleOutputPath
      : join(process.cwd(), bundleOutputPath);
    const bundlePayload = JSON.parse(await readFile(bundleOutputResolved, 'utf8')) as {
      run_context?: {
        run_id?: string;
      } | null;
    };
    expect(bundlePayload.run_context?.run_id).toBe(payload.run_id);
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('uses failed manifest task_id for start auto issue-log task filtering', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-auto-issue-log-task-filter-'));
    const config = {
      defaultPipeline: 'diagnostics',
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'fail-stage',
              title: 'fail-stage',
              command: 'node -e "process.exit(7)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'start-auto-issue-log-actual',
      TASK: 'stale-task-id'
    };
    let stdout = '';
    let exitCode = 0;
    try {
      await runCli(['start', 'diagnostics', '--format', 'json', '--auto-issue-log'], env, FLOW_TARGET_TEST_TIMEOUT);
      throw new Error('expected start-auto-issue-log-task-filter to exit non-zero');
    } catch (error) {
      ({ stdout, exitCode } = parseCliFailure(error));
    }
    expect(exitCode).not.toBe(0);
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      status?: string;
      run_id?: string;
      issue_log?: {
        bundle_path?: string;
        run_context?: { run_id?: string } | null;
      } | null;
      issue_log_error?: string | null;
    };
    expect(payload.status).toBe('failed');
    expect(payload.issue_log_error ?? null).toBeNull();
    expect(payload.issue_log?.run_context?.run_id).toBe(payload.run_id);

    const bundleOutputPath = payload.issue_log?.bundle_path ?? '';
    const bundleOutputResolved = isAbsolute(bundleOutputPath)
      ? bundleOutputPath
      : join(process.cwd(), bundleOutputPath);
    const normalizedBundlePath = bundleOutputResolved.replace(/\\/g, '/');
    expect(normalizedBundlePath).toContain('/out/start-auto-issue-log-actual/');
    expect(normalizedBundlePath).not.toContain('/out/stale-task-id/');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('auto-captures issue log for start failures before run manifest creation', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-start-auto-issue-log-pre-manifest-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex,
      MCP_RUNNER_TASK_ID: 'start-pre-manifest-issue-log'
    };
    await expect(
      runCli(
        [
          'start',
          'diagnostics',
          '--task',
          'start-pre-manifest-issue-log',
          '--repo-config-required',
          '--auto-issue-log'
        ],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Auto issue log: saved to')
    });

    const issueLogContent = await readFile(join(tempDir, 'docs', 'codex-orchestrator-issues.md'), 'utf8');
    expect(issueLogContent).toContain('Auto issue log: start diagnostics failed before run manifest');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('auto-captures issue log for flow failures before run manifest creation', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-auto-issue-log-pre-manifest-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex,
      MCP_RUNNER_TASK_ID: 'flow-pre-manifest-issue-log'
    };
    await expect(
      runCli(
        [
          'flow',
          '--task',
          'flow-pre-manifest-issue-log',
          '--repo-config-required',
          '--auto-issue-log'
        ],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Auto issue log: saved to')
    });

    const issueLogContent = await readFile(join(tempDir, 'docs', 'codex-orchestrator-issues.md'), 'utf8');
    expect(issueLogContent).toContain('Auto issue log: flow failed before run manifest');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('auto-captures failure issue log for flow when CODEX_ORCHESTRATOR_AUTO_ISSUE_LOG=1', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-flow-auto-issue-log-'));
    const config = {
      defaultPipeline: 'docs-review',
      pipelines: [
        {
          id: 'docs-review',
          title: 'Docs Review',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'docs-fail',
              title: 'docs-fail',
              command: 'node -e "process.exit(5)"'
            }
          ]
        },
        {
          id: 'implementation-gate',
          title: 'Implementation Gate',
          guardrailsRequired: false,
          stages: [
            {
              kind: 'command',
              id: 'impl-pass',
              title: 'impl-pass',
              command: 'node -e "process.exit(0)"'
            }
          ]
        }
      ]
    };
    await writeFile(join(tempDir, 'codex.orchestrator.json'), `${JSON.stringify(config, null, 2)}\n`);
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'flow-auto-issue-log',
      CODEX_ORCHESTRATOR_AUTO_ISSUE_LOG: '1'
    };

    let stdout = '';
    try {
      await runCli(['flow', '--format', 'json', '--task', 'flow-auto-issue-log'], env, FLOW_TARGET_TEST_TIMEOUT);
      throw new Error('expected flow to fail');
    } catch (error) {
      stdout = (error as { stdout?: string }).stdout ?? '';
    }
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      failed_stage?: string | null;
      docs_review?: { run_id?: string };
      issue_log?: {
        issue_log_path?: string;
        run_context?: {
          run_id?: string;
        } | null;
      } | null;
      issue_log_error?: string | null;
    };
    expect(payload.failed_stage).toBe('docs-review');
    expect(payload.issue_log_error ?? null).toBeNull();
    expect(payload.issue_log).toBeTruthy();
    expect(payload.issue_log?.run_context?.run_id).toBe(payload.docs_review?.run_id);

    const issueLogOutputPath = payload.issue_log?.issue_log_path ?? '';
    const issueLogOutputResolved = isAbsolute(issueLogOutputPath)
      ? issueLogOutputPath
      : join(process.cwd(), issueLogOutputPath);
    const issueLogContent = await readFile(issueLogOutputResolved, 'utf8');
    expect(issueLogContent).toContain('Auto issue log: flow docs-review failed');
    expect(issueLogContent).toContain(payload.docs_review?.run_id ?? '');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('fails fast when --repo-config-required is enabled and repo config is missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-strict-repo-config-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out')
    };
    await expect(
      runCli(['plan', 'docs-review', '--repo-config-required'], env)
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Repo-local codex.orchestrator.json is required')
    });
  }, TEST_TIMEOUT);

  it('fails fast in default repo-authoritative mode when repo config is missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-default-repo-authoritative-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out')
    };
    await expect(runCli(['plan', 'docs-review'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('repo-authoritative config mode')
    });
  }, TEST_TIMEOUT);

  it('uses repo-authoritative default for malformed legacy repo config env', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-malformed-legacy-repo-config-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: 'maybe'
    };
    await expect(
      runCli(['plan', 'docs-review'], env, CLI_EXEC_TIMEOUT_MS, new Set(['CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED']))
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('repo-authoritative config mode')
    });
  }, TEST_TIMEOUT);

  it('preserves explicit strict repo config env when it matches the ambient provider-worker value', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-strict-ambient-match-'));
    const originalStrictRepoConfig = process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED;
    process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED = '1';
    try {
      const env = {
        ...process.env,
        CODEX_ORCHESTRATOR_ROOT: tempDir,
        CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
        CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
        CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
      };
      await expect(
        runCli(
          ['plan', 'docs-review'],
          env,
          CLI_EXEC_TIMEOUT_MS,
          new Set(['CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED'])
        )
      ).rejects.toMatchObject({
        stderr: expect.stringContaining('Repo-local codex.orchestrator.json is required')
      });
    } finally {
      if (originalStrictRepoConfig === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED;
      } else {
        process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED = originalStrictRepoConfig;
      }
    }
  }, TEST_TIMEOUT);

  it('allows disabling strict repo config mode per command with --repo-config-required=false', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-strict-override-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
    };
    const { stdout } = await runCli(
      ['plan', 'docs-review', '--format', 'json', '--repo-config-required=false'],
      env,
      CLI_EXEC_TIMEOUT_MS,
      new Set(['CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED'])
    );
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      pipeline?: {
        id?: string;
        config_resolution?: { mode?: string; reason?: string; config_source?: string | null } | null;
      };
    };
    expect(payload.pipeline?.id).toBe('docs-review');
    expect(payload.pipeline?.config_resolution).toEqual({
      mode: 'downstream-compatibility',
      reason: 'CODEX_ORCHESTRATOR_CONFIG_MODE=downstream-compatibility',
      config_source: 'package'
    });
  }, TEST_TIMEOUT);

  it('rejects conflicting explicit config mode and legacy repo config flag', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-conflicting-config-mode-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out')
    };

    await expect(
      runCli([
        'plan',
        'docs-review',
        '--config-mode',
        'repo-authoritative',
        '--repo-config-required=false'
      ], env)
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        'Conflicting config authority flags: --config-mode repo-authoritative conflicts with --repo-config-required=false'
      )
    });
  }, TEST_TIMEOUT);

  it('plans docs-relevance-advisory pipeline from explicit downstream compatibility config', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-docs-relevance-advisory-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out')
    };
    const { stdout } = await runCli(
      ['plan', 'docs-relevance-advisory', '--format', 'json', '--config-mode', 'downstream-compatibility'],
      env
    );
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      pipeline?: {
        id?: string;
        config_resolution?: { mode?: string; reason?: string; config_source?: string | null } | null;
      };
    };
    expect(payload.pipeline?.id).toBe('docs-relevance-advisory');
    expect(payload.pipeline?.config_resolution).toEqual({
      mode: 'downstream-compatibility',
      reason: 'CODEX_ORCHESTRATOR_CONFIG_MODE=downstream-compatibility',
      config_source: 'package'
    });
  }, TEST_TIMEOUT);

  it('warns when explicit downstream compatibility plan uses packaged fallback config', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-plan-package-fallback-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'plan-package-fallback'
    };
    const { stdout, stderr } = await runCli(
      ['plan', 'docs-review', '--format', 'json', '--config-mode', 'downstream-compatibility'],
      env
    );
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      pipeline?: { id?: string };
    };
    expect(payload.pipeline?.id).toBe('docs-review');
    expect(stderr).toContain('Configuration mode: downstream-compatibility');
    expect(stderr).toContain('using packaged compatibility codex.orchestrator.json');
  }, TEST_TIMEOUT);

  it('returns terminal failed status when strict cloud preflight fails', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-cloud-preflight-deny-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cloud-preflight-deny',
      CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'deny',
      CODEX_ORCHESTRATOR_RUNTIME_MODE: '',
      CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: '',
      CODEX_RUNTIME_MODE: '',
      CODEX_CLOUD_ENV_ID: '',
      CODEX_CLOUD_BRANCH: ''
    };
    let stdout = '';
    let exitCode = 0;
    try {
      await runCli(
        [
          'start',
          'docs-review',
          '--execution-mode',
          'cloud',
          '--config-mode',
          'downstream-compatibility',
          '--target',
          'review',
          '--format',
          'json',
          '--task',
          'cloud-preflight-deny'
        ],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      );
      throw new Error('expected cloud-preflight-deny to exit non-zero');
    } catch (error) {
      ({ stdout, exitCode } = parseCliFailure(error));
    }
    expect(exitCode).not.toBe(0);
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      status?: string;
      summary?: string | null;
      manifest?: string;
    };
    expect(payload.status).toBe('failed');
    expect(payload.summary).toContain('fallback_policy=strict');
    expect(payload.summary).not.toContain('Runtime selection failed');
    const manifestPath = isAbsolute(payload.manifest ?? '')
      ? (payload.manifest as string)
      : join(tempDir, payload.manifest ?? '');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      status?: string;
      status_detail?: string | null;
      completed_at?: string | null;
    };
    expect(manifest.status).toBe('failed');
    expect(manifest.status_detail).toBe('cloud-preflight-failed');
    expect(manifest.completed_at).toBeTruthy();
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('fails strict cloud preflight for configured but not-found env ids before cloud exec', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-cloud-preflight-env-not-found-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const cloudListLog = join(tempDir, 'cloud-list.log');
    const cloudExecLog = join(tempDir, 'cloud-exec.log');
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cloud-preflight-env-not-found',
      CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'deny',
      CODEX_ORCHESTRATOR_RUNTIME_MODE: '',
      CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: '',
      CODEX_RUNTIME_MODE: '',
      CODEX_CLOUD_ENV_ID: 'env-missing',
      CODEX_CLOUD_BRANCH: '',
      CODEX_TEST_CLOUD_LIST_LOG: cloudListLog,
      CODEX_TEST_CLOUD_EXEC_LOG: cloudExecLog,
      CODEX_TEST_CLOUD_LIST_FAIL_MESSAGE:
        "Error: environment 'env-missing' not found; run `codex cloud` to list available environments"
    };
    let stdout = '';
    let exitCode = 0;
    try {
      await runCli(
        [
          'start',
          'docs-review',
          '--execution-mode',
          'cloud',
          '--config-mode',
          'downstream-compatibility',
          '--target',
          'review',
          '--format',
          'json',
          '--task',
          'cloud-preflight-env-not-found'
        ],
        env,
        FLOW_TARGET_TEST_TIMEOUT
      );
      throw new Error('expected cloud-preflight-env-not-found to exit non-zero');
    } catch (error) {
      ({ stdout, exitCode } = parseCliFailure(error));
    }
    expect(exitCode).not.toBe(0);
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout) as {
      status?: string;
      summary?: string | null;
      manifest?: string;
    };
    expect(payload.status).toBe('failed');
    expect(payload.summary).toContain("environment 'env-missing' not found");

    const commandLog = await readFile(cloudListLog, 'utf8');
    expect(commandLog).toContain('cloud list --env env-missing --limit 1 --json');
    await expect(readFile(cloudExecLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });

    const manifestPath = isAbsolute(payload.manifest ?? '')
      ? (payload.manifest as string)
      : join(tempDir, payload.manifest ?? '');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      status?: string;
      status_detail?: string | null;
      cloud_execution?: unknown;
      cloud_fallback?: { issues?: Array<{ code?: string }> } | null;
    };
    expect(manifest.status).toBe('failed');
    expect(manifest.status_detail).toBe('cloud-preflight-failed');
    expect(manifest.cloud_execution).toBeFalsy();
    expect(manifest.cloud_fallback).toBeFalsy();
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('emits MCP enable plan payload in JSON output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };
    const { stdout } = await runCli(['mcp', 'enable', '--format', 'json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      targets?: string[];
      actions?: Array<{ name?: string; status?: string }>;
    };
    expect(payload.status).toBe('planned');
    expect(payload.targets).toEqual(['delegation']);
    expect(payload.actions).toEqual([
      expect.objectContaining({
        name: 'delegation',
        status: 'planned'
      })
    ]);
  }, TEST_TIMEOUT);

  it('scopes mcp enable targets when using --servers=<csv> flag style', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-equals-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        },
        {
          name: 'playwright',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'npx',
            args: ['@playwright/mcp@latest']
          }
        }
      ])
    };

    const { stdout } = await runCli(['mcp', 'enable', '--format', 'json', '--servers=delegation'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      targets?: string[];
      actions?: Array<{ name?: string; status?: string }>;
    };
    expect(payload.status).toBe('planned');
    expect(payload.targets).toEqual(['delegation']);
    expect(payload.actions).toEqual([
      expect.objectContaining({
        name: 'delegation',
        status: 'planned'
      })
    ]);
  }, TEST_TIMEOUT);

  it('treats --yes=false as a non-apply plan for mcp enable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-yes-false-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };

    const { stdout } = await runCli(['mcp', 'enable', '--format', 'json', '--yes=false'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      actions?: Array<{ status?: string }>;
    };
    expect(payload.status).toBe('planned');
    expect(payload.actions).toEqual([
      expect.objectContaining({
        status: 'planned'
      })
    ]);
  }, TEST_TIMEOUT);

  it('rejects stray positional arguments when using --servers=<csv> flag style', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-equals-positional-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--servers=delegation', 'unexpected'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('mcp enable does not accept positional arguments')
    });
  }, TEST_TIMEOUT);

  it('rejects unknown mcp enable flags to avoid unintended bulk enable fallback', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-unknown-flag-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--server', 'delegation', '--yes'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown mcp enable flag: --server')
    });
  }, TEST_TIMEOUT);

  it('rejects unknown equals-style mcp enable flags', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-unknown-flag-equals-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--server=delegation', '--yes'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown mcp enable flag: --server')
    });
  }, TEST_TIMEOUT);

  it('rejects duplicate --servers flags for mcp enable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-duplicate-servers-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(
      runCli(
        ['mcp', 'enable', '--servers', 'delegation', '--servers', 'playwright', '--yes'],
        env,
        CLI_BOOT_TIMEOUT
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('--servers specified multiple times.')
    });
  }, CLI_BOOT_TIMEOUT);

  it('rejects duplicate --yes flags for mcp enable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-duplicate-yes-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--yes', 'false', '--yes'], env, CLI_BOOT_TIMEOUT)).rejects.toMatchObject({
      stderr: expect.stringContaining('--yes specified multiple times.')
    });
  }, CLI_BOOT_TIMEOUT);

  it('returns non-zero when mcp enable --yes has failed actions', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-fail-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_ADD_FAIL: '1',
      CODEX_TEST_MCP_ADD_FAIL_MESSAGE: 'simulated add failure',
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };

    try {
      await runCli(['mcp', 'enable', '--yes'], env);
      throw new Error('expected mcp enable --yes to fail');
    } catch (error) {
      const stdout = (error as { stdout?: string }).stdout ?? '';
      expect(stdout).toContain('delegation: failed');
      expect(stdout).toContain('simulated add failure');
    }
  }, TEST_TIMEOUT);

  it('returns non-zero when mcp enable --yes reports missing targets', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-missing-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };

    await expect(runCli(['mcp', 'enable', '--yes', '--servers', 'unknown'], env)).rejects.toMatchObject({
      stdout: expect.stringContaining('unknown: missing')
    });
  }, TEST_TIMEOUT);

  it('returns non-zero when mcp enable --yes reports unsupported targets', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-unsupported-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_LIST_JSON: JSON.stringify([
        {
          name: 'delegation',
          enabled: false,
          startup_timeout_sec: 30,
          transport: {
            type: 'stdio',
            command: 'node',
            args: ['scripts/delegation-server.mjs']
          }
        }
      ])
    };

    await expect(runCli(['mcp', 'enable', '--yes', '--servers', 'delegation'], env)).rejects.toMatchObject({
      stdout: expect.stringContaining('delegation: unsupported')
    });
  }, TEST_TIMEOUT);

  it('rejects mcp enable --servers without a value', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-servers-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--servers'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('--servers must include a comma-separated list of MCP server names.')
    });
  }, TEST_TIMEOUT);

  it('rejects mcp enable --servers when the csv has no names', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-empty-csv-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', '--servers', ','], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('--servers must include a comma-separated list of MCP server names.')
    });
  }, TEST_TIMEOUT);

  it('rejects positional arguments for mcp enable to prevent unintended bulk enable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-mcp-enable-positional-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const env = {
      ...process.env,
      CODEX_CLI_BIN: fakeCodex
    };

    await expect(runCli(['mcp', 'enable', 'delegation', '--yes'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('mcp enable does not accept positional arguments')
    });
  }, TEST_TIMEOUT);

  it('emits setup plan JSON', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-plan-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['setup', '--format', 'json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      steps?: {
        skills?: {
          commandLines?: string[];
          note?: string;
        };
        guidance?: {
          note?: string;
          references?: string[];
          recommended_commands?: string[];
        };
      } & Record<string, unknown>;
    };
    expect(payload.status).toBe('planned');
    expect(payload.steps).toBeTruthy();
    expect(payload.steps?.guidance?.note).toContain('Agent-first default');
    expect(payload.steps?.guidance?.references).toContain(
      'https://github.com/Kbediako/CO/blob/main/docs/public/downstream-setup.md'
    );
    expect(payload.steps?.guidance?.references).toContain(
      'https://github.com/Kbediako/CO/blob/main/docs/public/provider-onboarding.md'
    );
    expect(payload.steps?.guidance?.recommended_commands).toContain(
      'codex-orchestrator flow --task <task-id>'
    );
    expect(payload.steps?.guidance?.recommended_commands).toContain(
      'codex-orchestrator mcp enable --servers delegation --yes'
    );
    const commands = payload.steps?.skills?.commandLines ?? [];
    expect(commands).toHaveLength(1);
    expect(commands[0]).toContain('--only');
    expect(commands[0]).toContain('chrome-devtools');
    expect(commands.every((entry) => !entry.includes('--force'))).toBe(true);
    expect(payload.steps?.skills?.note).toContain('without overwriting existing files by default');
  }, TEST_TIMEOUT);

  it('quotes shell-sensitive repo args in setup delegation preview output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-plan-repo-quote-'));
    const repoRoot = join(tempDir, 'repo;quoted');
    await mkdir(repoRoot, { recursive: true });
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home')
    };
    const { stdout } = await runCli(['setup', '--repo', repoRoot], env);
    expect(stdout).toContain(`- Delegation: codex-orchestrator delegation setup --yes --repo '${repoRoot}'`);
  }, TEST_TIMEOUT);

  it('supports equals-style setup --format=json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-plan-equals-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['setup', '--format=json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      steps?: {
        guidance?: {
          note?: string;
        };
      };
    };
    expect(payload.status).toBe('planned');
    expect(payload.steps?.guidance?.note).toContain('Agent-first default');
  }, TEST_TIMEOUT);

  it('rejects setup --yes with --format json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-apply-json-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };

    await expect(runCli(['setup', '--yes', '--format', 'json'], env)).rejects.toMatchObject({
      stderr: expect.stringContaining('setup does not support --format json with --yes.')
    });
  }, TEST_TIMEOUT);

  it('treats setup --yes=false as plan mode', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-yes-false-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['setup', '--yes=false', '--format', 'json'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      steps?: {
        skills?: {
          commandLines?: string[];
        };
      };
    };
    expect(payload.status).toBe('planned');
    expect(payload.steps?.skills?.commandLines).toBeDefined();
  }, TEST_TIMEOUT);

  it('emits setup plan JSON with refresh-skills overwrite commands', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-plan-refresh-'));
    const env = {
      ...process.env,
      CODEX_HOME: tempDir
    };
    const { stdout } = await runCli(['setup', '--format', 'json', '--refresh-skills'], env);
    const payload = JSON.parse(stdout) as {
      status?: string;
      steps?: {
        skills?: {
          commandLines?: string[];
          note?: string;
        };
      };
    };
    expect(payload.status).toBe('planned');
    const commands = payload.steps?.skills?.commandLines ?? [];
    expect(commands).toHaveLength(1);
    expect(commands.every((entry) => entry.includes('--force'))).toBe(true);
    expect(payload.steps?.skills?.note).toContain('overwrite enabled via --refresh-skills');
  }, TEST_TIMEOUT);

  it('setup --yes keeps existing skill files by default', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-apply-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const skillPath = join(tempDir, 'skills', 'docs-first', 'SKILL.md');
    await mkdir(join(tempDir, 'skills', 'docs-first'), { recursive: true });
    await writeFile(skillPath, 'MARKER\n', 'utf8');

    const env = {
      ...process.env,
      CODEX_HOME: tempDir,
      CODEX_CLI_BIN: fakeCodex
    };
    mockDelegationServerInvocation(join(tempDir, 'dist', 'bin', 'codex-orchestrator.js'));
    await runCli(['setup', '--yes'], env, FLOW_TARGET_TEST_TIMEOUT);
    expect(await readFile(skillPath, 'utf8')).toBe('MARKER\n');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('setup --yes --refresh-skills overwrites existing skill files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-setup-refresh-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const skillPath = join(tempDir, 'skills', 'docs-first', 'SKILL.md');
    await mkdir(join(tempDir, 'skills', 'docs-first'), { recursive: true });
    await writeFile(skillPath, 'MARKER\n', 'utf8');

    const env = {
      ...process.env,
      CODEX_HOME: tempDir,
      CODEX_CLI_BIN: fakeCodex
    };
    mockDelegationServerInvocation(join(tempDir, 'dist', 'bin', 'codex-orchestrator.js'));
    await runCli(['setup', '--yes', '--refresh-skills'], env, FLOW_TARGET_TEST_TIMEOUT);
    const content = await readFile(skillPath, 'utf8');
    expect(content).not.toBe('MARKER\n');
    expect(content).toContain('docs-first');
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('delegation setup --yes preserves explicit repo pin in mcp add command', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-repo-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const codexHome = join(tempDir, 'codex-home');
    const repoRoot = join(tempDir, 'repo with spaces');
    const addLog = join(tempDir, 'mcp-add.log');
    await mkdir(repoRoot, { recursive: true });

    const env = {
      ...process.env,
      CODEX_HOME: codexHome,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_ADD_LOG: addLog
    };

    mockDelegationServerInvocation(join(tempDir, 'dist', 'bin', 'codex-orchestrator.js'));
    await runCli(['delegation', 'setup', '--yes', '--repo', repoRoot], env, FLOW_TARGET_TEST_TIMEOUT);
    const log = await readFile(addLog, 'utf8');
    expect(log).toContain('mcp add delegation');
    expect(log.replaceAll('\\', '/')).toContain('dist/bin/codex-orchestrator.js');
    expect(log).not.toContain('codex-orchestrator delegate-server --repo');
    expect(log).toContain(`--repo ${repoRoot}`);
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('delegation setup --yes reconfigures unpinned fallback entries when mcp get is unavailable', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-fallback-repin-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const codexHome = join(tempDir, 'codex-home');
    const repoRoot = join(tempDir, 'repo');
    const addLog = join(tempDir, 'mcp-add.log');
    await mkdir(repoRoot, { recursive: true });
    await mkdir(codexHome, { recursive: true });
    await writeFile(
      join(codexHome, 'config.toml'),
      [
        '[mcp_servers.delegation]',
        'command = "codex-orchestrator"',
        'args = ["delegate-server"]',
        '[mcp_servers.delegation.env]',
        'KEEP_ME = "1"'
      ].join('\n'),
      'utf8'
    );

    const env = {
      ...process.env,
      CODEX_HOME: codexHome,
      CODEX_CLI_BIN: fakeCodex,
      CODEX_TEST_MCP_ADD_LOG: addLog
    };

    mockDelegationServerInvocation(join(tempDir, 'dist', 'bin', 'codex-orchestrator.js'));
    await runCli(['delegation', 'setup', '--yes', '--repo', repoRoot], env, FLOW_TARGET_TEST_TIMEOUT);
    const log = await readFile(addLog, 'utf8');
    expect(log).toContain('mcp add delegation');
    expect(log).toContain('--env KEEP_ME=1');
    expect(log.replaceAll('\\', '/')).toContain('dist/bin/codex-orchestrator.js');
    expect(log).toContain(`--repo ${repoRoot}`);
  }, FLOW_TARGET_TEST_TIMEOUT);

  it('delegation setup plan includes explicit repo pin', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-plan-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const repoRoot = join(tempDir, 'repo');
    await mkdir(repoRoot, { recursive: true });
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex
    };

    const { stdout } = await runCli(['delegation', 'setup', '--format', 'json', '--repo', repoRoot], env);
    const payload = JSON.parse(stdout) as { plan?: { commandLine?: string } };
    expect((payload.plan?.commandLine ?? '').replaceAll('\\', '/')).toContain(
      'dist/bin/codex-orchestrator.js'
    );
    expect(payload.plan?.commandLine).toContain('--repo');
    expect(payload.plan?.commandLine).toContain(repoRoot);
  }, TEST_TIMEOUT);

  it('delegation setup normalizes relative repo pin to absolute path', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-relative-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const repoRoot = join(tempDir, 'repo');
    await mkdir(repoRoot, { recursive: true });
    const repoArg = relative(process.cwd(), repoRoot);
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex
    };

    const { stdout } = await runCli(['delegation', 'setup', '--format', 'json', '--repo', repoArg], env);
    const payload = JSON.parse(stdout) as { plan?: { commandLine?: string; repoRoot?: string } };
    expect(payload.plan?.repoRoot).toBe(repoRoot);
    expect(payload.plan?.commandLine).toContain(`--repo ${repoRoot}`);
    expect(payload.plan?.commandLine).not.toContain(`--repo ${repoArg}`);
  }, TEST_TIMEOUT);

  it('delegation setup plan safely quotes shell-sensitive repo pins', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-delegation-setup-quoted-'));
    const fakeCodex = await writeFakeCodexBinary(tempDir);
    const repoRoot = join(tempDir, 'repo;tmp');
    await mkdir(repoRoot, { recursive: true });
    const env = {
      ...process.env,
      CODEX_HOME: join(tempDir, 'codex-home'),
      CODEX_CLI_BIN: fakeCodex
    };

    const { stdout } = await runCli(['delegation', 'setup', '--format', 'json', '--repo', repoRoot], env);
    const payload = JSON.parse(stdout) as { plan?: { commandLine?: string } };
    expect(payload.plan?.commandLine).toContain(`--repo '${repoRoot}'`);
  }, TEST_TIMEOUT);

  it('supports quoted exec commands passed as a single token', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-surface-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cli-surface'
    };

    const { stdout } = await runCli(['exec', 'echo quoted-smoke', '--json', 'compact'], env);
    const lines = stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const payload = JSON.parse(lines[lines.length - 1] ?? '{}') as {
      payload?: {
        command?: { argv?: string[] };
        outputs?: { stdout?: string };
      };
    };
    expect(payload.payload?.command?.argv?.[0]).toBe('echo');
    expect(payload.payload?.outputs?.stdout).toContain('quoted-smoke');
  }, TEST_TIMEOUT);

  it('rejects exec without a command through the source entry subprocess', async () => {
    await expect(runCliSourceSubprocess(['exec'], undefined, CLI_SOURCE_ENTRY_TIMEOUT)).rejects.toMatchObject({
      stderr: expect.stringContaining('exec requires a command to run.')
    });
  }, CLI_SOURCE_ENTRY_TIMEOUT);

  it('preserves backslashes in quoted single-token exec commands', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-surface-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cli-surface'
    };

    const { stdout } = await runCliSourceSubprocess(
      ['exec', 'echo C:\\tmp\\foo', '--json', 'compact'],
      env,
      CLI_SOURCE_ENTRY_TIMEOUT
    );
    const lines = stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const payload = JSON.parse(lines[lines.length - 1] ?? '{}') as {
      payload?: { command?: { argv?: string[] }; outputs?: { stdout?: string } };
    };

    expect(payload.payload?.command?.argv).toEqual(['echo', 'C:\\tmp\\foo']);
  }, CLI_SOURCE_ENTRY_TIMEOUT);

  it('handles escaped quotes inside quoted single-token exec commands', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'co-cli-surface-'));
    const env = {
      ...process.env,
      CODEX_ORCHESTRATOR_ROOT: tempDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: join(tempDir, '.runs'),
      CODEX_ORCHESTRATOR_OUT_DIR: join(tempDir, 'out'),
      MCP_RUNNER_TASK_ID: 'cli-surface'
    };

    const { stdout } = await runCliSourceSubprocess(
      ['exec', 'node -e "console.log(\\\"x y\\\")"', '--json', 'compact'],
      env,
      CLI_SOURCE_ENTRY_TIMEOUT
    );
    const lines = stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const payload = JSON.parse(lines[lines.length - 1] ?? '{}') as {
      payload?: { command?: { argv?: string[] }; outputs?: { stdout?: string } };
    };

    expect(payload.payload?.command?.argv).toEqual(['node', '-e', 'console.log("x y")']);
    expect(payload.payload?.outputs?.stdout).toContain('x y');
  }, CLI_SOURCE_ENTRY_TIMEOUT);
});
