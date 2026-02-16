import process from 'node:process';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { hasFlag, parseArgs } from './cli-args.js';

const DEFAULT_INTERVAL_SECONDS = 30;
const DEFAULT_QUIET_MINUTES = 15;
const DEFAULT_TIMEOUT_MINUTES = 180;
const DEFAULT_MERGE_METHOD = 'squash';

const CHECKRUN_PASS_CONCLUSIONS = new Set(['SUCCESS', 'SKIPPED', 'NEUTRAL']);
const STATUS_CONTEXT_PASS_STATES = new Set(['SUCCESS']);
const STATUS_CONTEXT_PENDING_STATES = new Set(['EXPECTED', 'PENDING']);
const REQUIRED_BUCKET_PASS = new Set(['pass']);
const REQUIRED_BUCKET_PENDING = new Set(['pending']);
const REQUIRED_BUCKET_FAILED = new Set(['fail', 'cancel', 'skipping']);
const MERGEABLE_STATES = new Set(['CLEAN', 'HAS_HOOKS', 'UNSTABLE']);
const BLOCKED_REVIEW_DECISIONS = new Set(['CHANGES_REQUESTED', 'REVIEW_REQUIRED']);
const DO_NOT_MERGE_LABEL = /do[\s_-]*not[\s_-]*merge/i;

const PR_QUERY = `
query($owner:String!, $repo:String!, $number:Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$number) {
      number
      url
      state
      isDraft
      reviewDecision
      mergeStateStatus
      updatedAt
      mergedAt
      labels(first:50) {
        nodes {
          name
        }
      }
      reviewThreads(first:100) {
        nodes {
          isResolved
          isOutdated
        }
      }
      commits(last:1) {
        nodes {
          commit {
            oid
            statusCheckRollup {
              contexts(first:100) {
                nodes {
                  __typename
                  ... on CheckRun {
                    name
                    status
                    conclusion
                    detailsUrl
                  }
                  ... on StatusContext {
                    context
                    state
                    targetUrl
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

function normalizeEnum(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function normalizeBucket(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function formatDuration(ms) {
  if (ms <= 0) {
    return '0s';
  }
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) {
    return `${remainder}s`;
  }
  if (remainder === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m${remainder}s`;
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function parseNumber(name, rawValue, fallback) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallback;
  }
  if (typeof rawValue === 'boolean') {
    throw new Error(`--${name} requires a value.`);
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a number > 0 (received: ${rawValue})`);
  }
  return parsed;
}

function parseInteger(name, rawValue, fallback) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallback;
  }
  if (typeof rawValue === 'boolean') {
    throw new Error(`--${name} requires a value.`);
  }
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be an integer > 0 (received: ${rawValue})`);
  }
  return parsed;
}

function envFlagEnabled(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null) {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized.length === 0) {
    return fallback;
  }
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return fallback;
}

function parseMergeMethod(rawValue) {
  const normalized = (rawValue || DEFAULT_MERGE_METHOD).trim().toLowerCase();
  if (normalized !== 'merge' && normalized !== 'squash' && normalized !== 'rebase') {
    throw new Error(`--merge-method must be merge, squash, or rebase (received: ${rawValue})`);
  }
  return normalized;
}

export function printPrWatchMergeHelp(options = {}) {
  const usageCommand = typeof options.usage === 'string' && options.usage.trim().length > 0
    ? options.usage.trim()
    : 'codex-orchestrator pr watch-merge';
  console.log(`Usage: ${usageCommand} [options]

Monitor PR checks/reviews with polling and optionally merge after a quiet window.

Options:
  --pr <number>             PR number (default: PR for current branch)
  --owner <name>            Repo owner (default: inferred via gh repo view)
  --repo <name>             Repo name (default: inferred via gh repo view)
  --interval-seconds <n>    Poll interval in seconds (default: ${DEFAULT_INTERVAL_SECONDS})
  --quiet-minutes <n>       Required quiet window after ready state (default: ${DEFAULT_QUIET_MINUTES})
  --timeout-minutes <n>     Max monitor duration before failing (default: ${DEFAULT_TIMEOUT_MINUTES})
  --merge-method <method>   merge|squash|rebase (default: ${DEFAULT_MERGE_METHOD})
  --auto-merge              Merge automatically after quiet window
  --no-auto-merge           Never merge automatically (monitor only)
  --delete-branch           Delete remote branch when merging
  --no-delete-branch        Keep remote branch after merge
  --dry-run                 Never call gh pr merge (report only)
  -h, --help                Show this help message

Environment:
  PR_MONITOR_AUTO_MERGE=1       Default auto-merge on
  PR_MONITOR_DELETE_BRANCH=1    Default delete branch on merge
  PR_MONITOR_QUIET_MINUTES=<n>  Override quiet window default
  PR_MONITOR_INTERVAL_SECONDS=<n>
  PR_MONITOR_TIMEOUT_MINUTES=<n>
  PR_MONITOR_MERGE_METHOD=<method>`);
}

async function runGh(args, { allowFailure = false } = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn('gh', args, {
      env: {
        ...process.env,
        GH_PAGER: process.env.GH_PAGER || 'cat',
        // Harden all gh calls against interactive prompts (per `gh help environment`).
        GH_PROMPT_DISABLED: process.env.GH_PROMPT_DISABLED || '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.once('error', (error) => {
      reject(new Error(`Failed to run gh ${args.join(' ')}: ${error.message}`));
    });

    child.once('close', (code) => {
      const exitCode = typeof code === 'number' ? code : 1;
      const result = {
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
      if (exitCode === 0 || allowFailure) {
        resolve(result);
        return;
      }
      const detail = result.stderr || result.stdout || `exit code ${exitCode}`;
      reject(new Error(`gh ${args.join(' ')} failed: ${detail}`));
    });
  });
}

async function runGhJson(args) {
  const result = await runGh(args);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from gh ${args.join(' ')}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function ensureGhAuth() {
  const result = await runGh(['auth', 'status', '-h', 'github.com'], { allowFailure: true });
  if (result.exitCode !== 0) {
    throw new Error('GitHub CLI is not authenticated for github.com. Run `gh auth login` and retry.');
  }
}

async function resolveRepo(ownerArg, repoArg) {
  if (ownerArg && repoArg) {
    return { owner: ownerArg, repo: repoArg };
  }
  if (ownerArg || repoArg) {
    throw new Error('Provide both --owner and --repo, or neither.');
  }
  const response = await runGhJson(['repo', 'view', '--json', 'nameWithOwner']);
  const nameWithOwner = response?.nameWithOwner;
  if (typeof nameWithOwner !== 'string' || !nameWithOwner.includes('/')) {
    throw new Error('Unable to infer repository owner/name from gh repo view.');
  }
  const [owner, repo] = nameWithOwner.split('/');
  return { owner, repo };
}

async function resolvePrNumber(prArg) {
  if (prArg !== undefined) {
    return parseInteger('pr', prArg, null);
  }
  const response = await runGhJson(['pr', 'view', '--json', 'number']);
  const number = response?.number;
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error('Unable to infer PR number from current branch.');
  }
  return number;
}

function summarizeChecks(nodes) {
  const summary = {
    total: 0,
    successCount: 0,
    pending: [],
    failed: []
  };

  for (const node of nodes) {
    if (!node || typeof node !== 'object') {
      continue;
    }
    const typeName = typeof node.__typename === 'string' ? node.__typename : '';
    if (typeName === 'CheckRun') {
      summary.total += 1;
      const name = typeof node.name === 'string' && node.name.trim() ? node.name.trim() : 'check-run';
      const status = normalizeEnum(node.status);
      if (status !== 'COMPLETED') {
        summary.pending.push(name);
        continue;
      }
      const conclusion = normalizeEnum(node.conclusion);
      if (CHECKRUN_PASS_CONCLUSIONS.has(conclusion)) {
        summary.successCount += 1;
      } else {
        summary.failed.push({
          name,
          state: conclusion || 'UNKNOWN',
          detailsUrl: typeof node.detailsUrl === 'string' ? node.detailsUrl : null
        });
      }
      continue;
    }

    if (typeName === 'StatusContext') {
      summary.total += 1;
      const name = typeof node.context === 'string' && node.context.trim() ? node.context.trim() : 'status-context';
      const state = normalizeEnum(node.state);
      if (STATUS_CONTEXT_PENDING_STATES.has(state)) {
        summary.pending.push(name);
        continue;
      }
      if (STATUS_CONTEXT_PASS_STATES.has(state)) {
        summary.successCount += 1;
      } else {
        summary.failed.push({
          name,
          state: state || 'UNKNOWN',
          detailsUrl: typeof node.targetUrl === 'string' ? node.targetUrl : null
        });
      }
    }
  }

  return summary;
}

export function summarizeRequiredChecks(entries) {
  const summary = {
    total: 0,
    successCount: 0,
    pending: [],
    failed: []
  };

  if (!Array.isArray(entries)) {
    return summary;
  }

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    summary.total += 1;
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : 'required-check';
    const bucket = normalizeBucket(entry.bucket);
    const state = normalizeEnum(entry.state);
    const detailsUrl = typeof entry.link === 'string' ? entry.link : null;

    if (REQUIRED_BUCKET_PASS.has(bucket)) {
      summary.successCount += 1;
      continue;
    }
    if (REQUIRED_BUCKET_PENDING.has(bucket)) {
      summary.pending.push(name);
      continue;
    }
    if (REQUIRED_BUCKET_FAILED.has(bucket)) {
      summary.failed.push({
        name,
        state: state || bucket.toUpperCase() || 'UNKNOWN',
        detailsUrl
      });
      continue;
    }

    if (STATUS_CONTEXT_PENDING_STATES.has(state)) {
      summary.pending.push(name);
      continue;
    }
    if (STATUS_CONTEXT_PASS_STATES.has(state)) {
      summary.successCount += 1;
      continue;
    }
    summary.failed.push({
      name,
      state: state || 'UNKNOWN',
      detailsUrl
    });
  }

  return summary;
}

function hasRequiredChecksSummary(summary) {
  return Boolean(summary && typeof summary === 'object' && summary.total > 0);
}

export function resolveRequiredChecksSummary(freshSummary, previousSummary, fetchError = false) {
  if (hasRequiredChecksSummary(freshSummary)) {
    return freshSummary;
  }
  if (fetchError && hasRequiredChecksSummary(previousSummary)) {
    return previousSummary;
  }
  return null;
}

export function resolveCachedRequiredChecksSummary(previousCache, currentHeadOid) {
  if (!previousCache || typeof previousCache !== 'object') {
    return null;
  }
  const cachedHeadOid = typeof previousCache.headOid === 'string' ? previousCache.headOid : null;
  if (!cachedHeadOid || !currentHeadOid || cachedHeadOid !== currentHeadOid) {
    return null;
  }
  return hasRequiredChecksSummary(previousCache.summary) ? previousCache.summary : null;
}

export function buildStatusSnapshot(response, requiredChecks = null) {
  const pr = response?.data?.repository?.pullRequest;
  if (!pr) {
    throw new Error('GraphQL response missing pullRequest payload.');
  }

  const labels = Array.isArray(pr.labels?.nodes)
    ? pr.labels.nodes
        .map((item) => (item && typeof item.name === 'string' ? item.name.trim() : ''))
        .filter(Boolean)
    : [];
  const hasDoNotMergeLabel = labels.some((label) => DO_NOT_MERGE_LABEL.test(label));

  const threads = Array.isArray(pr.reviewThreads?.nodes) ? pr.reviewThreads.nodes : [];
  const unresolvedThreadCount = threads.filter((thread) => thread && !thread.isResolved && !thread.isOutdated).length;

  const contexts = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes;
  const checkNodes = Array.isArray(contexts) ? contexts : [];
  const checks = summarizeChecks(checkNodes);
  const requiredCheckSummary =
    requiredChecks && typeof requiredChecks === 'object' && requiredChecks.total > 0 ? requiredChecks : null;
  const gateChecks = requiredCheckSummary ?? checks;
  const gateChecksSource = requiredCheckSummary ? 'required' : 'rollup';

  const reviewDecision = normalizeEnum(pr.reviewDecision);
  const mergeStateStatus = normalizeEnum(pr.mergeStateStatus);
  const state = normalizeEnum(pr.state);
  const isDraft = Boolean(pr.isDraft);

  const gateReasons = [];
  if (state !== 'OPEN') {
    gateReasons.push(`state=${state || 'UNKNOWN'}`);
  }
  if (isDraft) {
    gateReasons.push('draft');
  }
  if (hasDoNotMergeLabel) {
    gateReasons.push('label:do-not-merge');
  }
  if (gateChecks.pending.length > 0) {
    gateReasons.push(
      gateChecksSource === 'required'
        ? `required_checks_pending=${gateChecks.pending.length}`
        : `checks_pending=${gateChecks.pending.length}`
    );
  }
  if (!MERGEABLE_STATES.has(mergeStateStatus)) {
    gateReasons.push(`merge_state=${mergeStateStatus || 'UNKNOWN'}`);
  }
  if (BLOCKED_REVIEW_DECISIONS.has(reviewDecision)) {
    gateReasons.push(`review=${reviewDecision}`);
  }
  if (unresolvedThreadCount > 0) {
    gateReasons.push(`unresolved_threads=${unresolvedThreadCount}`);
  }

  return {
    number: Number(pr.number),
    url: typeof pr.url === 'string' ? pr.url : null,
    state,
    isDraft,
    reviewDecision: reviewDecision || 'NONE',
    mergeStateStatus: mergeStateStatus || 'UNKNOWN',
    updatedAt: typeof pr.updatedAt === 'string' ? pr.updatedAt : null,
    mergedAt: typeof pr.mergedAt === 'string' ? pr.mergedAt : null,
    labels,
    hasDoNotMergeLabel,
    unresolvedThreadCount,
    checks,
    requiredChecks: requiredCheckSummary,
    gateChecksSource,
    gateReasons,
    readyToMerge: gateReasons.length === 0,
    headOid: pr.commits?.nodes?.[0]?.commit?.oid || null
  };
}

function formatStatusLine(snapshot, quietRemainingMs) {
  const requiredChecks = snapshot.requiredChecks;
  const failedNames = snapshot.checks.failed.map((item) => `${item.name}:${item.state}`).join(', ') || '-';
  const pendingNames = snapshot.checks.pending.join(', ') || '-';
  const requiredFailedNames = requiredChecks
    ? requiredChecks.failed.map((item) => `${item.name}:${item.state}`).join(', ') || '-'
    : '-';
  const requiredPendingNames = requiredChecks ? requiredChecks.pending.join(', ') || '-' : '-';
  const reasons = snapshot.gateReasons.join(', ') || 'none';
  return [
    `PR #${snapshot.number}`,
    `state=${snapshot.state}`,
    `merge_state=${snapshot.mergeStateStatus}`,
    `review=${snapshot.reviewDecision}`,
    `gate_checks=${snapshot.gateChecksSource}`,
    `checks_ok=${snapshot.checks.successCount}/${snapshot.checks.total}`,
    `checks_pending=${snapshot.checks.pending.length}`,
    `checks_failed=${snapshot.checks.failed.length}`,
    `required_checks_ok=${requiredChecks ? `${requiredChecks.successCount}/${requiredChecks.total}` : 'n/a'}`,
    `required_checks_pending=${requiredChecks ? requiredChecks.pending.length : 'n/a'}`,
    `required_checks_failed=${requiredChecks ? requiredChecks.failed.length : 'n/a'}`,
    `unresolved_threads=${snapshot.unresolvedThreadCount}`,
    `quiet_remaining=${formatDuration(quietRemainingMs)}`,
    `blocked_by=${reasons}`,
    `pending=[${pendingNames}]`,
    `failed=[${failedNames}]`,
    `required_pending=[${requiredPendingNames}]`,
    `required_failed=[${requiredFailedNames}]`
  ].join(' | ');
}

async function fetchRequiredChecks(owner, repo, prNumber) {
  try {
    const result = await runGhJson([
      'pr',
      'checks',
      String(prNumber),
      '--required',
      '--json',
      'name,state,link,bucket',
      '--repo',
      `${owner}/${repo}`
    ]);
    const entries = Array.isArray(result) ? result : [];
    const summary = summarizeRequiredChecks(entries);
    return {
      summary: summary.total > 0 ? summary : null,
      fetchError: false
    };
  } catch {
    return {
      summary: null,
      fetchError: true
    };
  }
}

async function fetchSnapshot(owner, repo, prNumber, previousRequiredChecksCache = null) {
  const response = await runGhJson([
    'api',
    'graphql',
    '-f',
    `query=${PR_QUERY}`,
    '-f',
    `owner=${owner}`,
    '-f',
    `repo=${repo}`,
    '-F',
    `number=${prNumber}`
  ]);
  const currentHeadOid = response?.data?.repository?.pullRequest?.commits?.nodes?.[0]?.commit?.oid || null;
  const previousRequiredChecks = resolveCachedRequiredChecksSummary(previousRequiredChecksCache, currentHeadOid);
  const requiredChecksResult = await fetchRequiredChecks(owner, repo, prNumber);
  const requiredChecks = resolveRequiredChecksSummary(
    requiredChecksResult.summary,
    previousRequiredChecks,
    requiredChecksResult.fetchError
  );
  return {
    snapshot: buildStatusSnapshot(response, requiredChecks),
    requiredChecksForNextPoll: requiredChecks
      ? {
          headOid: currentHeadOid,
          summary: requiredChecks
        }
      : null
  };
}

async function attemptMerge({ prNumber, mergeMethod, deleteBranch, headOid }) {
  // gh pr merge has no --yes flag; rely on non-interactive stdio + explicit merge method.
  const args = ['pr', 'merge', String(prNumber), `--${mergeMethod}`];
  if (deleteBranch) {
    args.push('--delete-branch');
  }
  if (headOid) {
    args.push('--match-head-commit', headOid);
  }
  return await runGh(args, { allowFailure: true });
}

async function runPrWatchMergeOrThrow(argv, options) {
  const { args, positionals } = parseArgs(argv);

  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    printPrWatchMergeHelp(options);
    return;
  }

  const knownFlags = new Set([
    'pr',
    'owner',
    'repo',
    'interval-seconds',
    'quiet-minutes',
    'timeout-minutes',
    'merge-method',
    'auto-merge',
    'no-auto-merge',
    'delete-branch',
    'no-delete-branch',
    'dry-run',
    'h',
    'help'
  ]);
  const unknownFlags = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknownFlags.length > 0 || positionals.length > 0) {
    const label = unknownFlags[0] ? `--${unknownFlags[0]}` : positionals[0];
    throw new Error(`Unknown option: ${label}`);
  }

  const intervalSeconds = parseNumber(
    'interval-seconds',
    typeof args['interval-seconds'] === 'string'
      ? args['interval-seconds']
      : process.env.PR_MONITOR_INTERVAL_SECONDS,
    DEFAULT_INTERVAL_SECONDS
  );
  const quietMinutes = parseNumber(
    'quiet-minutes',
    typeof args['quiet-minutes'] === 'string'
      ? args['quiet-minutes']
      : process.env.PR_MONITOR_QUIET_MINUTES,
    DEFAULT_QUIET_MINUTES
  );
  const timeoutMinutes = parseNumber(
    'timeout-minutes',
    typeof args['timeout-minutes'] === 'string'
      ? args['timeout-minutes']
      : process.env.PR_MONITOR_TIMEOUT_MINUTES,
    DEFAULT_TIMEOUT_MINUTES
  );
  const mergeMethod = parseMergeMethod(
    typeof args['merge-method'] === 'string'
      ? args['merge-method']
      : process.env.PR_MONITOR_MERGE_METHOD || DEFAULT_MERGE_METHOD
  );
  const defaultAutoMerge = envFlagEnabled(process.env.PR_MONITOR_AUTO_MERGE, false);
  const defaultDeleteBranch = envFlagEnabled(process.env.PR_MONITOR_DELETE_BRANCH, true);
  let autoMerge = defaultAutoMerge;
  if (hasFlag(args, 'auto-merge')) {
    autoMerge = true;
  }
  if (hasFlag(args, 'no-auto-merge')) {
    autoMerge = false;
  }
  let deleteBranch = defaultDeleteBranch;
  if (hasFlag(args, 'delete-branch')) {
    deleteBranch = true;
  }
  if (hasFlag(args, 'no-delete-branch')) {
    deleteBranch = false;
  }
  const dryRun = hasFlag(args, 'dry-run');

  await ensureGhAuth();
  const { owner, repo } = await resolveRepo(
    typeof args.owner === 'string' ? args.owner : undefined,
    typeof args.repo === 'string' ? args.repo : undefined
  );
  const prNumber = await resolvePrNumber(args.pr);

  const intervalMs = Math.round(intervalSeconds * 1000);
  const quietMs = Math.round(quietMinutes * 60 * 1000);
  const timeoutMs = Math.round(timeoutMinutes * 60 * 1000);
  const deadline = Date.now() + timeoutMs;

  log(
    `Monitoring ${owner}/${repo}#${prNumber} every ${intervalSeconds}s (quiet window ${quietMinutes}m, timeout ${timeoutMinutes}m, auto_merge=${
      autoMerge ? 'on' : 'off'
    }, dry_run=${dryRun ? 'on' : 'off'}).`
  );

  let quietWindowStartedAt = null;
  let quietWindowAnchorUpdatedAt = null;
  let quietWindowAnchorHeadOid = null;
  let lastMergeAttemptHeadOid = null;
  let requiredChecksForNextPollCache = null;

  while (Date.now() <= deadline) {
    let snapshot;
    try {
      const fetched = await fetchSnapshot(owner, repo, prNumber, requiredChecksForNextPollCache);
      snapshot = fetched.snapshot;
      requiredChecksForNextPollCache = fetched.requiredChecksForNextPoll;
    } catch (error) {
      log(`Polling error: ${error instanceof Error ? error.message : String(error)} (retrying).`);
      await sleep(intervalMs);
      continue;
    }

    if (snapshot.state === 'MERGED' || snapshot.mergedAt) {
      log(`PR #${prNumber} is merged.`);
      if (snapshot.url) {
        log(`URL: ${snapshot.url}`);
      }
      return;
    }
    if (snapshot.state === 'CLOSED') {
      throw new Error(`PR #${prNumber} was closed without merge.`);
    }

    if (snapshot.readyToMerge) {
      const readyAnchorChanged =
        quietWindowStartedAt !== null &&
        (snapshot.updatedAt !== quietWindowAnchorUpdatedAt || snapshot.headOid !== quietWindowAnchorHeadOid);
      if (quietWindowStartedAt === null || readyAnchorChanged) {
        quietWindowStartedAt = Date.now();
        quietWindowAnchorUpdatedAt = snapshot.updatedAt;
        quietWindowAnchorHeadOid = snapshot.headOid;
        lastMergeAttemptHeadOid = null;
        log(
          readyAnchorChanged
            ? 'Ready state changed; quiet window reset.'
            : `Ready state reached; quiet window started (${quietMinutes}m).`
        );
      }
    } else if (quietWindowStartedAt !== null) {
      quietWindowStartedAt = null;
      quietWindowAnchorUpdatedAt = null;
      quietWindowAnchorHeadOid = null;
      lastMergeAttemptHeadOid = null;
      log('Ready state lost; quiet window cleared.');
    }

    const quietElapsedMs = quietWindowStartedAt ? Date.now() - quietWindowStartedAt : 0;
    const quietRemainingMs = quietWindowStartedAt ? Math.max(quietMs - quietElapsedMs, 0) : quietMs;

    log(formatStatusLine(snapshot, quietRemainingMs));

    if (snapshot.readyToMerge && quietWindowStartedAt !== null && quietElapsedMs >= quietMs) {
      if (!autoMerge || dryRun) {
        log(
          dryRun
            ? 'Dry run: merge conditions satisfied and quiet window elapsed.'
            : 'Merge conditions satisfied and quiet window elapsed.'
        );
        if (snapshot.url) {
          log(`Ready to merge: ${snapshot.url}`);
        }
        return;
      }

      if (snapshot.headOid && snapshot.headOid === lastMergeAttemptHeadOid) {
        log(`Merge already attempted for head ${snapshot.headOid}; waiting for PR state refresh.`);
      } else {
        lastMergeAttemptHeadOid = snapshot.headOid;
        log(`Attempting merge via gh pr merge --${mergeMethod}${deleteBranch ? ' --delete-branch' : ''}.`);
        const mergeResult = await attemptMerge({
          prNumber,
          mergeMethod,
          deleteBranch,
          headOid: snapshot.headOid
        });
        if (mergeResult.exitCode === 0) {
          log(`Merge command succeeded for PR #${prNumber}.`);
          return;
        }
        const details = mergeResult.stderr || mergeResult.stdout || `exit code ${mergeResult.exitCode}`;
        log(`Merge attempt failed: ${details}`);
      }
    }

    const remainingTimeMs = deadline - Date.now();
    if (remainingTimeMs <= 0) {
      break;
    }
    await sleep(Math.min(intervalMs, remainingTimeMs));
  }

  throw new Error(`Timed out after ${timeoutMinutes} minute(s) while monitoring PR #${prNumber}.`);
}

export async function runPrWatchMerge(argv, options = {}) {
  try {
    await runPrWatchMergeOrThrow(argv, options);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 1;
  }
}
