import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';
import {
  executeLinearGraphql,
  resolveLinearApiToken,
  resolveLinearRequestTimeoutMs,
  type LinearGraphqlFailure,
  type LinearGraphqlPayload
} from './linearGraphqlClient.js';
import { isProviderLinearTrackedIssueEligibleForExecution } from './providerLinearWorkflowStates.js';

const LINEAR_RECENT_ACTIVITY_LIMIT = 3;
const LINEAR_BLOCKER_LIMIT = 50;
const DEFAULT_LINEAR_TRACKED_ISSUE_PAGE_SIZE = 50;

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

export interface LiveLinearTrackedIssue {
  provider: 'linear';
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  url: string | null;
  state: string | null;
  state_type: string | null;
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
  recent_activity: LiveLinearTrackedActivity[];
}

interface LiveLinearFailureResolution {
  kind: 'unavailable' | 'malformed';
  status: number;
  code: 'dispatch_source_unavailable' | 'dispatch_source_malformed';
  reason: string;
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

interface LinearIssueQueryResponse {
  viewer?: {
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
  state?: {
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
  inverseRelations?: {
    nodes?: LinearIssueInverseRelationNode[] | null;
  } | null;
  history?: {
    nodes?: LinearIssueHistoryNode[] | null;
  } | null;
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
    limit: DEFAULT_LINEAR_TRACKED_ISSUE_PAGE_SIZE,
    sortForDispatch: false,
    stopWhenEligibleForExecution: true
  });
  if (trackedIssuesResolution.kind !== 'ready') {
    return trackedIssuesResolution;
  }

  const trackedIssue =
    trackedIssuesResolution.tracked_issues.find(isProviderLinearTrackedIssueEligibleForExecution) ??
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
    token,
    timeoutMs,
    fetchImpl,
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

  const trackedIssue = parseTrackedIssue(issue, {
    workspaceId: sourceSetup?.workspace_id ?? workspaceId
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

  const trackedIssues: LiveLinearTrackedIssue[] = [];
  const seenIssueIds = new Set<string>();
  let workspaceId: string | null = null;
  let afterCursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const query = buildLinearTrackedIssuesQuery(sourceSetup, input.limit, afterCursor);
    const queryResult = await executeLinearQuery({
      token,
      timeoutMs,
      fetchImpl,
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
      const trackedIssue = parseTrackedIssue(node ?? {}, {
        workspaceId: sourceSetup.workspace_id ?? workspaceId
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
        input.stopWhenEligibleForExecution === true &&
        isProviderLinearTrackedIssueEligibleForExecution(trackedIssue)
      ) {
        stopScanning = true;
        break;
      }
    }

    if (stopScanning) {
      hasNextPage = false;
      continue;
    }

    const nextCursor = resolveLinearTrackedIssuesNextCursor(queryResult.payload.data?.issues?.pageInfo ?? null);
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

function buildLinearTrackedIssuesQuery(
  sourceSetup: DispatchPilotSourceSetup,
  limit: number | undefined,
  afterCursor: string | null
): {
  query: string;
  variables: Record<string, string | number | null>;
} {
  const variableDefinitions = ['$limit: Int!', '$after: String'];
  const filterParts: string[] = [];
  const variables: Record<string, string | number | null> = {
    limit: normalizeLinearTrackedIssueLimit(limit),
    after: afterCursor
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

  const variableSection = `(${variableDefinitions.join(', ')})`;
  const filterSection = `, filter: { ${filterParts.join(' ')} }`;

  return {
    query: `query ResolveLiveLinearTrackedIssues${variableSection} {
      viewer {
        organization {
          id
        }
      }
      issues(orderBy: updatedAt, first: $limit, after: $after${filterSection}) {
        nodes {
          id
          identifier
          title
          description
          url
          priority
          createdAt
          updatedAt
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
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    variables
  };
}

function buildLinearIssueByIdQuery(issueId: string): {
  query: string;
  variables: Record<string, string>;
} {
  return {
    query: `query ResolveLiveLinearTrackedIssueById($issueId: String!) {
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

async function executeLinearQuery(input: {
  token: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
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
  const result = await executeLinearGraphql<LinearIssueQueryResponse>({
    token: input.token,
    timeoutMs: input.timeoutMs,
    fetchImpl: input.fetchImpl,
    query: input.query,
    variables: input.variables
  });

  if (!result.ok) {
    return {
      ok: false,
      resolution: mapLinearGraphqlFailureToDispatchResolution(result.failure)
    };
  }

  return {
    ok: true,
    payload: result.payload
  };
}

function resolveLinearTrackedIssuesNextCursor(
  pageInfo: { hasNextPage?: boolean | null; endCursor?: string | null } | null
): string | null | undefined {
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
  return unavailable('dispatch_source_provider_request_failed');
}

function unavailable(reason: string): LiveLinearFailureResolution {
  return {
    kind: 'unavailable',
    status: 503,
    code: 'dispatch_source_unavailable',
    reason
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
