import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it } from 'vitest';

import {
  appendProviderLinearAuditEntry,
  readProviderLinearParallelizationSnapshot,
  summarizeProviderLinearAuditPath
} from '../src/cli/control/providerLinearWorkflowAudit.js';

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

it('preserves follow-up recovery metadata in summarized audit entries', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-audit-'));
  tempDirs.push(tempDir);
  const auditPath = join(tempDir, 'provider-linear-audit.jsonl');

  await appendProviderLinearAuditEntry(auditPath, {
    recorded_at: '2026-03-25T09:30:00.000Z',
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
    failed_relation_type: 'blocks',
    comment_id: null,
    attachment_id: null,
    error_code: 'linear_graphql_error',
    error_message: 'Linear GraphQL returned operation errors.'
  });

  const summary = await summarizeProviderLinearAuditPath(auditPath);

  expect(summary).toMatchObject({
    attempted_count: 1,
    success_count: 0,
    failure_count: 1,
    latest_by_operation: {
      'create-follow-up': {
        operation: 'create-follow-up',
        ok: false,
        follow_up_issue_id: 'lin-issue-2',
        follow_up_issue_identifier: 'CO-2',
        failed_relation_type: 'blocks',
        error_code: 'linear_graphql_error'
      }
    }
  });
});

it('accepts runtime-proof audit entries in summarized output', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-audit-'));
  tempDirs.push(tempDir);
  const auditPath = join(tempDir, 'provider-linear-audit.jsonl');

  await appendProviderLinearAuditEntry(auditPath, {
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

  const summary = await summarizeProviderLinearAuditPath(auditPath);

  expect(summary).toMatchObject({
    attempted_count: 1,
    success_count: 1,
    failure_count: 0,
    latest_by_operation: {
      'runtime-proof': {
        operation: 'runtime-proof',
        ok: true,
        action: 'screenshot',
        via: 'permit:found'
      }
    }
  });
});

it('accepts screenshot-proof audit entries in summarized output', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-audit-'));
  tempDirs.push(tempDir);
  const auditPath = join(tempDir, 'provider-linear-audit.jsonl');

  await appendProviderLinearAuditEntry(auditPath, {
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

  const summary = await summarizeProviderLinearAuditPath(auditPath);

  expect(summary).toMatchObject({
    attempted_count: 1,
    success_count: 1,
    failure_count: 0,
    latest_by_operation: {
      'screenshot-proof': {
        operation: 'screenshot-proof',
        ok: true,
        action: 'display',
        via: 'cleanup:skipped'
      }
    }
  });
});

it('filters parallelization snapshots by issue id instead of trusting the latest row', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-audit-'));
  tempDirs.push(tempDir);
  const auditPath = join(tempDir, 'provider-linear-audit.jsonl');

  await appendProviderLinearAuditEntry(auditPath, {
    recorded_at: '2026-04-08T06:00:00.000Z',
    operation: 'parallelization',
    ok: true,
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-101',
    source_setup: null,
    action: 'stay_serial',
    via: 'Single bounded change.',
    state: 'single_bounded_change',
    follow_up_issue_id: null,
    follow_up_issue_identifier: null,
    failed_relation_type: null,
    comment_id: null,
    attachment_id: null,
    error_code: null,
    error_message: null
  });
  await appendProviderLinearAuditEntry(auditPath, {
    recorded_at: '2026-04-08T06:01:00.000Z',
    operation: 'parallelization',
    ok: true,
    issue_id: 'lin-issue-2',
    issue_identifier: 'CO-102',
    source_setup: null,
    action: 'forbid_parallel',
    via: 'Parent-only mutation.',
    state: 'parent_only_mutation',
    follow_up_issue_id: null,
    follow_up_issue_identifier: null,
    failed_relation_type: null,
    comment_id: null,
    attachment_id: null,
    error_code: null,
    error_message: null
  });

  const summary = await summarizeProviderLinearAuditPath(auditPath);

  expect(summary.parallelization_entries).toHaveLength(2);
  expect(readProviderLinearParallelizationSnapshot(summary, { issueId: 'lin-issue-1' })).toMatchObject({
    decision: 'stay_serial',
    reason: 'single_bounded_change',
    summary: 'Single bounded change.',
    recorded_at: '2026-04-08T06:00:00.000Z'
  });
  expect(readProviderLinearParallelizationSnapshot(summary, { issueId: 'lin-issue-2' })).toMatchObject({
    decision: 'forbid_parallel',
    reason: 'parent_only_mutation',
    summary: 'Parent-only mutation.',
    recorded_at: '2026-04-08T06:01:00.000Z'
  });
  expect(
    readProviderLinearParallelizationSnapshot(summary, {
      issueId: 'lin-issue-1',
      recordedAtNotBefore: '2026-04-08T06:00:30.000Z'
    })
  ).toBeNull();
});

it('treats mixed ISO timestamp formats as the same timeline when filtering current-turn snapshots', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'provider-linear-audit-'));
  tempDirs.push(tempDir);
  const auditPath = join(tempDir, 'provider-linear-audit.jsonl');

  await appendProviderLinearAuditEntry(auditPath, {
    recorded_at: '2026-04-08T07:00:02.050Z',
    operation: 'parallelization',
    ok: true,
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-101',
    source_setup: null,
    action: 'parallelize_now',
    via: 'Launch a bounded child lane now.',
    state: 'independent_scope_available',
    follow_up_issue_id: null,
    follow_up_issue_identifier: null,
    failed_relation_type: null,
    comment_id: null,
    attachment_id: null,
    error_code: null,
    error_message: null
  });

  const summary = await summarizeProviderLinearAuditPath(auditPath);

  expect(
    readProviderLinearParallelizationSnapshot(summary, {
      issueId: 'lin-issue-1',
      recordedAtNotBefore: '2026-04-08T07:00:02Z'
    })
  ).toMatchObject({
    decision: 'parallelize_now',
    reason: 'independent_scope_available',
    recorded_at: '2026-04-08T07:00:02.050Z'
  });
});
