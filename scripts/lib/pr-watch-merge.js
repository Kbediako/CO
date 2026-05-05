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
const ACTION_REQUIRED_MERGE_STATES = new Set(['BEHIND', 'DIRTY']);
const AUTOMATIC_BRANCH_RECOVERY_REASONS = new Set(['merge_state=BEHIND', 'merge_state=DIRTY']);
const MERGE_BLOCKED_REVIEW_DECISIONS = new Set(['CHANGES_REQUESTED', 'REVIEW_REQUIRED']);
const REVIEW_HANDOFF_BLOCKED_REVIEW_DECISIONS = new Set(['CHANGES_REQUESTED']);
const DO_NOT_MERGE_LABEL = /do[\s_-]*not[\s_-]*merge/i;
const ACTIONABLE_BOT_LOGINS = new Set([
  'chatgpt-codex-connector',
  'chatgpt-codex-connector[bot]',
  'coderabbitai',
  'coderabbitai[bot]'
]);
const BOT_KIND_LABELS = {
  codex: 'codex',
  coderabbit: 'coderabbitai'
};
const BOT_MENTION_PATTERNS = {
  codex: /@(?:chatgpt-codex-connector|codex)(?![\w-])/iu,
  coderabbit: /@coderabbitai(?![\w-])/iu
};
const BOT_IN_PROGRESS_REACTION_CONTENT = new Set(['eyes']);
const BOT_COMPLETE_REACTION_CONTENT = new Set(['+1', 'hooray', 'heart', 'rocket', 'laugh', 'confused']);
const CODERABBIT_ISSUE_COMMENT_COMPLETION_PATTERNS = [
  /No actionable comments were generated in the recent review/iu,
  /Everything is clean\b/iu,
  /PR is ready to merge\b/iu
];
const CODEX_TERMINAL_FAILURE_COMMENT_PATTERNS = [
  /Codex\s+Review:\s*Something\s+went\s+wrong\.\s*Try\s+again\s+later\s+by\s+commenting\s+@codex\s+review\./iu,
  /Codex\s+Review:\s*Something\s+went\s+wrong\b/iu,
  /\bunknown\s+error\b[\s\S]{0,240}\b@codex\s+review\b/iu
];
const CODEX_TERMINAL_FAILURE_SIGNAL = 'unknown_error;manual_retry=@codex_review';
const CODEX_MENTION_PATTERN = /@(?:chatgpt-codex-connector|codex)(?![\w-])/giu;
const CODERABBIT_MENTION_PATTERN = /@coderabbitai(?![\w-])/giu;
const CODEX_MENTION_AT_START_PATTERN =
  /^[\t ,:&/-]*(?:and|&)?[\t ,:&/-]*@(?:chatgpt-codex-connector|codex)(?![\w-])/iu;
const CODERABBIT_POST_MENTION_ACKNOWLEDGEMENT_PRELUDE_PATTERN =
  /^[\t ,:;-]{0,80}(?:(?:(?:thank\s+you|thanks?|thx|noted|acknowledged|ack|got\s+it|understood|ok(?:ay)?|status\s+(?:noted|acknowledged))|(?:(?:addressed|fixed|handled|done|updated|implemented|resolved)(?:\s+(?:(?:it|this|that|these|those|them)|(?:(?:the|all|remaining|latest|current)\s+)?(?:(?:code\s*rabbit|coderabbit)(?:\s+review)?\s+)?(?:comments?|feedback|threads?|nits?|findings?|issues?|suggestions?|review\s+comments?)))?))[\t ,:;.!?-]+){1,3}/iu;
const CODERABBIT_REREVIEW_REQUEST_AFTER_MENTION_PATTERN =
  /^[\t ,:;-]{0,80}(?:(?:(?:please|pls|can\s+you|could\s+you|would\s+you)(?:\s+please)?\s+review)|(?:(?:please|pls|can\s+you|could\s+you|would\s+you)(?:\s+please)?\s+)?(?:re[-\s]?review|rereview|review\s+(?:again|this|the\s+(?:latest|current)\s+(?:head|iteration|changes?))|check\s+(?:again|this|these|it|the\s+(?:latest|current)\s+(?:head|iteration|changes?)|changes?)|take\s+(?:another\s+)?look|resolve|mark\s+(?:it|this|these|thread|threads|comments?)\s+resolved|rerun\s+(?:the\s+)?review|run\s+(?:the\s+)?review\s+again))\b/iu;
const CODERABBIT_REREVIEW_REQUEST_BEFORE_MENTION_PATTERN =
  /^[\t ,:;'"()/-]*(?:(?:(?:please|pls|can\s+you|could\s+you|would\s+you)(?:\s+please)?\s+review(?:\s+(?:this|these|it|changes?|fixes?|the\s+(?:latest|current)?\s*(?:head|iteration|changes?|fixes?))){0,3})|(?:(?:please|pls|can\s+you|could\s+you|would\s+you)(?:\s+please)?\s+)?(?:re[-\s]?review(?:\s+(?:again|this|these|it|iteration|the\s+(?:latest|current)\s+(?:head|iteration|changes?)|changes?)){0,3}|rereview(?:\s+(?:again|this|these|it|iteration|the\s+(?:latest|current)\s+(?:head|iteration|changes?)|changes?)){0,3}|review\s+(?:again|this|the\s+(?:latest|current)\s+(?:head|iteration|changes?))|check\s+(?:again|this|these|it|the\s+(?:latest|current)\s+(?:head|iteration|changes?)|changes?)|take\s+(?:another\s+)?look|resolve(?:\s+(?:this|these|it|(?:(?:the|all|remaining|latest|current)\s+){0,2}(?:thread|threads|comments?|feedback|issues?|findings?)))?|mark\s+(?:it|this|these|thread|threads|comments?)\s+resolved|rerun\s+(?:the\s+)?review|run\s+(?:the\s+)?review\s+again))\b[\t ,:;'"()/-]*$/iu;
const REREVIEW_REQUEST_CLAUSE_BOUNDARY_PATTERN = /[;\n\r.!?]/u;
const SHARED_BOT_REQUEST_JOINER_PATTERN = /^[\t ,:&/-]*(?:and|&)?[\t ,:&/-]*$/iu;
const CODERABBIT_STATUS_NAMES = new Set(['coderabbit', 'coderabbitai', 'code rabbit', 'code rabbit ai']);

function normalizeReadinessMode(rawValue) {
  return typeof rawValue === 'string' && rawValue.trim().toLowerCase() === 'review' ? 'review' : 'merge';
}

function resolveBlockedReviewDecisions(readinessMode) {
  return readinessMode === 'review'
    ? REVIEW_HANDOFF_BLOCKED_REVIEW_DECISIONS
    : MERGE_BLOCKED_REVIEW_DECISIONS;
}

function isReviewDecisionBlocked(reviewDecision, readinessMode) {
  return resolveBlockedReviewDecisions(readinessMode).has(reviewDecision);
}

function doesMergeStateBlockReady(mergeStateStatus, readinessMode) {
  return readinessMode === 'review'
    ? ACTION_REQUIRED_MERGE_STATES.has(mergeStateStatus)
    : !MERGEABLE_STATES.has(mergeStateStatus);
}

function doesMergeStateRequireAuthorAction(mergeStateStatus) {
  return ACTION_REQUIRED_MERGE_STATES.has(mergeStateStatus);
}

class PrWatchMergeExitError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'PrWatchMergeExitError';
    this.exitCode = exitCode;
  }
}

class GhCommandError extends Error {
  constructor(args, result) {
    const detail = result.stderr || result.stdout || `exit code ${result.exitCode}`;
    super(`gh ${args.join(' ')} failed: ${detail}`);
    this.name = 'GhCommandError';
    this.args = [...args];
    this.exitCode = result.exitCode;
    this.stdout = result.stdout;
    this.stderr = result.stderr;
  }
}

class GitHubRateLimitError extends Error {
  constructor(rateLimit, message = null) {
    super(message || formatGitHubRateLimitStatus(rateLimit));
    this.name = 'GitHubRateLimitError';
    this.githubRateLimit = rateLimit;
  }
}

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
                    startedAt
                    completedAt
                    detailsUrl
                  }
                  ... on StatusContext {
                    context
                    state
                    createdAt
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

function normalizeLogin(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeReactionContent(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isActionableBot(login) {
  return ACTIONABLE_BOT_LOGINS.has(normalizeLogin(login));
}

export function isHumanReviewActor(user) {
  if (!user || typeof user !== 'object') {
    return false;
  }
  const login = normalizeLogin(user.login);
  if (!login) {
    return false;
  }
  if (isActionableBot(login)) {
    return false;
  }
  const accountType = typeof user.type === 'string' ? user.type.trim().toUpperCase() : '';
  if (accountType) {
    return accountType === 'USER';
  }
  return !login.endsWith('[bot]');
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

function sanitizeRateLimitMessage(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.replace(/\s+/gu, ' ').trim();
  return normalized.length > 0 ? normalized.slice(0, 500) : null;
}

function inferGitHubApiSurfaceFromArgs(args) {
  if (!Array.isArray(args)) {
    return 'unknown';
  }
  if (args[0] === 'api' && args.includes('graphql')) {
    return 'graphql';
  }
  if (args[0] === 'api' || (args[0] === 'pr' && args[1] === 'checks')) {
    return 'rest';
  }
  return 'unknown';
}

function extractTextFromRateLimitInput(input) {
  if (input instanceof Error) {
    const pieces = [input.message];
    if (typeof input.stderr === 'string') {
      pieces.push(input.stderr);
    }
    if (typeof input.stdout === 'string') {
      pieces.push(input.stdout);
    }
    return pieces.filter(Boolean).join('\n');
  }
  if (typeof input === 'string') {
    return input;
  }
  if (input && typeof input === 'object') {
    const pieces = [];
    if (typeof input.message === 'string') {
      pieces.push(input.message);
    }
    if (typeof input.stderr === 'string') {
      pieces.push(input.stderr);
    }
    if (typeof input.stdout === 'string') {
      pieces.push(input.stdout);
    }
    if (Array.isArray(input.errors)) {
      for (const error of input.errors) {
        if (typeof error?.message === 'string') {
          pieces.push(error.message);
        }
        if (typeof error?.type === 'string') {
          pieces.push(error.type);
        }
      }
    }
    return pieces.filter(Boolean).join('\n');
  }
  return '';
}

function parseHttpStatusFromText(text) {
  const match =
    text.match(/\bHTTP\s+(?<status>403|429)\b/iu) ||
    text.match(/\bstatus(?:\s+code)?["':=\s]+(?<status>403|429)\b/iu) ||
    text.match(/"status"\s*:\s*(?<status>403|429)\b/iu);
  const parsed = match?.groups?.status ? Number.parseInt(match.groups.status, 10) : null;
  return Number.isInteger(parsed) ? parsed : null;
}

function parseHeaderSeconds(text, headerName) {
  const escapedHeaderName = headerName.replace(/[\\^$*+?.()|[\]{}]/gu, '\\$&');
  const pattern = new RegExp(`${escapedHeaderName}["'\\s:=]+(?<value>\\d+)`, 'iu');
  const match = text.match(pattern);
  if (!match?.groups?.value) {
    return null;
  }
  const parsed = Number.parseInt(match.groups.value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseIsoTimestampFromText(text) {
  const match = text.match(/\b(?<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\b/u);
  return match?.groups?.timestamp ?? null;
}

function isoFromEpochSeconds(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  const millis = value * 1000;
  return isoFromMillis(millis);
}

function isoFromMillis(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function futureDelayMsFromSeconds(nowMs, seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return null;
  }
  const delayMs = seconds * 1000;
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return null;
  }
  const targetMs = nowMs + delayMs;
  return isoFromMillis(targetMs) ? delayMs : null;
}

function computeRetryAt(nowMs, retryAfterSeconds, resetAt) {
  const retryDelayMs = futureDelayMsFromSeconds(nowMs, retryAfterSeconds);
  if (retryDelayMs !== null) {
    return isoFromMillis(nowMs + retryDelayMs);
  }
  if (typeof resetAt === 'string' && resetAt.trim().length > 0) {
    return resetAt;
  }
  return null;
}

function hasRateLimitSignal(text) {
  return (
    /\b(api\s+rate\s+limit\s+exceeded|rate\s+limit\s+exceeded|secondary\s+(?:rate\s+)?limit|RATE_LIMITED)\b/iu.test(text)
    || /\b(?:retry-after|x-ratelimit-reset)\b/iu.test(text)
    || /\bHTTP\s+429\b/iu.test(text)
  );
}

export function resolveGitHubRateLimitStatus(input, options = {}) {
  if (input instanceof GitHubRateLimitError && input.githubRateLimit) {
    return input.githubRateLimit;
  }
  if (input && typeof input === 'object' && input.kind === 'github_rate_limited') {
    return input;
  }
  const text = extractTextFromRateLimitInput(input);
  const isCommandOrRawTextInput =
    typeof input === 'string'
    || input instanceof Error
    || (
      input
      && typeof input === 'object'
      && (
        Array.isArray(input.args)
        || typeof input.exitCode === 'number'
        || typeof input.stderr === 'string'
        || typeof input.stdout === 'string'
      )
    );
  const structuredStatus =
    input && typeof input === 'object' && Number.isInteger(input.status)
      ? Number(input.status)
      : null;
  const status =
    structuredStatus === 403 || structuredStatus === 429
      ? structuredStatus
      : isCommandOrRawTextInput ? parseHttpStatusFromText(text) : null;
  const retryAfterSeconds = isCommandOrRawTextInput ? parseHeaderSeconds(text, 'retry-after') : null;
  const resetEpochSeconds = isCommandOrRawTextInput ? parseHeaderSeconds(text, 'x-ratelimit-reset') : null;
  const remainingRequests = isCommandOrRawTextInput ? parseHeaderSeconds(text, 'x-ratelimit-remaining') : null;
  const hasRateLimitText = /\b(api\s+rate\s+limit\s+exceeded|secondary\s+(?:rate\s+)?limit|RATE_LIMITED)\b/iu.test(text);
  const hasGraphqlRateLimitPayload =
    Array.isArray(input?.errors) &&
    input.errors.some((error) => typeof error?.type === 'string' && error.type.trim().toUpperCase() === 'RATE_LIMITED');
  const hasProtocolRateLimitEvidence =
    hasGraphqlRateLimitPayload
    || status === 429
    || retryAfterSeconds !== null
    || (resetEpochSeconds !== null && remainingRequests === 0)
    || (isCommandOrRawTextInput && hasRateLimitText);
  if (
    !hasProtocolRateLimitEvidence ||
    (!hasRateLimitSignal(text) && status !== 429)
  ) {
    return null;
  }
  const args = Array.isArray(input?.args) ? input.args : [];
  const surface =
    options.surface ??
    (/\bgraphql\b/iu.test(text) ? 'graphql' : inferGitHubApiSurfaceFromArgs(args));
  const resetAt = isoFromEpochSeconds(resetEpochSeconds) ?? parseIsoTimestampFromText(text);
  const nowMs = typeof options.nowMs === 'number' && Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const limitType = /\bsecondary\b/iu.test(text) ? 'secondary' : 'primary';
  return {
    kind: 'github_rate_limited',
    surface,
    limit_type: limitType,
    status,
    reset_at: resetAt,
    retry_after_seconds: retryAfterSeconds,
    retry_at: computeRetryAt(nowMs, retryAfterSeconds, resetAt),
    message: sanitizeRateLimitMessage(text)
  };
}

export function formatGitHubRateLimitStatus(rateLimit) {
  if (!rateLimit || typeof rateLimit !== 'object') {
    return 'GitHub API rate limit is active.';
  }
  const parts = [
    'GitHub API rate limit',
    `surface=${rateLimit.surface ?? 'unknown'}`,
    `type=${rateLimit.limit_type ?? 'unknown'}`
  ];
  if (rateLimit.status) {
    parts.push(`status=${rateLimit.status}`);
  }
  if (rateLimit.retry_at) {
    parts.push(`retry_at=${rateLimit.retry_at}`);
  } else if (rateLimit.reset_at) {
    parts.push(`reset_at=${rateLimit.reset_at}`);
  }
  return parts.join(' | ');
}

function throwIfGitHubRateLimited(input, options = {}) {
  const rateLimit = resolveGitHubRateLimitStatus(input, options);
  if (rateLimit) {
    throw new GitHubRateLimitError(rateLimit);
  }
}

function stableJitterMs(seed, maxJitterMs) {
  if (!maxJitterMs || maxJitterMs <= 0) {
    return 0;
  }
  const text = String(seed ?? 'github-rate-limit');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash % (maxJitterMs + 1);
}

export function planGitHubRateLimitBackoff(rateLimit, options = {}) {
  const nowMs = typeof options.nowMs === 'number' && Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const fallbackMs =
    typeof options.fallbackMs === 'number' && Number.isFinite(options.fallbackMs) && options.fallbackMs > 0
      ? options.fallbackMs
      : DEFAULT_INTERVAL_SECONDS * 1000;
  const maxJitterMs =
    typeof options.maxJitterMs === 'number' && Number.isFinite(options.maxJitterMs) && options.maxJitterMs >= 0
      ? Math.round(options.maxJitterMs)
      : 5000;
  const candidates = [];
  const retryAfterMs = futureDelayMsFromSeconds(nowMs, rateLimit?.retry_after_seconds);
  if (retryAfterMs !== null) {
    candidates.push(retryAfterMs);
  }
  const retryAtMs = parseTimestampMs(rateLimit?.retry_at);
  if (retryAtMs !== null) {
    const retryDelayMs = retryAtMs - nowMs;
    if (retryDelayMs > 0) {
      candidates.push(retryDelayMs);
    }
  }
  const resetAtMs = parseTimestampMs(rateLimit?.reset_at);
  if (resetAtMs !== null) {
    const resetDelayMs = resetAtMs - nowMs;
    if (resetDelayMs > 0) {
      candidates.push(resetDelayMs);
    }
  }
  const baseMs = candidates.length > 0 ? Math.max(...candidates) : fallbackMs;
  const jitterMs = stableJitterMs(options.jitterSeed, maxJitterMs);
  const plannedMs = Math.max(1000, baseMs + jitterMs);
  const remainingMs =
    typeof options.remainingMs === 'number' && Number.isFinite(options.remainingMs)
      ? Math.max(0, options.remainingMs)
      : null;
  return remainingMs === null ? plannedMs : Math.min(plannedMs, remainingMs);
}

function parseTimestampMs(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isNoRequiredChecksReportedErrorMessage(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  return /no required checks reported\b/iu.test(value);
}

function maxTimestamp(values) {
  let max = null;
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      continue;
    }
    if (max === null || value > max) {
      max = value;
    }
  }
  return max;
}

function isCoderabbitStatusName(value) {
  const normalized = typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/gu, ' ')
    : '';
  return CODERABBIT_STATUS_NAMES.has(normalized);
}

function resolveBotKindFromLogin(login) {
  const normalized = normalizeLogin(login);
  if (!normalized) {
    return null;
  }
  if (normalized === 'chatgpt-codex-connector' || normalized === 'chatgpt-codex-connector[bot]') {
    return 'codex';
  }
  if (normalized === 'coderabbitai' || normalized === 'coderabbitai[bot]') {
    return 'coderabbit';
  }
  return null;
}

function extractMentionedBotKinds(body) {
  if (typeof body !== 'string' || body.trim().length === 0) {
    return [];
  }
  const mentionedKinds = [];
  for (const [kind, pattern] of Object.entries(BOT_MENTION_PATTERNS)) {
    if (pattern.test(body)) {
      mentionedKinds.push(kind);
    }
  }
  return mentionedKinds;
}

function sliceClauseBefore(text, index) {
  const prefix = text.slice(0, index);
  const boundaryMatches = [...prefix.matchAll(new RegExp(REREVIEW_REQUEST_CLAUSE_BOUNDARY_PATTERN, 'gu'))];
  const lastBoundary = boundaryMatches.length > 0
    ? boundaryMatches[boundaryMatches.length - 1].index ?? -1
    : -1;
  return prefix.slice(lastBoundary + 1);
}

function sliceClauseAfter(text, index) {
  const suffix = text.slice(index);
  const boundary = REREVIEW_REQUEST_CLAUSE_BOUNDARY_PATTERN.exec(suffix);
  return boundary ? suffix.slice(0, boundary.index) : suffix;
}

function stripCoderabbitPostMentionAcknowledgementPrelude(text) {
  const stripped = text.replace(CODERABBIT_POST_MENTION_ACKNOWLEDGEMENT_PRELUDE_PATTERN, '');
  if (stripped === text || CODERABBIT_REREVIEW_REQUEST_AFTER_MENTION_PATTERN.test(stripped)) {
    return stripped;
  }
  return stripped.replace(/^[\t ,:;-]*(?:\([^.!?\n\r]{0,160}\)|[^.!?\n\r]{0,160})?[.!?]\s*/u, '');
}

function stripLeadingSharedBotMentions(text) {
  let remaining = text;
  for (let index = 0; index < 4; index += 1) {
    const next = remaining.replace(CODEX_MENTION_AT_START_PATTERN, '');
    if (next === remaining) {
      break;
    }
    remaining = next;
  }
  return remaining;
}

function sliceBeforeCoderabbitMentionRequestText(text, afterMention = '') {
  const matches = [...text.matchAll(CODEX_MENTION_PATTERN)];
  if (matches.length === 0) {
    return text;
  }
  const lastMatch = matches[matches.length - 1];
  const lastMatchIndex = typeof lastMatch.index === 'number' ? lastMatch.index : -1;
  const beforeLastCodex = lastMatchIndex >= 0 ? text.slice(0, lastMatchIndex) : '';
  const afterLastCodex = lastMatchIndex >= 0 ? text.slice(lastMatchIndex + lastMatch[0].length) : text;
  const afterAcknowledgementPrelude = stripCoderabbitPostMentionAcknowledgementPrelude(afterLastCodex);
  if (afterAcknowledgementPrelude !== afterLastCodex) {
    return afterAcknowledgementPrelude;
  }
  if (SHARED_BOT_REQUEST_JOINER_PATTERN.test(afterLastCodex) && !/[^\s,;:&/-]/u.test(afterMention)) {
    return beforeLastCodex;
  }
  return '';
}

function hasCoderabbitRereviewRequestIntent(body) {
  if (typeof body !== 'string' || body.trim().length === 0) {
    return false;
  }
  const matches = [...body.matchAll(CODERABBIT_MENTION_PATTERN)];
  for (const match of matches) {
    const mentionStart = typeof match.index === 'number' ? match.index : -1;
    const mentionEnd = mentionStart + match[0].length;
    if (mentionStart < 0) {
      continue;
    }
    const beforeMention = sliceClauseBefore(body, mentionStart);
    const afterMention = sliceClauseAfter(body, mentionEnd);
    const afterMentionSuffix = body.slice(mentionEnd).replace(/^[\s,;:!?._-]+/u, '');
    const afterSharedBotMentions = stripLeadingSharedBotMentions(afterMention);
    const afterAcknowledgementPrelude = stripCoderabbitPostMentionAcknowledgementPrelude(afterMention);
    const afterSuffixAcknowledgementPrelude = stripCoderabbitPostMentionAcknowledgementPrelude(afterMentionSuffix);
    const afterSharedBotAcknowledgementPrelude =
      stripCoderabbitPostMentionAcknowledgementPrelude(afterSharedBotMentions);
    const beforeMentionForCoderabbit = sliceBeforeCoderabbitMentionRequestText(beforeMention, afterMention);
    if (
      CODERABBIT_REREVIEW_REQUEST_AFTER_MENTION_PATTERN.test(afterMention) ||
      (!BOT_MENTION_PATTERNS.codex.test(afterAcknowledgementPrelude) && CODERABBIT_REREVIEW_REQUEST_AFTER_MENTION_PATTERN.test(afterAcknowledgementPrelude)) ||
      (!BOT_MENTION_PATTERNS.codex.test(afterSuffixAcknowledgementPrelude) && CODERABBIT_REREVIEW_REQUEST_AFTER_MENTION_PATTERN.test(afterSuffixAcknowledgementPrelude)) ||
      CODERABBIT_REREVIEW_REQUEST_AFTER_MENTION_PATTERN.test(afterSharedBotMentions) ||
      (!BOT_MENTION_PATTERNS.codex.test(afterSharedBotAcknowledgementPrelude) && CODERABBIT_REREVIEW_REQUEST_AFTER_MENTION_PATTERN.test(afterSharedBotAcknowledgementPrelude)) ||
      CODERABBIT_REREVIEW_REQUEST_BEFORE_MENTION_PATTERN.test(beforeMentionForCoderabbit)
    ) {
      return true;
    }
  }
  return false;
}

function classifyBotRereviewMentions(body) {
  const mentionedKinds = extractMentionedBotKinds(body);
  const requestedKinds = [];
  const ignoredMentions = [];
  for (const kind of mentionedKinds) {
    if (kind === 'coderabbit' && !hasCoderabbitRereviewRequestIntent(body)) {
      ignoredMentions.push({
        kind: BOT_KIND_LABELS.coderabbit,
        reason: 'acknowledgement_only'
      });
      continue;
    }
    requestedKinds.push(kind);
  }
  return {
    requestedKinds,
    ignoredMentions
  };
}

function withCommentSource(comments, source) {
  if (!Array.isArray(comments)) {
    return [];
  }
  return comments
    .filter((comment) => comment && typeof comment === 'object')
    .map((comment) => ({ ...comment, __source: source }));
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
  const readinessMode = normalizeReadinessMode(options.readinessMode);
  const isReviewMode = readinessMode === 'review';
  const usageCommand = typeof options.usage === 'string' && options.usage.trim().length > 0
    ? options.usage.trim()
    : isReviewMode
      ? 'codex-orchestrator pr ready-review'
      : 'codex-orchestrator pr watch-merge';
  const defaultAutoMerge =
    typeof options.defaultAutoMerge === 'boolean'
      ? options.defaultAutoMerge
      : envFlagEnabled(process.env.PR_MONITOR_AUTO_MERGE, false);
  const defaultExitOnActionRequired = Boolean(options.defaultExitOnActionRequired);
  console.log(`Usage: ${usageCommand} [options]

${isReviewMode
    ? 'Monitor PR checks/reviews with polling and report when review handoff is safe after a bounded automated-feedback drain.'
    : 'Monitor PR checks/reviews with polling and optionally merge after a quiet window.'}

Options:
  --pr <number>             PR number (default: PR for current branch)
  --owner <name>            Repo owner (default: inferred via gh repo view)
  --repo <name>             Repo name (default: inferred via gh repo view)
  --interval-seconds <n>    Poll interval in seconds (default: ${DEFAULT_INTERVAL_SECONDS})
  --quiet-minutes <n>       Required quiet window after ready state (default: ${DEFAULT_QUIET_MINUTES})
  --timeout-minutes <n>     Max monitor duration before failing (default: ${DEFAULT_TIMEOUT_MINUTES})
${isReviewMode ? '' : `  --merge-method <method>   merge|squash|rebase (default: ${DEFAULT_MERGE_METHOD})
  --auto-merge              Merge automatically after quiet window
  --no-auto-merge           Never merge automatically (monitor only)
  --delete-branch           Delete remote branch when merging
  --no-delete-branch        Keep remote branch after merge
`}
  --exit-on-action-required Exit non-zero when author action is required
  --no-exit-on-action-required Keep monitoring even when author action is required
  --dry-run                 Never call gh pr merge/update-branch (report only)
  -h, --help                Show this help message

Environment:
  PR_MONITOR_QUIET_MINUTES=<n>  Override quiet window default
  PR_MONITOR_INTERVAL_SECONDS=<n>
  PR_MONITOR_TIMEOUT_MINUTES=<n>${isReviewMode ? '' : `
  PR_MONITOR_AUTO_MERGE=1       Default auto-merge on (current default: ${defaultAutoMerge ? 'on' : 'off'})
  PR_MONITOR_DELETE_BRANCH=1    Default delete branch on merge
  PR_MONITOR_MERGE_METHOD=<method>`}`);
  if (defaultExitOnActionRequired) {
    console.log(`  ${isReviewMode ? 'ready-review' : 'resolve-merge'} default: exit-on-action-required is on`);
  }
  if (isReviewMode) {
    console.log('  ready-review treats REVIEW_REQUIRED as informational; CHANGES_REQUESTED and actionable machine feedback still block handoff.');
  }
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
      reject(new GhCommandError(args, result));
    });
  });
}

async function runGit(args, { allowFailure = false } = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      env: process.env,
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
      reject(new Error(`Failed to run git ${args.join(' ')}: ${error.message}`));
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
      reject(new Error(`git ${args.join(' ')} failed: ${detail}`));
    });
  });
}

async function runGhJson(args) {
  let result;
  const surface = inferGitHubApiSurfaceFromArgs(args);
  try {
    result = await runGh(args);
  } catch (error) {
    throwIfGitHubRateLimited(error, { surface });
    throw error;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    throwIfGitHubRateLimited(parsed, { surface });
    return parsed;
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      throw error;
    }
    throwIfGitHubRateLimited(result.stdout, { surface });
    throw new Error(
      `Failed to parse JSON from gh ${args.join(' ')}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function runGhJsonSlurped(args) {
  const ghArgs = [...args, '--paginate', '--slurp'];
  let result;
  const surface = inferGitHubApiSurfaceFromArgs(ghArgs);
  try {
    result = await runGh(ghArgs);
  } catch (error) {
    throwIfGitHubRateLimited(error, { surface });
    throw error;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    throwIfGitHubRateLimited(parsed, { surface });
    return parsed;
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      throw error;
    }
    throwIfGitHubRateLimited(result.stdout, { surface });
    throw new Error(
      `Failed to parse paginated JSON from gh ${args.join(' ')}: ${
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

export function parseGitHubRepoFromRemoteUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return null;
  }
  const normalized = rawUrl.trim();
  const patterns = [
    /^git@github\.com:(?<owner>[^/\s]+)\/(?<repo>[^/\s]+?)(?:\.git)?$/iu,
    /^https?:\/\/github\.com\/(?<owner>[^/\s]+)\/(?<repo>[^/\s]+?)(?:\.git)?\/?$/iu,
    /^ssh:\/\/git@github\.com\/(?<owner>[^/\s]+)\/(?<repo>[^/\s]+?)(?:\.git)?\/?$/iu
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const owner = match?.groups?.owner?.trim();
    const repo = match?.groups?.repo?.trim();
    if (owner && repo) {
      return { owner, repo };
    }
  }
  return null;
}

async function resolveRepoFromGitRemote() {
  let result;
  try {
    result = await runGit(['remote', 'get-url', 'origin'], { allowFailure: true });
  } catch {
    return null;
  }
  if (result.exitCode !== 0 || !result.stdout) {
    return null;
  }
  return parseGitHubRepoFromRemoteUrl(result.stdout);
}

async function resolveRepo(ownerArg, repoArg) {
  if (ownerArg && repoArg) {
    return { owner: ownerArg, repo: repoArg };
  }
  if (ownerArg || repoArg) {
    throw new Error('Provide both --owner and --repo, or neither.');
  }
  const gitRemoteRepo = await resolveRepoFromGitRemote();
  if (gitRemoteRepo) {
    return gitRemoteRepo;
  }
  const response = await runGhJson(['repo', 'view', '--json', 'nameWithOwner']);
  const nameWithOwner = response?.nameWithOwner;
  if (typeof nameWithOwner !== 'string' || !nameWithOwner.includes('/')) {
    throw new Error('Unable to infer repository owner/name from gh repo view.');
  }
  const [owner, repo] = nameWithOwner.split('/');
  return { owner, repo };
}

export function buildPrNumberViewArgs(owner, repo) {
  const args = ['pr', 'view', '--json', 'number'];
  if (typeof owner === 'string' && owner.trim().length > 0 && typeof repo === 'string' && repo.trim().length > 0) {
    args.push('--repo', `${owner.trim()}/${repo.trim()}`);
  }
  return args;
}

export function buildPrUpdateBranchArgs({ owner, repo, prNumber }) {
  return ['pr', 'update-branch', String(prNumber), '--repo', `${owner}/${repo}`];
}

async function resolvePrNumber(prArg, owner, repo) {
  if (prArg !== undefined) {
    return parseInteger('pr', prArg, null);
  }
  const response = await runGhJson(buildPrNumberViewArgs(owner, repo));
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

function normalizeRollupCheckState(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }
  const typeName = typeof node.__typename === 'string' ? node.__typename : '';
  if (typeName === 'CheckRun') {
    const name = typeof node.name === 'string' && node.name.trim() ? node.name.trim() : 'check-run';
    const status = normalizeEnum(node.status);
    const startedAt = typeof node.startedAt === 'string' ? node.startedAt : null;
    const completedAt = typeof node.completedAt === 'string' ? node.completedAt : null;
    const observedAt = status === 'COMPLETED' ? completedAt ?? startedAt : startedAt;
    const observedAtMs = parseTimestampMs(observedAt);
    if (status !== 'COMPLETED') {
      return {
        name,
        state: 'pending',
        signal: status || 'PENDING',
        observedAt,
        observedAtMs,
        detailsUrl: typeof node.detailsUrl === 'string' ? node.detailsUrl : null
      };
    }
    const conclusion = normalizeEnum(node.conclusion);
    if (conclusion === 'SUCCESS') {
      return {
        name,
        state: 'success',
        signal: conclusion || 'SUCCESS',
        observedAt,
        observedAtMs,
        detailsUrl: typeof node.detailsUrl === 'string' ? node.detailsUrl : null
      };
    }
    return {
      name,
      state: 'failed',
      signal: conclusion || 'UNKNOWN',
      observedAt,
      observedAtMs,
      detailsUrl: typeof node.detailsUrl === 'string' ? node.detailsUrl : null
    };
  }

  if (typeName === 'StatusContext') {
    const name = typeof node.context === 'string' && node.context.trim() ? node.context.trim() : 'status-context';
    const state = normalizeEnum(node.state);
    const observedAt = typeof node.createdAt === 'string' ? node.createdAt : null;
    const observedAtMs = parseTimestampMs(observedAt);
    if (STATUS_CONTEXT_PENDING_STATES.has(state)) {
      return {
        name,
        state: 'pending',
        signal: state || 'PENDING',
        observedAt,
        observedAtMs,
        detailsUrl: typeof node.targetUrl === 'string' ? node.targetUrl : null
      };
    }
    if (STATUS_CONTEXT_PASS_STATES.has(state)) {
      return {
        name,
        state: 'success',
        signal: state || 'SUCCESS',
        observedAt,
        observedAtMs,
        detailsUrl: typeof node.targetUrl === 'string' ? node.targetUrl : null
      };
    }
    return {
      name,
      state: 'failed',
      signal: state || 'UNKNOWN',
      observedAt,
      observedAtMs,
      detailsUrl: typeof node.targetUrl === 'string' ? node.targetUrl : null
    };
  }

  return null;
}

function summarizeCoderabbitStatusCheckRollup(nodes) {
  const contexts = [];
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      const context = normalizeRollupCheckState(node);
      if (!context || !isCoderabbitStatusName(context.name)) {
        continue;
      }
      contexts.push(context);
    }
  }
  let state = 'missing';
  if (contexts.some((context) => context.state === 'pending')) {
    state = 'pending';
  } else if (contexts.some((context) => context.state === 'failed')) {
    state = 'failed';
  } else if (contexts.some((context) => context.state === 'success')) {
    state = 'success';
  }
  const latestSuccessAtMs = maxTimestamp(
    contexts
      .filter((context) => context.state === 'success')
      .map((context) => context.observedAtMs)
  );
  return {
    state,
    contexts,
    latestSuccessAtMs
  };
}

function resolveCoderabbitPendingBlockerSignal(coderabbitStatusCheckRollup, requestAtMs = null) {
  if (!coderabbitStatusCheckRollup || typeof coderabbitStatusCheckRollup !== 'object') {
    return 'status_check_rollup=unknown';
  }
  const names = Array.isArray(coderabbitStatusCheckRollup.contexts)
    ? coderabbitStatusCheckRollup.contexts.map((context) => context.name).filter(Boolean)
    : [];
  const suffix = names.length > 0 ? `:${names.join('+')}` : '';
  const baseSignal = `status_check_rollup=${coderabbitStatusCheckRollup.state || 'unknown'}${suffix}`;
  if (coderabbitStatusCheckRollup.state !== 'success') {
    return baseSignal;
  }
  if (typeof requestAtMs !== 'number' || !Number.isFinite(requestAtMs)) {
    return `${baseSignal};request_time=unknown`;
  }
  const latestSuccessAtMs = coderabbitStatusCheckRollup.latestSuccessAtMs;
  if (typeof latestSuccessAtMs !== 'number' || !Number.isFinite(latestSuccessAtMs)) {
    return `${baseSignal};success_time=unknown`;
  }
  if (latestSuccessAtMs <= requestAtMs) {
    return `${baseSignal};success_before_request`;
  }
  return baseSignal;
}

function resolveEffectiveBotRereviewSignals({
  pendingBots,
  terminalFailureBots,
  coderabbitStatusCheckRollup,
  requestTimesByBot,
  terminalFailuresByBot,
  ignoredMentions,
  hasUnresolvedThread,
  unacknowledgedBotFeedbackCount,
  botFeedbackFetchError
}) {
  const rawPendingBots = Array.isArray(pendingBots) ? pendingBots : [];
  const rawTerminalFailureBots = Array.isArray(terminalFailureBots) ? terminalFailureBots : [];
  const normalizedIgnoredMentions = Array.isArray(ignoredMentions)
    ? ignoredMentions
        .filter((mention) => mention && typeof mention === 'object')
        .map((mention) => ({
          kind: typeof mention.kind === 'string' && mention.kind.trim()
            ? mention.kind.trim()
            : BOT_KIND_LABELS.coderabbit,
          reason: typeof mention.reason === 'string' && mention.reason.trim()
            ? mention.reason.trim()
            : 'acknowledgement_only',
          commentId: Number.isInteger(Number(mention.commentId)) && Number(mention.commentId) > 0
            ? Number(mention.commentId)
            : null,
          createdAtMs: typeof mention.createdAtMs === 'number' && Number.isFinite(mention.createdAtMs)
            ? mention.createdAtMs
            : null,
          source: mention.source === 'pull' ? 'pull' : mention.source === 'review' ? 'review' : 'issue'
        }))
    : [];
  const effectivePendingBots = [];
  const effectiveTerminalFailureBots = [];
  const clearedPendingBots = [];
  const canTrustResolvedFeedbackTruth =
    !hasUnresolvedThread && unacknowledgedBotFeedbackCount === 0 && botFeedbackFetchError !== true;
  const requestTimes =
    requestTimesByBot && typeof requestTimesByBot === 'object' ? requestTimesByBot : {};
  const coderabbitRequestAtMs =
    typeof requestTimes[BOT_KIND_LABELS.coderabbit] === 'number' &&
    Number.isFinite(requestTimes[BOT_KIND_LABELS.coderabbit])
      ? requestTimes[BOT_KIND_LABELS.coderabbit]
      : null;
  const coderabbitSuccessAtMs =
    typeof coderabbitStatusCheckRollup?.latestSuccessAtMs === 'number' &&
    Number.isFinite(coderabbitStatusCheckRollup.latestSuccessAtMs)
      ? coderabbitStatusCheckRollup.latestSuccessAtMs
      : null;
  const coderabbitSuccessAfterRequest =
    coderabbitStatusCheckRollup?.state === 'success' &&
    coderabbitRequestAtMs !== null &&
    coderabbitSuccessAtMs !== null &&
    coderabbitSuccessAtMs > coderabbitRequestAtMs;
  const failureTimes =
    terminalFailuresByBot && typeof terminalFailuresByBot === 'object' ? terminalFailuresByBot : {};
  const codexFailure =
    failureTimes[BOT_KIND_LABELS.codex] && typeof failureTimes[BOT_KIND_LABELS.codex] === 'object'
      ? failureTimes[BOT_KIND_LABELS.codex]
      : null;
  const codexLatestTerminalFailureAtMs =
    typeof codexFailure?.terminalFailureAtMs === 'number' &&
    Number.isFinite(codexFailure.terminalFailureAtMs)
      ? codexFailure.terminalFailureAtMs
      : null;
  const codexLatestRequestAtMs =
    typeof requestTimes[BOT_KIND_LABELS.codex] === 'number' &&
    Number.isFinite(requestTimes[BOT_KIND_LABELS.codex])
      ? requestTimes[BOT_KIND_LABELS.codex]
      : null;
  for (const bot of rawPendingBots) {
    const isCoderabbit = bot === BOT_KIND_LABELS.coderabbit;
    if (
      isCoderabbit &&
      coderabbitSuccessAfterRequest &&
      canTrustResolvedFeedbackTruth
    ) {
      clearedPendingBots.push(bot);
      continue;
    }
    effectivePendingBots.push(bot);
  }
  for (const bot of rawTerminalFailureBots) {
    if (bot === BOT_KIND_LABELS.codex) {
      effectiveTerminalFailureBots.push(bot);
    }
  }
  return {
    rawPendingBots,
    effectivePendingBots,
    rawTerminalFailureBots,
    effectiveTerminalFailureBots,
    clearedPendingBots,
    ignoredMentions: normalizedIgnoredMentions,
    codex: {
      latestRequestAtMs: codexLatestRequestAtMs,
      latestTerminalFailureAtMs: codexLatestTerminalFailureAtMs,
      terminalFailureSignal: codexFailure?.signal ?? CODEX_TERMINAL_FAILURE_SIGNAL
    },
    coderabbit: {
      statusCheckRollup: coderabbitStatusCheckRollup,
      stalePendingCleared: clearedPendingBots.includes(BOT_KIND_LABELS.coderabbit),
      latestRequestAtMs: coderabbitRequestAtMs,
      latestSuccessAtMs: coderabbitSuccessAtMs,
      successAfterRequest: coderabbitSuccessAfterRequest,
      pendingBlockerSignal: resolveCoderabbitPendingBlockerSignal(
        coderabbitStatusCheckRollup,
        coderabbitRequestAtMs
      )
    }
  };
}

function formatBotRereviewPendingGateReason(pendingBots, diagnostics) {
  const parts = pendingBots.map((bot) => {
    if (bot === BOT_KIND_LABELS.coderabbit) {
      return `${bot}(${diagnostics?.coderabbit?.pendingBlockerSignal ?? 'status_check_rollup=unknown'})`;
    }
    return bot;
  });
  return `bot_rereview_pending=${parts.join(',')}`;
}

function formatBotRereviewTerminalFailureGateReason(terminalFailureBots, diagnostics) {
  const parts = terminalFailureBots.map((bot) => {
    if (bot === BOT_KIND_LABELS.codex) {
      return `${bot}(${diagnostics?.codex?.terminalFailureSignal ?? CODEX_TERMINAL_FAILURE_SIGNAL})`;
    }
    return bot;
  });
  return `bot_rereview_terminal_failure=${parts.join(',')}`;
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
  const requiredChecksCache =
    previousCache.requiredChecksForNextPoll && typeof previousCache.requiredChecksForNextPoll === 'object'
      ? previousCache.requiredChecksForNextPoll
      : previousCache;
  const cachedHeadOid = typeof requiredChecksCache.headOid === 'string' ? requiredChecksCache.headOid : null;
  if (!cachedHeadOid || !currentHeadOid || cachedHeadOid !== currentHeadOid) {
    return null;
  }
  return hasRequiredChecksSummary(requiredChecksCache.summary) ? requiredChecksCache.summary : null;
}

function resolveReusableFanoutCache(previousCache, currentHeadOid, currentUpdatedAt) {
  if (!previousCache || typeof previousCache !== 'object') {
    return null;
  }
  const cachedHeadOid = typeof previousCache.headOid === 'string' ? previousCache.headOid : null;
  const cachedUpdatedAt = typeof previousCache.updatedAt === 'string' ? previousCache.updatedAt : null;
  if (!cachedHeadOid || !cachedUpdatedAt || !currentHeadOid || !currentUpdatedAt) {
    return null;
  }
  if (cachedHeadOid !== currentHeadOid || cachedUpdatedAt !== currentUpdatedAt) {
    return null;
  }
  if (
    previousCache.requiredChecksFetchError === true
    || previousCache.inlineBotFeedback?.fetchError === true
    || previousCache.botRereviewSignals?.fetchError === true
  ) {
    return null;
  }
  if (!isReusableBotFanoutClean(previousCache.inlineBotFeedback, previousCache.botRereviewSignals)) {
    return null;
  }
  return previousCache;
}

function isReusableBotFanoutClean(inlineBotFeedback, botRereviewSignals) {
  if (!inlineBotFeedback || typeof inlineBotFeedback !== 'object') {
    return false;
  }
  if (!botRereviewSignals || typeof botRereviewSignals !== 'object') {
    return false;
  }
  if (inlineBotFeedback.fetchError === true || botRereviewSignals.fetchError === true) {
    return false;
  }
  if (inlineBotFeedback.unacknowledgedCount !== 0) {
    return false;
  }
  if (
    Array.isArray(botRereviewSignals.pendingBots) &&
    botRereviewSignals.pendingBots.length > 0
  ) {
    return false;
  }
  if (
    Array.isArray(botRereviewSignals.inProgressBots) &&
    botRereviewSignals.inProgressBots.length > 0
  ) {
    return false;
  }
  if (
    Array.isArray(botRereviewSignals.terminalFailureBots) &&
    botRereviewSignals.terminalFailureBots.length > 0
  ) {
    return false;
  }
  return true;
}

function buildReusableFanoutCache(input) {
  const requiredChecksForNextPoll = input.requiredChecks
    ? {
        headOid: input.headOid,
        summary: input.requiredChecks
      }
    : null;
  if (
    input.requiredChecksResult?.fetchError === true
    || input.inlineBotFeedback?.fetchError === true
    || input.botRereviewSignals?.fetchError === true
  ) {
    return requiredChecksForNextPoll;
  }
  if (!isReusableBotFanoutClean(input.inlineBotFeedback, input.botRereviewSignals)) {
    return requiredChecksForNextPoll;
  }
  return {
    headOid: input.headOid,
    updatedAt: input.updatedAt,
    requiredChecksFetchError: false,
    requiredChecksForNextPoll,
    inlineBotFeedback: input.inlineBotFeedback,
    botRereviewSignals: input.botRereviewSignals
  };
}

export function buildStatusSnapshot(response, requiredChecks = null, inlineBotFeedback = null, options = {}) {
  const pr = response?.data?.repository?.pullRequest;
  if (!pr) {
    throw new Error('GraphQL response missing pullRequest payload.');
  }
  const readinessMode = normalizeReadinessMode(options.readinessMode);

  const labels = Array.isArray(pr.labels?.nodes)
    ? pr.labels.nodes
        .map((item) => (item && typeof item.name === 'string' ? item.name.trim() : ''))
        .filter(Boolean)
    : [];
  const hasDoNotMergeLabel = labels.some((label) => DO_NOT_MERGE_LABEL.test(label));

  const threads = Array.isArray(pr.reviewThreads?.nodes) ? pr.reviewThreads.nodes : [];
  const unresolvedThreadCount = threads.filter((thread) => thread && !thread.isResolved && !thread.isOutdated).length;
  const hasUnresolvedThread = unresolvedThreadCount > 0;

  const contexts = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes;
  const checkNodes = Array.isArray(contexts) ? contexts : [];
  const checks = summarizeChecks(checkNodes);
  const coderabbitStatusCheckRollup = summarizeCoderabbitStatusCheckRollup(checkNodes);
  const requiredCheckSummary =
    requiredChecks && typeof requiredChecks === 'object' && requiredChecks.total > 0 ? requiredChecks : null;
  const unacknowledgedBotFeedbackCount =
    inlineBotFeedback && typeof inlineBotFeedback.unacknowledgedCount === 'number'
      ? inlineBotFeedback.unacknowledgedCount
      : 0;
  const botFeedbackFetchError = inlineBotFeedback?.fetchError === true;
  const botRereview = inlineBotFeedback?.rereview && typeof inlineBotFeedback.rereview === 'object'
    ? inlineBotFeedback.rereview
    : null;
  const botRereviewFetchError = botRereview?.fetchError === true;
  const rawBotRereviewPending = Array.isArray(botRereview?.pendingBots) ? botRereview.pendingBots : [];
  const rawBotRereviewTerminalFailures = Array.isArray(botRereview?.terminalFailureBots)
    ? botRereview.terminalFailureBots
    : [];
  const botRereviewInProgress = Array.isArray(botRereview?.inProgressBots) ? botRereview.inProgressBots : [];
  const requiredChecksQueryFailed = options.requiredChecksQueryFailed === true;
  const githubRateLimits = Array.isArray(options.githubRateLimits)
    ? options.githubRateLimits.map((entry) => resolveGitHubRateLimitStatus(entry)).filter(Boolean)
    : [];
  const githubRateLimit = githubRateLimits[0] ?? null;
  const coderabbitReviewMeta =
    botRereview?.coderabbit && typeof botRereview.coderabbit === 'object'
      ? botRereview.coderabbit
      : { actionableCount: 0, outsideDiffCount: 0, nitpickCount: 0 };
  const gateChecks = requiredCheckSummary ?? checks;
  const gateChecksSource = requiredCheckSummary ? 'required' : 'rollup';

  const reviewDecision = normalizeEnum(pr.reviewDecision);
  const mergeStateStatus = normalizeEnum(pr.mergeStateStatus);
  const state = normalizeEnum(pr.state);
  const isDraft = Boolean(pr.isDraft);
  const botRereviewDiagnostics = resolveEffectiveBotRereviewSignals({
    pendingBots: rawBotRereviewPending,
    terminalFailureBots: rawBotRereviewTerminalFailures,
    coderabbitStatusCheckRollup,
    requestTimesByBot: botRereview?.requestTimesByBot,
    terminalFailuresByBot: botRereview?.terminalFailuresByBot,
    ignoredMentions: botRereview?.ignoredMentions,
    hasUnresolvedThread,
    unacknowledgedBotFeedbackCount,
    botFeedbackFetchError
  });
  const botRereviewPending = botRereviewDiagnostics.effectivePendingBots;
  const botRereviewTerminalFailures = botRereviewDiagnostics.effectiveTerminalFailureBots;

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
  if (gateChecksSource === 'required' && gateChecks.failed.length > 0) {
    gateReasons.push(`required_checks_failed=${gateChecks.failed.length}`);
  }
  if (requiredChecksQueryFailed) {
    gateReasons.push('required_checks_query_failed');
  }
  const mergeStateBlocksReady = doesMergeStateBlockReady(mergeStateStatus, readinessMode);
  if (mergeStateBlocksReady) {
    gateReasons.push(`merge_state=${mergeStateStatus || 'UNKNOWN'}`);
  }
  if (isReviewDecisionBlocked(reviewDecision, readinessMode)) {
    gateReasons.push(`review=${reviewDecision}`);
  }
  if (hasUnresolvedThread) {
    gateReasons.push(`unresolved_threads=${unresolvedThreadCount}`);
  }
  if (botFeedbackFetchError) {
    gateReasons.push('bot_feedback=unknown');
  } else if (unacknowledgedBotFeedbackCount > 0) {
    gateReasons.push(`unacknowledged_bot_feedback=${unacknowledgedBotFeedbackCount}`);
  }
  if (botRereviewFetchError) {
    gateReasons.push('bot_rereview=unknown');
  } else if (botRereviewPending.length > 0) {
    gateReasons.push(formatBotRereviewPendingGateReason(botRereviewPending, botRereviewDiagnostics));
  }
  if (!botRereviewFetchError && botRereviewTerminalFailures.length > 0) {
    gateReasons.push(
      formatBotRereviewTerminalFailureGateReason(botRereviewTerminalFailures, botRereviewDiagnostics)
    );
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
    unacknowledgedBotFeedbackCount,
    botFeedbackFetchError,
    botRereviewFetchError,
    botRereviewPending,
    botRereviewTerminalFailures,
    botRereviewInProgress,
    botRereviewDiagnostics,
    coderabbitReviewMeta,
    checks,
    requiredChecks: requiredCheckSummary,
    requiredChecksQueryFailed,
    gateChecksSource,
    gateReasons,
    readinessMode,
    readyToMerge: gateReasons.length === 0,
    headOid: pr.commits?.nodes?.[0]?.commit?.oid || null,
    fanoutCacheHit: options.fanoutCacheHit === true,
    githubRateLimit,
    githubRateLimits
  };
}

export function resolveActionRequiredReasons(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return ['snapshot=unknown'];
  }
  const readinessMode = normalizeReadinessMode(options.readinessMode ?? snapshot.readinessMode);
  const reasons = [];
  const reviewDecision = normalizeEnum(snapshot.reviewDecision);
  const mergeStateStatus = normalizeEnum(snapshot.mergeStateStatus);
  const mergeStateRequiresAuthorAction = doesMergeStateRequireAuthorAction(mergeStateStatus);
  if (Boolean(snapshot.isDraft)) {
    reasons.push('draft');
  }
  if (Boolean(snapshot.hasDoNotMergeLabel)) {
    reasons.push('label:do-not-merge');
  }
  if (isReviewDecisionBlocked(reviewDecision, readinessMode)) {
    reasons.push(`review=${reviewDecision}`);
  }
  if (mergeStateRequiresAuthorAction) {
    reasons.push(`merge_state=${mergeStateStatus}`);
  }
  if (typeof snapshot.unresolvedThreadCount === 'number' && snapshot.unresolvedThreadCount > 0) {
    reasons.push(`unresolved_threads=${snapshot.unresolvedThreadCount}`);
  }
  if (
    typeof snapshot.unacknowledgedBotFeedbackCount === 'number'
    && snapshot.unacknowledgedBotFeedbackCount > 0
  ) {
    reasons.push(`unacknowledged_bot_feedback=${snapshot.unacknowledgedBotFeedbackCount}`);
  }
  if (
    Array.isArray(snapshot.botRereviewTerminalFailures) &&
    snapshot.botRereviewTerminalFailures.length > 0
  ) {
    reasons.push(
      formatBotRereviewTerminalFailureGateReason(
        snapshot.botRereviewTerminalFailures,
        snapshot.botRereviewDiagnostics
      )
    );
  }
  const requiredChecks =
    snapshot.requiredChecks && typeof snapshot.requiredChecks === 'object' ? snapshot.requiredChecks : null;
  if (snapshot.requiredChecksQueryFailed === true) {
    reasons.push('required_checks_query_failed');
  }
  const requiredFailedCount = Array.isArray(requiredChecks?.failed) ? requiredChecks.failed.length : 0;
  if (requiredFailedCount > 0 && snapshot.readyToMerge === false) {
    reasons.push(`required_checks_failed=${requiredFailedCount}`);
  } else {
    const rollupFailedCount = Array.isArray(snapshot.checks?.failed) ? snapshot.checks.failed.length : 0;
    const rollupPendingCount = Array.isArray(snapshot.checks?.pending) ? snapshot.checks.pending.length : 0;
    if (
      !requiredChecks
      && snapshot.requiredChecksQueryFailed !== true
      && readinessMode !== 'review'
      && !mergeStateRequiresAuthorAction
      && !MERGEABLE_STATES.has(mergeStateStatus)
      && rollupPendingCount === 0
      && rollupFailedCount > 0
    ) {
      reasons.push(`checks_failed=${rollupFailedCount}`);
    }
  }
  return reasons;
}

function readPrecomputedRecoveryReasonList(snapshotOrReasons) {
  if (Array.isArray(snapshotOrReasons)) {
    return snapshotOrReasons.filter((reason) => typeof reason === 'string' && reason.trim().length > 0);
  }
  const precomputedReasons = snapshotOrReasons?.action_required_reasons;
  return Array.isArray(precomputedReasons)
    ? precomputedReasons.filter((reason) => typeof reason === 'string' && reason.trim().length > 0)
    : [];
}

function readRecoveryGateReasons(snapshotOrReasons) {
  if (!snapshotOrReasons || Array.isArray(snapshotOrReasons) || typeof snapshotOrReasons !== 'object') {
    return [];
  }
  const rawGateReasons = Array.isArray(snapshotOrReasons.gateReasons)
    ? snapshotOrReasons.gateReasons
    : snapshotOrReasons.gate_reasons;
  return Array.isArray(rawGateReasons)
    ? rawGateReasons.filter((reason) => typeof reason === 'string' && reason.trim().length > 0)
    : [];
}

export function resolveAutomaticBranchRecoveryReason(snapshotOrReasons, options = {}) {
  const reasons = readPrecomputedRecoveryReasonList(snapshotOrReasons);
  const resolvedReasons = reasons.length > 0
    ? reasons
    : resolveActionRequiredReasons(snapshotOrReasons, options);
  const recoveryReason = reasons.find((reason) => AUTOMATIC_BRANCH_RECOVERY_REASONS.has(reason));
  const selectedReason = typeof recoveryReason === 'string'
    ? recoveryReason
    : resolvedReasons.find((reason) => AUTOMATIC_BRANCH_RECOVERY_REASONS.has(reason));
  if (typeof selectedReason !== 'string') {
    return null;
  }
  if (options.requireExclusive === true) {
    if (
      resolvedReasons.length === 0
      || resolvedReasons.some((reason) => !AUTOMATIC_BRANCH_RECOVERY_REASONS.has(reason))
    ) {
      return null;
    }
    const gateReasons = readRecoveryGateReasons(snapshotOrReasons);
    if (gateReasons.some((reason) => !AUTOMATIC_BRANCH_RECOVERY_REASONS.has(reason))) {
      return null;
    }
  }
  return selectedReason;
}

export function shouldAttemptAutomaticBranchRecovery(snapshotOrReasons, options = {}) {
  const reasons = readPrecomputedRecoveryReasonList(snapshotOrReasons);
  const resolvedReasons = reasons.length > 0
    ? reasons
    : resolveActionRequiredReasons(snapshotOrReasons, options);
  const recoveryReason = resolveAutomaticBranchRecoveryReason(snapshotOrReasons, {
    ...options,
    requireExclusive: true
  });
  return (
    typeof recoveryReason === 'string'
    && resolvedReasons.length === 1
    && resolvedReasons[0] === recoveryReason
  );
}

export function isConflictLikeBranchRecoveryFailureMessage(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  return (
    /\bconflict(?:ing|s)?\b/iu.test(value)
    || /\bcannot be (?:cleanly )?(?:rebased|merged)\b/iu.test(value)
    || /\bmerge conflict\b/iu.test(value)
  );
}

export function shouldSucceedAfterTimeout(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }
  if (options.pollingHealthy === false) {
    return false;
  }
  const readinessMode = normalizeReadinessMode(options.readinessMode ?? snapshot.readinessMode);
  return readinessMode === 'review' && snapshot.readyToMerge === true;
}

function formatIgnoredBotRereviewMentions(mentions) {
  if (!Array.isArray(mentions) || mentions.length === 0) {
    return '-';
  }
  return mentions
    .map((mention) => {
      const kind = typeof mention.kind === 'string' && mention.kind.trim()
        ? mention.kind.trim()
        : BOT_KIND_LABELS.coderabbit;
      const reason = typeof mention.reason === 'string' && mention.reason.trim()
        ? mention.reason.trim()
        : 'acknowledgement_only';
      const source = mention.source === 'pull' ? 'pull' : mention.source === 'review' ? 'review' : 'issue';
      const commentPart = mention.commentId ? `#${mention.commentId}` : 'unknown';
      return `${kind}:${reason}:${source}:${commentPart}`;
    })
    .join(', ');
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
  const githubRateLimit = snapshot.githubRateLimit
    ? `${snapshot.githubRateLimit.surface ?? 'unknown'}/${snapshot.githubRateLimit.limit_type ?? 'unknown'}`
    : 'none';
  const coderabbitRollup = snapshot.botRereviewDiagnostics?.coderabbit?.statusCheckRollup;
  const coderabbitRollupState = coderabbitRollup?.state ?? 'unknown';
  const coderabbitRollupNames = Array.isArray(coderabbitRollup?.contexts)
    ? coderabbitRollup.contexts.map((context) => context.name).filter(Boolean).join('+') || '-'
    : '-';
  const clearedRereviewPending = Array.isArray(snapshot.botRereviewDiagnostics?.clearedPendingBots)
    ? snapshot.botRereviewDiagnostics.clearedPendingBots.join(', ') || '-'
    : '-';
  const ignoredRereviewMentions = formatIgnoredBotRereviewMentions(
    snapshot.botRereviewDiagnostics?.ignoredMentions
  );
  return [
    `PR #${snapshot.number}`,
    `state=${snapshot.state}`,
    `merge_state=${snapshot.mergeStateStatus}`,
    `review=${snapshot.reviewDecision}`,
    `target=${normalizeReadinessMode(snapshot.readinessMode)}`,
    `fanout_cache=${snapshot.fanoutCacheHit ? 'hit' : 'miss'}`,
    `github_rate_limit=${githubRateLimit}`,
    `gate_checks=${snapshot.gateChecksSource}`,
    `checks_ok=${snapshot.checks.successCount}/${snapshot.checks.total}`,
    `checks_pending=${snapshot.checks.pending.length}`,
    `checks_failed=${snapshot.checks.failed.length}`,
    `required_checks_ok=${requiredChecks ? `${requiredChecks.successCount}/${requiredChecks.total}` : 'n/a'}`,
    `required_checks_pending=${requiredChecks ? requiredChecks.pending.length : 'n/a'}`,
    `required_checks_failed=${requiredChecks ? requiredChecks.failed.length : 'n/a'}`,
    `unresolved_threads=${snapshot.unresolvedThreadCount}`,
    `unack_bot_feedback=${snapshot.unacknowledgedBotFeedbackCount}`,
    `bot_feedback_fetch_error=${snapshot.botFeedbackFetchError ? 'yes' : 'no'}`,
    `bot_rereview_fetch_error=${snapshot.botRereviewFetchError ? 'yes' : 'no'}`,
    `bot_rereview_pending=[${snapshot.botRereviewPending.join(', ') || '-'}]`,
    `bot_rereview_terminal_failure=[${snapshot.botRereviewTerminalFailures.join(', ') || '-'}]`,
    `bot_rereview_in_progress=[${snapshot.botRereviewInProgress.join(', ') || '-'}]`,
    `bot_rereview_cleared=[${clearedRereviewPending}]`,
    `bot_rereview_ignored=[${ignoredRereviewMentions}]`,
    `coderabbit_rollup=${coderabbitRollupState}`,
    `coderabbit_rollup_contexts=[${coderabbitRollupNames}]`,
    `coderabbit_actionable=${snapshot.coderabbitReviewMeta.actionableCount}`,
    `coderabbit_out_of_diff=${snapshot.coderabbitReviewMeta.outsideDiffCount}`,
    `coderabbit_nitpick=${snapshot.coderabbitReviewMeta.nitpickCount}`,
    `quiet_remaining=${formatDuration(quietRemainingMs)}`,
    `blocked_by=${reasons}`,
    `pending=[${pendingNames}]`,
    `failed=[${failedNames}]`,
    `required_pending=[${requiredPendingNames}]`,
    `required_failed=[${requiredFailedNames}]`
  ].join(' | ');
}

function planPollingRateLimitSleepMs(rateLimit, { owner, repo, prNumber, intervalMs, deadline }) {
  const nowMs = Date.now();
  const remainingMs = Math.max(0, deadline - nowMs);
  return planGitHubRateLimitBackoff(rateLimit, {
    nowMs,
    fallbackMs: intervalMs,
    remainingMs,
    jitterSeed: `${owner}/${repo}#${prNumber}:${rateLimit?.surface ?? 'unknown'}:${rateLimit?.limit_type ?? 'unknown'}`
  });
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
      fetchError: false,
      rateLimit: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isNoRequiredChecksReportedErrorMessage(message)) {
      return {
        summary: null,
        fetchError: false,
        rateLimit: null
      };
    }
    const rateLimit = resolveGitHubRateLimitStatus(error, { surface: 'rest' });
    return {
      summary: null,
      fetchError: true,
      rateLimit
    };
  }
}

function flattenReviewCommentPages(pagesPayload) {
  if (!Array.isArray(pagesPayload)) {
    return [];
  }
  const comments = [];
  for (const page of pagesPayload) {
    if (Array.isArray(page)) {
      comments.push(...page);
      continue;
    }
    if (page && typeof page === 'object') {
      comments.push(page);
    }
  }
  return comments;
}

function parseReviewSummaryCounters(body) {
  const text = typeof body === 'string' ? body : '';
  const actionableMatch = text.match(/Actionable comments posted:\s*(\d+)/iu);
  const outsideDiffMatch = text.match(/Outside diff range comments\s*\((\d+)\)/iu);
  const nitpickMatch = text.match(/Nitpick comments\s*\((\d+)\)/iu);
  return {
    actionableCount: actionableMatch ? Number.parseInt(actionableMatch[1], 10) : 0,
    outsideDiffCount: outsideDiffMatch ? Number.parseInt(outsideDiffMatch[1], 10) : 0,
    nitpickCount: nitpickMatch ? Number.parseInt(nitpickMatch[1], 10) : 0
  };
}

function summarizeCoderabbitReviewMeta(reviews, headOid) {
  const summary = {
    actionableCount: 0,
    outsideDiffCount: 0,
    nitpickCount: 0
  };
  if (!Array.isArray(reviews)) {
    return summary;
  }
  for (const review of reviews) {
    if (!review || typeof review !== 'object') {
      continue;
    }
    if (resolveBotKindFromLogin(review.user?.login) !== 'coderabbit') {
      continue;
    }
    const reviewCommitId = typeof review.commit_id === 'string' ? review.commit_id : null;
    if (headOid && reviewCommitId && reviewCommitId !== headOid) {
      continue;
    }
    const counters = parseReviewSummaryCounters(review.body);
    summary.actionableCount = Math.max(summary.actionableCount, counters.actionableCount);
    summary.outsideDiffCount = Math.max(summary.outsideDiffCount, counters.outsideDiffCount);
    summary.nitpickCount = Math.max(summary.nitpickCount, counters.nitpickCount);
  }
  return summary;
}

export function resolveBotRereviewRequestMentions(comments) {
  if (!Array.isArray(comments)) {
    return {
      requests: {},
      ignoredMentions: []
    };
  }
  const latestByKind = {};
  const ignoredMentions = [];
  for (const comment of comments) {
    if (!comment || typeof comment !== 'object') {
      continue;
    }
    if (!isHumanReviewActor(comment.user)) {
      continue;
    }
    const { requestedKinds, ignoredMentions: ignoredForComment } = classifyBotRereviewMentions(comment.body);
    if (requestedKinds.length === 0 && ignoredForComment.length === 0) {
      continue;
    }
    const createdAtMs = parseTimestampMs(comment.created_at);
    if (createdAtMs === null) {
      continue;
    }
    const commentId = Number(comment.id);
    const source =
      comment.__source === 'pull' ? 'pull' : comment.__source === 'review' ? 'review' : 'issue';
    const request = {
      commentId: Number.isInteger(commentId) && commentId > 0 ? commentId : null,
      createdAtMs,
      source
    };
    for (const ignored of ignoredForComment) {
      ignoredMentions.push({
        ...request,
        kind: ignored.kind,
        reason: ignored.reason
      });
    }
    for (const kind of requestedKinds) {
      const previous = latestByKind[kind];
      if (!previous || request.createdAtMs > previous.createdAtMs) {
        latestByKind[kind] = request;
      }
    }
  }
  return {
    requests: latestByKind,
    ignoredMentions
  };
}

export function resolveLatestBotRereviewRequests(comments) {
  return resolveBotRereviewRequestMentions(comments).requests;
}

function maxReactionTimestampForKind(reactions, kind, contentSet, requestAtMs) {
  if (!Array.isArray(reactions)) {
    return null;
  }
  const timestamps = [];
  for (const reaction of reactions) {
    if (!reaction || typeof reaction !== 'object') {
      continue;
    }
    if (resolveBotKindFromLogin(reaction.user?.login) !== kind) {
      continue;
    }
    const content = normalizeReactionContent(reaction.content);
    if (!contentSet.has(content)) {
      continue;
    }
    const createdAtMs = parseTimestampMs(reaction.created_at);
    if (createdAtMs === null || createdAtMs <= requestAtMs) {
      continue;
    }
    timestamps.push(createdAtMs);
  }
  return maxTimestamp(timestamps);
}

function maxCommentTimestampForKind(issueComments, kind, requestAtMs, headOid) {
  if (!Array.isArray(issueComments)) {
    return null;
  }
  const timestamps = [];
  for (const comment of issueComments) {
    if (!comment || typeof comment !== 'object') {
      continue;
    }
    if (resolveBotKindFromLogin(comment.user?.login) !== kind) {
      continue;
    }
    if (comment.__source === 'pull') {
      const commentCommitId = typeof comment.commit_id === 'string' ? comment.commit_id : null;
      if (headOid && commentCommitId && commentCommitId !== headOid) {
        continue;
      }
    } else if (
      !(
        kind === 'coderabbit' &&
        typeof comment.body === 'string' &&
        typeof headOid === 'string' &&
        headOid.length > 0 &&
        comment.body.toLowerCase().includes(headOid.toLowerCase()) &&
        CODERABBIT_ISSUE_COMMENT_COMPLETION_PATTERNS.some((pattern) => pattern.test(comment.body))
      )
    ) {
      continue;
    }
    const createdAtMs = parseTimestampMs(comment.created_at);
    const updatedAtMs = parseTimestampMs(comment.updated_at);
    const effectiveAtMs =
      comment.__source === 'issue' ? maxTimestamp([createdAtMs, updatedAtMs]) : createdAtMs;
    if (effectiveAtMs === null || effectiveAtMs <= requestAtMs) {
      continue;
    }
    timestamps.push(effectiveAtMs);
  }
  return maxTimestamp(timestamps);
}

function isCodexTerminalFailureComment(comment) {
  if (!comment || typeof comment !== 'object') {
    return false;
  }
  if (resolveBotKindFromLogin(comment.user?.login) !== BOT_KIND_LABELS.codex) {
    return false;
  }
  const body = typeof comment.body === 'string' ? comment.body : '';
  return CODEX_TERMINAL_FAILURE_COMMENT_PATTERNS.some((pattern) => pattern.test(body));
}

function maxCodexTerminalFailureTimestamp(issueComments, requestAtMs, headOid) {
  if (!Array.isArray(issueComments)) {
    return null;
  }
  const timestamps = [];
  for (const comment of issueComments) {
    if (!isCodexTerminalFailureComment(comment)) {
      continue;
    }
    if (comment.__source === 'pull') {
      const commentCommitId = typeof comment.commit_id === 'string' ? comment.commit_id : null;
      if (headOid && commentCommitId && commentCommitId !== headOid) {
        continue;
      }
    }
    const createdAtMs = parseTimestampMs(comment.created_at);
    const updatedAtMs = parseTimestampMs(comment.updated_at);
    const effectiveAtMs =
      comment.__source === 'issue' ? maxTimestamp([createdAtMs, updatedAtMs]) : createdAtMs;
    if (effectiveAtMs === null || effectiveAtMs <= requestAtMs) {
      continue;
    }
    timestamps.push(effectiveAtMs);
  }
  return maxTimestamp(timestamps);
}

function maxReviewTimestampForKind(reviews, kind, requestAtMs, headOid) {
  if (!Array.isArray(reviews)) {
    return null;
  }
  const timestamps = [];
  for (const review of reviews) {
    if (!review || typeof review !== 'object') {
      continue;
    }
    if (resolveBotKindFromLogin(review.user?.login) !== kind) {
      continue;
    }
    const reviewCommitId = typeof review.commit_id === 'string' ? review.commit_id : null;
    if (headOid && reviewCommitId && reviewCommitId !== headOid) {
      continue;
    }
    const submittedAtMs = parseTimestampMs(review.submitted_at);
    if (submittedAtMs === null || submittedAtMs <= requestAtMs) {
      continue;
    }
    timestamps.push(submittedAtMs);
  }
  return maxTimestamp(timestamps);
}

export function resolveBotRereviewTimingForKind(params) {
  const { kind, requestAtMs, issueComments, reviews, issueReactions, requestCommentReactions, headOid } = params;
  const useReactionSignals = kind === 'codex';
  const commentCompleteAtMs =
    kind === 'codex' ? null : maxCommentTimestampForKind(issueComments, kind, requestAtMs, headOid);
  const terminalFailureAtMs =
    kind === 'codex' ? maxCodexTerminalFailureTimestamp(issueComments, requestAtMs, headOid) : null;
  const completeAtMs = maxTimestamp([
    commentCompleteAtMs,
    maxReviewTimestampForKind(reviews, kind, requestAtMs, headOid),
    useReactionSignals
      ? maxReactionTimestampForKind(issueReactions, kind, BOT_COMPLETE_REACTION_CONTENT, requestAtMs)
      : null,
    useReactionSignals
      ? maxReactionTimestampForKind(
          requestCommentReactions,
          kind,
          BOT_COMPLETE_REACTION_CONTENT,
          requestAtMs
        )
      : null
  ]);
  const inProgressAtMs = useReactionSignals
    ? maxTimestamp([
        maxReactionTimestampForKind(issueReactions, kind, BOT_IN_PROGRESS_REACTION_CONTENT, requestAtMs),
        maxReactionTimestampForKind(
          requestCommentReactions,
          kind,
          BOT_IN_PROGRESS_REACTION_CONTENT,
          requestAtMs
        )
      ])
    : null;
  return {
    completeAtMs,
    inProgressAtMs,
    terminalFailureAtMs
  };
}

async function fetchCommentReactionsBySource(owner, repo, source, commentId) {
  const commentEndpoint =
    source === 'pull'
      ? `repos/${owner}/${repo}/pulls/comments/${commentId}/reactions`
      : `repos/${owner}/${repo}/issues/comments/${commentId}/reactions`;
  const payload = await runGhJsonSlurped(['api', commentEndpoint]);
  return flattenReviewCommentPages(payload);
}

async function fetchBotRereviewSignals(owner, repo, prNumber, headOid) {
  try {
    const [issueCommentsPayload, pullCommentsPayload, reviewsPayload, issueReactionsPayload] = await Promise.all([
      runGhJsonSlurped(['api', `repos/${owner}/${repo}/issues/${prNumber}/comments`]),
      runGhJsonSlurped(['api', `repos/${owner}/${repo}/pulls/${prNumber}/comments`]),
      runGhJsonSlurped(['api', `repos/${owner}/${repo}/pulls/${prNumber}/reviews`]),
      runGhJsonSlurped(['api', `repos/${owner}/${repo}/issues/${prNumber}/reactions`])
    ]);
    const issueComments = withCommentSource(flattenReviewCommentPages(issueCommentsPayload), 'issue');
    const pullComments = withCommentSource(flattenReviewCommentPages(pullCommentsPayload), 'pull');
    const allComments = [...issueComments, ...pullComments];
    const reviews = flattenReviewCommentPages(reviewsPayload);
    const reviewRequestCandidates = reviews.map((review) => ({
      id: review?.id ?? null,
      body: review?.body ?? '',
      created_at: review?.submitted_at ?? null,
      user: review?.user ?? null,
      __source: 'review'
    }));
    const issueReactions = flattenReviewCommentPages(issueReactionsPayload);
    const coderabbit = summarizeCoderabbitReviewMeta(reviews, headOid);

    const rereviewRequestSignals = resolveBotRereviewRequestMentions([...allComments, ...reviewRequestCandidates]);
    const rereviewRequests = rereviewRequestSignals.requests;
    const ignoredMentions = rereviewRequestSignals.ignoredMentions;
    const requestedKinds = Object.keys(rereviewRequests);
    if (requestedKinds.length === 0) {
      return {
        fetchError: false,
        rateLimit: null,
        pendingBots: [],
        terminalFailureBots: [],
        inProgressBots: [],
        ignoredMentions,
        coderabbit
      };
    }

    const pendingBots = [];
    const terminalFailureBots = [];
    const inProgressBots = [];
    const requestTimesByBot = {};
    const terminalFailuresByBot = {};
    let hadSignalFetchError = false;
    let signalRateLimit = null;
    for (const kind of requestedKinds) {
      const request = rereviewRequests[kind];
      if (!request) {
        continue;
      }
      let requestCommentReactions = [];
      if (kind === 'codex' && request.commentId && (request.source === 'issue' || request.source === 'pull')) {
        try {
          requestCommentReactions = await fetchCommentReactionsBySource(
            owner,
            repo,
            request.source,
            request.commentId
          );
        } catch (error) {
          hadSignalFetchError = true;
          signalRateLimit = signalRateLimit ?? resolveGitHubRateLimitStatus(error, { surface: 'rest' });
          requestCommentReactions = [];
        }
      }
      const { completeAtMs, inProgressAtMs, terminalFailureAtMs } = resolveBotRereviewTimingForKind({
        kind,
        requestAtMs: request.createdAtMs,
        issueComments: allComments,
        reviews,
        issueReactions,
        requestCommentReactions,
        headOid
      });
      const hasTerminalFailure =
        terminalFailureAtMs !== null && (completeAtMs === null || terminalFailureAtMs > completeAtMs);
      const hasActiveInProgress =
        inProgressAtMs !== null
        && (completeAtMs === null || inProgressAtMs > completeAtMs)
        && (!hasTerminalFailure || inProgressAtMs > terminalFailureAtMs);
      const label = BOT_KIND_LABELS[kind] ?? kind;
      requestTimesByBot[label] = request.createdAtMs;
      if (hasActiveInProgress) {
        inProgressBots.push(label);
      }
      if (hasTerminalFailure && !hasActiveInProgress) {
        terminalFailureBots.push(label);
        terminalFailuresByBot[label] = {
          requestAtMs: request.createdAtMs,
          terminalFailureAtMs,
          signal: label === BOT_KIND_LABELS.codex ? CODEX_TERMINAL_FAILURE_SIGNAL : 'terminal_failure'
        };
      }
      if ((completeAtMs === null && !hasTerminalFailure) || hasActiveInProgress) {
        pendingBots.push(label);
      }
    }

    return {
      fetchError: hadSignalFetchError,
      rateLimit: signalRateLimit,
      pendingBots,
      terminalFailureBots,
      inProgressBots,
      requestTimesByBot,
      terminalFailuresByBot,
      ignoredMentions,
      coderabbit
    };
  } catch (error) {
    return {
      fetchError: true,
      rateLimit: resolveGitHubRateLimitStatus(error, { surface: 'rest' }),
      pendingBots: [],
      terminalFailureBots: [],
      inProgressBots: [],
      coderabbit: {
        actionableCount: 0,
        outsideDiffCount: 0,
        nitpickCount: 0
      }
    };
  }
}

async function fetchInlineBotFeedback(owner, repo, prNumber, headOid) {
  if (!headOid) {
    return { fetchError: false, rateLimit: null, unacknowledgedCount: 0 };
  }

  try {
    const pagedPayload = await runGhJsonSlurped([
      'api',
      `repos/${owner}/${repo}/pulls/${prNumber}/comments`
    ]);
    const comments = flattenReviewCommentPages(pagedPayload);
    const repliesByParentId = new Map();

    for (const comment of comments) {
      if (!comment || typeof comment !== 'object') {
        continue;
      }
      const parentId = Number(comment.in_reply_to_id);
      if (!Number.isInteger(parentId) || parentId <= 0) {
        continue;
      }
      const bucket = repliesByParentId.get(parentId) ?? [];
      bucket.push(comment);
      repliesByParentId.set(parentId, bucket);
    }

    let unacknowledgedCount = 0;
    for (const comment of comments) {
      if (!comment || typeof comment !== 'object') {
        continue;
      }

      const commentId = Number(comment.id);
      if (!Number.isInteger(commentId) || commentId <= 0) {
        continue;
      }
      if (comment.in_reply_to_id !== null && comment.in_reply_to_id !== undefined) {
        continue;
      }
      if (!isActionableBot(comment.user?.login)) {
        continue;
      }

      const commitId = typeof comment.commit_id === 'string' ? comment.commit_id : null;
      const originalCommitId = typeof comment.original_commit_id === 'string' ? comment.original_commit_id : null;
      if (commitId !== headOid && originalCommitId !== headOid) {
        continue;
      }

      const replies = repliesByParentId.get(commentId) ?? [];
      const hasHumanReply = replies.some((reply) => isHumanReviewActor(reply?.user));
      if (!hasHumanReply) {
        unacknowledgedCount += 1;
      }
    }

    return { fetchError: false, rateLimit: null, unacknowledgedCount };
  } catch (error) {
    return {
      fetchError: true,
      rateLimit: resolveGitHubRateLimitStatus(error, { surface: 'rest' }),
      unacknowledgedCount: 0
    };
  }
}

async function fetchSnapshot(owner, repo, prNumber, previousRequiredChecksCache = null, options = {}) {
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
  const currentUpdatedAt = response?.data?.repository?.pullRequest?.updatedAt || null;
  const cachedFanout = resolveReusableFanoutCache(previousRequiredChecksCache, currentHeadOid, currentUpdatedAt);
  const previousRequiredChecks = resolveCachedRequiredChecksSummary(previousRequiredChecksCache, currentHeadOid);
  let requiredChecksResult;
  let inlineBotFeedback;
  let botRereviewSignals;
  let fanoutCacheHit = false;
  if (cachedFanout) {
    requiredChecksResult = await fetchRequiredChecks(owner, repo, prNumber);
    inlineBotFeedback = cachedFanout.inlineBotFeedback;
    botRereviewSignals = cachedFanout.botRereviewSignals;
    fanoutCacheHit = true;
  } else {
    [requiredChecksResult, inlineBotFeedback, botRereviewSignals] = await Promise.all([
      fetchRequiredChecks(owner, repo, prNumber),
      fetchInlineBotFeedback(owner, repo, prNumber, currentHeadOid),
      fetchBotRereviewSignals(owner, repo, prNumber, currentHeadOid)
    ]);
  }
  const requiredChecks = resolveRequiredChecksSummary(
    requiredChecksResult.summary,
    previousRequiredChecks,
    requiredChecksResult.fetchError
  );
  const githubRateLimits = [
    requiredChecksResult.rateLimit,
    inlineBotFeedback?.rateLimit,
    botRereviewSignals?.rateLimit
  ].filter(Boolean);
  return {
    snapshot: buildStatusSnapshot(
      response,
      requiredChecks,
      {
        ...inlineBotFeedback,
        rereview: botRereviewSignals
      },
      {
        ...options,
        fanoutCacheHit,
        githubRateLimits,
        requiredChecksQueryFailed: requiredChecksResult.fetchError
      }
    ),
    requiredChecksForNextPoll: buildReusableFanoutCache({
      headOid: currentHeadOid,
      updatedAt: currentUpdatedAt,
      requiredChecks,
      requiredChecksResult,
      inlineBotFeedback,
      botRereviewSignals
    })
  };
}

export async function fetchPrStatusSnapshot(input) {
  const owner = typeof input?.owner === 'string' ? input.owner.trim() : '';
  const repo = typeof input?.repo === 'string' ? input.repo.trim() : '';
  const prNumber = Number(input?.prNumber);
  if (!owner || !repo || !Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error('fetchPrStatusSnapshot requires owner, repo, and a positive integer prNumber.');
  }
  const readinessMode = normalizeReadinessMode(input?.readinessMode);
  const { snapshot } = await fetchSnapshot(owner, repo, prNumber, null, {
    readinessMode
  });
  return snapshot;
}

export function buildPrMergeArgs({ owner, repo, prNumber, mergeMethod, deleteBranch, headOid }) {
  // gh pr merge has no --yes flag; rely on non-interactive stdio + explicit merge method.
  const args = ['pr', 'merge', String(prNumber), `--${mergeMethod}`, '--repo', `${owner}/${repo}`];
  if (deleteBranch) {
    args.push('--delete-branch');
  }
  if (headOid) {
    args.push('--match-head-commit', headOid);
  }
  return args;
}

async function attemptMerge({ owner, repo, prNumber, mergeMethod, deleteBranch, headOid }) {
  const args = buildPrMergeArgs({ owner, repo, prNumber, mergeMethod, deleteBranch, headOid });
  return await runGh(args, { allowFailure: true });
}

async function attemptUpdateBranch({ owner, repo, prNumber }) {
  const args = buildPrUpdateBranchArgs({ owner, repo, prNumber });
  return await runGh(args, { allowFailure: true });
}

export function buildAutomaticBranchRecoveryKey(snapshot, recoveryReason) {
  return [
    recoveryReason,
    snapshot?.headOid || 'no-head'
  ].join('|');
}

function describeAutomaticBranchRecovery(recoveryReason) {
  if (recoveryReason === 'merge_state=DIRTY') {
    return 'conflict recovery';
  }
  return 'branch refresh';
}

async function runPrWatchMergeOrThrow(argv, options) {
  const { args, positionals } = parseArgs(argv);
  const readinessMode = normalizeReadinessMode(options.readinessMode);
  const isReviewMode = readinessMode === 'review';

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
    'exit-on-action-required',
    'no-exit-on-action-required',
    'dry-run',
    'h',
    'help'
  ]);
  const unknownFlags = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknownFlags.length > 0 || positionals.length > 0) {
    const label = unknownFlags[0] ? `--${unknownFlags[0]}` : positionals[0];
    throw new Error(`Unknown option: ${label}`);
  }

  if (isReviewMode) {
    const unsupportedFlags = [];
    if (Object.prototype.hasOwnProperty.call(args, 'merge-method')) {
      unsupportedFlags.push('--merge-method');
    }
    if (hasFlag(args, 'auto-merge') || hasFlag(args, 'no-auto-merge')) {
      unsupportedFlags.push('--auto-merge/--no-auto-merge');
    }
    if (hasFlag(args, 'delete-branch') || hasFlag(args, 'no-delete-branch')) {
      unsupportedFlags.push('--delete-branch/--no-delete-branch');
    }
    if (unsupportedFlags.length > 0) {
      throw new Error(`ready-review does not support merge flags: ${unsupportedFlags.join(', ')}`);
    }
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
  const mergeMethod = isReviewMode
    ? DEFAULT_MERGE_METHOD
    : parseMergeMethod(
        typeof args['merge-method'] === 'string'
          ? args['merge-method']
          : process.env.PR_MONITOR_MERGE_METHOD || DEFAULT_MERGE_METHOD
      );
  const defaultAutoMergeFallback = typeof options.defaultAutoMerge === 'boolean' ? options.defaultAutoMerge : false;
  const defaultAutoMerge = envFlagEnabled(process.env.PR_MONITOR_AUTO_MERGE, defaultAutoMergeFallback);
  const defaultDeleteBranch = envFlagEnabled(process.env.PR_MONITOR_DELETE_BRANCH, true);
  let autoMerge = false;
  if (!isReviewMode) {
    autoMerge = defaultAutoMerge;
    if (hasFlag(args, 'auto-merge')) {
      autoMerge = true;
    }
    if (hasFlag(args, 'no-auto-merge')) {
      autoMerge = false;
    }
  }
  let deleteBranch = false;
  if (!isReviewMode) {
    deleteBranch = defaultDeleteBranch;
    if (hasFlag(args, 'delete-branch')) {
      deleteBranch = true;
    }
    if (hasFlag(args, 'no-delete-branch')) {
      deleteBranch = false;
    }
  }
  let exitOnActionRequired = Boolean(options.defaultExitOnActionRequired);
  if (hasFlag(args, 'exit-on-action-required')) {
    exitOnActionRequired = true;
  }
  if (hasFlag(args, 'no-exit-on-action-required')) {
    exitOnActionRequired = false;
  }
  const dryRun = hasFlag(args, 'dry-run');

  await ensureGhAuth();
  const { owner, repo } = await resolveRepo(
    typeof args.owner === 'string' ? args.owner : undefined,
    typeof args.repo === 'string' ? args.repo : undefined
  );
  const prNumber = await resolvePrNumber(args.pr, owner, repo);

  const intervalMs = Math.round(intervalSeconds * 1000);
  const quietMs = Math.round(quietMinutes * 60 * 1000);
  const timeoutMs = Math.round(timeoutMinutes * 60 * 1000);
  const deadline = Date.now() + timeoutMs;
  const automaticBranchRecoveryEnabled =
    isReviewMode
    || autoMerge
    || Boolean(options.enableAutomaticBranchRecovery);

  log(
    isReviewMode
      ? `Monitoring ${owner}/${repo}#${prNumber} every ${intervalSeconds}s (quiet window ${quietMinutes}m, timeout ${timeoutMinutes}m, target=review_handoff, exit_on_action_required=${exitOnActionRequired ? 'on' : 'off'}, dry_run=${dryRun ? 'on' : 'off'}).`
      : `Monitoring ${owner}/${repo}#${prNumber} every ${intervalSeconds}s (quiet window ${quietMinutes}m, timeout ${timeoutMinutes}m, auto_merge=${
          autoMerge ? 'on' : 'off'
        }, exit_on_action_required=${exitOnActionRequired ? 'on' : 'off'}, dry_run=${dryRun ? 'on' : 'off'}).`
  );

  let quietWindowStartedAt = null;
  let quietWindowAnchorUpdatedAt = null;
  let quietWindowAnchorHeadOid = null;
  let lastMergeAttemptHeadOid = null;
  let pendingAutomaticBranchRecoveryKey = null;
  let attemptedAutomaticBranchRecoveryKey = null;
  let fanoutForNextPollCache = null;
  let latestSnapshot = null;
  let pollingHealthySinceLatestSnapshot = false;

  while (Date.now() <= deadline) {
    let snapshot;
    try {
      const fetched = await fetchSnapshot(owner, repo, prNumber, fanoutForNextPollCache, {
        readinessMode
      });
      snapshot = fetched.snapshot;
      fanoutForNextPollCache = fetched.requiredChecksForNextPoll;
    } catch (error) {
      pollingHealthySinceLatestSnapshot = false;
      const rateLimit = resolveGitHubRateLimitStatus(error);
      if (rateLimit) {
        const sleepMs = planPollingRateLimitSleepMs(rateLimit, {
          owner,
          repo,
          prNumber,
          intervalMs,
          deadline
        });
        if (sleepMs <= 0) {
          break;
        }
        log(
          `Polling GitHub API rate limit: ${formatGitHubRateLimitStatus(
            rateLimit
          )} (retrying in ${formatDuration(sleepMs)}).`
        );
        await sleep(sleepMs);
        continue;
      }
      log(`Polling error: ${error instanceof Error ? error.message : String(error)} (retrying).`);
      await sleep(intervalMs);
      continue;
    }
    latestSnapshot = snapshot;
    pollingHealthySinceLatestSnapshot = true;

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

    const actionRequiredReasons = resolveActionRequiredReasons(snapshot, { readinessMode });
    const automaticBranchRecoveryReason =
      automaticBranchRecoveryEnabled
        ? resolveAutomaticBranchRecoveryReason(snapshot, {
            readinessMode,
            requireExclusive: true
          })
        : null;
    const shouldAttemptRecovery =
      automaticBranchRecoveryEnabled
      && shouldAttemptAutomaticBranchRecovery(snapshot, { readinessMode });
    const automaticBranchRecoveryKey = automaticBranchRecoveryReason
      ? buildAutomaticBranchRecoveryKey(snapshot, automaticBranchRecoveryReason)
      : null;
    if (
      pendingAutomaticBranchRecoveryKey
      && pendingAutomaticBranchRecoveryKey !== automaticBranchRecoveryKey
    ) {
      pendingAutomaticBranchRecoveryKey = null;
    }
    if (
      attemptedAutomaticBranchRecoveryKey
      && attemptedAutomaticBranchRecoveryKey !== automaticBranchRecoveryKey
    ) {
      attemptedAutomaticBranchRecoveryKey = null;
    }
    if (
      exitOnActionRequired
      && actionRequiredReasons.length > 0
      && !shouldAttemptRecovery
    ) {
      const details = actionRequiredReasons.join(', ');
      throw new PrWatchMergeExitError(
        `${isReviewMode ? 'Action required before review handoff' : 'Action required before merge'}: ${details}${snapshot.url ? ` (${snapshot.url})` : ''}`,
        2
      );
    }
    if (snapshot.githubRateLimit) {
      pollingHealthySinceLatestSnapshot = false;
      const sleepMs = planPollingRateLimitSleepMs(snapshot.githubRateLimit, {
        owner,
        repo,
        prNumber,
        intervalMs,
        deadline
      });
      if (sleepMs <= 0) {
        break;
      }
      log(
        `GitHub API fan-out is rate limited: ${formatGitHubRateLimitStatus(
          snapshot.githubRateLimit
        )} (retrying in ${formatDuration(sleepMs)}).`
      );
      await sleep(sleepMs);
      continue;
    }
    if (
      shouldAttemptRecovery
      && automaticBranchRecoveryReason
      && automaticBranchRecoveryKey
      && pendingAutomaticBranchRecoveryKey !== automaticBranchRecoveryKey
      && attemptedAutomaticBranchRecoveryKey !== automaticBranchRecoveryKey
    ) {
      if (dryRun) {
        log(
          `Dry run: would attempt automatic ${describeAutomaticBranchRecovery(
            automaticBranchRecoveryReason
          )} for ${automaticBranchRecoveryReason}.`
        );
      } else {
        log(
          `Attempting automatic ${describeAutomaticBranchRecovery(
            automaticBranchRecoveryReason
          )} via gh pr update-branch (${automaticBranchRecoveryReason}).`
        );
        const updateBranchResult = await attemptUpdateBranch({
          owner,
          repo,
          prNumber
        });
        if (updateBranchResult.exitCode === 0) {
          attemptedAutomaticBranchRecoveryKey = automaticBranchRecoveryKey;
          pendingAutomaticBranchRecoveryKey = automaticBranchRecoveryKey;
          quietWindowStartedAt = null;
          quietWindowAnchorUpdatedAt = null;
          quietWindowAnchorHeadOid = null;
          lastMergeAttemptHeadOid = null;
          log(
            `Automatic ${describeAutomaticBranchRecovery(
              automaticBranchRecoveryReason
            )} requested for PR #${prNumber}; waiting for GitHub readiness to refresh.`
          );
          const remainingTimeMs = deadline - Date.now();
          if (remainingTimeMs <= 0) {
            break;
          }
          await sleep(Math.min(intervalMs, remainingTimeMs));
          continue;
        }
        const updateBranchRateLimit = resolveGitHubRateLimitStatus(updateBranchResult, {
          surface: 'rest'
        });
        if (updateBranchRateLimit) {
          const sleepMs = planPollingRateLimitSleepMs(updateBranchRateLimit, {
            owner,
            repo,
            prNumber,
            intervalMs,
            deadline
          });
          if (sleepMs <= 0) {
            break;
          }
          log(
            `Automatic ${describeAutomaticBranchRecovery(
              automaticBranchRecoveryReason
            )} is rate limited: ${formatGitHubRateLimitStatus(
              updateBranchRateLimit
            )} (retrying in ${formatDuration(sleepMs)}).`
          );
          await sleep(sleepMs);
          continue;
        }
        attemptedAutomaticBranchRecoveryKey = automaticBranchRecoveryKey;
        const details =
          updateBranchResult.stderr
          || updateBranchResult.stdout
          || `exit code ${updateBranchResult.exitCode}`;
        log(
          `Automatic ${describeAutomaticBranchRecovery(
            automaticBranchRecoveryReason
          )} failed: ${details}`
        );
        if (isConflictLikeBranchRecoveryFailureMessage(details)) {
          log('GitHub reported merge conflicts while attempting automatic branch recovery.');
        }
      }
    }

    if (exitOnActionRequired) {
      if (actionRequiredReasons.length > 0) {
        if (
          shouldAttemptRecovery
          && automaticBranchRecoveryKey
          && pendingAutomaticBranchRecoveryKey === automaticBranchRecoveryKey
        ) {
          log(
            `Automatic ${describeAutomaticBranchRecovery(
              automaticBranchRecoveryReason
            )} is still pending; suppressing action-required exit for now.`
          );
          const remainingTimeMs = deadline - Date.now();
          if (remainingTimeMs <= 0) {
            break;
          }
          await sleep(Math.min(intervalMs, remainingTimeMs));
          continue;
        }
        const details = actionRequiredReasons.join(', ');
        throw new PrWatchMergeExitError(
          `${isReviewMode ? 'Action required before review handoff' : 'Action required before merge'}: ${details}${snapshot.url ? ` (${snapshot.url})` : ''}`,
          2
        );
      }
    }

    if (snapshot.readyToMerge && quietWindowStartedAt !== null && quietElapsedMs >= quietMs) {
      if (!autoMerge || dryRun) {
        log(
          isReviewMode
            ? 'Review handoff conditions satisfied and quiet window elapsed.'
            : dryRun
              ? 'Dry run: merge conditions satisfied and quiet window elapsed.'
              : 'Merge conditions satisfied and quiet window elapsed.'
        );
        if (snapshot.url) {
          log(`${isReviewMode ? 'Ready for review' : 'Ready to merge'}: ${snapshot.url}`);
        }
        return;
      }

      if (snapshot.headOid && snapshot.headOid === lastMergeAttemptHeadOid) {
        log(`Merge already attempted for head ${snapshot.headOid}; waiting for PR state refresh.`);
      } else {
        lastMergeAttemptHeadOid = snapshot.headOid;
        log(`Attempting merge via gh pr merge --${mergeMethod}${deleteBranch ? ' --delete-branch' : ''}.`);
        const mergeResult = await attemptMerge({
          owner,
          repo,
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

  if (shouldSucceedAfterTimeout(latestSnapshot, { readinessMode, pollingHealthy: pollingHealthySinceLatestSnapshot })) {
    log('Bounded wait expired cleanly with no remaining automated-feedback blockers.');
    if (latestSnapshot?.url) {
      log(`Ready for review: ${latestSnapshot.url}`);
    }
    return;
  }

  throw new PrWatchMergeExitError(
    `Timed out after ${timeoutMinutes} minute(s) while monitoring PR #${prNumber}.`,
    3
  );
}

export async function runPrWatchMerge(argv, options = {}) {
  try {
    await runPrWatchMergeOrThrow(argv, options);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    const exitCodeCandidate = Number(error?.exitCode);
    if (Number.isInteger(exitCodeCandidate) && exitCodeCandidate > 0) {
      return exitCodeCandidate;
    }
    return 1;
  }
}
