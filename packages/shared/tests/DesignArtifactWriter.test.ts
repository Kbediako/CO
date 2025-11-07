import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeDesignSummary } from '../design-artifacts/writer.js';
import type { DesignArtifactRecord, DesignToolkitArtifactRecord } from '../manifest/types.js';

describe('DesignArtifactWriter', () => {
  it('writes manifest updates and summary payload', async () => {
    const root = await mkdtemp(join(tmpdir(), 'design-writer-'));
    const manifestPath = join(root, '.runs', '0401-design-reference', 'cli', 'run-1', 'manifest.json');
    const outDir = join(root, 'out');
    const artifacts: DesignArtifactRecord[] = [
      {
        stage: 'extract',
        status: 'succeeded',
        relative_path: 'design/reference/dom.json'
      },
      {
        stage: 'components',
        status: 'succeeded',
        relative_path: 'design/components/button.json'
      }
    ];

    const toolkitArtifacts: DesignToolkitArtifactRecord[] = [
      {
        id: 'dashboard-tokens',
        stage: 'tokens',
        status: 'succeeded',
        relative_path: 'design-toolkit/tokens/dashboard/tokens.json',
        metrics: {
          token_count: 12
        }
      }
    ];

    const result = await writeDesignSummary({
      context: {
        taskId: '0401-design-reference',
        runId: 'run:1',
        manifestPath,
        repoRoot: root
      },
      artifacts,
      toolkitArtifacts,
      stages: [
        {
          id: 'design-extract',
          status: 'succeeded',
          artifacts: [
            {
              relative_path: 'design/reference/dom.json',
              status: 'succeeded'
            }
          ]
        },
        {
          id: 'design-componentize',
          status: 'succeeded',
          artifacts: [
            {
              relative_path: 'design/components/button.json',
              status: 'succeeded'
            }
          ]
        }
      ],
      retention: { days: 30, autoPurge: true },
      privacy: {
        allowThirdParty: false,
        requireApproval: true,
        maskSelectors: ['.secret'],
        approver: 'design-reviewer'
      },
      approvals: [
        {
          id: 'approval-1',
          actor: 'reviewer@example.com',
          reason: 'Playwright run approved',
          timestamp: '2025-01-01T00:00:00.000Z'
        }
      ],
      configSnapshot: {
        metadata: {
          design: {
            enabled: true,
            retention: { days: 30, autoPurge: true }
          }
        }
      },
      metrics: { storage_bytes: 2048 },
      outDir,
      now: new Date('2025-01-01T00:00:00.000Z')
    });

    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw) as {
      design_artifacts: DesignArtifactRecord[];
      design_toolkit_artifacts: DesignToolkitArtifactRecord[];
      design_toolkit_summary: Record<string, unknown>;
    };
    expect(manifest.design_artifacts).toHaveLength(2);
    expect(manifest.design_toolkit_artifacts).toHaveLength(1);
    expect(manifest.design_toolkit_summary).toBeDefined();
    expect(result.summaryPath).toBe(
      join(outDir, '0401-design-reference', 'design', 'runs', 'run-1.json')
    );
    const summaryRaw = await readFile(result.summaryPath, 'utf8');
    const summary = JSON.parse(summaryRaw) as Record<string, unknown>;
    expect(summary.task_id).toBe('0401-design-reference');
    expect(summary.retention).toMatchObject({ days: 30, auto_purge: true });
    expect(summary.privacy).toMatchObject({ allow_third_party: false, require_approval: true });
    await rm(root, { recursive: true, force: true });
  });
});
