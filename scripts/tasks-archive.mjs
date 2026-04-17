#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { normalizeTaskKey, parseDateString } from './lib/docs-helpers.js';
import { parseRunIdTimestamp, resolveEnvironmentPaths } from './lib/run-manifests.js';

const DEFAULT_POLICY_PATH = 'docs/tasks-archive-policy.json';
const TASKS_PATH = 'docs/TASKS.md';
const SNAPSHOT_HEADER_PREFIX = '# Task List Snapshot';
const SNAPSHOT_HEADER_SPLIT_PATTERN = /(?=# Task List Snapshot(?: —|-)\s+)/g;

function showUsage() {
  console.log(`Usage: node scripts/tasks-archive.mjs [--policy <path>] [--out <path>] [--dry-run]

Moves completed task snapshots from docs/TASKS.md into a year-based archive payload
when the hard line-count limit or the configured reserve target is exceeded.

Options:
  --policy <path>  Path to archive policy JSON (default: ${DEFAULT_POLICY_PATH})
  --out <path>     Output path pattern for archive payload (must include YYYY)
  --dry-run        Report changes without writing files
  -h, --help       Show this help message`);
}


function parsePolicy(raw, policyPath) {
  const data = JSON.parse(raw);
  const maxLines = Number.isFinite(data?.max_lines) ? Number(data.max_lines) : NaN;
  if (!Number.isInteger(maxLines) || maxLines <= 0) {
    throw new Error(`Policy max_lines is invalid in ${policyPath}`);
  }
  const reserveLines =
    data?.reserve_lines === undefined ? 0 : Number.isFinite(data?.reserve_lines) ? Number(data.reserve_lines) : NaN;
  if (!Number.isInteger(reserveLines) || reserveLines < 0 || reserveLines >= maxLines) {
    throw new Error(`Policy reserve_lines is invalid in ${policyPath}`);
  }
  const archiveBranch = typeof data?.archive_branch === 'string' ? data.archive_branch.trim() : '';
  if (!archiveBranch) {
    throw new Error(`Policy archive_branch is missing in ${policyPath}`);
  }
  const archivePattern =
    typeof data?.archive_file_pattern === 'string' ? data.archive_file_pattern.trim() : '';
  if (!archivePattern || !archivePattern.includes('YYYY')) {
    throw new Error(`Policy archive_file_pattern must include YYYY in ${policyPath}`);
  }
  const repoUrl = typeof data?.repo_url === 'string' ? data.repo_url.trim() : '';
  if (!repoUrl) {
    throw new Error(`Policy repo_url is missing in ${policyPath}`);
  }

  return {
    maxLines,
    reserveLines,
    archiveBranch,
    archivePattern,
    repoUrl
  };
}

function extractSnapshotKey(line) {
  if (typeof line !== 'string') {
    return null;
  }
  const match = line.match(/\(((?:[0-9]{4,}|linear)-[A-Za-z0-9-]+)\)/u);
  if (!match) {
    return null;
  }
  return match[1].trim();
}

function lineStartsWithSnapshotHeader(line) {
  return typeof line === 'string' && line.startsWith(SNAPSHOT_HEADER_PREFIX);
}

function normalizeInlineSnapshotHeaders(content) {
  if (typeof content !== 'string' || content.length === 0) {
    return '';
  }

  const normalizedLines = [];
  for (const line of content.split('\n')) {
    const segments = line.split(SNAPSHOT_HEADER_SPLIT_PATTERN);
    if (segments.length === 1) {
      normalizedLines.push(line);
      continue;
    }

    const [prefix, ...snapshotSegments] = segments;
    if (prefix.trim().length > 0) {
      normalizedLines.push(prefix.trimEnd());
    }

    for (const segment of snapshotSegments) {
      const trimmed = segment.trimStart();
      if (trimmed.length > 0) {
        normalizedLines.push(trimmed);
      }
    }
  }

  return normalizedLines.join('\n');
}

function countNormalizedLines(content) {
  if (typeof content !== 'string' || content.length === 0) {
    return 0;
  }
  const lines = content.split('\n');
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
}

function headerMatchesTask(headerKey, taskKey) {
  if (!headerKey || !taskKey) {
    return false;
  }
  if (headerKey === taskKey) {
    return true;
  }
  const idMatch = taskKey.match(/^(\d{4})/);
  if (idMatch && headerKey === idMatch[1]) {
    return true;
  }
  return false;
}

function parseHeaderSections(lines) {
  const sections = [];
  let startIndex = null;
  let taskKey = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!lineStartsWithSnapshotHeader(line)) {
      continue;
    }
    if (startIndex !== null && taskKey) {
      sections.push({ taskKey, start: startIndex, end: index - 1 });
    }
    startIndex = index;
    taskKey = extractSnapshotKey(line);
  }

  if (startIndex !== null && taskKey) {
    sections.push({ taskKey, start: startIndex, end: lines.length - 1 });
  }

  return sections;
}

function findSnapshotHeaderLine(lines, section) {
  for (let index = section.start; index <= section.end; index += 1) {
    if (lineStartsWithSnapshotHeader(lines[index])) {
      return lines[index];
    }
  }
  return null;
}

function parseCompletedSnapshotDate(headerLine) {
  if (typeof headerLine !== 'string') {
    return null;
  }
  const match = headerLine.match(/Update (\d{4}-\d{2}-\d{2}): completed\b/i);
  if (!match?.[1]) {
    return null;
  }
  return parseDateString(match[1]);
}

function parseTaskSections(lines) {
  const sections = [];
  const covered = new Array(lines.length).fill(false);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const beginMatch = /^<!-- docs-sync:begin (.+) -->$/.exec(line);
    if (!beginMatch) {
      continue;
    }

    const taskKey = beginMatch[1].trim();
    let endIndex = index;
    while (endIndex < lines.length) {
      if (lines[endIndex] === `<!-- docs-sync:end ${taskKey} -->`) {
        break;
      }
      endIndex += 1;
    }

    if (endIndex >= lines.length) {
      throw new Error(`Unable to find docs-sync:end for ${taskKey}`);
    }

    let startIndex = index;
    let headerLine = null;
    for (let cursor = index; cursor >= 0; cursor -= 1) {
      if (lineStartsWithSnapshotHeader(lines[cursor])) {
        headerLine = lines[cursor];
        if (headerMatchesTask(extractSnapshotKey(headerLine), taskKey)) {
          startIndex = cursor;
        }
        break;
      }
    }
    if (headerLine && startIndex === index) {
      const headerKey = extractSnapshotKey(headerLine);
      if (headerKey) {
        console.warn(
          `Archive warning: snapshot header (${headerKey}) does not match task key (${taskKey}); archiving docs-sync block only.`
        );
      } else {
        console.warn(
          `Archive warning: snapshot header is missing a key for task (${taskKey}); archiving docs-sync block only.`
        );
      }
    }

    sections.push({ taskKey, start: startIndex, end: endIndex });
    for (let cursor = startIndex; cursor <= endIndex; cursor += 1) {
      covered[cursor] = true;
    }
    index = endIndex;
  }

  const headerSections = parseHeaderSections(lines);
  for (const section of headerSections) {
    let overlaps = false;
    for (let cursor = section.start; cursor <= section.end; cursor += 1) {
      if (covered[cursor]) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      sections.push(section);
    }
  }

  sections.sort((a, b) => a.start - b.start);
  return sections;
}


function loadTaskIndex(raw) {
  const data = JSON.parse(raw);
  const items = Array.isArray(data?.items) ? data.items : [];
  const map = new Map();
  for (const item of items) {
    const id = typeof item?.id === 'string' ? item.id.trim() : '';
    const key = normalizeTaskKey(item);
    if (!key) {
      continue;
    }
    const status = typeof item.status === 'string' ? item.status : '';
    const gateStatus = typeof item?.gate?.status === 'string' ? item.gate.status : '';
    const runTimestamp = parseRunIdTimestamp(item?.gate?.run_id);
    const runDate = runTimestamp ? runTimestamp.toISOString().slice(0, 10) : null;
    const completedAtFromIndex = parseDateString(item.completed_at);
    const completedByIndex = status === 'succeeded' || status === 'completed' || Boolean(completedAtFromIndex);
    const completedAt =
      completedAtFromIndex ??
      (gateStatus === 'succeeded' ? parseDateString(runDate) : null);
    const entry = {
      status,
      gateStatus,
      completedAt,
      completedByIndex
    };
    map.set(key, entry);
    if (id) {
      map.set(id, entry);
    }
  }
  return map;
}

function extractArchiveYears(existingContent) {
  const years = new Set();
  const pattern = /TASKS-archive-(\d{4})\.md/g;
  for (const match of existingContent.matchAll(pattern)) {
    years.add(match[1]);
  }
  return years;
}

function buildArchiveIndexText({ years, policy }) {
  const sortedYears = [...years].sort();
  if (sortedYears.length === 0) {
    return `## Archive index - archived task snapshots live on the ${policy.archiveBranch} branch. No archives recorded yet.`;
  }

  const archiveEntries = sortedYears.map((year) => {
    const archivePath = policy.archivePattern.replace('YYYY', year);
    const url = `${policy.repoUrl}/blob/${policy.archiveBranch}/${archivePath}`;
    return `${year}: ${url}`;
  });

  return `## Archive index - archived task snapshots live on the ${policy.archiveBranch} branch. ${archiveEntries.join('; ')}`;
}

function updateArchiveIndex(content, policy, years) {
  const begin = '<!-- tasks-archive-index:begin -->';
  const end = '<!-- tasks-archive-index:end -->';
  const existingYears = content.includes(begin)
    ? extractArchiveYears(content)
    : new Set();
  for (const year of years) {
    existingYears.add(year);
  }
  const block = `${begin} ${buildArchiveIndexText({ years: existingYears, policy })} ${end}`;

  const beginIndex = content.indexOf(begin);
  const endIndex = content.indexOf(end);
  if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
    return `${content.slice(0, beginIndex)}${block}${content.slice(endIndex + end.length)}`;
  }

  const lines = content.split('\n');
  const headerIndices = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lineStartsWithSnapshotHeader(lines[index])) {
      headerIndices.push(index);
    }
  }

  if (headerIndices.length >= 2) {
    const insertIndex = headerIndices[1];
    const before = lines.slice(0, insertIndex).join('\n');
    const after = lines.slice(insertIndex).join('\n');
    return `${before}\n\n${block}\n\n${after}`;
  }

  return `${content}\n\n${block}\n`;
}

function extractArchivedTaskKeys(content) {
  const keys = new Set();
  for (const line of content.split('\n')) {
    const docsSyncMatch = /^<!-- docs-sync:begin (.+) -->$/.exec(line);
    if (docsSyncMatch?.[1]) {
      keys.add(docsSyncMatch[1].trim());
    }
    if (lineStartsWithSnapshotHeader(line)) {
      const headerKey = extractSnapshotKey(line);
      if (headerKey) {
        keys.add(headerKey);
      }
    }
  }
  return keys;
}

function extractArchiveSectionKey(section) {
  if (typeof section !== 'string' || section.length === 0) {
    return null;
  }
  const docsSyncMatch = section.match(/<!-- docs-sync:begin ([^ ]+) -->/);
  if (docsSyncMatch?.[1]) {
    return docsSyncMatch[1];
  }
  for (const line of section.split('\n')) {
    if (!lineStartsWithSnapshotHeader(line)) {
      continue;
    }
    const headerKey = extractSnapshotKey(line);
    if (headerKey) {
      return headerKey;
    }
  }
  return null;
}

function cloneArchiveSections(sections) {
  const cloned = new Map();
  for (const [year, values] of sections.entries()) {
    cloned.set(year, [...values]);
  }
  return cloned;
}

function buildUpdatedTasksContent({ lines, removeMask, policy, archivedYears }) {
  const updatedLines = lines.filter((_, index) => !removeMask[index]);
  return updateArchiveIndex(updatedLines.join('\n'), policy, archivedYears);
}

async function main() {
  const { repoRoot, outRoot } = resolveEnvironmentPaths();
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    process.exit(0);
  }
  const knownFlags = new Set(['policy', 'out', 'dry-run', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    showUsage();
    process.exit(2);
  }
  const options = {
    policyPath: typeof args.policy === 'string' ? args.policy : DEFAULT_POLICY_PATH,
    outPath: typeof args.out === 'string' ? args.out : null,
    dryRun: hasFlag(args, 'dry-run')
  };
  const policyPath = path.resolve(repoRoot, options.policyPath);
  const tasksPath = path.resolve(repoRoot, TASKS_PATH);

  const [policyRaw, tasksRaw, indexRaw] = await Promise.all([
    readFile(policyPath, 'utf8'),
    readFile(tasksPath, 'utf8'),
    readFile(path.resolve(repoRoot, 'tasks', 'index.json'), 'utf8')
  ]);

  const policy = parsePolicy(policyRaw, policyPath);
  const normalizedTasks = normalizeInlineSnapshotHeaders(tasksRaw);
  const lines = normalizedTasks.split('\n');
  const totalLines = countNormalizedLines(normalizedTasks);
  const targetLines = policy.maxLines - policy.reserveLines;
  const archiveIndexMissing = !normalizedTasks.includes('<!-- tasks-archive-index:begin -->');
  const withinArchiveThreshold = (lineCount) =>
    policy.reserveLines === 0 ? lineCount < targetLines : lineCount <= targetLines;

  if (withinArchiveThreshold(totalLines)) {
    console.log(
      `docs/TASKS.md is within reserve target (${totalLines}/${policy.maxLines}; reserve ${policy.reserveLines}, target ${targetLines}).`
    );
    return;
  }

  const taskIndex = loadTaskIndex(indexRaw);
  const sections = parseTaskSections(lines);

  const candidates = [];
  for (const section of sections) {
    const entry = taskIndex.get(section.taskKey);
    const headerLine = findSnapshotHeaderLine(lines, section);
    const headerCompletedAt = parseCompletedSnapshotDate(headerLine);
    if (entry?.status && !entry.completedByIndex) {
      continue;
    }
    const completedAt = entry
      ? entry.completedAt ?? headerCompletedAt
      : headerCompletedAt;
    if (!completedAt) {
      continue;
    }
    candidates.push({
      ...section,
      completedAt,
      lineCount: section.end - section.start + 1
    });
  }

  candidates.sort((a, b) => {
    if (a.completedAt !== b.completedAt) {
      return a.completedAt < b.completedAt ? -1 : 1;
    }
    return a.taskKey.localeCompare(b.taskKey);
  });

  if (candidates.length === 0) {
    throw new Error(
      `docs/TASKS.md exceeds the reserve target (${totalLines}/${targetLines}; hard max ${policy.maxLines}) but no eligible tasks can be archived.`
    );
  }

  const toArchive = [];
  let archivedYears = new Set();
  let archiveSections = new Map();
  let removeMask = new Array(lines.length).fill(false);
  let updatedContent = normalizedTasks;
  let updatedLineCount = totalLines;
  for (const candidate of candidates) {
    if (withinArchiveThreshold(updatedLineCount)) {
      break;
    }

    const tentativeRemoveMask = removeMask.slice();
    for (let index = candidate.start; index <= candidate.end; index += 1) {
      tentativeRemoveMask[index] = true;
    }

    const year = candidate.completedAt.slice(0, 4);
    const tentativeArchivedYears = new Set(archivedYears);
    tentativeArchivedYears.add(year);
    const tentativeArchiveSections = cloneArchiveSections(archiveSections);
    const sectionsForYear = tentativeArchiveSections.get(year) ?? [];
    sectionsForYear.push(lines.slice(candidate.start, candidate.end + 1).join('\n'));
    tentativeArchiveSections.set(year, sectionsForYear);

    const tentativeUpdatedContent = buildUpdatedTasksContent({
      lines,
      removeMask: tentativeRemoveMask,
      policy,
      archivedYears: tentativeArchivedYears
    });
    const tentativeUpdatedLineCount = countNormalizedLines(tentativeUpdatedContent);
    const bootstrapArchiveIndex = archiveIndexMissing && archivedYears.size === 0;
    if (tentativeUpdatedLineCount >= updatedLineCount && !bootstrapArchiveIndex) {
      continue;
    }

    toArchive.push(candidate);
    removeMask = tentativeRemoveMask;
    archivedYears = tentativeArchivedYears;
    archiveSections = tentativeArchiveSections;
    updatedContent = tentativeUpdatedContent;
    updatedLineCount = tentativeUpdatedLineCount;
  }

  if (!withinArchiveThreshold(updatedLineCount)) {
    throw new Error(
      `Unable to restore reserve target ${targetLines}; ${updatedLineCount} lines remain after archiving (hard max ${policy.maxLines}).`
    );
  }

  const taskId = process.env.MCP_RUNNER_TASK_ID || 'local';
  const archiveFileName = path.basename(policy.archivePattern);
  const outPattern = options.outPath
    ? path.resolve(repoRoot, options.outPath)
    : path.join(outRoot, taskId, archiveFileName);
  if (!outPattern.includes('YYYY')) {
    throw new Error('Archive output path must include YYYY.');
  }

  for (const [year, sectionsForYear] of archiveSections.entries()) {
    const outPath = outPattern.replace('YYYY', year);
    const outDir = path.dirname(outPath);
    const header = [
      `# Task Archive — ${year}`,
      '',
      `- Generated: ${new Date().toISOString()}`,
      `- Source: docs/TASKS.md on main`,
      `- Policy: ${path.relative(repoRoot, policyPath)}`,
      ''
    ];

    let outputContent = header.join('\n') + sectionsForYear.join('\n\n') + '\n';
    if (!options.dryRun) {
      await mkdir(outDir, { recursive: true });
      try {
        const existing = await readFile(outPath, 'utf8');
        const existingKeys = extractArchivedTaskKeys(existing);
        const filteredSections = sectionsForYear.filter((section) => {
          const sectionKey = extractArchiveSectionKey(section);
          if (!sectionKey) {
            return true;
          }
          return !existingKeys.has(sectionKey);
        });
        if (filteredSections.length > 0) {
          const separator = existing.endsWith('\n') ? '\n' : '\n\n';
          outputContent = existing + separator + filteredSections.join('\n\n') + '\n';
          await writeFile(outPath, outputContent);
        }
      } catch {
        await writeFile(outPath, outputContent);
      }
    }
    console.log(`Archive payload (${year}): ${outPath}`);
  }

  if (!options.dryRun) {
    await writeFile(tasksPath, updatedContent);
  }

  console.log(`Archived ${toArchive.length} task(s).`);
  console.log(
    `docs/TASKS.md lines: ${totalLines} -> ${updatedLineCount} (hard limit ${policy.maxLines}; reserve ${policy.reserveLines}; target ${targetLines}).`
  );
  console.log(`Archive branch: ${policy.archiveBranch}`);

  if (options.dryRun) {
    console.log('Dry run: no files were written.');
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
