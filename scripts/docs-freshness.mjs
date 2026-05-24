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
import {
  buildTaskPacketLifecycleIndex,
  classifyTaskPacketPathFamily,
  collectTaskIndexItems,
  isTaskPacketLifecyclePath,
  isTerminalTaskStatus,
  normalizeDocPath,
  PRESERVED_HISTORICAL_STUB_STATUS,
  TERMINAL_PENDING_ARCHIVE_STATUS
} from './lib/docs-freshness-lifecycle.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';

const DEFAULT_REGISTRY_PATH = 'docs/docs-freshness-registry.json';
const TASKS_INDEX_PATH = 'tasks/index.json';
const STATUS_VALUES = new Set([
  'active',
  'archived',
  'deprecated',
  PRESERVED_HISTORICAL_STUB_STATUS,
  TERMINAL_PENDING_ARCHIVE_STATUS
]);
const OWNER_REQUIRED_STATUSES = new Set(['active', 'deprecated', TERMINAL_PENDING_ARCHIVE_STATUS]);
const STALE_ELIGIBLE_STATUSES = new Set(['active', 'deprecated', TERMINAL_PENDING_ARCHIVE_STATUS]);
const OWNER_PLACEHOLDERS = new Set(['tbd', 'unassigned', 'owner']);
const STRICT_PRE_EXPIRY_DOC_CLASSES = new Set([
  'front_door',
  'public_guide',
  'repo_guide',
  'active_guide',
  'agent_policy',
  'shipped_skill',
  'shipped_companion',
  'seeded_template'
]);
const PRESERVED_HISTORICAL_STUB_PATH_PATTERNS = [/^tasks\/tasks-[^/]+\.md$/, /^\.agent\/task\/[^/]+\.md$/];
const PRESERVED_HISTORICAL_STUB_HEADING_PATTERN = /^\s*#\s+Historical stub\b/i;

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

function normalizeRegistryTaskStatus(entry) {
  for (const key of ['task_status', 'task_lifecycle_status', 'lifecycle_status']) {
    const value = entry?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
  }
  return null;
}

function hasExplicitNonTerminalTaskStatus(entry) {
  const taskStatus = normalizeRegistryTaskStatus(entry);
  return Boolean(taskStatus && !isTerminalTaskStatus(taskStatus));
}

function isStaleEligibleRegistryEntry(status, entry) {
  return STALE_ELIGIBLE_STATUSES.has(status) || hasExplicitNonTerminalTaskStatus(entry);
}

function isApprovedPreservedHistoricalStubPath(docPath) {
  const normalizedPath = normalizeDocPath(docPath);
  return PRESERVED_HISTORICAL_STUB_PATH_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

function hasPreservedHistoricalStubHeading(content) {
  return typeof content === 'string' && PRESERVED_HISTORICAL_STUB_HEADING_PATTERN.test(content);
}

async function loadRegistry(registryPath) {
  const raw = await readFile(registryPath, 'utf8');
  const data = JSON.parse(raw);
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  return { data, entries };
}

async function loadTaskLifecycleIndex(repoRoot) {
  const tasksIndexPath = path.join(repoRoot, TASKS_INDEX_PATH);
  if (!(await pathExists(tasksIndexPath))) {
    return buildTaskPacketLifecycleIndex([]);
  }
  const raw = await readFile(tasksIndexPath, 'utf8');
  const parsed = JSON.parse(raw);
  return buildTaskPacketLifecycleIndex(collectTaskIndexItems(parsed));
}

function classifyPath(docPath, catalog) {
  const normalizedPath = normalizeDocPath(docPath);
  const entry = catalog ? resolveDocsCatalogEntry(normalizedPath, catalog) : null;
  return entry?.doc_class || null;
}

function getClassLabel(docClass, catalog) {
  if (!docClass) {
    return 'Uncatalogued';
  }
  return catalog?.classes?.[docClass]?.label || docClass;
}

function classifyPathFamily(docPath) {
  return classifyTaskPacketPathFamily(docPath);
}

function extractTaskNumber(docPath) {
  const normalizedPath = normalizeDocPath(docPath);
  const basename = path.posix.basename(normalizedPath);
  const directMatch = basename.match(/^(?:tasks-)?(\d{4})-/);
  if (directMatch) {
    return directMatch[1];
  }
  const pathMatch = normalizedPath.match(/(?:^|\/)(\d{4})-/);
  return pathMatch ? pathMatch[1] : null;
}

function attachReportOnlyLifecyclePaths(lifecycleIndex, docPaths) {
  const terminalByTaskNumber = new Map();
  for (const item of lifecycleIndex.terminalItems ?? []) {
    const taskNumber = extractTaskNumber(item.task_key);
    if (taskNumber && !terminalByTaskNumber.has(taskNumber)) {
      terminalByTaskNumber.set(taskNumber, item);
    }
  }
  if (terminalByTaskNumber.size === 0) {
    return lifecycleIndex;
  }
  for (const docPath of docPaths) {
    if (lifecycleIndex.byPath.has(docPath)) {
      continue;
    }
    if (!docPath.startsWith('docs/findings/')) {
      continue;
    }
    const taskNumber = extractTaskNumber(docPath);
    const taskLifecycle = taskNumber ? terminalByTaskNumber.get(taskNumber) : null;
    if (!taskLifecycle) {
      continue;
    }
    lifecycleIndex.byPath.set(docPath, {
      ...taskLifecycle,
      path: docPath,
      path_family: 'docs/findings',
      lifecycle_state: TERMINAL_PENDING_ARCHIVE_STATUS,
      recommended_action: 'archive_or_reclassify_terminal_packet'
    });
  }
  return lifecycleIndex;
}

function explicitTerminalPendingLifecycle(status, entryPath) {
  if (status !== TERMINAL_PENDING_ARCHIVE_STATUS || !entryPath) {
    return null;
  }
  return {
    path: entryPath,
    path_family: classifyTaskPacketPathFamily(entryPath),
    lifecycle_state: TERMINAL_PENDING_ARCHIVE_STATUS,
    recommended_action: 'archive_or_reclassify_terminal_packet',
    task_id: null,
    task_key: null,
    title: null,
    status: null,
    completed_at: null,
    source_issue: null
  };
}

function explicitTerminalTaskStatusLifecycle(taskStatus, entryPath) {
  if (!entryPath || !isTerminalTaskStatus(taskStatus) || !isTaskPacketLifecyclePath(entryPath)) {
    return null;
  }
  return {
    path: entryPath,
    path_family: classifyTaskPacketPathFamily(entryPath),
    lifecycle_state: TERMINAL_PENDING_ARCHIVE_STATUS,
    recommended_action: 'archive_or_reclassify_terminal_packet',
    task_id: null,
    task_key: null,
    title: null,
    status: taskStatus,
    completed_at: null,
    source_issue: null
  };
}

function resolveEffectiveReviewDate(lifecycleIndex, entryPath, registryLastReview, registryReviewDate) {
  const fallback = {
    effectiveLastReview: registryLastReview,
    effectiveReviewDate: registryReviewDate,
    reviewSourceMetadata: {}
  };
  if (!entryPath || !registryReviewDate) {
    return fallback;
  }

  const taskIndexEntry = lifecycleIndex.taskItemsByPath?.get(entryPath);
  const taskIndexReviewDate = parseIsoDate(taskIndexEntry?.last_review);
  if (!taskIndexEntry || !taskIndexReviewDate || taskIndexReviewDate <= registryReviewDate) {
    return fallback;
  }

  return {
    effectiveLastReview: taskIndexEntry.last_review,
    effectiveReviewDate: taskIndexReviewDate,
    reviewSourceMetadata: {
      last_review_source: TASKS_INDEX_PATH,
      registry_last_review: registryLastReview,
      task_index_last_review: taskIndexEntry.last_review,
      task_index_task_key: taskIndexEntry.task_key,
      ...(taskIndexEntry.status ? { task_index_status: taskIndexEntry.status } : {}),
      ...(taskIndexEntry.source_issue?.identifier
        ? { task_index_issue_identifier: taskIndexEntry.source_issue.identifier }
        : {})
    }
  };
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

function normalizeStringArray(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const normalized = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
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
    const pathFamilies = normalizeStringArray(item.path_families, []);
    const pathPrefixes = normalizeStringArray(item.path_prefixes, []).map(normalizeDocPath).filter(Boolean);
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
      owner_issue: ownerIssue,
      owner_issue_workspace_id: normalizeOptionalString(item.owner_issue_workspace_id),
      owner_issue_team_id: normalizeOptionalString(item.owner_issue_team_id),
      owner_issue_project_id: normalizeOptionalString(item.owner_issue_project_id),
      owner_issue_state: normalizeOptionalString(item.owner_issue_state),
      owner_issue_state_type: normalizeOptionalString(item.owner_issue_state_type),
      owner_issue_is_terminal: normalizeOptionalBoolean(item.owner_issue_is_terminal),
      require_live_owner_verification: normalizeOptionalBoolean(item.require_live_owner_verification)
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
      canonical_owner_key: null,
      owner_issue: null,
      owner_issue_workspace_id: null,
      owner_issue_team_id: null,
      owner_issue_project_id: null,
      owner_issue_state: null,
      owner_issue_state_type: null,
      owner_issue_is_terminal: null,
      require_live_owner_verification: false,
      policy_doc: null,
      window_days: 0,
      max_cohorts: 0,
      max_entries: 0,
      eligible_doc_classes: [],
      baseline_cohorts: [],
      canonical_owner_issues: [],
      action_after_window: null
    };
  }

  const ownerIssue = typeof rawPolicy.owner_issue === 'string' ? rawPolicy.owner_issue.trim() || null : null;
  const policyDoc = typeof rawPolicy.policy_doc === 'string' ? rawPolicy.policy_doc.trim() || null : null;
  const windowDays = Number.isInteger(rawPolicy.window_days) && rawPolicy.window_days >= 0 ? rawPolicy.window_days : null;
  const maxCohorts = Number.isInteger(rawPolicy.max_cohorts) && rawPolicy.max_cohorts > 0 ? rawPolicy.max_cohorts : null;
  const maxEntries = Number.isInteger(rawPolicy.max_entries) && rawPolicy.max_entries > 0 ? rawPolicy.max_entries : null;
  const eligibleDocClasses = normalizeStringArray(rawPolicy.eligible_doc_classes, []);
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
    canonical_owner_key: normalizeOptionalString(rawPolicy.canonical_owner_key),
    owner_issue: ownerIssue,
    owner_issue_workspace_id: normalizeOptionalString(rawPolicy.owner_issue_workspace_id),
    owner_issue_team_id: normalizeOptionalString(rawPolicy.owner_issue_team_id),
    owner_issue_project_id: normalizeOptionalString(rawPolicy.owner_issue_project_id),
    owner_issue_state: normalizeOptionalString(rawPolicy.owner_issue_state),
    owner_issue_state_type: normalizeOptionalString(rawPolicy.owner_issue_state_type),
    owner_issue_is_terminal: normalizeOptionalBoolean(rawPolicy.owner_issue_is_terminal),
    require_live_owner_verification: normalizeOptionalBoolean(rawPolicy.require_live_owner_verification) === true,
    policy_doc: policyDoc,
    window_days: normalizeNonNegativeInteger(rawPolicy.window_days, 0),
    max_cohorts: normalizePositiveInteger(rawPolicy.max_cohorts, 0),
    max_entries: normalizePositiveInteger(rawPolicy.max_entries, 0),
    eligible_doc_classes: eligibleDocClasses,
    baseline_cohorts: baselineCohorts.cohorts,
    canonical_owner_issues: canonicalOwnerIssues.owners,
    action_after_window:
      typeof rawPolicy.action_after_window === 'string' ? rawPolicy.action_after_window.trim() || null : null
  };
}

function incrementCount(map, key) {
  const normalizedKey = key || 'unknown';
  map.set(normalizedKey, (map.get(normalizedKey) || 0) + 1);
}

function mapToSortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function summarizeTaskLineage(entries) {
  const taskNumbers = [...new Set(entries.map((entry) => entry.task_number).filter(Boolean))].sort();
  return {
    task_numbers: taskNumbers,
    task_count: taskNumbers.length,
    task_number_range: taskNumbers.length > 0 ? `${taskNumbers[0]}-${taskNumbers[taskNumbers.length - 1]}` : null
  };
}

function canonicalOwnerKeyForBaselineCohortId(baselineCohortId) {
  return baselineCohortId ? `baseline_cohort_id:${baselineCohortId}` : null;
}

function resolveRollingCohortOwnerIssue(policy, baselineCohortId) {
  const canonicalOwnerKey = canonicalOwnerKeyForBaselineCohortId(baselineCohortId);
  const canonicalOwner = canonicalOwnerKey
    ? policy.canonical_owner_issues.find((entry) => entry.canonical_owner_key === canonicalOwnerKey)
    : null;
  if (canonicalOwner) {
    return {
      owner_issue: canonicalOwner.owner_issue,
      configured_owner_issue: policy.owner_issue,
      owner_resolution_source: 'rolling_freshness_policy.canonical_owner_issues',
      canonical_owner_key: canonicalOwnerKey
    };
  }
  return {
    owner_issue: policy.owner_issue,
    configured_owner_issue: policy.owner_issue,
    owner_resolution_source: 'rolling_freshness_policy.owner_issue',
    canonical_owner_key: canonicalOwnerKey
  };
}

function buildRollingCohortSummary(entries, policy) {
  const classBreakdown = new Map();
  const pathFamilyBreakdown = new Map();
  for (const entry of entries) {
    incrementCount(classBreakdown, entry.doc_class_label || entry.doc_class);
    incrementCount(pathFamilyBreakdown, entry.path_family);
  }
  const first = entries[0];
  const expiresAfter = addDaysToIsoDate(first.last_review, first.cadence_days + policy.window_days);
  const ownerResolution = resolveRollingCohortOwnerIssue(policy, first.baseline_cohort_id);
  return {
    id: `${first.baseline_cohort_id}-${first.last_review}-cadence-${first.cadence_days}-age-${first.age_days}`,
    baseline_cohort_id: first.baseline_cohort_id,
    ...ownerResolution,
    status: 'rolling_window',
    last_review: first.last_review,
    cadence_days: first.cadence_days,
    age_days: first.age_days,
    overdue_days: first.overdue_days,
    window_days: policy.window_days,
    expires_after: expiresAfter,
    action_after_window: policy.action_after_window,
    stale_entries: entries.length,
    class_breakdown: mapToSortedObject(classBreakdown),
    path_family_breakdown: mapToSortedObject(pathFamilyBreakdown),
    lineage: summarizeTaskLineage(entries),
    sample_paths: entries.slice(0, 10).map((entry) => entry.path)
  };
}

function isTaskNumberInRange(taskNumber, range) {
  return Boolean(taskNumber && range && Number(taskNumber) >= Number(range.start) && Number(taskNumber) <= Number(range.end));
}

function matchesDeclaredPath(entry, cohort) {
  return (
    isTaskNumberInRange(entry.task_number, cohort.task_number_range) ||
    cohort.path_prefixes.some((prefix) => entry.path.startsWith(prefix))
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

function applyRollingFreshnessPolicy(rawStaleEntries, docsCatalog) {
  const policy = normalizeRollingFreshnessPolicy(docsCatalog?.policies?.rolling_freshness_cohorts);
  if (!policy.enabled || !policy.is_valid || rawStaleEntries.length === 0) {
    return {
      policy,
      blockingStaleEntries: rawStaleEntries,
      rollingCohortEntries: [],
      rollingFreshnessCohorts: []
    };
  }

  const eligibleClasses = new Set(policy.eligible_doc_classes);
  const eligibleEntries = rawStaleEntries.flatMap((entry) => {
    const baselineCohort = findMatchingBaselineCohort(entry, policy);
    if (
      !baselineCohort ||
      !eligibleClasses.has(entry.doc_class) ||
      !Number.isInteger(entry.overdue_days) ||
      entry.overdue_days <= 0 ||
      entry.overdue_days > policy.window_days
    ) {
      return [];
    }
    return [{ ...entry, baseline_cohort_id: baselineCohort.id }];
  });

  const cohortsByKey = new Map();
  for (const entry of eligibleEntries) {
    const key = `${entry.baseline_cohort_id}|${entry.last_review}|${entry.cadence_days}|${entry.age_days}`;
    if (!cohortsByKey.has(key)) {
      cohortsByKey.set(key, []);
    }
    cohortsByKey.get(key).push(entry);
  }

  const policyCapacityExceeded = cohortsByKey.size > policy.max_cohorts || eligibleEntries.length > policy.max_entries;
  if (policyCapacityExceeded) {
    return {
      policy,
      blockingStaleEntries: rawStaleEntries,
      rollingCohortEntries: [],
      rollingFreshnessCohorts: []
    };
  }

  const rollingPaths = new Set(eligibleEntries.map((entry) => entry.path));
  const rollingFreshnessCohorts = [...cohortsByKey.values()]
    .map((entries) => buildRollingCohortSummary(entries, policy))
    .sort((left, right) => left.last_review.localeCompare(right.last_review));

  return {
    policy,
    blockingStaleEntries: rawStaleEntries.filter((entry) => !rollingPaths.has(entry.path)),
    rollingCohortEntries: eligibleEntries,
    rollingFreshnessCohorts
  };
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
    Number(entry?.terminal_lifecycle_entries ?? 0) +
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
    `- Rolling cohort entries: ${report.totals.rolling_cohort_entries ?? 0}`,
    `- Terminal lifecycle entries: ${report.totals.terminal_lifecycle_entries ?? 0}`,
    `- Pre-expiry strict entries: ${report.totals.pre_expiry_entries ?? 0}`,
    `- Task-index review overrides: ${report.totals.task_index_review_overrides ?? 0}`,
    `- Uncatalogued docs: ${report.totals.uncatalogued_docs}`,
    '',
    '## Class Summary',
    '',
    '| Class | Docs | Registry | Missing Registry | Missing On Disk | Invalid | Stale | Terminal Lifecycle | Uncatalogued |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];

  for (const entry of report.class_summary ?? []) {
    lines.push(
      `| ${entry.label} | ${entry.docs_scanned} | ${entry.registry_entries} | ${entry.missing_in_registry} | ${entry.missing_on_disk} | ${entry.invalid_entries} | ${entry.stale_entries} | ${entry.terminal_lifecycle_entries ?? 0} | ${entry.uncatalogued_docs} |`
    );
  }

  const failingClasses = (report.class_summary ?? []).filter((entry) => countClassFailures(entry) > 0);
  const rollingCohorts = Array.isArray(report.rolling_freshness_cohorts) ? report.rolling_freshness_cohorts : [];

  if (rollingCohorts.length > 0) {
    lines.push('', '## Rolling Freshness Cohorts', '');
    for (const cohort of rollingCohorts) {
      lines.push(`### ${cohort.id}`, '');
      lines.push(`- Owner issue: ${cohort.owner_issue ?? 'unassigned'}`);
      if (report.rolling_freshness_policy?.policy_doc) {
        lines.push(`- Policy doc: ${report.rolling_freshness_policy.policy_doc}`);
      }
      lines.push(`- Stale entries: ${cohort.stale_entries}`);
      lines.push(
        `- Review window: last_review=${cohort.last_review}, cadence=${cohort.cadence_days}, age=${cohort.age_days}, overdue=${cohort.overdue_days}, window=${cohort.window_days}`
      );
      lines.push(`- Expires after: ${cohort.expires_after ?? 'unknown'}`);
      lines.push(`- Class breakdown: ${JSON.stringify(cohort.class_breakdown ?? {})}`);
      lines.push(`- Path family breakdown: ${JSON.stringify(cohort.path_family_breakdown ?? {})}`);
      if (cohort.lineage?.task_number_range) {
        lines.push(`- Task lineage: ${cohort.lineage.task_number_range} (${cohort.lineage.task_count} task ids)`);
      }
      lines.push(`- Sample paths: ${summarizeItems(cohort.sample_paths, (item) => item)}`);
      lines.push('');
    }
  }

  const preExpiryEntries = Array.isArray(report.pre_expiry_entries) ? report.pre_expiry_entries : [];
  if (preExpiryEntries.length > 0) {
    lines.push('', '## Strict Pre-Expiry Actions', '');
    for (const entry of preExpiryEntries.slice(0, 10)) {
      lines.push(
        `- \`${entry.path}\`: ${entry.doc_class_label} expires in ${entry.days_until_expiry} day(s), next_review=${entry.next_review}`
      );
    }
    if (preExpiryEntries.length > 10) {
      lines.push(`- Additional strict entries: ${preExpiryEntries.length - 10}`);
    }
  }

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
      `- Terminal lifecycle entries (${entry.terminal_lifecycle_entries ?? 0}): ${summarizeItems(
        failures.terminal_lifecycle_entries,
        (item) => `${item.path} (${item.lifecycle_state}, task=${item.task_id ?? item.task_key ?? 'unknown'})`
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

  const [docFiles, registryResult, docsCatalog, lifecycleIndex] = await Promise.all([
    collectDocFiles(repoRoot),
    loadRegistry(absoluteRegistryPath),
    loadDocsCatalog(repoRoot),
    loadTaskLifecycleIndex(repoRoot)
  ]);
  const normalizedDocFiles = docFiles.map((docPath) => normalizeDocPath(docPath)).filter(Boolean);
  attachReportOnlyLifecyclePaths(lifecycleIndex, normalizedDocFiles);

  const registryEntries = registryResult.entries;
  const invalidEntries = [];
  const rawStaleEntries = [];
  const terminalLifecycleEntries = [];
  const preExpiryEntries = [];
  const taskIndexReviewOverrides = [];
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
    const taskStatus = normalizeRegistryTaskStatus(entry);
    const explicitNonTerminalTaskStatus = hasExplicitNonTerminalTaskStatus(entry);
    const cadenceDays = Number.isFinite(entry?.cadence_days) ? Number(entry.cadence_days) : NaN;
    const reviewDate = parseIsoDate(entry?.last_review);
    const docClass = classifyPath(entryPath, docsCatalog);
    const docClassLabel = getClassLabel(docClass || 'uncatalogued', docsCatalog);

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

    if (OWNER_REQUIRED_STATUSES.has(status) || explicitNonTerminalTaskStatus) {
      if (!owner || OWNER_PLACEHOLDERS.has(owner.toLowerCase())) {
        issues.push('missing owner');
      }
    }

    let entryContent = null;
    if (entryPath) {
      const abs = path.resolve(repoRoot, entryPath);
      if (!(await pathExists(abs))) {
        missingOnDisk.push(entryPath);
        metricsByClass.push({ doc_class: docClass, metric: 'missing_on_disk' });
      } else if (status === PRESERVED_HISTORICAL_STUB_STATUS) {
        entryContent = await readFile(abs, 'utf8');
      }
    }

    if (
      status === PRESERVED_HISTORICAL_STUB_STATUS &&
      (!isApprovedPreservedHistoricalStubPath(entryPath) || !hasPreservedHistoricalStubHeading(entryContent))
    ) {
      issues.push('preserved_historical_stub requires a historical task continuity stub');
    }

    if (issues.length > 0) {
      invalidEntries.push({ path: entryPath || '<missing>', issues });
      metricsByClass.push({ doc_class: docClass, metric: 'invalid_entries' });
    }

    if (reviewDate && Number.isInteger(cadenceDays) && cadenceDays > 0) {
      if (isStaleEligibleRegistryEntry(status, entry)) {
        const { effectiveLastReview, effectiveReviewDate, reviewSourceMetadata } = resolveEffectiveReviewDate(
          lifecycleIndex,
          entryPath,
          entry.last_review,
          reviewDate
        );
        const ageDays = computeAgeInDays(effectiveReviewDate, today);
        const daysUntilExpiry = cadenceDays - ageDays;
        const terminalLifecycle = explicitNonTerminalTaskStatus
          ? null
          : lifecycleIndex.byPath.get(entryPath) ??
            explicitTerminalPendingLifecycle(status, entryPath) ??
            explicitTerminalTaskStatusLifecycle(taskStatus, entryPath);
        const registryLifecycleMetadata = {
          ...(STALE_ELIGIBLE_STATUSES.has(status) ? {} : { registry_status: status }),
          ...(taskStatus ? { task_status: taskStatus } : {}),
          ...(typeof entry?.lifecycle_state === 'string' && entry.lifecycle_state.trim()
            ? { lifecycle_state: entry.lifecycle_state.trim() }
            : {})
        };
        if (reviewSourceMetadata.last_review_source === TASKS_INDEX_PATH) {
          taskIndexReviewOverrides.push({
            path: entryPath,
            last_review: effectiveLastReview,
            cadence_days: cadenceDays,
            age_days: ageDays,
            days_until_expiry: daysUntilExpiry,
            next_review: addDaysToIsoDate(effectiveLastReview, cadenceDays),
            doc_class: docClass || 'uncatalogued',
            doc_class_label: docClassLabel,
            path_family: classifyPathFamily(entryPath),
            registry_status: status,
            registry_was_stale: computeAgeInDays(reviewDate, today) > cadenceDays,
            ...reviewSourceMetadata,
            ...registryLifecycleMetadata
          });
        }
        if (
          STRICT_PRE_EXPIRY_DOC_CLASSES.has(docClass || '') &&
          daysUntilExpiry >= 0 &&
          daysUntilExpiry <= 7
        ) {
          preExpiryEntries.push({
            path: entryPath,
            last_review: effectiveLastReview,
            cadence_days: cadenceDays,
            age_days: ageDays,
            days_until_expiry: daysUntilExpiry,
            next_review: addDaysToIsoDate(effectiveLastReview, cadenceDays),
            doc_class: docClass || 'uncatalogued',
            doc_class_label: docClassLabel,
            path_family: classifyPathFamily(entryPath),
            direct_action_required: true,
            rolling_deferral_eligible: false,
            ...reviewSourceMetadata,
            ...registryLifecycleMetadata
          });
        }
        if (terminalLifecycle) {
          terminalLifecycleEntries.push({
            path: entryPath,
            last_review: effectiveLastReview,
            cadence_days: cadenceDays,
            age_days: ageDays,
            overdue_days: Math.max(0, ageDays - cadenceDays),
            doc_class: docClass || 'uncatalogued',
            doc_class_label: docClassLabel,
            path_family: classifyPathFamily(entryPath),
            task_number: extractTaskNumber(entryPath),
            ...reviewSourceMetadata,
            ...registryLifecycleMetadata,
            ...terminalLifecycle,
            registry_status: status,
            lifecycle_state: TERMINAL_PENDING_ARCHIVE_STATUS,
            recommended_action:
              terminalLifecycle.recommended_action ?? 'archive_or_reclassify_terminal_packet'
          });
        } else if (ageDays > cadenceDays) {
          rawStaleEntries.push({
            path: entryPath,
            last_review: effectiveLastReview,
            cadence_days: cadenceDays,
            age_days: ageDays,
            overdue_days: ageDays - cadenceDays,
            doc_class: docClass || 'uncatalogued',
            doc_class_label: docClassLabel,
            path_family: classifyPathFamily(entryPath),
            task_number: extractTaskNumber(entryPath),
            ...reviewSourceMetadata,
            ...registryLifecycleMetadata
          });
        }
      }
    }
  }

  const { policy: rollingFreshnessPolicy, blockingStaleEntries, rollingCohortEntries, rollingFreshnessCohorts } =
    applyRollingFreshnessPolicy(rawStaleEntries, docsCatalog);
  const staleEntries = blockingStaleEntries;
  for (const entry of staleEntries) {
    metricsByClass.push({ doc_class: entry.doc_class, metric: 'stale_entries' });
  }
  for (const entry of terminalLifecycleEntries) {
    metricsByClass.push({ doc_class: entry.doc_class, metric: 'terminal_lifecycle_entries' });
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
            ),
      terminal_lifecycle_entries: terminalLifecycleEntries.filter(
        (item) => (classifyPath(item.path, docsCatalog) || 'uncatalogued') === entry.doc_class
      ),
      task_index_review_overrides: taskIndexReviewOverrides.filter(
        (item) => (classifyPath(item.path, docsCatalog) || 'uncatalogued') === entry.doc_class
      )
    };
    return result;
  }, {});

  const report = {
    version: 3,
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
      rolling_cohort_entries: rollingCohortEntries.length,
      terminal_lifecycle_entries: terminalLifecycleEntries.length,
      pre_expiry_entries: preExpiryEntries.length,
      task_index_review_overrides: taskIndexReviewOverrides.length,
      uncatalogued_docs: uncataloguedDocs.length
    },
    rolling_freshness_policy: rollingFreshnessPolicy,
    class_summary: classSummary,
    grouped_failures: groupedFailures,
    uncatalogued_docs: uncataloguedDocs,
    missing_in_registry: missingInRegistry,
    missing_on_disk: missingOnDisk,
    invalid_entries: invalidEntries,
    stale_entries: staleEntries,
    terminal_lifecycle_entries: terminalLifecycleEntries,
    pre_expiry_entries: preExpiryEntries,
    task_index_review_overrides: taskIndexReviewOverrides,
    rolling_cohort_entries: rollingCohortEntries,
    rolling_freshness_cohorts: rollingFreshnessCohorts
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
    terminalLifecycleEntries.length > 0 ||
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
  if ((report.totals.terminal_lifecycle_entries ?? 0) > 0) {
    console.log(`- terminal lifecycle entries: ${report.totals.terminal_lifecycle_entries}`);
  }
  if ((report.totals.pre_expiry_entries ?? 0) > 0) {
    console.log(`- strict docs approaching expiry: ${report.totals.pre_expiry_entries}`);
  }
  if ((report.totals.task_index_review_overrides ?? 0) > 0) {
    console.log(`- task-index review overrides: ${report.totals.task_index_review_overrides}`);
  }
  if ((report.totals.rolling_cohort_entries ?? 0) > 0) {
    console.log(`- rolling freshness cohort entries: ${report.totals.rolling_cohort_entries}`);
    for (const cohort of report.rolling_freshness_cohorts ?? []) {
      console.log(
        `- rolling cohort ${cohort.owner_issue ?? 'unassigned'}: ${cohort.stale_entries} docs, last_review=${cohort.last_review}, overdue=${cohort.overdue_days}/${cohort.window_days} days`
      );
    }
  }
  if (report.totals.uncatalogued_docs > 0) {
    console.log(`- uncatalogued docs: ${report.totals.uncatalogued_docs}`);
  }

  for (const entry of report.class_summary ?? []) {
    console.log(
      `- ${entry.label}: docs=${entry.docs_scanned} registry=${entry.registry_entries} missing_registry=${entry.missing_in_registry} stale=${entry.stale_entries} terminal_lifecycle=${entry.terminal_lifecycle_entries ?? 0}`
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
