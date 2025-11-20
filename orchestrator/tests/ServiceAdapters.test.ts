import { describe, expect, it } from 'vitest';

import { ControlPlaneService } from '../src/cli/services/controlPlaneService.js';
import { SchedulerService } from '../src/cli/services/schedulerService.js';
import type { ControlPlaneValidationResult } from '../src/control-plane/types.js';
import type { SchedulerPlan } from '../src/scheduler/types.js';
import type { RunSummary, CliManifest } from '../src/cli/types.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';

describe('service adapters', () => {
  it('applies control plane outcomes to manifest and run summary', () => {
    const service = new ControlPlaneService();
    const env = {
      repoRoot: '/repo',
      runsRoot: '/repo/.runs',
      outRoot: '/repo/out',
      taskId: 'task-1'
    } as EnvironmentPaths;
    const manifest = {} as CliManifest;

    const result = {
      request: {
        schema: 'schema',
        version: '1',
        requestId: 'req-123'
      },
      outcome: {
        mode: 'shadow',
        status: 'passed',
        timestamp: '2025-01-01T00:00:00Z',
        errors: [],
        drift: {
          mode: 'shadow',
          absoluteReportPath: '/repo/out/drift/report.json',
          totalSamples: 3,
          invalidSamples: 1,
          invalidRate: 0.33,
          lastSampledAt: null
        }
      }
    } as ControlPlaneValidationResult;

    service.attachControlPlaneToManifest(env, manifest, result);
    expect(manifest.control_plane?.drift?.report_path).toBe('out/drift/report.json');
    expect(manifest.control_plane?.validation.status).toBe('passed');

    const runSummary = {} as RunSummary;
    service.applyControlPlaneToRunSummary(runSummary, result);
    expect(runSummary.controlPlane?.requestId).toBe('req-123');
    expect(runSummary.controlPlane?.drift?.invalidSamples).toBe(1);
  });

  it('builds scheduler summaries from plans', () => {
    const scheduler = new SchedulerService();
    const runSummary = {} as RunSummary;
    const plan = {
      mode: 'multi-instance',
      requestedAt: '2025-01-01T00:00:00Z',
      minInstances: 1,
      maxInstances: 1,
      recovery: {
        heartbeatIntervalSeconds: 10,
        missingHeartbeatTimeoutSeconds: 30,
        maxRetries: 2
      },
      assignments: [
        {
          instanceId: 'task-1-general-01',
          capability: 'general',
          status: 'assigned',
          assignedAt: '2025-01-01T00:00:00Z',
          completedAt: null,
          attempts: [
            {
              number: 1,
              assignedAt: '2025-01-01T00:00:00Z',
              startedAt: null,
              completedAt: null,
              status: 'pending',
              recoveryCheckpoints: []
            }
          ],
          metadata: { weight: 1, maxConcurrency: 1 }
        }
      ]
    } as SchedulerPlan;

    scheduler.applySchedulerToRunSummary(runSummary, plan);
    expect(runSummary.scheduler?.assignments).toHaveLength(1);
    expect(runSummary.scheduler?.assignments?.[0]?.instanceId).toBe('task-1-general-01');
  });
});
