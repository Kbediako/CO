import { sanitizeTaskId } from '../run/environment.js';
import { saveManifest } from '../run/manifest.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import {
  buildSchedulerRunSummary,
  createSchedulerPlan,
  finalizeSchedulerPlan,
  serializeSchedulerPlan
} from '../../scheduler/index.js';
import type { SchedulerPlan, SchedulerAssignmentStatus } from '../../scheduler/index.js';
import type { ControlPlaneValidationResult } from '../../control-plane/types.js';
import { isoTimestamp } from '../utils/time.js';
import type { CliManifest, RunStatus } from '../types.js';
import type { RunSummary } from '../../types.js';

export class SchedulerService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async createPlanForRun(options: {
    env: EnvironmentPaths;
    manifest: CliManifest;
    paths: RunPaths;
    controlPlaneResult: ControlPlaneValidationResult;
  }): Promise<SchedulerPlan> {
    const plan = createSchedulerPlan(options.controlPlaneResult.request, {
      now: this.now,
      instancePrefix: sanitizeTaskId(options.env.taskId)
    });
    this.attachSchedulerPlanToManifest(options.manifest, plan);
    await saveManifest(options.paths, options.manifest);
    return plan;
  }

  async finalizePlan(options: {
    manifest: CliManifest;
    paths: RunPaths;
    plan: SchedulerPlan;
  }): Promise<void> {
    const finalStatus = this.resolveSchedulerFinalStatus(options.manifest.status);
    const finalizedAt = options.manifest.completed_at ?? isoTimestamp();
    finalizeSchedulerPlan(options.plan, finalStatus, finalizedAt);
    this.attachSchedulerPlanToManifest(options.manifest, options.plan);
    await saveManifest(options.paths, options.manifest);
  }

  applySchedulerToRunSummary(runSummary: RunSummary, plan: SchedulerPlan): void {
    runSummary.scheduler = buildSchedulerRunSummary(plan);
  }

  private resolveSchedulerFinalStatus(status: RunStatus): SchedulerAssignmentStatus {
    switch (status) {
      case 'succeeded':
        return 'succeeded';
      case 'in_progress':
        return 'running';
      default:
        return 'failed';
    }
  }

  private attachSchedulerPlanToManifest(manifest: CliManifest, plan: SchedulerPlan): void {
    manifest.scheduler = serializeSchedulerPlan(plan);
  }
}
