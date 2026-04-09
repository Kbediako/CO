import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import process from 'node:process';

import { findPackageRoot } from './packageInfo.js';

export interface ResolvePackageProgramInvocationOptions {
  distRelativePath: string;
  allowConfiguredForeignPackageRoot?: boolean;
  env?: NodeJS.ProcessEnv;
  packageRoot?: string;
  execPath?: string;
  sourcePreference?: 'default' | 'bootstrap';
  fileExists?: (path: string) => boolean;
  resolveModulePath?: (specifier: string, fromPath: string) => string;
}

export interface ResolvedPackageProgramInvocation {
  command: string;
  args: string[];
  packageRoot: string;
  distPath: string;
  sourcePath: string | null;
  mode: 'source' | 'dist';
  warning: string | null;
  envOverrides?: NodeJS.ProcessEnv;
}

const DEFAULT_SOURCE_EXTENSIONS = ['.ts', '.mts', '.js', '.mjs', '.tsx'] as const;
const BOOTSTRAP_SOURCE_EXTENSIONS = ['.js', '.ts', '.mjs', '.mts', '.tsx'] as const;

export function resolvePackageProgramInvocation(
  options: ResolvePackageProgramInvocationOptions
): ResolvedPackageProgramInvocation {
  const fileExists = options.fileExists ?? existsSync;
  const packageRoot = resolvePackageRoot(options);
  const distRelativePath = stripLeadingSeparators(options.distRelativePath);
  const distPath = join(packageRoot, 'dist', distRelativePath);
  const sourcePath = resolveSourcePath({
    packageRoot,
    distRelativePath,
    fileExists,
    sourcePreference: options.sourcePreference ?? 'default'
  });
  const execPath = options.execPath ?? process.execPath;

  if (sourcePath) {
    const sourceExtension = extname(sourcePath).toLowerCase();
    if (!requiresTsNodeLoader(sourceExtension)) {
      return {
        command: execPath,
        args: [sourcePath],
        packageRoot,
        distPath,
        sourcePath,
        mode: 'source',
        warning: null
      };
    }

    const loaderPath = resolveTsNodeLoaderPath(packageRoot, options.resolveModulePath);
    if (loaderPath) {
      return {
        command: execPath,
        args: ['--no-warnings', '--loader', loaderPath, sourcePath],
        packageRoot,
        distPath,
        sourcePath,
        mode: 'source',
        warning: null,
        envOverrides: {
          TS_NODE_PROJECT: join(packageRoot, 'tsconfig.json')
        }
      };
    }
  }

  if (fileExists(distPath)) {
    return {
      command: execPath,
      args: [distPath],
      packageRoot,
      distPath,
      sourcePath,
      mode: 'dist',
      warning: sourcePath ? buildSourceFallbackWarning(sourcePath, distPath) : null
    };
  }

  if (sourcePath) {
    throw new Error(
      `Unable to run ${sourcePath} because ts-node/esm is unavailable, and fallback dist artifact ${distPath} is missing.`
    );
  }

  throw new Error(`Unable to locate packaged program. Expected ${distPath}.`);
}

export function resolveCodexOrchestratorBootstrapInvocation(
  options: Omit<ResolvePackageProgramInvocationOptions, 'distRelativePath' | 'sourcePreference'> = {}
): ResolvedPackageProgramInvocation {
  return resolvePackageProgramInvocation({
    ...options,
    distRelativePath: 'bin/codex-orchestrator.js',
    sourcePreference: 'bootstrap'
  });
}

export function resolveProviderLinearWorkerProgramInvocation(
  options: Omit<ResolvePackageProgramInvocationOptions, 'distRelativePath'> = {}
): ResolvedPackageProgramInvocation {
  return resolvePackageProgramInvocation({
    ...options,
    distRelativePath: 'orchestrator/src/cli/providerLinearWorkerRunner.js'
  });
}

function resolvePackageRoot(
  options: Pick<ResolvePackageProgramInvocationOptions, 'allowConfiguredForeignPackageRoot' | 'env' | 'packageRoot'>
): string {
  const defaultPackageRoot = normalize(options.packageRoot ?? findPackageRoot(import.meta.url));
  const configured = normalizeOptionalString(options.env?.CODEX_ORCHESTRATOR_PACKAGE_ROOT);
  if (
    configured &&
    (options.allowConfiguredForeignPackageRoot === true || pathsEqual(configured, defaultPackageRoot))
  ) {
    return normalize(configured);
  }
  return defaultPackageRoot;
}

function resolveSourcePath(input: {
  packageRoot: string;
  distRelativePath: string;
  fileExists: (path: string) => boolean;
  sourcePreference: 'default' | 'bootstrap';
}): string | null {
  const relativeWithoutExtension = input.distRelativePath.replace(/\.js$/u, '');
  const extensions =
    input.sourcePreference === 'bootstrap' ? BOOTSTRAP_SOURCE_EXTENSIONS : DEFAULT_SOURCE_EXTENSIONS;
  for (const extension of extensions) {
    const candidate = join(input.packageRoot, `${relativeWithoutExtension}${extension}`);
    if (input.fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveTsNodeLoaderPath(
  packageRoot: string,
  resolveModulePath: ResolvePackageProgramInvocationOptions['resolveModulePath']
): string | null {
  try {
    const resolver =
      resolveModulePath ??
      ((specifier: string, fromPath: string) => createRequire(fromPath).resolve(specifier));
    return resolver('ts-node/esm', join(packageRoot, 'package.json'));
  } catch {
    return null;
  }
}

function requiresTsNodeLoader(extension: string): boolean {
  return extension === '.ts' || extension === '.mts' || extension === '.tsx';
}

function buildSourceFallbackWarning(sourcePath: string, distPath: string): string {
  return [
    'Source checkout fallback: ts-node/esm is unavailable, so execution is using the built dist artifact instead of the live source entrypoint.',
    `source=${sourcePath}`,
    `dist=${distPath}`,
    'Fresh merged TypeScript changes may remain stale until dist is rebuilt.'
  ].join(' ');
}

function normalizeOptionalString(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pathsEqual(leftPath: string, rightPath: string): boolean {
  return normalize(leftPath) === normalize(rightPath);
}

function stripLeadingSeparators(value: string): string {
  return value.replace(/^[/\\]+/u, '');
}
