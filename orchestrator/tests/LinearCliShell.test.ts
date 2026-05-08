import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runLinearCliShell } from '../src/cli/linearCliShell.js';
import { PROVIDER_LINEAR_WORKER_PROOF_FILENAME } from '../src/cli/providerLinearWorkerRunner.js';

const tempDirs: string[] = [];
const FOLLOW_UP_PARITY_MATRIX_MISSING_MESSAGE =
  'Parity/alignment follow-up issues require a parity matrix.';
const FOLLOW_UP_PACKET_TRACEABILITY_PENDING_MESSAGE =
  'Backlog admission remains blocked until follow-up packet files, registry mirrors, and the Linear packet prefix are present.';
const DEFAULT_PARITY_FOLLOW_UP_FLAGS = {
  format: 'json',
  'issue-id': 'lin-issue-1',
  title: 'Parity follow-up',
  description: 'Close the remaining parity gap.',
  'intent-checksum': '- Preserve exact `CO STATUS` wording.',
  'non-goals': '- [ ] Do not reopen the browser surface.',
  'not-done-if': '- [ ] The issue still allows browser-first parity.',
  'acceptance-criteria': '- [ ] Captured',
  'parity-lane': true
} as const;
const ISSUE_LABEL_NODES = [
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

afterEach(() => {
  vi.restoreAllMocks();
});

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

function buildParityFollowUpFlags(overrides: Record<string, string | boolean> = {}) {
  return {
    ...DEFAULT_PARITY_FOLLOW_UP_FLAGS,
    ...overrides
  };
}

function buildParityMatrixMissingAuditEntry(overrides: Record<string, unknown> = {}) {
  return {
    recorded_at: '2026-04-22T08:05:00.000Z',
    operation: 'create-follow-up',
    ok: false,
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-1',
    source_setup: null,
    action: null,
    via: null,
    state: null,
    follow_up_issue_id: null,
    follow_up_issue_identifier: null,
    follow_up_intent_key: 'title=parity%20follow-up;canonical=;blocked=0;parity=1',
    failed_relation_type: null,
    comment_id: null,
    attachment_id: null,
    error_code: 'linear_follow_up_parity_matrix_missing',
    error_message: FOLLOW_UP_PARITY_MATRIX_MISSING_MESSAGE,
    ...overrides
  };
}

function buildPacketTraceabilityPendingAuditEntry(overrides: Record<string, unknown> = {}) {
  return {
    recorded_at: '2026-04-22T08:05:00.000Z',
    operation: 'create-follow-up',
    ok: false,
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-1',
    source_setup: null,
    action: 'created',
    via: 'related',
    state: 'Backlog',
    follow_up_issue_id: 'lin-issue-2',
    follow_up_issue_identifier: 'CO-2',
    follow_up_intent_key: 'title=follow-up;canonical=;blocked=0;parity=0',
    failed_relation_type: null,
    comment_id: null,
    attachment_id: null,
    error_code: 'linear_follow_up_packet_traceability_pending',
    error_message: FOLLOW_UP_PACKET_TRACEABILITY_PENDING_MESSAGE,
    ...overrides
  };
}

function buildReadyFollowUpTraceability(input: {
  blockedBySource?: boolean;
  observedState?: Record<string, unknown> | null;
} = {}) {
  const blockedBySource = input.blockedBySource === true;
  return {
    labels: {
      source_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      requested_labels: [],
      observed_labels: [],
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
        requested: blockedBySource,
        satisfied: blockedBySource,
        action: blockedBySource ? 'created' : 'not_requested',
        issue_id: 'lin-issue-1',
        related_issue_id: 'lin-issue-2'
      }
    },
    packet: {
      packet_prefix: 'linear-lin-issue-2',
      canonical_task_id: '20260508-linear-lin-issue-2',
      canonical_task_id_pattern: '^\\d{8}-linear-lin-issue-2$',
      required_paths: [],
      registry_mirrors: [],
      observed_state: input.observedState ?? null,
      readiness: {
        checked: true,
        repo_root: '/repo',
        description_has_packet_prefix: true,
        ready: true,
        missing_paths: [],
        missing_registry_mirrors: []
      },
      queue_admission_blocker: null
    }
  };
}

async function createSameAttemptFollowUpFixture(prefix: string, auditEntries: Record<string, unknown>[] = []) {
  const { auditPath, tempDir } = await createProviderLinearAuditFixture(prefix);
  if (auditEntries.length > 0) {
    await writeFile(
      auditPath,
      `${auditEntries.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
      'utf8'
    );
  }
  await writeFile(
    join(tempDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
    JSON.stringify({
      attempt_started_at: '2026-04-22T08:00:00.000Z'
    }),
    'utf8'
  );
  const loadProviderLinearWorkerContextMock =
    vi.fn<typeof import('../src/cli/providerLinearWorkerRunner.js').loadProviderLinearWorkerContext>()
      .mockResolvedValue({
        pipelineId: 'provider-linear-worker',
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-1',
        runDir: tempDir
      } as never);
  return { auditPath, loadProviderLinearWorkerContextMock };
}

async function createProviderLinearAuditFixture(prefix: string) {
  const tempDir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(tempDir);
  return {
    auditPath: join(tempDir, 'provider-linear-audit.jsonl'),
    tempDir
  };
}

async function seedCliFollowUpPacketReadiness(repoRoot: string, followUpTaskId: string): Promise<void> {
  const requiredPaths = [
    `docs/PRD-${followUpTaskId}.md`,
    `docs/TECH_SPEC-${followUpTaskId}.md`,
    `docs/ACTION_PLAN-${followUpTaskId}.md`,
    `tasks/specs/${followUpTaskId}.md`,
    `tasks/tasks-${followUpTaskId}.md`,
    `.agent/task/${followUpTaskId}.md`
  ];
  await Promise.all([
    mkdir(join(repoRoot, 'docs'), { recursive: true }),
    mkdir(join(repoRoot, 'tasks', 'specs'), { recursive: true }),
    mkdir(join(repoRoot, '.agent', 'task'), { recursive: true })
  ]);
  await Promise.all(requiredPaths.map((path) => writeFile(join(repoRoot, path), followUpTaskId, 'utf8')));
  const lastReview = new Date().toISOString().slice(0, 10);
  await Promise.all([
    writeFile(
      join(repoRoot, 'tasks/index.json'),
      JSON.stringify({
        items: [
          {
            id: `20260508-${followUpTaskId}`,
            relates_to: `tasks/tasks-${followUpTaskId}.md`,
            paths: {
              spec: `tasks/specs/${followUpTaskId}.md`,
              task: `tasks/tasks-${followUpTaskId}.md`,
              agent_task: `.agent/task/${followUpTaskId}.md`,
              prd: `docs/PRD-${followUpTaskId}.md`,
              docs: `docs/TECH_SPEC-${followUpTaskId}.md`,
              action_plan: `docs/ACTION_PLAN-${followUpTaskId}.md`
            }
          }
        ]
      }),
      'utf8'
    ),
    writeFile(
      join(repoRoot, 'docs/TASKS.md'),
      `Packet ${followUpTaskId}: ${requiredPaths.join(', ')}`,
      'utf8'
    ),
    writeFile(
      join(repoRoot, 'docs/docs-freshness-registry.json'),
      JSON.stringify({
        entries: requiredPaths.map((path) => ({
          path,
          owner: 'Codex (top-level agent), Review agent',
          status: 'active',
          last_review: lastReview,
          cadence_days: 30
        }))
      }),
      'utf8'
    )
  ]);
}

async function readOptionalTextFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? (error as { code?: unknown }).code
      : null;
    if (code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

describe('runLinearCliShell', () => {
  it('routes issue-context labels into the facade and emits json', async () => {
    const printHelp = vi.fn();
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const getProviderLinearIssueContextMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').getProviderLinearIssueContext>()
        .mockResolvedValue({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1',
            title: 'Add Linear helper',
            description: null,
            url: null,
            updated_at: null,
            workspace_id: 'lin-workspace-1',
            state: null,
            team: null,
            project: null,
            labels: ISSUE_LABEL_NODES,
            comments: [],
            attachments: [],
            workpad_comment: null
          },
          source_setup: {
            provider: 'linear',
            workspace_id: 'lin-workspace-1',
            team_id: 'lin-team-1',
            project_id: null
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['issue-context'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          'workspace-id': 'lin-workspace-1',
          'team-id': 'lin-team-1'
        },
        printHelp
      },
      {
        getProviderLinearIssueContext: getProviderLinearIssueContextMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(printHelp).not.toHaveBeenCalled();
    expect(getProviderLinearIssueContextMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: null
      },
      allowReadOnlyCacheReuse: true,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-1',
        labels: ISSUE_LABEL_NODES
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'issue-context',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-1',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: null
      },
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
  });

  it('routes transition guard flags into the facade and records transition audit metadata', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const transitionProviderLinearIssueStateMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').transitionProviderLinearIssueState>()
        .mockResolvedValue({
          ok: true,
          operation: 'transition',
          action: 'updated',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1',
            updated_at: '2026-04-17T06:05:00.000Z',
            state: {
              id: 'state-merging',
              name: 'Merging',
              type: 'started'
            }
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
          },
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['transition'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          state: 'Merging',
          'expected-state': 'Done',
          'expected-state-type': 'completed',
          'expected-updated-at': '2026-04-17T06:00:27.516Z',
          force: true,
          'force-reason': 'manual reopen after merge-race correction'
        },
        printHelp: vi.fn()
      },
      {
        transitionProviderLinearIssueState: transitionProviderLinearIssueStateMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-04-17T06:05:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(transitionProviderLinearIssueStateMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'Done',
      expectedStateType: 'completed',
      expectedUpdatedAt: '2026-04-17T06:00:27.516Z',
      force: true,
      forceReason: 'manual reopen after merge-race correction',
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-04-17T06:05:00.000Z',
      operation: 'transition',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-1',
      source_setup: null,
      action: 'updated',
      via: null,
      state: 'Merging',
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      previous_state: 'Done',
      previous_state_type: 'completed',
      target_state: 'Merging',
      target_state_type: 'started',
      issue_updated_at: '2026-04-17T06:05:00.000Z',
      expected_state: 'Done',
      expected_state_type: 'completed',
      expected_updated_at: '2026-04-17T06:00:27.516Z',
      force: true,
      force_reason: 'manual reopen after merge-race correction',
      error_code: null,
      error_message: null
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'transition',
      transition_guard: {
        expected_state: 'Done',
        force: true
      }
    });
  });

  it('records resolved issue identity for transition guard failures in the audit entry', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const transitionProviderLinearIssueStateMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').transitionProviderLinearIssueState>()
        .mockResolvedValue({
          ok: false,
          operation: 'transition',
          error: {
            code: 'linear_transition_conflict',
            message: 'Linear issue CO-1 no longer matches the expected transition preconditions (state, updated_at).',
            status: 409,
            details: {
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-1',
              previous_state: 'Done',
              previous_state_type: 'completed',
              target_state: 'Merging',
              target_state_type: 'started',
              issue_updated_at: '2026-04-17T06:00:27.516Z',
              expected_state: 'In Review',
              expected_state_type: 'started',
              expected_updated_at: '2026-04-17T05:53:29.672Z',
              force: false,
              force_reason: null
            }
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['transition'],
        flags: {
          format: 'json',
          'issue-id': 'CO-1',
          state: 'Merging',
          'expected-state': 'In Review',
          'expected-state-type': 'started',
          'expected-updated-at': '2026-04-17T05:53:29.672Z'
        },
        printHelp: vi.fn()
      },
      {
        transitionProviderLinearIssueState: transitionProviderLinearIssueStateMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-04-17T06:05:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-04-17T06:05:00.000Z',
      operation: 'transition',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-1',
      source_setup: null,
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      previous_state: 'Done',
      previous_state_type: 'completed',
      target_state: 'Merging',
      target_state_type: 'started',
      issue_updated_at: '2026-04-17T06:00:27.516Z',
      expected_state: 'In Review',
      expected_state_type: 'started',
      expected_updated_at: '2026-04-17T05:53:29.672Z',
      force: false,
      force_reason: null,
      error_code: 'linear_transition_conflict',
      error_message:
        'Linear issue CO-1 no longer matches the expected transition preconditions (state, updated_at).'
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_transition_conflict'
      }
    });
  });

  it('preserves fallback issue identity and requested guard inputs when transition failure details omit them', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const transitionProviderLinearIssueStateMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').transitionProviderLinearIssueState>()
        .mockResolvedValue({
          ok: false,
          operation: 'transition',
          error: {
            code: 'linear_rate_limited',
            message: 'Linear API rate limit exceeded.',
            status: 429,
            details: {
              retry_after_ms: 1200
            }
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['transition'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          state: 'Merging',
          'expected-state': 'In Review',
          'expected-state-type': 'started',
          'expected-updated-at': '2026-04-17T05:53:29.672Z',
          force: true,
          'force-reason': 'manual reopen after merge-race correction'
        },
        printHelp: vi.fn()
      },
      {
        transitionProviderLinearIssueState: transitionProviderLinearIssueStateMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-04-17T10:55:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-04-17T10:55:00.000Z',
      operation: 'transition',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      previous_state: null,
      previous_state_type: null,
      target_state: null,
      target_state_type: null,
      issue_updated_at: null,
      expected_state: 'In Review',
      expected_state_type: 'started',
      expected_updated_at: '2026-04-17T05:53:29.672Z',
      force: true,
      force_reason: 'manual reopen after merge-race correction',
      error_code: 'linear_rate_limited',
      error_message: 'Linear API rate limit exceeded.'
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: false,
      operation: 'transition',
      error: {
        code: 'linear_rate_limited'
      }
    });
  });

  it('reads workpad content from a file before calling the facade', async () => {
    const upsertProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').upsertProviderLinearWorkpadComment>()
        .mockResolvedValue({
          ok: true,
          operation: 'upsert-workpad',
          action: 'noop',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          comment: {
            id: 'comment-1',
            body: '## Codex Workpad\n\nPlan',
            url: null,
            created_at: null,
            updated_at: null
          },
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['upsert-workpad'],
        flags: {
          'issue-id': 'lin-issue-1',
          'body-file': '/tmp/workpad.md'
        },
        printHelp: vi.fn()
      },
      {
        upsertProviderLinearWorkpadComment: upsertProviderLinearWorkpadCommentMock,
        readTextFile: vi.fn(async () => '## Codex Workpad\n\nPlan'),
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        log: vi.fn()
      }
    );

    expect(upsertProviderLinearWorkpadCommentMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      body: '## Codex Workpad\n\nPlan',
      bodyFilePath: '/tmp/workpad.md',
      commentId: null,
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
  });

  it('resolves relative body-file paths against the shell cwd before calling the facade', async () => {
    const readTextFile = vi.fn(async () => '## Codex Workpad\n\nPlan');
    const upsertProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').upsertProviderLinearWorkpadComment>()
        .mockResolvedValue({
          ok: true,
          operation: 'upsert-workpad',
          action: 'noop',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          comment: {
            id: 'comment-1',
            body: '## Codex Workpad\n\nPlan',
            url: null,
            created_at: null,
            updated_at: null
          },
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['upsert-workpad'],
        flags: {
          'issue-id': 'lin-issue-1',
          'body-file': 'packet/workpad.md'
        },
        printHelp: vi.fn()
      },
      {
        upsertProviderLinearWorkpadComment: upsertProviderLinearWorkpadCommentMock,
        readTextFile,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        getCwd: () => '/tmp/session-root',
        log: vi.fn()
      }
    );

    expect(readTextFile).toHaveBeenCalledWith('/tmp/session-root/packet/workpad.md');
    expect(upsertProviderLinearWorkpadCommentMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      body: '## Codex Workpad\n\nPlan',
      bodyFilePath: '/tmp/session-root/packet/workpad.md',
      commentId: null,
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
  });

  it('treats string boolean literals as enabled for blocked-by-source', async () => {
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
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
            title: 'Follow-up',
            description: 'Investigate',
            url: 'https://linear.app/example/issue/CO-2',
            state: null,
            team: null,
            project: null
          },
          relations: {
            related: true,
            blocked_by_source: true
          },
          traceability: buildReadyFollowUpTraceability({
            blockedBySource: true
          }),
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate',
          'intent-checksum': '- Preserve exact `CO STATUS` wording.',
          'non-goals': '- [ ] Do not reopen the browser surface.',
          'not-done-if': '- [ ] The issue still allows browser-first parity.',
          'acceptance-criteria': '- [ ] Captured',
          'blocked-by-source': 'true'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        getCwd: () => '/repo',
        log: vi.fn()
      }
    );

    expect(createProviderLinearFollowUpIssueMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      title: 'Follow-up',
      description: 'Investigate',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      parityLane: false,
      parityMatrix: null,
      canonicalOwnerKey: null,
      blockedBySource: true,
      repoRoot: '/repo',
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
  });

  it('resolves create-follow-up packet readiness repo root from the cwd hint', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'linear-cli-follow-up-root-'));
    tempDirs.push(repoRoot);
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await mkdir(join(repoRoot, 'packages', 'app'), { recursive: true });
    await mkdir(join(repoRoot, 'packages', 'app', '.git'), { recursive: true });
    await writeFile(join(repoRoot, 'tasks/index.json'), '{}');
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
          ok: false,
          operation: 'create-follow-up',
          error: {
            code: 'linear_follow_up_label_resolution_failed',
            message: 'missing label',
            status: 422
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate',
          'intent-checksum': '- Preserve exact `CO STATUS` wording.',
          'non-goals': '- [ ] Do not reopen the browser surface.',
          'not-done-if': '- [ ] The issue still allows browser-first parity.',
          'acceptance-criteria': '- [ ] Captured'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        getCwd: () => join(repoRoot, 'packages', 'app'),
        log: vi.fn(),
        setExitCode: vi.fn()
      }
    );

    expect(createProviderLinearFollowUpIssueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 'lin-issue-1',
        repoRoot
      })
    );
  });

  it('routes runtime-proof into the policy resolver and records audit metadata', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const resolveProviderLinearRuntimeProofMock =
      vi.fn<typeof import('../src/cli/control/providerLinearRuntimeProof.js').resolveProviderLinearRuntimeProof>()
        .mockResolvedValue({
          ok: true,
          policy: {
            origin: 'https://app.example.com',
            permit_path: '/repo/compliance/permit.json',
            permit_status: 'found',
            approval_id: 'approval-1',
            approver: 'Approval Board',
            capabilities: {
              screenshot: true,
              external_link: false,
              video: false
            },
            allowed_kinds: ['screenshot'],
            blocked_kinds: ['external-link', 'video'],
            summary:
              'screenshot proof is permitted for https://app.example.com; external-link and video are blocked.'
          },
          proof: {
            kind: 'screenshot',
            reviewer_url: 'https://review-assets.example.com/proof.png',
            title: 'Dashboard after launch-app validation',
            summary: 'Signed-in dashboard state.'
          },
          handoff: {
            workpad_markdown:
              '- Runtime proof policy: screenshot proof is permitted for https://app.example.com; external-link and video are blocked.',
            pr_markdown: '### Runtime Proof'
          },
          reachability: {
            mode: 'dns-public',
            dns_ran: true,
            hostname: 'review-assets.example.com',
            resolved_addresses: ['93.184.216.34'],
            summary: 'Worker-local DNS resolved review-assets.example.com to public addresses only: 93.184.216.34.',
            caveat:
              'This is worker-local DNS evidence only. Reviewer reachability is not guaranteed across other networks, resolvers, or future DNS changes.'
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['runtime-proof'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          origin: 'https://app.example.com',
          kind: 'screenshot',
          'proof-url': 'https://review-assets.example.com/proof.png',
          title: 'Dashboard after launch-app validation',
          summary: 'Signed-in dashboard state.',
          'reachability-mode': 'dns-public'
        },
        printHelp: vi.fn()
      },
      {
        resolveProviderLinearRuntimeProof: resolveProviderLinearRuntimeProofMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        getCwd: () => '/repo',
        now: () => '2026-03-27T05:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(resolveProviderLinearRuntimeProofMock).toHaveBeenCalledWith({
      repoRoot: '/repo',
      origin: 'https://app.example.com',
      kind: 'screenshot',
      proofUrl: 'https://review-assets.example.com/proof.png',
      title: 'Dashboard after launch-app validation',
      summary: 'Signed-in dashboard state.',
      reachabilityMode: 'dns-public'
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'runtime-proof',
      issue_id: 'lin-issue-1',
      proof: {
        kind: 'screenshot'
      },
      handoff: {
        pr_markdown: '### Runtime Proof'
      },
      reachability: {
        mode: 'dns-public',
        dns_ran: true
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-27T05:00:00.000Z',
      operation: 'runtime-proof',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: 'screenshot',
      via: 'permit:found',
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
  });

  it('routes screenshot-proof into the local macOS capture resolver and records audit metadata', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const resolveProviderLinearScreenshotProofMock =
      vi.fn<typeof import('../src/cli/control/providerLinearScreenshotProof.js').resolveProviderLinearScreenshotProof>()
        .mockResolvedValue({
          ok: true,
          capture: {
            platform: 'darwin',
            mode: 'display',
            display_id: null,
            window_id: null,
            open_preview: false,
            command: {
              executable: 'screencapture',
              args: ['-x', '/repo/.tmp/proof.png']
            },
            output_path: '/repo/.tmp/proof.png',
            file_url: 'file:///repo/.tmp/proof.png',
            embed_markdown: '![Proof screenshot](file:///repo/.tmp/proof.png)',
            bytes: 42,
            media_type: 'image/png',
            cleanup: {
              attempted: false,
              status: 'skipped',
              summary: 'Cleanup skipped because the helper did not open a temporary Preview surface.',
              command: null,
              exit_code: null,
              stdout: null,
              stderr: null
            }
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['screenshot-proof'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          output: '/repo/.tmp/proof.png'
        },
        printHelp: vi.fn()
      },
      {
        resolveProviderLinearScreenshotProof: resolveProviderLinearScreenshotProofMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        getCwd: () => '/repo',
        now: () => '2026-04-08T06:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(resolveProviderLinearScreenshotProofMock).toHaveBeenCalledWith({
      cwd: '/repo',
      outputPath: '/repo/.tmp/proof.png',
      displayId: null,
      windowId: null,
      openPreview: false
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'screenshot-proof',
      issue_id: 'lin-issue-1',
      capture: {
        output_path: '/repo/.tmp/proof.png',
        cleanup: {
          status: 'skipped'
        }
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-04-08T06:00:00.000Z',
      operation: 'screenshot-proof',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: 'display',
      via: 'cleanup:skipped',
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
  });

  it('resolves runtime-proof permits from the repo root when invoked in a nested package directory', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'linear-cli-runtime-proof-root-'));
    tempDirs.push(repoRoot);
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, 'tasks', 'index.json'), '{"items":[]}', 'utf8');
    await mkdir(join(repoRoot, 'packages', 'app'), { recursive: true });

    const resolveProviderLinearRuntimeProofMock =
      vi.fn<typeof import('../src/cli/control/providerLinearRuntimeProof.js').resolveProviderLinearRuntimeProof>()
        .mockResolvedValue({
          ok: true,
          policy: {
            origin: 'https://app.example.com',
            permit_path: join(repoRoot, 'compliance', 'permit.json'),
            permit_status: 'missing',
            approval_id: null,
            approver: null,
            capabilities: {
              screenshot: false,
              external_link: false,
              video: false
            },
            allowed_kinds: [],
            blocked_kinds: ['screenshot', 'external-link', 'video'],
            summary: 'No permit'
          },
          proof: null,
          handoff: null,
          reachability: {
            mode: 'deterministic',
            dns_ran: false,
            hostname: null,
            resolved_addresses: [],
            summary: 'No proof URL was provided; the deterministic path leaves reviewer reachability out of scope.',
            caveat: 'No live DNS lookup was performed.'
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['runtime-proof'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          origin: 'https://app.example.com'
        },
        printHelp: vi.fn()
      },
      {
        resolveProviderLinearRuntimeProof: resolveProviderLinearRuntimeProofMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        getCwd: () => join(repoRoot, 'packages', 'app'),
        log: vi.fn()
      }
    );

    expect(resolveProviderLinearRuntimeProofMock).toHaveBeenCalledWith({
      repoRoot,
      origin: 'https://app.example.com',
      kind: null,
      proofUrl: null,
      title: undefined,
      summary: undefined,
      reachabilityMode: null
    });
  });

  it('preserves raw inline workpad body text instead of trimming surrounding newlines', async () => {
    const upsertProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').upsertProviderLinearWorkpadComment>()
        .mockResolvedValue({
          ok: true,
          operation: 'upsert-workpad',
          action: 'noop',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          comment: {
            id: 'comment-1',
            body: '\n## Codex Workpad\n\nPlan\n',
            url: null,
            created_at: null,
            updated_at: null
          },
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['upsert-workpad'],
        flags: {
          'issue-id': 'lin-issue-1',
          body: '\n## Codex Workpad\n\nPlan\n'
        },
        printHelp: vi.fn()
      },
      {
        upsertProviderLinearWorkpadComment: upsertProviderLinearWorkpadCommentMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        log: vi.fn()
      }
    );

    expect(upsertProviderLinearWorkpadCommentMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      body: '\n## Codex Workpad\n\nPlan\n',
      bodyFilePath: null,
      commentId: null,
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
  });

  it('routes delete-workpad into the facade and emits json', async () => {
    const log = vi.fn();
    const deleteProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').deleteProviderLinearWorkpadComment>()
        .mockResolvedValue({
          ok: true,
          operation: 'delete-workpad',
          action: 'deleted',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          comment_id: 'comment-1',
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['delete-workpad'],
        flags: {
          'issue-id': 'lin-issue-1',
          'comment-id': 'comment-1'
        },
        printHelp: vi.fn()
      },
      {
        deleteProviderLinearWorkpadComment: deleteProviderLinearWorkpadCommentMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        log
      }
    );

    expect(deleteProviderLinearWorkpadCommentMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      commentId: 'comment-1',
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: true,
      operation: 'delete-workpad',
      action: 'deleted',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment_id: 'comment-1',
      source_setup: null
    });
  });

  it('sets a non-zero exit code when a structured Linear operation fails', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn();
    const attachProviderLinearIssuePrMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').attachProviderLinearIssuePr>()
        .mockResolvedValue({
          ok: false,
          operation: 'attach-pr',
          error: {
            code: 'linear_graphql_error',
            message: 'Linear GraphQL returned operation errors.',
            status: 422
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['attach-pr'],
        flags: {
          'issue-id': 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123'
        },
        printHelp: vi.fn()
      },
      {
        attachProviderLinearIssuePr: attachProviderLinearIssuePrMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CO_LINEAR_WORKSPACE_ID: 'lin-workspace-1',
          CO_LINEAR_TEAM_ID: 'lin-team-1',
          CO_LINEAR_PROJECT_ID: 'lin-project-1',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 422
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'attach-pr',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: 'linear_graphql_error',
      error_message: 'Linear GraphQL returned operation errors.'
    });
  });

  it('routes create-follow-up into the facade and records audit metadata', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
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
            title: 'Follow-up',
            description: 'Do the thing',
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
          relations: {
            related: true,
            blocked_by_source: true
          },
          traceability: buildReadyFollowUpTraceability({
            blockedBySource: true,
            observedState: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            }
          }),
          canonical_owner: {
            key: 'baseline_cohort_id:co-175-apr-14-march-14-tasks-1164-1195',
            marker:
              'codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-175-apr-14-march-14-tasks-1164-1195'
          },
          source_setup: {
            provider: 'linear',
            workspace_id: 'lin-workspace-1',
            team_id: 'lin-team-1',
            project_id: 'lin-project-1'
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'intent-checksum-file': '/tmp/intent.md',
          'non-goals-file': '/tmp/non-goals.md',
          'not-done-if-file': '/tmp/not-done-if.md',
          'acceptance-criteria-file': '/tmp/acceptance.md',
          'parity-lane': true,
          'parity-matrix-file': '/tmp/parity.md',
          'canonical-owner-key-file': '/tmp/canonical-owner-key.txt',
          'blocked-by-source': true,
          'workspace-id': 'lin-workspace-1',
          'team-id': 'lin-team-1',
          'project-id': 'lin-project-1'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        readTextFile: vi.fn(async (path: string) => {
          if (path === '/tmp/intent.md') {
            return '- Preserve exact `CO STATUS` wording.';
          }
          if (path === '/tmp/non-goals.md') {
            return '- [ ] Do not reopen the browser surface.';
          }
          if (path === '/tmp/not-done-if.md') {
            return '- [ ] The issue still allows browser-first parity.';
          }
          if (path === '/tmp/parity.md') {
            return '- Current: browser-first\n- Reference: Symphony terminal parity\n- Target: exact terminal parity\n- Out of scope: unrelated UI additions';
          }
          if (path === '/tmp/canonical-owner-key.txt') {
            return 'baseline_cohort_id:co-175-apr-14-march-14-tasks-1164-1195';
          }
          return '- [ ] Captured';
        }),
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        getCwd: () => '/repo',
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(createProviderLinearFollowUpIssueMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      title: 'Follow-up',
      description: 'Investigate the remaining improvement',
      intentChecksum: '- Preserve exact `CO STATUS` wording.',
      nonGoals: '- [ ] Do not reopen the browser surface.',
      notDoneIf: '- [ ] The issue still allows browser-first parity.',
      acceptanceCriteria: '- [ ] Captured',
      parityLane: true,
      parityMatrix:
        '- Current: browser-first\n- Reference: Symphony terminal parity\n- Target: exact terminal parity\n- Out of scope: unrelated UI additions',
      canonicalOwnerKey: 'baseline_cohort_id:co-175-apr-14-march-14-tasks-1164-1195',
      blockedBySource: true,
      repoRoot: '/repo',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      follow_up_issue: {
        identifier: 'CO-2',
        url: 'https://linear.app/example/issue/CO-2'
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'create-follow-up',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-1',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      action: 'created',
      via: 'related+blocks',
      state: 'Backlog',
      follow_up_issue_id: 'lin-issue-2',
      follow_up_issue_identifier: 'CO-2',
      follow_up_intent_key:
        'title=follow-up;canonical=baseline_cohort_id%3Aco-175-apr-14-march-14-tasks-1164-1195;blocked=1;parity=1',
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
  });

  it('records packet-blocked create-follow-up results as failed before output and audit', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn();
    const { auditPath } = await createProviderLinearAuditFixture('linear-cli-follow-up-packet-blocked-');
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
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
            title: 'Follow-up',
            description: 'Do the thing',
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            }
          },
          relations: {
            related: true,
            blocked_by_source: false
          },
          traceability: {
            packet: {
              packet_prefix: 'linear-lin-issue-2',
              queue_admission_blocker: {
                reason: 'backlog_head_follow_up_traceability_pending',
                state: 'Backlog',
                enforced_by: 'create-follow-up',
                summary:
                  'Backlog admission remains blocked until follow-up packet files, registry mirrors, and the Linear packet prefix are present.'
              }
            }
          },
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'intent-checksum': '- Preserve exact `CO STATUS` wording.',
          'non-goals': '- [ ] Do not reopen the browser surface.',
          'not-done-if': '- [ ] The issue still allows browser-first parity.',
          'acceptance-criteria': '- [ ] Captured'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: auditPath
        }),
        now: () => '2026-04-22T08:05:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_packet_traceability_pending',
        status: 409,
        retryable: false,
        details: {
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2'
          },
          traceability: {
            packet: {
              queue_admission_blocker: {
                reason: 'backlog_head_follow_up_traceability_pending',
                state: 'Backlog',
                enforced_by: 'create-follow-up'
              }
            }
          }
        }
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith(auditPath, expect.objectContaining({
      operation: 'create-follow-up',
      ok: false,
      issue_id: 'lin-issue-1',
      action: 'created',
      via: 'related',
      state: 'Backlog',
      follow_up_issue_id: 'lin-issue-2',
      follow_up_issue_identifier: 'CO-2',
      follow_up_intent_key: 'title=follow-up;canonical=;blocked=0;parity=0',
      error_code: 'linear_follow_up_packet_traceability_pending',
      error_message: FOLLOW_UP_PACKET_TRACEABILITY_PENDING_MESSAGE
    }));
  });

  it('records follow-up recovery metadata when create-follow-up fails after issue creation', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
          ok: false,
          operation: 'create-follow-up',
          error: {
            code: 'linear_graphql_error',
            message: 'Linear GraphQL returned operation errors.',
            status: 502,
            details: {
              errors: ['relation failed'],
              created_issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2'
              },
              failed_relation_type: 'blocks'
            }
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'intent-checksum': '- Preserve exact `CO STATUS` wording.',
          'non-goals': '- [ ] Do not reopen the browser surface.',
          'not-done-if': '- [ ] The issue still allows browser-first parity.',
          'acceptance-criteria': '- [ ] Captured'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 502,
        details: {
          errors: ['relation failed'],
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2'
          },
          failed_relation_type: 'blocks'
        }
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'create-follow-up',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: 'lin-issue-2',
      follow_up_issue_identifier: 'CO-2',
      follow_up_intent_key: 'title=follow-up;canonical=;blocked=0;parity=0',
      failed_relation_type: 'blocks',
      comment_id: null,
      attachment_id: null,
      error_code: 'linear_graphql_error',
      error_message: 'Linear GraphQL returned operation errors.'
    });
  });

  it('records the canonical follow-up owner from split relation failure metadata', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
          ok: false,
          operation: 'create-follow-up',
          error: {
            code: 'linear_graphql_error',
            message: 'Linear GraphQL returned operation errors.',
            status: 409,
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
              failed_relation_type: 'related'
            }
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'intent-checksum': '- Preserve exact `CO STATUS` wording.',
          'non-goals': '- [ ] Do not reopen the browser surface.',
          'not-done-if': '- [ ] The issue still allows browser-first parity.',
          'acceptance-criteria': '- [ ] Captured'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'create-follow-up',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: 'lin-issue-254',
      follow_up_issue_identifier: 'CO-254',
      follow_up_intent_key: 'title=follow-up;canonical=;blocked=0;parity=0',
      failed_relation_type: 'related',
      comment_id: null,
      attachment_id: null,
      error_code: 'linear_graphql_error',
      error_message: 'Linear GraphQL returned operation errors.'
    });
  });

  it('fails closed when create-follow-up omits the required intent checksum', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'non-goals': '- [ ] Do not reopen the browser surface.',
          'not-done-if': '- [ ] The issue still allows browser-first parity.',
          'acceptance-criteria': '- [ ] Captured'
        },
        printHelp: vi.fn()
      },
      {
        getEnv: () => ({}),
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'linear_intent_checksum_missing',
        message: '--intent-checksum or --intent-checksum-file is required.',
        status: 422
      }
    });
  });

  it('fails closed when create-follow-up marks a parity lane without a parity matrix', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const { auditPath } = await createProviderLinearAuditFixture('linear-cli-follow-up-parity-missing-');
    const { auditPath: liveProviderAuditPath } =
      await createProviderLinearAuditFixture('linear-cli-live-provider-audit-');
    const originalProviderAuditPath = process.env.CODEX_PROVIDER_LINEAR_AUDIT_PATH;

    try {
      process.env.CODEX_PROVIDER_LINEAR_AUDIT_PATH = liveProviderAuditPath;

      await runLinearCliShell(
        {
          positionals: ['create-follow-up'],
          flags: buildParityFollowUpFlags(),
          printHelp: vi.fn()
        },
        {
          getEnv: () => ({
            CO_LINEAR_API_TOKEN: 'lin-api-token',
            CODEX_PROVIDER_LINEAR_AUDIT_PATH: auditPath
          }),
          now: () => '2026-04-22T08:05:00.000Z',
          log,
          setExitCode
        }
      );
    } finally {
      if (originalProviderAuditPath === undefined) {
        delete process.env.CODEX_PROVIDER_LINEAR_AUDIT_PATH;
      } else {
        process.env.CODEX_PROVIDER_LINEAR_AUDIT_PATH = originalProviderAuditPath;
      }
    }

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_parity_matrix_missing',
        message: 'Parity/alignment follow-up issues require a parity matrix.',
        status: 422
      }
    });
    expect(await readOptionalTextFile(liveProviderAuditPath)).toBeNull();
    const auditContents = await readOptionalTextFile(auditPath);
    expect(auditContents).not.toBeNull();
    expect(JSON.parse(auditContents ?? '')).toMatchObject({
      recorded_at: '2026-04-22T08:05:00.000Z',
      operation: 'create-follow-up',
      ok: false,
      issue_id: 'lin-issue-1',
      error_code: 'linear_follow_up_parity_matrix_missing',
      error_message: FOLLOW_UP_PARITY_MATRIX_MISSING_MESSAGE
    });
  });

  it('suppresses same-attempt parity follow-up retries when the inputs remain unchanged', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const setExitCode = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>();
    const { auditPath, loadProviderLinearWorkerContextMock } = await createSameAttemptFollowUpFixture(
      'linear-cli-follow-up-retry-',
      [buildParityMatrixMissingAuditEntry()]
    );

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: buildParityFollowUpFlags(),
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        loadProviderLinearWorkerContext: loadProviderLinearWorkerContextMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: auditPath
        }),
        now: () => '2026-04-22T08:06:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(createProviderLinearFollowUpIssueMock).not.toHaveBeenCalled();
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_parity_matrix_retry_suppressed',
        message:
          'Same-attempt retry suppressed: Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix or explicitly reclassify the follow-up as non-parity/alignment and omit `--parity-lane`.',
        status: 409
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith(auditPath, {
      recorded_at: '2026-04-22T08:06:00.000Z',
      operation: 'create-follow-up',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      follow_up_intent_key: 'title=parity%20follow-up;canonical=;blocked=0;parity=1',
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: 'linear_follow_up_parity_matrix_retry_suppressed',
      error_message:
        'Same-attempt retry suppressed: Do not retry `create-follow-up` in this attempt unless you first add the required parity matrix or explicitly reclassify the follow-up as non-parity/alignment and omit `--parity-lane`.'
    });
  });

  it('suppresses same-attempt packet-blocked follow-up retries before creating duplicates', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const setExitCode = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>();
    const { auditPath, loadProviderLinearWorkerContextMock } = await createSameAttemptFollowUpFixture(
      'linear-cli-follow-up-packet-retry-',
      [buildPacketTraceabilityPendingAuditEntry()]
    );

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'intent-checksum': '- Preserve exact `CO STATUS` wording.',
          'non-goals': '- [ ] Do not reopen the browser surface.',
          'not-done-if': '- [ ] The issue still allows browser-first parity.',
          'acceptance-criteria': '- [ ] Captured'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        loadProviderLinearWorkerContext: loadProviderLinearWorkerContextMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: auditPath
        }),
        now: () => '2026-04-22T08:06:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(createProviderLinearFollowUpIssueMock).not.toHaveBeenCalled();
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_packet_traceability_retry_suppressed',
        message:
          'Same-attempt retry suppressed: Do not retry `create-follow-up` in this attempt until you reconcile the existing follow-up issue from the error details and prove its packet prefix, packet files, docs/TASKS.md mirror, tasks/index.json entry, and docs-freshness registry entries are ready.',
        status: 409,
        details: {
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2'
          },
          audit_entry: {
            action: 'created',
            via: 'related',
            state: 'Backlog',
            follow_up_intent_key: 'title=follow-up;canonical=;blocked=0;parity=0',
            error_code: 'linear_follow_up_packet_traceability_pending'
          }
        }
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith(auditPath, expect.objectContaining({
      recorded_at: '2026-04-22T08:06:00.000Z',
      operation: 'create-follow-up',
      ok: false,
      issue_id: 'lin-issue-1',
      error_code: 'linear_follow_up_packet_traceability_retry_suppressed'
    }));
  });

  it('allows packet-blocked follow-up retries after packet mirrors are reconciled locally', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const repoRoot = await mkdtemp(join(tmpdir(), 'linear-cli-follow-up-reconciled-retry-'));
    tempDirs.push(repoRoot);
    await seedCliFollowUpPacketReadiness(repoRoot, 'linear-lin-issue-2');
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
          ok: true,
          operation: 'create-follow-up',
          action: 'reused',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up',
            description: 'Do the thing',
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            team: null,
            project: null
          },
          canonical_owner: null,
          relations: {
            related: true,
            blocked_by_source: false
          },
          traceability: buildReadyFollowUpTraceability(),
          source_setup: null
        } as never);
    const { auditPath, loadProviderLinearWorkerContextMock } = await createSameAttemptFollowUpFixture(
      'linear-cli-follow-up-packet-ready-retry-',
      [buildPacketTraceabilityPendingAuditEntry()]
    );

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'intent-checksum': '- Preserve exact `CO STATUS` wording.',
          'non-goals': '- [ ] Do not reopen the browser surface.',
          'not-done-if': '- [ ] The issue still allows browser-first parity.',
          'acceptance-criteria': '- [ ] Captured'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        loadProviderLinearWorkerContext: loadProviderLinearWorkerContextMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: auditPath
        }),
        getCwd: () => repoRoot,
        now: () => '2026-04-22T08:06:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(createProviderLinearFollowUpIssueMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'reused',
      follow_up_issue: {
        id: 'lin-issue-2',
        identifier: 'CO-2'
      }
    });
  });

  it('allows a same-attempt parity follow-up retry once the parity matrix is supplied', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
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
            title: 'Parity follow-up',
            description: 'Close the remaining parity gap.',
            url: 'https://linear.app/example/issue/CO-2',
            state: null,
            team: null,
            project: null
          },
          canonical_owner: null,
          relations: {
            related: true,
            blocked_by_source: false
          },
          traceability: buildReadyFollowUpTraceability(),
          source_setup: null
        } as never);
    const { auditPath, loadProviderLinearWorkerContextMock } = await createSameAttemptFollowUpFixture(
      'linear-cli-follow-up-parity-',
      [buildParityMatrixMissingAuditEntry()]
    );

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: buildParityFollowUpFlags({
          'parity-matrix': '| Current | Reference | Target |'
        }),
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        loadProviderLinearWorkerContext: loadProviderLinearWorkerContextMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: auditPath
        }),
        now: () => '2026-04-22T08:06:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(createProviderLinearFollowUpIssueMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      action: 'created',
      follow_up_issue: {
        identifier: 'CO-2'
      }
    });
  });

  it('falls back to the normal parity-matrix path when audit summarization fails', async () => {
    const log = vi.fn();
    const warn = vi.fn();
    const appendAuditEntry = vi.fn();
    const setExitCode = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
          ok: false,
          operation: 'create-follow-up',
          error: {
            code: 'linear_follow_up_parity_matrix_missing',
            message: FOLLOW_UP_PARITY_MATRIX_MISSING_MESSAGE,
            status: 422
          }
        } as never);
    const { auditPath, loadProviderLinearWorkerContextMock } = await createSameAttemptFollowUpFixture(
      'linear-cli-follow-up-audit-fallback-'
    );
    vi.spyOn(
      await import('../src/cli/control/providerLinearWorkflowAudit.js'),
      'summarizeProviderLinearAuditPath'
    ).mockRejectedValue(new Error('audit read failed'));

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: buildParityFollowUpFlags(),
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        loadProviderLinearWorkerContext: loadProviderLinearWorkerContextMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: auditPath
        }),
        now: () => '2026-04-22T08:06:00.000Z',
        appendAuditEntry,
        log,
        setExitCode,
        warn
      }
    );

    expect(createProviderLinearFollowUpIssueMock).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to summarize provider-linear audit')
    );
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_parity_matrix_missing',
        message: FOLLOW_UP_PARITY_MATRIX_MISSING_MESSAGE,
        status: 422
      }
    });
  });

  it('records only the explicitly requested scope for failed audit entries', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn();
    const attachProviderLinearIssuePrMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').attachProviderLinearIssuePr>()
        .mockResolvedValue({
          ok: false,
          operation: 'attach-pr',
          error: {
            code: 'linear_graphql_error',
            message: 'Linear GraphQL returned operation errors.',
            status: 422
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['attach-pr'],
        flags: {
          'issue-id': 'lin-issue-1',
          'workspace-id': 'lin-workspace-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123'
        },
        printHelp: vi.fn()
      },
      {
        attachProviderLinearIssuePr: attachProviderLinearIssuePrMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CO_LINEAR_TEAM_ID: 'lin-team-1',
          CO_LINEAR_PROJECT_ID: 'lin-project-1',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 422
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'attach-pr',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: null,
        project_id: null
      },
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: 'linear_graphql_error',
      error_message: 'Linear GraphQL returned operation errors.'
    });
  });

  it('does not fail a successful helper call when audit append best-effort logging fails', async () => {
    const log = vi.fn();
    const warn = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn().mockRejectedValue(new Error('disk full'));
    const getProviderLinearIssueContextMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').getProviderLinearIssueContext>()
        .mockResolvedValue({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1',
            title: 'Add Linear helper',
            description: null,
            url: null,
            updated_at: null,
            workspace_id: 'lin-workspace-1',
            state: null,
            team: null,
            project: null,
            comments: [],
            attachments: [],
            workpad_comment: null
          },
          source_setup: null
        } as never);

    await expect(
      runLinearCliShell(
        {
          positionals: ['issue-context'],
          flags: {
            format: 'json',
            'issue-id': 'lin-issue-1'
          },
          printHelp: vi.fn()
        },
        {
          getProviderLinearIssueContext: getProviderLinearIssueContextMock,
          getEnv: () => ({
            CO_LINEAR_API_TOKEN: 'lin-api-token',
            CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
          }),
          now: () => '2026-03-22T12:00:00.000Z',
          appendAuditEntry,
          log,
          warn,
          setExitCode
        }
      )
    ).resolves.toBeUndefined();

    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-1'
      }
    });
    expect(warn).toHaveBeenCalledWith(
      'linear audit warning: failed to append audit entry to /tmp/provider-linear-audit.jsonl: disk full'
    );
    expect(setExitCode).not.toHaveBeenCalled();
  });

  it('refreshes the matching provider-worker proof snapshot after recording a parallelization decision', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const loadProviderLinearWorkerContextMock =
      vi.fn<typeof import('../src/cli/providerLinearWorkerRunner.js').loadProviderLinearWorkerContext>()
        .mockResolvedValue({
          pipelineId: 'provider-linear-worker',
          issueId: 'lin-issue-1',
          issueIdentifier: 'CO-101',
          runDir: '/tmp/provider-run',
          taskId: 'linear-lin-issue-1',
          runId: 'provider-run-1'
        } as never);
    const refreshProviderLinearWorkerProofSnapshotMock =
      vi.fn<typeof import('../src/cli/providerLinearWorkerRunner.js').refreshProviderLinearWorkerProofSnapshot>()
        .mockResolvedValue({
          issue_id: 'lin-issue-1'
        } as never);

    await runLinearCliShell(
      {
        positionals: ['parallelization'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          decision: 'stay_serial',
          reason: 'single_bounded_change',
          summary: 'docs: no docs slice separates; test: no test slice separates; research: no research slice separates; review: no review slice separates.'
        },
        printHelp: vi.fn()
      },
      {
        getEnv: () => ({
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-04-08T07:10:00.000Z',
        readTextFile: vi.fn(async () => JSON.stringify({
          current_turn_started_at: '2026-04-08T07:09:45.000Z',
          latest_turn_id: 'turn-4',
          turn_count: 4
        })),
        appendAuditEntry,
        loadProviderLinearWorkerContext: loadProviderLinearWorkerContextMock,
        refreshProviderLinearWorkerProofSnapshot: refreshProviderLinearWorkerProofSnapshotMock,
        log
      }
    );

    expect(loadProviderLinearWorkerContextMock).toHaveBeenCalledWith({
      CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-04-08T07:10:00.000Z',
      operation: 'parallelization',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-101',
      source_setup: null,
      action: 'stay_serial',
      via: 'docs: no docs slice separates; test: no test slice separates; research: no research slice separates; review: no review slice separates.',
      state: 'single_bounded_change',
      decision_lineage: {
        schema_version: 1,
        parent_task_id: 'linear-lin-issue-1',
        parent_run_id: 'provider-run-1',
        parent_turn_started_at: '2026-04-08T07:09:45.000Z',
        parent_turn_id: 'turn-4',
        parent_turn_count: 4,
        decision_id: 'provider-linear-parallelization:provider-run-1:turn-4:2026-04-08T07_10_00.000Z',
        decision_recorded_at: '2026-04-08T07:10:00.000Z',
        decision: 'stay_serial',
        reason: 'single_bounded_change'
      },
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
    expect(refreshProviderLinearWorkerProofSnapshotMock).toHaveBeenCalledWith(
      '/tmp/provider-run',
      '/tmp/provider-linear-audit.jsonl',
      undefined,
      undefined,
      {
        CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
      }
    );
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'parallelization',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-101',
      decision: 'stay_serial',
      reason: 'single_bounded_change'
    });
  });

  it('skips provider-worker proof refresh when the loaded worker context belongs to another issue', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const loadProviderLinearWorkerContextMock =
      vi.fn<typeof import('../src/cli/providerLinearWorkerRunner.js').loadProviderLinearWorkerContext>()
        .mockResolvedValue({
          pipelineId: 'provider-linear-worker',
          issueId: 'lin-issue-2',
          issueIdentifier: 'CO-102',
          runDir: '/tmp/provider-run'
        } as never);
    const refreshProviderLinearWorkerProofSnapshotMock =
      vi.fn<typeof import('../src/cli/providerLinearWorkerRunner.js').refreshProviderLinearWorkerProofSnapshot>();

    await runLinearCliShell(
      {
        positionals: ['parallelization'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          decision: 'stay_serial',
          reason: 'single_bounded_change',
          summary: 'docs: no docs slice separates; test: no test slice separates; research: no research slice separates; review: no review slice separates.'
        },
        printHelp: vi.fn()
      },
      {
        getEnv: () => ({
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-04-08T07:11:00.000Z',
        appendAuditEntry,
        loadProviderLinearWorkerContext: loadProviderLinearWorkerContextMock,
        refreshProviderLinearWorkerProofSnapshot: refreshProviderLinearWorkerProofSnapshotMock,
        log
      }
    );

    expect(refreshProviderLinearWorkerProofSnapshotMock).not.toHaveBeenCalled();
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-04-08T07:11:00.000Z',
      operation: 'parallelization',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: 'stay_serial',
      via: 'docs: no docs slice separates; test: no test slice separates; research: no research slice separates; review: no review slice separates.',
      state: 'single_bounded_change',
      decision_lineage: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'parallelization',
      issue_id: 'lin-issue-1',
      issue_identifier: null
    });
  });

  it('fails closed when a parallelization decision omits the required summary evidence', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await runLinearCliShell(
      {
        positionals: ['parallelization'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          decision: 'parallelize_now',
          reason: 'independent_scope_available'
        },
        printHelp: vi.fn()
      },
      {
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'linear_parallelization_summary_missing',
        message: 'linear parallelization requires --summary with matrix/cap evidence for the decision.',
        status: 422
      }
    });
  });

  it('requires single_bounded_change summaries to account for docs, test, research, and review slices', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await runLinearCliShell(
      {
        positionals: ['parallelization'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          decision: 'stay_serial',
          reason: 'single_bounded_change',
          summary: 'docs test research review'
        },
        printHelp: vi.fn()
      },
      {
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'linear_parallelization_single_bounded_change_summary_incomplete',
        message:
          'linear parallelization single_bounded_change summaries must explain why no docs/test/research/review slice can be separated safely with labeled slice evidence; missing: docs, test, research, review.',
        status: 422
      }
    });
  });

  it('requires cap_exhausted evidence for cap-driven serial decisions', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await runLinearCliShell(
      {
        positionals: ['parallelization'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          decision: 'stay_serial',
          reason: 'existing_child_lane_active',
          summary: 'two active child lanes remain'
        },
        printHelp: vi.fn()
      },
      {
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'linear_parallelization_cap_exhausted_summary_missing',
        message:
          'linear parallelization existing_child_lane_active summaries must include labeled cap_exhausted evidence, for example `cap_exhausted: 2/2 active child lanes`.',
        status: 422
      }
    });
  });

  it('routes child-stream into the provider worker launcher and audits the result', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const runProviderLinearChildStreamShellMock =
      vi.fn<typeof import('../src/cli/providerLinearChildStreamShell.js').runProviderLinearChildStreamShell>()
        .mockResolvedValue({
          ok: true,
          operation: 'child-stream',
          action: 'launched',
          issue: { id: 'lin-issue-1', identifier: 'CO-13' },
          source_setup: null,
          stream: 'docs-review',
          pipeline_id: 'docs-review',
          child_run: {
            run_id: 'docs-run-1',
            task_id: 'linear-lin-issue-1-docs-review',
            pipeline_id: 'docs-review',
            status: 'succeeded',
            artifact_root: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1',
            manifest_path: '/tmp/repo/.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/manifest.json',
            log_path: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/run.log',
            summary: 'docs-review passed',
            runtime_mode_requested: null,
            runtime_mode: null,
            runtime_provider: null
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['child-stream'],
        flags: {
          format: 'json',
          pipeline: 'docs-review'
        },
        printHelp: vi.fn()
      },
      {
        runProviderLinearChildStreamShell: runProviderLinearChildStreamShellMock,
        getEnv: () => ({
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-27T01:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(runProviderLinearChildStreamShellMock).toHaveBeenCalledWith({
      pipelineId: 'docs-review',
      streamName: null,
      env: {
        CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'child-stream',
      stream: 'docs-review',
      child_run: { run_id: 'docs-run-1', status: 'succeeded' }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', expect.objectContaining({
      recorded_at: '2026-03-27T01:00:00.000Z',
      operation: 'child-stream',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-13',
      action: 'stream:docs-review',
      via: 'pipeline:docs-review',
      state: 'succeeded'
    }));
  });

  it('rejects whitespace-only file-backed required text inputs', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const upsertProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').upsertProviderLinearWorkpadComment>();

    await expect(
      runLinearCliShell(
        {
          positionals: ['upsert-workpad'],
          flags: {
            format: 'json',
            'issue-id': 'lin-issue-1',
            'body-file': '/tmp/workpad.md'
          },
          printHelp: vi.fn()
        },
        {
          readTextFile: vi.fn(async () => '   \n'),
          upsertProviderLinearWorkpadComment: upsertProviderLinearWorkpadCommentMock,
          log,
          setExitCode
        }
      )
    ).resolves.toBeUndefined();

    expect(upsertProviderLinearWorkpadCommentMock).not.toHaveBeenCalled();
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'linear_body_missing',
        message: '--body or --body-file is required.',
        status: 422
      }
    });
    expect(setExitCode).toHaveBeenCalledWith(1);
  });

  it.each([
    {
      name: 'unknown subcommands',
      params: {
        positionals: ['unknown'],
        flags: {}
      },
      expected: {
        code: 'linear_unknown_subcommand',
        message: 'Unknown linear subcommand: unknown',
        status: 422
      }
    },
    {
      name: 'missing required flags',
      params: {
        positionals: ['issue-context'],
        flags: {}
      },
      expected: {
        code: 'linear_missing_flag',
        message: '--issue-id is required.',
        status: 422
      }
    },
    {
      name: 'unknown flags',
      params: {
        positionals: ['issue-context'],
        flags: {
          'issue-id': 'lin-issue-1',
          bogus: 'value'
        }
      },
      expected: {
        code: 'linear_unknown_flag',
        message: 'Unknown linear flag: --bogus',
        status: 422
      }
    }
  ])('emits machine-readable json for %s', async ({ params, expected }) => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await expect(
      runLinearCliShell(
        {
          ...params,
          printHelp: vi.fn()
        },
        {
          log,
          setExitCode
        }
      )
    ).resolves.toBeUndefined();

    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: expected
    });
    expect(setExitCode).toHaveBeenCalledWith(1);
  });

  it('treats unreadable file-backed required text inputs as usage errors', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await expect(
      runLinearCliShell(
        {
          positionals: ['upsert-workpad'],
          flags: {
            'issue-id': 'lin-issue-1',
            'body-file': '/missing/workpad.md'
          },
          printHelp: vi.fn()
        },
        {
          readTextFile: vi.fn(async () => {
            throw new Error('ENOENT: missing workpad file');
          }),
          log,
          setExitCode
        }
      )
    ).resolves.toBeUndefined();

    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'linear_body_file_unreadable',
        message: '--body-file must reference a readable file.',
        status: 422
      }
    });
    expect(setExitCode).toHaveBeenCalledWith(1);
  });

  it('routes child-lane launches into the parent-owned child-lane shell', async () => {
    const log = vi.fn();
    const runProviderLinearChildLaneShellMock =
      vi.fn<typeof import('../src/cli/providerLinearChildLaneShell.js').runProviderLinearChildLaneShell>()
        .mockResolvedValue({
          ok: true,
          operation: 'child-lane',
          action: 'launched',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-35'
          },
          source_setup: null,
          stream: 'impl-a',
          child_run: {
            run_id: 'child-run-1',
            task_id: 'linear-lin-issue-1-impl-a',
            pipeline_id: 'provider-linear-child-lane',
            status: 'succeeded',
            artifact_root: '/repo/.runs/linear-lin-issue-1-impl-a/cli/child-run-1',
            manifest_path: '/repo/.runs/linear-lin-issue-1-impl-a/cli/child-run-1/manifest.json',
            log_path: null,
            summary: 'child lane finished',
            runtime_mode_requested: 'appserver',
            runtime_mode: 'appserver',
            runtime_provider: 'AppServerRuntimeProvider'
          },
          child_lane: {
            stream: 'impl-a',
            pipeline_id: 'provider-linear-child-lane',
            task_id: 'linear-lin-issue-1-impl-a',
            run_id: 'child-run-1',
            status: 'succeeded',
            manifest_path: '/repo/.runs/linear-lin-issue-1-impl-a/cli/child-run-1/manifest.json',
            artifact_root: '/repo/.runs/linear-lin-issue-1-impl-a/cli/child-run-1',
            log_path: null,
            summary: 'child lane finished',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-35',
            workspace_path: '/repo/.workspaces/linear-lin-issue-1',
            source_setup: null,
            launched_at: '2026-03-30T08:00:00.000Z',
            purpose: 'Implement the bounded child lane shell',
            instructions: 'Stay inside the declared files.',
            scope: {
              files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
              phases: []
            },
            parent_snapshot: {
              base_sha: 'parent-base-sha',
              issue_updated_at: '2026-03-30T07:58:00.000Z',
              issue_state: 'In Progress',
              issue_state_type: 'started',
              captured_at: '2026-03-30T07:59:00.000Z'
            },
            lane_workspace_path: '/repo/.workspaces/linear-lin-issue-1/.child-lanes/impl-a-child-run-1',
            patch_artifact_path: '/repo/.runs/linear-lin-issue-1-impl-a/cli/child-run-1/provider-linear-child-lane.patch',
            patch_bytes: 256,
            decision: 'pending',
            decision_at: null,
            decision_reason: null
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['child-lane'],
        flags: {
          format: 'json',
          action: 'launch',
          stream: 'impl-a',
          purpose: 'Implement the bounded child lane shell',
          files: 'orchestrator/src/cli/providerLinearChildLaneShell.ts',
          phases: 'implementation',
          instructions: 'Stay inside the declared files.'
        },
        printHelp: vi.fn()
      },
      {
        runProviderLinearChildLaneShell: runProviderLinearChildLaneShellMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        log
      }
    );

    expect(runProviderLinearChildLaneShellMock).toHaveBeenCalledWith({
      action: 'launch',
      streamName: 'impl-a',
      purpose: 'Implement the bounded child lane shell',
      files: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
      phases: ['implementation'],
      instructions: 'Stay inside the declared files.',
      reason: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'child-lane',
      action: 'launched',
      stream: 'impl-a'
    });
  });

  it('blocks Linear mutation commands from subordinate same-issue child lanes', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'linear-cli-child-lane-guard-'));
    tempDirs.push(repoRoot);
    const manifestPath = join(repoRoot, 'manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify({
        pipeline_id: 'provider-linear-child-lane',
        parent_run_id: 'provider-run-1'
      }),
      'utf8'
    );
    const log = vi.fn();
    const setExitCode = vi.fn();

    await runLinearCliShell(
      {
        positionals: ['transition'],
        flags: {
          'issue-id': 'lin-issue-1',
          state: 'In Review'
        },
        printHelp: vi.fn()
      },
      {
        readTextFile: vi.fn(async (path: string) =>
          await import('node:fs/promises').then((fs) => fs.readFile(path, 'utf8'))
        ),
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
        }),
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'provider_worker_parent_mutation_required',
        message: 'transition is only available to the parent provider-linear-worker; subordinate same-issue child lanes are read-only for Linear mutations.',
        status: 409
      }
    });
  });

  it('blocks Linear mutation commands from subordinate same-issue child lanes when only the pipeline env is present', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await runLinearCliShell(
      {
        positionals: ['transition'],
        flags: {
          'issue-id': 'lin-issue-1',
          state: 'In Review'
        },
        printHelp: vi.fn()
      },
      {
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-child-lane'
        }),
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'provider_worker_parent_mutation_required',
        message: 'transition is only available to the parent provider-linear-worker; subordinate same-issue child lanes are read-only for Linear mutations.',
        status: 409
      }
    });
  });

  it('blocks mutation commands when child-lane manifests use camelCase lineage fields', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'linear-cli-child-lane-guard-camel-'));
    tempDirs.push(repoRoot);
    const manifestPath = join(repoRoot, 'manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify({
        pipelineId: 'provider-linear-child-lane',
        parentRunId: 'provider-run-1'
      }),
      'utf8'
    );
    const log = vi.fn();
    const setExitCode = vi.fn();

    await runLinearCliShell(
      {
        positionals: ['transition'],
        flags: {
          'issue-id': 'lin-issue-1',
          state: 'In Review'
        },
        printHelp: vi.fn()
      },
      {
        readTextFile: vi.fn(async (path: string) =>
          await import('node:fs/promises').then((fs) => fs.readFile(path, 'utf8'))
        ),
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath
        }),
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'provider_worker_parent_mutation_required',
        message: 'transition is only available to the parent provider-linear-worker; subordinate same-issue child lanes are read-only for Linear mutations.',
        status: 409
      }
    });
  });

  it('records embedded asset URLs in audit metadata for upsert-workpad results', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const upsertProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').upsertProviderLinearWorkpadComment>()
        .mockResolvedValue({
          ok: true,
          operation: 'upsert-workpad',
          action: 'updated',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          comment: {
            id: 'comment-1',
            body: '## Codex Workpad\n\nPlan',
            url: null,
            created_at: null,
            updated_at: null,
            resolved_at: null
          },
          embedded_assets: [
            {
              original_reference: 'file:///tmp/proof.png',
              resolved_path: '/tmp/proof.png',
              asset_url: 'https://assets.linear.test/proof-1',
              content_type: 'image/png',
              size_bytes: 4
            },
            {
              original_reference: 'file:///tmp/proof-2.png',
              resolved_path: '/tmp/proof-2.png',
              asset_url: 'https://assets.linear.test/proof-2',
              content_type: 'image/png',
              size_bytes: 8
            }
          ],
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['upsert-workpad'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          body: '## Codex Workpad\n\nPlan'
        },
        printHelp: vi.fn()
      },
      {
        upsertProviderLinearWorkpadComment: upsertProviderLinearWorkpadCommentMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-04-02T01:15:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-04-02T01:15:00.000Z',
      operation: 'upsert-workpad',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-1',
      source_setup: null,
      action: 'updated',
      via: null,
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: 'comment-1',
      attachment_id: null,
      asset_urls: ['https://assets.linear.test/proof-1', 'https://assets.linear.test/proof-2'],
      error_code: null,
      error_message: null
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      embedded_assets: [
        {
          asset_url: 'https://assets.linear.test/proof-1'
        },
        {
          asset_url: 'https://assets.linear.test/proof-2'
        }
      ]
    });
  });
});
