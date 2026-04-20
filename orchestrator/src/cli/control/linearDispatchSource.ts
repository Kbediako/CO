import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';
import {
  executeLinearGraphql,
  resolveLinearApiToken,
  resolveLinearRequestTimeoutMs,
  type LinearGraphqlFailure,
  type LinearGraphqlPayload
} from './linearGraphqlClient.js';
import {
  recordLinearBudgetHeadersObservation,
  recordLinearBudgetRateLimitObservation,
  readSharedLinearBudgetStatus,
  reserveLinearBudgetReservation,
  resolveLinearBudgetPreflight
} from './linearBudgetState.js';
import { mapLinearRateLimitedFailure } from './linearRateLimit.js';
import {
  isProviderLinearTrackedIssueEligibleForExecution,
  normalizeProviderLinearWorkflowState
} from './providerLinearWorkflowStates.js';

const LINEAR_RECENT_ACTIVITY_LIMIT = 3;
const LINEAR_BLOCKER_LIMIT = 50;
const LINEAR_INVERSE_RELATION_MAX_PAGES = 20;
const DEFAULT_LINEAR_TRACKED_ISSUE_PAGE_SIZE = 50;
const LINEAR_FRESH_DISCOVERY_PRIORITY_BUCKETS = [1, 2, 3, 4, 0] as const;

export interface LiveLinearTrackedActivity {
  id: string;
  created_at: string | null;
  actor_name: string | null;
  summary: string;
}

export interface LiveLinearTrackedBlocker {
  id: string | null;
  identifier: string | null;
  state: string | null;
  state_type: string | null;
}

export interface LiveLinearTrackedRelation {
  direction: 'outbound' | 'inbound';
  type: string | null;
  issue: LiveLinearTrackedBlocker;
}

export interface LiveLinearTrackedIssue {
  provider: 'linear';
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  url: string | null;
  state: string | null;
  state_type: string | null;
  archived_at: string | null;
  trashed: boolean | null;
  viewer_id: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  workspace_id: string | null;
  team_id: string | null;
  team_key: string | null;
  team_name: string | null;
  project_id: string | null;
  project_name: string | null;
  priority?: number | null;
  created_at?: string | null;
  updated_at: string | null;
  blocked_by?: LiveLinearTrackedBlocker[];
  blocked_by_truncated?: boolean;
  relations?: LiveLinearTrackedRelation[];
  relations_truncated?: boolean;
  recent_activity: LiveLinearTrackedActivity[];
}

interface LiveLinearFailureResolution {
  kind: 'unavailable' | 'malformed';
  status: number;
  code: 'dispatch_source_unavailable' | 'dispatch_source_malformed';
  reason: string;
  message?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export type LiveLinearDispatchResolution =
  | {
      kind: 'ready';
      summary: string;
      rationale: string | null;
      confidence: number | null;
      dispatch_id: string;
      generated_at: string;
      source_setup: DispatchPilotSourceSetup;
      tracked_issue: LiveLinearTrackedIssue;
    }
  | LiveLinearFailureResolution;

export type LiveLinearTrackedIssueResolution =
  | {
      kind: 'ready';
      tracked_issue: LiveLinearTrackedIssue;
      source_setup: DispatchPilotSourceSetup;
    }
  | LiveLinearFailureResolution;

export type LiveLinearTrackedIssuesResolution =
  | {
      kind: 'ready';
      tracked_issues: LiveLinearTrackedIssue[];
      source_setup: DispatchPilotSourceSetup;
    }
  | LiveLinearFailureResolution;

export type LiveLinearTrackedIssuesQueryMode = 'full' | 'recovery_sweep' | 'fresh_discovery';
type FreshDiscoveryPriorityBucket = (typeof LINEAR_FRESH_DISCOVERY_PRIORITY_BUCKETS)[number];

interface LinearIssueQueryResponse {
  viewer?: {
    id?: string | null;
    organization?: {
      id?: string | null;
    } | null;
  } | null;
  issue?: LinearIssueNode | null;
  issues?: {
    nodes?: LinearIssueNode[] | null;
    pageInfo?: {
      hasNextPage?: boolean | null;
      endCursor?: string | null;
      hasPreviousPage?: boolean | null;
      startCursor?: string | null;
    } | null;
  } | null;
}

interface LinearIssueNode {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  priority?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  archivedAt?: string | null;
  trashed?: boolean | null;
  state?: {
    name?: string | null;
    type?: string | null;
  } | null;
  assignee?: {
    id?: string | null;
    name?: string | null;
    displayName?: string | null;
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
  inverseRelations?: {
    nodes?: LinearIssueInverseRelationNode[] | null;
    pageInfo?: LinearConnectionPageInfo | null;
  } | null;
  relations?: {
    nodes?: LinearIssueInverseRelationNode[] | null;
    pageInfo?: LinearConnectionPageInfo | null;
  } | null;
  history?: {
    nodes?: LinearIssueHistoryNode[] | null;
  } | null;
}

interface LinearConnectionPageInfo {
  hasNextPage?: boolean | null;
  endCursor?: string | null;
  hasPreviousPage?: boolean | null;
  startCursor?: string | null;
}

interface LinearIssueInverseRelationNode {
  type?: string | null;
  issue?: {
    id?: string | null;
    identifier?: string | null;
    state?: {
      name?: string | null;
      type?: string | null;
    } | null;
  } | null;
  relatedIssue?: {
    id?: string | null;
    identifier?: string | null;
    state?: {
      name?: string | null;
      type?: string | null;
    } | null;
  } | null;
}

interface LinearIssueHistoryNode {
  id?: string | null;
  createdAt?: string | null;
  actor?: {
    name?: string | null;
    displayName?: string | null;
  } | null;
  fromState?: {
    name?: string | null;
  } | null;
  toState?: {
    name?: string | null;
  } | null;
  fromProject?: {
    name?: string | null;
  } | null;
  toProject?: {
    name?: string | null;
  } | null;
  fromTitle?: string | null;
  toTitle?: string | null;
}

export async function resolveLiveLinearDispatchRecommendation(input: {
  source: Record<string, unknown>;
  sourceSetup: DispatchPilotSourceSetup;
  defaultIssueIdentifier?: string | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<LiveLinearDispatchResolution> {
  const confidence = readNumberValue(input.source, 'confidence', 'score') ?? null;
  if (confidence !== null && (confidence < 0 || confidence > 1)) {
    return malformed('dispatch_source_confidence_out_of_range');
  }

  const trackedIssuesResolution = await resolveLiveLinearTrackedIssues({
    sourceSetup: input.sourceSetup,
    env: input.env,
    fetchImpl: input.fetchImpl,
    limit: DEFAULT_LINEAR_TRACKED_ISSUE_PAGE_SIZE
  });
  if (trackedIssuesResolution.kind !== 'ready') {
    return trackedIssuesResolution;
  }

  const trackedIssue =
    trackedIssuesResolution.tracked_issues.find(
      isLiveLinearTrackedIssueEligibleForFreshDispatch
    ) ??
    null;
  if (!trackedIssue) {
    return unavailable('dispatch_source_issue_not_found');
  }

  return {
    kind: 'ready',
    summary:
      readStringValue(input.source, 'summary', 'dispatch_summary', 'dispatchSummary') ??
      `Review Linear advisory ${trackedIssue.identifier}: ${trackedIssue.title}`,
    rationale:
      readStringValue(input.source, 'rationale', 'reason') ??
      buildDefaultRationale(trackedIssue, input.defaultIssueIdentifier ?? null),
    confidence,
    dispatch_id:
      readStringValue(input.source, 'dispatch_id', 'dispatchId') ?? 'dispatch-advisory-live-linear',
    generated_at: new Date().toISOString(),
    source_setup: {
      provider: 'linear',
      workspace_id: trackedIssue.workspace_id,
      team_id: trackedIssue.team_id,
      project_id: trackedIssue.project_id
    },
    tracked_issue: trackedIssue
  };
}

export async function resolveLiveLinearTrackedIssueById(input: {
  issueId: string;
  sourceSetup?: DispatchPilotSourceSetup | null;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<LiveLinearTrackedIssueResolution> {
  const issueId = normalizeEnvValue(input.issueId);
  if (!issueId) {
    return malformed('dispatch_source_issue_id_missing');
  }

  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = resolveLinearApiToken(env);
  if (!token) {
    return unavailable('dispatch_source_credentials_missing');
  }
  const timeoutMs = resolveLinearRequestTimeoutMs(env);

  const sourceSetup = input.sourceSetup ? resolveLinearSourceSetup(input.sourceSetup, env) : null;
  if (input.sourceSetup && !sourceSetup?.workspace_id && !sourceSetup?.team_id && !sourceSetup?.project_id) {
    return malformed('dispatch_source_binding_missing');
  }

  const query = buildLinearIssueByIdQuery(issueId);
  const queryResult = await executeLinearQuery({
    env,
    token,
    timeoutMs,
    fetchImpl,
    source: 'dispatch_source_issue_by_id',
    query: query.query,
    variables: query.variables
  });
  if (!queryResult.ok) {
    return queryResult.resolution;
  }

  const workspaceId = queryResult.payload.data?.viewer?.organization?.id?.trim() ?? null;
  if (sourceSetup?.workspace_id && workspaceId && sourceSetup.workspace_id !== workspaceId) {
    return malformed('dispatch_source_workspace_mismatch');
  }

  const issue = queryResult.payload.data?.issue ?? null;
  if (!issue) {
    return unavailable('dispatch_source_issue_not_found');
  }

  const hydratedIssue = await hydratePaginatedIssueInverseRelations({
    issue,
    env,
    token,
    timeoutMs,
    fetchImpl,
    source: 'dispatch_source_issue_by_id_inverse_relations'
  });
  if (!hydratedIssue.ok) {
    return hydratedIssue.resolution;
  }

  const trackedIssue = parseTrackedIssue(hydratedIssue.issue, {
    workspaceId: sourceSetup?.workspace_id ?? workspaceId,
    viewerId: queryResult.payload.data?.viewer?.id?.trim() ?? null
  });
  if (!trackedIssue) {
    return malformed('dispatch_source_provider_response_invalid');
  }

  if (sourceSetup) {
    const scopeMismatch = validateTrackedIssueScope(trackedIssue, sourceSetup);
    if (scopeMismatch) {
      return scopeMismatch;
    }
  }

  return {
    kind: 'ready',
    tracked_issue: trackedIssue,
    source_setup: {
      provider: 'linear',
      workspace_id: trackedIssue.workspace_id,
      team_id: trackedIssue.team_id,
      project_id: trackedIssue.project_id
    }
  };
}

export async function resolveLiveLinearTrackedIssues(input: {
  sourceSetup: DispatchPilotSourceSetup;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  limit?: number;
  sortForDispatch?: boolean;
  stopWhenEligibleForExecution?: boolean;
  eligibleIssueTargetCount?: number;
  eligibleStateSlotCounts?: Record<string, number>;
  excludedIssueIds?: string[];
  queryMode?: LiveLinearTrackedIssuesQueryMode;
}): Promise<LiveLinearTrackedIssuesResolution> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = resolveLinearApiToken(env);
  if (!token) {
    return unavailable('dispatch_source_credentials_missing');
  }
  const timeoutMs = resolveLinearRequestTimeoutMs(env);

  const sourceSetup = resolveLinearSourceSetup(input.sourceSetup, env);
  if (!sourceSetup.workspace_id && !sourceSetup.team_id && !sourceSetup.project_id) {
    return malformed('dispatch_source_binding_missing');
  }

  const queryMode = resolveLiveLinearTrackedIssuesQueryMode(input.queryMode);
  const eligibleIssueTargetCount = resolveEligibleIssueTargetCount({
    stopWhenEligibleForExecution: input.stopWhenEligibleForExecution,
    eligibleIssueTargetCount: input.eligibleIssueTargetCount
  });
  const eligibleStateSlotCounts = normalizeEligibleStateSlotCounts(input.eligibleStateSlotCounts);
  const excludedIssueIds = new Set(input.excludedIssueIds ?? []);
  if (queryMode === 'fresh_discovery') {
    return await resolveFreshDiscoveryTrackedIssues({
      sourceSetup,
      env,
      token,
      timeoutMs,
      fetchImpl,
      limit: input.limit,
      eligibleIssueTargetCount,
      eligibleStateSlotCounts,
      excludedIssueIds,
      sortForDispatch: input.sortForDispatch !== false
    });
  }
  const trackedIssues: LiveLinearTrackedIssue[] = [];
  const seenIssueIds = new Set<string>();
  let workspaceId: string | null = null;
  let afterCursor: string | null = null;
  let hasNextPage = true;
  let eligibleIssueCount = 0;
  const consumedEligibleStateSlots = new Map<string, number>();

  while (hasNextPage) {
    const query = buildLinearTrackedIssuesQuery(sourceSetup, input.limit, afterCursor, queryMode);
    const queryResult = await executeLinearQuery({
      env,
      token,
      timeoutMs,
      fetchImpl,
      source: resolveTrackedIssuesQuerySource(queryMode),
      query: query.query,
      variables: query.variables
    });
    if (!queryResult.ok) {
      return queryResult.resolution;
    }

    const responseWorkspaceId = queryResult.payload.data?.viewer?.organization?.id?.trim() ?? null;
    if (workspaceId === null) {
      workspaceId = responseWorkspaceId;
    }
    if (sourceSetup.workspace_id && responseWorkspaceId && sourceSetup.workspace_id !== responseWorkspaceId) {
      return malformed('dispatch_source_workspace_mismatch');
    }

    const nodes = Array.isArray(queryResult.payload.data?.issues?.nodes)
      ? queryResult.payload.data?.issues?.nodes ?? []
      : [];
    let stopScanning = false;
    for (const node of nodes) {
      const hydratedIssue = await hydratePaginatedIssueInverseRelations({
        issue: node ?? {},
        env,
        token,
        timeoutMs,
        fetchImpl,
        source: `${resolveTrackedIssuesQuerySource(queryMode)}_inverse_relations`
      });
      if (!hydratedIssue.ok) {
        return hydratedIssue.resolution;
      }
      const trackedIssue = parseTrackedIssue(hydratedIssue.issue, {
        workspaceId: sourceSetup.workspace_id ?? workspaceId,
        viewerId: queryResult.payload.data?.viewer?.id?.trim() ?? null
      });
      if (!trackedIssue) {
        continue;
      }
      const scopeMismatch = validateTrackedIssueScope(trackedIssue, sourceSetup);
      if (scopeMismatch) {
        return scopeMismatch;
      }
      if (seenIssueIds.has(trackedIssue.id)) {
        continue;
      }
      seenIssueIds.add(trackedIssue.id);
      trackedIssues.push(trackedIssue);
      if (
        !excludedIssueIds.has(trackedIssue.id) &&
        shouldCountTrackedIssueTowardEligibilityTarget(
          trackedIssue,
          eligibleStateSlotCounts,
          consumedEligibleStateSlots
        )
      ) {
        eligibleIssueCount += 1;
      }
      if (
        eligibleIssueTargetCount !== null &&
        eligibleIssueCount >= eligibleIssueTargetCount
      ) {
        stopScanning = true;
        break;
      }
    }

    if (stopScanning) {
      hasNextPage = false;
      continue;
    }

    const nextCursor = resolveLinearTrackedIssuesNextCursor(
      queryResult.payload.data?.issues?.pageInfo ?? null,
      queryMode
    );
    if (nextCursor === null) {
      hasNextPage = false;
      continue;
    }
    if (nextCursor === undefined) {
      return malformed('dispatch_source_provider_response_invalid');
    }
    afterCursor = nextCursor;
  }

  return {
    kind: 'ready',
    tracked_issues:
      input.sortForDispatch === false
        ? trackedIssues
        : sortLiveLinearTrackedIssuesForDispatch(trackedIssues),
    source_setup: sourceSetup
  };
}

async function resolveFreshDiscoveryTrackedIssues(input: {
  sourceSetup: DispatchPilotSourceSetup;
  env: NodeJS.ProcessEnv;
  token: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
  limit?: number;
  eligibleIssueTargetCount: number | null;
  eligibleStateSlotCounts: Map<string, number>;
  excludedIssueIds: Set<string>;
  sortForDispatch: boolean;
}): Promise<LiveLinearTrackedIssuesResolution> {
  const trackedIssues: LiveLinearTrackedIssue[] = [];
  const seenIssueIds = new Set<string>();
  let workspaceId: string | null = null;
  let eligibleIssueCount = 0;
  const consumedEligibleStateSlots = new Map<string, number>();

  for (const priorityBucket of LINEAR_FRESH_DISCOVERY_PRIORITY_BUCKETS) {
    let beforeCursor: string | null = null;
    let hasPreviousPage = true;

    while (hasPreviousPage) {
      const query = buildLinearTrackedIssuesQuery(
        input.sourceSetup,
        input.limit,
        beforeCursor,
        'fresh_discovery',
        priorityBucket
      );
      const queryResult = await executeLinearQuery({
        env: input.env,
        token: input.token,
        timeoutMs: input.timeoutMs,
        fetchImpl: input.fetchImpl,
        source: resolveTrackedIssuesQuerySource('fresh_discovery'),
        query: query.query,
        variables: query.variables
      });
      if (!queryResult.ok) {
        return queryResult.resolution;
      }

      const responseWorkspaceId = queryResult.payload.data?.viewer?.organization?.id?.trim() ?? null;
      if (workspaceId === null) {
        workspaceId = responseWorkspaceId;
      }
      if (
        input.sourceSetup.workspace_id &&
        responseWorkspaceId &&
        input.sourceSetup.workspace_id !== responseWorkspaceId
      ) {
        return malformed('dispatch_source_workspace_mismatch');
      }

      const nodes = Array.isArray(queryResult.payload.data?.issues?.nodes)
        ? queryResult.payload.data?.issues?.nodes ?? []
        : [];
      let stopScanning = false;
      for (const node of nodes) {
        const hydratedIssue = await hydratePaginatedIssueInverseRelations({
          issue: node ?? {},
          env: input.env,
          token: input.token,
          timeoutMs: input.timeoutMs,
          fetchImpl: input.fetchImpl,
          source: 'dispatch_source_fresh_discovery_inverse_relations'
        });
        if (!hydratedIssue.ok) {
          return hydratedIssue.resolution;
        }
        const trackedIssue = parseTrackedIssue(hydratedIssue.issue, {
          workspaceId: input.sourceSetup.workspace_id ?? workspaceId,
          viewerId: queryResult.payload.data?.viewer?.id?.trim() ?? null
        });
        if (!trackedIssue) {
          continue;
        }
        const scopeMismatch = validateTrackedIssueScope(trackedIssue, input.sourceSetup);
        if (scopeMismatch) {
          return scopeMismatch;
        }
        if (seenIssueIds.has(trackedIssue.id)) {
          continue;
        }
        seenIssueIds.add(trackedIssue.id);
        trackedIssues.push(trackedIssue);
        if (
          !input.excludedIssueIds.has(trackedIssue.id) &&
          shouldCountTrackedIssueTowardEligibilityTarget(
            trackedIssue,
            input.eligibleStateSlotCounts,
            consumedEligibleStateSlots
          )
        ) {
          eligibleIssueCount += 1;
        }
        if (
          input.eligibleIssueTargetCount !== null &&
          eligibleIssueCount >= input.eligibleIssueTargetCount
        ) {
          stopScanning = true;
          break;
        }
      }

      if (stopScanning) {
        return {
          kind: 'ready',
          tracked_issues: input.sortForDispatch
            ? sortLiveLinearTrackedIssuesForDispatch(trackedIssues)
            : trackedIssues,
          source_setup: input.sourceSetup
        };
      }

      const nextCursor = resolveLinearTrackedIssuesNextCursor(
        queryResult.payload.data?.issues?.pageInfo ?? null,
        'fresh_discovery'
      );
      if (nextCursor === null) {
        hasPreviousPage = false;
        continue;
      }
      if (nextCursor === undefined) {
        return malformed('dispatch_source_provider_response_invalid');
      }
      beforeCursor = nextCursor;
    }
  }

  return {
    kind: 'ready',
    tracked_issues: input.sortForDispatch
      ? sortLiveLinearTrackedIssuesForDispatch(trackedIssues)
      : trackedIssues,
    source_setup: input.sourceSetup
  };
}

export function sortLiveLinearTrackedIssuesForDispatch(
  trackedIssues: readonly LiveLinearTrackedIssue[]
): LiveLinearTrackedIssue[] {
  return [...trackedIssues].sort((left, right) => {
    const priorityDiff = resolveTrackedIssuePriorityRank(left) - resolveTrackedIssuePriorityRank(right);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const createdAtDiff = resolveTrackedIssueCreatedAtSortKey(left) - resolveTrackedIssueCreatedAtSortKey(right);
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return left.identifier.localeCompare(right.identifier);
  });
}

export function isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(
  issue: Pick<LiveLinearTrackedIssue, 'viewer_id' | 'assignee_id'>
): boolean {
  if (issue.assignee_id === null) {
    return true;
  }
  return (
    typeof issue.viewer_id === 'string' &&
    issue.viewer_id.length > 0 &&
    issue.assignee_id === issue.viewer_id
  );
}

export function isLiveLinearTrackedIssueEligibleForFreshDispatch(
  issue: Pick<
    LiveLinearTrackedIssue,
    | 'state'
    | 'state_type'
    | 'blocked_by'
    | 'archived_at'
    | 'trashed'
    | 'viewer_id'
    | 'assignee_id'
  >
): boolean {
  return (
    isProviderLinearTrackedIssueEligibleForExecution(issue) &&
    isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(issue)
  );
}

function buildLinearTrackedIssuesQuery(
  sourceSetup: DispatchPilotSourceSetup,
  limit: number | undefined,
  cursor: string | null,
  queryMode: LiveLinearTrackedIssuesQueryMode,
  priorityBucket?: FreshDiscoveryPriorityBucket
): {
  query: string;
  variables: Record<string, string | number | null>;
} {
  const discoveryMode = queryMode === 'fresh_discovery';
  const variableDefinitions = ['$limit: Int!', discoveryMode ? '$before: String' : '$after: String'];
  const filterParts: string[] = [];
  const variables: Record<string, string | number | null> = {
    limit: normalizeLinearTrackedIssueLimit(limit),
    ...(discoveryMode ? { before: cursor } : { after: cursor })
  };

  if (sourceSetup.team_id) {
    variableDefinitions.push('$teamId: ID!');
    filterParts.push('team: { id: { eq: $teamId } }');
    variables.teamId = sourceSetup.team_id;
  }
  if (sourceSetup.project_id) {
    variableDefinitions.push('$projectId: ID!');
    filterParts.push('project: { id: { eq: $projectId } }');
    variables.projectId = sourceSetup.project_id;
  }
  filterParts.push('state: { type: { nin: ["completed", "canceled"] } }');
  if (discoveryMode) {
    if (priorityBucket === 0) {
      filterParts.push('priority: { eq: 0 }');
    } else if (priorityBucket !== undefined) {
      variableDefinitions.push('$priority: Float!');
      filterParts.push('priority: { eq: $priority }');
      variables.priority = priorityBucket;
    }
  }

  const variableSection = `(${variableDefinitions.join(', ')})`;
  const filterSection = `, filter: { ${filterParts.join(' ')} }`;
  const includeRichIssueDetails = queryMode !== 'fresh_discovery';
  const orderBy = queryMode === 'fresh_discovery' ? 'createdAt' : 'updatedAt';
  const paginationClause = discoveryMode
    ? 'last: $limit, before: $before'
    : 'first: $limit, after: $after';

  return {
    query: `query ResolveLiveLinearTrackedIssues${variableSection} {
      viewer {
        id
        organization {
          id
        }
      }
      issues(orderBy: ${orderBy}, ${paginationClause}${filterSection}) {
        nodes {
          id
          identifier
          title
          url
          priority
          createdAt
          updatedAt
          archivedAt
          trashed
          ${includeRichIssueDetails ? 'description' : ''}
          assignee {
            id
            name
            displayName
          }
          state {
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
          inverseRelations(first: ${LINEAR_BLOCKER_LIMIT}) {
            nodes {
              type
              issue {
                id
                identifier
                state {
                  name
                  type
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
          relations(first: ${LINEAR_BLOCKER_LIMIT}) {
            nodes {
              type
              relatedIssue {
                id
                identifier
                state {
                  name
                  type
                }
              }
            }
            pageInfo {
              hasNextPage
            }
          }
          ${
            includeRichIssueDetails
              ? `history(first: ${LINEAR_RECENT_ACTIVITY_LIMIT}) {
            nodes {
              id
              createdAt
              actor {
                name
                displayName
              }
              fromState {
                name
              }
              toState {
                name
              }
              fromProject {
                name
              }
              toProject {
                name
              }
              fromTitle
              toTitle
            }
          }`
              : ''
          }
        }
        pageInfo {
          hasNextPage
          endCursor
          hasPreviousPage
          startCursor
        }
      }
    }`,
    variables
  };
}

function resolveLiveLinearTrackedIssuesQueryMode(
  mode: LiveLinearTrackedIssuesQueryMode | undefined
): LiveLinearTrackedIssuesQueryMode {
  if (mode === 'recovery_sweep' || mode === 'fresh_discovery') {
    return mode;
  }
  return 'full';
}

function resolveEligibleIssueTargetCount(input: {
  stopWhenEligibleForExecution?: boolean;
  eligibleIssueTargetCount?: number;
}): number | null {
  if (
    typeof input.eligibleIssueTargetCount === 'number' &&
    Number.isInteger(input.eligibleIssueTargetCount) &&
    input.eligibleIssueTargetCount > 0
  ) {
    return input.eligibleIssueTargetCount;
  }
  return input.stopWhenEligibleForExecution === true ? 1 : null;
}

function normalizeEligibleStateSlotCounts(
  input: Record<string, number> | undefined
): Map<string, number> {
  const normalized = new Map<string, number>();
  if (!input) {
    return normalized;
  }
  for (const [rawState, rawCount] of Object.entries(input)) {
    const state = normalizeProviderLinearWorkflowState(rawState);
    if (!state || !Number.isInteger(rawCount) || rawCount < 0) {
      continue;
    }
    normalized.set(state, rawCount);
  }
  return normalized;
}

function shouldCountTrackedIssueTowardEligibilityTarget(
  trackedIssue: Pick<
    LiveLinearTrackedIssue,
    | 'state'
    | 'state_type'
    | 'blocked_by'
    | 'archived_at'
    | 'trashed'
    | 'viewer_id'
    | 'assignee_id'
  >,
  eligibleStateSlotCounts: Map<string, number>,
  consumedEligibleStateSlots: Map<string, number>
): boolean {
  if (!isLiveLinearTrackedIssueEligibleForFreshDispatch(trackedIssue)) {
    return false;
  }

  const normalizedState = normalizeProviderLinearWorkflowState(trackedIssue.state);
  if (!normalizedState) {
    return true;
  }

  const stateLimit = eligibleStateSlotCounts.get(normalizedState);
  if (stateLimit === undefined) {
    return true;
  }

  const consumed = consumedEligibleStateSlots.get(normalizedState) ?? 0;
  if (consumed >= stateLimit) {
    return false;
  }
  consumedEligibleStateSlots.set(normalizedState, consumed + 1);
  return true;
}

function resolveTrackedIssuesQuerySource(queryMode: LiveLinearTrackedIssuesQueryMode): string {
  if (queryMode === 'recovery_sweep') {
    return 'dispatch_source_tracked_issues:recovery_sweep';
  }
  if (queryMode === 'fresh_discovery') {
    return 'dispatch_source_tracked_issues:fresh_discovery';
  }
  return 'dispatch_source_tracked_issues';
}

function buildLinearIssueByIdQuery(issueId: string): {
  query: string;
  variables: Record<string, string>;
} {
  return {
    query: `query ResolveLiveLinearTrackedIssueById($issueId: String!) {
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
        assignee {
          id
          name
          displayName
        }
        state {
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
        inverseRelations(first: ${LINEAR_BLOCKER_LIMIT}) {
          nodes {
            type
            issue {
              id
              identifier
              state {
                name
                type
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
        relations(first: ${LINEAR_BLOCKER_LIMIT}) {
          nodes {
            type
            relatedIssue {
              id
              identifier
              state {
                name
                type
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
        history(first: ${LINEAR_RECENT_ACTIVITY_LIMIT}) {
          nodes {
            id
            createdAt
            actor {
              name
              displayName
            }
            fromState {
              name
            }
            toState {
              name
            }
            fromProject {
              name
            }
            toProject {
              name
            }
            fromTitle
            toTitle
          }
        }
      }
    }`,
    variables: {
      issueId
    }
  };
}

function buildLinearIssueInverseRelationsPageQuery(issueId: string, afterCursor: string): {
  query: string;
  variables: Record<string, string>;
} {
  return {
    query: `query ResolveLiveLinearIssueInverseRelationsPage($issueId: String!, $after: String!) {
      issue(id: $issueId) {
        id
        inverseRelations(first: ${LINEAR_BLOCKER_LIMIT}, after: $after) {
          nodes {
            type
            issue {
              id
              identifier
              state {
                name
                type
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`,
    variables: {
      issueId,
      after: afterCursor
    }
  };
}

async function hydratePaginatedIssueInverseRelations(input: {
  issue: LinearIssueNode;
  env: NodeJS.ProcessEnv;
  token: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
  source: string;
}): Promise<
  | {
      ok: true;
      issue: LinearIssueNode;
    }
  | {
      ok: false;
      resolution: LiveLinearFailureResolution;
    }
> {
  const connection = input.issue.inverseRelations;
  if (connection?.pageInfo?.hasNextPage !== true) {
    return {
      ok: true,
      issue: input.issue
    };
  }
  const issueId = normalizeEnvValue(input.issue.id);
  let afterCursor = normalizeEnvValue(connection.pageInfo.endCursor);
  if (!issueId || !afterCursor || !Array.isArray(connection.nodes)) {
    return {
      ok: false,
      resolution: malformed('dispatch_source_provider_response_invalid')
    };
  }

  const nodes = [...connection.nodes];
  let hasNextPage = true;
  let pagesRead = 0;
  while (hasNextPage && pagesRead < LINEAR_INVERSE_RELATION_MAX_PAGES) {
    if (!afterCursor) {
      return {
        ok: false,
        resolution: malformed('dispatch_source_provider_response_invalid')
      };
    }
    const query = buildLinearIssueInverseRelationsPageQuery(issueId, afterCursor);
    const queryResult = await executeLinearQuery({
      env: input.env,
      token: input.token,
      timeoutMs: input.timeoutMs,
      fetchImpl: input.fetchImpl,
      source: input.source,
      query: query.query,
      variables: query.variables
    });
    if (!queryResult.ok) {
      return queryResult;
    }

    const nextConnection = queryResult.payload.data?.issue?.inverseRelations ?? null;
    if (!Array.isArray(nextConnection?.nodes)) {
      return {
        ok: false,
        resolution: malformed('dispatch_source_provider_response_invalid')
      };
    }
    nodes.push(...nextConnection.nodes);
    hasNextPage = nextConnection.pageInfo?.hasNextPage === true;
    afterCursor = normalizeEnvValue(nextConnection.pageInfo?.endCursor);
    if (hasNextPage && !afterCursor) {
      return {
        ok: false,
        resolution: malformed('dispatch_source_provider_response_invalid')
      };
    }
    pagesRead += 1;
  }

  return {
    ok: true,
    issue: {
      ...input.issue,
      inverseRelations: {
        nodes,
        pageInfo: {
          ...(input.issue.inverseRelations?.pageInfo ?? {}),
          hasNextPage,
          endCursor: afterCursor
        }
      }
    }
  };
}

async function executeLinearQuery(input: {
  env: NodeJS.ProcessEnv;
  token: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
  source: string;
  query: string;
  variables: Record<string, string | number | null>;
}): Promise<
  | {
      ok: true;
      payload: LinearGraphqlPayload<LinearIssueQueryResponse>;
    }
    | {
      ok: false;
      resolution: LiveLinearFailureResolution;
    }
> {
  const sharedBudget = await readSharedLinearBudgetStatus(input.env, {
    operation: input.source
  });
  const preflight = resolveLinearBudgetPreflight({
    budget: sharedBudget,
    operation: input.source
  });
  if (!preflight.ok) {
    return {
      ok: false,
      resolution: unavailable('dispatch_source_provider_rate_limited', {
        status: preflight.error.status,
        message: preflight.error.message,
        retryable: preflight.error.retryable,
        details: {
          error_code: preflight.error.code,
          ...preflight.error.details
        }
      })
    };
  }

  const reservation = await reserveLinearBudgetReservation({
    env: input.env,
    operation: input.source
  });
  if (!reservation.ok) {
    return {
      ok: false,
      resolution: unavailable('dispatch_source_provider_rate_limited', {
        status: reservation.error.status,
        message: reservation.error.message,
        retryable: reservation.error.retryable,
        details: {
          error_code: reservation.error.code,
          ...reservation.error.details
        }
      })
    };
  }

  try {
    const result = await executeLinearGraphql<LinearIssueQueryResponse>({
      token: input.token,
      timeoutMs: input.timeoutMs,
      fetchImpl: input.fetchImpl,
      query: input.query,
      variables: input.variables
    });

    if (!result.ok) {
      await recordLinearBudgetHeadersObservation({
        env: input.env,
        headers: result.failure.headers ?? null,
        source: input.source
      }).catch(() => undefined);
      const rateLimitFailure = mapLinearRateLimitedFailure(result.failure);
      if (rateLimitFailure) {
        await recordLinearBudgetRateLimitObservation({
          env: input.env,
          rateLimit: rateLimitFailure,
          source: input.source
        }).catch(() => undefined);
      }
      return {
        ok: false,
        resolution: mapLinearGraphqlFailureToDispatchResolution(result.failure)
      };
    }

    await recordLinearBudgetHeadersObservation({
      env: input.env,
      headers: result.headers ?? null,
      source: input.source,
      scope: {
        workspaceId: result.payload.data?.viewer?.organization?.id?.trim() ?? null,
        viewerId: result.payload.data?.viewer?.id?.trim() ?? null
      }
    }).catch(() => undefined);

    return {
      ok: true,
      payload: result.payload
    };
  } finally {
    await reservation.reservation?.release().catch(() => undefined);
  }
}

function resolveLinearTrackedIssuesNextCursor(
  pageInfo: {
    hasNextPage?: boolean | null;
    endCursor?: string | null;
    hasPreviousPage?: boolean | null;
    startCursor?: string | null;
  } | null,
  queryMode: LiveLinearTrackedIssuesQueryMode
): string | null | undefined {
  if (queryMode === 'fresh_discovery') {
    if (pageInfo?.hasPreviousPage !== true) {
      return null;
    }
    const startCursor = normalizeEnvValue(pageInfo.startCursor);
    return startCursor ?? undefined;
  }

  if (pageInfo?.hasNextPage !== true) {
    return null;
  }

  const endCursor = normalizeEnvValue(pageInfo.endCursor);
  return endCursor ?? undefined;
}

export function hasLinearApiCredentials(env?: NodeJS.ProcessEnv): boolean {
  return resolveLinearApiToken(env ?? process.env) !== null;
}

export function hasLinearSourceBinding(sourceSetup: DispatchPilotSourceSetup): boolean {
  return Boolean(sourceSetup.workspace_id || sourceSetup.team_id || sourceSetup.project_id);
}

export function resolveLinearSourceSetup(
  sourceSetup: DispatchPilotSourceSetup,
  env: NodeJS.ProcessEnv
): DispatchPilotSourceSetup {
  return {
    provider: 'linear',
    workspace_id: sourceSetup.workspace_id ?? normalizeEnvValue(env.CO_LINEAR_WORKSPACE_ID),
    team_id: sourceSetup.team_id ?? normalizeEnvValue(env.CO_LINEAR_TEAM_ID),
    project_id: sourceSetup.project_id ?? normalizeEnvValue(env.CO_LINEAR_PROJECT_ID)
  };
}

function normalizeLinearTrackedIssueLimit(limit: number | undefined): number {
  return Number.isInteger(limit) && (limit ?? 0) > 0
    ? Math.min(limit as number, DEFAULT_LINEAR_TRACKED_ISSUE_PAGE_SIZE)
    : DEFAULT_LINEAR_TRACKED_ISSUE_PAGE_SIZE;
}

function parseTrackedIssue(
  issue: LinearIssueNode,
  input: {
    workspaceId: string | null;
    viewerId: string | null;
  }
): LiveLinearTrackedIssue | null {
  const id = normalizeEnvValue(issue.id);
  const identifier = normalizeEnvValue(issue.identifier);
  const title = normalizeEnvValue(issue.title);
  if (!id || !identifier || !title) {
    return null;
  }

  return {
    provider: 'linear',
    id,
    identifier,
    title,
    description: normalizeEnvValue((issue as LinearIssueNode & { description?: string | null }).description),
    url: normalizeEnvValue(issue.url),
    state: normalizeEnvValue(issue.state?.name),
    state_type: normalizeEnvValue(issue.state?.type),
    archived_at: normalizeIso(issue.archivedAt),
    trashed: normalizeOptionalBoolean(issue.trashed),
    viewer_id: input.viewerId,
    assignee_id: normalizeEnvValue(issue.assignee?.id),
    assignee_name: normalizeEnvValue(issue.assignee?.displayName ?? issue.assignee?.name),
    workspace_id: input.workspaceId,
    team_id: normalizeEnvValue(issue.team?.id),
    team_key: normalizeEnvValue(issue.team?.key),
    team_name: normalizeEnvValue(issue.team?.name),
    project_id: normalizeEnvValue(issue.project?.id),
    project_name: normalizeEnvValue(issue.project?.name),
    priority: normalizeTrackedIssuePriority(issue.priority),
    created_at: normalizeIso(issue.createdAt),
    updated_at: normalizeIso(issue.updatedAt),
    blocked_by: extractTrackedIssueBlockers(issue),
    blocked_by_truncated: isTrackedIssueBlockerPageTruncated(issue),
    relations: extractTrackedIssueRelations(issue),
    relations_truncated: issue.relations?.pageInfo?.hasNextPage === true,
    recent_activity: Array.isArray(issue.history?.nodes)
      ? issue.history.nodes
          .map((entry) => buildTrackedActivity(entry))
          .filter((entry): entry is LiveLinearTrackedActivity => entry !== null)
      : []
  };
}

function resolveTrackedIssuePriorityRank(issue: Pick<LiveLinearTrackedIssue, 'priority'>): number {
  return normalizeTrackedIssuePriority(issue.priority) ?? 5;
}

function resolveTrackedIssueCreatedAtSortKey(issue: Pick<LiveLinearTrackedIssue, 'created_at'>): number {
  const createdAt = normalizeIso(issue.created_at);
  if (!createdAt) {
    return Number.MAX_SAFE_INTEGER;
  }
  const parsed = Date.parse(createdAt);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function normalizeTrackedIssuePriority(value: number | null | undefined): number | null {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 4
    ? (value as number)
    : null;
}

function normalizeOptionalBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function validateTrackedIssueScope(
  trackedIssue: LiveLinearTrackedIssue,
  sourceSetup: DispatchPilotSourceSetup
): LiveLinearFailureResolution | null {
  if (sourceSetup.workspace_id && trackedIssue.workspace_id && sourceSetup.workspace_id !== trackedIssue.workspace_id) {
    return malformed('dispatch_source_workspace_mismatch');
  }
  if (sourceSetup.team_id && sourceSetup.team_id !== trackedIssue.team_id) {
    return malformed('dispatch_source_team_mismatch');
  }
  if (sourceSetup.project_id && sourceSetup.project_id !== trackedIssue.project_id) {
    return malformed('dispatch_source_project_mismatch');
  }
  return null;
}

function extractTrackedIssueBlockers(issue: LinearIssueNode): LiveLinearTrackedBlocker[] {
  if (!Array.isArray(issue.inverseRelations?.nodes)) {
    return [];
  }
  return issue.inverseRelations.nodes.flatMap((node) => {
    const relationType = normalizeEnvValue(node.type)?.toLowerCase();
    if (relationType !== 'blocks' || !node.issue) {
      return [];
    }
    return [
      {
        id: normalizeEnvValue(node.issue.id),
        identifier: normalizeEnvValue(node.issue.identifier),
        state: normalizeEnvValue(node.issue.state?.name),
        state_type: normalizeEnvValue(node.issue.state?.type)
      }
    ];
  });
}

function isTrackedIssueBlockerPageTruncated(issue: LinearIssueNode): boolean {
  return issue.inverseRelations?.pageInfo?.hasNextPage === true;
}

function extractTrackedIssueRelations(issue: LinearIssueNode): LiveLinearTrackedRelation[] {
  return [
    ...extractTrackedIssueRelationNodes(issue.relations?.nodes, 'outbound', 'relatedIssue'),
    ...extractTrackedIssueRelationNodes(issue.inverseRelations?.nodes, 'inbound', 'issue')
  ];
}

function extractTrackedIssueRelationNodes(
  nodes: LinearIssueInverseRelationNode[] | null | undefined,
  direction: LiveLinearTrackedRelation['direction'],
  issueField: 'issue' | 'relatedIssue'
): LiveLinearTrackedRelation[] {
  if (!Array.isArray(nodes)) {
    return [];
  }
  return nodes.flatMap((node) => {
    const relationIssue = node[issueField];
    if (!relationIssue) {
      return [];
    }
    return [{
      direction,
      type: normalizeEnvValue(node.type),
      issue: {
        id: normalizeEnvValue(relationIssue.id),
        identifier: normalizeEnvValue(relationIssue.identifier),
        state: normalizeEnvValue(relationIssue.state?.name),
        state_type: normalizeEnvValue(relationIssue.state?.type)
      }
    }];
  });
}

function buildTrackedActivity(node: LinearIssueHistoryNode): LiveLinearTrackedActivity | null {
  const id = normalizeEnvValue(node.id);
  if (!id) {
    return null;
  }
  return {
    id,
    created_at: normalizeIso(node.createdAt),
    actor_name: normalizeEnvValue(node.actor?.displayName) ?? normalizeEnvValue(node.actor?.name),
    summary: summarizeHistoryNode(node)
  };
}

function summarizeHistoryNode(node: LinearIssueHistoryNode): string {
  if (node.toState?.name || node.fromState?.name) {
    return `State ${node.fromState?.name ?? 'unknown'} -> ${node.toState?.name ?? 'unknown'}`;
  }
  if (node.toProject?.name || node.fromProject?.name) {
    return `Project ${node.fromProject?.name ?? 'none'} -> ${node.toProject?.name ?? 'none'}`;
  }
  if (node.toTitle || node.fromTitle) {
    return 'Title updated';
  }
  return 'Issue updated';
}

function buildDefaultRationale(issue: LiveLinearTrackedIssue, defaultIssueIdentifier: string | null): string {
  const fragments = [
    `Live Linear advisory selected ${issue.identifier}`,
    issue.team_key ? `team ${issue.team_key}` : null,
    issue.project_name ? `project ${issue.project_name}` : null,
    issue.state ? `state ${issue.state}` : null,
    defaultIssueIdentifier ? `for ${defaultIssueIdentifier}` : null
  ].filter((value): value is string => Boolean(value));
  return fragments.join(', ');
}

function mapLinearGraphqlFailureToDispatchResolution(failure: LinearGraphqlFailure): LiveLinearFailureResolution {
  if (failure.kind === 'response_invalid') {
    return malformed('dispatch_source_provider_response_invalid');
  }
  const rateLimitFailure = mapLinearRateLimitedFailure(failure);
  if (rateLimitFailure) {
    return unavailable('dispatch_source_provider_rate_limited', {
      status: rateLimitFailure.status,
      message: rateLimitFailure.message,
      retryable: rateLimitFailure.retryable,
      details: {
        error_code: rateLimitFailure.code,
        ...rateLimitFailure.details
      }
    });
  }
  return unavailable('dispatch_source_provider_request_failed');
}

function unavailable(
  reason: string,
  options: {
    status?: number;
    message?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  } = {}
): LiveLinearFailureResolution {
  return {
    kind: 'unavailable',
    status: options.status ?? 503,
    code: 'dispatch_source_unavailable',
    reason,
    ...(options.message ? { message: options.message } : {}),
    ...(typeof options.retryable === 'boolean' ? { retryable: options.retryable } : {}),
    ...(options.details ? { details: options.details } : {})
  };
}

function malformed(reason: string): LiveLinearFailureResolution {
  return {
    kind: 'malformed',
    status: 422,
    code: 'dispatch_source_malformed',
    reason
  };
}

function normalizeEnvValue(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeIso(value: string | null | undefined): string | null {
  const normalized = normalizeEnvValue(value);
  if (!normalized) {
    return null;
  }
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumberValue(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}
