import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

import { resolveCodexHome } from './utils/devtools.js';
import { findPackageRoot } from './utils/packageInfo.js';

export interface SkillsInstallOptions {
  force?: boolean;
  codexHome?: string;
}

export interface SkillsInstallResult {
  written: string[];
  skipped: string[];
  sourceRoot: string;
  targetRoot: string;
  skills: string[];
}

export async function installSkills(options: SkillsInstallOptions = {}): Promise<SkillsInstallResult> {
  const pkgRoot = findPackageRoot();
  const sourceRoot = join(pkgRoot, 'skills');
  await assertDirectory(sourceRoot);

  const codexHome = resolveCodexHomePath(options.codexHome);
  const targetRoot = join(codexHome, 'skills');
  const written: string[] = [];
  const skipped: string[] = [];
  const skillNames = await listSkillNames(sourceRoot);

  await copyDir(sourceRoot, targetRoot, {
    force: options.force ?? false,
    written,
    skipped
  });

  return {
    written,
    skipped,
    sourceRoot,
    targetRoot,
    skills: skillNames
  };
}

export function formatSkillsInstallSummary(result: SkillsInstallResult, cwd: string = process.cwd()): string[] {
  const lines: string[] = [];
  lines.push(`Skills source: ${result.sourceRoot}`);
  lines.push(`Skills target: ${result.targetRoot}`);
  if (result.skills.length > 0) {
    lines.push(`Skills: ${result.skills.join(', ')}`);
  }
  if (result.written.length > 0) {
    lines.push('Written:');
    for (const filePath of result.written) {
      lines.push(`  - ${relative(cwd, filePath)}`);
    }
  }
  if (result.skipped.length > 0) {
    lines.push('Skipped (already exists):');
    for (const filePath of result.skipped) {
      lines.push(`  - ${relative(cwd, filePath)}`);
    }
  }
  if (result.written.length === 0 && result.skipped.length === 0) {
    lines.push('No files written.');
  }
  return lines;
}

function resolveCodexHomePath(override?: string): string {
  if (override && override.trim().length > 0) {
    const trimmed = override.trim();
    return resolve(process.cwd(), trimmed);
  }
  return resolveCodexHome(process.env);
}

async function listSkillNames(sourceRoot: string): Promise<string[]> {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function assertDirectory(path: string): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info || !info.isDirectory()) {
    throw new Error(`Skills directory not found: ${path}`);
  }
}

async function copyDir(
  sourceDir: string,
  targetDir: string,
  options: { force: boolean; written: string[]; skipped: string[] }
): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath, options);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (existsSync(targetPath) && !options.force) {
      options.skipped.push(targetPath);
      continue;
    }
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
    options.written.push(targetPath);
  }
}
