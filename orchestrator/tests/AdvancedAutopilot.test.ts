import { describe, expect, it } from 'vitest';

import {
  buildAutoScoutEvidence,
  resolveAdvancedAutopilotDecision
} from '../src/cli/utils/advancedAutopilot.js';

describe('advanced autopilot decisioning', () => {
  it('enables auto mode for non-trivial pipelines by default', () => {
    const decision = resolveAdvancedAutopilotDecision({ pipelineId: 'docs-review' });
    expect(decision.mode).toBe('auto');
    expect(decision.enabled).toBe(true);
    expect(decision.autoScout).toBe(true);
  });

  it('disables auto mode for non-priority pipelines by default', () => {
    const decision = resolveAdvancedAutopilotDecision({ pipelineId: 'diagnostics' });
    expect(decision.mode).toBe('auto');
    expect(decision.enabled).toBe(false);
    expect(decision.autoScout).toBe(false);
  });

  it('respects explicit env disable', () => {
    const decision = resolveAdvancedAutopilotDecision({
      pipelineId: 'implementation-gate',
      env: { CODEX_ORCHESTRATOR_ADVANCED_MODE: 'off' }
    });
    expect(decision.mode).toBe('off');
    expect(decision.enabled).toBe(false);
  });

  it('target metadata overrides env and task values', () => {
    const decision = resolveAdvancedAutopilotDecision({
      pipelineId: 'diagnostics',
      targetMetadata: { advancedMode: 'on' },
      taskMetadata: { advancedMode: 'off' },
      env: { CODEX_ORCHESTRATOR_ADVANCED_MODE: 'off' }
    });
    expect(decision.source).toBe('target');
    expect(decision.mode).toBe('on');
    expect(decision.enabled).toBe(true);
  });
});

describe('auto scout evidence', () => {
  it('builds structured evidence payload for run artifacts', () => {
    const decision = resolveAdvancedAutopilotDecision({ pipelineId: 'docs-review' });
    const evidence = buildAutoScoutEvidence({
      taskId: 'task-1',
      pipelineId: 'docs-review',
      targetId: 'docs-review:review',
      targetDescription: 'Review docs',
      executionMode: 'mcp',
      advanced: decision,
      cloudEnvironmentId: null,
      cloudBranch: 'main',
      generatedAt: '2026-02-17T00:00:00.000Z',
      env: { RLM_CONTEXT_PATH: '/tmp/context.txt' }
    });

    expect(evidence.advanced_mode).toBe('auto');
    expect(evidence.advanced_mode_enabled).toBe(true);
    expect(evidence.cloud.branch).toBe('main');
    expect(evidence.rlm.context_path_configured).toBe(true);
  });

  it('records cloud requested intent when execution mode already fell back to mcp', () => {
    const decision = resolveAdvancedAutopilotDecision({ pipelineId: 'docs-review' });
    const evidence = buildAutoScoutEvidence({
      taskId: 'task-1',
      pipelineId: 'docs-review',
      targetId: 'docs-review:review',
      targetDescription: 'Review docs',
      executionMode: 'mcp',
      cloudRequested: true,
      advanced: decision,
      cloudEnvironmentId: 'env-123',
      cloudBranch: 'main',
      generatedAt: '2026-02-17T00:00:00.000Z'
    });

    expect(evidence.cloud.requested).toBe(true);
    expect(evidence.cloud.environment_id).toBe('env-123');
  });
});
