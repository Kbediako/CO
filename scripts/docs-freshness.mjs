#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import {
  collectDocFiles,
  computeAgeInDays,
  parseIsoDate,
  pathExists,
  toPosixPath
} from './lib/docs-helpers.js';
import {
  loadDocsCatalog,
  resolveDocsCatalogEntry,
  summarizeDocsByClass
} from './lib/docs-catalog.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';

const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const STATUS_VALUES = new Set(['active', 'archived', 'deprecated']);
const OWNER_PLACEHOLDERS = new Set(['tbd', 'unassigned', 'owner']);

function showUsage() {
  console.log(`Usage: node scripts/docs-freshness.mjs [options]

Checks documentation coverage and freshness using a registry file.

Options:
  --registry <path>          Registry JSON path (default: ${DEFAULT_REGISTRY_PATH})
  --report <path>            Report JSON path (default: out/<task-id>/docs-freshness.json)
  --summary-markdown <path>  Optional markdown summary path
  --warn                     Emit failures but exit 0
  --check                    Alias for default behavior
  -h, --help                 Show this help message`);
}

function normalizeOwner(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeDocPath(value) {
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

async function loadRegistry(registryPath) {
  const raw = await readFile(registryPath, 'utf8');
  const data = JSON.parse(raw);
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  return { data, entries };
}

function classifyPath(docPath, catalog) {
  const normalizedPath = normalizeDocPath(docPath);
  const entry = catalog ? resolveDocsCatalogEntry(normalizedPath, catalog) : null;
  return entry?.doc_class || null;
}

function summarizeItems(items, renderItem) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'none';
  }

  const rendered = items.slice(0, 5).map((item) => `\`${renderItem(item)}\``);
  const remainder = items.length - rendered.length;
  return remainder > 0 ? `${rendered.join(', ')} (+${remainder} more)` : rendered.join(', ');
}

function countClassFailures(entry) {
  return (
    Number(entry?.missing_in_registry ?? 0) +
    Number(entry?.missing_on_disk ?? 0) +
    Number(entry?.invalid_entries ?? 0) +
    Number(entry?.stale_entries ?? 0) +
    Number(entry?.uncatalogued_docs ?? 0)
  );
}

export function renderDocsFreshnessMarkdown(report) {
  const lines = [
    '# Docs Truthfulness Drift Report',
    '',
    `Generated: ${report.generated_at}`,
    `Task: ${report.task_id}`,
    `Registry: \`${report.registry_path}\``,
    `Catalog: ${report.catalog_path ? `\`${report.catalog_path}\`` : 'not configured'}`,
    '',
    '## Totals',
    '',
    `- Docs scanned: ${report.totals.docs_scanned}`,
    `- Registry entries: ${report.totals.registry_entries}`,
    `- Missing in registry: ${report.totals.missing_in_registry}`,
    `- Missing on disk: ${report.totals.missing_on_disk}`,
    `- Invalid entries: ${report.totals.invalid_entries}`,
    `- Stale entries: ${report.totals.stale_entries}`,
    `- Uncatalogued docs: ${report.totals.uncatalogued_docs}`,
    '',
    '## Class Summary',
    '',
    '| Class | Docs | Registry | Missing Registry | Missing On Disk | Invalid | Stale | Uncatalogued |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];

  for (const entry of report.class_summary ?? []) {
    lines.push(
      `| ${entry.label} | ${entry.docs_scanned} | ${entry.registry_entries} | ${entry.missing_in_registry} | ${entry.missing_on_disk} | ${entry.invalid_entries} | ${entry.stale_entries} | ${entry.uncatalogued_docs} |`
    );
  }

  const failingClasses = (report.class_summary ?? []).filter((entry) => countClassFailures(entry) > 0);
  lines.push('', '## Drift By Class', '');

  if (failingClasses.length === 0) {
    lines.push('No drift detected across the current docs catalog.');
    return `${lines.join('\n')}\n`;
  }

  for (const entry of failingClasses) {
    const failures = report.grouped_failures?.[entry.doc_class] ?? {};
    lines.push(`### ${entry.label}`, '');
    lines.push(`- Missing in registry (${entry.missing_in_registry}): ${summarizeItems(failures.missing_in_registry, (item) => item)}`);
    lines.push(`- Missing on disk (${entry.missing_on_disk}): ${summarizeItems(failures.missing_on_disk, (item) => item)}`);
    lines.push(
      `- Invalid entries (${entry.invalid_entries}): ${summarizeItems(
        failures.invalid_entries,
        (item) => `${item.path} [${(item.issues ?? []).join('; ')}]`
      )}`
    );
    lines.push(
      `- Stale entries (${entry.stale_entries}): ${summarizeItems(
        failures.stale_entries,
        (item) => `${item.path} (last_review=${item.last_review}, cadence=${item.cadence_days}, age=${item.age_days})`
      )}`
    );
    lines.push(
      `- Uncatalogued docs (${entry.uncatalogued_docs}): ${summarizeItems(failures.uncatalogued_docs, (item) => item)}`
    );
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export async function runDocsFreshness(
  repoRoot,
  {
    registryPath = DEFAULT_REGISTRY_PATH,
    reportPath = null,
    summaryMarkdownPath = null,
    outRoot = path.join(repoRoot, 'out'),
    taskId = process.env.MCP_RUNNER_TASK_ID || 'local'
  } = {}
) {
  const absoluteRegistryPath = path.resolve(repoRoot, registryPath);
  if (!(await pathExists(absoluteRegistryPath))) {
    throw new Error(`Registry not found: ${registryPath}`);
  }

  const [docFiles, registryResult, docsCatalog] = await Promise.all([
    collectDocFiles(repoRoot),
    loadRegistry(absoluteRegistryPath),
    loadDocsCatalog(repoRoot)
  ]);
  const normalizedDocFiles = docFiles.map((docPath) => normalizeDocPath(docPath)).filter(Boolean);

  const registryEntries = registryResult.entries;
  const invalidEntries = [];
  const staleEntries = [];
  const missingOnDisk = [];
  const registryPaths = new Set();
  const metricsByClass = [];

  const uncataloguedDocs = [];
  for (const docPath of normalizedDocFiles) {
    const docClass = classifyPath(docPath, docsCatalog);
    if (!docClass && docsCatalog) {
      uncataloguedDocs.push(docPath);
      metricsByClass.push({ doc_class: 'uncatalogued', metric: 'uncatalogued_docs' });
    }
    metricsByClass.push({ doc_class: docClass, metric: 'docs_scanned' });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const entry of registryEntries) {
    const issues = [];
    const entryPath = normalizeDocPath(entry?.path);
    const owner = normalizeOwner(entry?.owner);
    const status = typeof entry?.status === 'string' ? entry.status : '';
    const cadenceDays = Number.isFinite(entry?.cadence_days) ? Number(entry.cadence_days) : NaN;
    const reviewDate = parseIsoDate(entry?.last_review);
    const docClass = classifyPath(entryPath, docsCatalog);

    metricsByClass.push({ doc_class: docClass, metric: 'registry_entries' });

    if (!entryPath) {
      issues.push('missing path');
    } else if (registryPaths.has(entryPath)) {
      issues.push('duplicate path');
    } else {
      registryPaths.add(entryPath);
    }

    if (!STATUS_VALUES.has(status)) {
      issues.push('invalid status');
    }

    if (!Number.isInteger(cadenceDays) || cadenceDays <= 0) {
      issues.push('invalid cadence_days');
    }

    if (!reviewDate) {
      issues.push('invalid last_review');
    }

    if (status === 'active' || status === 'deprecated') {
      if (!owner || OWNER_PLACEHOLDERS.has(owner.toLowerCase())) {
        issues.push('missing owner');
      }
    }

    if (issues.length > 0) {
      invalidEntries.push({ path: entryPath || '<missing>', issues });
      metricsByClass.push({ doc_class: docClass, metric: 'invalid_entries' });
    }

    if (entryPath) {
      const abs = path.resolve(repoRoot, entryPath);
      if (!(await pathExists(abs))) {
        missingOnDisk.push(entryPath);
        metricsByClass.push({ doc_class: docClass, metric: 'missing_on_disk' });
      }
    }

    if (reviewDate && Number.isInteger(cadenceDays) && cadenceDays > 0) {
      if (status === 'active' || status === 'deprecated') {
        const ageDays = computeAgeInDays(reviewDate, today);
        if (ageDays > cadenceDays) {
          staleEntries.push({
            path: entryPath,
            last_review: entry.last_review,
            cadence_days: cadenceDays,
            age_days: ageDays
          });
          metricsByClass.push({ doc_class: docClass, metric: 'stale_entries' });
        }
      }
    }
  }

  const missingInRegistry = normalizedDocFiles.filter((doc) => !registryPaths.has(doc));
  for (const docPath of missingInRegistry) {
    metricsByClass.push({ doc_class: classifyPath(docPath, docsCatalog), metric: 'missing_in_registry' });
  }

  const classSummary = docsCatalog ? summarizeDocsByClass(metricsByClass, docsCatalog) : [];
  const groupedFailures =
    docsCatalog === null
      ? {}
      : classSummary.reduce((result, entry) => {
          result[entry.doc_class] = {
            label: entry.label,
            uncatalogued_docs: uncataloguedDocs.filter(
              (docPath) => (classifyPath(docPath, docsCatalog) || 'uncatalogued') === entry.doc_class
            ),
            missing_in_registry: missingInRegistry.filter(
              (docPath) => (classifyPath(docPath, docsCatalog) || 'uncatalogued') === entry.doc_class
            ),
            missing_on_disk: missingOnDisk.filter(
              (docPath) => (classifyPath(docPath, docsCatalog) || 'uncatalogued') === entry.doc_class
            ),
            invalid_entries: invalidEntries.filter(
              (item) => (classifyPath(item.path, docsCatalog) || 'uncatalogued') === entry.doc_class
            ),
            stale_entries: staleEntries.filter(
              (item) => (classifyPath(item.path, docsCatalog) || 'uncatalogued') === entry.doc_class
            )
          };
          return result;
        }, {});

  const report = {
    version: 2,
    generated_at: new Date().toISOString(),
    task_id: taskId,
    registry_path: toPosixPath(path.relative(repoRoot, absoluteRegistryPath)),
    catalog_path: docsCatalog?.relative_path ?? null,
    totals: {
      docs_scanned: normalizedDocFiles.length,
      registry_entries: registryEntries.length,
      missing_in_registry: missingInRegistry.length,
      missing_on_disk: missingOnDisk.length,
      invalid_entries: invalidEntries.length,
      stale_entries: staleEntries.length,
      uncatalogued_docs: uncataloguedDocs.length
    },
    class_summary: classSummary,
    grouped_failures: groupedFailures,
    uncatalogued_docs: uncataloguedDocs,
    missing_in_registry: missingInRegistry,
    missing_on_disk: missingOnDisk,
    invalid_entries: invalidEntries,
    stale_entries: staleEntries
  };

  const absoluteReportPath = reportPath
    ? path.resolve(repoRoot, reportPath)
    : path.join(outRoot, taskId, 'docs-freshness.json');
  const reportDir = path.dirname(absoluteReportPath);

  await mkdir(reportDir, { recursive: true });
  await writeFile(absoluteReportPath, JSON.stringify(report, null, 2) + '\n');

  let absoluteSummaryMarkdownPath = null;
  if (summaryMarkdownPath) {
    absoluteSummaryMarkdownPath = path.resolve(repoRoot, summaryMarkdownPath);
    await mkdir(path.dirname(absoluteSummaryMarkdownPath), { recursive: true });
    await writeFile(absoluteSummaryMarkdownPath, renderDocsFreshnessMarkdown(report), 'utf8');
  }

  const hasFailures =
    missingInRegistry.length > 0 ||
    missingOnDisk.length > 0 ||
    invalidEntries.length > 0 ||
    staleEntries.length > 0 ||
    uncataloguedDocs.length > 0;

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
  const knownFlags = new Set(['registry', 'report', 'summary-markdown', 'warn', 'check', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    throw new Error(`Unknown option: ${label}`);
  }

  const options = {
    registryPath: typeof args.registry === 'string' ? args.registry : DEFAULT_REGISTRY_PATH,
    reportPath: typeof args.report === 'string' ? args.report : null,
    summaryMarkdownPath: typeof args['summary-markdown'] === 'string' ? args['summary-markdown'] : null,
    warnOnly: hasFlag(args, 'warn')
  };

  const taskId = process.env.MCP_RUNNER_TASK_ID || 'local';
  const { report, hasFailures } = await runDocsFreshness(repoRoot, {
    registryPath: options.registryPath,
    reportPath: options.reportPath,
    summaryMarkdownPath: options.summaryMarkdownPath,
    outRoot,
    taskId
  });

  const summary = hasFailures ? 'FAILED' : 'OK';
  console.log(
    `docs:freshness ${summary} - ${report.totals.docs_scanned} docs, ${report.totals.registry_entries} registry entries`
  );
  if (report.totals.missing_in_registry > 0) {
    console.log(`- missing registry entries: ${report.totals.missing_in_registry}`);
  }
  if (report.totals.missing_on_disk > 0) {
    console.log(`- registry references missing files: ${report.totals.missing_on_disk}`);
  }
  if (report.totals.invalid_entries > 0) {
    console.log(`- invalid registry entries: ${report.totals.invalid_entries}`);
  }
  if (report.totals.stale_entries > 0) {
    console.log(`- stale docs: ${report.totals.stale_entries}`);
  }
  if (report.totals.uncatalogued_docs > 0) {
    console.log(`- uncatalogued docs: ${report.totals.uncatalogued_docs}`);
  }

  for (const entry of report.class_summary ?? []) {
    console.log(
      `- ${entry.label}: docs=${entry.docs_scanned} registry=${entry.registry_entries} missing_registry=${entry.missing_in_registry} stale=${entry.stale_entries}`
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
