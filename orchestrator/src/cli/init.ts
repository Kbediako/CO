import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { findPackageRoot } from './utils/packageInfo.js';

export interface InitOptions {
  template: string;
  cwd: string;
  force: boolean;
}

export interface InitResult {
  written: string[];
  skipped: string[];
  templateRoot: string;
}

export async function initCodexTemplates(options: InitOptions): Promise<InitResult> {
  const root = findPackageRoot();
  const templateRoot = join(root, 'templates', options.template);
  const written: string[] = [];
  const skipped: string[] = [];

  await assertDirectory(templateRoot);
  await copyTemplateDir(templateRoot, options.cwd, {
    force: options.force,
    written,
    skipped
  });

  return { written, skipped, templateRoot };
}

async function assertDirectory(path: string): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info || !info.isDirectory()) {
    throw new Error(`Template directory not found: ${path}`);
  }
}

async function copyTemplateDir(
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
      await copyTemplateDir(sourcePath, targetPath, options);
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

export function formatInitSummary(result: InitResult, cwd: string): string[] {
  const lines: string[] = [];
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
  if (lines.length === 0) {
    lines.push('No files written.');
  }
  lines.push('Next steps (recommended):');
  lines.push('  - codex-orchestrator setup --yes  # installs bundled skills + configures delegation/devtools wiring');
  lines.push(
    '  - codex-orchestrator codex setup  # optional managed/pinned Codex CLI (activate with CODEX_CLI_USE_MANAGED=1; stock codex is default)'
  );
  return lines;
}
