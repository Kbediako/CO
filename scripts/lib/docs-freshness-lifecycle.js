import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeTaskKey, parseIsoDateOrTimestamp } from './docs-helpers.js';

export const TERMINAL_PENDING_ARCHIVE_STATUS = 'terminal_pending_archive';
export const PRESERVED_HISTORICAL_STUB_STATUS = 'preserved_historical_stub';
export const RETAINED_TERMINAL_PACKET_STATUS = 'retained_terminal_packet';
export const ACTIVE_LIFECYCLE_STATUS = 'active';
export const ARCHIVED_LIFECYCLE_STATUS = 'archived';
export const DEPRECATED_LIFECYCLE_STATUS = 'deprecated';

export const EFFECTIVE_LIFECYCLE_STATUSES = new Set([
  ACTIVE_LIFECYCLE_STATUS,
  ARCHIVED_LIFECYCLE_STATUS,
  DEPRECATED_LIFECYCLE_STATUS,
  PRESERVED_HISTORICAL_STUB_STATUS,
  RETAINED_TERMINAL_PACKET_STATUS,
  TERMINAL_PENDING_ARCHIVE_STATUS
]);

export const TERMINAL_TASK_STATUSES = new Set([
  'succeeded',
  'completed',
  'done',
  'canceled',
  'cancelled',
  'closed',
  'duplicate',
  'merged'
]);

const ACTIVE_TASK_INDEX_REVIEW_STATUSES = new Set([
  'active',
  'blocked',
  'in_progress',
  'in-progress',
  'implementation',
  'implementation_update_validation_pending',
  'implementation_validated',
  'implementation_complete_pr_pending',
  'in_progress_docs_packet_validated',
  'recovered_validation_green',
  'review_green_pre_pr',
  'review_handoff_prep',
  'review_handoff_ready',
  'validation_green_before_review'
]);

export const TASK_PACKET_PATH_FAMILIES = new Set([
  '.agent/task',
  'tasks/specs',
  'tasks/tasks-*',
  'docs/PRD-*',
  'docs/PRD_*',
  'docs/TECH_SPEC-*',
  'docs/TECH_SPEC_*',
  'docs/ACTION_PLAN-*',
  'docs/design/PRD-*',
  'tasks/*-prd-*',
  'docs/findings'
]);

export function normalizeDocPath(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim().replace(/\\/g, '/');
  if (!trimmed) {
    return '';
  }

  const withoutDotPrefix = trimmed.replace(/^\.\//, '');
  const normalized = path.posix.normalize(withoutDotPrefix);
  return normalized === '.' ? '' : normalized.replace(/^\.\//, '');
}

export function classifyTaskPacketPathFamily(docPath) {
  const normalizedPath = normalizeDocPath(docPath);
  if (normalizedPath.startsWith('.agent/task/')) {
    return '.agent/task';
  }
  if (normalizedPath.startsWith('tasks/specs/')) {
    return 'tasks/specs';
  }
  if (normalizedPath.startsWith('tasks/tasks-')) {
    return 'tasks/tasks-*';
  }
  if (/^tasks\/[^/]+-prd-[^/]+\.md$/u.test(normalizedPath)) {
    return 'tasks/*-prd-*';
  }
  if (normalizedPath.startsWith('docs/PRD-')) {
    return 'docs/PRD-*';
  }
  if (normalizedPath.startsWith('docs/PRD_')) {
    return 'docs/PRD_*';
  }
  if (normalizedPath.startsWith('docs/TECH_SPEC-')) {
    return 'docs/TECH_SPEC-*';
  }
  if (normalizedPath.startsWith('docs/TECH_SPEC_')) {
    return 'docs/TECH_SPEC_*';
  }
  if (normalizedPath.startsWith('docs/ACTION_PLAN-')) {
    return 'docs/ACTION_PLAN-*';
  }
  if (normalizedPath.startsWith('docs/design/PRD-')) {
    return 'docs/design/PRD-*';
  }
  if (normalizedPath.startsWith('docs/findings/')) {
    return 'docs/findings';
  }
  const parts = normalizedPath.split('/').filter(Boolean);
  return parts.length <= 1 ? normalizedPath : `${parts[0]}/${parts[1]}`;
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTaskPacketLifecyclePath(docPath) {
  return TASK_PACKET_PATH_FAMILIES.has(classifyTaskPacketPathFamily(docPath));
}

const OPEN_CHECKLIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+.+$/gmu;
const MARKDOWN_LIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+/u;

function leadingIndentWidth(line) {
  let width = 0;
  for (const char of line) {
    if (char === ' ') {
      width += 1;
      continue;
    }
    if (char === '\t') {
      width += 4;
      continue;
    }
    break;
  }
  return width;
}

function stripMarkdownCodeBlocks(content) {
  const keptLines = [];
  let fence = null;
  let indentedCodeBlock = false;
  let indentedCodeBlockMinimumWidth = 0;
  let previousWasBlank = true;
  let listContextIndentWidth = null;

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(`{3,}|~{3,})/u);
    if (match) {
      const marker = match[1];
      const char = marker[0];
      if (!fence) {
        const markerIndentWidth = leadingIndentWidth(line);
        const preservesListContext =
          listContextIndentWidth !== null && markerIndentWidth >= listContextIndentWidth + 4;
        fence = { char, length: marker.length, preservesListContext };
        if (!preservesListContext) {
          listContextIndentWidth = null;
        }
        continue;
      }
      if (char === fence.char && marker.length >= fence.length) {
        const preservesListContext = fence.preservesListContext;
        fence = null;
        if (!preservesListContext) {
          listContextIndentWidth = null;
        }
        continue;
      }
    }
    if (!fence) {
      const isBlank = line.trim().length === 0;
      const isIndented = /^(?: {4,}|\t)/u.test(line);
      const indentWidth = isIndented ? leadingIndentWidth(line) : 0;
      const hasListContext = listContextIndentWidth !== null;
      const isListContainedCodeBlock =
        previousWasBlank && hasListContext && indentWidth >= listContextIndentWidth + 8;
      const continuesIndentedCodeBlock = indentedCodeBlock && indentWidth >= indentedCodeBlockMinimumWidth;
      const startsIndentedCodeBlock = previousWasBlank && (!hasListContext || isListContainedCodeBlock);

      if (isIndented && (continuesIndentedCodeBlock || startsIndentedCodeBlock)) {
        if (!continuesIndentedCodeBlock) {
          indentedCodeBlockMinimumWidth =
            isListContainedCodeBlock && listContextIndentWidth !== null ? listContextIndentWidth + 8 : 4;
        }
        indentedCodeBlock = true;
        continue;
      }

      if (isBlank) {
        if (indentedCodeBlock) {
          previousWasBlank = true;
          continue;
        }
        keptLines.push(line);
        previousWasBlank = true;
        continue;
      }

      indentedCodeBlock = false;
      indentedCodeBlockMinimumWidth = 0;
      keptLines.push(line);
      previousWasBlank = false;
      if (MARKDOWN_LIST_ITEM_PATTERN.test(line)) {
        listContextIndentWidth = leadingIndentWidth(line);
      } else if (!(isIndented && hasListContext && indentWidth >= listContextIndentWidth + 4)) {
        listContextIndentWidth = null;
      }
    }
  }
  return keptLines.join('\n');
}

export function extractOpenChecklistItems(content) {
  if (typeof content !== 'string' || content.length === 0) {
    return [];
  }
  const checklistContent = stripMarkdownCodeBlocks(content);
  return Array.from(checklistContent.matchAll(OPEN_CHECKLIST_ITEM_PATTERN), (match) => match[0].trim());
}

function collectOpenChecklistObligations(paths, contentByPath) {
  const obligations = [];
  if (!contentByPath || typeof contentByPath.get !== 'function') {
    return obligations;
  }
  for (const docPath of paths) {
    const content = contentByPath.get(docPath);
    const open_items = extractOpenChecklistItems(content);
    if (open_items.length > 0) {
      obligations.push({
        path: docPath,
        open_items
      });
    }
  }
  return obligations;
}

export function isTerminalTaskStatus(status) {
  return typeof status === 'string' && TERMINAL_TASK_STATUSES.has(status.trim().toLowerCase());
}

export function isActiveTaskIndexReviewStatus(status) {
  return typeof status === 'string' && ACTIVE_TASK_INDEX_REVIEW_STATUSES.has(status.trim().toLowerCase());
}

export function isTerminalTaskItem(item) {
  return Boolean(item && typeof item === 'object' && isTerminalTaskStatus(item.status));
}

export function collectTaskIndexItems(taskIndex) {
  if (!taskIndex || typeof taskIndex !== 'object') {
    return [];
  }
  const items = [];
  if (Array.isArray(taskIndex.items)) {
    items.push(...taskIndex.items);
  }
  if (Array.isArray(taskIndex.tasks)) {
    items.push(...taskIndex.tasks);
  }
  return items;
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function addPath(paths, value) {
  const normalized = normalizeDocPath(value);
  if (normalized) {
    paths.add(normalized);
  }
}

function addPathValue(paths, value) {
  if (!value) {
    return;
  }
  if (typeof value === 'string') {
    addPath(paths, value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      addPathValue(paths, entry);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const entry of Object.values(value)) {
      addPathValue(paths, entry);
    }
  }
}

function slugOnlyTaskKey(taskKey, item) {
  if (typeof taskKey !== 'string') {
    return null;
  }
  const id = normalizeOptionalString(item?.id);
  if (!id || !/^\d+$/u.test(id) || !taskKey.startsWith(`${id}-`)) {
    return null;
  }
  const alias = taskKey.slice(id.length + 1);
  return /^[A-Za-z0-9][A-Za-z0-9-]*$/u.test(alias) ? alias : null;
}

function numberPrefixedTaskKeyAlias(taskKey, item) {
  if (typeof taskKey !== 'string') {
    return null;
  }
  const match = taskKey.match(/^(\d{4})-([A-Za-z0-9][A-Za-z0-9-]*)$/u);
  if (!match) {
    return null;
  }
  const taskNumber = match[1];
  const itemId = normalizeOptionalString(item?.id);
  const datePrefixedId = itemId?.match(/^\d{8}-(\d{4})-[A-Za-z0-9-]+$/u);
  if (itemId !== taskNumber && datePrefixedId?.[1] !== taskNumber) {
    return null;
  }
  return match[2];
}

function addTaskPacketPathAliases(paths, taskKey) {
  addPath(paths, `tasks/tasks-${taskKey}.md`);
  addPath(paths, `tasks/specs/${taskKey}.md`);
  addPath(paths, `.agent/task/${taskKey}.md`);
  addPath(paths, `docs/PRD-${taskKey}.md`);
  addPath(paths, `docs/TECH_SPEC-${taskKey}.md`);
  addPath(paths, `docs/ACTION_PLAN-${taskKey}.md`);
}

export function collectIndexedTaskPacketPaths(item, options = {}) {
  const paths = new Set();
  if (!item || typeof item !== 'object') {
    return [];
  }
  const includeSlugAliases = options.includeSlugAliases !== false;

  addPath(paths, item.path);
  addPath(paths, item.relates_to);

  if (item.paths && typeof item.paths === 'object') {
    const pathRecord = item.paths;
    for (const key of ['docs', 'task', 'spec', 'agent_task', 'prd', 'action_plan', 'findings']) {
      addPathValue(paths, pathRecord[key]);
    }
  }

  const taskKey = normalizeTaskKey(item);
  if (taskKey) {
    addTaskPacketPathAliases(paths, taskKey);
    const slugAlias = includeSlugAliases ? slugOnlyTaskKey(taskKey, item) : null;
    if (slugAlias) {
      addTaskPacketPathAliases(paths, slugAlias);
    }
    const numericAlias = includeSlugAliases ? numberPrefixedTaskKeyAlias(taskKey, item) : null;
    if (numericAlias) {
      addTaskPacketPathAliases(paths, numericAlias);
    }
  }

  return [...paths].filter(isTaskPacketLifecyclePath).sort();
}

function readSourceIssue(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const sourceIssue = item.source_issue;
  if (sourceIssue && typeof sourceIssue === 'object') {
    return {
      id: normalizeOptionalString(sourceIssue.id),
      identifier: normalizeOptionalString(sourceIssue.identifier),
      url: normalizeOptionalString(sourceIssue.url)
    };
  }
  return {
    id: normalizeOptionalString(item.issue_id ?? item.linear_issue_id),
    identifier: normalizeOptionalString(item.issue_identifier ?? item.linear_identifier),
    url: normalizeOptionalString(item.issue_url ?? item.linear_url)
  };
}

function normalizeLastReviewDate(item) {
  const rawLastReview = normalizeOptionalString(item?.last_review);
  const reviewDate = rawLastReview ? parseIsoDateOrTimestamp(rawLastReview) : null;
  return reviewDate ? formatDate(reviewDate) : null;
}

function buildTaskIndexEntry(item, taskKey) {
  const status = normalizeOptionalString(item.status);
  return {
    task_id: normalizeOptionalString(item.id) ?? taskKey,
    task_key: taskKey,
    title: normalizeOptionalString(item.title),
    status,
    review_authoritative: isActiveTaskIndexReviewStatus(status),
    last_review: normalizeLastReviewDate(item),
    source_issue: readSourceIssue(item)
  };
}

function shouldReplaceTaskIndexEntry(existing, candidate) {
  if (!existing) {
    return true;
  }
  const existingReviewDate = existing.last_review ? parseIsoDateOrTimestamp(existing.last_review) : null;
  const candidateReviewDate = candidate.last_review ? parseIsoDateOrTimestamp(candidate.last_review) : null;
  if (!existingReviewDate) {
    return Boolean(candidateReviewDate);
  }
  if (!candidateReviewDate) {
    return false;
  }
  return candidateReviewDate > existingReviewDate;
}

export async function readTaskPacketLifecycleContentMap(repoRoot, items) {
  const contentByPath = new Map();
  const resolvedRepoRoot = path.resolve(repoRoot);
  const sourceItems = Array.isArray(items) ? items : [];
  const indexedPaths = new Set();
  for (const item of sourceItems) {
    for (const docPath of collectIndexedTaskPacketPaths(item)) {
      indexedPaths.add(docPath);
    }
  }
  await Promise.all(
    [...indexedPaths].map(async (docPath) => {
      const resolvedPath = path.resolve(resolvedRepoRoot, docPath);
      const relativeToRoot = path.relative(resolvedRepoRoot, resolvedPath);
      if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        return;
      }
      try {
        contentByPath.set(docPath, await readFile(resolvedPath, 'utf8'));
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
        // Missing linked packet paths are handled by the command-level registry checks.
      }
    })
  );
  return contentByPath;
}

export async function buildTaskPacketLifecycleIndexForRepo(repoRoot, items) {
  const contentByPath = await readTaskPacketLifecycleContentMap(repoRoot, items);
  return buildTaskPacketLifecycleIndex(items, { contentByPath });
}

export function buildTaskPacketLifecycleIndex(items, options = {}) {
  const byPath = new Map();
  const terminalItems = [];
  const taskItemsByPath = new Map();
  const activeTerminalSourceItemsByPath = new Map();
  const sourceItems = Array.isArray(items) ? items : [];
  const indexedItems = [];
  const primaryOwnersByPath = new Map();
  const aliasOwnersByPath = new Map();
  const contentByPath = options.contentByPath instanceof Map ? options.contentByPath : new Map();

  const addOwner = (ownersByPath, docPath, ownerKey) => {
    if (!ownersByPath.has(docPath)) {
      ownersByPath.set(docPath, new Set());
    }
    ownersByPath.get(docPath).add(ownerKey);
  };

  for (const item of sourceItems) {
    const taskKey = normalizeTaskKey(item);
    if (!taskKey) {
      continue;
    }

    const taskIndexEntry = buildTaskIndexEntry(item, taskKey);
    const ownerKey = `${taskIndexEntry.task_id ?? ''}\0${taskKey}`;
    const primaryPaths = collectIndexedTaskPacketPaths(item, { includeSlugAliases: false });
    const primaryPathSet = new Set(primaryPaths);
    const allPaths = collectIndexedTaskPacketPaths(item);
    const aliasPaths = allPaths.filter((docPath) => !primaryPathSet.has(docPath));

    indexedItems.push({ item, taskKey, taskIndexEntry, ownerKey, primaryPaths, aliasPaths });
    for (const docPath of primaryPaths) {
      addOwner(primaryOwnersByPath, docPath, ownerKey);
    }
    for (const docPath of aliasPaths) {
      addOwner(aliasOwnersByPath, docPath, ownerKey);
    }
  }

  function canUseAliasPathForTaskIndex(docPath, ownerKey) {
    const aliasOwners = aliasOwnersByPath.get(docPath);
    if (!aliasOwners || aliasOwners.size !== 1 || !aliasOwners.has(ownerKey)) {
      return false;
    }
    const primaryOwners = primaryOwnersByPath.get(docPath);
    return !primaryOwners || (primaryOwners.size === 1 && primaryOwners.has(ownerKey));
  }

  function canUsePrimaryPathForTaskIndex(docPath, ownerKey) {
    const primaryOwners = primaryOwnersByPath.get(docPath);
    if (!primaryOwners || primaryOwners.size !== 1 || !primaryOwners.has(ownerKey)) {
      return false;
    }
    const aliasOwners = aliasOwnersByPath.get(docPath);
    return !aliasOwners || (aliasOwners.size === 1 && aliasOwners.has(ownerKey));
  }

  for (const { item, taskKey, taskIndexEntry, ownerKey, primaryPaths, aliasPaths } of indexedItems) {
    if (taskIndexEntry.review_authoritative) {
      for (const docPath of [
        ...primaryPaths.filter((primaryPath) => canUsePrimaryPathForTaskIndex(primaryPath, ownerKey)),
        ...aliasPaths.filter((aliasPath) => canUseAliasPathForTaskIndex(aliasPath, ownerKey))
      ]) {
        const entry = {
          ...taskIndexEntry,
          path: docPath,
          path_family: classifyTaskPacketPathFamily(docPath)
        };
        if (shouldReplaceTaskIndexEntry(taskItemsByPath.get(docPath), entry)) {
          taskItemsByPath.set(docPath, entry);
        }
      }
    }

    if (!isTerminalTaskItem(item)) {
      continue;
    }

    const completedAt = normalizeOptionalString(item.completed_at);
    const completedDate = completedAt ? parseIsoDateOrTimestamp(completedAt) : null;
    const terminalPaths = [
      ...primaryPaths.filter((primaryPath) => canUsePrimaryPathForTaskIndex(primaryPath, ownerKey)),
      ...aliasPaths.filter((aliasPath) => canUseAliasPathForTaskIndex(aliasPath, ownerKey))
    ];
    const localOpenChecklistObligations = collectOpenChecklistObligations(terminalPaths, contentByPath);
    const taskLifecycle = {
      task_id: normalizeOptionalString(item.id) ?? taskKey,
      task_key: taskKey,
      title: normalizeOptionalString(item.title),
      status: normalizeOptionalString(item.status),
      completed_at: completedDate ? formatDate(completedDate) : null,
      source_issue: readSourceIssue(item),
      local_open_checklist_obligations: localOpenChecklistObligations
    };
    terminalItems.push(taskLifecycle);

    if (localOpenChecklistObligations.length > 0) {
      for (const docPath of terminalPaths) {
        activeTerminalSourceItemsByPath.set(docPath, {
          ...taskLifecycle,
          path: docPath,
          path_family: classifyTaskPacketPathFamily(docPath),
          lifecycle_state: ACTIVE_LIFECYCLE_STATUS,
          terminal_source_lifecycle_state: TERMINAL_PENDING_ARCHIVE_STATUS,
          recommended_action: 'resolve_local_checklist_obligations_before_archive'
        });
      }
      continue;
    }

    for (const docPath of terminalPaths) {
      byPath.set(docPath, {
        ...taskLifecycle,
        path: docPath,
        path_family: classifyTaskPacketPathFamily(docPath),
        lifecycle_state: TERMINAL_PENDING_ARCHIVE_STATUS,
        recommended_action: 'archive_or_reclassify_terminal_packet'
      });
    }
  }

  return {
    byPath,
    terminalItems,
    taskItemsByPath,
    activeTerminalSourceItemsByPath
  };
}
