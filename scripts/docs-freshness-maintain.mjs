#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { parseIsoDate, toPosixPath } from './lib/docs-helpers.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';
import { runDocsFreshness } from './docs-freshness.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const GIT_COMMAND_TIMEOUT_MS = 60_000;
const LINEAR_ISSUE_CONTEXT_TIMEOUT_MS = 60_000;
const PASSING_DECISIONS = new Set(['clean', 'pass_with_owned_rolling_debt']);
const CANONICAL_OWNER_MARKER_PREFIX = 'codex-orchestrator:canonical-owner-key=';
const CANONICAL_OWNER_KEY_MAX_LENGTH = 512;
const TERMINAL_WORKFLOW_STATE_TYPES = new Set(['completed', 'canceled', 'cancelled', 'duplicate']);
const TERMINAL_WORKFLOW_STATES = new Set(['done', 'completed', 'canceled', 'cancelled', 'duplicate']);

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
  return {
    duplicate_policy: ownerActionDuplicatePolicy(config),
    policy_doc: config?.policy_doc ?? null,
    ...(canonicalOwnerKey ? { canonical_owner_key: canonicalOwnerKey } : {}),
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
  if (verification?.usable === false && verification?.is_terminal === true) {
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

function shouldVerifyCanonicalOwnerIssues(report) {
  const policy = report?.rolling_freshness_policy ?? {};
  if (policy?.is_valid !== true) {
    return false;
  }

  const ownerCandidateEntries = [
    ...(Array.isArray(report?.stale_entries) ? report.stale_entries : []),
    ...(Array.isArray(report?.rolling_cohort_entries) ? report.rolling_cohort_entries : [])
  ];
  return ownerCandidateEntries.some((entry) => isEligibleHistoricalEntry(entry, policy));
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
        source_breakdown: sortedObject(sourceBreakdown),
        lineage: summarizeTaskLineage(cohortEntries),
        sample_paths: cohortEntries.slice(0, 10).map((entry) => entry.path)
      };
    })
    .sort((left, right) => `${left.last_review}:${left.id}`.localeCompare(`${right.last_review}:${right.id}`));
}

function collectReportFailurePaths(report) {
  const invalidPaths = Array.isArray(report.invalid_entries)
    ? report.invalid_entries.map((entry) => normalizeDocPath(entry?.path))
    : [];
  return uniqueSorted([
    ...normalizeArray(report.missing_in_registry),
    ...normalizeArray(report.missing_on_disk),
    ...invalidPaths,
    ...normalizeArray(report.uncatalogued_docs),
    ...normalizeArray((report.stale_entries ?? []).map((entry) => entry.path)),
    ...normalizeArray((report.rolling_cohort_entries ?? []).map((entry) => entry.path))
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
    return {
      status: 'policy_missing',
      current_entries: candidateEntries.length,
      max_entries: policy?.max_entries ?? 0,
      current_cohorts: 0,
      max_cohorts: policy?.max_cohorts ?? 0
    };
  }
  if (
    !policy.is_valid ||
    !policy.owner_issue ||
    (candidateEntries.length > 0 && !hasUsableOwnerPath && !hasPolicyOwnerUsable)
  ) {
    return {
      status: 'invalid_policy',
      current_entries: candidateEntries.length,
      max_entries: policy.max_entries ?? 0,
      current_cohorts: 0,
      max_cohorts: policy.max_cohorts ?? 0
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
    over_entry_budget: overEntryBudget,
    over_cohort_budget: overCohortBudget
  };
}

function hasProvenDiffStatus(diffStatus) {
  return diffStatus === 'ok' || diffStatus === 'provided';
}

function buildRecommendedAction(decision, { policy, expiresAfter, diffStatus, ownerIssueAction }) {
  if (decision === 'clean') {
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
  if (decision === 'block_policy_expired') {
    return `Refresh, archive, or reclassify the expired historical cohort through ${describeOwnerIssuePath(ownerIssueAction)}; do not defer it further.`;
  }
  if (decision === 'block_policy_over_budget') {
    if (ownerIssueAction?.mode === 'update_existing_multiple') {
      return `Open or update the resolved owner paths through ${describeOwnerIssuePath(ownerIssueAction)} with refresh/archive action evidence; do not expand rolling caps to pass an unrelated lane.`;
    }
    return `Open or update the single owner path through ${describeOwnerIssuePath(ownerIssueAction)} with refresh/archive action evidence; do not expand rolling caps to pass an unrelated lane.`;
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

async function verifyOwnerIssueContext(repoRoot, ownerIssue, ownerConfig = null) {
  const issue = normalizeOptionalString(ownerIssue);
  if (!issue) {
    return null;
  }
  const scope = normalizeOwnerIssueScope(ownerConfig);

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
    const sameProject =
      projectMatches === false || teamMatches === false || workspaceMatches === false
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

async function verifyCanonicalOwnerIssues(repoRoot, policy) {
  const ownerConfigs = normalizeCanonicalOwnerIssues(policy);
  if (ownerConfigs.length === 0) {
    return [];
  }
  return Promise.all(
    ownerConfigs.map(async (ownerConfig) =>
      attachCanonicalOwnerVerificationContext(
        await verifyOwnerIssueContext(repoRoot, ownerConfig.owner_issue, ownerConfig),
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
    canonicalOwnerIssueVerifications = []
  } = {}
) {
  const policy = report.rolling_freshness_policy ?? {};
  const staleEntries = Array.isArray(report.stale_entries) ? report.stale_entries : [];
  const rollingEntries = Array.isArray(report.rolling_cohort_entries) ? report.rolling_cohort_entries : [];
  const hasOwnerRelevantDebtForAction = staleEntries.length > 0 || rollingEntries.length > 0;
  const resolvedOwnerIssueVerification = hasOwnerRelevantDebtForAction
    ? deriveOwnerIssueVerification(policy, ownerIssueVerification)
    : null;
  const ownerIssueAction = buildOwnerIssueAction(
    hasOwnerRelevantDebtForAction ? policy : { ...policy, require_live_owner_verification: false },
    resolvedOwnerIssueVerification
  );
  const blockingCandidateEntries = staleEntries
    .filter((entry) => isEligibleHistoricalEntry(entry, policy))
    .map((entry) => normalizeCandidateEntry(entry, policy, 'blocking_candidate'));
  const ownedRollingEntries = rollingEntries
    .filter((entry) => isEligibleHistoricalEntry(entry, policy))
    .map((entry) => normalizeCandidateEntry(entry, policy, 'rolling_window'));
  const candidateEntries = [...blockingCandidateEntries, ...ownedRollingEntries];
  const blockingCandidatePaths = new Set(blockingCandidateEntries.map((entry) => entry.path));
  const candidatePaths = new Set(candidateEntries.map((entry) => entry.path));
  const nonCandidateStaleEntries = staleEntries
    .filter((entry) => !blockingCandidatePaths.has(normalizeDocPath(entry.path)))
    .map((entry) => normalizeCandidateEntry(entry, policy, 'hard_stale'));
  const candidateCohorts = summarizeCandidateCohorts(
    candidateEntries,
    policy,
    ownerIssueAction,
    canonicalOwnerIssueVerifications,
    { generatedAt }
  );
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
  const hasOwnerRelevantDebt = candidateEntries.length > 0 || staleEntries.length > 0;

  let freshnessDecision = 'clean';
  if (registryBlockerCount > 0) {
    freshnessDecision = 'block_missing_or_invalid_registry';
  } else if (!hasProvenDiffStatus(diffStatus) || blockingChangedPaths.length > 0 || specGuard.status === 'failed') {
    freshnessDecision = 'block_diff_local';
  } else if (
    hasOwnerRelevantDebt &&
    (policyCapacityStatus.status === 'invalid_policy' || policyCapacityStatus.status === 'policy_missing')
  ) {
    freshnessDecision = 'block_unowned_repo_debt';
  } else if (policyCapacityStatus.status === 'expired') {
    freshnessDecision = 'block_policy_expired';
  } else if (policyCapacityStatus.status === 'over_budget') {
    freshnessDecision = 'block_policy_over_budget';
  } else if (unownedCandidateCohorts.length > 0 || nonCandidateStaleEntries.length > 0) {
    freshnessDecision = 'block_unowned_repo_debt';
  } else if (candidateEntries.length > 0 && ownedCandidateEntries > 0) {
    freshnessDecision = 'pass_with_owned_rolling_debt';
  }

  return {
    version: 1,
    generated_at: generatedAt,
    task_id: taskId,
    freshness_decision: freshnessDecision,
    owner_issue: policy.owner_issue ?? null,
    owner_issue_action: ownerIssueAction,
    owner_issue_verification: resolvedOwnerIssueVerification,
    canonical_owner_issue_verifications: canonicalOwnerIssueVerifications,
    candidate_cohorts: candidateCohorts,
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
              decision: cohort.fallback_expiry.decision,
              expires_after: cohort.fallback_expiry.expires_after,
              removal_condition: cohort.fallback_expiry.removal_condition
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
      ownerIssueAction: selectRecommendedOwnerIssueAction(ownerIssueAction, candidateCohorts)
    }),
    sample_paths: {
      changed_paths: normalizedChangedPaths.slice(0, 10),
      blocking_changed_paths: blockingChangedPaths.slice(0, 10),
      candidate_paths: candidateEntries.slice(0, 10).map((entry) => entry.path),
      hard_stale_paths: nonCandidateStaleEntries.slice(0, 10).map((entry) => entry.path),
      missing_or_invalid_paths: failurePaths
        .filter((failurePath) => !candidatePaths.has(failurePath))
        .slice(0, 10)
    },
    totals: {
      docs_scanned: report.totals?.docs_scanned ?? 0,
      registry_entries: report.totals?.registry_entries ?? 0,
      stale_entries: report.totals?.stale_entries ?? 0,
      rolling_cohort_entries: report.totals?.rolling_cohort_entries ?? 0,
      candidate_entries: candidateEntries.length,
      blocking_candidate_entries: blockingCandidateEntries.length,
      owned_rolling_entries: ownedRollingEntries.length,
      owned_candidate_entries: ownedCandidateEntries,
      unowned_candidate_cohorts: unownedCandidateCohorts.length,
      hard_stale_entries: nonCandidateStaleEntries.length,
      missing_in_registry: report.totals?.missing_in_registry ?? 0,
      missing_on_disk: report.totals?.missing_on_disk ?? 0,
      invalid_entries: report.totals?.invalid_entries ?? 0,
      uncatalogued_docs: report.totals?.uncatalogued_docs ?? 0
    },
    changed_paths: normalizedChangedPaths,
    spec_guard: specGuard,
    freshness_report: {
      registry_path: report.registry_path ?? null,
      catalog_path: report.catalog_path ?? null,
      generated_at: report.generated_at ?? null
    }
  };
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
      stdout_sample: sampleLines(stdout),
      stderr_sample: sampleLines(stderr)
    };
  } catch (error) {
    return {
      status: 'failed',
      exit_code: typeof error?.code === 'number' ? error.code : 1,
      stdout_sample: sampleLines(error?.stdout),
      stderr_sample: sampleLines(error?.stderr || error?.message)
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
    skipSpecGuard = false
  } = {}
) {
  const freshnessResult = await runDocsFreshness(repoRoot, {
    registryPath,
    reportPath: freshnessReportPath,
    summaryMarkdownPath,
    outRoot,
    taskId
  });
  const hasOwnerRelevantDebt =
    (Array.isArray(freshnessResult.report?.stale_entries) && freshnessResult.report.stale_entries.length > 0) ||
    (Array.isArray(freshnessResult.report?.rolling_cohort_entries) &&
      freshnessResult.report.rolling_cohort_entries.length > 0);
  const shouldVerifyCanonicalOwners = shouldVerifyCanonicalOwnerIssues(freshnessResult.report);
  const [diffResult, specGuard, ownerIssueVerification, canonicalOwnerIssueVerifications] = await Promise.all([
    Array.isArray(changedPaths)
      ? Promise.resolve({ base_ref: baseRef, status: 'provided', paths: changedPaths })
      : collectChangedPaths(repoRoot, { baseRef }),
    runSpecGuard(repoRoot, { skip: skipSpecGuard }),
    hasOwnerRelevantDebt
      ? verifyOwnerIssueContext(
          repoRoot,
          freshnessResult.report?.rolling_freshness_policy?.owner_issue ?? null,
          freshnessResult.report?.rolling_freshness_policy ?? null
        )
      : Promise.resolve(null),
    shouldVerifyCanonicalOwners
      ? verifyCanonicalOwnerIssues(repoRoot, freshnessResult.report?.rolling_freshness_policy ?? {})
      : Promise.resolve([])
  ]);
  const decision = buildDocsFreshnessMaintenanceDecision(freshnessResult.report, {
    changedPaths: diffResult.paths,
    taskId,
    specGuard,
    diffStatus: diffResult.status,
    diffBaseRef: diffResult.base_ref,
    ownerIssueVerification,
    canonicalOwnerIssueVerifications
  });
  decision.diff = diffResult;

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
    shouldBlock: !PASSING_DECISIONS.has(decision.freshness_decision)
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
    skipSpecGuard: hasFlag(args, 'skip-spec-guard')
  });

  if (format === 'json') {
    console.log(JSON.stringify({ ...result.decision, report_path: toPosixPath(path.relative(repoRoot, result.reportPath)) }));
  } else {
    console.log(`docs:freshness:maintain ${result.decision.freshness_decision}`);
    console.log(`- owner issue: ${result.decision.owner_issue ?? 'none'}`);
    console.log(`- policy capacity: ${result.decision.policy_capacity_status.status}`);
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
