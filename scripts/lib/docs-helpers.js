import { access, readdir } from 'node:fs/promises';
import path from 'node:path';

const DOC_ROOTS = ['.agent', '.ai-dev-tasks', 'docs', 'tasks'];
const DOC_ROOT_FILES = ['README.md', 'AGENTS.md'];
const EXCLUDED_DIR_NAMES = new Set(['.runs', 'out', 'archives', 'node_modules', 'dist']);

export async function pathExists(target, options = {}) {
  const { allowMissingOnly = false } = options;
  try {
    await access(target);
    return true;
  } catch (error) {
    if (allowMissingOnly && error?.code !== 'ENOENT') {
      throw error;
    }
    return false;
  }
}

export function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

export async function collectMarkdownFiles(repoRoot, relativeDir) {
  const absDir = path.join(repoRoot, relativeDir);
  const entries = await readdir(absDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const relPath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) {
        continue;
      }
      results.push(...(await collectMarkdownFiles(repoRoot, relPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(toPosixPath(relPath));
    }
  }

  return results;
}

export async function collectDocFiles(repoRoot) {
  const results = [];

  for (const file of DOC_ROOT_FILES) {
    const abs = path.join(repoRoot, file);
    if (await pathExists(abs)) {
      results.push(toPosixPath(file));
    }
  }

  for (const dir of DOC_ROOTS) {
    const abs = path.join(repoRoot, dir);
    if (await pathExists(abs)) {
      results.push(...(await collectMarkdownFiles(repoRoot, dir)));
    }
  }

  results.sort();
  return results;
}

function normalizeSlashPath(value) {
  return value.replace(/\\/g, '/');
}

const SAFE_TASK_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/u;

function normalizeTaskKeyCandidate(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = value.trim();
  if (!normalized || !SAFE_TASK_KEY_PATTERN.test(normalized)) {
    return '';
  }
  return normalized;
}

function extractTaskKeyFromPath(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = normalizeSlashPath(value.trim());
  if (!normalized) {
    return '';
  }

  const patterns = [
    /^tasks\/tasks-([A-Za-z0-9][A-Za-z0-9-]*)\.md$/u,
    /^tasks\/specs\/([A-Za-z0-9][A-Za-z0-9-]*)\.md$/u,
    /^\.agent\/task\/([A-Za-z0-9][A-Za-z0-9-]*)\.md$/u
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
}

export function normalizeTaskKey(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
  const taskPathCandidates = [
    item?.paths?.task,
    item?.relates_to,
    item?.path,
    item?.paths?.spec,
    item?.paths?.agent_task
  ];
  const taskPathSlug =
    taskPathCandidates
      .map((value) => extractTaskKeyFromPath(value))
      .find((value) => value.length > 0) ?? '';
  const datePrefixedIdMatch = id.match(/^\d{8}-([0-9]{4}-[A-Za-z0-9-]+)$/u);
  const datePrefixedSlug = normalizeTaskKeyCandidate(datePrefixedIdMatch?.[1] ?? '');
  if (slug && id && slug.startsWith(`${id}-`)) {
    return normalizeTaskKeyCandidate(slug) || null;
  }
  if (id && slug) {
    return normalizeTaskKeyCandidate(`${id}-${slug}`) || null;
  }
  if (slug) {
    return normalizeTaskKeyCandidate(slug) || null;
  }
  if (taskPathSlug) {
    return taskPathSlug;
  }
  if (datePrefixedSlug) {
    return datePrefixedSlug;
  }
  if (id) {
    return normalizeTaskKeyCandidate(id) || null;
  }
  return null;
}

export function parseDateString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return value;
}

export function parseIsoDate(raw) {
  const normalized = parseDateString(raw);
  if (!normalized) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = normalized.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function computeAgeInDays(from, to) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}
