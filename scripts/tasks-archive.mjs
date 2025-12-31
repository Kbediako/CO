#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_POLICY_PATH = 'docs/tasks-archive-policy.json';
const TASKS_PATH = 'docs/TASKS.md';

function showUsage() {
  console.log(`Usage: node scripts/tasks-archive.mjs [--policy <path>] [--out <path>] [--dry-run]

Moves completed task snapshots from docs/TASKS.md into a year-based archive payload
when the line-count threshold is exceeded.

Options:
  --policy <path>  Path to archive policy JSON (default: ${DEFAULT_POLICY_PATH})
  --out <path>     Output path pattern for archive payload (must include YYYY)
  --dry-run        Report changes without writing files
  -h, --help       Show this help message`);
}

function parseArgs(argv) {
  const options = { policyPath: DEFAULT_POLICY_PATH, outPath: null, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--policy') {
      options.policyPath = argv[index + 1];
      index += 1;
    } else if (arg === '--out') {
      options.outPath = argv[index + 1];
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '-h' || arg === '--help') {
      showUsage();
      process.exit(0);
    } else {
      console.error(`Unknown option: ${arg}`);
      showUsage();
      process.exit(2);
    }
  }
  return options;
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

function parsePolicy(raw, policyPath) {
  const data = JSON.parse(raw);
  const maxLines = Number.isFinite(data?.max_lines) ? Number(data.max_lines) : NaN;
  if (!Number.isInteger(maxLines) || maxLines <= 0) {
    throw new Error(`Policy max_lines is invalid in ${policyPath}`);
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
    archiveBranch,
    archivePattern,
    repoUrl
  };
}

function extractSnapshotKey(line) {
  if (typeof line !== 'string') {
    return null;
  }
  const match = line.match(/^# Task List Snapshot(?: —|-)\s+.*\(([^)]+)\)\s*$/);
  if (!match) {
    return null;
  }
  return match[1].trim();
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

function parseTaskSections(lines) {
  const sections = [];

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
      if (lines[cursor].startsWith('# Task List Snapshot')) {
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
    index = endIndex;
  }

  sections.sort((a, b) => a.start - b.start);
  return sections;
}

function parseDate(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return value;
}

function loadTaskIndex(raw) {
  const data = JSON.parse(raw);
  const items = Array.isArray(data?.items) ? data.items : [];
  const map = new Map();
  for (const item of items) {
    const key = normalizeTaskKey(item);
    if (!key) {
      continue;
    }
    map.set(key, {
      status: typeof item.status === 'string' ? item.status : '',
      completedAt: parseDate(item.completed_at)
    });
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

function buildArchiveIndex({ years, policy }) {
  const sortedYears = [...years].sort();
  const lines = ['## Archive index'];
  lines.push(`Archived task snapshots live on the ${policy.archiveBranch} branch.`);
  if (sortedYears.length === 0) {
    lines.push('No archives recorded yet.');
  } else {
    for (const year of sortedYears) {
      const archivePath = policy.archivePattern.replace('YYYY', year);
      const url = `${policy.repoUrl}/blob/${policy.archiveBranch}/${archivePath}`;
      lines.push(`- ${year}: ${url}`);
    }
  }
  return lines;
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
  const blockLines = [begin, ...buildArchiveIndex({ years: existingYears, policy }), end];
  const block = blockLines.join('\n');

  const beginIndex = content.indexOf(begin);
  const endIndex = content.indexOf(end);
  if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
    return `${content.slice(0, beginIndex)}${block}${content.slice(endIndex + end.length)}`;
  }

  const lines = content.split('\n');
  const headerIndices = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith('# Task List Snapshot — ')) {
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
  const pattern = /<!-- docs-sync:begin ([^ ]+) -->/g;
  for (const match of content.matchAll(pattern)) {
    keys.add(match[1]);
  }
  return keys;
}

async function main() {
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  const policyPath = path.resolve(repoRoot, options.policyPath);
  const tasksPath = path.resolve(repoRoot, TASKS_PATH);

  const [policyRaw, tasksRaw, indexRaw] = await Promise.all([
    readFile(policyPath, 'utf8'),
    readFile(tasksPath, 'utf8'),
    readFile(path.resolve(repoRoot, 'tasks', 'index.json'), 'utf8')
  ]);

  const policy = parsePolicy(policyRaw, policyPath);
  const lines = tasksRaw.split('\n');
  const totalLines = lines.length;

  if (totalLines <= policy.maxLines) {
    console.log(`docs/TASKS.md is within limit (${totalLines}/${policy.maxLines}).`);
    return;
  }

  const taskIndex = loadTaskIndex(indexRaw);
  const sections = parseTaskSections(lines);

  const candidates = [];
  for (const section of sections) {
    const entry = taskIndex.get(section.taskKey);
    if (!entry || entry.status !== 'succeeded' || !entry.completedAt) {
      continue;
    }
    candidates.push({
      ...section,
      completedAt: entry.completedAt,
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
      `docs/TASKS.md exceeds max_lines (${totalLines}/${policy.maxLines}) but no eligible tasks can be archived.`
    );
  }

  const toArchive = [];
  let remainingLines = totalLines;
  for (const candidate of candidates) {
    if (remainingLines <= policy.maxLines) {
      break;
    }
    toArchive.push(candidate);
    remainingLines -= candidate.lineCount;
  }

  if (remainingLines > policy.maxLines) {
    throw new Error(
      `Unable to reach max_lines ${policy.maxLines}; ${remainingLines} lines remain after archiving.`
    );
  }

  const archivedYears = new Set();
  const archiveSections = new Map();
  for (const archived of toArchive) {
    const year = archived.completedAt.slice(0, 4);
    archivedYears.add(year);
    if (!archiveSections.has(year)) {
      archiveSections.set(year, []);
    }
    archiveSections.get(year).push(lines.slice(archived.start, archived.end + 1).join('\n'));
  }

  const removeMask = new Array(lines.length).fill(false);
  for (const archived of toArchive) {
    for (let index = archived.start; index <= archived.end; index += 1) {
      removeMask[index] = true;
    }
  }

  const updatedLines = lines.filter((_, index) => !removeMask[index]);
  let updatedContent = updatedLines.join('\n');
  updatedContent = updateArchiveIndex(updatedContent, policy, archivedYears);

  const taskId = process.env.MCP_RUNNER_TASK_ID || 'local';
  const archiveFileName = path.basename(policy.archivePattern);
  const outPattern = options.outPath
    ? path.resolve(repoRoot, options.outPath)
    : path.resolve(repoRoot, 'out', taskId, archiveFileName);
  if (!outPattern.includes('YYYY')) {
    throw new Error('Archive output path must include YYYY.');
  }

  if (!options.dryRun) {
    await writeFile(tasksPath, updatedContent);
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
          const match = section.match(/<!-- docs-sync:begin ([^ ]+) -->/);
          if (!match) {
            return true;
          }
          return !existingKeys.has(match[1]);
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

  console.log(`Archived ${toArchive.length} task(s).`);
  console.log(`docs/TASKS.md lines: ${totalLines} -> ${remainingLines} (limit ${policy.maxLines}).`);
  console.log(`Archive branch: ${policy.archiveBranch}`);

  if (options.dryRun) {
    console.log('Dry run: no files were written.');
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
