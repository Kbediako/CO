#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { normalizeDocsCatalog, resolveDocsCatalogEntry } from './lib/docs-catalog.js';
import {
  collectIndexedTaskPacketPaths,
  collectTaskIndexItems,
  extractOpenChecklistItems,
  isTerminalTaskStatus
} from './lib/docs-freshness-lifecycle.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';
import { hasArchiveStubMarker, parseArchiveStubMetadata } from './lib/archive-stub.js';

const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const DOCS_CATALOG_PATH = 'docs/docs-catalog.json';
const TASKS_INDEX_PATH = 'tasks/index.json';
const NONTERMINAL_PACKET_STATUSES = new Set([
  'active',
  'blocked',
  'in-progress',
  'in_progress',
  'open',
  'ready',
  'rework',
  'todo'
]);

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

async function readCurrentContentCandidates(repoRoot, relativePath) {
  const candidates = [];
  const stagedContent = readGitPath(repoRoot, ':', relativePath);
  if (stagedContent !== null) {
    candidates.push({ source: 'index', content: stagedContent });
  }
  try {
    const worktreeContent = await readFile(`${repoRoot}/${relativePath}`, 'utf8');
    candidates.push({ source: 'worktree', content: worktreeContent });
  } catch {
    // Deleted paths are excluded from the diff filter; missing worktree paths can be ignored here.
  }
  return candidates;
}

async function readCurrentCandidateContents(repoRoot, relativePath) {
  const seen = new Set();
  const contents = [];
  for (const candidate of await readCurrentContentCandidates(repoRoot, relativePath)) {
    if (!seen.has(candidate.content)) {
      contents.push(candidate.content);
      seen.add(candidate.content);
    }
  }
  return contents;
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

function isMarkdownArchiveStubCandidate(relativePath) {
  return typeof relativePath === 'string' && relativePath.endsWith('.md');
}

function normalizeRegistryPath(value) {
  return typeof value === 'string' ? value.trim().replace(/\\/g, '/') : '';
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

async function readCurrentJsonCandidates(repoRoot, relativePath) {
  const candidates = [];
  const seen = new Set();
  const addRaw = (source, raw) => {
    const key = `${source}\0${raw ?? ''}`;
    if (typeof raw !== 'string' || seen.has(key)) {
      return;
    }
    seen.add(key);
    try {
      candidates.push({ source, value: JSON.parse(raw) });
    } catch {
      // Ignore malformed intermediate JSON; the dedicated JSON validators report those failures.
    }
  };
  addRaw('index', readGitPath(repoRoot, ':', relativePath));
  try {
    addRaw('worktree', await readFile(`${repoRoot}/${relativePath}`, 'utf8'));
  } catch {
    // Missing worktree files can be represented by the index candidate above.
  }
  return candidates;
}

function candidatesBySource(candidates) {
  return new Map(candidates.map((candidate) => [candidate.source, candidate.value]));
}

function sourceValue(sourceMap, source, fallback) {
  return sourceMap.has(source) ? sourceMap.get(source) : fallback;
}

function normalizeDocsCatalogCandidates(repoRoot, candidates) {
  return candidates.map((candidate) => ({
    source: candidate.source,
    value: normalizeDocsCatalog(candidate.value, DOCS_CATALOG_PATH, `${repoRoot}/${DOCS_CATALOG_PATH}`)
  }));
}

function summarizeRegistryLikeEntry(entry) {
  if (!entry) {
    return null;
  }
  return {
    status: entry.status ?? null,
    last_review: entry.last_review ?? null,
    cadence_days: entry.cadence_days ?? null
  };
}

function summarizeRegistryEntry(registry, docPath) {
  const entry = Array.isArray(registry?.entries)
    ? registry.entries.find((candidate) => candidate?.path === docPath)
    : null;
  return summarizeRegistryLikeEntry(entry);
}

function summarizeTaskIndexEntries(taskIndex, docPath) {
  const items = collectTaskIndexItems(taskIndex);
  return items
    .filter((item) => JSON.stringify(item).includes(docPath))
    .map((item) => ({
      id: item.id ?? null,
      title: item.title ?? null,
      status: item.status ?? null,
      last_review: item.last_review ?? null
    }));
}

function registryEntriesByPath(registry) {
  const entries = Array.isArray(registry?.entries) ? registry.entries : [];
  const byPath = new Map();
  for (const entry of entries) {
    const entryPath = normalizeRegistryPath(entry?.path);
    if (entryPath && !byPath.has(entryPath)) {
      byPath.set(entryPath, entry);
    }
  }
  return byPath;
}

function collectNewlyArchivedRegistryEntries(baseRegistry, currentRegistry) {
  const baseByPath = registryEntriesByPath(baseRegistry);
  const entries = [];
  for (const entry of Array.isArray(currentRegistry?.entries) ? currentRegistry.entries : []) {
    const entryPath = normalizeRegistryPath(entry?.path);
    if (!isMarkdownArchiveStubCandidate(entryPath) || entry?.status !== 'archived') {
      continue;
    }
    const baseEntry = baseByPath.get(entryPath);
    if (baseEntry?.status !== 'archived') {
      entries.push({
        relativePath: entryPath,
        previousStatus: baseEntry?.status ?? null,
        registryEntry: entry
      });
    }
  }
  return Array.from(
    new Map(entries.map((entry) => [entry.relativePath, entry])).values()
  ).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function isPreservedReportOnlyRegistryArchive(relativePath, docsCatalog) {
  const catalogEntry = resolveDocsCatalogEntry(relativePath, docsCatalog);
  return catalogEntry?.doc_class === 'report_only';
}

function registryArchiveReason(previousRegistryStatus) {
  return `registry status ${previousRegistryStatus ?? 'missing'} -> archived without valid stub`;
}

function extractFrontmatterStatus(content) {
  if (typeof content !== 'string') {
    return null;
  }
  const lines = content.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }
  if (lines[index]?.trim() !== '---') {
    return null;
  }
  for (index += 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === '---') {
      return null;
    }
    const match = line.match(/^status:\s*(.+)$/i);
    if (match) {
      return match[1].replace(/^['"]|['"]$/g, '').trim().toLowerCase();
    }
  }
  return null;
}

function nonTerminalSourceReasons(
  taskIndex,
  relativePath,
  currentContents,
  linkedOpenChecklistItems
) {
  const reasons = [];
  const frontmatterStatuses = Array.from(
    new Set(currentContents.map(extractFrontmatterStatus).filter(Boolean))
  );
  for (const status of frontmatterStatuses) {
    if (NONTERMINAL_PACKET_STATUSES.has(status) || !isTerminalTaskStatus(status)) {
      reasons.push(`frontmatter status ${status}`);
    }
  }
  for (const item of summarizeTaskIndexEntries(taskIndex, relativePath)) {
    const status = typeof item.status === 'string' ? item.status.trim().toLowerCase() : '';
    if (status && !isTerminalTaskStatus(status)) {
      reasons.push(`task index status ${status}`);
    }
  }
  if (linkedOpenChecklistItems.length > 0) {
    reasons.push('linked checklist has unchecked items');
  }
  return Array.from(new Set(reasons));
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

async function buildLinkedOpenChecklistMap(repoRoot, taskIndex, targetPaths = [], baseRef = null, currentSource = null) {
  const map = new Map();
  const targetPathSet = new Set(targetPaths);
  const items = collectTaskIndexItems(taskIndex);
  for (const item of items) {
    const itemPaths = collectItemPaths(item);
    if (targetPathSet.size > 0 && !itemPaths.some((itemPath) => targetPathSet.has(itemPath))) {
      continue;
    }
    const checklistSources = [];
    for (const checklistPath of collectTaskChecklistPaths(item)) {
      const candidates = currentSource
        ? (await readCurrentContentCandidates(repoRoot, checklistPath))
            .filter((candidate) => candidate.source === currentSource)
            .map((candidate) => candidate.content)
        : await readCurrentCandidateContents(repoRoot, checklistPath);
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

  let registry = { entries: [] };
  let baseRegistry = { entries: [] };
  let currentRegistryCandidates = [];
  const registryChanged = changedFiles.includes(DEFAULT_REGISTRY_PATH);
  if (registryChanged) {
    currentRegistryCandidates = await readCurrentJsonCandidates(repoRoot, DEFAULT_REGISTRY_PATH);
    registry = currentRegistryCandidates.at(-1)?.value ?? { entries: [] };
    baseRegistry = readJsonGitPath(repoRoot, comparisonBase, DEFAULT_REGISTRY_PATH, { entries: [] });
  }

  const changedStubCandidates = [];
  for (const relativePath of changedFiles) {
    if (!isMarkdownArchiveStubCandidate(relativePath)) {
      continue;
    }
    const currentContents = await readCurrentCandidateContents(repoRoot, relativePath);
    if (!currentContents.some(hasArchiveStubMarker)) {
      continue;
    }

    const baseContent = readGitPath(repoRoot, comparisonBase, relativePath);
    changedStubCandidates.push({ relativePath, baseContent, currentContents, source: 'archive_stub' });
  }

  const registryArchiveCandidates = [];
  if (registryChanged) {
    const archiveEntries = [];
    for (const currentRegistry of currentRegistryCandidates) {
      for (const entry of collectNewlyArchivedRegistryEntries(baseRegistry, currentRegistry.value)) {
        archiveEntries.push({
          ...entry,
          registrySource: currentRegistry.source
        });
      }
    }
    archiveEntries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    const reportedRegistryArchiveKeys = new Set();
    for (const { relativePath, previousStatus, registryEntry, registrySource } of archiveEntries) {
      const archiveKey = `${registrySource}\0${relativePath}`;
      if (reportedRegistryArchiveKeys.has(archiveKey)) {
        continue;
      }
      const contentCandidates = await readCurrentContentCandidates(repoRoot, relativePath);
      const currentContents = Array.from(
        new Set(
          contentCandidates
            .filter((candidate) => candidate.source === registrySource)
            .map((candidate) => candidate.content)
        )
      );
      if (currentContents.some((content) => parseArchiveStubMetadata(relativePath, content).isValid)) {
        continue;
      }
      reportedRegistryArchiveKeys.add(archiveKey);
      const baseContent = readGitPath(repoRoot, comparisonBase, relativePath);
      registryArchiveCandidates.push({
        relativePath,
        baseContent,
        currentContents,
        previousRegistryStatus: previousStatus,
        registryEntry,
        registrySource,
        source: 'registry_archive'
      });
    }
  }

  const auditCandidates = [...changedStubCandidates, ...registryArchiveCandidates];
  let taskIndex = { items: [] };
  let linkedOpenChecklistByPath = new Map();
  let baseLinkedOpenChecklistByPath = new Map();
  let taskIndexBySource = new Map();
  let linkedOpenChecklistBySource = new Map();
  let docsCatalog = null;
  let docsCatalogBySource = new Map();
  if (auditCandidates.length > 0) {
    if (!registryChanged) {
      registry = await readJsonIfPresent(`${repoRoot}/${DEFAULT_REGISTRY_PATH}`, { entries: [] });
    }
    docsCatalogBySource = candidatesBySource(
      normalizeDocsCatalogCandidates(repoRoot, await readCurrentJsonCandidates(repoRoot, DOCS_CATALOG_PATH))
    );
    docsCatalog = sourceValue(docsCatalogBySource, 'worktree', null);
    const candidatePaths = auditCandidates.map((candidate) => candidate.relativePath);
    const baseTaskIndex = readJsonGitPath(repoRoot, comparisonBase, TASKS_INDEX_PATH, { items: [] });
    baseLinkedOpenChecklistByPath = await buildLinkedOpenChecklistMap(
      repoRoot,
      baseTaskIndex,
      candidatePaths,
      comparisonBase
    );
    mergeLinkedChecklistMaps(linkedOpenChecklistByPath, baseLinkedOpenChecklistByPath);

    taskIndexBySource = candidatesBySource(await readCurrentJsonCandidates(repoRoot, TASKS_INDEX_PATH));
    taskIndex = sourceValue(taskIndexBySource, 'worktree', { items: [] });
    const currentLinkedOpenChecklistByPath = await buildLinkedOpenChecklistMap(
      repoRoot,
      taskIndex,
      candidatePaths
    );
    mergeLinkedChecklistMaps(linkedOpenChecklistByPath, currentLinkedOpenChecklistByPath);
    for (const [source, sourceTaskIndex] of taskIndexBySource.entries()) {
      const linkedMap = new Map();
      mergeLinkedChecklistMaps(linkedMap, baseLinkedOpenChecklistByPath);
      mergeLinkedChecklistMaps(
        linkedMap,
        await buildLinkedOpenChecklistMap(repoRoot, sourceTaskIndex, candidatePaths, null, source)
      );
      linkedOpenChecklistBySource.set(source, linkedMap);
    }
  }
  const findings = [];
  const reportedFindingPaths = new Set();

  for (const {
    relativePath,
    baseContent,
    currentContents,
    previousRegistryStatus,
    registryEntry,
    registrySource,
    source
  } of auditCandidates) {
    const openChecklistItems = Array.from(
      new Set([baseContent, ...currentContents].flatMap((content) => extractOpenChecklistItems(content)))
    );
    const sourceTaskIndex = registrySource ? sourceValue(taskIndexBySource, registrySource, { items: [] }) : taskIndex;
    const sourceDocsCatalog = registrySource ? sourceValue(docsCatalogBySource, registrySource, null) : docsCatalog;
    const sourceLinkedOpenChecklistByPath = registrySource
      ? linkedOpenChecklistBySource.get(registrySource) ?? baseLinkedOpenChecklistByPath
      : linkedOpenChecklistByPath;
    const linkedOpenChecklistItems = sourceLinkedOpenChecklistByPath.get(relativePath) ?? [];
    const invalidArchiveStubMetadata = currentContents
      .map((content) => parseArchiveStubMetadata(relativePath, content))
      .filter((parsed) => parsed.hasMarker && !parsed.isValid);
    const registryArchiveWithoutStub = source === 'registry_archive';
    const preservedReportOnlyArchive =
      registryArchiveWithoutStub &&
      currentContents.length > 0 &&
      isPreservedReportOnlyRegistryArchive(relativePath, sourceDocsCatalog);
    const registryArchiveRequiresStub = registryArchiveWithoutStub && !preservedReportOnlyArchive;
    const statusSourceContents =
      currentContents.length > 0 ? currentContents : [baseContent].filter((content) => typeof content === 'string');
    const activeSourceReasons = registryArchiveWithoutStub
      ? [
          ...(registryArchiveRequiresStub ? [registryArchiveReason(previousRegistryStatus)] : []),
          ...nonTerminalSourceReasons(sourceTaskIndex, relativePath, statusSourceContents, linkedOpenChecklistItems)
        ]
      : [];
    if (
      openChecklistItems.length === 0 &&
      linkedOpenChecklistItems.length === 0 &&
      invalidArchiveStubMetadata.length === 0 &&
      !registryArchiveRequiresStub &&
      activeSourceReasons.length === 0
    ) {
      continue;
    }
    if (reportedFindingPaths.has(relativePath)) {
      continue;
    }
    reportedFindingPaths.add(relativePath);

    findings.push({
      path: relativePath,
      registry_archive_without_stub: registryArchiveWithoutStub,
      active_source_reasons: activeSourceReasons,
      invalid_archive_stub_metadata: invalidArchiveStubMetadata.length > 0,
      archive_stub_metadata_errors: [
        ...new Set(invalidArchiveStubMetadata.flatMap((parsed) => parsed.errors))
      ],
      unchecked_checklist_items: openChecklistItems.length,
      unchecked_checklist_samples: openChecklistItems.slice(0, 5),
      linked_unchecked_checklists: linkedOpenChecklistItems,
      registry: summarizeRegistryLikeEntry(registryEntry) ?? summarizeRegistryEntry(registry, relativePath),
      task_index: summarizeTaskIndexEntries(sourceTaskIndex, relativePath)
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
      `Archive stub unchecked audit failed: ${findings.length} changed archive stub(s) have invalid metadata or hide open checklist items.`
    );
    for (const finding of findings) {
      const registrySummary = finding.registry
        ? `${finding.registry.status ?? 'unknown'}/${finding.registry.last_review ?? 'unknown'}/${finding.registry.cadence_days ?? 'unknown'}`
        : 'missing-registry';
      const taskStatuses = finding.task_index
        .map((item) => `${item.id ?? 'unknown'}:${item.status ?? 'unset'}`)
        .join(', ');
      console.error(`- ${finding.path} (${finding.unchecked_checklist_items} open item(s); registry ${registrySummary}; task ${taskStatuses || 'none'})`);
      if (finding.invalid_archive_stub_metadata) {
        console.error(`  invalid metadata: ${finding.archive_stub_metadata_errors.join('; ')}`);
      }
      if (finding.registry_archive_without_stub) {
        console.error(
          `  registry archived without valid stub: ${finding.active_source_reasons.join('; ') || 'active source evidence present'}`
        );
      }
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
      `Archive stub unchecked audit: OK (${changedFiles.length} changed file(s), 0 changed stubs have invalid metadata or hide open checklist items).`
    );
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
