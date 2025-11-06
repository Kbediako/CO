import { loadDesignContext } from './context.js';
import {
  loadDesignRunState,
  saveDesignRunState,
  upsertStage
} from './state.js';
import { writeDesignSummary } from '../../../packages/shared/design-artifacts/writer.js';

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-artifact-writer';

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
    outDir: context.outRoot,
    now: new Date()
  });

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
