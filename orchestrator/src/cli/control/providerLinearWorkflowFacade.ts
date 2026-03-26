import {
  executeLinearGraphql,
  resolveLinearApiToken,
  resolveLinearRequestTimeoutMs,
  type LinearGraphqlFailure
} from './linearGraphqlClient.js';
import { resolveLinearSourceSetup } from './linearDispatchSource.js';
import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';

const LINEAR_WORKPAD_MARKER = '## Codex Workpad';
const LINEAR_WORKPAD_REQUIRED_SECTIONS = [
  'Environment / Workspace Stamp',
  'Plan',
  'Acceptance Criteria',
  'Validation',
  'Notes'
] as const;
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
const LINEAR_WORKFLOW_COMMENT_LIMIT = 50;
const LINEAR_WORKFLOW_STATE_LIMIT = 50;
const LINEAR_WORKFLOW_ATTACHMENT_LIMIT = 20;

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

interface ProviderLinearWorkpadSection {
  title: string;
  body: string;
}

interface ProviderLinearIssueValidationRequirement {
  raw: string;
  normalized: string;
  source_section: string;
}

export interface ProviderLinearIssueContext {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string | null;
  updated_at: string | null;
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
  comments: ProviderLinearWorkflowComment[];
  attachments: ProviderLinearWorkflowAttachment[];
  workpad_comment: ProviderLinearWorkflowComment | null;
}

type ProviderLinearIssueSummary = Pick<
  ProviderLinearIssueContext,
  'id' | 'identifier' | 'workspace_id' | 'state' | 'team' | 'project'
>;

export type ProviderLinearIssueContextResult =
  | {
      ok: true;
      operation: 'issue-context';
      issue: ProviderLinearIssueContext;
      source_setup: DispatchPilotSourceSetup | null;
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
      };
      previous_state: ProviderLinearWorkflowState | null;
      target_state: ProviderLinearWorkflowState;
      source_setup: DispatchPilotSourceSetup | null;
    }
  | {
      ok: false;
      operation: 'transition';
      error: ProviderLinearWorkflowError;
    };

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
}

export type ProviderLinearCreateFollowUpResult =
  | {
      ok: true;
      operation: 'create-follow-up';
      action: 'created';
      issue: Pick<ProviderLinearIssueContext, 'id' | 'identifier'>;
      follow_up_issue: ProviderLinearCreatedIssue;
      relations: {
        related: true;
        blocked_by_source: boolean;
      };
      source_setup: DispatchPilotSourceSetup | null;
    }
  | {
      ok: false;
      operation: 'create-follow-up';
      error: ProviderLinearWorkflowError;
    };

interface LinearIssueContextQueryResponse {
  viewer?: {
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
    organization?: {
      id?: string | null;
    } | null;
  } | null;
  issue?: {
    id?: string | null;
    identifier?: string | null;
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
  } | null;
}

interface LinearConnectionPageInfo {
  hasNextPage?: boolean | null;
  endCursor?: string | null;
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
    } | null;
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
  token: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
  sourceSetup: DispatchPilotSourceSetup | null;
}

export async function getProviderLinearIssueContext(input: {
  issueId: string;
  sourceSetup?: DispatchPilotSourceSetup | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<ProviderLinearIssueContextResult> {
  const issueId = normalizeRequiredString(input.issueId);
  if (!issueId) {
    return failure('issue-context', 'linear_issue_id_missing', 'Linear issue id is required.', 422);
  }

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failure('issue-context', session.error.code, session.error.message, session.error.status, session.error.details);
  }

  const context = await readIssueContext(session.session, issueId);
  if (!context.ok) {
    return failure('issue-context', context.error.code, context.error.message, context.error.status, context.error.details);
  }

  return {
    ok: true,
    operation: 'issue-context',
    issue: context.issue,
    source_setup: session.session.sourceSetup
  };
}

export async function upsertProviderLinearWorkpadComment(input: {
  issueId: string;
  body: string;
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
    return failure('upsert-workpad', session.error.code, session.error.message, session.error.status, session.error.details);
  }

  const context = await readIssueContext(session.session, issueId);
  if (!context.ok) {
    return failure('upsert-workpad', context.error.code, context.error.message, context.error.status, context.error.details);
  }
  const workpadValidation = validateWorkpadBodyContract(body, context.issue.description);
  if (!workpadValidation.ok) {
    return failure(
      'upsert-workpad',
      workpadValidation.error.code,
      workpadValidation.error.message,
      workpadValidation.error.status,
      workpadValidation.error.details
    );
  }

  const requestedCommentId = normalizeRequiredString(input.commentId ?? null);
  let selectedComment: ProviderLinearWorkflowComment | null;
  if (requestedCommentId) {
    selectedComment =
      context.issue.comments.find(
        (entry) => entry.id === requestedCommentId && entry.resolved_at === null && hasWorkpadMarker(entry.body)
      ) ?? null;
    if (!selectedComment) {
      return failure(
        'upsert-workpad',
        'linear_workpad_comment_id_invalid',
        'Comment id must reference an unresolved Codex workpad comment.',
        422,
        {
          comment_id: requestedCommentId
        }
      );
    }
  } else {
    selectedComment = context.issue.workpad_comment;
  }

  if (selectedComment && selectedComment.body === body) {
    return {
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      issue: {
        id: context.issue.id,
        identifier: context.issue.identifier
      },
      comment: selectedComment,
      source_setup: session.session.sourceSetup
    };
  }

  if (selectedComment) {
    const updateResult = await executeLinearGraphql<CommentMutationResponse>({
      token: session.session.token,
      timeoutMs: session.session.timeoutMs,
      fetchImpl: session.session.fetchImpl,
      query: buildUpdateCommentMutation(),
      variables: {
        id: selectedComment.id,
        body
      }
    });
    if (!updateResult.ok) {
      return failureFromGraphql('upsert-workpad', updateResult.failure);
    }
    const updatedComment = parseMutatedComment(updateResult.payload.data?.commentUpdate?.comment ?? null, body);
    if (updateResult.payload.data?.commentUpdate?.success !== true || !updatedComment) {
      return failure('upsert-workpad', 'comment_update_failed', 'Linear comment update did not succeed.', 503);
    }
    return {
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: context.issue.id,
        identifier: context.issue.identifier
      },
      comment: updatedComment,
      source_setup: session.session.sourceSetup
    };
  }

  const createResult = await executeLinearGraphql<CommentMutationResponse>({
    token: session.session.token,
    timeoutMs: session.session.timeoutMs,
    fetchImpl: session.session.fetchImpl,
    query: buildCreateCommentMutation(),
    variables: {
      issueId: context.issue.id,
      body
    }
  });
  if (!createResult.ok) {
    return failureFromGraphql('upsert-workpad', createResult.failure);
  }
  const createdComment = parseMutatedComment(createResult.payload.data?.commentCreate?.comment ?? null, body);
  if (createResult.payload.data?.commentCreate?.success !== true || !createdComment) {
    return failure('upsert-workpad', 'comment_create_failed', 'Linear comment creation did not succeed.', 503);
  }

  return {
    ok: true,
    operation: 'upsert-workpad',
    action: 'created',
    issue: {
      id: context.issue.id,
      identifier: context.issue.identifier
    },
    comment: createdComment,
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
    return failure(
      'delete-workpad',
      session.error.code,
      session.error.message,
      session.error.status,
      session.error.details
    );
  }

  const context = await readIssueContext(session.session, issueId);
  if (!context.ok) {
    return failure(
      'delete-workpad',
      context.error.code,
      context.error.message,
      context.error.status,
      context.error.details
    );
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

  const deleteResult = await executeLinearGraphql<DeleteMutationResponse>({
    token: session.session.token,
    timeoutMs: session.session.timeoutMs,
    fetchImpl: session.session.fetchImpl,
    query: buildDeleteCommentMutation(),
    variables: {
      id: selectedComment.id
    }
  });
  if (!deleteResult.ok) {
    return failureFromGraphql('delete-workpad', deleteResult.failure);
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

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failure('transition', session.error.code, session.error.message, session.error.status, session.error.details);
  }

  const context = await readIssueContext(session.session, issueId);
  if (!context.ok) {
    return failure('transition', context.error.code, context.error.message, context.error.status, context.error.details);
  }

  const targetState = resolveWorkflowStateByName(context.issue.team?.states ?? [], stateName);
  if (!targetState) {
    return failure(
      'transition',
      'linear_state_not_found',
      `Linear team state "${stateName}" was not found for issue ${context.issue.identifier}.`,
      422
    );
  }

  if (sameWorkflowState(context.issue.state, targetState)) {
    return {
      ok: true,
      operation: 'transition',
      action: 'noop',
      issue: {
        id: context.issue.id,
        identifier: context.issue.identifier,
        state: context.issue.state
      },
      previous_state: context.issue.state,
      target_state: targetState,
      source_setup: session.session.sourceSetup
    };
  }

  const transitionResult = await executeLinearGraphql<IssueTransitionMutationResponse>({
    token: session.session.token,
    timeoutMs: session.session.timeoutMs,
    fetchImpl: session.session.fetchImpl,
    query: buildIssueTransitionMutation(),
    variables: {
      id: context.issue.id,
      stateId: targetState.id
    }
  });
  if (!transitionResult.ok) {
    return failureFromGraphql('transition', transitionResult.failure);
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

  return {
    ok: true,
    operation: 'transition',
    action: 'updated',
    issue: {
      id: normalizeRequiredString(issue?.id)!,
      identifier: normalizeRequiredString(issue?.identifier)!,
      state: updatedState
    },
    previous_state: context.issue.state,
    target_state: targetState,
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
    return failure('attach-pr', session.error.code, session.error.message, session.error.status, session.error.details);
  }

  const context = await readIssueContext(session.session, issueId);
  if (!context.ok) {
    return failure('attach-pr', context.error.code, context.error.message, context.error.status, context.error.details);
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

  const title = normalizeOptionalString(input.title ?? null);
  const githubResult = await executeLinearGraphql<AttachmentMutationResponse>({
    token: session.session.token,
    timeoutMs: session.session.timeoutMs,
    fetchImpl: session.session.fetchImpl,
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
  } else if (githubResult.failure.kind !== 'graphql_error') {
    return failureFromGraphql('attach-pr', githubResult.failure);
  }

  const urlResult = await executeLinearGraphql<AttachmentMutationResponse>({
    token: session.session.token,
    timeoutMs: session.session.timeoutMs,
    fetchImpl: session.session.fetchImpl,
    query: buildAttachUrlMutation(),
    variables: {
      issueId: context.issue.id,
      url: parsedPullRequestUrl.canonicalUrl,
      title: title ?? parsedPullRequestUrl.canonicalUrl
    }
  });
  if (!urlResult.ok) {
    return failureFromGraphql('attach-pr', urlResult.failure);
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
  acceptanceCriteria: string;
  blockedBySource?: boolean;
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
  const acceptanceCriteria = normalizeRequiredString(input.acceptanceCriteria);
  if (!acceptanceCriteria) {
    return failure(
      'create-follow-up',
      'linear_follow_up_acceptance_criteria_missing',
      'Follow-up issue acceptance criteria are required.',
      422
    );
  }

  const session = resolveLinearWorkflowSession(input.env, input.fetchImpl, input.sourceSetup);
  if (!session.ok) {
    return failure(
      'create-follow-up',
      session.error.code,
      session.error.message,
      session.error.status,
      session.error.details
    );
  }

  const issueSummary = await readIssueSummary(session.session, issueId);
  if (!issueSummary.ok) {
    return failure(
      'create-follow-up',
      issueSummary.error.code,
      issueSummary.error.message,
      issueSummary.error.status,
      issueSummary.error.details
    );
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

  const backlogState = resolveWorkflowStateByName(issueSummary.issue.team?.states ?? [], 'Backlog');
  if (!backlogState) {
    return failure(
      'create-follow-up',
      'linear_follow_up_backlog_state_missing',
      `Linear team state "Backlog" was not found for issue ${issueSummary.issue.identifier}.`,
      422
    );
  }

  const createdIssueResult = await executeLinearGraphql<IssueCreateMutationResponse>({
    token: session.session.token,
    timeoutMs: session.session.timeoutMs,
    fetchImpl: session.session.fetchImpl,
    query: buildCreateFollowUpIssueMutation(),
    variables: {
      input: {
        teamId,
        projectId,
        stateId: backlogState.id,
        title,
        description: buildFollowUpIssueDescription(description, acceptanceCriteria)
      }
    }
  });
  if (!createdIssueResult.ok) {
    return failureFromGraphql('create-follow-up', createdIssueResult.failure);
  }

  const createdIssue = parseCreatedIssue(createdIssueResult.payload.data?.issueCreate?.issue ?? null);
  if (createdIssueResult.payload.data?.issueCreate?.success !== true || !createdIssue) {
    return failure(
      'create-follow-up',
      'linear_follow_up_create_failed',
      'Linear follow-up issue creation did not succeed.',
      503
    );
  }

  const relatedRelationResult = await executeLinearGraphql<IssueRelationMutationResponse>({
    token: session.session.token,
    timeoutMs: session.session.timeoutMs,
    fetchImpl: session.session.fetchImpl,
    query: buildCreateIssueRelationMutation(),
    variables: {
      input: {
        type: 'related',
        issueId: issueSummary.issue.id,
        relatedIssueId: createdIssue.id
      }
    }
  });
  if (!relatedRelationResult.ok) {
    const mapped = mapGraphqlFailure(relatedRelationResult.failure);
    return failure(
      'create-follow-up',
      mapped.code,
      mapped.message,
      409,
      {
        ...(mapped.details ?? {}),
        created_issue: createdIssue,
        failed_relation_type: 'related'
      },
      false
    );
  }
  if (relatedRelationResult.payload.data?.issueRelationCreate?.success !== true) {
    return failure(
      'create-follow-up',
      'linear_follow_up_relation_failed',
      'Linear follow-up issue relation creation did not succeed.',
      409,
      {
        created_issue: createdIssue,
        failed_relation_type: 'related'
      },
      false
    );
  }

  const blockedBySource = input.blockedBySource === true;
  if (blockedBySource) {
    const blockingRelationResult = await executeLinearGraphql<IssueRelationMutationResponse>({
      token: session.session.token,
      timeoutMs: session.session.timeoutMs,
      fetchImpl: session.session.fetchImpl,
      query: buildCreateIssueRelationMutation(),
      variables: {
        input: {
          type: 'blocks',
          issueId: issueSummary.issue.id,
          relatedIssueId: createdIssue.id
        }
      }
    });
    if (!blockingRelationResult.ok) {
      const mapped = mapGraphqlFailure(blockingRelationResult.failure);
      return failure(
        'create-follow-up',
        mapped.code,
        mapped.message,
        409,
        {
          ...(mapped.details ?? {}),
          created_issue: createdIssue,
          failed_relation_type: 'blocks'
        },
        false
      );
    }
    if (blockingRelationResult.payload.data?.issueRelationCreate?.success !== true) {
      return failure(
        'create-follow-up',
        'linear_follow_up_relation_failed',
        'Linear follow-up issue relation creation did not succeed.',
        409,
        {
          created_issue: createdIssue,
          failed_relation_type: 'blocks'
        },
        false
      );
    }
  }

  return {
    ok: true,
    operation: 'create-follow-up',
    action: 'created',
    issue: {
      id: issueSummary.issue.id,
      identifier: issueSummary.issue.identifier
    },
    follow_up_issue: createdIssue,
    relations: {
      related: true,
      blocked_by_source: blockedBySource
    },
    source_setup: session.session.sourceSetup
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
      token,
      timeoutMs: resolveLinearRequestTimeoutMs(resolvedEnv),
      fetchImpl: fetchImpl ?? fetch,
      sourceSetup: resolveWorkflowSourceSetup(sourceSetup, resolvedEnv)
    }
  };
}

async function readIssueSummary(
  session: ResolvedLinearWorkflowSession,
  issueId: string
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
  const result = await executeLinearGraphql<LinearIssueSummaryQueryResponse>({
    token: session.token,
    timeoutMs: session.timeoutMs,
    fetchImpl: session.fetchImpl,
    query: buildIssueSummaryQuery(),
    variables: {
      issueId
    }
  });
  if (!result.ok) {
    return {
      ok: false,
      error: mapGraphqlFailure(result.failure)
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
  issueId: string
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
  let issueNode: NonNullable<LinearIssueContextQueryResponse['issue']> | null = null;
  let workspaceId: string | null = null;
  const comments: ProviderLinearWorkflowComment[] = [];
  const seenCommentIds = new Set<string>();
  const attachments: ProviderLinearWorkflowAttachment[] = [];
  const seenAttachmentIds = new Set<string>();
  const seenCursors = new Set<string>();
  let commentsAfter: string | null = null;
  let hasNextCommentPage = true;

  while (hasNextCommentPage) {
    const result = await executeLinearGraphql<LinearIssueContextQueryResponse>({
      token: session.token,
      timeoutMs: session.timeoutMs,
      fetchImpl: session.fetchImpl,
      query: buildIssueContextQuery(),
      variables: {
        issueId,
        commentsAfter
      }
    });
    if (!result.ok) {
      return {
        ok: false,
        error: mapGraphqlFailure(result.failure)
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

  const attachmentResult = await readIssueAttachmentPages(
    session,
    issueId,
    issueNode.attachments?.pageInfo ?? null,
    attachments,
    seenAttachmentIds
  );
  if (!attachmentResult.ok) {
    return attachmentResult;
  }

  const parsedIssue = parseIssueContext(issueNode, workspaceId, session.sourceSetup, comments, attachmentResult.attachments);
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

  return {
    ok: true,
    issue: {
      id,
      identifier,
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
        : null
    }
  };
}

function parseIssueContext(
  issueNode: NonNullable<LinearIssueContextQueryResponse['issue']>,
  workspaceId: string | null | undefined,
  sourceSetup: DispatchPilotSourceSetup | null,
  commentsOverride?: readonly ProviderLinearWorkflowComment[] | null,
  attachmentsOverride?: readonly ProviderLinearWorkflowAttachment[] | null
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
      comments,
      attachments:
        attachmentsOverride !== undefined && attachmentsOverride !== null
          ? [...attachmentsOverride]
          : Array.isArray(issueNode.attachments?.nodes)
            ? issueNode.attachments.nodes
                .map((entry) => parseAttachment(entry))
                .filter((entry): entry is ProviderLinearWorkflowAttachment => entry !== null)
            : [],
      workpad_comment: workpadComment
    }
  };
}

function buildIssueContextQuery(): string {
  return `query ProviderLinearIssueContext($issueId: String!, $commentsAfter: String) {
    viewer {
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
      }
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
      }
    }
  }`;
}

function buildIssueSummaryQuery(): string {
  return `query ProviderLinearIssueSummary($issueId: String!) {
    viewer {
      organization {
        id
      }
    }
    issue(id: $issueId) {
      id
      identifier
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

function buildIssueTransitionMutation(): string {
  return `mutation ProviderLinearMoveIssue($id: String!, $stateId: String!) {
    issueUpdate(id: $id, input: { stateId: $stateId }) {
      success
      issue {
        id
        identifier
        state {
          id
          name
          type
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
      }
    | null
): ProviderLinearCreatedIssue | null {
  const id = normalizeRequiredString(value?.id);
  const identifier = normalizeRequiredString(value?.identifier);
  const title = normalizeRequiredString(value?.title);
  if (!id || !identifier || !title) {
    return null;
  }

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
      : null
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
  for (const line of body.split(/\r?\n/u)) {
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, line);
    if (codeFenceTransition.isBoundary) {
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      continue;
    }
    if (!activeCodeFenceDelimiter && /^##\s+Codex Workpad\b/u.test(line)) {
      return true;
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

  const ticketValidationRequirements = extractIssueValidationRequirements(issueDescription);
  if (ticketValidationRequirements.length === 0) {
    return { ok: true };
  }

  const mirroredValidationText = normalizeRequirementValue(
    `${sections[2]?.body ?? ''}\n${sections[3]?.body ?? ''}`
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

function parseWorkpadSections(body: string): {
  sections: ProviderLinearWorkpadSection[];
  hasLeadingContentBeforeFirstSection: boolean;
} {
  const sections: ProviderLinearWorkpadSection[] = [];
  let markerSeen = false;
  let activeCodeFenceDelimiter: string | null = null;
  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  let hasLeadingContentBeforeFirstSection = false;

  const flushCurrent = () => {
    if (!currentTitle) {
      return;
    }
    sections.push({
      title: currentTitle,
      body: currentLines.join('\n').trim()
    });
  };

  for (const line of body.split(/\r?\n/u)) {
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, line);
    if (codeFenceTransition.isBoundary) {
      if (markerSeen && !currentTitle) {
        hasLeadingContentBeforeFirstSection = true;
      } else if (markerSeen && currentTitle) {
        currentLines.push(line);
      }
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
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
    const headingMatch = line.match(/^\s*###\s+(.+?)\s*$/u);
    if (headingMatch) {
      flushCurrent();
      const headingTitle = headingMatch[1].replace(/\s+#+\s*$/u, '').trim();
      currentTitle = normalizeRequiredString(headingTitle) ?? headingTitle;
      currentLines = [];
      continue;
    }
    if (!currentTitle && normalizeRequiredString(line) !== null) {
      hasLeadingContentBeforeFirstSection = true;
    } else if (currentTitle) {
      currentLines.push(line);
    }
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
  const lines = description.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, line);
    if (codeFenceTransition.isBoundary) {
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      continue;
    }
    if (activeCodeFenceDelimiter) {
      continue;
    }
    const nextLine = lines[index + 1] ?? null;
    const previousLine = lines[index - 1] ?? null;
    const nextVisibleLines = getNextVisibleIssueLines(lines, index + 1, 2);
    const heading = parseIssueDescriptionSectionHeading(
      line,
      previousNonEmptyLine,
      nextLine,
      previousLine,
      nextVisibleLines[0] ?? null
    );
    if (heading) {
      const headingContentLines = getNextVisibleIssueLines(
        lines,
        isSetextUnderlineLine(nextLine ?? '') ? index + 2 : index + 1,
        2
      );
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
      continue;
    }
    if (!activeSection) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      continue;
    }
    if (
      isListIntroductionLine(line, nextVisibleLines[0] ?? null) ||
      isStyledListIntroductionLine(line, nextVisibleLines[0] ?? null)
    ) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      continue;
    }
    const rawRequirement = stripRequirementPrefix(line);
    if (!rawRequirement) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      continue;
    }
    const normalizedRequirement = normalizeRequirementValue(rawRequirement);
    if (!normalizedRequirement) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
      continue;
    }
    if (requirements.some((entry) => entry.normalized === normalizedRequirement)) {
      if (line.trim().length > 0) {
        previousNonEmptyLine = line;
      }
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

  const normalizedCandidate = normalizeComparableValue(candidate);
  if (LINEAR_ISSUE_PLAIN_SECTION_TITLES.has(normalizedCandidate)) {
    return candidate;
  }
  if (matchesSymbolDecoratedSectionTitle(candidate, LINEAR_ISSUE_VALIDATION_SECTION_TITLES)) {
    return candidate;
  }
  if (isMarkdownHeading) {
    return candidate;
  }
  if (isSetextUnderlineLine(nextLine ?? '')) {
    return matchesIssueValidationSectionTitle(candidate) || looksLikeSetextSectionHeadingCandidate(candidate)
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
  if (!/^[\p{L}][\p{L}\p{M}\p{N} /&()'’\-–—]{0,79}$/u.test(candidate)) {
    return false;
  }
  const words = candidate.split(/\s+/u).filter(Boolean);
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

function matchesIssueValidationSectionTitle(title: string): boolean {
  return matchesDecoratedSectionTitle(title, LINEAR_ISSUE_VALIDATION_SECTION_TITLES);
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
    !looksLikePlainSectionHeadingCandidate(candidate) &&
    !looksLikeSetextSectionHeadingCandidate(candidate)
  );
}

function getNextVisibleIssueLines(lines: string[], startIndex: number, count: number): string[] {
  if (count <= 0) {
    return [];
  }
  const visibleLines: string[] = [];
  let activeCodeFenceDelimiter: string | null = null;
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const codeFenceTransition = getCodeFenceTransition(activeCodeFenceDelimiter, line);
    if (codeFenceTransition.isBoundary) {
      activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
      continue;
    }
    if (activeCodeFenceDelimiter) {
      continue;
    }
    if (normalizeRequiredString(line) === null) {
      continue;
    }
    visibleLines.push(line);
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
    (matchesDecoratedSectionTitle(headingTitle, LINEAR_ISSUE_VALIDATION_NESTED_SECTION_TITLES) ||
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
  const normalizedTitle = normalizeComparableValue(title);
  if (allowedTitles.has(normalizedTitle)) {
    return true;
  }

  for (const allowedTitle of allowedTitles) {
    if (!normalizedTitle.startsWith(allowedTitle)) {
      continue;
    }
    const suffix = normalizedTitle.slice(allowedTitle.length).trimStart();
    if (!suffix || !/^[\p{L}\p{N}]/u.test(suffix)) {
      return true;
    }
  }

  return false;
}

function matchesSymbolDecoratedSectionTitle(title: string, allowedTitles: Set<string>): boolean {
  const normalizedTitle = normalizeComparableValue(title);
  for (const allowedTitle of allowedTitles) {
    if (!normalizedTitle.startsWith(allowedTitle)) {
      continue;
    }
    const suffix = normalizedTitle.slice(allowedTitle.length).trimStart();
    if (suffix && /^(?:[^\p{L}\p{N}\s]+(?:\s+[^\p{L}\p{N}\s]+)*)$/u.test(suffix)) {
      return true;
    }
  }

  return false;
}

function parseCodeFenceLine(line: string): {
  delimiter: string;
  trailingText: string;
} | null {
  const trimmedLine = line.trimStart();
  const match = trimmedLine.match(/^(`{3,}|~{3,})(.*)$/u);
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

function failureFromGraphql<T extends ProviderLinearOperation>(
  operation: T,
  failureValue: LinearGraphqlFailure
): ProviderLinearOperationFailure<T> {
  const mapped = mapGraphqlFailure(failureValue);
  return failure(operation, mapped.code, mapped.message, mapped.status, mapped.details);
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
    return {
      code: 'linear_graphql_error',
      message: 'Linear GraphQL returned operation errors.',
      status: normalizeGraphqlFailureStatus(failureValue.status),
      details: {
        errors: failureValue.errors.map((entry) => entry.message ?? 'unknown_error')
      }
    };
  }
  return {
    code: 'linear_request_failed',
    message: 'Linear request failed before a successful response was received.',
    status: failureValue.status ?? 503
  };
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

    const result = await executeLinearGraphql<LinearIssueAttachmentsQueryResponse>({
      token: session.token,
      timeoutMs: session.timeoutMs,
      fetchImpl: session.fetchImpl,
      query: buildIssueAttachmentPageQuery(),
      variables: {
        issueId,
        attachmentsAfter
      }
    });
    if (!result.ok) {
      return {
        ok: false,
        error: mapGraphqlFailure(result.failure)
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

function buildFollowUpIssueDescription(description: string, acceptanceCriteria: string): string {
  const normalizedDescription = description.trim();
  const normalizedAcceptanceCriteria = acceptanceCriteria.trim();
  const acceptanceSection =
    /^#{1,6}\s+Acceptance Criteria\b/imu.test(normalizedAcceptanceCriteria)
      ? normalizedAcceptanceCriteria
      : `## Acceptance Criteria\n${normalizedAcceptanceCriteria}`;
  return `${normalizedDescription}\n\n${acceptanceSection}`;
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
    comparisonKey: `https://github.com/${owner.toLowerCase()}/${repo.toLowerCase()}/pull/${pullNumber}`
  };
}

function normalizePullRequestNumber(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized || !/^\d+$/u.test(normalized)) {
    return null;
  }
  return String(Number.parseInt(normalized, 10));
}
