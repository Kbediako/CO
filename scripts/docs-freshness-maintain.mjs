#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { collectDocFiles, computeAgeInDays, parseIsoDate, toPosixPath } from './lib/docs-helpers.js';
import {
  buildTaskPacketLifecycleIndexForRepo,
  collectTaskIndexItems,
  isTaskPacketLifecyclePath,
  isTerminalTaskStatus
} from './lib/docs-freshness-lifecycle.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';
import { isValidArchiveStubForPath } from './lib/archive-stub.js';
import { runDocsFreshness } from './docs-freshness.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const GIT_COMMAND_TIMEOUT_MS = 60_000;
const LINEAR_ISSUE_CONTEXT_TIMEOUT_MS = 60_000;
const PASSING_DECISIONS = new Set(['clean', 'pass_with_owned_rolling_debt']);
const REPO_GATE_ID = 'docs_freshness_maintain';
const CANONICAL_OWNER_MARKER_PREFIX = 'codex-orchestrator:canonical-owner-key=';
const CANONICAL_OWNER_KEY_MAX_LENGTH = 512;
const SPEC_GUARD_FRESHNESS_CADENCE_DAYS = 30;
const SPEC_GUARD_PRE_EXPIRY_WINDOW_DAYS = 7;
const TERMINAL_WORKFLOW_STATE_TYPES = new Set(['completed', 'canceled', 'cancelled', 'duplicate']);
const TERMINAL_WORKFLOW_STATES = new Set(['done', 'completed', 'canceled', 'cancelled', 'duplicate']);
const OWNER_LIFECYCLE_ACTIVE = 'active_owner';
const OWNER_LIFECYCLE_RETIRING = 'retiring';
const OWNER_LIFECYCLE_RETIRED = 'retired_historical';
const OWNER_LIFECYCLE_VALUES = new Set([
  OWNER_LIFECYCLE_ACTIVE,
  OWNER_LIFECYCLE_RETIRING,
  OWNER_LIFECYCLE_RETIRED
]);
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
const CURRENT_DIRECT_ACTION_DOC_CLASSES = new Set([
  'front_door',
  'public_guide',
  'repo_guide',
  'agent_policy',
  'active_guide',
  'shipped_skill',
  'shipped_companion',
  'seeded_template'
]);

function showUsage() {
  console.log(`Usage: node scripts/docs-freshness-maintain.mjs [options]

Runs docs:freshness and spec-guard, then emits a machine-readable maintenance decision.

Options:
  --registry <path>            Registry JSON path (default: ${DEFAULT_REGISTRY_PATH})
  --freshness-report <path>    docs:freshness report path (default: out/<task-id>/docs-freshness.json)
  --summary-markdown <path>    Optional docs:freshness markdown summary path
  --report <path>              Maintenance decision report path (default: out/<task-id>/docs-freshness-maintenance.json)
  --base <ref>                 Git base for changed-path detection (default: BASE_SHA, then origin/main)
  --format <text|json>         Output format (default: text)
  --skip-spec-guard            Do not run scripts/spec-guard.mjs; intended for isolated unit fixtures
  --skip-owner-action-evidence Do not emit canonical-owner create/update evidence
  --dry-run-linear-actions     Mark owner action evidence as dry-run/no-mutation
  --warn                       Emit blocking decisions but exit 0
  --check                      Exit non-zero for blocking decisions (default behavior unless --warn is set)
  -h, --help                   Show this help message`);
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

function normalizeArray(value) {
  return Array.isArray(value) ? value.map(normalizeDocPath).filter(Boolean) : [];
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function addDaysToIsoDate(isoDate, days) {
  const parsed = parseIsoDate(isoDate);
  if (!parsed || !Number.isFinite(days)) {
    return null;
  }
  const next = new Date(parsed);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function increment(map, key) {
  const normalized = key || 'unknown';
  map.set(normalized, (map.get(normalized) || 0) + 1);
}

function sortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function formatHumanList(values) {
  const normalized = uniqueSorted(values);
  if (normalized.length <= 2) {
    return normalized.join(' and ');
  }
  return `${normalized.slice(0, -1).join(', ')}, and ${normalized.at(-1)}`;
}

function sampleLines(value, limit = 20) {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeOwnerLifecycle(value) {
  const normalized = normalizeOptionalString(value)?.toLowerCase() ?? null;
  return normalized && OWNER_LIFECYCLE_VALUES.has(normalized) ? normalized : null;
}

function ownerLifecycleForConfig(config) {
  return normalizeOwnerLifecycle(config?.owner_lifecycle ?? config?.owner_issue_lifecycle);
}

function isActiveOwnerLifecycle(config) {
  const lifecycle = ownerLifecycleForConfig(config);
  return lifecycle === OWNER_LIFECYCLE_ACTIVE || lifecycle === OWNER_LIFECYCLE_RETIRING;
}

function isRetiredOwnerLifecycle(config) {
  return ownerLifecycleForConfig(config) === OWNER_LIFECYCLE_RETIRED;
}

function terminalActiveOwnerCanBeRestored(config, verification) {
  return (
    isActiveOwnerLifecycle(config) &&
    normalizeOptionalString(verification?.verification_status) === 'succeeded' &&
    normalizeOptionalBoolean(verification?.same_project) === true
  );
}

const SPEC_GUARD_STALE_SPEC_PATTERN =
  /^(?:-\s+)?((?:tasks\/specs|docs\/design\/specs)\/[^:]+): last_review (\d{4}-\d{2}-\d{2}) is (\d+) days old \(must be (?:<=|≤)(\d+) days\)$/u;
const SPEC_GUARD_FALLBACK_SEAM_PATTERN =
  /^(?:-\s+)?([^:]+\.md):\s+(.*\b(?:fallback|seam)\b.*)$/iu;
const SPEC_GUARD_FALLBACK_SEAM_SUMMARY_PATTERN = /^(?:-\s+)?(.*\b(?:fallback|seam)\b.*)$/iu;
const SPEC_GUARD_FALLBACK_SEAM_SUMMARY_PATH = 'spec-guard/fallback-seam';

function specGuardPathFamily(file) {
  if (file.startsWith('docs/design/specs/')) {
    return 'docs/design/specs';
  }
  if (file.startsWith('tasks/specs/')) {
    return 'tasks/specs';
  }
  if (file.startsWith('.agent/task/')) {
    return '.agent/task';
  }
  if (file.startsWith('docs/')) {
    const basename = file.split('/').pop() ?? file;
    if (/^PRD[-_]/u.test(basename)) {
      return 'docs/PRD-*';
    }
    if (/^TECH_SPEC[-_]/u.test(basename)) {
      return 'docs/TECH_SPEC-*';
    }
    if (/^ACTION_PLAN[-_]/u.test(basename)) {
      return 'docs/ACTION_PLAN-*';
    }
    return 'docs';
  }
  if (file.startsWith('tasks/tasks-')) {
    return 'tasks/tasks-*';
  }
  if (file.startsWith('spec-guard/')) {
    return 'spec-guard';
  }
  return file.split('/').slice(0, -1).join('/') || 'repo';
}

function classifySpecGuardFallbackSeamMessage(message) {
  const normalized = message.toLowerCase();
  if (normalized.includes('fallback expiry metadata is stale')) {
    return 'fallback_expiry_metadata_stale';
  }
  if (normalized.includes('fallback owner routing evidence')) {
    return 'fallback_owner_routing_metadata';
  }
  if (normalized.includes('contradictory fallback decisions')) {
    return 'fallback_decision_conflict';
  }
  if (normalized.includes('fallback/seam-touching changes require')) {
    return 'fallback_seam_decision_missing';
  }
  if (normalized.includes('expire fallback')) {
    return 'expire_fallback_metadata_invalid';
  }
  if (normalized.includes('justify retaining fallback')) {
    return 'retained_fallback_metadata_invalid';
  }
  if (normalized.includes('remove fallback')) {
    return 'remove_fallback_metadata_invalid';
  }
  return 'fallback_seam_metadata';
}

function parseSpecGuardStaleSpecLine(line) {
  const normalizedLine = normalizeOptionalString(line);
  if (!normalizedLine) {
    return null;
  }
  const match = SPEC_GUARD_STALE_SPEC_PATTERN.exec(normalizedLine);
  if (!match) {
    return null;
  }
  const [, file, lastReview, ageDaysRaw, cadenceDaysRaw] = match;
  const pathFamily = file.startsWith('docs/design/specs/') ? 'docs/design/specs' : 'tasks/specs';
  const cadenceDays = Number.parseInt(cadenceDaysRaw ?? '', 10);
  const ageDays = Number.parseInt(ageDaysRaw ?? '', 10);
  const overdueDays = Number.isFinite(ageDays) && Number.isFinite(cadenceDays) ? ageDays - cadenceDays : null;
  return {
    path: normalizeDocPath(file),
    path_family: pathFamily,
    failure_kind: 'active_spec_stale_last_review',
    last_review: lastReview,
    cadence_days: Number.isFinite(cadenceDays) ? cadenceDays : null,
    age_days: Number.isFinite(ageDays) ? ageDays : null,
    overdue_days: Number.isFinite(overdueDays) ? overdueDays : null
  };
}

function parseSpecGuardFallbackSeamLine(line) {
  const normalizedLine = normalizeOptionalString(line);
  if (!normalizedLine) {
    return null;
  }
  const pathMatch = SPEC_GUARD_FALLBACK_SEAM_PATTERN.exec(normalizedLine);
  const summaryMatch = pathMatch ? null : SPEC_GUARD_FALLBACK_SEAM_SUMMARY_PATTERN.exec(normalizedLine);
  if (!pathMatch && !summaryMatch) {
    return null;
  }
  const [, file, pathMessage] = pathMatch ?? [];
  const summaryMessage = summaryMatch?.[1] ?? null;
  const message = pathMessage ?? summaryMessage;
  if (!message) {
    return null;
  }
  const parenthesizedPath = message
    .match(/\(([^()]+)\)\s*$/u)?.[1]
    ?.split(',')
    .map((candidate) => normalizeDocPath(candidate))
    .find((candidate) => candidate.includes('/'));
  const failurePath = file ?? parenthesizedPath ?? SPEC_GUARD_FALLBACK_SEAM_SUMMARY_PATH;
  if (!failurePath) {
    return null;
  }
  const normalizedMessage = message.trim();
  const dateMatch = normalizedMessage.match(
    /\b(?:introduced date|review date|maximum lifetime)\s+(\d{4}-\d{2}-\d{2})\b/u
  );
  return {
    path: normalizeDocPath(failurePath),
    path_family: specGuardPathFamily(normalizeDocPath(failurePath)),
    failure_kind: classifySpecGuardFallbackSeamMessage(normalizedMessage),
    message: normalizedMessage,
    evidence_date: dateMatch?.[1] ?? null,
    last_review: null,
    cadence_days: null,
    age_days: null,
    overdue_days: null
  };
}

function parseSpecGuardFailureLine(line) {
  return parseSpecGuardStaleSpecLine(line) ?? parseSpecGuardFallbackSeamLine(line);
}

function parseSpecGuardFailureLines(lines) {
  return (Array.isArray(lines) ? lines : [])
    .map(parseSpecGuardFailureLine)
    .filter((entry) => entry && entry.path && entry.failure_kind);
}

function normalizeSpecGuardFailureEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const pathValue = normalizeOptionalString(entry.path ?? entry.file);
  const failureKind = normalizeOptionalString(entry.failure_kind ?? entry.kind ?? entry.type);
  const lastReview = normalizeOptionalString(entry.last_review);
  const pathFamily =
    normalizeOptionalString(entry.path_family) ??
    (pathValue ? specGuardPathFamily(pathValue) : null);
  if (!pathValue || !pathFamily || (!lastReview && !failureKind)) {
    return null;
  }
  const cadenceDays = Number.parseInt(String(entry.cadence_days ?? ''), 10);
  const ageDays = Number.parseInt(String(entry.age_days ?? ''), 10);
  const rawOverdueDays = Number.parseInt(String(entry.overdue_days ?? ''), 10);
  const overdueDays =
    Number.isFinite(rawOverdueDays)
      ? rawOverdueDays
      : Number.isFinite(ageDays) && Number.isFinite(cadenceDays)
        ? ageDays - cadenceDays
        : null;
  return {
    path: normalizeDocPath(pathValue),
    path_family: pathFamily,
    failure_kind: failureKind ?? 'active_spec_stale_last_review',
    message: normalizeOptionalString(entry.message),
    evidence_date: normalizeOptionalString(entry.evidence_date),
    last_review: lastReview,
    cadence_days: Number.isFinite(cadenceDays) ? cadenceDays : null,
    age_days: Number.isFinite(ageDays) ? ageDays : null,
    overdue_days: Number.isFinite(overdueDays) ? overdueDays : null
  };
}

function normalizeSpecGuardPayload(specGuard) {
  const payload = specGuard && typeof specGuard === 'object' ? { ...specGuard } : { status: 'skipped' };
  const parsedFailures = Array.isArray(payload.parsed_failures)
    ? payload.parsed_failures.map(normalizeSpecGuardFailureEntry).filter(Boolean)
    : typeof payload.full_output === 'string'
      ? parseSpecGuardFailureLines(payload.full_output.split(/\r?\n/)).map(normalizeSpecGuardFailureEntry).filter(Boolean)
      : [];
  if (Array.isArray(payload.parsed_failures) || typeof payload.full_output === 'string') {
    payload.parsed_failures = parsedFailures;
  }
  return payload;
}

function extractFrontmatterBlock(content) {
  if (typeof content !== 'string') {
    return null;
  }
  const lines = content.split(/\r?\n/);
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }
  if (lines[index]?.trim() !== '---') {
    return null;
  }
  const frontmatter = [];
  for (index += 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      return frontmatter.join('\n');
    }
    frontmatter.push(lines[index]);
  }
  return null;
}

function extractFrontmatterScalar(content, key) {
  const frontmatter = extractFrontmatterBlock(content);
  if (!frontmatter) {
    return null;
  }
  const line = frontmatter
    .split(/\r?\n/)
    .find((candidate) => candidate.trim().startsWith(`${key}:`));
  if (!line) {
    return null;
  }
  return line.split(':', 2)[1]?.trim() || null;
}

function isInactiveSpecContent(content) {
  const status = extractFrontmatterScalar(content, 'status');
  return status ? INACTIVE_SPEC_STATUSES.has(status.toLowerCase()) : false;
}

function extractSpecGuardLastReview(content) {
  const frontmatterLastReview = extractFrontmatterScalar(content, 'last_review');
  if (frontmatterLastReview) {
    return frontmatterLastReview;
  }
  const reviewLine = content
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith('last_review:'));
  return reviewLine ? reviewLine.split(':', 2)[1]?.trim() || null : null;
}

function isArchivedSpecStubContent(file, content) {
  return isValidArchiveStubForPath(file, content);
}

function isSpecGuardFreshnessPath(file) {
  const normalizedPath = normalizeDocPath(file);
  const dir = path.posix.dirname(normalizedPath);
  const basename = path.posix.basename(normalizedPath);
  return (
    basename.endsWith('.md') &&
    basename !== 'README.md' &&
    (dir === 'tasks/specs' || dir === 'docs/design/specs')
  );
}

async function loadTerminalTaskLifecycleIndex(repoRoot) {
  try {
    const raw = await readFile(path.join(repoRoot, 'tasks/index.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return buildTaskPacketLifecycleIndexForRepo(repoRoot, collectTaskIndexItems(parsed));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return buildTaskPacketLifecycleIndexForRepo(repoRoot, []);
    }
    throw error;
  }
}

function normalizeSpecGuardPreExpiryEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const entryPath = normalizeDocPath(entry.path);
  const lastReview = normalizeOptionalString(entry.last_review);
  const cadenceDays = Number.parseInt(String(entry.cadence_days ?? ''), 10);
  const ageDays = Number.parseInt(String(entry.age_days ?? ''), 10);
  const daysUntilExpiry = Number.parseInt(String(entry.days_until_expiry ?? ''), 10);
  if (!entryPath || !lastReview || !Number.isFinite(cadenceDays) || !Number.isFinite(ageDays)) {
    return null;
  }
  return {
    path: entryPath,
    path_family: normalizeOptionalString(entry.path_family) ?? specGuardPathFamily(entryPath),
    last_review: lastReview,
    cadence_days: cadenceDays,
    age_days: ageDays,
    days_until_expiry: Number.isFinite(daysUntilExpiry) ? daysUntilExpiry : cadenceDays - ageDays,
    next_review: normalizeOptionalString(entry.next_review) ?? addDaysToIsoDate(lastReview, cadenceDays),
    failure_kind: 'active_spec_pre_expiry'
  };
}

async function collectSpecGuardPreExpiryEntries(repoRoot, { windowDays = SPEC_GUARD_PRE_EXPIRY_WINDOW_DAYS } = {}) {
  const allDocs = await collectDocFiles(repoRoot);
  const specFiles = allDocs.filter(isSpecGuardFreshnessPath);
  const lifecycleIndex = await loadTerminalTaskLifecycleIndex(repoRoot);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const entries = [];

  for (const file of specFiles) {
    const normalizedPath = normalizeDocPath(file);
    let content;
    try {
      content = await readFile(path.join(repoRoot, normalizedPath), 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
    if (
      isArchivedSpecStubContent(normalizedPath, content) ||
      isInactiveSpecContent(content) ||
      lifecycleIndex.byPath.has(normalizedPath)
    ) {
      continue;
    }
    const lastReview = extractSpecGuardLastReview(content);
    const reviewDate = lastReview ? parseIsoDate(lastReview) : null;
    if (!reviewDate) {
      continue;
    }
    const ageDays = computeAgeInDays(reviewDate, today);
    const daysUntilExpiry = SPEC_GUARD_FRESHNESS_CADENCE_DAYS - ageDays;
    if (daysUntilExpiry >= 0 && daysUntilExpiry <= windowDays) {
      entries.push({
        path: normalizedPath,
        path_family: specGuardPathFamily(normalizedPath),
        last_review: lastReview,
        cadence_days: SPEC_GUARD_FRESHNESS_CADENCE_DAYS,
        age_days: ageDays,
        days_until_expiry: daysUntilExpiry,
        next_review: addDaysToIsoDate(lastReview, SPEC_GUARD_FRESHNESS_CADENCE_DAYS),
        failure_kind: 'active_spec_pre_expiry'
      });
    }
  }

  return entries;
}

function normalizeOwnerIssueScope(config, env = process.env) {
  return {
    workspace_id:
      normalizeOptionalString(config?.owner_issue_workspace_id) ??
      normalizeOptionalString(env.CO_LINEAR_WORKSPACE_ID),
    team_id:
      normalizeOptionalString(config?.owner_issue_team_id) ??
      normalizeOptionalString(env.CO_LINEAR_TEAM_ID),
    project_id:
      normalizeOptionalString(config?.owner_issue_project_id) ??
      normalizeOptionalString(env.CO_LINEAR_PROJECT_ID)
  };
}

function hasOwnerIssueScope(scope) {
  return Boolean(scope?.workspace_id || scope?.team_id || scope?.project_id);
}

function appendOwnerIssueScopeArgs(args, scope) {
  if (scope?.workspace_id) {
    args.push('--workspace-id', scope.workspace_id);
  }
  if (scope?.team_id) {
    args.push('--team-id', scope.team_id);
  }
  if (scope?.project_id) {
    args.push('--project-id', scope.project_id);
  }
}

function isTerminalWorkflowState({ state = null, stateType = null, isTerminal = null } = {}) {
  if (typeof isTerminal === 'boolean') {
    return isTerminal;
  }
  const normalizedType = normalizeOptionalString(stateType)?.toLowerCase() ?? null;
  if (normalizedType && TERMINAL_WORKFLOW_STATE_TYPES.has(normalizedType)) {
    return true;
  }
  const normalizedState = normalizeOptionalString(state)?.toLowerCase() ?? null;
  return Boolean(normalizedState && TERMINAL_WORKFLOW_STATES.has(normalizedState));
}

function deriveOwnerIssueVerificationFromPolicy(policy) {
  const issue = normalizeOptionalString(policy?.owner_issue);
  const state = normalizeOptionalString(policy?.owner_issue_state);
  const stateType = normalizeOptionalString(policy?.owner_issue_state_type);
  const isTerminal = normalizeOptionalBoolean(policy?.owner_issue_is_terminal);
  const scope = normalizeOwnerIssueScope(policy, {});
  if (!issue || (!state && !stateType && isTerminal === null && !hasOwnerIssueScope(scope))) {
    return null;
  }
  const terminal = isTerminalWorkflowState({ state, stateType, isTerminal });
  return {
    issue,
    issue_id: null,
    state,
    state_type: stateType,
    is_terminal: terminal,
    usable: !terminal,
    workspace_id: null,
    team_id: null,
    project_id: null,
    project_name: null,
    expected_workspace_id: scope.workspace_id ?? null,
    expected_team_id: scope.team_id ?? null,
    expected_project_id: scope.project_id ?? null,
    same_project: null,
    verification_status: 'policy_metadata',
    checked_at: null,
    source: 'rolling_freshness_policy',
    error: null
  };
}

function deriveOwnerIssueVerification(policy, explicitVerification = null) {
  const policyVerification = deriveOwnerIssueVerificationFromPolicy(policy);
  if (explicitVerification && typeof explicitVerification === 'object') {
    if (explicitVerification.verification_status === 'unavailable' && policyVerification) {
      return {
        ...explicitVerification,
        issue: normalizeOptionalString(explicitVerification.issue) ?? policyVerification.issue,
        state: normalizeOptionalString(explicitVerification.state) ?? policyVerification.state,
        state_type: normalizeOptionalString(explicitVerification.state_type) ?? policyVerification.state_type,
        is_terminal:
          normalizeOptionalBoolean(explicitVerification.is_terminal) ?? policyVerification.is_terminal,
        usable: normalizeOptionalBoolean(explicitVerification.usable) ?? policyVerification.usable,
        workspace_id: normalizeOptionalString(explicitVerification.workspace_id) ?? policyVerification.workspace_id,
        team_id: normalizeOptionalString(explicitVerification.team_id) ?? policyVerification.team_id,
        project_id: normalizeOptionalString(explicitVerification.project_id) ?? policyVerification.project_id,
        project_name: normalizeOptionalString(explicitVerification.project_name) ?? policyVerification.project_name,
        expected_workspace_id:
          normalizeOptionalString(explicitVerification.expected_workspace_id) ??
          policyVerification.expected_workspace_id,
        expected_team_id:
          normalizeOptionalString(explicitVerification.expected_team_id) ?? policyVerification.expected_team_id,
        expected_project_id:
          normalizeOptionalString(explicitVerification.expected_project_id) ?? policyVerification.expected_project_id,
        same_project:
          normalizeOptionalBoolean(explicitVerification.same_project) ?? policyVerification.same_project,
        source: policyVerification.source
      };
    }
    return explicitVerification;
  }
  return policyVerification;
}

function ownerActionDuplicatePolicy(config) {
  return normalizeOptionalString(config?.canonical_owner_key)
    ? 'one_owner_issue_per_canonical_owner_key'
    : 'one_owner_issue_per_historical_batch';
}

function isLiveOwnerVerificationRequired(config) {
  return normalizeOptionalBoolean(config?.require_live_owner_verification) === true;
}

function verificationConfirmsLiveSameProject(verification) {
  return (
    normalizeOptionalString(verification?.verification_status) === 'succeeded' &&
    normalizeOptionalBoolean(verification?.usable) === true &&
    normalizeOptionalBoolean(verification?.same_project) === true
  );
}

function buildOwnerIssueActionBase(config, overrides = {}) {
  const canonicalOwnerKey = normalizeOptionalString(config?.canonical_owner_key);
  const ownerLifecycle = ownerLifecycleForConfig(config);
  return {
    duplicate_policy: ownerActionDuplicatePolicy(config),
    policy_doc: config?.policy_doc ?? null,
    ...(canonicalOwnerKey ? { canonical_owner_key: canonicalOwnerKey } : {}),
    ...(ownerLifecycle ? { owner_lifecycle: ownerLifecycle } : {}),
    ...overrides
  };
}

function buildOwnerIssueAction(policy, ownerIssueVerification = null) {
  const configuredIssue = normalizeOptionalString(policy?.owner_issue);
  const verification = deriveOwnerIssueVerification(policy, ownerIssueVerification);
  if (!configuredIssue) {
    return buildOwnerIssueActionBase(policy, {
      mode: 'create_required',
      issue: null,
      existing_issue: null,
      reason: 'missing_owner_issue'
    });
  }
  if (isRetiredOwnerLifecycle(policy)) {
    return buildOwnerIssueActionBase(policy, {
      mode: 'create_required',
      issue: null,
      existing_issue: configuredIssue,
      reason: 'configured_owner_retired_historical'
    });
  }
  if (verification?.usable === false && verification?.is_terminal === true) {
    if (terminalActiveOwnerCanBeRestored(policy, verification)) {
      return buildOwnerIssueActionBase(policy, {
        mode: 'restore_existing_owner',
        issue: configuredIssue,
        existing_issue: configuredIssue,
        reason: 'move_to_backlog_not_done',
        issue_state: verification.state ?? null,
        issue_state_type: verification.state_type ?? null,
        target_state: 'Backlog',
        target_state_type: 'backlog'
      });
    }
    return buildOwnerIssueActionBase(policy, {
      mode: 'create_required',
      issue: null,
      existing_issue: configuredIssue,
      reason: 'configured_owner_terminal',
      issue_state: verification.state ?? null,
      issue_state_type: verification.state_type ?? null
    });
  }
  if (normalizeOptionalBoolean(verification?.same_project) === false) {
    return buildOwnerIssueActionBase(policy, {
      mode: 'create_required',
      issue: null,
      existing_issue: configuredIssue,
      reason: 'configured_owner_project_mismatch',
      verification_status: verification?.verification_status ?? null,
      expected_project_id: verification?.expected_project_id ?? null,
      actual_project_id: verification?.project_id ?? null
    });
  }
  if (verification?.verification_status === 'failed' && verification.usable !== true) {
    return buildOwnerIssueActionBase(policy, {
      mode: 'create_required',
      issue: null,
      existing_issue: configuredIssue,
      reason: 'owner_verification_failed',
      verification_status: verification.verification_status ?? null,
      verification_error: verification.error ?? null
    });
  }
  if (isLiveOwnerVerificationRequired(policy) && !verificationConfirmsLiveSameProject(verification)) {
    return buildOwnerIssueActionBase(policy, {
      mode: 'create_required',
      issue: null,
      existing_issue: configuredIssue,
      reason: verification?.verification_status === 'failed'
        ? 'owner_verification_failed'
        : 'owner_verification_unavailable',
      verification_status: verification?.verification_status ?? null,
      verification_error: verification?.error ?? null
    });
  }
  return buildOwnerIssueActionBase(policy, {
    mode: 'update_existing',
    issue: configuredIssue,
    existing_issue: null,
    reason: verification?.verification_status ?? null
  });
}

function doesVerificationConfirmLiveOwner(verification) {
  return (
    normalizeOptionalString(verification?.verification_status) === 'succeeded' &&
    normalizeOptionalBoolean(verification?.usable) === true
  );
}

function buildUnresolvedCanonicalOwnerAction(ownerConfig, verification) {
  const verificationStatus = normalizeOptionalString(verification?.verification_status);
  const projectMismatch = normalizeOptionalBoolean(verification?.same_project) === false;
  let reason = verificationStatus === 'failed' ? 'owner_verification_failed' : 'owner_verification_unavailable';
  if (verification?.is_terminal === true) {
    reason = 'configured_owner_terminal';
  }
  if (projectMismatch) {
    reason = 'configured_owner_project_mismatch';
  }
  return {
    mode: 'create_required',
    issue: null,
    existing_issue: normalizeOptionalString(ownerConfig?.owner_issue),
    duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
    canonical_owner_key: ownerConfig?.canonical_owner_key ?? null,
    owner_lifecycle: ownerLifecycleForConfig(ownerConfig),
    policy_doc: ownerConfig?.policy_doc ?? null,
    reason,
    verification_status: verificationStatus,
    verification_error: verification?.error ?? null,
    expected_project_id: verification?.expected_project_id ?? null,
    actual_project_id: verification?.project_id ?? null
  };
}

function normalizeCanonicalOwnerIssues(policy) {
  if (!Array.isArray(policy?.canonical_owner_issues)) {
    return [];
  }
  return policy.canonical_owner_issues
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const canonicalOwnerKey = normalizeOptionalString(entry.canonical_owner_key);
      const ownerIssue = normalizeOptionalString(entry.owner_issue);
      if (!canonicalOwnerKey || !ownerIssue) {
        return null;
      }
      return {
        canonical_owner_key: canonicalOwnerKey,
        owner_issue: ownerIssue,
        owner_issue_workspace_id:
          normalizeOptionalString(entry.owner_issue_workspace_id) ??
          normalizeOptionalString(policy?.owner_issue_workspace_id),
        owner_issue_team_id:
          normalizeOptionalString(entry.owner_issue_team_id) ??
          normalizeOptionalString(policy?.owner_issue_team_id),
        owner_issue_project_id:
          normalizeOptionalString(entry.owner_issue_project_id) ??
          normalizeOptionalString(policy?.owner_issue_project_id),
        owner_issue_state: normalizeOptionalString(entry.owner_issue_state),
        owner_issue_state_type: normalizeOptionalString(entry.owner_issue_state_type),
        owner_issue_is_terminal: normalizeOptionalBoolean(entry.owner_issue_is_terminal),
        owner_lifecycle: ownerLifecycleForConfig(entry),
        require_live_owner_verification:
          normalizeOptionalBoolean(entry.require_live_owner_verification) ??
          normalizeOptionalBoolean(policy?.require_live_owner_verification),
        policy_doc: policy?.policy_doc ?? null
      };
    })
    .filter(Boolean);
}

function hasExplicitOwnerIssueScope(config) {
  return hasOwnerIssueScope(normalizeOwnerIssueScope(config, {}));
}

function verificationMatchesExplicitOwnerIssueScope(verification, config) {
  const scope = normalizeOwnerIssueScope(config, {});
  return (
    (!scope.workspace_id || normalizeOptionalString(verification?.expected_workspace_id) === scope.workspace_id) &&
    (!scope.team_id || normalizeOptionalString(verification?.expected_team_id) === scope.team_id) &&
    (!scope.project_id || normalizeOptionalString(verification?.expected_project_id) === scope.project_id)
  );
}

function attachCanonicalOwnerVerificationContext(verification, ownerConfig) {
  if (!verification || typeof verification !== 'object') {
    return verification;
  }
  const scope = normalizeOwnerIssueScope(ownerConfig, {});
  return {
    ...verification,
    canonical_owner_key: normalizeOptionalString(ownerConfig?.canonical_owner_key),
    expected_workspace_id: normalizeOptionalString(verification.expected_workspace_id) ?? scope.workspace_id ?? null,
    expected_team_id: normalizeOptionalString(verification.expected_team_id) ?? scope.team_id ?? null,
    expected_project_id: normalizeOptionalString(verification.expected_project_id) ?? scope.project_id ?? null
  };
}

function findCanonicalOwnerVerification(verifications, ownerConfig) {
  const issue = normalizeOptionalString(ownerConfig?.owner_issue);
  if (!issue) {
    return null;
  }
  const canonicalOwnerKey = normalizeOptionalString(ownerConfig?.canonical_owner_key);
  const compatible = (Array.isArray(verifications) ? verifications : []).filter((verification) => {
    if (normalizeOptionalString(verification?.issue) !== issue) {
      return false;
    }
    const verificationOwnerKey = normalizeOptionalString(verification?.canonical_owner_key);
    return !verificationOwnerKey || !canonicalOwnerKey || verificationOwnerKey === canonicalOwnerKey;
  });
  const matchingScope = hasExplicitOwnerIssueScope(ownerConfig)
    ? compatible.filter((verification) => verificationMatchesExplicitOwnerIssueScope(verification, ownerConfig))
    : compatible;
  const matchingKey = matchingScope.filter(
    (verification) => normalizeOptionalString(verification?.canonical_owner_key) === canonicalOwnerKey
  );
  if (matchingKey.length === 1) {
    return matchingKey[0];
  }
  if (matchingScope.length === 1) {
    return matchingScope[0];
  }
  return null;
}

function buildCanonicalOwnerIssueAction(ownerConfig, ownerIssueVerification = null) {
  const resolvedVerification = deriveOwnerIssueVerification(ownerConfig, ownerIssueVerification);
  const baseAction = buildOwnerIssueAction(ownerConfig, resolvedVerification);
  const policyVerification = deriveOwnerIssueVerificationFromPolicy(ownerConfig);
  const verifiedLiveOwner = doesVerificationConfirmLiveOwner(ownerIssueVerification);
  const metadataConfirmsLiveOwner = policyVerification?.usable === true;
  if (baseAction.mode === 'update_existing' && !verifiedLiveOwner && !metadataConfirmsLiveOwner) {
    return buildUnresolvedCanonicalOwnerAction(ownerConfig, resolvedVerification);
  }
  return {
    ...baseAction,
    duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
    canonical_owner_key: ownerConfig?.canonical_owner_key ?? null,
    reason:
      baseAction.mode === 'update_existing'
        ? verifiedLiveOwner
          ? ownerIssueVerification.verification_status
          : policyVerification?.verification_status ?? 'canonical_owner_key_match'
        : baseAction.reason
  };
}

function resolveCandidateOwner(policy, cohortKey, globalOwnerIssueAction, canonicalOwnerVerifications = []) {
  if (policy?.is_valid !== true) {
    return {
      owner_issue: policy?.owner_issue ?? null,
      configured_owner_issue: policy?.owner_issue ?? null,
      owner_issue_action: globalOwnerIssueAction,
      owner_issue_resolution: {
        mode: 'rolling_freshness_policy_owner',
        source: 'rolling_freshness_policy.owner_issue',
        canonical_owner_key: cohortKey,
        configured_owner_issue: policy?.owner_issue ?? null
      }
    };
  }

  const canonicalOwners = normalizeCanonicalOwnerIssues(policy);
  const matchedOwner = canonicalOwners.find((entry) => entry.canonical_owner_key === cohortKey) ?? null;
  if (matchedOwner) {
    const verification = findCanonicalOwnerVerification(canonicalOwnerVerifications, matchedOwner);
    const action = buildCanonicalOwnerIssueAction(matchedOwner, verification);
    return {
      owner_issue: action.issue ?? action.existing_issue ?? matchedOwner.owner_issue,
      configured_owner_issue: policy?.owner_issue ?? null,
      owner_issue_action: action,
      owner_issue_resolution: {
        mode: 'canonical_owner_key_match',
        source: 'rolling_freshness_policy.canonical_owner_issues',
        canonical_owner_key: cohortKey,
        configured_owner_issue: policy?.owner_issue ?? null
      }
    };
  }

  return {
    owner_issue: policy?.owner_issue ?? null,
    configured_owner_issue: policy?.owner_issue ?? null,
    owner_issue_action: globalOwnerIssueAction,
    owner_issue_resolution: {
      mode: 'rolling_freshness_policy_owner',
      source: 'rolling_freshness_policy.owner_issue',
      canonical_owner_key: cohortKey,
      configured_owner_issue: policy?.owner_issue ?? null
    }
  };
}

function describeOwnerIssuePath(ownerIssueAction) {
  if (
    ownerIssueAction?.mode === 'update_existing_multiple' &&
    Array.isArray(ownerIssueAction.issues) &&
    ownerIssueAction.issues.length > 0
  ) {
    return `owner issues ${formatHumanList(ownerIssueAction.issues)}`;
  }
  if (ownerIssueAction?.mode === 'update_existing' && ownerIssueAction.issue) {
    return `owner issue ${ownerIssueAction.issue}`;
  }
  if (ownerIssueAction?.mode === 'restore_existing_owner' && ownerIssueAction.existing_issue) {
    return `owner issue ${ownerIssueAction.existing_issue} restored to Backlog; move_to_backlog_not_done`;
  }
  if (ownerIssueAction?.reason === 'configured_owner_terminal' && ownerIssueAction.existing_issue) {
    return `a new live same-project owner issue; configured owner ${ownerIssueAction.existing_issue} is terminal`;
  }
  if (ownerIssueAction?.reason === 'owner_verification_failed' && ownerIssueAction.existing_issue) {
    return `a verified live same-project owner issue; current owner ${ownerIssueAction.existing_issue} could not be verified`;
  }
  return 'a live same-project owner issue';
}

function isTaskNumberInRange(taskNumber, range) {
  return Boolean(
    taskNumber &&
      range &&
      Number(taskNumber) >= Number(range.start) &&
      Number(taskNumber) <= Number(range.end)
  );
}

function matchesDeclaredPath(entry, cohort) {
  const pathPrefixes = Array.isArray(cohort?.path_prefixes) ? cohort.path_prefixes : [];
  return (
    isTaskNumberInRange(entry.task_number, cohort?.task_number_range) ||
    pathPrefixes.some((prefix) => entry.path.startsWith(prefix))
  );
}

function findMatchingBaselineCohort(entry, policy) {
  const cohorts = Array.isArray(policy?.baseline_cohorts) ? policy.baseline_cohorts : [];
  return (
    cohorts.find(
      (cohort) =>
        entry.last_review === cohort.last_review &&
        entry.cadence_days === cohort.cadence_days &&
        Array.isArray(cohort.path_families) &&
        cohort.path_families.includes(entry.path_family) &&
        matchesDeclaredPath(entry, cohort)
    ) ?? null
  );
}

function isEligibleHistoricalEntry(entry, policy) {
  const eligibleClasses = new Set(Array.isArray(policy?.eligible_doc_classes) ? policy.eligible_doc_classes : []);
  return Boolean(
    entry?.path &&
      eligibleClasses.has(entry.doc_class) &&
      Number.isInteger(entry.overdue_days) &&
      entry.overdue_days > 0
  );
}

const NON_LIVE_POLICY_CAPACITY_REGISTRY_STATUSES = new Set([
  'archived',
  'preserved_historical_stub',
  'retained_terminal_packet',
  'terminal_pending_archive'
]);
const NON_LIVE_POLICY_CAPACITY_LIFECYCLE_STATES = new Set([
  'archived',
  'preserved_historical_stub',
  'retained_terminal_packet',
  'terminal_pending_archive'
]);
function isLivePolicyCapacityEntry(entry) {
  const explicitTaskStatus = explicitPolicyCapacityTaskStatus(entry);
  if (explicitTaskStatus) {
    if (!isTerminalTaskStatus(explicitTaskStatus)) {
      return true;
    }
  }

  if (hasNonLivePolicyCapacityClassification(entry)) {
    return false;
  }

  if (terminalTaskStatus(entry)) {
    return false;
  }

  return true;
}

function explicitPolicyCapacityTaskStatus(entry) {
  if (!isTaskPacketLifecyclePath(entry?.path)) {
    return null;
  }
  return (
    normalizeOptionalString(entry?.task_status)?.toLowerCase() ??
    normalizeOptionalString(entry?.task_lifecycle_status)?.toLowerCase() ??
    normalizeOptionalString(entry?.lifecycle_status)?.toLowerCase() ??
    null
  );
}

function hasNonLivePolicyCapacityClassification(entry) {
  const registryStatus = normalizeOptionalString(entry?.registry_status)?.toLowerCase() ?? null;
  const statusAlias = normalizeOptionalString(entry?.status)?.toLowerCase() ?? null;
  const effectiveRegistryStatus =
    registryStatus ?? (statusAlias && NON_LIVE_POLICY_CAPACITY_REGISTRY_STATUSES.has(statusAlias) ? statusAlias : null);
  if (effectiveRegistryStatus && NON_LIVE_POLICY_CAPACITY_REGISTRY_STATUSES.has(effectiveRegistryStatus)) {
    return true;
  }

  const lifecycleState = normalizeOptionalString(entry?.lifecycle_state)?.toLowerCase() ?? null;
  const effectiveLifecycleState =
    lifecycleState ?? (statusAlias && NON_LIVE_POLICY_CAPACITY_LIFECYCLE_STATES.has(statusAlias) ? statusAlias : null);
  if (effectiveLifecycleState && NON_LIVE_POLICY_CAPACITY_LIFECYCLE_STATES.has(effectiveLifecycleState)) {
    return true;
  }

  return false;
}

function terminalTaskStatus(entry) {
  const explicitTaskStatus = explicitPolicyCapacityTaskStatus(entry);
  if (explicitTaskStatus && isTerminalTaskStatus(explicitTaskStatus)) {
    return explicitTaskStatus;
  }
  const statusAlias = normalizeOptionalString(entry?.status)?.toLowerCase() ?? null;
  return statusAlias && isTerminalTaskStatus(statusAlias) ? statusAlias : null;
}

function needsTerminalTaskStatusLifecycleAction(entry) {
  return Boolean(terminalTaskStatus(entry) && !hasNonLivePolicyCapacityClassification(entry));
}

function shouldVerifyCanonicalOwnerIssues(report) {
  const policy = report?.rolling_freshness_policy ?? {};
  if (policy?.is_valid !== true) {
    return false;
  }

  const ownerCandidateEntries = [
    ...(Array.isArray(report?.stale_entries) ? report.stale_entries : []),
    ...(Array.isArray(report?.rolling_cohort_entries) ? report.rolling_cohort_entries : [])
  ];
  return ownerCandidateEntries.some(
    (entry) => isLivePolicyCapacityEntry(entry) && isEligibleHistoricalEntry(entry, policy)
  );
}

function normalizeTerminalLifecycleEntry(entry) {
  return {
    path: normalizeDocPath(entry?.path),
    doc_class: entry?.doc_class || 'uncatalogued',
    doc_class_label: entry?.doc_class_label || entry?.doc_class || 'Uncatalogued',
    path_family: entry?.path_family || 'unknown',
    last_review: entry?.last_review || null,
    cadence_days: Number.isInteger(entry?.cadence_days) ? entry.cadence_days : null,
    age_days: Number.isInteger(entry?.age_days) ? entry.age_days : null,
    overdue_days: Number.isInteger(entry?.overdue_days) ? entry.overdue_days : null,
    registry_status: entry?.registry_status || null,
    lifecycle_state: entry?.lifecycle_state || 'terminal_pending_archive',
    recommended_action: entry?.recommended_action || 'archive_or_reclassify_terminal_packet',
    task_id: entry?.task_id || null,
    task_key: entry?.task_key || null,
    task_status: terminalTaskStatus(entry),
    completed_at: entry?.completed_at || null,
    source_issue: entry?.source_issue ?? null
  };
}

function uniqueTerminalLifecycleEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const path = normalizeDocPath(entry?.path);
    if (!path || seen.has(path)) {
      return false;
    }
    seen.add(path);
    return true;
  });
}

function normalizeCandidateEntry(entry, policy, source) {
  const baselineCohort = entry.baseline_cohort_id
    ? { id: entry.baseline_cohort_id }
    : findMatchingBaselineCohort(entry, policy);
  return {
    path: normalizeDocPath(entry.path),
    doc_class: entry.doc_class || 'uncatalogued',
    doc_class_label: entry.doc_class_label || entry.doc_class || 'Uncatalogued',
    path_family: entry.path_family || 'unknown',
    task_number: entry.task_number || null,
    last_review: entry.last_review || null,
    cadence_days: Number.isInteger(entry.cadence_days) ? entry.cadence_days : null,
    age_days: Number.isInteger(entry.age_days) ? entry.age_days : null,
    overdue_days: Number.isInteger(entry.overdue_days) ? entry.overdue_days : null,
    baseline_cohort_id: baselineCohort?.id ?? null,
    source
  };
}

function summarizeTaskLineage(entries) {
  const taskNumbers = uniqueSorted(entries.map((entry) => entry.task_number).filter(Boolean));
  return {
    task_numbers: taskNumbers,
    task_count: taskNumbers.length,
    task_number_range: taskNumbers.length > 0 ? `${taskNumbers[0]}-${taskNumbers[taskNumbers.length - 1]}` : null
  };
}

function candidateCohortKey(entry) {
  return canonicalOwnerKeyForCandidateEntry(entry);
}

function canonicalOwnerKeyForCandidateEntry(entry) {
  const rawKey = rawCanonicalOwnerKeyForCandidateEntry(entry);
  if (rawKey.length <= CANONICAL_OWNER_KEY_MAX_LENGTH) {
    return rawKey;
  }
  const digest = createHash('sha256').update(rawKey).digest('hex');
  const prefix = entry.baseline_cohort_id
    ? 'baseline_cohort_id_sha256'
    : 'docs_freshness_candidate_sha256';
  return `${prefix}:${digest}`;
}

function rawCanonicalOwnerKeyForCandidateEntry(entry) {
  if (entry.baseline_cohort_id) {
    return `baseline_cohort_id:${entry.baseline_cohort_id}`;
  }
  return [
    'docs_freshness_candidate',
    `doc_class:${entry.doc_class || 'unknown'}`,
    `path_family:${entry.path_family || 'unknown'}`,
    `last_review:${entry.last_review || 'unknown'}`,
    `cadence_days:${entry.cadence_days ?? 'unknown'}`
  ].join('|');
}

function canonicalOwnerMarkerForKey(key) {
  return `${CANONICAL_OWNER_MARKER_PREFIX}${key}`;
}

function docsFreshnessOwnerKeyForDecision(decision, cohort = null) {
  return (
    normalizeOptionalString(cohort?.canonical_owner_key) ??
    normalizeOptionalString(cohort?.owner_issue_resolution?.canonical_owner_key) ??
    normalizeOptionalString(cohort?.owner_issue_action?.canonical_owner_key) ??
    normalizeOptionalString(decision?.owner_issue_action?.canonical_owner_key) ??
    normalizeOptionalString(decision?.fallback_expiry?.canonical_owner_key) ??
    'docs:freshness:maintain'
  );
}

function routeIdForCohort(cohort) {
  if (cohort?.owner_issue_action?.mode === 'restore_existing_owner') {
    return 'docs-freshness-owner-restore';
  }
  if (cohort?.owner_issue_action?.reason === 'configured_owner_terminal') {
    return 'co-430-terminal-owner-replacement';
  }
  if (cohort?.status === 'spec_guard_fallback_seam_candidate') {
    return 'co-382-fallback-seam-metadata';
  }
  if (Number(cohort?.source_breakdown?.spec_guard ?? 0) > 0) {
    return 'co-428-stale-active-spec';
  }
  if (Number(cohort?.source_breakdown?.blocking_candidate ?? 0) > 0) {
    return 'co-429-completed-lane-registry-residue';
  }
  return 'rolling-freshness-canonical-owner';
}

function ownerActionModeForCohort(cohort, decision) {
  const action = cohort?.owner_issue_action ?? decision?.owner_issue_action ?? {};
  if (action.mode === 'restore_existing_owner') {
    return 'restore_existing_owner';
  }
  if (action.reason === 'configured_owner_terminal') {
    return 'replace_terminal_owner';
  }
  if (isCohortOwnerResolved(cohort)) {
    return 'update_existing';
  }
  if (action.mode === 'update_existing_multiple') {
    return 'update_existing_multiple';
  }
  if (action.mode === 'create_required') {
    return 'create_required';
  }
  return isCohortOwnerResolved(cohort) ? 'update_existing' : 'create_or_update_required';
}

function ownerActionIssueForCohort(cohort, decision) {
  const action = cohort?.owner_issue_action ?? decision?.owner_issue_action ?? {};
  return action.issue ?? cohort?.owner_issue ?? decision?.owner_issue ?? action.existing_issue ?? null;
}

function buildCanonicalOwnerBody({ decision, cohort, mode, routeId }) {
  const canonicalOwnerKey = docsFreshnessOwnerKeyForDecision(decision, cohort);
  const canonicalOwnerMarker = canonicalOwnerMarkerForKey(canonicalOwnerKey);
  const action = cohort?.owner_issue_action ?? decision?.owner_issue_action ?? {};
  const ownerIssue = ownerActionIssueForCohort(cohort, decision);
  const ownerIssueState = normalizeOptionalString(
    action.issue_state ?? action.verified_terminal_state ?? action.verified_state ?? action.owner_issue_state
  );
  const ownerIssueStateType = normalizeOptionalString(
    action.issue_state_type ?? action.verified_state_type ?? action.verified_stateType ?? action.owner_issue_state_type
  );
  const configuredOwnerIssue =
    action.existing_issue ?? ownerIssue ?? cohort?.configured_owner_issue ?? decision?.owner_issue ?? null;
  const samplePaths = Array.isArray(cohort?.sample_paths) ? cohort.sample_paths.slice(0, 10) : [];
  const title = `CO: docs freshness canonical owner for ${canonicalOwnerKey}`;
  const description = [
    `Canonical owner automation for \`docs:freshness:maintain\` route \`${routeId}\`.`,
    '',
    '## Intent Checksum',
    'Protected terms: `docs:freshness:maintain`, canonical owner key, active-owner restoration, retired-owner replacement, completed-lane registry residue, stale active-spec routing, fallback/seam metadata routing, dry-run/no-token copyable body.',
    'Reject blind `last_review` bumps, historical packet deletion, fuzzy duplicate matching, or weakening `docs:freshness` / `spec-guard`.',
    '',
    '## Non-Goals',
    '- Do not weaken `docs:freshness` or `spec-guard`.',
    '- Do not blindly bump `last_review`.',
    '- Do not delete historical packets merely to pass gates.',
    '- Do not broaden into unrelated provider-worker behavior.',
    '',
    '## Not Done If',
    '- The exact canonical owner key can still create duplicate open owner issues.',
    '- Terminal active owners remain in `Done` when restoration to `Backlog` is possible.',
    '- Scheduled/preflight maintenance emits only warnings with no deterministic owner action.',
    '',
    '## Acceptance Criteria',
    '- [ ] Owner lifecycle is explicit as `active_owner`, `retiring`, or `retired_historical`.',
    '- [ ] Owner issue is stamped with the exact canonical owner marker.',
    '- [ ] Owner state is live and non-terminal before provider gates rely on it.',
    '- [ ] Future runs with the same canonical key reuse/update this owner instead of creating duplicates.',
    '- [ ] Action evidence cites route id, affected cohort id, sample paths, and configured historical owner evidence.',
    '',
    '## Canonical Owner',
    `- Canonical owner key: \`${canonicalOwnerKey}\``,
    `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
    '',
    '## Docs Freshness Automation',
    `- Intended action: \`${mode}\``,
    `- Route id: \`${routeId}\``,
    `- Cohort id: \`${cohort?.id ?? 'unknown'}\``,
    `- Cohort canonical owner key: \`${cohort?.canonical_owner_key ?? 'unknown'}\``,
    `- Configured owner evidence: \`${configuredOwnerIssue ?? 'none'}\``,
    `- Freshness decision: \`${decision?.freshness_decision ?? 'unknown'}\``,
    `- Source breakdown: \`${JSON.stringify(cohort?.source_breakdown ?? {})}\``,
    `- Escaped historical root-cause attempts: \`CO-188\`, \`CO-323\``,
    `- Recent recurrence shapes: \`CO-428\`, \`CO-429\`, \`CO-430\``,
    `- Sample paths: ${samplePaths.length > 0 ? samplePaths.map((item) => `\`${item}\``).join(', ') : 'none'}`
  ].join('\n');

  return {
    title,
    description,
    canonical_owner_key: canonicalOwnerKey,
    canonical_owner_marker: canonicalOwnerMarker,
    route_id: routeId,
    cohort_id: cohort?.id ?? null,
    owner_issue: ownerIssue,
    owner_issue_state: ownerIssueState,
    owner_issue_state_type: ownerIssueStateType,
    configured_owner_issue: configuredOwnerIssue,
    sample_paths: samplePaths
  };
}

function shouldEmitCreateOwnerCommand(actionMode) {
  return ['create_required', 'create_or_update_required', 'replace_terminal_owner'].includes(actionMode);
}

function buildCopyableOwnerCommand(body, sourceIssue = '<source-linear-issue-id>', actionMode = null) {
  if (actionMode === 'restore_existing_owner') {
    const issue = body.owner_issue ?? body.configured_owner_issue ?? sourceIssue;
    const expectedState =
      normalizeOptionalString(body.verified_terminal_state ?? body.verified_state ?? body.owner_issue_state) ?? 'Done';
    const expectedStateType =
      normalizeOptionalString(body.verified_state_type ?? body.verified_stateType ?? body.owner_issue_state_type) ??
      'completed';
    return [
      'codex-orchestrator linear transition',
      `--issue-id ${issue}`,
      `--expected-state ${JSON.stringify(expectedState)}`,
      `--expected-state-type ${JSON.stringify(expectedStateType)}`,
      '--state "Backlog"',
      '--force',
      '--force-reason "restore active docs freshness owner; move_to_backlog_not_done"',
      '--format json'
    ].join(' ');
  }
  if (!shouldEmitCreateOwnerCommand(actionMode)) {
    return null;
  }
  return [
    'codex-orchestrator linear create-follow-up',
    `--issue-id ${sourceIssue}`,
    `--title ${JSON.stringify(body.title)}`,
    '--description-file <description.md>',
    '--intent-checksum-file <intent-checksum.md>',
    '--non-goals-file <non-goals.md>',
    '--not-done-if-file <not-done-if.md>',
    '--acceptance-criteria-file <acceptance-criteria.md>',
    `--canonical-owner-key ${JSON.stringify(body.canonical_owner_key)}`,
    '--format json'
  ].join(' ');
}

function buildConsolidatedOwnerAction(decision, actions) {
  if (actions.length <= 1) {
    return null;
  }
  const ownerIssues = uniqueSorted(actions.map((action) => action.owner_issue).filter(Boolean));
  const routeIds = uniqueSorted(actions.map((action) => action.route_id).filter(Boolean));
  if (
    ownerIssues.length !== 1 ||
    decision?.owner_issue_action?.mode !== 'update_existing' ||
    routeIds.includes('co-428-stale-active-spec') ||
    routeIds.includes('co-382-fallback-seam-metadata')
  ) {
    return null;
  }

  const samplePaths = uniqueSorted(
    actions.flatMap((action) => (Array.isArray(action.body?.sample_paths) ? action.body.sample_paths : []))
  ).slice(0, 20);
  const canonicalOwnerKey =
    normalizeOptionalString(decision?.owner_issue_action?.canonical_owner_key) ??
    normalizeOptionalString(decision?.policy_canonical_owner_key) ??
    'docs:freshness:maintain';
  const canonicalOwnerMarker = canonicalOwnerMarkerForKey(canonicalOwnerKey);
  const body = {
    title: `CO: docs freshness maintenance owner update for ${canonicalOwnerKey}`,
    description: [
      `Update the existing \`docs:freshness:maintain\` owner \`${ownerIssues[0]}\` with one consolidated action packet.`,
      '',
      '## Intent Checksum',
      'Protected terms: `docs:freshness:maintain`, canonical owner key, terminal task lifecycle, direct public-doc action, owner workpad update.',
      'Reject duplicate owner creation, per-cohort owner fanout, blind `last_review` bumps, or rolling-cap widening.',
      '',
      '## Acceptance Criteria',
      '- [ ] Existing owner workpad records candidate cohort count, lifecycle action count, strict current-doc action count, and sample paths.',
      '- [ ] Mechanical terminal-packet cases route to archive/reclassification automation before stale rows become ordinary debt.',
      '- [ ] Semantic public/current docs route to direct review/action before expiry or when hard-stale.',
      '',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '',
      '## Docs Freshness Automation',
      `- Intended action: \`update_existing\``,
      `- Cohort action count: \`${actions.length}\``,
      `- Freshness decision: \`${decision?.freshness_decision ?? 'unknown'}\``,
      `- Repo gate severity: \`${decision?.repo_gate?.severity ?? 'unknown'}\``,
      `- Action required count: \`${decision?.repo_gate?.action_required_count ?? 'unknown'}\``,
      `- Sample paths: ${samplePaths.length > 0 ? samplePaths.map((item) => `\`${item}\``).join(', ') : 'none'}`
    ].join('\n'),
    canonical_owner_key: canonicalOwnerKey,
    canonical_owner_marker: canonicalOwnerMarker,
    route_id: 'docs-freshness-maintain-owner-workpad',
    cohort_id: null,
    configured_owner_issue: ownerIssues[0],
    sample_paths: samplePaths
  };
  return {
    route_id: 'docs-freshness-maintain-owner-workpad',
    mode: 'update_existing',
    canonical_owner_key: canonicalOwnerKey,
    canonical_owner_marker: canonicalOwnerMarker,
    cohort_id: null,
    cohort_count: actions.length,
    cohort_canonical_owner_key: null,
    owner_issue: ownerIssues[0],
    owner_issue_action: decision.owner_issue_action ?? null,
    body,
    // Deliberately emit a reference command even though the consolidated action updates an
    // existing workpad; operators can reuse the helper's canonical-owner de-dupe path.
    copyable_command: buildCopyableOwnerCommand(
      body,
      decision?.owner_issue ?? '<source-linear-issue-id>',
      'create_or_update_required'
    ),
    should_block: false
  };
}

function buildSpecGuardPreExpiryOwnerAction(decision) {
  const preExpiryEntries = Array.isArray(decision?.spec_guard_pre_expiry_entries)
    ? decision.spec_guard_pre_expiry_entries
    : [];
  if (preExpiryEntries.length === 0) {
    return null;
  }

  const action = decision?.owner_issue_action ?? {};
  const routeId = 'co-554-spec-guard-pre-expiry';
  let mode = normalizeOptionalString(action.mode) ?? 'create_or_update_required';
  if (action.mode === 'restore_existing_owner') {
    mode = 'restore_existing_owner';
  } else if (action.reason === 'configured_owner_terminal') {
    mode = 'replace_terminal_owner';
  } else if (!['create_required', 'update_existing', 'update_existing_multiple'].includes(mode)) {
    mode = 'create_or_update_required';
  }

  const cohort = {
    id: 'spec-guard-pre-expiry',
    canonical_owner_key: docsFreshnessOwnerKeyForDecision(decision),
    configured_owner_issue: action.existing_issue ?? decision?.owner_issue ?? null,
    owner_issue_action: action,
    sample_paths: Array.isArray(decision?.sample_paths?.spec_guard_pre_expiry_paths)
      ? decision.sample_paths.spec_guard_pre_expiry_paths.slice(0, 10)
      : preExpiryEntries.slice(0, 10).map((entry) => entry.path).filter(Boolean),
    source_breakdown: {
      spec_guard_pre_expiry: preExpiryEntries.length
    }
  };
  const body = buildCanonicalOwnerBody({ decision, cohort, mode, routeId });
  return {
    route_id: routeId,
    mode,
    canonical_owner_key: body.canonical_owner_key,
    canonical_owner_marker: body.canonical_owner_marker,
    cohort_id: null,
    cohort_count: preExpiryEntries.length,
    cohort_canonical_owner_key: null,
    owner_issue: ownerActionIssueForCohort(cohort, decision),
    owner_issue_action: action,
    body,
    copyable_command: buildCopyableOwnerCommand(body, decision?.owner_issue ?? '<source-linear-issue-id>', mode),
    should_block: false
  };
}

function hasLinearWriteCredentials(env = process.env) {
  return Boolean(
    normalizeOptionalString(env.CO_LINEAR_API_TOKEN) ??
      normalizeOptionalString(env.CO_LINEAR_API_KEY) ??
      normalizeOptionalString(env.LINEAR_API_KEY)
  );
}

function shouldOwnerActionBlock(decision, action) {
  if (!PASSING_DECISIONS.has(decision?.freshness_decision)) {
    return true;
  }
  return ['create_required', 'create_or_update_required', 'replace_terminal_owner', 'restore_existing_owner'].includes(
    action.mode
  );
}

function buildOwnerActionEvidenceResult(decision, actions, { env = process.env, dryRunLinearActions = false } = {}) {
  for (const action of actions) {
    action.should_block = shouldOwnerActionBlock(decision, action);
  }

  const requiredActions = actions.filter((action) => action.should_block);
  const credentialsAvailable = hasLinearWriteCredentials(env);
  let status = 'resolved';
  let writeStatus = credentialsAvailable ? 'credentials_available' : 'credentials_missing';
  if (dryRunLinearActions) {
    writeStatus = credentialsAvailable ? 'dry_run_credentials_available' : 'dry_run_credentials_missing';
  }
  if (!credentialsAvailable && requiredActions.length > 0) {
    status = 'credentials_missing';
  } else if (requiredActions.length > 0) {
    status = dryRunLinearActions ? 'dry_run_action_required' : 'action_required';
  }

  return {
    status,
    write_status: writeStatus,
    should_block: requiredActions.length > 0 && (!credentialsAvailable || dryRunLinearActions),
    required_actions: requiredActions.length,
    actions
  };
}

function normalizeOwnerFinalizerVerification(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const issue = normalizeOptionalString(value.issue ?? value.owner_issue);
  if (!issue) {
    return null;
  }
  return {
    issue,
    canonical_owner_key: normalizeOptionalString(value.canonical_owner_key),
    state: normalizeOptionalString(value.state),
    state_type: normalizeOptionalString(value.state_type),
    is_terminal: isTerminalWorkflowState({
      state: normalizeOptionalString(value.state),
      stateType: normalizeOptionalString(value.state_type),
      isTerminal: normalizeOptionalBoolean(value.is_terminal)
    }),
    usable: value.usable === true,
    verification_status: normalizeOptionalString(value.verification_status)
  };
}

function ownerFinalizerRecordsForDecision(decision) {
  const cohorts = Array.isArray(decision?.candidate_cohorts) ? decision.candidate_cohorts : [];
  return cohorts
    .map((cohort) => {
      const ownerIssue = normalizeOptionalString(ownerActionIssueForCohort(cohort, decision));
      if (!ownerIssue) {
        return null;
      }
      return {
        owner_issue: ownerIssue,
        canonical_owner_key: docsFreshnessOwnerKeyForDecision(decision, cohort),
        owner_lifecycle: ownerLifecycleForConfig(cohort?.owner_issue_action),
        owner_issue_action_mode: normalizeOptionalString(cohort?.owner_issue_action?.mode),
        cohort_id: normalizeOptionalString(cohort?.id),
        sample_paths: Array.isArray(cohort?.sample_paths) ? cohort.sample_paths.slice(0, 10) : []
      };
    })
    .filter(Boolean);
}

function exactVerificationMatchesFinalizerRecord(verification, record) {
  return (
    Boolean(record?.canonical_owner_key) &&
    verification?.issue === record.owner_issue &&
    verification?.canonical_owner_key === record.canonical_owner_key
  );
}

function fallbackVerificationMatchesFinalizerRecord(verification, record) {
  return verification?.issue === record?.owner_issue && !verification?.canonical_owner_key;
}

function selectOwnerFinalizerVerification(verifications, record) {
  return (
    verifications.find((candidate) => exactVerificationMatchesFinalizerRecord(candidate, record)) ??
    verifications.find((candidate) => fallbackVerificationMatchesFinalizerRecord(candidate, record)) ??
    null
  );
}

function ownerFinalizerVerificationsForDecision(decision) {
  return [
    decision?.owner_issue_verification ?? null,
    ...(Array.isArray(decision?.canonical_owner_issue_verifications)
      ? decision.canonical_owner_issue_verifications
      : [])
  ].filter(Boolean);
}

function ownerFinalizerRecordPayload(record) {
  return {
    owner_issue: record.owner_issue,
    canonical_owner_key: record.canonical_owner_key,
    owner_lifecycle: record.owner_lifecycle ?? null,
    owner_issue_action_mode: record.owner_issue_action_mode ?? null,
    cohort_id: record.cohort_id,
    sample_paths: record.sample_paths
  };
}

function blockedOwnerFinalizerRecordPayload(record, activeOwnerIssues, activeOwnerRecords, reason, verification = null) {
  return {
    status: 'blocked_owner_verification_unavailable',
    blocking_owner_issue: record.owner_issue,
    active_owner_issue: record.owner_issue,
    active_owner_issues: activeOwnerIssues,
    active_owner_records: activeOwnerRecords,
    canonical_owner_key: record.canonical_owner_key,
    active_canonical_owner_key: record.canonical_owner_key,
    reason,
    verification_status: verification?.verification_status ?? null,
    state: verification?.state ?? null,
    state_type: verification?.state_type ?? null,
    cohort_id: record.cohort_id,
    sample_paths: record.sample_paths,
    ignored_terminal_owner_issues: []
  };
}

function buildDocsFreshnessOwnerFinalizer(decision, ownerFinalizerVerifications = []) {
  const records = ownerFinalizerRecordsForDecision(decision);
  if (records.length === 0) {
    return {
      status: 'not_applicable',
      active_owner_issue: null,
      active_owner_issues: [],
      active_owner_records: [],
      active_canonical_owner_key: null,
      ignored_terminal_owner_issues: []
    };
  }

  const activeOwnerRecords = records.map(ownerFinalizerRecordPayload);
  const activeOwnerIssues = uniqueSorted(activeOwnerRecords.map((record) => record.owner_issue));
  const verifications = (Array.isArray(ownerFinalizerVerifications) ? ownerFinalizerVerifications : [])
    .map(normalizeOwnerFinalizerVerification)
    .filter(Boolean);
  for (const record of records) {
    const verification = selectOwnerFinalizerVerification(verifications, record);
    if (!verification) {
      return blockedOwnerFinalizerRecordPayload(
        record,
        activeOwnerIssues,
        activeOwnerRecords,
        'owner_verification_unavailable'
      );
    }
    if (verification?.is_terminal) {
      if (
        (record.owner_lifecycle === OWNER_LIFECYCLE_ACTIVE ||
          record.owner_lifecycle === OWNER_LIFECYCLE_RETIRING) &&
        record.owner_issue_action_mode === 'restore_existing_owner'
      ) {
        return {
          status: 'restore_existing_owner',
          blocking_owner_issue: record.owner_issue,
          active_owner_issue: record.owner_issue,
          active_owner_issues: activeOwnerIssues,
          active_owner_records: activeOwnerRecords,
          canonical_owner_key: record.canonical_owner_key,
          active_canonical_owner_key: record.canonical_owner_key,
          reason: 'move_to_backlog_not_done',
          target_state: 'Backlog',
          target_state_type: 'backlog',
          state: verification.state,
          state_type: verification.state_type,
          cohort_id: record.cohort_id,
          sample_paths: record.sample_paths,
          ignored_terminal_owner_issues: []
        };
      }
      return {
        status: 'blocked_terminal_owner',
        blocking_owner_issue: record.owner_issue,
        active_owner_issue: record.owner_issue,
        active_owner_issues: activeOwnerIssues,
        active_owner_records: activeOwnerRecords,
        canonical_owner_key: record.canonical_owner_key,
        active_canonical_owner_key: record.canonical_owner_key,
        reason: 'owner_terminal_after_candidate_resolution',
        state: verification.state,
        state_type: verification.state_type,
        cohort_id: record.cohort_id,
        sample_paths: record.sample_paths,
        ignored_terminal_owner_issues: []
      };
    }
    if (verification && (verification.usable !== true || verification.verification_status !== 'succeeded')) {
      return blockedOwnerFinalizerRecordPayload(
        record,
        activeOwnerIssues,
        activeOwnerRecords,
        verification?.verification_status === 'failed' ? 'owner_verification_failed' : 'owner_verification_unavailable',
        verification
      );
    }
  }

  const activeRecord = records[0];
  const ignoredTerminalOwnerIssues = uniqueSorted(
    verifications
      .filter(
        (verification) =>
          verification.is_terminal &&
          !records.some((record) => selectOwnerFinalizerVerification(verifications, record) === verification)
      )
      .map((verification) => verification.issue)
  );

  return {
    status:
      ignoredTerminalOwnerIssues.length > 0
        ? 'passed_exact_canonical_owner_precedence'
        : 'passed_active_owner_finalizer',
    active_owner_issue: activeRecord.owner_issue,
    active_owner_issues: activeOwnerIssues,
    active_owner_records: activeOwnerRecords,
    active_canonical_owner_key: activeRecord.canonical_owner_key,
    ignored_terminal_owner_issues: ignoredTerminalOwnerIssues
  };
}

export function buildDocsFreshnessOwnerActionEvidence(
  decision,
  options = {}
) {
  const {
    env = process.env,
    dryRunLinearActions = false
  } = options;
  const ownerFinalizerVerificationsProvided = Object.prototype.hasOwnProperty.call(
    options,
    'ownerFinalizerVerifications'
  );
  const ownerFinalizerVerifications = ownerFinalizerVerificationsProvided
    ? options.ownerFinalizerVerifications
    : ownerFinalizerVerificationsForDecision(decision);
  const cohorts = Array.isArray(decision?.candidate_cohorts) ? decision.candidate_cohorts : [];
  if (cohorts.length === 0) {
    const preExpiryOwnerAction = buildSpecGuardPreExpiryOwnerAction(decision);
    if (preExpiryOwnerAction) {
      const result = buildOwnerActionEvidenceResult(decision, [preExpiryOwnerAction], { env, dryRunLinearActions });
      return {
        ...result,
        owner_finalizer: buildDocsFreshnessOwnerFinalizer(decision, ownerFinalizerVerifications)
      };
    }
    return {
      status: 'not_applicable',
      write_status: 'not_required',
      should_block: false,
      actions: [],
      owner_finalizer: buildDocsFreshnessOwnerFinalizer(decision, ownerFinalizerVerifications)
    };
  }

  const preExpiryOwnerAction = buildSpecGuardPreExpiryOwnerAction(decision);
  const rawActions = cohorts.map((cohort) => {
    const routeId = routeIdForCohort(cohort);
    const mode = ownerActionModeForCohort(cohort, decision);
    const body = buildCanonicalOwnerBody({ decision, cohort, mode, routeId });
    return {
      route_id: routeId,
      mode,
      canonical_owner_key: body.canonical_owner_key,
      canonical_owner_marker: body.canonical_owner_marker,
      cohort_id: cohort.id ?? null,
      cohort_canonical_owner_key: cohort.canonical_owner_key ?? null,
      owner_issue: ownerActionIssueForCohort(cohort, decision),
      owner_issue_action: cohort.owner_issue_action ?? decision.owner_issue_action ?? null,
      body,
      copyable_command: buildCopyableOwnerCommand(body, decision?.owner_issue ?? '<source-linear-issue-id>', mode),
      should_block: false
    };
  });
  if (preExpiryOwnerAction) {
    rawActions.push(preExpiryOwnerAction);
  }
  const consolidatedAction = buildConsolidatedOwnerAction(decision, rawActions);
  const actions = consolidatedAction ? [consolidatedAction] : rawActions;
  const result = buildOwnerActionEvidenceResult(decision, actions, { env, dryRunLinearActions });
  const ownerFinalizer = buildDocsFreshnessOwnerFinalizer(decision, ownerFinalizerVerifications);
  const ownerFinalizerBlocks = ownerFinalizer.status.startsWith('blocked_');
  const ownerFinalizerOwnsStatus =
    ownerFinalizerBlocks &&
    (ownerFinalizerVerificationsProvided ||
      result.status === 'resolved' ||
      ownerFinalizer.verification_status !== null);
  return {
    ...result,
    status: ownerFinalizerOwnsStatus ? ownerFinalizer.status : result.status,
    should_block: result.should_block || ownerFinalizerBlocks,
    required_actions: ownerFinalizerBlocks ? Math.max(result.required_actions, 1) : result.required_actions,
    owner_finalizer: ownerFinalizer
  };
}

function isoDateFromTimestamp(value) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function buildCohortFallbackExpiry({ firstEntry, policy, ownerResolution, expiresAfter, generatedAt }) {
  const maximumLifetimeDays = Number.isInteger(policy?.window_days) ? policy.window_days : null;
  return {
    decision: 'expire fallback',
    owner_issue: ownerResolution.owner_issue ?? null,
    configured_owner_issue: ownerResolution.configured_owner_issue ?? null,
    canonical_owner_key: ownerResolution.owner_issue_resolution?.canonical_owner_key ?? null,
    trigger: 'eligible historical docs freshness rolling-debt cohort',
    introduced_date: addDaysToIsoDate(firstEntry.last_review, firstEntry.cadence_days),
    review_date: isoDateFromTimestamp(generatedAt),
    maximum_lifetime_days: maximumLifetimeDays,
    expires_after: expiresAfter,
    removal_condition:
      'Refresh, archive, or reclassify the cohort before expires_after; if owner verification stops confirming a live same-project owner, reuse or create the canonical docs:freshness:maintain owner and re-home docs/docs-catalog.json intentionally.',
    validation: [
      'docs:freshness keeps stale and rolling cohort rows machine-visible',
      'docs:freshness:maintain verifies diff status, spec-guard, owner liveness, and same-project ownership before pass_with_owned_rolling_debt'
    ]
  };
}

function summarizeCandidateCohorts(
  entries,
  policy,
  ownerIssueAction,
  canonicalOwnerIssueVerifications = [],
  { generatedAt = new Date().toISOString() } = {}
) {
  const byKey = new Map();
  for (const entry of entries) {
    const key = candidateCohortKey(entry);
    if (!byKey.has(key)) {
      byKey.set(key, []);
    }
    byKey.get(key).push(entry);
  }

  return [...byKey.values()]
    .map((cohortEntries) => {
      const first = cohortEntries[0];
      const classBreakdown = new Map();
      const pathFamilyBreakdown = new Map();
      const sourceBreakdown = new Map();
      for (const entry of cohortEntries) {
        increment(classBreakdown, entry.doc_class_label || entry.doc_class);
        increment(pathFamilyBreakdown, entry.path_family);
        increment(sourceBreakdown, entry.source);
      }
      const baselineIds = uniqueSorted(cohortEntries.map((entry) => entry.baseline_cohort_id).filter(Boolean));
      const expiresAfter = addDaysToIsoDate(first.last_review, first.cadence_days + policy.window_days);
      const cohortKey = candidateCohortKey(first);
      const ownerResolution = resolveCandidateOwner(
        policy,
        cohortKey,
        ownerIssueAction,
        canonicalOwnerIssueVerifications
      );
      const sourceBreakdownObject = sortedObject(sourceBreakdown);
      const ownerActionForRoute = ownerResolution.owner_issue_action;
      return {
        id:
          baselineIds.length === 1 && cohortEntries.every((entry) => entry.baseline_cohort_id === baselineIds[0])
            ? baselineIds[0]
            : `candidate-${first.last_review}-cadence-${first.cadence_days}-age-${first.age_days}`,
        canonical_owner_key: cohortKey,
        canonical_owner_marker: canonicalOwnerMarkerForKey(cohortKey),
        owner_issue: ownerResolution.owner_issue,
        configured_owner_issue: ownerResolution.configured_owner_issue,
        owner_issue_action: ownerResolution.owner_issue_action,
        owner_issue_resolution: ownerResolution.owner_issue_resolution,
        fallback_expiry: buildCohortFallbackExpiry({
          firstEntry: first,
          policy,
          ownerResolution,
          expiresAfter,
          generatedAt
        }),
        status: cohortEntries.some((entry) => entry.overdue_days > policy.window_days)
          ? 'expired_candidate'
          : 'eligible_historical_candidate',
        declared_baseline_ids: baselineIds,
        last_review: first.last_review,
        cadence_days: first.cadence_days,
        age_days: first.age_days,
        overdue_days: first.overdue_days,
        window_days: policy.window_days,
        expires_after: expiresAfter,
        stale_entries: cohortEntries.length,
        class_breakdown: sortedObject(classBreakdown),
        path_family_breakdown: sortedObject(pathFamilyBreakdown),
        source_breakdown: sourceBreakdownObject,
        route_id: routeIdForCohort({
          source_breakdown: sourceBreakdownObject,
          owner_issue_action: ownerActionForRoute
        }),
        lineage: summarizeTaskLineage(cohortEntries),
        sample_paths: cohortEntries.slice(0, 10).map((entry) => entry.path)
      };
    })
    .sort((left, right) => `${left.last_review}:${left.id}`.localeCompare(`${right.last_review}:${right.id}`));
}

function parseSpecGuardCandidateCohorts(
  specGuard,
  policy,
  ownerIssueAction,
  canonicalOwnerIssueVerifications = []
) {
  if (specGuard?.status !== 'failed') {
    return [];
  }
  const entries = Array.isArray(specGuard.parsed_failures)
    ? specGuard.parsed_failures.map(normalizeSpecGuardFailureEntry).filter(Boolean)
    : typeof specGuard.full_output === 'string'
      ? parseSpecGuardFailureLines(specGuard.full_output.split(/\r?\n/))
      : [];
  const byKey = new Map();
  for (const entry of entries) {
    const key =
      entry.failure_kind === 'active_spec_stale_last_review'
        ? [
            'spec_guard_active_spec',
            `path_family:${entry.path_family}`,
            `last_review:${entry.last_review}`,
            `cadence_days:${entry.cadence_days ?? 'unknown'}`
          ].join('|')
        : [
            'spec_guard_fallback_seam',
            `path_family:${entry.path_family}`,
            `failure_kind:${entry.failure_kind}`
          ].join('|');
    if (!byKey.has(key)) {
      byKey.set(key, []);
    }
    byKey.get(key).push(entry);
  }
  return [...byKey.entries()].map(([key, cohortEntries]) => {
    const first = cohortEntries[0];
    const pathFamily = first.path_family ?? 'tasks/specs';
    const pathFamilySlug = pathFamily.replace(/\//gu, '-');
    const failureKind = first.failure_kind ?? 'active_spec_stale_last_review';
    const staleActiveSpec = failureKind === 'active_spec_stale_last_review';
    const ownerResolution = resolveCandidateOwner(
      policy,
      key,
      ownerIssueAction,
      canonicalOwnerIssueVerifications
    );
    const sampleMessages = uniqueSorted(cohortEntries.map((entry) => entry.message).filter(Boolean)).slice(0, 5);
    return {
      id: staleActiveSpec
        ? `spec-guard-active-spec-${pathFamilySlug}-${first.last_review}-cadence-${first.cadence_days}`
        : `spec-guard-fallback-seam-${pathFamilySlug}-${failureKind}`,
      canonical_owner_key: key,
      canonical_owner_marker: canonicalOwnerMarkerForKey(key),
      owner_issue: ownerResolution.owner_issue,
      configured_owner_issue: ownerResolution.configured_owner_issue,
      owner_issue_action: ownerResolution.owner_issue_action,
      owner_issue_resolution: {
        ...ownerResolution.owner_issue_resolution,
        canonical_owner_key: key
      },
      fallback_expiry: null,
      status: staleActiveSpec ? 'spec_guard_active_spec_candidate' : 'spec_guard_fallback_seam_candidate',
      route_id: staleActiveSpec ? 'co-428-stale-active-spec' : 'co-382-fallback-seam-metadata',
      declared_baseline_ids: [],
      last_review: first.last_review,
      evidence_date: first.evidence_date ?? first.last_review ?? null,
      failure_kind: failureKind,
      sample_messages: sampleMessages,
      cadence_days: first.cadence_days,
      age_days: first.age_days,
      overdue_days: first.overdue_days,
      window_days: 0,
      expires_after: null,
      stale_entries: cohortEntries.length,
      class_breakdown: {
        [staleActiveSpec ? 'Active Spec' : 'Spec Guard Fallback/Seam']: cohortEntries.length
      },
      path_family_breakdown: { [pathFamily]: cohortEntries.length },
      source_breakdown: { spec_guard: cohortEntries.length },
      lineage: summarizeTaskLineage([]),
      sample_paths: cohortEntries.slice(0, 10).map((entry) => entry.path)
    };
  });
}

function collectReportFailurePaths(report) {
  return uniqueSorted([
    ...collectRegistryFailurePaths(report),
    ...normalizeArray((report.stale_entries ?? []).map((entry) => entry.path)),
    ...normalizeArray((report.rolling_cohort_entries ?? []).map((entry) => entry.path)),
    ...normalizeArray((report.terminal_lifecycle_entries ?? []).map((entry) => entry.path))
  ]);
}

function collectRegistryFailurePaths(report) {
  const invalidPaths = Array.isArray(report.invalid_entries)
    ? report.invalid_entries.map((entry) => normalizeDocPath(entry?.path))
    : [];
  return uniqueSorted([
    ...normalizeArray(report.missing_in_registry),
    ...normalizeArray(report.missing_on_disk),
    ...invalidPaths,
    ...normalizeArray(report.uncatalogued_docs)
  ]);
}

function hasUsableCohortOwner(candidateCohorts) {
  return (Array.isArray(candidateCohorts) ? candidateCohorts : []).some(isCohortOwnerResolved);
}

function isCohortOwnerResolved(cohort) {
  return Boolean(
    cohort?.owner_issue_action?.mode === 'update_existing' &&
      (cohort?.owner_issue_resolution?.mode === 'canonical_owner_key_match' ||
        (Array.isArray(cohort?.declared_baseline_ids) && cohort.declared_baseline_ids.length > 0))
  );
}

function summarizePolicyCapacity(candidateEntries, policy, { hasUsableOwnerPath = false, hasPolicyOwnerUsable = false } = {}) {
  if (!policy?.enabled) {
    const maxEntries = policy?.max_entries ?? 0;
    const maxCohorts = policy?.max_cohorts ?? 0;
    return {
      status: 'policy_missing',
      current_entries: candidateEntries.length,
      max_entries: maxEntries,
      current_cohorts: 0,
      max_cohorts: maxCohorts,
      expired_entries: 0,
      entry_excess: Math.max(0, candidateEntries.length - maxEntries),
      cohort_excess: 0,
      over_entry_budget: candidateEntries.length > maxEntries,
      over_cohort_budget: false
    };
  }
  if (
    !policy.is_valid ||
    !policy.owner_issue ||
    (candidateEntries.length > 0 && !hasUsableOwnerPath && !hasPolicyOwnerUsable)
  ) {
    const maxEntries = policy.max_entries ?? 0;
    const maxCohorts = policy.max_cohorts ?? 0;
    return {
      status: 'invalid_policy',
      current_entries: candidateEntries.length,
      max_entries: maxEntries,
      current_cohorts: 0,
      max_cohorts: maxCohorts,
      expired_entries: 0,
      entry_excess: Math.max(0, candidateEntries.length - maxEntries),
      cohort_excess: 0,
      over_entry_budget: candidateEntries.length > maxEntries,
      over_cohort_budget: false
    };
  }

  const inWindowEntries = candidateEntries.filter((entry) => entry.overdue_days <= policy.window_days);
  const expiredEntries = candidateEntries.filter((entry) => entry.overdue_days > policy.window_days);
  const cohortKeys = new Set(inWindowEntries.map(candidateCohortKey));
  const overEntryBudget = inWindowEntries.length > policy.max_entries;
  const overCohortBudget = cohortKeys.size > policy.max_cohorts;

  let status = 'no_candidates';
  if (expiredEntries.length > 0) {
    status = 'expired';
  } else if (overEntryBudget || overCohortBudget) {
    status = 'over_budget';
  } else if (candidateEntries.length > 0) {
    status = 'within_policy';
  }

  return {
    status,
    current_entries: inWindowEntries.length,
    max_entries: policy.max_entries,
    current_cohorts: cohortKeys.size,
    max_cohorts: policy.max_cohorts,
    expired_entries: expiredEntries.length,
    entry_excess: Math.max(0, inWindowEntries.length - policy.max_entries),
    cohort_excess: Math.max(0, cohortKeys.size - policy.max_cohorts),
    over_entry_budget: overEntryBudget,
    over_cohort_budget: overCohortBudget
  };
}

function hasProvenDiffStatus(diffStatus) {
  return diffStatus === 'ok' || diffStatus === 'provided';
}

function isCurrentDirectActionDoc(entry) {
  const docClass = normalizeOptionalString(entry?.doc_class);
  return docClass ? CURRENT_DIRECT_ACTION_DOC_CLASSES.has(docClass) : false;
}

function buildRecommendedAction(
  decision,
  { policy, expiresAfter, diffStatus, ownerIssueAction, preExpiryCount = 0, specGuardPreExpiryCount = 0 }
) {
  if (decision === 'clean') {
    if (specGuardPreExpiryCount > 0 && preExpiryCount > 0) {
      return `Review or assign direct action for ${preExpiryCount} public/current doc${preExpiryCount === 1 ? '' : 's'} and ${specGuardPreExpiryCount} active spec${specGuardPreExpiryCount === 1 ? '' : 's'} approaching expiry; do not route strict docs/specs into rolling deferral.`;
    }
    if (specGuardPreExpiryCount > 0) {
      return `Review or assign direct action for ${specGuardPreExpiryCount} active spec${specGuardPreExpiryCount === 1 ? '' : 's'} approaching spec-guard expiry; do not wait for the hard 30-day failure.`;
    }
    if (preExpiryCount > 0) {
      return `Review or assign direct action for ${preExpiryCount} public/current doc${preExpiryCount === 1 ? '' : 's'} approaching expiry; do not route strict docs into rolling deferral.`;
    }
    return 'No docs freshness maintenance action is required.';
  }
  if (decision === 'pass_with_owned_rolling_debt') {
    return `Proceed only for unrelated clean diffs; cite ${describeOwnerIssuePath(ownerIssueAction)} and refresh/archive/reclassify the cohort before ${expiresAfter ?? 'the rolling window expires'}.`;
  }
  if (decision === 'block_diff_local') {
    if (!hasProvenDiffStatus(diffStatus)) {
      return 'Fetch or provide a git base with BASE_SHA or --base before allowing owned rolling debt to pass.';
    }
    return 'Fix current diff or current task-packet freshness/spec blockers before review handoff.';
  }
  if (decision === 'block_missing_or_invalid_registry') {
    return 'Fix missing registry rows, missing-on-disk registry references, invalid registry metadata, or uncatalogued docs before any deferral.';
  }
  if (decision === 'block_terminal_lifecycle') {
    return 'Run the implementation-docs archive/reclassification path for terminal task packets, or intentionally preserve reviewed active docs before they become ordinary stale debt.';
  }
  if (decision === 'block_spec_guard_pre_expiry') {
    return `Review, archive, reclassify, or assign direct owner action for ${specGuardPreExpiryCount} active spec${specGuardPreExpiryCount === 1 ? '' : 's'} approaching spec-guard expiry; do not wait for the hard 30-day failure.`;
  }
  if (decision === 'block_policy_expired') {
    return `Refresh, archive, or reclassify the expired historical cohort through ${describeOwnerIssuePath(ownerIssueAction)}; do not defer it further.`;
  }
  if (decision === 'block_policy_over_budget') {
    if (ownerIssueAction?.mode === 'update_existing_multiple') {
      return `Open or update the resolved owner paths through ${describeOwnerIssuePath(ownerIssueAction)} with refresh/archive action evidence; do not expand rolling caps to pass an unrelated lane.`;
    }
    return `Open or update the single owner path through ${describeOwnerIssuePath(ownerIssueAction)} with refresh/archive action evidence; do not expand rolling caps to pass an unrelated lane.`;
  }
  if (ownerIssueAction?.mode === 'restore_existing_owner' && ownerIssueAction.existing_issue) {
    return `Move active owner ${ownerIssueAction.existing_issue} back to Backlog with move_to_backlog_not_done; do not create another replacement owner while restoration is possible.`;
  }
  if (ownerIssueAction?.reason === 'configured_owner_terminal' && ownerIssueAction.existing_issue) {
    return `Open a new live same-project owner issue for the historical batch; configured owner ${ownerIssueAction.existing_issue} is terminal, so do not reuse it as the live owner path.`;
  }
  if (ownerIssueAction?.reason === 'configured_owner_project_mismatch' && ownerIssueAction.existing_issue) {
    return `Reuse or create the canonical docs:freshness:maintain owner in the configured Linear project; current owner ${ownerIssueAction.existing_issue} is not a same-project live owner path.`;
  }
  if (ownerIssueAction?.reason === 'owner_verification_failed' && ownerIssueAction.existing_issue) {
    return `Verify or replace the owner issue for the historical batch; current owner ${ownerIssueAction.existing_issue} could not be verified, so do not reuse it blindly.`;
  }
  if (ownerIssueAction?.reason === 'owner_verification_unavailable' && ownerIssueAction.existing_issue) {
    return `Verify or replace the owner issue for the historical batch; current owner ${ownerIssueAction.existing_issue} was not proven as a live same-project owner, so do not reuse it blindly.`;
  }
  return `Open or update one baseline owner issue for the historical batch, or fix stale public/active guidance directly before gates pass.`;
}

function countSpecGuardActions(specGuard) {
  return Array.isArray(specGuard?.parsed_failures) ? specGuard.parsed_failures.length : 0;
}

function countSpecGuardPreExpiryActions(decision) {
  return Array.isArray(decision?.spec_guard_pre_expiry_entries) ? decision.spec_guard_pre_expiry_entries.length : 0;
}

function collectSpecGuardFailurePaths(specGuard) {
  return uniqueSorted(
    (Array.isArray(specGuard?.parsed_failures) ? specGuard.parsed_failures : [])
      .map((entry) => normalizeDocPath(entry?.path))
      .filter(Boolean)
  );
}

function resolveRepoGateSeverity(decision, actionRequiredCount = 0) {
  if (decision.freshness_decision === 'clean') {
    return actionRequiredCount > 0 ? 'warning' : 'ok';
  }
  if (decision.freshness_decision === 'pass_with_owned_rolling_debt') {
    return 'warning';
  }
  if (decision.freshness_decision === 'block_terminal_lifecycle') {
    return 'action_required';
  }
  return 'blocking';
}

function resolveRepoGateOwnerVerification(decision, issue, { canonicalOwnerKey = null, ownerSource = null } = {}) {
  const normalizedIssue = normalizeOptionalString(issue);
  if (!normalizedIssue) {
    return null;
  }
  const normalizedCanonicalOwnerKey = normalizeOptionalString(canonicalOwnerKey);
  const canonicalVerifications = Array.isArray(decision?.canonical_owner_issue_verifications)
    ? decision.canonical_owner_issue_verifications
    : [];
  const matchingVerifications = canonicalVerifications.filter(
    (verification) => normalizeOptionalString(verification?.issue) === normalizedIssue
  );
  const exactCanonicalVerification = normalizedCanonicalOwnerKey
    ? matchingVerifications.find(
        (verification) => normalizeOptionalString(verification?.canonical_owner_key) === normalizedCanonicalOwnerKey
      )
    : null;
  const unkeyedSingleVerification =
    matchingVerifications.length === 1 && !normalizeOptionalString(matchingVerifications[0]?.canonical_owner_key)
      ? matchingVerifications[0]
      : null;
  const canonicalVerification = normalizedCanonicalOwnerKey
    ? exactCanonicalVerification ?? unkeyedSingleVerification
    : matchingVerifications.length === 1
      ? matchingVerifications[0]
      : null;
  if (canonicalVerification) {
    return canonicalVerification;
  }
  const decisionOwnerKey = normalizeOptionalString(decision?.owner_issue_action?.canonical_owner_key);
  if (normalizeOptionalString(decision?.owner_issue) === normalizedIssue) {
    if (
      normalizedCanonicalOwnerKey &&
      decisionOwnerKey &&
      normalizedCanonicalOwnerKey !== decisionOwnerKey &&
      !repoGateOwnerSourceUsesPolicyOwner(ownerSource, decision, normalizedIssue)
    ) {
      return null;
    }
    return decision?.owner_issue_verification ?? null;
  }
  return null;
}

function repoGateOwnerSourceUsesPolicyOwner(ownerSource, decision, normalizedIssue) {
  if (!ownerSource) {
    return false;
  }
  const decisionOwnerKey = normalizeOptionalString(decision?.owner_issue_action?.canonical_owner_key);
  const sourcePolicyOwnerKey = normalizeOptionalString(ownerSource?.owner_issue_action?.canonical_owner_key);
  const sourceIssue = normalizeOptionalString(ownerSource?.owner_issue ?? ownerSource?.issue);
  const sourceActionMode =
    normalizeOptionalString(ownerSource?.mode) ??
    normalizeOptionalString(ownerSource?.owner_issue_action?.mode);
  return Boolean(
    decisionOwnerKey &&
      sourcePolicyOwnerKey === decisionOwnerKey &&
      sourceIssue === normalizedIssue &&
      sourceActionMode === 'update_existing'
  );
}

function repoGateOwnerCanonicalKey(ownerSource, decision) {
  return (
    normalizeOptionalString(ownerSource?.owner_issue_action?.canonical_owner_key) ??
    normalizeOptionalString(ownerSource?.canonical_owner_key) ??
    normalizeOptionalString(ownerSource?.cohort_canonical_owner_key) ??
    normalizeOptionalString(decision?.owner_issue_action?.canonical_owner_key)
  );
}

function isRepoGateOwnerActionUsable(actionMode) {
  return !['create_required', 'create_or_update_required', 'replace_terminal_owner', 'restore_existing_owner'].includes(
    normalizeOptionalString(actionMode) ?? ''
  );
}

function isRepoGateOwnerVerificationUsable(verification) {
  if (!verification) {
    return false;
  }
  const verificationSucceeded =
    verification?.status === 'succeeded' || verification?.verification_status === 'succeeded';
  return (
    verificationSucceeded &&
    normalizeOptionalBoolean(verification?.usable) !== false &&
    normalizeOptionalBoolean(verification?.same_project) !== false &&
    normalizeOptionalBoolean(verification?.is_terminal) !== true
  );
}

function isRepoGateOwnerVerified({ verification, actionMode, ownerIssueAction = null }) {
  return (
    isRepoGateOwnerVerificationUsable(verification) &&
    isRepoGateOwnerActionUsable(actionMode) &&
    isRepoGateOwnerActionUsable(ownerIssueAction?.mode)
  );
}

function resolveRepoGateOwner(decision, ownerActionEvidence) {
  const actions = Array.isArray(ownerActionEvidence?.actions) ? ownerActionEvidence.actions : [];
  const actionIssues = uniqueSorted(actions.map((action) => normalizeOptionalString(action?.owner_issue)).filter(Boolean));
  if (actionIssues.length === 1) {
    const issue = actionIssues[0];
    const action = actions.find((candidate) => normalizeOptionalString(candidate?.owner_issue) === issue) ?? null;
    const actionMode = action?.mode ?? action?.owner_issue_action?.mode ?? decision?.owner_issue_action?.mode ?? null;
    const canonicalOwnerKey = repoGateOwnerCanonicalKey(action, decision);
    const verification = resolveRepoGateOwnerVerification(decision, issue, {
      canonicalOwnerKey,
      ownerSource: action
    });
    return {
      issue,
      canonical_owner_key: canonicalOwnerKey,
      action: actionMode,
      owner_issue_action: action?.owner_issue_action ?? null,
      verification,
      verified: isRepoGateOwnerVerified({
        verification,
        actionMode,
        ownerIssueAction: action?.owner_issue_action
      })
    };
  }

  const candidateActionCohorts = (Array.isArray(decision?.candidate_cohorts) ? decision.candidate_cohorts : []).filter(
    (cohort) => !isRepoGateOwnerActionUsable(cohort?.owner_issue_action?.mode)
  );
  const candidateActionIssues = uniqueSorted(
    candidateActionCohorts
      .map((cohort) => normalizeOptionalString(ownerActionIssueForCohort(cohort, decision)))
      .filter(Boolean)
  );
  if (candidateActionIssues.length === 1) {
    const issue = candidateActionIssues[0];
    const cohort =
      candidateActionCohorts.find(
        (candidate) => normalizeOptionalString(ownerActionIssueForCohort(candidate, decision)) === issue
      ) ?? null;
    const actionMode = cohort?.owner_issue_action?.mode ?? decision?.owner_issue_action?.mode ?? null;
    const canonicalOwnerKey = repoGateOwnerCanonicalKey(cohort, decision);
    const verification = resolveRepoGateOwnerVerification(decision, issue, {
      canonicalOwnerKey,
      ownerSource: cohort
    });
    return {
      issue,
      canonical_owner_key: canonicalOwnerKey,
      action: actionMode,
      owner_issue_action: cohort?.owner_issue_action ?? null,
      verification,
      verified: isRepoGateOwnerVerified({
        verification,
        actionMode,
        ownerIssueAction: cohort?.owner_issue_action
      })
    };
  }

  const resolvedCohorts = (Array.isArray(decision?.candidate_cohorts) ? decision.candidate_cohorts : []).filter(
    isCohortOwnerResolved
  );
  const resolvedIssues = uniqueSorted(
    resolvedCohorts.map((cohort) => normalizeOptionalString(cohort?.owner_issue)).filter(Boolean)
  );
  if (resolvedIssues.length === 1) {
    const issue = resolvedIssues[0];
    const cohort = resolvedCohorts.find((candidate) => normalizeOptionalString(candidate?.owner_issue) === issue) ?? null;
    const actionMode = cohort?.owner_issue_action?.mode ?? decision?.owner_issue_action?.mode ?? null;
    const canonicalOwnerKey = repoGateOwnerCanonicalKey(cohort, decision);
    const verification = resolveRepoGateOwnerVerification(decision, issue, {
      canonicalOwnerKey,
      ownerSource: cohort
    });
    return {
      issue,
      canonical_owner_key: canonicalOwnerKey,
      action: actionMode,
      owner_issue_action: cohort?.owner_issue_action ?? null,
      verification,
      verified: isRepoGateOwnerVerified({
        verification,
        actionMode,
        ownerIssueAction: cohort?.owner_issue_action
      })
    };
  }

  const issue = decision?.owner_issue ?? null;
  const verification = decision?.owner_issue_verification ?? null;
  const actionMode = decision?.owner_issue_action?.mode ?? null;
  return {
    issue,
    canonical_owner_key: repoGateOwnerCanonicalKey(decision?.owner_issue_action, decision),
    action: actionMode,
    owner_issue_action: decision?.owner_issue_action ?? null,
    verification,
    verified: isRepoGateOwnerVerified({
      verification,
      actionMode,
      ownerIssueAction: decision?.owner_issue_action
    })
  };
}

export function buildDocsFreshnessRepoGate(decision) {
  const freshnessDecision = decision?.freshness_decision ?? 'unknown';
  const passing = PASSING_DECISIONS.has(freshnessDecision);
  const ownerActionEvidence = decision?.owner_action_evidence ?? null;
  const ownerActionRequiredCount = Number(ownerActionEvidence?.required_actions ?? 0);
  const actionRequiredCount =
    Number(decision?.totals?.registry_blockers ?? 0) +
    Number(decision?.totals?.hard_stale_entries ?? 0) +
    Number(decision?.totals?.rolling_non_candidate_entries ?? 0) +
    Number(decision?.totals?.unowned_candidate_cohorts ?? 0) +
    Number(decision?.totals?.terminal_lifecycle_entries ?? 0) +
    Number(decision?.totals?.pre_expiry_entries ?? 0) +
    countSpecGuardPreExpiryActions(decision) +
    countSpecGuardActions(decision?.spec_guard) +
    ownerActionRequiredCount;
  const blocksHandoff = !passing || ownerActionEvidence?.should_block === true;
  const hasLocalBlocker =
    Array.isArray(decision?.blocking_changed_paths) && decision.blocking_changed_paths.length > 0;
  const specGuardFailed = decision?.spec_guard?.status === 'failed';
  const capacityStatus = decision?.policy_capacity_status?.status;
  const hasLiveCapacityEntries = Number(decision?.totals?.candidate_entries ?? 0) > 0;
  const hasCapacityRepoWideBlocker =
    ['expired', 'over_budget'].includes(capacityStatus) ||
    (['invalid_policy', 'policy_missing'].includes(capacityStatus) && hasLiveCapacityEntries);
  const hasRepoWideBlocker =
    Number(decision?.totals?.registry_blockers ?? 0) > 0 ||
    Number(decision?.totals?.hard_stale_entries ?? 0) > 0 ||
    Number(decision?.totals?.rolling_non_candidate_entries ?? 0) > 0 ||
    Number(decision?.totals?.unowned_candidate_cohorts ?? 0) > 0 ||
    hasCapacityRepoWideBlocker;
  const hasDiffProofOnlyBlocker =
    freshnessDecision === 'block_diff_local' && !hasLocalBlocker && !specGuardFailed && !hasRepoWideBlocker;
  const blocksUnrelatedLanes =
    blocksHandoff &&
    !hasLocalBlocker &&
    !hasDiffProofOnlyBlocker &&
    (hasRepoWideBlocker || (!specGuardFailed && freshnessDecision !== 'block_terminal_lifecycle'));
  const owner = resolveRepoGateOwner(decision, ownerActionEvidence);
  const canonicalOwnerKey =
    normalizeOptionalString(owner?.canonical_owner_key) ??
    normalizeOptionalString(decision?.owner_issue_action?.canonical_owner_key) ??
    normalizeOptionalString(decision?.policy_canonical_owner_key) ??
    normalizeOptionalString(decision?.fallback_expiry?.canonical_owner_key) ??
    'docs:freshness:maintain';

  return {
    id: REPO_GATE_ID,
    severity: resolveRepoGateSeverity(decision, actionRequiredCount),
    freshness_decision: freshnessDecision,
    owner: {
      issue: owner.issue ?? null,
      active_remediation_issue: owner.issue ?? null,
      canonical_owner_key: canonicalOwnerKey,
      action: owner.action ?? null,
      reason:
        normalizeOptionalString(owner?.owner_issue_action?.reason) ??
        normalizeOptionalString(decision?.owner_issue_action?.reason) ??
        normalizeOptionalString(ownerActionEvidence?.reason) ??
        null,
      policy_doc:
        normalizeOptionalString(owner?.owner_issue_action?.policy_doc) ??
        normalizeOptionalString(decision?.owner_issue_action?.policy_doc) ??
        null,
      configured_issue: normalizeOptionalString(owner?.owner_issue_action?.existing_issue) ?? null,
      state: owner.verification?.state?.name ?? owner.verification?.state ?? null,
      state_type:
        owner.verification?.state?.type ??
        owner.verification?.state_type ??
        null,
      verified: owner.verified === true
    },
    spec_guard: {
      status: decision?.spec_guard?.status ?? 'unknown',
      action_required_count: countSpecGuardActions(decision?.spec_guard)
    },
    capacity: decision?.policy_capacity_status ?? null,
    capacity_excess: decision?.policy_capacity_status
      ? {
          entries: Number(decision.policy_capacity_status.entry_excess ?? 0),
          cohorts: Number(decision.policy_capacity_status.cohort_excess ?? 0),
          expired_entries: Number(decision.policy_capacity_status.expired_entries ?? 0)
        }
      : null,
    canonical_owner_key: canonicalOwnerKey,
    active_remediation_issue: owner.issue ?? null,
    next_expiry: decision?.expires_after ?? null,
    action_required_count: actionRequiredCount,
    blocks_unrelated_lanes: blocksUnrelatedLanes,
    blocks_handoff: blocksHandoff,
    handoff_blocking: blocksHandoff,
    provider_wip_impact: 'excluded_repo_gate',
    sample_paths: {
      blocking_changed_paths: decision?.sample_paths?.blocking_changed_paths ?? [],
      candidate_paths: decision?.sample_paths?.candidate_paths ?? [],
      terminal_lifecycle_paths: decision?.sample_paths?.terminal_lifecycle_paths ?? [],
      pre_expiry_paths: decision?.sample_paths?.pre_expiry_paths ?? [],
      spec_guard_pre_expiry_paths: decision?.sample_paths?.spec_guard_pre_expiry_paths ?? [],
      spec_guard_paths: decision?.sample_paths?.spec_guard_paths ?? [],
      hard_stale_paths: decision?.sample_paths?.hard_stale_paths ?? [],
      rolling_current_action_paths: decision?.sample_paths?.rolling_current_action_paths ?? [],
      rolling_non_candidate_paths: decision?.sample_paths?.rolling_non_candidate_paths ?? [],
      missing_or_invalid_paths: decision?.sample_paths?.missing_or_invalid_paths ?? []
    }
  };
}

function selectRecommendedOwnerIssueAction(ownerIssueAction, candidateCohorts) {
  const cohorts = Array.isArray(candidateCohorts) ? candidateCohorts : [];
  if (cohorts.length === 0 || !cohorts.every(isCohortOwnerResolved)) {
    return ownerIssueAction;
  }
  const ownedIssues = uniqueSorted(
    cohorts
      .filter(isCohortOwnerResolved)
      .map((cohort) => cohort.owner_issue_action.issue)
      .filter(Boolean)
  );
  if (ownedIssues.length === 1) {
    return {
      mode: 'update_existing',
      issue: ownedIssues[0],
      existing_issue: null,
      duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
      policy_doc: ownerIssueAction?.policy_doc ?? null,
      reason: 'canonical_owner_key_match'
    };
  }
  return {
    mode: 'update_existing_multiple',
    issue: null,
    issues: ownedIssues,
    existing_issue: null,
    duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
    policy_doc: ownerIssueAction?.policy_doc ?? null,
    reason: 'canonical_owner_key_match_multiple',
    canonical_owner_keys: uniqueSorted(
      cohorts
        .filter(isCohortOwnerResolved)
        .map((cohort) => cohort.owner_issue_action.canonical_owner_key)
        .filter(Boolean)
    )
  };
}

async function verifyOwnerIssueContext(repoRoot, ownerIssue, ownerConfig = null, env = process.env) {
  const issue = normalizeOptionalString(ownerIssue);
  if (!issue) {
    return null;
  }
  const scope = normalizeOwnerIssueScope(ownerConfig, env);

  const helperPath = path.join(repoRoot, 'bin', 'codex-orchestrator.js');
  try {
    await access(helperPath);
  } catch {
    return {
      issue,
      issue_id: null,
      state: null,
      state_type: null,
      is_terminal: null,
      usable: null,
      workspace_id: null,
      team_id: null,
      project_id: null,
      project_name: null,
      expected_workspace_id: scope.workspace_id ?? null,
      expected_team_id: scope.team_id ?? null,
      expected_project_id: scope.project_id ?? null,
      same_project: scope.project_id ? null : null,
      verification_status: 'unavailable',
      checked_at: new Date().toISOString(),
      source: 'linear issue-context',
      error: 'helper_missing'
    };
  }

  try {
    const args = [helperPath, 'linear', 'issue-context', '--issue-id', issue, '--format', 'json'];
    appendOwnerIssueScopeArgs(args, scope);
    const { stdout } = await execFileAsync(
      process.execPath,
      args,
      {
        cwd: repoRoot,
        maxBuffer: 64 * 1024 * 1024,
        timeout: LINEAR_ISSUE_CONTEXT_TIMEOUT_MS
      }
    );
    const parsed = JSON.parse(stdout);
    const cacheFallbackMarker = detectLinearIssueContextCacheFallback(parsed);
    if (cacheFallbackMarker) {
      return {
        issue,
        issue_id: null,
        state: null,
        state_type: null,
        is_terminal: null,
        usable: false,
        workspace_id: null,
        team_id: null,
        project_id: null,
        project_name: null,
        expected_workspace_id: scope.workspace_id ?? normalizeOptionalString(parsed?.source_setup?.workspace_id) ?? null,
        expected_team_id: scope.team_id ?? normalizeOptionalString(parsed?.source_setup?.team_id) ?? null,
        expected_project_id: scope.project_id ?? normalizeOptionalString(parsed?.source_setup?.project_id) ?? null,
        same_project: null,
        verification_status: 'failed',
        checked_at: new Date().toISOString(),
        source: 'linear issue-context',
        error: `live owner verification requires non-cached linear issue-context output (${cacheFallbackMarker})`
      };
    }
    const issueContext = parsed?.issue ?? {};
    const workflowState = issueContext?.state && typeof issueContext.state === 'object' ? issueContext.state : null;
    const team = issueContext?.team && typeof issueContext.team === 'object' ? issueContext.team : null;
    const project = issueContext?.project && typeof issueContext.project === 'object' ? issueContext.project : null;
    const workspaceId = normalizeOptionalString(issueContext?.workspace_id ?? parsed?.source_setup?.workspace_id);
    const teamId = normalizeOptionalString(team?.id);
    const projectId = normalizeOptionalString(project?.id);
    const expectedWorkspaceId = scope.workspace_id ?? normalizeOptionalString(parsed?.source_setup?.workspace_id);
    const expectedTeamId = scope.team_id ?? normalizeOptionalString(parsed?.source_setup?.team_id);
    const expectedProjectId = scope.project_id ?? normalizeOptionalString(parsed?.source_setup?.project_id);
    const workspaceMatches = expectedWorkspaceId ? workspaceId === expectedWorkspaceId : null;
    const teamMatches = expectedTeamId ? teamId === expectedTeamId : null;
    const projectMatches = expectedProjectId ? projectId === expectedProjectId : null;
    const state = normalizeOptionalString(workflowState?.name ?? issueContext?.state);
    const stateType = normalizeOptionalString(workflowState?.type ?? issueContext?.state_type ?? issueContext?.stateType);
    const isTerminal = isTerminalWorkflowState({
      state,
      stateType,
      isTerminal: normalizeOptionalBoolean(
        workflowState?.is_terminal ?? workflowState?.isTerminal ?? issueContext?.is_terminal ?? issueContext?.isTerminal
      )
    });
    const configuredScopeMismatch = workspaceMatches === false || teamMatches === false || projectMatches === false;
    // same_project is deliberately project-scoped; workspace/team matches alone are not project proof.
    const sameProject =
      configuredScopeMismatch
        ? false
        : expectedProjectId
          ? projectMatches
          : null;
    return {
      issue,
      issue_id: normalizeOptionalString(issueContext?.id),
      state,
      state_type: stateType,
      is_terminal: isTerminal,
      usable: !isTerminal && sameProject !== false,
      workspace_id: workspaceId,
      team_id: teamId,
      project_id: projectId,
      project_name: normalizeOptionalString(project?.name),
      expected_workspace_id: expectedWorkspaceId ?? null,
      expected_team_id: expectedTeamId ?? null,
      expected_project_id: expectedProjectId ?? null,
      same_project: sameProject,
      verification_status: 'succeeded',
      checked_at: new Date().toISOString(),
      source: 'linear issue-context',
      error: null
    };
  } catch (error) {
    const parsedFailure = parseLinearIssueContextFailure(error);
    if (parsedFailure) {
      return {
        issue,
        issue_id: null,
        state: null,
        state_type: null,
        is_terminal: null,
        usable: false,
        workspace_id: null,
        team_id: null,
        project_id: normalizeOptionalString(parsedFailure.actualProjectId),
        project_name: null,
        expected_workspace_id: scope.workspace_id ?? null,
        expected_team_id: scope.team_id ?? null,
        expected_project_id: scope.project_id ?? normalizeOptionalString(parsedFailure.expectedProjectId),
        same_project: parsedFailure.scope === 'project' ? false : null,
        verification_status: 'failed',
        checked_at: new Date().toISOString(),
        source: 'linear issue-context',
        error: parsedFailure.message
      };
    }
    const detail =
      sampleLines(
        [error?.stdout, error?.stderr, error instanceof Error ? error.message : String(error)].filter(Boolean).join('\n')
      )[0] ?? (error instanceof Error ? error.message : String(error));
    return {
      issue,
      issue_id: null,
      state: null,
      state_type: null,
      is_terminal: null,
      usable: null,
      workspace_id: null,
      team_id: null,
      project_id: null,
      project_name: null,
      expected_workspace_id: scope.workspace_id ?? null,
      expected_team_id: scope.team_id ?? null,
      expected_project_id: scope.project_id ?? null,
      same_project: scope.project_id ? null : null,
      verification_status: 'failed',
      checked_at: new Date().toISOString(),
      source: 'linear issue-context',
      error: detail
    };
  }
}

function detectLinearIssueContextCacheFallback(payload) {
  for (const pathKeys of [
    ['cache_fallback_used'],
    ['cacheFallbackUsed'],
    ['cache', 'fallback_used'],
    ['cache', 'fallbackUsed'],
    ['source_setup', 'cache_fallback_used'],
    ['source_setup', 'cacheFallbackUsed'],
    ['sourceSetup', 'cache_fallback_used'],
    ['sourceSetup', 'cacheFallbackUsed']
  ]) {
    if (normalizeOptionalBoolean(readNestedValue(payload, pathKeys)) === true) {
      return `${pathKeys.join('.')}=true`;
    }
  }
  for (const pathKeys of [
    ['cache_status'],
    ['cacheStatus'],
    ['cache', 'status'],
    ['source_setup', 'cache_status'],
    ['source_setup', 'cacheStatus'],
    ['sourceSetup', 'cache_status'],
    ['sourceSetup', 'cacheStatus']
  ]) {
    if (normalizeOptionalString(readNestedValue(payload, pathKeys)) === 'fallback') {
      return `${pathKeys.join('.')}=fallback`;
    }
  }
  return null;
}

function readNestedValue(value, pathKeys) {
  let current = value;
  for (const key of pathKeys) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function parseLinearIssueContextFailure(error) {
  const stdout = typeof error?.stdout === 'string' ? error.stdout.trim() : '';
  if (!stdout) {
    return null;
  }
  try {
    const parsed = JSON.parse(stdout);
    const code = normalizeOptionalString(parsed?.error?.code);
    const message = normalizeOptionalString(parsed?.error?.message);
    if (!code) {
      return null;
    }
    const scope = code === 'linear_project_mismatch'
      ? 'project'
      : code === 'linear_team_mismatch'
        ? 'team'
        : code === 'linear_workspace_mismatch'
          ? 'workspace'
          : null;
    if (!scope) {
      return null;
    }
    return {
      scope,
      message: message ?? code,
      expectedProjectId: parsed?.error?.details?.expected,
      actualProjectId: parsed?.error?.details?.actual
    };
  } catch {
    return null;
  }
}

async function verifyCanonicalOwnerIssues(repoRoot, policy, env = process.env) {
  const ownerConfigs = normalizeCanonicalOwnerIssues(policy);
  if (ownerConfigs.length === 0) {
    return [];
  }
  return Promise.all(
    ownerConfigs.map(async (ownerConfig) =>
      attachCanonicalOwnerVerificationContext(
        await verifyOwnerIssueContext(repoRoot, ownerConfig.owner_issue, ownerConfig, env),
        ownerConfig
      )
    )
  );
}

export function buildDocsFreshnessMaintenanceDecision(
  report,
  {
    changedPaths = [],
    taskId = process.env.MCP_RUNNER_TASK_ID || 'local',
    specGuard = { status: 'skipped' },
    diffStatus = 'ok',
    diffBaseRef = null,
    generatedAt = new Date().toISOString(),
    ownerIssueVerification = null,
    canonicalOwnerIssueVerifications = [],
    specGuardPreExpiryEntries = []
  } = {}
) {
  const policy = report.rolling_freshness_policy ?? {};
  const normalizedSpecGuard = normalizeSpecGuardPayload(specGuard);
  const staleEntries = Array.isArray(report.stale_entries) ? report.stale_entries : [];
  const rollingEntries = Array.isArray(report.rolling_cohort_entries) ? report.rolling_cohort_entries : [];
  const reportedTerminalLifecycleEntries = Array.isArray(report.terminal_lifecycle_entries)
    ? report.terminal_lifecycle_entries.map(normalizeTerminalLifecycleEntry)
    : [];
  const terminalTaskStatusLifecycleEntries = [...staleEntries, ...rollingEntries]
    .filter(needsTerminalTaskStatusLifecycleAction)
    .map((entry) =>
      normalizeTerminalLifecycleEntry({
        ...entry,
        lifecycle_state: 'terminal_pending_archive',
        recommended_action: 'archive_or_reclassify_terminal_packet'
      })
    );
  const terminalLifecycleEntries = uniqueTerminalLifecycleEntries([
    ...reportedTerminalLifecycleEntries,
    ...terminalTaskStatusLifecycleEntries
  ]);
  const preExpiryEntries = Array.isArray(report.pre_expiry_entries)
    ? report.pre_expiry_entries.map((entry) => ({
        path: normalizeDocPath(entry?.path),
        doc_class: entry?.doc_class || 'uncatalogued',
        doc_class_label: entry?.doc_class_label || entry?.doc_class || 'Uncatalogued',
        path_family: entry?.path_family || 'unknown',
        last_review: entry?.last_review || null,
        cadence_days: Number.isInteger(entry?.cadence_days) ? entry.cadence_days : null,
        age_days: Number.isInteger(entry?.age_days) ? entry.age_days : null,
        days_until_expiry: Number.isInteger(entry?.days_until_expiry) ? entry.days_until_expiry : null,
        next_review: entry?.next_review || null,
        direct_action_required: entry?.direct_action_required === true,
        rolling_deferral_eligible: entry?.rolling_deferral_eligible === true
      }))
    : [];
  const normalizedSpecGuardPreExpiryEntries = (Array.isArray(specGuardPreExpiryEntries)
    ? specGuardPreExpiryEntries
    : []
  )
    .map(normalizeSpecGuardPreExpiryEntry)
    .filter(Boolean);
  const hasSpecGuardPreExpiryDebt = normalizedSpecGuardPreExpiryEntries.length > 0;
  const livePolicyStaleEntries = staleEntries.filter(isLivePolicyCapacityEntry);
  const livePolicyRollingEntries = rollingEntries.filter(isLivePolicyCapacityEntry);
  const hasOwnerRelevantDebtForAction =
    livePolicyStaleEntries.length > 0 ||
    livePolicyRollingEntries.length > 0 ||
    normalizedSpecGuard.status === 'failed' ||
    hasSpecGuardPreExpiryDebt;
  const resolvedOwnerIssueVerification = hasOwnerRelevantDebtForAction
    ? deriveOwnerIssueVerification(policy, ownerIssueVerification)
    : null;
  const ownerIssueAction = buildOwnerIssueAction(
    hasOwnerRelevantDebtForAction ? policy : { ...policy, require_live_owner_verification: false },
    resolvedOwnerIssueVerification
  );
  const blockingCandidateEntries = livePolicyStaleEntries
    .filter((entry) => isEligibleHistoricalEntry(entry, policy))
    .map((entry) => normalizeCandidateEntry(entry, policy, 'blocking_candidate'));
  const ownedRollingEntries = livePolicyRollingEntries
    .filter((entry) => isEligibleHistoricalEntry(entry, policy))
    .map((entry) => normalizeCandidateEntry(entry, policy, 'rolling_window'));
  const candidateEntries = [...blockingCandidateEntries, ...ownedRollingEntries];
  const blockingCandidatePaths = new Set(blockingCandidateEntries.map((entry) => entry.path));
  const candidatePaths = new Set(candidateEntries.map((entry) => entry.path));
  const nonCandidateStaleEntries = livePolicyStaleEntries
    .filter((entry) => !blockingCandidatePaths.has(normalizeDocPath(entry.path)))
    .map((entry) => normalizeCandidateEntry(entry, policy, 'hard_stale'));
  const hardStaleCurrentEntries = nonCandidateStaleEntries.filter(isCurrentDirectActionDoc);
  const nonCandidateRollingEntries = livePolicyRollingEntries
    .filter((entry) => !candidatePaths.has(normalizeDocPath(entry.path)))
    .map((entry) => normalizeCandidateEntry(entry, policy, 'rolling_non_candidate'));
  const rollingCurrentActionEntries = nonCandidateRollingEntries.filter(isCurrentDirectActionDoc);
  const candidateCohorts = [
    ...summarizeCandidateCohorts(
      candidateEntries,
      policy,
      ownerIssueAction,
      canonicalOwnerIssueVerifications,
      { generatedAt }
    ),
    ...parseSpecGuardCandidateCohorts(normalizedSpecGuard, policy, ownerIssueAction, canonicalOwnerIssueVerifications)
  ];
  const unownedCandidateCohorts = candidateCohorts.filter(
    (cohort) => !isCohortOwnerResolved(cohort)
  );
  const ownedCandidateEntries = candidateCohorts
    .filter(isCohortOwnerResolved)
    .reduce((total, cohort) => total + Number(cohort?.stale_entries ?? 0), 0);
  const policyCapacityStatus = summarizePolicyCapacity(candidateEntries, policy, {
    hasUsableOwnerPath: hasUsableCohortOwner(candidateCohorts),
    hasPolicyOwnerUsable: ownerIssueAction.mode === 'update_existing'
  });
  const expiresAfterCandidates = uniqueSorted(candidateCohorts.map((cohort) => cohort.expires_after).filter(Boolean));
  const expiresAfter = expiresAfterCandidates[0] ?? null;

  const normalizedChangedPaths = uniqueSorted(changedPaths.map(normalizeDocPath));
  const registryFailurePaths = collectRegistryFailurePaths(report);
  const failurePaths = collectReportFailurePaths(report);
  const failurePathSet = new Set(failurePaths);
  const changedFailurePaths = normalizedChangedPaths.filter((changedPath) => failurePathSet.has(changedPath));
  const taskLocalFailurePaths =
    taskId && taskId !== 'local' ? failurePaths.filter((failurePath) => failurePath.includes(taskId)) : [];
  const blockingChangedPaths = uniqueSorted([...changedFailurePaths, ...taskLocalFailurePaths]);

  const registryBlockerCount =
    Number(report.totals?.missing_in_registry ?? 0) +
    Number(report.totals?.missing_on_disk ?? 0) +
    Number(report.totals?.invalid_entries ?? 0) +
    Number(report.totals?.uncatalogued_docs ?? 0);
  const hasOwnerRelevantDebt = livePolicyStaleEntries.length > 0 || livePolicyRollingEntries.length > 0;
  const hasTerminalLifecycleDebt = terminalLifecycleEntries.length > 0;

  let freshnessDecision = 'clean';
  if (registryBlockerCount > 0) {
    freshnessDecision = 'block_missing_or_invalid_registry';
  } else if (blockingChangedPaths.length > 0 || normalizedSpecGuard.status === 'failed') {
    freshnessDecision = 'block_diff_local';
  } else if (hasSpecGuardPreExpiryDebt) {
    freshnessDecision = 'block_spec_guard_pre_expiry';
  } else if (!hasProvenDiffStatus(diffStatus)) {
    freshnessDecision = 'block_diff_local';
  } else if (hasTerminalLifecycleDebt) {
    freshnessDecision = 'block_terminal_lifecycle';
  } else if (
    hasOwnerRelevantDebt &&
    (policyCapacityStatus.status === 'invalid_policy' || policyCapacityStatus.status === 'policy_missing')
  ) {
    freshnessDecision = 'block_unowned_repo_debt';
  } else if (policyCapacityStatus.status === 'expired') {
    freshnessDecision = 'block_policy_expired';
  } else if (policyCapacityStatus.status === 'over_budget') {
    freshnessDecision = 'block_policy_over_budget';
  } else if (
    unownedCandidateCohorts.length > 0 ||
    nonCandidateStaleEntries.length > 0 ||
    nonCandidateRollingEntries.length > 0
  ) {
    freshnessDecision = 'block_unowned_repo_debt';
  } else if (candidateEntries.length > 0 && ownedCandidateEntries > 0) {
    freshnessDecision = 'pass_with_owned_rolling_debt';
  }

  const decision = {
    version: 1,
    generated_at: generatedAt,
    task_id: taskId,
    freshness_decision: freshnessDecision,
    owner_issue: policy.owner_issue ?? null,
    owner_issue_action: ownerIssueAction,
    owner_issue_verification: resolvedOwnerIssueVerification,
    canonical_owner_issue_verifications: canonicalOwnerIssueVerifications,
    candidate_cohorts: candidateCohorts,
    lifecycle_actions: terminalLifecycleEntries.map((entry) => ({
      type: 'terminal_task_packet_archive_or_reclassify',
      path: entry.path,
      lifecycle_state: entry.lifecycle_state,
      recommended_action: entry.recommended_action,
      task_id: entry.task_id,
      task_key: entry.task_key,
      task_status: entry.task_status,
      completed_at: entry.completed_at,
      source_issue: entry.source_issue
    })),
    public_current_actions: [
      ...preExpiryEntries.map((entry) => ({
        type: 'strict_pre_expiry_review',
        path: entry.path,
        doc_class: entry.doc_class,
        doc_class_label: entry.doc_class_label,
        next_review: entry.next_review,
        days_until_expiry: entry.days_until_expiry,
        direct_action_required: entry.direct_action_required,
        rolling_deferral_eligible: false
      })),
      ...normalizedSpecGuardPreExpiryEntries.map((entry) => ({
        type: 'spec_guard_pre_expiry_review',
        path: entry.path,
        path_family: entry.path_family,
        next_review: entry.next_review,
        days_until_expiry: entry.days_until_expiry,
        last_review: entry.last_review,
        cadence_days: entry.cadence_days,
        age_days: entry.age_days,
        direct_action_required: true,
        rolling_deferral_eligible: false
      })),
      ...hardStaleCurrentEntries.map((entry) => ({
        type: 'strict_hard_stale_review',
        path: entry.path,
        doc_class: entry.doc_class,
        doc_class_label: entry.doc_class_label,
        last_review: entry.last_review,
        cadence_days: entry.cadence_days,
        age_days: entry.age_days,
        overdue_days: entry.overdue_days,
        direct_action_required: true,
        rolling_deferral_eligible: false
      })),
      ...rollingCurrentActionEntries.map((entry) => ({
        type: 'rolling_current_action_review',
        path: entry.path,
        doc_class: entry.doc_class,
        doc_class_label: entry.doc_class_label,
        last_review: entry.last_review,
        cadence_days: entry.cadence_days,
        age_days: entry.age_days,
        overdue_days: entry.overdue_days,
        direct_action_required: true,
        rolling_deferral_eligible: false
      }))
    ],
    blocking_changed_paths: blockingChangedPaths,
    diff_status: diffStatus,
    diff_base_ref: diffBaseRef,
    policy_capacity_status: policyCapacityStatus,
    expires_after: expiresAfter,
    fallback_expiry:
      candidateCohorts.length > 0
        ? {
            decision: 'expire fallback',
            canonical_owner_key: normalizeOptionalString(policy?.canonical_owner_key) ?? 'docs:freshness:maintain',
            owner_issue_action: selectRecommendedOwnerIssueAction(ownerIssueAction, candidateCohorts),
            review_date: isoDateFromTimestamp(generatedAt),
            maximum_lifetime_days: Number.isInteger(policy?.window_days) ? policy.window_days : null,
            expires_after: expiresAfter,
            retained_exceptions: candidateCohorts.map((cohort) => ({
              id: cohort.id,
              canonical_owner_key: cohort.canonical_owner_key,
              owner_issue: cohort.owner_issue,
              decision: cohort.fallback_expiry?.decision ?? 'route owner action',
              expires_after: cohort.fallback_expiry?.expires_after ?? null,
              removal_condition:
                cohort.fallback_expiry?.removal_condition ??
                'Resolve the routed docs freshness/spec-guard recurrence through the canonical owner action evidence.'
            })),
            validation: [
              'docs:freshness reports retained rolling debt instead of hiding it',
              'docs:freshness:maintain fails closed unless owner verification confirms a live same-project owner when required'
            ]
          }
        : null,
    recommended_action: buildRecommendedAction(freshnessDecision, {
      policy,
      expiresAfter,
      diffStatus,
      ownerIssueAction: selectRecommendedOwnerIssueAction(ownerIssueAction, candidateCohorts),
      preExpiryCount: preExpiryEntries.length,
      specGuardPreExpiryCount: normalizedSpecGuardPreExpiryEntries.length
    }),
    sample_paths: {
      changed_paths: normalizedChangedPaths.slice(0, 10),
      blocking_changed_paths: blockingChangedPaths.slice(0, 10),
      candidate_paths: candidateEntries.slice(0, 10).map((entry) => entry.path),
      terminal_lifecycle_paths: terminalLifecycleEntries.slice(0, 10).map((entry) => entry.path),
      pre_expiry_paths: preExpiryEntries.slice(0, 10).map((entry) => entry.path),
      spec_guard_pre_expiry_paths: normalizedSpecGuardPreExpiryEntries.slice(0, 10).map((entry) => entry.path),
      spec_guard_paths: collectSpecGuardFailurePaths(normalizedSpecGuard).slice(0, 10),
      hard_stale_paths: nonCandidateStaleEntries.slice(0, 10).map((entry) => entry.path),
      rolling_current_action_paths: rollingCurrentActionEntries.slice(0, 10).map((entry) => entry.path),
      rolling_non_candidate_paths: nonCandidateRollingEntries.slice(0, 10).map((entry) => entry.path),
      missing_or_invalid_paths: registryFailurePaths.slice(0, 10)
    },
    totals: {
      docs_scanned: report.totals?.docs_scanned ?? 0,
      registry_entries: report.totals?.registry_entries ?? 0,
      stale_entries: report.totals?.stale_entries ?? 0,
      rolling_cohort_entries: report.totals?.rolling_cohort_entries ?? 0,
      terminal_lifecycle_entries: terminalLifecycleEntries.length,
      pre_expiry_entries: preExpiryEntries.length,
      spec_guard_pre_expiry_entries: normalizedSpecGuardPreExpiryEntries.length,
      candidate_entries: candidateEntries.length,
      blocking_candidate_entries: blockingCandidateEntries.length,
      owned_rolling_entries: ownedRollingEntries.length,
      owned_candidate_entries: ownedCandidateEntries,
      unowned_candidate_cohorts: unownedCandidateCohorts.length,
      spec_guard_candidate_cohorts: candidateCohorts.filter(
        (cohort) => Number(cohort?.source_breakdown?.spec_guard ?? 0) > 0
      ).length,
      hard_stale_entries: nonCandidateStaleEntries.length,
      rolling_non_candidate_entries: nonCandidateRollingEntries.length,
      rolling_current_action_entries: rollingCurrentActionEntries.length,
      registry_blockers: registryBlockerCount,
      missing_in_registry: report.totals?.missing_in_registry ?? 0,
      missing_on_disk: report.totals?.missing_on_disk ?? 0,
      invalid_entries: report.totals?.invalid_entries ?? 0,
      uncatalogued_docs: report.totals?.uncatalogued_docs ?? 0
    },
    spec_guard_pre_expiry_entries: normalizedSpecGuardPreExpiryEntries,
    changed_paths: normalizedChangedPaths,
    spec_guard: normalizedSpecGuard,
    freshness_report: {
      registry_path: report.registry_path ?? null,
      catalog_path: report.catalog_path ?? null,
      generated_at: report.generated_at ?? null
    }
  };
  decision.repo_gate = buildDocsFreshnessRepoGate(decision);
  return decision;
}

async function gitOutput(repoRoot, args) {
  const { stdout } = await execFileAsync('git', ['-C', repoRoot, ...args], {
    maxBuffer: 64 * 1024 * 1024,
    timeout: GIT_COMMAND_TIMEOUT_MS
  });
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function gitRefExists(repoRoot, ref) {
  try {
    await execFileAsync('git', ['-C', repoRoot, 'cat-file', '-e', `${ref}^{commit}`], {
      maxBuffer: 64 * 1024 * 1024,
      timeout: GIT_COMMAND_TIMEOUT_MS
    });
    return true;
  } catch {
    return false;
  }
}

async function resolveBaseRef(repoRoot, requestedBase) {
  const candidates = [requestedBase, process.env.BASE_SHA, 'origin/main'].filter(Boolean);
  for (const candidate of candidates) {
    if (await gitRefExists(repoRoot, candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function collectChangedPaths(repoRoot, { baseRef = null } = {}) {
  const changed = new Set();
  const resolvedBaseRef = await resolveBaseRef(repoRoot, baseRef);
  let baseDiffSucceeded = false;
  if (resolvedBaseRef) {
    try {
      for (const file of await gitOutput(repoRoot, ['diff', '--name-only', `${resolvedBaseRef}...HEAD`])) {
        changed.add(normalizeDocPath(file));
      }
      baseDiffSucceeded = true;
    } catch {
      // Keep collecting worktree paths for diagnostics, but do not mark the diff as proven.
    }
  }
  const attempts = [];
  attempts.push(['diff', '--name-only']);
  attempts.push(['diff', '--cached', '--name-only']);
  attempts.push(['ls-files', '--others', '--exclude-standard']);

  let successfulWorkspaceAttempts = 0;
  for (const args of attempts) {
    try {
      for (const file of await gitOutput(repoRoot, args)) {
        changed.add(normalizeDocPath(file));
      }
      successfulWorkspaceAttempts += 1;
    } catch {
      // Keep trying the remaining sources so uncommitted and untracked paths still get surfaced.
    }
  }

  let status = 'unavailable';
  if (resolvedBaseRef && !baseDiffSucceeded) {
    status = 'base_diff_failed';
  } else if (successfulWorkspaceAttempts !== attempts.length) {
    status = 'unavailable';
  } else if (!resolvedBaseRef) {
    status = 'missing_base';
  } else {
    status = 'ok';
  }

  return {
    base_ref: resolvedBaseRef,
    status,
    paths: uniqueSorted([...changed])
  };
}

async function runSpecGuard(repoRoot, { skip = false } = {}) {
  if (skip) {
    return { status: 'skipped' };
  }
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, ['scripts/spec-guard.mjs'], {
      cwd: repoRoot,
      maxBuffer: 64 * 1024 * 1024
    });
    return {
      status: 'succeeded',
      parsed_failures: parseSpecGuardFailureLines([...stdout.split(/\r?\n/), ...stderr.split(/\r?\n/)]),
      stdout_sample: sampleLines(stdout),
      stderr_sample: sampleLines(stderr)
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : '';
    const message = error?.message ? String(error.message) : '';
    return {
      status: 'failed',
      exit_code: typeof error?.code === 'number' ? error.code : 1,
      parsed_failures: parseSpecGuardFailureLines([...stdout.split(/\r?\n/), ...stderr.split(/\r?\n/), message]),
      stdout_sample: sampleLines(stdout),
      stderr_sample: sampleLines(stderr || message)
    };
  }
}

export async function runDocsFreshnessMaintain(
  repoRoot,
  {
    registryPath = DEFAULT_REGISTRY_PATH,
    freshnessReportPath = null,
    summaryMarkdownPath = null,
    maintenanceReportPath = null,
    outRoot = path.join(repoRoot, 'out'),
    taskId = process.env.MCP_RUNNER_TASK_ID || 'local',
    baseRef = null,
    changedPaths = null,
    skipSpecGuard = false,
    skipOwnerActionEvidence = false,
    dryRunLinearActions = false,
    env = process.env
  } = {}
) {
  const freshnessResult = await runDocsFreshness(repoRoot, {
    registryPath,
    reportPath: freshnessReportPath,
    summaryMarkdownPath,
    outRoot,
    taskId
  });
  const [diffResult, specGuard, specGuardPreExpiryEntries] = await Promise.all([
    Array.isArray(changedPaths)
      ? Promise.resolve({ base_ref: baseRef, status: 'provided', paths: changedPaths })
      : collectChangedPaths(repoRoot, { baseRef }),
    runSpecGuard(repoRoot, { skip: skipSpecGuard }),
    collectSpecGuardPreExpiryEntries(repoRoot)
  ]);
  const hasSpecGuardPreExpiryDebt = specGuardPreExpiryEntries.length > 0;
  const hasOwnerRelevantDebt =
    (Array.isArray(freshnessResult.report?.stale_entries) && freshnessResult.report.stale_entries.length > 0) ||
    (Array.isArray(freshnessResult.report?.rolling_cohort_entries) &&
      freshnessResult.report.rolling_cohort_entries.length > 0) ||
    specGuard.status === 'failed' ||
    hasSpecGuardPreExpiryDebt;
  const shouldVerifyCanonicalOwners =
    shouldVerifyCanonicalOwnerIssues(freshnessResult.report) ||
    specGuard.status === 'failed' ||
    hasSpecGuardPreExpiryDebt;
  const [ownerIssueVerification, canonicalOwnerIssueVerifications] = await Promise.all([
    hasOwnerRelevantDebt
      ? verifyOwnerIssueContext(
          repoRoot,
          freshnessResult.report?.rolling_freshness_policy?.owner_issue ?? null,
          freshnessResult.report?.rolling_freshness_policy ?? null,
          env
        )
      : Promise.resolve(null),
    shouldVerifyCanonicalOwners
      ? verifyCanonicalOwnerIssues(repoRoot, freshnessResult.report?.rolling_freshness_policy ?? {}, env)
      : Promise.resolve([])
  ]);
  const decision = buildDocsFreshnessMaintenanceDecision(freshnessResult.report, {
    changedPaths: diffResult.paths,
    taskId,
    specGuard,
    diffStatus: diffResult.status,
    diffBaseRef: diffResult.base_ref,
    ownerIssueVerification,
    canonicalOwnerIssueVerifications,
    specGuardPreExpiryEntries
  });
  decision.diff = diffResult;
  if (!skipOwnerActionEvidence) {
    decision.owner_action_evidence = buildDocsFreshnessOwnerActionEvidence(decision, {
      env,
      dryRunLinearActions,
      ownerFinalizerVerifications: [ownerIssueVerification, ...canonicalOwnerIssueVerifications].filter(Boolean)
    });
    decision.owner_finalizer = decision.owner_action_evidence.owner_finalizer ?? null;
    decision.repo_gate = buildDocsFreshnessRepoGate(decision);
  }

  const absoluteReportPath = maintenanceReportPath
    ? path.resolve(repoRoot, maintenanceReportPath)
    : path.join(outRoot, taskId, 'docs-freshness-maintenance.json');
  await mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, JSON.stringify(decision, null, 2) + '\n', 'utf8');

  return {
    decision,
    reportPath: absoluteReportPath,
    freshnessReportPath: freshnessResult.reportPath,
    summaryMarkdownPath: freshnessResult.summaryMarkdownPath,
    shouldBlock:
      !PASSING_DECISIONS.has(decision.freshness_decision) ||
      decision.owner_action_evidence?.should_block === true
  };
}

async function main() {
  const { repoRoot, outRoot } = resolveEnvironmentPaths();
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    return;
  }

  const knownFlags = new Set([
    'registry',
    'freshness-report',
    'summary-markdown',
    'report',
    'base',
    'format',
    'skip-spec-guard',
    'skip-owner-action-evidence',
    'dry-run-linear-actions',
    'warn',
    'check',
    'h',
    'help'
  ]);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    throw new Error(`Unknown option: ${label}`);
  }

  const format = typeof args.format === 'string' ? args.format : 'text';
  if (!['text', 'json'].includes(format)) {
    throw new Error(`Unsupported --format value: ${format}`);
  }

  const taskId = process.env.MCP_RUNNER_TASK_ID || 'local';
  const result = await runDocsFreshnessMaintain(repoRoot, {
    registryPath: typeof args.registry === 'string' ? args.registry : DEFAULT_REGISTRY_PATH,
    freshnessReportPath: typeof args['freshness-report'] === 'string' ? args['freshness-report'] : null,
    summaryMarkdownPath: typeof args['summary-markdown'] === 'string' ? args['summary-markdown'] : null,
    maintenanceReportPath: typeof args.report === 'string' ? args.report : null,
    outRoot,
    taskId,
    baseRef: typeof args.base === 'string' ? args.base : null,
    skipSpecGuard: hasFlag(args, 'skip-spec-guard'),
    skipOwnerActionEvidence: hasFlag(args, 'skip-owner-action-evidence'),
    dryRunLinearActions: hasFlag(args, 'dry-run-linear-actions'),
    env: process.env
  });

  if (format === 'json') {
    console.log(JSON.stringify({ ...result.decision, report_path: toPosixPath(path.relative(repoRoot, result.reportPath)) }));
  } else {
    console.log(`docs:freshness:maintain ${result.decision.freshness_decision}`);
    console.log(`- owner issue: ${result.decision.owner_issue ?? 'none'}`);
    console.log(`- owner action evidence: ${result.decision.owner_action_evidence?.status ?? 'not_evaluated'}`);
    console.log(`- policy capacity: ${result.decision.policy_capacity_status.status}`);
    console.log(`- repo gate: severity=${result.decision.repo_gate?.severity ?? 'unknown'} actions=${result.decision.repo_gate?.action_required_count ?? 0} blocks_handoff=${result.decision.repo_gate?.blocks_handoff === true ? 'yes' : 'no'}`);
    console.log(`- blocking changed paths: ${result.decision.blocking_changed_paths.length}`);
    console.log(`- report: ${toPosixPath(path.relative(repoRoot, result.reportPath))}`);
    console.log(`- action: ${result.decision.recommended_action}`);
  }

  if (result.shouldBlock && !hasFlag(args, 'warn')) {
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
