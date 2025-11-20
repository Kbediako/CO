import process from 'node:process';

import {
  buildRunRequestV2,
  ControlPlaneDriftReporter,
  ControlPlaneValidationError,
  ControlPlaneValidator
} from '../../control-plane/index.js';
import type { ControlPlaneValidationMode, ControlPlaneValidationResult } from '../../control-plane/types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { relativeToRepo } from '../run/runPaths.js';
import type { RunPaths } from '../run/runPaths.js';
import { appendSummary, saveManifest } from '../run/manifest.js';
import { isoTimestamp } from '../utils/time.js';
import type { CliManifest, PipelineDefinition, RunSummary, TaskContext } from '../types.js';

export interface ControlPlaneGuardOptions {
  env: EnvironmentPaths;
  manifest: CliManifest;
  paths: RunPaths;
  pipeline: PipelineDefinition;
  task: TaskContext;
  runId: string;
  requestedBy: { actorId: string; channel: string; name?: string };
}

export class ControlPlaneService {
  constructor(
    private readonly modeResolver: () => ControlPlaneValidationMode = resolveControlPlaneMode,
    private readonly now: () => Date = () => new Date()
  ) {}

  async guard(options: ControlPlaneGuardOptions): Promise<ControlPlaneValidationResult> {
    const mode = this.modeResolver();
    const driftReporter = new ControlPlaneDriftReporter({
      repoRoot: options.env.repoRoot,
      taskId: options.env.taskId
    });
    const validator = new ControlPlaneValidator({ mode, driftReporter, now: this.now });
    const request = buildRunRequestV2({
      runId: options.runId,
      task: options.task,
      pipeline: options.pipeline,
      manifest: options.manifest,
      env: options.env,
      requestedBy: options.requestedBy,
      now: this.now
    });

    try {
      const result = await validator.validate(request);
      this.attachControlPlaneToManifest(options.env, options.manifest, result);
      await saveManifest(options.paths, options.manifest);
      return result;
    } catch (error: unknown) {
      if (error instanceof ControlPlaneValidationError) {
        this.attachControlPlaneToManifest(options.env, options.manifest, error.result);
        options.manifest.status = 'failed';
        options.manifest.status_detail = 'control-plane-validation-failed';
        options.manifest.completed_at = isoTimestamp();
        appendSummary(options.manifest, `Control plane validation failed: ${error.message}`);
        await saveManifest(options.paths, options.manifest);
      }
      throw error;
    }
  }

  attachControlPlaneToManifest(
    env: EnvironmentPaths,
    manifest: CliManifest,
    result: ControlPlaneValidationResult
  ): void {
    const { request, outcome } = result;
    const drift = outcome.drift
      ? {
          report_path: relativeToRepo(env, outcome.drift.absoluteReportPath),
          total_samples: outcome.drift.totalSamples,
          invalid_samples: outcome.drift.invalidSamples,
          invalid_rate: outcome.drift.invalidRate,
          last_sampled_at: outcome.drift.lastSampledAt,
          mode: outcome.drift.mode
        }
      : undefined;

    manifest.control_plane = {
      schema_id: request.schema,
      schema_version: request.version,
      request_id: request.requestId,
      validation: {
        mode: outcome.mode,
        status: outcome.status,
        timestamp: outcome.timestamp,
        errors: outcome.errors.map((error) => ({ ...error }))
      },
      drift,
      enforcement: {
        enabled: outcome.mode === 'enforce',
        activated_at: outcome.mode === 'enforce' ? outcome.timestamp : null
      }
    };
  }

  applyControlPlaneToRunSummary(runSummary: RunSummary, result: ControlPlaneValidationResult | null): void {
    if (!result) {
      return;
    }
    const { request, outcome } = result;
    runSummary.controlPlane = {
      schemaId: request.schema,
      schemaVersion: request.version,
      requestId: request.requestId,
      validation: {
        mode: outcome.mode,
        status: outcome.status,
        timestamp: outcome.timestamp,
        errors: outcome.errors.map((error) => ({ ...error }))
      },
      drift: outcome.drift
        ? {
            mode: outcome.drift.mode,
            totalSamples: outcome.drift.totalSamples,
            invalidSamples: outcome.drift.invalidSamples,
            invalidRate: outcome.drift.invalidRate,
            lastSampledAt: outcome.drift.lastSampledAt
          }
        : undefined
    };
  }
}

export function resolveControlPlaneMode(): ControlPlaneValidationMode {
  const explicit = process.env.CODEX_CONTROL_PLANE_MODE ?? null;
  const enforce = process.env.CODEX_CONTROL_PLANE_ENFORCE ?? null;
  const candidate = explicit ?? enforce;
  if (!candidate) {
    return 'shadow';
  }
  const normalized = candidate.trim().toLowerCase();
  if (['1', 'true', 'enforce', 'on', 'yes'].includes(normalized)) {
    return 'enforce';
  }
  return 'shadow';
}
