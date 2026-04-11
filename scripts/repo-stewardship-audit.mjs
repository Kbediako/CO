#!/usr/bin/env node

import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { hasFlag, parseArgs } from './lib/cli-args.js';
import { listTrackedFiles, pathExists, toPosixPath } from './lib/docs-helpers.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';

const DEFAULT_CATALOG_PATH = 'docs/repo-stewardship-catalog.json';
const ALLOWED_DECISIONS = new Set(['validate', 'update', 'delete', 'retain_with_rationale']);

function showUsage() {
  console.log(`Usage: node scripts/repo-stewardship-audit.mjs [options]

Audits every tracked file against the repo stewardship catalog and emits
machine-checkable stewardship decisions.

Options:
  --catalog <path>          Catalog JSON path (default: ${DEFAULT_CATALOG_PATH})
  --report <path>           Report JSON path (default: out/<task-id>/repo-stewardship.json)
  --summary-markdown <path> Optional markdown summary path
  --warn                    Emit structural failures but exit 0
  --check                   Alias for default behavior
  -h, --help                Show this help message`);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePath(value) {
  const normalized = typeof value === 'string' ? value : '';
  if (!normalized) {
    return '';
  }

  const withoutDotPrefix = normalized.replace(/^\.\//, '');
  const collapsed = path.posix.normalize(withoutDotPrefix);
  return collapsed === '.' ? '' : collapsed.replace(/^\.\//, '');
}

function normalizeBoundaryPath(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = normalizePath(value);
  if (normalized) {
    return normalized;
  }
  return value === '.' || value === './' ? '.' : '';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => normalizeString(item)).filter((item) => item.length > 0);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
      pattern += '[^/]';
      continue;
    }

    if (char === '{') {
      const closeIndex = glob.indexOf('}', index);
      if (closeIndex > index) {
        const inner = glob.slice(index + 1, closeIndex);
        const alternatives = inner
          .split(',')
          .map((part) => normalizeString(part))
          .filter((part) => part.length > 0)
          .map((part) => escapeRegExp(part));
        if (alternatives.length > 0) {
          pattern += `(?:${alternatives.join('|')})`;
          index = closeIndex;
          continue;
        }
      }
    }

    pattern += escapeRegExp(char);
  }
  pattern += '$';
  return new RegExp(pattern);
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

function normalizeChecks(raw) {
  if (!isObject(raw)) {
    return {
      required_scripts: [],
      required_text: [],
      requires_local_readme: false,
      readme_boundary: null
    };
  }

  return {
    required_scripts: normalizeStringArray(raw.required_scripts),
    required_text: normalizeStringArray(raw.required_text),
    requires_local_readme: raw.requires_local_readme === true,
    readme_boundary: Object.hasOwn(raw, 'readme_boundary')
      ? normalizeBoundaryPath(raw.readme_boundary)
      : null
  };
}

function normalizeRule(raw, kind) {
  if (!isObject(raw)) {
    throw new Error(`Invalid repo stewardship ${kind}: expected object.`);
  }

  const pathValue = normalizePath(raw.path);
  const glob = normalizePath(raw.glob);
  if (kind === 'entry' && !pathValue) {
    throw new Error('Invalid repo stewardship entry: missing path.');
  }
  if (kind === 'pattern' && !glob) {
    throw new Error('Invalid repo stewardship pattern: missing glob.');
  }

  const decision = normalizeString(raw.decision);
  if (!ALLOWED_DECISIONS.has(decision)) {
    throw new Error(`Invalid repo stewardship ${kind}: unsupported decision "${decision || '<missing>'}".`);
  }

  return {
    path: pathValue,
    glob,
    glob_regex: glob ? globToRegExp(glob) : null,
    surface_class: normalizeString(raw.surface_class) || 'uncatalogued',
    owner: normalizeString(raw.owner),
    decision,
    rationale: normalizeString(raw.rationale),
    checks: normalizeChecks(raw.checks)
  };
}

async function loadCatalog(repoRoot, relativePath = DEFAULT_CATALOG_PATH) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const raw = JSON.parse(await readFile(absolutePath, 'utf8'));
  return {
    version: Number.isFinite(raw?.version) ? Number(raw.version) : 1,
    relative_path: toPosixPath(path.relative(repoRoot, absolutePath)),
    absolute_path: absolutePath,
    classes: normalizeClassMap(raw?.classes),
    entries: Array.isArray(raw?.entries)
      ? raw.entries.map((entry) => normalizeRule(entry, 'entry'))
      : [],
    patterns: Array.isArray(raw?.patterns)
      ? raw.patterns.map((entry) => normalizeRule(entry, 'pattern'))
      : []
  };
}

function getClassMeta(catalog, surfaceClass) {
  const meta = catalog?.classes?.[surfaceClass];
  if (!meta) {
    return {
      label: surfaceClass || 'uncatalogued',
      report_order: 999
    };
  }
  return {
    label: normalizeString(meta.label) || surfaceClass,
    report_order: Number.isFinite(meta.report_order) ? Number(meta.report_order) : 999
  };
}

function resolveCatalogRule(filePath, catalog) {
  const normalizedPath = normalizePath(filePath);
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

async function readTextFile(repoRoot, relativePath, cache) {
  const normalizedPath = normalizePath(relativePath);
  if (cache.has(normalizedPath)) {
    return cache.get(normalizedPath);
  }
  const absolutePath = path.resolve(repoRoot, normalizedPath);
  let content = null;
  try {
    content = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  cache.set(normalizedPath, content);
  return content;
}

async function loadPackageScriptSet(repoRoot, cache) {
  if (cache.packageScripts !== undefined) {
    return cache.packageScripts;
  }
  try {
    const raw = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
    cache.packageScripts = new Set(Object.keys(raw?.scripts ?? {}));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    cache.packageScripts = null;
  }
  return cache.packageScripts;
}

async function trackedSurfaceExists(repoRoot, relativePath) {
  try {
    await lstat(path.resolve(repoRoot, relativePath));
    return true;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    return false;
  }
}

async function findNearestLocalReadme(repoRoot, filePath, boundary) {
  const normalizedFilePath = normalizePath(filePath);
  const normalizedBoundary = normalizeBoundaryPath(boundary);
  let currentDir = path.posix.dirname(normalizedFilePath);

  if (!currentDir) {
    return null;
  }

  while (currentDir) {
    if (
      normalizedBoundary &&
      normalizedBoundary !== '.' &&
      currentDir !== normalizedBoundary &&
      !currentDir.startsWith(`${normalizedBoundary}/`)
    ) {
      break;
    }

    const candidate = currentDir === '.' ? 'README.md' : `${currentDir}/README.md`;
    if (await pathExists(path.resolve(repoRoot, candidate))) {
      return candidate;
    }

    if (normalizedBoundary && currentDir === normalizedBoundary) {
      break;
    }
    if (currentDir === '.') {
      break;
    }

    const parent = path.posix.dirname(currentDir);
    if (!parent || parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  return null;
}

async function evaluateSurface(repoRoot, filePath, rule, context) {
  const normalizedPath = normalizePath(filePath);
  const label = getClassMeta(context.catalog, rule?.surface_class || 'uncatalogued').label;
  let decision = rule?.decision ?? 'update';
  const evidence = [];
  const issues = [];
  let readmeAnchor = null;
  const surfaceExists = await trackedSurfaceExists(repoRoot, normalizedPath);

  if (!rule) {
    issues.push('tracked surface is uncatalogued');
  }

  if (!surfaceExists) {
    if (rule?.decision === 'delete') {
      evidence.push('tracked surface already absent from working tree');
    } else {
      decision = 'update';
      issues.push('tracked surface missing from working tree');
    }
  } else if (rule) {
    if (rule.checks.required_scripts.length > 0) {
      const packageScripts = await loadPackageScriptSet(repoRoot, context.cache);
      if (!packageScripts) {
        decision = 'update';
        issues.push('package.json missing from working tree; unable to verify required scripts');
      } else {
        const missingScripts = rule.checks.required_scripts.filter((script) => !packageScripts.has(script));
        if (missingScripts.length > 0) {
          decision = 'update';
          issues.push(`missing package scripts: ${missingScripts.join(', ')}`);
        } else {
          evidence.push(`required package scripts present: ${rule.checks.required_scripts.join(', ')}`);
        }
      }
    }

    if (rule.checks.required_text.length > 0) {
      const content = await readTextFile(repoRoot, normalizedPath, context.cache.fileContents);
      if (content === null) {
        decision = 'update';
        issues.push('tracked surface missing from working tree');
      } else {
        const missingFragments = rule.checks.required_text.filter((fragment) => !content.includes(fragment));
        if (missingFragments.length > 0) {
          decision = 'update';
          issues.push(`missing required text: ${missingFragments.join(' | ')}`);
        } else {
          evidence.push(`required text present: ${rule.checks.required_text.join(' | ')}`);
        }
      }
    }

    if (rule.checks.requires_local_readme) {
      const readmeBoundary = rule.checks.readme_boundary ?? path.posix.dirname(normalizedPath);
      readmeAnchor = await findNearestLocalReadme(repoRoot, normalizedPath, readmeBoundary);
      if (!readmeAnchor) {
        decision = 'update';
        issues.push(
          `missing local README rationale under ${readmeBoundary}`
        );
      } else {
        evidence.push(`local rationale anchor: ${readmeAnchor}`);
      }
    }
  }

  return {
    path: normalizedPath,
    surface_class: rule?.surface_class || 'uncatalogued',
    label,
    owner: rule?.owner || '',
    matched_by: rule?.matched_by || 'uncatalogued',
    decision,
    rationale: rule?.rationale || '',
    summary: issues.length > 0 ? issues.join('; ') : rule?.rationale || 'no additional action required',
    evidence,
    readme_anchor: readmeAnchor
  };
}

function summarizeByClass(decisions, catalog) {
  const buckets = new Map();

  function ensure(surfaceClass) {
    const key = surfaceClass || 'uncatalogued';
    if (!buckets.has(key)) {
      const meta = getClassMeta(catalog, key);
      buckets.set(key, {
        surface_class: key,
        label: meta.label,
        report_order: meta.report_order,
        tracked_files: 0,
        validate: 0,
        update: 0,
        delete: 0,
        retain_with_rationale: 0
      });
    }
    return buckets.get(key);
  }

  for (const decision of decisions) {
    const bucket = ensure(decision.surface_class);
    bucket.tracked_files += 1;
    bucket[decision.decision] += 1;
  }

  return [...buckets.values()].sort((left, right) => {
    if (left.report_order !== right.report_order) {
      return left.report_order - right.report_order;
    }
    return left.label.localeCompare(right.label);
  });
}

export function renderRepoStewardshipMarkdown(report) {
  const lines = [
    '# Repo Stewardship Report',
    '',
    `Generated: ${report.generated_at}`,
    `Task: ${report.task_id}`,
    `Catalog: \`${report.catalog_path}\``,
    '',
    '## Totals',
    '',
    `- Tracked files scanned: ${report.totals.tracked_files}`,
    `- Validate: ${report.totals.validate}`,
    `- Update: ${report.totals.update}`,
    `- Delete: ${report.totals.delete}`,
    `- Retain with rationale: ${report.totals.retain_with_rationale}`,
    `- Action required: ${report.totals.action_required}`,
    `- Uncatalogued: ${report.totals.uncatalogued}`,
    '',
    '## Class Summary',
    '',
    '| Class | Files | Validate | Update | Delete | Retain |',
    '| --- | ---: | ---: | ---: | ---: | ---: |'
  ];

  for (const entry of report.class_summary ?? []) {
    lines.push(
      `| ${entry.label} | ${entry.tracked_files} | ${entry.validate} | ${entry.update} | ${entry.delete} | ${entry.retain_with_rationale} |`
    );
  }

  lines.push('', '## Action Required', '');
  if ((report.action_required ?? []).length === 0) {
    lines.push('No `update` or `delete` decisions are currently active.');
  } else {
    for (const item of report.action_required) {
      lines.push(
        `- \`${item.path}\` -> \`${item.decision}\` (${item.label})${item.summary ? `: ${item.summary}` : ''}`
      );
    }
  }

  lines.push('', '## Retain With Rationale', '');
  if ((report.retained_surfaces ?? []).length === 0) {
    lines.push('No retained historical surfaces are currently catalogued.');
  } else {
    for (const item of report.retained_surfaces) {
      const anchor = item.readme_anchor ? ` [anchor: \`${item.readme_anchor}\`]` : '';
      lines.push(`- \`${item.path}\`${anchor}: ${item.summary}`);
    }
  }

  if ((report.uncatalogued_surfaces ?? []).length > 0) {
    lines.push('', '## Structural Drift', '');
    for (const filePath of report.uncatalogued_surfaces) {
      lines.push(`- \`${filePath}\``);
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function runRepoStewardshipAudit(
  repoRoot,
  {
    catalogPath = DEFAULT_CATALOG_PATH,
    reportPath = null,
    summaryMarkdownPath = null,
    outRoot = path.join(repoRoot, 'out'),
    taskId = process.env.MCP_RUNNER_TASK_ID || 'local'
  } = {}
) {
  const absoluteCatalogPath = path.resolve(repoRoot, catalogPath);
  if (!(await pathExists(absoluteCatalogPath))) {
    throw new Error(`Catalog not found: ${catalogPath}`);
  }

  const catalog = await loadCatalog(repoRoot, catalogPath);
  const trackedFiles = listTrackedFiles(repoRoot);
  const cache = {
    fileContents: new Map(),
    packageScripts: undefined
  };

  const decisions = [];
  const uncataloguedSurfaces = [];

  for (const filePath of trackedFiles) {
    const rule = resolveCatalogRule(filePath, catalog);
    if (!rule) {
      uncataloguedSurfaces.push(filePath);
    }
    decisions.push(
      await evaluateSurface(repoRoot, filePath, rule, {
        catalog,
        cache
      })
    );
  }

  const actionRequired = decisions.filter(
    (decision) => decision.decision === 'update' || decision.decision === 'delete'
  );
  const retainedSurfaces = decisions.filter((decision) => decision.decision === 'retain_with_rationale');
  const classSummary = summarizeByClass(decisions, catalog);

  const totals = {
    tracked_files: decisions.length,
    validate: decisions.filter((decision) => decision.decision === 'validate').length,
    update: decisions.filter((decision) => decision.decision === 'update').length,
    delete: decisions.filter((decision) => decision.decision === 'delete').length,
    retain_with_rationale: retainedSurfaces.length,
    action_required: actionRequired.length,
    uncatalogued: uncataloguedSurfaces.length
  };

  const report = {
    version: 1,
    generated_at: new Date().toISOString(),
    task_id: taskId,
    catalog_path: catalog.relative_path,
    totals,
    class_summary: classSummary,
    action_required: actionRequired,
    retained_surfaces: retainedSurfaces,
    uncatalogued_surfaces: uncataloguedSurfaces,
    decisions
  };

  const absoluteReportPath = reportPath
    ? path.resolve(repoRoot, reportPath)
    : path.join(outRoot, taskId, 'repo-stewardship.json');
  await mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  let absoluteSummaryMarkdownPath = null;
  if (summaryMarkdownPath) {
    absoluteSummaryMarkdownPath = path.resolve(repoRoot, summaryMarkdownPath);
    await mkdir(path.dirname(absoluteSummaryMarkdownPath), { recursive: true });
    await writeFile(absoluteSummaryMarkdownPath, renderRepoStewardshipMarkdown(report), 'utf8');
  }

  const hasFailures = uncataloguedSurfaces.length > 0;

  return {
    report,
    hasFailures,
    reportPath: absoluteReportPath,
    summaryMarkdownPath: absoluteSummaryMarkdownPath
  };
}

async function main() {
  const { repoRoot, outRoot } = resolveEnvironmentPaths();
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    return;
  }

  const knownFlags = new Set(['catalog', 'report', 'summary-markdown', 'warn', 'check', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    throw new Error(`Unknown option: ${label}`);
  }

  const options = {
    catalogPath: typeof args.catalog === 'string' ? args.catalog : DEFAULT_CATALOG_PATH,
    reportPath: typeof args.report === 'string' ? args.report : null,
    summaryMarkdownPath: typeof args['summary-markdown'] === 'string' ? args['summary-markdown'] : null,
    warnOnly: hasFlag(args, 'warn')
  };

  const taskId = process.env.MCP_RUNNER_TASK_ID || 'local';
  const { report, hasFailures } = await runRepoStewardshipAudit(repoRoot, {
    catalogPath: options.catalogPath,
    reportPath: options.reportPath,
    summaryMarkdownPath: options.summaryMarkdownPath,
    outRoot,
    taskId
  });

  const summary = hasFailures ? 'FAILED' : 'OK';
  console.log(
    `repo:stewardship ${summary} - ${report.totals.tracked_files} tracked files, ${report.totals.action_required} action-required`
  );
  console.log(`- validate: ${report.totals.validate}`);
  console.log(`- update: ${report.totals.update}`);
  console.log(`- delete: ${report.totals.delete}`);
  console.log(`- retain_with_rationale: ${report.totals.retain_with_rationale}`);
  if (report.totals.uncatalogued > 0) {
    console.log(`- uncatalogued: ${report.totals.uncatalogued}`);
  }

  for (const entry of report.class_summary ?? []) {
    console.log(
      `- ${entry.label}: files=${entry.tracked_files} validate=${entry.validate} update=${entry.update} delete=${entry.delete} retain=${entry.retain_with_rationale}`
    );
  }

  if (hasFailures && !options.warnOnly) {
    process.exit(1);
  }
}

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  });
}
