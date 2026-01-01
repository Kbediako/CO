#!/usr/bin/env node
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs as parseCliArgs } from './lib/cli-args.js';

export type DocsCheckRule =
  | 'npm-script-missing'
  | 'pipeline-id-missing'
  | 'backticked-path-missing'
  | 'tasks-file-too-large';

export interface DocsCheckError {
  file: string;
  rule: DocsCheckRule;
  reference: string;
}

const DOC_ROOTS = ['.agent', '.ai-dev-tasks', 'docs', 'tasks'] as const;
const DOC_ROOT_FILES = ['README.md', 'AGENTS.md'] as const;

const EXCLUDED_DIR_NAMES = new Set(['.runs', 'out', 'archives', 'node_modules', 'dist']);
const EXCLUDED_BACKTICKED_PATH_PREFIXES = [
  '.runs/',
  'out/',
  'archives/',
  'node_modules/',
  'dist/'
] as const;

interface OrchestratorConfig {
  pipelines?: Array<{ id?: string }>;
}

interface TasksIndex {
  items?: Array<{ id?: string; slug?: string; path?: string }>;
}

interface CliOptions {
  mode: 'check' | 'sync' | null;
  task?: string;
}

export async function collectDocFiles(repoRoot: string): Promise<string[]> {
  const results: string[] = [];

  for (const file of DOC_ROOT_FILES) {
    const abs = path.join(repoRoot, file);
    if (await exists(abs)) {
      results.push(toPosixPath(file));
    }
  }

  for (const dir of DOC_ROOTS) {
    const abs = path.join(repoRoot, dir);
    if (await exists(abs)) {
      const files = await collectMarkdownFilesRecursively(repoRoot, dir);
      results.push(...files);
    }
  }

  results.sort();
  return results;
}

async function collectMarkdownFilesRecursively(repoRoot: string, relativeDir: string): Promise<string[]> {
  const absDir = path.join(repoRoot, relativeDir);
  const entries = await readdir(absDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const relPath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) {
        continue;
      }
      results.push(...(await collectMarkdownFilesRecursively(repoRoot, relPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(toPosixPath(relPath));
    }
  }

  return results;
}

export async function runDocsCheck(repoRoot: string): Promise<DocsCheckError[]> {
  const [docFiles, npmScripts, pipelineIds, repoRootEntries, tasksSizeError] = await Promise.all([
    collectDocFiles(repoRoot),
    loadNpmScripts(repoRoot),
    loadOrchestratorPipelines(repoRoot),
    loadRepoRootEntries(repoRoot),
    checkTasksFileSize(repoRoot)
  ]);

  const errors: DocsCheckError[] = [];
  if (tasksSizeError) {
    errors.push(tasksSizeError);
  }

  for (const file of docFiles) {
    const abs = path.join(repoRoot, file);
    const content = await readFile(abs, 'utf8');

    const referencedScripts = extractNpmRunScripts(content);
    for (const script of referencedScripts) {
      if (!npmScripts.has(script)) {
        errors.push({ file, rule: 'npm-script-missing', reference: `npm run ${script}` });
      }
    }

    const referencedPipelines = extractOrchestratorPipelineIds(content);
    for (const pipelineId of referencedPipelines) {
      if (!pipelineIds.has(pipelineId)) {
        errors.push({
          file,
          rule: 'pipeline-id-missing',
          reference: `codex-orchestrator start ${pipelineId}`
        });
      }
    }

    const referencedPaths = extractBacktickedPaths(content);
    for (const repoRelativePath of referencedPaths) {
      const normalized = normalizeBacktickedRepoPathForCheck(repoRelativePath);
      if (!normalized) {
        continue;
      }

      if (!isRepoRootAnchoredPath(normalized, repoRootEntries)) {
        continue;
      }

      if (isExcludedBacktickedRepoPath(normalized)) {
        continue;
      }

      const resolved = path.resolve(repoRoot, normalized);
      if (!resolved.startsWith(path.resolve(repoRoot) + path.sep)) {
        continue;
      }

      if (!(await exists(resolved))) {
        errors.push({ file, rule: 'backticked-path-missing', reference: normalized });
      }
    }
  }

  return dedupeErrors(errors);
}

async function checkTasksFileSize(repoRoot: string): Promise<DocsCheckError | null> {
  const policyPath = path.join(repoRoot, 'docs', 'tasks-archive-policy.json');
  if (!(await exists(policyPath))) {
    return null;
  }
  const tasksPath = path.join(repoRoot, 'docs', 'TASKS.md');
  if (!(await exists(tasksPath))) {
    return null;
  }

  const raw = await readFile(policyPath, 'utf8');
  const policy = JSON.parse(raw) as { max_lines?: number };
  const maxLines = Number.isFinite(policy?.max_lines) ? Number(policy.max_lines) : NaN;
  if (!Number.isInteger(maxLines) || maxLines <= 0) {
    return null;
  }

  const tasksRaw = await readFile(tasksPath, 'utf8');
  const lineCount = tasksRaw.split('\n').length;
  if (lineCount <= maxLines) {
    return null;
  }

  return {
    file: 'docs/TASKS.md',
    rule: 'tasks-file-too-large',
    reference: `lines=${lineCount} max=${maxLines}`
  };
}

export async function runDocsSync(repoRoot: string, taskArg: string): Promise<void> {
  const { id, slug } = await resolveTaskIdentity(repoRoot, taskArg);
  const taskKey = `${id}-${slug}`;

  const sourceTasksPath = path.join(repoRoot, 'tasks', `tasks-${taskKey}.md`);
  const source = await readFile(sourceTasksPath, 'utf8');

  const agentMirrorPath = path.join(repoRoot, '.agent', 'task', `${taskKey}.md`);
  const agentMirrorContent = renderAgentTaskMirror({ id, taskKey, source });
  await writeFileIfChanged(agentMirrorPath, agentMirrorContent);

  const tasksSnapshotPath = path.join(repoRoot, 'docs', 'TASKS.md');
  const tasksSnapshotContent = await readFile(tasksSnapshotPath, 'utf8');
  const managedBlockKey = taskKey;
  const updatedTasksSnapshot = replaceManagedBlock(
    tasksSnapshotContent,
    managedBlockKey,
    renderTasksSnapshotChecklistBlock({ id, taskKey, source })
  );
  await writeFileIfChanged(tasksSnapshotPath, updatedTasksSnapshot);
}

function renderAgentTaskMirror(input: { id: string; taskKey: string; source: string }): string {
  const title = extractTaskTitle(input.source, input.id) ?? input.taskKey;
  const checklistBody = extractChecklistBody(input.source, { promoteHeadings: true });

  const lines = [
    `# Task Checklist — ${title} (${input.id})`,
    '',
    `> Set \`MCP_RUNNER_TASK_ID=${input.taskKey}\` for orchestrator commands. Mirror status with \`tasks/tasks-${input.taskKey}.md\` and \`docs/TASKS.md\`. Flip \`[ ]\` to \`[x]\` only with manifest evidence (e.g., \`.runs/${input.taskKey}/cli/<run-id>/manifest.json\`).`,
    '',
    checklistBody.trimEnd(),
    ''
  ];

  return lines.join('\n');
}

function renderTasksSnapshotChecklistBlock(input: { id: string; taskKey: string; source: string }): string {
  const checklistBody = extractChecklistBody(input.source, { promoteHeadings: false });
  const lines = [
    '## Checklist Mirror',
    `Mirror status with \`tasks/tasks-${input.taskKey}.md\` and \`.agent/task/${input.taskKey}.md\`. Keep \`[ ]\` until evidence is recorded.`,
    '',
    checklistBody.trimEnd(),
    ''
  ];
  return lines.join('\n');
}

function extractChecklistBody(source: string, options: { promoteHeadings: boolean }): string {
  const lines = source.split('\n');
  const startIndex = lines.findIndex((line) => line.trim() === '## Checklist');
  if (startIndex === -1) {
    throw new Error('Source task file is missing a "## Checklist" section.');
  }

  const bodyLines = lines.slice(startIndex + 1);

  while (bodyLines.length > 0 && bodyLines[0]?.trim() === '') {
    bodyLines.shift();
  }

  if (options.promoteHeadings) {
    return bodyLines
      .map((line) => (line.startsWith('### ') ? line.replace(/^### /, '## ') : line))
      .join('\n')
      .trimEnd();
  }

  return bodyLines.join('\n').trimEnd();
}

function extractTaskTitle(source: string, id: string): string | null {
  const firstHeading = source.split('\n')[0]?.trim() ?? '';
  const match = new RegExp(`^#\\s+Task\\s+${escapeRegExp(id)}\\s+—\\s+(.+)$`).exec(firstHeading);
  if (match?.[1]) {
    return match[1].trim();
  }
  return null;
}

function replaceManagedBlock(content: string, taskKey: string, replacementBody: string): string {
  const begin = `<!-- docs-sync:begin ${taskKey} -->`;
  const end = `<!-- docs-sync:end ${taskKey} -->`;
  const block = `${begin}\n${replacementBody.trimEnd()}\n${end}`;
  const taskId = taskKey.split('-')[0];

  const beginIndex = content.indexOf(begin);
  const endIndex = content.indexOf(end);

  if (beginIndex === -1 && endIndex === -1) {
    const updatedLegacy = replaceLegacyTaskBlock(content, taskId, block);
    if (updatedLegacy) {
      return updatedLegacy;
    }

    if (content.includes(`(${taskId})`)) {
      throw new Error(
        `docs/TASKS.md contains a task section for ${taskKey} but the checklist mirror block could not be located.`
      );
    }

    const separator = content.endsWith('\n') ? '' : '\n';
    return `${content}${separator}\n${block}\n`;
  }

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    throw new Error(`Managed block markers for ${taskKey} are malformed in docs/TASKS.md.`);
  }

  const afterEnd = endIndex + end.length;
  return `${content.slice(0, beginIndex)}${block}${content.slice(afterEnd)}`;
}

function replaceLegacyTaskBlock(content: string, taskId: string, block: string): string | null {
  const lines = content.split('\n');
  const sectionStart = lines.findIndex((line) => isTaskHeader(line, taskId));
  if (sectionStart === -1) {
    return null;
  }

  const sectionEnd = findNextTopLevelHeading(lines, sectionStart + 1);
  const sectionLines = lines.slice(sectionStart, sectionEnd);
  const checklistIndex = sectionLines.findIndex((line) => line.trim() === '## Checklist Mirror');
  const blockLines = block.split('\n');

  const newSectionLines =
    checklistIndex === -1 ? sectionLines.slice() : sectionLines.slice(0, checklistIndex);

  if (newSectionLines.length > 0 && newSectionLines[newSectionLines.length - 1]?.trim() !== '') {
    newSectionLines.push('');
  }
  newSectionLines.push(...blockLines);

  return [
    ...lines.slice(0, sectionStart),
    ...newSectionLines,
    ...lines.slice(sectionEnd)
  ].join('\n');
}

function isTaskHeader(line: string, taskId: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('# ')) {
    return false;
  }
  return new RegExp(`\\(${escapeRegExp(taskId)}\\)\\s*$`).test(trimmed);
}

function findNextTopLevelHeading(lines: string[], startIndex: number): number {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index]?.startsWith('# ')) {
      return index;
    }
  }
  return lines.length;
}

async function resolveTaskIdentity(repoRoot: string, taskArg: string): Promise<{ id: string; slug: string }> {
  const numericId = taskArg.split('-')[0] ?? taskArg;
  if (!/^\d{4}$/.test(numericId)) {
    throw new Error(`Invalid task id "${taskArg}". Expected "0906" or "0906-some-slug".`);
  }

  const index = await loadTasksIndex(repoRoot);
  const item = index.items?.find((entry) => entry.id === numericId);
  if (!item || !item.slug) {
    throw new Error(`Task "${numericId}" not found in tasks/index.json.`);
  }

  const providedSlug = taskArg.includes('-') ? taskArg.slice(numericId.length + 1) : null;
  if (providedSlug && providedSlug !== item.slug) {
    throw new Error(
      `Task "${taskArg}" slug mismatch. tasks/index.json declares "${numericId}-${item.slug}".`
    );
  }

  const canonicalTasksPath = path.join(repoRoot, 'tasks', `tasks-${numericId}-${item.slug}.md`);
  if (!(await exists(canonicalTasksPath))) {
    throw new Error(`Canonical source task file is missing: tasks/tasks-${numericId}-${item.slug}.md`);
  }

  return { id: numericId, slug: item.slug };
}

async function loadNpmScripts(repoRoot: string): Promise<Set<string>> {
  const pkgPath = path.join(repoRoot, 'package.json');
  const raw = await readFile(pkgPath, 'utf8');
  const json = JSON.parse(raw) as { scripts?: Record<string, unknown> };
  const scripts = new Set<string>();
  for (const key of Object.keys(json.scripts ?? {})) {
    scripts.add(key);
  }
  return scripts;
}

async function loadOrchestratorPipelines(repoRoot: string): Promise<Set<string>> {
  const configPath = path.join(repoRoot, 'codex.orchestrator.json');
  const raw = await readFile(configPath, 'utf8');
  const json = JSON.parse(raw) as OrchestratorConfig;
  const ids = new Set<string>();
  for (const pipeline of json.pipelines ?? []) {
    if (typeof pipeline.id === 'string' && pipeline.id.trim().length > 0) {
      ids.add(pipeline.id);
    }
  }
  return ids;
}

async function loadTasksIndex(repoRoot: string): Promise<TasksIndex> {
  const indexPath = path.join(repoRoot, 'tasks', 'index.json');
  const raw = await readFile(indexPath, 'utf8');
  return JSON.parse(raw) as TasksIndex;
}

function extractNpmRunScripts(markdown: string): string[] {
  const results = new Set<string>();
  const pattern = /\bnpm run ([A-Za-z0-9:_-]+)\b/g;
  for (const match of markdown.matchAll(pattern)) {
    const script = match[1];
    if (script) {
      results.add(script);
    }
  }
  return [...results];
}

function extractOrchestratorPipelineIds(markdown: string): string[] {
  const results = new Set<string>();
  const pattern = /\bcodex-orchestrator start ([A-Za-z0-9:_-]+)\b/g;
  for (const match of markdown.matchAll(pattern)) {
    const pipelineId = match[1];
    if (pipelineId) {
      results.add(pipelineId);
    }
  }
  return [...results];
}

function extractBacktickedPaths(markdown: string): string[] {
  const results = new Set<string>();
  const pattern = /`([^`\n]+)`/g;
  for (const match of markdown.matchAll(pattern)) {
    const raw = match[1];
    if (!raw) {
      continue;
    }
    const normalized = normalizeBacktickedValue(raw);
    if (normalized) {
      results.add(normalized);
    }
  }
  return [...results];
}

function normalizeBacktickedValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const withoutQuotes = trimmed.replace(/^['"]|['"]$/g, '');
  const withoutDotSlash = withoutQuotes.startsWith('./') ? withoutQuotes.slice(2) : withoutQuotes;
  return withoutDotSlash;
}

function normalizeBacktickedRepoPathForCheck(value: string): string | null {
  if (!value.includes('/')) {
    return null;
  }
  if (/\s/.test(value)) {
    return null;
  }
  if (value.startsWith('/') || value.startsWith('~')) {
    return null;
  }
  if (value.startsWith('../')) {
    return null;
  }
  if (value.includes('://')) {
    return null;
  }
  if (value.includes('<') || value.includes('>')) {
    return null;
  }
  if (value.includes('...') || value.includes('…')) {
    return null;
  }
  if (/[*?[{\]}]/.test(value)) {
    return null;
  }

  const withoutAnchor = value.split('#')[0] ?? value;
  const withoutLineHint = stripTrailingLineHint(withoutAnchor);
  const trimmed = withoutLineHint.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function isExcludedBacktickedRepoPath(value: string): boolean {
  return EXCLUDED_BACKTICKED_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));
}

async function loadRepoRootEntries(repoRoot: string): Promise<Set<string>> {
  const entries = await readdir(repoRoot, { withFileTypes: true });
  const names = new Set<string>();
  for (const entry of entries) {
    names.add(entry.name);
  }
  return names;
}

function isRepoRootAnchoredPath(repoRelativePath: string, repoRootEntries: Set<string>): boolean {
  const firstSegment = repoRelativePath.split('/')[0];
  if (!firstSegment) {
    return false;
  }
  return repoRootEntries.has(firstSegment);
}

function stripTrailingLineHint(value: string): string {
  const match = /^(.*?):(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?$/.exec(value);
  if (!match) {
    return value;
  }
  const base = match[1];
  return base ?? value;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}

async function exists(absPath: string): Promise<boolean> {
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function writeFileIfChanged(filePath: string, content: string): Promise<void> {
  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  try {
    const current = await readFile(filePath, 'utf8');
    if (current === normalized) {
      return;
    }
  } catch {
    // Ignore missing file read errors; we will create it below.
  }
  await writeFile(filePath, normalized, 'utf8');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dedupeErrors(errors: DocsCheckError[]): DocsCheckError[] {
  const seen = new Set<string>();
  const deduped: DocsCheckError[] = [];
  for (const error of errors) {
    const key = `${error.file}\n${error.rule}\n${error.reference}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(error);
  }
  return deduped;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const { args, entries } = parseCliArgs(process.argv.slice(2));
  const options: CliOptions = { mode: null };
  for (const entry of entries) {
    if (entry.key === 'check') {
      options.mode = 'check';
    } else if (entry.key === 'sync') {
      options.mode = 'sync';
    } else if (entry.key === 'task' && typeof entry.value === 'string') {
      options.task = entry.value;
    }
  }
  if (!options.task && typeof args.task === 'string') {
    options.task = args.task;
  }

  if (options.mode === 'check') {
    const errors = await runDocsCheck(repoRoot);
    if (errors.length === 0) {
      console.log('✅ docs:check: OK');
      return;
    }

    for (const error of errors) {
      console.error(`${error.file}: ${error.rule}: ${error.reference}`);
    }
    console.error(`❌ docs:check: ${errors.length} error(s)`);
    process.exitCode = 1;
    return;
  }

  if (options.mode === 'sync') {
    const task = options.task ?? process.env.MCP_RUNNER_TASK_ID;
    if (!task) {
      throw new Error('Missing --task <id> (or set MCP_RUNNER_TASK_ID).');
    }
    await runDocsSync(repoRoot, task);
    console.log(`✅ docs:sync: updated mirrors for ${task}`);
    return;
  }

  console.error('Usage: node --loader ts-node/esm scripts/docs-hygiene.ts --check | --sync [--task <id>]');
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('[docs-hygiene] failed:', error?.message ?? error);
  process.exitCode = 1;
});
