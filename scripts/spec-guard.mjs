#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { computeAgeInDays, parseIsoDate } from './lib/docs-helpers.js';
import { maybeLoadDocsCatalog, resolveDocsCatalogEntry } from './lib/docs-catalog.js';

const execFileAsync = promisify(execFile);
const ARCHIVE_STUB_MARKER = '<!-- docs-archive:stub -->';
const ALLOWED_FALLBACK_DECISIONS = new Set([
  'remove fallback',
  'expire fallback',
  'justify retaining fallback'
]);
function fallbackTouchTokenPattern(standaloneTokenPattern, prefixedTokenPattern = standaloneTokenPattern) {
  const tokenEndBoundary = '(?=$|[^A-Za-z0-9]|[A-Z][a-z])';
  return new RegExp(
    `(?:^|[^A-Za-z0-9])(?:${standaloneTokenPattern})${tokenEndBoundary}|[A-Za-z0-9](?:${prefixedTokenPattern})${tokenEndBoundary}`
  );
}

const FALLBACK_DECISION_SOURCE_TYPES = new Set([
  'PRD',
  'TECH_SPEC',
  'ACTION_PLAN',
  'task checklist'
]);
const FALLBACK_TOUCH_PATTERNS = [
  /fallback/i,
  /\bfall back\b/i,
  /legacy/i,
  /\bcached\b/i,
  fallbackTouchTokenPattern('break[-_\\s]glass|[Bb]reakGlass|BREAK_GLASS', 'BreakGlass|BREAK_GLASS'),
  /\bcompat(?:ibility)?\b/i,
  fallbackTouchTokenPattern(
    '[Cc]ompat(?:ibility)?|COMPAT(?:IBILITY)?',
    'Compat(?:ibility)?|COMPAT(?:IBILITY)?'
  ),
  fallbackTouchTokenPattern('minor[-_\\s]seam|[Mm]inorSeam|MINOR_SEAM', 'MinorSeam|MINOR_SEAM'),
  fallbackTouchTokenPattern('[Ss]eam|SEAM', 'Seam|SEAM'),
  /\bstale\b/i,
  fallbackTouchTokenPattern(
    'last[-_\\s]known[-_\\s]good|[Ll]astKnownGood|LAST_KNOWN_GOOD',
    'LastKnownGood|LAST_KNOWN_GOOD'
  ),
  fallbackTouchTokenPattern('last[-_\\s]known|[Ll]astKnown|LAST_KNOWN', 'LastKnown|LAST_KNOWN')
];
const GOVERNED_FALLBACK_SURFACE_PATHS = [
  'orchestrator/src/cli/control/providerIssueHandoff.ts',
  'scripts/lib/review-launch-attempt.ts',
  'scripts/run-review.ts',
  'docs/standalone-review-guide.md',
  'orchestrator/src/cli/runtime/provider.ts',
  'orchestrator/src/cli/runtime/codexCommand.ts',
  'scripts/runtime-mode-canary.mjs',
  'scripts/docs-freshness-maintain.mjs',
  'docs/guides/docs-freshness-cohorts.md',
  'orchestrator/src/cli/control/compatibilityIssuePresenter.ts',
  'orchestrator/src/cli/control/providerIssueObservability.ts',
  'orchestrator/src/cli/control/selectedRunProjection.ts',
  'orchestrator/src/cli/control/controlRuntime.ts'
];
const REQUIRED_TEMPORARY_FALLBACK_COLUMNS = [
  'owner',
  'trigger',
  'introduced date',
  'review date',
  'maximum lifetime',
  'removal condition',
  'validation'
];
const REQUIRED_FALLBACK_SEAM_COLUMNS = ['fallback / seam', 'fallback/seam', 'fallback'];
const REQUIRED_OWNER_REFERENCES = ['CO-394', 'CO-395', 'CO-396', 'CO-397', 'CO-398'];
const PLACEHOLDER_FALLBACK_VALUES = new Set([
  'tbd',
  'to be determined',
  'pending',
  'unknown',
  'todo',
  'later',
  'not recorded',
  'not available',
  'unavailable',
  'future cleanup',
  'future follow up',
  'future followup',
  'future issue',
  'future owner'
]);
const WEAK_EVIDENCE_VALUE_PATTERN = String.raw`(?:false|no|n|denied|unapproved|not granted|not recorded|not approved|not applicable|not available|unavailable|not ready|not yet ready|missing|absent|none|n\/a|na|pending|unknown|tbd|to be determined|todo|later|not planned|not complete|incomplete|not finalized|not linked|not started|unplanned|blocked|deferred)`;
const WEAK_OR_BRACKETED_EVIDENCE_VALUE_PATTERN = String.raw`(?:${WEAK_EVIDENCE_VALUE_PATTERN}(?:\b|[.)])|\[(?:${WEAK_EVIDENCE_VALUE_PATTERN})(?:[^\]]*)?\])`;
const HIGH_CHURN_FALLBACK_SURFACES = [
  'provider workflow',
  'review wrapper',
  'runtime routing',
  'docs freshness',
  'control-host status',
  'control host status'
];

function hasNegatedExternalMigrationSignal(content) {
  return (
    /\b(?:no|without|lacks?|missing|absent|not)\s+(?:a\s+|an\s+)?(?:external ecosystem|ecosystem migration|external migration|release compatibility)(?:\s+(?:migration|bridge))?\b/.test(
      content
    ) ||
    /\b(?:external ecosystem|ecosystem migration|external migration|release compatibility)(?:\s+(?:migration|bridge))?\s*[:=-]?\s*(?:false|no|none|not applicable|not available|unavailable|not planned)\b/.test(
      content
    )
  );
}

function hasExternalMigrationSignal(content) {
  if (hasNegatedExternalMigrationSignal(content)) {
    return false;
  }
  return /\b(external ecosystem|ecosystem migration|external migration|release compatibility)\b/.test(content);
}

function hasNegatedReviewerApprovalEvidence(content) {
  return (
    /\b(?:no|without|lacks?|missing|absent|not)\s+(?:\w+\s+){0,3}reviewer (?:approval|approved)\b/.test(content) ||
    /\b(?:no|without|lacks?|missing|absent|not)\s+(?:\w+\s+){0,3}approved by reviewer\b/.test(content) ||
    /\breviewer\s+(?:did\s+)?not\s+approve\b/.test(content) ||
    new RegExp(
      String.raw`\b(?:reviewer approval(?: (?:granted|recorded|approved))?|reviewer approved|approved by reviewer)\s*[:=-]?\s*${WEAK_OR_BRACKETED_EVIDENCE_VALUE_PATTERN}`
    ).test(content) ||
    /\breviewer (?:approval|approved)(?:\s+\w+){0,3}\s+(?:absent|missing|denied|unapproved|not granted|not recorded)\b/.test(
      content
    )
  );
}

function hasWeakReviewerApprovalEvidence(content) {
  return /\b(?:reviewer approval(?: (?:granted|recorded|approved))?|reviewer approved|approved by reviewer)\s*[:=-]\s*(?:$|[;,.])/.test(
    content
  );
}

function hasAffirmativeReviewerApprovalEvidence(content) {
  if (hasNegatedReviewerApprovalEvidence(content)) {
    return false;
  }
  return /\b(reviewer approval (?:granted|recorded|approved)|reviewer approved|approved by reviewer)\b/.test(content);
}

function hasNegatedDeprecationPlanEvidence(content) {
  return (
    /\b(?:no|without|lacks?|missing|absent|not)\s+(?:\w+\s+){0,3}deprecation plan\b/.test(content) ||
    /\bdeprecation plan\s*[:=-]?\s*(?:is\s+)?(?:absent|missing|denied|unapproved|not granted|not recorded|not approved|not in place|not available|not planned|not ready|not yet ready|not complete|not finalized|not linked|not started|unplanned)\b/.test(
      content
    )
  );
}

function hasWeakDeprecationPlanEvidence(content) {
  return (
    /\bdeprecation plan\s*[:=-]\s*(?:$|[;,.])/.test(content) ||
    new RegExp(
      String.raw`\bdeprecation plan\s*[:=-]?\s*(?:is\s+)?${WEAK_OR_BRACKETED_EVIDENCE_VALUE_PATTERN}`
    ).test(content) ||
    /\bdeprecation plan\s*[:=-]?\s*(?:is\s+)?(?:unrecorded|unconfirmed)\b/.test(content)
  );
}

function hasDeprecationPlanEvidence(content) {
  if (hasNegatedDeprecationPlanEvidence(content) || hasWeakDeprecationPlanEvidence(content)) {
    return false;
  }
  return (
    /\bhas (?:a |an )?deprecation plan\b/.test(content) ||
    /\bdeprecation plan (?:exists|recorded|approved|published|linked|available|complete|in place)\b/.test(content) ||
    /\bdeprecation plan\s*[:=-]\s*(?!(?:tbd|to be determined|pending|unknown|todo|later|unrecorded|unconfirmed|false|none|no|n\/a|na|not applicable|not approved|not in place|not available|unavailable|not planned|not ready|not yet ready|not complete|incomplete|not finalized|not linked|not started|unplanned|blocked|deferred)\b).{4,}/.test(
      content
    )
  );
}

function hasDeprecationPlanEvidenceInCells(cells) {
  const content = cells.join(' ');
  if (
    hasNegatedDeprecationPlanEvidence(content) ||
    cells.some((cell) => hasNegatedDeprecationPlanEvidence(cell) || hasWeakDeprecationPlanEvidence(cell))
  ) {
    return false;
  }
  return cells.some(hasDeprecationPlanEvidence);
}

function hasAffirmativeReviewerApprovalEvidenceInCells(cells) {
  const content = cells.join(' ');
  if (
    hasNegatedReviewerApprovalEvidence(content) ||
    cells.some((cell) => hasNegatedReviewerApprovalEvidence(cell) || hasWeakReviewerApprovalEvidence(cell))
  ) {
    return false;
  }
  return cells.some(hasAffirmativeReviewerApprovalEvidence);
}

function getFallbackSeamValue(row) {
  const column = REQUIRED_FALLBACK_SEAM_COLUMNS.find((candidate) => candidate in row);
  return column ? row[column] : '';
}

function getFallbackScopeCells(row) {
  return [row.surface, getFallbackSeamValue(row), row.owner, row.trigger].filter((cell) => String(cell ?? '').trim().length > 0);
}

function hasExternalMigrationApprovalEvidence(row) {
  const cells = getFallbackScopeCells(row).map((cell) => normalizePolicyEvidenceCell(cell));
  const content = cells.join(' ');
  const ownerCell = normalizePolicyEvidenceText(row.owner ?? '');
  return (
    /\bco[-\s]\d+\b/.test(ownerCell) &&
    hasDeprecationPlanEvidenceInCells(cells) &&
    hasAffirmativeReviewerApprovalEvidenceInCells(cells)
  );
}

const FALLBACK_EXPIRY_CAPS = [
  {
    label: 'security/auth/PII/customer-impact fallback',
    reviewDays: 7,
    maximumLifetimeDays: 14,
    matches: (content) =>
      /\b(security|auth|pii|customer[-_\s]?impact(?:ing)?|financial|production[-_\s]?impact)\b/.test(content)
  },
  {
    label: 'external ecosystem migration fallback',
    reviewDays: 30,
    maximumLifetimeDays: 90,
    matches: (content, row) => hasExternalMigrationSignal(content) && hasExternalMigrationApprovalEvidence(row)
  },
  {
    label: 'high-churn control surface fallback',
    reviewDays: 14,
    maximumLifetimeDays: 30,
    matches: (content) => HIGH_CHURN_FALLBACK_SURFACES.some((surface) => content.includes(surface))
  },
  {
    label: 'general repo fallback',
    reviewDays: 30,
    maximumLifetimeDays: 60,
    matches: () => true
  }
];
const GIT_DIFF_TEXT_MAX_BUFFER = 64 * 1024 * 1024;
const INACTIVE_SPEC_STATUSES = new Set([
  'archived',
  'canceled',
  'cancelled',
  'closed',
  'completed',
  'deprecated',
  'done',
  'succeeded'
]);
const SPEC_FRESHNESS_CADENCE_DAYS = 30;

/**
 * Print usage information and available command-line options for the spec-guard script.
 *
 * Describes the checks the script performs (tracked implementation/migration changes require a spec update in tasks/specs, docs/design/specs, or tasks/index.json; spec last_review dates must be within 30 days) and documents the supported options (--dry-run, -h/--help).
 */
function showUsage() {
  console.log(`Usage: node scripts/spec-guard.mjs [--dry-run]

Ensures that implementation changes adhere to Codex-Orchestrator spec guardrails.
Checks include:
  • Tracked implementation/migration edits must accompany a spec update under tasks/specs, docs/design/specs, or tasks/index.json
  • Active spec last_review dates under tasks/specs and docs/design/specs must be ≤30 days old

Options:
  --dry-run   Report failures without exiting non-zero
  -h, --help  Show this help message`);
}

async function verifyGitRef(ref) {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', ref]);
    return true;
  } catch {
    return false;
  }
}

async function resolveBaseRef() {
  const envBase = process.env.BASE_SHA;
  if (envBase && (await verifyGitRef(envBase))) {
    return envBase;
  }

  const defaultRef = 'origin/main';
  if (await verifyGitRef(defaultRef)) {
    return defaultRef;
  }

  const { stdout } = await execFileAsync('git', ['rev-list', '--max-parents=0', 'HEAD']);
  const commits = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (commits.length === 0) {
    throw new Error('Unable to locate repository history for spec guard.');
  }
  return commits[commits.length - 1] || 'HEAD';
}

async function runGitDiff(args) {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--name-only', ...args]);
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function listChangedFiles(baseRef) {
  const symmetric = await runGitDiff([`${baseRef}...HEAD`]);
  if (symmetric.length > 0) {
    return symmetric;
  }
  return runGitDiff(['HEAD~1..HEAD']);
}

async function runGitDiffText(args) {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--unified=0', '--no-ext-diff', ...args], {
      maxBuffer: resolveGitDiffTextMaxBuffer()
    });
    return { failed: false, stdout };
  } catch {
    return { failed: true, stdout: '' };
  }
}

function resolveGitDiffTextMaxBuffer() {
  const configured = Number(process.env.SPEC_GUARD_DIFF_TEXT_MAX_BUFFER);
  return Number.isInteger(configured) && configured > 0 ? configured : GIT_DIFF_TEXT_MAX_BUFFER;
}

const CODE_PATH_PREFIXES = [
  'src/',
  'app/',
  'server/',
  'orchestrator/src/',
  'packages/orchestrator/src/',
  'packages/shared/',
  'adapters/',
  'evaluation/harness/',
  'migrations/',
  'db/migrations/',
  'prisma/migrations/'
];

function isCodePath(file) {
  return CODE_PATH_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function isSpecPath(file) {
  return (
    file.startsWith('tasks/specs/') ||
    file.startsWith('docs/design/specs/') ||
    file === 'tasks/index.json'
  );
}

function isGovernedFallbackSurface(file) {
  const normalized = normalizeSpecFilePath(file);
  return GOVERNED_FALLBACK_SURFACE_PATHS.some((surfacePath) => normalized === surfacePath);
}

function isFallbackBehaviorScanCandidate(file) {
  const normalized = normalizeSpecFilePath(file);
  return (
    isCodePath(normalized) ||
    normalized.startsWith('bin/') ||
    normalized.startsWith('scripts/') ||
    isGovernedFallbackSurface(normalized)
  );
}

function containsFallbackTouchPattern(value) {
  return FALLBACK_TOUCH_PATTERNS.some((pattern) => pattern.test(value));
}

function classifyFallbackDecisionSource(file) {
  const normalized = normalizeSpecFilePath(file);
  if (/^docs\/PRD-[^/]+\.md$/.test(normalized)) {
    return 'PRD';
  }
  if (
    /^docs\/TECH_SPEC-[^/]+\.md$/.test(normalized) ||
    /^docs\/design\/specs\/[^/]+\.md$/.test(normalized) ||
    /^tasks\/specs\/[^/]+\.md$/.test(normalized)
  ) {
    return 'TECH_SPEC';
  }
  if (/^docs\/ACTION_PLAN-[^/]+\.md$/.test(normalized)) {
    return 'ACTION_PLAN';
  }
  if (/^tasks\/tasks-[^/]+\.md$/.test(normalized) || /^\.agent\/task\/[^/]+\.md$/.test(normalized)) {
    return 'task checklist';
  }
  return null;
}

function normalizeDecisionText(value) {
  return String(value)
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizePolicyEvidenceText(value) {
  return String(value)
    .replace(/[`*]/g, '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizePolicyEvidenceCell(value) {
  return String(value)
    .replace(/[`*]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizePolicyDecisionLine(value) {
  return String(value)
    .replace(/[`*]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanTableCell(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/[`*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMarkdownListPrefix(value) {
  return String(value)
    .replace(/^\s*(?:(?:[-*+]|\d+[.)])\s*)?(?:\[[ xX]\]\s*)?/, '')
    .trim();
}

function splitMarkdownTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return [];
  }
  const cells = [];
  let current = '';
  let inCodeSpan = false;
  const body = trimmed.slice(1, -1);
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const next = body[index + 1];
    if (char === '\\' && next === '|') {
      current += '|';
      index += 1;
      continue;
    }
    if (char === '`') {
      inCodeSpan = !inCodeSpan;
      current += char;
      continue;
    }
    if (char === '|' && !inCodeSpan) {
      cells.push(cleanTableCell(current));
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(cleanTableCell(current));
  return cells;
}

function isMarkdownSeparatorRow(line) {
  const cells = splitMarkdownTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
}

function isMarkdownFenceLine(line) {
  return /^(`{3,}|~{3,})/.test(String(line).trim());
}

function extractMarkdownTableRows(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];
  let inFence = false;
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (isMarkdownFenceLine(lines[index])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const header = splitMarkdownTableRow(lines[index]);
    if (header.length === 0 || !isMarkdownSeparatorRow(lines[index + 1])) {
      continue;
    }

    const normalizedHeaders = header.map((cell) => normalizeDecisionText(cell));
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      if (isMarkdownFenceLine(lines[rowIndex])) {
        break;
      }
      const cells = splitMarkdownTableRow(lines[rowIndex]);
      if (cells.length === 0) {
        break;
      }
      const row = {};
      normalizedHeaders.forEach((name, cellIndex) => {
        row[name] = cells[cellIndex] ?? '';
      });
      rows.push(row);
    }
  }
  return rows;
}

function isFallbackDecisionRow(row) {
  if (!('decision' in row)) {
    return false;
  }
  const hasFallbackColumns =
    'surface' in row &&
    REQUIRED_FALLBACK_SEAM_COLUMNS.some((column) => column in row) &&
    REQUIRED_TEMPORARY_FALLBACK_COLUMNS.every((column) => column in row);
  return hasFallbackColumns;
}

function parseFallbackDecisionRows(content) {
  return extractMarkdownTableRows(content).filter(isFallbackDecisionRow);
}

function hasPlaceholderValue(value) {
  const normalized = String(value)
    .replace(/[`*]/g, '')
    .trim()
    .toLowerCase();
  const comparable = normalizePlaceholderComparable(value);
  const bracketedPlaceholder = comparable.match(/^\[([^\]]*)\]$/);
  const bracketedComparable = bracketedPlaceholder ? normalizePlaceholderComparable(bracketedPlaceholder[1]) : '';
  const isAnglePlaceholder =
    /^<.*>$/.test(normalized) && !/^<https?:\/\/[^>\s]+>$/.test(normalized);
  return (
    comparable.length === 0 ||
    comparable === '-' ||
    isPlaceholderComparable(comparable) ||
    (bracketedPlaceholder !== null && isPlaceholderComparable(bracketedComparable)) ||
    isAnglePlaceholder
  );
}

function normalizePlaceholderComparable(value) {
  return String(value)
    .replace(/[`*]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/, '')
    .trim()
    .toLowerCase();
}

function isPlaceholderComparable(comparable) {
  return (
    comparable.length === 0 ||
    comparable === '-' ||
    PLACEHOLDER_FALLBACK_VALUES.has(comparable) ||
    /^(?:n\/a|na|none|not applicable|tbd|to be determined|pending|unknown|todo|later|not recorded|not available|unavailable)(?:\b|[.)])/.test(
      comparable
    ) ||
    /^future (?:cleanup|follow ?up|issue|owner)\b/.test(comparable) ||
    /^cleanup later\b/.test(comparable)
  );
}

function cleanPolicyDecisionLabelValue(value) {
  return String(value).replace(/[.,;:]+$/, '').trim();
}

function extractIsoDate(value) {
  const match = String(value).match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (!match) {
    return null;
  }
  return parseIsoDate(match[0]);
}

function addUtcDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function resolveFallbackExpiryCap(row) {
  const normalizedRowContent = normalizePolicyEvidenceText(getFallbackScopeCells(row).join(' '));
  const matchingCaps = FALLBACK_EXPIRY_CAPS.filter((cap) => cap.matches(normalizedRowContent, row));
  const specificCaps = matchingCaps.filter((cap) => cap.label !== 'general repo fallback');
  const rankedCaps = specificCaps.length > 0 ? specificCaps : matchingCaps;
  rankedCaps.sort(
    (left, right) =>
      left.maximumLifetimeDays - right.maximumLifetimeDays || left.reviewDays - right.reviewDays
  );
  return rankedCaps[0] ?? FALLBACK_EXPIRY_CAPS[FALLBACK_EXPIRY_CAPS.length - 1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findLabeledValue(content, labels) {
  const labelPattern = labels.map(escapeRegExp).join('|');
  const pattern = new RegExp(`^(?:[-*]\\s*)?(?:\\*\\*)?(?:${labelPattern})(?:\\*\\*)?\\s*:\\s*(.+)$`, 'i');
  for (const line of String(content).split(/\r?\n/)) {
    const match = cleanTableCell(line).match(pattern);
    if (match && !hasPlaceholderValue(match[1])) {
      return match[1].trim();
    }
  }
  return null;
}

function resolveFallbackGuardToday() {
  const override = process.env.SPEC_GUARD_TODAY;
  const today = override ? parseIsoDate(override) : new Date();
  if (!today) {
    return new Date();
  }
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function findAllowedDecisions(value) {
  const normalized = normalizeDecisionText(value);
  return [...ALLOWED_FALLBACK_DECISIONS].filter((decision) => normalized.includes(decision));
}

function isExplanatoryNotApplicableFallbackPolicy(value) {
  const normalized = normalizeDecisionText(value).replace(/[.;:]+$/, '').trim();
  if (!normalized.startsWith('not applicable only when ')) {
    return false;
  }
  return (
    /\bno\b.*\b(?:fallback|seam)\b.*\b(?:changed|changes|touched|touches|modified|added|retained)\b/.test(
      normalized
    ) ||
    /\bdoes not\b.*\b(?:add|retain|touch|change|modify)\b.*\b(?:fallback|compatibility|legacy|cached|break[-\s]glass|seam)\b/.test(
      normalized
    )
  );
}

function hasNotApplicableFallbackDecisionLabel(content) {
  for (const rawLine of String(content).split(/\r?\n/)) {
    const line = stripMarkdownListPrefix(cleanTableCell(rawLine));
    const match = line.match(/^fallback\s*\/\s*refactor decision\s*:\s*(.+)$/i);
    const normalizedDecision = match ? normalizeDecisionText(match[1]).replace(/[.;:]+$/, '').trim() : '';
    if (/^not applicable\b/.test(normalizedDecision) && !isExplanatoryNotApplicableFallbackPolicy(normalizedDecision)) {
      return true;
    }
  }
  return false;
}

function isOwnerRoutingReferenceRow(row) {
  const rowContent = Object.values(row).join(' ');
  const normalizedRowContent = normalizeDecisionText(rowContent);
  const ownerReferenceCount = REQUIRED_OWNER_REFERENCES.filter((owner) => rowContent.includes(owner)).length;
  return (
    ownerReferenceCount > 1 &&
    (normalizedRowContent.includes('owner references') ||
      normalizedRowContent.includes('surface-specific cleanup') ||
      normalizedRowContent.includes('owner routing'))
  );
}

function getFallbackDecisionRowContent(row) {
  return Object.values(row).join('\n');
}

function hasCompleteOwnerRoutingReferences(row) {
  const rowContent = getFallbackDecisionRowContent(row);
  return REQUIRED_OWNER_REFERENCES.every((owner) => rowContent.includes(owner));
}

function detectFallbackTouchesFromDiff(diffText) {
  const touchedFiles = new Set();
  let currentFile = null;
  let currentDiffFiles = [];

  for (const line of diffText.split(/\r?\n/)) {
    const fileMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (fileMatch) {
      const oldFile = normalizeSpecFilePath(fileMatch[1]);
      const newFile = normalizeSpecFilePath(fileMatch[2]);
      currentFile = newFile;
      currentDiffFiles = [oldFile, newFile];
      for (const file of currentDiffFiles) {
        if (isFallbackBehaviorScanCandidate(file) && (containsFallbackTouchPattern(file) || isGovernedFallbackSurface(file))) {
          touchedFiles.add(file);
        }
      }
      continue;
    }
    const scanFiles = currentDiffFiles.filter(isFallbackBehaviorScanCandidate);
    if (
      !currentFile ||
      scanFiles.length === 0 ||
      line.startsWith('+++ ') ||
      line.startsWith('--- ')
    ) {
      continue;
    }
    if (!line.startsWith('+') && !line.startsWith('-')) {
      continue;
    }
    const changedText = line.slice(1);
    if (containsFallbackTouchPattern(changedText)) {
      touchedFiles.add(currentFile);
      continue;
    }
    for (const file of scanFiles) {
      if (isGovernedFallbackSurface(file) && containsFallbackTouchPattern(`${file} ${changedText}`)) {
        touchedFiles.add(file);
      }
    }
  }

  return [...touchedFiles].sort();
}

async function detectFallbackTouchingChanges(baseRef, changedFiles) {
  const normalizedChangedFiles = changedFiles.map(normalizeSpecFilePath);
  if (normalizedChangedFiles.length === 0) {
    return [];
  }
  const symmetricDiff = await runGitDiffText([`${baseRef}...HEAD`]);
  let diffText = symmetricDiff.stdout;
  let diffScanFailed = symmetricDiff.failed;
  if (diffText.trim().length === 0) {
    const fallbackDiff = await runGitDiffText(['HEAD~1..HEAD']);
    diffText = fallbackDiff.stdout;
    diffScanFailed = diffScanFailed || fallbackDiff.failed;
  }
  const touched = new Set(detectFallbackTouchesFromDiff(diffText));
  for (const file of normalizedChangedFiles) {
    if (isFallbackBehaviorScanCandidate(file) && (containsFallbackTouchPattern(file) || isGovernedFallbackSurface(file))) {
      touched.add(file);
    }
  }
  if (diffScanFailed) {
    for (const file of normalizedChangedFiles) {
      if (isFallbackBehaviorScanCandidate(file)) {
        touched.add(file);
      }
    }
  }
  return [...touched].sort();
}

async function readChangedFallbackDecisionSources(changedFiles) {
  const sourceEntries = [];
  for (const file of changedFiles.map(normalizeSpecFilePath)) {
    const type = classifyFallbackDecisionSource(file);
    if (!type) {
      continue;
    }
    try {
      sourceEntries.push({
        file,
        type,
        content: await readFile(file, 'utf8')
      });
    } catch (error) {
      const code = error && typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code !== 'ENOENT') {
        throw error;
      }
    }
  }
  return sourceEntries;
}

function getFallbackDecisionRowKey(row) {
  const surface = row.surface ?? '';
  const fallbackSeam = getFallbackSeamValue(row);
  if (hasPlaceholderValue(surface) || hasPlaceholderValue(fallbackSeam)) {
    return null;
  }
  const normalizedSurface = normalizePolicyEvidenceCell(surface);
  const normalizedFallbackSeam = normalizePolicyEvidenceCell(fallbackSeam);
  if (!normalizedSurface || !normalizedFallbackSeam) {
    return null;
  }
  return {
    key: `${normalizedSurface}::${normalizedFallbackSeam}`,
    label: `${surface} / ${fallbackSeam}`
  };
}

function getCanonicalFallbackDecision(row) {
  const decision = row.decision ?? '';
  const normalizedDecision = normalizeDecisionText(decision);
  const decisions = findAllowedDecisions(decision);
  return decisions.length === 1 && normalizedDecision === decisions[0] ? decisions[0] : null;
}

function validateCanonicalFallbackDecisions(rows) {
  const failures = [];
  const rowsByKey = new Map();
  for (const { file, row } of rows) {
    const rowKey = getFallbackDecisionRowKey(row);
    const decision = getCanonicalFallbackDecision(row);
    if (!rowKey || !decision) {
      continue;
    }
    const current = rowsByKey.get(rowKey.key) ?? {
      label: rowKey.label,
      decisions: new Map()
    };
    const files = current.decisions.get(decision) ?? [];
    files.push(file);
    current.decisions.set(decision, files);
    rowsByKey.set(rowKey.key, current);
  }

  for (const { label, decisions } of rowsByKey.values()) {
    if (decisions.size <= 1) {
      continue;
    }
    const evidence = [...decisions.entries()]
      .map(([decision, files]) => `${decision}: ${[...new Set(files)].join(', ')}`)
      .join('; ');
    failures.push(
      `${label}: contradictory fallback decisions across packet sources; fallback decision evidence must use one canonical decision (${evidence})`
    );
  }
  return failures;
}

function validateFallbackDecisionRows(rows, today) {
  const failures = [];
  if (rows.length === 0) {
    failures.push('fallback/seam-touching changes require a parseable CO-382 fallback decision table');
    failures.push(
      'fallback/seam-touching changes require exactly one decision: remove fallback, expire fallback, or justify retaining fallback'
    );
    return failures;
  }

  for (const { file, row } of rows) {
    const decisionCell = row.decision ?? '';
    const decisions = findAllowedDecisions(decisionCell);
    if (normalizeDecisionText(decisionCell) === 'not applicable') {
      failures.push(`${file}: Not applicable cannot satisfy fallback decision evidence when fallback/seam changes are present`);
      continue;
    }
    if (decisions.length !== 1 || normalizeDecisionText(decisionCell) !== decisions[0]) {
      failures.push(`${file}: fallback decision must be exactly one of remove fallback, expire fallback, or justify retaining fallback`);
      continue;
    }

    if (decisions[0] === 'remove fallback') {
      const requiredRemoveFields = [
        ['surface', row.surface],
        ['fallback/seam', getFallbackSeamValue(row)],
        ['removal condition', row['removal condition']],
        ['validation', row.validation]
      ];
      for (const [name, value] of requiredRemoveFields) {
        if (hasPlaceholderValue(value)) {
          failures.push(`${file}: remove fallback decision requires non-empty ${name}`);
        }
      }
      continue;
    }

    if (decisions[0] !== 'expire fallback') {
      continue;
    }

    const requiredExpireFields = [
      ['surface', row.surface],
      ['fallback/seam', getFallbackSeamValue(row)],
      ...REQUIRED_TEMPORARY_FALLBACK_COLUMNS.map((column) => [column, row[column]])
    ];
    for (const [name, value] of requiredExpireFields) {
      if (hasPlaceholderValue(value)) {
        failures.push(`${file}: expire fallback decision requires non-empty ${name}`);
      }
    }

    const introducedDate = extractIsoDate(row['introduced date']);
    const reviewDate = extractIsoDate(row['review date']);
    const maximumLifetimeDate = extractIsoDate(row['maximum lifetime']);
    const expiryCap = resolveFallbackExpiryCap(row);
    if (!introducedDate) {
      failures.push(`${file}: expire fallback decision requires parseable introduced date`);
    } else if (introducedDate > today) {
      failures.push(`${file}: expire fallback introduced date ${row['introduced date']} cannot be in the future`);
    }
    if (!reviewDate) {
      failures.push(`${file}: expire fallback decision requires parseable review date`);
    } else if (reviewDate < today) {
      failures.push(`${file}: fallback expiry metadata is stale; review date ${row['review date']} is stale`);
    } else {
      const latestReviewDate = addUtcDays(today, expiryCap.reviewDays);
      if (reviewDate > latestReviewDate) {
        failures.push(
          `${file}: expire fallback review date ${row['review date']} exceeds ${expiryCap.label} cap (${expiryCap.reviewDays} days; latest ${formatIsoDate(latestReviewDate)})`
        );
      }
    }
    if (!maximumLifetimeDate) {
      failures.push(`${file}: expire fallback decision requires parseable maximum lifetime`);
    } else if (maximumLifetimeDate < today) {
      failures.push(`${file}: fallback expiry metadata is stale; maximum lifetime ${row['maximum lifetime']} is stale`);
    }
    if (maximumLifetimeDate && introducedDate) {
      const latestMaximumLifetime = addUtcDays(introducedDate, expiryCap.maximumLifetimeDays);
      if (maximumLifetimeDate > latestMaximumLifetime) {
        failures.push(
          `${file}: expire fallback maximum lifetime ${row['maximum lifetime']} exceeds ${expiryCap.label} cap (${expiryCap.maximumLifetimeDays} days; latest ${formatIsoDate(latestMaximumLifetime)})`
        );
      }
    }
    if (reviewDate && maximumLifetimeDate && reviewDate > maximumLifetimeDate) {
      failures.push(
        `${file}: expire fallback review date ${row['review date']} cannot be after maximum lifetime ${row['maximum lifetime']}`
      );
    }
  }

  const durableRows = rows.filter(({ row }) =>
    findAllowedDecisions(row.decision ?? '').includes('justify retaining fallback')
  );
  for (const { file, row, sourceContent = '' } of durableRows) {
    const requiredDurableFields = [
      ['surface', row.surface],
      ['fallback/seam', getFallbackSeamValue(row)]
    ];
    for (const [name, value] of requiredDurableFields) {
      if (hasPlaceholderValue(value)) {
        failures.push(`${file}: justify retaining fallback decision requires non-empty ${name}`);
      }
    }
    if (isOwnerRoutingReferenceRow(row) && hasCompleteOwnerRoutingReferences(row)) {
      continue;
    }
    const nonRoutingDurableRowsInSource = durableRows.filter(
      (candidate) =>
        candidate.file === file &&
        !(isOwnerRoutingReferenceRow(candidate.row) && hasCompleteOwnerRoutingReferences(candidate.row))
    );
    const durableEvidenceContent =
      nonRoutingDurableRowsInSource.length > 1 ? getFallbackDecisionRowContent(row) : sourceContent;
    const durableEvidence = [
      { labels: ['contract name'], name: 'contract name' },
      { labels: ['owning surface'], name: 'owning surface' },
      { labels: ['steady-state proof'], name: 'steady-state proof' },
      { labels: ['tests/docs', 'tests / docs'], name: 'tests/docs' },
      { labels: ['non-expiring rationale', 'not governed as an expiring fallback'], name: 'non-expiring rationale' }
    ];
    for (const evidence of durableEvidence) {
      if (!findLabeledValue(durableEvidenceContent, evidence.labels)) {
        failures.push(`${file}: justify retaining fallback evidence requires ${evidence.name} with a non-empty value`);
      }
    }
  }

  for (const { file, row } of rows) {
    if (!isOwnerRoutingReferenceRow(row)) {
      continue;
    }
    const rowContent = Object.values(row).join(' ');
    for (const owner of REQUIRED_OWNER_REFERENCES) {
      if (!rowContent.includes(owner)) {
        failures.push(`${file}: fallback owner routing evidence must preserve ${owner}`);
      }
    }
  }

  return failures;
}

function parsePolicyDecisionEvidence(content) {
  const result = {
    largeRefactor: false,
    minorSeam: false,
    placeholderLabels: []
  };
  for (const rawLine of String(content).split(/\r?\n/)) {
    const cleanedLine = stripMarkdownListPrefix(cleanTableCell(rawLine)).replace(/[`*]/g, '').trim();
    const normalizedLine = normalizePolicyDecisionLine(cleanedLine);
    const largeRefactorLabel = cleanedLine.match(
      /^large[-_\s]refactor(?:\s+(?:check|decision|threshold))?\s*:\s*(.*)$/i
    );
    const minorSeamLabel = cleanedLine.match(
      /^minor[-_\s]seam(?:\s+(?:behavior|check|decision|threshold))?\s*:\s*(.*)$/i
    );
    if (largeRefactorLabel) {
      if (hasPlaceholderValue(cleanPolicyDecisionLabelValue(largeRefactorLabel[1]))) {
        result.placeholderLabels.push('large refactor');
      } else {
        result.largeRefactor = true;
      }
    }
    if (minorSeamLabel && !hasPlaceholderValue(cleanPolicyDecisionLabelValue(minorSeamLabel[1]))) {
      result.minorSeam = true;
    } else if (minorSeamLabel) {
      result.placeholderLabels.push('minor seam');
    } else if (
      !minorSeamLabel &&
      /^minor[-\s]seam\b.*\b(?:acceptable|required|requires|bounded|decision|choice)\b/.test(normalizedLine)
    ) {
      result.minorSeam = true;
    }
  }
  return result;
}

async function checkFallbackDecisionEvidence(baseRef, changedFiles) {
  const touchedFiles = await detectFallbackTouchingChanges(baseRef, changedFiles);
  if (touchedFiles.length === 0) {
    return [];
  }

  const sourceEntries = await readChangedFallbackDecisionSources(changedFiles);
  const sourceTypes = new Set(sourceEntries.map((entry) => entry.type));
  const failures = [];
  for (const requiredType of FALLBACK_DECISION_SOURCE_TYPES) {
    if (!sourceTypes.has(requiredType)) {
      failures.push(
        `fallback/seam-touching changes require updated ${requiredType} decision evidence (${touchedFiles.join(', ')})`
      );
    }
  }

  const combinedEvidence = sourceEntries.map((entry) => entry.content).join('\n');
  if (hasNotApplicableFallbackDecisionLabel(combinedEvidence)) {
    failures.push('Not applicable is only valid when no fallback/seam behavior changed');
  }
  const policyDecisions = parsePolicyDecisionEvidence(combinedEvidence);
  if (
    policyDecisions.placeholderLabels.length > 0 ||
    !policyDecisions.largeRefactor ||
    !policyDecisions.minorSeam
  ) {
    failures.push('fallback/seam-touching changes require large refactor and minor seam decision evidence');
  }

  const rowsBySource = sourceEntries.map((entry) => ({
    ...entry,
    rows: parseFallbackDecisionRows(entry.content)
  }));
  for (const entry of rowsBySource) {
    if (entry.rows.length === 0) {
      failures.push(`${entry.file}: fallback/seam-touching changes require a parseable CO-382 fallback decision table`);
    }
  }

  const rows = rowsBySource.flatMap((entry) =>
    entry.rows.map((row) => ({
      file: entry.file,
      sourceContent: entry.content,
      row
    }))
  );
  failures.push(...validateFallbackDecisionRows(rows, resolveFallbackGuardToday()));
  failures.push(...validateCanonicalFallbackDecisions(rows));

  return failures;
}

/**
 * Collects spec Markdown files from the repository spec directories.
 *
 * Searches 'tasks/specs' and 'docs/design/specs' for regular files ending with `.md`, ignores `README.md`, and skips directories that do not exist.
 * @returns {string[]} Sorted list of file paths to spec Markdown files.
 * @throws {Error} Re-throws filesystem errors encountered while reading a directory, except when the directory is missing (`ENOENT`), which is ignored.
 */
async function listSpecFiles() {
  const specDirs = ['tasks/specs', 'docs/design/specs'];
  const files = [];

  for (const dir of specDirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) {
          continue;
        }
        if (entry.name === 'README.md') {
          continue;
        }
        files.push(join(dir, entry.name));
      }
    } catch (error) {
      const code =
        error && typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  return files.sort();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTaskNumberRange(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const start = typeof value.start === 'string' ? value.start.trim() : '';
  const end = typeof value.end === 'string' ? value.end.trim() : '';
  if (!/^\d{4}$/.test(start) || !/^\d{4}$/.test(end) || Number(start) > Number(end)) {
    return null;
  }
  return { start, end };
}

function normalizePolicyPathPrefix(value) {
  const normalized = posix.normalize(value.replace(/\\/g, '/')).replace(/^\.\//, '');
  return normalized === '.' ? '' : normalized;
}

function normalizeBaselineCohorts(value) {
  if (!Array.isArray(value)) {
    return { cohorts: [], isValid: false };
  }

  const cohorts = value.map((item) => {
    if (!item || typeof item !== 'object') {
      return null;
    }
    const id = typeof item.id === 'string' ? item.id.trim() || null : null;
    const lastReview = typeof item.last_review === 'string' && parseIsoDate(item.last_review) ? item.last_review : null;
    const cadenceDays = Number.isInteger(item.cadence_days) && item.cadence_days > 0 ? item.cadence_days : null;
    const pathFamilies = normalizeStringArray(item.path_families);
    const pathPrefixes = normalizeStringArray(item.path_prefixes).map(normalizePolicyPathPrefix).filter(Boolean);
    const taskNumberRange = normalizeTaskNumberRange(item.task_number_range);
    if (
      !id ||
      !lastReview ||
      cadenceDays === null ||
      pathFamilies.length === 0 ||
      (!taskNumberRange && pathPrefixes.length === 0)
    ) {
      return null;
    }
    return {
      id,
      last_review: lastReview,
      cadence_days: cadenceDays,
      path_families: pathFamilies,
      path_prefixes: pathPrefixes,
      task_number_range: taskNumberRange
    };
  });

  if (cohorts.some((item) => item === null)) {
    return { cohorts: cohorts.filter(Boolean), isValid: false };
  }
  return { cohorts, isValid: cohorts.length > 0 };
}

function normalizeCanonicalOwnerIssues(value) {
  if (value === undefined || value === null) {
    return { owners: [], isValid: true };
  }
  if (!Array.isArray(value)) {
    return { owners: [], isValid: false };
  }

  const owners = value.map((item) => {
    if (!item || typeof item !== 'object') {
      return null;
    }
    const canonicalOwnerKey = normalizeOptionalString(item.canonical_owner_key);
    const ownerIssue = normalizeOptionalString(item.owner_issue);
    if (!canonicalOwnerKey || !ownerIssue) {
      return null;
    }
    return {
      canonical_owner_key: canonicalOwnerKey,
      owner_issue: ownerIssue
    };
  });

  const validOwners = owners.filter(Boolean);
  const ownerKeys = new Set(validOwners.map((item) => item.canonical_owner_key));
  if (owners.some((item) => item === null) || ownerKeys.size !== validOwners.length) {
    return { owners: validOwners, isValid: false };
  }
  return { owners: validOwners, isValid: true };
}

function normalizeRollingFreshnessPolicy(rawPolicy) {
  if (!rawPolicy || typeof rawPolicy !== 'object' || rawPolicy.enabled !== true) {
    return {
      enabled: false,
      is_valid: false,
      owner_issue: null,
      policy_doc: null,
      window_days: 0,
      max_cohorts: 0,
      max_entries: 0,
      eligible_doc_classes: [],
      baseline_cohorts: [],
      canonical_owner_issues: []
    };
  }

  const ownerIssue = typeof rawPolicy.owner_issue === 'string' ? rawPolicy.owner_issue.trim() || null : null;
  const policyDoc = typeof rawPolicy.policy_doc === 'string' ? rawPolicy.policy_doc.trim() || null : null;
  const windowDays = Number.isInteger(rawPolicy.window_days) && rawPolicy.window_days >= 0 ? rawPolicy.window_days : null;
  const maxCohorts = Number.isInteger(rawPolicy.max_cohorts) && rawPolicy.max_cohorts > 0 ? rawPolicy.max_cohorts : null;
  const maxEntries = Number.isInteger(rawPolicy.max_entries) && rawPolicy.max_entries > 0 ? rawPolicy.max_entries : null;
  const eligibleDocClasses = normalizeStringArray(rawPolicy.eligible_doc_classes);
  const baselineCohorts = normalizeBaselineCohorts(rawPolicy.baseline_cohorts);
  const canonicalOwnerIssues = normalizeCanonicalOwnerIssues(rawPolicy.canonical_owner_issues);

  return {
    enabled: true,
    is_valid: Boolean(
      ownerIssue &&
        policyDoc &&
        windowDays !== null &&
        maxCohorts !== null &&
        maxEntries !== null &&
        eligibleDocClasses.length > 0 &&
        baselineCohorts.isValid &&
        canonicalOwnerIssues.isValid
    ),
    owner_issue: ownerIssue,
    policy_doc: policyDoc,
    window_days: windowDays ?? 0,
    max_cohorts: maxCohorts ?? 0,
    max_entries: maxEntries ?? 0,
    eligible_doc_classes: eligibleDocClasses,
    baseline_cohorts: baselineCohorts.cohorts,
    canonical_owner_issues: canonicalOwnerIssues.owners
  };
}

function classifySpecPath(file, docsCatalog) {
  return resolveDocsCatalogEntry(normalizeSpecFilePath(file), docsCatalog)?.doc_class ?? null;
}

function normalizeSpecFilePath(file) {
  const normalized = posix.normalize(String(file).replace(/\\/g, '/')).replace(/^\.\//, '');
  return normalized === '.' ? '' : normalized;
}

function classifySpecPathFamily(file) {
  const normalizedFile = normalizeSpecFilePath(file);
  if (normalizedFile.startsWith('tasks/specs/')) {
    return 'tasks/specs';
  }
  if (normalizedFile.startsWith('docs/design/specs/')) {
    return 'docs/design/specs';
  }
  return null;
}

function extractTaskNumber(file) {
  const basename = posix.basename(normalizeSpecFilePath(file));
  const directMatch = basename.match(/^(\d{4})-/);
  return directMatch ? directMatch[1] : null;
}

function isTaskNumberInRange(taskNumber, range) {
  return Boolean(taskNumber && range && Number(taskNumber) >= Number(range.start) && Number(taskNumber) <= Number(range.end));
}

function matchesDeclaredPath(entry, cohort) {
  const normalizedFile = normalizeSpecFilePath(entry.file);
  return (
    isTaskNumberInRange(entry.task_number, cohort.task_number_range) ||
    cohort.path_prefixes.some((prefix) => normalizedFile.startsWith(prefix))
  );
}

function findMatchingBaselineCohort(entry, policy) {
  return policy.baseline_cohorts.find(
    (cohort) =>
      entry.last_review === cohort.last_review &&
      entry.cadence_days === cohort.cadence_days &&
      cohort.path_families.includes(entry.path_family) &&
      matchesDeclaredPath(entry, cohort)
  );
}

function applyRollingFreshnessPolicy(staleSpecs, docsCatalog) {
  const policy = normalizeRollingFreshnessPolicy(docsCatalog?.policies?.rolling_freshness_cohorts);
  if (!policy.enabled || !policy.is_valid || staleSpecs.length === 0) {
    return {
      policy,
      blockingStaleSpecs: staleSpecs,
      rollingStaleSpecs: [],
      rollingCohorts: []
    };
  }

  const eligibleClasses = new Set(policy.eligible_doc_classes);
  const eligibleSpecs = staleSpecs.flatMap((entry) => {
    const baselineCohort = findMatchingBaselineCohort(entry, policy);
    if (
      !baselineCohort ||
      !eligibleClasses.has(entry.doc_class) ||
      entry.overdue_days <= 0 ||
      entry.overdue_days > policy.window_days
    ) {
      return [];
    }
    return [{ ...entry, baseline_cohort_id: baselineCohort.id }];
  });

  const cohortsByKey = new Map();
  for (const entry of eligibleSpecs) {
    const key = `${entry.baseline_cohort_id}|${entry.last_review}|${entry.cadence_days}|${entry.age_days}`;
    if (!cohortsByKey.has(key)) {
      cohortsByKey.set(key, []);
    }
    cohortsByKey.get(key).push(entry);
  }

  const policyCapacityExceeded = cohortsByKey.size > policy.max_cohorts || eligibleSpecs.length > policy.max_entries;
  if (policyCapacityExceeded) {
    return {
      policy,
      blockingStaleSpecs: staleSpecs,
      rollingStaleSpecs: [],
      rollingCohorts: []
    };
  }

  const rollingPaths = new Set(eligibleSpecs.map((entry) => entry.file));
  const rollingCohorts = [...cohortsByKey.values()].map((entries) => ({
    baseline_cohort_id: entries[0].baseline_cohort_id,
    owner_issue: policy.owner_issue,
    stale_entries: entries.length,
    last_review: entries[0].last_review,
    cadence_days: entries[0].cadence_days,
    age_days: entries[0].age_days,
    overdue_days: entries[0].overdue_days,
    window_days: policy.window_days,
    sample_paths: entries.slice(0, 5).map((entry) => entry.file)
  }));

  return {
    policy,
    blockingStaleSpecs: staleSpecs.filter((entry) => !rollingPaths.has(entry.file)),
    rollingStaleSpecs: eligibleSpecs,
    rollingCohorts
  };
}

async function loadRollingFreshnessCatalog() {
  try {
    return await maybeLoadDocsCatalog(process.cwd());
  } catch (error) {
    const code =
      error && typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function checkSpecFreshness(specFiles) {
  const failures = [];
  const staleSpecs = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const docsCatalog = await loadRollingFreshnessCatalog();

  for (const file of specFiles) {
    let content;
    try {
      content = await readFile(file, 'utf8');
    } catch (error) {
      const code = error && typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'ENOENT') {
        failures.push(`${file}: file missing during freshness check`);
      } else {
        const message =
          error && typeof error === 'object' && error !== null && 'message' in error
            ? error.message
            : 'unknown error';
        failures.push(`${file}: unable to read file (${message})`);
      }
      continue;
    }

    if (isArchivedSpecStub(file, content) || isInactiveSpec(content)) {
      continue;
    }

    const reviewLine = content
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith('last_review:'));
    if (!reviewLine) {
      failures.push(`${file}: missing last_review field`);
      continue;
    }

    const rawValue = reviewLine.split(':', 2)[1]?.trim() ?? '';
    const reviewDate = parseIsoDate(rawValue);
    if (!reviewDate) {
      failures.push(`${file}: invalid last_review date '${rawValue}'`);
      continue;
    }

    const ageDays = computeAgeInDays(reviewDate, today);
    if (ageDays > SPEC_FRESHNESS_CADENCE_DAYS) {
      const normalizedFile = normalizeSpecFilePath(file);
      staleSpecs.push({
        file: normalizedFile,
        last_review: rawValue,
        cadence_days: SPEC_FRESHNESS_CADENCE_DAYS,
        age_days: ageDays,
        overdue_days: ageDays - SPEC_FRESHNESS_CADENCE_DAYS,
        doc_class: classifySpecPath(normalizedFile, docsCatalog),
        path_family: classifySpecPathFamily(normalizedFile),
        task_number: extractTaskNumber(normalizedFile)
      });
    }
  }

  const { blockingStaleSpecs, rollingStaleSpecs, rollingCohorts } = applyRollingFreshnessPolicy(staleSpecs, docsCatalog);
  for (const entry of blockingStaleSpecs) {
    failures.push(
      `${entry.file}: last_review ${entry.last_review} is ${entry.age_days} days old (must be ≤${entry.cadence_days} days)`
    );
  }

  return { failures, rollingStaleSpecs, rollingCohorts };
}

function isInactiveSpec(content) {
  const lines = content.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (lines[index]?.trim() !== '---') {
    return false;
  }

  for (index += 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed === '---') {
      break;
    }
    if (!trimmed.startsWith('status:')) {
      continue;
    }
    const status = trimmed.split(':', 2)[1]?.trim().toLowerCase() ?? '';
    return INACTIVE_SPEC_STATUSES.has(status);
  }

  return false;
}

function isArchivedSpecStub(file, content) {
  const lines = content.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (!lines[index]?.trim().startsWith('#')) {
    return false;
  }

  index += 1;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (lines[index]?.trim().startsWith('last_review:')) {
    index += 1;
    while (index < lines.length && lines[index].trim() === '') {
      index += 1;
    }
  }

  if (lines[index]?.trim() !== ARCHIVE_STUB_MARKER) {
    return false;
  }

  const trailingLines = lines.slice(index + 1).map((line) => line.trim());
  const archivePath =
    trailingLines
      .find((line) => line.startsWith('- Archive path:'))
      ?.slice('- Archive path:'.length)
      .trim() ?? '';
  const normalizedArchivePath = normalizeSpecPathForComparison(archivePath);
  const normalizedFile = normalizeSpecPathForComparison(file);

  return (
    trailingLines.some((line) => line.startsWith('> Archived on ')) &&
    trailingLines.some((line) => line.startsWith('- Archive branch:')) &&
    normalizedArchivePath === normalizedFile
  );
}

function normalizeSpecPathForComparison(value) {
  return posix.normalize(value.replace(/\\/g, '/'));
}

async function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    process.exit(0);
  }
  const knownFlags = new Set(['dry-run', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    showUsage();
    process.exit(2);
  }
  const dryRun = hasFlag(args, 'dry-run');
  const baseRef = await resolveBaseRef();
  const changedFiles = await listChangedFiles(baseRef);

  let needsSpec = false;
  let specTouched = false;

  for (const file of changedFiles) {
    if (!needsSpec && isCodePath(file)) {
      needsSpec = true;
    }
    if (!specTouched && isSpecPath(file)) {
      specTouched = true;
    }
    if (needsSpec && specTouched) {
      break;
    }
  }

  const failures = [];

  if (needsSpec && !specTouched) {
    failures.push(
      'code/migrations changed but no spec updated under tasks/specs, docs/design/specs, or tasks/index.json'
    );
  }

  failures.push(...(await checkFallbackDecisionEvidence(baseRef, changedFiles)));

  const specFiles = await listSpecFiles();
  if (specFiles.length > 0) {
    const freshness = await checkSpecFreshness(specFiles);
    failures.push(...freshness.failures);
    if (freshness.rollingStaleSpecs.length > 0) {
      console.log(`Spec guard rolling freshness cohort entries: ${freshness.rollingStaleSpecs.length}`);
      for (const cohort of freshness.rollingCohorts) {
        console.log(
          ` - rolling cohort ${cohort.owner_issue ?? 'unassigned'}: ${cohort.stale_entries} specs, last_review=${cohort.last_review}, overdue=${cohort.overdue_days}/${cohort.window_days} days`
        );
      }
    }
  }

  if (failures.length > 0) {
    console.log('❌ Spec guard: issues detected');
    for (const message of failures) {
      console.log(` - ${message}`);
    }
    if (dryRun) {
      console.log('Dry run: exiting successfully despite failures.');
      return;
    }
    process.exitCode = 1;
    return;
  }

  console.log('✅ Spec guard: OK');
}

function isDirectExecution(entryArg = process.argv[1]) {
  return Boolean(entryArg) && import.meta.url === pathToFileURL(resolve(entryArg)).href;
}

if (isDirectExecution()) {
  main().catch((error) => {
    const message =
      error && typeof error === 'object' && error !== null && 'message' in error
        ? error.message
        : String(error);
    console.error(`Spec guard failed: ${message}`);
    process.exit(1);
  });
}

export const specGuardInternalsForTests = {
  classifySpecPathFamily,
  detectFallbackTouchesFromDiff,
  extractMarkdownTableRows,
  extractTaskNumber,
  parseFallbackDecisionRows,
  matchesDeclaredPath,
  normalizeSpecFilePath,
  validateFallbackDecisionRows
};
