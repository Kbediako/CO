import { saveManifest } from '../run/manifest.js';
import type { RunMetricSummary } from '../../../../packages/shared/events/types.js';
import {
  createRunMetricSummary,
  createToolMetricSnapshot,
  mergeTfgrpoManifest,
  persistExperienceRecords,
  resolveExperiencePolicy,
  type TfgrpoContext
} from './tfgrpo.js';
import type { ExecRunContext } from './context.js';
import type { CommandFinalization } from './finalization.js';

export async function handleTfgrpoArtifacts(
  context: ExecRunContext,
  finalization: CommandFinalization,
  tfgrpoContext: TfgrpoContext
): Promise<RunMetricSummary | null> {
  const toolMetric = createToolMetricSnapshot(finalization.toolRecord, finalization.summarySnapshot);
  const runMetricSummary = createRunMetricSummary(toolMetric ? [toolMetric] : [], tfgrpoContext);
  context.manifest.tfgrpo = mergeTfgrpoManifest(context.manifest.tfgrpo, runMetricSummary, tfgrpoContext);
  await persistExperienceRecords({
    store: context.experienceStore,
    manifest: context.manifest,
    env: context.env,
    paths: context.paths,
    tfgrpoContext,
    runMetrics: runMetricSummary,
    execEvents: context.execEvents,
    policy: resolveExperiencePolicy()
  });
  await saveManifest(context.paths, context.manifest);
  return runMetricSummary;
}
