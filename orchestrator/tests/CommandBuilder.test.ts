import { describe, expect, it } from 'vitest';

import { CommandBuilder } from '../src/cli/adapters/CommandBuilder.js';
import type { CliManifest } from '../src/cli/types.js';

describe('CommandBuilder', () => {
  it('includes failed command error files as build artifacts', async () => {
    const builder = new CommandBuilder(async () => ({
      success: false,
      notes: ['Run delegation guard: Exited with code 1'],
      manifestPath: '.runs/task/run/manifest.json',
      logPath: '.runs/task/run/runner.ndjson',
      manifest: {
        cloud_execution: null,
        status_detail: 'stage:delegation-guard:failed',
        commands: [
          {
            id: 'delegation-guard',
            status: 'failed',
            error_file: '.runs/task/run/errors/01-delegation-guard.json'
          },
          {
            id: 'spec-guard',
            status: 'skipped',
            error_file: null
          },
          {
            id: 'delegation-guard-retry',
            status: 'skipped',
            error_file: '.runs/task/run/errors/01-delegation-guard.json'
          }
        ]
      } as unknown as CliManifest
    }));

    const result = await builder.build({
      task: { id: 'task', title: 'Task', metadata: {} },
      plan: { items: [{ id: 'docs-review:delegation-guard', description: 'Run guard' }] },
      target: { id: 'docs-review:delegation-guard', description: 'Run guard' },
      mode: 'mcp',
      runId: 'run'
    });

    expect(result.success).toBe(false);
    expect(result.failureStage).toBe('delegation-guard');
    expect(result.failureArtifactPath).toBe('.runs/task/run/errors/01-delegation-guard.json');
    expect(result.artifacts).toEqual([
      { path: '.runs/task/run/manifest.json', description: 'CLI run manifest' },
      { path: '.runs/task/run/runner.ndjson', description: 'Runner log (ndjson)' },
      {
        path: '.runs/task/run/errors/01-delegation-guard.json',
        description: 'Command error artifact (delegation-guard)'
      }
    ]);
  });

  it('falls back to the first failed command when status detail is unavailable', async () => {
    const builder = new CommandBuilder(async () => ({
      success: false,
      notes: ['Run docs check: Exited with code 1'],
      manifestPath: '.runs/task/run/manifest.json',
      logPath: '.runs/task/run/runner.ndjson',
      manifest: {
        cloud_execution: null,
        status_detail: null,
        commands: [
          {
            id: 'docs:check',
            status: 'failed',
            error_file: '.runs/task/run/errors/03-docs-check.json'
          }
        ]
      } as unknown as CliManifest
    }));

    const result = await builder.build({
      task: { id: 'task', title: 'Task', metadata: {} },
      plan: { items: [{ id: 'implementation-gate:docs:check', description: 'Run docs check' }] },
      target: { id: 'implementation-gate:docs:check', description: 'Run docs check' },
      mode: 'mcp',
      runId: 'run'
    });

    expect(result.failureStage).toBe('docs:check');
    expect(result.failureArtifactPath).toBe('.runs/task/run/errors/03-docs-check.json');
  });

  it('derives failed subpipeline stages from status detail', async () => {
    const builder = new CommandBuilder(async () => ({
      success: false,
      notes: ['Subpipeline docs-review failed'],
      manifestPath: '.runs/task/run/manifest.json',
      logPath: '.runs/task/run/runner.ndjson',
      manifest: {
        cloud_execution: null,
        status_detail: 'subpipeline:docs-review:failed',
        commands: [
          {
            id: 'docs-review',
            status: 'failed',
            error_file: '.runs/task/run/errors/02-docs-review.json'
          }
        ]
      } as unknown as CliManifest
    }));

    const result = await builder.build({
      task: { id: 'task', title: 'Task', metadata: {} },
      plan: { items: [{ id: 'implementation-gate:docs-review', description: 'Run docs review' }] },
      target: { id: 'implementation-gate:docs-review', description: 'Run docs review' },
      mode: 'mcp',
      runId: 'run'
    });

    expect(result.failureStage).toBe('docs-review');
    expect(result.failureArtifactPath).toBe('.runs/task/run/errors/02-docs-review.json');
  });

  it('does not derive a stage from cloud status details without failed command evidence', async () => {
    const builder = new CommandBuilder(async () => ({
      success: false,
      notes: ['Cloud target failed before command evidence was available'],
      manifestPath: '.runs/task/run/manifest.json',
      logPath: '.runs/task/run/runner.ndjson',
      manifest: {
        cloud_execution: null,
        status_detail: 'cloud:review:failed',
        commands: []
      } as unknown as CliManifest
    }));

    const result = await builder.build({
      task: { id: 'task', title: 'Task', metadata: {} },
      plan: { items: [{ id: 'implementation-gate:review', description: 'Run review target' }] },
      target: { id: 'implementation-gate:review', description: 'Run review target' },
      mode: 'mcp',
      runId: 'run'
    });

    expect(result.failureStage).toBeNull();
    expect(result.failureArtifactPath).toBeNull();
  });

  it('does not derive a failed stage from allow-failure skipped command artifacts', async () => {
    const builder = new CommandBuilder(async () => ({
      success: false,
      notes: ['Run cancelled after optional advisory failed'],
      manifestPath: '.runs/task/run/manifest.json',
      logPath: '.runs/task/run/runner.ndjson',
      manifest: {
        cloud_execution: null,
        status_detail: 'run-canceled',
        commands: [
          {
            id: 'docs-relevance-advisory',
            status: 'skipped',
            error_file: '.runs/task/run/errors/04-docs-relevance-advisory.json'
          }
        ]
      } as unknown as CliManifest
    }));

    const result = await builder.build({
      task: { id: 'task', title: 'Task', metadata: {} },
      plan: { items: [{ id: 'implementation-gate:review', description: 'Run review target' }] },
      target: { id: 'implementation-gate:review', description: 'Run review target' },
      mode: 'mcp',
      runId: 'run'
    });

    expect(result.failureStage).toBeNull();
    expect(result.failureArtifactPath).toBeNull();
    expect(result.artifacts).toContainEqual({
      path: '.runs/task/run/errors/04-docs-relevance-advisory.json',
      description: 'Command error artifact (docs-relevance-advisory)'
    });
  });
});
