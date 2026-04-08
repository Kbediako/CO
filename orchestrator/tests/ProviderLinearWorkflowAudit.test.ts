import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it } from 'vitest';

import {
  appendProviderLinearAuditEntry,
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
