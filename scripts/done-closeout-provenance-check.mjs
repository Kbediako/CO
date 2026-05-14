#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { access, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';

const DEFAULT_MANIFEST_PATH = 'docs/done-closeout-provenance.json';
const DEFAULT_REPORT_NAME = 'done-closeout-provenance-report.json';
const TASKS_INDEX_PATH = 'tasks/index.json';
const DONE_STATE_NAMES = new Set(['done', 'completed']);
const TERMINAL_TASK_STATUSES = new Set(['succeeded', 'completed', 'done', 'canceled', 'cancelled']);
const VALID_CLASSIFICATIONS = new Set([
  'stale_mirror_only',
  'validation_only_provenance_gap',
  'true_follow_up_needed',
  'task_index_only'
]);
const SUCCESSFUL_CHECK_STATES = new Set(['SUCCESS', 'SKIPPED']);

function showUsage() {
  console.log(`Usage: node scripts/done-closeout-provenance-check.mjs [options]

Checks local Done issue closeout provenance without calling Linear or GitHub.

Options:
  --manifest <path>   Provenance manifest path (default: ${DEFAULT_MANIFEST_PATH})
  --report <path>     Report JSON path (default: out/<task-id>/${DEFAULT_REPORT_NAME})
  --issue-id <uuid>   Add a live terminal issue authority for task-index-only validation
  --issue-identifier <id>  Human-readable issue key for --issue-id (for example CO-525)
  --issue-state <state>    Live issue state for --issue-id (default: Done)
  --format json       Print the full JSON report
  --warn              Emit failures but exit 0
  --check             Alias for default behavior
  -h, --help          Show this help message`);
}

function normalizeRepoPath(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim().replace(/\\/g, '/');
  if (!trimmed) {
    return '';
  }
  const normalized = path.posix.normalize(trimmed.replace(/^\.\//, ''));
  return normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    /^[A-Za-z]:/.test(trimmed) ||
    path.win32.isAbsolute(trimmed) ||
    path.posix.isAbsolute(normalized)
    ? ''
    : normalized;
}

function describePathValue(value) {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizePathList(values) {
  if (!Array.isArray(values)) {
    return { paths: [], invalidPaths: [] };
  }
  const paths = [];
  const invalidPaths = [];
  for (const value of values) {
    const normalized = normalizeRepoPath(value);
    if (normalized) {
      paths.push(normalized);
    } else {
      invalidPaths.push(describePathValue(value));
    }
  }
  return { paths, invalidPaths };
}

function normalizeLine(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function isTaskSnapshotPath(pathName) {
  return pathName === 'docs/TASKS.md' || /^docs\/TASKS-archive-\d{4}\.md$/u.test(pathName);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContainsToken(line, token) {
  const normalizedToken = normalizeLine(token);
  if (!normalizedToken) {
    return false;
  }
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(normalizedToken)}([^A-Za-z0-9]|$)`).test(line);
}

function lineContainsTokenCaseInsensitive(line, token) {
  return lineContainsToken(normalizeLine(line).toLowerCase(), normalizeLine(token).toLowerCase());
}

function taskSnapshotIdentitySegment(line) {
  const updateMarker = ' - Update ';
  const markerIndex = line.indexOf(updateMarker);
  return markerIndex === -1 ? line : line.slice(0, markerIndex);
}

function hasExplicitLinearIdentity(line) {
  return /\([^)]*\blinear-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b[^)]*\)/iu.test(line);
}

function lineMatchesIssue(line, issueSummary, context = {}) {
  const linearId = normalizeLine(issueSummary?.linear_id);
  const identifier = normalizeLine(issueSummary?.identifier);
  if (isTaskSnapshotPath(context.pathName)) {
    const identitySegment = taskSnapshotIdentitySegment(line);
    if (lineContainsToken(identitySegment, linearId)) {
      return true;
    }
    if (!identifier) {
      return false;
    }
    if (hasExplicitLinearIdentity(identitySegment)) {
      return false;
    }
    return lineContainsToken(identitySegment, identifier);
  }
  if (lineContainsToken(line, linearId)) {
    return true;
  }
  if (!identifier) {
    return false;
  }
  return lineContainsToken(line, identifier);
}

function isPendingTaskSnapshotLine(line, context = {}) {
  if (!isTaskSnapshotPath(context.pathName) || !lineMatchesIssue(line, context.issueSummary, context)) {
    return false;
  }
  if (!/^# Task List Snapshot\b/.test(line)) {
    return false;
  }
  return (
    /\b(opened as|moved (?:it )?to `?In Progress`?|Remaining work|active continuation point|pending|blocked|hand off|handoff|review handoff|review-state|ready-review|validation (?:is |remains )?pending)\b/i.test(
      line
    ) ||
    /\bPR (?:creation|attachment|attach(?:ed)?)\b.*\b(pending|remaining|remains?|needed|before)\b/i.test(line) ||
    /\b(pending|remaining|remains?|needed|before)\b.*\bPR (?:creation|attachment|attach(?:ed)?)\b/i.test(line)
  );
}

function isPendingCloseoutLine(line, context = {}) {
  const normalized = normalizeLine(line);
  return (
    /^- \[ \]\s+/.test(normalized) ||
    /^- (Reviewer|Engineering):\s+pending\b/i.test(normalized) ||
    isPendingTaskSnapshotLine(normalized, context)
  );
}

function collectPendingRows(content, context = {}) {
  return String(content ?? '')
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, text: normalizeLine(line) }))
    .filter((row) => isPendingCloseoutLine(row.text, context));
}

export function hashPendingRowTexts(rowTexts) {
  const normalizedRows = Array.isArray(rowTexts) ? rowTexts.map(normalizeLine) : [];
  return createHash('sha256').update(JSON.stringify(normalizedRows)).digest('hex');
}

function hashPendingRows(rows) {
  return hashPendingRowTexts(rows.map((row) => row.text));
}

async function pathExists(absPath) {
  try {
    await access(absPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function isInsidePath(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function readCheckedRepoFile(repoRoot, pathName, report, issueSummary, options = {}) {
  const {
    missingCode,
    missingMessage,
    symlinkCode,
    symlinkMessage,
    nonFileCode,
    nonFileMessage,
    onMissing
  } = options;
  const absPath = path.resolve(repoRoot, pathName);
  let realRepoRoot;
  let realPath;
  try {
    [realRepoRoot, realPath] = await Promise.all([realpath(repoRoot), realpath(absPath)]);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    pushFailure(report, issueSummary, missingCode, `${missingMessage}: ${pathName}`, { path: pathName });
    onMissing?.();
    return null;
  }

  if (!isInsidePath(realRepoRoot, realPath)) {
    pushFailure(report, issueSummary, symlinkCode, `${symlinkMessage}: ${pathName}`, {
      path: pathName,
      target: realPath
    });
    onMissing?.();
    return null;
  }

  const targetStat = await stat(realPath);
  if (!targetStat.isFile()) {
    pushFailure(report, issueSummary, nonFileCode, `${nonFileMessage}: ${pathName}`, {
      path: pathName,
      target: realPath
    });
    onMissing?.();
    return null;
  }

  return readFile(realPath, 'utf8');
}

async function loadJson(absPath, label) {
  const raw = await readFile(absPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function pushFailure(report, issueSummary, code, message, details = {}) {
  const failure = {
    issue: issueSummary?.identifier ?? null,
    code,
    message,
    ...details
  };
  report.failures.push(failure);
  if (issueSummary) {
    issueSummary.failures.push(failure);
  }
}

function isDoneState(value) {
  return DONE_STATE_NAMES.has(String(value ?? '').trim().toLowerCase());
}

function normalizeTaskStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isTerminalTaskStatus(value) {
  return TERMINAL_TASK_STATUSES.has(normalizeTaskStatus(value));
}

function normalizeCheckName(value) {
  return String(value ?? '').trim();
}

function normalizeCheckState(check) {
  return String(check?.conclusion ?? check?.state ?? '').trim().toUpperCase();
}

function validateMergedPrEvidence(report, issueSummary, issue, requiredChecks) {
  if (requiredChecks.length === 0) {
    pushFailure(
      report,
      issueSummary,
      'required_pr_checks_not_configured',
      'Stale mirror implementation entries require at least one required PR check name.'
    );
  }

  const pr = issue?.pr;
  if (!pr || typeof pr !== 'object') {
    pushFailure(report, issueSummary, 'missing_pr_evidence', 'Done implementation issue is missing merged PR evidence.');
    return;
  }
  if (String(pr.state ?? '').trim().toUpperCase() !== 'MERGED') {
    pushFailure(report, issueSummary, 'pr_not_merged', 'Done implementation issue PR evidence is not MERGED.', {
      pr_state: pr.state ?? null,
      pr_url: pr.url ?? null
    });
  }
  if (!pr.url || !pr.merged_at || !pr.merge_commit) {
    pushFailure(report, issueSummary, 'pr_evidence_incomplete', 'Merged PR evidence must include url, merged_at, and merge_commit.', {
      pr_url: pr.url ?? null
    });
  }

  const checks = Array.isArray(pr.checks) ? pr.checks : [];
  for (const checkName of requiredChecks) {
    const found = checks.find((check) => normalizeCheckName(check?.name) === checkName);
    if (!found) {
      pushFailure(report, issueSummary, 'missing_required_pr_check', `Merged PR evidence is missing required check '${checkName}'.`, {
        pr_url: pr.url ?? null,
        check: checkName
      });
      continue;
    }
    const state = normalizeCheckState(found);
    if (!SUCCESSFUL_CHECK_STATES.has(state)) {
      pushFailure(report, issueSummary, 'required_pr_check_not_green', `Required PR check '${checkName}' is not green.`, {
        pr_url: pr.url ?? null,
        check: checkName,
        state
      });
    }
  }
}

function normalizeWaivers(waivers) {
  if (!Array.isArray(waivers)) {
    return [];
  }
  return waivers
    .map((waiver) => ({
      ...waiver,
      path: normalizeRepoPath(waiver?.path),
      evidence: Array.isArray(waiver?.evidence)
        ? waiver.evidence.map(normalizeLine).filter(Boolean)
        : [],
      line_texts: Array.isArray(waiver?.line_texts) ? waiver.line_texts.map(normalizeLine) : []
    }))
    .filter((waiver) => waiver.path);
}

function validateWaiverMetadata(report, issueSummary, waiver) {
  const missingFields = [];
  if (!normalizeLine(waiver.reason)) {
    missingFields.push('reason');
  }
  if (!normalizeLine(waiver.reviewed_at)) {
    missingFields.push('reviewed_at');
  }
  if (!Array.isArray(waiver.evidence) || waiver.evidence.length === 0) {
    missingFields.push('evidence');
  }
  if (missingFields.length === 0) {
    return;
  }
  pushFailure(
    report,
    issueSummary,
    'stale_mirror_waiver_incomplete',
    'Stale-mirror waivers must include reason, reviewed_at, and local or remote evidence.',
    {
      path: waiver.path,
      missing_fields: missingFields
    }
  );
}

function findHashWaiver(pathName, rows, waivers) {
  const rowHash = hashPendingRows(rows);
  return waivers.find(
    (waiver) =>
      waiver.path === pathName &&
      waiver.scope === 'pending_rows_hash' &&
      Number(waiver.pending_rows_count) === rows.length &&
      waiver.pending_rows_sha256 === rowHash
  );
}

function findLineWaiver(pathName, row, waivers) {
  return waivers.find(
    (waiver) =>
      waiver.path === pathName &&
      Array.isArray(waiver.line_texts) &&
      waiver.line_texts.includes(row.text)
  );
}

function collectHashWaiverMismatches(pathName, rows, waivers) {
  const hashWaivers = waivers.filter((waiver) => waiver.path === pathName && waiver.scope === 'pending_rows_hash');
  if (hashWaivers.length === 0) {
    return [];
  }
  const currentHash = hashPendingRows(rows);
  return hashWaivers
    .filter(
      (waiver) =>
        Number(waiver.pending_rows_count) !== rows.length || waiver.pending_rows_sha256 !== currentHash
    )
    .map((waiver) => ({
      path: pathName,
      expected_count: Number(waiver.pending_rows_count),
      actual_count: rows.length,
      expected_sha256: waiver.pending_rows_sha256 ?? null,
      actual_sha256: currentHash,
      reason: waiver.reason ?? null
    }));
}

async function loadOptionalTaskIndexRows(repoRoot, report) {
  const absPath = path.resolve(repoRoot, TASKS_INDEX_PATH);
  let realRepoRoot;
  let realPath;
  try {
    [realRepoRoot, realPath] = await Promise.all([realpath(repoRoot), realpath(absPath)]);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  if (!isInsidePath(realRepoRoot, realPath)) {
    report.failures.push({
      issue: null,
      code: 'tasks_index_symlink_escape',
      message: `${TASKS_INDEX_PATH} resolves outside the repository.`,
      path: TASKS_INDEX_PATH,
      target: realPath
    });
    return [];
  }

  const targetStat = await stat(realPath);
  if (!targetStat.isFile()) {
    report.failures.push({
      issue: null,
      code: 'tasks_index_non_file_target',
      message: `${TASKS_INDEX_PATH} is not a regular file.`,
      path: TASKS_INDEX_PATH,
      target: realPath
    });
    return [];
  }

  try {
    const data = JSON.parse(await readFile(realPath, 'utf8'));
    if (!Array.isArray(data?.items)) {
      throw Object.assign(
        new Error(`${realPath} has unexpected shape: missing or non-array items.`),
        { code: 'TASKS_INDEX_INVALID_SHAPE' }
      );
    }
    return data.items;
  } catch (error) {
    const invalidShape = error?.code === 'TASKS_INDEX_INVALID_SHAPE';
    report.failures.push({
      issue: null,
      code: invalidShape ? 'tasks_index_invalid_shape' : 'tasks_index_invalid_json',
      message: invalidShape
        ? `${TASKS_INDEX_PATH} has unexpected shape: ${error.message}`
        : `${TASKS_INDEX_PATH} is not valid JSON: ${error.message}`,
      path: TASKS_INDEX_PATH
    });
    return [];
  }
}

function taskIndexRowMatchesIssue(task, issueSummary) {
  const sourceIssue = task?.source_issue;
  const linearId = normalizeLine(issueSummary.linear_id);
  const identifier = normalizeLine(issueSummary.identifier);
  if (sourceIssue && typeof sourceIssue === 'object') {
    if (
      (linearId && normalizeLine(sourceIssue.id) === linearId) ||
      (identifier && normalizeLine(sourceIssue.identifier) === identifier)
    ) {
      return true;
    }
  }

  const taskId = normalizeLine(task?.id);
  const relatesTo = normalizeLine(task?.relates_to);
  const lowerLinearId = linearId.toLowerCase();
  if (
    lowerLinearId &&
    [taskId, relatesTo].some((value) => lineContainsTokenCaseInsensitive(value, lowerLinearId))
  ) {
    return true;
  }
  return Boolean(
    identifier &&
      [taskId, relatesTo].some((value) => lineContainsTokenCaseInsensitive(value, identifier))
  );
}

function validateTaskIndexRows(report, issueSummary, taskIndexRows) {
  if (!isDoneState(issueSummary.linear_state)) {
    return;
  }

  for (const task of taskIndexRows) {
    if (!taskIndexRowMatchesIssue(task, issueSummary)) {
      continue;
    }
    const status = normalizeTaskStatus(task?.status);
    if (isTerminalTaskStatus(status)) {
      continue;
    }
    const rowSummary = {
      task_id: normalizeLine(task?.id) || null,
      status: status || null
    };
    issueSummary.task_index_nonterminal_rows.push(rowSummary);
    pushFailure(
      report,
      issueSummary,
      'done_issue_nonterminal_task_index_row',
      'Done issue has a matching tasks/index.json row with nonterminal status.',
      rowSummary
    );
  }
}

async function validateMirrorPath(repoRoot, report, issueSummary, pathName, waivers) {
  const content = await readCheckedRepoFile(repoRoot, pathName, report, issueSummary, {
    missingCode: 'missing_mirror_path',
    missingMessage: 'Mirror path is missing',
    symlinkCode: 'mirror_path_symlink_escape',
    symlinkMessage: 'Mirror path resolves outside the repository',
    nonFileCode: 'mirror_path_non_file_target',
    nonFileMessage: 'Mirror path is not a regular file',
    onMissing: () => issueSummary.missing_mirror_paths.push(pathName)
  });
  if (content === null) {
    return;
  }

  const pendingRows = collectPendingRows(content, { pathName, issueSummary });
  const hashWaiver = pendingRows.length > 0 ? findHashWaiver(pathName, pendingRows, waivers) : null;
  const mismatches = collectHashWaiverMismatches(pathName, pendingRows, waivers);
  issueSummary.waiver_mismatches.push(...mismatches);

  for (const mismatch of mismatches) {
    pushFailure(report, issueSummary, 'stale_mirror_waiver_mismatch', 'A hash-bound stale-mirror waiver no longer matches current pending rows.', mismatch);
  }

  for (const row of pendingRows) {
    const lineWaiver = hashWaiver ? null : findLineWaiver(pathName, row, waivers);
    const waiver = hashWaiver ?? lineWaiver;
    const rowSummary = {
      path: pathName,
      line: row.line,
      text: row.text,
      waived: Boolean(waiver),
      waiver_reason: waiver?.reason ?? null
    };
    issueSummary.pending_rows.push(rowSummary);
    if (!waiver) {
      pushFailure(report, issueSummary, 'unwaived_pending_closeout_row', 'Done issue mirror has an unwaived pending closeout row.', rowSummary);
    }
  }
}

async function validateLocalCloseoutPointers(repoRoot, report, issueSummary, issue) {
  const pointers = Array.isArray(issue.local_closeout_pointers)
    ? issue.local_closeout_pointers.map(normalizeRepoPath).filter(Boolean)
    : [];
  issueSummary.local_closeout_pointers = pointers;

  if (issueSummary.classification !== 'validation_only_provenance_gap') {
    return;
  }

  if (issue.pr_required !== false) {
    pushFailure(
      report,
      issueSummary,
      'validation_only_pr_requirement_unclear',
      'Validation-only Done entries must explicitly set pr_required=false.'
    );
  }

  if (pointers.length === 0) {
    pushFailure(
      report,
      issueSummary,
      'missing_local_closeout_pointer',
      'Validation-only Done entry has no local closeout pointer.'
    );
    return;
  }

  for (const pointer of pointers) {
    const content = await readCheckedRepoFile(repoRoot, pointer, report, issueSummary, {
      missingCode: 'missing_local_closeout_pointer',
      missingMessage: 'Local closeout pointer is missing',
      symlinkCode: 'local_closeout_pointer_symlink_escape',
      symlinkMessage: 'Local closeout pointer resolves outside the repository',
      nonFileCode: 'local_closeout_pointer_non_file_target',
      nonFileMessage: 'Local closeout pointer is not a regular file'
    });
    if (content === null) {
      continue;
    }
    if (!content.trim()) {
      pushFailure(report, issueSummary, 'empty_local_closeout_pointer', `Local closeout pointer is empty: ${pointer}`, {
        path: pointer
      });
    }
  }
}

async function validateIssue(repoRoot, report, issue, requiredChecks, taskIndexRows) {
  const issueSummary = {
    identifier: String(issue?.identifier ?? '').trim(),
    linear_id: String(issue?.linear_id ?? '').trim(),
    classification: String(issue?.classification ?? '').trim(),
    linear_state: String(issue?.linear_state ?? '').trim(),
    mirror_paths: [],
    local_closeout_pointers: [],
    pending_rows: [],
    missing_mirror_paths: [],
    invalid_mirror_paths: [],
    waiver_mismatches: [],
    task_index_nonterminal_rows: [],
    failures: []
  };
  report.issues.push(issueSummary);

  if (!issueSummary.identifier || !issueSummary.linear_id) {
    pushFailure(report, issueSummary, 'issue_identity_incomplete', 'Manifest issue entry must include identifier and linear_id.');
  }
  if (!VALID_CLASSIFICATIONS.has(issueSummary.classification)) {
    pushFailure(report, issueSummary, 'invalid_classification', 'Manifest issue entry has an invalid classification.', {
      classification: issueSummary.classification
    });
  }
  if (!isDoneState(issueSummary.linear_state)) {
    pushFailure(report, issueSummary, 'issue_not_done', 'Manifest issue entry is not marked as Linear Done/completed.', {
      linear_state: issueSummary.linear_state
    });
  }
  if (issueSummary.classification === 'true_follow_up_needed') {
    pushFailure(report, issueSummary, 'true_follow_up_needed', 'Done issue is classified as requiring follow-up and must not be silently waived.');
  }
  if (issueSummary.classification === 'stale_mirror_only') {
    validateMergedPrEvidence(report, issueSummary, issue, requiredChecks);
  }

  const { paths: mirrorPaths, invalidPaths } = normalizePathList(issue?.mirror_paths);
  issueSummary.mirror_paths = mirrorPaths;
  issueSummary.invalid_mirror_paths = invalidPaths;
  for (const invalidPath of invalidPaths) {
    pushFailure(report, issueSummary, 'invalid_mirror_path', 'Mirror path must be a relative path inside the repository.', {
      path: invalidPath
    });
  }
  if (issueSummary.classification === 'stale_mirror_only' && mirrorPaths.length === 0) {
    pushFailure(
      report,
      issueSummary,
      'stale_mirror_paths_missing',
      'Stale-mirror Done entries must include at least one valid local mirror path to scan.'
    );
  }
  const waivers = normalizeWaivers(issue?.waivers);
  for (const waiver of waivers) {
    validateWaiverMetadata(report, issueSummary, waiver);
  }

  validateTaskIndexRows(report, issueSummary, taskIndexRows);

  for (const mirrorPath of mirrorPaths) {
    await validateMirrorPath(repoRoot, report, issueSummary, mirrorPath, waivers);
  }

  await validateLocalCloseoutPointers(repoRoot, report, issueSummary, issue);
}

function normalizeTaskIndexOnlyIssues(issues) {
  if (!Array.isArray(issues)) {
    return [];
  }
  return issues
    .map((issue) => ({
      identifier: normalizeLine(issue?.identifier),
      linear_id: normalizeLine(issue?.linear_id),
      linear_state: normalizeLine(issue?.linear_state) || 'Done',
      classification: 'task_index_only',
      mirror_paths: [],
      waivers: []
    }))
    .filter((issue) => issue.identifier || issue.linear_id);
}

export async function runDoneCloseoutProvenanceCheck(repoRoot, options = {}) {
  const manifestPath = normalizeRepoPath(options.manifestPath ?? DEFAULT_MANIFEST_PATH);
  if (!manifestPath) {
    throw new Error('Manifest path must be a relative repo path.');
  }
  const absoluteManifestPath = path.resolve(repoRoot, manifestPath);
  if (!(await pathExists(absoluteManifestPath))) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = await loadJson(absoluteManifestPath, manifestPath);
  const manifestIssues = Array.isArray(manifest?.issues) ? manifest.issues : [];
  const taskIndexOnlyIssues = normalizeTaskIndexOnlyIssues(options.taskIndexIssues);
  const issues = [...manifestIssues, ...taskIndexOnlyIssues];
  const requiredChecks = Array.isArray(manifest?.required_pr_checks)
    ? manifest.required_pr_checks.map(normalizeCheckName).filter(Boolean)
    : [];

  const report = {
    status: 'succeeded',
    ok: true,
    manifest_path: manifestPath,
    generated_at: new Date().toISOString(),
    totals: {
      issues: issues.length,
      pending_rows: 0,
      waived_pending_rows: 0,
      unwaived_pending_rows: 0,
      missing_mirror_paths: 0,
      invalid_mirror_paths: 0,
      missing_local_closeout_pointers: 0,
      waiver_mismatches: 0,
      task_index_nonterminal_rows: 0,
      failures: 0
    },
    issues: [],
    failures: []
  };

  const taskIndexRows = await loadOptionalTaskIndexRows(repoRoot, report);

  if (manifest?.version !== 1) {
    report.failures.push({
      issue: null,
      code: 'invalid_manifest_version',
      message: 'Manifest version must be 1.'
    });
  }
  if (issues.length === 0) {
    report.failures.push({
      issue: null,
      code: 'manifest_has_no_issues',
      message: 'Manifest must contain at least one issue entry.'
    });
  }

  for (const issue of issues) {
    await validateIssue(repoRoot, report, issue, requiredChecks, taskIndexRows);
  }

  report.totals.pending_rows = report.issues.reduce((sum, issue) => sum + issue.pending_rows.length, 0);
  report.totals.waived_pending_rows = report.issues.reduce(
    (sum, issue) => sum + issue.pending_rows.filter((row) => row.waived).length,
    0
  );
  report.totals.unwaived_pending_rows = report.issues.reduce(
    (sum, issue) => sum + issue.pending_rows.filter((row) => !row.waived).length,
    0
  );
  report.totals.missing_mirror_paths = report.issues.reduce(
    (sum, issue) => sum + issue.missing_mirror_paths.length,
    0
  );
  report.totals.invalid_mirror_paths = report.issues.reduce(
    (sum, issue) => sum + issue.invalid_mirror_paths.length,
    0
  );
  report.totals.missing_local_closeout_pointers = report.failures.filter(
    (failure) => failure.code === 'missing_local_closeout_pointer'
  ).length;
  report.totals.waiver_mismatches = report.issues.reduce(
    (sum, issue) => sum + issue.waiver_mismatches.length,
    0
  );
  report.totals.task_index_nonterminal_rows = report.issues.reduce(
    (sum, issue) => sum + issue.task_index_nonterminal_rows.length,
    0
  );
  report.totals.failures = report.failures.length;
  report.ok = report.failures.length === 0;
  report.status = report.ok ? 'succeeded' : 'failed';

  const reportPath = normalizeRepoPath(
    options.reportPath ??
      path.posix.join(
        path.relative(repoRoot, options.outRoot ?? path.resolve(repoRoot, 'out')).replace(/\\/g, '/') || 'out',
        options.taskId ?? '0101',
        DEFAULT_REPORT_NAME
      )
  );
  if (!reportPath) {
    throw new Error('Report path must be a relative repo path.');
  }
  report.report_path = reportPath;
  await mkdir(path.dirname(path.resolve(repoRoot, reportPath)), { recursive: true });
  await writeFile(path.resolve(repoRoot, reportPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return { report, hasFailures: !report.ok };
}

async function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'help') || hasFlag(args, 'h')) {
    showUsage();
    return;
  }

  const knownFlags = new Set([
    'manifest',
    'report',
    'issue-id',
    'issue-identifier',
    'issue-state',
    'format',
    'warn',
    'check',
    'h',
    'help'
  ]);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    process.exitCode = 2;
    return;
  }

  const { repoRoot, outRoot, taskId } = resolveEnvironmentPaths();
  const taskIndexIssue =
    typeof args['issue-id'] === 'string' || typeof args['issue-identifier'] === 'string'
      ? [
          {
            linear_id: typeof args['issue-id'] === 'string' ? args['issue-id'] : '',
            identifier: typeof args['issue-identifier'] === 'string' ? args['issue-identifier'] : '',
            linear_state: typeof args['issue-state'] === 'string' ? args['issue-state'] : 'Done'
          }
        ]
      : [];
  const { report, hasFailures } = await runDoneCloseoutProvenanceCheck(repoRoot, {
    manifestPath: typeof args.manifest === 'string' ? args.manifest : DEFAULT_MANIFEST_PATH,
    reportPath: typeof args.report === 'string' ? args.report : null,
    outRoot,
    taskId,
    taskIndexIssues: taskIndexIssue
  });

  if (args.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const status = report.ok ? 'ok' : 'failed';
    console.log(
      `done-closeout:check ${status} - issues=${report.totals.issues} pending=${report.totals.pending_rows} waived=${report.totals.waived_pending_rows} failures=${report.totals.failures}`
    );
    console.log(`- report: ${report.report_path}`);
    for (const failure of report.failures.slice(0, 10)) {
      const issue = failure.issue ? `${failure.issue}: ` : '';
      console.log(`- ${issue}${failure.code}: ${failure.message}`);
    }
    if (report.failures.length > 10) {
      console.log(`- ... ${report.failures.length - 10} more failures`);
    }
  }

  if (hasFailures && !hasFlag(args, 'warn')) {
    process.exitCode = 1;
  }
}

const executedScriptUrl = process.argv[1] ? pathToFileURL(realpathSync(path.resolve(process.argv[1]))).href : null;

if (executedScriptUrl && import.meta.url === executedScriptUrl) {
  main().catch((error) => {
    console.error(`[done-closeout:check] ${error.message}`);
    process.exitCode = 1;
  });
}
