import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  attachProviderLinearIssuePr,
  createProviderLinearFollowUpIssue,
  deleteProviderLinearWorkpadComment,
  fetchIssueContextPullRequestSnapshot,
  getProviderLinearIssueContext,
  transitionProviderLinearIssueState,
  upsertProviderLinearWorkpadComment
} from '../src/cli/control/providerLinearWorkflowFacade.js';
import {
  readSharedLinearBudgetStatus,
  recordLinearBudgetHeadersObservation
} from '../src/cli/control/linearBudgetState.js';

const scopedSourceSetup = {
  provider: 'linear' as const,
  workspace_id: 'lin-workspace-1',
  team_id: 'lin-team-1',
  project_id: 'lin-project-1'
};
const tempDirs: string[] = [];
const TEAM_STATES_NODES = [
  {
    id: 'state-backlog',
    name: 'Backlog',
    type: 'unstarted'
  },
  {
    id: 'state-in-progress',
    name: 'In Progress',
    type: 'started'
  },
  {
    id: 'state-human-review',
    name: 'Human Review',
    type: 'started'
  },
  {
    id: 'state-done',
    name: 'Done',
    type: 'completed'
  }
];
const ISSUE_LABEL_NODES = [
  {
    id: 'label-lifecycle-implementation',
    name: 'Lifecycle: Implementation',
    color: '#0e8a16'
  },
  {
    id: 'label-priority-p2',
    name: 'Priority: P2',
    color: '#fbca04'
  },
  {
    id: 'label-bug',
    name: 'Bug',
    color: '#d73a49'
  },
  {
    id: 'label-provider-workflow',
    name: 'Area: Provider Workflow',
    color: '#5319e7'
  }
];
const FOLLOW_UP_LABEL_IDS = [
  'label-lifecycle-implementation',
  'label-priority-p2',
  'label-provider-workflow',
  'label-bug'
];
const FOLLOW_UP_LABEL_NODES = [
  ISSUE_LABEL_NODES[0],
  ISSUE_LABEL_NODES[1],
  ISSUE_LABEL_NODES[3],
  ISSUE_LABEL_NODES[2]
];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        force: true,
        recursive: true
      })
    )
  );
});

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

function buildIssueLabelsConnection(labels = ISSUE_LABEL_NODES): unknown {
  return {
    nodes: labels.map((label) => ({ ...label })),
    pageInfo: {
      hasNextPage: false,
      endCursor: null
    }
  };
}

async function seedFollowUpPacketReadiness(repoRoot: string, followUpTaskId: string): Promise<void> {
  await Promise.all([
    mkdir(join(repoRoot, 'docs'), { recursive: true }),
    mkdir(join(repoRoot, 'tasks', 'specs'), { recursive: true }),
    mkdir(join(repoRoot, '.agent', 'task'), { recursive: true })
  ]);
  const requiredPaths = [
    `docs/PRD-${followUpTaskId}.md`,
    `docs/TECH_SPEC-${followUpTaskId}.md`,
    `docs/ACTION_PLAN-${followUpTaskId}.md`,
    `tasks/specs/${followUpTaskId}.md`,
    `tasks/tasks-${followUpTaskId}.md`,
    `.agent/task/${followUpTaskId}.md`
  ];
  const canonicalTaskId = `20260508-${followUpTaskId}`;
  await Promise.all([
    writeFile(join(repoRoot, `docs/PRD-${followUpTaskId}.md`), followUpTaskId),
    writeFile(join(repoRoot, `docs/TECH_SPEC-${followUpTaskId}.md`), followUpTaskId),
    writeFile(join(repoRoot, `docs/ACTION_PLAN-${followUpTaskId}.md`), followUpTaskId),
    writeFile(join(repoRoot, `tasks/specs/${followUpTaskId}.md`), followUpTaskId),
    writeFile(join(repoRoot, `tasks/tasks-${followUpTaskId}.md`), followUpTaskId),
    writeFile(join(repoRoot, `.agent/task/${followUpTaskId}.md`), followUpTaskId),
    writeFile(
      join(repoRoot, 'tasks/index.json'),
      JSON.stringify({
        items: [
          {
            id: canonicalTaskId,
            relates_to: `tasks/tasks-${followUpTaskId}.md`
          }
        ]
      })
    ),
    writeFile(
      join(repoRoot, 'docs/TASKS.md'),
      [
        `# Task List Snapshot - ${followUpTaskId}`,
        `Evidence: ${requiredPaths.map((path) => `\`${path}\``).join(', ')}.`
      ].join('\n')
    ),
    writeFile(
      join(repoRoot, 'docs/docs-freshness-registry.json'),
      JSON.stringify({
        entries: requiredPaths.map((path) => ({
          path,
          owner: 'Codex (top-level agent), Review agent',
          status: 'active',
          last_review: '2026-05-08',
          cadence_days: 30
        }))
      })
    )
  ]);
}

function buildIssueContextBody(overrides: Record<string, unknown> = {}): unknown {
  return {
    data: {
      viewer: {
        organization: {
          id: 'lin-workspace-1'
        }
      },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1',
        title: 'Add Linear parity helper',
        description: 'Implement the worker-visible helper surface.',
        url: 'https://linear.app/example/issue/CO-1',
        updatedAt: '2026-03-22T10:00:00.000Z',
        archivedAt: null,
        trashed: false,
        state: {
          id: 'state-in-progress',
          name: 'In Progress',
          type: 'started'
        },
        team: {
          id: 'lin-team-1',
          key: 'CO',
          name: 'Codex Orchestrator',
          states: {
            nodes: TEAM_STATES_NODES
          }
        },
        project: {
          id: 'lin-project-1',
          name: 'CO'
        },
        labels: {
          nodes: ISSUE_LABEL_NODES.map((label) => ({ ...label })),
          pageInfo: {
            hasNextPage: false,
            endCursor: null
          }
        },
        comments: {
          nodes: [
            {
              id: 'comment-workpad',
              body: '## Codex Workpad\n\nOld plan',
              url: 'https://linear.app/comment/workpad',
              createdAt: '2026-03-22T09:00:00.000Z',
              updatedAt: '2026-03-22T09:30:00.000Z',
              resolvedAt: null
            },
            {
              id: 'comment-note',
              body: 'Unrelated note',
              url: 'https://linear.app/comment/note',
              createdAt: '2026-03-22T08:00:00.000Z',
              updatedAt: '2026-03-22T08:30:00.000Z',
              resolvedAt: null
            }
          ]
        },
        attachments: {
          nodes: []
        },
        ...overrides
      }
    }
  };
}

function buildExpectedFollowUpDescription(options: {
  includeTraceability?: boolean;
  includeParityMatrix?: boolean;
  canonicalOwnerKey?: string;
} = {}): string {
  const canonicalOwnerMarker = options.canonicalOwnerKey
    ? `codex-orchestrator:canonical-owner-key=${options.canonicalOwnerKey}`
    : null;
  const sections = [
    'Investigate the remaining improvement.',
    options.canonicalOwnerKey && canonicalOwnerMarker
      ? [
          '## Canonical Owner',
          `- Canonical owner key: \`${options.canonicalOwnerKey}\``,
          `- Canonical owner marker: \`${canonicalOwnerMarker}\``
        ].join('\n')
      : null,
    '## Intent Checksum\n- Preserve exact `CO STATUS` wording.',
    '## Non-Goals\n- [ ] Do not reopen the browser surface.',
    options.includeParityMatrix === true
      ? '## Parity / Alignment Matrix\n- Current: browser-first\n- Reference: Symphony terminal parity\n- Target: exact terminal parity\n- Out of scope: unrelated UI additions'
      : null,
    '## Not Done If\n- [ ] The issue still allows browser-first parity.',
    options.includeTraceability === true
      ? [
          '## Immediate Traceability',
          '- Source issue: `CO-1` / `lin-issue-1` (https://linear.app/example/issue/CO-1)',
          '- Follow-up issue: `CO-2` / `lin-issue-2` (https://linear.app/example/issue/CO-2)',
          '- Follow-up packet prefix: `linear-lin-issue-2`',
          '- Canonical registry task id: see `tasks/index.json` (format `YYYYMMDD-linear-<linear-issue-id>`)',
          '- Create before active work: `docs/PRD-linear-lin-issue-2.md`, `docs/TECH_SPEC-linear-lin-issue-2.md`, `docs/ACTION_PLAN-linear-lin-issue-2.md`, `tasks/specs/linear-lin-issue-2.md`, `tasks/tasks-linear-lin-issue-2.md`, `.agent/task/linear-lin-issue-2.md`',
          '- Update registry mirrors before the issue leaves `Backlog`: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`'
        ].join('\n')
      : null,
    '## Acceptance Criteria\n- [ ] Captured'
  ].filter((section): section is string => Boolean(section));
  return sections.join('\n\n');
}

function buildExpectedFollowUpDescriptionForIssue(options: {
  includeTraceability?: boolean;
  includeParityMatrix?: boolean;
  canonicalOwnerKey?: string;
  followUpId?: string;
  followUpIdentifier?: string;
  sourceIssueId?: string;
  sourceIdentifier?: string;
} = {}): string {
  const followUpId = options.followUpId ?? 'lin-issue-2';
  const followUpIdentifier = options.followUpIdentifier ?? 'CO-2';
  const sourceIssueId = options.sourceIssueId ?? 'lin-issue-1';
  const sourceIdentifier = options.sourceIdentifier ?? 'CO-1';
  return buildExpectedFollowUpDescription({
    includeTraceability: options.includeTraceability,
    includeParityMatrix: options.includeParityMatrix,
    canonicalOwnerKey: options.canonicalOwnerKey
  })
    .replaceAll('linear-lin-issue-2', '__FOLLOW_UP_PACKET_PREFIX__')
    .replaceAll('lin-issue-2', followUpId)
    .replaceAll('CO-2', followUpIdentifier)
    .replaceAll('__FOLLOW_UP_PACKET_PREFIX__', `linear-${followUpId}`)
    .replaceAll('lin-issue-1', sourceIssueId)
    .replaceAll('CO-1', sourceIdentifier);
}

function buildCanonicalOwnerIssuesBody(
  nodes: unknown[],
  pageInfo: {
    hasNextPage?: boolean;
    endCursor?: string | null;
  } = {}
): unknown {
  return {
    data: {
      issues: {
        nodes,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage ?? false,
          endCursor: pageInfo.endCursor ?? null
        }
      }
    }
  };
}

function buildCanonicalOwnerIssue(input: {
  id: string;
  identifier: string;
  title: string;
  description: string;
  team?: {
    id: string;
    key: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  } | null;
  labels?: unknown;
  state: {
    id: string;
    name: string;
    type: string | null;
  };
}): unknown {
  return {
    id: input.id,
    identifier: input.identifier,
    title: input.title,
    description: input.description,
    url: `https://linear.app/example/issue/${input.identifier}`,
    archivedAt: null,
    trashed: false,
    state: input.state,
    team: input.team ?? {
      id: 'lin-team-1',
      key: 'CO',
      name: 'Codex Orchestrator'
    },
    project: input.project === undefined
      ? {
          id: 'lin-project-1',
          name: 'CO'
        }
      : input.project,
    labels: input.labels ?? {
      nodes: ISSUE_LABEL_NODES.map((label) => ({ ...label })),
      pageInfo: {
        hasNextPage: false,
        endCursor: null
      }
    }
  };
}

function buildCachedIssueContext(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'lin-issue-1',
    identifier: 'CO-1',
    title: 'Add Linear parity helper',
    description: 'Implement the worker-visible helper surface.',
    archived_at: null,
    trashed: false,
    workspace_id: 'lin-workspace-1',
    state: {
      id: 'state-in-progress',
      name: 'In Progress',
      type: 'started'
    },
    team: {
      id: 'lin-team-1',
      key: 'CO',
      name: 'Codex Orchestrator',
      states: TEAM_STATES_NODES.map((state) => ({ ...state }))
    },
    project: {
      id: 'lin-project-1',
      name: 'CO'
    },
    labels: ISSUE_LABEL_NODES.map((label) => ({ ...label })),
    comments: [
      {
        id: 'comment-workpad',
        body: '## Codex Workpad\n\nOld plan',
        url: 'https://linear.app/comment/workpad',
        created_at: '2026-03-22T09:00:00.000Z',
        updated_at: '2026-03-22T09:30:00.000Z',
        resolved_at: null
      },
      {
        id: 'comment-note',
        body: 'Unrelated note',
        url: 'https://linear.app/comment/note',
        created_at: '2026-03-22T08:00:00.000Z',
        updated_at: '2026-03-22T08:30:00.000Z',
        resolved_at: null
      }
    ],
    attachments: [],
    workpad_comment: {
      id: 'comment-workpad',
      body: '## Codex Workpad\n\nOld plan',
      url: 'https://linear.app/comment/workpad',
      created_at: '2026-03-22T09:00:00.000Z',
      updated_at: '2026-03-22T09:30:00.000Z',
      resolved_at: null
    },
    ...overrides
  };
}

function buildStructuredWorkpadBody(overrides: {
  environmentLines?: string[];
  planLines?: string[];
  acceptanceCriteriaLines?: string[];
  validationLines?: string[];
  notesLines?: string[];
  extraSections?: Array<{ title: string; lines: string[] }>;
  normalizeRequiredChecklistSections?: boolean;
} = {}): string {
  const {
    environmentLines = ['- Issue: `CO-1`.', '- Workspace: `linear-workspace`.'],
    planLines = ['- Update the durable workpad contract.'],
    acceptanceCriteriaLines = ['- [ ] Keep the canonical five-section workpad shape.'],
    validationLines = ['- [ ] Run npm test.', '- [ ] Run npm run lint.'],
    notesLines = ['- Preserve a single active workpad comment.'],
    extraSections = [],
    normalizeRequiredChecklistSections = true
  } = overrides;

  const renderSection = (title: string, lines: string[]) => [`### ${title}`, ...lines, ''];
  const checkboxAcceptanceCriteriaLines = normalizeRequiredChecklistSections
    ? ensureSectionContainsCheckboxListItem(acceptanceCriteriaLines)
    : acceptanceCriteriaLines;
  const checkboxValidationLines = normalizeRequiredChecklistSections
    ? ensureSectionContainsCheckboxListItem(validationLines)
    : validationLines;

  return [
    '## Codex Workpad',
    '',
    ...renderSection('Environment / Workspace Stamp', environmentLines),
    ...renderSection('Plan', planLines),
    ...renderSection('Acceptance Criteria', checkboxAcceptanceCriteriaLines),
    ...renderSection('Validation', checkboxValidationLines),
    ...renderSection('Notes', notesLines),
    ...extraSections.flatMap((section) => renderSection(section.title, section.lines))
  ]
    .join('\n')
    .trimEnd();
}

const TEST_WORKPAD_NON_EMPTY_CHECKBOX_LIST_ITEM_PATTERN = /^[ ]{0,3}-\s+\[(?: |x|X)\]\s+\S.*$/u;
const TEST_WORKPAD_BLANK_CHECKBOX_LIST_ITEM_PATTERN = /^[ ]{0,3}-\s+\[(?: |x|X)\]\s*$/u;
const TEST_WORKPAD_RUNTIME_INDENTATION_PATTERN = /^[ ]{0,3}(?:\S|$)/u;

function ensureSectionContainsCheckboxListItem(lines: string[]): string[] {
  let activeCodeFenceDelimiter: string | null = null;
  const listContinuationIndents: number[] = [];
  let lineIndex = -1;

  for (const [index, line] of lines.entries()) {
    const leadingSpaces = line.match(/^ */u)?.[0].length ?? 0;
    if (line.trim().length > 0) {
      while (
        listContinuationIndents.length > 0 &&
        leadingSpaces < listContinuationIndents[listContinuationIndents.length - 1]
      ) {
        listContinuationIndents.pop();
      }
    }
    const containerIndent = listContinuationIndents[listContinuationIndents.length - 1] ?? 0;
    const structuralLine = leadingSpaces >= containerIndent ? line.slice(containerIndent) : line;
    const codeFenceTransition = getTestWorkpadCodeFenceTransition(activeCodeFenceDelimiter, structuralLine);
    activeCodeFenceDelimiter = codeFenceTransition.nextDelimiter;
    if (codeFenceTransition.isBoundary || activeCodeFenceDelimiter !== null) {
      continue;
    }

    if (TEST_WORKPAD_NON_EMPTY_CHECKBOX_LIST_ITEM_PATTERN.test(structuralLine)) {
      return lines;
    }

    if (lineIndex !== -1) {
      const listItemMatch = structuralLine.match(/^([ ]{0,3})(?:[-+*]|\d+[.)])\s+/u);
      if (listItemMatch) {
        const nextIndent = containerIndent + listItemMatch[0].length;
        while (
          listContinuationIndents.length > 0 &&
          nextIndent <= listContinuationIndents[listContinuationIndents.length - 1]
        ) {
          listContinuationIndents.pop();
        }
        listContinuationIndents.push(nextIndent);
      }
      continue;
    }

    const trimmed = structuralLine.trim();
    if (
      TEST_WORKPAD_RUNTIME_INDENTATION_PATTERN.test(structuralLine) &&
      trimmed.length > 0 &&
      !trimmed.startsWith('###') &&
      !TEST_WORKPAD_BLANK_CHECKBOX_LIST_ITEM_PATTERN.test(structuralLine)
    ) {
      lineIndex = index;
    }
    const listItemMatch = structuralLine.match(/^([ ]{0,3})(?:[-+*]|\d+[.)])\s+/u);
    if (listItemMatch) {
      const nextIndent = containerIndent + listItemMatch[0].length;
      while (
        listContinuationIndents.length > 0 &&
        nextIndent <= listContinuationIndents[listContinuationIndents.length - 1]
      ) {
        listContinuationIndents.pop();
      }
      listContinuationIndents.push(nextIndent);
    }
  }

  if (lineIndex === -1) {
    return [...lines];
  }

  const updatedLines = [...lines];
  const originalLine = updatedLines[lineIndex];
  const trimmedLine = originalLine.trim();
  const plainBulletMatch = originalLine.match(/^([ ]{0,3})-\s+(.*)$/u);
  if (plainBulletMatch) {
    updatedLines[lineIndex] = `${plainBulletMatch[1]}- [ ] ${plainBulletMatch[2]}`;
    return updatedLines;
  }
  const orderedListMatch = originalLine.match(/^([ ]{0,3})\d+[.)]\s+(.*)$/u);
  if (orderedListMatch) {
    updatedLines[lineIndex] = `${orderedListMatch[1]}- [ ] ${orderedListMatch[2]}`;
    return updatedLines;
  }

  const indentation = (originalLine.match(/^[ ]{0,3}/u) ?? [''])[0];
  updatedLines[lineIndex] = `${indentation}- [ ] ${trimmedLine}`;
  return updatedLines;
}

function parseTestWorkpadCodeFenceLine(line: string): {
  delimiter: string;
  trailingText: string;
} | null {
  const match = line.match(/^[ ]{0,3}(`{3,}|~{3,})(.*)$/u);
  if (!match) {
    return null;
  }
  return {
    delimiter: match[1],
    trailingText: match[2] ?? ''
  };
}

function isClosingTestWorkpadCodeFenceLine(
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

function getTestWorkpadCodeFenceTransition(
  activeDelimiter: string | null,
  line: string
): {
  isBoundary: boolean;
  nextDelimiter: string | null;
} {
  const codeFenceLine = parseTestWorkpadCodeFenceLine(line);
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
  if (isClosingTestWorkpadCodeFenceLine(activeDelimiter, codeFenceLine)) {
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

async function createRunScopedEnv(): Promise<NodeJS.ProcessEnv> {
  const dir = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
  tempDirs.push(dir);
  return {
    CO_LINEAR_API_TOKEN: 'lin-api-token',
    CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(dir, 'provider-linear-worker-linear-audit.jsonl')
  };
}

async function createBudgetedRunScopedEnv(): Promise<NodeJS.ProcessEnv> {
  const dir = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
  tempDirs.push(dir);
  return {
    CODEX_HOME: dir,
    CO_LINEAR_API_TOKEN: 'lin-api-token',
    CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(dir, 'provider-linear-worker-linear-audit.jsonl')
  };
}

function resolveIssueContextCachePathForTest(
  env: NodeJS.ProcessEnv,
  issueId = 'lin-issue-1'
): string {
  const auditPath = env.CODEX_PROVIDER_LINEAR_AUDIT_PATH;
  if (!auditPath) {
    throw new Error('Missing CODEX_PROVIDER_LINEAR_AUDIT_PATH for cache-path test setup.');
  }
  const safeIssueId = issueId.replace(/[^A-Za-z0-9._-]/gu, '_');
  return join(dirname(auditPath), `provider-linear-issue-context-cache-${safeIssueId}.json`);
}

function resolveLegacyIssueContextCachePathForTest(env: NodeJS.ProcessEnv): string {
  const auditPath = env.CODEX_PROVIDER_LINEAR_AUDIT_PATH;
  if (!auditPath) {
    throw new Error('Missing CODEX_PROVIDER_LINEAR_AUDIT_PATH for cache-path test setup.');
  }
  return join(dirname(auditPath), 'provider-linear-issue-context-cache.json');
}

async function writeCachedIssueContext(
  env: NodeJS.ProcessEnv,
  issue: Record<string, unknown>,
  options?: {
    recordedAt?: string;
    sourceSetup?: Record<string, unknown> | null;
    legacyPath?: boolean;
  }
): Promise<void> {
  const issueId = typeof issue.id === 'string' ? issue.id.trim() : '';
  if (!issueId) {
    return;
  }
  await writeFile(
    options?.legacyPath === true
      ? resolveLegacyIssueContextCachePathForTest(env)
      : resolveIssueContextCachePathForTest(env, issueId),
    JSON.stringify(
      {
        schema_version: 1,
        issue_id: issueId,
        recorded_at: options?.recordedAt ?? '2026-03-22T10:00:00.000Z',
        source_setup: options?.sourceSetup ?? null,
        issue
      },
      null,
      2
    ),
    'utf8'
  );
}

const LINEAR_TOKEN_ENV: NodeJS.ProcessEnv = {
  CO_LINEAR_API_TOKEN: 'lin-api-token'
};

function buildGitHubAttachment(id: string, prNumber: number, title = `PR ${prNumber}`): Record<string, unknown> {
  return {
    id,
    title,
    url: `https://github.com/asabeko/CO/pull/${prNumber}`,
    sourceType: 'github'
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

interface IssueContextTestPullRequestSnapshot {
  state: string;
  mergedAt: string | null;
  updatedAt: string;
  title?: string | null;
  headRefName?: string | null;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

async function readIssueContextAttachmentTruth(options: {
  identifier?: string;
  title: string;
  state: { id: string; name: string; type: string | null };
  attachments: Record<string, unknown>[];
  snapshotForPr: (prNumber: number) => unknown | Promise<unknown>;
}) {
  const identifier = options.identifier ?? 'CO-220';
  const teamKey = identifier.split('-', 1)[0] || 'CO';
  const fetchImpl: typeof fetch = vi.fn(async () =>
    jsonResponse(
      buildIssueContextBody({
        identifier,
        title: options.title,
        url: `https://linear.app/example/issue/${identifier}`,
        updatedAt: '2026-04-17T13:12:00.000Z',
        state: options.state,
        team: {
          id: 'lin-team-1',
          key: teamKey,
          name: teamKey === 'CO' ? 'Codex Orchestrator' : teamKey,
          states: {
            nodes: TEAM_STATES_NODES
          }
        },
        attachments: { nodes: options.attachments }
      })
    )
  );
  const resolvePullRequestSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) =>
    options.snapshotForPr(prNumber)
  );
  const result = await getProviderLinearIssueContext({
    issueId: 'lin-issue-1',
    env: LINEAR_TOKEN_ENV,
    fetchImpl,
    resolvePullRequestSnapshot
  });
  return { result, resolvePullRequestSnapshot };
}

describe('providerLinearWorkflowFacade', () => {
  it('fails issue-context reads fast when shared cooldown is already active', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('shared cooldown should fail closed before fetch');
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      operation: 'issue-context',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true,
          shared_budget_cooldown_active: true
        }
      }
    });
  });

  it('reuses a recent cached issue-context snapshot with labels when request headroom is degraded', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token',
      CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(codexHome, 'provider-linear-worker-linear-audit.jsonl')
    };
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        title: 'Cached issue context'
      }),
      {
        recordedAt: new Date(Date.now() - 45_000).toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('degraded headroom should reuse the scoped cache before fetch');
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      cache_fallback_used: true,
      issue: {
        identifier: 'CO-1',
        title: 'Cached issue context',
        labels: ISSUE_LABEL_NODES,
        workpad_comment: {
          id: 'comment-workpad'
        }
      }
    });
  });

  it('does not reuse an issue-context cache snapshot that omits labels', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token',
      CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(codexHome, 'provider-linear-worker-linear-audit.jsonl')
    };
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        labels: undefined,
        title: 'Legacy cache without labels'
      }),
      {
        recordedAt: new Date(Date.now() - 45_000).toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          title: 'Live issue context after omitted-label cache'
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '89',
          'x-ratelimit-requests-reset': resetAt
        }
      )
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        title: 'Live issue context after omitted-label cache',
        labels: ISSUE_LABEL_NODES
      }
    });
  });

  it('falls back to the legacy singleton cache path when no issue-keyed cache exists yet', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        title: 'Legacy cached issue context'
      }),
      {
        recordedAt: new Date(Date.now() - 45_000).toISOString(),
        legacyPath: true
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('legacy cache fallback should resolve before fetch');
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      cache_fallback_used: true,
      issue: {
        identifier: 'CO-1',
        title: 'Legacy cached issue context'
      }
    });
  });

  it.each([
    {
      label: 'issue id mismatch',
      requestedIssueId: 'lin-issue-1',
      cachedIssue: buildCachedIssueContext({ id: 'lin-issue-2', identifier: 'CO-2' }),
      cachedSourceSetup: null,
      requestedSourceSetup: undefined
    },
    {
      label: 'source setup mismatch',
      requestedIssueId: 'lin-issue-1',
      cachedIssue: buildCachedIssueContext(),
      cachedSourceSetup: {
        ...scopedSourceSetup,
        project_id: 'lin-project-other'
      },
      requestedSourceSetup: scopedSourceSetup
    }
  ])(
    'does not reuse the legacy singleton cache on $label',
    async ({ requestedIssueId, cachedIssue, cachedSourceSetup, requestedSourceSetup }) => {
      const env = await createBudgetedRunScopedEnv();
      const resetAt = String(Date.now() + 60_000);

      await writeCachedIssueContext(env, cachedIssue, {
        recordedAt: new Date(Date.now() - 45_000).toISOString(),
        sourceSetup: cachedSourceSetup,
        legacyPath: true
      });
      await recordLinearBudgetHeadersObservation({
        env,
        source: 'provider-linear:issue-context',
        headers: {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '5',
          'x-ratelimit-requests-reset': resetAt
        }
      });

      const fetchImpl: typeof fetch = vi.fn(async () =>
        jsonResponse(
          buildIssueContextBody({
            id: 'lin-issue-1',
            identifier: 'CO-1',
            title: 'Fetched issue context'
          })
        )
      );

      const result = await getProviderLinearIssueContext({
        issueId: requestedIssueId,
        sourceSetup: requestedSourceSetup,
        env,
        allowReadOnlyCacheReuse: true,
        fetchImpl
      });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        ok: true,
        operation: 'issue-context',
        issue: {
          identifier: 'CO-1',
          title: 'Fetched issue context'
        }
      });
      expect(result).not.toHaveProperty('cache_fallback_used');
    }
  );

  it('keeps issue-keyed cache artifacts separate across cross-issue reads in one run', async () => {
    const env = await createBudgetedRunScopedEnv();
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        variables?: { issueId?: string };
      };
      if (body.variables?.issueId === 'lin-issue-1') {
        return jsonResponse(
          buildIssueContextBody({
            id: 'lin-issue-1',
            identifier: 'CO-1',
            title: 'Parent issue context',
            updatedAt: '2026-04-22T08:00:00.000Z'
          })
        );
      }
      if (body.variables?.issueId === 'lin-issue-2') {
        return jsonResponse(
          buildIssueContextBody({
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Cross issue context',
            updatedAt: '2026-04-22T08:05:00.000Z'
          })
        );
      }
      throw new Error(`Unexpected issueId: ${body.variables?.issueId ?? 'missing'}`);
    });

    const parentResult = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl
    });
    const crossIssueResult = await getProviderLinearIssueContext({
      issueId: 'lin-issue-2',
      env,
      fetchImpl
    });

    expect(parentResult).toMatchObject({
      ok: true,
      issue: {
        identifier: 'CO-1',
        title: 'Parent issue context'
      }
    });
    expect(parentResult).not.toHaveProperty('cache_fallback_used');
    expect(crossIssueResult).toMatchObject({
      ok: true,
      issue: {
        identifier: 'CO-2',
        title: 'Cross issue context'
      }
    });
    expect(crossIssueResult).not.toHaveProperty('cache_fallback_used');

    const parentCachePath = resolveIssueContextCachePathForTest(env, 'lin-issue-1');
    const crossIssueCachePath = resolveIssueContextCachePathForTest(env, 'lin-issue-2');
    const parentCacheRecord = JSON.parse(await readFile(parentCachePath, 'utf8')) as {
      issue_id: string;
      issue: {
        identifier: string;
        title: string;
      };
    };
    const crossIssueCacheRecord = JSON.parse(await readFile(crossIssueCachePath, 'utf8')) as {
      issue_id: string;
      issue: {
        identifier: string;
        title: string;
      };
    };

    expect(parentCachePath).not.toBe(crossIssueCachePath);
    expect(parentCacheRecord).toMatchObject({
      issue_id: 'lin-issue-1',
      issue: {
        identifier: 'CO-1',
        title: 'Parent issue context'
      }
    });
    expect(crossIssueCacheRecord).toMatchObject({
      issue_id: 'lin-issue-2',
      issue: {
        identifier: 'CO-2',
        title: 'Cross issue context'
      }
    });
    await expect(
      readFile(resolveLegacyIssueContextCachePathForTest(env), 'utf8')
    ).rejects.toThrow();

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const cachedParentResult = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fallbackToCacheOnFailure: true,
      fetchImpl: vi.fn(async () => {
        throw new Error('issue-keyed cache fallback should resolve before fetch');
      })
    });

    expect(cachedParentResult).toMatchObject({
      ok: true,
      operation: 'issue-context',
      cache_fallback_used: true,
      issue: {
        identifier: 'CO-1',
        title: 'Parent issue context'
      }
    });
  });

  it('bypasses degraded-headroom cache reuse when cached GitHub attachments lack structured PR truth', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        title: 'Cached pre-attach issue context',
        attachments: [buildGitHubAttachment('attachment-pr-560', 560)],
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [],
          unknown: []
        }
      }),
      {
        recordedAt: new Date(Date.now() - 45_000).toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          identifier: 'CO-220',
          title: 'Live post-attach issue context',
          attachments: {
            nodes: [buildGitHubAttachment('attachment-pr-560', 560)]
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '4',
          'x-ratelimit-requests-reset': resetAt
        }
      )
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl,
      resolvePullRequestSnapshot: async () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-19T18:31:00.000Z'
      })
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-220',
        title: 'Live post-attach issue context',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-560'
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
    expect(result).not.toHaveProperty('cache_fallback_used');
  });

  it('bypasses stale read-only cache reuse when cached structured current PR truth conflicts with a live Rework reset', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);
    const cachedAttachment = {
      id: 'attachment-pr-357',
      title: 'PR 357',
      url: 'https://github.com/asabeko/CO/pull/357',
      source_type: 'github'
    };

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        state: {
          id: 'state-merging',
          name: 'Merging',
          type: 'started'
        },
        attachments: [],
        pull_request_attachments: {
          current: cachedAttachment,
          historical: [],
          conflicting: [],
          unknown: []
        }
      }),
      {
        recordedAt: new Date(Date.now() - 45_000).toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          identifier: 'CO-220',
          title: 'Reset Rework truth',
          updatedAt: '2026-04-17T13:12:00.000Z',
          state: {
            id: 'state-rework',
            name: 'Rework',
            type: 'started'
          },
          attachments: {
            nodes: []
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '4',
          'x-ratelimit-requests-reset': resetAt
        }
      )
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-220',
        title: 'Reset Rework truth',
        state: {
          id: 'state-rework',
          name: 'Rework',
          type: 'started'
        },
        attachments: [],
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
    expect(result).not.toHaveProperty('cache_fallback_used');
  });

  it('preserves legacy cached GitHub attachments as unknown PR truth during cache fallback', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        attachments: [buildGitHubAttachment('attachment-pr-509', 509)]
      }),
      {
        recordedAt: new Date(Date.now() - 45_000).toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('shared cooldown should fall back before live fetch');
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fallbackToCacheOnFailure: true,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      cache_fallback_used: true,
      issue: {
        attachments: [{ id: 'attachment-pr-509' }],
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [],
          unknown: [{ id: 'attachment-pr-509' }]
        }
      }
    });
  });

  it('preserves cached PR classification on partial reads that skip attachment hydration', async () => {
    const env = await createBudgetedRunScopedEnv();
    const cachedAttachment = {
      id: 'attachment-pr-510',
      title: 'PR 510',
      url: 'https://github.com/asabeko/CO/pull/510',
      source_type: 'github'
    };
    const recordedAt = '2026-03-22T10:00:00.000Z';

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        comments: [],
        workpad_comment: null,
        attachments: [cachedAttachment],
        pull_request_attachments: {
          current: cachedAttachment,
          historical: [],
          conflicting: [],
          unknown: []
        }
      }),
      {
        recordedAt
      }
    );

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string } };
      expect(body.variables?.issueId).toBe('lin-issue-1');
      expect(body.query).not.toContain('attachments(first: 20)');
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: []
          },
          attachments: undefined
        })
      );
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env,
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'delete-workpad',
      action: 'noop'
    });

    const auditPath = env.CODEX_PROVIDER_LINEAR_AUDIT_PATH;
    expect(auditPath).toBeTruthy();
    const cachedRecord = JSON.parse(
      await readFile(resolveIssueContextCachePathForTest(env), 'utf8')
    ) as {
      recorded_at: string;
      issue: {
        attachments: Array<{ id: string }>;
        pull_request_attachments: {
          current: { id: string } | null;
        };
      };
    };

    expect(cachedRecord.issue.attachments).toMatchObject([{ id: 'attachment-pr-510' }]);
    expect(cachedRecord.issue.pull_request_attachments.current).toMatchObject({
      id: 'attachment-pr-510'
    });
    expect(cachedRecord.recorded_at).toBe(recordedAt);
  });

  it.each([
    {
      label: 'completed-state historical-only PR truth',
      state: { id: 'state-done', name: 'Done', type: 'completed' as const },
      fetchTitle: null,
      cacheFallbackUsed: true
    },
    {
      label: 'Merging historical-only PR truth',
      state: { id: 'state-merging', name: 'Merging', type: 'started' as const },
      fetchTitle: 'Live merge issue context',
      cacheFallbackUsed: false
    }
  ])('handles degraded-headroom cache with cached $label', async ({ state, fetchTitle, cacheFallbackUsed }) => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);
    const cachedAttachment = {
      id: 'attachment-pr-510',
      title: 'PR 510',
      url: 'https://github.com/asabeko/CO/pull/510',
      source_type: 'github'
    };

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        state,
        attachments: [cachedAttachment],
        pull_request_attachments: {
          current: null,
          historical: [cachedAttachment],
          conflicting: [],
          unknown: []
        }
      }),
      {
        recordedAt: new Date(Date.now() - 45_000).toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          identifier: fetchTitle ? 'CO-220' : 'CO-1',
          title: fetchTitle ?? 'Cached issue context',
          state: fetchTitle ? state : undefined
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '4',
          'x-ratelimit-requests-reset': resetAt
        }
      )
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(cacheFallbackUsed ? 0 : 1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: cacheFallbackUsed ? 'CO-1' : 'CO-220',
        state: {
          name: state.name,
          type: state.type
        }
      }
    });
    if (cacheFallbackUsed) {
      expect(result).toHaveProperty('cache_fallback_used', true);
    } else {
      expect(result).not.toHaveProperty('cache_fallback_used');
    }
  });

  it('keeps degraded-headroom cache reuse opt-in so mutation-adjacent callers still live-read', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token',
      CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(codexHome, 'provider-linear-worker-linear-audit.jsonl')
    };
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        title: 'Cached issue context'
      }),
      {
        recordedAt: new Date(Date.now() - 45_000).toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          title: 'Live issue context'
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '4',
          'x-ratelimit-requests-reset': resetAt
        }
      )
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        title: 'Live issue context'
      }
    });
    expect(result).not.toHaveProperty('cache_fallback_used');
  });

  it('prefers a live issue-context read when request headroom is healthy', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token',
      CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(codexHome, 'provider-linear-worker-linear-audit.jsonl')
    };
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        title: 'Cached issue context'
      }),
      {
        recordedAt: new Date().toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '90',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          title: 'Live issue context'
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '89',
          'x-ratelimit-requests-reset': resetAt
        }
      )
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        title: 'Live issue context'
      }
    });
  });

  it('projects live issue-context labels and persists them into the scoped cache', async () => {
    const env = await createBudgetedRunScopedEnv();
    const graphqlQueries: string[] = [];
    const resetAt = String(Date.now() + 60_000);
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      graphqlQueries.push(body.query ?? '');
      return jsonResponse(
        buildIssueContextBody({
          labels: {
            nodes: ISSUE_LABEL_NODES,
            pageInfo: {
              hasNextPage: false,
              endCursor: null
            }
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '89',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(graphqlQueries[0]).toMatch(/labels\s*(?:\([^)]*\))?\s*\{/u);
    expect(graphqlQueries[0]).toContain('color');
    expect(graphqlQueries[0]).toContain('hasNextPage');
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-1',
        labels: ISSUE_LABEL_NODES
      }
    });

    const cachedRecord = JSON.parse(
      await readFile(resolveIssueContextCachePathForTest(env), 'utf8')
    ) as {
      issue: {
        labels?: unknown;
      };
    };
    expect(cachedRecord.issue.labels).toEqual(ISSUE_LABEL_NODES);
  });

  it('fails closed when live issue-context labels are omitted, malformed, or paginated', async () => {
    const env = await createBudgetedRunScopedEnv();
    const cases: Array<{
      label: string;
      labels: unknown;
    }> = [
      {
        label: 'omitted labels',
        labels: undefined
      },
      {
        label: 'malformed label node',
        labels: {
          nodes: [
            {
              id: 'label-bug',
              color: '#d73a49'
            }
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null
          }
        }
      },
      {
        label: 'paginated labels',
        labels: {
          nodes: ISSUE_LABEL_NODES,
          pageInfo: {
            hasNextPage: true,
            endCursor: 'cursor-labels'
          }
        }
      }
    ];

    for (const testCase of cases) {
      const fetchImpl: typeof fetch = vi.fn(async () =>
        jsonResponse(
          buildIssueContextBody({
            labels: testCase.labels
          })
        )
      );

      const result = await getProviderLinearIssueContext({
        issueId: 'lin-issue-1',
        env,
        fetchImpl
      });

      expect(fetchImpl, testCase.label).toHaveBeenCalledTimes(1);
      expect(result, testCase.label).toMatchObject({
        ok: false,
        operation: 'issue-context',
        error: {
          code: 'linear_response_invalid'
        }
      });
    }
  });

  it('does not reuse the issue-context cache when only complexity headroom is degraded', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token',
      CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(codexHome, 'provider-linear-worker-linear-audit.jsonl')
    };
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        title: 'Cached issue context'
      }),
      {
        recordedAt: new Date().toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '90',
        'x-ratelimit-requests-reset': resetAt,
        'x-ratelimit-complexity-limit': '100',
        'x-ratelimit-complexity-remaining': '5',
        'x-ratelimit-complexity-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          title: 'Live issue context'
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '89',
          'x-ratelimit-requests-reset': resetAt,
          'x-ratelimit-complexity-limit': '100',
          'x-ratelimit-complexity-remaining': '4',
          'x-ratelimit-complexity-reset': resetAt
        }
      )
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      allowReadOnlyCacheReuse: true,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        title: 'Live issue context'
      }
    });
  });

  it('falls back to cached issue context when shared cooldown is active and fallback is explicitly allowed', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        state: {
          id: 'state-merging',
          name: 'Merging',
          type: 'started'
        }
      })
    );
    const fetchImpl: typeof fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          errors: [
            {
              message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
              path: ['issue'],
              extensions: {
                code: 'RATELIMITED',
                statusCode: 429
              }
            }
          ]
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'retry-after': '3600',
            'x-ratelimit-requests-limit': '5000',
            'x-ratelimit-requests-remaining': '0',
            'x-ratelimit-requests-reset': '1774701380970',
            'x-request-id': 'req-fallback-1'
          }
        }
      )
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl,
      fallbackToCacheOnFailure: true
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      cache_fallback_used: true,
      issue: {
        id: 'lin-issue-1',
        state: {
          name: 'Merging',
          type: 'started'
        }
      }
    });
  });

  it('does not fall back to cached issue context when the live issue lookup fails for a non-cooldown reason', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        state: {
          id: 'state-merging',
          name: 'Merging',
          type: 'started'
        }
      })
    );
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        data: {
          viewer: {
            organization: {
              id: 'lin-workspace-1'
            }
          },
          issue: null
        }
      })
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl,
      fallbackToCacheOnFailure: true
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'issue-context',
      error: {
        code: 'linear_issue_not_found'
      }
    });
  });

  it('returns issue context with comments, team states, attachments, and resolved workpad comment', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string } };
      expect(body.query).toContain('comments(first: 50, after: $commentsAfter)');
      expect(body.query).toContain('states(first: 50)');
      expect(body.query).toContain('attachments(first: 20)');
      expect(body.variables?.issueId).toBe('lin-issue-1');
      return jsonResponse(buildIssueContextBody());
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-1',
        team: {
          key: 'CO',
          states: [
            { id: 'state-backlog', name: 'Backlog', type: 'unstarted' },
            { id: 'state-in-progress', name: 'In Progress', type: 'started' },
            { id: 'state-human-review', name: 'Human Review', type: 'started' },
            { id: 'state-done', name: 'Done', type: 'completed' }
          ]
        },
        workpad_comment: {
          id: 'comment-workpad',
          body: '## Codex Workpad\n\nOld plan'
        },
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('classifies a closed stale PR attachment as historical when the live issue has reset to Rework', async () => {
    const { result, resolvePullRequestSnapshot } = await readIssueContextAttachmentTruth({
      title: 'Reset Rework truth',
      state: {
        id: 'state-rework',
        name: 'Rework',
        type: 'started'
      },
      attachments: [buildGitHubAttachment('attachment-pr-509', 509)],
      snapshotForPr: () => ({
        state: 'CLOSED',
        mergedAt: null,
        updatedAt: '2026-04-17T13:10:30.000Z'
      })
    });

    expect(resolvePullRequestSnapshot).toHaveBeenCalledWith({
      owner: 'asabeko',
      repo: 'CO',
      prNumber: 509,
      readinessMode: 'merge'
    });
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-220',
        state: {
          name: 'Rework',
          type: 'started'
        },
        pull_request_attachments: {
          current: null,
          historical: [
            {
              id: 'attachment-pr-509'
            }
          ],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('uses a lightweight PR metadata resolver for issue-context attachment snapshots', async () => {
    const ghCalls: string[][] = [];
    const snapshot = await fetchIssueContextPullRequestSnapshot(
      {
        owner: 'asabeko',
        repo: 'CO',
        prNumber: 509,
        readinessMode: 'merge'
      },
      {
        runGitHubJson: async (args) => {
          ghCalls.push(args);
          return {
            state: 'CLOSED',
            mergedAt: null,
            updatedAt: '2026-04-17T13:10:30.000Z'
          };
        }
      }
    );

    expect(ghCalls).toEqual([
      ['pr', 'view', '509', '--repo', 'asabeko/CO', '--json', 'state,mergedAt,updatedAt,title,headRefName']
    ]);
    expect(snapshot).toEqual({
      state: 'CLOSED',
      mergedAt: null,
      updatedAt: '2026-04-17T13:10:30.000Z',
      title: null,
      headRefName: null
    });
  });

  it('keeps an unrelated active PR from becoming current on a completed issue', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with misbound current PR',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-575', 575, 'CO-289 preserve provider worker rehydration provenance')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'CO-289 preserve provider worker rehydration provenance',
              headRefName: 'linear/co-289-provider-rehydration-provenance-main'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        state: {
          name: 'Done',
          type: 'completed'
        },
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-575'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('treats mixed inspected and foreign issue identifiers as conflicting ownership evidence', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with customized misbound attachment title',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-575', 575, 'CO-244 attachment label for CO-289 PR')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'CO-289 preserve provider worker rehydration provenance',
              headRefName: 'linear/co-289-provider-rehydration-provenance-main'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-575'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('treats foreign-prefix issue identifiers as conflicting ownership evidence', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with foreign-prefix misbound attachment',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-580', 580, 'feat: ABC-123 active provider PR')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'feat: ABC-123 active provider PR',
              headRefName: 'feature/active-provider-pr'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-580'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it.each([
    {
      attachmentId: 'attachment-pr-594',
      prNumber: 594,
      prTitle: 'Backport ABC-123 for release'
    },
    {
      attachmentId: 'attachment-pr-595',
      prNumber: 595,
      prTitle: 'fix: ABC-123 backport for CO-244'
    }
  ])(
    'treats explicit foreign issue keys as conflicting even without branch-owner evidence',
    async ({ attachmentId, prNumber, prTitle }) => {
      const { result } = await readIssueContextAttachmentTruth({
        identifier: 'CO-244',
        title: 'Active issue with explicit foreign issue-key title',
        state: {
          id: 'state-in-progress',
          name: 'In Progress',
          type: 'started'
        },
        attachments: [buildGitHubAttachment(attachmentId, prNumber, prTitle)],
        snapshotForPr: () => ({
          state: 'OPEN',
          mergedAt: null,
          updatedAt: '2026-04-21T09:07:51.000Z',
          title: prTitle,
          headRefName: 'feature/runtime-provider-truth'
        })
      });

      expect(result).toMatchObject({
        ok: true,
        operation: 'issue-context',
        issue: {
          identifier: 'CO-244',
          pull_request_attachments: {
            current: null,
            historical: [],
            conflicting: [
              {
                id: attachmentId
              }
            ],
            unknown: []
          }
        }
      });
    }
  );

  it('treats lowercase branch-only issue identifiers as conflicting ownership evidence', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with generic-titled misbound branch',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-582', 582, 'Preserve provider rehydration provenance')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Preserve provider rehydration provenance',
              headRefName: 'linear/co-289-provider-rehydration-provenance-main'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-582'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('keeps issue-owned technical-looking prefixes as conflicting ownership evidence', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with technical-prefix misbound branch',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-583', 583, 'chore: NODE-123 active runtime PR')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'chore: NODE-123 active runtime PR',
              headRefName: 'feature/active-runtime-pr'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-583'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('does not blacklist slash-position evidence for the inspected issue team prefix', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'NODE-244',
      title: 'Completed issue with technical-looking team key',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'NODE-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-584', 584, 'Preserve runtime provider truth')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'NODE-244 completed provider release',
              headRefName: 'linear/node-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Preserve runtime provider truth',
              headRefName: 'linear/node-289-provider-runtime-truth'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'NODE-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-584'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('ignores non-owner technical-token suffixes for the inspected issue team prefix', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'NODE-244',
      title: 'Active issue with technical-looking team key and runtime suffix',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-586', 586, 'fix: Node-20 provider upgrade for NODE-244')
      ],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'fix: Node-20 provider upgrade for NODE-244',
        headRefName: 'linear/node-244-node-20-provider-upgrade'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'NODE-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-586'
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('keeps low-number foreign branch evidence conflicting for technical-looking issue team keys', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'NODE-244',
      title: 'Completed issue with low-number foreign branch evidence',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'NODE-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-590', 590, 'Preserve runtime provider truth')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'NODE-244 completed provider release',
              headRefName: 'linear/node-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Preserve runtime provider truth',
              headRefName: 'linear/node-20-runtime-fix'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'NODE-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-590'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('keeps conventional-commit title-prefix low-number foreign NODE keys conflicting without owned evidence', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'NODE-244',
      title: 'Completed issue with title-prefix foreign NODE PR',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [buildGitHubAttachment('attachment-pr-600', 600, 'fix: NODE-20 runtime upgrade')],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'fix: NODE-20 runtime upgrade',
        headRefName: 'feature/runtime-upgrade'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'NODE-244',
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-600'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('keeps bare-leading low-number NODE titles unknown without owned evidence', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'NODE-244',
      title: 'Completed issue with bare-leading low-number NODE PR',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [buildGitHubAttachment('attachment-pr-606', 606, 'NODE-20 runtime upgrade')],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'NODE-20 runtime upgrade',
        headRefName: 'feature/runtime-upgrade'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'NODE-244',
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [],
          unknown: [
            {
              id: 'attachment-pr-606'
            }
          ]
        }
      }
    });
  });

  it('ignores low-number NODE title prefixes when another issue key owns the PR', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with low-number NODE title prefix and owned issue key',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-601', 601, 'fix: NODE-20 provider upgrade for CO-244'),
        buildGitHubAttachment('attachment-pr-603', 603, 'provider runtime cleanup')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 601
          ? {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'fix: NODE-20 provider upgrade for CO-244',
              headRefName: 'feature/runtime-upgrade'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:08:51.000Z',
              title: 'provider runtime cleanup',
              headRefName: 'feature/provider-runtime-cleanup'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-601'
          },
          historical: [],
          conflicting: [],
          unknown: [
            {
              id: 'attachment-pr-603'
            }
          ]
        }
      }
    });
  });

  it('keeps bracketed low-number NODE version labels on the conservative path', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'NODE-244',
      title: 'Active issue with bracketed low-number NODE version label',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-602', 602, 'runtime upgrade (NODE-20)'),
        buildGitHubAttachment('attachment-pr-604', 604, 'NODE-244 runtime reconciliation')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 602
          ? {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'runtime upgrade (NODE-20)',
              headRefName: 'feature/runtime-upgrade'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:08:51.000Z',
              title: 'NODE-244 runtime reconciliation',
              headRefName: 'linear/node-244-runtime-reconciliation'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'NODE-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-604'
          },
          historical: [],
          conflicting: [],
          unknown: [
            {
              id: 'attachment-pr-602'
            }
          ]
        }
      }
    });
  });

  it('keeps linear branch namespace evidence for foreign technical-looking team prefixes', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with foreign technical-looking branch',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-585', 585, 'Preserve runtime provider truth')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Preserve runtime provider truth',
              headRefName: 'linear/node-289-provider-runtime-truth'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-585'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('keeps low-number foreign branch evidence conflicting for non-technical issue prefixes', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with low-number foreign technical branch evidence',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-596', 596, 'Preserve runtime provider truth')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Preserve runtime provider truth',
              headRefName: 'linear/node-20-runtime-fix'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-532'
          },
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-596'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('recognizes technical-looking issue keys on non-linear owner branches', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'NODE-244',
      title: 'Completed technical-looking issue with feature-branch owner evidence',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-592', 592, 'Provider runtime closeout'),
        buildGitHubAttachment('attachment-pr-593', 593, 'Preserve runtime provider truth')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 592
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'Provider runtime closeout',
              headRefName: 'feature/node-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Preserve runtime provider truth',
              headRefName: 'feature/runtime-provider-truth'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'NODE-244',
        pull_request_attachments: {
          current: null,
          historical: [
            {
              id: 'attachment-pr-592'
            }
          ],
          conflicting: [],
          unknown: [
            {
              id: 'attachment-pr-593'
            }
          ]
        }
      }
    });
  });

  it('ignores leading technical-token titles when the inspected issue is also evidenced', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with leading technical-token PR title',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment(
          'attachment-pr-587',
          587,
          'fix: HTTP-404 handling and GPT-5 support for CO-244'
        )
      ],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'fix: HTTP-404 handling and GPT-5 support for CO-244',
        headRefName: 'linear/co-244-http-404-gpt-5-support'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-587'
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('treats title-prefix technical terms as ambiguous when the inspected issue is also evidenced', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with SHA/UTF technical-token PR title',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment(
          'attachment-pr-591',
          591,
          'fix: SHA-256 checksum and UTF-8 normalization for CO-244'
        )
      ],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'fix: SHA-256 checksum and UTF-8 normalization for CO-244',
        headRefName: 'feature/runtime-truth'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-591'
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('keeps generic SHA/UTF titles on the conservative path when no issue key is present', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with generic SHA/UTF PR title',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment(
          'attachment-pr-597',
          597,
          'fix: SHA-256 checksum support and UTF-8 normalization'
        )
      ],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'fix: SHA-256 checksum support and UTF-8 normalization',
        headRefName: 'feature/runtime-provider-truth'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-597'
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it.each([
    {
      attachmentId: 'attachment-pr-598',
      prNumber: 598,
      prTitle: 'SHA-256 checksum support',
      headRefName: 'feature/checksum-support'
    },
    {
      attachmentId: 'attachment-pr-599',
      prNumber: 599,
      prTitle: '[UTF-8] normalization',
      headRefName: 'feature/text-normalization'
    }
  ])(
    'keeps leading technical tokens on the conservative path without an issue key',
    async ({ attachmentId, prNumber, prTitle, headRefName }) => {
      const { result } = await readIssueContextAttachmentTruth({
        identifier: 'CO-244',
        title: 'Active issue with leading technical-token PR title',
        state: {
          id: 'state-in-progress',
          name: 'In Progress',
          type: 'started'
        },
        attachments: [buildGitHubAttachment(attachmentId, prNumber, prTitle)],
        snapshotForPr: () => ({
          state: 'OPEN',
          mergedAt: null,
          updatedAt: '2026-04-21T09:07:51.000Z',
          title: prTitle,
          headRefName
        })
      });

      expect(result).toMatchObject({
        ok: true,
        operation: 'issue-context',
        issue: {
          identifier: 'CO-244',
          pull_request_attachments: {
            current: {
              id: attachmentId
            },
            historical: [],
            conflicting: [],
            unknown: []
          }
        }
      });
    }
  );

  it('does not treat common technical hyphen codes as foreign issue ownership evidence', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with technical-token PR title',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment(
          'attachment-pr-581',
          581,
          'feat: CO-244 support ISO-8601 GPT-5 RFC-3339 HTTP-404 Node-20 TLS-1.3 parsing'
        )
      ],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'feat: CO-244 support ISO-8601 GPT-5 RFC-3339 HTTP-404 Node-20 TLS-1.3 parsing',
        headRefName: 'feature/node-20-http-404-upgrade'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-581'
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('keeps a single active PR current when only technical hyphen tokens are present', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with technical-token-only PR title',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment(
          'attachment-pr-588',
          588,
          'fix: HTTP-404 handling and Node-20 upgrade'
        )
      ],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'fix: HTTP-404 handling and Node-20 upgrade',
        headRefName: 'feature/http-404-node-20-upgrade'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-588'
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('does not let terminal owned history or generic active PRs claim current on completed issues', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with generic active PR',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-589', 589, 'Refactor provider rehydration')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Refactor provider rehydration',
              headRefName: 'feature/refactor-provider-rehydration'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: null,
          historical: [
            {
              id: 'attachment-pr-532'
            }
          ],
          conflicting: [],
          unknown: [
            {
              id: 'attachment-pr-589'
            }
          ]
        }
      }
    });
  });

  it('keeps a single generic active PR current on merging issues even when owned history exists', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Merging issue with owned history and generic active PR',
      state: {
        id: 'state-merging',
        name: 'Merging',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-589', 589, 'Refactor provider rehydration')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Refactor provider rehydration',
              headRefName: 'feature/refactor-provider-rehydration'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-589'
          },
          historical: [
            {
              id: 'attachment-pr-532'
            }
          ],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('keeps a single generic active PR current on active issues even when owned history exists', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with owned history and one generic live PR',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 closeout PR'),
        buildGitHubAttachment('attachment-pr-589', 589, 'Refactor provider rehydration')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-10T13:11:30.000Z',
              updatedAt: '2026-04-10T13:11:30.000Z',
              title: 'CO-244 completed provider release',
              headRefName: 'linear/co-244-completed-provider-release'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Refactor provider rehydration',
              headRefName: 'feature/refactor-provider-rehydration'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-589'
          },
          historical: [
            {
              id: 'attachment-pr-532'
            }
          ],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('preserves ambiguity when foreign and generic active PRs coexist without owned evidence', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with foreign and generic live PRs',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-590', 590, 'Refactor provider rehydration'),
        buildGitHubAttachment('attachment-pr-591', 591, 'ABC-123 foreign provider lane')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 590
          ? {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Refactor provider rehydration',
              headRefName: 'feature/refactor-provider-rehydration'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:08:11.000Z',
              title: 'ABC-123 foreign provider lane',
              headRefName: 'linear/abc-123-foreign-provider-lane'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-590'
            },
            {
              id: 'attachment-pr-591'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it.each([
    {
      label: 'completed',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      }
    },
    {
      label: 'merging',
      state: {
        id: 'state-merging',
        name: 'Merging',
        type: 'started'
      }
    }
  ])('preserves ambiguity for $label issues when foreign and generic active PRs coexist', async ({ state }) => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Issue with foreign and generic live PRs',
      state,
      attachments: [
        buildGitHubAttachment('attachment-pr-592', 592, 'Refactor provider rehydration'),
        buildGitHubAttachment('attachment-pr-593', 593, 'ABC-123 foreign provider lane')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 592
          ? {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Refactor provider rehydration',
              headRefName: 'feature/refactor-provider-rehydration'
            }
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:08:11.000Z',
              title: 'ABC-123 foreign provider lane',
              headRefName: 'linear/abc-123-foreign-provider-lane'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-592'
            },
            {
              id: 'attachment-pr-593'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('preserves the owning issue current PR when the PR identifier matches', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-289',
      title: 'Provider worker rehydration should preserve provenance',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-575', 575, 'CO-289 preserve provider worker rehydration provenance')
      ],
      snapshotForPr: () => ({
        state: 'OPEN',
        mergedAt: null,
        updatedAt: '2026-04-21T09:07:51.000Z',
        title: 'CO-289 preserve provider worker rehydration provenance',
        headRefName: 'linear/co-289-provider-rehydration-provenance-main'
      })
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-289',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-575'
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('preserves attachment-title ownership conflicts when PR snapshots cannot be hydrated', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Snapshot unavailable for foreign-title attachment',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [buildGitHubAttachment('attachment-pr-580', 580, 'ABC-123 active provider PR')],
      snapshotForPr: () => ({})
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-580'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('preserves ambiguity when a foreign title fails hydration beside a generic active PR', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with generic PR and unhydrated foreign title',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-580', 580, 'ABC-123 active provider PR'),
        buildGitHubAttachment('attachment-pr-581', 581, 'Provider stabilization')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 580
          ? {}
          : {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'Provider stabilization',
              headRefName: 'provider-stabilization'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-581'
            },
            {
              id: 'attachment-pr-580'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('preserves ambiguity when only terminal foreign evidence conflicts with a generic terminal PR', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with generic merged PR and foreign merged PR',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-580', 580, 'ABC-123 foreign merged provider PR'),
        buildGitHubAttachment('attachment-pr-581', 581, 'Provider stabilization')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 580
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-21T09:07:51.000Z',
              updatedAt: '2026-04-21T09:07:51.000Z',
              title: 'ABC-123 foreign merged provider PR',
              headRefName: 'linear/abc-123-foreign-provider-pr'
            }
          : {
              state: 'MERGED',
              mergedAt: '2026-04-21T09:08:51.000Z',
              updatedAt: '2026-04-21T09:08:51.000Z',
              title: 'Provider stabilization',
              headRefName: 'provider-stabilization'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [
            {
              id: 'attachment-pr-580'
            }
          ],
          unknown: [
            {
              id: 'attachment-pr-581'
            }
          ]
        }
      }
    });
  });

  it('does not duplicate a selected generic merged PR in unknown when owned history exists', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Completed issue with owned historical PR and generic merged PR',
      state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 previous provider fix'),
        buildGitHubAttachment('attachment-pr-581', 581, 'Provider stabilization')
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 532
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-20T09:07:51.000Z',
              updatedAt: '2026-04-20T09:07:51.000Z',
              title: 'CO-244 previous provider fix',
              headRefName: 'linear/co-244-previous-provider-fix'
            }
          : {
              state: 'MERGED',
              mergedAt: '2026-04-21T09:08:51.000Z',
              updatedAt: '2026-04-21T09:08:51.000Z',
              title: 'Provider stabilization',
              headRefName: 'provider-stabilization'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-581'
          },
          historical: [
            {
              id: 'attachment-pr-532'
            }
          ],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('does not duplicate selected generic active PRs in unknown when owned history exists', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      identifier: 'CO-244',
      title: 'Active issue with owned historical PR and two generic active PRs',
      state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-532', 532, 'CO-244 previous provider fix'),
        buildGitHubAttachment('attachment-pr-581', 581, 'Provider stabilization'),
        buildGitHubAttachment('attachment-pr-582', 582, 'Provider cleanup')
      ],
      snapshotForPr: (prNumber) => {
        if (prNumber === 532) {
          return {
            state: 'MERGED',
            mergedAt: '2026-04-20T09:07:51.000Z',
            updatedAt: '2026-04-20T09:07:51.000Z',
            title: 'CO-244 previous provider fix',
            headRefName: 'linear/co-244-previous-provider-fix'
          };
        }
        if (prNumber === 581) {
          return {
            state: 'OPEN',
            mergedAt: null,
            updatedAt: '2026-04-21T09:08:51.000Z',
            title: 'Provider stabilization',
            headRefName: 'provider-stabilization'
          };
        }
        return {
          state: 'OPEN',
          mergedAt: null,
          updatedAt: '2026-04-21T09:09:51.000Z',
          title: 'Provider cleanup',
          headRefName: 'provider-cleanup'
        };
      }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-244',
        pull_request_attachments: {
          current: null,
          historical: [
            {
              id: 'attachment-pr-532'
            }
          ],
          conflicting: [
            {
              id: 'attachment-pr-581'
            },
            {
              id: 'attachment-pr-582'
            }
          ],
          unknown: []
        }
      }
    });
  });

  it('classifies unrecognized PR snapshot payloads as unknown attachments', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      title: 'Unknown PR snapshot',
      state: { id: 'state-human-review', name: 'Human Review', type: 'started' },
      attachments: [buildGitHubAttachment('attachment-pr-511', 511)],
      snapshotForPr: () => ({}) as { state: string; mergedAt: string | null; updatedAt: string }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        pull_request_attachments: {
          current: null,
          historical: [],
          conflicting: [],
          unknown: [{ id: 'attachment-pr-511' }]
        }
      }
    });
  });

  it('keeps a single active merge-state PR current even when a retired PR closed later', async () => {
    const { result } = await readIssueContextAttachmentTruth({
      title: 'Active merge-state PR truth with retired PR history',
      state: {
        id: 'state-merging',
        name: 'Merging',
        type: 'started'
      },
      attachments: [
        buildGitHubAttachment('attachment-pr-360', 360),
        buildGitHubAttachment('attachment-pr-372', 372)
      ],
      snapshotForPr: (prNumber) =>
        prNumber === 360
          ? {
              state: 'OPEN',
              mergedAt: null,
              updatedAt: '2026-04-17T13:11:30.000Z'
            }
          : {
              state: 'MERGED',
              mergedAt: '2026-04-17T13:11:30.000Z',
              updatedAt: '2026-04-17T13:11:30.000Z'
            }
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-220',
        state: {
          name: 'Merging',
          type: 'started'
        },
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-360'
          },
          historical: [
            {
              id: 'attachment-pr-372'
            }
          ],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('hydrates issue-context PR attachment snapshots with bounded concurrency', async () => {
    const startedPrs: number[] = [];
    const deferredByPr = new Map<number, Deferred<IssueContextTestPullRequestSnapshot>>();
    let inFlight = 0;
    let maxInFlight = 0;
    const buildSnapshot = (prNumber: number) => ({
      state: 'MERGED',
      mergedAt: `2026-04-17T13:${String(prNumber - 500).padStart(2, '0')}:00.000Z`,
      updatedAt: `2026-04-17T13:${String(prNumber - 500).padStart(2, '0')}:00.000Z`
    });

    const issueContextPromise = readIssueContextAttachmentTruth({
      title: 'Many attached PR snapshots',
      state: {
        id: 'state-human-review',
        name: 'Human Review',
        type: 'started'
      },
      attachments: [501, 502, 503, 504, 505, 506].map((prNumber) =>
        buildGitHubAttachment(`attachment-pr-${prNumber}`, prNumber)
      ),
      snapshotForPr: async (prNumber) => {
        startedPrs.push(prNumber);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const deferred = createDeferred<IssueContextTestPullRequestSnapshot>();
        deferredByPr.set(prNumber, deferred);
        try {
          return await deferred.promise;
        } finally {
          inFlight -= 1;
        }
      }
    });

    await vi.waitFor(() => expect(startedPrs).toEqual([501, 502, 503, 504]));
    expect(maxInFlight).toBe(4);
    expect(deferredByPr.has(505)).toBe(false);

    deferredByPr.get(501)!.resolve(buildSnapshot(501));
    await vi.waitFor(() => expect(startedPrs).toEqual([501, 502, 503, 504, 505]));
    expect(maxInFlight).toBe(4);
    expect(deferredByPr.has(506)).toBe(false);

    deferredByPr.get(502)!.resolve(buildSnapshot(502));
    await vi.waitFor(() => expect(startedPrs).toEqual([501, 502, 503, 504, 505, 506]));
    expect(maxInFlight).toBe(4);

    for (const prNumber of [503, 504, 505, 506]) {
      deferredByPr.get(prNumber)!.resolve(buildSnapshot(prNumber));
    }

    const { result, resolvePullRequestSnapshot } = await issueContextPromise;
    expect(resolvePullRequestSnapshot).toHaveBeenCalledTimes(6);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-506'
          },
          historical: [
            { id: 'attachment-pr-501' },
            { id: 'attachment-pr-502' },
            { id: 'attachment-pr-503' },
            { id: 'attachment-pr-504' },
            { id: 'attachment-pr-505' }
          ],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('keeps failed and unrecognized bounded hydration results isolated as unknown', async () => {
    const { result, resolvePullRequestSnapshot } = await readIssueContextAttachmentTruth({
      title: 'Mixed bounded hydration outcomes',
      state: { id: 'state-human-review', name: 'Human Review', type: 'started' },
      attachments: [
        buildGitHubAttachment('attachment-pr-512', 512),
        buildGitHubAttachment('attachment-pr-513', 513),
        buildGitHubAttachment('attachment-pr-514', 514),
        buildGitHubAttachment('attachment-pr-515', 515)
      ],
      snapshotForPr: (prNumber) => {
        if (prNumber === 513) {
          throw new Error('snapshot lookup failed');
        }
        if (prNumber === 514) {
          return {};
        }
        return prNumber === 512
          ? {
              state: 'MERGED',
              mergedAt: '2026-04-17T13:12:00.000Z',
              updatedAt: '2026-04-17T13:12:00.000Z'
            }
          : {
              state: 'MERGED',
              mergedAt: '2026-04-17T13:15:00.000Z',
              updatedAt: '2026-04-17T13:15:00.000Z'
            };
      }
    });

    expect(resolvePullRequestSnapshot).toHaveBeenCalledTimes(4);
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        pull_request_attachments: {
          current: {
            id: 'attachment-pr-515'
          },
          historical: [
            {
              id: 'attachment-pr-512'
            }
          ],
          conflicting: [],
          unknown: [{ id: 'attachment-pr-513' }, { id: 'attachment-pr-514' }]
        }
      }
    });
  });

  it.each([
    {
      title: 'Merge closeout is live',
      state: { id: 'state-merging', name: 'Merging', type: 'started' as const },
      attachments: [buildGitHubAttachment('attachment-pr-510', 510)],
      expectedCurrentId: 'attachment-pr-510',
      expectedStateName: 'Merging'
    },
    {
      title: 'Review handoff still points at the merged PR',
      state: { id: 'state-human-review', name: 'Human Review', type: 'started' as const },
      attachments: [buildGitHubAttachment('attachment-pr-510', 510)],
      expectedCurrentId: 'attachment-pr-510',
      expectedStateName: 'Human Review'
    },
    {
      title: 'Duplicate attachment rows',
      state: { id: 'state-human-review', name: 'Human Review', type: 'started' as const },
      attachments: [
        buildGitHubAttachment('attachment-pr-510-a', 510, 'PR 510 A'),
        buildGitHubAttachment('attachment-pr-510-b', 510, 'PR 510 B')
      ],
      expectedCurrentId: 'attachment-pr-510-a',
      expectedStateName: 'Human Review',
      expectedSnapshotCalls: 1
    }
  ])('keeps merged attachment truth current: $title', async ({
    title,
    state,
    attachments,
    expectedCurrentId,
    expectedStateName,
    expectedSnapshotCalls
  }) => {
    const { result, resolvePullRequestSnapshot } = await readIssueContextAttachmentTruth({
      title,
      state,
      attachments,
      snapshotForPr: () => ({
        state: 'MERGED',
        mergedAt: '2026-04-17T13:11:30.000Z',
        updatedAt: '2026-04-17T13:11:30.000Z'
      })
    });

    if (expectedSnapshotCalls !== undefined) {
      expect(resolvePullRequestSnapshot).toHaveBeenCalledTimes(expectedSnapshotCalls);
    }
    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-220',
        state: {
          name: expectedStateName,
          type: 'started'
        },
        pull_request_attachments: {
          current: {
            id: expectedCurrentId
          },
          historical: [],
          conflicting: [],
          unknown: []
        }
      }
    });
  });

  it('ignores fenced marker examples when selecting the active workpad comment', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string } };
      expect(body.variables?.issueId).toBe('lin-issue-1');
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-example',
                body: ['````md', '```md', '## Codex Workpad', '### Notes', '- Example only.', '```', '````'].join(
                  '\n'
                ),
                url: 'https://linear.app/comment/example',
                createdAt: '2026-03-22T10:00:00.000Z',
                updatedAt: '2026-03-22T10:30:00.000Z',
                resolvedAt: null
              },
              {
                id: 'comment-workpad',
                body: '## Codex Workpad\n\nOld plan',
                url: 'https://linear.app/comment/workpad',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        })
      );
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        workpad_comment: {
          id: 'comment-workpad',
          body: '## Codex Workpad\n\nOld plan'
        }
      }
    });
  });

  it('ignores ordered-list-indented fenced marker examples when selecting the active workpad comment', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string } };
      expect(body.variables?.issueId).toBe('lin-issue-1');
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-example',
                body: [
                  '10. Nested example',
                  '    ```md',
                  '## Codex Workpad',
                  '### Notes',
                  '- Example only.',
                  '    ```'
                ].join('\n'),
                url: 'https://linear.app/comment/example',
                createdAt: '2026-03-22T10:00:00.000Z',
                updatedAt: '2026-03-22T10:30:00.000Z',
                resolvedAt: null
              },
              {
                id: 'comment-workpad',
                body: '## Codex Workpad\n\nOld plan',
                url: 'https://linear.app/comment/workpad',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        })
      );
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        workpad_comment: {
          id: 'comment-workpad',
          body: '## Codex Workpad\n\nOld plan'
        }
      }
    });
  });

  it.each([
    ['team', { team: null }, 'linear_team_mismatch', 'lin-team-1'],
    ['project', { project: null }, 'linear_project_mismatch', 'lin-project-1']
  ])('fails closed when the scoped %s binding is missing from the issue context', async (_scope, overrides, code, expected) => {
    const fetchImpl: typeof fetch = vi.fn(async () => jsonResponse(buildIssueContextBody(overrides)));

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      sourceSetup: scopedSourceSetup,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'issue-context',
      error: {
        code,
        status: 422,
        details: {
          expected,
          actual: null
        }
      }
    });
  });

  it('surfaces Linear rate-limit failures with explicit metadata instead of generic request failures', async () => {
    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl: vi.fn(async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
                path: ['issue'],
                extensions: {
                  code: 'RATELIMITED',
                  statusCode: 429
                }
              }
            ]
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'retry-after': '3600',
              'x-ratelimit-requests-limit': '5000',
              'x-ratelimit-requests-remaining': '0',
              'x-ratelimit-requests-reset': '1774701380970',
              'x-ratelimit-endpoint-requests-limit': '500',
              'x-ratelimit-endpoint-requests-remaining': '12',
              'x-ratelimit-endpoint-requests-reset': '1774701381970',
              'x-ratelimit-complexity-limit': '1500000',
              'x-ratelimit-complexity-remaining': '1499000',
              'x-ratelimit-complexity-reset': '1774701382970',
              'x-ratelimit-endpoint-complexity-limit': '200000',
              'x-ratelimit-endpoint-complexity-remaining': '199000',
              'x-ratelimit-endpoint-complexity-reset': '1774701383970',
              'x-request-id': 'req-1'
            }
          }
        )
      )
    });

    expect(result).toEqual({
      ok: false,
      operation: 'issue-context',
      error: {
        code: 'linear_rate_limited',
        message: 'Linear API rate limit exceeded.',
        status: 429,
        retryable: true,
        details: {
          errors: [
            {
              message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
              path: ['issue'],
              extensions: {
                code: 'RATELIMITED',
                statusCode: 429
              }
            }
          ],
          retry_after_seconds: 3600,
          requests_remaining: 0,
          requests_limit: 5000,
          requests_reset_at: '2026-03-28T12:36:20.970Z',
          endpoint_requests_remaining: 12,
          endpoint_requests_limit: 500,
          endpoint_requests_reset_at: '2026-03-28T12:36:21.970Z',
          complexity_remaining: 1499000,
          complexity_limit: 1500000,
          complexity_reset_at: '2026-03-28T12:36:22.970Z',
          endpoint_complexity_remaining: 199000,
          endpoint_complexity_limit: 200000,
          endpoint_complexity_reset_at: '2026-03-28T12:36:23.970Z',
          request_id: 'req-1'
        }
      }
    });
  });

  it('ignores an invalid rate-limit reset header instead of throwing while classifying the failure', async () => {
    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl: vi.fn(async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
                path: ['issue'],
                extensions: {
                  code: 'RATELIMITED',
                  statusCode: 429
                }
              }
            ]
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'retry-after': '3600',
              'x-ratelimit-requests-limit': '5000',
              'x-ratelimit-requests-remaining': '0',
              'x-ratelimit-requests-reset': '8640000000000001',
              'x-request-id': 'req-1'
            }
          }
        )
      )
    });

    expect(result).toEqual({
      ok: false,
      operation: 'issue-context',
      error: {
        code: 'linear_rate_limited',
        message: 'Linear API rate limit exceeded.',
        status: 429,
        retryable: true,
        details: {
          errors: [
            {
              message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
              path: ['issue'],
              extensions: {
                code: 'RATELIMITED',
                statusCode: 429
              }
            }
          ],
          retry_after_seconds: 3600,
          requests_remaining: 0,
          requests_limit: 5000,
          request_id: 'req-1'
        }
      }
    });
  });

  it('keeps a caller-supplied persisted scope authoritative instead of backfilling missing fields from env', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => jsonResponse(buildIssueContextBody()));

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: null,
        project_id: null
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CO_LINEAR_TEAM_ID: 'lin-team-from-env',
        CO_LINEAR_PROJECT_ID: 'lin-project-from-env'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: null,
        project_id: null
      }
    });
  });

  it('updates an existing workpad comment instead of creating a duplicate', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated plan.'],
      notesLines: ['- Updated existing active workpad.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad',
        url: 'https://linear.app/comment/workpad',
        body: updatedWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('creates a bootstrap workpad comment when no active workpad exists and the ticket test plan is mirrored', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Bootstrap the new workpad contract.'],
      acceptanceCriteriaLines: ['- Mirror ticket test-plan requirements into the workpad.'],
      validationLines: ['- Run npm test.', '- Run npm run lint.'],
      notesLines: ['- Fresh bootstrap workpad for this issue.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Context', 'Bootstrap the issue.', '', 'Test Plan', '- Run npm test.', '- Run npm run lint.'].join(
              '\n'
            ),
            comments: {
              nodes: [
                {
                  id: 'comment-note',
                  body: 'Unrelated note',
                  url: 'https://linear.app/comment/note',
                  createdAt: '2026-03-22T08:00:00.000Z',
                  updatedAt: '2026-03-22T08:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created',
                url: 'https://linear.app/comment/workpad-created',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created',
        url: 'https://linear.app/comment/workpad-created',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('uses a fresh cached workpad context for a direct mutation and updates the cache after success', async () => {
    const env = await createRunScopedEnv();
    await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl: vi.fn(async () => jsonResponse(buildIssueContextBody()))
    });

    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated through the cached workpad path.'],
      notesLines: ['- Fresh cached workpad state should re-read live before mutation.']
    });
    const mutationFetch: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl: mutationFetch
    });

    expect(mutationFetch).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      comment: {
        id: 'comment-workpad',
        body: updatedWorkpadBody
      }
    });

    const noopFetch: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueContext');
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-workpad',
                body: updatedWorkpadBody,
                url: 'https://linear.app/comment/workpad',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        })
      );
    });
    const noopResult = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl: noopFetch
    });

    expect(noopFetch).toHaveBeenCalledTimes(1);
    expect(noopResult).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      comment: {
        id: 'comment-workpad',
        body: updatedWorkpadBody
      }
    });
  });

  it('allows a cached workpad reread to resolve as noop when one shared request remains', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);
    const desiredWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Allow a truthful cached reread to resolve the workpad as noop.'],
      notesLines: ['- One shared request is enough when the live comment already matches the desired workpad.']
    });

    await writeCachedIssueContext(env, buildCachedIssueContext(), {
      recordedAt: new Date().toISOString()
    });
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueContext');
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-workpad',
                body: desiredWorkpadBody,
                url: 'https://linear.app/comment/workpad',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: desiredWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      comment: {
        id: 'comment-workpad',
        body: desiredWorkpadBody
      }
    });
  });

  it('fails cached workpad mutation after the reread when one shared request remains', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Retry the cached workpad mutation after the live reread.'],
      notesLines: ['- One shared request should allow the reread but still block the later mutation.']
    });

    await writeCachedIssueContext(env, buildCachedIssueContext(), {
      recordedAt: new Date().toISOString()
    });
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody(), 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      throw new Error('The cached workpad mutation should stop before the write query.');
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true
        }
      }
    });
  });

  it('treats future-dated cached workpad records as stale before mutating', async () => {
    const env = await createRunScopedEnv();
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Reject future-dated cache freshness before updating the workpad.'],
      notesLines: ['- A future recorded_at should force a live revalidation read.']
    });
    await writeCachedIssueContext(env, buildCachedIssueContext(), {
      recordedAt: new Date(Date.now() + 60_000).toISOString()
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      comment: {
        id: 'comment-workpad',
        body: updatedWorkpadBody
      }
    });
  });

  it.each([
    {
      archived_at: '2026-04-11T05:00:00.000Z',
      trashed: false,
      label: 'archived'
    },
    {
      archived_at: null,
      trashed: true,
      label: 'trashed'
    }
  ])('revalidates cached $label issues live before failing a workpad mutation', async ({ archived_at, trashed }) => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        archived_at,
        trashed,
        comments: [],
        workpad_comment: null
      })
    );
    const desiredWorkpad = buildStructuredWorkpadBody({
      planLines: ['- Do not attempt a workpad mutation against a non-mutable issue.'],
      notesLines: ['- The issue must be restored before the single workpad comment can be updated.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        expect(body.query).toContain('archivedAt');
        expect(body.query).toContain('trashed');
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: archived_at,
            trashed,
            comments: {
              nodes: []
            }
          })
        );
      }
      throw new Error('Workpad mutation must not run for a cached non-mutable issue.');
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: desiredWorkpad,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_issue_not_mutable',
        status: 409,
        details: {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-1',
          archived_at,
          trashed
        }
      }
    });
  });

  it('re-reads live issue context before mutating from a trusted cached workpad context', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        archived_at: null,
        trashed: false
      })
    );
    const desiredWorkpad = buildStructuredWorkpadBody({
      planLines: ['- Re-read live mutability before writing from cache.'],
      notesLines: ['- Fresh cache alone must not allow a write after the issue is archived.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: '2026-04-11T05:00:00.000Z',
            trashed: false,
            comments: {
              nodes: []
            }
          })
        );
      }
      throw new Error('Workpad mutation must not run after live reread reports an archived issue.');
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: desiredWorkpad,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_issue_not_mutable',
        status: 409,
        details: {
          issue_id: 'lin-issue-1',
          archived_at: '2026-04-11T05:00:00.000Z',
          trashed: false
        }
      }
    });
  });

  it('revalidates cached archived issues live before updating a restored workpad', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        archived_at: '2026-04-11T05:00:00.000Z',
        trashed: true
      })
    );
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Re-read the live issue before retrying a restored workpad update.'],
      notesLines: ['- Restored issues should resume the single active workpad mutation path.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: null,
            trashed: false
          })
        );
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      comment: {
        id: 'comment-workpad',
        body: updatedWorkpadBody
      }
    });
  });

  it('reuses the live mutability reread when a restored cached workpad already matches', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);
    const desiredWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Reuse the first live reread when the restored workpad is already correct.'],
      notesLines: ['- Do not spend a second request on the noop path after mutability revalidation.']
    });

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        archived_at: '2026-04-11T05:00:00.000Z',
        trashed: true
      }),
      {
        recordedAt: new Date().toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueContext');
      return jsonResponse(
        buildIssueContextBody({
          archivedAt: null,
          trashed: false,
          comments: {
            nodes: [
              {
                id: 'comment-workpad',
                body: desiredWorkpadBody,
                url: 'https://linear.app/comment/workpad',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: desiredWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      comment: {
        id: 'comment-workpad',
        body: desiredWorkpadBody
      }
    });
  });

  it('allows upsert-workpad to noop when the live archived issue already has the desired workpad', async () => {
    const desiredWorkpad = buildStructuredWorkpadBody({
      planLines: ['- Treat already-correct archived workpads as truthful noops.'],
      notesLines: ['- Do not require a write when the single active workpad already matches.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: '2026-04-11T05:00:00.000Z',
            trashed: true,
            comments: {
              nodes: [
                {
                  id: 'comment-workpad',
                  body: desiredWorkpad,
                  url: 'https://linear.app/comment/workpad',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T09:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: desiredWorkpad,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      comment: {
        id: 'comment-workpad',
        body: desiredWorkpad
      }
    });
  });

  it('allows upsert-workpad to noop after a truthful single read when one shared request remains', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const desiredWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Reuse the current live workpad when only one request remains.'],
      notesLines: ['- A single truthful read should still allow an idempotent noop result.']
    });
    const resetAt = String(Date.now() + 60_000);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueContext');
      expect(body.query).toContain('comments(first:');
      expect(body.query).not.toContain('attachments(first:');
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-workpad',
                body: desiredWorkpadBody,
                url: 'https://linear.app/comment/workpad',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: desiredWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad',
        body: desiredWorkpadBody
      }
    });
  });

  it('fails upsert-workpad before fetching a second comment page when the first truthful read exhausts the shared reserve', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);
    const desiredWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Stop once the first truthful comment page crosses into the shared reserve.'],
      notesLines: ['- Do not spend protected headroom on paginated follow-on reads.']
    });

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: {
          commentsAfter?: string | null;
        };
      };
      expect(body.query).toContain('ProviderLinearIssueContext');
      expect(body.variables?.commentsAfter ?? null).toBeNull();
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-note',
                body: 'Unrelated note',
                url: 'https://linear.app/comment/note',
                createdAt: '2026-03-22T08:00:00.000Z',
                updatedAt: '2026-03-22T08:30:00.000Z',
                resolvedAt: null
              }
            ],
            pageInfo: {
              hasNextPage: true,
              endCursor: 'cursor-2'
            }
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: desiredWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true
        }
      }
    });
  });

  it('revalidates cached workpad noop decisions before skipping the mutation', async () => {
    const env = await createRunScopedEnv();
    const desiredWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Keep the desired workpad body after live revalidation.'],
      notesLines: ['- Live state changed after the cache was recorded, so noop is unsafe.']
    });
    await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl: vi.fn(async () =>
        jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-workpad',
                  body: desiredWorkpadBody,
                  url: 'https://linear.app/comment/workpad',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T09:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        )
      )
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-workpad',
                  body: '## Codex Workpad\n\nLive body diverged after the cache snapshot.',
                  url: 'https://linear.app/comment/workpad',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T10:00:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: desiredWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: desiredWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: desiredWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      comment: {
        id: 'comment-workpad',
        body: desiredWorkpadBody
      }
    });
  });

  it('uses a fresh cached workpad context for a direct create mutation when no workpad exists', async () => {
    const env = await createRunScopedEnv();
    await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl: vi.fn(async () =>
        jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-note',
                  body: 'Unrelated note',
                  url: 'https://linear.app/comment/note',
                  createdAt: '2026-03-22T08:00:00.000Z',
                  updatedAt: '2026-03-22T08:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        )
      )
    });

    const createdWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Create the workpad directly from a fresh cached issue-context read.'],
      notesLines: ['- Fresh cached workpad absence should still re-read live before create.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created',
                url: 'https://linear.app/comment/workpad-created',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      comment: {
        id: 'comment-created',
        body: createdWorkpadBody
      }
    });
  });

  it('revalidates stale cached workpad selection before updating a replaced live comment', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(env, buildCachedIssueContext(), {
      recordedAt: new Date().toISOString()
    });

    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Update the currently live workpad after stale-cache revalidation.'],
      notesLines: ['- Stale cached workpad ids must not survive comment replacement in Linear.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-live',
                  body: '## Codex Workpad\n\nLive workpad replaced the cached comment.',
                  url: 'https://linear.app/comment/workpad-live',
                  createdAt: '2026-03-22T10:00:00.000Z',
                  updatedAt: '2026-03-22T10:15:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-live',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-live',
                url: 'https://linear.app/comment/workpad-live',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      comment: {
        id: 'comment-live',
        body: updatedWorkpadBody
      }
    });
  });

  it('rejects cached issue context records whose nested issue id does not match the cache key', async () => {
    const env = await createRunScopedEnv();
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Ignore inconsistent cached issue ids before mutating the workpad.'],
      notesLines: ['- Cache records must fall back to a live read when the nested issue id diverges.']
    });
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        id: 'lin-issue-2'
      })
    );

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      comment: {
        id: 'comment-workpad',
        body: updatedWorkpadBody
      }
    });
  });

  it('ignores malformed cached issue context for workpad upserts and falls back to a live read', async () => {
    const env = await createRunScopedEnv();
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Fall back to a live issue-context read when the cache is malformed.'],
      notesLines: ['- Malformed cached comments or attachments should not reach downstream workpad logic.']
    });
    await writeCachedIssueContext(env, {
      id: 'lin-issue-1',
      identifier: 'CO-1',
      title: 'Corrupted cache',
      comments: {
        invalid: true
      },
      attachments: {
        invalid: true
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      comment: {
        id: 'comment-workpad',
        body: updatedWorkpadBody
      }
    });
  });

  it('removes deleted workpad comments from the run-scoped cache before the next upsert', async () => {
    const env = await createRunScopedEnv();
    const workpadBody = buildStructuredWorkpadBody({
      planLines: ['- Recreate the deleted workpad from cached issue context.'],
      notesLines: ['- Delete should invalidate the cached workpad comment selection.']
    });
    const cachedIssueContextBody = buildIssueContextBody({
      comments: {
        nodes: [
          {
            id: 'comment-workpad',
            body: workpadBody,
            url: 'https://linear.app/comment/workpad',
            createdAt: '2026-03-22T09:00:00.000Z',
            updatedAt: '2026-03-22T09:30:00.000Z',
            resolvedAt: null
          },
          {
            id: 'comment-note',
            body: 'Unrelated note',
            url: 'https://linear.app/comment/note',
            createdAt: '2026-03-22T08:00:00.000Z',
            updatedAt: '2026-03-22T08:30:00.000Z',
            resolvedAt: null
          }
        ]
      }
    });
    await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl: vi.fn(async () => jsonResponse(cachedIssueContextBody))
    });

    const deleteFetch: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(cachedIssueContextBody);
      }
      if (body.query?.includes('ProviderLinearDeleteComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad'
        });
        return jsonResponse({
          data: {
            commentDelete: {
              success: true,
              entityId: 'comment-workpad'
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const deleteResult = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env,
      fetchImpl: deleteFetch
    });

    expect(deleteResult).toMatchObject({
      ok: true,
      operation: 'delete-workpad',
      action: 'deleted',
      comment_id: 'comment-workpad'
    });

    const recreateFetch: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: workpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-workpad-recreated',
                url: 'https://linear.app/comment/workpad-recreated',
                body: workpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const recreateResult = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: workpadBody,
      env,
      fetchImpl: recreateFetch
    });

    expect(recreateFetch).toHaveBeenCalledTimes(2);
    expect(recreateResult).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      comment: {
        id: 'comment-workpad-recreated',
        body: workpadBody
      }
    });
  });

  it('mirrors plain-text validation requirements that are not bullet-prefixed', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['Run npm test', 'Run npm run lint'],
      notesLines: ['- Plain-text validation requirements were preserved.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Context', 'Tighten validation parsing.', '', 'Validation', 'Run npm test', 'Run npm run lint'].join(
              '\n'
            ),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-plain-text',
                url: 'https://linear.app/comment/workpad-created-plain-text',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-plain-text',
        url: 'https://linear.app/comment/workpad-created-plain-text',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('normalizes checklist-prefixed validation requirements before mirroring', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.', '- Run npm run lint.'],
      notesLines: ['- Checklist-prefixed ticket requirements were normalized before validation mirroring.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Context', 'Tighten validation parsing.', '', 'Validation', '- [ ] Run npm test.', '- [ ] Run npm run lint.'].join(
              '\n'
            ),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-checklist-validation',
                url: 'https://linear.app/comment/workpad-created-checklist-validation',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-checklist-validation',
        url: 'https://linear.app/comment/workpad-created-checklist-validation',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('normalizes CommonMark ordered-list validation requirements before mirroring', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.', '- Run npm run lint.'],
      notesLines: ['- Ordered-list ticket requirements using `1)` were normalized before validation mirroring.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Context',
              'Tighten validation parsing.',
              '',
              'Validation',
              'Run these commands:',
              '1) Run npm test.',
              '2) Run npm run lint.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-ordered-list-validation',
                url: 'https://linear.app/comment/workpad-created-ordered-list-validation',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-ordered-list-validation',
        url: 'https://linear.app/comment/workpad-created-ordered-list-validation',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('stops mirroring validation requirements when a custom plain heading starts a prose section', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Validation mirroring should not absorb later rollout bullets.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Run npm test.', 'Rollout', 'Notify the team.'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-custom-heading',
                url: 'https://linear.app/comment/workpad-created-custom-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-custom-heading',
        url: 'https://linear.app/comment/workpad-created-custom-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('stops mirroring validation requirements when a custom plain heading follows validation prose after a blank line', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Standalone prose headings should stop validation extraction after prose requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'Run npm test.', '', 'Rollout', 'This prose belongs to a different section.'].join(
              '\n'
            ),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-prose-heading',
                url: 'https://linear.app/comment/workpad-created-prose-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-prose-heading',
        url: 'https://linear.app/comment/workpad-created-prose-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('stops mirroring validation requirements when a custom markdown heading starts a prose section', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Validation mirroring should stop at markdown section boundaries.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Run npm test.', '### Rollout', 'Notify the team.'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-markdown-heading',
                url: 'https://linear.app/comment/workpad-created-markdown-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-markdown-heading',
        url: 'https://linear.app/comment/workpad-created-markdown-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('stops mirroring validation requirements when a custom markdown heading starts a checklist section', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Checklist bullets under non-validation markdown headings should not be mirrored as validation requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Run npm test.', '### Rollout', '- Notify the team.'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-markdown-heading-checklist',
                url: 'https://linear.app/comment/workpad-created-markdown-heading-checklist',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-markdown-heading-checklist',
        url: 'https://linear.app/comment/workpad-created-markdown-heading-checklist',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when nested markdown validation subheadings contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Nested markdown validation subheadings should still contribute requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '### Automated',
              '- Run npm test.',
              '### Manual',
              '- Capture screenshots.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('fails closed when plain and bold nested validation buckets contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Plain and styled validation buckets should still contribute mirrored checklist requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'Automated', '- Run npm test.', '**Manual**', '- Capture screenshots.'].join(
              '\n'
            )
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('fails closed when decorated nested validation headings contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Keep the existing mirrored checks list up to date.'],
      notesLines: ['- Decorated nested validation headings should still contribute mirrored checklist requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '### Automated (required)',
              '- Run npm test.',
              '### Manual ✅',
              '- Capture screenshots.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm test.', 'Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('fails closed when nested validation markdown headings with closing hashes contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Trailing closing hashes on nested validation headings should not drop mirrored requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '### Automated ###',
              '- Run npm test.',
              '### Manual ###',
              '- Capture screenshots.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('requires exact normalized validation requirement matches instead of substring matches', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- latest'],
      notesLines: ['- Substring overlaps should not satisfy mirrored validation requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Test.'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Test.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('fails closed when nested markdown validation subheadings followed by blank lines contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Blank lines after nested markdown validation subheadings should not drop requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '### Automated',
              '',
              '- Run npm test.',
              '### Manual',
              '',
              '- Capture screenshots.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('fails closed when common nested validation markdown subheadings contain unmet prose requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Nested validation buckets with prose requirements should still contribute mirrored checks.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '### Automated', 'Run npm test.', '### Manual', 'Capture screenshots.'].join(
              '\n'
            )
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('fails closed when multi-word nested validation markdown subheadings contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Multi-word nested validation buckets like Regression Checks should still preserve validation mirroring.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '### Regression Checks', '- Run npm test.', '- Run npm run lint.'].join(
              '\n'
            )
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('fails closed when nested setext validation buckets contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Nested setext validation buckets should still contribute mirrored checklist requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              'Automated',
              '---',
              '- Run npm test.',
              'Manual',
              '---',
              '- Capture screenshots.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('ignores fenced code headings when validating the canonical workpad section structure', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      notesLines: [
        '````md',
        '```md',
        '### Sample Heading',
        '- This is example markdown, not a real section.',
        '```',
        '````'
      ]
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-code-fence',
                url: 'https://linear.app/comment/workpad-created-code-fence',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-code-fence',
        url: 'https://linear.app/comment/workpad-created-code-fence',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when the workpad marker only appears inside a fenced example', async () => {
    const invalidWorkpadBody = [
      '```md',
      '## Codex Workpad',
      '',
      '### Environment / Workspace Stamp',
      '- Example only.',
      '',
      '### Plan',
      '- Example only.',
      '',
      '### Acceptance Criteria',
      '- Example only.',
      '',
      '### Validation',
      '- Example only.',
      '',
      '### Notes',
      '- Example only.',
      '```'
    ].join('\n');
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_marker_missing',
        message: 'Workpad body must contain "## Codex Workpad".',
        status: 422
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(0);
  });

  it('ignores setext underline rows when mirroring validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Setext underline rows should not become mirrored requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '----------', '- Run npm test.'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-setext',
                url: 'https://linear.app/comment/workpad-created-setext',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-setext',
        url: 'https://linear.app/comment/workpad-created-setext',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when validation prose introduces a checklist with missing mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Prose introductions should not terminate validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              'Run these commands:',
              '- Run npm test.',
              '- Run npm run lint.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when validation introductions are separated from checklists by blank lines', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Blank lines between validation introductions and checklists should not drop mirrored requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              'Run these commands:',
              '',
              '- Run npm test.',
              '- Run npm run lint.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when styled validation introductions keep mirrored checklist requirements active', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Styled list introductions should not clear validation mirroring before checklist items.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '**Run these commands:**',
              '- Run npm test.',
              '- Run npm run lint.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when title-cased styled validation introductions keep mirrored checklist requirements active', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Title-cased styled list introductions should not clear validation mirroring before checklist items.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '**Run Commands:**', '- Run npm test.', '- Run npm run lint.'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when horizontal rules appear between validation prose requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Horizontal rules inside validation prose should not terminate requirement mirroring.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'Run npm test.', '---', 'Run npm run lint.'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when lowercase validation prose appears before a setext underline', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Lowercase validation prose before a setext underline should not become a heading.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'run npm test', '---', 'Run npm run lint.'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when tool-led lowercase validation prose appears before a setext underline', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm run test.'],
      notesLines: ['- Tool-led lowercase validation prose before a setext underline should not become a heading.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'npm run test', '---', 'npm run lint'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['npm run lint'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when git-led lowercase validation prose appears before a setext underline', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run git clone repo.'],
      notesLines: ['- Git command prose before a setext underline should not become a heading.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'git clone repo', '---', 'git pull'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['git pull'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when common tool-led lowercase command prose appears before a setext underline', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run git config user.name.'],
      notesLines: ['- Common tool commands should not become lowercase setext headings.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'git config user.name', '---', 'docker compose up'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['docker compose up'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when ambiguous command entrypoints use a command-like second word before a setext underline', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run go generate ./...'],
      notesLines: ['- Ambiguous command entrypoints should still fail closed on real command phrases.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'go generate ./...', '---', 'go test ./...'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['go test ./...'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when ambiguous command entrypoints use a generic subcommand with a command-like argument before a setext underline', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run go get ./...'],
      notesLines: ['- Ambiguous command entrypoints should still reject generic subcommands when the following argument is command-like.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'go get ./...', '---', 'go test ./...'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['go test ./...'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('ignores fenced validation examples when mirroring ticket requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Fenced examples should not become required validation items.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '````md',
              '```sh',
              '- Run npm run lint.',
              '```',
              '````',
              '- Run npm test.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-fenced-validation',
                url: 'https://linear.app/comment/workpad-created-fenced-validation',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-fenced-validation',
        url: 'https://linear.app/comment/workpad-created-fenced-validation',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('ignores ordered-list-indented fenced validation examples when mirroring ticket requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Ordered-list-indented fenced examples should not become required validation items.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '10. Run npm test.', '    ```sh', '    npm run lint', '    ```'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-indented-fenced-validation',
                url: 'https://linear.app/comment/workpad-created-indented-fenced-validation',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-indented-fenced-validation',
        url: 'https://linear.app/comment/workpad-created-indented-fenced-validation',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('ignores top-level four-space-indented validation examples when mirroring ticket requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Top-level four-space-indented examples should not become required validation items.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Run npm test.', '    ```sh', '    - Run npm run lint.', '    ```'].join(
              '\n'
            ),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-top-level-indented-fenced-validation',
                url: 'https://linear.app/comment/workpad-created-top-level-indented-fenced-validation',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-top-level-indented-fenced-validation',
        url: 'https://linear.app/comment/workpad-created-top-level-indented-fenced-validation',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('keeps nested validation buckets active when fenced examples appear before the real checklist', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Fenced examples inside nested validation buckets should not clear mirrored requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '### Automated',
              '```sh',
              'npm test',
              '```',
              '- Run npm test.',
              '- Run npm run lint.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('treats non-ASCII markdown headings as section boundaries when parsing validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Markdown subheadings should stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              '### Rollout 🚀',
              'This prose belongs to a different section.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-non-ascii-heading',
                url: 'https://linear.app/comment/workpad-created-non-ascii-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-non-ascii-heading',
        url: 'https://linear.app/comment/workpad-created-non-ascii-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats non-ASCII setext headings as section boundaries when parsing validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Setext subheadings with non-ASCII suffixes should stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'Rollout 🚀',
              '---',
              '- Notify the team.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-non-ascii-setext-heading',
                url: 'https://linear.app/comment/workpad-created-non-ascii-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-non-ascii-setext-heading',
        url: 'https://linear.app/comment/workpad-created-non-ascii-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats lowercase setext headings as section boundaries when parsing validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Lowercase setext headings should stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'notes',
              '-----',
              '- Notify the team.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-lowercase-setext-heading',
                url: 'https://linear.app/comment/workpad-created-lowercase-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-lowercase-setext-heading',
        url: 'https://linear.app/comment/workpad-created-lowercase-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats multi-word lowercase setext headings as section boundaries when parsing validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Multi-word lowercase setext headings should still stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'follow up',
              '---------',
              '- Notify the team.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-multiword-lowercase-setext-heading',
                url: 'https://linear.app/comment/workpad-created-multiword-lowercase-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-multiword-lowercase-setext-heading',
        url: 'https://linear.app/comment/workpad-created-multiword-lowercase-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats multi-word lowercase setext headings followed by prose as section boundaries', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Lowercase setext headings followed by prose should still stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'rollout details',
              '---------------',
              'Coordinate with QA before rollout.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-multiword-lowercase-setext-prose-heading',
                url: 'https://linear.app/comment/workpad-created-multiword-lowercase-setext-prose-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-multiword-lowercase-setext-prose-heading',
        url: 'https://linear.app/comment/workpad-created-multiword-lowercase-setext-prose-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats verb-led lowercase setext subsections as section boundaries when they are not command lines', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Verb-led lowercase setext subsections like verify manually should still stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'verify manually',
              '---------------',
              'Confirm UI renders before ship.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-verb-led-lowercase-setext-heading',
                url: 'https://linear.app/comment/workpad-created-verb-led-lowercase-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-verb-led-lowercase-setext-heading',
        url: 'https://linear.app/comment/workpad-created-verb-led-lowercase-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats ambiguous command words like go live as lowercase setext section boundaries when they read like prose', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Ambiguous words like go live should still parse as lowercase setext headings when they read like prose.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'go live',
              '-------',
              'Coordinate the release with support before rollout.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-ambiguous-command-word-lowercase-setext-heading',
                url: 'https://linear.app/comment/workpad-created-ambiguous-command-word-lowercase-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-ambiguous-command-word-lowercase-setext-heading',
        url: 'https://linear.app/comment/workpad-created-ambiguous-command-word-lowercase-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats ambiguous command phrases like go get started as lowercase setext headings when they read like prose', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Phrases like go get started should remain prose headings when they are not real command lines.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'go get started',
              '--------------',
              'Walk through the first-time setup carefully.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-go-get-started-lowercase-setext-heading',
                url: 'https://linear.app/comment/workpad-created-go-get-started-lowercase-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-go-get-started-lowercase-setext-heading',
        url: 'https://linear.app/comment/workpad-created-go-get-started-lowercase-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats ambiguous command entrypoints with connector-led prose like make a plan as lowercase setext headings', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Connector-led phrases like make a plan should remain prose headings, not command phrases.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'make a plan',
              '-----------',
              'Sequence the final rollout deliberately.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-connector-led-ambiguous-lowercase-setext-heading',
                url: 'https://linear.app/comment/workpad-created-connector-led-ambiguous-lowercase-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-connector-led-ambiguous-lowercase-setext-heading',
        url: 'https://linear.app/comment/workpad-created-connector-led-ambiguous-lowercase-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats lowercase prose headings that start with CLI names as section boundaries when they are not command phrases', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- CLI-name prose headings like git workflow should still parse as lowercase setext headings.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'git workflow',
              '------------',
              'Coordinate the branch strategy before rollout.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-cli-name-prose-lowercase-setext-heading',
                url: 'https://linear.app/comment/workpad-created-cli-name-prose-lowercase-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-cli-name-prose-lowercase-setext-heading',
        url: 'https://linear.app/comment/workpad-created-cli-name-prose-lowercase-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats fully non-Latin setext headings as section boundaries when parsing validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Fully non-Latin setext headings should stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'Релиз',
              '---',
              '- Notify the team.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-cyrillic-setext-heading',
                url: 'https://linear.app/comment/workpad-created-cyrillic-setext-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-cyrillic-setext-heading',
        url: 'https://linear.app/comment/workpad-created-cyrillic-setext-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats fully bold non-ASCII headings as section boundaries when parsing validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Bold non-ASCII headings should stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              'Run npm test.',
              '',
              '**Rollout 🚀**',
              'This prose belongs to a different section.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-bold-non-ascii-heading',
                url: 'https://linear.app/comment/workpad-created-bold-non-ascii-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-bold-non-ascii-heading',
        url: 'https://linear.app/comment/workpad-created-bold-non-ascii-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats fully bold headings ending with a colon as section boundaries when they precede lists', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Styled custom headings with trailing colons should still stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Run npm test.', '', '**Rollout:**', '- Notify the team.'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-bold-colon-heading',
                url: 'https://linear.app/comment/workpad-created-bold-colon-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-bold-colon-heading',
        url: 'https://linear.app/comment/workpad-created-bold-colon-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats title-cased plain headings as section boundaries when they precede lists', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Title-cased plain headings still terminate validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'Implementation Notes',
              '- This list is not part of validation.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-plain-heading',
                url: 'https://linear.app/comment/workpad-created-plain-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-plain-heading',
        url: 'https://linear.app/comment/workpad-created-plain-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when Unicode plain validation headings contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Unicode plain validation headings should still keep mirroring active.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation — Regression', '- Run npm test.', '- Run npm run lint.'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation — Regression']
        }
      }
    });
  });

  it('fails closed when decorated plain validation headings contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Decorated plain validation headings should still keep mirroring active.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation ✅', '- Run npm test.', '- Run npm run lint.'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation ✅']
        }
      }
    });
  });

  it('fails closed when leading-symbol validation headings contain unmet mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Leading-symbol validation headings should still keep mirroring active.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['✅ Validation', '- Run npm test.', '- Run npm run lint.'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['✅ Validation']
        }
      }
    });
  });

  it('fails closed when nested validation headings use leading symbol decoration', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Leading-symbol nested validation buckets should still keep mirroring active.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '### ✅ Manual', '- Run npm test.', '- Run npm run lint.'].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('does not treat decorated validation prose as a plain section heading', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      notesLines: ['- Ignore prose that happens to begin with a decorated validation token.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Context',
              'Keep operators unblocked.',
              '',
              'Validation ✅ required for merge.',
              'Coordinate with QA before rollout.'
            ].join('\n')
          })
        );
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad',
        url: 'https://linear.app/comment/workpad',
        body: updatedWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('does not treat symbol-decorated plain headings as validation requirements inside an active validation section', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Symbol-decorated non-validation headings should terminate validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Run npm test.', 'Rollout 🚀', 'Coordinate with QA before rollout.'].join(
              '\n'
            )
          })
        );
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad',
        url: 'https://linear.app/comment/workpad',
        body: updatedWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when decorated markdown validation headings contain unmet requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Capture screenshots.'],
      notesLines: ['- Decorated validation headings should still mirror ticket requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              '### Validation ✅',
              '- Run npm test.',
              '',
              '### Testing (required)',
              '- Run npm run lint.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm test.', 'Run npm run lint.'],
          source_sections: ['Validation ✅', 'Testing (required)']
        }
      }
    });
  });

  it('accepts canonical workpad sections when their H3 headings use ATX closing hashes', async () => {
    const createdWorkpadBody = [
      '## Codex Workpad',
      '',
      '### Environment / Workspace Stamp ###',
      '- Issue: `CO-1`.',
      '- Workspace: `linear-workspace`.',
      '',
      '### Plan ###',
      '- Update the durable workpad contract.',
      '',
      '### Acceptance Criteria ###',
      '- [ ] Keep the canonical five-section workpad shape.',
      '',
      '### Validation ###',
      '- [ ] Run npm test.',
      '- [ ] Run npm run lint.',
      '',
      '### Notes ###',
      '- Preserve a single active workpad comment.'
    ].join('\n');
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-closing-hashes-workpad',
                url: 'https://linear.app/comment/workpad-created-closing-hashes-workpad',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-closing-hashes-workpad',
        url: 'https://linear.app/comment/workpad-created-closing-hashes-workpad',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when the workpad body omits or reorders the canonical top-level sections', async () => {
    const invalidWorkpadBody = [
      '## Codex Workpad',
      '',
      '### Plan',
      '- Updated plan.',
      '',
      '### Environment / Workspace Stamp',
      '- Issue: `CO-1`.'
    ].join('\n');
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_structure_invalid',
        message:
          'Workpad body must contain these H3 sections in order after "## Codex Workpad": Environment / Workspace Stamp, Plan, Acceptance Criteria, Validation, Notes.',
        status: 422,
        details: {
          required_sections: [
            'Environment / Workspace Stamp',
            'Plan',
            'Acceptance Criteria',
            'Validation',
            'Notes'
          ],
          actual_sections: ['Plan', 'Environment / Workspace Stamp']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the first visible line is not the canonical workpad marker', async () => {
    const invalidWorkpadBody = [
      'Draft wrapper text that should not be accepted.',
      '',
      buildStructuredWorkpadBody()
    ].join('\n');
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_structure_invalid',
        message: 'Workpad body must start with "## Codex Workpad".',
        status: 422
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the top-level workpad marker is renamed', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody().replace(
      '## Codex Workpad',
      '## Codex Workpad (draft)'
    );
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_structure_invalid',
        message: 'Workpad body must start with "## Codex Workpad".',
        status: 422
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the workpad body appends extra sections after the canonical five', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      extraSections: [{ title: 'Extra', lines: ['- This section should not be accepted.'] }]
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_structure_invalid',
        message:
          'Workpad body must contain these H3 sections in order after "## Codex Workpad": Environment / Workspace Stamp, Plan, Acceptance Criteria, Validation, Notes.',
        status: 422,
        details: {
          required_sections: [
            'Environment / Workspace Stamp',
            'Plan',
            'Acceptance Criteria',
            'Validation',
            'Notes'
          ],
          actual_sections: [
            'Environment / Workspace Stamp',
            'Plan',
            'Acceptance Criteria',
            'Validation',
            'Notes',
            'Extra'
          ]
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the workpad body includes content before the first canonical section', async () => {
    const invalidWorkpadBody = [
      '## Codex Workpad',
      '',
      'This stray prose should not be accepted.',
      '',
      '### Environment / Workspace Stamp',
      '- Branch: `co-21-tighten-linear-workpad-contract`.',
      '',
      '### Plan',
      '- Keep the workpad strict.',
      '',
      '### Acceptance Criteria',
      '- Preserve the canonical five sections only.',
      '',
      '### Validation',
      '- Run npm test.',
      '',
      '### Notes',
      '- No extra preamble should be accepted.'
    ].join('\n');
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_structure_invalid',
        message:
          'Workpad body must contain these H3 sections in order after "## Codex Workpad": Environment / Workspace Stamp, Plan, Acceptance Criteria, Validation, Notes.',
        status: 422,
        details: {
          required_sections: [
            'Environment / Workspace Stamp',
            'Plan',
            'Acceptance Criteria',
            'Validation',
            'Notes'
          ],
          actual_sections: [
            'Environment / Workspace Stamp',
            'Plan',
            'Acceptance Criteria',
            'Validation',
            'Notes'
          ],
          leading_content_before_first_section: true
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed with workpad_section_empty when a canonical core section is empty', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      validationLines: []
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_section_empty',
        message: 'Workpad core sections must be non-empty.',
        status: 422,
        details: {
          empty_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('accepts checkbox-backed Acceptance Criteria and Validation while keeping the other sections free-form', async () => {
    const validWorkpadBody = buildStructuredWorkpadBody({
      environmentLines: ['Workspace rooted at `/tmp/co` with the provider-worker helper command available.'],
      planLines: ['Tighten only the two execution-heavy workpad sections and leave narrative sections untouched.'],
      acceptanceCriteriaLines: [
        '- Checklist semantics to preserve:',
        '  - Nested fenced example:',
        '    ```md',
        '    ### Example Heading',
        '    - [ ] Example checklist item inside nested fenced content.',
        '    ```',
        '  - [ ] Reject workpads whose Acceptance Criteria section has no checkbox items.'
      ],
      validationLines: [
        'Local validation pass follows after the implementation patch.',
        '1. Focused verification',
        '   - [x] npm run test -- orchestrator/tests/ProviderLinearWorkflowFacade.test.ts'
      ],
      notesLines: ['Live Linear writes stay blocked until a successful post-rate-limit `issue-context` read.'],
      normalizeRequiredChecklistSections: false
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: validWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                body: validWorkpadBody,
                url: 'https://linear.app/comment/workpad'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: validWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad',
        url: 'https://linear.app/comment/workpad',
        body: validWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('accepts real checklist items that follow ordered-list-indented fenced examples with dedented inner content', async () => {
    const validWorkpadBody = buildStructuredWorkpadBody({
      acceptanceCriteriaLines: [
        '10. Nested example',
        '    ```md',
        '### Example Heading',
        '    ```',
        '- [ ] Keep the canonical five-section workpad shape.'
      ],
      validationLines: ['- [ ] Run npm test.'],
      notesLines: ['- Ordered-list-indented fenced examples should not hide later real checklist items.'],
      normalizeRequiredChecklistSections: false
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: validWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                body: validWorkpadBody,
                url: 'https://linear.app/comment/workpad'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: validWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad',
        url: 'https://linear.app/comment/workpad',
        body: validWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails closed when Acceptance Criteria uses plain bullets instead of checkbox items', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      acceptanceCriteriaLines: ['- Keep the canonical five-section workpad shape.'],
      normalizeRequiredChecklistSections: false
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
          missing_checkbox_sections: ['Acceptance Criteria'],
          blank_checkbox_sections: []
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when Acceptance Criteria uses prose instead of checkbox items', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      acceptanceCriteriaLines: ['Keep the canonical five-section workpad shape.'],
      normalizeRequiredChecklistSections: false
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
          missing_checkbox_sections: ['Acceptance Criteria'],
          blank_checkbox_sections: []
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when Validation uses plain bullets instead of checkbox items', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.', '- Run npm run lint.'],
      normalizeRequiredChecklistSections: false
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
          missing_checkbox_sections: ['Validation'],
          blank_checkbox_sections: []
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when Validation uses prose instead of checkbox items', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['Run npm test.', 'Run npm run lint.'],
      normalizeRequiredChecklistSections: false
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
          missing_checkbox_sections: ['Validation'],
          blank_checkbox_sections: []
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each(['- [ ]', '- [x]', '- [X]'])(
    'fails closed when a required checklist section contains only a blank checkbox item (%s)',
    async (blankCheckbox) => {
      const invalidWorkpadBody = buildStructuredWorkpadBody({
        acceptanceCriteriaLines: [blankCheckbox],
        normalizeRequiredChecklistSections: false
      });
      const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        if (body.query?.includes('ProviderLinearIssueContext')) {
          return jsonResponse(buildIssueContextBody());
        }
        throw new Error(`Unexpected query: ${body.query}`);
      });

      const result = await upsertProviderLinearWorkpadComment({
        issueId: 'lin-issue-1',
        body: invalidWorkpadBody,
        env: {
          CO_LINEAR_API_TOKEN: 'lin-api-token'
        },
        fetchImpl
      });

      expect(result).toEqual({
        ok: false,
        operation: 'upsert-workpad',
        error: {
          code: 'workpad_checklist_required',
          message:
            'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
          status: 422,
          details: {
            required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
            missing_checkbox_sections: ['Acceptance Criteria'],
            blank_checkbox_sections: ['Acceptance Criteria']
          }
        }
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  );

  async function expectValidationChecklistRequirementFailure(options: {
    validationLines: string[];
    normalizeRequiredChecklistSections?: boolean;
    missing_checkbox_sections: string[];
    blank_checkbox_sections: string[];
  }): Promise<void> {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      validationLines: options.validationLines,
      normalizeRequiredChecklistSections: options.normalizeRequiredChecklistSections
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
          missing_checkbox_sections: options.missing_checkbox_sections,
          blank_checkbox_sections: options.blank_checkbox_sections
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  }

  it.each(['- [ ]', '- [x]', '- [X]'])(
    'fails closed when Validation contains only a blank checkbox item (%s)',
    async (blankCheckbox) => {
      await expectValidationChecklistRequirementFailure({
        validationLines: [blankCheckbox],
        normalizeRequiredChecklistSections: false,
        missing_checkbox_sections: ['Validation'],
        blank_checkbox_sections: ['Validation']
      });
    }
  );

  it.each(['- [ ]', '- [x]', '- [X]'])(
    'fails closed when a required checklist section mixes valid and blank checkbox items (%s)',
    async (blankCheckbox) => {
      const invalidWorkpadBody = buildStructuredWorkpadBody({
        acceptanceCriteriaLines: ['- [ ] Keep the canonical five-section workpad shape.', blankCheckbox],
        normalizeRequiredChecklistSections: false
      });
      const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        if (body.query?.includes('ProviderLinearIssueContext')) {
          return jsonResponse(buildIssueContextBody());
        }
        throw new Error(`Unexpected query: ${body.query}`);
      });

      const result = await upsertProviderLinearWorkpadComment({
        issueId: 'lin-issue-1',
        body: invalidWorkpadBody,
        env: {
          CO_LINEAR_API_TOKEN: 'lin-api-token'
        },
        fetchImpl
      });

      expect(result).toEqual({
        ok: false,
        operation: 'upsert-workpad',
        error: {
          code: 'workpad_checklist_required',
          message:
            'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
          status: 422,
          details: {
            required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
            missing_checkbox_sections: [],
            blank_checkbox_sections: ['Acceptance Criteria']
          }
        }
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['- [ ]', '- [x]', '- [X]'])(
    'fails closed when Validation mixes valid and blank checkbox items (%s)',
    async (blankCheckbox) => {
      await expectValidationChecklistRequirementFailure({
        validationLines: ['- [ ] Run npm test.', blankCheckbox],
        normalizeRequiredChecklistSections: false,
        missing_checkbox_sections: [],
        blank_checkbox_sections: ['Validation']
      });
    }
  );

  it('fails closed when required checklist content appears only inside indented code blocks', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      acceptanceCriteriaLines: [
        '    - [ ] Example checklist item inside an indented code block.',
        '    - [ ]'
      ],
      normalizeRequiredChecklistSections: false
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
          missing_checkbox_sections: ['Acceptance Criteria'],
          blank_checkbox_sections: []
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when Validation checklist content appears only inside indented code blocks', async () => {
    await expectValidationChecklistRequirementFailure({
      validationLines: [
        '    - [ ] Example checklist item inside an indented code block.',
        '    - [ ]'
      ],
      normalizeRequiredChecklistSections: false,
      missing_checkbox_sections: ['Validation'],
      blank_checkbox_sections: []
    });
  });

  it('fails closed when the default required-section normalizer only sees indented code-block checklist content', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      acceptanceCriteriaLines: ['    - [ ] Example checklist item inside an indented code block.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
          missing_checkbox_sections: ['Acceptance Criteria'],
          blank_checkbox_sections: []
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the default Validation normalizer only sees indented code-block checklist content', async () => {
    await expectValidationChecklistRequirementFailure({
      validationLines: ['    - [ ] Example checklist item inside an indented code block.'],
      missing_checkbox_sections: ['Validation'],
      blank_checkbox_sections: []
    });
  });

  it('fails closed when the default required-section normalizer only sees fenced code-block checklist content', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      acceptanceCriteriaLines: [
        '```md',
        '- [ ] Example checklist item inside a fenced code block.',
        '```'
      ]
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_checklist_required',
        message:
          'Workpad Acceptance Criteria and Validation sections must contain non-empty checkbox list items (`- [ ] task` or `- [x] task`).',
        status: 422,
        details: {
          required_checkbox_sections: ['Acceptance Criteria', 'Validation'],
          missing_checkbox_sections: ['Acceptance Criteria'],
          blank_checkbox_sections: []
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the default Validation normalizer only sees fenced code-block checklist content', async () => {
    await expectValidationChecklistRequirementFailure({
      validationLines: [
        '```md',
        '- [ ] Example checklist item inside a fenced code block.',
        '```'
      ],
      missing_checkbox_sections: ['Validation'],
      blank_checkbox_sections: []
    });
  });

  it('accepts a real checklist item after a four-space-indented code example heading', async () => {
    const validWorkpadBody = buildStructuredWorkpadBody({
      acceptanceCriteriaLines: [
        '    ```md',
        '    ### Example Heading',
        '- Real checklist content that should still be normalized and validated.'
      ]
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: validWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: validWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: validWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad',
        url: 'https://linear.app/comment/workpad',
        body: validWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails closed when ticket validation requirements are not mirrored into the workpad', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Missing one required ticket validation item.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Context', 'Tighten validation.', '', 'Validation', '- Run npm test.', '- Run npm run lint.'].join(
              '\n'
            )
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when commentId points at an unresolved human comment', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated plan.'],
      notesLines: ['- Invalid comment id should fail closed.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      commentId: 'comment-note',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_workpad_comment_id_invalid',
        message: 'Comment id must reference an unresolved Codex workpad comment.',
        status: 422,
        details: {
          comment_id: 'comment-note'
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when commentId points at a comment whose marker only appears inside a fenced example', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated targeted workpad.'],
      notesLines: ['- Fenced examples are not valid workpad comments.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-example',
                  body: ['```md', '## Codex Workpad', '### Notes', '- Example only.', '```'].join('\n'),
                  url: 'https://linear.app/comment/example',
                  createdAt: '2026-03-22T10:00:00.000Z',
                  updatedAt: '2026-03-22T10:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      commentId: 'comment-example',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_workpad_comment_id_invalid',
        message: 'Comment id must reference an unresolved Codex workpad comment.',
        status: 422,
        details: {
          comment_id: 'comment-example'
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when commentId points at a comment whose marker only appears inside an ordered-list-indented fenced example', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated targeted workpad.'],
      notesLines: ['- Ordered-list-indented fenced examples are not valid workpad comments.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-example',
                  body: [
                    '10. Nested example',
                    '    ```md',
                    '## Codex Workpad',
                    '### Notes',
                    '- Example only.',
                    '    ```'
                  ].join('\n'),
                  url: 'https://linear.app/comment/example',
                  createdAt: '2026-03-22T10:00:00.000Z',
                  updatedAt: '2026-03-22T10:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      commentId: 'comment-example',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_workpad_comment_id_invalid',
        message: 'Comment id must reference an unresolved Codex workpad comment.',
        status: 422,
        details: {
          comment_id: 'comment-example'
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('updates the caller-selected unresolved workpad comment when commentId is valid', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated targeted workpad.'],
      notesLines: ['- Explicit comment selection stayed within the active workpad set.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-workpad-target',
                  body: '## Codex Workpad\n\nTarget plan',
                  url: 'https://linear.app/comment/workpad-target',
                  createdAt: '2026-03-22T07:00:00.000Z',
                  updatedAt: '2026-03-22T07:30:00.000Z',
                  resolvedAt: null
                },
                {
                  id: 'comment-workpad-current',
                  body: '## Codex Workpad\n\nCurrent plan',
                  url: 'https://linear.app/comment/workpad-current',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T09:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad-target',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad-target',
                url: 'https://linear.app/comment/workpad-target',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      commentId: 'comment-workpad-target',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad-target',
        url: 'https://linear.app/comment/workpad-target',
        body: updatedWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('ignores resolved workpad comments when selecting the active workpad', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-workpad-old',
                body: '## Codex Workpad\n\nOld resolved plan',
                url: 'https://linear.app/comment/workpad-old',
                createdAt: '2026-03-22T07:00:00.000Z',
                updatedAt: '2026-03-22T07:30:00.000Z',
                resolvedAt: '2026-03-22T07:45:00.000Z'
              },
              {
                id: 'comment-workpad-current',
                body: '## Codex Workpad\n\nCurrent active plan',
                url: 'https://linear.app/comment/workpad-current',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        }));
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      issue: {
        workpad_comment: {
          id: 'comment-workpad-current',
          body: '## Codex Workpad\n\nCurrent active plan'
        }
      }
    });
  });

  it('paginates comments so an active workpad beyond the first page is updated instead of duplicated', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated paginated workpad.'],
      notesLines: ['- The update reused the active workpad from a later comments page.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string | null>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        if (body.variables?.commentsAfter === null) {
          return jsonResponse(
            buildIssueContextBody({
              comments: {
                nodes: Array.from({ length: 50 }, (_, index) => ({
                  id: `comment-note-${index + 1}`,
                  body: `Unrelated note ${index + 1}`,
                  url: `https://linear.app/comment/note-${index + 1}`,
                  createdAt: '2026-03-22T08:00:00.000Z',
                  updatedAt: '2026-03-22T08:30:00.000Z',
                  resolvedAt: null
                })),
                pageInfo: {
                  hasNextPage: true,
                  endCursor: 'cursor-1'
                }
              }
            })
          );
        }
        if (body.variables?.commentsAfter === 'cursor-1') {
          return jsonResponse(
            buildIssueContextBody({
              comments: {
                nodes: [
                  {
                    id: 'comment-workpad-later',
                    body: '## Codex Workpad\n\nCurrent active plan',
                    url: 'https://linear.app/comment/workpad-later',
                    createdAt: '2026-03-22T09:00:00.000Z',
                    updatedAt: '2026-03-22T09:30:00.000Z',
                    resolvedAt: null
                  }
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null
                }
              }
            })
          );
        }
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad-later',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad-later',
                url: 'https://linear.app/comment/workpad-later',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad-later',
        body: updatedWorkpadBody
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('deletes the current unresolved workpad comment when requested', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        expect(body.query).toContain('comments(first:');
        expect(body.query).not.toContain('attachments(first:');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearDeleteComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad'
        });
        return jsonResponse({
          data: {
            commentDelete: {
              success: true,
              entityId: 'comment-workpad'
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'delete-workpad',
      action: 'deleted',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment_id: 'comment-workpad',
      source_setup: null
    });
  });

  it('allows delete-workpad to noop after a truthful single read when one shared request remains', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const resetAt = String(Date.now() + 60_000);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueContext');
      expect(body.query).toContain('comments(first:');
      expect(body.query).not.toContain('attachments(first:');
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-note',
                body: 'Unrelated note',
                url: 'https://linear.app/comment/note',
                createdAt: '2026-03-22T08:00:00.000Z',
                updatedAt: '2026-03-22T08:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      operation: 'delete-workpad',
      action: 'noop',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment_id: null,
      source_setup: null
    });
  });

  it('treats an already-removed workpad comment as an idempotent delete success', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        expect(body.query).toContain('comments(first:');
        expect(body.query).not.toContain('attachments(first:');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearDeleteComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad'
        });
        return jsonResponse({
          data: {
            commentDelete: {
              success: false,
              entityId: 'comment-workpad'
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'delete-workpad',
      action: 'deleted',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment_id: 'comment-workpad',
      source_setup: null
    });
  });

  it('fails delete-workpad when Linear reports failure without confirming the deleted comment id', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearDeleteComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad'
        });
        return jsonResponse({
          data: {
            commentDelete: {
              success: false,
              entityId: null
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'delete-workpad',
      error: {
        code: 'comment_delete_failed',
        message: 'Linear comment delete did not succeed.',
        status: 503
      }
    });
  });

  it('fails delete-workpad without comment_id when multiple unresolved workpads exist', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-workpad-newer',
                  body: '## Codex Workpad\n\nNew plan',
                  url: 'https://linear.app/comment/workpad-newer',
                  createdAt: '2026-03-22T10:00:00.000Z',
                  updatedAt: '2026-03-22T10:30:00.000Z',
                  resolvedAt: null
                },
                {
                  id: 'comment-workpad-older',
                  body: '## Codex Workpad\n\nOld plan',
                  url: 'https://linear.app/comment/workpad-older',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T09:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'delete-workpad',
      error: {
        code: 'ambiguous_workpad_state',
        message:
          'Multiple unresolved Codex workpad comments exist; provide comment_id to delete one explicitly.',
        status: 409,
        details: {
          comment_ids: ['comment-workpad-newer', 'comment-workpad-older']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('resolves a state name to a state id before transitioning the issue', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        expect(body.query).not.toContain('comments(');
        expect(body.query).not.toContain('attachments(');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-human-review'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                state: {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'human review',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'transition',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1',
        updated_at: null,
        state: {
          id: 'state-human-review',
          name: 'Human Review',
          type: 'started'
        }
      },
      previous_state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      target_state: {
        id: 'state-human-review',
        name: 'Human Review',
        type: 'started'
      },
      source_setup: null
    });
  });

  it('fails closed when a live issue summary omits, contains malformed label nodes, or paginates labels before transition', async () => {
    const cases: Array<{
      label: string;
      labels: unknown;
    }> = [
      {
        label: 'omitted labels',
        labels: undefined
      },
      {
        label: 'malformed label node',
        labels: {
          nodes: [
            {
              id: 'label-bug',
              color: '#d73a49'
            }
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: null
          }
        }
      },
      {
        label: 'paginated labels',
        labels: {
          nodes: ISSUE_LABEL_NODES,
          pageInfo: {
            hasNextPage: true,
            endCursor: 'cursor-labels'
          }
        }
      }
    ];

    for (const testCase of cases) {
      let summaryQuery = '';
      const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
        };
        if (body.query?.includes('ProviderLinearIssueSummary')) {
          summaryQuery = body.query;
          return jsonResponse(
            buildIssueContextBody({
              labels: testCase.labels
            })
          );
        }
        if (body.query?.includes('ProviderLinearMoveIssue')) {
          throw new Error('Transition mutation must not run after incomplete summary labels.');
        }
        throw new Error(`Unexpected query: ${body.query}`);
      });

      const result = await transitionProviderLinearIssueState({
        issueId: 'lin-issue-1',
        stateName: 'human review',
        env: {
          CO_LINEAR_API_TOKEN: 'lin-api-token'
        },
        fetchImpl
      });

      expect(fetchImpl, testCase.label).toHaveBeenCalledTimes(1);
      expect(summaryQuery, testCase.label).toMatch(/labels\s*(?:\([^)]*\))?\s*\{/u);
      expect(summaryQuery, testCase.label).toContain('hasNextPage');
      expect(result, testCase.label).toMatchObject({
        ok: false,
        operation: 'transition',
        error: {
          code: 'linear_response_invalid'
        }
      });
    }
  });

  it('fails closed when expected transition preconditions no longer match the live issue summary', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            updatedAt: '2026-04-17T06:00:27.516Z',
            state: {
              id: 'state-done',
              name: 'Done',
              type: 'completed'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator',
              states: {
                nodes: [
                  {
                    id: 'state-in-review',
                    name: 'In Review',
                    type: 'started'
                  },
                  {
                    id: 'state-merging',
                    name: 'Merging',
                    type: 'started'
                  },
                  {
                    id: 'state-done',
                    name: 'Done',
                    type: 'completed'
                  }
                ]
              }
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        throw new Error('Transition mutation must not run after CAS preconditions fail.');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-17T05:53:29.672Z',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_transition_conflict',
        status: 409,
        details: {
          previous_state: 'Done',
          previous_state_type: 'completed',
          target_state: 'Merging',
          target_state_type: 'started',
          issue_updated_at: '2026-04-17T06:00:27.516Z',
          expected_state: 'In Review',
          expected_state_type: 'started',
          expected_updated_at: '2026-04-17T05:53:29.672Z',
          mismatch_fields: ['state', 'state_type', 'updated_at']
        }
      }
    });
  });

  it('requires force plus reason before reopening a terminal issue into an active state', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            updatedAt: '2026-04-17T06:00:27.516Z',
            state: {
              id: 'state-done',
              name: 'Done',
              type: 'completed'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator',
              states: {
                nodes: [
                  {
                    id: 'state-in-progress',
                    name: 'In Progress',
                    type: 'started'
                  },
                  {
                    id: 'state-merging',
                    name: 'Merging',
                    type: 'started'
                  },
                  {
                    id: 'state-done',
                    name: 'Done',
                    type: 'completed'
                  }
                ]
              }
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        throw new Error('Transition mutation must not run without an explicit force override.');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_terminal_transition_requires_force',
        status: 409,
        message: expect.stringContaining(
          'requires --force and a non-empty --force-reason.'
        ),
        details: {
          previous_state: 'Done',
          previous_state_type: 'completed',
          target_state: 'Merging',
          target_state_type: 'started',
          issue_updated_at: '2026-04-17T06:00:27.516Z',
          force: false,
          force_reason: null,
          force_required: true
        }
      }
    });
  });

  it('allows forced terminal reopen transitions and records the transition guard audit metadata', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            updatedAt: '2026-04-17T06:00:27.516Z',
            state: {
              id: 'state-done',
              name: 'Done',
              type: 'completed'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator',
              states: {
                nodes: [
                  {
                    id: 'state-merging',
                    name: 'Merging',
                    type: 'started'
                  },
                  {
                    id: 'state-done',
                    name: 'Done',
                    type: 'completed'
                  }
                ]
              }
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-merging'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                updatedAt: '2026-04-17T06:05:00.000Z',
                state: {
                  id: 'state-merging',
                  name: 'Merging',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'Done',
      expectedStateType: 'completed',
      expectedUpdatedAt: '2026-04-17T06:00:27.516Z',
      force: true,
      forceReason: 'manual reopen after merge-race correction',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'updated',
      issue: {
        state: {
          id: 'state-merging',
          name: 'Merging',
          type: 'started'
        },
        updated_at: '2026-04-17T06:05:00.000Z'
      },
      previous_state: {
        id: 'state-done',
        name: 'Done',
        type: 'completed'
      },
      target_state: {
        id: 'state-merging',
        name: 'Merging',
        type: 'started'
      },
      transition_guard: {
        expected_state: 'Done',
        expected_state_type: 'completed',
        expected_updated_at: '2026-04-17T06:00:27.516Z',
        force: true,
        force_reason: 'manual reopen after merge-race correction'
      }
    });
  });

  it('rejects forced terminal reopen transitions without a non-empty force reason', async () => {
    const fetchImpl: typeof fetch = vi.fn();

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      force: true,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_force_reason_missing',
        status: 422
      }
    });
  });

  it('rejects forced terminal reopen transitions when the force reason is only whitespace', async () => {
    const fetchImpl: typeof fetch = vi.fn();

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      force: true,
      forceReason: '   ',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_force_reason_missing',
        status: 422
      }
    });
  });

  it('rejects forced terminal reopen transitions when stale CAS expectations no longer match', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            updatedAt: '2026-04-17T06:00:27.516Z',
            state: {
              id: 'state-done',
              name: 'Done',
              type: 'completed'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator',
              states: {
                nodes: [
                  {
                    id: 'state-in-review',
                    name: 'In Review',
                    type: 'started'
                  },
                  {
                    id: 'state-merging',
                    name: 'Merging',
                    type: 'started'
                  },
                  {
                    id: 'state-done',
                    name: 'Done',
                    type: 'completed'
                  }
                ]
              }
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-merging'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                updatedAt: '2026-04-17T06:05:00.000Z',
                state: {
                  id: 'state-merging',
                  name: 'Merging',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-17T05:53:29.672Z',
      force: true,
      forceReason: 'manual reopen after merge-race correction',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_transition_conflict',
        status: 409,
        details: {
          previous_state: 'Done',
          previous_state_type: 'completed',
          target_state: 'Merging',
          target_state_type: 'started',
          issue_updated_at: '2026-04-17T06:00:27.516Z',
          expected_state: 'In Review',
          expected_state_type: 'started',
          expected_updated_at: '2026-04-17T05:53:29.672Z',
          force: true,
          force_reason: 'manual reopen after merge-race correction',
          mismatch_fields: ['state', 'state_type', 'updated_at']
        }
      }
    });
  });

  it('uses a fresh cached issue summary for a direct transition mutation and updates the cached state after success', async () => {
    const env = await createRunScopedEnv();
    await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl: vi.fn(async () => jsonResponse(buildIssueContextBody()))
    });

    const mutationFetch: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-human-review'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                state: {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'human review',
      env,
      fetchImpl: mutationFetch
    });

    expect(mutationFetch).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'updated',
      issue: {
        identifier: 'CO-1',
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      }
    });

    const noopFetch: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueSummary');
      return jsonResponse(
        buildIssueContextBody({
          state: {
            id: 'state-human-review',
            name: 'Human Review',
            type: 'started'
          }
        })
      );
    });
    const noopResult = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl: noopFetch
    });

    expect(noopFetch).toHaveBeenCalledTimes(1);
    expect(noopResult).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'noop',
      issue: {
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      },
      previous_state: {
        id: 'state-human-review',
        name: 'Human Review'
      }
    });
  });

  it.each([
    {
      archivedAt: '2026-04-11T05:00:00.000Z',
      trashed: false,
      label: 'archived'
    },
    {
      archivedAt: null,
      trashed: true,
      label: 'trashed'
    }
  ])('fails closed when the live issue summary is $label before transition', async ({ archivedAt, trashed }) => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        expect(body.query).toContain('archivedAt');
        expect(body.query).toContain('trashed');
        return jsonResponse(
          buildIssueContextBody({
            archivedAt,
            trashed
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        throw new Error('Transition mutation must not run for a non-mutable issue.');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_issue_not_mutable',
        status: 409,
        details: {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-1',
          archived_at: archivedAt,
          trashed
        }
      }
    });
  });

  it.each([
    {
      archived_at: '2026-04-11T05:00:00.000Z',
      trashed: false,
      label: 'archived'
    },
    {
      archived_at: null,
      trashed: true,
      label: 'trashed'
    }
  ])('revalidates cached $label issues live before failing a transition', async ({ archived_at, trashed }) => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        archived_at,
        trashed
      })
    );
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        expect(body.query).toContain('archivedAt');
        expect(body.query).toContain('trashed');
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: archived_at,
            trashed
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        throw new Error('Transition mutation must not run for a cached non-mutable issue.');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_issue_not_mutable',
        status: 409,
        details: {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-1',
          archived_at,
          trashed
        }
      }
    });
  });

  it('re-reads the live issue summary before transitioning from a trusted cached context', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        archived_at: null,
        trashed: false
      })
    );
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: '2026-04-11T05:00:00.000Z',
            trashed: false
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        throw new Error('Transition mutation must not run after live reread reports an archived issue.');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_issue_not_mutable',
        status: 409,
        details: {
          issue_id: 'lin-issue-1',
          archived_at: '2026-04-11T05:00:00.000Z',
          trashed: false
        }
      }
    });
  });

  it('revalidates cached archived issues live before transitioning a restored issue', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        archived_at: '2026-04-11T05:00:00.000Z',
        trashed: true
      })
    );
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: null,
            trashed: false
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-human-review'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                state: {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'updated',
      issue: {
        identifier: 'CO-1',
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      }
    });
  });

  it('reuses the live mutability reread when a restored cached transition is already in the target state', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        archived_at: '2026-04-11T05:00:00.000Z',
        trashed: true
      }),
      {
        recordedAt: new Date().toISOString()
      }
    );
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueSummary');
      return jsonResponse(
        buildIssueContextBody({
          archivedAt: null,
          trashed: false,
          state: {
            id: 'state-human-review',
            name: 'Human Review',
            type: 'started'
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'noop',
      issue: {
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      },
      previous_state: {
        id: 'state-human-review',
        name: 'Human Review'
      }
    });
  });

  it('allows transition to noop when the live archived issue is already in the target state', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: '2026-04-11T05:00:00.000Z',
            trashed: true,
            state: {
              id: 'state-human-review',
              name: 'Human Review',
              type: 'started'
            }
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'noop',
      issue: {
        identifier: 'CO-1',
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      }
    });
  });

  it('persists updated_at into the cached issue context after a successful transition', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        updated_at: '2026-03-22T10:00:00.000Z'
      }),
      {
        recordedAt: new Date().toISOString()
      }
    );

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            updatedAt: '2026-03-22T10:00:00.000Z'
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-human-review'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                updatedAt: '2026-03-22T10:10:00.000Z',
                state: {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'human review',
      env,
      fetchImpl
    });

    const cachePath = resolveIssueContextCachePathForTest(env);
    const cacheRecord = JSON.parse(await readFile(cachePath, 'utf8')) as {
      issue: {
        updated_at: string | null;
        state: { id: string; name: string; type: string };
      };
    };

    expect(result).toMatchObject({
      ok: true,
      issue: {
        updated_at: '2026-03-22T10:10:00.000Z',
        state: {
          id: 'state-human-review',
          name: 'Human Review',
          type: 'started'
        }
      }
    });
    expect(cacheRecord.issue.updated_at).toBe('2026-03-22T10:10:00.000Z');
    expect(cacheRecord.issue.state).toEqual({
      id: 'state-human-review',
      name: 'Human Review',
      type: 'started'
    });
  });

  it('allows transition to noop after a truthful live summary read when one shared request remains', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const resetAt = String(Date.now() + 60_000);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueSummary');
      return jsonResponse(
        buildIssueContextBody({
          state: {
            id: 'state-human-review',
            name: 'Human Review',
            type: 'started'
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'noop',
      issue: {
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      },
      previous_state: {
        id: 'state-human-review',
        name: 'Human Review'
      }
    });
  });

  it('allows a cached transition reread to resolve as noop when one shared request remains', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(env, buildCachedIssueContext(), {
      recordedAt: new Date().toISOString()
    });
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueSummary');
      return jsonResponse(
        buildIssueContextBody({
          state: {
            id: 'state-human-review',
            name: 'Human Review',
            type: 'started'
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'noop',
      issue: {
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      },
      previous_state: {
        id: 'state-human-review',
        name: 'Human Review'
      }
    });
  });

  it('fails cached transition reread noops when expected transition guards are stale', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(env, buildCachedIssueContext(), {
      recordedAt: new Date().toISOString()
    });
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueSummary');
      return jsonResponse(
        buildIssueContextBody({
          updatedAt: '2026-03-22T10:05:00.000Z',
          state: {
            id: 'state-human-review',
            name: 'Human Review',
            type: 'started'
          }
        }),
        200,
        {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        }
      );
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      expectedStateName: 'In Progress',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-03-22T10:00:00.000Z',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_transition_conflict',
        status: 409,
        details: {
          previous_state: 'Human Review',
          previous_state_type: 'started',
          target_state: 'Human Review',
          target_state_type: 'started',
          issue_updated_at: '2026-03-22T10:05:00.000Z',
          expected_state: 'In Progress',
          expected_state_type: 'started',
          expected_updated_at: '2026-03-22T10:00:00.000Z',
          mismatch_fields: ['state', 'updated_at']
        }
      }
    });
  });

  it('fails cached transition after the reread when one shared request remains', async () => {
    const env = await createBudgetedRunScopedEnv();
    const resetAt = String(Date.now() + 60_000);

    await writeCachedIssueContext(env, buildCachedIssueContext(), {
      recordedAt: new Date().toISOString()
    });
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody(), 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      throw new Error('The cached transition should stop before the state mutation query.');
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true
        }
      }
    });
  });

  it('revalidates cached transition noop decisions before skipping the mutation', async () => {
    const env = await createRunScopedEnv();
    await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl: vi.fn(async () =>
        jsonResponse(
          buildIssueContextBody({
            state: {
              id: 'state-human-review',
              name: 'Human Review',
              type: 'started'
            }
          })
        )
      )
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-human-review'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                state: {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'updated',
      issue: {
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      },
      previous_state: {
        id: 'state-in-progress',
        name: 'In Progress'
      }
    });
  });

  it('does not refresh stale workpad comment cache data after a stale cached transition', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        comments: [
          {
            id: 'comment-stale',
            body: '## Codex Workpad\n\nOld cached body',
            url: 'https://linear.app/comment/stale',
            created_at: '2026-03-22T09:00:00.000Z',
            updated_at: '2026-03-22T09:30:00.000Z',
            resolved_at: null
          }
        ],
        workpad_comment: {
          id: 'comment-stale',
          body: '## Codex Workpad\n\nOld cached body',
          url: 'https://linear.app/comment/stale',
          created_at: '2026-03-22T09:00:00.000Z',
          updated_at: '2026-03-22T09:30:00.000Z',
          resolved_at: null
        }
      }),
      {
        recordedAt: '2026-03-22T10:00:00.000Z'
      }
    );

    const transitionFetch: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-human-review'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                state: {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const transitionResult = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl: transitionFetch
    });

    expect(transitionFetch).toHaveBeenCalledTimes(2);
    expect(transitionResult).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'updated',
      issue: {
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      }
    });

    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Refresh the workpad after the stale transition cache path.'],
      notesLines: ['- A stale transition should not make stale comment ids look fresh.']
    });
    const upsertFetch: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            state: {
              id: 'state-human-review',
              name: 'Human Review',
              type: 'started'
            },
            comments: {
              nodes: [
                {
                  id: 'comment-live',
                  body: '## Codex Workpad\n\nLive body',
                  url: 'https://linear.app/comment/live',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T09:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-live',
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-live',
                url: 'https://linear.app/comment/live',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const upsertResult = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      env,
      fetchImpl: upsertFetch
    });

    expect(upsertFetch).toHaveBeenCalledTimes(2);
    expect(upsertResult).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      comment: {
        id: 'comment-live',
        body: updatedWorkpadBody
      }
    });
  });

  it('falls back to a live summary when cached team states miss the requested transition target', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(
      env,
      buildCachedIssueContext({
        team: {
          id: 'lin-team-1',
          key: 'CO',
          name: 'Codex Orchestrator',
          states: [
            {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            {
              id: 'state-in-progress',
              name: 'In Progress',
              type: 'started'
            },
            {
              id: 'state-done',
              name: 'Done',
              type: 'completed'
            }
          ]
        }
      })
    );

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-human-review'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                state: {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: true,
      operation: 'transition',
      action: 'updated',
      issue: {
        state: {
          id: 'state-human-review',
          name: 'Human Review'
        }
      }
    });
  });

  it('fails closed when a stale cached transition revalidation shows the issue moved out of scoped project ownership', async () => {
    const env = await createRunScopedEnv();
    await writeCachedIssueContext(env, buildCachedIssueContext(), {
      sourceSetup: scopedSourceSetup
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            project: null
          })
        );
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        throw new Error('Transition mutation must not run after live summary scope revalidation fails');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'Human Review',
      sourceSetup: scopedSourceSetup,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_project_mismatch',
        status: 422,
        details: {
          expected: 'lin-project-1',
          actual: null
        }
      }
    });
  });

  it('creates a same-project Backlog follow-up issue with related and blocker linkage', async () => {
    const initialDescription = buildExpectedFollowUpDescription({
      includeParityMatrix: true
    });
    const finalDescription = buildExpectedFollowUpDescription({
      includeParityMatrix: true,
      includeTraceability: true
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        expect(body.query).not.toContain('comments(');
        expect(body.query).not.toContain('attachments(');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
              projectId: 'lin-project-1',
              stateId: 'state-backlog',
              title: 'Follow-up issue',
              labelIds: FOLLOW_UP_LABEL_IDS,
              description: initialDescription
            }
          });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                  title: 'Follow-up issue',
                  description: initialDescription,
                  url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        if ((body.variables?.input as Record<string, unknown> | undefined)?.type === 'related') {
          expect(body.variables).toEqual({
            input: {
              type: 'related',
              issueId: 'lin-issue-1',
              relatedIssueId: 'lin-issue-2'
            }
          });
          return jsonResponse({
            data: {
              issueRelationCreate: {
                success: true,
                issueRelation: {
                  id: 'relation-related',
                  type: 'related'
                }
              }
            }
          });
        }
        expect(body.variables).toEqual({
          input: {
            type: 'blocks',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-2'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-blocks',
                type: 'blocks'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      parityLane: true,
      parityMatrix:
        '- Current: browser-first\n- Reference: Symphony terminal parity\n- Target: exact terminal parity\n- Out of scope: unrelated UI additions',
      blockedBySource: true,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2',
        title: 'Follow-up issue',
        description: finalDescription,
        url: 'https://linear.app/example/issue/CO-2',
        state: {
          id: 'state-backlog',
          name: 'Backlog',
          type: 'unstarted'
        },
        team: {
          id: 'lin-team-1',
          key: 'CO',
          name: 'Codex Orchestrator'
        },
          project: {
            id: 'lin-project-1',
            name: 'CO'
          },
          labels: ISSUE_LABEL_NODES
        },
      canonical_owner: null,
      relations: {
        related: true,
        blocked_by_source: true
      },
      source_setup: null
    });
    if (!result.ok) {
      throw new Error('expected create-follow-up to return traceability evidence');
    }
    expect(result.traceability.labels).toMatchObject({
      requested_labels: FOLLOW_UP_LABEL_NODES,
      observed_labels: ISSUE_LABEL_NODES,
      missing_label_ids: []
    });
    expect(result.traceability.relations).toMatchObject({
      related: {
        requested: true,
        satisfied: true,
        action: 'created',
        issue_id: 'lin-issue-1',
        related_issue_id: 'lin-issue-2'
      },
      blocked_by_source: {
        requested: true,
        satisfied: true,
        action: 'created',
        issue_id: 'lin-issue-1',
        related_issue_id: 'lin-issue-2'
      }
    });
    expect(result.traceability.packet).toMatchObject({
      packet_prefix: 'linear-lin-issue-2',
      observed_state: {
        id: 'state-backlog',
        name: 'Backlog',
        type: 'unstarted'
      },
      queue_admission_blocker: {
        reason: 'backlog_head_follow_up_traceability_pending',
        state: 'Backlog',
        enforced_by: 'provider-operator-autopilot'
      }
    });
  });

  it('derives create labels from live source labels and returns packet mirror scaffolding in the follow-up output', async () => {
    const liveSourceLabels = [
      {
        id: 'label-lifecycle-implementation-live',
        name: 'Lifecycle: Implementation',
        color: '#0e8a16'
      },
      {
        id: 'label-priority-p1-live',
        name: 'Priority: P1',
        color: '#fbca04'
      },
      {
        id: 'label-area-docs-live',
        name: 'Area: Docs Freshness',
        color: '#5319e7'
      },
      {
        id: 'label-feature-live',
        name: 'Feature',
        color: '#0e8a16'
      }
    ];
    const initialDescription = buildExpectedFollowUpDescription();
    const finalDescription = buildExpectedFollowUpDescription({
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(
          buildIssueContextBody({
            labels: buildIssueLabelsConnection(liveSourceLabels)
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            labelIds: liveSourceLabels.map((label) => label.id),
            description: initialDescription
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                labels: buildIssueLabelsConnection(liveSourceLabels),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                labels: buildIssueLabelsConnection(liveSourceLabels),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toEqual({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-2'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2',
        description: finalDescription,
        labels: liveSourceLabels
      },
      relations: {
        related: true,
        blocked_by_source: false
      }
    });
    if (!result.ok) {
      throw new Error('expected create-follow-up to return machine output');
    }
    expect(result.traceability).toMatchObject({
      labels: {
        source_issue: {
          id: 'lin-issue-1',
          identifier: 'CO-1'
        },
        requested_labels: liveSourceLabels,
        observed_labels: liveSourceLabels,
        missing_label_ids: []
      },
      relations: {
        related: {
          type: 'related',
          requested: true,
          satisfied: true,
          action: 'created',
          issue_id: 'lin-issue-1',
          related_issue_id: 'lin-issue-2'
        },
        blocked_by_source: {
          type: 'blocks',
          requested: false,
          satisfied: false,
          action: 'not_requested',
          issue_id: 'lin-issue-1',
          related_issue_id: 'lin-issue-2'
        }
      },
      packet: {
        packet_prefix: 'linear-lin-issue-2',
        observed_state: {
          id: 'state-backlog',
          name: 'Backlog',
          type: 'unstarted'
        },
        required_paths: [
          'docs/PRD-linear-lin-issue-2.md',
          'docs/TECH_SPEC-linear-lin-issue-2.md',
          'docs/ACTION_PLAN-linear-lin-issue-2.md',
          'tasks/specs/linear-lin-issue-2.md',
          'tasks/tasks-linear-lin-issue-2.md',
          '.agent/task/linear-lin-issue-2.md'
        ],
        registry_mirrors: [
          'tasks/index.json',
          'docs/TASKS.md',
          'docs/docs-freshness-registry.json'
        ],
        queue_admission_blocker: {
          reason: 'backlog_head_follow_up_traceability_pending',
          state: 'Backlog',
          enforced_by: 'provider-operator-autopilot'
        }
      }
    });
    expect(result.follow_up_issue.description).toContain('- Follow-up packet prefix: `linear-lin-issue-2`');
    expect(result.follow_up_issue.description).toContain(
      '- Create before active work: `docs/PRD-linear-lin-issue-2.md`, `docs/TECH_SPEC-linear-lin-issue-2.md`, `docs/ACTION_PLAN-linear-lin-issue-2.md`, `tasks/specs/linear-lin-issue-2.md`, `tasks/tasks-linear-lin-issue-2.md`, `.agent/task/linear-lin-issue-2.md`'
    );
    expect(result.follow_up_issue.description).toContain(
      '- Update registry mirrors before the issue leaves `Backlog`: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`'
    );
    expect(calls).toEqual(['issue-summary', 'create', 'update-description', 'related-relation']);
  });

  it('fails closed before creation when source labels cannot satisfy the follow-up label policy', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            labels: buildIssueLabelsConnection([
              {
                id: 'label-bug',
                name: 'Bug',
                color: '#d73a49'
              }
            ])
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('create-follow-up must not create an issue when required labels are unresolved');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_label_resolution_failed',
        status: 422,
        retryable: false,
        details: {
          missing_label_requirements: [
            'Lifecycle: Implementation',
            'Priority:*',
            'Area:*'
          ],
          available_labels: [
            {
              id: 'label-bug',
              name: 'Bug',
              color: '#d73a49'
            }
          ]
        }
      }
    });
  });

  it('fails closed with observed source labels when the required follow-up type label is missing', async () => {
    const observedLabels = [
      {
        id: 'label-lifecycle-implementation',
        name: 'Lifecycle: Implementation',
        color: '#0e8a16'
      },
      {
        id: 'label-priority-p2',
        name: 'Priority: P2',
        color: '#fbca04'
      },
      {
        id: 'label-provider-workflow',
        name: 'Area: Provider Workflow',
        color: '#5319e7'
      }
    ];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            labels: buildIssueLabelsConnection(observedLabels)
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('create-follow-up must not create an issue when the source type label is unresolved');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_label_resolution_failed',
        status: 422,
        retryable: false,
        details: {
          source_issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          missing_label_requirements: ['Bug|Improvement|Feature'],
          available_labels: observedLabels
        }
      }
    });
  });

  it('fails closed when created follow-up labels omit a requested live label', async () => {
    const initialDescription = buildExpectedFollowUpDescription();
    const finalDescription = buildExpectedFollowUpDescription({
      includeTraceability: true
    });
    const incompleteLabels = ISSUE_LABEL_NODES.filter((label) => label.id !== 'label-bug');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            labelIds: FOLLOW_UP_LABEL_IDS,
            description: initialDescription
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(incompleteLabels)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(incompleteLabels)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          labelIds: ['label-bug']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(incompleteLabels)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after incomplete label repair verification');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_label_assignment_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'label_update',
          requested_labels: FOLLOW_UP_LABEL_NODES,
          observed_labels: incompleteLabels,
          missing_label_ids: ['label-bug'],
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2'
          },
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2'
          }
        }
      }
    });
    expect(calls).toEqual(['create', 'update-description', 'label-update']);
  });

  it('repairs created follow-up labels when the create response label connection is paginated', async () => {
    const initialDescription = buildExpectedFollowUpDescription();
    const finalDescription = buildExpectedFollowUpDescription({
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            labelIds: FOLLOW_UP_LABEL_IDS,
            description: initialDescription
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: {
                  nodes: FOLLOW_UP_LABEL_NODES.map((label) => ({ ...label })),
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'label-cursor'
                  }
                }
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: {
                  nodes: FOLLOW_UP_LABEL_NODES.map((label) => ({ ...label })),
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'label-cursor'
                  }
                }
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          labelIds: FOLLOW_UP_LABEL_IDS
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-2'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2',
        description: finalDescription,
        labels: FOLLOW_UP_LABEL_NODES
      }
    });
    expect(calls).toEqual(['create', 'update-description', 'label-update', 'related-relation']);
  });

  it('repairs labels when the traceability description update returns paginated labels', async () => {
    const initialDescription = buildExpectedFollowUpDescription();
    const finalDescription = buildExpectedFollowUpDescription({
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: {
                  nodes: FOLLOW_UP_LABEL_NODES.map((label) => ({ ...label })),
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'label-cursor'
                  }
                }
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          labelIds: FOLLOW_UP_LABEL_IDS
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-2'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2',
        labels: FOLLOW_UP_LABEL_NODES
      }
    });
    expect(calls).toEqual(['create', 'update-description', 'label-update', 'related-relation']);
  });

  it('fails closed when plain follow-up label repair returns stale traceability', async () => {
    const initialDescription = buildExpectedFollowUpDescription();
    const finalDescription = buildExpectedFollowUpDescription({
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                labels: buildIssueLabelsConnection()
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                labels: {
                  nodes: FOLLOW_UP_LABEL_NODES.map((label) => ({ ...label })),
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'label-cursor'
                  }
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES)
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after stale plain follow-up traceability');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_description_update_incomplete',
        status: 409,
        details: {
          failed_step: 'label_update',
          expected_description: finalDescription,
          observed_description: initialDescription,
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            description: initialDescription,
            labels: FOLLOW_UP_LABEL_NODES
          }
        }
      }
    });
    expect(calls).toEqual(['create', 'update-description', 'label-update']);
  });

  it('stamps a new canonical owner before create label verification can fail', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const incompleteLabels = ISSUE_LABEL_NODES.filter((label) => label.id !== 'label-bug');
    let ownerSearchCount = 0;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        expect(body.variables).toMatchObject({
          marker: canonicalOwnerMarker
        });
        return jsonResponse(buildCanonicalOwnerIssuesBody([]));
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            labelIds: FOLLOW_UP_LABEL_IDS,
            description: initialDescription
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(incompleteLabels)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(incompleteLabels)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          labelIds: ['label-bug']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(incompleteLabels)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after incomplete canonical owner label repair verification');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_label_assignment_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'label_update',
          requested_labels: FOLLOW_UP_LABEL_NODES,
          observed_labels: incompleteLabels,
          missing_label_ids: ['label-bug'],
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            description: finalDescription
          },
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            description: finalDescription
          }
        }
      }
    });
    if (!result.ok) {
      expect(JSON.stringify(result.error.details?.created_issue ?? {})).toContain(canonicalOwnerMarker);
    }
    expect(calls).toEqual(['owner-search', 'create', 'update-description', 'owner-search', 'label-update']);
  });

  it('completes traceability for a retry-discovered stamped canonical owner before returning it', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-2',
              identifier: 'CO-2',
              title: 'Follow-up issue',
              description: initialDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('description-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        throw new Error('retry-discovered canonical owner must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-2'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2',
        description: finalDescription,
        labels: FOLLOW_UP_LABEL_NODES
      },
      canonical_owner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      }
    });
    expect(calls).toEqual(['owner-search', 'description-update', 'related-relation']);
  });

  it('fails closed when retry-discovered canonical owner traceability has arbitrary drift', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const driftedDescription = `${buildExpectedFollowUpDescription({
      canonicalOwnerKey
    })}\n\nUnexpected unmanaged edit.`;
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-2',
              identifier: 'CO-2',
              title: 'Follow-up issue',
              description: driftedDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES.filter((label) => label.id !== 'label-priority-p2')),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        throw new Error('arbitrary canonical owner drift must not be overwritten');
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        throw new Error('arbitrary canonical owner drift must fail before label repair');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after invalid canonical owner traceability');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_invalid',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_traceability_update',
          expected_description: finalDescription,
          observed_description: driftedDescription,
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            description: driftedDescription
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search']);
  });

  it('fails closed when retry-discovered traceability update returns a different description', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const wrongDescription = `${finalDescription}\n\nUnexpected trailing edit.`;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-2',
              identifier: 'CO-2',
              title: 'Follow-up issue',
              description: initialDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('description-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: wrongDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        throw new Error('label update must not run after incomplete traceability update');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after incomplete traceability update');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_update_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_traceability_update',
          expected_description: finalDescription,
          observed_description: wrongDescription,
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            description: wrongDescription
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'description-update']);
  });

  it('fails closed when retry-discovered traceability update drops requested labels', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const incompleteLabels = ISSUE_LABEL_NODES.filter((label) => label.id !== 'label-bug');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-2',
              identifier: 'CO-2',
              title: 'Follow-up issue',
              description: initialDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('description-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                labels: buildIssueLabelsConnection(incompleteLabels),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          labelIds: ['label-bug']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                labels: buildIssueLabelsConnection(incompleteLabels),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after traceability label repair verification fails');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_label_assignment_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_traceability_update',
          requested_labels: FOLLOW_UP_LABEL_NODES,
          observed_labels: incompleteLabels,
          missing_label_ids: ['label-bug'],
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            description: finalDescription
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'description-update', 'label-update']);
  });

  it('fails closed when post-traceability label repair returns stale traceability', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-2',
              identifier: 'CO-2',
              title: 'Follow-up issue',
              description: initialDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('description-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                labels: {
                  nodes: FOLLOW_UP_LABEL_NODES.map((label) => ({ ...label })),
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'label-cursor'
                  }
                },
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          labelIds: FOLLOW_UP_LABEL_IDS
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after stale traceability repair payload');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_update_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_traceability_update',
          expected_description: finalDescription,
          observed_description: initialDescription,
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            description: initialDescription,
            labels: FOLLOW_UP_LABEL_NODES
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'description-update', 'label-update']);
  });

  it('adds missing live labels to a reused canonical owner before returning it', async () => {
    const canonicalOwnerKey = 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-owner-issue',
      followUpIdentifier: 'CO-254'
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-owner-issue',
          labelIds: ['label-priority-p2', 'label-provider-workflow']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-owner-issue',
                identifier: 'CO-254',
                title: 'Existing canonical owner',
                description: canonicalOwnerDescription,
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        throw new Error('canonical owner reuse must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-owner-issue'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Existing canonical owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-owner-issue',
        identifier: 'CO-254',
        labels: ISSUE_LABEL_NODES
      },
      canonical_owner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      }
    });
    expect(calls).toEqual(['owner-search', 'label-update', 'related-relation']);
  });

  it('repairs canonical-owner labels before attempting source relations and reports relation evidence', async () => {
    const canonicalOwnerKey = 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-owner-issue',
      followUpIdentifier: 'CO-254'
    });
    const calls: string[] = [];
    const relationInputs: Record<string, unknown>[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection([ISSUE_LABEL_NODES[0]]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-owner-issue',
          labelIds: ['label-priority-p2', 'label-provider-workflow', 'label-bug']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-owner-issue',
                identifier: 'CO-254',
                title: 'Existing canonical owner',
                description: canonicalOwnerDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('canonical owner reuse must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        const input = body.variables?.input as Record<string, unknown>;
        relationInputs.push(input);
        calls.push(input.type === 'blocks' ? 'blocks-relation' : 'related-relation');
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: `relation-${input.type}`,
                type: input.type
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Existing canonical owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      blockedBySource: true,
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-owner-issue',
        identifier: 'CO-254',
        labels: FOLLOW_UP_LABEL_NODES
      },
      canonical_owner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      },
      relations: {
        related: true,
        blocked_by_source: true
      }
    });
    if (!result.ok) {
      throw new Error('expected canonical-owner reuse to return traceability evidence');
    }
    expect(result.traceability).toMatchObject({
      labels: {
        source_issue: {
          id: 'lin-issue-1',
          identifier: 'CO-1'
        },
        requested_labels: FOLLOW_UP_LABEL_NODES,
        observed_labels: FOLLOW_UP_LABEL_NODES,
        missing_label_ids: []
      },
      relations: {
        related: {
          type: 'related',
          requested: true,
          satisfied: true,
          action: 'created',
          issue_id: 'lin-issue-1',
          related_issue_id: 'lin-owner-issue'
        },
        blocked_by_source: {
          type: 'blocks',
          requested: true,
          satisfied: true,
          action: 'created',
          issue_id: 'lin-issue-1',
          related_issue_id: 'lin-owner-issue'
        }
      },
      packet: {
        packet_prefix: 'linear-lin-owner-issue',
        observed_state: {
          id: 'state-backlog',
          name: 'Backlog',
          type: 'unstarted'
        },
        queue_admission_blocker: {
          reason: 'backlog_head_follow_up_traceability_pending',
          state: 'Backlog',
          enforced_by: 'provider-operator-autopilot'
        }
      }
    });
    expect(relationInputs).toEqual([
      {
        type: 'related',
        issueId: 'lin-issue-1',
        relatedIssueId: 'lin-owner-issue'
      },
      {
        type: 'blocks',
        issueId: 'lin-issue-1',
        relatedIssueId: 'lin-owner-issue'
      }
    ]);
    expect(calls).toEqual(['owner-search', 'label-update', 'related-relation', 'blocks-relation']);
  });

  it('fails closed when canonical owner label update returns stale traceability', async () => {
    const canonicalOwnerKey = 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-owner-issue',
      followUpIdentifier: 'CO-254'
    });
    const staleDescription = [
      'Existing owner label update returned a stale body.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-owner-issue',
          labelIds: ['label-priority-p2', 'label-provider-workflow']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-owner-issue',
                identifier: 'CO-254',
                title: 'Existing canonical owner',
                description: staleDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after stale canonical owner label repair traceability');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Existing canonical owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_update_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_label_update',
          expected_description: canonicalOwnerDescription,
          observed_description: staleDescription,
          follow_up_issue: {
            id: 'lin-owner-issue',
            identifier: 'CO-254',
            description: staleDescription,
            labels: FOLLOW_UP_LABEL_NODES
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'label-update']);
  });

  it('fails closed when canonical owner label update rewrites only the source traceability line', async () => {
    const canonicalOwnerKey = 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*';
    const canonicalOwnerDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-owner-issue',
      followUpIdentifier: 'CO-254'
    });
    const sourceDriftDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-owner-issue',
      followUpIdentifier: 'CO-254',
      sourceIssueId: 'lin-issue-999',
      sourceIdentifier: 'CO-999'
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-owner-issue',
          labelIds: ['label-priority-p2', 'label-provider-workflow']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-owner-issue',
                identifier: 'CO-254',
                title: 'Existing canonical owner',
                description: sourceDriftDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after source-line drift in label repair response');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Existing canonical owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_update_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_label_update',
          expected_description: canonicalOwnerDescription,
          observed_description: sourceDriftDescription,
          follow_up_issue: {
            id: 'lin-owner-issue',
            identifier: 'CO-254',
            description: sourceDriftDescription,
            labels: FOLLOW_UP_LABEL_NODES
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'label-update']);
  });

  it('fails closed when canonical owner label update omits requested live labels', async () => {
    const canonicalOwnerKey = 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Existing owner still missing some queue labels after update.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const incompleteLabels = ISSUE_LABEL_NODES.filter((label) => label.id !== 'label-priority-p2');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-owner-issue',
          labelIds: ['label-priority-p2', 'label-provider-workflow']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-owner-issue',
                identifier: 'CO-254',
                title: 'Existing canonical owner',
                description: canonicalOwnerDescription,
                labels: buildIssueLabelsConnection(incompleteLabels),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after incomplete canonical owner label verification');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Existing canonical owner',
      description: 'Reuse and label the owner.',
      intentChecksum: '- Preserve canonical owner reuse.',
      nonGoals: '- [ ] Do not create duplicate owners.',
      notDoneIf: '- [ ] Reuse returns an unlabeled owner.',
      acceptanceCriteria: '- [ ] Owner has queue labels.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_label_assignment_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_label_update',
          requested_labels: FOLLOW_UP_LABEL_NODES,
          observed_labels: incompleteLabels,
          missing_label_ids: ['label-priority-p2'],
          follow_up_issue: {
            id: 'lin-owner-issue',
            identifier: 'CO-254'
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'label-update']);
  });

  it('preserves retryable failures when updating labels on a reused canonical owner', async () => {
    const canonicalOwnerKey = 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Existing owner missing some queue labels.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-owner-issue',
          labelIds: ['label-priority-p2', 'label-provider-workflow']
        });
        return new Response(
          JSON.stringify({
            errors: [
              {
                message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
                path: ['issueUpdate'],
                extensions: {
                  code: 'RATELIMITED',
                  statusCode: 429
                }
              }
            ]
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'retry-after': '3600',
              'x-ratelimit-requests-limit': '5000',
              'x-ratelimit-requests-remaining': '0',
              'x-ratelimit-requests-reset': '1774701380970'
            }
          }
        );
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after retryable label update failure');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Existing canonical owner',
      description: 'Reuse and label the owner.',
      intentChecksum: '- Preserve canonical owner reuse.',
      nonGoals: '- [ ] Do not create duplicate owners.',
      notDoneIf: '- [ ] Reuse returns an unlabeled owner.',
      acceptanceCriteria: '- [ ] Owner has queue labels.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        retryable: true,
        details: {
          failed_step: 'canonical_owner_label_update',
          missing_label_ids: ['label-priority-p2', 'label-provider-workflow'],
          follow_up_issue: {
            id: 'lin-owner-issue',
            identifier: 'CO-254'
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'label-update']);
  });

  it('preserves reused issue evidence when canonical owner label update returns paginated labels', async () => {
    const canonicalOwnerKey = 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Existing owner returns paginated queue labels after update.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-owner-issue',
          labelIds: ['label-priority-p2', 'label-provider-workflow']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-owner-issue',
                identifier: 'CO-254',
                title: 'Existing canonical owner',
                description: canonicalOwnerDescription,
                labels: {
                  nodes: FOLLOW_UP_LABEL_NODES.map((label) => ({ ...label })),
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'label-cursor'
                  }
                },
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after paginated canonical owner label verification');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Existing canonical owner',
      description: 'Reuse and label the owner.',
      intentChecksum: '- Preserve canonical owner reuse.',
      nonGoals: '- [ ] Do not create duplicate owners.',
      notDoneIf: '- [ ] Reuse returns an unlabeled owner.',
      acceptanceCriteria: '- [ ] Owner has queue labels.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_label_assignment_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_label_update',
          requested_labels: FOLLOW_UP_LABEL_NODES,
          observed_labels: null,
          missing_label_ids: FOLLOW_UP_LABEL_IDS,
          follow_up_issue: {
            id: 'lin-owner-issue',
            identifier: 'CO-254'
          },
          created_issue: {
            id: 'lin-owner-issue',
            identifier: 'CO-254'
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'label-update']);
  });

  it('reuses one open stamped canonical owner for the Apr 19 duplicate cluster without issueCreate', async () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-19|cadence_days:30';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      sourceIssueId: 'lin-issue-253',
      sourceIdentifier: 'CO-253',
      followUpId: 'lin-issue-254',
      followUpIdentifier: 'CO-254'
    });
    const sourceIssues = [
      { id: 'lin-issue-253', identifier: 'CO-253' },
      { id: 'lin-issue-256', identifier: 'CO-256' },
      { id: 'lin-issue-257', identifier: 'CO-257' },
      { id: 'lin-issue-258', identifier: 'CO-258' }
    ];
    const calls: string[] = [];
    let currentSourceIssueId: string | null = null;
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        const issueId = String(body.variables?.issueId ?? '');
        const source = sourceIssues.find((entry) => entry.id === issueId) ?? sourceIssues[0];
        currentSourceIssueId = source.id;
        return jsonResponse(
          buildIssueContextBody({
            id: source.id,
            identifier: source.identifier,
            url: `https://linear.app/example/issue/${source.identifier}`
          })
        );
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        expect(body.variables).toMatchObject({
          teamId: 'lin-team-1',
          projectId: 'lin-project-1',
          marker: canonicalOwnerMarker
        });
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        throw new Error('canonical owner reuse must not create another Apr 19 duplicate');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: currentSourceIssueId,
            relatedIssueId: 'lin-issue-254'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: `relation-${calls.length}`,
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    for (const source of sourceIssues) {
      const result = await createProviderLinearFollowUpIssue({
        issueId: source.id,
        title: 'Apr 19 spec/docs freshness baseline owner',
        description: 'Investigate the remaining improvement.',
        intentChecksum: '- Preserve exact `CO STATUS` wording.',
        nonGoals: '- [ ] Do not reopen the browser surface.',
        notDoneIf: '- [ ] The issue still allows browser-first parity.',
        acceptanceCriteria: '- [ ] Captured',
        canonicalOwnerKey,
        env: {
          CO_LINEAR_API_TOKEN: 'lin-api-token'
        },
        fetchImpl
      });

      expect(result).toMatchObject({
        ok: true,
        operation: 'create-follow-up',
        action: 'reused',
        issue: {
          id: source.id,
          identifier: source.identifier
        },
        follow_up_issue: {
          id: 'lin-issue-254',
          identifier: 'CO-254',
          description: canonicalOwnerDescription
        },
        canonical_owner: {
          key: canonicalOwnerKey,
          marker: canonicalOwnerMarker
        },
        relations: {
          related: true,
          blocked_by_source: false
        }
      });
    }

    expect(calls.filter((call) => call === 'owner-search')).toHaveLength(4);
    expect(calls.filter((call) => call === 'related-relation')).toHaveLength(4);
    expect(calls).not.toContain('create');
  });

  it('reuses a canonical owner when an earlier source issue bullet precedes managed traceability', async () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-19|cadence_days:30';
    const descriptionWithSourceBullet = [
      'Investigate the remaining improvement.',
      '## Immediate Traceability',
      '- Source issue: external audit note before generated traceability.',
      '- Context: not the managed packet traceability section.'
    ].join('\n');
    const canonicalOwnerDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      sourceIssueId: 'lin-issue-253',
      sourceIdentifier: 'CO-253',
      followUpId: 'lin-issue-254',
      followUpIdentifier: 'CO-254'
    }).replace('Investigate the remaining improvement.', descriptionWithSourceBullet);
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            id: 'lin-issue-256',
            identifier: 'CO-256',
            url: 'https://linear.app/example/issue/CO-256'
          })
        );
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        throw new Error('source-line tolerance must not update managed traceability for same canonical owner');
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('canonical owner reuse must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-256',
            relatedIssueId: 'lin-issue-254'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-256',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: descriptionWithSourceBullet,
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254',
        description: canonicalOwnerDescription
      }
    });
    expect(calls).toEqual(['owner-search', 'related-relation']);
  });

  it('fails closed when a source-line-tolerated canonical owner has appended drift', async () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-19|cadence_days:30';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const descriptionWithSourceBullet = [
      'Investigate the remaining improvement.',
      '## Immediate Traceability',
      '- Source issue: external audit note before generated traceability.',
      '- Context: not the managed packet traceability section.'
    ].join('\n');
    const currentSourceDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      sourceIssueId: 'lin-issue-256',
      sourceIdentifier: 'CO-256',
      followUpId: 'lin-issue-254',
      followUpIdentifier: 'CO-254'
    }).replace('Investigate the remaining improvement.', descriptionWithSourceBullet);
    const previousSourceDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      sourceIssueId: 'lin-issue-253',
      sourceIdentifier: 'CO-253',
      followUpId: 'lin-issue-254',
      followUpIdentifier: 'CO-254'
    }).replace('Investigate the remaining improvement.', descriptionWithSourceBullet);
    const driftedDescription = [
      previousSourceDescription,
      'Unexpected unmanaged edit.',
      [
        '## Immediate Traceability',
        '- Source issue: `CO-999` / `lin-issue-999` (https://linear.app/example/issue/CO-999)',
        '- Follow-up issue: `CO-254` / `lin-issue-254` (https://linear.app/example/issue/CO-254)',
        '- Follow-up packet prefix: `linear-lin-issue-254`'
      ].join('\n')
    ].join('\n\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            id: 'lin-issue-256',
            identifier: 'CO-256',
            url: 'https://linear.app/example/issue/CO-256'
          })
        );
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        expect(body.variables).toMatchObject({
          teamId: 'lin-team-1',
          projectId: 'lin-project-1',
          marker: canonicalOwnerMarker
        });
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: driftedDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        throw new Error('source-line-tolerated drift must fail closed before traceability repair');
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        throw new Error('source-line-tolerated drift must fail closed before label repair');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after source-line-tolerated drift');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-256',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: descriptionWithSourceBullet,
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_invalid',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_traceability_update',
          expected_description: currentSourceDescription,
          observed_description: driftedDescription,
          follow_up_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254',
            description: driftedDescription
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search']);
  });

  it('reuses a same-key generated canonical owner when packet text came from an earlier follow-up', async () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-19|cadence_days:30';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      sourceIssueId: 'lin-issue-253',
      sourceIdentifier: 'CO-253',
      followUpId: 'lin-issue-254',
      followUpIdentifier: 'CO-254'
    })
      .replace('Investigate the remaining improvement.', 'Keep the Apr 19 duplicate cluster on one owner.')
      .replace('- Preserve exact `CO STATUS` wording.', '- Preserve Apr 19 duplicate-cluster routing.');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            id: 'lin-issue-256',
            identifier: 'CO-256',
            url: 'https://linear.app/example/issue/CO-256'
          })
        );
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        expect(body.variables).toMatchObject({
          teamId: 'lin-team-1',
          projectId: 'lin-project-1',
          marker: canonicalOwnerMarker
        });
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        throw new Error('same-key generated owner from an earlier packet must not be rejected or rewritten');
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('same-key generated owner must be reused instead of creating another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-256',
            relatedIssueId: 'lin-issue-254'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-256',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254',
        description: canonicalOwnerDescription
      }
    });
    expect(calls).toEqual(['owner-search', 'related-relation']);
  });

  it('reuses an asterisk-bulleted oversized canonical owner marker without creating a duplicate', async () => {
    const canonicalOwnerKey =
      'baseline_cohort_id_sha256:8fe99c9bccb9aba10ce27a2ac178403a2f26b80a4445c8279f52b01da699ae2d';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Oversized baseline cohort owner.',
      '## Canonical Owner',
      `* Canonical owner key: \`${canonicalOwnerKey}\``,
      `* Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(
          buildIssueContextBody({
            id: 'lin-source-issue',
            identifier: 'CO-498',
            url: 'https://linear.app/example/issue/CO-498'
          })
        );
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        expect(body.variables).toMatchObject({
          teamId: 'lin-team-1',
          projectId: 'lin-project-1',
          marker: canonicalOwnerMarker
        });
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-434',
              title: 'CO: docs freshness owner for oversized baseline cohort',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-in-progress',
                name: 'In Progress',
                type: 'started'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        throw new Error('asterisk-bulleted canonical owner reuse must not create a duplicate');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-source-issue',
            relatedIssueId: 'lin-owner-issue'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-source-issue',
      title: 'CO: docs freshness owner for oversized baseline cohort',
      description: 'Keep the oversized baseline cohort on one stamped owner.',
      intentChecksum: '- Preserve exact oversized baseline canonical owner routing.',
      nonGoals: '- [ ] Do not create duplicate oversized owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-owner-issue',
        identifier: 'CO-434',
        description: canonicalOwnerDescription
      },
      canonical_owner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      }
    });
    expect(calls).toEqual(['owner-search', 'related-relation']);
  });

  it('reuses a legacy canonical owner with ordinary task headings', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:legacy-task-headings';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Legacy canonical owner with a task checklist.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '## Acceptance Criteria',
      '- [ ] Keep one owner for this cohort.',
      '## Not Done If',
      '- [ ] A repeated lane creates a duplicate owner.'
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-owner-issue',
              identifier: 'CO-434',
              title: 'Legacy canonical owner',
              description: canonicalOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-in-progress',
                name: 'In Progress',
                type: 'started'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        throw new Error('legacy task headings must not force managed traceability rewrite');
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-owner-issue',
          labelIds: ['label-priority-p2', 'label-provider-workflow']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-owner-issue',
                identifier: 'CO-434',
                title: 'Legacy canonical owner',
                description: canonicalOwnerDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-in-progress',
                  name: 'In Progress',
                  type: 'started'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('legacy canonical owner reuse must not create a duplicate');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-owner-issue'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Legacy canonical owner',
      description: 'Keep the legacy owner.',
      intentChecksum: '- Preserve legacy canonical owner routing.',
      nonGoals: '- [ ] Do not create duplicate owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-owner-issue',
        identifier: 'CO-434',
        description: canonicalOwnerDescription,
        labels: FOLLOW_UP_LABEL_NODES
      }
    });
    expect(calls).toEqual(['owner-search', 'label-update', 'related-relation']);
  });

  it('pages through canonical owner search results before selecting a reusable owner', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '',
      '## Immediate Traceability',
      '* Follow-up packet prefix: `linear-lin-issue-254`'
    ].join('\n');
    const longerCanonicalOwnerMarker = `${canonicalOwnerMarker}-other`;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push(`owner-search:${body.variables?.after ?? 'first'}`);
        expect(body.variables).toMatchObject({
          teamId: 'lin-team-1',
          projectId: 'lin-project-1',
          marker: canonicalOwnerMarker,
          first: 50
        });
        if (body.variables?.after === null) {
          return jsonResponse(
            buildCanonicalOwnerIssuesBody([
              buildCanonicalOwnerIssue({
                id: 'lin-issue-300',
                identifier: 'CO-300',
                title: 'Prefix-only canonical owner',
                description: [
                  'Different owner.',
                  '## Canonical Owner',
                  `- Canonical owner key: \`${canonicalOwnerKey}-other\``,
                  `- Canonical owner marker: \`${longerCanonicalOwnerMarker}\``
                ].join('\n'),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            ], {
              hasNextPage: true,
              endCursor: 'owner-cursor-1'
            })
          );
        }
        expect(body.variables?.after).toBe('owner-cursor-1');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        throw new Error('later-page canonical owner reuse must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-254'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep duplicate lanes on one owner.',
      intentChecksum: '- Preserve Apr 19 owner routing.',
      nonGoals: '- [ ] Do not create duplicates.',
      notDoneIf: '- [ ] Repeated lanes create fresh owners.',
      acceptanceCriteria: '- [ ] Later-page owners are reused.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254'
      },
      traceability: {
        packet: {
          packet_prefix: 'linear-lin-issue-254',
          observed_state: {
            id: 'state-backlog',
            name: 'Backlog',
            type: 'unstarted'
          },
          queue_admission_blocker: {
            reason: 'backlog_head_follow_up_traceability_pending',
            state: 'Backlog',
            enforced_by: 'provider-operator-autopilot'
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search:first', 'owner-search:owner-cursor-1', 'related-relation']);
  });

  it('sorts canonical owners numerically when the Linear team key contains digits', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:accessibility-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Accessibility baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-10',
              identifier: 'A11Y-10',
              title: 'Newer accessibility owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-9',
              identifier: 'A11Y-9',
              title: 'Older accessibility owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        throw new Error('alphanumeric team-key owner reuse must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-9'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Accessibility docs freshness baseline owner',
      description: 'Keep duplicate lanes on one owner.',
      intentChecksum: '- Preserve accessibility owner routing.',
      nonGoals: '- [ ] Do not create duplicates.',
      notDoneIf: '- [ ] Repeated lanes create fresh owners.',
      acceptanceCriteria: '- [ ] The oldest alphanumeric-team owner is reused.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-9',
        identifier: 'A11Y-9'
      }
    });
    expect(calls).toEqual(['owner-search', 'related-relation']);
  });

  it('fails closed when canonical owner pagination repeats a cursor', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push(`owner-search:${body.variables?.after ?? 'first'}`);
        expect(body.variables).toMatchObject({
          marker: canonicalOwnerMarker,
          first: 50
        });
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([], {
            hasNextPage: true,
            endCursor: 'owner-cursor-1'
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        throw new Error('reused pagination cursors must fail closed before create');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep duplicate lanes on one owner.',
      intentChecksum: '- Preserve Apr 19 owner routing.',
      nonGoals: '- [ ] Do not create duplicates.',
      notDoneIf: '- [ ] Repeated lanes create fresh owners.',
      acceptanceCriteria: '- [ ] Later-page owners are reused.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_canonical_owner_pagination_reused_cursor',
        status: 503
      }
    });
    expect(calls).toEqual(['owner-search:first', 'owner-search:owner-cursor-1']);
  });

  it('reuses the source issue itself as canonical owner without self relations', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '',
      '## Immediate Traceability',
      '- Follow-up packet prefix: `linear-lin-issue-254`'
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(
          buildIssueContextBody({
            id: 'lin-issue-254',
            identifier: 'CO-254',
            title: 'Apr 19 spec/docs freshness baseline owner',
            url: 'https://linear.app/example/issue/CO-254'
          })
        );
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('source owner reuse must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('source owner reuse must not create a self relation');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-254',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep the Apr 19 duplicate cluster on one owner.',
      intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
      nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      blockedBySource: true,
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254'
      },
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254',
        description: canonicalOwnerDescription
      },
      relations: {
        related: true,
        blocked_by_source: true
      }
    });
    if (!result.ok) {
      throw new Error('expected source owner reuse to return traceability evidence');
    }
    expect(result.traceability.relations).toMatchObject({
      related: {
        requested: true,
        satisfied: false,
        action: 'skipped_self',
        issue_id: 'lin-issue-254',
        related_issue_id: 'lin-issue-254'
      },
      blocked_by_source: {
        requested: true,
        satisfied: false,
        action: 'skipped_self',
        issue_id: 'lin-issue-254',
        related_issue_id: 'lin-issue-254'
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search']);
  });

  it('treats already-existing canonical owner relations as reuse success', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '',
      '## Immediate Traceability',
      '- Follow-up packet prefix: `linear-lin-issue-254`'
    ].join('\n');
    const calls: string[] = [];
    const relationInputs: Record<string, unknown>[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('canonical owner existing relation reuse must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        const input = body.variables?.input as Record<string, unknown> | undefined;
        relationInputs.push(input ?? {});
        calls.push(input?.type === 'blocks' ? 'blocks-relation' : 'related-relation');
        return jsonResponse({
          errors: [
            {
              message: 'Issue relation already exists.',
              extensions: {
                code: 'RELATION_ALREADY_EXISTS'
              }
            }
          ]
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep the Apr 19 duplicate cluster on one owner.',
      intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
      nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      blockedBySource: true,
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254'
      },
      relations: {
        related: true,
        blocked_by_source: true
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search', 'related-relation', 'blocks-relation']);
    expect(relationInputs).toEqual([
      {
        type: 'related',
        issueId: 'lin-issue-1',
        relatedIssueId: 'lin-issue-254'
      },
      {
        type: 'blocks',
        issueId: 'lin-issue-1',
        relatedIssueId: 'lin-issue-254'
      }
    ]);
  });

  it('does not report a Backlog queue blocker for reused owners with packet mirrors present', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-linear-follow-up-packet-'));
    tempDirs.push(repoRoot);
    await seedFollowUpPacketReadiness(repoRoot, 'linear-lin-issue-254');
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '',
      '## Immediate Traceability',
      '- Follow-up packet prefix: `linear-lin-issue-254`'
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('canonical owner reuse with ready packet must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        const input = body.variables?.input as Record<string, unknown> | undefined;
        calls.push(input?.type === 'blocks' ? 'blocks-relation' : 'related-relation');
        return jsonResponse({
          errors: [
            {
              message: 'Issue relation already exists.',
              extensions: {
                code: 'RELATION_ALREADY_EXISTS'
              }
            }
          ]
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep the Apr 19 duplicate cluster on one owner.',
      intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
      nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      blockedBySource: true,
      canonicalOwnerKey,
      repoRoot,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254'
      },
      traceability: {
        packet: {
          packet_prefix: 'linear-lin-issue-254',
          observed_state: {
            id: 'state-backlog',
            name: 'Backlog',
            type: 'unstarted'
          },
          readiness: {
            checked: true,
            description_has_packet_prefix: true,
            ready: true,
            missing_paths: [],
            missing_registry_mirrors: []
          },
          canonical_task_id: '20260508-linear-lin-issue-254',
          canonical_task_id_pattern: '^\\d{8}-linear-lin-issue-254$',
          queue_admission_blocker: null
        }
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search', 'related-relation', 'blocks-relation']);
  });

  it('keeps packet readiness blocked when the packet prefix only appears inside a fenced example', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-linear-follow-up-packet-'));
    tempDirs.push(repoRoot);
    await seedFollowUpPacketReadiness(repoRoot, 'linear-lin-issue-254');
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '',
      '## Immediate Traceability',
      '```md',
      '- Follow-up packet prefix: `linear-lin-issue-254`',
      '```'
    ].join('\n');
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('canonical owner reuse with existing owner must not create another issue');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        return jsonResponse({
          errors: [
            {
              message: 'Issue relation already exists.',
              extensions: {
                code: 'RELATION_ALREADY_EXISTS'
              }
            }
          ]
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep the Apr 19 duplicate cluster on one owner.',
      intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
      nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      canonicalOwnerKey,
      repoRoot,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      traceability: {
        packet: {
          readiness: {
            checked: true,
            description_has_packet_prefix: false,
            ready: false,
            missing_paths: [],
            missing_registry_mirrors: []
          },
          queue_admission_blocker: {
            reason: 'backlog_head_follow_up_traceability_pending',
            state: 'Backlog',
            enforced_by: 'create-follow-up'
          }
        }
      }
    });
  });

  it('keeps packet readiness blocked when registry mirror evidence is incomplete or invalid', async () => {
    const followUpTaskId = 'linear-lin-issue-254';
    const requiredPaths = [
      `docs/PRD-${followUpTaskId}.md`,
      `docs/TECH_SPEC-${followUpTaskId}.md`,
      `docs/ACTION_PLAN-${followUpTaskId}.md`,
      `tasks/specs/${followUpTaskId}.md`,
      `tasks/tasks-${followUpTaskId}.md`,
      `.agent/task/${followUpTaskId}.md`
    ];
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '',
      '## Immediate Traceability',
      '- Follow-up packet prefix: `linear-lin-issue-254`'
    ].join('\n');
    const runWithRepoRoot = async (repoRoot: string) => {
      const calls: string[] = [];
      const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          query?: string;
          variables?: Record<string, unknown>;
        };
        if (body.query?.includes('ProviderLinearIssueSummary')) {
          calls.push('issue-summary');
          return jsonResponse(buildIssueContextBody());
        }
        if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
          calls.push('owner-search');
          return jsonResponse(
            buildCanonicalOwnerIssuesBody([
              buildCanonicalOwnerIssue({
                id: 'lin-issue-254',
                identifier: 'CO-254',
                title: 'Apr 19 spec/docs freshness baseline owner',
                description: canonicalOwnerDescription,
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            ])
          );
        }
        if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
          const input = body.variables?.input as Record<string, unknown> | undefined;
          calls.push(input?.type === 'blocks' ? 'blocks-relation' : 'related-relation');
          return jsonResponse({
            errors: [
              {
                message: 'Issue relation already exists.',
                extensions: {
                  code: 'RELATION_ALREADY_EXISTS'
                }
              }
            ]
          });
        }
        throw new Error(`Unexpected query: ${body.query}`);
      });

      const result = await createProviderLinearFollowUpIssue({
        issueId: 'lin-issue-1',
        title: 'Apr 19 spec/docs freshness baseline owner',
        description: 'Keep the Apr 19 duplicate cluster on one owner.',
        intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
        nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
        notDoneIf: '- [ ] A repeated lane creates a new owner.',
        acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
        blockedBySource: true,
        canonicalOwnerKey,
        repoRoot,
        env: {
          CO_LINEAR_API_TOKEN: 'lin-api-token'
        },
        fetchImpl
      });
      expect(calls).toEqual(['issue-summary', 'owner-search', 'related-relation', 'blocks-relation']);
      return result;
    };

    const invalidRegistryRoot = await mkdtemp(join(tmpdir(), 'provider-linear-follow-up-invalid-registry-'));
    tempDirs.push(invalidRegistryRoot);
    await seedFollowUpPacketReadiness(invalidRegistryRoot, followUpTaskId);
    await writeFile(
      join(invalidRegistryRoot, 'docs/docs-freshness-registry.json'),
      JSON.stringify({
        entries: requiredPaths.map((path) => ({ path }))
      })
    );
    await expect(runWithRepoRoot(invalidRegistryRoot)).resolves.toMatchObject({
      ok: true,
      traceability: {
        packet: {
          readiness: {
            ready: false,
            missing_registry_mirrors: ['docs/docs-freshness-registry.json']
          },
          queue_admission_blocker: {
            reason: 'backlog_head_follow_up_traceability_pending',
            state: 'Backlog'
          }
        }
      }
    });

    const inactiveRegistryRoot = await mkdtemp(join(tmpdir(), 'provider-linear-follow-up-inactive-registry-'));
    tempDirs.push(inactiveRegistryRoot);
    await seedFollowUpPacketReadiness(inactiveRegistryRoot, followUpTaskId);
    await writeFile(
      join(inactiveRegistryRoot, 'docs/docs-freshness-registry.json'),
      JSON.stringify({
        entries: requiredPaths.map((path) => ({
          path,
          owner: 'Codex (top-level agent), Review agent',
          status: 'preserved_historical_stub',
          last_review: '2026-05-08',
          cadence_days: 30
        }))
      })
    );
    await expect(runWithRepoRoot(inactiveRegistryRoot)).resolves.toMatchObject({
      ok: true,
      traceability: {
        packet: {
          readiness: {
            ready: false,
            missing_registry_mirrors: ['docs/docs-freshness-registry.json']
          },
          queue_admission_blocker: {
            reason: 'backlog_head_follow_up_traceability_pending',
            state: 'Backlog'
          }
        }
      }
    });

    const incompleteTasksRoot = await mkdtemp(join(tmpdir(), 'provider-linear-follow-up-incomplete-tasks-'));
    tempDirs.push(incompleteTasksRoot);
    await seedFollowUpPacketReadiness(incompleteTasksRoot, followUpTaskId);
    await writeFile(
      join(incompleteTasksRoot, 'docs/TASKS.md'),
      `Task packet ${followUpTaskId} is still missing docs mirror evidence.\n`
    );
    await expect(runWithRepoRoot(incompleteTasksRoot)).resolves.toMatchObject({
      ok: true,
      traceability: {
        packet: {
          readiness: {
            ready: false,
            missing_registry_mirrors: ['docs/TASKS.md']
          },
          queue_admission_blocker: {
            reason: 'backlog_head_follow_up_traceability_pending',
            state: 'Backlog'
          }
        }
      }
    });
  });

  it('does not treat missing relation GraphQL errors as already satisfied', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        const input = body.variables?.input as Record<string, unknown> | undefined;
        calls.push(input?.type === 'blocks' ? 'blocks-relation' : 'related-relation');
        expect(input).toMatchObject({
          type: 'related',
          issueId: 'lin-issue-1',
          relatedIssueId: 'lin-issue-254'
        });
        return jsonResponse({
          errors: [
            {
              message: 'Issue relation does not exist.',
              extensions: {
                code: 'RELATION_DOES_NOT_EXIST'
              }
            }
          ]
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep the Apr 19 duplicate cluster on one owner.',
      intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
      nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      blockedBySource: true,
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        status: 409,
        details: {
          failed_relation_type: 'related',
          follow_up_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254'
          }
        }
      }
    });
    if (result.ok) {
      throw new Error('expected relation GraphQL error to fail');
    }
    expect(result.error.details).not.toHaveProperty('created_issue');
    expect(calls).toEqual(['issue-summary', 'owner-search', 'related-relation']);
  });

  it('reuses a stamped canonical owner when budget is below the create-path floor', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '4',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('low-budget canonical owner reuse must not require issueCreate');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep the Apr 19 duplicate cluster on one owner.',
      intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
      nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      canonicalOwnerKey,
      env,
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254'
      },
      traceability: {
        packet: {
          packet_prefix: 'linear-lin-issue-254',
          observed_state: {
            id: 'state-backlog',
            name: 'Backlog',
            type: 'unstarted'
          },
          queue_admission_blocker: {
            reason: 'backlog_head_follow_up_traceability_pending',
            state: 'Backlog',
            enforced_by: 'create-follow-up'
          }
        }
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search', 'related-relation']);
  });

  it('fails before reusing a canonical owner when budget cannot cover traceability label repair', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const resetAt = String(Date.now() + 60_000);
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '6',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody(), 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '5',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: initialDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ]),
          200,
          {
            'x-ratelimit-requests-limit': '100',
            'x-ratelimit-requests-remaining': '3',
            'x-ratelimit-requests-reset': resetAt
          }
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        throw new Error('owner label repair must not run when remaining budget cannot cover possible post-traceability repair');
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        throw new Error('owner traceability repair must not run when remaining budget cannot cover possible post-traceability repair');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after owner repair budget preflight fails');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true,
          required_requests_remaining: 3,
          request_headroom_reserve_bucket: 'requests',
          request_headroom_remaining: 3,
          request_headroom_usable_remaining: 2
        }
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search']);
  });

  it('reports invalid canonical owner traceability before low-budget mutation preflight', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const resetAt = String(Date.now() + 60_000);
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const expectedDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const driftedDescription = `${expectedDescription}\n\nUnexpected unmanaged edit.`;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody(), 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '4',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-2',
              identifier: 'CO-2',
              title: 'Existing canonical owner',
              description: driftedDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ]),
          200,
          {
            'x-ratelimit-requests-limit': '100',
            'x-ratelimit-requests-remaining': '0',
            'x-ratelimit-requests-reset': resetAt
          }
        );
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        throw new Error('invalid canonical owner traceability must fail before description repair');
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        throw new Error('invalid canonical owner traceability must fail before label repair');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('invalid canonical owner traceability must fail before relation creation');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env,
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_invalid',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_traceability_update',
          expected_description: expectedDescription,
          observed_description: driftedDescription
        }
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search']);
  });

  it('reuses a stamped canonical owner before requiring a Backlog creation state', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(
          buildIssueContextBody({
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator',
              states: {
                nodes: [
                  {
                    id: 'state-in-progress',
                    name: 'In Progress',
                    type: 'started'
                  }
                ]
              }
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-in-progress',
                name: 'In Progress',
                type: 'started'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('canonical owner reuse must not require Backlog state creation');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep the Apr 19 duplicate cluster on one owner.',
      intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
      nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254'
      },
      traceability: {
        packet: {
          packet_prefix: 'linear-lin-issue-254',
          observed_state: {
            id: 'state-in-progress',
            name: 'In Progress',
            type: 'started'
          },
          queue_admission_blocker: null
        }
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search', 'related-relation']);
  });

  it('fails closed when a stamped canonical owner has paginated labels', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Apr 19 spec/docs freshness baseline owner',
              description: canonicalOwnerDescription,
              labels: {
                nodes: ISSUE_LABEL_NODES.map((label) => ({ ...label })),
                pageInfo: {
                  hasNextPage: true,
                  endCursor: 'label-cursor'
                }
              },
              state: {
                id: 'state-in-progress',
                name: 'In Progress',
                type: 'started'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('paginated canonical owner labels must not create a duplicate owner');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Apr 19 spec/docs freshness baseline owner',
      description: 'Keep the Apr 19 duplicate cluster on one owner.',
      intentChecksum: '- Preserve Apr 19 spec/docs freshness baseline owner routing.',
      nonGoals: '- [ ] Do not create duplicate Apr 19 owner issues.',
      notDoneIf: '- [ ] A repeated lane creates a new owner.',
      acceptanceCriteria: '- [ ] Repeated lanes reuse the stamped owner.',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_canonical_owner_labels_invalid',
        status: 503,
        details: {
          canonical_owner_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254'
          },
          label_limit: expect.any(Number)
        }
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search']);
  });

  it('does not reuse terminal CO-254-style canonical owners and stamps the new owner', async () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-19|cadence_days:30';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Done Apr 19 owner',
              description: `## Canonical Owner\n- Canonical owner marker: \`${canonicalOwnerMarker}\``,
              state: {
                id: 'state-done',
                name: 'Done',
                type: null
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-255',
              identifier: 'CO-255',
              title: 'Duplicate Apr 19 owner',
              description: `## Canonical Owner\n- Canonical owner marker: \`${canonicalOwnerMarker}\``,
              state: {
                id: 'state-duplicate',
                name: 'Duplicate',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-256',
              identifier: 'CO-256',
              title: 'Cancelled Apr 19 owner',
              description: `## Canonical Owner\n- Canonical owner marker: \`${canonicalOwnerMarker}\``,
              state: {
                id: 'state-cancelled',
                name: 'Cancelled',
                type: 'cancelled'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            labelIds: FOLLOW_UP_LABEL_IDS,
            description: initialDescription
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });
    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2',
        description: finalDescription
      },
      canonical_owner: {
        key: canonicalOwnerKey,
        marker: canonicalOwnerMarker
      }
    });
    expect(calls).toEqual(['owner-search', 'create', 'update-description', 'owner-search', 'related-relation']);
  });

  it('does not reuse prefix matches, diff additions, or copied/nested marker examples', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:co-1';
    const longerCanonicalOwnerKey = 'baseline_cohort_id:co-10';
    const longerCanonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${longerCanonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-10',
              identifier: 'CO-10',
              title: 'Different canonical owner',
              description: [
                'Different owner.',
                '## Canonical Owner',
                `- Canonical owner key: \`${longerCanonicalOwnerKey}\``,
                `- Canonical owner marker: \`${longerCanonicalOwnerMarker}\``
              ].join('\n'),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-11',
              identifier: 'CO-11',
              title: 'Patch example with marker',
              description: [
                'Patch excerpt, not an owner stamp.',
                '```diff',
                `+ Canonical owner marker: \`codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}\``,
                '```'
              ].join('\n'),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-12',
              identifier: 'CO-12',
              title: 'Checklist copy with marker',
              description: [
                'Copied checklist, not an owner stamp.',
                `* Canonical owner marker: \`codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}\``
              ].join('\n'),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-13',
              identifier: 'CO-13',
              title: 'Fenced owner example',
              description: [
                'Copied example, not an owner stamp.',
                '```md',
                '## Canonical Owner',
                `* Canonical owner marker: \`codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}\``,
                '```'
              ].join('\n'),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-14',
              identifier: 'CO-14',
              title: 'Nested owner marker example',
              description: [
                'Copied nested example, not an owner stamp.',
                '## Canonical Owner',
                '- Example:',
                `  * Canonical owner marker: \`codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}\``
              ].join('\n'),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-15',
              identifier: 'CO-15',
              title: 'Indented code owner marker example',
              description: [
                'Copied indented code example, not an owner stamp.',
                '## Canonical Owner',
                `    * Canonical owner marker: \`codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}\``
              ].join('\n'),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            labelIds: FOLLOW_UP_LABEL_IDS,
            description: initialDescription
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            relatedIssueId: 'lin-issue-2'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2'
      }
    });
    expect(calls).toEqual(['owner-search', 'create', 'update-description', 'owner-search', 'related-relation']);
  });

  it('does not reuse an exact stamped canonical owner from another team or project', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-other-project',
              identifier: 'CO-300',
              title: 'Wrong project owner',
              description: [
                'Same marker but wrong scope.',
                '## Canonical Owner',
                `- Canonical owner key: \`${canonicalOwnerKey}\``,
                `- Canonical owner marker: \`${canonicalOwnerMarker}\``
              ].join('\n'),
              team: {
                id: 'lin-team-other',
                key: 'OPS',
                name: 'Operations'
              },
              project: {
                id: 'lin-project-other',
                name: 'Other'
              },
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-2'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2'
      }
    });
    expect(calls).toEqual(['owner-search', 'create', 'update-description', 'owner-search', 'related-relation']);
  });

  it('stamps a canonical owner marker before the traceability update succeeds', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(buildCanonicalOwnerIssuesBody([]));
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            labelIds: FOLLOW_UP_LABEL_IDS,
            description: initialDescription
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          errors: [{ message: 'description update failed' }]
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not be created when canonical owner stamping fails');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        status: 409,
        details: {
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            description: initialDescription
          },
          failed_step: 'description_update'
        }
      }
    });
    if (!result.ok) {
      const createdIssue = result.error.details?.created_issue as { description?: string } | undefined;
      expect(String(createdIssue?.description ?? '')).toContain(canonicalOwnerMarker);
      expect(JSON.stringify(createdIssue)).toContain(canonicalOwnerMarker);
    }
    expect(calls).toEqual(['owner-search', 'create', 'update-description']);
  });

  it('reconciles a post-create canonical owner race before relation handoff', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const supersededMarker = `codex-orchestrator:superseded-canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    })
      .replaceAll('CO-2', 'CO-260')
      .replaceAll('lin-issue-2', 'lin-issue-260')
      .replaceAll('linear-lin-issue-2', 'linear-lin-issue-260');
    let finalizedCreatedDescription = finalDescription;
    const buildExpectedSupersededDescription = () => [
      finalizedCreatedDescription.replaceAll(canonicalOwnerMarker, supersededMarker),
      [
        '## Superseded Canonical Owner',
        '- Created issue: `CO-260`',
        '- Reused canonical owner: `CO-254`',
        `- Canonical owner key: \`${canonicalOwnerKey}\``,
        '- Reason: another stamped owner for this key existed before relation handoff; this issue is no longer a reusable canonical owner.'
      ].join('\n')
    ].join('\n\n');
    let ownerSearchCount = 0;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-260',
              identifier: 'CO-260',
              title: 'Race-created owner',
              description: finalizedCreatedDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: [
                'Existing owner.',
                '## Canonical Owner',
                `- Canonical owner key: \`${canonicalOwnerKey}\``,
                `- Canonical owner marker: \`${canonicalOwnerMarker}\``
              ].join('\n'),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-260',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        if (calls.includes('update-description') === false) {
          finalizedCreatedDescription = String((body.variables as Record<string, unknown>).description ?? '');
          calls.push('update-description');
          return jsonResponse({
            data: {
              issueUpdate: {
                success: true,
                issue: {
                  id: 'lin-issue-260',
                  identifier: 'CO-260',
                  title: 'Race-created owner',
                  description: finalizedCreatedDescription,
                  url: 'https://linear.app/example/issue/CO-260',
                  state: {
                    id: 'state-backlog',
                    name: 'Backlog',
                    type: 'unstarted'
                  },
                  team: {
                    id: 'lin-team-1',
                    key: 'CO',
                    name: 'Codex Orchestrator'
                  },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
          });
        }
        calls.push('supersede-created-owner');
        expect(body.variables).toEqual({
          id: 'lin-issue-260',
          description: buildExpectedSupersededDescription()
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: buildExpectedSupersededDescription(),
                url: 'https://linear.app/example/issue/CO-260',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                }
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-254'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Race-created owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });
    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254'
      }
    });
    expect(calls).toEqual([
      'owner-search',
      'create',
      'update-description',
      'owner-search',
      'supersede-created-owner',
      'related-relation'
    ]);
  });

  it('fails closed when reconciled canonical owner label repair changes a legacy description', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const supersededMarker = `codex-orchestrator:superseded-canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalCreatedDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-issue-260',
      followUpIdentifier: 'CO-260'
    });
    const selectedOwnerDescription = [
      'Existing legacy owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``,
      '## Acceptance Criteria',
      '- [ ] Keep one owner for this cohort.'
    ].join('\n');
    const changedOwnerDescription = [
      'Changed legacy owner body from label update.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const supersededDescription = [
      finalCreatedDescription.replaceAll(canonicalOwnerMarker, supersededMarker),
      [
        '## Superseded Canonical Owner',
        '- Created issue: `CO-260`',
        '- Reused canonical owner: `CO-254`',
        `- Canonical owner key: \`${canonicalOwnerKey}\``,
        '- Reason: another stamped owner for this key existed before relation handoff; this issue is no longer a reusable canonical owner.'
      ].join('\n')
    ].join('\n\n');
    let ownerSearchCount = 0;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-260',
              identifier: 'CO-260',
              title: 'Race-created owner',
              description: finalCreatedDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: selectedOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: initialDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        if (!calls.includes('update-description')) {
          calls.push('update-description');
          return jsonResponse({
            data: {
              issueUpdate: {
                success: true,
                issue: buildCanonicalOwnerIssue({
                  id: 'lin-issue-260',
                  identifier: 'CO-260',
                  title: 'Race-created owner',
                  description: finalCreatedDescription,
                  labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                  state: {
                    id: 'state-backlog',
                    name: 'Backlog',
                    type: 'unstarted'
                  }
                })
              }
            }
          });
        }
        calls.push('supersede-created-owner');
        expect(body.variables).toEqual({
          id: 'lin-issue-260',
          description: supersededDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: supersededDescription,
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        calls.push('label-update');
        expect(body.variables).toEqual({
          id: 'lin-issue-254',
          labelIds: ['label-priority-p2', 'label-provider-workflow']
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-254',
                identifier: 'CO-254',
                title: 'Existing canonical owner',
                description: changedOwnerDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after reconciled owner label repair changes legacy description');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Race-created owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_update_incomplete',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'label_update',
          expected_description: buildExpectedFollowUpDescriptionForIssue({
            canonicalOwnerKey,
            includeTraceability: true,
            followUpId: 'lin-issue-254',
            followUpIdentifier: 'CO-254'
          }),
          observed_description: changedOwnerDescription,
          follow_up_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254',
            description: changedOwnerDescription,
            labels: FOLLOW_UP_LABEL_NODES
          },
          created_issue: {
            id: 'lin-issue-260',
            identifier: 'CO-260'
          }
        }
      }
    });
    expect(calls).toEqual([
      'owner-search',
      'create',
      'update-description',
      'owner-search',
      'supersede-created-owner',
      'label-update'
    ]);
  });

  it('fails closed before label repair when reconciled canonical owner traceability has managed drift', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const supersededMarker = `codex-orchestrator:superseded-canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalCreatedDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-issue-260',
      followUpIdentifier: 'CO-260'
    });
    const expectedOwnerDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-issue-254',
      followUpIdentifier: 'CO-254'
    });
    const driftedOwnerDescription = `${expectedOwnerDescription}\n\nUnexpected unmanaged edit.`;
    const supersededDescription = [
      finalCreatedDescription.replaceAll(canonicalOwnerMarker, supersededMarker),
      [
        '## Superseded Canonical Owner',
        '- Created issue: `CO-260`',
        '- Reused canonical owner: `CO-254`',
        `- Canonical owner key: \`${canonicalOwnerKey}\``,
        '- Reason: another stamped owner for this key existed before relation handoff; this issue is no longer a reusable canonical owner.'
      ].join('\n')
    ].join('\n\n');
    let ownerSearchCount = 0;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-260',
              identifier: 'CO-260',
              title: 'Race-created owner',
              description: finalCreatedDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: driftedOwnerDescription,
              labels: buildIssueLabelsConnection([
                ISSUE_LABEL_NODES[0],
                ISSUE_LABEL_NODES[2]
              ]),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: initialDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        if (!calls.includes('update-description')) {
          calls.push('update-description');
          return jsonResponse({
            data: {
              issueUpdate: {
                success: true,
                issue: buildCanonicalOwnerIssue({
                  id: 'lin-issue-260',
                  identifier: 'CO-260',
                  title: 'Race-created owner',
                  description: finalCreatedDescription,
                  labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                  state: {
                    id: 'state-backlog',
                    name: 'Backlog',
                    type: 'unstarted'
                  }
                })
              }
            }
          });
        }
        calls.push('supersede-created-owner');
        expect(body.variables).toEqual({
          id: 'lin-issue-260',
          description: supersededDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: supersededDescription,
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        throw new Error('label repair must not run before rejecting drifted reconciled owner traceability');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after rejecting drifted reconciled owner traceability');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Race-created owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_traceability_invalid',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'label_update_traceability_update',
          expected_description: expectedOwnerDescription,
          observed_description: driftedOwnerDescription,
          follow_up_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254',
            description: driftedOwnerDescription
          },
          created_issue: {
            id: 'lin-issue-260',
            identifier: 'CO-260'
          }
        }
      }
    });
    expect(calls).toEqual([
      'owner-search',
      'create',
      'update-description',
      'owner-search',
      'supersede-created-owner'
    ]);
  });

  it('completes traceability for a reconciled canonical owner before relation handoff', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const supersededMarker = `codex-orchestrator:superseded-canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const buildTraceabilityDescriptionForIssue = (identifier: string, id: string) =>
      buildExpectedFollowUpDescription({
        canonicalOwnerKey,
        includeTraceability: true
      })
        .replaceAll('linear-lin-issue-2', '__FOLLOW_UP_PACKET_PREFIX__')
        .replaceAll('lin-issue-2', id)
        .replaceAll('CO-2', identifier)
        .replaceAll('__FOLLOW_UP_PACKET_PREFIX__', `linear-${id}`);
    const finalCreatedDescription = buildTraceabilityDescriptionForIssue('CO-260', 'lin-issue-260');
    const selectedOwnerTraceabilityDescription = buildTraceabilityDescriptionForIssue('CO-254', 'lin-issue-254');
    const supersededDescription = [
      finalCreatedDescription.replaceAll(canonicalOwnerMarker, supersededMarker),
      [
        '## Superseded Canonical Owner',
        '- Created issue: `CO-260`',
        '- Reused canonical owner: `CO-254`',
        `- Canonical owner key: \`${canonicalOwnerKey}\``,
        '- Reason: another stamped owner for this key existed before relation handoff; this issue is no longer a reusable canonical owner.'
      ].join('\n')
    ].join('\n\n');
    let ownerSearchCount = 0;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-260',
              identifier: 'CO-260',
              title: 'Race-created owner',
              description: finalCreatedDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: initialDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-260',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        if (body.variables?.id === 'lin-issue-260') {
          if (calls.includes('update-created-description') === false) {
            calls.push('update-created-description');
            expect(body.variables).toEqual({
              id: 'lin-issue-260',
              description: finalCreatedDescription
            });
            return jsonResponse({
              data: {
                issueUpdate: {
                  success: true,
                  issue: buildCanonicalOwnerIssue({
                    id: 'lin-issue-260',
                    identifier: 'CO-260',
                    title: 'Race-created owner',
                    description: finalCreatedDescription,
                    labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                    state: {
                      id: 'state-backlog',
                      name: 'Backlog',
                      type: 'unstarted'
                    }
                  })
                }
              }
            });
          }
          calls.push('supersede-created-owner');
          expect(body.variables).toEqual({
            id: 'lin-issue-260',
            description: supersededDescription
          });
          return jsonResponse({
            data: {
              issueUpdate: {
                success: true,
                issue: buildCanonicalOwnerIssue({
                  id: 'lin-issue-260',
                  identifier: 'CO-260',
                  title: 'Race-created owner',
                  description: supersededDescription,
                  labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                  state: {
                    id: 'state-backlog',
                    name: 'Backlog',
                    type: 'unstarted'
                  }
                })
              }
            }
          });
        }
        calls.push('trace-selected-owner');
        expect(body.variables).toEqual({
          id: 'lin-issue-254',
          description: selectedOwnerTraceabilityDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-254',
                identifier: 'CO-254',
                title: 'Existing canonical owner',
                description: selectedOwnerTraceabilityDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                }
              })
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-254'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Race-created owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-254',
        identifier: 'CO-254',
        description: selectedOwnerTraceabilityDescription,
        labels: FOLLOW_UP_LABEL_NODES
      }
    });
    expect(calls).toEqual([
      'owner-search',
      'create',
      'update-created-description',
      'owner-search',
      'supersede-created-owner',
      'trace-selected-owner',
      'related-relation'
    ]);
  });

  it('surfaces the distinct created issue when reconciled-owner traceability repair fails', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const supersededMarker = `codex-orchestrator:superseded-canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const buildTraceabilityDescriptionForIssue = (identifier: string, id: string) =>
      buildExpectedFollowUpDescription({
        canonicalOwnerKey,
        includeTraceability: true
      })
        .replaceAll('linear-lin-issue-2', '__FOLLOW_UP_PACKET_PREFIX__')
        .replaceAll('lin-issue-2', id)
        .replaceAll('CO-2', identifier)
        .replaceAll('__FOLLOW_UP_PACKET_PREFIX__', `linear-${id}`);
    const finalCreatedDescription = buildTraceabilityDescriptionForIssue('CO-260', 'lin-issue-260');
    const selectedOwnerTraceabilityDescription = buildTraceabilityDescriptionForIssue('CO-254', 'lin-issue-254');
    const supersededDescription = [
      finalCreatedDescription.replaceAll(canonicalOwnerMarker, supersededMarker),
      [
        '## Superseded Canonical Owner',
        '- Created issue: `CO-260`',
        '- Reused canonical owner: `CO-254`',
        `- Canonical owner key: \`${canonicalOwnerKey}\``,
        '- Reason: another stamped owner for this key existed before relation handoff; this issue is no longer a reusable canonical owner.'
      ].join('\n')
    ].join('\n\n');
    let ownerSearchCount = 0;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-260',
              identifier: 'CO-260',
              title: 'Race-created owner',
              description: finalCreatedDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: initialDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-260',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES)
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        if (body.variables?.id === 'lin-issue-260') {
          if (calls.includes('update-created-description') === false) {
            calls.push('update-created-description');
            return jsonResponse({
              data: {
                issueUpdate: {
                  success: true,
                  issue: buildCanonicalOwnerIssue({
                    id: 'lin-issue-260',
                    identifier: 'CO-260',
                    title: 'Race-created owner',
                    description: finalCreatedDescription,
                    labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                    state: {
                      id: 'state-backlog',
                      name: 'Backlog',
                      type: 'unstarted'
                    }
                  })
                }
              }
            });
          }
          calls.push('supersede-created-owner');
          expect(body.variables).toEqual({
            id: 'lin-issue-260',
            description: supersededDescription
          });
          return jsonResponse({
            data: {
              issueUpdate: {
                success: true,
                issue: buildCanonicalOwnerIssue({
                  id: 'lin-issue-260',
                  identifier: 'CO-260',
                  title: 'Race-created owner',
                  description: supersededDescription,
                  labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
                  state: {
                    id: 'state-backlog',
                    name: 'Backlog',
                    type: 'unstarted'
                  }
                })
              }
            }
          });
        }
        calls.push('trace-selected-owner');
        expect(body.variables).toEqual({
          id: 'lin-issue-254',
          description: selectedOwnerTraceabilityDescription
        });
        return jsonResponse({
          errors: [{ message: 'traceability update failed after race' }]
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not run after selected-owner traceability repair fails');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Race-created owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        details: {
          errors: [{ message: 'traceability update failed after race' }],
          follow_up_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254'
          },
          created_issue: {
            id: 'lin-issue-260',
            identifier: 'CO-260'
          },
          failed_step: 'label_update_traceability_update'
        }
      }
    });
    if (result.ok) {
      throw new Error('expected selected-owner traceability repair to fail');
    }
    expect(result.error.details?.created_issue).not.toMatchObject({
      id: 'lin-issue-254'
    });
    expect(calls).toEqual([
      'owner-search',
      'create',
      'update-created-description',
      'owner-search',
      'supersede-created-owner',
      'trace-selected-owner'
    ]);
  });

  it('surfaces the created issue and preserves retryability when post-create canonical owner reconciliation search fails', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    });
    let ownerSearchCount = 0;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        return jsonResponse(
          {
            errors: [
              {
                message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
                path: ['issues'],
                extensions: {
                  code: 'RATELIMITED',
                  statusCode: 429
                }
              }
            ]
          },
          429,
          {
            'retry-after': '3600',
            'x-ratelimit-requests-limit': '5000',
            'x-ratelimit-requests-remaining': '0',
            'x-ratelimit-requests-reset': '1774701380970',
            'x-request-id': 'req-reconcile-1'
          }
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not be created after reconciliation search fails');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_rate_limited',
        message: 'Linear API rate limit exceeded.',
        status: 429,
        retryable: true,
        details: {
          errors: [
            {
              message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
              path: ['issues'],
              extensions: {
                code: 'RATELIMITED',
                statusCode: 429
              }
            }
          ],
          retry_after_seconds: 3600,
          requests_remaining: 0,
          requests_limit: 5000,
          requests_reset_at: '2026-03-28T12:36:20.970Z',
          request_id: 'req-reconcile-1',
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up issue',
            description: finalDescription,
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator'
            },
              project: {
                id: 'lin-project-1',
                name: 'CO'
              },
              labels: ISSUE_LABEL_NODES
            },
          failed_step: 'canonical_owner_reconciliation'
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'create', 'update-description', 'owner-search']);
  });

  it('does not mark failed post-create canonical owner supersede mutations retryable', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const supersededMarker = `codex-orchestrator:superseded-canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    })
      .replaceAll('CO-2', 'CO-260')
      .replaceAll('lin-issue-2', 'lin-issue-260')
      .replaceAll('linear-lin-issue-2', 'linear-lin-issue-260');
    let ownerSearchCount = 0;
    let finalizedCreatedDescription = finalDescription;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-260',
              identifier: 'CO-260',
              title: 'Race-created owner',
              description: finalizedCreatedDescription,
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: [
                'Existing owner.',
                '## Canonical Owner',
                `- Canonical owner key: \`${canonicalOwnerKey}\``,
                `- Canonical owner marker: \`${canonicalOwnerMarker}\``
              ].join('\n'),
              labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES),
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-260',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        if (!calls.includes('update-description')) {
          finalizedCreatedDescription = String((body.variables as Record<string, unknown>).description ?? '');
          calls.push('update-description');
          return jsonResponse({
            data: {
              issueUpdate: {
                success: true,
                issue: {
                  id: 'lin-issue-260',
                  identifier: 'CO-260',
                  title: 'Race-created owner',
                  description: finalizedCreatedDescription,
                  url: 'https://linear.app/example/issue/CO-260',
                  state: {
                    id: 'state-backlog',
                    name: 'Backlog',
                    type: 'unstarted'
                  },
                  team: {
                    id: 'lin-team-1',
                    key: 'CO',
                    name: 'Codex Orchestrator'
                  },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
          });
        }
        calls.push('supersede-created-owner');
        expect(body.variables).toMatchObject({
          id: 'lin-issue-260'
        });
        expect(String(body.variables?.description ?? '')).toContain(supersededMarker);
        return jsonResponse(
          {
            errors: [
              {
                message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
                path: ['issueUpdate'],
                extensions: {
                  code: 'RATELIMITED',
                  statusCode: 429
                }
              }
            ]
          },
          429,
          {
            'retry-after': '3600',
            'x-ratelimit-requests-limit': '5000',
            'x-ratelimit-requests-remaining': '0',
            'x-ratelimit-requests-reset': '1774701380970',
            'x-request-id': 'req-supersede-1'
          }
        );
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        throw new Error('relations must not be created after failed canonical owner supersede');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Race-created owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_rate_limited',
        status: 409,
        retryable: false,
        details: {
          failed_step: 'canonical_owner_reconciliation',
          created_issue: {
            id: 'lin-issue-260',
            identifier: 'CO-260'
          },
          canonical_owner_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254'
          }
        }
      }
    });
    expect(calls).toEqual(['owner-search', 'create', 'update-description', 'owner-search', 'supersede-created-owner']);
  });

  it('separates the created issue from the canonical owner when post-create race relation creation fails', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const supersededMarker = `codex-orchestrator:superseded-canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey,
      includeTraceability: true
    })
      .replaceAll('CO-2', 'CO-260')
      .replaceAll('lin-issue-2', 'lin-issue-260')
      .replaceAll('linear-lin-issue-2', 'linear-lin-issue-260');
    const canonicalOwnerDescription = [
      'Existing owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    let ownerSearchCount = 0;
    let finalizedCreatedDescription = finalDescription;
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        ownerSearchCount += 1;
        calls.push('owner-search');
        if (ownerSearchCount === 1) {
          return jsonResponse(buildCanonicalOwnerIssuesBody([]));
        }
        return jsonResponse(
          buildCanonicalOwnerIssuesBody([
            buildCanonicalOwnerIssue({
              id: 'lin-issue-260',
              identifier: 'CO-260',
              title: 'Race-created owner',
              description: finalizedCreatedDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            }),
            buildCanonicalOwnerIssue({
              id: 'lin-issue-254',
              identifier: 'CO-254',
              title: 'Existing canonical owner',
              description: canonicalOwnerDescription,
              state: {
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              }
            })
          ])
        );
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Race-created owner',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-260',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        if (!calls.includes('update-description')) {
          finalizedCreatedDescription = String((body.variables as Record<string, unknown>).description ?? '');
          calls.push('update-description');
          return jsonResponse({
            data: {
              issueUpdate: {
                success: true,
                issue: {
                  id: 'lin-issue-260',
                  identifier: 'CO-260',
                  title: 'Race-created owner',
                  description: finalizedCreatedDescription,
                  url: 'https://linear.app/example/issue/CO-260',
                  state: {
                    id: 'state-backlog',
                    name: 'Backlog',
                    type: 'unstarted'
                  },
                  team: {
                    id: 'lin-team-1',
                    key: 'CO',
                    name: 'Codex Orchestrator'
                  },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
          });
        }
        calls.push('supersede-created-owner');
        expect(body.variables).toMatchObject({
          id: 'lin-issue-260'
        });
        expect(String(body.variables?.description ?? '')).toContain(supersededMarker);
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        expect(body.variables).toMatchObject({
          input: {
            type: 'related',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-254'
          }
        });
        return jsonResponse({
          errors: [{ message: 'relation failed after race reconciliation' }]
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Race-created owner',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        status: 409,
        retryable: false,
        details: {
          errors: [{ message: 'relation failed after race reconciliation' }],
          follow_up_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254'
          },
          created_issue: {
            id: 'lin-issue-260',
            identifier: 'CO-260'
          },
          canonical_owner_issue: {
            id: 'lin-issue-254',
            identifier: 'CO-254'
          },
          failed_relation_type: 'related'
        }
      }
    });
    if (result.ok) {
      throw new Error('expected relation creation after race reconciliation to fail');
    }
    expect(result.error.details?.created_issue).not.toMatchObject({
      id: 'lin-issue-254'
    });
    expect(calls).toEqual([
      'owner-search',
      'create',
      'update-description',
      'owner-search',
      'supersede-created-owner',
      'related-relation'
    ]);
  });

  it('fails follow-up creation fast when budget cannot cover possible label repair', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '5',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('insufficient shared budget should fail before fetch');
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true,
          required_requests_remaining: 5,
          request_headroom_reserve_bucket: 'requests',
          request_headroom_remaining: 5,
          request_headroom_usable_remaining: 4
        }
      }
    });
  });

  it('allows canonical follow-up creation when budget exactly covers possible label repair', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const resetAt = String(Date.now() + 60_000);
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '10',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const initialDescription = buildExpectedFollowUpDescription({
      canonicalOwnerKey
    });
    const finalDescription = buildExpectedFollowUpDescriptionForIssue({
      canonicalOwnerKey,
      includeTraceability: true,
      followUpId: 'lin-issue-260',
      followUpIdentifier: 'CO-260'
    });
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody(), 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '9',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(buildCanonicalOwnerIssuesBody([]), 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': calls.length === 2 ? '8' : '5',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        calls.push('create');
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            labelIds: FOLLOW_UP_LABEL_IDS,
            description: initialDescription
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Follow-up issue',
                description: initialDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES)
              })
            }
          }
        }, 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '7',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        calls.push('update-description');
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: buildCanonicalOwnerIssue({
                id: 'lin-issue-260',
                identifier: 'CO-260',
                title: 'Follow-up issue',
                description: finalDescription,
                labels: buildIssueLabelsConnection(FOLLOW_UP_LABEL_NODES)
              })
            }
          }
        }, 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '6',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueLabels')) {
        throw new Error('exact-budget canonical create path should not need label repair when create returned all labels');
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        calls.push('related-relation');
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-related',
                type: 'related'
              }
            }
          }
        }, 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '4',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey,
      env,
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      follow_up_issue: {
        id: 'lin-issue-260',
        identifier: 'CO-260',
        labels: FOLLOW_UP_LABEL_NODES
      }
    });
    expect(calls).toEqual([
      'issue-summary',
      'owner-search',
      'create',
      'update-description',
      'owner-search',
      'related-relation'
    ]);
  });

  it('fails canonical follow-up creation fast when budget cannot cover possible label repair', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const resetAt = String(Date.now() + 60_000);
    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '10',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        calls.push('issue-summary');
        return jsonResponse(buildIssueContextBody(), 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '9',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      if (body.query?.includes('ProviderLinearCanonicalFollowUpOwners')) {
        calls.push('owner-search');
        return jsonResponse(buildCanonicalOwnerIssuesBody([]), 200, {
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-remaining': '7',
          'x-ratelimit-requests-reset': resetAt
        });
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('canonical create path must fail before issueCreate when label-repair budget is unavailable');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      canonicalOwnerKey: 'baseline_cohort_id:apr-19-docs-freshness',
      env,
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true,
          required_requests_remaining: 7,
          request_headroom_reserve_bucket: 'requests',
          request_headroom_remaining: 7,
          request_headroom_usable_remaining: 6
        }
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search']);
  });

  it('fails issue-context reads fast when the shared request reserve would be violated', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('request reserve gate should fail before fetch');
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      operation: 'issue-context',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true,
          request_headroom_reserve_bucket: 'requests',
          request_headroom_remaining: 1,
          request_headroom_reserve: 1,
          request_headroom_usable_remaining: 0
        }
      }
    });
  });

  it('fails closed when the source issue is not assigned to a project', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          project: null
        })
      )
    );

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_project_missing',
        message: 'Linear issue CO-1 is missing a project assignment; same-project follow-up creation requires one.',
        status: 422
      }
    });
  });

  it('fails closed when the live team does not expose Backlog for follow-up creation', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          team: {
            id: 'lin-team-1',
            key: 'CO',
            name: 'Codex Orchestrator',
            states: {
              nodes: [
                {
                  id: 'state-ready',
                  name: 'Ready',
                  type: 'unstarted'
                },
                {
                  id: 'state-in-progress',
                  name: 'In Progress',
                  type: 'started'
                },
                {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                },
                {
                  id: 'state-done',
                  name: 'Done',
                  type: 'completed'
                }
              ]
            }
          }
        })
      )
    );

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_backlog_state_missing',
        message: 'Linear team state "Backlog" was not found for issue CO-1.',
        status: 422
      }
    });
  });

  it('fails closed when a parity follow-up omits the parity matrix', async () => {
    const fetchImpl = vi.fn();
    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Parity follow-up',
      description: 'Close the remaining parity gap.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      parityLane: true,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_parity_matrix_missing',
        message: 'Parity/alignment follow-up issues require a parity matrix.',
        status: 422
      }
    });
  });

  it('surfaces the created follow-up issue when the traceability description update fails after issue creation', async () => {
    const initialDescription = buildExpectedFollowUpDescription();
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: buildExpectedFollowUpDescription({
            includeTraceability: true
          })
        });
        return jsonResponse({
          errors: [{ message: 'description update failed' }]
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 409,
        retryable: false,
        details: {
          http_status: 200,
          errors: [{ message: 'description update failed' }],
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up issue',
            description: initialDescription,
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator'
            },
              project: {
                id: 'lin-project-1',
                name: 'CO'
              },
              labels: ISSUE_LABEL_NODES
            },
          failed_step: 'description_update'
        }
      }
    });
  });

  it('surfaces the created follow-up issue when relation creation fails after issue creation', async () => {
    const initialDescription = buildExpectedFollowUpDescription();
    const finalDescription = buildExpectedFollowUpDescription({
      includeTraceability: true
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                project: {
                  id: 'lin-project-1',
                  name: 'CO'
                },
                labels: buildIssueLabelsConnection()
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        return jsonResponse({
          errors: [{ message: 'relation failed' }]
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 409,
        retryable: false,
        details: {
          http_status: 200,
          errors: [{ message: 'relation failed' }],
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up issue',
            description: finalDescription,
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator'
            },
              project: {
                id: 'lin-project-1',
                name: 'CO'
              },
              labels: ISSUE_LABEL_NODES
            },
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up issue',
            description: finalDescription,
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator'
            },
              project: {
                id: 'lin-project-1',
                name: 'CO'
              },
              labels: ISSUE_LABEL_NODES
            },
          failed_relation_type: 'related'
        }
      }
    });
  });

  it('surfaces the created follow-up issue when blocker relation creation fails after related succeeds', async () => {
    const initialDescription = buildExpectedFollowUpDescription();
    const finalDescription = buildExpectedFollowUpDescription({
      includeTraceability: true
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: {
          input?: {
            type?: string;
          };
        };
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: initialDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearUpdateIssueDescription')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-2',
          description: finalDescription
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: finalDescription,
                url: 'https://linear.app/example/issue/CO-2',
                state: {
                  id: 'state-backlog',
                  name: 'Backlog',
                  type: 'unstarted'
                },
                team: {
                  id: 'lin-team-1',
                  key: 'CO',
                  name: 'Codex Orchestrator'
                },
                  project: {
                    id: 'lin-project-1',
                    name: 'CO'
                  },
                  labels: buildIssueLabelsConnection()
                }
              }
            }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        if (body.variables?.input?.type === 'related') {
          return jsonResponse({
            data: {
              issueRelationCreate: {
                success: true
              }
            }
          });
        }
        if (body.variables?.input?.type === 'blocks') {
          return jsonResponse({
            errors: [{ message: 'block relation failed' }]
          });
        }
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      blockedBySource: true,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 409,
        retryable: false,
        details: {
          http_status: 200,
          errors: [{ message: 'block relation failed' }],
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up issue',
            description: finalDescription,
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator'
            },
              project: {
                id: 'lin-project-1',
                name: 'CO'
              },
              labels: ISSUE_LABEL_NODES
            },
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up issue',
            description: finalDescription,
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator'
            },
            project: {
              id: 'lin-project-1',
              name: 'CO'
            },
            labels: ISSUE_LABEL_NODES
          },
          failed_relation_type: 'blocks'
        }
      }
    });
  });

  it('falls back to a plain URL attachment when the GitHub-specific mutation errors', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123',
          title: 'PR 123'
        });
        return jsonResponse(
          {
            errors: [{ message: 'GitHub attachment mutation unavailable.' }]
          },
          200,
          {
            'x-ratelimit-requests-limit': '100',
            'x-ratelimit-requests-remaining': '7',
            'x-ratelimit-requests-reset': String(Date.now() + 60_000)
          }
        );
      }
      if (body.query?.includes('ProviderLinearAttachUrl')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123',
          title: 'PR 123'
        });
        return jsonResponse({
          data: {
            attachmentLinkURL: {
              success: true,
              attachment: {
                id: 'attachment-1',
                title: 'PR 123',
                url: 'https://github.com/openai/codex-orchestrator/pull/123',
                sourceType: 'url'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/pull/123',
      title: 'PR 123',
      env,
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'attached',
      via: 'url',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-1',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'url'
      },
      source_setup: null
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
      requests: {
        limit: 100,
        remaining: 7
      }
    });
  });

  it('does not retry attachment via URL when the GitHub-specific mutation is rate limited', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123',
          title: 'PR 123'
        });
        return new Response(
          JSON.stringify({
            errors: [
              {
                message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
                extensions: {
                  code: 'RATELIMITED',
                  statusCode: 429
                }
              }
            ]
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'retry-after': '3600',
              'x-ratelimit-requests-limit': '5000',
              'x-ratelimit-requests-remaining': '0',
              'x-ratelimit-requests-reset': '1774701380970',
              'x-request-id': 'req-attach-1'
            }
          }
        );
      }
      if (body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('URL fallback must not run after a rate-limited GitHub PR attachment failure');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/pull/123',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_rate_limited',
        message: 'Linear API rate limit exceeded.',
        status: 429,
        retryable: true,
        details: {
          errors: [
            {
              message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
              extensions: {
                code: 'RATELIMITED',
                statusCode: 429
              }
            }
          ],
          retry_after_seconds: 3600,
          requests_remaining: 0,
          requests_limit: 5000,
          requests_reset_at: '2026-03-28T12:36:20.970Z',
          request_id: 'req-attach-1'
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails attach-pr after a truthful context read when the shared request budget cannot cover the supported fallback path', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const resetAt = String(Date.now() + 60_000);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '2',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      expect(body.query).toContain('ProviderLinearIssueContext');
      expect(body.query).not.toContain('comments(first:');
      expect(body.query).toContain('attachments(first:');
      return jsonResponse(buildIssueContextBody(), 200, {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      });
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/pull/123',
      title: 'PR 123',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_rate_limited',
        status: 429,
        details: {
          shared_budget_fail_fast: true,
          required_requests_remaining: 2,
          shortfall_bucket: 'requests',
          shortfall_remaining: 1
        }
      }
    });
  });

  it('normalizes 2xx GraphQL errors to an upstream-safe status code', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        errors: [
          {
            message: 'Linear returned operation errors.',
            path: ['issue'],
            extensions: {
              code: 'MUTATION_FAILED'
            }
          }
        ]
      })
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'issue-context',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 502,
        details: {
          http_status: 200,
          errors: [
            {
              message: 'Linear returned operation errors.',
              path: ['issue'],
              extensions: {
                code: 'MUTATION_FAILED'
              }
            }
          ]
        }
      }
    });
  });

  it('dedupes existing PR attachments using canonicalized GitHub URLs', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'provider-linear-workflow-facade-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };
    const resetAt = String(Date.now() + 60_000);

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'provider-linear:issue-context',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': resetAt
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            attachments: {
              nodes: [
                {
                  id: 'attachment-pr',
                  title: 'PR 123',
                  url: 'https://github.com/openai/codex-orchestrator/pull/123',
                  sourceType: 'github'
                }
              ]
            }
          }),
          200,
          {
            'x-ratelimit-requests-limit': '100',
            'x-ratelimit-requests-remaining': '0',
            'x-ratelimit-requests-reset': resetAt
          }
        );
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr') || body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('attach mutation should not run when a canonical-equivalent PR link already exists');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://www.github.com/openai/codex-orchestrator/pull/123/files?utm_source=test#discussion_r1',
      title: 'PR 123',
      env,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'noop',
      via: 'existing',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-pr',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'github'
      },
      source_setup: null
    });
  });

  it.each([
    {
      archivedAt: '2026-04-11T05:00:00.000Z',
      trashed: false,
      label: 'archived'
    },
    {
      archivedAt: null,
      trashed: true,
      label: 'trashed'
    }
  ])('fails closed when the live issue is $label before attaching a PR', async ({ archivedAt, trashed }) => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        expect(body.query).toContain('archivedAt');
        expect(body.query).toContain('trashed');
        return jsonResponse(
          buildIssueContextBody({
            archivedAt,
            trashed,
            attachments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr') || body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('attach mutation must not run for a non-mutable issue.');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/pull/123',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_issue_not_mutable',
        status: 409,
        details: {
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-1',
          archived_at: archivedAt,
          trashed
        }
      }
    });
  });

  it('keeps canonical-equivalent existing PR attachments as a noop even when the live issue is archived', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        expect(body.query).toContain('archivedAt');
        expect(body.query).toContain('trashed');
        return jsonResponse(
          buildIssueContextBody({
            archivedAt: '2026-04-11T05:00:00.000Z',
            trashed: true,
            attachments: {
              nodes: [
                {
                  id: 'attachment-pr',
                  title: 'PR 123',
                  url: 'https://github.com/openai/codex-orchestrator/pull/123',
                  sourceType: 'github'
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr') || body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('attach mutation should not run when a canonical-equivalent PR link already exists');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://www.github.com/openai/codex-orchestrator/pull/123/files?utm_source=test#discussion_r1',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'noop',
      via: 'existing',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-pr',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'github'
      },
      source_setup: null
    });
  });

  it('canonicalizes noisy GitHub PR URLs before creating a new attachment', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123',
          title: 'PR 123'
        });
        return jsonResponse({
          data: {
            attachmentLinkGitHubPR: {
              success: true,
              attachment: {
                id: 'attachment-1',
                title: 'PR 123',
                url: 'https://github.com/openai/codex-orchestrator/pull/123',
                sourceType: 'github'
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('URL fallback should not run when the GitHub PR attachment succeeds');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://www.github.com/openai/codex-orchestrator/pull/123/files?utm_source=test#discussion_r1',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'attached',
      via: 'github_pr',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-1',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'github'
      },
      source_setup: null
    });
  });

  it('rejects non-pull-request URLs for attach-pr', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('attach-pr should fail before issuing any Linear request for non-PR URLs');
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/compare/main...feature',
      title: 'not a pull request',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_pr_url_invalid',
        message: 'PR URL must be a GitHub pull request URL.',
        status: 422
      }
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('paginates attachments before deciding whether a PR link already exists', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string | null>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            attachments: {
              nodes: Array.from({ length: 20 }, (_, index) => ({
                id: `attachment-${index + 1}`,
                title: `Attachment ${index + 1}`,
                url: `https://example.com/attachment-${index + 1}`,
                sourceType: 'url'
              })),
              pageInfo: {
                hasNextPage: true,
                endCursor: 'attachment-cursor-1'
              }
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearIssueAttachments')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          attachmentsAfter: 'attachment-cursor-1'
        });
        return jsonResponse({
          data: {
            issue: {
              id: 'lin-issue-1',
              attachments: {
                nodes: [
                  {
                    id: 'attachment-pr',
                    title: 'PR 123',
                    url: 'https://github.com/openai/codex-orchestrator/pull/123',
                    sourceType: 'github'
                  }
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null
                }
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr') || body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('attach mutation should not run when the PR link already exists on a later attachment page');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/pull/123',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'noop',
      via: 'existing',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-pr',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'github'
      },
      source_setup: null
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('uploads local screenshot refs and rewrites workpad bodies to Linear asset URLs', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'linear-workpad-embed-'));
    tempDirs.push(tempDir);
    const proofPath = join(tempDir, 'proof.png');
    const proofBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await writeFile(proofPath, proofBytes);

    const uploadUrl = 'https://uploads.linear.test/proof-1';
    const assetUrl = 'https://assets.linear.test/proof-1';
    const inputBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](file://${proofPath})`]
    });
    const expectedBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](${assetUrl})`]
    });

    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      if (String(input) === uploadUrl) {
        expect(init?.method).toBe('PUT');
        const headers = new Headers(init?.headers);
        expect(headers.get('content-type')).toBe('image/png');
        expect(headers.get('cache-control')).toBe('public, max-age=31536000');
        expect(headers.get('x-ms-blob-type')).toBe('BlockBlob');
        expect(init?.body).toBeInstanceOf(Blob);
        expect(Buffer.from(await (init?.body as Blob).arrayBuffer())).toEqual(proofBytes);
        return new Response(null, { status: 200 });
      }

      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload')) {
        return jsonResponse({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl,
                assetUrl,
                headers: [
                  {
                    key: 'x-ms-blob-type',
                    value: 'BlockBlob'
                  }
                ]
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-proof',
                url: 'https://linear.app/comment/proof',
                body: expectedBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: inputBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-proof',
        body: expectedBody,
        url: 'https://linear.app/comment/proof',
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      embedded_assets: [
        {
          original_reference: `file://${proofPath}`,
          resolved_path: proofPath,
          asset_url: assetUrl,
          content_type: 'image/png',
          size_bytes: proofBytes.length
        }
      ],
      source_setup: null
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('uploads local screenshot refs when the title suffix contains parentheses', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'linear-workpad-embed-angle-'));
    tempDirs.push(tempDir);
    const proofPath = join(tempDir, 'proof screenshot (1).png');
    const proofBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await writeFile(proofPath, proofBytes);

    const uploadUrl = 'https://uploads.linear.test/proof-angle';
    const assetUrl = 'https://assets.linear.test/proof-angle';
    const inputBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](<file://${proofPath}> "caption (v2)")`]
    });
    const expectedBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](${assetUrl} "caption (v2)")`]
    });

    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      if (String(input) === uploadUrl) {
        expect(init?.method).toBe('PUT');
        expect(Buffer.from(await (init?.body as Blob).arrayBuffer())).toEqual(proofBytes);
        return new Response(null, { status: 200 });
      }

      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload')) {
        return jsonResponse({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl,
                assetUrl,
                headers: []
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-proof-angle',
                url: 'https://linear.app/comment/proof-angle',
                body: expectedBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: inputBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      comment: {
        id: 'comment-proof-angle',
        body: expectedBody
      },
      embedded_assets: [
        {
          original_reference: `file://${proofPath}`,
          resolved_path: proofPath,
          asset_url: assetUrl
        }
      ]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('leaves scheme-relative remote image refs untouched instead of treating them as local files', async () => {
    const inputBody = buildStructuredWorkpadBody({
      notesLines: ['- Remote proof stays remote.', '![Embedded proof](//cdn.example.com/proof.png)']
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload')) {
        throw new Error('scheme-relative remote image refs must not trigger local upload negotiation');
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-remote-scheme-relative',
                url: 'https://linear.app/comment/remote-scheme-relative',
                body: inputBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: inputBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      comment: {
        id: 'comment-remote-scheme-relative',
        body: inputBody
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('ignores inline, fenced, indented, and blockquoted code image examples when extracting local screenshot refs', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'linear-workpad-embed-code-examples-'));
    tempDirs.push(tempDir);
    const proofPath = join(tempDir, 'proof.png');
    const proofBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await writeFile(proofPath, proofBytes);

    const uploadUrl = 'https://uploads.linear.test/proof-code-examples';
    const assetUrl = 'https://assets.linear.test/proof-code-examples';
    const missingFencedPath = join(tempDir, 'missing fenced proof.png');
    const missingInlinePath = join(tempDir, 'missing inline proof.png');
    const missingBlockquotedFencedPath = join(tempDir, 'missing blockquoted fenced proof.png');
    const missingIndentedPath = join(tempDir, 'missing indented proof.png');
    const missingTabbedPath = join(tempDir, 'missing tabbed proof.png');
    const missingBlockquotedIndentedPath = join(tempDir, 'missing blockquoted indented proof.png');
    const missingEscapedPath = join(tempDir, 'missing escaped proof.png');
    const inputBody = buildStructuredWorkpadBody({
      notesLines: [
        '- Literal markdown examples should stay literal. 😀',
        '```md',
        `![Example only](file://${missingFencedPath})`,
        '```',
        '> ```md',
        `> ![Blockquoted fenced only](file://${missingBlockquotedFencedPath})`,
        '> ```',
        `- Inline example \`![Literal inline](file://${missingInlinePath})\` should not upload.`,
        'Indented code examples should stay literal:',
        '',
        `    ![Indented only](file://${missingIndentedPath})`,
        `\t![Tabbed only](file://${missingTabbedPath})`,
        `>     ![Blockquoted indented only](file://${missingBlockquotedIndentedPath})`,
        '',
        `- Escaped example \\![Escaped only](file://${missingEscapedPath}) should not upload.`,
        '- Real proof follows.',
        `![Embedded proof](file://${proofPath})`
      ]
    });
    const expectedBody = buildStructuredWorkpadBody({
      notesLines: [
        '- Literal markdown examples should stay literal. 😀',
        '```md',
        `![Example only](file://${missingFencedPath})`,
        '```',
        '> ```md',
        `> ![Blockquoted fenced only](file://${missingBlockquotedFencedPath})`,
        '> ```',
        `- Inline example \`![Literal inline](file://${missingInlinePath})\` should not upload.`,
        'Indented code examples should stay literal:',
        '',
        `    ![Indented only](file://${missingIndentedPath})`,
        `\t![Tabbed only](file://${missingTabbedPath})`,
        `>     ![Blockquoted indented only](file://${missingBlockquotedIndentedPath})`,
        '',
        `- Escaped example \\![Escaped only](file://${missingEscapedPath}) should not upload.`,
        '- Real proof follows.',
        `![Embedded proof](${assetUrl})`
      ]
    });

    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      if (String(input) === uploadUrl) {
        expect(init?.method).toBe('PUT');
        expect(Buffer.from(await (init?.body as Blob).arrayBuffer())).toEqual(proofBytes);
        return new Response(null, { status: 200 });
      }

      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload')) {
        return jsonResponse({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl,
                assetUrl,
                headers: []
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-proof-code-examples',
                url: 'https://linear.app/comment/proof-code-examples',
                body: expectedBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: inputBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      comment: {
        id: 'comment-proof-code-examples',
        body: expectedBody
      },
      embedded_assets: [
        {
          original_reference: `file://${proofPath}`,
          resolved_path: proofPath,
          asset_url: assetUrl
        }
      ]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('resolves bare relative local screenshot refs from the body-file directory', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'linear-workpad-embed-bare-relative-'));
    tempDirs.push(tempDir);
    const packetDir = join(tempDir, 'packet');
    const imagesDir = join(packetDir, 'images');
    await mkdir(imagesDir, { recursive: true });
    const proofPath = join(imagesDir, 'proof.png');
    const workpadPath = join(packetDir, 'workpad.md');
    const proofBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await writeFile(proofPath, proofBytes);
    await writeFile(workpadPath, 'placeholder');

    const uploadUrl = 'https://uploads.linear.test/proof-bare-relative';
    const assetUrl = 'https://assets.linear.test/proof-bare-relative';
    const inputBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', '![Embedded proof](images/proof.png)']
    });
    const expectedBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](${assetUrl})`]
    });

    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      if (String(input) === uploadUrl) {
        expect(init?.method).toBe('PUT');
        expect(Buffer.from(await (init?.body as Blob).arrayBuffer())).toEqual(proofBytes);
        return new Response(null, { status: 200 });
      }

      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload')) {
        return jsonResponse({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl,
                assetUrl,
                headers: []
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-proof-bare-relative',
                url: 'https://linear.app/comment/proof-bare-relative',
                body: expectedBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: inputBody,
      bodyFilePath: workpadPath,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      comment: {
        id: 'comment-proof-bare-relative',
        body: expectedBody
      },
      embedded_assets: [
        {
          original_reference: 'images/proof.png',
          resolved_path: proofPath,
          asset_url: assetUrl
        }
      ]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('noops unchanged embedded workpads instead of reuploading the same local screenshot', async () => {
    const env = await createRunScopedEnv();
    const tempDir = await mkdtemp(join(tmpdir(), 'linear-workpad-embed-noop-'));
    tempDirs.push(tempDir);
    const proofPath = join(tempDir, 'proof.png');
    const proofBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await writeFile(proofPath, proofBytes);

    const uploadUrl = 'https://uploads.linear.test/proof-noop';
    const assetUrl = 'https://assets.linear.test/proof-noop';
    const inputBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](file://${proofPath})`]
    });
    const expectedBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](${assetUrl})`]
    });

    const firstFetchImpl: typeof fetch = vi.fn(async (input, init) => {
      if (String(input) === uploadUrl) {
        expect(init?.method).toBe('PUT');
        expect(Buffer.from(await (init?.body as Blob).arrayBuffer())).toEqual(proofBytes);
        return new Response(null, { status: 200 });
      }

      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload')) {
        return jsonResponse({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl,
                assetUrl,
                headers: []
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-proof-noop',
                url: 'https://linear.app/comment/proof-noop',
                body: expectedBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const firstResult = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: inputBody,
      env,
      fetchImpl: firstFetchImpl
    });

    expect(firstResult).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      comment: {
        id: 'comment-proof-noop',
        body: expectedBody
      }
    });
    expect(firstFetchImpl).toHaveBeenCalledTimes(4);

    const secondFetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-proof-noop',
                  body: expectedBody,
                  url: 'https://linear.app/comment/proof-noop',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T09:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      if (
        body.query?.includes('ProviderLinearFileUpload')
        || body.query?.includes('ProviderLinearCreateComment')
        || body.query?.includes('ProviderLinearUpdateComment')
      ) {
        throw new Error('unchanged embedded workpads should not upload or mutate again');
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const secondResult = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: inputBody,
      env,
      fetchImpl: secondFetchImpl
    });

    expect(secondFetchImpl).toHaveBeenCalledTimes(1);
    expect(secondResult).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'noop',
      comment: {
        id: 'comment-proof-noop',
        body: expectedBody
      }
    });
  });

  it('resolves relative local screenshot refs from the body-file directory', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'linear-workpad-embed-relative-'));
    tempDirs.push(tempDir);
    const packetDir = join(tempDir, 'packet');
    await mkdir(packetDir, { recursive: true });
    const proofPath = join(packetDir, 'proof.png');
    const workpadPath = join(packetDir, 'workpad.md');
    const proofBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await writeFile(proofPath, proofBytes);
    await writeFile(workpadPath, 'placeholder');

    const uploadUrl = 'https://uploads.linear.test/proof-relative';
    const assetUrl = 'https://assets.linear.test/proof-relative';
    const inputBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', '![Embedded proof](./proof.png)']
    });
    const expectedBody = buildStructuredWorkpadBody({
      notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](${assetUrl})`]
    });

    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      if (String(input) === uploadUrl) {
        expect(init?.method).toBe('PUT');
        expect(Buffer.from(await (init?.body as Blob).arrayBuffer())).toEqual(proofBytes);
        return new Response(null, { status: 200 });
      }

      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload')) {
        return jsonResponse({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl,
                assetUrl,
                headers: []
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-proof-relative',
                url: 'https://linear.app/comment/proof-relative',
                body: expectedBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: inputBody,
      bodyFilePath: workpadPath,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      comment: {
        id: 'comment-proof-relative',
        body: expectedBody
      },
      embedded_assets: [
        {
          original_reference: './proof.png',
          resolved_path: proofPath,
          asset_url: assetUrl
        }
      ]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('does not upload local screenshot refs before workpad validation passes', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'linear-workpad-embed-invalid-'));
    tempDirs.push(tempDir);
    const proofPath = join(tempDir, 'proof.png');
    await writeFile(proofPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const invalidBody = [
      '## Codex Workpad',
      '',
      '### Environment / Workspace Stamp',
      '- Issue: `CO-1`.',
      '',
      '### Plan',
      '- Missing the required remaining sections.',
      '',
      '### Notes',
      `![Embedded proof](file://${proofPath})`
    ].join('\n');

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload') || body.query?.includes('ProviderLinearCreateComment')) {
        throw new Error('upload or mutation should not run before validation succeeds');
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_structure_invalid',
        status: 422
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails workpad embedding when the signed upload PUT returns a non-success status', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'linear-workpad-embed-fail-'));
    tempDirs.push(tempDir);
    const proofPath = join(tempDir, 'proof.png');
    await writeFile(proofPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const uploadUrl = 'https://uploads.linear.test/proof-fail';
    const assetUrl = 'https://assets.linear.test/proof-fail';
    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      if (String(input) === uploadUrl) {
        return new Response(null, { status: 403 });
      }

      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearFileUpload')) {
        return jsonResponse({
          data: {
            fileUpload: {
              success: true,
              uploadFile: {
                uploadUrl,
                assetUrl,
                headers: []
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        throw new Error('commentCreate should not run after a failed upload PUT');
      }
      throw new Error(`Unexpected request: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: buildStructuredWorkpadBody({
        notesLines: ['- Proof screenshot is embedded below.', `![Embedded proof](file://${proofPath})`]
      }),
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_file_upload_put_failed',
        message: 'Linear signed upload request returned HTTP 403.',
        status: 503,
        details: {
          upload_url: uploadUrl,
          http_status: 403,
          original_reference: `file://${proofPath}`,
          resolved_path: proofPath,
          asset_url: assetUrl
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
