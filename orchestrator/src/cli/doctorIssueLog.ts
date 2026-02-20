import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

import {
  collectManifests,
  parseRunIdTimestamp
} from '../../../scripts/lib/run-manifests.js';
import type { DoctorCloudPreflightResult, DoctorResult } from './doctor.js';
import type { DoctorUsageResult } from './doctorUsage.js';

const ISSUE_LOG_HEADER = `# Codex Orchestrator Issues Log

Purpose:
- Track concrete Codex Orchestrator (CO) friction points observed in this repo so they can be addressed upstream.
`;

export interface DoctorIssueLogOptions {
  doctor: DoctorResult;
  usage?: DoctorUsageResult | null;
  cloudPreflight?: DoctorCloudPreflightResult | null;
  issueTitle?: string | null;
  issueNotes?: string | null;
  issueLogPath?: string | null;
  taskFilter?: string | null;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface DoctorIssueLogRunContext {
  task_id: string;
  run_id: string;
  pipeline_id: string;
  status: string;
  status_detail: string | null;
  summary: string | null;
  manifest_path: string;
  log_path: string | null;
  cloud_fallback_reason: string | null;
  cloud_fallback_issue_codes: string[];
  cloud_execution_status: string | null;
  cloud_execution_task_id: string | null;
  cloud_execution_status_url: string | null;
}

export interface DoctorIssueLogResult {
  issue_id: string;
  issue_title: string;
  issue_log_path: string;
  bundle_path: string;
  task_filter: string | null;
  run_context: DoctorIssueLogRunContext | null;
}

interface ManifestSnapshot {
  task_id: string;
  run_id: string;
  pipeline_id: string;
  status: string;
  status_detail: string | null;
  summary: string | null;
  manifest_path: string;
  log_path: string | null;
  cloud_fallback_reason: string | null;
  cloud_fallback_issue_codes: string[];
  cloud_execution_status: string | null;
  cloud_execution_task_id: string | null;
  cloud_execution_status_url: string | null;
  sort_time_ms: number;
}

export async function writeDoctorIssueLog(options: DoctorIssueLogOptions): Promise<DoctorIssueLogResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env;
  const repoRoot = resolveIssueLogRepoRoot(cwd, env);
  const runsRoot = resolveIssueLogRootPath(repoRoot, env.CODEX_ORCHESTRATOR_RUNS_DIR, '.runs');
  const outRoot = resolveIssueLogRootPath(repoRoot, env.CODEX_ORCHESTRATOR_OUT_DIR, 'out');
  const defaultTaskId = normalizeIssueLogTaskId(env);
  const capturedAt = new Date().toISOString();
  const issueId = formatIssueId(capturedAt);
  const issueTitle = normalizeText(options.issueTitle) ?? 'Observed Codex Orchestrator issue';
  const issueNotes = normalizeText(options.issueNotes);
  const taskFilter = normalizeText(options.taskFilter);

  const issueLogPath = resolveIssueLogPath(repoRoot, options.issueLogPath);
  const runContext = await resolveLatestRunContext({
    runsRoot,
    repoRoot,
    taskFilter
  });

  const bundleTaskId = normalizeArtifactTaskId(taskFilter ?? runContext?.task_id ?? defaultTaskId);
  const bundleDir = join(outRoot, bundleTaskId, 'doctor', 'issue-bundles');
  await mkdir(bundleDir, { recursive: true });
  const bundlePath = join(bundleDir, `${toCompactTimestamp(capturedAt)}-${slugify(issueTitle)}.json`);

  const bundlePayload = {
    version: 1,
    captured_at: capturedAt,
    issue: {
      id: issueId,
      title: issueTitle,
      notes: issueNotes,
      command: 'codex-orchestrator doctor --issue-log'
    },
    repo: {
      cwd,
      repo_root: repoRoot
    },
    task_filter: taskFilter,
    doctor: options.doctor,
    usage: options.usage ?? null,
    cloud_preflight: options.cloudPreflight ?? null,
    run_context: runContext
  };
  await writeFile(bundlePath, `${JSON.stringify(bundlePayload, null, 2)}\n`, 'utf8');

  await writeIssueLogMarkdown({
    issueLogPath,
    issueId,
    issueTitle,
    issueNotes,
    taskFilter,
    capturedAt,
    doctor: options.doctor,
    cloudPreflight: options.cloudPreflight ?? null,
    runContext,
    bundlePath,
    repoRoot,
    cwd
  });

  return {
    issue_id: issueId,
    issue_title: issueTitle,
    issue_log_path: toDisplayPath(issueLogPath, cwd),
    bundle_path: toDisplayPath(bundlePath, cwd),
    task_filter: taskFilter,
    run_context: runContext
  };
}

export function formatDoctorIssueLogSummary(result: DoctorIssueLogResult): string[] {
  const lines: string[] = [];
  lines.push(`Issue log: ${result.issue_id}`);
  lines.push(`  - markdown: ${result.issue_log_path}`);
  lines.push(`  - bundle: ${result.bundle_path}`);
  if (result.run_context) {
    lines.push(`  - run: ${result.run_context.run_id} (${result.run_context.status})`);
  } else {
    lines.push('  - run: <none found>');
  }
  return lines;
}

function resolveIssueLogPath(repoRoot: string, rawPath: string | null | undefined): string {
  const normalized = normalizeText(rawPath);
  if (!normalized) {
    return join(repoRoot, 'docs', 'codex-orchestrator-issues.md');
  }
  if (isAbsolute(normalized)) {
    return normalized;
  }
  return resolve(repoRoot, normalized);
}

function resolveIssueLogRepoRoot(cwd: string, env: NodeJS.ProcessEnv): string {
  const configuredRoot = normalizeText(env.CODEX_ORCHESTRATOR_ROOT);
  const rootHint =
    configuredRoot === null
      ? cwd
      : isAbsolute(configuredRoot)
        ? configuredRoot
        : resolve(cwd, configuredRoot);
  return resolveRepoRootFromHint(rootHint);
}

function resolveRepoRootFromHint(rootHint: string): string {
  const normalizedHint = resolve(rootHint);
  const gitBoundary = findNearestGitBoundary(normalizedHint);
  let current: string | null = normalizedHint;
  while (current) {
    if (existsSync(join(current, 'tasks', 'index.json'))) {
      return current;
    }
    if (gitBoundary && current === gitBoundary) {
      break;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return gitBoundary ?? normalizedHint;
}

function findNearestGitBoundary(start: string): string | null {
  let current: string | null = resolve(start);
  while (current) {
    if (existsSync(join(current, '.git'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

function resolveIssueLogRootPath(repoRoot: string, configuredPath: string | undefined, fallback: string): string {
  const normalized = normalizeText(configuredPath);
  if (!normalized) {
    return resolve(repoRoot, fallback);
  }
  if (isAbsolute(normalized)) {
    return normalized;
  }
  return resolve(repoRoot, normalized);
}

function normalizeIssueLogTaskId(env: NodeJS.ProcessEnv): string {
  return normalizeArtifactTaskId(
    normalizeText(env.MCP_RUNNER_TASK_ID)
    ?? normalizeText(env.TASK)
    ?? normalizeText(env.CODEX_ORCHESTRATOR_TASK_ID)
    ?? '0101'
  );
}

async function writeIssueLogMarkdown(options: {
  issueLogPath: string;
  issueId: string;
  issueTitle: string;
  issueNotes: string | null;
  taskFilter: string | null;
  capturedAt: string;
  doctor: DoctorResult;
  cloudPreflight: DoctorCloudPreflightResult | null;
  runContext: DoctorIssueLogRunContext | null;
  bundlePath: string;
  repoRoot: string;
  cwd: string;
}): Promise<void> {
  await mkdir(dirname(options.issueLogPath), { recursive: true });
  let content = ISSUE_LOG_HEADER;
  if (existsSync(options.issueLogPath)) {
    content = await readFile(options.issueLogPath, 'utf8');
    if (!content.trim()) {
      content = ISSUE_LOG_HEADER;
    }
  }

  const dateHeading = options.capturedAt.slice(0, 10);
  const dateMarker = `\n## ${dateHeading}\n`;
  if (!content.includes(dateMarker) && !content.endsWith(`## ${dateHeading}`)) {
    content = `${content.replace(/\s*$/u, '')}\n\n## ${dateHeading}\n`;
  }

  const cloudPreflightStatus = options.cloudPreflight
    ? options.cloudPreflight.ok
      ? 'ok'
      : 'failed'
    : 'not-run';
  const cloudPreflightIssueCodes = options.cloudPreflight
    ? options.cloudPreflight.issues.map((issue) => issue.code).filter(Boolean)
    : [];

  const lines: string[] = [];
  lines.push(`### ${options.issueId}: ${options.issueTitle}`);
  lines.push('- Logged via: `codex-orchestrator doctor --issue-log`');
  lines.push(`- Captured at: ${options.capturedAt}`);
  lines.push(`- Repo root: \`${toDisplayPath(options.repoRoot, options.cwd)}\``);
  lines.push(`- Task filter: \`${options.taskFilter ?? '<none>'}\``);
  lines.push(`- Doctor status: \`${options.doctor.status}\``);
  lines.push(`- Cloud preflight: \`${cloudPreflightStatus}\``);
  if (cloudPreflightIssueCodes.length > 0) {
    lines.push(`- Cloud preflight issue codes: \`${cloudPreflightIssueCodes.join(', ')}\``);
  }
  if (options.runContext) {
    lines.push(`- Latest run id: \`${options.runContext.run_id}\``);
    lines.push(`- Latest run status: \`${options.runContext.status}\``);
    lines.push(`- Latest run pipeline: \`${options.runContext.pipeline_id}\``);
    lines.push(`- Latest run manifest: \`${options.runContext.manifest_path}\``);
    if (options.runContext.cloud_fallback_reason) {
      lines.push(`- Latest run cloud fallback: \`${options.runContext.cloud_fallback_reason}\``);
    }
    if (options.runContext.cloud_execution_status) {
      const cloudBits = [
        `status=${options.runContext.cloud_execution_status}`,
        options.runContext.cloud_execution_task_id
          ? `task=${options.runContext.cloud_execution_task_id}`
          : null,
        options.runContext.cloud_execution_status_url
          ? `url=${options.runContext.cloud_execution_status_url}`
          : null
      ].filter((item): item is string => Boolean(item));
      lines.push(`- Latest run cloud execution: \`${cloudBits.join(' ')}\``);
    }
  } else {
    lines.push('- Latest run context: `<none found under .runs>`');
  }
  if (options.issueNotes) {
    lines.push(`- Notes: ${options.issueNotes}`);
  }
  lines.push(`- Bundle JSON: \`${toDisplayPath(options.bundlePath, options.cwd)}\``);
  lines.push('');

  content = `${content.replace(/\s*$/u, '')}\n\n${lines.join('\n')}\n`;
  await writeFile(options.issueLogPath, content, 'utf8');
}

async function resolveLatestRunContext(options: {
  runsRoot: string;
  repoRoot: string;
  taskFilter: string | null;
}): Promise<DoctorIssueLogRunContext | null> {
  const manifestPaths = await collectManifests(options.runsRoot, options.taskFilter ?? undefined);
  let latest: ManifestSnapshot | null = null;

  for (const manifestPath of manifestPaths) {
    const parsed = await parseManifestSnapshot(manifestPath, options.repoRoot);
    if (!parsed) {
      continue;
    }
    if (!latest || parsed.sort_time_ms > latest.sort_time_ms) {
      latest = parsed;
    }
  }

  if (!latest) {
    return null;
  }

  return {
    task_id: latest.task_id,
    run_id: latest.run_id,
    pipeline_id: latest.pipeline_id,
    status: latest.status,
    status_detail: latest.status_detail,
    summary: latest.summary,
    manifest_path: latest.manifest_path,
    log_path: latest.log_path,
    cloud_fallback_reason: latest.cloud_fallback_reason,
    cloud_fallback_issue_codes: latest.cloud_fallback_issue_codes,
    cloud_execution_status: latest.cloud_execution_status,
    cloud_execution_task_id: latest.cloud_execution_task_id,
    cloud_execution_status_url: latest.cloud_execution_status_url
  };
}

async function parseManifestSnapshot(manifestPath: string, repoRoot: string): Promise<ManifestSnapshot | null> {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const fallbackIssuesRaw =
      parsed.cloud_fallback && typeof parsed.cloud_fallback === 'object'
        ? (parsed.cloud_fallback as { issues?: unknown }).issues
        : null;
    const fallbackIssueCodes = Array.isArray(fallbackIssuesRaw)
      ? fallbackIssuesRaw
          .map((issue) => {
            if (!issue || typeof issue !== 'object') {
              return null;
            }
            const code = (issue as { code?: unknown }).code;
            return typeof code === 'string' && code.trim().length > 0 ? code.trim() : null;
          })
          .filter((code): code is string => Boolean(code))
      : [];
    const cloudFallbackReason =
      parsed.cloud_fallback && typeof parsed.cloud_fallback === 'object'
        ? normalizeText((parsed.cloud_fallback as { reason?: unknown }).reason)
        : null;
    const cloudExecution =
      parsed.cloud_execution && typeof parsed.cloud_execution === 'object'
        ? (parsed.cloud_execution as Record<string, unknown>)
        : null;
    const runId = normalizeText(parsed.run_id) ?? basename(dirname(manifestPath));
    const startedAtMs = Date.parse(String(parsed.started_at ?? ''));
    const sortTimeMs = Number.isFinite(startedAtMs) && startedAtMs > 0
      ? startedAtMs
      : parseRunIdTimestamp(runId)?.getTime() ?? 0;

    return {
      task_id: normalizeText(parsed.task_id) ?? 'unknown-task',
      run_id: runId,
      pipeline_id: normalizeText(parsed.pipeline_id) ?? 'unknown-pipeline',
      status: normalizeText(parsed.status) ?? 'unknown',
      status_detail: normalizeText(parsed.status_detail),
      summary: normalizeText(parsed.summary),
      manifest_path: toRepoRelativePath(manifestPath, repoRoot),
      log_path: normalizeText(parsed.log_path),
      cloud_fallback_reason: cloudFallbackReason,
      cloud_fallback_issue_codes: fallbackIssueCodes,
      cloud_execution_status: normalizeText(cloudExecution?.status),
      cloud_execution_task_id: normalizeText(cloudExecution?.task_id),
      cloud_execution_status_url: normalizeText(cloudExecution?.status_url),
      sort_time_ms: sortTimeMs
    };
  } catch {
    return null;
  }
}

function normalizeArtifactTaskId(value: string | null | undefined): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 'issue-log';
  }
  const safe = normalized.replace(/[^A-Za-z0-9._-]+/gu, '-').replace(/^-+|-+$/gu, '');
  return safe.length > 0 ? safe : 'issue-log';
}

function formatIssueId(iso: string): string {
  const compact = iso
    .replace(/\.\d{3}Z$/u, '')
    .replace(/[-:]/gu, '')
    .replace('T', '-');
  return `CO-${compact}`;
}

function toCompactTimestamp(iso: string): string {
  return iso.replace(/[-:.]/gu, '').replace(/Z$/u, 'Z');
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  if (!normalized) {
    return 'issue';
  }
  return normalized.slice(0, 48);
}

function toRepoRelativePath(pathValue: string, repoRoot: string): string {
  const rel = relative(repoRoot, pathValue);
  if (!rel || rel.startsWith('..')) {
    return pathValue;
  }
  return rel.replace(/\\/gu, '/');
}

function toDisplayPath(pathValue: string, cwd: string): string {
  const rel = relative(cwd, pathValue);
  if (!rel || rel.startsWith('..')) {
    return pathValue;
  }
  return rel.replace(/\\/gu, '/');
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
