#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTROL_PLANE_INVARIANTS_SCHEMA = 'codex.control-plane.operational-drift-invariants';
export const CONTROL_PLANE_INVARIANTS_VERSION = 1;

const DEFAULT_CONFIG_PATH = 'docs/control-plane-invariants.json';
const REQUIRED_LIFECYCLE_STATES = ['active', 'blocked', 'terminal', 'archived', 'reopened'];
const REQUIRED_TERMINAL_EXCLUSIONS = [
  'active_freshness_cap',
  'fallback_expiry',
  'provider_worker_blocking'
];
const REQUIRED_FALLBACK_FIELDS = [
  'surface',
  'fallback',
  'decision',
  'owner',
  'trigger',
  'introduced_date',
  'review_date',
  'maximum_lifetime',
  'removal_condition',
  'validation'
];
const REQUIRED_FALLBACK_FAIL_CLOSED_INPUTS = [
  'prose_only',
  'markdown_table_variant',
  'missing_owner',
  'expired_without_review'
];
const REQUIRED_DESIRED_STATE_DOMAINS = [
  'wip_cap',
  'process_lease',
  'goal_duplication',
  'shared_root_branch',
  'stale_worker_branch',
  'review',
  'linear_relation_label'
];
const REQUIRED_REVIEW_STATE_FIELDS = [
  'current_head_sha',
  'approval_state',
  'finding_state',
  'manual_trigger_attempts'
];
const REQUIRED_REVIEW_WORKFLOW_CHECKS = [
  'original_spec',
  'coding_standards',
  'required_code_changes',
  'creating_agent_loop'
];
const REQUIRED_REVIEW_PROPOSAL_CLASSES = ['code_change_proposals', 'agent_loop_proposals'];
const REQUIRED_STATUS_DIMENSIONS = [
  'issue_state',
  'goal_state',
  'process_agent_state',
  'branch_posture',
  'review_state',
  'gate_state'
];
const TASK_PACKET_INDEX_PATH_FIELDS = [
  ['prd', 0],
  ['docs', 1],
  ['action_plan', 2],
  ['spec', 3],
  ['task', 4],
  ['agent_task', 5]
];

export async function runControlPlaneInvariants(repoRoot = process.cwd(), options = {}) {
  const absoluteRoot = resolve(repoRoot);
  const configPath = resolve(absoluteRoot, options.configPath ?? DEFAULT_CONFIG_PATH);
  const config = await readJson(configPath);
  const findings = [];
  const taskIndex = await readOptionalJson(resolve(absoluteRoot, 'tasks/index.json'));
  const freshnessRegistry = await readOptionalJson(
    resolve(absoluteRoot, 'docs/docs-freshness-registry.json')
  );

  validateCatalogEnvelope(config, findings, configPath);
  validateLifecycle(config.task_spec_lifecycle, findings);
  validateGuardContracts(config.guard_contracts, findings);
  validateFallbackMetadata(config.fallback_refactor_metadata, findings);
  validateDesiredStateReconciler(config.desired_state_reconciler, findings);
  validateReviewAutomation(config.codex_review_automation, findings);
  validateLinearHygiene(config.linear_hygiene, findings);
  validateReviewWorkflow(config.review_workflow, findings);
  validateStatusMonitor(config.status_monitor, findings);
  validateChildWorkstreams(config.child_workstreams, findings);
  await validateTaskPacket(config, {
    findings,
    repoRoot: absoluteRoot,
    taskIndex,
    freshnessRegistry
  });

  const report = {
    schema_id: CONTROL_PLANE_INVARIANTS_SCHEMA,
    schema_version: CONTROL_PLANE_INVARIANTS_VERSION,
    generated_at: new Date().toISOString(),
    config_path: relativeToRepo(absoluteRoot, configPath),
    status: findings.some((finding) => finding.severity === 'error') ? 'failed' : 'passed',
    totals: {
      findings: findings.length,
      errors: findings.filter((finding) => finding.severity === 'error').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length
    },
    owner: config.owner ?? null,
    canonical_owner_key: config.canonical_owner_key ?? null,
    task_registry_id: config.task_packet?.task_registry_id ?? null,
    invariants: {
      lifecycle_states: normalizeStringArray(config.task_spec_lifecycle?.states),
      guard_contract_count: Array.isArray(config.guard_contracts)
        ? config.guard_contracts.length
        : 0,
      desired_state_domains: normalizeStringArray(config.desired_state_reconciler?.domains?.map((domain) => domain?.id)),
      status_monitor_dimensions: normalizeStringArray(config.status_monitor?.dimensions)
    },
    findings
  };

  const outputPath = resolveOutputPath(absoluteRoot, options);
  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  return {
    report,
    hasFailures: report.status === 'failed',
    outputPath
  };
}

export function renderControlPlaneInvariantsMarkdown(report) {
  const lines = [
    '# Control Plane Operational Drift Invariants',
    '',
    `- Status: ${report.status}`,
    `- Findings: ${report.totals.findings} (${report.totals.errors} errors, ${report.totals.warnings} warnings)`,
    `- Canonical owner key: ${report.canonical_owner_key ?? 'n/a'}`
  ];
  if (report.findings.length > 0) {
    lines.push('', '## Findings');
    for (const finding of report.findings) {
      lines.push(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function validateCatalogEnvelope(config, findings, configPath) {
  if (!isRecord(config)) {
    addFinding(findings, 'error', 'catalog_not_object', 'Invariant catalog must be a JSON object.', '$');
    return;
  }
  if (config.schema_id !== CONTROL_PLANE_INVARIANTS_SCHEMA) {
    addFinding(
      findings,
      'error',
      'schema_id_mismatch',
      `Expected schema_id=${CONTROL_PLANE_INVARIANTS_SCHEMA}.`,
      '$.schema_id'
    );
  }
  if (config.schema_version !== CONTROL_PLANE_INVARIANTS_VERSION) {
    addFinding(
      findings,
      'error',
      'schema_version_mismatch',
      `Expected schema_version=${CONTROL_PLANE_INVARIANTS_VERSION}.`,
      '$.schema_version'
    );
  }
  if (!readNonEmptyString(config.canonical_owner_key)) {
    addFinding(findings, 'error', 'canonical_owner_key_missing', 'Canonical owner key is required.', '$.canonical_owner_key');
  }
  const marker = readNonEmptyString(config.canonical_owner_marker);
  if (!marker || marker !== `codex-orchestrator:canonical-owner-key=${config.canonical_owner_key}`) {
    addFinding(
      findings,
      'error',
      'canonical_owner_marker_mismatch',
      'Canonical owner marker must exactly match the canonical owner key.',
      '$.canonical_owner_marker'
    );
  }
  if (!readNonEmptyString(config.owner)) {
    addFinding(findings, 'error', 'owner_missing', 'Invariant catalog must name an owner.', '$.owner');
  }
  if (!readNonEmptyString(config.updated_at)) {
    addFinding(findings, 'error', 'updated_at_missing', 'Invariant catalog must record updated_at.', '$.updated_at');
  }
  if (!configPath.endsWith(DEFAULT_CONFIG_PATH)) {
    addFinding(findings, 'warning', 'non_default_config_path', 'Invariant catalog was loaded from a non-default path.', '$');
  }
}

function validateLifecycle(lifecycle, findings) {
  const path = '$.task_spec_lifecycle';
  if (!isRecord(lifecycle)) {
    addFinding(findings, 'error', 'lifecycle_missing', 'Task/spec lifecycle model is required.', path);
    return;
  }
  requireIncludes({
    findings,
    path: `${path}.states`,
    code: 'lifecycle_state_missing',
    values: normalizeStringArray(lifecycle.states),
    required: REQUIRED_LIFECYCLE_STATES
  });
  requireIncludes({
    findings,
    path: `${path}.terminal.excluded_from`,
    code: 'terminal_exclusion_missing',
    values: normalizeStringArray(lifecycle.terminal?.excluded_from),
    required: REQUIRED_TERMINAL_EXCLUSIONS
  });
  if (!readNonEmptyString(lifecycle.canonical_state_source)) {
    addFinding(
      findings,
      'error',
      'lifecycle_canonical_source_missing',
      'Lifecycle model must name one canonical state source.',
      `${path}.canonical_state_source`
    );
  }
  if (!Array.isArray(lifecycle.reopen_requires) || lifecycle.reopen_requires.length === 0) {
    addFinding(
      findings,
      'error',
      'lifecycle_reopen_contract_missing',
      'Lifecycle model must define explicit reopen requirements.',
      `${path}.reopen_requires`
    );
  }
}

function validateGuardContracts(contracts, findings) {
  const path = '$.guard_contracts';
  if (!Array.isArray(contracts) || contracts.length === 0) {
    addFinding(findings, 'error', 'guard_contracts_missing', 'At least one guard contract is required.', path);
    return;
  }
  for (const [index, contract] of contracts.entries()) {
    const contractPath = `${path}[${index}]`;
    if (!isRecord(contract)) {
      addFinding(findings, 'error', 'guard_contract_not_object', 'Guard contract must be an object.', contractPath);
      continue;
    }
    const dryRun = contract.dry_run;
    const nonDry = contract.non_dry;
    if (!isRecord(dryRun) || !isRecord(nonDry)) {
      addFinding(
        findings,
        'error',
        'guard_contract_modes_missing',
        'Guard contract must define dry_run and non_dry modes.',
        contractPath
      );
      continue;
    }
    for (const key of ['selector_engine', 'rule_engine', 'validation_semantics']) {
      if (dryRun[key] !== nonDry[key]) {
        addFinding(
          findings,
          'error',
          'guard_dry_run_non_dry_semantics_diverge',
          `Guard dry-run and non-dry modes must share ${key}.`,
          `${contractPath}.${key}`
        );
      }
    }
    if (dryRun.writes !== false) {
      addFinding(
        findings,
        'error',
        'guard_dry_run_writes_enabled',
        'Guard dry-run mode must skip writes only.',
        `${contractPath}.dry_run.writes`
      );
    }
    if (!Array.isArray(contract.tests) || contract.tests.length === 0) {
      addFinding(
        findings,
        'error',
        'guard_contract_tests_missing',
        'Guard dry-run/non-dry parity must cite test coverage.',
        `${contractPath}.tests`
      );
    }
  }
}

function validateFallbackMetadata(metadata, findings) {
  const path = '$.fallback_refactor_metadata';
  if (!isRecord(metadata)) {
    addFinding(findings, 'error', 'fallback_metadata_missing', 'Structured fallback/refactor metadata contract is required.', path);
    return;
  }
  requireIncludes({
    findings,
    path: `${path}.required_fields`,
    code: 'fallback_metadata_field_missing',
    values: normalizeStringArray(metadata.required_fields),
    required: REQUIRED_FALLBACK_FIELDS
  });
  requireIncludes({
    findings,
    path: `${path}.fail_closed_inputs`,
    code: 'fallback_metadata_fail_closed_input_missing',
    values: normalizeStringArray(metadata.fail_closed_inputs),
    required: REQUIRED_FALLBACK_FAIL_CLOSED_INPUTS
  });
  if (metadata.parser !== 'schema_validated') {
    addFinding(
      findings,
      'error',
      'fallback_metadata_parser_not_schema_validated',
      'Fallback metadata must use a schema-validated parser.',
      `${path}.parser`
    );
  }
}

function validateDesiredStateReconciler(reconciler, findings) {
  const path = '$.desired_state_reconciler';
  if (!isRecord(reconciler)) {
    addFinding(findings, 'error', 'desired_state_reconciler_missing', 'Desired-state reconciler contract is required.', path);
    return;
  }
  const domains = Array.isArray(reconciler.domains) ? reconciler.domains : [];
  requireIncludes({
    findings,
    path: `${path}.domains`,
    code: 'desired_state_domain_missing',
    values: normalizeStringArray(domains.map((domain) => domain?.id)),
    required: REQUIRED_DESIRED_STATE_DOMAINS
  });
  for (const [index, domain] of domains.entries()) {
    if (!isRecord(domain)) {
      addFinding(findings, 'error', 'desired_state_domain_not_object', 'Desired-state domain must be an object.', `${path}.domains[${index}]`);
      continue;
    }
    if (!readNonEmptyString(domain.authority)) {
      addFinding(findings, 'error', 'desired_state_domain_authority_missing', 'Desired-state domain must name live authority.', `${path}.domains[${index}].authority`);
    }
    if (!readNonEmptyString(domain.drift_action)) {
      addFinding(findings, 'error', 'desired_state_domain_action_missing', 'Desired-state domain must name report/repair behavior.', `${path}.domains[${index}].drift_action`);
    }
  }
}

function validateReviewAutomation(automation, findings) {
  const path = '$.codex_review_automation';
  if (!isRecord(automation)) {
    addFinding(findings, 'error', 'review_automation_missing', 'Codex review automation contract is required.', path);
    return;
  }
  if (automation.keyed_by !== 'pr_head_sha') {
    addFinding(findings, 'error', 'review_not_head_sha_keyed', 'Codex review automation must be keyed by PR head SHA.', `${path}.keyed_by`);
  }
  if (automation.new_head_invalidates_approval !== true) {
    addFinding(findings, 'error', 'review_stale_approval_not_invalidated', 'A new PR head must invalidate prior approval.', `${path}.new_head_invalidates_approval`);
  }
  if (automation.manual_trigger_idempotency !== 'once_per_head_sha') {
    addFinding(findings, 'error', 'review_manual_trigger_not_idempotent', 'Manual review triggers must be idempotent once per head SHA.', `${path}.manual_trigger_idempotency`);
  }
  requireIncludes({
    findings,
    path: `${path}.state_fields`,
    code: 'review_state_field_missing',
    values: normalizeStringArray(automation.state_fields),
    required: REQUIRED_REVIEW_STATE_FIELDS
  });
}

function validateLinearHygiene(linearHygiene, findings) {
  const path = '$.linear_hygiene';
  if (!isRecord(linearHygiene)) {
    addFinding(findings, 'error', 'linear_hygiene_missing', 'Linear hygiene contract is required.', path);
    return;
  }
  requireIncludes({
    findings,
    path: `${path}.builds_on`,
    code: 'linear_hygiene_related_owner_missing',
    values: normalizeStringArray(linearHygiene.builds_on),
    required: ['CO-509', 'CO-538']
  });
  if (linearHygiene.creation_requires_live_label_ids !== true) {
    addFinding(findings, 'error', 'linear_creation_label_proof_missing', 'Issue creation must require live label ids.', `${path}.creation_requires_live_label_ids`);
  }
  if (linearHygiene.reconciler_verifies_live_relations !== true) {
    addFinding(findings, 'error', 'linear_relation_reconciler_missing', 'Linear reconciler must verify live relations.', `${path}.reconciler_verifies_live_relations`);
  }
}

function validateReviewWorkflow(workflow, findings) {
  const path = '$.review_workflow';
  if (!isRecord(workflow)) {
    addFinding(findings, 'error', 'review_workflow_missing', 'Review workflow contract is required.', path);
    return;
  }
  requireIncludes({
    findings,
    path: `${path}.checks`,
    code: 'review_workflow_check_missing',
    values: normalizeStringArray(workflow.checks),
    required: REQUIRED_REVIEW_WORKFLOW_CHECKS
  });
  requireIncludes({
    findings,
    path: `${path}.proposal_classes`,
    code: 'review_workflow_proposal_class_missing',
    values: normalizeStringArray(workflow.proposal_classes),
    required: REQUIRED_REVIEW_PROPOSAL_CLASSES
  });
}

function validateStatusMonitor(statusMonitor, findings) {
  const path = '$.status_monitor';
  if (!isRecord(statusMonitor)) {
    addFinding(findings, 'error', 'status_monitor_missing', 'Status monitor contract is required.', path);
    return;
  }
  requireIncludes({
    findings,
    path: `${path}.dimensions`,
    code: 'status_monitor_dimension_missing',
    values: normalizeStringArray(statusMonitor.dimensions),
    required: REQUIRED_STATUS_DIMENSIONS
  });
  if (statusMonitor.goal_policy?.max_active_goals_per_linear_issue !== 1) {
    addFinding(findings, 'error', 'status_monitor_goal_policy_missing', 'Status monitor must enforce one active goal per Linear issue/lane.', `${path}.goal_policy.max_active_goals_per_linear_issue`);
  }
  if (statusMonitor.goal_policy?.overlap_detection !== 'fail_closed') {
    addFinding(findings, 'error', 'status_monitor_goal_overlap_not_fail_closed', 'Overlapping goals must fail closed.', `${path}.goal_policy.overlap_detection`);
  }
}

function validateChildWorkstreams(workstreams, findings) {
  const path = '$.child_workstreams';
  if (!Array.isArray(workstreams) || workstreams.length < 6) {
    addFinding(findings, 'error', 'child_workstreams_missing', 'All six proposed child workstreams must be represented.', path);
    return;
  }
  for (const [index, workstream] of workstreams.entries()) {
    if (!isRecord(workstream) || !readNonEmptyString(workstream.id) || !readNonEmptyString(workstream.owner_surface)) {
      addFinding(findings, 'error', 'child_workstream_shape_invalid', 'Child workstream must name id and owner_surface.', `${path}[${index}]`);
    }
  }
}

async function validateTaskPacket(config, input) {
  const packet = config.task_packet;
  const path = '$.task_packet';
  if (!isRecord(packet)) {
    addFinding(input.findings, 'error', 'task_packet_missing', 'CO-552 task packet linkage is required.', path);
    return;
  }
  const registryId = readNonEmptyString(packet.task_registry_id);
  if (!registryId) {
    addFinding(input.findings, 'error', 'task_packet_registry_id_missing', 'Task packet must name registry id.', `${path}.task_registry_id`);
  }
  const packetPaths = normalizeStringArray(packet.paths);
  if (packetPaths.length === 0) {
    addFinding(input.findings, 'error', 'task_packet_paths_missing', 'Task packet must name packet paths.', `${path}.paths`);
  }
  for (const packetPath of packetPaths) {
    await validateRepoPathExists(input.repoRoot, packetPath, input.findings, `${path}.paths`);
  }

  const items = Array.isArray(input.taskIndex?.items) ? input.taskIndex.items : [];
  const registryEntry = registryId ? items.find((item) => item?.id === registryId) : null;
  if (registryId && !registryEntry) {
    addFinding(input.findings, 'error', 'task_registry_entry_missing', `tasks/index.json missing ${registryId}.`, 'tasks/index.json');
  }
  const expectedStatus = readNonEmptyString(packet.expected_task_status);
  if (registryEntry && expectedStatus && registryEntry.status !== expectedStatus) {
    addFinding(
      input.findings,
      'error',
      'task_registry_status_mismatch',
      `Expected task status ${expectedStatus}, found ${registryEntry.status ?? 'missing'}.`,
      'tasks/index.json'
    );
  }
  validateTaskIndexPacketPaths(registryEntry, packetPaths, input.findings);

  const freshnessEntries = Array.isArray(input.freshnessRegistry?.entries)
    ? input.freshnessRegistry.entries
    : [];
  const freshnessByPath = new Map(freshnessEntries.map((entry) => [entry?.path, entry]));
  for (const packetPath of packetPaths) {
    const entry = freshnessByPath.get(packetPath);
    if (!entry) {
      addFinding(
        input.findings,
        'error',
        'freshness_registry_entry_missing',
        `docs/docs-freshness-registry.json missing ${packetPath}.`,
        'docs/docs-freshness-registry.json'
      );
      continue;
    }
    if (entry.status !== 'active') {
      addFinding(
        input.findings,
        'error',
        'freshness_registry_status_mismatch',
        `Expected active registry row for ${packetPath}.`,
        'docs/docs-freshness-registry.json'
      );
    }
    if (entry.lifecycle_state && entry.lifecycle_state !== 'active') {
      addFinding(
        input.findings,
        'error',
        'freshness_registry_lifecycle_mismatch',
        `Expected active lifecycle row for ${packetPath}.`,
        'docs/docs-freshness-registry.json'
      );
    }
  }
}

function validateTaskIndexPacketPaths(registryEntry, packetPaths, findings) {
  if (!registryEntry) {
    return;
  }
  const indexPaths = isRecord(registryEntry.paths) ? registryEntry.paths : null;
  if (!indexPaths) {
    addFinding(
      findings,
      'error',
      'task_registry_paths_missing',
      'tasks/index.json entry must include packet paths.',
      'tasks/index.json'
    );
    return;
  }
  for (const [field, packetIndex] of TASK_PACKET_INDEX_PATH_FIELDS) {
    const expected = normalizeRepoPath(packetPaths[packetIndex]);
    if (!expected) {
      continue;
    }
    const actual = normalizeRepoPath(indexPaths[field]);
    if (!actual) {
      addFinding(
        findings,
        'error',
        'task_registry_path_missing',
        `tasks/index.json missing paths.${field} for ${expected}.`,
        'tasks/index.json'
      );
      continue;
    }
    if (actual !== expected) {
      addFinding(
        findings,
        'error',
        'task_registry_path_mismatch',
        `tasks/index.json paths.${field} expected ${expected}, found ${actual}.`,
        'tasks/index.json'
      );
    }
  }
  const expectedRelatesTo = normalizeRepoPath(packetPaths[4]);
  const actualRelatesTo = normalizeRepoPath(registryEntry.relates_to);
  if (expectedRelatesTo && actualRelatesTo !== expectedRelatesTo) {
    addFinding(
      findings,
      'error',
      'task_registry_relates_to_mismatch',
      `tasks/index.json relates_to expected ${expectedRelatesTo}, found ${actualRelatesTo || 'missing'}.`,
      'tasks/index.json'
    );
  }
}

async function validateRepoPathExists(repoRoot, repoPath, findings, sourcePath) {
  const normalized = normalizeRepoPath(repoPath);
  const absolutePath = resolve(repoRoot, normalized);
  const absoluteRoot = resolve(repoRoot);
  const escapesRepo = absolutePath !== absoluteRoot && !absolutePath.startsWith(`${absoluteRoot}/`);
  if (
    !normalized ||
    isAbsolute(normalized) ||
    /^[A-Za-z]:\//u.test(normalized) ||
    normalized.startsWith('../') ||
    normalized === '..' ||
    escapesRepo
  ) {
    addFinding(findings, 'error', 'task_packet_path_invalid', `Invalid repo-relative path ${repoPath}.`, sourcePath);
    return;
  }
  try {
    await access(resolve(repoRoot, normalized));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      addFinding(findings, 'error', 'task_packet_path_missing', `Missing repo path ${normalized}.`, sourcePath);
      return;
    }
    throw error;
  }
}

function requireIncludes(input) {
  const values = new Set(input.values);
  for (const required of input.required) {
    if (!values.has(required)) {
      addFinding(
        input.findings,
        'error',
        input.code,
        `Required value '${required}' is missing.`,
        input.path
      );
    }
  }
}

function addFinding(findings, severity, code, message, path) {
  findings.push({
    severity,
    code,
    message,
    path
  });
}

function resolveOutputPath(repoRoot, options) {
  if (options.outputPath === false) {
    return null;
  }
  if (typeof options.outputPath === 'string' && options.outputPath.trim()) {
    return resolve(repoRoot, options.outputPath);
  }
  const taskId =
    readNonEmptyString(options.taskId) ??
    readNonEmptyString(process.env.MCP_RUNNER_TASK_ID) ??
    readNonEmptyString(process.env.TASK) ??
    readNonEmptyString(process.env.CODEX_ORCHESTRATOR_TASK_ID) ??
    'control-plane-invariants';
  const outRoot = resolve(repoRoot, options.outRoot ?? 'out');
  return join(outRoot, taskId, 'control-plane-invariants.json');
}

function parseArgs(argv) {
  const options = {
    check: false,
    format: 'text',
    configPath: DEFAULT_CONFIG_PATH,
    outputPath: undefined,
    taskId: undefined,
    outRoot: undefined
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') {
      options.check = true;
    } else if (arg === '--format') {
      options.format = argv[++index] ?? 'text';
    } else if (arg === '--config') {
      options.configPath = argv[++index] ?? DEFAULT_CONFIG_PATH;
    } else if (arg === '--out') {
      options.outputPath = argv[++index] ?? undefined;
    } else if (arg === '--task') {
      options.taskId = argv[++index] ?? undefined;
    } else if (arg === '--out-root') {
      options.outRoot = argv[++index] ?? undefined;
    } else if (arg === '--no-write') {
      options.outputPath = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/control-plane-invariants.mjs [--check] [--format json] [--config <path>] [--out <path>] [--task <task-id>]\n\nValidates docs/control-plane-invariants.json and the linked CO-552 packet/registry rows.`);
}

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readNonEmptyString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => readNonEmptyString(entry))
    .filter((entry) => entry !== null);
}

function normalizeRepoPath(value) {
  const text = readNonEmptyString(value);
  if (!text) {
    return '';
  }
  return text.replace(/\\/g, '/').replace(/^\.\//, '');
}

function relativeToRepo(repoRoot, path) {
  const normalizedRoot = resolve(repoRoot);
  const normalizedPath = resolve(path);
  return normalizedPath.startsWith(`${normalizedRoot}/`)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : normalizedPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runControlPlaneInvariants(process.cwd(), options);
  if (options.format === 'json') {
    console.log(JSON.stringify(result.report, null, 2));
  } else {
    console.log(renderControlPlaneInvariantsMarkdown(result.report));
    if (result.outputPath) {
      console.log(`Report: ${relativeToRepo(process.cwd(), result.outputPath)}`);
    }
  }
  if (options.check && result.hasFailures) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
