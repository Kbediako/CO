import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  executeLinearGraphql,
  resolveLinearApiToken,
  resolveLinearRequestTimeoutMs,
  type LinearGraphqlPayload,
  type LinearGraphqlFailure
} from './linearGraphqlClient.js';
import {
  recordLinearBudgetHeadersObservation,
  recordLinearBudgetRateLimitObservation,
  readSharedLinearBudgetStatus,
  reserveLinearBudgetReservation,
  resolveLinearBudgetPreflight,
  resolveLinearPollingInterval,
  type LinearBudgetStatus
} from './linearBudgetState.js';
import { mapLinearRateLimitedFailure } from './linearRateLimit.js';
import { resolveLinearSourceSetup } from './linearDispatchSource.js';
import { resolveProviderLinearAuditPath } from './providerLinearWorkflowAudit.js';
import {
  classifyProviderLinearWorkflowState,
  isProviderLinearTerminalReopenTransition,
  normalizeProviderLinearWorkflowState
} from './providerLinearWorkflowStates.js';
import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';

const LINEAR_WORKPAD_MARKER = '## Codex Workpad';
const LINEAR_WORKPAD_MARKER_TITLE = 'Codex Workpad';
const LINEAR_WORKPAD_REQUIRED_SECTIONS = [
  'Environment / Workspace Stamp',
  'Plan',
  'Acceptance Criteria',
  'Validation',
  'Notes'
] as const;
const LINEAR_WORKPAD_CHECKBOX_REQUIRED_SECTIONS = ['Acceptance Criteria', 'Validation'] as const;
const LINEAR_LOCAL_IMAGE_MARKDOWN_PATTERN =
  /!\[([^\]]*)\]\(((?:<[^>]+>|[^\s)]+)(?:\s+(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^)\\]|\\.)*\)))?)\s*\)/gu;
const LINEAR_ISSUE_VALIDATION_SECTION_TITLES = new Set(['validation', 'test plan', 'testing']);
const LINEAR_ISSUE_VALIDATION_NESTED_SECTION_TITLES = new Set([
  'automated',
  'manual',
  'smoke',
  'sanity',
  'regression',
  'integration',
  'unit',
  'e2e',
  'end to end',
  'qa',
  'verification',
  'checks',
  'checklist',
  'accessibility',
  'performance',
  'security',
  'setup',
  'cleanup',
  'preflight',
  'postflight'
]);
const LINEAR_ISSUE_PLAIN_SECTION_TITLES = new Set([
  'context',
  'observed nuance',
  'required reference baseline',
  'problem to solve',
  'scope',
  'out of scope',
  'acceptance criteria',
  'validation',
  'test plan',
  'testing',
  'recent activity',
  'known blockers',
  'dependencies',
  'risks',
  'constraints',
  'constraints / non-goals',
  'non-goals',
  'notes',
  'open questions',
  'implementation',
  'investigation'
]);
const LINEAR_ISSUE_PLAIN_SECTION_CONNECTOR_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'via',
  'vs',
  'with',
  'without'
]);
const LINEAR_ISSUE_LOWERCASE_SETEXT_LEADING_VERBS = new Set([
  'run',
  'rerun',
  'execute',
  'install'
]);
const LINEAR_ISSUE_LOWERCASE_SETEXT_COMMAND_ENTRYPOINTS = new Set([
  'bun',
  'cargo',
  'composer',
  'docker',
  'git',
  'helm',
  'kubectl',
  'mvn',
  'node',
  'npm',
  'npx',
  'pip',
  'pip3',
  'pnpm',
  'poetry',
  'pytest',
  'python',
  'python3',
  'terraform',
  'uv',
  'yarn'
]);
const LINEAR_ISSUE_LOWERCASE_SETEXT_AMBIGUOUS_COMMAND_ENTRYPOINTS = new Set([
  'go',
  'just',
  'make'
]);
const LINEAR_ISSUE_LOWERCASE_SETEXT_COMMAND_SUBCOMMANDS = new Set([
  'add',
  'apply',
  'bench',
  'branch',
  'build',
  'check',
  'checkout',
  'ci',
  'clean',
  'clone',
  'commit',
  'compose',
  'config',
  'coverage',
  'create',
  'deploy',
  'describe',
  'dev',
  'destroy',
  'diff',
  'down',
  'env',
  'exec',
  'generate',
  'fetch',
  'fmt',
  'format',
  'get',
  'import',
  'inspect',
  'install',
  'init',
  'lint',
  'list',
  'login',
  'log',
  'logout',
  'merge',
  'mod',
  'new',
  'plan',
  'pull',
  'publish',
  'push',
  'rebase',
  'release',
  'remote',
  'remove',
  'reset',
  'rm',
  'restore',
  'run',
  'serve',
  'show',
  'start',
  'status',
  'stash',
  'stop',
  'switch',
  'sync',
  'tag',
  'test',
  'uninstall',
  'update',
  'upgrade',
  'up',
  'use',
  'verify',
  'vet',
  'whoami'
]);
const LINEAR_ISSUE_LOWERCASE_SETEXT_AMBIGUOUS_COMMAND_SUBCOMMANDS = new Set([
  'bench',
  'build',
  'check',
  'clean',
  'dev',
  'fmt',
  'format',
  'generate',
  'install',
  'lint',
  'mod',
  'plan',
  'run',
  'serve',
  'status',
  'sync',
  'test',
  'verify',
  'vet'
]);
const LINEAR_WORKFLOW_COMMENT_LIMIT = 50;
const LINEAR_WORKFLOW_STATE_LIMIT = 50;
const LINEAR_WORKFLOW_ATTACHMENT_LIMIT = 20;
const LINEAR_WORKFLOW_LABEL_LIMIT = 50;
const ISSUE_CONTEXT_PULL_REQUEST_HYDRATION_CONCURRENCY = 4;
const PROVIDER_LINEAR_ISSUE_CONTEXT_CACHE_FILENAME_STEM = 'provider-linear-issue-context-cache';
const PROVIDER_LINEAR_ISSUE_CONTEXT_CACHE_FILENAME = 'provider-linear-issue-context-cache.json';
const PROVIDER_LINEAR_DIRECT_MUTATION_CACHE_MAX_AGE_MS = 10_000;
const PROVIDER_LINEAR_LOW_HEADROOM_READ_CACHE_MAX_AGE_MS = 60_000;
const PROVIDER_LINEAR_LOW_HEADROOM_READ_DETECTION_INTERVAL_MS = 15_000;
const LOCAL_IMAGE_CONTENT_TYPE_BY_EXTENSION = new Map<string, string>([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif']
]);
const PROVIDER_LINEAR_CANONICAL_OWNER_MARKER_PREFIX = 'codex-orchestrator:canonical-owner-key=';
const PROVIDER_LINEAR_SUPERSEDED_CANONICAL_OWNER_MARKER_PREFIX =
  'codex-orchestrator:superseded-canonical-owner-key=';
const FOLLOW_UP_REQUIRED_LIFECYCLE_LABEL = 'Lifecycle: Implementation';
const FOLLOW_UP_TYPE_LABEL_NAMES = new Set(['Bug', 'Improvement', 'Feature']);
const PROVIDER_LINEAR_CANONICAL_OWNER_SEARCH_LIMIT = 50;

type ProviderLinearOperation =
  | 'issue-context'
  | 'upsert-workpad'
  | 'delete-workpad'
  | 'transition'
  | 'attach-pr'
  | 'create-follow-up';
type ProviderLinearOperationFailure<T extends ProviderLinearOperation> = {
  ok: false;
  operation: T;
  error: ProviderLinearWorkflowError;
};

export interface ProviderLinearWorkflowError {
  code: string;
  message: string;
  status: number;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export interface ProviderLinearWorkflowState {
  id: string;
  name: string;
  type: string | null;
}

export interface ProviderLinearWorkflowComment {
  id: string;
  body: string;
  url: string | null;
  created_at: string | null;
  updated_at: string | null;
  resolved_at: string | null;
}

export interface ProviderLinearWorkflowAttachment {
  id: string;
  title: string | null;
  url: string | null;
  source_type: string | null;
}

export interface ProviderLinearIssueLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface ProviderLinearIssuePullRequestAttachments {
  current: ProviderLinearWorkflowAttachment | null;
  historical: ProviderLinearWorkflowAttachment[];
  conflicting: ProviderLinearWorkflowAttachment[];
  unknown: ProviderLinearWorkflowAttachment[];
}

export interface ProviderLinearEmbeddedAsset {
  original_reference: string;
  resolved_path: string;
  asset_url: string;
  content_type: string;
  size_bytes: number;
}

interface ProviderLinearEmbeddedWorkpadLocalImageCacheEntry {
  original_reference: string;
  resolved_path: string;
  size_bytes: number;
  mtime_ms: number;
}

interface ProviderLinearEmbeddedWorkpadCacheRecord {
  comment_id: string;
  original_body: string;
  resolved_body: string;
  local_images: ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[];
}

interface ProviderLinearWorkpadSection {
  title: string;
  body: string;
}

interface ProviderLinearIssueValidationRequirement {
  raw: string;
  normalized: string;
  source_section: string;
}

interface LocalMarkdownImageReference {
  alt_text: string;
  original_reference: string;
  replacement_suffix: string | null;
  resolved_path: string;
  match_start: number;
  match_end: number;
}

export interface ProviderLinearIssueContext {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string | null;
  updated_at: string | null;
  archived_at: string | null;
  trashed: boolean | null;
  workspace_id: string | null;
  state: ProviderLinearWorkflowState | null;
  team: {
    id: string | null;
    key: string | null;
    name: string | null;
    states: ProviderLinearWorkflowState[];
  } | null;
  project: {
    id: string | null;
    name: string | null;
  } | null;
  labels: ProviderLinearIssueLabel[];
  comments: ProviderLinearWorkflowComment[];
  attachments: ProviderLinearWorkflowAttachment[];
  pull_request_attachments: ProviderLinearIssuePullRequestAttachments;
  workpad_comment: ProviderLinearWorkflowComment | null;
}

type ProviderLinearIssueSummary = Pick<
  ProviderLinearIssueContext,
  'id' | 'identifier' | 'url' | 'updated_at' | 'archived_at' | 'trashed' | 'workspace_id' | 'state' | 'team' | 'project'
  | 'labels'
>;

export type ProviderLinearIssueContextResult =
  | {
      ok: true;
      operation: 'issue-context';
      issue: ProviderLinearIssueContext;
      source_setup: DispatchPilotSourceSetup | null;
      cache_fallback_used?: boolean;
    }
  | {
      ok: false;
      operation: 'issue-context';
      error: ProviderLinearWorkflowError;
    };

export type ProviderLinearUpsertWorkpadResult =
  | {
      ok: true;
      operation: 'upsert-workpad';
      action: 'created' | 'updated' | 'noop';
      issue: Pick<ProviderLinearIssueContext, 'id' | 'identifier'>;
      comment: ProviderLinearWorkflowComment;
      embedded_assets?: ProviderLinearEmbeddedAsset[];
      source_setup: DispatchPilotSourceSetup | null;
    }
  | {
      ok: false;
      operation: 'upsert-workpad';
      error: ProviderLinearWorkflowError;
    };

export type ProviderLinearDeleteWorkpadResult =
  | {
      ok: true;
      operation: 'delete-workpad';
      action: 'deleted' | 'noop';
      issue: Pick<ProviderLinearIssueContext, 'id' | 'identifier'>;
      comment_id: string | null;
      source_setup: DispatchPilotSourceSetup | null;
    }
  | {
      ok: false;
      operation: 'delete-workpad';
      error: ProviderLinearWorkflowError;
    };

export type ProviderLinearTransitionResult =
  | {
      ok: true;
      operation: 'transition';
      action: 'updated' | 'noop';
      issue: {
        id: string;
        identifier: string;
        state: ProviderLinearWorkflowState | null;
        updated_at: string | null;
      };
      previous_state: ProviderLinearWorkflowState | null;
      target_state: ProviderLinearWorkflowState;
      transition_guard?: ProviderLinearTransitionGuardAudit | null;
      source_setup: DispatchPilotSourceSetup | null;
    }
  | {
      ok: false;
      operation: 'transition';
      error: ProviderLinearWorkflowError;
    };

export interface ProviderLinearTransitionGuardAudit {
  expected_state: string | null;
  expected_state_type: string | null;
  expected_updated_at: string | null;
  force: boolean;
  force_reason: string | null;
}

export type ProviderLinearAttachPrResult =
  | {
      ok: true;
      operation: 'attach-pr';
      action: 'attached' | 'noop';
      via: 'existing' | 'github_pr' | 'url';
      issue: Pick<ProviderLinearIssueContext, 'id' | 'identifier'>;
      attachment: ProviderLinearWorkflowAttachment;
      source_setup: DispatchPilotSourceSetup | null;
    }
  | {
      ok: false;
      operation: 'attach-pr';
      error: ProviderLinearWorkflowError;
    };

export interface ProviderLinearCreatedIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string | null;
  state: ProviderLinearWorkflowState | null;
  team: {
    id: string | null;
    key: string | null;
    name: string | null;
  } | null;
  project: {
    id: string | null;
    name: string | null;
  } | null;
  labels?: ProviderLinearIssueLabel[];
}

export interface ProviderLinearFollowUpCreationTraceability {
  labels: {
    source_issue: Pick<ProviderLinearIssueContext, 'id' | 'identifier'>;
    requested_labels: ProviderLinearIssueLabel[];
    observed_labels: ProviderLinearIssueLabel[] | null;
    missing_label_ids: string[];
  };
  relations: ProviderLinearFollowUpRelationEvidence;
  packet: ProviderLinearFollowUpPacketTraceabilityEvidence;
}

export interface ProviderLinearFollowUpRelationEvidence {
  related: ProviderLinearFollowUpRelationEvidenceEntry;
  blocked_by_source: ProviderLinearFollowUpRelationEvidenceEntry;
}

export interface ProviderLinearFollowUpRelationEvidenceEntry {
  type: 'related' | 'blocks';
  requested: boolean;
  satisfied: boolean;
  action: 'created' | 'already_satisfied' | 'not_requested' | 'skipped_self';
  issue_id: string;
  related_issue_id: string;
}

export interface ProviderLinearFollowUpPacketTraceabilityEvidence {
  packet_prefix: string;
  canonical_task_id: string | null;
  canonical_task_id_pattern: string;
  required_paths: string[];
  registry_mirrors: string[];
  observed_state: ProviderLinearWorkflowState | null;
  readiness: {
    checked: boolean;
    repo_root: string | null;
    description_has_packet_prefix: boolean;
    ready: boolean;
    missing_paths: string[];
    missing_registry_mirrors: string[];
  };
  queue_admission_blocker: {
    reason: 'backlog_head_follow_up_traceability_pending';
    state: string;
    enforced_by: 'provider-operator-autopilot' | 'create-follow-up';
    summary: string;
  } | null;
}

export type ProviderLinearCreateFollowUpResult =
  | {
      ok: true;
      operation: 'create-follow-up';
      action: 'created' | 'reused';
      issue: Pick<ProviderLinearIssueContext, 'id' | 'identifier'>;
      follow_up_issue: ProviderLinearCreatedIssue;
      canonical_owner: {
        key: string;
        marker: string;
      } | null;
      relations: {
        related: true;
        blocked_by_source: boolean;
      };
      traceability: ProviderLinearFollowUpCreationTraceability;
      source_setup: DispatchPilotSourceSetup | null;
    }
  | {
      ok: false;
      operation: 'create-follow-up';
      error: ProviderLinearWorkflowError;
    };

interface LinearIssueContextQueryResponse {
  viewer?: {
    id?: string | null;
    organization?: {
      id?: string | null;
    } | null;
  } | null;
  issue?: {
    id?: string | null;
    identifier?: string | null;
    title?: string | null;
    description?: string | null;
    url?: string | null;
    updatedAt?: string | null;
    archivedAt?: string | null;
    trashed?: boolean | null;
    state?: {
      id?: string | null;
      name?: string | null;
      type?: string | null;
    } | null;
    team?: {
      id?: string | null;
      key?: string | null;
      name?: string | null;
      states?: {
        nodes?: Array<{
          id?: string | null;
          name?: string | null;
          type?: string | null;
        }> | null;
      } | null;
    } | null;
    project?: {
      id?: string | null;
      name?: string | null;
    } | null;
    labels?: {
      nodes?: Array<{
        id?: string | null;
        name?: string | null;
        color?: string | null;
      }> | null;
      pageInfo?: LinearConnectionPageInfo | null;
    } | null;
    comments?: {
      nodes?: Array<{
        id?: string | null;
        body?: string | null;
        url?: string | null;
        createdAt?: string | null;
        updatedAt?: string | null;
        resolvedAt?: string | null;
      }> | null;
      pageInfo?: LinearConnectionPageInfo | null;
    } | null;
    attachments?: {
      nodes?: Array<{
        id?: string | null;
        title?: string | null;
        url?: string | null;
        sourceType?: string | null;
      }> | null;
      pageInfo?: LinearConnectionPageInfo | null;
    } | null;
  } | null;
}

interface LinearIssueAttachmentsQueryResponse {
  issue?: {
    id?: string | null;
    attachments?: {
      nodes?: Array<{
        id?: string | null;
        title?: string | null;
        url?: string | null;
        sourceType?: string | null;
      }> | null;
      pageInfo?: LinearConnectionPageInfo | null;
    } | null;
  } | null;
}

interface LinearIssueSummaryQueryResponse {
  viewer?: {
    id?: string | null;
    organization?: {
      id?: string | null;
    } | null;
  } | null;
  issue?: {
    id?: string | null;
    identifier?: string | null;
    url?: string | null;
    updatedAt?: string | null;
    archivedAt?: string | null;
    trashed?: boolean | null;
    state?: {
      id?: string | null;
      name?: string | null;
      type?: string | null;
    } | null;
    team?: {
      id?: string | null;
      key?: string | null;
      name?: string | null;
      states?: {
        nodes?: Array<{
          id?: string | null;
          name?: string | null;
          type?: string | null;
        }> | null;
      } | null;
    } | null;
    project?: {
      id?: string | null;
      name?: string | null;
    } | null;
    labels?: {
      nodes?: Array<{
        id?: string | null;
        name?: string | null;
        color?: string | null;
      }> | null;
      pageInfo?: LinearConnectionPageInfo | null;
    } | null;
  } | null;
}

interface LinearCanonicalOwnerIssuesQueryResponse {
  issues?: {
    nodes?: Array<{
      id?: string | null;
      identifier?: string | null;
      title?: string | null;
      description?: string | null;
      url?: string | null;
      archivedAt?: string | null;
      trashed?: boolean | null;
      state?: {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      } | null;
      team?: {
        id?: string | null;
        key?: string | null;
        name?: string | null;
      } | null;
      project?: {
        id?: string | null;
        name?: string | null;
      } | null;
    } & LinearIssueLabelConnectionField> | null;
    pageInfo?: LinearConnectionPageInfo | null;
  } | null;
}

interface LinearConnectionPageInfo {
  hasNextPage?: boolean | null;
  endCursor?: string | null;
}

interface LinearIssueLabelConnectionField {
  labels?: {
    nodes?: Array<{
      id?: string | null;
      name?: string | null;
      color?: string | null;
    }> | null;
    pageInfo?: LinearConnectionPageInfo | null;
  } | null;
}

interface CommentMutationResponse {
  commentCreate?: {
    success?: boolean | null;
    comment?: {
      id?: string | null;
      url?: string | null;
      body?: string | null;
    } | null;
  } | null;
  commentUpdate?: {
    success?: boolean | null;
    comment?: {
      id?: string | null;
      url?: string | null;
      body?: string | null;
    } | null;
  } | null;
}

interface DeleteMutationResponse {
  commentDelete?: {
    success?: boolean | null;
    entityId?: string | null;
  } | null;
}

interface IssueTransitionMutationResponse {
  issueUpdate?: {
    success?: boolean | null;
    issue?: {
      id?: string | null;
      identifier?: string | null;
      updatedAt?: string | null;
      state?: {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      } | null;
    } | null;
  } | null;
}

interface AttachmentMutationResponse {
  attachmentLinkGitHubPR?: {
    success?: boolean | null;
    attachment?: {
      id?: string | null;
      title?: string | null;
      url?: string | null;
      sourceType?: string | null;
    } | null;
  } | null;
  attachmentLinkURL?: {
    success?: boolean | null;
    attachment?: {
      id?: string | null;
      title?: string | null;
      url?: string | null;
      sourceType?: string | null;
    } | null;
  } | null;
}

interface FileUploadMutationResponse {
  fileUpload?: {
    success?: boolean | null;
    uploadFile?: {
      uploadUrl?: string | null;
      assetUrl?: string | null;
      headers?: Array<{
        key?: string | null;
        value?: string | null;
      }> | null;
    } | null;
  } | null;
}

interface IssueCreateMutationResponse {
  issueCreate?: {
    success?: boolean | null;
    issue?: {
      id?: string | null;
      identifier?: string | null;
      title?: string | null;
      description?: string | null;
      url?: string | null;
      state?: {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      } | null;
      team?: {
        id?: string | null;
        key?: string | null;
        name?: string | null;
      } | null;
      project?: {
        id?: string | null;
        name?: string | null;
      } | null;
    } & LinearIssueLabelConnectionField | null;
  } | null;
}

interface IssueDescriptionUpdateMutationResponse {
  issueUpdate?: {
    success?: boolean | null;
    issue?: {
      id?: string | null;
      identifier?: string | null;
      title?: string | null;
      description?: string | null;
      url?: string | null;
      state?: {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      } | null;
      team?: {
        id?: string | null;
        key?: string | null;
        name?: string | null;
      } | null;
      project?: {
        id?: string | null;
        name?: string | null;
      } | null;
    } & LinearIssueLabelConnectionField | null;
  } | null;
}

interface IssueRelationMutationResponse {
  issueRelationCreate?: {
    success?: boolean | null;
    issueRelation?: {
      id?: string | null;
      type?: string | null;
    } | null;
  } | null;
}

interface ResolvedLinearWorkflowSession {
  env: NodeJS.ProcessEnv;
  token: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
  sourceSetup: DispatchPilotSourceSetup | null;
}

interface ProviderLinearIssueContextCacheRecord {
  schema_version: 1 | 2;
  issue_id: string;
  recorded_at: string;
  source_setup: DispatchPilotSourceSetup | null;
  issue: ProviderLinearIssueContext;
  embedded_workpad?: ProviderLinearEmbeddedWorkpadCacheRecord | null;
}

interface ProviderLinearPullRequestSnapshotResolverInput {
  owner: string;
  repo: string;
  prNumber: number;
  readinessMode?: 'merge' | 'review';
}

interface IssueContextPullRequestSnapshot {
  state: string | null;
  mergedAt: string | null;
  updatedAt: string | null;
  title?: string | null;
  headRefName?: string | null;
}

const NON_LINEAR_ISSUE_IDENTIFIER_PREFIXES = new Set([
  'GPT',
  'HTTP',
  'HTTPS',
  'ISO',
  'NODE',
  'RFC',
  'SHA',
  'TLS',
  'UTF'
]);
const LINEAR_ISSUE_BRANCH_NAMESPACE_SEGMENTS = new Set(['linear']);
const LINEAR_ISSUE_OWNER_PREFIX_PATTERN =
  /^(?:build|chore|ci|deps|docs|feat|fix|perf|refactor|release|revert|security|style|test|tests)(?:\([^)]+\))?!?:\s*$/iu;

interface GitHubJsonCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
}

export async function getProviderLinearIssueContext(input: {
  issueId: string;
  sourceSetup?: DispatchPilotSourceSetup | null;
  fallbackToCacheOnFailure?: boolean;
  allowReadOnlyCacheReuse?: boolean;
  resolvePullRequestSnapshot?: (input: ProviderLinearPullRequestSnapshotResolverInput) => Promise<unknown>;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<ProviderLinearIssueContextResult> {
  const issueId = normalizeRequiredString(input.issueId);
  if (!issueId) {
    return failure('issue-context', 'linear_issue_id_missing', 'Linear issue id is required.', 422);
  }

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failureFromWorkflowError('issue-context', session.error);
  }

  const cachedRecord = await readCachedIssueContextRecord(input.env, issueId, session.session.sourceSetup);
  const budget = await readSharedLinearBudgetStatus(session.session.env, {
    operation: 'provider-linear:issue-context'
  }).catch(() => null);
  const preflight = resolveLinearBudgetPreflight({
    budget,
    operation: 'provider-linear:issue-context',
    minimum_requests_remaining: 1
  });
  if (!preflight.ok) {
    if (input.fallbackToCacheOnFailure === true && cachedRecord) {
      return {
        ok: true,
        operation: 'issue-context',
        issue: cachedRecord.issue,
        source_setup: session.session.sourceSetup,
        cache_fallback_used: true
      };
    }
    return failureFromWorkflowError('issue-context', preflight.error);
  }
  if (
    input.allowReadOnlyCacheReuse === true &&
    cachedRecord &&
    shouldReuseCachedIssueContextForRead(cachedRecord, budget)
  ) {
    return {
      ok: true,
      operation: 'issue-context',
      issue: cachedRecord.issue,
      source_setup: session.session.sourceSetup,
      cache_fallback_used: true
    };
  }

  const context = await readIssueContext(session.session, 'issue-context', issueId);
  if (!context.ok) {
    if (
      input.fallbackToCacheOnFailure === true &&
      shouldFallbackToCachedIssueContextFromWorkflowError(context.error)
    ) {
      const cachedRecord = await readCachedIssueContextRecord(
        input.env,
        issueId,
        session.session.sourceSetup
      );
      if (cachedRecord) {
        return {
          ok: true,
          operation: 'issue-context',
          issue: cachedRecord.issue,
          source_setup: session.session.sourceSetup,
          cache_fallback_used: true
        };
      }
    }
    return failureFromWorkflowError('issue-context', context.error);
  }

  const issue = await hydrateIssuePullRequestAttachments(
    context.issue,
    input.resolvePullRequestSnapshot ?? fetchIssueContextPullRequestSnapshot
  );
  await writeCachedIssueContextRecord(input.env, issue, session.session.sourceSetup);
  return {
    ok: true,
    operation: 'issue-context',
    issue,
    source_setup: session.session.sourceSetup
  };
}

function shouldFallbackToCachedIssueContextFromWorkflowError(
  error: ProviderLinearWorkflowError
): boolean {
  return error.code === 'linear_rate_limited';
}

function buildEmptyIssuePullRequestAttachments(): ProviderLinearIssuePullRequestAttachments {
  return {
    current: null,
    historical: [],
    conflicting: [],
    unknown: []
  };
}

function buildUnknownIssuePullRequestAttachments(
  attachments: readonly ProviderLinearWorkflowAttachment[]
): ProviderLinearIssuePullRequestAttachments {
  const seenComparisonKeys = new Set<string>();
  const unknown: ProviderLinearWorkflowAttachment[] = [];
  for (const attachment of attachments) {
    const parsed = parseGitHubPullRequestUrl(attachment.url);
    if (!parsed || seenComparisonKeys.has(parsed.comparisonKey)) {
      continue;
    }
    seenComparisonKeys.add(parsed.comparisonKey);
    unknown.push(attachment);
  }
  return {
    ...buildEmptyIssuePullRequestAttachments(),
    unknown
  };
}

interface ProviderLinearIssuePullRequestCandidate {
  attachment: ProviderLinearWorkflowAttachment;
  snapshot: {
    state: string | null;
    merged_at: string | null;
    updated_at: string | null;
    title: string | null;
    head_ref_name: string | null;
  };
}

type ProviderLinearIssuePullRequestOwnership = 'owned' | 'foreign' | 'unknown';

interface ProviderLinearIssueIdentifierEvidence {
  identifier: string;
  prefix: string;
  issue_owned_position: boolean;
  strong_issue_owned_position: boolean;
  title_prefix_position: boolean;
}

interface ProviderLinearIssuePullRequestAttachmentCandidate {
  attachment: ProviderLinearWorkflowAttachment;
  owner: string;
  repo: string;
  prNumber: number;
}

interface ProviderLinearIssuePullRequestHydrationResult {
  candidate: ProviderLinearIssuePullRequestAttachmentCandidate;
  snapshot: ProviderLinearIssuePullRequestCandidate['snapshot'] | null;
}

async function mapWithConcurrencyLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const workerCount = Math.min(Math.max(1, Math.trunc(concurrency)), items.length);
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex]!, currentIndex);
      }
    })
  );
  return results;
}

async function hydrateIssuePullRequestAttachments(
  issue: ProviderLinearIssueContext,
  resolvePullRequestSnapshot: (input: ProviderLinearPullRequestSnapshotResolverInput) => Promise<unknown>
): Promise<ProviderLinearIssueContext> {
  const seenComparisonKeys = new Set<string>();
  const pullRequestAttachments: ProviderLinearIssuePullRequestAttachmentCandidate[] = issue.attachments.flatMap(
    (attachment) => {
      const parsed = parseGitHubPullRequestUrl(attachment.url);
      if (!parsed || seenComparisonKeys.has(parsed.comparisonKey)) {
        return [];
      }
      seenComparisonKeys.add(parsed.comparisonKey);
      return [
        {
          attachment,
          owner: parsed.owner,
          repo: parsed.repo,
          prNumber: parsed.number
        }
      ];
    }
  );
  if (pullRequestAttachments.length === 0) {
    return {
      ...issue,
      pull_request_attachments: buildEmptyIssuePullRequestAttachments()
    };
  }

  const resolved: ProviderLinearIssuePullRequestCandidate[] = [];
  const unknown: ProviderLinearWorkflowAttachment[] = [];
  const conflicting: ProviderLinearWorkflowAttachment[] = [];
  const hydrationResults = await mapWithConcurrencyLimit<
    ProviderLinearIssuePullRequestAttachmentCandidate,
    ProviderLinearIssuePullRequestHydrationResult
  >(
    pullRequestAttachments,
    ISSUE_CONTEXT_PULL_REQUEST_HYDRATION_CONCURRENCY,
    async (candidate) => {
      try {
        const rawSnapshot = await resolvePullRequestSnapshot({
          owner: candidate.owner,
          repo: candidate.repo,
          prNumber: candidate.prNumber,
          readinessMode: 'merge'
        });
        return {
          candidate,
          snapshot: mapIssuePullRequestAttachmentSnapshot(rawSnapshot)
        };
      } catch {
        return {
          candidate,
          snapshot: null
        };
      }
    }
  );
  for (const { candidate, snapshot } of hydrationResults) {
    if (!snapshot) {
      if (classifyIssuePullRequestEvidenceOwnership(issue, [candidate.attachment.title]) === 'foreign') {
        conflicting.push(candidate.attachment);
      } else {
        unknown.push(candidate.attachment);
      }
      continue;
    }
    resolved.push({
      attachment: candidate.attachment,
      snapshot
    });
  }

  return {
    ...issue,
    pull_request_attachments: classifyIssuePullRequestAttachments(issue, resolved, unknown, conflicting)
  };
}

export async function fetchIssueContextPullRequestSnapshot(
  input: ProviderLinearPullRequestSnapshotResolverInput,
  options: {
    runGitHubJson?: (args: string[]) => Promise<unknown>;
  } = {}
): Promise<IssueContextPullRequestSnapshot> {
  const owner = normalizeOptionalString(input.owner);
  const repo = normalizeOptionalString(input.repo);
  const prNumber = Number(input.prNumber);
  if (!owner || !repo || !Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error('fetchIssueContextPullRequestSnapshot requires owner, repo, and a positive integer prNumber.');
  }

  const payload = await (options.runGitHubJson ?? runGitHubJsonForIssueContext)([
    'pr',
    'view',
    String(prNumber),
    '--repo',
    `${owner}/${repo}`,
    '--json',
    'state,mergedAt,updatedAt,title,headRefName'
  ]);
  if (!payload || typeof payload !== 'object') {
    throw new Error(`gh pr view ${owner}/${repo}#${prNumber} returned invalid JSON.`);
  }
  const record = payload as Record<string, unknown>;
  return {
    state: normalizeOptionalString(record.state as string | null | undefined),
    mergedAt: normalizeOptionalString(record.mergedAt as string | null | undefined),
    updatedAt: normalizeOptionalString(record.updatedAt as string | null | undefined),
    title: normalizeOptionalString(record.title as string | null | undefined),
    headRefName: normalizeOptionalString(record.headRefName as string | null | undefined)
  };
}

async function runGitHubJsonForIssueContext(args: string[]): Promise<unknown> {
  const result = await runGitHubCommandForIssueContext(args, 15_000);
  if (result.timedOut) {
    throw new Error(`gh ${args.join(' ')} timed out.`);
  }
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.exitCode ?? result.signal ?? 'unknown'}`;
    throw new Error(`gh ${args.join(' ')} failed: ${detail}`);
  }
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

function runGitHubCommandForIssueContext(
  args: string[],
  timeoutMs: number
): Promise<GitHubJsonCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (exitCode, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        timedOut
      });
    });
  });
}

function mapIssuePullRequestAttachmentSnapshot(
  value: unknown
): ProviderLinearIssuePullRequestCandidate['snapshot'] | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const state = normalizeOptionalString(record.state as string | null | undefined);
  const mergedAt = normalizeOptionalString(
    (record.mergedAt ?? record.merged_at) as string | null | undefined
  );
  const updatedAt = normalizeOptionalString(
    (record.updatedAt ?? record.updated_at) as string | null | undefined
  );
  if (state === null && mergedAt === null && updatedAt === null) {
    return null;
  }
  return {
    state,
    merged_at: mergedAt,
    updated_at: updatedAt,
    title: normalizeOptionalString(record.title as string | null | undefined),
    head_ref_name: normalizeOptionalString(
      (record.headRefName ?? record.head_ref_name) as string | null | undefined
    )
  };
}

function classifyIssuePullRequestAttachments(
  issue: ProviderLinearIssueContext,
  resolved: ProviderLinearIssuePullRequestCandidate[],
  unknown: ProviderLinearWorkflowAttachment[],
  preclassifiedConflicting: ProviderLinearWorkflowAttachment[] = []
): ProviderLinearIssuePullRequestAttachments {
  if (resolved.length === 0) {
    return {
      ...buildEmptyIssuePullRequestAttachments(),
      conflicting: appendUniqueIssuePullRequestAttachments([], preclassifiedConflicting),
      unknown: [...unknown]
    };
  }
  const workflowState = classifyProviderLinearWorkflowState({
    state: issue.state?.name ?? null,
    state_type: issue.state?.type ?? null
  });
  const ownershipOwned = resolved.filter(
    (candidate) => classifyIssuePullRequestCandidateOwnership(issue, candidate) === 'owned'
  );
  const ownershipConflicting = resolved.filter(
    (candidate) => classifyIssuePullRequestCandidateOwnership(issue, candidate) === 'foreign'
  );
  const ownershipUnknown = resolved.filter(
    (candidate) => classifyIssuePullRequestCandidateOwnership(issue, candidate) === 'unknown'
  );
  const terminalOwned = ownershipOwned.filter((candidate) =>
    isIssuePullRequestSnapshotTerminal(candidate.snapshot)
  );
  const activeOwned = ownershipOwned.filter(
    (candidate) => !isIssuePullRequestSnapshotTerminal(candidate.snapshot)
  );
  const terminalUnknownCandidates = ownershipUnknown.filter((candidate) =>
    isIssuePullRequestSnapshotTerminal(candidate.snapshot)
  );
  const activeUnknown = ownershipUnknown.filter(
    (candidate) => !isIssuePullRequestSnapshotTerminal(candidate.snapshot)
  );
  const selectionCandidates = activeOwned.length > 0 ? ownershipOwned : [...ownershipOwned, ...ownershipUnknown];
  const ownershipConflictingAttachments = appendUniqueIssuePullRequestAttachments(
    preclassifiedConflicting,
    ownershipConflicting.map((candidate) => candidate.attachment)
  );
  const hasConflictingOwnershipEvidence = ownershipConflictingAttachments.length > 0;
  const unknownAttachments = appendUniqueIssuePullRequestAttachments(
    unknown,
    ownershipOwned.length > 0 ? ownershipUnknown.map((candidate) => candidate.attachment) : []
  );
  const carriedUnknownAttachments = appendUniqueIssuePullRequestAttachments(
    unknown,
    terminalUnknownCandidates.map((candidate) => candidate.attachment)
  );
  if (selectionCandidates.length === 0) {
    return {
      current: null,
      historical: [],
      conflicting: appendUniqueIssuePullRequestAttachments([], ownershipConflictingAttachments),
      unknown: unknownAttachments
    };
  }
  if (activeOwned.length === 0) {
    if (ownershipUnknown.length > 0 && hasConflictingOwnershipEvidence) {
      return {
        current: null,
        historical: terminalOwned.map((candidate) => candidate.attachment),
        conflicting: appendUniqueIssuePullRequestAttachments(
          activeUnknown.map((candidate) => candidate.attachment),
          ownershipConflictingAttachments
        ),
        unknown: carriedUnknownAttachments
      };
    }
    if (
      !workflowState.isTerminal &&
      workflowState.normalizedState !== 'merging' &&
      activeUnknown.length === 1
    ) {
      return {
        current: activeUnknown[0]!.attachment,
        historical: terminalOwned.map((candidate) => candidate.attachment),
        conflicting: appendUniqueIssuePullRequestAttachments([], ownershipConflictingAttachments),
        unknown: carriedUnknownAttachments
      };
    }
    if (workflowState.isTerminal && activeUnknown.length > 0) {
      const terminalSelection = selectCurrentMergingPullRequestAttachment(terminalOwned);
      if (terminalSelection) {
        return {
          current: null,
          historical: [
            terminalSelection.current,
            ...terminalSelection.historical
          ].map((candidate) => candidate.attachment),
          conflicting: appendUniqueIssuePullRequestAttachments(
            terminalSelection.conflicting.map((candidate) => candidate.attachment),
            ownershipConflictingAttachments
          ),
          unknown: appendUniqueIssuePullRequestAttachments(
            carriedUnknownAttachments,
            ownershipUnknown.map((candidate) => candidate.attachment)
          )
        };
      }
      return {
        current: null,
        historical: [],
        conflicting: appendUniqueIssuePullRequestAttachments([], ownershipConflictingAttachments),
        unknown: appendUniqueIssuePullRequestAttachments(
          carriedUnknownAttachments,
          ownershipUnknown.map((candidate) => candidate.attachment)
        )
      };
    }
  }
  const terminal = selectionCandidates.filter((candidate) =>
    isIssuePullRequestSnapshotTerminal(candidate.snapshot)
  );
  const active = selectionCandidates.filter((candidate) => !isIssuePullRequestSnapshotTerminal(candidate.snapshot));
  if (workflowState.normalizedState === 'merging') {
    const mergingSelection = selectCurrentMergingPullRequestAttachment(selectionCandidates);
    if (mergingSelection) {
      const mergingSelectionAttachments = [
        mergingSelection.current,
        ...mergingSelection.historical,
        ...mergingSelection.conflicting
      ].map((candidate) => candidate.attachment);
      return {
        current: mergingSelection.current.attachment,
        historical: mergingSelection.historical.map((candidate) => candidate.attachment),
        conflicting: appendUniqueIssuePullRequestAttachments(
          mergingSelection.conflicting.map((candidate) => candidate.attachment),
          ownershipConflictingAttachments
        ),
        unknown: excludeIssuePullRequestAttachments(
          activeOwned.length === 0 ? carriedUnknownAttachments : unknownAttachments,
          mergingSelectionAttachments
        )
      };
    }
  }
  if (workflowState.normalizedState !== 'merging' && active.length === 1) {
    const historicalAttachments = terminal.map((candidate) => candidate.attachment);
    return {
      current: active[0]!.attachment,
      historical: historicalAttachments,
      conflicting: appendUniqueIssuePullRequestAttachments([], ownershipConflictingAttachments),
      unknown: excludeIssuePullRequestAttachments(unknownAttachments, [
        active[0]!.attachment,
        ...historicalAttachments
      ])
    };
  }
  if (active.length === 0) {
    if (workflowState.normalizedState !== 'rework') {
      const terminalSelection = selectCurrentMergingPullRequestAttachment(selectionCandidates);
      if (terminalSelection) {
        const selectedAttachments = [
          terminalSelection.current.attachment,
          ...terminalSelection.historical.map((candidate) => candidate.attachment),
          ...terminalSelection.conflicting.map((candidate) => candidate.attachment)
        ];
        return {
          current: terminalSelection.current.attachment,
          historical: terminalSelection.historical.map((candidate) => candidate.attachment),
          conflicting: appendUniqueIssuePullRequestAttachments(
            terminalSelection.conflicting.map((candidate) => candidate.attachment),
            ownershipConflictingAttachments
          ),
          unknown: excludeIssuePullRequestAttachments(unknownAttachments, selectedAttachments)
        };
      }
    }
    const historicalAttachments = terminal.map((candidate) => candidate.attachment);
    return {
      current: null,
      historical: historicalAttachments,
      conflicting: appendUniqueIssuePullRequestAttachments([], ownershipConflictingAttachments),
      unknown: excludeIssuePullRequestAttachments(unknownAttachments, historicalAttachments)
    };
  }
  const historicalAttachments = terminal.map((candidate) => candidate.attachment);
  const conflictingAttachments = appendUniqueIssuePullRequestAttachments(
    active.map((candidate) => candidate.attachment),
    ownershipConflictingAttachments
  );
  return {
    current: null,
    historical: historicalAttachments,
    conflicting: conflictingAttachments,
    unknown: excludeIssuePullRequestAttachments(unknownAttachments, [
      ...historicalAttachments,
      ...conflictingAttachments
    ])
  };
}

function classifyIssuePullRequestCandidateOwnership(
  issue: ProviderLinearIssueContext,
  candidate: ProviderLinearIssuePullRequestCandidate
): ProviderLinearIssuePullRequestOwnership {
  return classifyIssuePullRequestEvidenceOwnership(issue, [
    candidate.attachment.title,
    candidate.snapshot.title,
    candidate.snapshot.head_ref_name
  ]);
}

function classifyIssuePullRequestEvidenceOwnership(
  issue: Pick<ProviderLinearIssueContext, 'identifier'>,
  values: readonly (string | null | undefined)[]
): ProviderLinearIssuePullRequestOwnership {
  const issueIdentifier = normalizeIssueIdentifier(issue.identifier);
  if (!issueIdentifier) {
    return 'unknown';
  }
  const rawEvidence = extractIssueIdentifierEvidence(values);
  const evidence = rawEvidence.filter((entry) => {
    if (entry.identifier === issueIdentifier || !isCommonTechnicalIdentifierToken(entry.identifier, entry.prefix)) {
      return true;
    }
    if (entry.strong_issue_owned_position) {
      return true;
    }
    return shouldRetainTechnicalForeignEvidence(issueIdentifier, rawEvidence, entry);
  });
  if (evidence.length === 0) {
    return 'unknown';
  }
  if (evidence.some((entry) => entry.identifier !== issueIdentifier)) {
    return 'foreign';
  }
  if (evidence.some((entry) => entry.identifier === issueIdentifier)) {
    return 'owned';
  }
  return 'unknown';
}

function extractIssueIdentifierEvidence(
  values: readonly (string | null | undefined)[]
): ProviderLinearIssueIdentifierEvidence[] {
  const identifiers = new Map<string, ProviderLinearIssueIdentifierEvidence>();
  const pattern = /\b([A-Z][A-Z0-9]*)-\d+\b(?!\.\d)/gi;
  for (const value of values) {
    const normalized = normalizeOptionalString(value);
    if (!normalized) {
      continue;
    }
    for (const match of normalized.matchAll(pattern)) {
      const prefix = match[0].slice(0, match[0].indexOf('-')).toUpperCase();
      const positionFlags = resolveIssueOwnedIdentifierPositionFlags(normalized, match.index ?? 0, prefix);
      const identifier = normalizeIssueIdentifier(match[0]);
      if (identifier) {
        const existing = identifiers.get(identifier);
        identifiers.set(identifier, {
          identifier,
          prefix,
          issue_owned_position:
            (existing?.issue_owned_position ?? false) || positionFlags.issue_owned_position,
          strong_issue_owned_position:
            (existing?.strong_issue_owned_position ?? false) || positionFlags.strong_issue_owned_position,
          title_prefix_position:
            (existing?.title_prefix_position ?? false) || positionFlags.title_prefix_position
        });
      }
    }
  }
  return [...identifiers.values()];
}

function shouldRetainTechnicalForeignEvidence(
  issueIdentifier: string,
  rawEvidence: readonly ProviderLinearIssueIdentifierEvidence[],
  entry: ProviderLinearIssueIdentifierEvidence
): boolean {
  const issuePrefix = issueIdentifier.slice(0, issueIdentifier.indexOf('-'));
  if (entry.prefix !== 'NODE' || issuePrefix !== entry.prefix || !entry.title_prefix_position) {
    return false;
  }
  return !rawEvidence.some((candidate) => candidate.identifier === issueIdentifier && candidate.prefix === entry.prefix);
}

function resolveIssueOwnedIdentifierPositionFlags(
  value: string,
  index: number,
  prefix: string
): {
  issue_owned_position: boolean;
  strong_issue_owned_position: boolean;
  title_prefix_position: boolean;
} {
  const previous = value[index - 1];
  if (index === 0 || previous === '(' || previous === '[') {
    const strongIssueOwnedPosition = !NON_LINEAR_ISSUE_IDENTIFIER_PREFIXES.has(prefix);
    return {
      issue_owned_position: true,
      strong_issue_owned_position: strongIssueOwnedPosition,
      title_prefix_position: false
    };
  }
  if (previous === '/') {
    const issueOwnedPosition =
      LINEAR_ISSUE_BRANCH_NAMESPACE_SEGMENTS.has(resolvePreviousPathSegment(value, index)) ||
      !NON_LINEAR_ISSUE_IDENTIFIER_PREFIXES.has(prefix);
    return {
      issue_owned_position: issueOwnedPosition,
      strong_issue_owned_position: issueOwnedPosition,
      title_prefix_position: false
    };
  }
  const titlePrefixPosition = LINEAR_ISSUE_OWNER_PREFIX_PATTERN.test(value.slice(0, index));
  return {
    issue_owned_position: titlePrefixPosition,
    strong_issue_owned_position: false,
    title_prefix_position: titlePrefixPosition
  };
}

function resolvePreviousPathSegment(value: string, index: number): string {
  const segmentEnd = Math.max(0, index - 1);
  const previousSlash = value.lastIndexOf('/', segmentEnd - 1);
  return value.slice(previousSlash + 1, segmentEnd).trim().toLowerCase();
}

function isCommonTechnicalIdentifierToken(identifier: string, prefix: string): boolean {
  const suffix = Number(identifier.slice(identifier.indexOf('-') + 1));
  if (!Number.isInteger(suffix) || suffix < 0) {
    return false;
  }
  switch (prefix) {
    case 'GPT':
    case 'ISO':
    case 'RFC':
    case 'SHA':
    case 'TLS':
    case 'UTF':
      return true;
    case 'HTTP':
    case 'HTTPS':
      return suffix >= 100 && suffix <= 599;
    case 'NODE':
      return suffix <= 40;
    default:
      return false;
  }
}

function normalizeIssueIdentifier(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value)?.toUpperCase() ?? null;
  return normalized && /^[A-Z][A-Z0-9]*-\d+$/.test(normalized) ? normalized : null;
}

function appendUniqueIssuePullRequestAttachments(
  left: ProviderLinearWorkflowAttachment[],
  right: ProviderLinearWorkflowAttachment[]
): ProviderLinearWorkflowAttachment[] {
  const seen = new Set<string>();
  const combined: ProviderLinearWorkflowAttachment[] = [];
  for (const attachment of [...left, ...right]) {
    if (seen.has(attachment.id)) {
      continue;
    }
    seen.add(attachment.id);
    combined.push(attachment);
  }
  return combined;
}

function excludeIssuePullRequestAttachments(
  attachments: ProviderLinearWorkflowAttachment[],
  excluded: ProviderLinearWorkflowAttachment[]
): ProviderLinearWorkflowAttachment[] {
  if (attachments.length === 0 || excluded.length === 0) {
    return [...attachments];
  }
  const excludedIds = new Set(excluded.map((attachment) => attachment.id));
  return attachments.filter((attachment) => !excludedIds.has(attachment.id));
}

function selectCurrentMergingPullRequestAttachment(
  candidates: ProviderLinearIssuePullRequestCandidate[]
): {
  current: ProviderLinearIssuePullRequestCandidate;
  historical: ProviderLinearIssuePullRequestCandidate[];
  conflicting: ProviderLinearIssuePullRequestCandidate[];
} | null {
  const terminal = candidates.filter((candidate) => isIssuePullRequestSnapshotTerminal(candidate.snapshot));
  const active = candidates.filter((candidate) => !isIssuePullRequestSnapshotTerminal(candidate.snapshot));
  if (active.length === 1) {
    const current = active[0]!;
    const historical = terminal.filter((candidate) => candidate.attachment.id !== current.attachment.id);
    const historicalIds = new Set(historical.map((candidate) => candidate.attachment.id));
    const conflicting = candidates.filter(
      (candidate) => candidate.attachment.id !== current.attachment.id && !historicalIds.has(candidate.attachment.id)
    );
    if (conflicting.length === 0) {
      return {
        current,
        historical,
        conflicting: []
      };
    }
  }
  const newestTerminal = terminal.reduce<ProviderLinearIssuePullRequestCandidate | null>(
    (currentNewest, candidate) =>
      !currentNewest ||
      isIssuePullRequestSnapshotStrictlyOlderThanSelection(currentNewest.snapshot, candidate.snapshot)
        ? candidate
        : currentNewest,
    null
  );
  if (!newestTerminal) {
    return null;
  }
  const historical = candidates.filter(
    (candidate) =>
      candidate.attachment.id !== newestTerminal.attachment.id &&
      isIssuePullRequestSnapshotStrictlyOlderThanSelection(candidate.snapshot, newestTerminal.snapshot)
  );
  const conflicting = candidates.filter(
    (candidate) => candidate.attachment.id !== newestTerminal.attachment.id && !historical.includes(candidate)
  );
  if (conflicting.length > 0) {
    return null;
  }
  return {
    current: newestTerminal,
    historical,
    conflicting: []
  };
}

function isIssuePullRequestSnapshotTerminal(snapshot: {
  state: string | null;
  merged_at: string | null;
}): boolean {
  return snapshot.merged_at !== null || snapshot.state === 'MERGED' || snapshot.state === 'CLOSED';
}

function isIssuePullRequestSnapshotStrictlyOlderThanSelection(
  candidate: {
    merged_at: string | null;
    updated_at: string | null;
  },
  selected: {
    merged_at: string | null;
    updated_at: string | null;
  }
): boolean {
  const candidateTimestamp = resolveIssuePullRequestSnapshotTimestamp(candidate);
  const selectedTimestamp = resolveIssuePullRequestSnapshotTimestamp(selected);
  if (candidateTimestamp === null || selectedTimestamp === null) {
    return false;
  }
  return candidateTimestamp < selectedTimestamp;
}

function resolveIssuePullRequestSnapshotTimestamp(snapshot: {
  merged_at: string | null;
  updated_at: string | null;
}): number | null {
  const preferredTimestamp = snapshot.merged_at ?? snapshot.updated_at;
  const parsed = Date.parse(preferredTimestamp ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

export async function upsertProviderLinearWorkpadComment(input: {
  issueId: string;
  body: string;
  bodyFilePath?: string | null;
  commentId?: string | null;
  sourceSetup?: DispatchPilotSourceSetup | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<ProviderLinearUpsertWorkpadResult> {
  const issueId = normalizeRequiredString(input.issueId);
  if (!issueId) {
    return failure('upsert-workpad', 'linear_issue_id_missing', 'Linear issue id is required.', 422);
  }

  const body = normalizeRequiredString(input.body);
  if (!body) {
    return failure('upsert-workpad', 'workpad_body_missing', 'Workpad body is required.', 422);
  }
  if (!hasWorkpadMarker(body)) {
    return failure(
      'upsert-workpad',
      'workpad_marker_missing',
      `Workpad body must contain "${LINEAR_WORKPAD_MARKER}".`,
      422
    );
  }

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failureFromWorkflowError('upsert-workpad', session.error);
  }

  const cachedRecord = await readCachedIssueContextRecord(input.env, issueId, session.session.sourceSetup);
  const cachedContext = cachedRecord?.issue ?? null;
  const canTrustCachedMutationContext = cachedRecord !== null && isIssueContextCacheRecordFresh(cachedRecord);
  const budgetError = await preflightProviderLinearBudget({
    session: session.session,
    operation: 'upsert-workpad',
    minimumRequestsRemaining: 1,
    allowBelowRequestReserve: true
  });
  if (budgetError) {
    return failureFromWorkflowError('upsert-workpad', budgetError);
  }
  let allowBelowRequestReserveForRead = true;
  const readWorkpadIssueContext = () => {
    const allowBelowRequestReserve = allowBelowRequestReserveForRead;
    allowBelowRequestReserveForRead = false;
    return readIssueContext(session.session, 'upsert-workpad', issueId, {
      includeAttachments: false,
      allowBelowRequestReserve
    });
  };
  const context = cachedContext
    ? {
        ok: true as const,
        issue: cachedContext
      }
    : await readWorkpadIssueContext();
  if (!context.ok) {
    return failureFromWorkflowError('upsert-workpad', context.error);
  }

  let issueContext = context.issue;
  let issueContextFreshForMutation = cachedContext === null;
  const revalidatedCachedMutability =
    cachedContext && issueHasMutabilityBlock(issueContext)
      ? await readWorkpadIssueContext()
      : null;
  if (revalidatedCachedMutability && !revalidatedCachedMutability.ok) {
    return failureFromWorkflowError('upsert-workpad', revalidatedCachedMutability.error);
  }
  if (revalidatedCachedMutability?.ok) {
    issueContext = revalidatedCachedMutability.issue;
    issueContextFreshForMutation = true;
  }
  if (cachedContext && !canTrustCachedMutationContext && !revalidatedCachedMutability) {
    // Re-read live comment state before any mutation so cached workpad ids cannot
    // cause duplicate comments or updates against deleted/replaced workpads.
    const liveContext = await readWorkpadIssueContext();
    if (!liveContext.ok) {
      return failureFromWorkflowError('upsert-workpad', liveContext.error);
    }
    issueContext = liveContext.issue;
    issueContextFreshForMutation = true;
  }

  const requestedCommentId = normalizeRequiredString(input.commentId ?? null);
  const localImageReferences = extractLocalMarkdownImageReferences(body, input.bodyFilePath ?? null);
  const bodyHasLocalImageReferences = localImageReferences.length > 0;
  const cachedEmbeddedWorkpad = cachedRecord?.embedded_workpad ?? null;
  const resolveWorkpadMutationContext = (
    currentIssueContext: ProviderLinearIssueContext
  ):
    | {
        ok: true;
        comment: ProviderLinearWorkflowComment | null;
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      } => {
    const workpadValidation = validateWorkpadBodyContract(body, currentIssueContext.description);
    if (!workpadValidation.ok) {
      return {
        ok: false,
        error: {
          code: workpadValidation.error.code,
          message: workpadValidation.error.message,
          status: workpadValidation.error.status,
          details: workpadValidation.error.details
        }
      };
    }
    return resolveSelectedWorkpadComment(currentIssueContext, requestedCommentId);
  };

  let selectedCommentResult = resolveWorkpadMutationContext(issueContext);
  if (!selectedCommentResult.ok) {
    return failure(
      'upsert-workpad',
      selectedCommentResult.error.code,
      selectedCommentResult.error.message,
      selectedCommentResult.error.status,
      selectedCommentResult.error.details
    );
  }
  let selectedComment = selectedCommentResult.comment;
  const localImageCacheEntriesResult = bodyHasLocalImageReferences
    ? await readEmbeddedWorkpadLocalImageCacheEntries({
        references: localImageReferences
      })
    : {
        ok: true as const,
        local_images: [] as ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[]
      };
  if (!localImageCacheEntriesResult.ok) {
    return failureFromWorkflowError('upsert-workpad', localImageCacheEntriesResult.error);
  }
  const currentLocalImageCacheEntries = localImageCacheEntriesResult.local_images;
  const shouldRevalidateCachedNoop = Boolean(
    !issueContextFreshForMutation &&
    selectedComment &&
    cachedContext &&
    canTrustCachedMutationContext &&
    (
      (!bodyHasLocalImageReferences && selectedComment.body === body)
      || resolveEmbeddedWorkpadNoopCache({
        cachedWorkpad: cachedEmbeddedWorkpad,
        comment: selectedComment,
        originalBody: body,
        localImages: currentLocalImageCacheEntries
      }) !== null
    )
  );

  if (shouldRevalidateCachedNoop) {
    const liveContext = await readWorkpadIssueContext();
    if (!liveContext.ok) {
      return failureFromWorkflowError('upsert-workpad', liveContext.error);
    }
    issueContext = liveContext.issue;
    issueContextFreshForMutation = true;
    selectedCommentResult = resolveWorkpadMutationContext(issueContext);
    if (!selectedCommentResult.ok) {
      return failure(
        'upsert-workpad',
        selectedCommentResult.error.code,
        selectedCommentResult.error.message,
        selectedCommentResult.error.status,
        selectedCommentResult.error.details
      );
    }
    selectedComment = selectedCommentResult.comment;
  }

  if (selectedComment && !bodyHasLocalImageReferences && selectedComment.body === body) {
    await writeCachedIssueContextRecord(input.env, issueContext, session.session.sourceSetup, {
      embeddedWorkpad: null,
      preserveExistingAttachmentTruthWhenEmpty: true,
      preserveRecordedAtWhenAttachmentTruthUnchanged: true
    });
    return {
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      issue: {
        id: issueContext.id,
        identifier: issueContext.identifier
      },
      comment: selectedComment,
      source_setup: session.session.sourceSetup
    };
  }
  const matchingEmbeddedWorkpadNoopCache = resolveEmbeddedWorkpadNoopCache({
    cachedWorkpad: cachedEmbeddedWorkpad,
    comment: selectedComment,
    originalBody: body,
    localImages: currentLocalImageCacheEntries
  });
  if (selectedComment && matchingEmbeddedWorkpadNoopCache) {
    await writeCachedIssueContextRecord(input.env, issueContext, session.session.sourceSetup, {
      embeddedWorkpad: matchingEmbeddedWorkpadNoopCache,
      preserveExistingAttachmentTruthWhenEmpty: true,
      preserveRecordedAtWhenAttachmentTruthUnchanged: true
    });
    return {
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      issue: {
        id: issueContext.id,
        identifier: issueContext.identifier
      },
      comment: selectedComment,
      source_setup: session.session.sourceSetup
    };
  }

  if (!issueContextFreshForMutation) {
    const liveContext = await readWorkpadIssueContext();
    if (!liveContext.ok) {
      return failureFromWorkflowError('upsert-workpad', liveContext.error);
    }
    issueContext = liveContext.issue;
    issueContextFreshForMutation = true;
    selectedCommentResult = resolveWorkpadMutationContext(issueContext);
    if (!selectedCommentResult.ok) {
      return failure(
        'upsert-workpad',
        selectedCommentResult.error.code,
        selectedCommentResult.error.message,
        selectedCommentResult.error.status,
        selectedCommentResult.error.details
      );
    }
    selectedComment = selectedCommentResult.comment;
    if (selectedComment && !bodyHasLocalImageReferences && selectedComment.body === body) {
      await writeCachedIssueContextRecord(input.env, issueContext, session.session.sourceSetup, {
        embeddedWorkpad: null,
        preserveExistingAttachmentTruthWhenEmpty: true,
        preserveRecordedAtWhenAttachmentTruthUnchanged: true
      });
      return {
        ok: true,
        operation: 'upsert-workpad',
        action: 'noop',
        issue: {
          id: issueContext.id,
          identifier: issueContext.identifier
        },
        comment: selectedComment,
        source_setup: session.session.sourceSetup
      };
    }
    const liveMatchingEmbeddedWorkpadNoopCache = resolveEmbeddedWorkpadNoopCache({
      cachedWorkpad: cachedEmbeddedWorkpad,
      comment: selectedComment,
      originalBody: body,
      localImages: currentLocalImageCacheEntries
    });
    if (selectedComment && liveMatchingEmbeddedWorkpadNoopCache) {
      await writeCachedIssueContextRecord(input.env, issueContext, session.session.sourceSetup, {
        embeddedWorkpad: liveMatchingEmbeddedWorkpadNoopCache,
        preserveExistingAttachmentTruthWhenEmpty: true,
        preserveRecordedAtWhenAttachmentTruthUnchanged: true
      });
      return {
        ok: true,
        operation: 'upsert-workpad',
        action: 'noop',
        issue: {
          id: issueContext.id,
          identifier: issueContext.identifier
        },
        comment: selectedComment,
        source_setup: session.session.sourceSetup
      };
    }
  }

  const mutabilityFailure = failureIfIssueNotMutable('upsert-workpad', issueContext);
  if (mutabilityFailure) {
    return mutabilityFailure;
  }

  const resolvedEmbeddedWorkpad = bodyHasLocalImageReferences
    ? await resolveEmbeddedLinearWorkpadAssets({
        session: session.session,
        operation: 'upsert-workpad',
        body,
        references: localImageReferences
      })
    : {
        ok: true as const,
        body,
        embedded_assets: [] as ProviderLinearEmbeddedAsset[]
      };
  if (!resolvedEmbeddedWorkpad.ok) {
    return failureFromWorkflowError('upsert-workpad', resolvedEmbeddedWorkpad.error);
  }
  const resolvedBody = resolvedEmbeddedWorkpad.body;
  const embeddedAssets = resolvedEmbeddedWorkpad.embedded_assets;

  if (selectedComment) {
    const updateResult = await executeProviderLinearGraphql<CommentMutationResponse>({
      session: session.session,
      operation: 'upsert-workpad',
      step: 'update-comment',
      query: buildUpdateCommentMutation(),
      variables: {
        id: selectedComment.id,
        body: resolvedBody
      }
    });
    if (!updateResult.ok) {
      return failureFromWorkflowError('upsert-workpad', updateResult.error);
    }
    const updatedComment = parseMutatedComment(
      updateResult.payload.data?.commentUpdate?.comment ?? null,
      resolvedBody
    );
    if (updateResult.payload.data?.commentUpdate?.success !== true || !updatedComment) {
      return failure('upsert-workpad', 'comment_update_failed', 'Linear comment update did not succeed.', 503);
    }
    await writeCachedIssueContextRecord(
      input.env,
      upsertIssueContextWorkpadComment(issueContext, updatedComment),
      session.session.sourceSetup,
      {
        embeddedWorkpad: buildEmbeddedWorkpadCacheRecord({
          commentId: updatedComment.id,
          originalBody: body,
          resolvedBody,
          localImages: currentLocalImageCacheEntries
        }),
        preserveExistingAttachmentTruthWhenEmpty: true,
        preserveRecordedAtWhenAttachmentTruthUnchanged: true
      }
    );
    return {
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: issueContext.id,
        identifier: issueContext.identifier
      },
      comment: updatedComment,
      ...(embeddedAssets.length > 0 ? { embedded_assets: embeddedAssets } : {}),
      source_setup: session.session.sourceSetup
    };
  }

  const createResult = await executeProviderLinearGraphql<CommentMutationResponse>({
    session: session.session,
    operation: 'upsert-workpad',
    step: 'create-comment',
    query: buildCreateCommentMutation(),
    variables: {
      issueId: issueContext.id,
      body: resolvedBody
    }
  });
  if (!createResult.ok) {
    return failureFromWorkflowError('upsert-workpad', createResult.error);
  }
  const createdComment = parseMutatedComment(
    createResult.payload.data?.commentCreate?.comment ?? null,
    resolvedBody
  );
  if (createResult.payload.data?.commentCreate?.success !== true || !createdComment) {
    return failure('upsert-workpad', 'comment_create_failed', 'Linear comment creation did not succeed.', 503);
  }

  await writeCachedIssueContextRecord(
    input.env,
    upsertIssueContextWorkpadComment(issueContext, createdComment),
    session.session.sourceSetup,
    {
      embeddedWorkpad: buildEmbeddedWorkpadCacheRecord({
        commentId: createdComment.id,
        originalBody: body,
        resolvedBody,
        localImages: currentLocalImageCacheEntries
      }),
      preserveExistingAttachmentTruthWhenEmpty: true,
      preserveRecordedAtWhenAttachmentTruthUnchanged: true
    }
  );
  return {
    ok: true,
    operation: 'upsert-workpad',
    action: 'created',
    issue: {
      id: issueContext.id,
      identifier: issueContext.identifier
    },
    comment: createdComment,
    ...(embeddedAssets.length > 0 ? { embedded_assets: embeddedAssets } : {}),
    source_setup: session.session.sourceSetup
  };
}

export async function deleteProviderLinearWorkpadComment(input: {
  issueId: string;
  commentId?: string | null;
  sourceSetup?: DispatchPilotSourceSetup | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<ProviderLinearDeleteWorkpadResult> {
  const issueId = normalizeRequiredString(input.issueId);
  if (!issueId) {
    return failure('delete-workpad', 'linear_issue_id_missing', 'Linear issue id is required.', 422);
  }

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failureFromWorkflowError('delete-workpad', session.error);
  }

  const budgetError = await preflightProviderLinearBudget({
    session: session.session,
    operation: 'delete-workpad',
    minimumRequestsRemaining: 1,
    allowBelowRequestReserve: true
  });
  if (budgetError) {
    return failureFromWorkflowError('delete-workpad', budgetError);
  }

  const context = await readIssueContext(session.session, 'delete-workpad', issueId, {
    includeAttachments: false,
    allowBelowRequestReserve: true
  });
  if (!context.ok) {
    return failureFromWorkflowError('delete-workpad', context.error);
  }

  const requestedCommentId = normalizeRequiredString(input.commentId ?? null);
  let selectedComment: ProviderLinearWorkflowComment | null;
  if (requestedCommentId) {
    selectedComment =
      context.issue.comments.find(
        (entry) =>
          entry.id === requestedCommentId &&
          entry.resolved_at === null &&
          hasWorkpadMarker(entry.body)
      ) ?? null;
    if (!selectedComment) {
      return failure(
        'delete-workpad',
        'linear_workpad_comment_id_invalid',
        'Comment id must reference an unresolved Codex workpad comment.',
        422,
        {
          comment_id: requestedCommentId
        }
      );
    }
  } else {
    const unresolvedWorkpads = findUnresolvedWorkpadComments(context.issue.comments);
    if (unresolvedWorkpads.length > 1) {
      return failure(
        'delete-workpad',
        'ambiguous_workpad_state',
        'Multiple unresolved Codex workpad comments exist; provide comment_id to delete one explicitly.',
        409,
        {
          comment_ids: unresolvedWorkpads.map((entry) => entry.id)
        }
      );
    }
    selectedComment = unresolvedWorkpads[0] ?? null;
  }

  if (!selectedComment) {
    await writeCachedIssueContextRecord(input.env, context.issue, session.session.sourceSetup, {
      embeddedWorkpad: null,
      preserveExistingAttachmentTruthWhenEmpty: true,
      preserveRecordedAtWhenAttachmentTruthUnchanged: true
    });
    return {
      ok: true,
      operation: 'delete-workpad',
      action: 'noop',
      issue: {
        id: context.issue.id,
        identifier: context.issue.identifier
      },
      comment_id: null,
      source_setup: session.session.sourceSetup
    };
  }

  const deleteBudgetError = await preflightProviderLinearBudget({
    session: session.session,
    operation: 'delete-workpad',
    minimumRequestsRemaining: 1
  });
  if (deleteBudgetError) {
    return failureFromWorkflowError('delete-workpad', deleteBudgetError);
  }

  const deleteResult = await executeProviderLinearGraphql<DeleteMutationResponse>({
    session: session.session,
    operation: 'delete-workpad',
    step: 'delete-comment',
    query: buildDeleteCommentMutation(),
    variables: {
      id: selectedComment.id
    }
  });
  if (!deleteResult.ok) {
    return failureFromWorkflowError('delete-workpad', deleteResult.error);
  }

  const rawDeletedCommentId = normalizeRequiredString(deleteResult.payload.data?.commentDelete?.entityId);
  if (
    deleteResult.payload.data?.commentDelete?.success !== true &&
    rawDeletedCommentId !== selectedComment.id
  ) {
    return failure(
      'delete-workpad',
      'comment_delete_failed',
      'Linear comment delete did not succeed.',
      503
    );
  }
  const deletedCommentId = rawDeletedCommentId ?? selectedComment.id;

  await writeCachedIssueContextRecord(
    input.env,
    removeIssueContextComment(context.issue, deletedCommentId),
    session.session.sourceSetup,
    {
      embeddedWorkpad: null,
      preserveExistingAttachmentTruthWhenEmpty: true,
      preserveRecordedAtWhenAttachmentTruthUnchanged: true
    }
  );
  return {
    ok: true,
    operation: 'delete-workpad',
    action: 'deleted',
    issue: {
      id: context.issue.id,
      identifier: context.issue.identifier
    },
    comment_id: deletedCommentId,
    source_setup: session.session.sourceSetup
  };
}

export async function transitionProviderLinearIssueState(input: {
  issueId: string;
  stateName: string;
  expectedStateName?: string | null;
  expectedStateType?: string | null;
  expectedUpdatedAt?: string | null;
  force?: boolean;
  forceReason?: string | null;
  sourceSetup?: DispatchPilotSourceSetup | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<ProviderLinearTransitionResult> {
  const issueId = normalizeRequiredString(input.issueId);
  if (!issueId) {
    return failure('transition', 'linear_issue_id_missing', 'Linear issue id is required.', 422);
  }
  const stateName = normalizeRequiredString(input.stateName);
  if (!stateName) {
    return failure('transition', 'linear_state_name_missing', 'Linear state name is required.', 422);
  }
  const transitionGuard = resolveTransitionGuardInput(input);
  if (!transitionGuard.ok) {
    return transitionGuard;
  }
  const transitionGuardAudit = shouldIncludeTransitionGuardAudit(transitionGuard.guard)
    ? buildTransitionGuardAudit(transitionGuard.guard)
    : null;

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failureFromWorkflowError('transition', session.error);
  }

  const cachedRecord = await readCachedIssueContextRecord(input.env, issueId, session.session.sourceSetup);
  const cachedContext = cachedRecord?.issue ?? null;
  const canTrustCachedMutationContext = cachedRecord !== null && isIssueContextCacheRecordFresh(cachedRecord);
  const budgetError = await preflightProviderLinearBudget({
    session: session.session,
    operation: 'transition',
    minimumRequestsRemaining: 1,
    allowBelowRequestReserve: true
  });
  if (budgetError) {
    return failureFromWorkflowError('transition', budgetError);
  }
  let allowBelowRequestReserveForSummaryRead = true;
  const readTransitionIssueSummary = () => {
    const allowBelowRequestReserve = allowBelowRequestReserveForSummaryRead;
    allowBelowRequestReserveForSummaryRead = false;
    return readIssueSummary(session.session, 'transition', issueId, {
      allowBelowRequestReserve
    });
  };
  const initialSummary = cachedContext
    ? {
        ok: true as const,
        issue: summarizeIssueContext(cachedContext)
      }
    : await readTransitionIssueSummary();
  if (!initialSummary.ok) {
    return failureFromWorkflowError('transition', initialSummary.error);
  }

  let summary = initialSummary.issue;
  let cacheContext = cachedContext;
  let summaryFreshForTransition = cachedContext === null;
  const revalidatedCachedMutability =
    cachedContext && issueHasMutabilityBlock(summary)
      ? await readTransitionIssueSummary()
      : null;
  if (revalidatedCachedMutability && !revalidatedCachedMutability.ok) {
    return failureFromWorkflowError('transition', revalidatedCachedMutability.error);
  }
  if (revalidatedCachedMutability?.ok && cachedContext) {
    summary = revalidatedCachedMutability.issue;
    cacheContext = mergeCachedIssueContextSummary(cachedContext, summary);
    summaryFreshForTransition = true;
  }
  if (cachedContext && !canTrustCachedMutationContext && !revalidatedCachedMutability) {
    const liveSummary = await readTransitionIssueSummary();
    if (!liveSummary.ok) {
      return failureFromWorkflowError('transition', liveSummary.error);
    }
    summary = liveSummary.issue;
    cacheContext = mergeCachedIssueContextSummary(cachedContext, summary);
    summaryFreshForTransition = true;
  }

  let targetState = resolveWorkflowStateByName(summary.team?.states ?? [], stateName);
  if (!targetState && cachedContext && canTrustCachedMutationContext && !summaryFreshForTransition) {
    const liveSummary = await readTransitionIssueSummary();
    if (!liveSummary.ok) {
      return failureFromWorkflowError('transition', liveSummary.error);
    }
    summary = liveSummary.issue;
    cacheContext = mergeCachedIssueContextSummary(cachedContext, summary);
    summaryFreshForTransition = true;
    targetState = resolveWorkflowStateByName(summary.team?.states ?? [], stateName);
  }
  if (!targetState) {
    return failure(
      'transition',
      'linear_state_not_found',
      `Linear team state "${stateName}" was not found for issue ${summary.identifier}.`,
      422
    );
  }

  if (!summaryFreshForTransition) {
    const liveSummary = await readTransitionIssueSummary();
    if (!liveSummary.ok) {
      return failureFromWorkflowError('transition', liveSummary.error);
    }
    summary = liveSummary.issue;
    cacheContext = cacheContext ? mergeCachedIssueContextSummary(cacheContext, summary) : null;
    summaryFreshForTransition = true;
    targetState = resolveWorkflowStateByName(summary.team?.states ?? [], stateName);
    if (!targetState) {
      return failure(
        'transition',
        'linear_state_not_found',
        `Linear team state "${stateName}" was not found for issue ${summary.identifier}.`,
        422
      );
    }
  }

  const preconditionConflict = failureIfTransitionPreconditionsMismatch(
    summary,
    targetState,
    transitionGuard.guard
  );
  if (preconditionConflict) {
    return preconditionConflict;
  }

  if (sameWorkflowState(summary.state, targetState)) {
    return {
      ok: true,
      operation: 'transition',
      action: 'noop',
      issue: {
        id: summary.id,
        identifier: summary.identifier,
        state: summary.state,
        updated_at: summary.updated_at
      },
      previous_state: summary.state,
      target_state: targetState,
      ...(transitionGuardAudit ? { transition_guard: transitionGuardAudit } : {}),
      source_setup: session.session.sourceSetup
    };
  }

  const mutabilityFailure = failureIfIssueNotMutable('transition', summary);
  if (mutabilityFailure) {
    return mutabilityFailure;
  }

  const forceGuardFailure = failureIfTerminalTransitionRequiresForce(
    summary,
    targetState,
    transitionGuard.guard
  );
  if (forceGuardFailure) {
    return forceGuardFailure;
  }

  const transitionBudgetError = await preflightProviderLinearBudget({
    session: session.session,
    operation: 'transition',
    minimumRequestsRemaining: 1
  });
  if (transitionBudgetError) {
    return failureFromWorkflowError('transition', transitionBudgetError);
  }

  const transitionResult = await executeProviderLinearGraphql<IssueTransitionMutationResponse>({
    session: session.session,
    operation: 'transition',
    step: 'update-state',
    query: buildIssueTransitionMutation(),
    variables: {
      id: summary.id,
      stateId: targetState.id
    }
  });
  if (!transitionResult.ok) {
    return failureFromWorkflowError('transition', transitionResult.error);
  }

  const issue = transitionResult.payload.data?.issueUpdate?.issue ?? null;
  const updatedState = parseWorkflowState(issue?.state ?? null);
  if (
    transitionResult.payload.data?.issueUpdate?.success !== true ||
    !normalizeRequiredString(issue?.id) ||
    !normalizeRequiredString(issue?.identifier)
  ) {
    return failure('transition', 'linear_state_transition_failed', 'Linear issue state transition did not succeed.', 503);
  }

  const transitionedUpdatedAt = normalizeIso(issue?.updatedAt as string | null | undefined);
  if (cacheContext && canTrustCachedMutationContext) {
    await writeCachedIssueContextRecord(
      input.env,
      {
        ...cacheContext,
        state: updatedState,
        updated_at: transitionedUpdatedAt
      },
      session.session.sourceSetup
    );
  }
  return {
    ok: true,
    operation: 'transition',
    action: 'updated',
    issue: {
      id: normalizeRequiredString(issue?.id)!,
      identifier: normalizeRequiredString(issue?.identifier)!,
      state: updatedState,
      updated_at: transitionedUpdatedAt
    },
    previous_state: summary.state,
    target_state: targetState,
    ...(transitionGuardAudit ? { transition_guard: transitionGuardAudit } : {}),
    source_setup: session.session.sourceSetup
  };
}

export async function attachProviderLinearIssuePr(input: {
  issueId: string;
  url: string;
  title?: string | null;
  sourceSetup?: DispatchPilotSourceSetup | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<ProviderLinearAttachPrResult> {
  const issueId = normalizeRequiredString(input.issueId);
  if (!issueId) {
    return failure('attach-pr', 'linear_issue_id_missing', 'Linear issue id is required.', 422);
  }
  const url = normalizeRequiredString(input.url);
  if (!url) {
    return failure('attach-pr', 'linear_pr_url_missing', 'PR URL is required.', 422);
  }
  const parsedPullRequestUrl = parseGitHubPullRequestUrl(url);
  if (!parsedPullRequestUrl) {
    return failure(
      'attach-pr',
      'linear_pr_url_invalid',
      'PR URL must be a GitHub pull request URL.',
      422
    );
  }

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failureFromWorkflowError('attach-pr', session.error);
  }

  const budgetError = await preflightProviderLinearBudget({
    session: session.session,
    operation: 'attach-pr',
    minimumRequestsRemaining: 1,
    allowBelowRequestReserve: true
  });
  if (budgetError) {
    return failureFromWorkflowError('attach-pr', budgetError);
  }

  const context = await readIssueContext(session.session, 'attach-pr', issueId, {
    includeComments: false,
    allowBelowRequestReserve: true
  });
  if (!context.ok) {
    return failureFromWorkflowError('attach-pr', context.error);
  }

  const existingAttachment =
    context.issue.attachments.find(
      (entry) => parseGitHubPullRequestUrl(entry.url)?.comparisonKey === parsedPullRequestUrl.comparisonKey
    ) ?? null;
  if (existingAttachment) {
    return {
      ok: true,
      operation: 'attach-pr',
      action: 'noop',
      via: 'existing',
      issue: {
        id: context.issue.id,
        identifier: context.issue.identifier
      },
      attachment: existingAttachment,
      source_setup: session.session.sourceSetup
    };
  }

  const mutabilityFailure = failureIfIssueNotMutable('attach-pr', context.issue);
  if (mutabilityFailure) {
    return mutabilityFailure;
  }

  const attachBudgetError = await preflightProviderLinearBudget({
    session: session.session,
    operation: 'attach-pr',
    minimumRequestsRemaining: 2
  });
  if (attachBudgetError) {
    return failureFromWorkflowError('attach-pr', attachBudgetError);
  }

  const title = normalizeOptionalString(input.title ?? null);
  const githubResult = await executeProviderLinearGraphql<AttachmentMutationResponse>({
    session: session.session,
    operation: 'attach-pr',
    step: 'attach-github-pr',
    query: buildAttachGithubPrMutation(),
    variables: {
      issueId: context.issue.id,
      url: parsedPullRequestUrl.canonicalUrl,
      title
    }
  });

  if (githubResult.ok) {
    const attachment = parseAttachment(githubResult.payload.data?.attachmentLinkGitHubPR?.attachment ?? null);
    if (githubResult.payload.data?.attachmentLinkGitHubPR?.success === true && attachment) {
      return {
        ok: true,
        operation: 'attach-pr',
        action: 'attached',
        via: 'github_pr',
        issue: {
          id: context.issue.id,
          identifier: context.issue.identifier
        },
        attachment,
        source_setup: session.session.sourceSetup
      };
    }
  } else if (githubResult.error.code !== 'linear_rate_limited' && !shouldFallbackToUrlAttachmentFromWorkflowError(githubResult.error)) {
    return failureFromWorkflowError('attach-pr', githubResult.error);
  } else if (githubResult.error.code === 'linear_rate_limited') {
    return failureFromWorkflowError('attach-pr', githubResult.error);
  }

  const urlResult = await executeProviderLinearGraphql<AttachmentMutationResponse>({
    session: session.session,
    operation: 'attach-pr',
    step: 'attach-url',
    query: buildAttachUrlMutation(),
    variables: {
      issueId: context.issue.id,
      url: parsedPullRequestUrl.canonicalUrl,
      title: title ?? parsedPullRequestUrl.canonicalUrl
    }
  });
  if (!urlResult.ok) {
    return failureFromWorkflowError('attach-pr', urlResult.error);
  }

  const attachment = parseAttachment(urlResult.payload.data?.attachmentLinkURL?.attachment ?? null);
  if (urlResult.payload.data?.attachmentLinkURL?.success !== true || !attachment) {
    return failure('attach-pr', 'linear_attachment_failed', 'Linear PR attachment did not succeed.', 503);
  }

  return {
    ok: true,
    operation: 'attach-pr',
    action: 'attached',
    via: 'url',
    issue: {
      id: context.issue.id,
      identifier: context.issue.identifier
    },
    attachment,
    source_setup: session.session.sourceSetup
  };
}

export async function createProviderLinearFollowUpIssue(input: {
  issueId: string;
  title: string;
  description: string;
  intentChecksum: string;
  nonGoals: string;
  notDoneIf: string;
  acceptanceCriteria: string;
  parityLane?: boolean;
  parityMatrix?: string | null;
  canonicalOwnerKey?: string | null;
  blockedBySource?: boolean;
  repoRoot?: string | null;
  sourceSetup?: DispatchPilotSourceSetup | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<ProviderLinearCreateFollowUpResult> {
  const issueId = normalizeRequiredString(input.issueId);
  if (!issueId) {
    return failure('create-follow-up', 'linear_issue_id_missing', 'Linear issue id is required.', 422);
  }
  const title = normalizeRequiredString(input.title);
  if (!title) {
    return failure('create-follow-up', 'linear_follow_up_title_missing', 'Follow-up issue title is required.', 422);
  }
  const description = normalizeRequiredString(input.description);
  if (!description) {
    return failure(
      'create-follow-up',
      'linear_follow_up_description_missing',
      'Follow-up issue description is required.',
      422
    );
  }
  const intentChecksum = normalizeRequiredString(input.intentChecksum);
  if (!intentChecksum) {
    return failure(
      'create-follow-up',
      'linear_follow_up_intent_checksum_missing',
      'Follow-up issue intent checksum is required.',
      422
    );
  }
  const nonGoals = normalizeRequiredString(input.nonGoals);
  if (!nonGoals) {
    return failure(
      'create-follow-up',
      'linear_follow_up_non_goals_missing',
      'Follow-up issue non-goals are required.',
      422
    );
  }
  const notDoneIf = normalizeRequiredString(input.notDoneIf);
  if (!notDoneIf) {
    return failure(
      'create-follow-up',
      'linear_follow_up_not_done_if_missing',
      'Follow-up issue Not Done If block is required.',
      422
    );
  }
  const acceptanceCriteria = normalizeRequiredString(input.acceptanceCriteria);
  if (!acceptanceCriteria) {
    return failure(
      'create-follow-up',
      'linear_follow_up_acceptance_criteria_missing',
      'Follow-up issue acceptance criteria are required.',
      422
    );
  }
  const parityLane = input.parityLane === true;
  const parityMatrix = normalizeOptionalString(input.parityMatrix ?? null);
  if (parityLane && !parityMatrix) {
    return failure(
      'create-follow-up',
      'linear_follow_up_parity_matrix_missing',
      'Parity/alignment follow-up issues require a parity matrix.',
      422
    );
  }
  const canonicalOwnerKey = normalizeOptionalString(input.canonicalOwnerKey ?? null);
  if (canonicalOwnerKey && /[\r\n]/u.test(canonicalOwnerKey)) {
    return failure(
      'create-follow-up',
      'linear_follow_up_canonical_owner_key_invalid',
      'Follow-up canonical owner key must be a single line.',
      422
    );
  }
  if (canonicalOwnerKey && canonicalOwnerKey.length > 512) {
    return failure(
      'create-follow-up',
      'linear_follow_up_canonical_owner_key_too_long',
      'Follow-up canonical owner key must be 512 characters or fewer.',
      422
    );
  }
  const canonicalOwnerMarker = canonicalOwnerKey ? buildCanonicalOwnerMarker(canonicalOwnerKey) : null;
  const canonicalOwnerStamp = canonicalOwnerKey && canonicalOwnerMarker
    ? { key: canonicalOwnerKey, marker: canonicalOwnerMarker }
    : null;
  const blockedBySource = input.blockedBySource === true;

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failureFromWorkflowError('create-follow-up', session.error);
  }

  const budgetError = await preflightProviderLinearBudget({
    session: session.session,
    operation: 'create-follow-up',
    minimumRequestsRemaining: canonicalOwnerKey
      ? (blockedBySource ? 4 : 3)
      : (blockedBySource ? 6 : 5)
  });
  if (budgetError) {
    return failureFromWorkflowError('create-follow-up', budgetError);
  }

  const issueSummary = await readIssueSummary(session.session, 'create-follow-up', issueId);
  if (!issueSummary.ok) {
    return failureFromWorkflowError('create-follow-up', issueSummary.error);
  }

  const teamId = normalizeOptionalString(issueSummary.issue.team?.id);
  if (!teamId) {
    return failure(
      'create-follow-up',
      'linear_follow_up_team_missing',
      `Linear issue ${issueSummary.issue.identifier} is missing a team assignment.`,
      422
    );
  }

  const projectId = normalizeOptionalString(issueSummary.issue.project?.id);
  if (!projectId) {
    return failure(
      'create-follow-up',
      'linear_follow_up_project_missing',
      `Linear issue ${issueSummary.issue.identifier} is missing a project assignment; same-project follow-up creation requires one.`,
      422
    );
  }

  const followUpLabels = resolveFollowUpLabelsFromSourceIssue(issueSummary.issue);
  if (!followUpLabels.ok) {
    return failure(
      'create-follow-up',
      followUpLabels.error.code,
      followUpLabels.error.message,
      followUpLabels.error.status,
      followUpLabels.error.details,
      followUpLabels.error.retryable
    );
  }

  const canonicalOwner = canonicalOwnerKey && canonicalOwnerMarker
    ? await findCanonicalFollowUpOwnerIssue({
        session: session.session,
        teamId,
        projectId,
        marker: canonicalOwnerMarker
      })
    : null;
  if (canonicalOwner && !canonicalOwner.ok) {
    return failureFromWorkflowError('create-follow-up', canonicalOwner.error);
  }
  if (canonicalOwner?.ok && canonicalOwner.issue && canonicalOwnerKey && canonicalOwnerMarker) {
    const ownerReuseRequestsRemaining = countCanonicalOwnerReuseRequests({
      sourceIssue: issueSummary.issue,
      followUpIssue: canonicalOwner.issue,
      requestedLabels: followUpLabels.labels,
      description,
      intentChecksum,
      nonGoals,
      notDoneIf,
      acceptanceCriteria,
      parityMatrix,
      canonicalOwner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      },
      blockedBySource
    });
    if (ownerReuseRequestsRemaining > 0) {
      const ownerReuseBudgetError = await preflightProviderLinearBudget({
        session: session.session,
        operation: 'create-follow-up',
        minimumRequestsRemaining: ownerReuseRequestsRemaining
      });
      if (ownerReuseBudgetError) {
        return failureFromWorkflowError('create-follow-up', ownerReuseBudgetError);
      }
    }

    const tracedOwner = await ensureFollowUpIssueTraceability({
      session: session.session,
      sourceIssue: issueSummary.issue,
      followUpIssue: canonicalOwner.issue,
      requestedLabels: followUpLabels.labels,
      description,
      intentChecksum,
      nonGoals,
      notDoneIf,
      acceptanceCriteria,
      parityMatrix,
      canonicalOwner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      },
      failedStep: 'canonical_owner_traceability_update'
    });
    if (!tracedOwner.ok) {
      return tracedOwner.result;
    }
    const ownerLabelRepairNeeded =
      findMissingFollowUpLabelIds(tracedOwner.issue.labels, followUpLabels.labels).length > 0;
    const labeledOwner = await ensureFollowUpIssueLabels({
      session: session.session,
      followUpIssue: tracedOwner.issue,
      requestedLabels: followUpLabels.labels,
      failedStep: 'canonical_owner_label_update',
      retryableUpdateFailures: true
    });
    if (!labeledOwner.ok) {
      return labeledOwner.result;
    }
    if (ownerLabelRepairNeeded) {
      const traceableLabeledOwner = verifyFollowUpIssueTraceability({
        sourceIssue: issueSummary.issue,
        followUpIssue: labeledOwner.issue,
        acceptedDescription: tracedOwner.issue.description,
        description,
        intentChecksum,
        nonGoals,
        notDoneIf,
        acceptanceCriteria,
        parityMatrix,
        canonicalOwner: {
          key: canonicalOwnerKey,
          marker: canonicalOwnerMarker
        },
        failedStep: 'canonical_owner_label_update'
      });
      if (!traceableLabeledOwner.ok) {
        return traceableLabeledOwner.result;
      }
    }
    const relationResult = await createFollowUpRelations({
      session: session.session,
      sourceIssue: issueSummary.issue,
      followUpIssue: labeledOwner.issue,
      blockedBySource
    });
    if (!relationResult.ok) {
      return relationResult.result;
    }
    return {
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      issue: {
        id: issueSummary.issue.id,
        identifier: issueSummary.issue.identifier
      },
      follow_up_issue: labeledOwner.issue,
      canonical_owner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      },
      relations: {
        related: true,
        blocked_by_source: blockedBySource
      },
      traceability: await buildFollowUpCreationTraceability({
        sourceIssue: issueSummary.issue,
        followUpIssue: labeledOwner.issue,
        requestedLabels: followUpLabels.labels,
        relationEvidence: relationResult.relations,
        repoRoot: input.repoRoot
      }),
      source_setup: session.session.sourceSetup
    };
  }

  const backlogState = resolveWorkflowStateByName(issueSummary.issue.team?.states ?? [], 'Backlog');
  if (!backlogState) {
    return failure(
      'create-follow-up',
      'linear_follow_up_backlog_state_missing',
      `Linear team state "Backlog" was not found for issue ${issueSummary.issue.identifier}.`,
      422
    );
  }

  if (canonicalOwnerKey) {
    const createPathBudgetError = await preflightProviderLinearBudget({
      session: session.session,
      operation: 'create-follow-up',
      minimumRequestsRemaining: blockedBySource ? 8 : 7
    });
    if (createPathBudgetError) {
      return failureFromWorkflowError('create-follow-up', createPathBudgetError);
    }
  }

  const createdIssueResult = await executeProviderLinearGraphql<IssueCreateMutationResponse>({
    session: session.session,
    operation: 'create-follow-up',
    step: 'create-issue',
    query: buildCreateFollowUpIssueMutation(),
    variables: {
      input: {
        teamId,
        projectId,
        stateId: backlogState.id,
        title,
        labelIds: followUpLabels.labelIds,
        description: buildFollowUpIssueDescription({
          description,
          intentChecksum,
          nonGoals,
          notDoneIf,
          acceptanceCriteria,
          parityMatrix,
          canonicalOwner: canonicalOwnerStamp
        })
      }
    }
  });
  if (!createdIssueResult.ok) {
    return failureFromWorkflowError('create-follow-up', createdIssueResult.error);
  }

  let createdIssue = parseCreatedIssue(createdIssueResult.payload.data?.issueCreate?.issue ?? null);
  if (createdIssueResult.payload.data?.issueCreate?.success !== true || !createdIssue) {
    return failure(
      'create-follow-up',
      'linear_follow_up_create_failed',
      'Linear follow-up issue creation did not succeed.',
      503
    );
  }
  const finalizedDescription = buildFollowUpIssueDescription({
    description,
    intentChecksum,
    nonGoals,
    notDoneIf,
    acceptanceCriteria,
    parityMatrix,
    canonicalOwner: canonicalOwnerStamp,
    traceability: buildFollowUpTraceabilitySection({
      sourceIssue: issueSummary.issue,
      followUpIssue: createdIssue
    })
  });
  if (createdIssue.description !== finalizedDescription) {
    const updateDescriptionResult = await executeProviderLinearGraphql<IssueDescriptionUpdateMutationResponse>({
      session: session.session,
      operation: 'create-follow-up',
      step: 'update-description',
      query: buildIssueDescriptionUpdateMutation(),
      variables: {
        id: createdIssue.id,
        description: finalizedDescription
      }
    });
    if (!updateDescriptionResult.ok) {
      return failure(
        'create-follow-up',
        updateDescriptionResult.error.code,
        updateDescriptionResult.error.message,
        409,
        {
          ...(updateDescriptionResult.error.details ?? {}),
          created_issue: createdIssue,
          failed_step: 'description_update'
        },
        false
      );
    }
    const updatedIssue = parseCreatedIssue(updateDescriptionResult.payload.data?.issueUpdate?.issue ?? null);
    if (updateDescriptionResult.payload.data?.issueUpdate?.success !== true || !updatedIssue) {
      return failure(
        'create-follow-up',
        'linear_follow_up_description_update_failed',
        'Linear follow-up issue description update did not succeed.',
        409,
        {
          created_issue: createdIssue,
          failed_step: 'description_update'
        },
        false
      );
    }
    if (updatedIssue.description !== finalizedDescription) {
      return failure(
        'create-follow-up',
        'linear_follow_up_description_update_incomplete',
        'Linear follow-up issue description update returned a different description than requested.',
        409,
        {
          created_issue: createdIssue,
          follow_up_issue: updatedIssue,
          expected_description: finalizedDescription,
          observed_description: updatedIssue.description,
          failed_step: 'description_update'
        },
        false
      );
    }
    createdIssue = updatedIssue;
  }

  let followUpIssue = createdIssue;
  let action: 'created' | 'reused' = 'created';
  if (canonicalOwnerKey && canonicalOwnerMarker) {
    const reconciliation = await reconcileCreatedCanonicalOwner({
      session: session.session,
      teamId,
      projectId,
      createdIssue,
      canonicalOwner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      }
    });
    if (!reconciliation.ok) {
      return reconciliation.result;
    }
    followUpIssue = reconciliation.issue;
    action = reconciliation.issue.id === createdIssue.id ? 'created' : 'reused';
    const tracedFollowUpIssue = await ensureFollowUpIssueTraceability({
      session: session.session,
      sourceIssue: issueSummary.issue,
      followUpIssue,
      createdIssue: createdIssue.id === followUpIssue.id ? null : createdIssue,
      requestedLabels: followUpLabels.labels,
      description,
      intentChecksum,
      nonGoals,
      notDoneIf,
      acceptanceCriteria,
      parityMatrix,
      canonicalOwner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      },
      failedStep: 'label_update_traceability_update'
    });
    if (!tracedFollowUpIssue.ok) {
      return tracedFollowUpIssue.result;
    }
    followUpIssue = tracedFollowUpIssue.issue;
  }
  const followUpIssueBeforeLabelRepair = followUpIssue;
  const followUpLabelRepairNeeded =
    findMissingFollowUpLabelIds(followUpIssue.labels, followUpLabels.labels).length > 0;
  const labeledFollowUpIssue = await ensureFollowUpIssueLabels({
    session: session.session,
    followUpIssue,
    createdIssue: createdIssue.id === followUpIssue.id ? null : createdIssue,
    requestedLabels: followUpLabels.labels,
    failedStep: 'label_update',
    retryableUpdateFailures: Boolean(canonicalOwnerKey && canonicalOwnerMarker)
  });
  if (!labeledFollowUpIssue.ok) {
    return labeledFollowUpIssue.result;
  }
  followUpIssue = labeledFollowUpIssue.issue;
  if (canonicalOwnerKey && canonicalOwnerMarker && followUpLabelRepairNeeded) {
    const traceableFollowUpIssue = verifyFollowUpIssueTraceability({
      sourceIssue: issueSummary.issue,
      followUpIssue,
      createdIssue: createdIssue.id === followUpIssue.id ? null : createdIssue,
      acceptedDescription: followUpIssueBeforeLabelRepair.description,
      description,
      intentChecksum,
      nonGoals,
      notDoneIf,
      acceptanceCriteria,
      parityMatrix,
      canonicalOwner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      },
      failedStep: 'label_update'
    });
    if (!traceableFollowUpIssue.ok) {
      return traceableFollowUpIssue.result;
    }
  }
  if (!canonicalOwnerKey && followUpIssue.description !== finalizedDescription) {
    return failure(
      'create-follow-up',
      'linear_follow_up_description_update_incomplete',
      'Linear follow-up issue description update returned a different description than requested.',
      409,
      {
        created_issue: createdIssue,
        follow_up_issue: followUpIssue,
        expected_description: finalizedDescription,
        observed_description: followUpIssue.description,
        failed_step: 'label_update'
      },
      false
    );
  }
  const relationResult = await createFollowUpRelations({
    session: session.session,
    sourceIssue: issueSummary.issue,
    followUpIssue,
    createdIssue,
    blockedBySource
  });
  if (!relationResult.ok) {
    return relationResult.result;
  }

  return {
    ok: true,
    operation: 'create-follow-up',
    action,
    issue: {
      id: issueSummary.issue.id,
      identifier: issueSummary.issue.identifier
    },
    follow_up_issue: followUpIssue,
    canonical_owner: canonicalOwnerKey && canonicalOwnerMarker
      ? {
          key: canonicalOwnerKey,
          marker: canonicalOwnerMarker
        }
      : null,
    relations: {
      related: true,
      blocked_by_source: blockedBySource
    },
    traceability: await buildFollowUpCreationTraceability({
      sourceIssue: issueSummary.issue,
      followUpIssue,
      requestedLabels: followUpLabels.labels,
      relationEvidence: relationResult.relations,
      repoRoot: input.repoRoot
    }),
    source_setup: session.session.sourceSetup
  };
}

function resolveFollowUpLabelsFromSourceIssue(issue: ProviderLinearIssueSummary):
  | {
      ok: true;
      labels: ProviderLinearIssueLabel[];
      labelIds: string[];
    }
  | {
      ok: false;
      error: ProviderLinearWorkflowError;
    } {
  const sourceLabels = issue.labels;
  const lifecycleLabels = sourceLabels.filter((label) => label.name === FOLLOW_UP_REQUIRED_LIFECYCLE_LABEL);
  const priorityLabels = sourceLabels.filter((label) => label.name.startsWith('Priority:'));
  const areaLabels = sourceLabels.filter((label) => label.name.startsWith('Area:'));
  const typeLabels = sourceLabels.filter((label) => FOLLOW_UP_TYPE_LABEL_NAMES.has(label.name));
  const missingRequirements: string[] = [];
  if (lifecycleLabels.length === 0) {
    missingRequirements.push(FOLLOW_UP_REQUIRED_LIFECYCLE_LABEL);
  }
  if (priorityLabels.length === 0) {
    missingRequirements.push('Priority:*');
  }
  if (areaLabels.length === 0) {
    missingRequirements.push('Area:*');
  }
  if (typeLabels.length === 0) {
    missingRequirements.push([...FOLLOW_UP_TYPE_LABEL_NAMES].join('|'));
  }
  if (missingRequirements.length > 0) {
    return {
      ok: false,
      error: {
        code: 'linear_follow_up_label_resolution_failed',
        message: `Linear issue ${issue.identifier} is missing live labels required for follow-up creation: ${missingRequirements.join(', ')}.`,
        status: 422,
        retryable: false,
        details: {
          source_issue: {
            id: issue.id,
            identifier: issue.identifier
          },
          missing_label_requirements: missingRequirements,
          available_labels: sourceLabels
        }
      }
    };
  }
  const labels = dedupeLinearLabels([
    ...lifecycleLabels,
    ...priorityLabels,
    ...areaLabels,
    ...typeLabels
  ]);
  return {
    ok: true,
    labels,
    labelIds: labels.map((label) => label.id)
  };
}

async function ensureFollowUpIssueLabels(input: {
  session: ResolvedLinearWorkflowSession;
  followUpIssue: ProviderLinearCreatedIssue;
  createdIssue?: ProviderLinearCreatedIssue | null;
  requestedLabels: ProviderLinearIssueLabel[];
  failedStep: string;
  retryableUpdateFailures?: boolean;
}): Promise<
  | {
      ok: true;
      issue: ProviderLinearCreatedIssue;
    }
  | {
      ok: false;
      result: Extract<ProviderLinearCreateFollowUpResult, { ok: false }>;
    }
> {
  const missingLabelIds = findMissingFollowUpLabelIds(input.followUpIssue.labels, input.requestedLabels);
  if (missingLabelIds.length === 0) {
    return {
      ok: true,
      issue: input.followUpIssue
    };
  }

  const updateResult = await executeProviderLinearGraphql<IssueDescriptionUpdateMutationResponse>({
    session: input.session,
    operation: 'create-follow-up',
    step: input.failedStep,
    query: buildIssueLabelsUpdateMutation(),
    variables: {
      id: input.followUpIssue.id,
      labelIds: missingLabelIds
    }
  });
  if (!updateResult.ok) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        updateResult.error.code,
        updateResult.error.message,
        input.retryableUpdateFailures === true ? updateResult.error.status : 409,
        {
          ...(updateResult.error.details ?? {}),
          ...buildFollowUpLabelFailureDetails(input.followUpIssue, input.createdIssue ?? null, input.requestedLabels),
          failed_step: input.failedStep
        },
        input.retryableUpdateFailures === true ? updateResult.error.retryable : false
      )
    };
  }

  const updatedIssue = parseCreatedIssue(updateResult.payload.data?.issueUpdate?.issue ?? null);
  if (updateResult.payload.data?.issueUpdate?.success !== true || !updatedIssue) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_label_update_failed',
        'Linear follow-up issue label update did not succeed.',
        409,
        {
          ...buildFollowUpLabelFailureDetails(input.followUpIssue, input.createdIssue ?? null, input.requestedLabels),
          failed_step: input.failedStep
        },
        false
      )
    };
  }

  const verification = verifyFollowUpIssueLabels({
    followUpIssue: updatedIssue,
    createdIssue: input.createdIssue ?? null,
    requestedLabels: input.requestedLabels,
    failedStep: input.failedStep
  });
  if (!verification.ok) {
    return verification;
  }

  return {
    ok: true,
    issue: updatedIssue
  };
}

function countCanonicalOwnerReuseRequests(input: {
  sourceIssue: ProviderLinearIssueSummary;
  followUpIssue: ProviderLinearCreatedIssue;
  requestedLabels: ProviderLinearIssueLabel[];
  description: string;
  intentChecksum: string;
  nonGoals: string;
  notDoneIf: string;
  acceptanceCriteria: string;
  parityMatrix?: string | null;
  canonicalOwner: {
    key: string;
    marker: string;
  };
  blockedBySource: boolean;
}): number {
  const traceabilityUpdate = resolveFollowUpTraceabilityUpdate(input);
  if (traceabilityUpdate.invalid) {
    return 0;
  }
  const traceabilityUpdateRequests = traceabilityUpdate.shouldUpdate ? 1 : 0;
  const labelUpdateRequests =
    traceabilityUpdateRequests === 0 && findMissingFollowUpLabelIds(input.followUpIssue.labels, input.requestedLabels).length > 0
      ? 1
      : 0;
  const postTraceabilityLabelRepairRequests = traceabilityUpdateRequests > 0 ? 1 : 0;
  const relationRequests =
    input.sourceIssue.id === input.followUpIssue.id
      ? 0
      : input.blockedBySource
        ? 2
        : 1;
  return labelUpdateRequests + traceabilityUpdateRequests + postTraceabilityLabelRepairRequests + relationRequests;
}

function resolveFollowUpTraceabilityUpdate(input: {
  sourceIssue: ProviderLinearIssueSummary;
  followUpIssue: ProviderLinearCreatedIssue;
  description: string;
  intentChecksum: string;
  nonGoals: string;
  notDoneIf: string;
  acceptanceCriteria: string;
  parityMatrix?: string | null;
  canonicalOwner: {
    key: string;
    marker: string;
  };
}): {
  finalizedDescription: string;
  shouldUpdate: boolean;
  invalid: boolean;
  observedDescription: string;
} {
  const observedDescription = input.followUpIssue.description ?? '';
  const traceability = buildFollowUpTraceabilitySection({
    sourceIssue: input.sourceIssue,
    followUpIssue: input.followUpIssue
  });
  const finalizedDescription = buildFollowUpIssueDescription({
    description: input.description,
    intentChecksum: input.intentChecksum,
    nonGoals: input.nonGoals,
    notDoneIf: input.notDoneIf,
    acceptanceCriteria: input.acceptanceCriteria,
    parityMatrix: input.parityMatrix,
    canonicalOwner: input.canonicalOwner,
    traceability
  });
  if (observedDescription === finalizedDescription) {
    return {
      finalizedDescription,
      shouldUpdate: false,
      invalid: false,
      observedDescription
    };
  }
  if (sameFollowUpDescriptionExceptSourceIssueTraceability(observedDescription, finalizedDescription)) {
    return {
      finalizedDescription,
      shouldUpdate: false,
      invalid: false,
      observedDescription
    };
  }
  const unfinishedDescription = buildFollowUpIssueDescription({
    description: input.description,
    intentChecksum: input.intentChecksum,
    nonGoals: input.nonGoals,
    notDoneIf: input.notDoneIf,
    acceptanceCriteria: input.acceptanceCriteria,
    parityMatrix: input.parityMatrix,
    canonicalOwner: input.canonicalOwner
  });
  return {
    finalizedDescription,
    shouldUpdate: observedDescription === unfinishedDescription,
    invalid: isManagedFollowUpDescriptionDrift(observedDescription, finalizedDescription, unfinishedDescription),
    observedDescription
  };
}

function isManagedFollowUpDescriptionDrift(observedDescription: string, ...expectedDescriptions: string[]): boolean {
  const normalizedObservedDescription = normalizeFollowUpSourceIssueTraceabilityLine(observedDescription);
  return expectedDescriptions.some((expectedDescription) => {
    if (hasTrailingManagedFollowUpDescriptionDrift(observedDescription, expectedDescription)) {
      return true;
    }
    const normalizedExpectedDescription = normalizeFollowUpSourceIssueTraceabilityLine(expectedDescription);
    return hasTrailingManagedFollowUpDescriptionDrift(
      normalizedObservedDescription,
      normalizedExpectedDescription
    );
  });
}

function hasTrailingManagedFollowUpDescriptionDrift(observedDescription: string, expectedDescription: string): boolean {
  return (
    observedDescription.startsWith(`${expectedDescription}\n`) ||
    observedDescription.startsWith(`${expectedDescription}\r\n`)
  );
}

function sameFollowUpDescriptionExceptSourceIssueTraceability(left: string, right: string): boolean {
  const normalizedLeft = normalizeFollowUpSourceIssueTraceabilityLine(left);
  const normalizedRight = normalizeFollowUpSourceIssueTraceabilityLine(right);
  return normalizedLeft !== left && normalizedRight !== right && normalizedLeft === normalizedRight;
}

function normalizeFollowUpSourceIssueTraceabilityLine(description: string): string {
  const lines = description.split(/\r?\n/u);
  let normalized = false;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index] !== '## Immediate Traceability') {
      continue;
    }
    const nextHeadingIndex = lines.findIndex((line, candidateIndex) =>
      candidateIndex > index && /^## [^\s#]/u.test(line)
    );
    const sectionEnd = nextHeadingIndex === -1 ? lines.length : nextHeadingIndex;
    const sectionLines = lines.slice(index + 1, sectionEnd);
    if (!sectionLines.some((line) => line.startsWith('- Follow-up packet prefix:'))) {
      continue;
    }
    const sourceLineOffset = sectionLines.findIndex((line) => /^- Source issue: .+$/u.test(line));
    if (sourceLineOffset === -1) {
      continue;
    }
    lines[index + 1 + sourceLineOffset] = '- Source issue: __SOURCE_ISSUE__';
    normalized = true;
  }
  return normalized ? lines.join('\n') : description;
}

async function ensureFollowUpIssueTraceability(input: {
  session: ResolvedLinearWorkflowSession;
  sourceIssue: ProviderLinearIssueSummary;
  followUpIssue: ProviderLinearCreatedIssue;
  createdIssue?: ProviderLinearCreatedIssue | null;
  requestedLabels: ProviderLinearIssueLabel[];
  description: string;
  intentChecksum: string;
  nonGoals: string;
  notDoneIf: string;
  acceptanceCriteria: string;
  parityMatrix?: string | null;
  canonicalOwner: {
    key: string;
    marker: string;
  };
  failedStep: string;
}): Promise<
  | {
      ok: true;
      issue: ProviderLinearCreatedIssue;
    }
  | {
      ok: false;
      result: Extract<ProviderLinearCreateFollowUpResult, { ok: false }>;
    }
> {
  const traceabilityUpdate = resolveFollowUpTraceabilityUpdate(input);
  if (traceabilityUpdate.invalid) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_traceability_invalid',
        'Linear follow-up canonical owner traceability does not match the expected managed description.',
        409,
        {
          follow_up_issue: input.followUpIssue,
          ...(input.createdIssue ? { created_issue: input.createdIssue } : {}),
          expected_description: traceabilityUpdate.finalizedDescription,
          observed_description: traceabilityUpdate.observedDescription,
          failed_step: input.failedStep
        },
        false
      )
    };
  }
  if (!traceabilityUpdate.shouldUpdate) {
    return {
      ok: true,
      issue: input.followUpIssue
    };
  }

  const updateResult = await executeProviderLinearGraphql<IssueDescriptionUpdateMutationResponse>({
    session: input.session,
    operation: 'create-follow-up',
    step: input.failedStep,
    query: buildIssueDescriptionUpdateMutation(),
    variables: {
      id: input.followUpIssue.id,
      description: traceabilityUpdate.finalizedDescription
    }
  });
  if (!updateResult.ok) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        updateResult.error.code,
        updateResult.error.message,
        updateResult.error.status,
        {
          ...(updateResult.error.details ?? {}),
          follow_up_issue: input.followUpIssue,
          ...(input.createdIssue ? { created_issue: input.createdIssue } : {}),
          failed_step: input.failedStep
        },
        updateResult.error.retryable
      )
    };
  }

  const updatedIssue = parseCreatedIssue(updateResult.payload.data?.issueUpdate?.issue ?? null);
  if (updateResult.payload.data?.issueUpdate?.success !== true || !updatedIssue) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_traceability_update_failed',
        'Linear follow-up issue traceability update did not succeed.',
        409,
        {
          follow_up_issue: input.followUpIssue,
          ...(input.createdIssue ? { created_issue: input.createdIssue } : {}),
          failed_step: input.failedStep
        },
        false
      )
    };
  }
  if (updatedIssue.description !== traceabilityUpdate.finalizedDescription) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_traceability_update_incomplete',
        'Linear follow-up canonical owner traceability update returned a different description than requested.',
        409,
        {
          follow_up_issue: updatedIssue,
          ...(input.createdIssue ? { created_issue: input.createdIssue } : {}),
          expected_description: traceabilityUpdate.finalizedDescription,
          observed_description: updatedIssue.description,
          failed_step: input.failedStep
        },
        false
      )
    };
  }
  const labeledIssue = await ensureFollowUpIssueLabels({
    session: input.session,
    followUpIssue: updatedIssue,
    createdIssue: input.createdIssue ?? null,
    requestedLabels: input.requestedLabels,
    failedStep: input.failedStep,
    retryableUpdateFailures: true
  });
  if (!labeledIssue.ok) {
    return labeledIssue;
  }
  if (labeledIssue.issue.description !== traceabilityUpdate.finalizedDescription) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_traceability_update_incomplete',
        'Linear follow-up canonical owner traceability update returned a different description than requested.',
        409,
        {
          follow_up_issue: labeledIssue.issue,
          ...(input.createdIssue ? { created_issue: input.createdIssue } : {}),
          expected_description: traceabilityUpdate.finalizedDescription,
          observed_description: labeledIssue.issue.description,
          failed_step: input.failedStep
        },
        false
      )
    };
  }

  return {
    ok: true,
    issue: labeledIssue.issue
  };
}

function verifyFollowUpIssueTraceability(input: {
  sourceIssue: ProviderLinearIssueSummary;
  followUpIssue: ProviderLinearCreatedIssue;
  createdIssue?: ProviderLinearCreatedIssue | null;
  acceptedDescription?: string | null;
  description: string;
  intentChecksum: string;
  nonGoals: string;
  notDoneIf: string;
  acceptanceCriteria: string;
  parityMatrix?: string | null;
  canonicalOwner: {
    key: string;
    marker: string;
  };
  failedStep: string;
}):
  | {
      ok: true;
    }
  | {
      ok: false;
      result: Extract<ProviderLinearCreateFollowUpResult, { ok: false }>;
    } {
  const traceabilityUpdate = resolveFollowUpTraceabilityUpdate(input);
  const acceptedDescription = input.acceptedDescription ?? null;
  const traceabilityPreserved =
    traceabilityUpdate.observedDescription === traceabilityUpdate.finalizedDescription ||
    (acceptedDescription !== null && traceabilityUpdate.observedDescription === acceptedDescription);
  if (!traceabilityPreserved) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_traceability_update_incomplete',
        'Linear follow-up canonical owner traceability was not preserved after label assignment.',
        409,
        {
          follow_up_issue: input.followUpIssue,
          ...(input.createdIssue ? { created_issue: input.createdIssue } : {}),
          expected_description: traceabilityUpdate.finalizedDescription,
          observed_description: traceabilityUpdate.observedDescription,
          failed_step: input.failedStep
        },
        false
      )
    };
  }
  return { ok: true };
}

function verifyFollowUpIssueLabels(input: {
  followUpIssue: ProviderLinearCreatedIssue;
  createdIssue?: ProviderLinearCreatedIssue | null;
  requestedLabels: ProviderLinearIssueLabel[];
  failedStep: string;
}):
  | {
      ok: true;
    }
  | {
      ok: false;
      result: Extract<ProviderLinearCreateFollowUpResult, { ok: false }>;
    } {
  const missingLabelIds = findMissingFollowUpLabelIds(input.followUpIssue.labels, input.requestedLabels);
  if (missingLabelIds.length === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    result: failure(
      'create-follow-up',
      'linear_follow_up_label_assignment_incomplete',
      'Linear follow-up issue label assignment did not return all requested live labels.',
      409,
      {
        ...buildFollowUpLabelFailureDetails(
          input.followUpIssue,
          input.createdIssue ?? input.followUpIssue,
          input.requestedLabels
        ),
        failed_step: input.failedStep
      },
      false
    )
  };
}

function findMissingFollowUpLabelIds(
  currentLabels: readonly ProviderLinearIssueLabel[] | undefined,
  requestedLabels: readonly ProviderLinearIssueLabel[]
): string[] {
  const currentLabelIds = new Set((currentLabels ?? []).map((label) => label.id));
  return requestedLabels
    .map((label) => label.id)
    .filter((labelId) => !currentLabelIds.has(labelId));
}

function buildFollowUpLabelFailureDetails(
  followUpIssue: ProviderLinearCreatedIssue,
  createdIssue: ProviderLinearCreatedIssue | null,
  requestedLabels: readonly ProviderLinearIssueLabel[]
): Record<string, unknown> {
  return {
    follow_up_issue: followUpIssue,
    ...(createdIssue ? { created_issue: createdIssue } : {}),
    requested_labels: requestedLabels,
    observed_labels: followUpIssue.labels ?? null,
    missing_label_ids: findMissingFollowUpLabelIds(followUpIssue.labels, requestedLabels)
  };
}

function dedupeLinearLabels(labels: readonly ProviderLinearIssueLabel[]): ProviderLinearIssueLabel[] {
  const seen = new Set<string>();
  const deduped: ProviderLinearIssueLabel[] = [];
  for (const label of labels) {
    if (seen.has(label.id)) {
      continue;
    }
    seen.add(label.id);
    deduped.push(label);
  }
  return deduped;
}

async function reconcileCreatedCanonicalOwner(input: {
  session: ResolvedLinearWorkflowSession;
  teamId: string;
  projectId: string;
  createdIssue: ProviderLinearCreatedIssue;
  canonicalOwner: {
    key: string;
    marker: string;
  };
}): Promise<
  | {
      ok: true;
      issue: ProviderLinearCreatedIssue;
    }
  | {
      ok: false;
      result: Extract<ProviderLinearCreateFollowUpResult, { ok: false }>;
    }
> {
  const ownerSearch = await findCanonicalFollowUpOwnerIssues({
    session: input.session,
    teamId: input.teamId,
    projectId: input.projectId,
    marker: input.canonicalOwner.marker
  });
  if (!ownerSearch.ok) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        ownerSearch.error.code,
        ownerSearch.error.message,
        ownerSearch.error.status,
        {
          ...(ownerSearch.error.details ?? {}),
          created_issue: input.createdIssue,
          failed_step: 'canonical_owner_reconciliation'
        },
        ownerSearch.error.retryable
      )
    };
  }

  const candidates = [...ownerSearch.issues];
  if (
    !candidates.some((issue) => issue.id === input.createdIssue.id) &&
    descriptionHasExactCanonicalOwnerMarker(input.createdIssue.description, input.canonicalOwner.marker)
  ) {
    candidates.push(input.createdIssue);
  }
  const selectedOwner = selectCanonicalOwnerIssue(candidates) ?? input.createdIssue;
  if (selectedOwner.id === input.createdIssue.id) {
    return {
      ok: true,
      issue: input.createdIssue
    };
  }

  const supersededDescription = buildSupersededCanonicalOwnerDescription({
    description: input.createdIssue.description,
    createdIssue: input.createdIssue,
    selectedOwner,
    canonicalOwner: input.canonicalOwner
  });
  const updateResult = await executeProviderLinearGraphql<IssueDescriptionUpdateMutationResponse>({
    session: input.session,
    operation: 'create-follow-up',
    step: 'supersede-created-canonical-owner',
    query: buildIssueDescriptionUpdateMutation(),
    variables: {
      id: input.createdIssue.id,
      description: supersededDescription
    }
  });
  if (!updateResult.ok) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        updateResult.error.code,
        updateResult.error.message,
        409,
        {
          ...(updateResult.error.details ?? {}),
          created_issue: input.createdIssue,
          canonical_owner_issue: selectedOwner,
          failed_step: 'canonical_owner_reconciliation'
        },
        false
      )
    };
  }
  if (updateResult.payload.data?.issueUpdate?.success !== true) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_canonical_owner_reconciliation_failed',
        'Linear follow-up canonical owner reconciliation did not succeed.',
        409,
        {
          created_issue: input.createdIssue,
          canonical_owner_issue: selectedOwner,
          failed_step: 'canonical_owner_reconciliation'
        },
        false
      )
    };
  }

  return {
    ok: true,
    issue: selectedOwner
  };
}

async function findCanonicalFollowUpOwnerIssue(input: {
  session: ResolvedLinearWorkflowSession;
  teamId: string;
  projectId: string;
  marker: string;
}):
  Promise<
    | {
        ok: true;
        issue: ProviderLinearCreatedIssue | null;
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const result = await findCanonicalFollowUpOwnerIssues(input);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    issue: selectCanonicalOwnerIssue(result.issues)
  };
}

async function findCanonicalFollowUpOwnerIssues(input: {
  session: ResolvedLinearWorkflowSession;
  teamId: string;
  projectId: string;
  marker: string;
}):
  Promise<
    | {
        ok: true;
        issues: ProviderLinearCreatedIssue[];
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const nodes: NonNullable<NonNullable<LinearCanonicalOwnerIssuesQueryResponse['issues']>['nodes']> = [];
  const seenCursors = new Set<string>();
  let after: string | null = null;

  for (;;) {
    const result = await executeProviderLinearGraphql<LinearCanonicalOwnerIssuesQueryResponse>({
      session: input.session,
      operation: 'create-follow-up',
      step: 'find-canonical-owner',
      query: buildCanonicalOwnerIssuesQuery(),
      variables: {
        teamId: input.teamId,
        projectId: input.projectId,
        marker: input.marker,
        first: PROVIDER_LINEAR_CANONICAL_OWNER_SEARCH_LIMIT,
        after
      }
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    if (Array.isArray(result.payload.data?.issues?.nodes)) {
      nodes.push(...result.payload.data.issues.nodes);
    }
    const pageInfo = result.payload.data?.issues?.pageInfo ?? null;
    if (pageInfo?.hasNextPage !== true) {
      break;
    }
    const nextCursor = normalizeOptionalString(pageInfo.endCursor);
    if (!nextCursor) {
      return {
        ok: false,
        error: {
          code: 'linear_canonical_owner_pagination_invalid',
          message: 'Linear canonical owner search pagination returned an invalid cursor.',
          status: 503
        }
      };
    }
    if (seenCursors.has(nextCursor)) {
      return {
        ok: false,
        error: {
          code: 'linear_canonical_owner_pagination_reused_cursor',
          message: 'Linear canonical owner search pagination returned a repeated cursor.',
          status: 503
        }
      };
    }
    seenCursors.add(nextCursor);
    after = nextCursor;
  }

  const issues: ProviderLinearCreatedIssue[] = [];
  for (const node of nodes) {
    if (node.trashed === true || normalizeOptionalString(node.archivedAt)) {
      continue;
    }
    const workflowState = classifyProviderLinearWorkflowState({
      state: node.state?.name ?? null,
      state_type: node.state?.type ?? null
    });
    if (workflowState.isTerminal) {
      continue;
    }
    if (normalizeOptionalString(node.team?.id) !== input.teamId) {
      continue;
    }
    if (normalizeOptionalString(node.project?.id) !== input.projectId) {
      continue;
    }
    if (!descriptionHasExactCanonicalOwnerMarker(node.description, input.marker)) {
      continue;
    }
    if (parseIssueLabelConnection(node.labels) === null) {
      return {
        ok: false,
        error: {
          code: 'linear_canonical_owner_labels_invalid',
          message: 'Linear canonical owner search returned a matching issue with missing, malformed, or paginated labels.',
          status: 503,
          retryable: true,
          details: {
            canonical_owner_issue: {
              id: normalizeOptionalString(node.id),
              identifier: normalizeOptionalString(node.identifier)
            },
            label_limit: LINEAR_WORKFLOW_LABEL_LIMIT
          }
        }
      };
    }
    const issue = parseCreatedIssue(node);
    if (issue) {
      issues.push(issue);
    }
  }

  return {
    ok: true,
    issues
  };
}

function descriptionHasExactCanonicalOwnerMarker(description: string | null | undefined, marker: string): boolean {
  const markerLines = new Set([
    `- Canonical owner marker: \`${marker}\``,
    `* Canonical owner marker: \`${marker}\``,
    `- Canonical owner marker: ${marker}`,
    `* Canonical owner marker: ${marker}`
  ]);
  const normalizedDescription = normalizeOptionalString(description);
  if (!normalizedDescription) {
    return false;
  }
  const canonicalOwnerSectionTitle = normalizeComparableValue('Canonical Owner');
  let activeSection: string | null = null;
  let activeCodeFenceDelimiter: string | null = null;
  let activeCodeFenceContainerIndent = 0;
  const listContinuationIndents: number[] = [];

  for (const line of normalizedDescription.split(/\r?\n/u)) {
    const { containerIndent, structuralLine } = getMarkdownFenceAwareStructuralLine(
      listContinuationIndents,
      line,
      activeCodeFenceDelimiter,
      activeCodeFenceContainerIndent
    );
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, structuralLine);
    if (codeFenceTransition.isBoundary) {
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      activeCodeFenceContainerIndent = activeCodeFenceDelimiter === null ? 0 : containerIndent;
      continue;
    }
    if (activeCodeFenceDelimiter) {
      continue;
    }

    const headingMatch = structuralLine.match(/^[ ]{0,3}#{1,6}\s+(.+?)\s*$/u);
    if (headingMatch) {
      const headingTitle = headingMatch[1].replace(/\s+#+\s*$/u, '').trim();
      activeSection = containerIndent === 0 ? normalizeComparableValue(headingTitle) : null;
      listContinuationIndents.length = 0;
      continue;
    }

    if (
      activeSection === canonicalOwnerSectionTitle &&
      containerIndent === 0 &&
      /^[ ]{0,3}[-*]\s+/u.test(structuralLine) &&
      markerLines.has(structuralLine.trim())
    ) {
      return true;
    }
    recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
  }

  return false;
}

function selectCanonicalOwnerIssue(issues: ProviderLinearCreatedIssue[]): ProviderLinearCreatedIssue | null {
  return [...issues].sort(compareCanonicalOwnerIssues)[0] ?? null;
}

function compareCanonicalOwnerIssues(left: ProviderLinearCreatedIssue, right: ProviderLinearCreatedIssue): number {
  const leftNumber = parseLinearIssueNumber(left.identifier);
  const rightNumber = parseLinearIssueNumber(right.identifier);
  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  return `${left.identifier}:${left.id}`.localeCompare(`${right.identifier}:${right.id}`);
}

function parseLinearIssueNumber(identifier: string): number | null {
  const match = /^[A-Z][A-Z0-9]*-(\d+)$/u.exec(identifier);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1] ?? '', 10);
  return Number.isSafeInteger(value) ? value : null;
}

function isIssueRelationAlreadySatisfiedError(
  error: ProviderLinearWorkflowError,
  relationType: 'related' | 'blocks'
): boolean {
  if (error.code !== 'linear_graphql_error') {
    return false;
  }
  const errors = Array.isArray(error.details?.errors) ? error.details.errors : [];
  const relationNeedles = relationType === 'blocks'
    ? ['relation', 'issue_relation', 'block']
    : ['relation', 'issue_relation', 'related'];
  return errors.some((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const record = entry as Record<string, unknown>;
    const extensions = record.extensions && typeof record.extensions === 'object'
      ? (record.extensions as Record<string, unknown>)
      : {};
    const extensionText = Object.values(extensions)
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .map((value) => String(value))
      .join(' ');
    const message = typeof record.message === 'string' ? record.message : '';
    const text = `${message} ${extensionText}`.toLowerCase();
    const alreadySatisfied =
      text.includes('already exists') ||
      text.includes('already exist') ||
      text.includes('already satisfied') ||
      text.includes('already present') ||
      text.includes('duplicate') ||
      text.includes('relation_already_exists') ||
      text.includes('issue_relation_already_exists') ||
      text.includes('already_exists');
    const isRelationError = relationNeedles.some((needle) => text.includes(needle));
    return alreadySatisfied && isRelationError;
  });
}

async function createFollowUpRelations(input: {
  session: ResolvedLinearWorkflowSession;
  sourceIssue: ProviderLinearIssueSummary;
  followUpIssue: ProviderLinearCreatedIssue;
  createdIssue?: ProviderLinearCreatedIssue | null;
  blockedBySource: boolean;
}): Promise<
  | {
      ok: true;
      relations: ProviderLinearFollowUpRelationEvidence;
    }
  | {
      ok: false;
      result: Extract<ProviderLinearCreateFollowUpResult, { ok: false }>;
    }
> {
  if (input.sourceIssue.id === input.followUpIssue.id) {
    return {
      ok: true,
      relations: buildFollowUpRelationEvidence({
        sourceIssue: input.sourceIssue,
        followUpIssue: input.followUpIssue,
        blockedBySource: input.blockedBySource,
        relatedAction: 'skipped_self',
        blockedAction: input.blockedBySource ? 'skipped_self' : 'not_requested'
      })
    };
  }

  let relatedAction: ProviderLinearFollowUpRelationEvidenceEntry['action'] = 'created';
  const relatedRelationResult = await executeProviderLinearGraphql<IssueRelationMutationResponse>({
    session: input.session,
    operation: 'create-follow-up',
    step: 'create-related-relation',
    query: buildCreateIssueRelationMutation(),
    variables: {
      input: {
        type: 'related',
        issueId: input.sourceIssue.id,
        relatedIssueId: input.followUpIssue.id
      }
    }
  });
  if (!relatedRelationResult.ok) {
    if (isIssueRelationAlreadySatisfiedError(relatedRelationResult.error, 'related')) {
      relatedAction = 'already_satisfied';
      if (!input.blockedBySource) {
        return {
          ok: true,
          relations: buildFollowUpRelationEvidence({
            sourceIssue: input.sourceIssue,
            followUpIssue: input.followUpIssue,
            blockedBySource: false,
            relatedAction,
            blockedAction: 'not_requested'
          })
        };
      }
    } else {
      return {
        ok: false,
        result: failure(
          'create-follow-up',
          relatedRelationResult.error.code,
          relatedRelationResult.error.message,
          409,
          {
            ...(relatedRelationResult.error.details ?? {}),
            ...buildFollowUpRelationFailureDetails({
              followUpIssue: input.followUpIssue,
              createdIssue: input.createdIssue,
              failedRelationType: 'related'
            })
          },
          false
        )
      };
    }
  } else if (relatedRelationResult.payload.data?.issueRelationCreate?.success !== true) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_relation_failed',
        'Linear follow-up issue relation creation did not succeed.',
        409,
        buildFollowUpRelationFailureDetails({
          followUpIssue: input.followUpIssue,
          createdIssue: input.createdIssue,
          failedRelationType: 'related'
        }),
        false
      )
    };
  }

  if (!input.blockedBySource) {
    return {
      ok: true,
      relations: buildFollowUpRelationEvidence({
        sourceIssue: input.sourceIssue,
        followUpIssue: input.followUpIssue,
        blockedBySource: false,
        relatedAction,
        blockedAction: 'not_requested'
      })
    };
  }

  let blockedAction: ProviderLinearFollowUpRelationEvidenceEntry['action'] = 'created';
  const blockingRelationResult = await executeProviderLinearGraphql<IssueRelationMutationResponse>({
    session: input.session,
    operation: 'create-follow-up',
    step: 'create-blocks-relation',
    query: buildCreateIssueRelationMutation(),
    variables: {
      input: {
        type: 'blocks',
        issueId: input.sourceIssue.id,
        relatedIssueId: input.followUpIssue.id
      }
    }
  });
  if (!blockingRelationResult.ok) {
    if (isIssueRelationAlreadySatisfiedError(blockingRelationResult.error, 'blocks')) {
      blockedAction = 'already_satisfied';
      return {
        ok: true,
        relations: buildFollowUpRelationEvidence({
          sourceIssue: input.sourceIssue,
          followUpIssue: input.followUpIssue,
          blockedBySource: true,
          relatedAction,
          blockedAction
        })
      };
    }
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        blockingRelationResult.error.code,
        blockingRelationResult.error.message,
        409,
        {
          ...(blockingRelationResult.error.details ?? {}),
          ...buildFollowUpRelationFailureDetails({
            followUpIssue: input.followUpIssue,
            createdIssue: input.createdIssue,
            failedRelationType: 'blocks'
          })
        },
        false
      )
    };
  }
  if (blockingRelationResult.payload.data?.issueRelationCreate?.success !== true) {
    return {
      ok: false,
      result: failure(
        'create-follow-up',
        'linear_follow_up_relation_failed',
        'Linear follow-up issue relation creation did not succeed.',
        409,
        buildFollowUpRelationFailureDetails({
          followUpIssue: input.followUpIssue,
          createdIssue: input.createdIssue,
          failedRelationType: 'blocks'
        }),
        false
      )
    };
  }

  return {
    ok: true,
    relations: buildFollowUpRelationEvidence({
      sourceIssue: input.sourceIssue,
      followUpIssue: input.followUpIssue,
      blockedBySource: true,
      relatedAction,
      blockedAction
    })
  };
}

async function buildFollowUpCreationTraceability(input: {
  sourceIssue: ProviderLinearIssueSummary;
  followUpIssue: ProviderLinearCreatedIssue;
  requestedLabels: ProviderLinearIssueLabel[];
  relationEvidence: ProviderLinearFollowUpRelationEvidence;
  repoRoot?: string | null;
}): Promise<ProviderLinearFollowUpCreationTraceability> {
  return {
    labels: {
      source_issue: {
        id: input.sourceIssue.id,
        identifier: input.sourceIssue.identifier
      },
      requested_labels: input.requestedLabels,
      observed_labels: input.followUpIssue.labels ?? null,
      missing_label_ids: findMissingFollowUpLabelIds(input.followUpIssue.labels, input.requestedLabels)
    },
    relations: input.relationEvidence,
    packet: await buildFollowUpPacketTraceabilityEvidence(input.followUpIssue, input.repoRoot)
  };
}

function buildFollowUpRelationEvidence(input: {
  sourceIssue: ProviderLinearIssueSummary;
  followUpIssue: ProviderLinearCreatedIssue;
  blockedBySource: boolean;
  relatedAction: ProviderLinearFollowUpRelationEvidenceEntry['action'];
  blockedAction: ProviderLinearFollowUpRelationEvidenceEntry['action'];
}): ProviderLinearFollowUpRelationEvidence {
  return {
    related: {
      type: 'related',
      requested: true,
      satisfied: input.relatedAction !== 'skipped_self',
      action: input.relatedAction,
      issue_id: input.sourceIssue.id,
      related_issue_id: input.followUpIssue.id
    },
    blocked_by_source: {
      type: 'blocks',
      requested: input.blockedBySource,
      satisfied: input.blockedBySource && input.blockedAction !== 'skipped_self',
      action: input.blockedAction,
      issue_id: input.sourceIssue.id,
      related_issue_id: input.followUpIssue.id
    }
  };
}

function buildFollowUpRelationFailureDetails(input: {
  followUpIssue: ProviderLinearCreatedIssue;
  createdIssue?: ProviderLinearCreatedIssue | null;
  failedRelationType: 'related' | 'blocks';
}): Record<string, unknown> {
  return {
    follow_up_issue: input.followUpIssue,
    ...(input.createdIssue ? { created_issue: input.createdIssue } : {}),
    ...(input.createdIssue && input.createdIssue.id !== input.followUpIssue.id
      ? { canonical_owner_issue: input.followUpIssue }
      : {}),
    failed_relation_type: input.failedRelationType
  };
}

function resolveLinearWorkflowSession(
  env: NodeJS.ProcessEnv | undefined,
  fetchImpl: typeof fetch | undefined,
  sourceSetup: DispatchPilotSourceSetup | null | undefined
):
  | {
      ok: true;
      session: ResolvedLinearWorkflowSession;
    }
  | {
      ok: false;
      error: ProviderLinearWorkflowError;
    } {
  const resolvedEnv = env ?? process.env;
  const token = resolveLinearApiToken(resolvedEnv);
  if (!token) {
    return {
      ok: false,
      error: {
        code: 'linear_credentials_missing',
        message: 'Linear API credentials are missing.',
        status: 503
      }
    };
  }

  return {
    ok: true,
    session: {
      env: resolvedEnv,
      token,
      timeoutMs: resolveLinearRequestTimeoutMs(resolvedEnv),
      fetchImpl: fetchImpl ?? fetch,
      sourceSetup: resolveWorkflowSourceSetup(sourceSetup, resolvedEnv)
    }
  };
}

async function preflightProviderLinearBudget(input: {
  session: ResolvedLinearWorkflowSession;
  operation: ProviderLinearOperation;
  minimumRequestsRemaining?: number;
  allowBelowRequestReserve?: boolean;
}): Promise<ProviderLinearWorkflowError | null> {
  const budget = await readSharedLinearBudgetStatus(input.session.env, {
    operation: `provider-linear:${input.operation}`
  }).catch(() => null);
  const preflight = resolveLinearBudgetPreflight({
    budget,
    operation: `provider-linear:${input.operation}`,
    minimum_requests_remaining: input.minimumRequestsRemaining,
    allow_below_request_reserve: input.allowBelowRequestReserve === true
  });
  return preflight.ok ? null : preflight.error;
}

async function executeProviderLinearGraphql<TData>(input: {
  session: ResolvedLinearWorkflowSession;
  operation: ProviderLinearOperation;
  step: string;
  query: string;
  variables?: Record<string, unknown>;
  allowBelowRequestReserve?: boolean;
}):
  Promise<
    | {
        ok: true;
        payload: LinearGraphqlPayload<TData>;
        headers?: Record<string, string>;
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const operationName = `provider-linear:${input.operation}:${input.step}`;
  const budget = await readSharedLinearBudgetStatus(input.session.env, {
    operation: operationName
  }).catch(() => null);
  const preflight = resolveLinearBudgetPreflight({
    budget,
    operation: operationName,
    allow_below_request_reserve: input.allowBelowRequestReserve === true
  });
  if (!preflight.ok) {
    return {
      ok: false,
      error: preflight.error
    };
  }

  const reservation = await reserveLinearBudgetReservation({
    env: input.session.env,
    operation: operationName,
    allow_below_request_reserve: input.allowBelowRequestReserve === true
  });
  if (!reservation.ok) {
    return {
      ok: false,
      error: reservation.error
    };
  }

  try {
    const result = await executeLinearGraphql<TData>({
      token: input.session.token,
      timeoutMs: input.session.timeoutMs,
      fetchImpl: input.session.fetchImpl,
      query: input.query,
      variables: input.variables
    });

    if (!result.ok) {
      await recordLinearBudgetHeadersObservation({
        env: input.session.env,
        headers: result.failure.headers ?? null,
        source: operationName
      }).catch(() => undefined);
      const rateLimitFailure = mapLinearRateLimitedFailure(result.failure);
      if (rateLimitFailure) {
        await recordLinearBudgetRateLimitObservation({
          env: input.session.env,
          rateLimit: rateLimitFailure,
          source: operationName
        }).catch(() => undefined);
      }
      return {
        ok: false,
        error: mapGraphqlFailure(result.failure)
      };
    }

    const payloadRecord =
      result.payload.data && typeof result.payload.data === 'object'
        ? (result.payload.data as {
            viewer?: {
              id?: string | null;
              organization?: {
                id?: string | null;
              } | null;
            } | null;
          })
        : null;
    await recordLinearBudgetHeadersObservation({
      env: input.session.env,
      headers: result.headers ?? null,
      source: operationName,
      scope: {
        workspaceId: normalizeOptionalString(payloadRecord?.viewer?.organization?.id ?? null),
        viewerId: normalizeOptionalString(payloadRecord?.viewer?.id ?? null)
      }
    }).catch(() => undefined);

    return {
      ok: true,
      payload: result.payload,
      ...(result.headers ? { headers: result.headers } : {})
    };
  } finally {
    await reservation.reservation?.release().catch(() => undefined);
  }
}

async function resolveEmbeddedLinearWorkpadAssets(input: {
  session: ResolvedLinearWorkflowSession;
  operation: ProviderLinearOperation;
  body: string;
  references?: LocalMarkdownImageReference[];
}):
  Promise<
    | {
        ok: true;
        body: string;
        embedded_assets: ProviderLinearEmbeddedAsset[];
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const references = input.references ?? extractLocalMarkdownImageReferences(input.body);
  if (references.length === 0) {
    return {
      ok: true,
      body: input.body,
      embedded_assets: []
    };
  }

  const uploadedAssetsByPath = new Map<string, ProviderLinearEmbeddedAsset>();
  const embeddedAssets: ProviderLinearEmbeddedAsset[] = [];
  const replacements: Array<{
    start: number;
    end: number;
    value: string;
  }> = [];

  for (const reference of references) {
    let uploadedAsset = uploadedAssetsByPath.get(reference.resolved_path) ?? null;
    if (!uploadedAsset) {
      const uploadResult = await uploadProviderLinearLocalImage({
        session: input.session,
        operation: input.operation,
        originalReference: reference.original_reference,
        resolvedPath: reference.resolved_path
      });
      if (!uploadResult.ok) {
        return uploadResult;
      }
      uploadedAsset = uploadResult.asset;
      uploadedAssetsByPath.set(reference.resolved_path, uploadedAsset);
      embeddedAssets.push(uploadedAsset);
    }

    const rewrittenReference = reference.replacement_suffix
      ? `${uploadedAsset.asset_url} ${reference.replacement_suffix}`
      : uploadedAsset.asset_url;
    replacements.push({
      start: reference.match_start,
      end: reference.match_end,
      value: `![${reference.alt_text}](${rewrittenReference})`
    });
  }

  return {
    ok: true,
    body: applyStringReplacements(input.body, replacements),
    embedded_assets: embeddedAssets
  };
}

async function uploadProviderLinearLocalImage(input: {
  session: ResolvedLinearWorkflowSession;
  operation: ProviderLinearOperation;
  originalReference: string;
  resolvedPath: string;
}):
  Promise<
    | {
        ok: true;
        asset: ProviderLinearEmbeddedAsset;
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const contentType = resolveLocalImageContentType(input.resolvedPath);
  if (!contentType) {
    return {
      ok: false,
      error: {
        code: 'linear_local_image_content_type_invalid',
        message: 'Only local PNG, JPG, JPEG, WEBP, and GIF screenshot files can be embedded in Linear.',
        status: 422,
        details: {
          original_reference: input.originalReference,
          resolved_path: input.resolvedPath
        }
      }
    };
  }

  let fileStats;
  try {
    fileStats = await stat(input.resolvedPath);
  } catch {
    return {
      ok: false,
      error: {
        code: 'linear_local_image_unreadable',
        message: `Local screenshot file "${input.resolvedPath}" is not readable.`,
        status: 422,
        details: {
          original_reference: input.originalReference,
          resolved_path: input.resolvedPath
        }
      }
    };
  }

  if (!fileStats.isFile() || fileStats.size <= 0) {
    return {
      ok: false,
      error: {
        code: 'linear_local_image_unreadable',
        message: `Local screenshot file "${input.resolvedPath}" must be a non-empty file.`,
        status: 422,
        details: {
          original_reference: input.originalReference,
          resolved_path: input.resolvedPath
        }
      }
    };
  }

  let fileBytes: Uint8Array;
  try {
    fileBytes = await readFile(input.resolvedPath);
  } catch {
    return {
      ok: false,
      error: {
        code: 'linear_local_image_unreadable',
        message: `Local screenshot file "${input.resolvedPath}" could not be read.`,
        status: 422,
        details: {
          original_reference: input.originalReference,
          resolved_path: input.resolvedPath
        }
      }
    };
  }

  const uploadNegotiation = await executeProviderLinearGraphql<FileUploadMutationResponse>({
    session: input.session,
    operation: input.operation,
    step: 'request-file-upload',
    query: buildFileUploadMutation(),
    variables: {
      contentType,
      filename: basename(input.resolvedPath),
      size: fileStats.size
    }
  });
  if (!uploadNegotiation.ok) {
    return {
      ok: false,
      error: uploadNegotiation.error
    };
  }

  const uploadFile = parseLinearUploadFile(uploadNegotiation.payload.data?.fileUpload?.uploadFile ?? null);
  if (uploadNegotiation.payload.data?.fileUpload?.success !== true || !uploadFile) {
    return {
      ok: false,
      error: {
        code: 'linear_file_upload_negotiation_failed',
        message: 'Linear file upload negotiation did not succeed.',
        status: 503,
        details: {
          original_reference: input.originalReference,
          resolved_path: input.resolvedPath
        }
      }
    };
  }

  const uploadPutError = await uploadLinearFileToSignedUrl({
    session: input.session,
    uploadUrl: uploadFile.upload_url,
    contentType,
    uploadHeaders: uploadFile.headers,
    bytes: fileBytes
  });
  if (uploadPutError) {
    return {
      ok: false,
      error: {
        ...uploadPutError,
        details: {
          ...(uploadPutError.details ?? {}),
          original_reference: input.originalReference,
          resolved_path: input.resolvedPath,
          asset_url: uploadFile.asset_url
        }
      }
    };
  }

  return {
    ok: true,
    asset: {
      original_reference: input.originalReference,
      resolved_path: input.resolvedPath,
      asset_url: uploadFile.asset_url,
      content_type: contentType,
      size_bytes: fileStats.size
    }
  };
}

async function uploadLinearFileToSignedUrl(input: {
  session: ResolvedLinearWorkflowSession;
  uploadUrl: string;
  contentType: string;
  uploadHeaders: Record<string, string>;
  bytes: Uint8Array;
}): Promise<ProviderLinearWorkflowError | null> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), input.session.timeoutMs);
  const headers = new Headers();
  headers.set('Content-Type', input.contentType);
  headers.set('Cache-Control', 'public, max-age=31536000');
  for (const [key, value] of Object.entries(input.uploadHeaders)) {
    headers.set(key, value);
  }
  const uploadBody = new Uint8Array(input.bytes.byteLength);
  uploadBody.set(input.bytes);

  const response = await input.session.fetchImpl(input.uploadUrl, {
    method: 'PUT',
    headers,
    body: new Blob([uploadBody], { type: input.contentType }),
    signal: abortController.signal
  })
    .catch(() => null)
    .finally(() => clearTimeout(timeout));

  if (!response) {
    return {
      code: 'linear_file_upload_put_failed',
      message: 'Linear signed upload request failed before a response was received.',
      status: 503,
      details: {
        upload_url: input.uploadUrl
      }
    };
  }

  if (!response.ok) {
    return {
      code: 'linear_file_upload_put_failed',
      message: `Linear signed upload request returned HTTP ${response.status}.`,
      status: 503,
      details: {
        upload_url: input.uploadUrl,
        http_status: response.status
      }
    };
  }

  return null;
}

function extractLocalMarkdownImageReferences(
  body: string,
  bodyFilePath: string | null = null
): LocalMarkdownImageReference[] {
  const maskedBody = maskMarkdownCodeForLocalImageExtraction(body);
  const references: LocalMarkdownImageReference[] = [];
  for (const match of maskedBody.matchAll(LINEAR_LOCAL_IMAGE_MARKDOWN_PATTERN)) {
    const rawReference = normalizeRequiredString(match[2]);
    const fullMatch = match[0];
    const matchIndex = match.index;
    if (!rawReference || !fullMatch || typeof matchIndex !== 'number') {
      continue;
    }
    if (isEscapedMarkdownImageMarker(body, matchIndex)) {
      continue;
    }
    const resolvedReference = resolveLocalMarkdownImageReference(rawReference, bodyFilePath);
    if (!resolvedReference) {
      continue;
    }
    references.push({
      alt_text: match[1] ?? '',
      original_reference: resolvedReference.original_reference,
      replacement_suffix: resolvedReference.replacement_suffix,
      resolved_path: resolvedReference.resolved_path,
      match_start: matchIndex,
      match_end: matchIndex + fullMatch.length
    });
  }
  return references;
}

function isEscapedMarkdownImageMarker(body: string, markerIndex: number): boolean {
  let backslashCount = 0;
  for (let index = markerIndex - 1; index >= 0 && body[index] === '\\'; index -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function maskMarkdownCodeForLocalImageExtraction(body: string): string {
  const codeRanges = collectMarkdownCodeRanges(body);
  if (codeRanges.length === 0) {
    return body;
  }

  const characters = body.split('');
  for (const range of codeRanges) {
    for (let index = range.start; index < range.end; index += 1) {
      const character = characters[index];
      if (character && character !== '\n' && character !== '\r') {
        characters[index] = ' ';
      }
    }
  }
  return characters.join('');
}

function collectMarkdownCodeRanges(body: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let searchIndex = 0;
  while (searchIndex < body.length) {
    const fenceRange = findNextMarkdownFenceRange(body, searchIndex);
    const inlineLimit = fenceRange?.start ?? body.length;
    collectInlineMarkdownCodeRanges(body, searchIndex, inlineLimit, ranges);
    if (!fenceRange) {
      break;
    }
    ranges.push(fenceRange);
    searchIndex = fenceRange.end;
  }
  collectIndentedMarkdownCodeRanges(body, ranges);
  return ranges;
}

function collectIndentedMarkdownCodeRanges(
  body: string,
  target: Array<{ start: number; end: number }>
): void {
  let lineStart = 0;
  let activeCodeFenceDelimiter: string | null = null;
  let activeCodeFenceContainerIndent = 0;
  const listContinuationIndents: number[] = [];

  while (lineStart < body.length) {
    const lineEnd = findMarkdownLineEnd(body, lineStart);
    const line = body.slice(lineStart, lineEnd);
    const { containerIndent, structuralLine } = getMarkdownFenceAwareStructuralLine(
      listContinuationIndents,
      line,
      activeCodeFenceDelimiter,
      activeCodeFenceContainerIndent
    );
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, structuralLine);
    if (codeFenceTransition.isBoundary) {
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      activeCodeFenceContainerIndent = activeCodeFenceDelimiter === null ? 0 : containerIndent;
      lineStart = lineEnd;
      continue;
    }
    if (!activeCodeFenceDelimiter && isIndentedMarkdownCodeBlockStructuralLine(structuralLine)) {
      target.push({
        start: lineStart,
        end: lineEnd
      });
    }
    if (!activeCodeFenceDelimiter) {
      recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
    }
    lineStart = lineEnd;
  }
}

function isIndentedMarkdownCodeBlockStructuralLine(line: string): boolean {
  const blockquoteStrippedLine = stripMarkdownBlockquotePrefixes(line);
  return (
    normalizeRequiredString(blockquoteStrippedLine) !== null &&
    (/^\t/u.test(blockquoteStrippedLine) || /^ {4,}/u.test(blockquoteStrippedLine))
  );
}

function stripMarkdownBlockquotePrefixes(line: string): string {
  let strippedLine = line;
  let blockquoteMatch = strippedLine.match(/^[ ]{0,3}>\s?/u);
  while (blockquoteMatch) {
    strippedLine = strippedLine.slice(blockquoteMatch[0].length);
    blockquoteMatch = strippedLine.match(/^[ ]{0,3}>\s?/u);
  }
  return strippedLine;
}

function findNextMarkdownFenceRange(
  body: string,
  startIndex: number
): { start: number; end: number } | null {
  let lineStart = startIndex;
  while (lineStart < body.length) {
    const lineEnd = findMarkdownLineEnd(body, lineStart);
    const fence = readMarkdownFenceDelimiter(body.slice(lineStart, lineEnd));
    if (!fence) {
      lineStart = lineEnd;
      continue;
    }

    let searchLineStart = lineEnd;
    while (searchLineStart < body.length) {
      const searchLineEnd = findMarkdownLineEnd(body, searchLineStart);
      if (isMarkdownFenceCloser(body.slice(searchLineStart, searchLineEnd), fence)) {
        return {
          start: lineStart,
          end: searchLineEnd
        };
      }
      searchLineStart = searchLineEnd;
    }
    return {
      start: lineStart,
      end: body.length
    };
  }
  return null;
}

function collectInlineMarkdownCodeRanges(
  body: string,
  startIndex: number,
  endIndex: number,
  target: Array<{ start: number; end: number }>
): void {
  let index = startIndex;
  while (index < endIndex) {
    if (body[index] !== '`') {
      index += 1;
      continue;
    }

    const delimiterLength = countRepeatedCharacter(body, index, '`');
    const closingIndex = findClosingInlineMarkdownCodeDelimiter(
      body,
      index + delimiterLength,
      endIndex,
      delimiterLength
    );
    if (closingIndex === null) {
      index += delimiterLength;
      continue;
    }

    target.push({
      start: index,
      end: closingIndex + delimiterLength
    });
    index = closingIndex + delimiterLength;
  }
}

function findClosingInlineMarkdownCodeDelimiter(
  body: string,
  startIndex: number,
  endIndex: number,
  delimiterLength: number
): number | null {
  let index = startIndex;
  while (index < endIndex) {
    if (body[index] !== '`') {
      index += 1;
      continue;
    }

    const candidateLength = countRepeatedCharacter(body, index, '`');
    if (candidateLength === delimiterLength) {
      return index;
    }
    index += candidateLength;
  }
  return null;
}

function findMarkdownLineEnd(body: string, lineStart: number): number {
  const newlineIndex = body.indexOf('\n', lineStart);
  return newlineIndex === -1 ? body.length : newlineIndex + 1;
}

function readMarkdownFenceDelimiter(line: string): { character: '`' | '~'; length: number } | null {
  const lineWithoutLineEnding = line.replace(/\r?\n$/u, '');
  const trimmedStart = stripMarkdownBlockquotePrefixes(lineWithoutLineEnding).trimStart();
  if (trimmedStart.length < 3) {
    return null;
  }
  const fenceCharacter = trimmedStart[0];
  if (fenceCharacter !== '`' && fenceCharacter !== '~') {
    return null;
  }
  const fenceLength = countRepeatedCharacter(trimmedStart, 0, fenceCharacter);
  if (fenceLength < 3) {
    return null;
  }
  return {
    character: fenceCharacter,
    length: fenceLength
  };
}

function isMarkdownFenceCloser(
  line: string,
  fence: { character: '`' | '~'; length: number }
): boolean {
  const lineWithoutLineEnding = line.replace(/\r?\n$/u, '');
  const trimmedStart = stripMarkdownBlockquotePrefixes(lineWithoutLineEnding).trimStart();
  if (!trimmedStart.startsWith(fence.character.repeat(fence.length))) {
    return false;
  }
  const candidateLength = countRepeatedCharacter(trimmedStart, 0, fence.character);
  if (candidateLength < fence.length) {
    return false;
  }
  return trimmedStart.slice(candidateLength).trim().length === 0;
}

function countRepeatedCharacter(input: string, startIndex: number, character: string): number {
  let count = 0;
  while (input[startIndex + count] === character) {
    count += 1;
  }
  return count;
}

function resolveLocalMarkdownImageReference(
  rawReference: string,
  bodyFilePath: string | null = null
):
  | {
      original_reference: string;
      replacement_suffix: string | null;
      resolved_path: string;
    }
  | null {
  const trimmedReference = rawReference.trim();
  if (trimmedReference.length === 0) {
    return null;
  }

  let destination = trimmedReference;
  let suffix = '';
  if (trimmedReference.startsWith('<')) {
    const closingIndex = trimmedReference.indexOf('>');
    if (closingIndex <= 1) {
      return null;
    }
    destination = trimmedReference.slice(1, closingIndex).trim();
    suffix = trimmedReference.slice(closingIndex + 1).trim();
  } else {
    const whitespaceMatch = trimmedReference.match(/\s/u);
    if (whitespaceMatch && typeof whitespaceMatch.index === 'number') {
      destination = trimmedReference.slice(0, whitespaceMatch.index).trim();
      suffix = trimmedReference.slice(whitespaceMatch.index).trim();
    }
  }

  const normalizedDestination = normalizeRequiredString(destination);
  if (!normalizedDestination) {
    return null;
  }
  const lowerDestination = normalizedDestination.toLowerCase();
  if (
    lowerDestination.startsWith('http://') ||
    lowerDestination.startsWith('https://') ||
    lowerDestination.startsWith('//') ||
    lowerDestination.startsWith('data:')
  ) {
    return null;
  }
  if (normalizedDestination.startsWith('#')) {
    return null;
  }

  let resolvedPath: string | null = null;
  if (lowerDestination.startsWith('file://')) {
    try {
      resolvedPath = fileURLToPath(normalizedDestination);
    } catch {
      return null;
    }
  } else if (
    normalizedDestination.startsWith('./') ||
    normalizedDestination.startsWith('../') ||
    normalizedDestination.startsWith('/') ||
    /^[A-Za-z]:[\\/]/u.test(normalizedDestination) ||
    !/^[A-Za-z][A-Za-z\d+.-]*:/u.test(normalizedDestination)
  ) {
    const resolvedBodyFilePath = normalizeOptionalString(bodyFilePath);
    if (
      resolvedBodyFilePath &&
      !normalizedDestination.startsWith('/') &&
      !/^[A-Za-z]:[\\/]/u.test(normalizedDestination)
    ) {
      resolvedPath = resolvePath(dirname(resolvedBodyFilePath), normalizedDestination);
    } else {
      resolvedPath = resolvePath(normalizedDestination);
    }
  }

  if (!resolvedPath) {
    return null;
  }

  return {
    original_reference: normalizedDestination,
    replacement_suffix: normalizeOptionalString(suffix),
    resolved_path: resolvedPath
  };
}

function resolveLocalImageContentType(filePath: string): string | null {
  return LOCAL_IMAGE_CONTENT_TYPE_BY_EXTENSION.get(extname(filePath).toLowerCase()) ?? null;
}

function parseLinearUploadFile(
  value:
    | {
        uploadUrl?: string | null;
        assetUrl?: string | null;
        headers?: Array<{
          key?: string | null;
          value?: string | null;
        }> | null;
      }
    | null
):
  | {
      upload_url: string;
      asset_url: string;
      headers: Record<string, string>;
    }
  | null {
  const uploadUrl = normalizeRequiredString(value?.uploadUrl);
  const assetUrl = normalizeRequiredString(value?.assetUrl);
  if (!uploadUrl || !assetUrl) {
    return null;
  }
  const headers: Record<string, string> = {};
  for (const entry of value?.headers ?? []) {
    const key = normalizeRequiredString(entry?.key);
    const headerValue = normalizeRequiredString(entry?.value);
    if (!key || !headerValue) {
      continue;
    }
    headers[key] = headerValue;
  }
  return {
    upload_url: uploadUrl,
    asset_url: assetUrl,
    headers
  };
}

function applyStringReplacements(
  source: string,
  replacements: Array<{
    start: number;
    end: number;
    value: string;
  }>
): string {
  let nextSource = source;
  for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
    nextSource =
      nextSource.slice(0, replacement.start) +
      replacement.value +
      nextSource.slice(replacement.end);
  }
  return nextSource;
}

async function readEmbeddedWorkpadLocalImageCacheEntries(input: {
  references: LocalMarkdownImageReference[];
}):
  Promise<
    | {
        ok: true;
        local_images: ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[];
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const localImages: ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[] = [];
  for (const reference of input.references) {
    let fileStats;
    try {
      fileStats = await stat(reference.resolved_path);
    } catch {
      return {
        ok: false,
        error: {
          code: 'linear_local_image_unreadable',
          message: `Local screenshot file "${reference.resolved_path}" is not readable.`,
          status: 422,
          details: {
            original_reference: reference.original_reference,
            resolved_path: reference.resolved_path
          }
        }
      };
    }

    if (!fileStats.isFile() || fileStats.size <= 0) {
      return {
        ok: false,
        error: {
          code: 'linear_local_image_unreadable',
          message: `Local screenshot file "${reference.resolved_path}" must be a non-empty file.`,
          status: 422,
          details: {
            original_reference: reference.original_reference,
            resolved_path: reference.resolved_path
          }
        }
      };
    }

    localImages.push({
      original_reference: reference.original_reference,
      resolved_path: reference.resolved_path,
      size_bytes: fileStats.size,
      mtime_ms: fileStats.mtimeMs
    });
  }

  return {
    ok: true,
    local_images: localImages
  };
}

function buildEmbeddedWorkpadCacheRecord(input: {
  commentId: string;
  originalBody: string;
  resolvedBody: string;
  localImages: ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[];
}): ProviderLinearEmbeddedWorkpadCacheRecord | null {
  if (input.localImages.length === 0) {
    return null;
  }
  return {
    comment_id: input.commentId,
    original_body: input.originalBody,
    resolved_body: input.resolvedBody,
    local_images: input.localImages
  };
}

function resolveEmbeddedWorkpadNoopCache(input: {
  cachedWorkpad: ProviderLinearEmbeddedWorkpadCacheRecord | null;
  comment: ProviderLinearWorkflowComment | null;
  originalBody: string;
  localImages: ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[];
}): ProviderLinearEmbeddedWorkpadCacheRecord | null {
  if (!input.cachedWorkpad || !input.comment) {
    return null;
  }
  if (input.cachedWorkpad.comment_id !== input.comment.id) {
    return null;
  }
  if (input.cachedWorkpad.original_body !== input.originalBody) {
    return null;
  }
  if (input.cachedWorkpad.resolved_body !== input.comment.body) {
    return null;
  }
  if (!sameEmbeddedWorkpadLocalImages(input.cachedWorkpad.local_images, input.localImages)) {
    return null;
  }
  return input.cachedWorkpad;
}

function sameEmbeddedWorkpadLocalImages(
  left: ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[],
  right: ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((entry, index) => {
    const other = right[index];
    return (
      other !== undefined
      && entry.original_reference === other.original_reference
      && entry.resolved_path === other.resolved_path
      && entry.size_bytes === other.size_bytes
      && entry.mtime_ms === other.mtime_ms
    );
  });
}

function summarizeIssueContext(issue: ProviderLinearIssueContext): ProviderLinearIssueSummary {
  return {
    id: issue.id,
    identifier: issue.identifier,
    url: issue.url,
    updated_at: issue.updated_at,
    archived_at: issue.archived_at,
    trashed: issue.trashed,
    workspace_id: issue.workspace_id,
    state: issue.state,
    team: issue.team,
    project: issue.project,
    labels: issue.labels
  };
}

function mergeCachedIssueContextSummary(
  issue: ProviderLinearIssueContext,
  summary: ProviderLinearIssueSummary
): ProviderLinearIssueContext {
  return {
    ...issue,
    url: summary.url,
    updated_at: summary.updated_at,
    archived_at: summary.archived_at,
    trashed: summary.trashed,
    workspace_id: summary.workspace_id,
    state: summary.state,
    team: summary.team,
    project: summary.project,
    labels: summary.labels
  };
}

function failureIfIssueNotMutable<T extends ProviderLinearOperation>(
  operation: T,
  issue: Pick<ProviderLinearIssueSummary, 'id' | 'identifier' | 'archived_at' | 'trashed'>
): ProviderLinearOperationFailure<T> | null {
  const mutabilityStates = issueHasMutabilityBlock(issue)
    ? [issue.archived_at ? 'archived' : null, issue.trashed ? 'trashed' : null].filter(
        (value): value is string => Boolean(value)
      )
    : [];
  if (mutabilityStates.length === 0) {
    return null;
  }
  return failure(
    operation,
    'linear_issue_not_mutable',
    `Linear issue ${issue.identifier} is ${mutabilityStates.join(' and ')} and cannot accept provider mutations.`,
    409,
    {
      issue_id: issue.id,
      issue_identifier: issue.identifier,
      archived_at: issue.archived_at,
      trashed: issue.trashed
    }
  );
}

function issueHasMutabilityBlock(
  issue: Pick<ProviderLinearIssueSummary, 'archived_at' | 'trashed'>
): boolean {
  return Boolean(issue.archived_at) || issue.trashed === true;
}

function resolveIssueContextCacheDirectory(env: NodeJS.ProcessEnv | undefined): string | null {
  const auditPath = resolveProviderLinearAuditPath(env ?? process.env);
  if (!auditPath) {
    return null;
  }
  return dirname(auditPath);
}

function sanitizeIssueContextCacheArtifactKey(issueId: string): string {
  return issueId.replace(/[^A-Za-z0-9._-]/gu, '_');
}

function resolveLegacyIssueContextCachePath(env: NodeJS.ProcessEnv | undefined): string | null {
  const cacheDirectory = resolveIssueContextCacheDirectory(env);
  if (!cacheDirectory) {
    return null;
  }
  return join(cacheDirectory, PROVIDER_LINEAR_ISSUE_CONTEXT_CACHE_FILENAME);
}

function resolveIssueContextCachePath(
  env: NodeJS.ProcessEnv | undefined,
  issueId: string
): string | null {
  const cacheDirectory = resolveIssueContextCacheDirectory(env);
  const normalizedIssueId = normalizeRequiredString(issueId);
  if (!cacheDirectory || !normalizedIssueId) {
    return null;
  }
  const cacheArtifactKey = sanitizeIssueContextCacheArtifactKey(normalizedIssueId);
  return join(
    cacheDirectory,
    `${PROVIDER_LINEAR_ISSUE_CONTEXT_CACHE_FILENAME_STEM}-${cacheArtifactKey}.json`
  );
}

async function readIssueContextCacheRecordAtPath(
  cachePath: string
): Promise<ProviderLinearIssueContextCacheRecord | null> {
  try {
    const parsed = JSON.parse(await readFile(cachePath, 'utf8')) as unknown;
    return parseIssueContextCacheRecord(parsed);
  } catch {
    return null;
  }
}

async function readCachedIssueContextRecord(
  env: NodeJS.ProcessEnv | undefined,
  issueId: string,
  sourceSetup: DispatchPilotSourceSetup | null
): Promise<ProviderLinearIssueContextCacheRecord | null> {
  const cachePaths = [
    resolveIssueContextCachePath(env, issueId),
    resolveLegacyIssueContextCachePath(env)
  ].filter(
    (cachePath, index, paths): cachePath is string =>
      Boolean(cachePath) && paths.indexOf(cachePath) === index
  );
  for (const cachePath of cachePaths) {
    const record = await readIssueContextCacheRecordAtPath(cachePath);
    if (
      record &&
      record.issue_id === issueId &&
      sameResolvedSourceSetup(record.source_setup, sourceSetup)
    ) {
      return record;
    }
  }
  return null;
}

function isIssueContextCacheRecordFresh(
  record: ProviderLinearIssueContextCacheRecord,
  maxAgeMs: number = PROVIDER_LINEAR_DIRECT_MUTATION_CACHE_MAX_AGE_MS
): boolean {
  const recordedAt = Date.parse(record.recorded_at);
  if (!Number.isFinite(recordedAt)) {
    return false;
  }
  const ageMs = Date.now() - recordedAt;
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

function shouldReuseCachedIssueContextForRead(
  record: ProviderLinearIssueContextCacheRecord,
  budget: LinearBudgetStatus | null
): boolean {
  if (issueContextCacheRecordCarriesLivePrTruth(record.issue)) {
    return false;
  }
  if (!budget || budget.cooldown_active) {
    return false;
  }
  const requestPressure = resolveLinearPollingInterval({
    budget,
    default_interval_ms: PROVIDER_LINEAR_LOW_HEADROOM_READ_DETECTION_INTERVAL_MS
  });
  if (
    !requestPressure.reason?.startsWith('linear_budget_requests_') &&
    !requestPressure.reason?.startsWith('linear_budget_endpoint_requests_')
  ) {
    return false;
  }
  return isIssueContextCacheRecordFresh(record, PROVIDER_LINEAR_LOW_HEADROOM_READ_CACHE_MAX_AGE_MS);
}

function issueContextCacheRecordCarriesLivePrTruth(issue: ProviderLinearIssueContext): boolean {
  const workflowState = classifyProviderLinearWorkflowState({
    state: issue.state?.name ?? null,
    state_type: issue.state?.type ?? null
  });
  const githubPullRequestAttachmentCount = issue.attachments.filter((attachment) =>
    parseGitHubPullRequestUrl(attachment.url)
  ).length;
  const classifiedPullRequestAttachmentCount = (
    (issue.pull_request_attachments.current ? 1 : 0)
    + issue.pull_request_attachments.historical.length
    + issue.pull_request_attachments.conflicting.length
    + issue.pull_request_attachments.unknown.length
  );
  if (
    issue.pull_request_attachments.current
    || issue.pull_request_attachments.conflicting.length > 0
    || issue.pull_request_attachments.unknown.length > 0
  ) {
    return true;
  }
  if (githubPullRequestAttachmentCount > classifiedPullRequestAttachmentCount) {
    return true;
  }
  if (workflowState.normalizedState === 'merging') {
    return (
      issue.pull_request_attachments.historical.length > 0
      || githubPullRequestAttachmentCount > 0
    );
  }
  if (issue.pull_request_attachments.historical.length > 0) {
    return false;
  }
  if (githubPullRequestAttachmentCount > 0) {
    return true;
  }
  return false;
}

function sameIssueContextAttachmentTruth(
  left: Pick<ProviderLinearIssueContext, 'attachments' | 'pull_request_attachments'>,
  right: Pick<ProviderLinearIssueContext, 'attachments' | 'pull_request_attachments'>
): boolean {
  return serializeIssueContextAttachmentTruth(left) === serializeIssueContextAttachmentTruth(right);
}

function issueContextHasAnyAttachmentTruth(
  issue: Pick<ProviderLinearIssueContext, 'attachments' | 'pull_request_attachments'>
): boolean {
  return (
    issue.attachments.length > 0 ||
    issue.pull_request_attachments.current !== null ||
    issue.pull_request_attachments.historical.length > 0 ||
    issue.pull_request_attachments.conflicting.length > 0 ||
    issue.pull_request_attachments.unknown.length > 0
  );
}

function cloneIssueContextAttachmentTruth(
  issue: Pick<ProviderLinearIssueContext, 'attachments' | 'pull_request_attachments'>
): Pick<ProviderLinearIssueContext, 'attachments' | 'pull_request_attachments'> {
  return {
    attachments: [...issue.attachments],
    pull_request_attachments: {
      current: issue.pull_request_attachments.current,
      historical: [...issue.pull_request_attachments.historical],
      conflicting: [...issue.pull_request_attachments.conflicting],
      unknown: [...issue.pull_request_attachments.unknown]
    }
  };
}

function serializeIssueContextAttachmentTruth(
  issue: Pick<ProviderLinearIssueContext, 'attachments' | 'pull_request_attachments'>
): string {
  return JSON.stringify({
    attachments: issue.attachments.map((attachment) =>
      serializeIssueContextAttachmentTruthEntry(attachment)
    ),
    pull_request_attachments: {
      current: serializeIssueContextAttachmentTruthEntry(issue.pull_request_attachments.current),
      historical: issue.pull_request_attachments.historical.map((attachment) =>
        serializeIssueContextAttachmentTruthEntry(attachment)
      ),
      conflicting: issue.pull_request_attachments.conflicting.map((attachment) =>
        serializeIssueContextAttachmentTruthEntry(attachment)
      ),
      unknown: issue.pull_request_attachments.unknown.map((attachment) =>
        serializeIssueContextAttachmentTruthEntry(attachment)
      )
    }
  });
}

function serializeIssueContextAttachmentTruthEntry(
  attachment: ProviderLinearWorkflowAttachment | null
): { id: string; title: string | null; url: string | null; source_type: string | null } | null {
  if (!attachment) {
    return null;
  }
  return {
    id: attachment.id,
    title: attachment.title,
    url: attachment.url,
    source_type: attachment.source_type
  };
}

async function writeCachedIssueContextRecord(
  env: NodeJS.ProcessEnv | undefined,
  issue: ProviderLinearIssueContext,
  sourceSetup: DispatchPilotSourceSetup | null,
  options?: {
    embeddedWorkpad?: ProviderLinearEmbeddedWorkpadCacheRecord | null;
    preserveExistingAttachmentTruthWhenEmpty?: boolean;
    preserveRecordedAtWhenAttachmentTruthUnchanged?: boolean;
  }
): Promise<void> {
  const cachePath = resolveIssueContextCachePath(env, issue.id);
  if (!cachePath) {
    return;
  }
  const existingRecord = await readCachedIssueContextRecord(env, issue.id, sourceSetup);
  const embeddedWorkpad =
    options && Object.prototype.hasOwnProperty.call(options, 'embeddedWorkpad')
      ? options.embeddedWorkpad ?? null
      : existingRecord?.embedded_workpad ?? null;
  const issueWithPreservedAttachmentTruth =
    options?.preserveExistingAttachmentTruthWhenEmpty === true &&
    existingRecord &&
    !issueContextHasAnyAttachmentTruth(issue) &&
    issueContextHasAnyAttachmentTruth(existingRecord.issue)
      ? {
          ...issue,
          ...cloneIssueContextAttachmentTruth(existingRecord.issue)
        }
      : issue;
  const recordedAt =
    options?.preserveRecordedAtWhenAttachmentTruthUnchanged === true &&
    existingRecord &&
    sameIssueContextAttachmentTruth(existingRecord.issue, issueWithPreservedAttachmentTruth)
      ? existingRecord.recorded_at
      : new Date().toISOString();
  const record: ProviderLinearIssueContextCacheRecord = {
    schema_version: 2,
    issue_id: issue.id,
    recorded_at: recordedAt,
    source_setup: sourceSetup,
    issue: issueWithPreservedAttachmentTruth,
    ...(embeddedWorkpad ? { embedded_workpad: embeddedWorkpad } : {})
  };
  try {
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, JSON.stringify(record, null, 2), 'utf8');
  } catch {
    // Cache persistence is best-effort for provider-worker runs; it must not
    // change the success path of the Linear mutation itself.
  }
}

function parseIssueContextCacheRecord(value: unknown): ProviderLinearIssueContextCacheRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schema_version !== 1 && record.schema_version !== 2) {
    return null;
  }
  const issueId = normalizeRequiredString(record.issue_id as string | null | undefined);
  const recordedAt = normalizeRequiredString(record.recorded_at as string | null | undefined);
  const issue = parseCachedIssueContext(record.issue);
  const embeddedWorkpad =
    record.schema_version === 2
      ? parseEmbeddedWorkpadCacheRecord(record.embedded_workpad)
      : null;
  if (
    record.schema_version === 2 &&
    record.embedded_workpad !== undefined &&
    record.embedded_workpad !== null &&
    embeddedWorkpad === null
  ) {
    return null;
  }
  if (!issueId || !recordedAt || !issue || issue.id !== issueId) {
    return null;
  }
  return {
    schema_version: record.schema_version,
    issue_id: issueId,
    recorded_at: recordedAt,
    source_setup: parseCachedSourceSetup(record.source_setup),
    issue,
    ...(embeddedWorkpad ? { embedded_workpad: embeddedWorkpad } : {})
  };
}

function parseEmbeddedWorkpadCacheRecord(value: unknown): ProviderLinearEmbeddedWorkpadCacheRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const commentId = normalizeRequiredString(record.comment_id as string | null | undefined);
  const originalBody = normalizeRequiredString(record.original_body as string | null | undefined);
  const resolvedBody = normalizeRequiredString(record.resolved_body as string | null | undefined);
  const localImages = parseEmbeddedWorkpadLocalImageCacheEntries(record.local_images);
  if (!commentId || !originalBody || !resolvedBody || localImages === null || localImages.length === 0) {
    return null;
  }
  return {
    comment_id: commentId,
    original_body: originalBody,
    resolved_body: resolvedBody,
    local_images: localImages
  };
}

function parseEmbeddedWorkpadLocalImageCacheEntries(
  value: unknown
): ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const entries: ProviderLinearEmbeddedWorkpadLocalImageCacheEntry[] = [];
  for (const entry of value) {
    const parsedEntry = parseEmbeddedWorkpadLocalImageCacheEntry(entry);
    if (!parsedEntry) {
      return null;
    }
    entries.push(parsedEntry);
  }
  return entries;
}

function parseEmbeddedWorkpadLocalImageCacheEntry(
  value: unknown
): ProviderLinearEmbeddedWorkpadLocalImageCacheEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const entry = value as Record<string, unknown>;
  const originalReference = normalizeRequiredString(entry.original_reference as string | null | undefined);
  const resolvedPath = normalizeRequiredString(entry.resolved_path as string | null | undefined);
  const sizeBytes = typeof entry.size_bytes === 'number' ? entry.size_bytes : Number.NaN;
  const mtimeMs = typeof entry.mtime_ms === 'number' ? entry.mtime_ms : Number.NaN;
  if (
    !originalReference ||
    !resolvedPath ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes <= 0 ||
    !Number.isFinite(mtimeMs) ||
    mtimeMs < 0
  ) {
    return null;
  }
  return {
    original_reference: originalReference,
    resolved_path: resolvedPath,
    size_bytes: sizeBytes,
    mtime_ms: mtimeMs
  };
}

function parseCachedIssueContext(value: unknown): ProviderLinearIssueContext | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const issue = value as Record<string, unknown>;
  const id = normalizeRequiredString(issue.id as string | null | undefined);
  const identifier = normalizeRequiredString(issue.identifier as string | null | undefined);
  const title = normalizeRequiredString(issue.title as string | null | undefined);
  const state = parseCachedWorkflowState(issue.state);
  const team = parseCachedIssueTeam(issue.team);
  const project = parseCachedIssueProject(issue.project);
  const labels = parseCachedIssueLabels(issue.labels);
  const comments = parseCachedIssueComments(issue.comments);
  const attachments = parseCachedIssueAttachments(issue.attachments);
  const pullRequestAttachments = parseCachedIssuePullRequestAttachments(
    issue.pull_request_attachments
  );
  if (!id || !identifier || !title || labels === null || comments === null || attachments === null) {
    return null;
  }
  if (issue.state !== undefined && issue.state !== null && state === null) {
    return null;
  }
  if (issue.team !== undefined && issue.team !== null && team === null) {
    return null;
  }
  if (issue.project !== undefined && issue.project !== null && project === null) {
    return null;
  }
  if (
    issue.pull_request_attachments !== undefined &&
    issue.pull_request_attachments !== null &&
    pullRequestAttachments === null
  ) {
    return null;
  }

  const workpadComment = parseCachedIssueWorkpadComment(issue.workpad_comment, comments);
  if (issue.workpad_comment !== undefined && issue.workpad_comment !== null && workpadComment === null) {
    return null;
  }
  const cachedPullRequestAttachments =
    pullRequestAttachments ?? buildUnknownIssuePullRequestAttachments(attachments);

  return {
    id,
    identifier,
    title,
    description: normalizeOptionalString(issue.description as string | null | undefined),
    url: normalizeOptionalString(issue.url as string | null | undefined),
    updated_at: normalizeIso(issue.updated_at as string | null | undefined),
    archived_at: normalizeIso(issue.archived_at as string | null | undefined),
    trashed: normalizeOptionalBoolean(issue.trashed),
    workspace_id: normalizeOptionalString(issue.workspace_id as string | null | undefined),
    state,
    team,
    project,
    labels,
    comments,
    attachments,
    pull_request_attachments: cachedPullRequestAttachments,
    workpad_comment: workpadComment
  };
}

function parseCachedWorkflowState(value: unknown): ProviderLinearWorkflowState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeRequiredString(record.id as string | null | undefined);
  const name = normalizeRequiredString(record.name as string | null | undefined);
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    type: normalizeOptionalString(record.type as string | null | undefined)
  };
}

function parseCachedIssueTeam(value: unknown): ProviderLinearIssueContext['team'] | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.states)) {
    return null;
  }
  const states = record.states
    .map((entry) => parseCachedWorkflowState(entry))
    .filter((entry): entry is ProviderLinearWorkflowState => entry !== null);
  if (states.length !== record.states.length) {
    return null;
  }
  return {
    id: normalizeOptionalString(record.id as string | null | undefined),
    key: normalizeOptionalString(record.key as string | null | undefined),
    name: normalizeOptionalString(record.name as string | null | undefined),
    states
  };
}

function parseCachedIssueProject(value: unknown): ProviderLinearIssueContext['project'] | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    id: normalizeOptionalString(record.id as string | null | undefined),
    name: normalizeOptionalString(record.name as string | null | undefined)
  };
}

function parseCachedIssueLabels(value: unknown): ProviderLinearIssueLabel[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const labels = value
    .map((entry) => parseCachedIssueLabel(entry))
    .filter((entry): entry is ProviderLinearIssueLabel => entry !== null);
  return labels.length === value.length ? labels : null;
}

function parseCachedIssueLabel(value: unknown): ProviderLinearIssueLabel | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeRequiredString(record.id as string | null | undefined);
  const name = normalizeRequiredString(record.name as string | null | undefined);
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    color: normalizeOptionalString(record.color as string | null | undefined)
  };
}

function parseCachedIssueComments(value: unknown): ProviderLinearWorkflowComment[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const comments = value
    .map((entry) => parseCachedComment(entry))
    .filter((entry): entry is ProviderLinearWorkflowComment => entry !== null);
  return comments.length === value.length ? comments : null;
}

function parseCachedComment(value: unknown): ProviderLinearWorkflowComment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeRequiredString(record.id as string | null | undefined);
  const body = normalizeRequiredString(record.body as string | null | undefined);
  if (!id || !body) {
    return null;
  }
  return {
    id,
    body,
    url: normalizeOptionalString(record.url as string | null | undefined),
    created_at: normalizeIso(record.created_at as string | null | undefined),
    updated_at: normalizeIso(record.updated_at as string | null | undefined),
    resolved_at: normalizeIso(record.resolved_at as string | null | undefined)
  };
}

function parseCachedIssueAttachments(value: unknown): ProviderLinearWorkflowAttachment[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const attachments = value
    .map((entry) => parseCachedAttachment(entry))
    .filter((entry): entry is ProviderLinearWorkflowAttachment => entry !== null);
  return attachments.length === value.length ? attachments : null;
}

function parseCachedAttachment(value: unknown): ProviderLinearWorkflowAttachment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeRequiredString(record.id as string | null | undefined);
  if (!id) {
    return null;
  }
  return {
    id,
    title: normalizeOptionalString(record.title as string | null | undefined),
    url: normalizeOptionalString(record.url as string | null | undefined),
    source_type: normalizeOptionalString(record.source_type as string | null | undefined)
  };
}

function parseCachedIssuePullRequestAttachments(
  value: unknown
): ProviderLinearIssuePullRequestAttachments | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const current =
    record.current === null
      ? null
      : record.current === undefined
        ? null
        : parseCachedAttachment(record.current);
  const historical = parseOptionalCachedAttachmentArray(record.historical);
  const conflicting = parseOptionalCachedAttachmentArray(record.conflicting);
  const unknown = parseOptionalCachedAttachmentArray(record.unknown);
  if (
    (record.current !== undefined && record.current !== null && current === null) ||
    historical === null ||
    conflicting === null ||
    unknown === null
  ) {
    return null;
  }
  return {
    current,
    historical,
    conflicting,
    unknown
  };
}

function parseOptionalCachedAttachmentArray(
  value: unknown
): ProviderLinearWorkflowAttachment[] | null {
  if (value === undefined || value === null) {
    return [];
  }
  return parseCachedIssueAttachments(value);
}

function parseCachedIssueWorkpadComment(
  value: unknown,
  comments: readonly ProviderLinearWorkflowComment[]
): ProviderLinearWorkflowComment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const comment = parseCachedComment(value);
  if (!comment) {
    return null;
  }
  const matchingComment = comments.find((entry) => entry.id === comment.id) ?? null;
  if (!matchingComment) {
    return null;
  }
  return matchingComment;
}

function parseCachedSourceSetup(value: unknown): DispatchPilotSourceSetup | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.provider !== 'linear') {
    return null;
  }
  return {
    provider: 'linear',
    workspace_id: normalizeOptionalString(record.workspace_id as string | null | undefined),
    team_id: normalizeOptionalString(record.team_id as string | null | undefined),
    project_id: normalizeOptionalString(record.project_id as string | null | undefined)
  };
}

function sameResolvedSourceSetup(
  left: DispatchPilotSourceSetup | null,
  right: DispatchPilotSourceSetup | null
): boolean {
  const leftWorkspace = left?.workspace_id ?? null;
  const leftTeam = left?.team_id ?? null;
  const leftProject = left?.project_id ?? null;
  const rightWorkspace = right?.workspace_id ?? null;
  const rightTeam = right?.team_id ?? null;
  const rightProject = right?.project_id ?? null;
  return (
    leftWorkspace === rightWorkspace &&
    leftTeam === rightTeam &&
    leftProject === rightProject
  );
}

function upsertIssueContextWorkpadComment(
  issue: ProviderLinearIssueContext,
  comment: ProviderLinearWorkflowComment
): ProviderLinearIssueContext {
  const nextComments = issue.comments.some((entry) => entry.id === comment.id)
    ? issue.comments.map((entry) => (entry.id === comment.id ? comment : entry))
    : [...issue.comments, comment];
  return {
    ...issue,
    comments: nextComments,
    workpad_comment: comment
  };
}

function removeIssueContextComment(issue: ProviderLinearIssueContext, commentId: string): ProviderLinearIssueContext {
  const nextComments = issue.comments.filter((entry) => entry.id !== commentId);
  return {
    ...issue,
    comments: nextComments,
    workpad_comment: findWorkpadComment(nextComments)
  };
}

async function readIssueSummary(
  session: ResolvedLinearWorkflowSession,
  operation: ProviderLinearOperation,
  issueId: string,
  options: {
    allowBelowRequestReserve?: boolean;
  } = {}
):
  Promise<
    | {
        ok: true;
        issue: ProviderLinearIssueSummary;
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const result = await executeProviderLinearGraphql<LinearIssueSummaryQueryResponse>({
    session,
    operation,
    step: 'read-issue-summary',
    query: buildIssueSummaryQuery(),
    variables: {
      issueId
    },
    allowBelowRequestReserve: options.allowBelowRequestReserve === true
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error
    };
  }

  const issueNode = result.payload.data?.issue ?? null;
  if (!issueNode) {
    return {
      ok: false,
      error: {
        code: 'linear_issue_not_found',
        message: `Linear issue "${issueId}" was not found.`,
        status: 404
      }
    };
  }

  const parsedIssue = parseIssueSummary(
    issueNode,
    result.payload.data?.viewer?.organization?.id ?? null,
    session.sourceSetup
  );
  if (!parsedIssue.ok) {
    return {
      ok: false,
      error: parsedIssue.error
    };
  }

  return {
    ok: true,
    issue: parsedIssue.issue
  };
}

async function readIssueContext(
  session: ResolvedLinearWorkflowSession,
  operation: ProviderLinearOperation,
  issueId: string,
  options: {
    includeComments?: boolean;
    includeAttachments?: boolean;
    allowBelowRequestReserve?: boolean;
  } = {}
):
  Promise<
    | {
        ok: true;
        issue: ProviderLinearIssueContext;
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const includeComments = options.includeComments !== false;
  const includeAttachments = options.includeAttachments !== false;
  let issueNode: NonNullable<LinearIssueContextQueryResponse['issue']> | null = null;
  let workspaceId: string | null = null;
  const comments: ProviderLinearWorkflowComment[] = [];
  const seenCommentIds = new Set<string>();
  const attachments: ProviderLinearWorkflowAttachment[] = [];
  const seenAttachmentIds = new Set<string>();
  const seenCursors = new Set<string>();
  let commentsAfter: string | null = null;
  let hasNextCommentPage = includeComments;
  let firstPage = true;

  while (firstPage || hasNextCommentPage) {
    const allowBelowRequestReserve = firstPage && options.allowBelowRequestReserve === true;
    const result = await executeProviderLinearGraphql<LinearIssueContextQueryResponse>({
      session,
      operation,
      step: commentsAfter ? 'read-issue-context-page' : 'read-issue-context',
      query: buildIssueContextQuery({
        includeComments,
        includeAttachments
      }),
      variables:
        includeComments
          ? {
              issueId,
              commentsAfter
            }
          : {
              issueId
            },
      allowBelowRequestReserve
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    const nextIssueNode = result.payload.data?.issue ?? null;
    if (!nextIssueNode) {
      return {
        ok: false,
        error: {
          code: 'linear_issue_not_found',
          message: `Linear issue "${issueId}" was not found.`,
          status: 404
        }
      };
    }

    issueNode = nextIssueNode;
    workspaceId = normalizeOptionalString(result.payload.data?.viewer?.organization?.id ?? null);
    if (includeComments) {
      const nextComments = Array.isArray(nextIssueNode.comments?.nodes)
        ? nextIssueNode.comments.nodes
            .map((entry) => parseComment(entry))
            .filter((entry): entry is ProviderLinearWorkflowComment => entry !== null)
        : [];
      for (const entry of nextComments) {
        if (seenCommentIds.has(entry.id)) {
          continue;
        }
        seenCommentIds.add(entry.id);
        comments.push(entry);
      }
    }
    if (includeAttachments) {
      const nextAttachments = Array.isArray(nextIssueNode.attachments?.nodes)
        ? nextIssueNode.attachments.nodes
            .map((entry) => parseAttachment(entry))
            .filter((entry): entry is ProviderLinearWorkflowAttachment => entry !== null)
        : [];
      for (const entry of nextAttachments) {
        if (seenAttachmentIds.has(entry.id)) {
          continue;
        }
        seenAttachmentIds.add(entry.id);
        attachments.push(entry);
      }
    }

    firstPage = false;
    if (!includeComments) {
      hasNextCommentPage = false;
      continue;
    }
    const pageInfo = nextIssueNode.comments?.pageInfo ?? null;
    hasNextCommentPage = pageInfo?.hasNextPage === true;
    if (!hasNextCommentPage) {
      continue;
    }
    const nextCursor = normalizeOptionalString(pageInfo?.endCursor);
    if (!nextCursor || seenCursors.has(nextCursor)) {
      return {
        ok: false,
        error: {
          code: 'linear_comment_pagination_invalid',
          message: 'Linear issue comments pagination returned an invalid cursor.',
          status: 503
        }
      };
    }
    seenCursors.add(nextCursor);
    commentsAfter = nextCursor;
  }

  if (!issueNode) {
    return {
      ok: false,
      error: {
        code: 'linear_issue_not_found',
        message: `Linear issue "${issueId}" was not found.`,
        status: 404
      }
    };
  }

  const attachmentResult = includeAttachments
    ? await readIssueAttachmentPages(
        session,
        operation,
        issueId,
        issueNode.attachments?.pageInfo ?? null,
        attachments,
        seenAttachmentIds
      )
    : {
        ok: true as const,
        attachments
      };
  if (!attachmentResult.ok) {
    return attachmentResult;
  }

  const parsedIssue = parseIssueContext(
    issueNode,
    workspaceId,
    session.sourceSetup,
    comments,
    attachmentResult.attachments,
    includeAttachments ? undefined : null
  );
  if (!parsedIssue.ok) {
    return {
      ok: false,
      error: parsedIssue.error
    };
  }

  return {
    ok: true,
    issue: parsedIssue.issue
  };
}

function parseIssueSummary(
  issueNode: NonNullable<LinearIssueSummaryQueryResponse['issue']>,
  workspaceId: string | null | undefined,
  sourceSetup: DispatchPilotSourceSetup | null
):
  | {
      ok: true;
      issue: ProviderLinearIssueSummary;
    }
  | {
      ok: false;
      error: ProviderLinearWorkflowError;
    } {
  const id = normalizeRequiredString(issueNode.id);
  const identifier = normalizeRequiredString(issueNode.identifier);
  if (!id || !identifier) {
    return {
      ok: false,
      error: {
        code: 'linear_response_invalid',
        message: 'Linear issue response was missing required fields.',
        status: 503
      }
    };
  }

  const teamId = normalizeOptionalString(issueNode.team?.id);
  const projectId = normalizeOptionalString(issueNode.project?.id);
  const normalizedWorkspaceId = normalizeOptionalString(workspaceId);
  if (sourceSetup?.workspace_id && sourceSetup.workspace_id !== normalizedWorkspaceId) {
    return scopeMismatchError('workspace', sourceSetup.workspace_id, normalizedWorkspaceId);
  }
  if (sourceSetup?.team_id && sourceSetup.team_id !== teamId) {
    return scopeMismatchError('team', sourceSetup.team_id, teamId);
  }
  if (sourceSetup?.project_id && sourceSetup.project_id !== projectId) {
    return scopeMismatchError('project', sourceSetup.project_id, projectId);
  }
  const labels = parseIssueLabelConnection(issueNode.labels);
  if (labels === null) {
    return {
      ok: false,
      error: {
        code: 'linear_response_invalid',
        message: 'Linear issue response was missing required label fields.',
        status: 503
      }
    };
  }

  return {
    ok: true,
    issue: {
      id,
      identifier,
      url: normalizeOptionalString(issueNode.url),
      updated_at: normalizeIso(issueNode.updatedAt),
      archived_at: normalizeIso(issueNode.archivedAt),
      trashed: normalizeOptionalBoolean(issueNode.trashed),
      workspace_id: normalizedWorkspaceId,
      state: parseWorkflowState(issueNode.state ?? null),
      team: issueNode.team
        ? {
            id: teamId,
            key: normalizeOptionalString(issueNode.team.key),
            name: normalizeOptionalString(issueNode.team.name),
            states: Array.isArray(issueNode.team.states?.nodes)
              ? issueNode.team.states.nodes
                  .map((entry) => parseWorkflowState(entry))
                  .filter((entry): entry is ProviderLinearWorkflowState => entry !== null)
              : []
          }
        : null,
      project: issueNode.project
        ? {
            id: projectId,
            name: normalizeOptionalString(issueNode.project.name)
          }
        : null,
      labels
    }
  };
}

function parseIssueContext(
  issueNode: NonNullable<LinearIssueContextQueryResponse['issue']>,
  workspaceId: string | null | undefined,
  sourceSetup: DispatchPilotSourceSetup | null,
  commentsOverride?: readonly ProviderLinearWorkflowComment[] | null,
  attachmentsOverride?: readonly ProviderLinearWorkflowAttachment[] | null,
  pullRequestAttachmentsOverride?: ProviderLinearIssuePullRequestAttachments | null
):
  | {
      ok: true;
      issue: ProviderLinearIssueContext;
    }
  | {
      ok: false;
      error: ProviderLinearWorkflowError;
    } {
  const id = normalizeRequiredString(issueNode.id);
  const identifier = normalizeRequiredString(issueNode.identifier);
  const title = normalizeRequiredString(issueNode.title);
  if (!id || !identifier || !title) {
    return {
      ok: false,
      error: {
        code: 'linear_response_invalid',
        message: 'Linear issue response was missing required fields.',
        status: 503
      }
    };
  }

  const teamId = normalizeOptionalString(issueNode.team?.id);
  const projectId = normalizeOptionalString(issueNode.project?.id);
  const normalizedWorkspaceId = normalizeOptionalString(workspaceId);
  if (sourceSetup?.workspace_id && sourceSetup.workspace_id !== normalizedWorkspaceId) {
    return scopeMismatchError('workspace', sourceSetup.workspace_id, normalizedWorkspaceId);
  }
  if (sourceSetup?.team_id && sourceSetup.team_id !== teamId) {
    return scopeMismatchError('team', sourceSetup.team_id, teamId);
  }
  if (sourceSetup?.project_id && sourceSetup.project_id !== projectId) {
    return scopeMismatchError('project', sourceSetup.project_id, projectId);
  }
  const labels = parseIssueLabelConnection(issueNode.labels);
  if (labels === null) {
    return {
      ok: false,
      error: {
        code: 'linear_response_invalid',
        message: 'Linear issue response was missing required label fields.',
        status: 503
      }
    };
  }

  const comments =
    commentsOverride !== undefined && commentsOverride !== null
      ? [...commentsOverride]
      : Array.isArray(issueNode.comments?.nodes)
        ? issueNode.comments.nodes
            .map((entry) => parseComment(entry))
            .filter((entry): entry is ProviderLinearWorkflowComment => entry !== null)
        : [];
  const workpadComment = findWorkpadComment(comments);

  return {
    ok: true,
    issue: {
      id,
      identifier,
      title,
      description: normalizeOptionalString(issueNode.description),
      url: normalizeOptionalString(issueNode.url),
      updated_at: normalizeIso(issueNode.updatedAt),
      archived_at: normalizeIso(issueNode.archivedAt),
      trashed: normalizeOptionalBoolean(issueNode.trashed),
      workspace_id: normalizedWorkspaceId,
      state: parseWorkflowState(issueNode.state ?? null),
      team: issueNode.team
        ? {
            id: teamId,
            key: normalizeOptionalString(issueNode.team.key),
            name: normalizeOptionalString(issueNode.team.name),
            states: Array.isArray(issueNode.team.states?.nodes)
              ? issueNode.team.states.nodes
                  .map((entry) => parseWorkflowState(entry))
                  .filter((entry): entry is ProviderLinearWorkflowState => entry !== null)
              : []
          }
        : null,
      project: issueNode.project
        ? {
            id: projectId,
            name: normalizeOptionalString(issueNode.project.name)
          }
        : null,
      labels,
      comments,
      attachments:
        attachmentsOverride !== undefined && attachmentsOverride !== null
          ? [...attachmentsOverride]
          : Array.isArray(issueNode.attachments?.nodes)
            ? issueNode.attachments.nodes
                .map((entry) => parseAttachment(entry))
                .filter((entry): entry is ProviderLinearWorkflowAttachment => entry !== null)
            : [],
      pull_request_attachments:
        pullRequestAttachmentsOverride ?? buildEmptyIssuePullRequestAttachments(),
      workpad_comment: workpadComment
    }
  };
}

function buildIssueContextQuery(options: {
  includeComments: boolean;
  includeAttachments: boolean;
}): string {
  const commentsVariable = options.includeComments ? ', $commentsAfter: String' : '';
  const commentsSection = options.includeComments
    ? `
      comments(first: ${LINEAR_WORKFLOW_COMMENT_LIMIT}, after: $commentsAfter) {
        nodes {
          id
          body
          url
          createdAt
          updatedAt
          resolvedAt
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }`
    : '';
  const attachmentsSection = options.includeAttachments
    ? `
      attachments(first: ${LINEAR_WORKFLOW_ATTACHMENT_LIMIT}) {
        nodes {
          id
          title
          url
          sourceType
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }`
    : '';
  return `query ProviderLinearIssueContext($issueId: String!${commentsVariable}) {
    viewer {
      id
      organization {
        id
      }
    }
    issue(id: $issueId) {
      id
      identifier
      title
      description
      url
      updatedAt
      archivedAt
      trashed
      state {
        id
        name
        type
      }
      team {
        id
        key
        name
        states(first: ${LINEAR_WORKFLOW_STATE_LIMIT}) {
          nodes {
            id
            name
            type
          }
        }
      }
      project {
        id
        name
      }
      labels(first: ${LINEAR_WORKFLOW_LABEL_LIMIT}) {
        nodes {
          id
          name
          color
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
${commentsSection}
${attachmentsSection}
    }
  }`;
}

function buildIssueSummaryQuery(): string {
  return `query ProviderLinearIssueSummary($issueId: String!) {
    viewer {
      id
      organization {
        id
      }
    }
    issue(id: $issueId) {
      id
      identifier
      url
      updatedAt
      archivedAt
      trashed
      state {
        id
        name
        type
      }
      team {
        id
        key
        name
        states(first: ${LINEAR_WORKFLOW_STATE_LIMIT}) {
          nodes {
            id
            name
            type
          }
        }
      }
      project {
        id
        name
      }
      labels(first: ${LINEAR_WORKFLOW_LABEL_LIMIT}) {
        nodes {
          id
          name
          color
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }`;
}

function buildIssueAttachmentPageQuery(): string {
  return `query ProviderLinearIssueAttachments($issueId: String!, $attachmentsAfter: String!) {
    issue(id: $issueId) {
      id
      attachments(first: ${LINEAR_WORKFLOW_ATTACHMENT_LIMIT}, after: $attachmentsAfter) {
        nodes {
          id
          title
          url
          sourceType
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }`;
}

function buildCreateCommentMutation(): string {
  return `mutation ProviderLinearCreateComment($issueId: String!, $body: String!) {
    commentCreate(input: { issueId: $issueId, body: $body }) {
      success
      comment {
        id
        url
        body
      }
    }
  }`;
}

function buildUpdateCommentMutation(): string {
  return `mutation ProviderLinearUpdateComment($id: String!, $body: String!) {
    commentUpdate(id: $id, input: { body: $body }) {
      success
      comment {
        id
        url
        body
      }
    }
  }`;
}

function buildDeleteCommentMutation(): string {
  return `mutation ProviderLinearDeleteComment($id: String!) {
    commentDelete(id: $id) {
      success
      entityId
    }
  }`;
}

function buildFileUploadMutation(): string {
  return `mutation ProviderLinearFileUpload($contentType: String!, $filename: String!, $size: Int!) {
    fileUpload(contentType: $contentType, filename: $filename, size: $size) {
      success
      uploadFile {
        uploadUrl
        assetUrl
        headers {
          key
          value
        }
      }
    }
  }`;
}

function buildIssueTransitionMutation(): string {
  return `mutation ProviderLinearMoveIssue($id: String!, $stateId: String!) {
    issueUpdate(id: $id, input: { stateId: $stateId }) {
      success
      issue {
        id
        identifier
        updatedAt
        state {
          id
          name
          type
        }
      }
    }
  }`;
}

function buildIssueDescriptionUpdateMutation(): string {
  return `mutation ProviderLinearUpdateIssueDescription($id: String!, $description: String!) {
    issueUpdate(id: $id, input: { description: $description }) {
      success
      issue {
        id
        identifier
        title
        description
        url
        state {
          id
          name
          type
        }
        team {
          id
          key
          name
        }
        project {
          id
          name
        }
        labels(first: ${LINEAR_WORKFLOW_LABEL_LIMIT}) {
          nodes {
            id
            name
            color
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }`;
}

function buildIssueLabelsUpdateMutation(): string {
  return `mutation ProviderLinearUpdateIssueLabels($id: String!, $labelIds: [String!]!) {
    issueUpdate(id: $id, input: { addedLabelIds: $labelIds }) {
      success
      issue {
        id
        identifier
        title
        description
        url
        state {
          id
          name
          type
        }
        team {
          id
          key
          name
        }
        project {
          id
          name
        }
        labels(first: ${LINEAR_WORKFLOW_LABEL_LIMIT}) {
          nodes {
            id
            name
            color
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }`;
}

function buildAttachGithubPrMutation(): string {
  return `mutation ProviderLinearAttachGitHubPr($issueId: String!, $url: String!, $title: String) {
    attachmentLinkGitHubPR(issueId: $issueId, url: $url, title: $title, linkKind: links) {
      success
      attachment {
        id
        title
        url
        sourceType
      }
    }
  }`;
}

function buildAttachUrlMutation(): string {
  return `mutation ProviderLinearAttachUrl($issueId: String!, $url: String!, $title: String) {
    attachmentLinkURL(issueId: $issueId, url: $url, title: $title) {
      success
      attachment {
        id
        title
        url
        sourceType
      }
    }
  }`;
}

function buildCreateFollowUpIssueMutation(): string {
  return `mutation ProviderLinearCreateFollowUpIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        description
        url
        state {
          id
          name
          type
        }
        team {
          id
          key
          name
        }
        project {
          id
          name
        }
        labels(first: ${LINEAR_WORKFLOW_LABEL_LIMIT}) {
          nodes {
            id
            name
            color
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }`;
}

function buildCanonicalOwnerIssuesQuery(): string {
  return `query ProviderLinearCanonicalFollowUpOwners($teamId: ID!, $projectId: ID!, $marker: String!, $first: Int!, $after: String) {
    issues(
      first: $first
      after: $after
      orderBy: updatedAt
      filter: {
        team: { id: { eq: $teamId } }
        project: { id: { eq: $projectId } }
        state: { type: { nin: ["completed", "canceled"] } }
        description: { contains: $marker }
      }
    ) {
      nodes {
        id
        identifier
        title
        description
        url
        archivedAt
        trashed
        state {
          id
          name
          type
        }
        team {
          id
          key
          name
        }
        project {
          id
          name
        }
        labels(first: ${LINEAR_WORKFLOW_LABEL_LIMIT}) {
          nodes {
            id
            name
            color
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }`;
}

function buildCreateIssueRelationMutation(): string {
  return `mutation ProviderLinearCreateIssueRelation($input: IssueRelationCreateInput!) {
    issueRelationCreate(input: $input) {
      success
      issueRelation {
        id
        type
      }
    }
  }`;
}

function resolveWorkflowSourceSetup(
  sourceSetup: DispatchPilotSourceSetup | null | undefined,
  env: NodeJS.ProcessEnv
): DispatchPilotSourceSetup | null {
  const resolved =
    sourceSetup == null
      ? resolveLinearSourceSetup(
          {
            provider: 'linear',
            workspace_id: null,
            team_id: null,
            project_id: null
          },
          env
        )
      : {
          provider: 'linear' as const,
          workspace_id: sourceSetup.workspace_id ?? null,
          team_id: sourceSetup.team_id ?? null,
          project_id: sourceSetup.project_id ?? null
        };
  return resolved.workspace_id || resolved.team_id || resolved.project_id ? resolved : null;
}

function parseWorkflowState(
  value:
    | {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      }
    | null
): ProviderLinearWorkflowState | null {
  const id = normalizeRequiredString(value?.id);
  const name = normalizeRequiredString(value?.name);
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    type: normalizeOptionalString(value?.type)
  };
}

function parseIssueLabelConnection(
  value:
    | {
        nodes?: Array<{
          id?: string | null;
          name?: string | null;
          color?: string | null;
        }> | null;
        pageInfo?: LinearConnectionPageInfo | null;
      }
    | null
    | undefined
): ProviderLinearIssueLabel[] | null {
  if (!Array.isArray(value?.nodes) || value.pageInfo?.hasNextPage !== false) {
    return null;
  }
  return parseIssueLabels(value.nodes);
}

function parseIssueLabels(
  value:
    | Array<{
        id?: string | null;
        name?: string | null;
        color?: string | null;
      }>
    | null
    | undefined
): ProviderLinearIssueLabel[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const labels = value
    .map((entry) => parseIssueLabel(entry))
    .filter((entry): entry is ProviderLinearIssueLabel => entry !== null);
  return labels.length === value.length ? labels : null;
}

function parseIssueLabel(
  value:
    | {
        id?: string | null;
        name?: string | null;
        color?: string | null;
      }
    | null
): ProviderLinearIssueLabel | null {
  const id = normalizeRequiredString(value?.id);
  const name = normalizeRequiredString(value?.name);
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    color: normalizeOptionalString(value?.color)
  };
}

function parseComment(
  value:
    | {
        id?: string | null;
        body?: string | null;
        url?: string | null;
        createdAt?: string | null;
        updatedAt?: string | null;
        resolvedAt?: string | null;
      }
    | null
): ProviderLinearWorkflowComment | null {
  const id = normalizeRequiredString(value?.id);
  const body = normalizeRequiredString(value?.body);
  if (!id || !body) {
    return null;
  }
  return {
    id,
    body,
    url: normalizeOptionalString(value?.url),
    created_at: normalizeIso(value?.createdAt),
    updated_at: normalizeIso(value?.updatedAt),
    resolved_at: normalizeIso(value?.resolvedAt)
  };
}

function parseMutatedComment(
  value:
    | {
        id?: string | null;
        url?: string | null;
        body?: string | null;
      }
    | null,
  fallbackBody: string
): ProviderLinearWorkflowComment | null {
  const id = normalizeRequiredString(value?.id);
  if (!id) {
    return null;
  }
  return {
    id,
    body: normalizeRequiredString(value?.body) ?? fallbackBody,
    url: normalizeOptionalString(value?.url),
    created_at: null,
    updated_at: null,
    resolved_at: null
  };
}

function resolveSelectedWorkpadComment(
  issue: ProviderLinearIssueContext,
  requestedCommentId: string | null
):
  | {
      ok: true;
      comment: ProviderLinearWorkflowComment | null;
    }
  | {
      ok: false;
      error: ProviderLinearWorkflowError;
    } {
  if (!requestedCommentId) {
    return {
      ok: true,
      comment: issue.workpad_comment
    };
  }

  const selectedComment =
    issue.comments.find(
      (entry) => entry.id === requestedCommentId && entry.resolved_at === null && hasWorkpadMarker(entry.body)
    ) ?? null;
  if (!selectedComment) {
    return {
      ok: false,
      error: {
        code: 'linear_workpad_comment_id_invalid',
        message: 'Comment id must reference an unresolved Codex workpad comment.',
        status: 422,
        details: {
          comment_id: requestedCommentId
        }
      }
    };
  }

  return {
    ok: true,
    comment: selectedComment
  };
}

function shouldFallbackToUrlAttachmentFromWorkflowError(error: ProviderLinearWorkflowError): boolean {
  const httpStatus =
    error.details && typeof error.details.http_status === 'number' && Number.isFinite(error.details.http_status)
      ? error.details.http_status
      : null;
  return error.code === 'linear_graphql_error' && httpStatus !== null && httpStatus >= 200 && httpStatus < 300;
}

function parseAttachment(
  value:
    | {
        id?: string | null;
        title?: string | null;
        url?: string | null;
        sourceType?: string | null;
      }
    | null
): ProviderLinearWorkflowAttachment | null {
  const id = normalizeRequiredString(value?.id);
  if (!id) {
    return null;
  }
  return {
    id,
    title: normalizeOptionalString(value?.title),
    url: normalizeOptionalString(value?.url),
    source_type: normalizeOptionalString(value?.sourceType)
  };
}

function parseCreatedIssue(
  value:
    | {
        id?: string | null;
        identifier?: string | null;
        title?: string | null;
        description?: string | null;
        url?: string | null;
        state?: {
          id?: string | null;
          name?: string | null;
          type?: string | null;
        } | null;
        team?: {
          id?: string | null;
          key?: string | null;
          name?: string | null;
        } | null;
        project?: {
          id?: string | null;
          name?: string | null;
        } | null;
      } & LinearIssueLabelConnectionField
    | null
): ProviderLinearCreatedIssue | null {
  const id = normalizeRequiredString(value?.id);
  const identifier = normalizeRequiredString(value?.identifier);
  const title = normalizeRequiredString(value?.title);
  if (!id || !identifier || !title) {
    return null;
  }
  const labels = value?.labels === undefined ? undefined : (parseIssueLabelConnection(value.labels) ?? undefined);

  return {
    id,
    identifier,
    title,
    description: normalizeOptionalString(value?.description),
    url: normalizeOptionalString(value?.url),
    state: parseWorkflowState(value?.state ?? null),
    team: value?.team
      ? {
          id: normalizeOptionalString(value.team.id),
          key: normalizeOptionalString(value.team.key),
          name: normalizeOptionalString(value.team.name)
        }
      : null,
    project: value?.project
      ? {
          id: normalizeOptionalString(value.project.id),
          name: normalizeOptionalString(value.project.name)
        }
      : null,
    ...(labels !== undefined ? { labels } : {})
  };
}

function findWorkpadComment(
  comments: readonly ProviderLinearWorkflowComment[]
): ProviderLinearWorkflowComment | null {
  return findUnresolvedWorkpadComments(comments)[0] ?? null;
}

function findUnresolvedWorkpadComments(
  comments: readonly ProviderLinearWorkflowComment[]
): ProviderLinearWorkflowComment[] {
  const candidates = comments.filter((entry) => entry.resolved_at === null && hasWorkpadMarker(entry.body));
  if (candidates.length === 0) {
    return [];
  }

  return [...candidates].sort((left, right) => {
    const leftTimestamp = Date.parse(left.updated_at ?? left.created_at ?? '');
    const rightTimestamp = Date.parse(right.updated_at ?? right.created_at ?? '');
    const normalizedLeft = Number.isFinite(leftTimestamp) ? leftTimestamp : 0;
    const normalizedRight = Number.isFinite(rightTimestamp) ? rightTimestamp : 0;
    return normalizedRight - normalizedLeft;
  });
}

function hasWorkpadMarker(body: string): boolean {
  let activeCodeFenceDelimiter: string | null = null;
  let activeCodeFenceContainerIndent = 0;
  const listContinuationIndents: number[] = [];
  for (const line of body.split(/\r?\n/u)) {
    let containerIndent = activeCodeFenceContainerIndent;
    let structuralLine = line;
    if (activeCodeFenceDelimiter === null) {
      const leadingSpaces = pruneMarkdownListContinuationIndents(listContinuationIndents, line);
      ({ containerIndent, structuralLine } = getMarkdownStructuralLine(
        listContinuationIndents,
        line,
        leadingSpaces
      ));
    } else if (countLeadingSpaces(line) >= activeCodeFenceContainerIndent) {
      structuralLine = line.slice(activeCodeFenceContainerIndent);
    }
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, structuralLine);
    if (codeFenceTransition.isBoundary) {
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      activeCodeFenceContainerIndent = activeCodeFenceDelimiter === null ? 0 : containerIndent;
      continue;
    }
    if (!activeCodeFenceDelimiter && /^##\s+Codex Workpad\b/u.test(line)) {
      return true;
    }
    if (!activeCodeFenceDelimiter) {
      recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
    }
  }
  return false;
}

function validateWorkpadBodyContract(
  body: string,
  issueDescription: string | null
):
  | {
      ok: true;
    }
  | {
      ok: false;
      error: ProviderLinearWorkflowError;
    } {
  const firstVisibleLine = body.split(/\r?\n/u).find((line) => normalizeRequiredString(line) !== null) ?? '';
  if (!isCanonicalWorkpadMarkerLine(firstVisibleLine)) {
    return {
      ok: false,
      error: {
        code: 'workpad_structure_invalid',
        message: `Workpad body must start with "${LINEAR_WORKPAD_MARKER}".`,
        status: 422
      }
    };
  }

  const { sections, hasLeadingContentBeforeFirstSection } = parseWorkpadSections(body);
  if (hasLeadingContentBeforeFirstSection) {
    return {
      ok: false,
      error: {
        code: 'workpad_structure_invalid',
        message: `Workpad body must contain these H3 sections in order after "${LINEAR_WORKPAD_MARKER}": ${LINEAR_WORKPAD_REQUIRED_SECTIONS.join(', ')}.`,
        status: 422,
        details: {
          required_sections: [...LINEAR_WORKPAD_REQUIRED_SECTIONS],
          actual_sections: sections.map((section) => section.title),
          leading_content_before_first_section: true
        }
      }
    };
  }
  const canonicalStructureMatches =
    sections.length === LINEAR_WORKPAD_REQUIRED_SECTIONS.length &&
    sections.every(
      (section, index) =>
        normalizeComparableValue(section.title) ===
        normalizeComparableValue(LINEAR_WORKPAD_REQUIRED_SECTIONS[index])
    );
  if (!canonicalStructureMatches) {
    return {
      ok: false,
      error: {
        code: 'workpad_structure_invalid',
        message: `Workpad body must contain these H3 sections in order after "${LINEAR_WORKPAD_MARKER}": ${LINEAR_WORKPAD_REQUIRED_SECTIONS.join(', ')}.`,
        status: 422,
        details: {
          required_sections: [...LINEAR_WORKPAD_REQUIRED_SECTIONS],
          actual_sections: sections.map((section) => section.title)
        }
      }
    };
  }

  const emptySections = sections
    .filter((section) => normalizeRequiredString(section.body) === null)
    .map((section) => section.title);
  if (emptySections.length > 0) {
    return {
      ok: false,
      error: {
        code: 'workpad_section_empty',
        message: 'Workpad core sections must be non-empty.',
        status: 422,
        details: {
          empty_sections: emptySections
        }
      }
    };
  }

  const requiredCheckboxSections = LINEAR_WORKPAD_CHECKBOX_REQUIRED_SECTIONS.map((title) =>
    findWorkpadSectionByTitle(sections, title)
  ).filter((section): section is ProviderLinearWorkpadSection => Boolean(section));
  const sectionsMissingCheckboxes = requiredCheckboxSections
    .filter((section) => !containsWorkpadCheckboxListItem(section.body))
    .map((section) => section.title);
  const sectionsWithBlankCheckboxes = requiredCheckboxSections
    .filter((section) => containsBlankWorkpadCheckboxListItem(section.body))
    .map((section) => section.title);
  if (sectionsMissingCheckboxes.length > 0 || sectionsWithBlankCheckboxes.length > 0) {
    return {
      ok: false,
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: [...LINEAR_WORKPAD_CHECKBOX_REQUIRED_SECTIONS],
          missing_checkbox_sections: sectionsMissingCheckboxes,
          blank_checkbox_sections: sectionsWithBlankCheckboxes
        }
      }
    };
  }

  const ticketValidationRequirements = extractIssueValidationRequirements(issueDescription);
  if (ticketValidationRequirements.length === 0) {
    return { ok: true };
  }

  const acceptanceCriteriaSection = findWorkpadSectionByTitle(sections, 'Acceptance Criteria');
  const validationSection = findWorkpadSectionByTitle(sections, 'Validation');
  const mirroredValidationText = normalizeRequirementValue(
    `${acceptanceCriteriaSection?.body ?? ''}\n${validationSection?.body ?? ''}`
  );
  const missingRequirements = ticketValidationRequirements.filter(
    (requirement) => !containsNormalizedRequirement(mirroredValidationText, requirement.normalized)
  );
  if (missingRequirements.length > 0) {
    return {
      ok: false,
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: missingRequirements.map((requirement) => requirement.raw),
          source_sections: [...new Set(missingRequirements.map((requirement) => requirement.source_section))]
        }
      }
    };
  }

  return { ok: true };
}

function containsWorkpadCheckboxListItem(body: string): boolean {
  return findWorkpadCheckboxListItem(body, 'non-empty');
}

function containsBlankWorkpadCheckboxListItem(body: string): boolean {
  return findWorkpadCheckboxListItem(body, 'blank');
}

function countLeadingSpaces(line: string): number {
  return line.match(/^ */u)?.[0].length ?? 0;
}

function pruneMarkdownListContinuationIndents(listContinuationIndents: number[], line: string): number {
  const leadingSpaces = countLeadingSpaces(line);
  if (normalizeRequiredString(line) !== null) {
    while (
      listContinuationIndents.length > 0 &&
      leadingSpaces < listContinuationIndents[listContinuationIndents.length - 1]
    ) {
      listContinuationIndents.pop();
    }
  }
  return leadingSpaces;
}

function getMarkdownStructuralLine(
  listContinuationIndents: readonly number[],
  line: string,
  leadingSpaces: number
): { containerIndent: number; structuralLine: string } {
  const containerIndent = listContinuationIndents[listContinuationIndents.length - 1] ?? 0;
  return {
    containerIndent,
    structuralLine: leadingSpaces >= containerIndent ? line.slice(containerIndent) : line
  };
}

function getMarkdownFenceAwareStructuralLine(
  listContinuationIndents: number[],
  line: string,
  activeCodeFenceDelimiter: string | null,
  activeCodeFenceContainerIndent: number
): { containerIndent: number; structuralLine: string } {
  if (activeCodeFenceDelimiter === null) {
    const leadingSpaces = pruneMarkdownListContinuationIndents(listContinuationIndents, line);
    return getMarkdownStructuralLine(listContinuationIndents, line, leadingSpaces);
  }
  const containerIndent = activeCodeFenceContainerIndent;
  const leadingSpaces = countLeadingSpaces(line);
  return {
    containerIndent,
    structuralLine: leadingSpaces >= containerIndent ? line.slice(containerIndent) : line
  };
}

function recordMarkdownListContinuationIndent(
  listContinuationIndents: number[],
  structuralLine: string,
  containerIndent: number
): void {
  const listItemMatch = structuralLine.match(/^([ ]{0,3})(?:[-+*]|\d+[.)])\s+/u);
  if (!listItemMatch) {
    return;
  }
  const nextIndent = containerIndent + listItemMatch[0].length;
  while (
    listContinuationIndents.length > 0 &&
    nextIndent <= listContinuationIndents[listContinuationIndents.length - 1]
  ) {
    listContinuationIndents.pop();
  }
  listContinuationIndents.push(nextIndent);
}

function findWorkpadCheckboxListItem(body: string, mode: 'blank' | 'non-empty'): boolean {
  let activeCodeFenceDelimiter: string | null = null;
  let activeCodeFenceContainerIndent = 0;
  const listContinuationIndents: number[] = [];

  for (const line of body.split(/\r?\n/u)) {
    const { containerIndent, structuralLine } = getMarkdownFenceAwareStructuralLine(
      listContinuationIndents,
      line,
      activeCodeFenceDelimiter,
      activeCodeFenceContainerIndent
    );
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, structuralLine);
    activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
    activeCodeFenceContainerIndent = activeCodeFenceDelimiter === null ? 0 : containerIndent;
    if (codeFenceTransition.isBoundary || activeCodeFenceDelimiter !== null) {
      continue;
    }
    const matchesCheckbox =
      mode === 'non-empty'
        ? /^[ ]{0,3}-\s+\[(?: |x|X)\]\s+\S.*$/u.test(structuralLine)
        : /^[ ]{0,3}-\s+\[(?: |x|X)\]\s*$/u.test(structuralLine);
    if (matchesCheckbox) {
      return true;
    }
    recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
  }

  return false;
}

function findWorkpadSectionByTitle(
  sections: readonly ProviderLinearWorkpadSection[],
  title: string
): ProviderLinearWorkpadSection | undefined {
  const normalizedTitle = normalizeComparableValue(title);
  return sections.find((section) => normalizeComparableValue(section.title) === normalizedTitle);
}

function normalizeWorkpadSectionBody(lines: readonly string[]): string {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim().length === 0) {
    start += 1;
  }
  while (end > start && lines[end - 1].trim().length === 0) {
    end -= 1;
  }
  return lines.slice(start, end).join('\n');
}

function isCanonicalWorkpadMarkerLine(line: string): boolean {
  const headingMatch = line.match(/^\s*##\s+(.+?)\s*$/u);
  if (!headingMatch) {
    return false;
  }
  const headingTitle = headingMatch[1].replace(/\s+#+\s*$/u, '').trim();
  return normalizeComparableValue(headingTitle) === normalizeComparableValue(LINEAR_WORKPAD_MARKER_TITLE);
}

function parseWorkpadSections(body: string): {
  sections: ProviderLinearWorkpadSection[];
  hasLeadingContentBeforeFirstSection: boolean;
} {
  const sections: ProviderLinearWorkpadSection[] = [];
  let markerSeen = false;
  let activeCodeFenceDelimiter: string | null = null;
  let activeCodeFenceContainerIndent = 0;
  const listContinuationIndents: number[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  let hasLeadingContentBeforeFirstSection = false;

  const flushCurrent = () => {
    if (!currentTitle) {
      return;
    }
    sections.push({
      title: currentTitle,
      body: normalizeWorkpadSectionBody(currentLines)
    });
  };

  for (const line of body.split(/\r?\n/u)) {
    const { containerIndent, structuralLine } = getMarkdownFenceAwareStructuralLine(
      listContinuationIndents,
      line,
      activeCodeFenceDelimiter,
      activeCodeFenceContainerIndent
    );
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, structuralLine);
    if (codeFenceTransition.isBoundary) {
      if (markerSeen && !currentTitle) {
        hasLeadingContentBeforeFirstSection = true;
      } else if (markerSeen && currentTitle) {
        currentLines.push(line);
      }
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      activeCodeFenceContainerIndent = activeCodeFenceDelimiter === null ? 0 : containerIndent;
      continue;
    }
    if (!markerSeen) {
      if (!activeCodeFenceDelimiter && /^##\s+Codex Workpad\b/u.test(line)) {
        markerSeen = true;
      }
      continue;
    }
    if (activeCodeFenceDelimiter) {
      if (!currentTitle && normalizeRequiredString(line) !== null) {
        hasLeadingContentBeforeFirstSection = true;
      } else if (currentTitle) {
        currentLines.push(line);
      }
      continue;
    }
    const headingMatch = line.match(/^[ ]{0,3}###\s+(.+?)\s*$/u);
    if (headingMatch) {
      flushCurrent();
      const headingTitle = headingMatch[1].replace(/\s+#+\s*$/u, '').trim();
      currentTitle = normalizeRequiredString(headingTitle) ?? headingTitle;
      currentLines = [];
      listContinuationIndents.length = 0;
      continue;
    }
    if (!currentTitle && normalizeRequiredString(line) !== null) {
      hasLeadingContentBeforeFirstSection = true;
    } else if (currentTitle) {
      currentLines.push(line);
    }
    recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
  }
  flushCurrent();

  return {
    sections,
    hasLeadingContentBeforeFirstSection
  };
}

function extractIssueValidationRequirements(
  description: string | null
): ProviderLinearIssueValidationRequirement[] {
  if (!description) {
    return [];
  }

  const requirements: ProviderLinearIssueValidationRequirement[] = [];
  let activeSection: string | null = null;
  let previousNonEmptyLine: string | null = null;
  let activeCodeFenceDelimiter: string | null = null;
  let activeCodeFenceContainerIndent = 0;
  const listContinuationIndents: number[] = [];
  const lines = description.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    const { containerIndent, structuralLine } = getMarkdownFenceAwareStructuralLine(
      listContinuationIndents,
      line,
      activeCodeFenceDelimiter,
      activeCodeFenceContainerIndent
    );
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, structuralLine);
    if (codeFenceTransition.isBoundary) {
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      activeCodeFenceContainerIndent = activeCodeFenceDelimiter === null ? 0 : containerIndent;
      continue;
    }
    if (activeCodeFenceDelimiter) {
      continue;
    }
    if (isTopLevelIndentedCodeBlockLine(line, containerIndent)) {
      continue;
    }
    const nextLine = lines[index + 1] ?? null;
    const previousLine = lines[index - 1] ?? null;
    const nextVisibleLines = getNextVisibleIssueLines(lines, index + 1, 2);
    const headingContentLines = getNextVisibleIssueLines(
      lines,
      isSetextUnderlineLine(nextLine ?? '') ? index + 2 : index + 1,
      2
    );
    const heading = parseIssueDescriptionSectionHeading(
      line,
      previousNonEmptyLine,
      nextLine,
      previousLine,
      nextVisibleLines[0] ?? null
    );
    if (heading) {
      if (matchesIssueValidationSectionTitle(heading)) {
        activeSection = heading;
      } else if (
        activeSection &&
        shouldPreserveValidationSectionAcrossNestedHeading(
          line,
          headingContentLines[0] ?? null,
          headingContentLines[1] ?? null
        )
      ) {
        // Preserve the surrounding validation section for nested markdown buckets like
        // "### Automated" when they still introduce validation lists.
      } else {
        activeSection = null;
      }
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
      continue;
    }
    if (!activeSection) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
      continue;
    }
    if (
      isListIntroductionLine(line, nextVisibleLines[0] ?? null) ||
      isStyledListIntroductionLine(line, nextVisibleLines[0] ?? null)
    ) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
      continue;
    }
    const rawRequirement = stripRequirementPrefix(line);
    if (!rawRequirement) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
      continue;
    }
    const normalizedRequirement = normalizeRequirementValue(rawRequirement);
    if (!normalizedRequirement) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
      continue;
    }
    if (requirements.some((entry) => entry.normalized === normalizedRequirement)) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
      continue;
    }
    requirements.push({
      raw: rawRequirement,
      normalized: normalizedRequirement,
      source_section: activeSection
    });
    if (line.trim().length > 0) {
      previousNonEmptyLine = line;
    }
    recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
  }

  return requirements;
}

function parseIssueDescriptionSectionHeading(
  line: string,
  previousNonEmptyLine: string | null = null,
  nextLine: string | null = null,
  previousLine: string | null = null,
  nextVisibleLine: string | null = null
): string | null {
  const trimmed = line.trim();
  if (
    !trimmed ||
    /^[-*+]\s/u.test(trimmed) ||
    /^\d+\.\s/u.test(trimmed) ||
    isSetextUnderlineLine(trimmed)
  ) {
    return null;
  }

  let candidate = trimmed;
  let isMarkdownHeading = false;
  const boldWrappedMatch = candidate.match(/^\*\*(.+)\*\*:?\s*$/u);
  const underlineWrappedMatch = candidate.match(/^__(.+)__:?\s*$/u);
  const hadStyledWrapper = Boolean(boldWrappedMatch || underlineWrappedMatch);
  const markdownHeadingMatch = candidate.match(/^#{1,6}\s+(.+?)\s*$/u);
  if (markdownHeadingMatch) {
    candidate = markdownHeadingMatch[1];
    isMarkdownHeading = true;
  }
  candidate = candidate.replace(/^\*\*(.+)\*\*:?\s*$/u, '$1');
  candidate = candidate.replace(/^__(.+)__:?\s*$/u, '$1');
  candidate = candidate.replace(/:\s*$/u, '').trim();
  if (!candidate) {
    return null;
  }

  if (matchesDecoratedSectionTitle(candidate, LINEAR_ISSUE_PLAIN_SECTION_TITLES)) {
    return candidate;
  }
  if (isMarkdownHeading) {
    return candidate;
  }
  if (isSetextUnderlineLine(nextLine ?? '')) {
    return matchesIssueValidationSectionTitle(candidate) ||
      looksLikeActualSetextSectionHeadingCandidate(candidate)
      ? candidate
      : null;
  }
  const previousTrimmed = previousLine?.trim() ?? '';
  const nextTrimmed = nextLine?.trim() ?? '';
  if (hadStyledWrapper) {
    if (isStyledListIntroductionLine(line, nextVisibleLine ?? nextLine, candidate)) {
      return null;
    }
    return isListLikeLine(previousNonEmptyLine) ||
      isListLikeLine(nextTrimmed) ||
      (!previousTrimmed && Boolean(nextTrimmed))
      ? candidate
      : null;
  }
  if (!looksLikePlainSectionHeadingCandidate(candidate)) {
    return null;
  }
  return isListLikeLine(previousNonEmptyLine) ||
    isListLikeLine(nextTrimmed) ||
    (!previousTrimmed && Boolean(nextTrimmed))
    ? candidate
    : null;
}

function looksLikePlainSectionHeadingCandidate(candidate: string): boolean {
  const coreCandidate = trimBoundarySymbolDecorationTokens(candidate);
  if (!coreCandidate) {
    return false;
  }
  if (!/^[\p{L}][\p{L}\p{M}\p{N} /&()'’\-–—]{0,79}$/u.test(coreCandidate)) {
    return false;
  }
  const words = coreCandidate.split(/\s+/u).filter(Boolean);
  if (words.length === 0 || words.length > 8) {
    return false;
  }
  return words.every((word, index) => {
    const bareWord = word.replace(/^[("'(]+|[)"')]+$/gu, '');
    if (!bareWord) {
      return true;
    }
    if (/^[&/\-–—]$/u.test(bareWord)) {
      return true;
    }
    if (/^[\p{Lu}\p{Lt}\p{Lo}\p{Lm}\p{Nl}\p{Nd}][\p{L}\p{M}\p{N}/&'’\-–—]*$/u.test(bareWord)) {
      return true;
    }
    return index > 0 && LINEAR_ISSUE_PLAIN_SECTION_CONNECTOR_WORDS.has(bareWord.toLowerCase());
  });
}

function looksLikeSetextSectionHeadingCandidate(candidate: string): boolean {
  if (looksLikePlainSectionHeadingCandidate(candidate)) {
    return true;
  }
  if (/[.:;!?]\s*$/u.test(candidate)) {
    return false;
  }
  const symbolTrimmedCandidate = candidate
    .replace(/[^\p{L}\p{N}\s/&()'-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!symbolTrimmedCandidate || symbolTrimmedCandidate === candidate) {
    return false;
  }
  return looksLikePlainSectionHeadingCandidate(symbolTrimmedCandidate);
}

function looksLikeActualSetextSectionHeadingCandidate(candidate: string): boolean {
  if (looksLikeSetextSectionHeadingCandidate(candidate)) {
    return true;
  }
  if (/[.:;!?]\s*$/u.test(candidate)) {
    return false;
  }
  if (looksLikeLowercaseSetextSectionHeadingCandidate(candidate)) {
    return true;
  }
  const symbolTrimmedCandidate = candidate
    .replace(/[^\p{L}\p{N}\s/&()'-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!symbolTrimmedCandidate || symbolTrimmedCandidate === candidate) {
    return false;
  }
  return looksLikeLowercaseSetextSectionHeadingCandidate(symbolTrimmedCandidate);
}

function looksLikeLowercaseSetextSectionHeadingCandidate(candidate: string): boolean {
  const coreCandidate = trimBoundarySymbolDecorationTokens(candidate);
  if (!coreCandidate) {
    return false;
  }
  if (!/^[\p{Ll}][\p{L}\p{M}\p{N} /&()'’\-–—]{0,79}$/u.test(coreCandidate)) {
    return false;
  }
  const normalizedCoreCandidate = normalizeComparableValue(coreCandidate);
  if (
    LINEAR_ISSUE_PLAIN_SECTION_TITLES.has(normalizedCoreCandidate) ||
    LINEAR_ISSUE_VALIDATION_NESTED_SECTION_TITLES.has(normalizedCoreCandidate)
  ) {
    return true;
  }
  const words = coreCandidate.split(/\s+/u).filter(Boolean);
  if (words.length === 0 || words.length > 5) {
    return false;
  }
  const strippedWords = words.map((word) => word.replace(/^[("'(]+|[)"')]+$/gu, ''));
  const significantWords = strippedWords
    .filter(
      (word) =>
        word.length > 0 &&
        !/^[&/\-–—]$/u.test(word) &&
        !LINEAR_ISSUE_PLAIN_SECTION_CONNECTOR_WORDS.has(word.toLowerCase())
    );
  if (significantWords.length === 0) {
    return false;
  }
  const firstSignificantWord = significantWords[0].toLowerCase();
  const secondWord = strippedWords[1] ?? null;
  const secondSignificantWord = significantWords[1]?.toLowerCase() ?? null;
  if (LINEAR_ISSUE_LOWERCASE_SETEXT_LEADING_VERBS.has(firstSignificantWord)) {
    return false;
  }
  const secondSignificantWordLooksCommandLike =
    secondSignificantWord !== null &&
    (LINEAR_ISSUE_LOWERCASE_SETEXT_COMMAND_SUBCOMMANDS.has(secondSignificantWord) ||
      /[/\\]/u.test(significantWords[1]));
  if (
    secondSignificantWordLooksCommandLike &&
    LINEAR_ISSUE_LOWERCASE_SETEXT_COMMAND_ENTRYPOINTS.has(firstSignificantWord)
  ) {
    return false;
  }
  const secondWordLooksCommandLike =
    secondWord !== null &&
    (LINEAR_ISSUE_LOWERCASE_SETEXT_COMMAND_SUBCOMMANDS.has(secondWord.toLowerCase()) ||
      /[/\\]/u.test(secondWord));
  const thirdWord = strippedWords[2] ?? null;
  const thirdWordLooksCommandArgument =
    thirdWord !== null &&
    (/^[.~-]/u.test(thirdWord) || /[/\\=:]/u.test(thirdWord) || /\.\w/u.test(thirdWord));
  if (
    secondWord !== null &&
    LINEAR_ISSUE_LOWERCASE_SETEXT_AMBIGUOUS_COMMAND_ENTRYPOINTS.has(firstSignificantWord)
  ) {
    const normalizedSecondWord = secondWord.toLowerCase();
    if (
      LINEAR_ISSUE_LOWERCASE_SETEXT_AMBIGUOUS_COMMAND_SUBCOMMANDS.has(normalizedSecondWord) ||
      (/[/\\]/u.test(secondWord) && secondWordLooksCommandLike) ||
      (LINEAR_ISSUE_LOWERCASE_SETEXT_COMMAND_SUBCOMMANDS.has(normalizedSecondWord) &&
        thirdWordLooksCommandArgument)
    ) {
      return false;
    }
  }
  return words.every((word) => {
    const bareWord = word.replace(/^[("'(]+|[)"')]+$/gu, '');
    if (!bareWord) {
      return true;
    }
    if (/^[&/\-–—]$/u.test(bareWord)) {
      return true;
    }
    return /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}/&'’\-–—]*$/u.test(bareWord);
  });
}

function matchesIssueValidationSectionTitle(title: string): boolean {
  if (matchesDecoratedSectionTitle(title, LINEAR_ISSUE_VALIDATION_SECTION_TITLES)) {
    return true;
  }

  if (!looksLikePlainSectionHeadingCandidate(title) && !looksLikeSetextSectionHeadingCandidate(title)) {
    return false;
  }

  const normalizedTitle = normalizeComparableValue(trimBoundarySymbolDecorationTokens(title));
  return [...LINEAR_ISSUE_VALIDATION_SECTION_TITLES].some((allowedTitle) => {
    if (!normalizedTitle.startsWith(allowedTitle)) {
      return false;
    }
    const suffix = normalizedTitle.slice(allowedTitle.length).trimStart();
    return Boolean(suffix) && !/^[\p{L}\p{N}]/u.test(suffix);
  });
}

function stripRequirementPrefix(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || isCodeFenceLine(trimmed) || isSetextUnderlineLine(trimmed)) {
    return null;
  }

  const withoutPrefix = trimmed
    .replace(/^[-*+]\s+\[[ xX]\]\s+/u, '')
    .replace(/^\d+[.)]\s+\[[ xX]\]\s+/u, '')
    .replace(/^\[[ xX]\]\s+/u, '')
    .replace(/^[-*+]\s+/u, '')
    .replace(/^\d+[.)]\s+/u, '')
    .trim();
  return withoutPrefix.length > 0 ? withoutPrefix : null;
}

function normalizeRequirementValue(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/[`*_>#]/gu, ' ')
    .replace(/[.,:;!?]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function isCodeFenceLine(line: string): boolean {
  return parseCodeFenceLine(line) !== null;
}

function isMarkdownHeadingLine(line: string): boolean {
  return /^\s*#{1,6}\s+\S/u.test(line);
}

function isListLikeLine(line: string | null): boolean {
  const trimmed = line?.trim() ?? '';
  return /^[-*+]\s/u.test(trimmed) || /^\d+[.)]\s/u.test(trimmed) || /^\[[ xX]\]\s/u.test(trimmed);
}

function isTopLevelIndentedCodeBlockLine(line: string, containerIndent: number): boolean {
  return containerIndent === 0 && countLeadingSpaces(line) >= 4 && normalizeRequiredString(line) !== null;
}

function isListIntroductionLine(line: string, nextLine: string | null): boolean {
  const trimmed = line.trim();
  return Boolean(trimmed) && /:\s*$/u.test(trimmed) && isListLikeLine(nextLine);
}

function isStyledListIntroductionLine(
  line: string,
  nextLine: string | null,
  parsedCandidate: string | null = null
): boolean {
  if (!isListLikeLine(nextLine)) {
    return false;
  }
  const trimmed = line.trim();
  const styledMatch = trimmed.match(/^\*\*(.+)\*\*\s*$/u) ?? trimmed.match(/^__(.+)__\s*$/u);
  if (!styledMatch) {
    return false;
  }
  const wrappedContent = styledMatch[1].trim();
  if (!/:\s*$/u.test(wrappedContent)) {
    return false;
  }
  const candidate = (parsedCandidate ?? wrappedContent.replace(/:\s*$/u, '').trim()).trim();
  return (
    Boolean(candidate) &&
    !matchesIssueValidationSectionTitle(candidate) &&
    (looksLikeStyledListIntroductionLabel(candidate) ||
      (!looksLikePlainSectionHeadingCandidate(candidate) && !looksLikeSetextSectionHeadingCandidate(candidate)))
  );
}

function looksLikeStyledListIntroductionLabel(candidate: string): boolean {
  const normalizedCandidate = normalizeComparableValue(candidate);
  if (!normalizedCandidate) {
    return false;
  }
  const words = normalizedCandidate.split(/\s+/u).filter(Boolean);
  if (words.length < 2 || words.length > 5) {
    return false;
  }
  const firstWord = words[0];
  const lastWord = words[words.length - 1];
  return (
    ['run', 'follow', 'perform', 'verify', 'check', 'use', 'execute', 'capture', 'complete'].includes(
      firstWord
    ) && ['commands', 'checks', 'steps', 'tasks', 'items'].includes(lastWord)
  );
}

function getNextVisibleIssueLines(lines: string[], startIndex: number, count: number): string[] {
  if (count <= 0) {
    return [];
  }
  const visibleLines: string[] = [];
  let activeCodeFenceDelimiter: string | null = null;
  let activeCodeFenceContainerIndent = 0;
  const listContinuationIndents: number[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const { containerIndent, structuralLine } = getMarkdownFenceAwareStructuralLine(
      listContinuationIndents,
      line,
      activeCodeFenceDelimiter,
      activeCodeFenceContainerIndent
    );
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, structuralLine);
    if (codeFenceTransition.isBoundary) {
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      activeCodeFenceContainerIndent = activeCodeFenceDelimiter === null ? 0 : containerIndent;
      continue;
    }
    if (activeCodeFenceDelimiter) {
      continue;
    }
    if (isTopLevelIndentedCodeBlockLine(line, containerIndent)) {
      continue;
    }
    if (normalizeRequiredString(line) === null) {
      continue;
    }
    visibleLines.push(line);
    recordMarkdownListContinuationIndent(listContinuationIndents, structuralLine, containerIndent);
    if (visibleLines.length >= count) {
      break;
    }
  }
  return visibleLines;
}

function shouldPreserveValidationSectionAcrossNestedHeading(
  line: string,
  nextLine: string | null,
  followingLine: string | null
): boolean {
  const headingTitle = normalizeNestedValidationBucketTitle(line);
  const preservesValidationContext =
    headingTitle !== null &&
    (matchesCompoundValidationNestedSectionTitle(headingTitle) ||
      matchesIssueValidationSectionTitle(headingTitle));
  return (
    preservesValidationContext &&
    (isListLikeLine(nextLine) ||
      (nextLine !== null && isListIntroductionLine(nextLine, followingLine)) ||
      (preservesValidationContext &&
        nextLine !== null &&
        !isCodeFenceLine(nextLine) &&
        !isMarkdownHeadingLine(nextLine) &&
        !isSetextUnderlineLine(nextLine)))
  );
}

function matchesCompoundValidationNestedSectionTitle(normalizedTitle: string): boolean {
  const tokens = normalizedTitle.split(/\s+/u).filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }
  let coreTokenCount = tokens.length;
  while (
    coreTokenCount > 0 &&
    (isStandaloneSymbolDecorationToken(tokens[coreTokenCount - 1]) ||
      isParentheticalSectionQualifierToken(tokens[coreTokenCount - 1]))
  ) {
    coreTokenCount -= 1;
  }
  let startTokenIndex = 0;
  while (
    startTokenIndex < coreTokenCount &&
    (isStandaloneSymbolDecorationToken(tokens[startTokenIndex]) ||
      isParentheticalSectionQualifierToken(tokens[startTokenIndex]))
  ) {
    startTokenIndex += 1;
  }
  const coreTokens = tokens.slice(startTokenIndex, coreTokenCount);
  if (coreTokens.length === 0) {
    return false;
  }
  const normalizedCoreTitle = coreTokens.join(' ');
  if (LINEAR_ISSUE_VALIDATION_NESTED_SECTION_TITLES.has(normalizedCoreTitle)) {
    return true;
  }
  if (coreTokens.length <= 1) {
    return false;
  }
  const titleWords = [...LINEAR_ISSUE_VALIDATION_NESTED_SECTION_TITLES]
    .map((title) => title.split(/\s+/u))
    .sort((left, right) => right.length - left.length);
  const memo = new Map<number, boolean>();
  const canMatchFrom = (index: number): boolean => {
    if (index === coreTokens.length) {
      return true;
    }
    if (memo.has(index)) {
      return memo.get(index) ?? false;
    }
    const matched = titleWords.some((allowedWords) => {
      if (allowedWords.length === 0 || index + allowedWords.length > coreTokens.length) {
        return false;
      }
      return (
        allowedWords.every((allowedWord, offset) => coreTokens[index + offset] === allowedWord) &&
        canMatchFrom(index + allowedWords.length)
      );
    });
    memo.set(index, matched);
    return matched;
  };
  return canMatchFrom(0);
}

function normalizeNestedValidationBucketTitle(line: string): string | null {
  let candidate = line.trim();
  if (!candidate) {
    return null;
  }
  const markdownHeadingMatch = candidate.match(/^#{1,6}\s+(.+?)\s*$/u);
  if (markdownHeadingMatch) {
    candidate = markdownHeadingMatch[1];
  }
  candidate = candidate.replace(/^\*\*(.+)\*\*:?\s*$/u, '$1');
  candidate = candidate.replace(/^__(.+)__:?\s*$/u, '$1');
  candidate = candidate.replace(/\s+#+\s*$/u, '');
  candidate = candidate.replace(/:\s*$/u, '').trim();
  return candidate ? normalizeComparableValue(candidate) : null;
}

function matchesDecoratedSectionTitle(title: string, allowedTitles: Set<string>): boolean {
  const normalizedTitle = normalizeComparableValue(trimBoundarySymbolDecorationTokens(title));
  if (!normalizedTitle) {
    return false;
  }
  if (allowedTitles.has(normalizedTitle)) {
    return true;
  }

  for (const allowedTitle of allowedTitles) {
    if (!normalizedTitle.startsWith(allowedTitle)) {
      continue;
    }
    const suffix = normalizedTitle.slice(allowedTitle.length).trimStart();
    if (!suffix || matchesDecoratedSectionQualifierSuffix(suffix)) {
      return true;
    }
  }

  return false;
}

function trimBoundarySymbolDecorationTokens(candidate: string): string {
  const tokens = candidate.trim().split(/\s+/u).filter(Boolean);
  while (tokens.length > 0 && isStandaloneSymbolDecorationToken(tokens[0])) {
    tokens.shift();
  }
  while (tokens.length > 0 && isStandaloneSymbolDecorationToken(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(' ');
}

function matchesDecoratedSectionQualifierSuffix(suffix: string): boolean {
  const tokens = suffix.split(/\s+/u).filter(Boolean);
  return (
    tokens.length > 0 &&
    tokens.every(
      (token) => isStandaloneSymbolDecorationToken(token) || isParentheticalSectionQualifierToken(token)
    )
  );
}

function isStandaloneSymbolDecorationToken(token: string): boolean {
  return !/[\p{L}\p{N}]/u.test(token);
}

function isParentheticalSectionQualifierToken(token: string): boolean {
  return /^\((?:[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’/\-–—]*)(?: [\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’/\-–—]*){0,2}\)$/u.test(
    token
  );
}

function parseCodeFenceLine(line: string): {
  delimiter: string;
  trailingText: string;
} | null {
  const match = stripMarkdownBlockquotePrefixes(line).match(/^[ ]{0,3}(`{3,}|~{3,})(.*)$/u);
  if (!match) {
    return null;
  }
  return {
    delimiter: match[1],
    trailingText: match[2] ?? ''
  };
}

function isClosingCodeFenceLine(
  activeDelimiter: string,
  codeFenceLine: {
    delimiter: string;
    trailingText: string;
  }
): boolean {
  return (
    codeFenceLine.delimiter[0] === activeDelimiter[0] &&
    codeFenceLine.delimiter.length >= activeDelimiter.length &&
    codeFenceLine.trailingText.trim().length === 0
  );
}

function getCodeFenceTransition(
  activeDelimiter: string | null,
  line: string
): {
  isBoundary: boolean;
  nextDelimiter: string | null;
} {
  const codeFenceLine = parseCodeFenceLine(line);
  if (!codeFenceLine) {
    return {
      isBoundary: false,
      nextDelimiter: activeDelimiter
    };
  }
  if (activeDelimiter === null) {
    return {
      isBoundary: true,
      nextDelimiter: codeFenceLine.delimiter
    };
  }
  if (isClosingCodeFenceLine(activeDelimiter, codeFenceLine)) {
    return {
      isBoundary: true,
      nextDelimiter: null
    };
  }
  return {
    isBoundary: false,
    nextDelimiter: activeDelimiter
  };
}

function containsNormalizedRequirement(haystack: string, needle: string): boolean {
  if (!needle) {
    return true;
  }
  const haystackTokens = haystack.split(/\s+/u).filter(Boolean);
  const needleTokens = needle.split(/\s+/u).filter(Boolean);
  if (needleTokens.length === 0) {
    return true;
  }
  if (haystackTokens.length < needleTokens.length) {
    return false;
  }
  for (let index = 0; index <= haystackTokens.length - needleTokens.length; index += 1) {
    let matched = true;
    for (let offset = 0; offset < needleTokens.length; offset += 1) {
      if (haystackTokens[index + offset] !== needleTokens[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

function isSetextUnderlineLine(line: string): boolean {
  return /^[-=]{3,}\s*$/u.test(line.trim());
}

function resolveWorkflowStateByName(
  states: readonly ProviderLinearWorkflowState[],
  stateName: string
): ProviderLinearWorkflowState | null {
  const exact = states.find((entry) => entry.name === stateName);
  if (exact) {
    return exact;
  }

  const normalizedTarget = normalizeComparableValue(stateName);
  const matches = states.filter((entry) => normalizeComparableValue(entry.name) === normalizedTarget);
  return matches.length === 1 ? matches[0] : null;
}

function sameWorkflowState(
  left: ProviderLinearWorkflowState | null,
  right: ProviderLinearWorkflowState | null
): boolean {
  if (!left || !right) {
    return false;
  }
  return left.id === right.id || normalizeComparableValue(left.name) === normalizeComparableValue(right.name);
}

interface ProviderLinearTransitionGuardInput {
  expectedStateName: string | null;
  expectedStateType: string | null;
  expectedUpdatedAt: string | null;
  force: boolean;
  forceReason: string | null;
}

function resolveTransitionGuardInput(input: {
  expectedStateName?: string | null;
  expectedStateType?: string | null;
  expectedUpdatedAt?: string | null;
  force?: boolean;
  forceReason?: string | null;
}): ProviderLinearOperationFailure<'transition'> | {
  ok: true;
  guard: ProviderLinearTransitionGuardInput;
} {
  const force = input.force === true;
  const forceReason = normalizeOptionalString(input.forceReason);
  if (force && !forceReason) {
    return failure(
      'transition',
      'linear_force_reason_missing',
      'Forced Linear transitions require a non-empty force reason.',
      422
    );
  }
  if (!force && forceReason) {
    return failure(
      'transition',
      'linear_force_reason_without_force',
      'A force reason requires the explicit --force transition override.',
      422
    );
  }
  const expectedUpdatedAt = input.expectedUpdatedAt
    ? normalizeIso(input.expectedUpdatedAt)
    : null;
  if (input.expectedUpdatedAt && !expectedUpdatedAt) {
    return failure(
      'transition',
      'linear_expected_updated_at_invalid',
      'Expected updated_at must be a valid ISO timestamp.',
      422
    );
  }
  return {
    ok: true,
    guard: {
      expectedStateName: normalizeOptionalString(input.expectedStateName),
      expectedStateType: normalizeOptionalString(input.expectedStateType),
      expectedUpdatedAt,
      force,
      forceReason
    }
  };
}

function buildTransitionGuardAudit(
  guard: ProviderLinearTransitionGuardInput
): ProviderLinearTransitionGuardAudit {
  return {
    expected_state: guard.expectedStateName,
    expected_state_type: guard.expectedStateType,
    expected_updated_at: guard.expectedUpdatedAt,
    force: guard.force,
    force_reason: guard.forceReason
  };
}

function shouldIncludeTransitionGuardAudit(guard: ProviderLinearTransitionGuardInput): boolean {
  return (
    guard.expectedStateName !== null ||
    guard.expectedStateType !== null ||
    guard.expectedUpdatedAt !== null ||
    guard.force ||
    guard.forceReason !== null
  );
}

function buildTransitionAuditDetails(input: {
  summary: ProviderLinearIssueSummary;
  targetState: ProviderLinearWorkflowState;
  guard: ProviderLinearTransitionGuardInput;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    issue_id: input.summary.id,
    issue_identifier: input.summary.identifier,
    previous_state: input.summary.state?.name ?? null,
    previous_state_type: input.summary.state?.type ?? null,
    target_state: input.targetState.name,
    target_state_type: input.targetState.type ?? null,
    issue_updated_at: input.summary.updated_at,
    expected_state: input.guard.expectedStateName,
    expected_state_type: input.guard.expectedStateType,
    expected_updated_at: input.guard.expectedUpdatedAt,
    force: input.guard.force,
    force_reason: input.guard.forceReason,
    ...(input.extra ?? {})
  };
}

function failureIfTransitionPreconditionsMismatch(
  summary: ProviderLinearIssueSummary,
  targetState: ProviderLinearWorkflowState,
  guard: ProviderLinearTransitionGuardInput
): ProviderLinearOperationFailure<'transition'> | null {
  const mismatches: string[] = [];
  if (guard.expectedStateName !== null) {
    const actualState = normalizeProviderLinearWorkflowState(summary.state?.name);
    const expectedState = normalizeProviderLinearWorkflowState(guard.expectedStateName);
    if (actualState !== expectedState) {
      mismatches.push('state');
    }
  }
  if (guard.expectedStateType !== null) {
    const actualStateType = normalizeProviderLinearWorkflowState(summary.state?.type);
    const expectedStateType = normalizeProviderLinearWorkflowState(guard.expectedStateType);
    if (actualStateType !== expectedStateType) {
      mismatches.push('state_type');
    }
  }
  if (guard.expectedUpdatedAt !== null) {
    if (summary.updated_at !== guard.expectedUpdatedAt) {
      mismatches.push('updated_at');
    }
  }
  if (mismatches.length === 0) {
    return null;
  }
  return failure(
    'transition',
    'linear_transition_conflict',
    `Linear issue ${summary.identifier} no longer matches the expected transition preconditions (${mismatches.join(', ')}).`,
    409,
    buildTransitionAuditDetails({
      summary,
      targetState,
      guard,
      extra: {
        mismatch_fields: mismatches
      }
    })
  );
}

function failureIfTerminalTransitionRequiresForce(
  summary: ProviderLinearIssueSummary,
  targetState: ProviderLinearWorkflowState,
  guard: ProviderLinearTransitionGuardInput
): ProviderLinearOperationFailure<'transition'> | null {
  if (
    !isProviderLinearTerminalReopenTransition({
      current: {
        state: summary.state?.name ?? null,
        state_type: summary.state?.type ?? null
      },
      target: {
        state: targetState.name,
        state_type: targetState.type
      }
    })
  ) {
    return null;
  }
  if (guard.force) {
    return null;
  }
  return failure(
    'transition',
    'linear_terminal_transition_requires_force',
    `Linear issue ${summary.identifier} is already terminal; transitioning it to ${targetState.name} requires --force and a non-empty --force-reason.`,
    409,
    buildTransitionAuditDetails({
      summary,
      targetState,
      guard,
      extra: {
        force_required: true
      }
    })
  );
}

function failure<T extends ProviderLinearOperation>(
  operation: T,
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  retryable?: boolean
): ProviderLinearOperationFailure<T> {
  return {
    ok: false,
    operation,
    error: {
      code,
      message,
      status,
      ...(typeof retryable === 'boolean' ? { retryable } : {}),
      ...(details ? { details } : {})
    }
  };
}

function failureFromWorkflowError<T extends ProviderLinearOperation>(
  operation: T,
  error: ProviderLinearWorkflowError
): ProviderLinearOperationFailure<T> {
  return failure(operation, error.code, error.message, error.status, error.details, error.retryable);
}

function mapGraphqlFailure(failureValue: LinearGraphqlFailure): ProviderLinearWorkflowError {
  if (failureValue.kind === 'response_invalid') {
    return {
      code: 'linear_response_invalid',
      message: 'Linear returned an invalid response payload.',
      status: 503
    };
  }
  if (failureValue.kind === 'graphql_error') {
    const rateLimitFailure = mapLinearRateLimitedFailure(failureValue);
    if (rateLimitFailure) {
      return rateLimitFailure;
    }
    return {
      code: 'linear_graphql_error',
      message: 'Linear GraphQL returned operation errors.',
      status: normalizeGraphqlFailureStatus(failureValue.status),
      details: {
        ...(typeof failureValue.status === 'number' && Number.isFinite(failureValue.status)
          ? { http_status: failureValue.status }
          : {}),
        errors: serializeLinearGraphqlErrors(failureValue.errors)
      }
    };
  }
  return {
    code: 'linear_request_failed',
    message: 'Linear request failed before a successful response was received.',
    status: failureValue.status ?? 503
  };
}

function serializeLinearGraphqlErrors(errors: LinearGraphqlFailure['errors']): Record<string, unknown>[] {
  return errors.map((entry) => {
    const path = Array.isArray(entry.path)
      ? entry.path.filter(
          (segment): segment is string | number =>
            typeof segment === 'string' || (typeof segment === 'number' && Number.isFinite(segment))
        )
      : [];
    const extensions =
      entry.extensions && typeof entry.extensions === 'object'
        ? { ...(entry.extensions as Record<string, unknown>) }
        : null;
    return {
      message: normalizeOptionalString(entry.message) ?? 'unknown_error',
      ...(path.length > 0 ? { path } : {}),
      ...(extensions ? { extensions } : {})
    };
  });
}


function scopeMismatchError(
  scope: 'workspace' | 'team' | 'project',
  expected: string,
  actual: string | null
):
  | {
      ok: false;
      error: ProviderLinearWorkflowError;
    } {
  return {
    ok: false,
    error: {
      code: `linear_${scope}_mismatch`,
      message: `Linear issue fell outside the configured ${scope} scope.`,
      status: 422,
      details: {
        expected,
        actual
      }
    }
  };
}

async function readIssueAttachmentPages(
  session: ResolvedLinearWorkflowSession,
  operation: ProviderLinearOperation,
  issueId: string,
  initialPageInfo: LinearConnectionPageInfo | null,
  attachments: ProviderLinearWorkflowAttachment[],
  seenAttachmentIds: Set<string>
):
  Promise<
    | {
        ok: true;
        attachments: ProviderLinearWorkflowAttachment[];
      }
    | {
        ok: false;
        error: ProviderLinearWorkflowError;
      }
  > {
  const seenAttachmentCursors = new Set<string>();
  let pageInfo = initialPageInfo;
  let hasNextAttachmentPage = pageInfo?.hasNextPage === true;
  let attachmentsAfter = normalizeOptionalString(pageInfo?.endCursor);

  while (hasNextAttachmentPage) {
    if (!attachmentsAfter || seenAttachmentCursors.has(attachmentsAfter)) {
      return {
        ok: false,
        error: {
          code: 'linear_attachment_pagination_invalid',
          message: 'Linear issue attachments pagination returned an invalid cursor.',
          status: 503
        }
      };
    }
    seenAttachmentCursors.add(attachmentsAfter);

    const result = await executeProviderLinearGraphql<LinearIssueAttachmentsQueryResponse>({
      session,
      operation,
      step: 'read-issue-attachment-page',
      query: buildIssueAttachmentPageQuery(),
      variables: {
        issueId,
        attachmentsAfter
      }
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    const issueNode = result.payload.data?.issue ?? null;
    if (!issueNode) {
      return {
        ok: false,
        error: {
          code: 'linear_issue_not_found',
          message: `Linear issue "${issueId}" was not found.`,
          status: 404
        }
      };
    }

    const nextAttachments = Array.isArray(issueNode.attachments?.nodes)
      ? issueNode.attachments.nodes
          .map((entry) => parseAttachment(entry))
          .filter((entry): entry is ProviderLinearWorkflowAttachment => entry !== null)
      : [];
    for (const entry of nextAttachments) {
      if (seenAttachmentIds.has(entry.id)) {
        continue;
      }
      seenAttachmentIds.add(entry.id);
      attachments.push(entry);
    }

    pageInfo = issueNode.attachments?.pageInfo ?? null;
    hasNextAttachmentPage = pageInfo?.hasNextPage === true;
    attachmentsAfter = normalizeOptionalString(pageInfo?.endCursor);
  }

  return {
    ok: true,
    attachments
  };
}

function normalizeRequiredString(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  return normalizeRequiredString(value);
}

function normalizeOptionalBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function buildFollowUpIssueDescription(input: {
  description: string;
  intentChecksum: string;
  nonGoals: string;
  notDoneIf: string;
  acceptanceCriteria: string;
  parityMatrix?: string | null;
  canonicalOwner?: {
    key: string;
    marker: string;
  } | null;
  traceability?: string | null;
}): string {
  const sections = [
    input.description.trim(),
    input.canonicalOwner
      ? renderMarkdownSection('Canonical Owner', buildCanonicalOwnerSection(input.canonicalOwner))
      : null,
    renderMarkdownSection('Intent Checksum', input.intentChecksum),
    renderMarkdownSection('Non-Goals', input.nonGoals),
    input.parityMatrix ? renderMarkdownSection('Parity / Alignment Matrix', input.parityMatrix) : null,
    renderMarkdownSection('Not Done If', input.notDoneIf),
    input.traceability ? renderMarkdownSection('Immediate Traceability', input.traceability) : null,
    renderMarkdownSection('Acceptance Criteria', input.acceptanceCriteria)
  ].filter((section): section is string => Boolean(section));
  return sections.join('\n\n');
}

function buildCanonicalOwnerMarker(key: string): string {
  return `${PROVIDER_LINEAR_CANONICAL_OWNER_MARKER_PREFIX}${key}`;
}

function buildCanonicalOwnerSection(input: { key: string; marker: string }): string {
  return [
    `- Canonical owner key: \`${input.key}\``,
    `- Canonical owner marker: \`${input.marker}\``
  ].join('\n');
}

function buildSupersededCanonicalOwnerDescription(input: {
  description: string | null;
  createdIssue: ProviderLinearCreatedIssue;
  selectedOwner: ProviderLinearCreatedIssue;
  canonicalOwner: {
    key: string;
    marker: string;
  };
}): string {
  const baseDescription = (input.description ?? '').replaceAll(
    input.canonicalOwner.marker,
    `${PROVIDER_LINEAR_SUPERSEDED_CANONICAL_OWNER_MARKER_PREFIX}${input.canonicalOwner.key}`
  );
  return [
    baseDescription.trim(),
    renderMarkdownSection(
      'Superseded Canonical Owner',
      [
        `- Created issue: \`${input.createdIssue.identifier}\``,
        `- Reused canonical owner: \`${input.selectedOwner.identifier}\``,
        `- Canonical owner key: \`${input.canonicalOwner.key}\``,
        '- Reason: another stamped owner for this key existed before relation handoff; this issue is no longer a reusable canonical owner.'
      ].join('\n')
    )
  ]
    .filter((section) => section.length > 0)
    .join('\n\n');
}

function renderMarkdownSection(title: string, body: string): string {
  const normalizedBody = body.trim();
  const firstNonEmptyLine = normalizedBody
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0)
    ?.trim() ?? '';
  if (new RegExp(`^#{1,6}\\s+${escapeRegExp(title)}\\s*#*\\s*$`, 'iu').test(firstNonEmptyLine)) {
    return normalizedBody;
  }
  return `## ${title}\n${normalizedBody}`;
}

function buildFollowUpTraceabilitySection(input: {
  sourceIssue: ProviderLinearIssueSummary;
  followUpIssue: ProviderLinearCreatedIssue;
}): string {
  const followUpTaskId = buildFollowUpTaskId(input.followUpIssue);
  const repoPacketPaths = buildFollowUpPacketPaths(followUpTaskId);
  const formatIssueReference = (identifier: string, id: string, url: string | null | undefined): string =>
    url ? `\`${identifier}\` / \`${id}\` (${url})` : `\`${identifier}\` / \`${id}\``;
  return [
    `- Source issue: ${formatIssueReference(input.sourceIssue.identifier, input.sourceIssue.id, input.sourceIssue.url)}`,
    `- Follow-up issue: ${formatIssueReference(input.followUpIssue.identifier, input.followUpIssue.id, input.followUpIssue.url)}`,
    `- Follow-up packet prefix: \`${followUpTaskId}\``,
    '- Canonical registry task id: see `tasks/index.json` (format `YYYYMMDD-linear-<linear-issue-id>`)',
    `- Create before active work: ${repoPacketPaths.map((path) => `\`${path}\``).join(', ')}`,
    `- Update registry mirrors before the issue leaves \`Backlog\`: ${FOLLOW_UP_REGISTRY_MIRRORS.map((path) => `\`${path}\``).join(', ')}`
  ].join('\n');
}

const FOLLOW_UP_REGISTRY_MIRRORS = [
  'tasks/index.json',
  'docs/TASKS.md',
  'docs/docs-freshness-registry.json'
] as const;

function buildFollowUpTaskId(issue: Pick<ProviderLinearCreatedIssue, 'id'>): string {
  return `linear-${issue.id}`;
}

function buildFollowUpPacketPaths(followUpTaskId: string): string[] {
  return [
    `docs/PRD-${followUpTaskId}.md`,
    `docs/TECH_SPEC-${followUpTaskId}.md`,
    `docs/ACTION_PLAN-${followUpTaskId}.md`,
    `tasks/specs/${followUpTaskId}.md`,
    `tasks/tasks-${followUpTaskId}.md`,
    `.agent/task/${followUpTaskId}.md`
  ];
}

async function buildFollowUpPacketTraceabilityEvidence(
  issue: Pick<ProviderLinearCreatedIssue, 'id' | 'description'>
    & {
      state?: ProviderLinearWorkflowState | null;
    },
  repoRoot: string | null | undefined
): Promise<ProviderLinearFollowUpPacketTraceabilityEvidence> {
  const packetPrefix = buildFollowUpTaskId(issue);
  const requiredPaths = buildFollowUpPacketPaths(packetPrefix);
  const registryMirrors = [...FOLLOW_UP_REGISTRY_MIRRORS];
  const packetReadiness = await resolveFollowUpPacketReadiness({
    followUpTaskId: packetPrefix,
    issueDescription: issue.description,
    requiredPaths,
    registryMirrors,
    repoRoot
  });
  const { canonical_task_id: canonicalTaskId, ...readiness } = packetReadiness;
  const queueAdmissionBlocker = resolveFollowUpPacketQueueAdmissionBlocker(issue.state, readiness);
  return {
    packet_prefix: packetPrefix,
    canonical_task_id: canonicalTaskId,
    canonical_task_id_pattern: buildFollowUpCanonicalTaskIdPattern(packetPrefix),
    required_paths: requiredPaths,
    registry_mirrors: registryMirrors,
    observed_state: issue.state ?? null,
    readiness,
    queue_admission_blocker: queueAdmissionBlocker
  };
}

async function resolveFollowUpPacketReadiness(input: {
  followUpTaskId: string;
  issueDescription: string | null | undefined;
  requiredPaths: readonly string[];
  registryMirrors: readonly string[];
  repoRoot: string | null | undefined;
}): Promise<ProviderLinearFollowUpPacketTraceabilityEvidence['readiness'] & { canonical_task_id: string | null }> {
  const descriptionHasPacketPrefix = followUpDescriptionHasPacketPrefix(
    input.issueDescription,
    input.followUpTaskId
  );
  const normalizedRepoRoot = normalizeOptionalString(input.repoRoot ?? null);
  if (!normalizedRepoRoot) {
    return {
      checked: false,
      repo_root: null,
      description_has_packet_prefix: descriptionHasPacketPrefix,
      canonical_task_id: null,
      ready: false,
      missing_paths: [...input.requiredPaths],
      missing_registry_mirrors: [...input.registryMirrors]
    };
  }
  const repoRoot = resolvePath(normalizedRepoRoot);
  const missingPaths: string[] = [];
  for (const path of input.requiredPaths) {
    if (!await fileExists(join(repoRoot, path))) {
      missingPaths.push(path);
    }
  }
  const missingRegistryMirrors: string[] = [];
  let canonicalTaskId: string | null = null;
  for (const path of input.registryMirrors) {
    const content = await readTextFileIfPresent(join(repoRoot, path));
    const mirrorMatch = content
      ? registryMirrorContainsFollowUpTaskId(path, content, input.followUpTaskId, input.requiredPaths)
      : { matched: false, canonicalTaskId: null };
    canonicalTaskId ??= mirrorMatch.canonicalTaskId;
    if (!mirrorMatch.matched) {
      missingRegistryMirrors.push(path);
    }
  }
  return {
    checked: true,
    repo_root: repoRoot,
    description_has_packet_prefix: descriptionHasPacketPrefix,
    canonical_task_id: canonicalTaskId,
    ready: descriptionHasPacketPrefix && missingPaths.length === 0 && missingRegistryMirrors.length === 0,
    missing_paths: missingPaths,
    missing_registry_mirrors: missingRegistryMirrors
  };
}

function resolveFollowUpPacketQueueAdmissionBlocker(
  state: ProviderLinearWorkflowState | null | undefined,
  readiness: ProviderLinearFollowUpPacketTraceabilityEvidence['readiness']
): ProviderLinearFollowUpPacketTraceabilityEvidence['queue_admission_blocker'] {
  if (readiness.ready) {
    return null;
  }
  const stateName = normalizeOptionalString(state?.name);
  const stateBlocksAdmission = stateName === null || isBacklogWorkflowState(state);
  if (!stateBlocksAdmission) {
    return null;
  }
  return {
    reason: 'backlog_head_follow_up_traceability_pending',
    state: stateName ?? 'unknown',
    enforced_by: readiness.description_has_packet_prefix ? 'provider-operator-autopilot' : 'create-follow-up',
    summary: 'Backlog admission remains blocked until follow-up packet files, registry mirrors, and the Linear packet prefix are present.'
  };
}

function followUpDescriptionHasPacketPrefix(description: string | null | undefined, followUpTaskId: string): boolean {
  const value = normalizeOptionalString(description);
  if (!value) {
    return false;
  }
  return new RegExp(`^- Follow-up packet prefix: \`${escapeRegExp(followUpTaskId)}\`$`, 'mu').test(value);
}

function buildFollowUpCanonicalTaskIdPattern(followUpTaskId: string): string {
  return `^\\d{8}-${escapeRegExp(followUpTaskId)}$`;
}

function registryMirrorContainsFollowUpTaskId(
  path: string,
  content: string,
  followUpTaskId: string,
  requiredPaths: readonly string[]
): { matched: boolean; canonicalTaskId: string | null } {
  if (path === 'tasks/index.json') {
    const canonicalTaskId = findCanonicalFollowUpTaskIdInIndex(content, followUpTaskId);
    return { matched: canonicalTaskId !== null, canonicalTaskId };
  }
  if (path === 'docs/docs-freshness-registry.json') {
    return {
      matched: docsFreshnessRegistryContainsRequiredPaths(content, requiredPaths),
      canonicalTaskId: null
    };
  }
  return {
    matched: markdownContainsExactFollowUpTaskId(content, followUpTaskId),
    canonicalTaskId: null
  };
}

function findCanonicalFollowUpTaskIdInIndex(content: string, followUpTaskId: string): string | null {
  const parsed = parseJsonRecord(content);
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  const idPattern = new RegExp(buildFollowUpCanonicalTaskIdPattern(followUpTaskId), 'u');
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? normalizeOptionalString(record.id) : null;
    const relatesTo = typeof record.relates_to === 'string' ? normalizeOptionalString(record.relates_to) : null;
    if (id && idPattern.test(id) && relatesTo === `tasks/tasks-${followUpTaskId}.md`) {
      return id;
    }
  }
  return null;
}

function docsFreshnessRegistryContainsRequiredPaths(content: string, requiredPaths: readonly string[]): boolean {
  const parsed = parseJsonRecord(content);
  const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
  const paths = new Set<string>();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const rawPath = (entry as Record<string, unknown>).path;
    const path = typeof rawPath === 'string' ? normalizeOptionalString(rawPath) : null;
    if (path) {
      paths.add(path);
    }
  }
  return requiredPaths.every((path) => paths.has(path));
}

function markdownContainsExactFollowUpTaskId(content: string, followUpTaskId: string): boolean {
  const escapedTaskId = escapeRegExp(followUpTaskId);
  return new RegExp(`(^|[^A-Za-z0-9-])${escapedTaskId}([^A-Za-z0-9-]|$)`, 'u').test(content);
}

function parseJsonRecord(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function readTextFileIfPresent(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

function isBacklogWorkflowState(state: ProviderLinearWorkflowState | null | undefined): boolean {
  const name = normalizeOptionalString(state?.name);
  return name !== null && normalizeComparableValue(name) === normalizeComparableValue('Backlog');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function normalizeIso(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function normalizeComparableValue(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLowerCase();
}

function normalizeGraphqlFailureStatus(status: number | null | undefined): number {
  return typeof status === 'number' && Number.isFinite(status) && status >= 400 ? status : 502;
}

function parseGitHubPullRequestUrl(
  value: string | null | undefined
): {
  canonicalUrl: string;
  comparisonKey: string;
  owner: string;
  repo: string;
  number: number;
} | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    return null;
  }
  const segments = parsed.pathname.split('/').filter(Boolean);
  const owner = normalizeRequiredString(segments[0] ?? null);
  const repo = normalizeRequiredString(segments[1] ?? null);
  const resource = normalizeComparableValue(segments[2] ?? '');
  const pullNumber = normalizePullRequestNumber(segments[3] ?? null);
  if (!owner || !repo || resource !== 'pull' || !pullNumber) {
    return null;
  }

  return {
    canonicalUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    comparisonKey: `https://github.com/${owner.toLowerCase()}/${repo.toLowerCase()}/pull/${pullNumber}`,
    owner,
    repo,
    number: Number(pullNumber)
  };
}

function normalizePullRequestNumber(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized || !/^\d+$/u.test(normalized)) {
    return null;
  }
  return String(Number.parseInt(normalized, 10));
}
