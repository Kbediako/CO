/* eslint-disable patterns/prefer-logger-over-console */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';

import {
  readCoStatusJsonDataset,
  type CoStatusJsonDataset
} from './coStatusCliShell.js';
import {
  evaluateProviderControlHostFreshnessGauge,
  type ProviderControlHostFreshnessGaugeReport
} from './control/providerControlHostFreshnessGauge.js';
import {
  isActiveProviderIntakeClaim,
  normalizeProviderIntakeState,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState
} from './control/providerIntakeState.js';
import {
  inspectDelegateServerProcesses,
  type DelegateServerProcessInspection
} from './utils/delegationMcpHealth.js';
import { resolveCodexHome } from './utils/codexPaths.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';
type AuditVerdict = 'healthy' | 'degraded' | 'critical';
type FindingSeverity = 'degraded' | 'critical';
type RiskLevel = 'green' | 'degraded' | 'critical' | 'unknown';
type MutationMode = 'disabled' | 'audit_artifact_write' | 'operator_confirmed_remediation';
type RemediationTargetKind = 'stale-github-polling' | 'stale-delegate-server';
type RemediationStatus =
  | 'detectable_only'
  | 'remediation_eligible'
  | 'operator_confirm_required'
  | 'unsafe_to_kill'
  | 'skipped'
  | 'signal_sent'
  | 'terminated';
type RemediationOutcome =
  | 'not_requested'
  | 'dry_run'
  | 'confirmation_required'
  | 'outside_scope'
  | 'unsafe_to_kill'
  | 'already_exited'
  | 'identity_changed'
  | 'identity_revalidation_unavailable'
  | 'sigterm_sent'
  | 'signal_failed';

const QUOTA_HYGIENE_REMEDIATION_OWNER_KEY =
  'quota-hygiene:operator-confirmed-stale-process-remediation:v1';
const DEFAULT_REMEDIATION_STALE_THRESHOLD_SECONDS = 10 * 60;
const SIGNAL_VERIFICATION_WAIT_MS = 250;
const HYGIENE_QUOTA_FLAGS = new Set([
  'apply',
  'artifact-root',
  'automations-dir',
  'dry-run',
  'format',
  'goal-manifest',
  'help',
  'now',
  'only',
  'pid',
  'pids',
  'provider-intake-state',
  'remediation-output',
  'repo',
  'stale-threshold-seconds',
  'yes'
]);
const REMEDIATION_TARGET_KINDS = new Set<RemediationTargetKind>([
  'stale-github-polling',
  'stale-delegate-server'
]);
const CONTROL_HOST_RUN_ARTIFACT_SUBPATH = 'local-mcp/cli/control-host';
const QUOTA_PROCESS_PATTERNS = [
  /\bcodex-orchestrator(?:\.js)?\s+review\b/u,
  /\bcodex-orch(?:\.js)?\s+review\b/u
];
const OWNER_REQUIRED_QUOTA_PROCESS_PATTERNS = [
  /\bproviderLinearWorkerRunner\.(?:js|ts)\b/u
];
const CODEX_QUOTA_SUBCOMMANDS = new Set(['exec', 'review']);
const CODEX_GLOBAL_OPTIONS_WITH_VALUE = new Set([
  '-c',
  '-m',
  '--add-dir',
  '--ask-for-approval',
  '--cd',
  '--color',
  '--config',
  '--config-file',
  '--cwd',
  '--image',
  '--json-schema',
  '--model',
  '--model-provider',
  '--model-reasoning-effort',
  '--model-reasoning-summary',
  '--output-schema',
  '--profile',
  '--sandbox'
]);
const RELEVANT_PROCESS_PATTERN =
  /\bcodex\b|codex-orchestrator|delegate-server|provider-linear-worker|providerLinearWorkerRunner|control-host|co-status|\bgh\s+pr\s+view\b/iu;

interface RunHygieneCliShellParams {
  positionals: string[];
  flags: ArgMap;
  printHelp: () => void;
}

interface QuotaHygieneCliShellDependencies {
  now: () => Date;
  getCwd: () => string;
  env: NodeJS.ProcessEnv;
  log: (line: string) => void;
  readProcessInventory: () => Promise<QuotaHygieneProcessRecord[]>;
  inspectDelegateServerProcesses: (options: {
    repoRoot?: string;
  }) => Promise<DelegateServerProcessInspection> | DelegateServerProcessInspection;
  readControlHostSupervisionStatus: () => Promise<unknown>;
  readCoStatus: (input: { artifactRoot: string }) => Promise<CoStatusJsonDataset>;
  evaluateFreshnessGauge: (input: {
    artifactRoot: string;
    now: string;
  }) => Promise<ProviderControlHostFreshnessGaugeReport>;
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, contents: string) => Promise<void>;
  makeDirectory: (path: string) => Promise<void>;
  readDirectory: typeof readdir;
  fileExists: (path: string) => boolean;
  signalProcess: (pid: number, signal: NodeJS.Signals) => QuotaHygieneProcessSignalResult;
  isProcessAlive: (pid: number) => boolean;
  waitForMs: (durationMs: number) => Promise<void>;
  getCurrentProcessPid: () => number;
  resolveCodexHome: (env?: NodeJS.ProcessEnv) => string;
}

interface QuotaHygieneProcessSignalResult {
  status: 'signaled' | 'missing' | 'blocked';
  error: string | null;
}

export interface QuotaHygieneProcessRecord {
  pid: number;
  ppid: number;
  lstart: string | null;
  etime: string | null;
  stat: string | null;
  command: string;
}

export interface QuotaHygieneFinding {
  code: string;
  severity: FindingSeverity;
  summary: string;
  evidence: Record<string, unknown>;
}

interface QuotaHygieneProcessSummary extends QuotaHygieneProcessRecord {
  relevant: boolean;
  quota_burning: boolean;
  age_seconds: number | null;
  owner: {
    status: 'identified' | 'missing';
    issue_identifier: string | null;
    issue_id: string | null;
    task_id: string | null;
    run_id: string | null;
  };
}

interface QuotaHygieneRemediationAction {
  pid: number;
  target_kind: RemediationTargetKind | 'detectable-only';
  status: RemediationStatus;
  outcome: RemediationOutcome;
  reason: string;
  signal: NodeJS.Signals | null;
  evidence: {
    source: 'process_inventory' | 'delegate_server_inspection';
    command: string;
    parent_pid: number | null;
    parent_command: string | null;
    root_parent_pid: number | null;
    root_parent_command: string | null;
    lstart: string | null;
    stat: string | null;
    age_seconds: number | null;
    stale_threshold_seconds: number;
    owner: QuotaHygieneProcessSummary['owner'] | null;
    run_manifest_path: string | null;
    classification: string;
  };
}

interface QuotaHygieneRemediationSummary {
  schema_version: 1;
  canonical_owner_key: typeof QUOTA_HYGIENE_REMEDIATION_OWNER_KEY;
  requested: boolean;
  apply_requested: boolean;
  operator_confirmed: boolean;
  only: RemediationTargetKind | null;
  scoped_target_required: boolean;
  stale_threshold_seconds: number;
  mode:
    | 'detectable_only'
    | 'dry_run'
    | 'operator_confirm_required'
    | 'artifact_unavailable'
    | 'no_action'
    | 'applied';
  status_counts: Record<RemediationStatus, number>;
  terminated_count: number;
  signal_sent_count: number;
  skipped_count: number;
  unsafe_to_kill_count: number;
  artifact_written: boolean;
  audit_artifact_path: string | null;
  artifact_error: string | null;
  actions: QuotaHygieneRemediationAction[];
}

interface QuotaHygieneRemediationCurrentAudit {
  inventory: QuotaHygieneProcessRecord[] | null;
  inventoryError: string | null;
  delegateInspection: DelegateServerProcessInspection | null;
  delegateInspectionError: string | null;
}

interface QuotaHygieneDelegateSummary {
  risk: RiskLevel;
  false_positive_classification: 'idle_infrastructure' | 'active_or_stale' | 'unavailable';
  active_count: number;
  stale_count: number;
  status: DelegateServerProcessInspection['status'];
  detail: string;
  inspection: DelegateServerProcessInspection;
}

interface QuotaHygieneControlHostSummary {
  status: 'healthy_live_host' | 'unhealthy_live_host' | 'unloaded' | 'stale_endpoint' | 'unavailable';
  risk: RiskLevel;
  supervision: unknown;
  co_status_classification: QuotaHygieneCoStatusSummary['classification'];
}

interface QuotaHygieneFreshnessSummary {
  status: 'available' | 'unavailable';
  verdict: string | null;
  strict_failed: boolean | null;
  finding_codes: string[];
  report: ProviderControlHostFreshnessGaugeReport | null;
  error: string | null;
}

interface QuotaHygieneCoStatusSummary {
  status: 'available' | 'unavailable';
  classification: 'healthy' | 'stale_endpoint' | 'unhealthy_live_host' | 'unavailable';
  risk: RiskLevel;
  degraded_read_reason: string | null;
  running_count: number | null;
  retrying_count: number | null;
  active_provider_claim_count: number | null;
  live_tokens: string[];
  dataset: CoStatusJsonDataset | null;
  error: string | null;
}

interface QuotaHygieneProviderIntakeClaimSummary {
  issue_id: string;
  issue_identifier: string;
  task_id: string;
  run_id: string | null;
  state: string;
  active_like: boolean;
  updated_at: string;
  classification: 'live_process' | 'live_cheap_state' | 'live_correlated' | 'stale_unconfirmed' | 'not_active';
  corroboration: {
    process_pids: number[];
    co_status_tokens: string[];
  };
}

interface QuotaHygieneProviderIntakeSummary {
  status: 'available' | 'unavailable';
  path: string;
  active_like_count: number;
  stale_unconfirmed_count: number;
  live_correlated_count: number;
  claims: QuotaHygieneProviderIntakeClaimSummary[];
  error: string | null;
  raw_state_updated_at: string | null;
}

interface QuotaHygieneAutomationSummary {
  status: 'available' | 'unavailable';
  directory: string;
  active_count: number;
  risk: RiskLevel;
  entries: QuotaHygieneAutomationEntry[];
  error: string | null;
}

interface QuotaHygieneAutomationEntry {
  id: string;
  path: string;
  status: string | null;
  active: boolean;
  risk: RiskLevel;
  prompt: string | null;
  target_thread_id: string | null;
}

interface QuotaHygieneGoalSummary {
  current_thread: {
    status: 'available' | 'unavailable';
    risk: RiskLevel;
    evidence: Record<string, unknown> | null;
    reason: string | null;
  };
  cross_thread: {
    status: 'unavailable';
    risk: 'unknown';
    reason: string;
  };
}

export interface QuotaHygieneAudit {
  schema_version: 1;
  generated_at: string;
  read_only: boolean;
  mutation_mode: MutationMode;
  model_calls: {
    budget: 0;
    observed: 0;
    enforcement: 'local_read_only_sources';
  };
  verdict: AuditVerdict;
  findings: QuotaHygieneFinding[];
  process_inventory: {
    status: 'available' | 'unavailable';
    total_relevant: number;
    quota_burning_count: number;
    unowned_quota_burning_count: number;
    processes: QuotaHygieneProcessSummary[];
    error: string | null;
  };
  delegation: QuotaHygieneDelegateSummary;
  control_host: QuotaHygieneControlHostSummary;
  freshness_gauge: QuotaHygieneFreshnessSummary;
  co_status: QuotaHygieneCoStatusSummary;
  provider_intake: QuotaHygieneProviderIntakeSummary;
  automations: QuotaHygieneAutomationSummary;
  goals: QuotaHygieneGoalSummary;
  remediation: QuotaHygieneRemediationSummary;
  escalation_policy: {
    green: string;
    degraded: string;
    critical: string;
    forbidden_default_actions: string[];
  };
}

const DEFAULT_DEPENDENCIES: QuotaHygieneCliShellDependencies = {
  now: () => new Date(),
  getCwd: () => process.cwd(),
  env: process.env,
  log: (line) => console.log(line),
  readProcessInventory: async () => readDefaultProcessInventory(),
  inspectDelegateServerProcesses: (options) => inspectDelegateServerProcesses(options),
  readControlHostSupervisionStatus: async () => readDefaultControlHostSupervisionStatus(),
  readCoStatus: async ({ artifactRoot }) =>
    readCoStatusJsonDataset({
      flags: {
        format: 'json',
        'run-dir': artifactRoot
      },
      requestTimeoutMs: 5_000
    }),
  evaluateFreshnessGauge: async ({ artifactRoot, now }) =>
    evaluateProviderControlHostFreshnessGauge({
      artifactRoot,
      now,
      strict: true
    }),
  readTextFile: (path) => readFile(path, 'utf8'),
  writeTextFile: async (path, contents) => {
    await writeFile(path, contents, 'utf8');
  },
  makeDirectory: async (path) => {
    await mkdir(path, { recursive: true });
  },
  readDirectory: readdir,
  fileExists: existsSync,
  signalProcess: (pid, signal) => signalProcess(pid, signal),
  isProcessAlive: (pid) => isProcessAlive(pid),
  waitForMs: (durationMs) => waitForMs(durationMs),
  getCurrentProcessPid: () => process.pid,
  resolveCodexHome: (env) => resolveCodexHome(env)
};

export async function runHygieneCliShell(
  params: RunHygieneCliShellParams,
  overrides: Partial<QuotaHygieneCliShellDependencies> = {}
): Promise<void> {
  const positionals = [...params.positionals];
  if (params.flags.help !== undefined || positionals[0] === undefined || positionals[0] === 'help') {
    params.printHelp();
    return;
  }
  const subcommand = positionals.shift();
  if (subcommand !== 'quota') {
    throw new Error(`Unknown hygiene subcommand: ${subcommand}`);
  }
  if (positionals.length > 0) {
    throw new Error(`Unknown hygiene quota argument(s): ${positionals.join(' ')}`);
  }
  validateHygieneQuotaFlags(params.flags);

  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const audit = await buildQuotaHygieneAudit({
    flags: params.flags,
    dependencies
  });
  const format = resolveOutputFormat(params.flags);
  if (format === 'json') {
    dependencies.log(JSON.stringify(audit, null, 2));
    return;
  }
  for (const line of formatQuotaHygieneAudit(audit)) {
    dependencies.log(line);
  }
}

export function formatQuotaHygieneHelp(): string {
  return `Usage: codex-orchestrator hygiene quota [options]

Emit a deterministic quota hygiene audit without model-backed calls or default mutations.

Options:
  --apply                         Apply operator-confirmed remediation (requires --yes, --only, and --pid/--pids).
  --yes                           Confirm the scoped current-audit remediation target.
  --dry-run                       Never mutate even when --apply is present; report eligible remediation only.
  --only <kind>                   Remediation scope: stale-github-polling or stale-delegate-server.
  --pid, --pids <csv>             Required PID selection within the scoped current audit when --apply is used.
  --remediation-output <path>     Write per-PID remediation/refusal artifact JSON.
  --stale-threshold-seconds <n>   Stale age threshold for GitHub polling PIDs (default: 600).
  --artifact-root <path>          Control-host artifact root (default: .runs/local-mcp/cli/control-host).
  --provider-intake-state <path>  Explicit provider-intake-state.json path.
  --automations-dir <path>        Explicit Codex automations directory (default: $CODEX_HOME/automations).
  --goal-manifest <path>          Manifest to inspect for advisory current-thread goal evidence.
  --repo <path>                   Repo root for relative artifact paths (default: cwd).
  --now <iso>                     Deterministic timestamp for the report.
  --format json                   Emit machine-readable audit JSON.
  --help                          Show this message.
`;
}

export function printQuotaHygieneHelp(): void {
  console.log(formatQuotaHygieneHelp());
}

export async function buildQuotaHygieneAudit(input: {
  flags: ArgMap;
  dependencies?: Partial<QuotaHygieneCliShellDependencies>;
}): Promise<QuotaHygieneAudit> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...input.dependencies };
  const now = readStringFlag(input.flags, 'now') ?? dependencies.now().toISOString();
  const repoRoot = resolve(readStringFlag(input.flags, 'repo') ?? dependencies.getCwd());
  const explicitArtifactRoot = readStringFlag(input.flags, 'artifact-root');
  const artifactRoot = explicitArtifactRoot
    ? resolve(repoRoot, explicitArtifactRoot)
    : resolveDefaultControlHostArtifactRoot(repoRoot, dependencies.env);
  const providerIntakePath = resolve(
    repoRoot,
    readStringFlag(input.flags, 'provider-intake-state') ?? join(artifactRoot, 'provider-intake-state.json')
  );
  const automationsDir = resolve(
    readStringFlag(input.flags, 'automations-dir') ??
      join(dependencies.resolveCodexHome(dependencies.env), 'automations')
  );
  const goalManifestPath =
    readStringFlag(input.flags, 'goal-manifest') ??
    normalizeOptionalString(dependencies.env.CODEX_ORCHESTRATOR_MANIFEST_PATH) ??
    normalizeOptionalString(dependencies.env.MANIFEST) ??
    undefined;

  const findings: QuotaHygieneFinding[] = [];
  const processSummary = await summarizeProcessInventory(dependencies, findings);
  const delegation = summarizeDelegation(
    await dependencies.inspectDelegateServerProcesses({ repoRoot }),
    processSummary.processes,
    findings
  );
  const coStatus = await summarizeCoStatus(artifactRoot, dependencies, findings);
  const controlHost = await summarizeControlHost(dependencies, coStatus, findings);
  const freshnessGauge = await summarizeFreshnessGauge(artifactRoot, now, dependencies, findings);
  const providerIntake = await summarizeProviderIntake(
    providerIntakePath,
    processSummary.processes,
    coStatus.live_tokens,
    dependencies,
    findings
  );
  const automations = await summarizeAutomations(automationsDir, dependencies, findings);
  const goals = await summarizeGoals(goalManifestPath, dependencies, findings);
  const remediation = await summarizeRemediation({
    auditInputs: {
      process_inventory: processSummary,
      delegation
    },
    artifactRoot,
    repoRoot,
    flags: input.flags,
    now,
    dependencies
  });
  const mutationMode = deriveQuotaHygieneMutationMode(remediation);

  return {
    schema_version: 1,
    generated_at: now,
    read_only: mutationMode === 'disabled',
    mutation_mode: mutationMode,
    model_calls: {
      budget: 0,
      observed: 0,
      enforcement: 'local_read_only_sources'
    },
    verdict: resolveVerdict(findings),
    findings,
    process_inventory: processSummary,
    delegation,
    control_host: controlHost,
    freshness_gauge: freshnessGauge,
    co_status: coStatus,
    provider_intake: providerIntake,
    automations,
    goals,
    remediation,
    escalation_policy: {
      green: 'Log green results only; do not start model-backed heartbeats for confirmation.',
      degraded:
        'Persist/alert only after the same degraded fingerprint repeats across audit windows; avoid relaunch or cleanup mutations.',
      critical:
        'For an active quota-burning process without an owner, ask the operator for direction and preserve evidence.',
      forbidden_default_actions: [
        'kill process',
        'restart control-host',
        'bootstrap worker',
        'edit provider-intake-state.json',
        'run model smoke'
      ]
    }
  };
}

async function summarizeProcessInventory(
  dependencies: QuotaHygieneCliShellDependencies,
  findings: QuotaHygieneFinding[]
): Promise<QuotaHygieneAudit['process_inventory']> {
  try {
    return summarizeProcesses(await dependencies.readProcessInventory(), findings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    findings.push({
      code: 'process_inventory_unavailable',
      severity: 'degraded',
      summary: 'Process inventory could not be read.',
      evidence: { error: message }
    });
    return {
      status: 'unavailable',
      total_relevant: 0,
      quota_burning_count: 0,
      unowned_quota_burning_count: 0,
      processes: [],
      error: message
    };
  }
}

function summarizeProcesses(
  records: QuotaHygieneProcessRecord[],
  findings: QuotaHygieneFinding[]
): QuotaHygieneAudit['process_inventory'] {
  const processes = records
    .filter((record) => RELEVANT_PROCESS_PATTERN.test(record.command))
    .map((record) => {
      const owner = extractProcessOwner(record.command);
      const quotaBurning = isQuotaBurningCommand(record.command, owner);
      const ageSeconds = parseElapsedSeconds(record.etime);
      return {
        ...record,
        relevant: true,
        quota_burning: quotaBurning,
        age_seconds: ageSeconds,
        owner
      };
    });
  const unownedQuotaProcesses = processes.filter(
    (record) => record.quota_burning && record.owner.status === 'missing'
  );
  for (const record of unownedQuotaProcesses) {
    findings.push({
      code: 'unowned_quota_burning_process',
      severity: 'critical',
      summary: `Quota-burning process ${record.pid} has no issue/task/run owner in its command line.`,
      evidence: {
        pid: record.pid,
        command: record.command
      }
    });
  }
  return {
    status: 'available',
    total_relevant: processes.length,
    quota_burning_count: processes.filter((record) => record.quota_burning).length,
    unowned_quota_burning_count: unownedQuotaProcesses.length,
    processes,
    error: null
  };
}

function summarizeDelegation(
  inspection: DelegateServerProcessInspection,
  processes: QuotaHygieneProcessSummary[],
  findings: QuotaHygieneFinding[]
): QuotaHygieneDelegateSummary {
  if (inspection.status === 'unavailable') {
    findings.push({
      code: 'delegate_server_inventory_unavailable',
      severity: 'degraded',
      summary: 'Delegate-server process inventory is unavailable.',
      evidence: { detail: inspection.detail }
    });
    return {
      risk: 'unknown',
      false_positive_classification: 'unavailable',
      active_count: inspection.activeCount,
      stale_count: inspection.staleCount,
      status: inspection.status,
      detail: inspection.detail,
      inspection
    };
  }
  const hasCorroboratingQuotaProcess = inspection.details.some((detail) =>
    delegateDetailHasCorroboratingQuotaProcess(detail, processes)
  );
  const allActiveUnassociated =
    inspection.activeCount > 0 &&
    inspection.staleCount === 0 &&
    inspection.details.every((detail) => detail.classification === 'active-unassociated');
  const falsePositiveClassification =
    allActiveUnassociated && !hasCorroboratingQuotaProcess ? 'idle_infrastructure' : 'active_or_stale';
  const risk: RiskLevel =
    falsePositiveClassification === 'idle_infrastructure'
      ? 'green'
      : inspection.staleCount > 0
        ? 'degraded'
        : 'green';
  if (inspection.staleCount > 0) {
    findings.push({
      code: 'stale_delegate_server_process',
      severity: 'degraded',
      summary: 'Stale delegate-server process inventory is present.',
      evidence: {
        stale_pids: inspection.stalePids,
        stale_count: inspection.staleCount
      }
    });
  }
  return {
    risk,
    false_positive_classification: falsePositiveClassification,
    active_count: inspection.activeCount,
    stale_count: inspection.staleCount,
    status: inspection.status,
    detail: inspection.detail,
    inspection
  };
}

async function summarizeControlHost(
  dependencies: QuotaHygieneCliShellDependencies,
  coStatus: QuotaHygieneCoStatusSummary,
  findings: QuotaHygieneFinding[]
): Promise<QuotaHygieneControlHostSummary> {
  let supervision: unknown = null;
  let status: QuotaHygieneControlHostSummary['status'] = 'unavailable';
  try {
    supervision = await dependencies.readControlHostSupervisionStatus();
    status = classifyControlHostStatus(supervision, coStatus.classification);
  } catch (error) {
    supervision = {
      error: error instanceof Error ? error.message : String(error)
    };
    status = coStatus.classification === 'stale_endpoint' ? 'stale_endpoint' : 'unavailable';
  }
  const risk: RiskLevel =
    status === 'healthy_live_host'
      ? 'green'
      : status === 'unhealthy_live_host' || status === 'stale_endpoint'
        ? 'degraded'
        : 'unknown';
  if (status !== 'healthy_live_host') {
    findings.push({
      code: `control_host_${status}`,
      severity: 'degraded',
      summary: `Control-host status is ${status}.`,
      evidence: {
        status
      }
    });
  }
  return {
    status,
    risk,
    supervision,
    co_status_classification: coStatus.classification
  };
}

async function summarizeFreshnessGauge(
  artifactRoot: string,
  now: string,
  dependencies: QuotaHygieneCliShellDependencies,
  findings: QuotaHygieneFinding[]
): Promise<QuotaHygieneFreshnessSummary> {
  try {
    const report = await dependencies.evaluateFreshnessGauge({ artifactRoot, now });
    const findingCodes = collectFreshnessFindingCodes(report);
    if (report.strict_failed || report.verdict !== 'healthy') {
      findings.push({
        code: 'control_host_freshness_not_healthy',
        severity: 'degraded',
        summary: `Control-host freshness gauge verdict is ${report.verdict}.`,
        evidence: {
          verdict: report.verdict,
          strict_failed: report.strict_failed,
          finding_codes: findingCodes
        }
      });
    }
    return {
      status: 'available',
      verdict: report.verdict,
      strict_failed: report.strict_failed,
      finding_codes: findingCodes,
      report,
      error: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    findings.push({
      code: 'control_host_freshness_unavailable',
      severity: 'degraded',
      summary: 'Control-host freshness gauge could not be read.',
      evidence: { error: message }
    });
    return {
      status: 'unavailable',
      verdict: null,
      strict_failed: null,
      finding_codes: [],
      report: null,
      error: message
    };
  }
}

async function summarizeCoStatus(
  artifactRoot: string,
  dependencies: QuotaHygieneCliShellDependencies,
  findings: QuotaHygieneFinding[]
): Promise<QuotaHygieneCoStatusSummary> {
  try {
    const dataset = await dependencies.readCoStatus({ artifactRoot });
    const classification = classifyCoStatusDataset(dataset);
    const liveTokens = collectCoStatusLiveTokens(dataset);
    const risk: RiskLevel = classification === 'healthy' ? 'green' : 'degraded';
    if (classification !== 'healthy') {
      findings.push({
        code: `co_status_${classification}`,
        severity: 'degraded',
        summary: `co-status classified the live host as ${classification}.`,
        evidence: {
          degraded_read_reason: dataset.degraded_read?.reason ?? null
        }
      });
    }
    return {
      status: 'available',
      classification,
      risk,
      degraded_read_reason: dataset.degraded_read?.reason ?? null,
      running_count: Array.isArray(dataset.running) ? dataset.running.length : null,
      retrying_count: Array.isArray(dataset.retrying) ? dataset.retrying.length : null,
      active_provider_claim_count: readNumber(dataset.provider_intake?.active_claim_count),
      live_tokens: liveTokens,
      dataset,
      error: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const classification = classifyCoStatusError(message);
    findings.push({
      code: `co_status_${classification}`,
      severity: 'degraded',
      summary: `co-status is ${classification}.`,
      evidence: { error: message }
    });
    return {
      status: 'unavailable',
      classification,
      risk: classification === 'unavailable' ? 'unknown' : 'degraded',
      degraded_read_reason: null,
      running_count: null,
      retrying_count: null,
      active_provider_claim_count: null,
      live_tokens: [],
      dataset: null,
      error: message
    };
  }
}

async function summarizeProviderIntake(
  providerIntakePath: string,
  processes: QuotaHygieneProcessSummary[],
  coStatusLiveTokens: string[],
  dependencies: QuotaHygieneCliShellDependencies,
  findings: QuotaHygieneFinding[]
): Promise<QuotaHygieneProviderIntakeSummary> {
  try {
    const raw = await dependencies.readTextFile(providerIntakePath);
    const state = normalizeProviderIntakeState(JSON.parse(raw) as ProviderIntakeState);
    const claims = state.claims.map((claim) =>
      summarizeProviderIntakeClaim(claim, processes, coStatusLiveTokens)
    );
    const activeLikeClaims = claims.filter((claim) => claim.active_like);
    const staleUnconfirmed = activeLikeClaims.filter(
      (claim) => claim.classification === 'stale_unconfirmed'
    );
    if (staleUnconfirmed.length > 0) {
      findings.push({
        code: 'stale_provider_intake_claims_unconfirmed',
        severity: 'degraded',
        summary:
          'provider-intake-state.json has active-like claims without live process or cheap live-state corroboration.',
        evidence: {
          count: staleUnconfirmed.length,
          issue_identifiers: staleUnconfirmed.map((claim) => claim.issue_identifier)
        }
      });
    }
    return {
      status: 'available',
      path: providerIntakePath,
      active_like_count: activeLikeClaims.length,
      stale_unconfirmed_count: staleUnconfirmed.length,
      live_correlated_count: activeLikeClaims.length - staleUnconfirmed.length,
      claims,
      error: null,
      raw_state_updated_at: state.updated_at
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    findings.push({
      code: 'provider_intake_unavailable',
      severity: 'degraded',
      summary: 'provider-intake-state.json could not be read.',
      evidence: {
        path: providerIntakePath,
        error: message
      }
    });
    return {
      status: 'unavailable',
      path: providerIntakePath,
      active_like_count: 0,
      stale_unconfirmed_count: 0,
      live_correlated_count: 0,
      claims: [],
      error: message,
      raw_state_updated_at: null
    };
  }
}

async function summarizeAutomations(
  automationsDir: string,
  dependencies: QuotaHygieneCliShellDependencies,
  findings: QuotaHygieneFinding[]
): Promise<QuotaHygieneAutomationSummary> {
  try {
    const entries = await dependencies.readDirectory(automationsDir, { withFileTypes: true });
    const automationEntries: QuotaHygieneAutomationEntry[] = [];
    for (const entry of entries) {
      const automationPath = entry.isDirectory()
        ? join(automationsDir, entry.name, 'automation.toml')
        : join(automationsDir, entry.name);
      if (!automationPath.endsWith('.toml') || !dependencies.fileExists(automationPath)) {
        continue;
      }
      const parsed = parseToml(await dependencies.readTextFile(automationPath));
      automationEntries.push(normalizeAutomationEntry(entry.name.replace(/\.toml$/u, ''), automationPath, parsed));
    }
    const activeEntries = automationEntries.filter((entry) => entry.active);
    if (activeEntries.length > 0) {
      findings.push({
        code: 'active_automations_present',
        severity: 'degraded',
        summary: 'Active Codex automations are present and should be considered quota-risk background work.',
        evidence: {
          active_count: activeEntries.length,
          ids: activeEntries.map((entry) => entry.id)
        }
      });
    }
    return {
      status: 'available',
      directory: automationsDir,
      active_count: activeEntries.length,
      risk: activeEntries.length > 0 ? 'degraded' : 'green',
      entries: automationEntries,
      error: null
    };
  } catch (error) {
    if (isMissingDirectoryError(error)) {
      return {
        status: 'available',
        directory: automationsDir,
        active_count: 0,
        risk: 'green',
        entries: [],
        error: null
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    findings.push({
      code: 'automation_inventory_unavailable',
      severity: 'degraded',
      summary: 'Codex automation inventory could not be read.',
      evidence: {
        directory: automationsDir,
        error: message
      }
    });
    return {
      status: 'unavailable',
      directory: automationsDir,
      active_count: 0,
      risk: 'unknown',
      entries: [],
      error: message
    };
  }
}

async function summarizeGoals(
  goalManifestPath: string | undefined,
  dependencies: QuotaHygieneCliShellDependencies,
  findings: QuotaHygieneFinding[]
): Promise<QuotaHygieneGoalSummary> {
  let currentThread: QuotaHygieneGoalSummary['current_thread'] = {
    status: 'unavailable',
    risk: 'unknown',
    evidence: null,
    reason: 'no current-thread goal evidence manifest configured'
  };
  if (goalManifestPath) {
    try {
      const manifest = JSON.parse(await dependencies.readTextFile(goalManifestPath)) as Record<string, unknown>;
      const goalEvidence = isRecord(manifest.goal_evidence)
        ? sanitizeGoalEvidence(manifest.goal_evidence)
        : null;
      if (goalEvidence) {
        const goalStatus = normalizeOptionalString(goalEvidence.status);
        currentThread = {
          status: 'available',
          risk: isActiveGoalStatus(goalStatus) ? 'degraded' : 'green',
          evidence: goalEvidence,
          reason: null
        };
        if (isActiveGoalStatus(goalStatus)) {
          findings.push({
            code: 'active_current_thread_goal',
            severity: 'degraded',
            summary: 'Current-thread advisory goal evidence is active.',
            evidence: {
              status: goalStatus,
              objective: goalEvidence.objective ?? null
            }
          });
        }
      } else {
        currentThread = {
          status: 'unavailable',
          risk: 'unknown',
          evidence: null,
          reason: 'manifest has no goal_evidence payload'
        };
      }
    } catch (error) {
      currentThread = {
        status: 'unavailable',
        risk: 'unknown',
        evidence: null,
        reason: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return {
    current_thread: currentThread,
    cross_thread: {
      status: 'unavailable',
      risk: 'unknown',
      reason: 'No deterministic cross-thread goal inventory surface is available to this read-only CLI.'
    }
  };
}

async function summarizeRemediation(input: {
  auditInputs: Pick<QuotaHygieneAudit, 'process_inventory' | 'delegation'>;
  artifactRoot: string;
  repoRoot: string;
  flags: ArgMap;
  now: string;
  dependencies: QuotaHygieneCliShellDependencies;
}): Promise<QuotaHygieneRemediationSummary> {
  const staleThresholdSeconds = readIntegerFlag(
    input.flags,
    'stale-threshold-seconds',
    DEFAULT_REMEDIATION_STALE_THRESHOLD_SECONDS
  );
  const only = readRemediationOnlyFlag(input.flags);
  const selectedPids = readPidSelection(input.flags);
  const applyRequested = input.flags.apply === true;
  const operatorConfirmed = input.flags.yes === true;
  const dryRunRequested = input.flags['dry-run'] === true;
  const remediationOutputPath = readStringFlag(input.flags, 'remediation-output');
  const requested =
    applyRequested ||
    only !== null ||
    selectedPids.size > 0 ||
    remediationOutputPath !== undefined ||
    dryRunRequested;
  const hasExplicitPidSelection = selectedPids.size > 0;
  const canApply = applyRequested && operatorConfirmed && only !== null && hasExplicitPidSelection && !dryRunRequested;
  const missingConfirmation = applyRequested && (!operatorConfirmed || only === null);
  const missingPidSelection = applyRequested && !dryRunRequested && only !== null && selectedPids.size === 0;
  const artifactPath =
    remediationOutputPath !== undefined
      ? resolve(input.repoRoot, remediationOutputPath)
      : canApply
        ? join(input.artifactRoot, 'quota-remediation', `${sanitizeArtifactTimestamp(input.now)}.json`)
        : null;

  const baseActions = collectRemediationActions(
    input.auditInputs,
    staleThresholdSeconds,
    input.dependencies.getCurrentProcessPid()
  );
  const preSignalAudit = canApply
    ? await readLatestRemediationCurrentAudit(input.dependencies, input.repoRoot)
    : emptyRemediationCurrentAudit();
  let actions = await finalizeRemediationActions({
    baseActions,
    selectedPids,
    staleThresholdSeconds,
    options: {
      only,
      selectedPids,
      applyRequested,
      dryRunRequested,
      missingConfirmation,
      missingPidSelection,
      canApply,
      allowSignal: false,
      latestAudit: preSignalAudit,
      dependencies: input.dependencies
    }
  });
  let auditArtifactPath: string | null = null;
  let artifactError: string | null = null;
  let artifactWritten = false;

  if (canApply && artifactPath !== null) {
    artifactError = await writeRemediationArtifact({
      artifactPath,
      now: input.now,
      applyRequested,
      operatorConfirmed,
      only,
      selectedPids,
      actions,
      phase: 'pre_signal',
      dependencies: input.dependencies
    });
    if (artifactError !== null) {
      const preSignalArtifactError = artifactError;
      actions = actions.map((action) => markRemediationArtifactUnavailable(action, preSignalArtifactError));
      return buildRemediationSummary({
        requested,
        applyRequested,
        operatorConfirmed,
        only,
        staleThresholdSeconds,
        mode: 'artifact_unavailable',
        artifactWritten: false,
        auditArtifactPath: null,
        artifactError: preSignalArtifactError,
        actions
      });
    }
    artifactWritten = true;
    auditArtifactPath = artifactPath;
    const signalAudit = await readLatestRemediationCurrentAudit(input.dependencies, input.repoRoot);
    actions = await finalizeRemediationActions({
      baseActions,
      selectedPids,
      staleThresholdSeconds,
      options: {
        only,
        selectedPids,
        applyRequested,
        dryRunRequested,
        missingConfirmation,
        missingPidSelection,
        canApply,
        allowSignal: true,
        latestAudit: signalAudit,
        dependencies: input.dependencies
      }
    });
  }

  const mode = deriveRemediationMode({
    requested,
    applyRequested,
    dryRunRequested,
    canApply,
    actions
  });
  if (artifactPath) {
    const finalArtifactError = await writeRemediationArtifact({
      artifactPath,
      now: input.now,
      applyRequested,
      operatorConfirmed,
      only,
      selectedPids,
      actions,
      phase: 'final',
      dependencies: input.dependencies
    });
    if (finalArtifactError === null) {
      artifactWritten = true;
      auditArtifactPath = artifactPath;
    } else {
      auditArtifactPath = null;
      artifactError = finalArtifactError;
    }
  }

  return buildRemediationSummary({
    requested,
    applyRequested,
    operatorConfirmed,
    only,
    staleThresholdSeconds,
    mode,
    artifactWritten,
    auditArtifactPath,
    artifactError,
    actions
  });
}

function emptyRemediationCurrentAudit(): QuotaHygieneRemediationCurrentAudit {
  return {
    inventory: null,
    inventoryError: null,
    delegateInspection: null,
    delegateInspectionError: null
  };
}

async function readLatestRemediationCurrentAudit(
  dependencies: QuotaHygieneCliShellDependencies,
  repoRoot: string
): Promise<QuotaHygieneRemediationCurrentAudit> {
  let inventory: QuotaHygieneProcessRecord[] | null = null;
  let inventoryError: string | null = null;
  let delegateInspection: DelegateServerProcessInspection | null = null;
  let delegateInspectionError: string | null = null;
  try {
    inventory = await dependencies.readProcessInventory();
  } catch (error) {
    inventoryError = error instanceof Error ? error.message : String(error);
  }
  try {
    delegateInspection = await dependencies.inspectDelegateServerProcesses({ repoRoot });
  } catch (error) {
    delegateInspectionError = error instanceof Error ? error.message : String(error);
  }
  return {
    inventory,
    inventoryError,
    delegateInspection,
    delegateInspectionError
  };
}

async function finalizeRemediationActions(input: {
  baseActions: QuotaHygieneRemediationAction[];
  selectedPids: Set<number>;
  staleThresholdSeconds: number;
  options: Omit<FinalizeRemediationActionInput, 'action'>;
}): Promise<QuotaHygieneRemediationAction[]> {
  const actions: QuotaHygieneRemediationAction[] = [];
  for (const action of input.baseActions) {
    actions.push(await finalizeRemediationAction({ action, ...input.options }));
  }
  for (const pid of input.selectedPids) {
    if (!actions.some((action) => action.pid === pid)) {
      actions.push(createAbsentPidRemediationAction(pid, input.staleThresholdSeconds));
    }
  }
  return actions;
}

async function writeRemediationArtifact(input: {
  artifactPath: string;
  now: string;
  applyRequested: boolean;
  operatorConfirmed: boolean;
  only: RemediationTargetKind | null;
  selectedPids: Set<number>;
  actions: QuotaHygieneRemediationAction[];
  phase: 'pre_signal' | 'final';
  dependencies: QuotaHygieneCliShellDependencies;
}): Promise<string | null> {
  try {
    await input.dependencies.makeDirectory(dirname(input.artifactPath));
    await input.dependencies.writeTextFile(
      input.artifactPath,
      `${JSON.stringify({
        schema_version: 1,
        generated_at: input.now,
        canonical_owner_key: QUOTA_HYGIENE_REMEDIATION_OWNER_KEY,
        phase: input.phase,
        apply_requested: input.applyRequested,
        operator_confirmed: input.operatorConfirmed,
        only: input.only,
        selected_pids: [...input.selectedPids].sort((left, right) => left - right),
        actions: input.actions
      }, null, 2)}\n`
    );
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function markRemediationArtifactUnavailable(
  action: QuotaHygieneRemediationAction,
  artifactError: string
): QuotaHygieneRemediationAction {
  if (action.status !== 'remediation_eligible') {
    return action;
  }
  return {
    ...action,
    status: 'unsafe_to_kill',
    outcome: 'unsafe_to_kill',
    reason: `remediation artifact output could not be prepared before SIGTERM: ${artifactError}`
  };
}

function buildRemediationSummary(input: {
  requested: boolean;
  applyRequested: boolean;
  operatorConfirmed: boolean;
  only: RemediationTargetKind | null;
  staleThresholdSeconds: number;
  mode: QuotaHygieneRemediationSummary['mode'];
  artifactWritten: boolean;
  auditArtifactPath: string | null;
  artifactError: string | null;
  actions: QuotaHygieneRemediationAction[];
}): QuotaHygieneRemediationSummary {
  const statusCounts = countRemediationStatuses(input.actions);
  return {
    schema_version: 1,
    canonical_owner_key: QUOTA_HYGIENE_REMEDIATION_OWNER_KEY,
    requested: input.requested,
    apply_requested: input.applyRequested,
    operator_confirmed: input.operatorConfirmed,
    only: input.only,
    scoped_target_required: true,
    stale_threshold_seconds: input.staleThresholdSeconds,
    mode: input.mode,
    status_counts: statusCounts,
    terminated_count: statusCounts.terminated,
    signal_sent_count: statusCounts.signal_sent,
    skipped_count: statusCounts.skipped + statusCounts.operator_confirm_required,
    unsafe_to_kill_count: statusCounts.unsafe_to_kill,
    artifact_written: input.artifactWritten,
    audit_artifact_path: input.auditArtifactPath,
    artifact_error: input.artifactError,
    actions: input.actions
  };
}

function deriveRemediationMode(input: {
  requested: boolean;
  applyRequested: boolean;
  dryRunRequested: boolean;
  canApply: boolean;
  actions: QuotaHygieneRemediationAction[];
}): QuotaHygieneRemediationSummary['mode'] {
  if (input.applyRequested && !input.dryRunRequested) {
    if (!input.canApply) {
      return 'operator_confirm_required';
    }
    return input.actions.some((action) => action.status === 'terminated' || action.status === 'signal_sent')
      ? 'applied'
      : 'no_action';
  }
  return input.requested ? 'dry_run' : 'detectable_only';
}

function deriveQuotaHygieneMutationMode(remediation: QuotaHygieneRemediationSummary): MutationMode {
  if (remediation.mode === 'applied') {
    return 'operator_confirmed_remediation';
  }
  return remediation.artifact_written ? 'audit_artifact_write' : 'disabled';
}

function collectRemediationActions(
  auditInputs: Pick<QuotaHygieneAudit, 'process_inventory' | 'delegation'>,
  staleThresholdSeconds: number,
  currentProcessPid: number
): QuotaHygieneRemediationAction[] {
  const actions: QuotaHygieneRemediationAction[] = [];
  const delegateInspectionUnavailable = auditInputs.delegation.inspection.status === 'unavailable';
  for (const processRecord of auditInputs.process_inventory.processes) {
    if (processRecord.command.includes('delegate-server')) {
      if (delegateInspectionUnavailable) {
        actions.push(createDelegateInspectionUnavailableRemediationAction(processRecord, staleThresholdSeconds));
      }
      continue;
    }
    actions.push(createProcessRemediationAction(processRecord, staleThresholdSeconds, currentProcessPid));
  }
  if (auditInputs.delegation.inspection.status !== 'unavailable') {
    const delegateThreshold = auditInputs.delegation.inspection.thresholdSeconds;
    for (const detail of auditInputs.delegation.inspection.details) {
      actions.push(createDelegateRemediationAction(detail, delegateThreshold, currentProcessPid));
    }
  }
  return actions;
}

function createDelegateInspectionUnavailableRemediationAction(
  processRecord: QuotaHygieneProcessSummary,
  staleThresholdSeconds: number
): QuotaHygieneRemediationAction {
  return {
    pid: processRecord.pid,
    target_kind: 'stale-delegate-server',
    status: 'unsafe_to_kill',
    outcome: 'identity_revalidation_unavailable',
    reason:
      'delegate-server PID is present in process inventory, but current delegate-server inspection is unavailable, so remediation refused',
    signal: null,
    evidence: {
      source: 'process_inventory',
      command: processRecord.command,
      parent_pid: processRecord.ppid,
      parent_command: null,
      root_parent_pid: null,
      root_parent_command: null,
      lstart: processRecord.lstart,
      stat: processRecord.stat,
      age_seconds: processRecord.age_seconds,
      stale_threshold_seconds: staleThresholdSeconds,
      owner: processRecord.owner,
      run_manifest_path: null,
      classification: 'delegate_inspection_unavailable'
    }
  };
}

function createProcessRemediationAction(
  processRecord: QuotaHygieneProcessSummary,
  staleThresholdSeconds: number,
  currentProcessPid: number
): QuotaHygieneRemediationAction {
  const evidence = {
    source: 'process_inventory' as const,
    command: processRecord.command,
    parent_pid: processRecord.ppid,
    parent_command: null,
    root_parent_pid: null,
    root_parent_command: null,
    lstart: processRecord.lstart,
    stat: processRecord.stat,
    age_seconds: processRecord.age_seconds,
    stale_threshold_seconds: staleThresholdSeconds,
    owner: processRecord.owner,
    run_manifest_path: null,
    classification: 'process_inventory'
  };
  if (processRecord.pid === currentProcessPid || isProtectedInfrastructureCommand(processRecord.command)) {
    return {
      pid: processRecord.pid,
      target_kind: 'detectable-only',
      status: 'unsafe_to_kill',
      outcome: 'unsafe_to_kill',
      reason: 'current audit classifies this PID as protected infrastructure, not remediation scope',
      signal: null,
      evidence
    };
  }
  if (isGitHubPrViewProcessCommand(processRecord.command)) {
    if (processRecord.age_seconds !== null && processRecord.age_seconds >= staleThresholdSeconds) {
      return {
        pid: processRecord.pid,
        target_kind: 'stale-github-polling',
        status: 'remediation_eligible',
        outcome: 'dry_run',
        reason: 'current audit classifies this PID as stale GitHub PR polling',
        signal: null,
        evidence: {
          ...evidence,
          classification: 'stale_github_polling'
        }
      };
    }
    return {
      pid: processRecord.pid,
      target_kind: 'detectable-only',
      status: 'detectable_only',
      outcome: 'not_requested',
      reason: 'GitHub PR polling is detectable, but current audit age is below the stale threshold',
      signal: null,
      evidence: {
        ...evidence,
        classification: 'github_polling_below_threshold'
      }
    };
  }
  return {
    pid: processRecord.pid,
    target_kind: 'detectable-only',
    status: 'detectable_only',
    outcome: 'not_requested',
    reason: processRecord.quota_burning
      ? 'quota-burning process is detectable, but this remediation lane only handles stale polling/delegate targets'
      : 'relevant process is detectable, but not quota-remediation eligible',
    signal: null,
    evidence
  };
}

function createDelegateRemediationAction(
  detail: DelegateServerProcessInspection['details'][number],
  staleThresholdSeconds: number,
  currentProcessPid: number
): QuotaHygieneRemediationAction {
  const stale = detail.classification.startsWith('stale-');
  const unsafeReason =
    detail.pid === currentProcessPid
      ? 'current worker process is never eligible for remediation'
      : 'delegate-server PID is not stale per current delegate inspection';
  return {
    pid: detail.pid,
    target_kind: 'stale-delegate-server',
    status: stale ? 'remediation_eligible' : 'unsafe_to_kill',
    outcome: stale ? 'dry_run' : 'unsafe_to_kill',
    reason: stale
      ? 'current audit classifies this delegate-server PID as stale'
      : unsafeReason,
    signal: null,
    evidence: {
      source: 'delegate_server_inspection',
      command: detail.command,
      parent_pid: detail.ppid,
      parent_command: detail.parentCommand,
      root_parent_pid: detail.rootCodexParentPid,
      root_parent_command: detail.rootCodexParentCommand,
      lstart: null,
      stat: null,
      age_seconds: detail.elapsedSeconds,
      stale_threshold_seconds: staleThresholdSeconds,
      owner: null,
      run_manifest_path: detail.manifestAssociation?.manifestPath ?? null,
      classification: detail.classification
    }
  };
}

interface FinalizeRemediationActionInput {
  action: QuotaHygieneRemediationAction;
  only: RemediationTargetKind | null;
  selectedPids: Set<number>;
  applyRequested: boolean;
  dryRunRequested: boolean;
  missingConfirmation: boolean;
  missingPidSelection: boolean;
  canApply: boolean;
  allowSignal: boolean;
  latestAudit: QuotaHygieneRemediationCurrentAudit;
  dependencies: QuotaHygieneCliShellDependencies;
}

async function finalizeRemediationAction(input: FinalizeRemediationActionInput): Promise<QuotaHygieneRemediationAction> {
  const action = { ...input.action };
  if (action.status === 'detectable_only' || action.status === 'unsafe_to_kill') {
    return action;
  }
  if (input.selectedPids.size > 0 && !input.selectedPids.has(action.pid)) {
    return {
      ...action,
      status: 'skipped',
      outcome: 'outside_scope',
      reason: 'eligible PID skipped because it was not present in --pid/--pids selection'
    };
  }
  if (input.only !== null && action.target_kind !== input.only) {
    return {
      ...action,
      status: 'skipped',
      outcome: 'outside_scope',
      reason: `eligible PID skipped because --only ${input.only} does not match ${action.target_kind}`
    };
  }
  if (input.dryRunRequested) {
    return {
      ...action,
      status: 'remediation_eligible',
      outcome: 'dry_run',
      reason: `${action.reason}; dry-run only because --dry-run was provided`
    };
  }
  if (input.missingPidSelection) {
    return {
      ...action,
      status: 'operator_confirm_required',
      outcome: 'confirmation_required',
      reason: 'remediation requires explicit --pid/--pids target selection'
    };
  }
  if (input.missingConfirmation) {
    return {
      ...action,
      status: 'operator_confirm_required',
      outcome: 'confirmation_required',
      reason: 'remediation requires both --yes and a scoped --only target'
    };
  }
  if (!input.applyRequested) {
    return {
      ...action,
      status: 'remediation_eligible',
      outcome: 'dry_run',
      reason: `${action.reason}; dry-run only because --apply was not provided`
    };
  }
  if (!input.canApply) {
    return {
      ...action,
      status: 'operator_confirm_required',
      outcome: 'confirmation_required',
      reason: 'remediation requires explicit operator confirmation'
    };
  }
  const revalidation = revalidateRemediationAction(action, input.latestAudit);
  if (revalidation !== null) {
    return revalidation;
  }
  if (!input.allowSignal) {
    return {
      ...action,
      status: 'remediation_eligible',
      outcome: 'dry_run',
      reason: `${action.reason}; current identity revalidated and awaiting durable audit artifact before SIGTERM`
    };
  }
  const signalResult = input.dependencies.signalProcess(action.pid, 'SIGTERM');
  if (signalResult.status === 'missing') {
    return {
      ...action,
      status: 'skipped',
      outcome: 'already_exited',
      reason: 'PID exited before SIGTERM could be delivered'
    };
  }
  if (signalResult.status === 'blocked') {
    return {
      ...action,
      status: 'skipped',
      outcome: 'signal_failed',
      reason: signalResult.error ?? 'SIGTERM delivery failed'
    };
  }
  await input.dependencies.waitForMs(SIGNAL_VERIFICATION_WAIT_MS);
  const alive = safelyCheckProcessAlive(input.dependencies, action.pid);
  if (alive === false) {
    return {
      ...action,
      status: 'terminated',
      outcome: 'sigterm_sent',
      signal: 'SIGTERM',
      reason: 'operator-confirmed remediation delivered SIGTERM and verified the PID exited'
    };
  }
  return {
    ...action,
    status: 'signal_sent',
    outcome: 'sigterm_sent',
    signal: 'SIGTERM',
    reason: alive === true
      ? 'operator-confirmed remediation delivered SIGTERM, but the PID remained alive after bounded verification'
      : 'operator-confirmed remediation delivered SIGTERM, but process liveness could not be verified'
  };
}

function revalidateRemediationAction(
  action: QuotaHygieneRemediationAction,
  latestAudit: QuotaHygieneRemediationCurrentAudit
): QuotaHygieneRemediationAction | null {
  if (latestAudit.inventoryError !== null) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_revalidation_unavailable',
      reason: `current process identity revalidation failed: ${latestAudit.inventoryError}`
    };
  }
  const latest = latestAudit.inventory?.find((record) => record.pid === action.pid) ?? null;
  if (!latest) {
    return {
      ...action,
      status: 'skipped',
      outcome: 'already_exited',
      reason: 'PID is no longer present during current-audit identity revalidation'
    };
  }
  if (latest.command !== action.evidence.command || latest.ppid !== action.evidence.parent_pid) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID command or parent changed after the current audit, so remediation refused'
    };
  }
  if (action.evidence.lstart !== null && latest.lstart !== action.evidence.lstart) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID start time changed after the current audit, so remediation refused'
    };
  }
  const latestAgeSeconds = parseElapsedSeconds(latest.etime);
  if (latestAgeSeconds === null) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_revalidation_unavailable',
      reason: 'current process age could not be parsed during current-audit identity revalidation'
    };
  }
  if (latestAgeSeconds < action.evidence.stale_threshold_seconds) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID is no longer stale in the current audit, so remediation refused'
    };
  }
  if (action.target_kind === 'stale-github-polling' && !isGitHubPrViewProcessCommand(latest.command)) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID no longer matches stale GitHub polling during current-audit revalidation'
    };
  }
  if (action.target_kind === 'stale-delegate-server' && !latest.command.includes('delegate-server')) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID no longer matches delegate-server during current-audit revalidation'
    };
  }
  if (action.target_kind === 'stale-delegate-server') {
    return revalidateDelegateServerRemediationAction(action, latestAudit);
  }
  return null;
}

function revalidateDelegateServerRemediationAction(
  action: QuotaHygieneRemediationAction,
  latestAudit: QuotaHygieneRemediationCurrentAudit
): QuotaHygieneRemediationAction | null {
  if (latestAudit.delegateInspectionError !== null) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_revalidation_unavailable',
      reason: `current delegate-server inspection revalidation failed: ${latestAudit.delegateInspectionError}`
    };
  }
  const inspection = latestAudit.delegateInspection;
  if (!inspection || inspection.status === 'unavailable') {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_revalidation_unavailable',
      reason: `current delegate-server inspection revalidation unavailable: ${inspection?.detail ?? 'missing inspection'}`
    };
  }
  const latestDetail = inspection.details.find((detail) => detail.pid === action.pid) ?? null;
  if (!latestDetail) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID is no longer present in the current delegate-server inspection, so remediation refused'
    };
  }
  if (
    latestDetail.command !== action.evidence.command ||
    latestDetail.ppid !== action.evidence.parent_pid ||
    latestDetail.rootCodexParentPid !== action.evidence.root_parent_pid
  ) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID delegate-server identity changed after the current audit, so remediation refused'
    };
  }
  const latestManifestPath = latestDetail.manifestAssociation?.manifestPath ?? null;
  if (latestManifestPath !== action.evidence.run_manifest_path) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID delegate-server manifest association changed after the current audit, so remediation refused'
    };
  }
  if (!latestDetail.classification.startsWith('stale-')) {
    return {
      ...action,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID is no longer stale in the current delegate-server inspection, so remediation refused'
    };
  }
  return null;
}

function safelyCheckProcessAlive(
  dependencies: QuotaHygieneCliShellDependencies,
  pid: number
): boolean | null {
  try {
    return dependencies.isProcessAlive(pid);
  } catch {
    return null;
  }
}

function createAbsentPidRemediationAction(
  pid: number,
  staleThresholdSeconds: number
): QuotaHygieneRemediationAction {
  return {
    pid,
    target_kind: 'detectable-only',
    status: 'unsafe_to_kill',
    outcome: 'unsafe_to_kill',
    reason: 'requested PID is not present in the current quota hygiene audit output',
    signal: null,
    evidence: {
      source: 'process_inventory',
      command: '<absent from current audit>',
      parent_pid: null,
      parent_command: null,
      root_parent_pid: null,
      root_parent_command: null,
      lstart: null,
      stat: null,
      age_seconds: null,
      stale_threshold_seconds: staleThresholdSeconds,
      owner: null,
      run_manifest_path: null,
      classification: 'absent_from_current_audit'
    }
  };
}

function countRemediationStatuses(
  actions: QuotaHygieneRemediationAction[]
): Record<RemediationStatus, number> {
  return {
    detectable_only: actions.filter((action) => action.status === 'detectable_only').length,
    remediation_eligible: actions.filter((action) => action.status === 'remediation_eligible').length,
    operator_confirm_required: actions.filter((action) => action.status === 'operator_confirm_required').length,
    unsafe_to_kill: actions.filter((action) => action.status === 'unsafe_to_kill').length,
    skipped: actions.filter((action) => action.status === 'skipped').length,
    signal_sent: actions.filter((action) => action.status === 'signal_sent').length,
    terminated: actions.filter((action) => action.status === 'terminated').length
  };
}

function summarizeProviderIntakeClaim(
  claim: ProviderIntakeClaimRecord,
  processes: QuotaHygieneProcessSummary[],
  coStatusLiveTokens: string[]
): QuotaHygieneProviderIntakeClaimSummary {
  const tokens = [claim.issue_id, claim.issue_identifier, claim.task_id, claim.run_id]
    .map((token) => normalizeOptionalString(token))
    .filter((token): token is string => token !== null);
  const matchingProcesses = processes.filter((record) =>
    record.quota_burning && processOwnerMatchesClaimTokens(record, tokens)
  );
  const matchingCoStatusTokens = coStatusLiveTokens.filter((token) => tokens.includes(token));
  let classification: QuotaHygieneProviderIntakeClaimSummary['classification'] = 'not_active';
  const activeLike = isActiveProviderIntakeClaim(claim);
  if (activeLike) {
    if (matchingProcesses.length > 0 && matchingCoStatusTokens.length > 0) {
      classification = 'live_correlated';
    } else if (matchingProcesses.length > 0) {
      classification = 'live_process';
    } else if (matchingCoStatusTokens.length > 0) {
      classification = 'live_cheap_state';
    } else {
      classification = 'stale_unconfirmed';
    }
  }
  return {
    issue_id: claim.issue_id,
    issue_identifier: claim.issue_identifier,
    task_id: claim.task_id,
    run_id: claim.run_id,
    state: claim.state,
    active_like: activeLike,
    updated_at: claim.updated_at,
    classification,
    corroboration: {
      process_pids: matchingProcesses.map((record) => record.pid),
      co_status_tokens: matchingCoStatusTokens
    }
  };
}

function classifyControlHostStatus(
  supervision: unknown,
  coStatusClassification: QuotaHygieneCoStatusSummary['classification']
): QuotaHygieneControlHostSummary['status'] {
  if (coStatusClassification === 'stale_endpoint') {
    return 'stale_endpoint';
  }
  if (!isRecord(supervision)) {
    return 'unavailable';
  }
  if (supervision.installed === false) {
    return 'unavailable';
  }
  const service = isRecord(supervision.service) ? supervision.service : null;
  const liveHost = isRecord(supervision.live_host) ? supervision.live_host : null;
  if (service?.loaded === false) {
    return 'unloaded';
  }
  if (liveHost?.healthy === true) {
    return 'healthy_live_host';
  }
  if (liveHost?.healthy === false || coStatusClassification === 'unhealthy_live_host') {
    return 'unhealthy_live_host';
  }
  return 'unavailable';
}

function classifyCoStatusError(message: string): QuotaHygieneCoStatusSummary['classification'] {
  if (
    message.includes('stale endpoint') ||
    message.includes('control_endpoint.json has not rotated') ||
    message.includes('ECONNREFUSED') ||
    message.includes('Re-resolving control_endpoint.json failed')
  ) {
    return 'stale_endpoint';
  }
  if (message.includes('current-host-unhealthy') || message.includes('refreshed endpoint is not readable')) {
    return 'unhealthy_live_host';
  }
  return 'unavailable';
}

function classifyCoStatusDataset(dataset: CoStatusJsonDataset): QuotaHygieneCoStatusSummary['classification'] {
  const reason = normalizeOptionalString(dataset.degraded_read?.reason);
  if (reason === null) {
    return 'healthy';
  }
  const normalizedReason = reason.toLowerCase();
  if (
    normalizedReason.includes('stale') ||
    normalizedReason.includes('endpoint') ||
    normalizedReason.includes('econnrefused') ||
    normalizedReason.includes('not rotated')
  ) {
    return 'stale_endpoint';
  }
  if (
    normalizedReason.includes('current_host_unhealthy') ||
    normalizedReason.includes('current-host-unhealthy') ||
    normalizedReason.includes('unhealthy') ||
    normalizedReason.includes('not readable')
  ) {
    return 'unhealthy_live_host';
  }
  return 'unavailable';
}

function collectCoStatusLiveTokens(dataset: CoStatusJsonDataset): string[] {
  if (dataset.degraded_read) {
    return [];
  }
  const tokens = new Set<string>();
  const add = (value: unknown): void => {
    const normalized = normalizeOptionalString(value);
    if (normalized) {
      tokens.add(normalized);
    }
  };
  for (const item of Array.isArray(dataset.running) ? dataset.running : []) {
    const record = item as unknown as Record<string, unknown>;
    add(record.issue_id);
    add(record.issue_identifier);
    add(record.task_id);
    add(record.run_id);
  }
  for (const item of Array.isArray(dataset.retrying) ? dataset.retrying : []) {
    const record = item as unknown as Record<string, unknown>;
    add(record.issue_id);
    add(record.issue_identifier);
    add(record.task_id);
    add(record.run_id);
  }
  for (const issue of Array.isArray(dataset.issues) ? dataset.issues : []) {
    const record = issue as unknown as Record<string, unknown>;
    if (isRecord(record.provider_linear_worker_proof) && isLiveProviderWorkerProof(record.provider_linear_worker_proof)) {
      add(record.provider_linear_worker_proof.issue_id);
      add(record.provider_linear_worker_proof.issue_identifier);
      add(record.provider_linear_worker_proof.task_id);
      add(record.provider_linear_worker_proof.run_id);
    }
  }
  return [...tokens].sort();
}

function isMissingDirectoryError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

function normalizeAutomationEntry(
  id: string,
  path: string,
  parsed: unknown
): QuotaHygieneAutomationEntry {
  const root = isRecord(parsed) ? parsed : {};
  const nested = isRecord(root.automation) ? root.automation : {};
  const status = normalizeOptionalString(root.status) ?? normalizeOptionalString(nested.status);
  const active = status === null
    ? Boolean(root.enabled ?? nested.enabled)
    : ['active', 'enabled', 'running'].includes(status.toLowerCase());
  return {
    id,
    path,
    status,
    active,
    risk: active ? 'degraded' : 'green',
    prompt: normalizeOptionalString(root.prompt) ?? normalizeOptionalString(nested.prompt),
    target_thread_id:
      normalizeOptionalString(root.target_thread_id) ?? normalizeOptionalString(nested.target_thread_id)
  };
}

function parseToml(source: string): unknown {
  const require = createRequire(import.meta.url);
  const parser = require('@iarna/toml') as { parse: (input: string) => unknown };
  return parser.parse(source);
}

function sanitizeGoalEvidence(value: Record<string, unknown>): Record<string, unknown> {
  return {
    source: value.source ?? null,
    capture_mode: value.capture_mode ?? null,
    capture_timestamp: value.capture_timestamp ?? null,
    thread_id: value.thread_id ?? null,
    turn_id: value.turn_id ?? null,
    objective: value.objective ?? null,
    status: value.status ?? null,
    token_budget: value.token_budget ?? null,
    tokens_used: value.tokens_used ?? null,
    elapsed_seconds: value.elapsed_seconds ?? null,
    authority: value.authority ?? null,
    linear_authority_preserved: value.linear_authority_preserved ?? null,
    reason: value.reason ?? null
  };
}

function isActiveGoalStatus(value: string | null): boolean {
  return value !== null && ['active', 'in_progress', 'running'].includes(value.toLowerCase());
}

function collectFreshnessFindingCodes(report: ProviderControlHostFreshnessGaugeReport): string[] {
  const findings = Array.isArray(report.findings) ? report.findings : [];
  return findings
    .map((finding) => normalizeOptionalString((finding as unknown as Record<string, unknown>).code))
    .filter((code): code is string => code !== null)
    .sort();
}

function isQuotaBurningCommand(
  command: string,
  owner: QuotaHygieneProcessSummary['owner'] = extractProcessOwner(command)
): boolean {
  if (isCodexQuotaCommand(command)) {
    return true;
  }
  if (QUOTA_PROCESS_PATTERNS.some((pattern) => pattern.test(command))) {
    return true;
  }
  return (
    owner.status === 'identified' &&
    OWNER_REQUIRED_QUOTA_PROCESS_PATTERNS.some((pattern) => pattern.test(command))
  );
}

function isCodexQuotaCommand(command: string): boolean {
  const tokens = tokenizeCommand(command);
  for (let index = 0; index < tokens.length; index += 1) {
    if (!isCodexExecutableToken(tokens[index])) {
      continue;
    }
    return hasCodexQuotaSubcommand(tokens, index + 1);
  }
  return false;
}

function hasCodexQuotaSubcommand(tokens: string[], startIndex: number): boolean {
  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (CODEX_QUOTA_SUBCOMMANDS.has(token)) {
      return true;
    }
    if (token === '--') {
      return false;
    }
    const optionName = token.includes('=') ? token.slice(0, token.indexOf('=')) : token;
    if (CODEX_GLOBAL_OPTIONS_WITH_VALUE.has(optionName) && !token.includes('=')) {
      index += 1;
    }
  }
  return false;
}

function isCodexExecutableToken(token: string): boolean {
  const name = basename(token);
  return name === 'codex' || name === 'codex.js';
}

function isGitHubPrViewProcessCommand(command: string): boolean {
  const tokens = tokenizeCommand(command);
  return tokens.length >= 3 && basename(tokens[0]) === 'gh' && tokens[1] === 'pr' && tokens[2] === 'view';
}

function tokenizeCommand(command: string): string[] {
  return command.match(/"[^"]*"|'[^']*'|\S+/gu)?.map(stripTokenQuotes) ?? [];
}

function stripTokenQuotes(token: string): string {
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    return token.slice(1, -1);
  }
  return token;
}

function processOwnerMatchesClaimTokens(
  record: QuotaHygieneProcessSummary,
  claimTokens: string[]
): boolean {
  const ownerTokens = [
    record.owner.issue_identifier,
    record.owner.issue_id,
    record.owner.task_id,
    record.owner.run_id
  ].filter((token): token is string => token !== null);
  return ownerTokens.some((token) => claimTokens.includes(token));
}

function delegateDetailHasCorroboratingQuotaProcess(
  detail: DelegateServerProcessInspection['details'][number],
  processes: QuotaHygieneProcessSummary[]
): boolean {
  const parentPids = new Set(
    [detail.parentPid, detail.rootCodexParentPid].filter((pid): pid is number => typeof pid === 'number')
  );
  if (parentPids.size === 0) {
    return false;
  }
  return processes.some((record) => record.quota_burning && parentPids.has(record.pid));
}

function isLiveProviderWorkerProof(proof: Record<string, unknown>): boolean {
  const ownerPhase = normalizeOptionalString(proof.owner_phase)?.toLowerCase() ?? null;
  const ownerStatus = normalizeOptionalString(proof.owner_status)?.toLowerCase() ?? null;
  if (ownerPhase === 'ended') {
    return false;
  }
  if (ownerStatus !== null && ownerStatus !== 'in_progress') {
    return false;
  }
  return true;
}

function extractProcessOwner(command: string): QuotaHygieneProcessSummary['owner'] {
  const issueIdentifier = command.match(/\bCO-\d+\b/u)?.[0] ?? null;
  const issueId = readFlagValue(command, 'issue-id');
  const taskId = readFlagValue(command, 'task') ?? command.match(/\blinear-[0-9a-f-]{36}\b/u)?.[0] ?? null;
  const runId =
    readFlagValue(command, 'run') ??
    command.match(/\b\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[A-Za-z0-9]+\b/u)?.[0] ??
    null;
  const identified = Boolean(issueIdentifier || issueId || taskId || runId);
  return {
    status: identified ? 'identified' : 'missing',
    issue_identifier: issueIdentifier,
    issue_id: issueId,
    task_id: taskId,
    run_id: runId
  };
}

function readFlagValue(command: string, flag: string): string | null {
  const escaped = flag.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = command.match(new RegExp(`--${escaped}(?:=|\\s+)([^\\s]+)`, 'u'));
  return match?.[1] ?? null;
}

async function readDefaultProcessInventory(): Promise<QuotaHygieneProcessRecord[]> {
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,lstart=,etime=,stat=,command='], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5_000
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? (String(result.stderr ?? '').trim() || 'ps failed');
    throw new Error(detail);
  }
  return parseProcessInventory(String(result.stdout ?? ''));
}

export function parseProcessInventory(snapshot: string): QuotaHygieneProcessRecord[] {
  return snapshot
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseProcessInventoryLine)
    .filter((record): record is QuotaHygieneProcessRecord => record !== null);
}

function parseProcessInventoryLine(line: string): QuotaHygieneProcessRecord | null {
  const match = line.match(
    /^(\d+)\s+(\d+)\s+(.{24})\s+(\S+)\s+(\S+)\s+(.+)$/u
  );
  if (!match) {
    return null;
  }
  return {
    pid: Number(match[1]),
    ppid: Number(match[2]),
    lstart: match[3]?.trim() ?? null,
    etime: match[4] ?? null,
    stat: match[5] ?? null,
    command: match[6] ?? ''
  };
}

async function readDefaultControlHostSupervisionStatus(): Promise<unknown> {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    throw new Error('Unable to resolve current CLI entrypoint for control-host supervise status.');
  }
  const result = spawnSync(
    process.execPath,
    [...process.execArgv, entrypoint, 'control-host', 'supervise', 'status', '--format', 'json'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15_000,
      env: process.env
    }
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      result.error?.message ?? (String(result.stderr ?? '').trim() || 'control-host status failed')
    );
  }
  return JSON.parse(String(result.stdout ?? ''));
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return readStringFlag(flags, 'format') === 'json' ? 'json' : 'text';
}

function validateHygieneQuotaFlags(flags: ArgMap): void {
  const unknownFlags = Object.keys(flags).filter((key) => !HYGIENE_QUOTA_FLAGS.has(key));
  if (unknownFlags.length > 0) {
    throw new Error(`Unknown hygiene quota flag(s): ${unknownFlags.map((flag) => `--${flag}`).join(', ')}`);
  }
}

function resolveProviderSharedRoot(repoRoot: string): string {
  return basename(dirname(repoRoot)) === '.workspaces' ? dirname(dirname(repoRoot)) : repoRoot;
}

function resolveDefaultControlHostArtifactRoot(repoRoot: string, env: NodeJS.ProcessEnv): string {
  const configuredRunsRoot = normalizeOptionalString(env.CODEX_ORCHESTRATOR_RUNS_DIR);
  const runsRoot = configuredRunsRoot
    ? resolve(repoRoot, configuredRunsRoot)
    : join(resolveProviderSharedRoot(repoRoot), '.runs');
  return join(runsRoot, CONTROL_HOST_RUN_ARTIFACT_SUBPATH);
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readIntegerFlag(flags: ArgMap, key: string, fallback: number): number {
  const value = readStringFlag(flags, key);
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${key}: expected a positive integer.`);
  }
  return parsed;
}

function readRemediationOnlyFlag(flags: ArgMap): RemediationTargetKind | null {
  const value = readStringFlag(flags, 'only');
  if (value === undefined) {
    return null;
  }
  if (!REMEDIATION_TARGET_KINDS.has(value as RemediationTargetKind)) {
    throw new Error(
      `Invalid --only target: ${value}. Expected one of: ${[...REMEDIATION_TARGET_KINDS].join(', ')}.`
    );
  }
  return value as RemediationTargetKind;
}

function readPidSelection(flags: ArgMap): Set<number> {
  const raw = readStringFlag(flags, 'pids') ?? readStringFlag(flags, 'pid') ?? '';
  const selected = new Set<number>();
  for (const token of raw.split(',')) {
    const trimmed = token.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid PID selection: ${trimmed}.`);
    }
    selected.add(parsed);
  }
  return selected;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseElapsedSeconds(value: string | null): number | null {
  const normalized = normalizeOptionalString(value);
  if (normalized === null) {
    return null;
  }
  const [dayPart, timePart] = normalized.includes('-')
    ? normalized.split('-', 2)
    : ['0', normalized];
  const days = Number(dayPart);
  const parts = timePart.split(':').map((part) => Number(part));
  if (!Number.isFinite(days) || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return days * 86_400 + minutes * 60 + seconds;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return days * 86_400 + hours * 3_600 + minutes * 60 + seconds;
  }
  return null;
}

function isProtectedInfrastructureCommand(command: string): boolean {
  const normalized = command.toLowerCase();
  return (
    normalized.includes('/applications/codex.app/') ||
    normalized.includes(' codex app-server') ||
    normalized.includes('/codex app-server') ||
    normalized.includes('control-host') ||
    normalized.includes('co-status')
  );
}

function signalProcess(pid: number, signal: NodeJS.Signals): QuotaHygieneProcessSignalResult {
  try {
    process.kill(pid, signal);
    return {
      status: 'signaled',
      error: null
    };
  } catch (error) {
    if (isRecord(error) && error.code === 'ESRCH') {
      return {
        status: 'missing',
        error: null
      };
    }
    return {
      status: 'blocked',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (isRecord(error) && error.code === 'ESRCH') {
      return false;
    }
    return true;
  }
}

async function waitForMs(durationMs: number): Promise<void> {
  await new Promise((resolveDelay) => {
    setTimeout(resolveDelay, durationMs);
  });
}

function sanitizeArtifactTimestamp(value: string): string {
  return value.replace(/[^0-9A-Za-z-]+/gu, '-').replace(/-+$/u, '');
}

function resolveVerdict(findings: QuotaHygieneFinding[]): AuditVerdict {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return 'critical';
  }
  return findings.length > 0 ? 'degraded' : 'healthy';
}

function formatQuotaHygieneAudit(audit: QuotaHygieneAudit): string[] {
  const lines = [
    `Quota hygiene: ${audit.verdict}`,
    `- Relevant processes: ${audit.process_inventory.total_relevant} (${audit.process_inventory.quota_burning_count} quota-burning, ${audit.process_inventory.unowned_quota_burning_count} unowned)`,
    `- Delegation: ${audit.delegation.false_positive_classification} (${audit.delegation.active_count} active, ${audit.delegation.stale_count} stale)`,
    `- Control host: ${audit.control_host.status}`,
    `- co-status: ${audit.co_status.classification}`,
    `- Provider intake: ${audit.provider_intake.stale_unconfirmed_count} stale-unconfirmed active-like claim(s)`,
    `- Automations: ${audit.automations.active_count} active`,
    `- Goals: current=${audit.goals.current_thread.status}, cross-thread=${audit.goals.cross_thread.risk}`,
    `- Findings: ${audit.findings.length}`
  ];
  if (audit.remediation.requested || audit.remediation.actions.length > 0) {
    lines.push(...formatQuotaHygieneRemediation(audit.remediation));
  }
  return lines;
}

function formatQuotaHygieneRemediation(remediation: QuotaHygieneRemediationSummary): string[] {
  const counts = remediation.status_counts;
  const lines = [
    `- Remediation: ${remediation.mode} (eligible=${counts.remediation_eligible}, terminated=${counts.terminated}, signal_sent=${counts.signal_sent}, skipped=${counts.skipped}, unsafe_to_kill=${counts.unsafe_to_kill}, confirmation_required=${counts.operator_confirm_required})`
  ];
  if (remediation.audit_artifact_path !== null) {
    lines.push(`- Remediation artifact: ${remediation.audit_artifact_path}`);
  }
  if (remediation.artifact_error !== null) {
    lines.push(`- Remediation artifact error: ${remediation.artifact_error}`);
  }
  if (remediation.requested || remediation.mode === 'applied') {
    for (const action of remediation.actions) {
      const actionDetails = [action.outcome, action.signal ? `signal=${action.signal}` : null]
        .filter((part): part is string => part !== null)
        .join(', ');
      lines.push(
        `  - PID ${action.pid} ${action.target_kind}: ${action.status} (${actionDetails}) - ${action.reason}`
      );
    }
  }
  return lines;
}
