/* eslint-disable patterns/prefer-logger-over-console */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
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
  /\bcodex\b|codex-orchestrator|delegate-server|provider-linear-worker|providerLinearWorkerRunner|control-host|co-status/iu;

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
  readDirectory: typeof readdir;
  fileExists: (path: string) => boolean;
  resolveCodexHome: (env?: NodeJS.ProcessEnv) => string;
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
  owner: {
    status: 'identified' | 'missing';
    issue_identifier: string | null;
    issue_id: string | null;
    task_id: string | null;
    run_id: string | null;
  };
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
  read_only: true;
  mutation_mode: 'disabled';
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
  readDirectory: readdir,
  fileExists: existsSync,
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

  return {
    schema_version: 1,
    generated_at: now,
    read_only: true,
    mutation_mode: 'disabled',
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
      return {
        ...record,
        relevant: true,
        quota_burning: quotaBurning,
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

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveVerdict(findings: QuotaHygieneFinding[]): AuditVerdict {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return 'critical';
  }
  return findings.length > 0 ? 'degraded' : 'healthy';
}

function formatQuotaHygieneAudit(audit: QuotaHygieneAudit): string[] {
  return [
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
}
