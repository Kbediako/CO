#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { collectIndexedTaskPacketPaths } from './lib/docs-freshness-lifecycle.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';

const ARCHIVE_MARKER = '<!-- docs-archive:stub -->';
const OPEN_CHECKLIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+.+$/gmu;
const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const TASKS_INDEX_PATH = 'tasks/index.json';

function showUsage() {
  console.log(`Usage: node scripts/audit-archive-stub-unchecked.mjs [options]

Fails when a changed, staged, unstaged, or untracked archive stub replaces base
content that still has open Markdown checklist items.

Options:
  --base <ref>      Base git ref to compare against (default: origin/<GITHUB_BASE_REF> or origin/main)
  --format json     Emit a JSON report
  --check           Alias for default fail-on-findings behavior
  -h, --help        Show this help text`);
}

function runGit(repoRoot, args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 100 * 1024 * 1024
  });
}

function resolveDefaultBase(args) {
  if (typeof args.base === 'string' && args.base.trim()) {
    return args.base.trim();
  }
  const githubBase = process.env.GITHUB_BASE_REF?.trim();
  return githubBase ? `origin/${githubBase}` : 'origin/main';
}

function collectChangedFiles(repoRoot, comparisonBase) {
  const changedFiles = new Set();
  for (const args of [
    ['diff', '--name-only', '--diff-filter=ACMR', comparisonBase, 'HEAD'],
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'],
    ['ls-files', '--others', '--exclude-standard']
  ]) {
    for (const entry of runGit(repoRoot, args).split('\n')) {
      const relativePath = entry.trim();
      if (relativePath) {
        changedFiles.add(relativePath);
      }
    }
  }
  return Array.from(changedFiles).sort();
}

function readGitPath(repoRoot, ref, relativePath) {
  try {
    const spec = ref === ':' ? `:${relativePath}` : `${ref}:${relativePath}`;
    return runGit(repoRoot, ['show', spec]);
  } catch {
    return null;
  }
}

async function readCurrentCandidateContents(repoRoot, relativePath) {
  const candidates = [];
  const stagedContent = readGitPath(repoRoot, ':', relativePath);
  if (stagedContent !== null) {
    candidates.push(stagedContent);
  }
  try {
    const worktreeContent = await readFile(`${repoRoot}/${relativePath}`, 'utf8');
    if (!candidates.includes(worktreeContent)) {
      candidates.push(worktreeContent);
    }
  } catch {
    // Deleted paths are excluded from the diff filter; missing worktree paths can be ignored here.
  }
  return candidates;
}

function extractOpenChecklistItems(content) {
  if (typeof content !== 'string' || content.length === 0) {
    return [];
  }
  return Array.from(content.matchAll(OPEN_CHECKLIST_ITEM_PATTERN), (match) => match[0].trim());
}

function collectStringPaths(value, paths = []) {
  if (typeof value === 'string' && value.trim().length > 0) {
    paths.push(value.trim());
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectStringPaths(item, paths);
    }
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStringPaths(item, paths);
    }
  }
  return paths;
}

function collectItemPaths(item) {
  const paths = [];
  collectStringPaths(item?.path, paths);
  collectStringPaths(item?.relates_to, paths);
  collectStringPaths(item?.paths, paths);
  paths.push(...collectIndexedTaskPacketPaths(item));
  return Array.from(new Set(paths));
}

function collectTaskChecklistPaths(item) {
  const paths = [];
  collectStringPaths(item?.path, paths);
  collectStringPaths(item?.relates_to, paths);
  if (item?.paths && typeof item.paths === 'object') {
    collectStringPaths(item.paths.task, paths);
    collectStringPaths(item.paths.agent_task, paths);
  }
  paths.push(...collectIndexedTaskPacketPaths(item));
  return Array.from(new Set(paths.filter(isTaskChecklistPath)));
}

function isTaskChecklistPath(relativePath) {
  return (
    typeof relativePath === 'string' &&
    (relativePath.startsWith('tasks/tasks-') || relativePath.startsWith('.agent/task/')) &&
    relativePath.endsWith('.md')
  );
}

async function readJsonIfPresent(pathValue, fallback) {
  try {
    return JSON.parse(await readFile(pathValue, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonGitPath(repoRoot, ref, relativePath, fallback) {
  const raw = readGitPath(repoRoot, ref, relativePath);
  if (raw === null) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function summarizeRegistryEntry(registry, docPath) {
  const entry = Array.isArray(registry?.entries)
    ? registry.entries.find((candidate) => candidate?.path === docPath)
    : null;
  if (!entry) {
    return null;
  }
  return {
    status: entry.status ?? null,
    last_review: entry.last_review ?? null,
    cadence_days: entry.cadence_days ?? null
  };
}

function summarizeTaskIndexEntries(taskIndex, docPath) {
  const items = Array.isArray(taskIndex?.items) ? taskIndex.items : [];
  return items
    .filter((item) => JSON.stringify(item).includes(docPath))
    .map((item) => ({
      id: item.id ?? null,
      title: item.title ?? null,
      status: item.status ?? null,
      last_review: item.last_review ?? null
    }));
}

function mergeLinkedChecklistMaps(target, source) {
  for (const [itemPath, sources] of source.entries()) {
    const existing = target.get(itemPath) ?? [];
    const seen = new Set(
      existing.map((entry) => `${entry.path}\0${entry.task_id ?? ''}\0${entry.task_status ?? ''}`)
    );
    for (const sourceEntry of sources) {
      const key = `${sourceEntry.path}\0${sourceEntry.task_id ?? ''}\0${sourceEntry.task_status ?? ''}`;
      if (!seen.has(key)) {
        existing.push(sourceEntry);
        seen.add(key);
      }
    }
    target.set(itemPath, existing);
  }
}

async function buildLinkedOpenChecklistMap(repoRoot, taskIndex, targetPaths = [], baseRef = null) {
  const map = new Map();
  const targetPathSet = new Set(targetPaths);
  const items = Array.isArray(taskIndex?.items) ? taskIndex.items : [];
  for (const item of items) {
    const itemPaths = collectItemPaths(item);
    if (targetPathSet.size > 0 && !itemPaths.some((itemPath) => targetPathSet.has(itemPath))) {
      continue;
    }
    const checklistSources = [];
    for (const checklistPath of collectTaskChecklistPaths(item)) {
      const candidates = await readCurrentCandidateContents(repoRoot, checklistPath);
      if (candidates.length === 0 && baseRef) {
        const baseContent = readGitPath(repoRoot, baseRef, checklistPath);
        if (baseContent !== null) {
          candidates.push(baseContent);
        }
      }
      const openChecklistItems = Array.from(
        new Set(candidates.flatMap((content) => extractOpenChecklistItems(content)))
      );
      if (openChecklistItems.length > 0) {
        checklistSources.push({
          path: checklistPath,
          unchecked_checklist_items: openChecklistItems.length,
          unchecked_checklist_samples: openChecklistItems.slice(0, 5)
        });
      }
    }
    if (checklistSources.length === 0) {
      continue;
    }
    for (const itemPath of itemPaths) {
      if (targetPathSet.size > 0 && !targetPathSet.has(itemPath)) {
        continue;
      }
      if (checklistSources.some((source) => source.path === itemPath)) {
        continue;
      }
      const existing = map.get(itemPath) ?? [];
      existing.push(
        ...checklistSources.map((source) => ({
          ...source,
          task_id: item.id ?? null,
          task_status: item.status ?? null
        }))
      );
      map.set(itemPath, existing);
    }
  }
  return map;
}

async function main() {
  const { repoRoot } = resolveEnvironmentPaths();
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    process.exit(0);
  }
  const knownFlags = new Set(['base', 'format', 'check', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    showUsage();
    process.exit(2);
  }

  const base = resolveDefaultBase(args);
  const explicitBase = typeof args.base === 'string' && args.base.trim().length > 0;
  let changedFiles = [];
  let comparisonBase = base;
  try {
    runGit(repoRoot, ['rev-parse', '--verify', `${base}^{commit}`]);
    comparisonBase = runGit(repoRoot, ['merge-base', base, 'HEAD']).trim();
    changedFiles = collectChangedFiles(repoRoot, comparisonBase);
  } catch (error) {
    const message = `Archive stub unchecked audit skipped: base ref ${base} is unavailable.`;
    if (explicitBase) {
      console.error(message);
      console.error(error?.stderr || error?.message || String(error));
      process.exit(2);
    }
    console.log(message);
    process.exit(0);
  }

  const changedStubCandidates = [];
  for (const relativePath of changedFiles) {
    const currentContents = await readCurrentCandidateContents(repoRoot, relativePath);
    if (!currentContents.some((content) => content.includes(ARCHIVE_MARKER))) {
      continue;
    }

    const baseContent = readGitPath(repoRoot, comparisonBase, relativePath);
    if (baseContent === null) {
      continue;
    }

    changedStubCandidates.push({ relativePath, baseContent });
  }

  let registry = { entries: [] };
  let taskIndex = { items: [] };
  let linkedOpenChecklistByPath = new Map();
  if (changedStubCandidates.length > 0) {
    registry = await readJsonIfPresent(`${repoRoot}/${DEFAULT_REGISTRY_PATH}`, { entries: [] });
    const baseTaskIndex = readJsonGitPath(repoRoot, comparisonBase, TASKS_INDEX_PATH, { items: [] });
    const baseLinkedOpenChecklistByPath = await buildLinkedOpenChecklistMap(
      repoRoot,
      baseTaskIndex,
      changedStubCandidates.map((candidate) => candidate.relativePath),
      comparisonBase
    );
    mergeLinkedChecklistMaps(linkedOpenChecklistByPath, baseLinkedOpenChecklistByPath);

    taskIndex = await readJsonIfPresent(`${repoRoot}/${TASKS_INDEX_PATH}`, { items: [] });
    const currentLinkedOpenChecklistByPath = await buildLinkedOpenChecklistMap(
      repoRoot,
      taskIndex,
      changedStubCandidates.map((candidate) => candidate.relativePath)
    );
    mergeLinkedChecklistMaps(linkedOpenChecklistByPath, currentLinkedOpenChecklistByPath);
  }
  const findings = [];

  for (const { relativePath, baseContent } of changedStubCandidates) {
    const openChecklistItems = extractOpenChecklistItems(baseContent);
    const linkedOpenChecklistItems = linkedOpenChecklistByPath.get(relativePath) ?? [];
    if (openChecklistItems.length === 0 && linkedOpenChecklistItems.length === 0) {
      continue;
    }

    findings.push({
      path: relativePath,
      unchecked_checklist_items: openChecklistItems.length,
      unchecked_checklist_samples: openChecklistItems.slice(0, 5),
      linked_unchecked_checklists: linkedOpenChecklistItems,
      registry: summarizeRegistryEntry(registry, relativePath),
      task_index: summarizeTaskIndexEntries(taskIndex, relativePath)
    });
  }

  const report = {
    version: 1,
    base,
    comparison_base: comparisonBase,
    changed_files: changedFiles.length,
    findings_count: findings.length,
    findings
  };

  if (args.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else if (findings.length > 0) {
    console.error(
      `Archive stub unchecked audit failed: ${findings.length} changed archive stub(s) replace base content with open checklist items.`
    );
    for (const finding of findings) {
      const registrySummary = finding.registry
        ? `${finding.registry.status ?? 'unknown'}/${finding.registry.last_review ?? 'unknown'}/${finding.registry.cadence_days ?? 'unknown'}`
        : 'missing-registry';
      const taskStatuses = finding.task_index
        .map((item) => `${item.id ?? 'unknown'}:${item.status ?? 'unset'}`)
        .join(', ');
      console.error(`- ${finding.path} (${finding.unchecked_checklist_items} open item(s); registry ${registrySummary}; task ${taskStatuses || 'none'})`);
      for (const sample of finding.unchecked_checklist_samples.slice(0, 3)) {
        console.error(`  ${sample}`);
      }
      for (const linked of finding.linked_unchecked_checklists.slice(0, 3)) {
        console.error(
          `  linked ${linked.path}: ${linked.unchecked_checklist_items} open item(s) for ${linked.task_id ?? 'unknown'}`
        );
        for (const sample of linked.unchecked_checklist_samples.slice(0, 2)) {
          console.error(`    ${sample}`);
        }
      }
    }
  } else {
    console.log(
      `Archive stub unchecked audit: OK (${changedFiles.length} changed file(s), 0 changed stubs hide open checklist items).`
    );
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
