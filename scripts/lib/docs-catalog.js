import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathExists, toPosixPath } from './docs-helpers.js';

export const DEFAULT_DOCS_CATALOG_PATH = 'docs/docs-catalog.json';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => normalizeString(item)).filter((item) => item.length > 0);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(glob) {
  let pattern = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    const afterNext = glob[index + 2];

    if (char === '*') {
      if (next === '*') {
        if (afterNext === '/') {
          pattern += '(?:.*/)?';
          index += 2;
        } else {
          pattern += '.*';
          index += 1;
        }
      } else {
        pattern += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      pattern += '.';
      continue;
    }

    pattern += escapeRegExp(char);
  }
  pattern += '$';
  return new RegExp(pattern);
}

function normalizeCatalogRule(raw, kind) {
  if (!isObject(raw)) {
    throw new Error(`Invalid docs catalog ${kind}: expected object.`);
  }

  const pathValue = normalizeString(raw.path);
  const glob = normalizeString(raw.glob);
  if (kind === 'entry' && !pathValue) {
    throw new Error('Invalid docs catalog entry: missing path.');
  }
  if (kind === 'pattern' && !glob) {
    throw new Error('Invalid docs catalog pattern: missing glob.');
  }

  const cadenceDays = Number.isFinite(raw.cadence_days) ? Number(raw.cadence_days) : null;
  const tier = Number.isFinite(raw.tier) ? Number(raw.tier) : null;

  return {
    path: pathValue,
    glob,
    glob_regex: glob ? globToRegExp(glob) : null,
    status: normalizeString(raw.status) || 'active',
    tier,
    doc_class: normalizeString(raw.doc_class),
    audience: normalizeString(raw.audience),
    source_of_truth: normalizeStringArray(raw.source_of_truth),
    owner: normalizeString(raw.owner),
    cadence_days: cadenceDays,
    update_triggers: normalizeStringArray(raw.update_triggers),
    truth_checks: normalizeStringArray(raw.truth_checks)
  };
}

function normalizeClassMap(raw) {
  if (!isObject(raw)) {
    return {};
  }

  const result = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isObject(value)) {
      continue;
    }
    result[key] = {
      label: normalizeString(value.label) || key,
      report_order: Number.isFinite(value.report_order) ? Number(value.report_order) : 999
    };
  }
  return result;
}

export async function loadDocsCatalog(repoRoot, relativePath = DEFAULT_DOCS_CATALOG_PATH) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const raw = JSON.parse(await readFile(absolutePath, 'utf8'));

  return {
    version: Number.isFinite(raw?.version) ? Number(raw.version) : 1,
    relative_path: toPosixPath(path.relative(repoRoot, absolutePath)),
    absolute_path: absolutePath,
    classes: normalizeClassMap(raw?.classes),
    policies: isObject(raw?.policies) ? raw.policies : {},
    entries: Array.isArray(raw?.entries)
      ? raw.entries.map((entry) => normalizeCatalogRule(entry, 'entry'))
      : [],
    patterns: Array.isArray(raw?.patterns)
      ? raw.patterns.map((entry) => normalizeCatalogRule(entry, 'pattern'))
      : []
  };
}

export async function maybeLoadDocsCatalog(repoRoot, relativePath = DEFAULT_DOCS_CATALOG_PATH) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  if (!(await pathExists(absolutePath))) {
    return null;
  }
  return loadDocsCatalog(repoRoot, relativePath);
}

export function getDocsCatalogClassMeta(catalog, docClass) {
  const meta = catalog?.classes?.[docClass];
  if (!meta) {
    return { label: docClass, report_order: 999 };
  }
  return {
    label: normalizeString(meta.label) || docClass,
    report_order: Number.isFinite(meta.report_order) ? Number(meta.report_order) : 999
  };
}

export function resolveDocsCatalogEntry(docPath, catalog) {
  const normalizedPath = normalizeString(docPath);
  if (!normalizedPath || !catalog) {
    return null;
  }

  for (const entry of catalog.entries) {
    if (entry.path === normalizedPath) {
      return { ...entry, matched_by: 'path' };
    }
  }

  for (const entry of catalog.patterns) {
    if (entry.glob_regex?.test(normalizedPath)) {
      return { ...entry, matched_by: 'glob' };
    }
  }

  return null;
}

export function summarizeDocsByClass(items, catalog) {
  const byClass = new Map();

  function ensure(docClass) {
    const key = docClass || 'uncatalogued';
    if (!byClass.has(key)) {
      const meta = getDocsCatalogClassMeta(catalog, key);
      byClass.set(key, {
        doc_class: key,
        label: meta.label,
        report_order: meta.report_order,
        docs_scanned: 0,
        registry_entries: 0,
        missing_in_registry: 0,
        missing_on_disk: 0,
        invalid_entries: 0,
        stale_entries: 0,
        uncatalogued_docs: 0
      });
    }
    return byClass.get(key);
  }

  for (const item of items) {
    const bucket = ensure(item.doc_class);
    if (item.metric === 'docs_scanned') {
      bucket.docs_scanned += 1;
    } else if (item.metric === 'registry_entries') {
      bucket.registry_entries += 1;
    } else if (item.metric === 'missing_in_registry') {
      bucket.missing_in_registry += 1;
    } else if (item.metric === 'missing_on_disk') {
      bucket.missing_on_disk += 1;
    } else if (item.metric === 'invalid_entries') {
      bucket.invalid_entries += 1;
    } else if (item.metric === 'stale_entries') {
      bucket.stale_entries += 1;
    } else if (item.metric === 'uncatalogued_docs') {
      bucket.uncatalogued_docs += 1;
    }
  }

  return [...byClass.values()].sort((left, right) => {
    if (left.report_order !== right.report_order) {
      return left.report_order - right.report_order;
    }
    return left.label.localeCompare(right.label);
  });
}

export async function listBundledSkillNames(repoRoot) {
  const skillsRoot = path.join(repoRoot, 'skills');
  if (!(await pathExists(skillsRoot))) {
    return [];
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillPath = path.join(skillsRoot, entry.name, 'SKILL.md');
    if (await pathExists(skillPath)) {
      results.push(entry.name);
    }
  }

  results.sort();
  return results;
}

export function extractBundledSkillNamesFromMarkdown(content, policy = {}) {
  const lines = content.split('\n');
  const sectionHeading = normalizeString(policy.section_heading) || '## Skills (bundled)';
  const listIntro = normalizeString(policy.list_intro) || 'Bundled skills';
  const sectionStart = lines.findIndex((line) => line.trim() === sectionHeading);
  if (sectionStart === -1) {
    return [];
  }

  let sectionEnd = lines.length;
  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    if (lines[index]?.startsWith('## ')) {
      sectionEnd = index;
      break;
    }
  }

  const sectionLines = lines.slice(sectionStart + 1, sectionEnd);
  const rosterIntroIndex = sectionLines.findIndex((line) => line.trim().startsWith(listIntro));
  if (rosterIntroIndex === -1) {
    return [];
  }

  const results = [];
  let started = false;
  for (const line of sectionLines.slice(rosterIntroIndex + 1)) {
    const trimmed = line.trim();
    const match = /^- `([^`]+)`/.exec(trimmed);
    if (match?.[1]) {
      results.push(match[1]);
      started = true;
      continue;
    }
    if (started && trimmed.length > 0) {
      break;
    }
  }

  return [...new Set(results)].sort();
}

export async function readCurrentCodexPosture(repoRoot, policy = {}) {
  const sourcePath = normalizeString(policy.source_path);
  if (!sourcePath) {
    return {
      source_path: '',
      cli_version: null,
      model: null,
      default_runtime: null
    };
  }

  const absolutePath = path.resolve(repoRoot, sourcePath);
  const content = await readFile(absolutePath, 'utf8');
  return {
    source_path: sourcePath,
    cli_version: /Codex CLI `([0-9]+\.[0-9]+\.[0-9]+)`/.exec(content)?.[1] ?? null,
    model: /Current model posture is `([^`]+)`/.exec(content)?.[1] ?? null,
    default_runtime:
      /Local ([A-Za-z0-9_-]+) remains the expected default runtime path/.exec(content)?.[1] ?? null
  };
}

export function extractCodexCliVersionMentions(content) {
  const results = new Set();
  const patterns = [
    /Codex CLI\s+`?([0-9]+\.[0-9]+\.[0-9]+)`?/gi,
    /codex-cli\s+`?([0-9]+\.[0-9]+\.[0-9]+)`?/gi
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) {
        results.add(match[1]);
      }
    }
  }

  return [...results].sort();
}

export function hasExpectedDefaultRuntimeLine(content, expectedRuntime) {
  if (!normalizeString(expectedRuntime)) {
    return true;
  }

  const relevantLines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /default runtime|expected default runtime path/i.test(line));
  if (relevantLines.length === 0) {
    return true;
  }

  const runtimePattern = new RegExp(`\\b${escapeRegExp(expectedRuntime)}\\b`, 'i');
  return relevantLines.every((line) => runtimePattern.test(line));
}

export function countDocumentLines(content) {
  const lines = content.split('\n');
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
}

export function countHeadingLines(content, headingPrefix = '## ') {
  return content.split('\n').filter((line) => line.startsWith(headingPrefix)).length;
}
