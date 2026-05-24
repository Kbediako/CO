#!/usr/bin/env node

import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import {
  collectMarkdownFiles,
  computeAgeInDays,
  normalizeTaskKey,
  parseIsoDate,
  parseIsoDateOrTimestamp,
  pathExists,
  toPosixPath
} from './lib/docs-helpers.js';
import {
  collectIndexedTaskPacketPaths,
  isTaskPacketLifecyclePath,
  isTerminalTaskStatus,
  isTerminalTaskItem,
  RETAINED_TERMINAL_PACKET_STATUS,
  TERMINAL_PENDING_ARCHIVE_STATUS
} from './lib/docs-freshness-lifecycle.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';
import {
  buildArchiveStubContent,
  hasArchiveStubMarker,
  parseArchiveStubMetadata
} from './lib/archive-stub.js';

const DEFAULT_POLICY_PATH = 'docs/implementation-docs-archive-policy.json';
const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const TASKS_INDEX_PATH = 'tasks/index.json';
const DEFAULT_OWNER = 'Codex (top-level agent), Review agent';
const OPEN_CHECKLIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+.+$/gmu;
const REPORT_ONLY_RETENTION_FINDINGS_PATTERN = /^docs\/findings\/(\d+)-.*-deliberation\.md$/;
const REPORT_ONLY_TERMINAL_FINDINGS_PATTERN = /^docs\/findings\/(\d+)-.*\.md$/;
const PRESERVED_HISTORICAL_STUB_STATUS = 'preserved_historical_stub';
const REGISTRY_STATUS_ARCHIVE_ELIGIBLE = new Set(['archived', 'deprecated']);
const TERMINAL_LIFECYCLE_ARCHIVE_ELIGIBLE_STATUSES = new Set(['active', TERMINAL_PENDING_ARCHIVE_STATUS]);
const TERMINAL_TASK_LIFECYCLE_REASON = 'terminal_task_lifecycle';
const ALREADY_ARCHIVED_PRESERVED_FINDINGS_REASON = 'already_archived_preserved_findings';
const PRESERVED_HISTORICAL_STUB_PATH_PATTERNS = [/^tasks\/tasks-[^/]+\.md$/, /^\.agent\/task\/[^/]+\.md$/];
const PRESERVED_HISTORICAL_STUB_HEADING_PATTERN = /^\s*#\s+Historical stub\b/i;
const REGISTRY_TASK_STATUS_FIELDS = ['task_status', 'task_lifecycle_status', 'lifecycle_status'];

function showUsage() {
  console.log(`Usage: node scripts/implementation-docs-archive.mjs [options]

Archives implementation documentation by moving full content into an archive payload
and replacing main-branch files with lightweight stubs.

Options:
  --policy <path>    Policy JSON path (default: ${DEFAULT_POLICY_PATH})
  --registry <path>  Docs freshness registry path (default: ${DEFAULT_REGISTRY_PATH})
  --out <path>       Output dir (default: out/<task-id>)
  --dry-run          Report changes without writing files
  -h, --help         Show this help message`);
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function clearArchivedRegistryTaskStatus(entry) {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  let changed = false;
  for (const field of REGISTRY_TASK_STATUS_FIELDS) {
    const value = entry[field];
    if (typeof value === 'string' && value.trim() && !isTerminalTaskStatus(value)) {
      delete entry[field];
      changed = true;
    }
  }
  return changed;
}

function normalizeRegistryTaskStatus(entry) {
  for (const key of REGISTRY_TASK_STATUS_FIELDS) {
    const value = entry?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
  }
  return null;
}

function retainedTerminalPacketEvidence(registryEntry, relativePath, terminalTaskPacketPaths) {
  const taskStatus = normalizeRegistryTaskStatus(registryEntry);
  if (taskStatus && isTerminalTaskStatus(taskStatus) && isTaskPacketLifecyclePath(relativePath)) {
    return {
      retained_terminal_evidence: 'registry_task_status',
      task_status: taskStatus
    };
  }
  if (terminalTaskPacketPaths.has(relativePath)) {
    return {
      retained_terminal_evidence: 'task_index_terminal'
    };
  }
  return null;
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function globToRegExp(pattern) {
  const regex = `^${pattern
    .split('*')
    .map((segment) => segment.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
    .join('.*')}$`;
  return new RegExp(regex);
}

function matchesAnyPattern(value, patterns) {
  return patterns.some((regex) => regex.test(value));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function taskKeyAliases(taskKey) {
  const normalizedTaskKey = typeof taskKey === 'string' ? taskKey.trim() : '';
  if (!normalizedTaskKey) {
    return [];
  }
  const aliases = new Set([normalizedTaskKey]);
  const withoutNumericPrefix = normalizedTaskKey.replace(/^\d+-/u, '');
  if (withoutNumericPrefix && withoutNumericPrefix !== normalizedTaskKey) {
    aliases.add(withoutNumericPrefix);
  }
  return [...aliases];
}

function slugOnlyTaskKeyAlias(taskKey, item) {
  if (typeof taskKey !== 'string') {
    return null;
  }
  const id = typeof item?.id === 'string' ? item.id.trim() : String(item?.id ?? '').trim();
  if (!id || !/^\d+$/u.test(id) || !taskKey.startsWith(`${id}-`)) {
    return null;
  }
  const alias = taskKey.slice(id.length + 1);
  return /^[A-Za-z0-9][A-Za-z0-9-]*$/u.test(alias) ? alias : null;
}

function normalizeIndexedTaskPacketPath(candidate) {
  let normalized = String(candidate).trim().replace(/\\/gu, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  return toPosixPath(normalized);
}

function isTaskPacketDocReference(relativePath, taskKey) {
  const aliases = taskKeyAliases(taskKey);
  if (aliases.length === 0) {
    return false;
  }
  return aliases.some((alias) => {
    const escapedAlias = escapeRegExp(alias);
    return new RegExp(`^docs/(?:PRD|TECH_SPEC|ACTION_PLAN)[_-]${escapedAlias}\\.md$`, 'u').test(relativePath);
  });
}

function isPreservedHistoricalStubStatus(status) {
  return status === PRESERVED_HISTORICAL_STUB_STATUS;
}

function isRetainedTerminalPacketStatus(status) {
  return status === RETAINED_TERMINAL_PACKET_STATUS;
}

function isApprovedPreservedHistoricalStubPath(relativePath) {
  return PRESERVED_HISTORICAL_STUB_PATH_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function hasPreservedHistoricalStubHeading(content) {
  return typeof content === 'string' && PRESERVED_HISTORICAL_STUB_HEADING_PATTERN.test(content);
}

function isApprovedPreservedHistoricalStub(relativePath, content) {
  return isApprovedPreservedHistoricalStubPath(relativePath) && hasPreservedHistoricalStubHeading(content);
}

function isFindingsPath(relativePath) {
  return typeof relativePath === 'string' && relativePath.startsWith('docs/findings/');
}

function collectIndexedDocPaths(item, options = {}) {
  if (!item || typeof item !== 'object') {
    return [];
  }
  return collectIndexedTaskPacketPaths(item, options).map((entry) => toPosixPath(entry));
}

function collectExplicitIndexedDocPaths(item) {
  if (!item || typeof item !== 'object') {
    return [];
  }
  const values = [];
  const collectValue = (value) => {
    if (!value) {
      return;
    }
    if (typeof value === 'string') {
      values.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        collectValue(entry);
      }
      return;
    }
    if (typeof value === 'object') {
      for (const entry of Object.values(value)) {
        collectValue(entry);
      }
    }
  };
  collectValue(item.path);
  collectValue(item.relates_to);
  if (item.paths && typeof item.paths === 'object') {
    for (const key of ['docs', 'task', 'spec', 'agent_task', 'prd', 'action_plan', 'findings']) {
      collectValue(item.paths[key]);
    }
  }
  return values.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function isTaskChecklistPath(relativePath) {
  return (
    typeof relativePath === 'string' &&
    (relativePath.startsWith('tasks/tasks-') || relativePath.startsWith('.agent/task/')) &&
    relativePath.endsWith('.md')
  );
}

function collectSiblingTaskChecklistPaths(item, taskKey) {
  const paths = new Map();
  const addPath = (candidate, source) => {
    const normalizedCandidate = normalizeIndexedTaskPacketPath(candidate);
    if (!isTaskChecklistPath(normalizedCandidate)) {
      return;
    }
    const existing = paths.get(normalizedCandidate);
    paths.set(normalizedCandidate, {
      path: normalizedCandidate,
      synthesized: existing?.synthesized === false ? false : source === 'synthesized'
    });
  };
  for (const candidate of collectExplicitIndexedDocPaths(item)) {
    addPath(candidate, 'indexed');
  }
  if (item?.paths && typeof item.paths === 'object') {
    for (const key of ['task', 'agent_task']) {
      const value = item.paths[key];
      if (typeof value === 'string') {
        addPath(value, 'indexed');
      }
    }
  }
  if (typeof taskKey === 'string' && taskKey.length > 0) {
    addPath(`tasks/tasks-${taskKey}.md`, 'synthesized');
    addPath(`.agent/task/${taskKey}.md`, 'synthesized');
    const slugAlias = slugOnlyTaskKeyAlias(taskKey, item);
    if (slugAlias) {
      addPath(`tasks/tasks-${slugAlias}.md`, 'synthesized');
      addPath(`.agent/task/${slugAlias}.md`, 'synthesized');
    }
  }
  return [...paths.values()];
}

function toContainedRepoRelativePath(repoRoot, absolutePath) {
  const repoRelative = toPosixPath(path.relative(repoRoot, absolutePath));
  if (
    !repoRelative ||
    repoRelative === '..' ||
    repoRelative.startsWith('../') ||
    path.isAbsolute(repoRelative)
  ) {
    return null;
  }
  return repoRelative;
}

async function resolvePathOrExistingParent(absolutePath) {
  const missingSegments = [];
  let currentPath = absolutePath;

  while (true) {
    try {
      return {
        resolvedPath: await realpath(currentPath),
        missingSuffix:
          missingSegments.length > 0 ? path.join(...missingSegments.reverse()) : ''
      };
    } catch (error) {
      if (!error || typeof error !== 'object' || error.code !== 'ENOENT') {
        throw error;
      }

      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        throw error;
      }

      missingSegments.push(path.basename(currentPath));
      currentPath = parentPath;
    }
  }
}

async function resolveContainedPath(repoRoot, candidate, options = {}) {
  const { allowMissing = false, resolvedRepoRoot = null } = options;
  if (typeof candidate !== 'string') {
    return null;
  }
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }
  const absolutePath = path.resolve(repoRoot, trimmed);
  const lexicalRelative = toContainedRepoRelativePath(repoRoot, absolutePath);
  if (!lexicalRelative) {
    return null;
  }

  const canonicalRepoRoot = resolvedRepoRoot ?? (await realpath(repoRoot));

  try {
    const canonicalAbsolutePath = await realpath(absolutePath);
    const canonicalRelative = toContainedRepoRelativePath(canonicalRepoRoot, canonicalAbsolutePath);
    if (!canonicalRelative) {
      return null;
    }
    return {
      absolutePath: canonicalAbsolutePath,
      relativePath: canonicalRelative,
      exists: true
    };
  } catch (error) {
    if (!allowMissing || !error || typeof error !== 'object' || error.code !== 'ENOENT') {
      return null;
    }

    try {
      const { resolvedPath, missingSuffix } = await resolvePathOrExistingParent(absolutePath);
      const canonicalAbsolutePath = missingSuffix
        ? path.join(resolvedPath, missingSuffix)
        : resolvedPath;
      const canonicalRelative = toContainedRepoRelativePath(canonicalRepoRoot, canonicalAbsolutePath);
      if (!canonicalRelative) {
        return null;
      }
      return {
        absolutePath: canonicalAbsolutePath,
        relativePath: canonicalRelative,
        exists: false
      };
    } catch {
      return null;
    }
  }
}

async function normalizeRepoRelativePath(repoRoot, candidate, options = {}) {
  const containedPath = await resolveContainedPath(repoRoot, candidate, options);
  return containedPath?.relativePath ?? null;
}

function parsePolicy(raw, policyPath) {
  const data = JSON.parse(raw);
  const archiveBranch = typeof data?.archive_branch === 'string' ? data.archive_branch.trim() : '';
  if (!archiveBranch) {
    throw new Error(`Policy archive_branch is missing in ${policyPath}`);
  }
  const repoUrl = typeof data?.repo_url === 'string' ? data.repo_url.trim() : '';
  if (!repoUrl) {
    throw new Error(`Policy repo_url is missing in ${policyPath}`);
  }
  const retainDays = Number.isFinite(data?.retain_days) ? Number(data.retain_days) : NaN;
  if (!Number.isInteger(retainDays) || retainDays < 0) {
    throw new Error(`Policy retain_days is invalid in ${policyPath}`);
  }
  const strayRetainDays = Number.isFinite(data?.stray_retain_days)
    ? Number(data.stray_retain_days)
    : NaN;
  if (!Number.isInteger(strayRetainDays) || strayRetainDays < 0) {
    throw new Error(`Policy stray_retain_days is invalid in ${policyPath}`);
  }
  const maxLines = Number.isFinite(data?.max_lines) ? Number(data.max_lines) : NaN;
  if (!Number.isInteger(maxLines) || maxLines <= 0) {
    throw new Error(`Policy max_lines is invalid in ${policyPath}`);
  }
  const archivedCadenceDays = Number.isFinite(data?.archived_cadence_days)
    ? Number(data.archived_cadence_days)
    : NaN;
  if (!Number.isInteger(archivedCadenceDays) || archivedCadenceDays <= 0) {
    throw new Error(`Policy archived_cadence_days is invalid in ${policyPath}`);
  }
  const docPatterns = Array.isArray(data?.doc_patterns) ? data.doc_patterns : [];
  if (docPatterns.length === 0) {
    throw new Error(`Policy doc_patterns is missing in ${policyPath}`);
  }
  const excludePaths = Array.isArray(data?.exclude_paths) ? data.exclude_paths : [];
  const allowlistTaskKeys = normalizeStringList(data?.allowlist_task_keys);
  const allowlistPaths = normalizeStringList(data?.allowlist_paths);

  return {
    archiveBranch,
    repoUrl,
    retainDays,
    strayRetainDays,
    maxLines,
    archivedCadenceDays,
    docPatterns,
    excludePaths,
    allowlistTaskKeys,
    allowlistPaths
  };
}

function isCompletedTaskItem(item) {
  return isTerminalTaskItem(item);
}

function extractNumericTaskId(taskKey) {
  if (typeof taskKey !== 'string') {
    return null;
  }
  const match = taskKey.match(/^(\d+)-/);
  return match?.[1] ?? null;
}

async function collectDocFiles(repoRoot) {
  const roots = ['docs', 'tasks', '.agent/task'];
  const results = [];
  for (const root of roots) {
    const abs = path.join(repoRoot, root);
    if (await pathExists(abs)) {
      results.push(...(await collectMarkdownFiles(repoRoot, root)));
    }
  }
  return results;
}

function extractDocReferences(content, docRegexes) {
  const matches = new Set();
  const pattern = /(docs\/[A-Za-z0-9_.\/-]+\.md)/g;
  for (const match of content.matchAll(pattern)) {
    const candidate = match[1];
    if (candidate && matchesAnyPattern(candidate, docRegexes)) {
      matches.add(candidate);
    }
  }
  return [...matches];
}

function extractOpenChecklistItems(content) {
  if (typeof content !== 'string' || content.length === 0) {
    return [];
  }
  return Array.from(content.matchAll(OPEN_CHECKLIST_ITEM_PATTERN), (match) => match[0].trim());
}

function runGitOrNull(repoRoot, args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 100 * 1024 * 1024
    });
  } catch {
    return null;
  }
}

function selectArchivePolicyBaseRef() {
  const explicitBase = process.env.IMPLEMENTATION_DOCS_ARCHIVE_BASE_REF?.trim();
  const githubBase = process.env.GITHUB_BASE_REF?.trim();
  return explicitBase || (githubBase ? `origin/${githubBase}` : 'origin/main');
}

function resolveArchivePolicyBaseRef(repoRoot, baseRef = selectArchivePolicyBaseRef()) {
  if (!baseRef) {
    return null;
  }
  // Checklist safety compares against the selected base tip, not the fork point,
  // so long-lived branches do not inherit checklist debt already resolved on base.
  return runGitOrNull(repoRoot, ['rev-parse', '--verify', `${baseRef}^{commit}`])?.trim() || null;
}

function requireArchivePolicyBaseRef(repoRoot) {
  const selectedBaseRef = selectArchivePolicyBaseRef();
  const policyBaseRef = resolveArchivePolicyBaseRef(repoRoot, selectedBaseRef);
  if (!policyBaseRef) {
    throw new Error(
      `Unable to resolve archive policy base ref ${selectedBaseRef || '(empty)'}. Set IMPLEMENTATION_DOCS_ARCHIVE_BASE_REF or ensure origin/<base> is available.`
    );
  }
  return policyBaseRef;
}

function readGitPathOrNull(repoRoot, ref, relativePath) {
  if (!ref || !relativePath) {
    return null;
  }
  return runGitOrNull(repoRoot, ['show', `${ref}:${relativePath}`]);
}

function ensureRegistryEntry(registryMap, relativePath, defaults) {
  if (registryMap.has(relativePath)) {
    return registryMap.get(relativePath);
  }
  const entry = {
    path: relativePath,
    owner: defaults.owner,
    status: defaults.status,
    last_review: defaults.lastReview,
    cadence_days: defaults.cadenceDays
  };
  registryMap.set(relativePath, entry);
  return entry;
}

async function main() {
  const { repoRoot, outRoot } = resolveEnvironmentPaths();
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    process.exit(0);
  }
  const knownFlags = new Set(['policy', 'registry', 'out', 'dry-run', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    showUsage();
    process.exit(2);
  }

  const options = {
    policyPath: typeof args.policy === 'string' ? args.policy : DEFAULT_POLICY_PATH,
    registryPath: typeof args.registry === 'string' ? args.registry : DEFAULT_REGISTRY_PATH,
    outDir: typeof args.out === 'string' ? args.out : null,
    dryRun: hasFlag(args, 'dry-run')
  };

  const policyPath = path.resolve(repoRoot, options.policyPath);
  const registryPath = path.resolve(repoRoot, options.registryPath);
  const tasksIndexPath = path.resolve(repoRoot, TASKS_INDEX_PATH);

  const [policyRaw, registryRaw, tasksRaw] = await Promise.all([
    readFile(policyPath, 'utf8'),
    readFile(registryPath, 'utf8'),
    readFile(tasksIndexPath, 'utf8')
  ]);

  const policy = parsePolicy(policyRaw, policyPath);
  const registry = JSON.parse(registryRaw);
  const resolvedRepoRoot = await realpath(repoRoot);
  const registryEntries = Array.isArray(registry?.entries) ? registry.entries : [];
  const registryMap = new Map();
  for (const entry of registryEntries) {
    if (entry && typeof entry.path === 'string') {
      registryMap.set(entry.path, entry);
    }
  }

  const tasksIndex = JSON.parse(tasksRaw);
  const items = Array.isArray(tasksIndex?.items) ? tasksIndex.items : [];

  const docRegexes = policy.docPatterns.map((pattern) => globToRegExp(pattern));
  const excludeSet = new Set(policy.excludePaths);
  const allowlistTaskKeys = new Set(policy.allowlistTaskKeys);
  const allowlistPathRegexes = policy.allowlistPaths.map((pattern) => globToRegExp(pattern));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayString = formatDate(today);
  const archivePolicyBaseRef = requireArchivePolicyBaseRef(repoRoot);

  const taskLinkedDocs = new Set();
  const taskCandidates = [];
  const taskCandidateKeys = new Set();
  const terminalTaskPacketPaths = new Set();
  const reportOnlyTerminalEligibility = new Map();
  const reportOnlyRetentionEligibility = new Map();
  const linkedOpenChecklistByPath = new Map();

  function addTaskCandidate(candidate) {
    const key = `${candidate.taskKey ?? ''}\0${candidate.path}`;
    if (taskCandidateKeys.has(key)) {
      return;
    }
    taskCandidateKeys.add(key);
    taskCandidates.push(candidate);
  }

  for (const item of items) {
    const taskKey = normalizeTaskKey(item);
    if (!taskKey) {
      continue;
    }
    const docPaths = new Set();
    const indexedDocPaths = new Set();
    const explicitIndexedDocPaths = new Set();
    const primaryIndexedDocPaths = new Set(
      collectIndexedDocPaths(item, { includeSlugAliases: false })
    );

    for (const explicitPath of collectExplicitIndexedDocPaths(item)) {
      const containedExplicitPath = await resolveContainedPath(repoRoot, explicitPath, {
        allowMissing: true,
        resolvedRepoRoot
      });
      if (containedExplicitPath) {
        explicitIndexedDocPaths.add(containedExplicitPath.relativePath);
      }
    }

    for (const indexedPath of collectIndexedDocPaths(item)) {
      const containedIndexedPath = await resolveContainedPath(repoRoot, indexedPath, {
        allowMissing: true,
        resolvedRepoRoot
      });
      if (!containedIndexedPath) {
        continue;
      }

      const isSynthesizedAlias = !primaryIndexedDocPaths.has(containedIndexedPath.relativePath);
      if (
        !explicitIndexedDocPaths.has(containedIndexedPath.relativePath) &&
        !registryMap.has(containedIndexedPath.relativePath) &&
        (isSynthesizedAlias || !matchesAnyPattern(containedIndexedPath.relativePath, docRegexes))
      ) {
        continue;
      }

      docPaths.add(containedIndexedPath.relativePath);
      indexedDocPaths.add(containedIndexedPath.relativePath);
      if (containedIndexedPath.exists && (await pathExists(containedIndexedPath.absolutePath))) {
        const content = await readFile(containedIndexedPath.absolutePath, 'utf8');
        for (const ref of extractDocReferences(content, docRegexes)) {
          const normalizedRef = await normalizeRepoRelativePath(repoRoot, ref, {
            allowMissing: true,
            resolvedRepoRoot
          });
          if (normalizedRef) {
            taskLinkedDocs.add(normalizedRef);
            if (isTaskPacketDocReference(normalizedRef, taskKey)) {
              docPaths.add(normalizedRef);
              indexedDocPaths.add(normalizedRef);
            }
          }
        }
      }
    }

    const checklistPath = `tasks/tasks-${taskKey}.md`;
    docPaths.add(checklistPath);
    indexedDocPaths.add(checklistPath);
    const specPath = `tasks/specs/${taskKey}.md`;
    docPaths.add(specPath);
    indexedDocPaths.add(specPath);
    const agentPath = `.agent/task/${taskKey}.md`;
    docPaths.add(agentPath);
    indexedDocPaths.add(agentPath);

    const linkedOpenChecklistSources = [];
    for (const checklistPath of collectSiblingTaskChecklistPaths(item, taskKey)) {
      const containedChecklistPath = await resolveContainedPath(repoRoot, checklistPath.path, {
        allowMissing: true,
        resolvedRepoRoot
      });
      if (!containedChecklistPath) {
        continue;
      }
      const currentChecklistExists =
        containedChecklistPath.exists && (await pathExists(containedChecklistPath.absolutePath));
      if (!currentChecklistExists && checklistPath.synthesized) {
        continue;
      }

      if (currentChecklistExists) {
        const checklistContent = await readFile(containedChecklistPath.absolutePath, 'utf8');
        if (!hasArchiveStubMarker(checklistContent)) {
          const openChecklistItems = extractOpenChecklistItems(checklistContent);
          if (openChecklistItems.length > 0) {
            linkedOpenChecklistSources.push({
              path: containedChecklistPath.relativePath,
              taskKey,
              unchecked_checklist_items: openChecklistItems.length,
              unchecked_checklist_samples: openChecklistItems.slice(0, 5)
            });
          }
        }
      }

      const baseChecklistItems = extractOpenChecklistItems(
        readGitPathOrNull(repoRoot, archivePolicyBaseRef, containedChecklistPath.relativePath)
      );
      if (baseChecklistItems.length > 0) {
        linkedOpenChecklistSources.push({
          path: containedChecklistPath.relativePath,
          taskKey,
          source: 'base',
          base_ref: archivePolicyBaseRef,
          unchecked_checklist_items: baseChecklistItems.length,
          unchecked_checklist_samples: baseChecklistItems.slice(0, 5)
        });
      }
    }

    if (linkedOpenChecklistSources.length > 0) {
      for (const pathValue of docPaths) {
        if (linkedOpenChecklistSources.some((source) => source.path === pathValue)) {
          continue;
        }
        const existing = linkedOpenChecklistByPath.get(pathValue) ?? [];
        existing.push(...linkedOpenChecklistSources);
        linkedOpenChecklistByPath.set(pathValue, existing);
      }
    }

    for (const pathValue of docPaths) {
      if (excludeSet.has(pathValue)) {
        continue;
      }
      taskLinkedDocs.add(pathValue);
    }

    const completedDate = parseIsoDateOrTimestamp(item.completed_at);
    const isTerminalTask = isCompletedTaskItem(item);
    const fallbackTerminalDate = completedDate ?? parseIsoDate(item.last_review) ?? today;
    const numericTaskId = extractNumericTaskId(taskKey);
    if (numericTaskId) {
      const existingTerminalEligibility = reportOnlyTerminalEligibility.get(numericTaskId) ?? {
        candidate: null,
        hasNonTerminalItem: false
      };
      if (!isTerminalTask) {
        existingTerminalEligibility.hasNonTerminalItem = true;
      } else if (fallbackTerminalDate) {
        existingTerminalEligibility.candidate = {
          taskId: numericTaskId,
          taskKey,
          completedAt: completedDate ? formatDate(completedDate) : null,
          ageDays: computeAgeInDays(fallbackTerminalDate, today)
        };
      }
      reportOnlyTerminalEligibility.set(numericTaskId, existingTerminalEligibility);

      const existingEligibility = reportOnlyRetentionEligibility.get(numericTaskId) ?? {
        candidate: null,
        hasNonTerminalItem: false
      };
      if (!isTerminalTask) {
        existingEligibility.hasNonTerminalItem = true;
      } else if (fallbackTerminalDate) {
        const ageDays = computeAgeInDays(fallbackTerminalDate, today);
        if (ageDays >= policy.retainDays) {
          const nextCandidate = {
            taskId: numericTaskId,
            taskKey,
            completedAt: completedDate ? formatDate(completedDate) : null,
            ageDays
          };
          if (
            !existingEligibility.candidate ||
            existingEligibility.candidate.completedAt < nextCandidate.completedAt
          ) {
            existingEligibility.candidate = nextCandidate;
          }
        }
      }
      reportOnlyRetentionEligibility.set(numericTaskId, existingEligibility);
    }

    if (!isTerminalTask) {
      continue;
    }

    const ageDays = computeAgeInDays(fallbackTerminalDate, today);
    for (const pathValue of indexedDocPaths) {
      terminalTaskPacketPaths.add(pathValue);
      if (excludeSet.has(pathValue)) {
        continue;
      }
      addTaskCandidate({
        path: pathValue,
        taskKey,
        completedAt: completedDate ? formatDate(completedDate) : null,
        ageDays
      });
    }
  }

  function getAllowlistReason(relativePath, taskKey) {
    if (taskKey && allowlistTaskKeys.has(taskKey)) {
      return 'allowlist_task_key';
    }
    if (matchesAnyPattern(relativePath, allowlistPathRegexes)) {
      return 'allowlist_path';
    }
    return null;
  }

  const allDocs = await collectDocFiles(repoRoot);
  const reportOnlyRetentionCandidates = new Map(
    Array.from(reportOnlyRetentionEligibility.entries())
      .filter(([, eligibility]) => !eligibility.hasNonTerminalItem && eligibility.candidate)
      .map(([taskId, eligibility]) => [taskId, eligibility.candidate])
  );
  const reportOnlyFindingsByTaskId = new Map();
  const terminalFindingsByTaskId = new Map();
  for (const docPath of allDocs) {
    const terminalMatch = docPath.match(REPORT_ONLY_TERMINAL_FINDINGS_PATTERN);
    if (terminalMatch?.[1]) {
      const existing = terminalFindingsByTaskId.get(terminalMatch[1]) ?? [];
      existing.push(docPath);
      terminalFindingsByTaskId.set(terminalMatch[1], existing);
    }
    const retentionMatch = docPath.match(REPORT_ONLY_RETENTION_FINDINGS_PATTERN);
    if (retentionMatch?.[1]) {
      const existing = reportOnlyFindingsByTaskId.get(retentionMatch[1]) ?? [];
      existing.push(docPath);
      reportOnlyFindingsByTaskId.set(retentionMatch[1], existing);
    }
  }
  for (const [taskId, eligibility] of reportOnlyTerminalEligibility.entries()) {
    if (eligibility.hasNonTerminalItem || !eligibility.candidate) {
      continue;
    }
    const taskContext = eligibility.candidate;
    const findingPaths = terminalFindingsByTaskId.get(taskId) ?? [];
    for (const relativePath of findingPaths) {
      if (excludeSet.has(relativePath)) {
        continue;
      }
      terminalTaskPacketPaths.add(relativePath);
      addTaskCandidate({
        path: relativePath,
        taskKey: taskContext.taskKey,
        completedAt: taskContext.completedAt,
        ageDays: taskContext.ageDays
      });
    }
  }
  const strayCandidates = allDocs.filter((docPath) => {
    if (excludeSet.has(docPath)) {
      return false;
    }
    if (!matchesAnyPattern(docPath, docRegexes)) {
      return false;
    }
    return !taskLinkedDocs.has(docPath);
  });

  const archiveOutRoot = options.outDir
    ? path.resolve(repoRoot, options.outDir)
    : path.join(outRoot, process.env.MCP_RUNNER_TASK_ID || 'local');
  const archivePayloadRoot = path.join(archiveOutRoot, 'docs-archive');
  const reportPath = path.join(archiveOutRoot, 'docs-archive-report.json');

  const report = {
    version: 1,
    generated_at: new Date().toISOString(),
    task_id: process.env.MCP_RUNNER_TASK_ID || null,
    policy_path: toPosixPath(path.relative(repoRoot, policyPath)),
    action_path: {
      kind: 'implementation_docs_archive_self_heal_pr',
      dry_run: options.dryRun,
      workflow: '.github/workflows/implementation-docs-archive-automation.yml',
      archive_branch: policy.archiveBranch,
      pr_branch: 'automation/implementation-docs-archive',
      trigger: 'gh workflow run implementation-docs-archive-automation.yml --ref main',
      archive_payload_required: false,
      registry_repair_required: false,
      action_required: false
    },
    totals: {
      task_candidates: taskCandidates.length,
      stray_candidates: strayCandidates.length,
      archived: 0,
      registry_repairs: 0,
      skipped: 0
    },
    archived: [],
    registry_repairs: [],
    skipped: [],
    stray_candidates: []
  };

  async function loadContainedDoc(relativePath, context) {
    const containedPath = await resolveContainedPath(repoRoot, relativePath, {
      allowMissing: true,
      resolvedRepoRoot
    });
    if (!containedPath) {
      report.skipped.push({ path: relativePath, reason: 'outside_repo', context });
      report.totals.skipped += 1;
      return null;
    }
    if (!containedPath.exists || !(await pathExists(containedPath.absolutePath))) {
      report.skipped.push({ path: containedPath.relativePath, reason: 'missing_on_disk', context });
      report.totals.skipped += 1;
      return null;
    }

    return {
      containedPath,
      content: await readFile(containedPath.absolutePath, 'utf8')
    };
  }

  function markArchivedRegistryEntry(relativePath, { reason, context, archiveUrl, recordRepair = false }) {
    const existingEntry = registryMap.get(relativePath);
    if (existingEntry?.status === 'archived') {
      const taskStatusCleared = clearArchivedRegistryTaskStatus(existingEntry);
      if (taskStatusCleared && recordRepair) {
        report.registry_repairs.push({ path: relativePath, reason, context, archive_url: archiveUrl });
        report.totals.registry_repairs += 1;
      }
      return taskStatusCleared;
    }
    const entry = ensureRegistryEntry(registryMap, relativePath, {
      owner: DEFAULT_OWNER,
      status: 'archived',
      lastReview: todayString,
      cadenceDays: policy.archivedCadenceDays
    });
    entry.status = 'archived';
    entry.last_review = todayString;
    entry.cadence_days = policy.archivedCadenceDays;
    clearArchivedRegistryTaskStatus(entry);
    if (!entry.owner || typeof entry.owner !== 'string') {
      entry.owner = DEFAULT_OWNER;
    }
    if (recordRepair) {
      report.registry_repairs.push({ path: relativePath, reason, context, archive_url: archiveUrl });
      report.totals.registry_repairs += 1;
    }
    return true;
  }

  async function archiveDoc({ relativePath, reason, context, loadedDoc = null, preserveSourceDoc = false }) {
    const loaded = loadedDoc ?? (await loadContainedDoc(relativePath, context));
    if (!loaded) {
      return;
    }

    const { containedPath, content } = loaded;
    const archiveRelativePath = containedPath.relativePath;
    const archiveUrl = `${policy.repoUrl}/blob/${policy.archiveBranch}/${archiveRelativePath}`;

    const openChecklistItems = extractOpenChecklistItems(content);
    if (openChecklistItems.length > 0) {
      report.skipped.push({
        path: relativePath,
        reason: 'unchecked_checklist_items',
        context: {
          ...context,
          unchecked_checklist_items: openChecklistItems.length,
          unchecked_checklist_samples: openChecklistItems.slice(0, 5)
        }
      });
      report.totals.skipped += 1;
      return;
    }

    const baseOpenChecklistItems = extractOpenChecklistItems(
      readGitPathOrNull(repoRoot, archivePolicyBaseRef, relativePath)
    );
    if (baseOpenChecklistItems.length > 0) {
      report.skipped.push({
        path: relativePath,
        reason: 'base_unchecked_checklist_items',
        context: {
          ...context,
          base_ref: archivePolicyBaseRef,
          unchecked_checklist_items: baseOpenChecklistItems.length,
          unchecked_checklist_samples: baseOpenChecklistItems.slice(0, 5)
        }
      });
      report.totals.skipped += 1;
      return;
    }

    const linkedOpenChecklistItems = linkedOpenChecklistByPath.get(relativePath) ?? [];
    if (linkedOpenChecklistItems.length > 0) {
      report.skipped.push({
        path: relativePath,
        reason: 'linked_unchecked_checklist_items',
        context: {
          ...context,
          linked_unchecked_checklists: linkedOpenChecklistItems
        }
      });
      report.totals.skipped += 1;
      return;
    }

    if (hasArchiveStubMarker(content)) {
      const parsedStub = parseArchiveStubMetadata(archiveRelativePath, content);
      if (!parsedStub.isValid) {
        report.skipped.push({
          path: relativePath,
          reason: 'invalid_archive_stub_metadata',
          context: {
            ...context,
            archive_stub_errors: parsedStub.errors
          }
        });
        report.totals.skipped += 1;
        return;
      }
      const registryRepaired = markArchivedRegistryEntry(relativePath, {
        reason: 'already_stubbed_active_registry',
        context,
        archiveUrl,
        recordRepair: true
      });
      report.skipped.push({ path: relativePath, reason: 'already_stubbed', context, registry_repaired: registryRepaired });
      report.totals.skipped += 1;
      return;
    }

    const lines = content.split('\n');
    const headerLine = lines.find((line) => line.trim().startsWith('# ')) || null;
    const stub = buildArchiveStubContent({
      headerLine,
      archiveUrl,
      archivedAt: todayString,
      archiveBranch: policy.archiveBranch,
      relativePath: archiveRelativePath
    });

    if (!options.dryRun) {
      const payloadPath = path.join(archivePayloadRoot, relativePath);
      await mkdir(path.dirname(payloadPath), { recursive: true });
      await writeFile(payloadPath, content);
      if (!(await pathExists(payloadPath))) {
        throw new Error(`Archive payload missing after write: ${payloadPath}`);
      }
      if (!preserveSourceDoc) {
        await writeFile(containedPath.absolutePath, stub);
      }
    }

    markArchivedRegistryEntry(relativePath, {
      reason,
      context,
      archiveUrl
    });

    report.archived.push({ path: relativePath, reason, context, archive_url: archiveUrl });
    report.totals.archived += 1;
  }

  for (const candidate of taskCandidates) {
    const loadedDoc = await loadContainedDoc(candidate.path, candidate);
    if (!loadedDoc) {
      continue;
    }

    const { containedPath, content } = loadedDoc;
    const relativePath = containedPath.relativePath;
    const lineCount = content.split('\n').length;
    const registryEntry = registryMap.get(relativePath);
    const status = typeof registryEntry?.status === 'string' ? registryEntry.status : '';
    const allowlistReason = getAllowlistReason(relativePath, candidate.taskKey);

    if (allowlistReason) {
      report.skipped.push({
        path: relativePath,
        reason: allowlistReason,
        context: { ...candidate, lineCount }
      });
      report.totals.skipped += 1;
      continue;
    }

    if (isPreservedHistoricalStubStatus(status) && isApprovedPreservedHistoricalStub(relativePath, content)) {
      report.skipped.push({
        path: relativePath,
        reason: PRESERVED_HISTORICAL_STUB_STATUS,
        context: { ...candidate, lineCount, status }
      });
      report.totals.skipped += 1;
      continue;
    }

    const retainedEvidence = retainedTerminalPacketEvidence(registryEntry, relativePath, terminalTaskPacketPaths);
    if (isRetainedTerminalPacketStatus(status) && retainedEvidence) {
      report.skipped.push({
        path: relativePath,
        reason: RETAINED_TERMINAL_PACKET_STATUS,
        context: { ...candidate, lineCount, status, ...retainedEvidence }
      });
      report.totals.skipped += 1;
      continue;
    }

    if (status === 'archived' && isFindingsPath(relativePath)) {
      report.skipped.push({
        path: relativePath,
        reason: ALREADY_ARCHIVED_PRESERVED_FINDINGS_REASON,
        context: { ...candidate, lineCount, status }
      });
      report.totals.skipped += 1;
      continue;
    }

    const eligibleReasons = [];
    if (TERMINAL_LIFECYCLE_ARCHIVE_ELIGIBLE_STATUSES.has(status)) {
      eligibleReasons.push(TERMINAL_TASK_LIFECYCLE_REASON);
    }
    if (REGISTRY_STATUS_ARCHIVE_ELIGIBLE.has(status)) {
      eligibleReasons.push('registry_status');
    }
    if (candidate.ageDays >= policy.retainDays) {
      eligibleReasons.push('retention_age');
    }
    if (lineCount > policy.maxLines) {
      eligibleReasons.push('line_threshold');
    }

    if (eligibleReasons.length === 0) {
      report.skipped.push({
        path: relativePath,
        reason: 'not_eligible',
        context: { ...candidate, lineCount }
      });
      report.totals.skipped += 1;
      continue;
    }

    await archiveDoc({
      relativePath,
      reason: eligibleReasons.join(','),
      context: { ...candidate, lineCount },
      loadedDoc,
      preserveSourceDoc: relativePath.startsWith('docs/findings/')
    });
  }

  for (const relativePath of strayCandidates) {
    const loadedDoc = await loadContainedDoc(relativePath, { type: 'stray' });
    if (!loadedDoc) {
      continue;
    }

    const { containedPath, content } = loadedDoc;
    const normalizedRelativePath = containedPath.relativePath;
    const lineCount = content.split('\n').length;
    const registryEntry = registryMap.get(normalizedRelativePath);
    const status = typeof registryEntry?.status === 'string' ? registryEntry.status : '';
    const taskStatus = normalizeRegistryTaskStatus(registryEntry);
    const reviewDate = parseIsoDate(registryEntry?.last_review ?? null);

    const strayContext = {
      type: 'stray',
      status: status || null,
      ...(taskStatus ? { task_status: taskStatus } : {}),
      last_review: registryEntry?.last_review ?? null,
      lineCount
    };
    report.stray_candidates.push({ path: normalizedRelativePath, context: strayContext });

    const allowlistReason = getAllowlistReason(normalizedRelativePath, null);
    if (allowlistReason) {
      report.skipped.push({ path: normalizedRelativePath, reason: allowlistReason, context: strayContext });
      report.totals.skipped += 1;
      continue;
    }

    if (
      isPreservedHistoricalStubStatus(status) &&
      isApprovedPreservedHistoricalStub(normalizedRelativePath, content)
    ) {
      report.skipped.push({
        path: normalizedRelativePath,
        reason: PRESERVED_HISTORICAL_STUB_STATUS,
        context: strayContext
      });
      report.totals.skipped += 1;
      continue;
    }

    const retainedEvidence = retainedTerminalPacketEvidence(registryEntry, normalizedRelativePath, terminalTaskPacketPaths);
    if (isRetainedTerminalPacketStatus(status) && retainedEvidence) {
      report.skipped.push({
        path: normalizedRelativePath,
        reason: RETAINED_TERMINAL_PACKET_STATUS,
        context: { ...strayContext, ...retainedEvidence }
      });
      report.totals.skipped += 1;
      continue;
    }

    const eligibleReasons = [];
    if (status === TERMINAL_PENDING_ARCHIVE_STATUS) {
      eligibleReasons.push(TERMINAL_TASK_LIFECYCLE_REASON);
    }
    if (REGISTRY_STATUS_ARCHIVE_ELIGIBLE.has(status)) {
      eligibleReasons.push('registry_status');
    }
    if (reviewDate) {
      const ageDays = computeAgeInDays(reviewDate, today);
      if (ageDays >= policy.strayRetainDays) {
        eligibleReasons.push('retention_age');
      }
      strayContext.ageDays = ageDays;
    } else {
      strayContext.ageDays = null;
    }
    if (lineCount > policy.maxLines) {
      eligibleReasons.push('line_threshold');
    }

    if (eligibleReasons.length === 0) {
      report.skipped.push({ path: normalizedRelativePath, reason: 'not_eligible', context: strayContext });
      report.totals.skipped += 1;
      continue;
    }

    await archiveDoc({
      relativePath: normalizedRelativePath,
      reason: eligibleReasons.join(','),
      context: strayContext,
      loadedDoc
    });
  }

  for (const [taskId, taskContext] of reportOnlyRetentionCandidates.entries()) {
    const findingPaths = reportOnlyFindingsByTaskId.get(taskId) ?? [];
    for (const relativePath of findingPaths) {
      if (excludeSet.has(relativePath)) {
        continue;
      }

      const registryEntry = registryMap.get(relativePath);
      if (!registryEntry || registryEntry.status === 'archived') {
        continue;
      }

      const cadenceDays = Number.isFinite(registryEntry?.cadence_days)
        ? Number(registryEntry.cadence_days)
        : NaN;
      const reviewDate = parseIsoDate(registryEntry?.last_review ?? null);
      if (!reviewDate || !Number.isInteger(cadenceDays) || cadenceDays <= 0) {
        continue;
      }

      const ageDays = computeAgeInDays(reviewDate, today);
      if (ageDays <= cadenceDays) {
        continue;
      }

      await archiveDoc({
        relativePath,
        reason: 'report_only_retention',
        context: {
          ...taskContext,
          report_last_review: registryEntry.last_review,
          report_age_days: ageDays
        },
        preserveSourceDoc: true
      });
    }
  }

  report.totals.stray_candidates = report.stray_candidates.length;
  report.action_path.archive_payload_required = report.totals.archived > 0;
  report.action_path.registry_repair_required = report.totals.registry_repairs > 0;
  report.action_path.action_required =
    report.action_path.archive_payload_required || report.action_path.registry_repair_required;

  const shouldUpdateRegistry = report.totals.archived > 0 || report.totals.registry_repairs > 0;
  if (shouldUpdateRegistry) {
    registry.entries = Array.from(registryMap.values()).sort((a, b) => a.path.localeCompare(b.path));
    registry.generated_at = todayString;
  }

  await mkdir(archiveOutRoot, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (!options.dryRun) {
    if (shouldUpdateRegistry) {
      await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    }
  }

  console.log(`Archived docs: ${report.totals.archived}`);
  console.log(`Skipped docs: ${report.totals.skipped}`);
  console.log(`Stray candidates: ${report.totals.stray_candidates}`);
  if (options.dryRun) {
    console.log('Dry run: no source or archive payload files were written.');
    console.log(`Report: ${reportPath}`);
  } else {
    console.log(`Archive payload root: ${archivePayloadRoot}`);
    console.log(`Report: ${reportPath}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
