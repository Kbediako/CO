import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';
const LINEAR_RECENT_ACTIVITY_LIMIT = 3;
const DEFAULT_LINEAR_REQUEST_TIMEOUT_MS = 5_000;

export interface LiveLinearTrackedActivity {
  id: string;
  created_at: string | null;
  actor_name: string | null;
  summary: string;
}

export interface LiveLinearTrackedIssue {
  provider: 'linear';
  id: string;
  identifier: string;
  title: string;
  url: string | null;
  state: string | null;
  state_type: string | null;
  workspace_id: string | null;
  team_id: string | null;
  team_key: string | null;
  team_name: string | null;
  project_id: string | null;
  project_name: string | null;
  updated_at: string | null;
  recent_activity: LiveLinearTrackedActivity[];
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
  | {
      kind: 'unavailable' | 'malformed';
      status: number;
      code: 'dispatch_source_unavailable' | 'dispatch_source_malformed';
      reason: string;
    };

interface LinearIssueQueryResponse {
  viewer?: {
    organization?: {
      id?: string | null;
    } | null;
  } | null;
  issues?: {
    nodes?: LinearIssueNode[] | null;
  } | null;
}

interface LinearIssueNode {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
  url?: string | null;
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
  history?: {
    nodes?: LinearIssueHistoryNode[] | null;
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
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = resolveLinearApiToken(env);
  if (!token) {
    return unavailable('dispatch_source_credentials_missing');
  }
  const timeoutMs = resolveLinearRequestTimeoutMs(env);

  const sourceSetup = resolveSourceSetup(input.sourceSetup, env);
  if (!sourceSetup.workspace_id && !sourceSetup.team_id && !sourceSetup.project_id) {
    return malformed('dispatch_source_binding_missing');
  }

  const query = buildLinearIssueQuery(sourceSetup);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  const response = await fetchImpl(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({
      query: query.query,
      variables: query.variables
    }),
    signal: abortController.signal
  })
    .catch(() => null)
    .finally(() => clearTimeout(timeout));

  if (!response) {
    return unavailable('dispatch_source_provider_request_failed');
  }

  let payload: { data?: LinearIssueQueryResponse; errors?: Array<{ message?: string }> };
  try {
    payload = (await response.json()) as { data?: LinearIssueQueryResponse; errors?: Array<{ message?: string }> };
  } catch {
    return malformed('dispatch_source_provider_response_invalid');
  }

  if (!response.ok || (Array.isArray(payload.errors) && payload.errors.length > 0)) {
    return unavailable('dispatch_source_provider_request_failed');
  }

  const workspaceId = payload.data?.viewer?.organization?.id?.trim() ?? null;
  if (sourceSetup.workspace_id && workspaceId && sourceSetup.workspace_id !== workspaceId) {
    return malformed('dispatch_source_workspace_mismatch');
  }

  const issue = payload.data?.issues?.nodes?.[0] ?? null;
  if (!issue) {
    return unavailable('dispatch_source_issue_not_found');
  }

  const trackedIssue = parseTrackedIssue(issue, {
    workspaceId: sourceSetup.workspace_id ?? workspaceId
  });
  if (!trackedIssue) {
    return malformed('dispatch_source_provider_response_invalid');
  }

  const confidence = readNumberValue(input.source, 'confidence', 'score') ?? null;
  if (confidence !== null && (confidence < 0 || confidence > 1)) {
    return malformed('dispatch_source_confidence_out_of_range');
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

function buildLinearIssueQuery(sourceSetup: DispatchPilotSourceSetup): {
  query: string;
  variables: Record<string, string>;
} {
  const variableDefinitions: string[] = [];
  const filterParts: string[] = [];
  const variables: Record<string, string> = {};

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
  const variableSection = variableDefinitions.length > 0 ? `(${variableDefinitions.join(', ')})` : '';
  const filterSection = filterParts.length > 0 ? `, filter: { ${filterParts.join(' ')} }` : '';

  return {
    query: `query ResolveLiveLinearDispatch${variableSection} {
      viewer {
        organization {
          id
        }
      }
      issues(orderBy: updatedAt, first: 1${filterSection}) {
        nodes {
          id
          identifier
          title
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
      }
    }`,
    variables
  };
}

function resolveSourceSetup(sourceSetup: DispatchPilotSourceSetup, env: NodeJS.ProcessEnv): DispatchPilotSourceSetup {
  return {
    provider: 'linear',
    workspace_id: sourceSetup.workspace_id ?? normalizeEnvValue(env.CO_LINEAR_WORKSPACE_ID),
    team_id: sourceSetup.team_id ?? normalizeEnvValue(env.CO_LINEAR_TEAM_ID),
    project_id: sourceSetup.project_id ?? normalizeEnvValue(env.CO_LINEAR_PROJECT_ID)
  };
}

function resolveLinearApiToken(env: NodeJS.ProcessEnv): string | null {
  return (
    normalizeEnvValue(env.CO_LINEAR_API_TOKEN) ??
    normalizeEnvValue(env.CO_LINEAR_API_KEY) ??
    normalizeEnvValue(env.LINEAR_API_KEY)
  );
}

function resolveLinearRequestTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = normalizeEnvValue(env.CO_LINEAR_REQUEST_TIMEOUT_MS);
  if (!raw) {
    return DEFAULT_LINEAR_REQUEST_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_LINEAR_REQUEST_TIMEOUT_MS;
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
    url: normalizeEnvValue(issue.url),
    state: normalizeEnvValue(issue.state?.name),
    state_type: normalizeEnvValue(issue.state?.type),
    workspace_id: input.workspaceId,
    team_id: normalizeEnvValue(issue.team?.id),
    team_key: normalizeEnvValue(issue.team?.key),
    team_name: normalizeEnvValue(issue.team?.name),
    project_id: normalizeEnvValue(issue.project?.id),
    project_name: normalizeEnvValue(issue.project?.name),
    updated_at: normalizeIso(issue.updatedAt),
    recent_activity: Array.isArray(issue.history?.nodes)
      ? issue.history.nodes
          .map((entry) => buildTrackedActivity(entry))
          .filter((entry): entry is LiveLinearTrackedActivity => entry !== null)
      : []
  };
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

function unavailable(reason: string): LiveLinearDispatchResolution {
  return {
    kind: 'unavailable',
    status: 503,
    code: 'dispatch_source_unavailable',
    reason
  };
}

function malformed(reason: string): LiveLinearDispatchResolution {
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
