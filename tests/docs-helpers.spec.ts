import { describe, expect, it } from 'vitest';
import { normalizeTaskKey } from '../scripts/lib/docs-helpers.js';

describe('normalizeTaskKey', () => {
  it('keeps numeric task keys derived from date-prefixed ids', () => {
    expect(
      normalizeTaskKey({
        id: '20260314-1167-orchestrator-auto-scout-evidence-recorder-extraction',
        path: 'tasks/tasks-1167-orchestrator-auto-scout-evidence-recorder-extraction.md'
      })
    ).toBe('1167-orchestrator-auto-scout-evidence-recorder-extraction');
  });

  it('prefers canonical task paths for non-numeric task keys', () => {
    expect(
      normalizeTaskKey({
        id: '20260322-linear-856c1318-524f-4db3-8d4a-b357ec51c304',
        relates_to: 'tasks/tasks-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md'
      })
    ).toBe('linear-856c1318-524f-4db3-8d4a-b357ec51c304');
  });

  it('uses canonical paths.task entries when present', () => {
    expect(
      normalizeTaskKey({
        id: '20260322-linear-856c1318-524f-4db3-8d4a-b357ec51c304',
        paths: {
          task: 'tasks/tasks-linear-856c1318-524f-4db3-8d4a-b357ec51c304.md',
          spec: 'tasks/specs/linear-856c1318-524f-4db3-8d4a-b357ec51c304.md',
          agent_task: '.agent/task/linear-856c1318-524f-4db3-8d4a-b357ec51c304.md'
        }
      })
    ).toBe('linear-856c1318-524f-4db3-8d4a-b357ec51c304');
  });
});
