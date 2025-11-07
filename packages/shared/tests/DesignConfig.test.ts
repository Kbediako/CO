import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  designPipelineId,
  loadDesignConfig,
  shouldActivateDesignPipeline
} from '../config/index.js';

describe('design config loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'design-config-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    // Ensure temporary directories are cleaned up between test suites.
  });

  it('returns default configuration when the file is missing', async () => {
    const result = await loadDesignConfig({ rootDir: tempDir });
    expect(result.exists).toBe(false);
    expect(result.config.metadata.design.enabled).toBe(false);
    expect(result.config.metadata.design.captureUrls).toEqual([]);
    expect(result.config.metadata.design.retention.days).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  });

  it('normalizes yaml fields into a sanitized design config', async () => {
    const configPath = join(tempDir, 'design.config.yaml');
    await writeFile(
      configPath,
      `metadata:
  design:
    enabled: true
    capture_urls:
      - https://example.com/dashboard
      - https://example.com/mobile
    breakpoints:
      - id: desktop
        width: 1280
        height: 720
        device_scale_factor: 2
      - width: 375
        height: 667
      - { id: invalid }
    mask_selectors:
      - .secret
    retention:
      days: 10
      auto_purge: true
    privacy:
      allow_third_party: yes
      require_approval: no
      approver: reviewer@example.com
advanced:
  framer_motion:
    enabled: true
    quota_seconds: 180
    approver: motion-lead
  ffmpeg:
    enabled: true
    quota_seconds: 45
    approver: video-lead
    max_duration_seconds: 120
pipelines:
  design-reference:
    continue_on_failure: true
    visual_regression:
      enabled: false
      baseline_dir: artifacts/baseline
`,
      'utf-8'
    );

    const result = await loadDesignConfig({ rootDir: tempDir });

    expect(result.exists).toBe(true);
    expect(result.config.metadata.design.enabled).toBe(true);
    expect(result.config.metadata.design.captureUrls).toEqual([
      'https://example.com/dashboard',
      'https://example.com/mobile'
    ]);
    expect(result.config.metadata.design.breakpoints).toHaveLength(2);
    expect(result.config.metadata.design.breakpoints[0]).toMatchObject({
      id: 'desktop',
      width: 1280,
      height: 720,
      deviceScaleFactor: 2
    });
    expect(result.config.metadata.design.breakpoints[1]).toMatchObject({
      id: 'bp-2',
      width: 375,
      height: 667
    });
    expect(result.config.metadata.design.maskSelectors).toEqual(['.secret']);
    expect(result.config.metadata.design.retention).toMatchObject({
      days: 10,
      autoPurge: true
    });
    expect(result.config.metadata.design.privacy).toMatchObject({
      allowThirdParty: true,
      requireApproval: false,
      approver: 'reviewer@example.com'
    });
    expect(result.config.advanced.framerMotion).toMatchObject({
      enabled: true,
      quotaSeconds: 180,
      approver: 'motion-lead'
    });
    expect(result.config.advanced.ffmpeg).toMatchObject({
      enabled: true,
      quotaSeconds: 45,
      approver: 'video-lead',
      maxDurationSeconds: 120
    });
    expect(result.config.pipelines.designReference).toMatchObject({
      continueOnFailure: true,
      visualRegression: {
        enabled: false,
        baselineDir: 'artifacts/baseline'
      }
    });
    expect(result.warnings.some((entry) => entry.includes('breakpoints[2]'))).toBe(true);
  });

  it('activates the design pipeline when env flags are present', async () => {
    const result = await loadDesignConfig({ rootDir: tempDir });
    expect(shouldActivateDesignPipeline(result, { DESIGN_PIPELINE: '1' })).toBe(true);
    expect(shouldActivateDesignPipeline(result, { DESIGN_REFERENCE_PIPELINE: 'true' })).toBe(true);
    expect(shouldActivateDesignPipeline(result, { DESIGN_PIPELINE: 'false' })).toBe(false);
    expect(shouldActivateDesignPipeline(result, {})).toBe(false);
    expect(designPipelineId(result)).toBe('design-reference');
  });

  it('resolves hi-fi toolkit config and pipeline activation', async () => {
    const configPath = join(tempDir, 'design.config.yaml');
    await writeFile(
      configPath,
      `metadata:
  design:
    enabled: false
    capture_urls:
      - https://example.com
pipelines:
  hi_fi_design_toolkit:
    enabled: true
    sources:
      - id: dashboard
        url: https://example.com/dashboard
        reference_url: https://example.com
        slug: dashboard
    retention:
      days: 7
      auto_purge: true
    self_correction:
      enabled: true
      max_iterations: 2
      provider: remote-lab
      approval_id: toolkit-approval
    publish:
      update_tokens: true
      run_visual_regression: false
`,
      'utf8'
    );

    const result = await loadDesignConfig({ rootDir: tempDir });
    expect(result.config.pipelines.hiFiDesignToolkit.enabled).toBe(true);
    expect(result.config.pipelines.hiFiDesignToolkit.sources).toHaveLength(1);
    expect(result.config.pipelines.hiFiDesignToolkit.retention?.days).toBe(7);
    expect(result.config.pipelines.hiFiDesignToolkit.selfCorrection.maxIterations).toBe(2);
    expect(result.config.pipelines.hiFiDesignToolkit.publish.runVisualRegression).toBe(false);
    expect(designPipelineId(result)).toBe('hi-fi-design-toolkit');
    expect(shouldActivateDesignPipeline(result)).toBe(true);
  });

  it('respects env toggles for legacy and toolkit pipelines', async () => {
    const configPath = join(tempDir, 'design.config.yaml');
    await writeFile(
      configPath,
      `metadata:
  design:
    enabled: true
pipelines:
  hi_fi_design_toolkit:
    enabled: true
    sources:
      - https://example.com
`,
      'utf8'
    );

    const result = await loadDesignConfig({ rootDir: tempDir });
    expect(designPipelineId(result, { DESIGN_PIPELINE: '1' } as NodeJS.ProcessEnv)).toBe('design-reference');
    expect(shouldActivateDesignPipeline(result, { DESIGN_PIPELINE: '1' })).toBe(true);
    expect(designPipelineId(result, { DESIGN_TOOLKIT: '1' } as NodeJS.ProcessEnv)).toBe('hi-fi-design-toolkit');
  });
});
