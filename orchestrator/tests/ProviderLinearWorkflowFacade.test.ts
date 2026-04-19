import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  attachProviderLinearIssuePr,
  createProviderLinearFollowUpIssue,
  deleteProviderLinearWorkpadComment,
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
            nodes: [
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
            ]
          }
        },
        project: {
          id: 'lin-project-1',
          name: 'CO'
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

function buildCanonicalOwnerIssuesBody(nodes: unknown[]): unknown {
  return {
    data: {
      issues: {
        nodes,
        pageInfo: {
          hasNextPage: false,
          endCursor: null
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
    team: {
      id: 'lin-team-1',
      key: 'CO',
      name: 'Codex Orchestrator'
    },
    project: {
      id: 'lin-project-1',
      name: 'CO'
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
    },
    project: {
      id: 'lin-project-1',
      name: 'CO'
    },
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

async function writeCachedIssueContext(
  env: NodeJS.ProcessEnv,
  issue: Record<string, unknown>,
  options?: {
    recordedAt?: string;
    sourceSetup?: Record<string, unknown> | null;
  }
): Promise<void> {
  const auditPath = env.CODEX_PROVIDER_LINEAR_AUDIT_PATH;
  if (!auditPath) {
    throw new Error('Missing CODEX_PROVIDER_LINEAR_AUDIT_PATH for cached issue-context test setup.');
  }
  await writeFile(
    join(dirname(auditPath), 'provider-linear-issue-context-cache.json'),
    JSON.stringify(
      {
        schema_version: 1,
        issue_id: 'lin-issue-1',
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

  it('reuses a recent cached issue-context snapshot when request headroom is degraded', async () => {
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
        workpad_comment: {
          id: 'comment-workpad'
        }
      }
    });
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

    const auditPath = env.CODEX_PROVIDER_LINEAR_AUDIT_PATH!;
    const cachePath = join(dirname(auditPath), 'provider-linear-issue-context-cache.json');
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
                }
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
                }
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

    expect(result).toEqual({
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
        }
      },
      canonical_owner: null,
      relations: {
        related: true,
        blocked_by_source: true
      },
      source_setup: null
    });
  });

  it('reuses one open stamped canonical owner for the Apr 19 duplicate cluster without issueCreate', async () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-19|cadence_days:30';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const canonicalOwnerDescription = [
      'Apr 19 baseline owner.',
      '## Canonical Owner',
      `- Canonical owner key: \`${canonicalOwnerKey}\``,
      `- Canonical owner marker: \`${canonicalOwnerMarker}\``
    ].join('\n');
    const sourceIssues = [
      { id: 'lin-issue-253', identifier: 'CO-253' },
      { id: 'lin-issue-256', identifier: 'CO-256' },
      { id: 'lin-issue-257', identifier: 'CO-257' },
      { id: 'lin-issue-258', identifier: 'CO-258' }
    ];
    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        const issueId = String(body.variables?.issueId ?? '');
        const source = sourceIssues.find((entry) => entry.id === issueId) ?? sourceIssues[0];
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

  it('reuses the source issue itself as canonical owner without self relations', async () => {
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
    expect(calls).toEqual(['issue-summary', 'owner-search']);
  });

  it('treats already-existing canonical owner relations as reuse success', async () => {
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
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        throw new Error('canonical owner existing relation reuse must not create another issue');
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
        'x-ratelimit-requests-remaining': '5',
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
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search', 'related-relation']);
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
      }
    });
    expect(calls).toEqual(['issue-summary', 'owner-search', 'related-relation']);
  });

  it('does not reuse terminal CO-254-style canonical owners and stamps the new owner', async () => {
    const canonicalOwnerKey =
      'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-19|cadence_days:30';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription();
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
                }
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

  it('does not reuse a canonical owner marker that only has a prefix match', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:co-1';
    const longerCanonicalOwnerKey = 'baseline_cohort_id:co-10';
    const longerCanonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${longerCanonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription();
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

  it('does not stamp a canonical owner marker before the traceability update succeeds', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription();
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
      expect(String(result.error.details?.created_issue)).not.toContain(canonicalOwnerMarker);
      expect(JSON.stringify(result.error.details?.created_issue)).not.toContain(canonicalOwnerMarker);
    }
    expect(calls).toEqual(['owner-search', 'create', 'update-description']);
  });

  it('reconciles a post-create canonical owner race before relation handoff', async () => {
    const canonicalOwnerKey = 'baseline_cohort_id:apr-19-docs-freshness';
    const canonicalOwnerMarker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
    const supersededMarker = `codex-orchestrator:superseded-canonical-owner-key=${canonicalOwnerKey}`;
    const initialDescription = buildExpectedFollowUpDescription();
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
                }
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
                  }
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

  it('fails follow-up creation fast when the shared request budget is clearly insufficient', async () => {
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
        'x-ratelimit-requests-remaining': '2',
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
          required_requests_remaining: 4,
          shortfall_bucket: 'requests',
          shortfall_remaining: 2
        }
      }
    });
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
                }
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
            }
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
                }
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
                }
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
            }
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
                }
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
                }
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
            }
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
