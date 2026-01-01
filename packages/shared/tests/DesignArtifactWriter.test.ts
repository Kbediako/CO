import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeDesignSummary } from '../design-artifacts/writer.js';
import type {
  DesignArtifactRecord,
  DesignToolkitArtifactRecord
} from '../manifest/types.js';

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
    const designPlan = {
      mode: 'fresh' as const,
      brief: {
        path: 'design/brief/frontend-design-brief.json',
        hash: 'brief-hash'
      },
      aesthetic_plan: {
        path: 'design/aesthetic-plan/frontend-aesthetic-plan.json',
        snippet_version: 'v1'
      },
      implementation: {
        path: 'design/implementation/implementation-metadata.json'
      },
      generated_at: '2025-01-01T00:00:00.000Z'
    };
    const designGuardrail = {
      report_path: 'design/guardrail/design-review-report.json',
      status: 'pass' as const,
      snippet_version: 'v1',
      scores: {
        originality: 0.9,
        accessibility: 0.88,
        brief_alignment: 0.92
      },
      style_overlap: {
        palette: 0.05,
        typography: 0.06,
        spacing: 0.02,
        motion: 0.01,
        overall: 0.06,
        gate: 'pass' as const,
        threshold: 0.1
      }
    };
    const designHistory = {
      path: 'design/history/frontend-design-history.json',
      mirror_path: 'out/0412-frontend-design-pipeline-v2/design/history.json',
      entries: 1,
      max_entries: 20
    };
    const designStyleProfile = {
      id: 'style-profile-1',
      relative_path: 'design/style-ingestion/hifi_style_profile.json',
      similarity_level: 'medium' as const,
      do_not_copy: {
        logos: ['logo-a']
      }
    };
    const designMetrics = {
      aesthetic_axes_completeness: 1,
      originality_score: 0.9,
      style_overlap: 0.06,
      style_overlap_gate: 'pass' as const,
      snippet_version: 'v1'
    };

    const result = await writeDesignSummary({
      context: {
        taskId: '0401-design-reference',
        runId: 'run-1',
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
      designPlan,
      designGuardrail,
      designHistory,
      designStyleProfile,
      designMetrics,
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
      design_plan: Record<string, unknown>;
      design_guardrail: Record<string, unknown>;
      design_history: Record<string, unknown>;
      design_style_profile: Record<string, unknown>;
      design_metrics: Record<string, unknown>;
    };
    expect(manifest.design_artifacts).toHaveLength(2);
    expect(manifest.design_toolkit_artifacts).toHaveLength(1);
    expect(manifest.design_toolkit_summary).toBeDefined();
    expect(manifest.design_plan.mode).toBe('fresh');
    expect(manifest.design_guardrail.status).toBe('pass');
    expect(manifest.design_style_profile.id).toBe('style-profile-1');
    expect(manifest.design_metrics.style_overlap_gate).toBe('pass');
    expect(result.summaryPath).toBe(
      join(outDir, '0401-design-reference', 'design', 'runs', 'run-1.json')
    );
    const summaryRaw = await readFile(result.summaryPath, 'utf8');
    const summary = JSON.parse(summaryRaw) as Record<string, unknown>;
    expect(summary.task_id).toBe('0401-design-reference');
    expect(summary.retention).toMatchObject({ days: 30, auto_purge: true });
    expect(summary.privacy).toMatchObject({ allow_third_party: false, require_approval: true });
    expect((summary.design_plan as Record<string, unknown>).mode).toBe('fresh');
    expect((summary.design_guardrail as Record<string, unknown>).status).toBe('pass');
    expect((summary.design_style_profile as Record<string, unknown>).similarity_level).toBe('medium');
    expect((summary.design_metrics as Record<string, unknown>).style_overlap).toBe(0.06);
    expect((summary.metrics as Record<string, unknown>).style_overlap).toBe(0.06);
    await rm(root, { recursive: true, force: true });
  });
});
