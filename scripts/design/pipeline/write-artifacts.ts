import { loadDesignContext } from './context.js';
import {
  ensureToolkitState,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage
} from './state.js';
import { writeDesignSummary } from '../../../packages/shared/design-artifacts/writer.js';

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-artifact-writer';
  const toolkitState = ensureToolkitState(state);

  const retention = state.retention ?? {
    days: 30,
    autoPurge: false,
    policy: 'design.config.retention'
  };
  const privacy = state.privacy ?? {
    allowThirdParty: false,
    requireApproval: true,
    maskSelectors: [],
    approver: null
  };

  const result = await writeDesignSummary({
    context: {
      taskId: context.taskId,
      runId: context.runId,
      manifestPath: context.manifestPath,
      repoRoot: context.repoRoot
    },
    stages: state.stages,
    artifacts: state.artifacts,
    configSnapshot: state.configSnapshot ?? null,
    retention,
    privacy,
    approvals: state.approvals,
    metrics: state.metrics,
    designPlan: state.designPlan ?? undefined,
    designGuardrail: state.designGuardrail ?? undefined,
    designHistory: state.designHistory ?? undefined,
    designStyleProfile: state.designStyleProfile ?? undefined,
    designMetrics: state.designMetrics ?? undefined,
    toolkitArtifacts: toolkitState.artifacts,
    toolkitSummary: (toolkitState.summary as never) ?? undefined,
    outDir: context.outRoot,
    now: new Date()
  });

  toolkitState.summary =
    (result.summary as { design_toolkit_summary?: Record<string, unknown> }).design_toolkit_summary ?? null;

  upsertStage(state, {
    id: stageId,
    title: 'Persist design artifact summary',
    status: 'succeeded',
    metrics: {
      summary_path: result.summaryPath
    }
  });

  await saveDesignRunState(context.statePath, state);
  console.log(`[design-artifact-writer] summary written to ${result.summaryPath}`);
}

main().catch((error) => {
  console.error('[design-artifact-writer] failed to persist design artifact summary');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
