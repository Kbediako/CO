import { access, readdir } from 'node:fs/promises';
import path from 'node:path';

const DOC_ROOTS = ['.agent', '.ai-dev-tasks', 'docs', 'tasks'];
const DOC_ROOT_FILES = ['README.md', 'AGENTS.md'];
const EXCLUDED_DIR_NAMES = new Set(['.runs', 'out', 'archives', 'node_modules', 'dist']);

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
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
    if (await exists(abs)) {
      results.push(toPosixPath(file));
    }
  }

  for (const dir of DOC_ROOTS) {
    const abs = path.join(repoRoot, dir);
    if (await exists(abs)) {
      results.push(...(await collectMarkdownFiles(repoRoot, dir)));
    }
  }

  results.sort();
  return results;
}

export function normalizeTaskKey(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
  if (slug && id && slug.startsWith(`${id}-`)) {
    return slug;
  }
  if (id && slug) {
    return `${id}-${slug}`;
  }
  if (slug) {
    return slug;
  }
  if (id) {
    return id;
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
  if (typeof raw !== 'string') {
    return null;
  }
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, yearStr, monthStr, dayStr] = match;
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
