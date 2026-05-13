import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import process from 'node:process';

import { resolveCodexHome } from './utils/codexPaths.js';
import { resolveCodexCliBin } from './utils/codexCli.js';
import {
  codexFeatureProbeDisablesMultiAgentV2,
  codexFeatureProbeRejectsAgentMaxThreads,
  readConfiguredMultiAgentV2Enabled,
  readCodexFeatureProbe
} from './utils/codexFeatures.js';
import { findPackageRoot } from './utils/packageInfo.js';

export interface InitOptions {
  template: string;
  cwd: string;
  force: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface InitResult {
  written: string[];
  skipped: string[];
  templateRoot: string;
}

const CODEX_TEMPLATE = 'codex';
const CODEX_PIPELINE_CONFIG = 'codex.orchestrator.json';
const CODEX_CONFIG_TEMPLATE = join('.codex', 'config.toml');
const require = createRequire(import.meta.url);
let tomlLibrary:
  | {
      parse: (source: string) => unknown;
      stringify: (value: unknown) => string;
    }
  | null
  | undefined;

export async function initCodexTemplates(options: InitOptions): Promise<InitResult> {
  const root = findPackageRoot();
  const templateRoot = join(root, 'templates', options.template);
  const env = options.env ?? process.env;
  const written: string[] = [];
  const skipped: string[] = [];

  await assertDirectory(templateRoot);
  await copyTemplateDir(templateRoot, options.cwd, {
    force: options.force,
    written,
    skipped
  });
  if (options.template === CODEX_TEMPLATE) {
    const configPath = join(options.cwd, CODEX_CONFIG_TEMPLATE);
    if (written.includes(configPath) && await isMultiAgentV2Enabled(env)) {
      await omitAgentMaxThreads(configPath);
    }
    await copyTemplateFile(join(root, CODEX_PIPELINE_CONFIG), join(options.cwd, CODEX_PIPELINE_CONFIG), {
      force: options.force,
      written,
      skipped
    });
  }

  return { written, skipped, templateRoot };
}

async function isMultiAgentV2Enabled(env: NodeJS.ProcessEnv): Promise<boolean> {
  const featureProbe = readCodexFeatureProbe(resolveCodexCliBin(env), env);
  if (featureProbe.flags?.multi_agent_v2 === true) {
    return true;
  }
  if (codexFeatureProbeDisablesMultiAgentV2(featureProbe)) {
    return false;
  }
  if (codexFeatureProbeRejectsAgentMaxThreads(featureProbe)) {
    return true;
  }
  const configPath = join(resolveCodexHome(env), 'config.toml');
  if (!existsSync(configPath)) {
    return false;
  }
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch {
    return false;
  }
  let parsed: unknown;
  try {
    parsed = getTomlLibrary().parse(raw);
  } catch {
    return false;
  }
  if (!isRecord(parsed)) {
    return false;
  }
  return readConfiguredMultiAgentV2Enabled(parsed);
}

async function omitAgentMaxThreads(configPath: string): Promise<void> {
  const raw = await readFile(configPath, 'utf8');
  const { removed, text } = removeAgentMaxThreadsFromToml(raw);
  if (!removed) {
    return;
  }
  await writeFile(configPath, text, 'utf8');
}

function removeAgentMaxThreadsFromToml(raw: string): { removed: boolean; text: string } {
  const lines = raw.split(/(?<=\n)/u);
  let inAgentsTable = false;
  let removed = false;
  const kept: string[] = [];
  for (const line of lines) {
    const withoutEol = line.replace(/\r?\n$/u, '');
    const trimmed = withoutEol.trim();
    if (/^\[[^\]]+\]\s*(?:#.*)?$/u.test(trimmed)) {
      inAgentsTable = /^\[agents\]\s*(?:#.*)?$/u.test(trimmed);
    }
    if (inAgentsTable && /^[ \t]*max_threads\s*=/u.test(withoutEol)) {
      removed = true;
      continue;
    }
    kept.push(line);
  }
  return { removed, text: kept.join('') };
}

function getTomlLibrary(): {
  parse: (source: string) => unknown;
  stringify: (value: unknown) => string;
} {
  if (tomlLibrary) {
    return tomlLibrary;
  }
  if (tomlLibrary === null) {
    throw new Error('Failed to load @iarna/toml.');
  }
  try {
    tomlLibrary = require('@iarna/toml') as {
      parse: (source: string) => unknown;
      stringify: (value: unknown) => string;
    };
    return tomlLibrary;
  } catch (error) {
    tomlLibrary = null;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

async function copyTemplateFile(
  sourcePath: string,
  targetPath: string,
  options: { force: boolean; written: string[]; skipped: string[] }
): Promise<void> {
  const info = await stat(sourcePath).catch(() => null);
  if (!info || !info.isFile()) {
    throw new Error(`Template file not found: ${sourcePath}`);
  }
  if (existsSync(targetPath) && !options.force) {
    options.skipped.push(targetPath);
    return;
  }
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  options.written.push(targetPath);
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
  lines.push(
    '  - Review codex.orchestrator.json and adjust pipeline commands to your repository toolchain'
  );
  lines.push('  - Review .codex/providers/provider.env.example and .codex/providers/control.example.json');
  lines.push('  - codex-orchestrator setup --yes  # installs bundled skills + configures delegation/devtools wiring');
  lines.push(
    '  - codex-orchestrator codex setup  # optional managed/pinned Codex CLI (activate with CODEX_CLI_USE_MANAGED=1; stock codex is default)'
  );
  return lines;
}
