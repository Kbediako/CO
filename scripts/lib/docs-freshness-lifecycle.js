import path from 'node:path';
import { normalizeTaskKey, parseIsoDate } from './docs-helpers.js';

export const TERMINAL_PENDING_ARCHIVE_STATUS = 'terminal_pending_archive';
export const PRESERVED_HISTORICAL_STUB_STATUS = 'preserved_historical_stub';

export const TERMINAL_TASK_STATUSES = new Set([
  'succeeded',
  'completed',
  'done',
  'canceled',
  'cancelled'
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

export function isTaskPacketLifecyclePath(docPath) {
  return TASK_PACKET_PATH_FAMILIES.has(classifyTaskPacketPathFamily(docPath));
}

export function isTerminalTaskStatus(status) {
  return typeof status === 'string' && TERMINAL_TASK_STATUSES.has(status.trim().toLowerCase());
}

export function isTerminalTaskItem(item) {
  return Boolean(item && typeof item === 'object' && isTerminalTaskStatus(item.status));
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

export function collectIndexedTaskPacketPaths(item) {
  const paths = new Set();
  if (!item || typeof item !== 'object') {
    return [];
  }

  addPath(paths, item.path);
  addPath(paths, item.relates_to);

  if (item.paths && typeof item.paths === 'object') {
    const pathRecord = item.paths;
    for (const key of ['docs', 'task', 'spec', 'agent_task', 'prd', 'action_plan', 'findings']) {
      addPath(paths, pathRecord[key]);
    }
  }

  const taskKey = normalizeTaskKey(item);
  if (taskKey) {
    addPath(paths, `tasks/tasks-${taskKey}.md`);
    addPath(paths, `tasks/specs/${taskKey}.md`);
    addPath(paths, `.agent/task/${taskKey}.md`);
    addPath(paths, `docs/PRD-${taskKey}.md`);
    addPath(paths, `docs/TECH_SPEC-${taskKey}.md`);
    addPath(paths, `docs/ACTION_PLAN-${taskKey}.md`);
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

export function buildTaskPacketLifecycleIndex(items) {
  const byPath = new Map();
  const terminalItems = [];
  const sourceItems = Array.isArray(items) ? items : [];

  for (const item of sourceItems) {
    if (!isTerminalTaskItem(item)) {
      continue;
    }
    const taskKey = normalizeTaskKey(item);
    if (!taskKey) {
      continue;
    }

    const completedAt = normalizeOptionalString(item.completed_at);
    const completedDate = completedAt ? parseIsoDate(completedAt) : null;
    const taskLifecycle = {
      task_id: normalizeOptionalString(item.id) ?? taskKey,
      task_key: taskKey,
      title: normalizeOptionalString(item.title),
      status: normalizeOptionalString(item.status),
      completed_at: completedDate ? completedAt : null,
      source_issue: readSourceIssue(item)
    };
    terminalItems.push(taskLifecycle);

    for (const docPath of collectIndexedTaskPacketPaths(item)) {
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
    terminalItems
  };
}
