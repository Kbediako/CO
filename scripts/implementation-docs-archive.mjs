#!/usr/bin/env node

import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import {
  collectMarkdownFiles,
  computeAgeInDays,
  normalizeTaskKey,
  parseIsoDate,
  pathExists,
  toPosixPath
} from './lib/docs-helpers.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';

const DEFAULT_POLICY_PATH = 'docs/implementation-docs-archive-policy.json';
const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const TASKS_INDEX_PATH = 'tasks/index.json';
const ARCHIVE_MARKER = '<!-- docs-archive:stub -->';
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

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
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

function collectIndexedDocPaths(item) {
  if (!item || typeof item !== 'object') {
    return [];
  }

  const candidates = [];
  if (typeof item.path === 'string' && item.path.trim()) {
    candidates.push(item.path.trim());
  }
  if (typeof item.relates_to === 'string' && item.relates_to.trim()) {
    candidates.push(item.relates_to.trim());
  }

  if (item.paths && typeof item.paths === 'object') {
    for (const key of ['docs', 'task', 'spec', 'agent_task']) {
      const value =
        typeof item.paths[key] === 'string' && item.paths[key].trim()
          ? item.paths[key].trim()
          : '';
      if (value) {
        candidates.push(value);
      }
    }
  }

  return [...new Set(candidates.map((entry) => toPosixPath(entry)))];
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

function buildStubContent({ headerLine, archiveUrl, archivedAt, archiveBranch, relativePath }) {
  const title = headerLine || `# Archived Document`;
  const lines = [title, ''];
  if (relativePath.startsWith('tasks/specs/')) {
    lines.push(`last_review: ${archivedAt}`, '');
  }
  lines.push(
    ARCHIVE_MARKER,
    `> Archived on ${archivedAt}. Full content: ${archiveUrl}`,
    '',
    `- Archive branch: ${archiveBranch}`,
    `- Archive path: ${relativePath}`,
    ''
  );
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

  const taskLinkedDocs = new Set();
  const taskCandidates = [];

  for (const item of items) {
    const taskKey = normalizeTaskKey(item);
    if (!taskKey) {
      continue;
    }
    const docPaths = new Set();

    for (const indexedPath of collectIndexedDocPaths(item)) {
      const containedIndexedPath = await resolveContainedPath(repoRoot, indexedPath, {
        allowMissing: true,
        resolvedRepoRoot
      });
      if (!containedIndexedPath) {
        continue;
      }

      docPaths.add(containedIndexedPath.relativePath);
      if (containedIndexedPath.exists && (await pathExists(containedIndexedPath.absolutePath))) {
        const content = await readFile(containedIndexedPath.absolutePath, 'utf8');
        for (const ref of extractDocReferences(content, docRegexes)) {
          const normalizedRef = await normalizeRepoRelativePath(repoRoot, ref, {
            allowMissing: true,
            resolvedRepoRoot
          });
          if (normalizedRef) {
            docPaths.add(normalizedRef);
          }
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
    const completedDate = parseIsoDate(item.completed_at);
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

  async function archiveDoc({ relativePath, reason, context, loadedDoc = null }) {
    const loaded = loadedDoc ?? (await loadContainedDoc(relativePath, context));
    if (!loaded) {
      return;
    }

    const { containedPath, content } = loaded;
    if (content.includes(ARCHIVE_MARKER)) {
      report.skipped.push({ path: relativePath, reason: 'already_stubbed', context });
      report.totals.skipped += 1;
      return;
    }

    const lines = content.split('\n');
    const headerLine = lines.find((line) => line.trim().startsWith('# ')) || null;
    const archiveRelativePath = containedPath.relativePath;
    const archiveUrl = `${policy.repoUrl}/blob/${policy.archiveBranch}/${archiveRelativePath}`;
    const stub = buildStubContent({
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
      await writeFile(containedPath.absolutePath, stub);
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
      context: { ...candidate, lineCount },
      loadedDoc
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
    const reviewDate = parseIsoDate(registryEntry?.last_review ?? null);

    const strayContext = {
      type: 'stray',
      status: status || null,
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

  report.totals.stray_candidates = report.stray_candidates.length;

  const shouldUpdateRegistry = report.totals.archived > 0;
  if (shouldUpdateRegistry) {
    registry.entries = Array.from(registryMap.values()).sort((a, b) => a.path.localeCompare(b.path));
    registry.generated_at = todayString;
  }

  if (!options.dryRun) {
    await mkdir(archiveOutRoot, { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    if (shouldUpdateRegistry) {
      await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    }
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
