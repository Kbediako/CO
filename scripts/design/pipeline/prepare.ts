import { loadDesignContext, resolveDesignPipelineId } from './context.js';
import { loadDesignRunState, mergeMetrics, saveDesignRunState, upsertStage } from './state.js';

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);

  state.configSnapshot = JSON.parse(JSON.stringify(context.config.config));
  const retention = context.config.config.metadata.design.retention;
  state.retention = {
    days: retention.days,
    autoPurge: Boolean(retention.autoPurge),
    policy: 'design.config.retention'
  };
  const designMetadata = context.config.config.metadata.design;
  const privacy = designMetadata.privacy;
  state.privacy = {
    allowThirdParty: Boolean(privacy.allowThirdParty),
    requireApproval: Boolean(privacy.requireApproval),
    maskSelectors: [...designMetadata.maskSelectors],
    approver: privacy.approver ?? null
  };

  mergeMetrics(state, {
    design_pipeline_id: resolveDesignPipelineId(context.config),
    design_pipeline_enabled: designMetadata.enabled,
    capture_url_count: designMetadata.captureUrls.length,
    breakpoint_count: designMetadata.breakpoints.length
  });

  const stageNotes = context.config.warnings.length > 0 ? context.config.warnings : undefined;
  upsertStage(state, {
    id: 'design-config',
    title: 'Resolve design configuration',
    status: 'succeeded',
    notes: stageNotes,
    metrics: {
      config_path: context.designConfigPath
    }
  });

  await saveDesignRunState(context.statePath, state);

  console.log(
    `[design-config] task=${context.taskId} run=${context.runId} designEnabled=${context.config.config.metadata.design.enabled}`
  );
  console.log(
    `[design-config] retention=${state.retention?.days ?? retention.days}d autoPurge=${state.retention?.autoPurge ?? retention.autoPurge}`
  );
  console.log(
    `[design-config] privacy allowThirdParty=${state.privacy?.allowThirdParty} requireApproval=${state.privacy?.requireApproval}`
  );
}

main().catch((error) => {
  console.error('[design-config] failed to prepare design context');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
