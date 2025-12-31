#!/usr/bin/env node

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_POLICY_PATH = 'docs/implementation-docs-archive-policy.json';
const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const TASKS_INDEX_PATH = 'tasks/index.json';
const ARCHIVE_MARKER = '<!-- docs-archive:stub -->';
const EXCLUDED_DIR_NAMES = new Set(['.runs', 'out', 'archives', 'node_modules', 'dist']);
const DEFAULT_OWNER = 'Codex (top-level agent), Review agent';

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

function parseArgs(argv) {
  const options = {
    policyPath: DEFAULT_POLICY_PATH,
    registryPath: DEFAULT_REGISTRY_PATH,
    outDir: null,
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--policy') {
      options.policyPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--registry') {
      options.registryPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--out') {
      options.outDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      showUsage();
      process.exit(0);
    }
    console.error(`Unknown option: ${arg}`);
    showUsage();
    process.exit(2);
  }

  return options;
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function normalizeTaskKey(item) {
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

function parseDate(raw) {
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

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeAgeInDays(from, to) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regex = `^${escaped.replace(/\\\*/g, '.*')}$`;
  return new RegExp(regex);
}

function matchesAnyPattern(value, patterns) {
  return patterns.some((regex) => regex.test(value));
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

  return {
    archiveBranch,
    repoUrl,
    retainDays,
    strayRetainDays,
    maxLines,
    archivedCadenceDays,
    docPatterns,
    excludePaths
  };
}

async function collectMarkdownFiles(repoRoot, relativeDir) {
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
      results.push(toPosix(relPath));
    }
  }

  return results;
}

async function collectDocFiles(repoRoot) {
  const roots = ['docs', 'tasks', '.agent/task'];
  const results = [];
  for (const root of roots) {
    const abs = path.join(repoRoot, root);
    if (await exists(abs)) {
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

function buildStubContent({ headerLine, archiveUrl, archivedAt, archiveBranch, relativePath }) {
  const title = headerLine || `# Archived Document`;
  const lines = [
    title,
    '',
    ARCHIVE_MARKER,
    `> Archived on ${archivedAt}. Full content: ${archiveUrl}`,
    '',
    `- Archive branch: ${archiveBranch}`,
    `- Archive path: ${relativePath}`,
    ''
  ];
  return lines.join('\n');
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
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv.slice(2));

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

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayString = formatDate(today);

  const taskLinkedDocs = new Set();
  const taskCandidates = [];

  for (const item of items) {
    const taskKey = normalizeTaskKey(item);
    if (!taskKey) {
      continue;
    }
    const docPaths = new Set();

    if (typeof item.path === 'string' && item.path.trim()) {
      const normalized = toPosix(item.path.trim());
      docPaths.add(normalized);
      const abs = path.resolve(repoRoot, normalized);
      if (await exists(abs)) {
        const content = await readFile(abs, 'utf8');
        for (const ref of extractDocReferences(content, docRegexes)) {
          docPaths.add(ref);
        }
      }
    }

    const checklistPath = `tasks/tasks-${taskKey}.md`;
    docPaths.add(checklistPath);
    const specPath = `tasks/specs/${taskKey}.md`;
    docPaths.add(specPath);
    const agentPath = `.agent/task/${taskKey}.md`;
    docPaths.add(agentPath);

    for (const pathValue of docPaths) {
      if (excludeSet.has(pathValue)) {
        continue;
      }
      taskLinkedDocs.add(pathValue);
    }

    const status = typeof item.status === 'string' ? item.status : '';
    const completedDate = parseDate(item.completed_at);
    if (status !== 'succeeded' || !completedDate) {
      continue;
    }

    const ageDays = computeAgeInDays(completedDate, today);
    for (const pathValue of docPaths) {
      if (excludeSet.has(pathValue)) {
        continue;
      }
      taskCandidates.push({
        path: pathValue,
        taskKey,
        completedAt: formatDate(completedDate),
        ageDays
      });
    }
  }

  const allDocs = await collectDocFiles(repoRoot);
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
    : path.join(repoRoot, 'out', process.env.MCP_RUNNER_TASK_ID || 'local');
  const archivePayloadRoot = path.join(archiveOutRoot, 'docs-archive');
  const reportPath = path.join(archiveOutRoot, 'docs-archive-report.json');

  const report = {
    version: 1,
    generated_at: new Date().toISOString(),
    task_id: process.env.MCP_RUNNER_TASK_ID || null,
    policy_path: toPosix(path.relative(repoRoot, policyPath)),
    totals: {
      task_candidates: taskCandidates.length,
      stray_candidates: strayCandidates.length,
      archived: 0,
      skipped: 0
    },
    archived: [],
    skipped: [],
    stray_candidates: []
  };

  async function archiveDoc({
    relativePath,
    reason,
    context
  }) {
    const absPath = path.resolve(repoRoot, relativePath);
    if (!(await exists(absPath))) {
      report.skipped.push({ path: relativePath, reason: 'missing_on_disk', context });
      report.totals.skipped += 1;
      return;
    }

    const content = await readFile(absPath, 'utf8');
    if (content.includes(ARCHIVE_MARKER)) {
      report.skipped.push({ path: relativePath, reason: 'already_stubbed', context });
      report.totals.skipped += 1;
      return;
    }

    const lines = content.split('\n');
    const headerLine = lines.find((line) => line.trim().startsWith('# ')) || null;
    const archiveUrl = `${policy.repoUrl}/blob/${policy.archiveBranch}/${relativePath}`;
    const stub = buildStubContent({
      headerLine,
      archiveUrl,
      archivedAt: todayString,
      archiveBranch: policy.archiveBranch,
      relativePath
    });

    if (!options.dryRun) {
      const payloadPath = path.join(archivePayloadRoot, relativePath);
      await mkdir(path.dirname(payloadPath), { recursive: true });
      await writeFile(payloadPath, content);
      await writeFile(absPath, stub);
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
    if (!entry.owner || typeof entry.owner !== 'string') {
      entry.owner = DEFAULT_OWNER;
    }

    report.archived.push({ path: relativePath, reason, context, archive_url: archiveUrl });
    report.totals.archived += 1;
  }

  for (const candidate of taskCandidates) {
    const relativePath = candidate.path;
    const absPath = path.resolve(repoRoot, relativePath);
    if (!(await exists(absPath))) {
      report.skipped.push({ path: relativePath, reason: 'missing_on_disk', context: candidate });
      report.totals.skipped += 1;
      continue;
    }

    const content = await readFile(absPath, 'utf8');
    const lineCount = content.split('\n').length;
    const registryEntry = registryMap.get(relativePath);
    const status = typeof registryEntry?.status === 'string' ? registryEntry.status : '';

    const eligibleReasons = [];
    if (status === 'archived' || status === 'deprecated') {
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
      context: { ...candidate, lineCount }
    });
  }

  for (const relativePath of strayCandidates) {
    const absPath = path.resolve(repoRoot, relativePath);
    if (!(await exists(absPath))) {
      report.skipped.push({ path: relativePath, reason: 'missing_on_disk', context: { type: 'stray' } });
      report.totals.skipped += 1;
      continue;
    }

    const content = await readFile(absPath, 'utf8');
    const lineCount = content.split('\n').length;
    const registryEntry = registryMap.get(relativePath);
    const status = typeof registryEntry?.status === 'string' ? registryEntry.status : '';
    const reviewDate = parseDate(registryEntry?.last_review ?? null);

    const strayContext = {
      type: 'stray',
      status: status || null,
      last_review: registryEntry?.last_review ?? null,
      lineCount
    };
    report.stray_candidates.push({ path: relativePath, context: strayContext });

    const eligibleReasons = [];
    if (status === 'archived' || status === 'deprecated') {
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
      report.skipped.push({ path: relativePath, reason: 'not_eligible', context: strayContext });
      report.totals.skipped += 1;
      continue;
    }

    await archiveDoc({
      relativePath,
      reason: eligibleReasons.join(','),
      context: strayContext
    });
  }

  report.totals.stray_candidates = report.stray_candidates.length;

  registry.entries = Array.from(registryMap.values()).sort((a, b) => a.path.localeCompare(b.path));
  registry.generated_at = todayString;

  if (!options.dryRun) {
    await mkdir(archiveOutRoot, { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  }

  console.log(`Archived docs: ${report.totals.archived}`);
  console.log(`Skipped docs: ${report.totals.skipped}`);
  console.log(`Stray candidates: ${report.totals.stray_candidates}`);
  if (options.dryRun) {
    console.log('Dry run: no files were written.');
  } else {
    console.log(`Archive payload root: ${archivePayloadRoot}`);
    console.log(`Report: ${reportPath}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
