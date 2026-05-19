import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathExists, toPosixPath } from './docs-helpers.js';

export const DEFAULT_DOCS_CATALOG_PATH = 'docs/docs-catalog.json';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCatalogPath(value) {
  const normalized = normalizeString(value).replace(/\\/g, '/');
  if (!normalized) {
    return '';
  }
  const withoutDotPrefix = normalized.replace(/^\.\//, '');
  const collapsed = path.posix.normalize(withoutDotPrefix);
  return collapsed === '.' ? '' : collapsed.replace(/^\.\//, '');
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

  const pathValue = normalizeCatalogPath(raw.path);
  const glob = normalizeCatalogPath(raw.glob);
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

export function normalizeDocsCatalog(raw, relativePath = DEFAULT_DOCS_CATALOG_PATH, absolutePath = '') {
  return {
    version: Number.isFinite(raw?.version) ? Number(raw.version) : 1,
    relative_path: toPosixPath(relativePath),
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

export async function loadDocsCatalog(repoRoot, relativePath = DEFAULT_DOCS_CATALOG_PATH) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const raw = JSON.parse(await readFile(absolutePath, 'utf8'));

  return normalizeDocsCatalog(raw, path.relative(repoRoot, absolutePath), absolutePath);
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
  const normalizedPath = normalizeCatalogPath(docPath);
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
        terminal_lifecycle_entries: 0,
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
    } else if (item.metric === 'terminal_lifecycle_entries') {
      bucket.terminal_lifecycle_entries += 1;
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

function normalizeMatrixRequirement(raw) {
  if (!isObject(raw)) {
    return {
      label: 'matrix requirement',
      contains: ''
    };
  }
  const contains = normalizeString(raw.contains);
  return {
    label: normalizeString(raw.label) || contains || 'matrix requirement',
    contains
  };
}

function normalizeMatrixSurface(raw) {
  const surface = isObject(raw) ? raw : {};
  return {
    path: normalizeCatalogPath(surface.path),
    kind: normalizeString(surface.kind),
    status: normalizeString(surface.status) || 'current',
    requirements: Array.isArray(surface.requirements)
      ? surface.requirements.map((requirement) => normalizeMatrixRequirement(requirement))
      : []
  };
}

function normalizeHistoricalReleaseEvidence(raw) {
  if (!isObject(raw)) {
    return null;
  }
  const pathValue = normalizeCatalogPath(raw.path);
  if (!pathValue) {
    return null;
  }
  return {
    path: pathValue,
    status: normalizeString(raw.status) || 'historical',
    version: normalizeString(raw.version) || null,
    title: normalizeString(raw.title) || null
  };
}

function normalizeMatrixCurrent(raw) {
  const current = isObject(raw) ? raw : {};
  return {
    codex_cli_version: normalizeString(current.codex_cli_version) || null,
    latest_audited_candidate_cli_version: normalizeString(current.latest_audited_candidate_cli_version) || null,
    marketplace_smoke_cli_version: normalizeString(current.marketplace_smoke_cli_version) || null,
    cloud_canary_cli_version: normalizeString(current.cloud_canary_cli_version) || null,
    model: normalizeString(current.model) || null,
    default_runtime: normalizeString(current.default_runtime) || null,
    explorer_fast_model: normalizeString(current.explorer_fast_model) || null,
    unsupported_review_model: normalizeString(current.unsupported_review_model) || null
  };
}

function deriveMatrixCliCompatibilityVersions(current) {
  return [
    current.latest_audited_candidate_cli_version,
    current.marketplace_smoke_cli_version,
    current.cloud_canary_cli_version
  ]
    .filter((version) => typeof version === 'string' && version.length > 0 && version !== current.codex_cli_version)
    .filter((version, index, versions) => versions.indexOf(version) === index)
    .sort();
}

export async function loadCodexPostureMatrix(repoRoot, relativePath) {
  const matrixPath = normalizeCatalogPath(relativePath);
  if (!matrixPath) {
    throw new Error('Missing Codex posture matrix path.');
  }
  const resolvedRepoRoot = path.resolve(repoRoot);
  const absolutePath = path.resolve(resolvedRepoRoot, matrixPath);
  const relativeToRepoNative = path.relative(resolvedRepoRoot, absolutePath);
  const relativeToRepo = toPosixPath(relativeToRepoNative);
  if (relativeToRepo === '..' || relativeToRepo.startsWith('../') || path.isAbsolute(relativeToRepoNative)) {
    throw new Error(`Invalid Codex posture matrix path outside repository: ${matrixPath}`);
  }
  const resolvedRepoRootReal = await realpath(resolvedRepoRoot);
  const absolutePathReal = await realpath(absolutePath);
  const realRelativeToRepoNative = path.relative(resolvedRepoRootReal, absolutePathReal);
  const realRelativeToRepo = toPosixPath(realRelativeToRepoNative);
  if (realRelativeToRepo === '..' || realRelativeToRepo.startsWith('../') || path.isAbsolute(realRelativeToRepoNative)) {
    throw new Error(`Invalid Codex posture matrix path resolves outside repository: ${matrixPath}`);
  }
  const raw = JSON.parse(await readFile(absolutePathReal, 'utf8'));

  return {
    version: Number.isFinite(raw?.version) ? Number(raw.version) : 1,
    source_path: relativeToRepo,
    absolute_path: absolutePath,
    current: normalizeMatrixCurrent(raw?.current),
    surfaces: Array.isArray(raw?.surfaces) ? raw.surfaces.map((surface) => normalizeMatrixSurface(surface)) : [],
    historical_release_evidence: Array.isArray(raw?.historical_release_evidence)
      ? raw.historical_release_evidence
          .map((evidence) => normalizeHistoricalReleaseEvidence(evidence))
          .filter(Boolean)
      : []
  };
}

export async function readCurrentCodexPosture(repoRoot, policy = {}) {
  const sourcePath = normalizeString(policy.matrix_path) || normalizeString(policy.source_path);
  if (!sourcePath) {
    return {
      source_path: '',
      cli_version: null,
      cli_compatibility_versions: [],
      model: null,
      default_runtime: null,
      explorer_fast_model: null,
      unsupported_review_model: null,
      latest_audited_candidate_cli_version: null,
      marketplace_smoke_cli_version: null,
      cloud_canary_cli_version: null
    };
  }

  if (sourcePath.endsWith('.json')) {
    const matrix = await loadCodexPostureMatrix(repoRoot, sourcePath);
    return {
      source_path: matrix.source_path,
      cli_version: matrix.current.codex_cli_version,
      cli_compatibility_versions: deriveMatrixCliCompatibilityVersions(matrix.current),
      model: matrix.current.model,
      default_runtime: matrix.current.default_runtime,
      explorer_fast_model: matrix.current.explorer_fast_model,
      unsupported_review_model: matrix.current.unsupported_review_model,
      latest_audited_candidate_cli_version: matrix.current.latest_audited_candidate_cli_version,
      marketplace_smoke_cli_version: matrix.current.marketplace_smoke_cli_version,
      cloud_canary_cli_version: matrix.current.cloud_canary_cli_version
    };
  }

  const absolutePath = path.resolve(repoRoot, sourcePath);
  const content = await readFile(absolutePath, 'utf8');
  const unsupportedReviewModel =
    /do not target delegated(?:\/review| or review)? surfaces at `([^`]+)`/i.exec(content)?.[1] ??
    /delegated subagent and review surfaces on [^;\n]*; `([^`]+)` is currently unsupported there/i.exec(content)?.[1] ??
    /delegated(?: subagent)?(?: and|\/) review surfaces on [^\n]* validates `([^`]+)`/i.exec(content)?.[1] ??
    null;
  const cliVersion =
    /Codex CLI\s+\(?`?([0-9]+\.[0-9]+\.[0-9]+)`?\)?/.exec(content)?.[1] ?? null;
  return {
    source_path: sourcePath,
    cli_version: cliVersion,
    cli_compatibility_versions: extractAllowedCliCompatibilityVersions(content, cliVersion),
    model: /Current model posture(?: is|:)\s*`([^`]+)`/i.exec(content)?.[1] ?? null,
    default_runtime:
      /Local ([A-Za-z0-9_-]+) remains the expected default runtime path/.exec(content)?.[1] ?? null,
    explorer_fast_model: /explorer_fast[^\n]*`(gpt-[^`]+)`/i.exec(content)?.[1] ?? null,
    unsupported_review_model: unsupportedReviewModel,
    latest_audited_candidate_cli_version: /Latest audited stable candidate is Codex CLI\s+\(?`?([0-9]+\.[0-9]+\.[0-9]+)`?\)?/i.exec(content)?.[1] ?? null,
    marketplace_smoke_cli_version: /downstream-smoke workflows[^\n]*`@openai\/codex@([0-9]+\.[0-9]+\.[0-9]+)`/i.exec(content)?.[1] ?? null,
    cloud_canary_cli_version: /`cloud-canary` pins `@openai\/codex@([0-9]+\.[0-9]+\.[0-9]+)`/i.exec(content)?.[1] ?? null
  };
}

function extractAllowedCliCompatibilityVersions(content, currentCliVersion) {
  const versions = new Set();
  const scanContent = extractCurrentPostureContent(content);
  for (const line of scanContent.split(/\r?\n/)) {
    if (
      !/compatibility/i.test(line) ||
      !/(separately\s+rebaselined|downstream-smoke|release-facing)/i.test(line)
    ) {
      continue;
    }

    for (const version of extractCodexCliVersionMentions(line)) {
      if (version !== currentCliVersion) {
        versions.add(version);
      }
    }
  }

  return [...versions].sort();
}

function extractCurrentPostureContent(content) {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => /^##\s+Current Posture\b/i.test(line.trim()));
  if (startIndex === -1) {
    return '';
  }

  const sectionLines = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (/^##\s+/.test(line.trim())) {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines.join('\n');
}

export function extractCodexCliVersionMentions(content) {
  const results = new Set();
  const patterns = [
    /Codex CLI\s+\(?`?([0-9]+\.[0-9]+\.[0-9]+)`?\)?/gi,
    /codex-cli\s+\(?`?([0-9]+\.[0-9]+\.[0-9]+)`?\)?/gi
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

export function extractCodexModelMentions(content) {
  const results = new Set();
  for (const match of content.matchAll(/\bgpt-[A-Za-z0-9.-]+\b/g)) {
    if (match[0]) {
      results.add(match[0]);
    }
  }
  return [...results].sort();
}

function isModelPostureLine(line) {
  return (
    isPrimaryModelPostureLine(line) ||
    isSecondaryUnsupportedReviewReferenceLine(line) ||
    /explorer_fast/i.test(line)
  );
}

function isPrimaryModelPostureLine(line) {
  return (
    /current model posture/i.test(line) ||
    /keep delegated subagent and review surfaces on/i.test(line) ||
    /keep delegated or review surfaces on/i.test(line) ||
    /do not target delegated(?:\/review| or review)? surfaces at/i.test(line)
  );
}

function isSecondaryUnsupportedReviewReferenceLine(line) {
  return /for chatgpt auth,\s*this means/i.test(line);
}

export function extractModelPostureLines(content) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => isModelPostureLine(line));
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
    return false;
  }

  const runtimePattern = new RegExp(`\\b${escapeRegExp(expectedRuntime)}\\b`, 'i');
  return relevantLines.every((line) => runtimePattern.test(line));
}

export function hasExpectedModelPostureLine(content, expectedModel) {
  if (!normalizeString(expectedModel)) {
    return true;
  }

  const relevantLines = extractModelPostureLines(content).filter((line) => isPrimaryModelPostureLine(line));
  if (relevantLines.length === 0) {
    return false;
  }

  const modelPattern = new RegExp(
    `(^|[^A-Za-z0-9.-])${escapeRegExp(expectedModel)}($|[^A-Za-z0-9.-])`,
    'i'
  );
  return relevantLines.every((line) => modelPattern.test(line));
}

export function countDocumentLines(content) {
  const lines = content.split('\n');
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
}

export function countHeadingLines(content, headingPrefix = '## ') {
  return content.split('\n').filter((line) => line.startsWith(headingPrefix)).length;
}
