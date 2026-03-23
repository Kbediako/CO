import {
  executeLinearGraphql,
  resolveLinearApiToken,
  resolveLinearRequestTimeoutMs,
  type LinearGraphqlFailure
} from './linearGraphqlClient.js';
import { resolveLinearSourceSetup } from './linearDispatchSource.js';
import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';

const LINEAR_WORKPAD_MARKER = '## Codex Workpad';
const LINEAR_WORKFLOW_COMMENT_LIMIT = 50;
const LINEAR_WORKFLOW_STATE_LIMIT = 50;
const LINEAR_WORKFLOW_ATTACHMENT_LIMIT = 20;

type ProviderLinearOperation =
  | 'issue-context'
  | 'upsert-workpad'
  | 'delete-workpad'
  | 'transition'
  | 'attach-pr';
type ProviderLinearOperationFailure<T extends ProviderLinearOperation> = {
  ok: false;
  operation: T;
  error: ProviderLinearWorkflowError;
};

export interface ProviderLinearWorkflowError {
  code: string;
  message: string;
  status: number;
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
    selectedComment = context.issue.workpad_comment;
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

function findWorkpadComment(
  comments: readonly ProviderLinearWorkflowComment[]
): ProviderLinearWorkflowComment | null {
  const candidates = comments.filter((entry) => entry.resolved_at === null && hasWorkpadMarker(entry.body));
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    const leftTimestamp = Date.parse(left.updated_at ?? left.created_at ?? '');
    const rightTimestamp = Date.parse(right.updated_at ?? right.created_at ?? '');
    const normalizedLeft = Number.isFinite(leftTimestamp) ? leftTimestamp : 0;
    const normalizedRight = Number.isFinite(rightTimestamp) ? rightTimestamp : 0;
    return normalizedRight - normalizedLeft;
  })[0] ?? null;
}

function hasWorkpadMarker(body: string): boolean {
  return /(^|\n)##\s+Codex Workpad\b/u.test(body);
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
  details?: Record<string, unknown>
): ProviderLinearOperationFailure<T> {
  return {
    ok: false,
    operation,
    error: {
      code,
      message,
      status,
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
  return value.trim().toLowerCase();
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
