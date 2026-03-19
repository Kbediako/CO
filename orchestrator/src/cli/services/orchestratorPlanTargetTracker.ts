import type { TaskManager } from '../../manager.js';
import { logger } from '../../logger.js';
import { persistManifest, type ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';

interface AttachOrchestratorPlanTargetTrackerParams {
  manager: TaskManager;
  manifest: CliManifest;
  paths: RunPaths;
  persister?: ManifestPersister;
  persistManifestImpl?: typeof persistManifest;
  warn?: (message: string) => void;
}

export function attachOrchestratorPlanTargetTracker(
  params: AttachOrchestratorPlanTargetTrackerParams
): void {
  const persist = params.persistManifestImpl ?? persistManifest;
  const warn = params.warn ?? ((message: string) => logger.warn(message));

  params.manager.bus.on('plan:completed', (event) => {
    const targetId = event.payload.plan.targetId ?? null;
    if (params.manifest.plan_target_id === targetId) {
      return;
    }
    params.manifest.plan_target_id = targetId;
    void persist(params.paths, params.manifest, params.persister, { force: true }).catch((error) => {
      warn(
        `Failed to persist plan target for run ${params.manifest.run_id}: ${(error as Error)?.message ?? String(error)}`
      );
    });
  });
}
