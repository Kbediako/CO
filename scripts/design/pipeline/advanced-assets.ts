import { mkdir, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { isAbsolute, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import type { BrowserContext, Route } from 'playwright';
import { pathToFileURL } from 'node:url';
import { loadDesignContext } from './context.js';
import {
  appendApprovals,
  appendArtifacts,
  ensureToolkitState,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage,
  type ToolkitContextState,
  type StageStateArtifactSummary
} from './state.js';
import { stageArtifacts } from '../../../orchestrator/src/persistence/ArtifactStager.js';
import type {
  DesignArtifactApprovalRecord,
  DesignArtifactRecord
} from '../../../packages/shared/manifest/types.js';
import type { DesignConfig, DesignToolkitPipelineConfig } from '../../../packages/shared/config/index.js';
import { runDefaultInteractions, type InteractionPage } from './toolkit/snapshot.js';
import { loadPlaywright } from './optionalDeps.js';

const execFileAsync = promisify(execFile);
const MOTION_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_CAPTURE_SECONDS = 12;
const MIN_CAPTURE_SECONDS = 4;

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-advanced-assets';
  const advanced = context.config.config.advanced;

  if (!advanced.framerMotion.enabled && !advanced.ffmpeg.enabled) {
    upsertStage(state, {
      id: stageId,
      title: 'Advanced asset generation',
      status: 'skipped',
      notes: ['Advanced assets disabled in design.config.yaml']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-advanced-assets] skipped — advanced features disabled');
    return;
  }

  const toolkit = ensureToolkitState(state);
  const contexts = toolkit.contexts;
  if (contexts.length === 0) {
    upsertStage(state, {
      id: stageId,
      title: 'Advanced asset generation',
      status: 'skipped',
      notes: ['No toolkit contexts available. Run extract + reference stages first.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-advanced-assets] skipped — no toolkit contexts to capture');
    return;
  }

  try {
    await ensureFfmpegAvailable();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    upsertStage(state, {
      id: stageId,
      title: 'Advanced asset generation',
      status: 'failed',
      notes: [message]
    });
    await saveDesignRunState(context.statePath, state);
    throw new Error(message);
  }

  const tmpRoot = join(tmpdir(), `design-motion-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  const motionEnabled = advanced.framerMotion.enabled;
  const videoEnabled = advanced.ffmpeg.enabled;
  let remainingMotionSeconds = motionEnabled ? Math.max(0, advanced.framerMotion.quotaSeconds) : 0;
  let remainingVideoSeconds = videoEnabled ? Math.max(0, advanced.ffmpeg.quotaSeconds) : 0;
  if ((motionEnabled && remainingMotionSeconds <= 0) && (videoEnabled && remainingVideoSeconds <= 0)) {
    upsertStage(state, {
      id: stageId,
      title: 'Advanced asset generation',
      status: 'skipped',
      notes: ['Motion/FFmpeg quotas exhausted before capture']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-advanced-assets] skipped — quotaSeconds=0 for enabled advanced features');
    return;
  }

  const pipelineConfig = context.config.config.pipelines.hiFiDesignToolkit;
  const designArtifacts: DesignArtifactRecord[] = [];
  const approvals: DesignArtifactApprovalRecord[] = [];
  const stageArtifactsSummaries: StageStateArtifactSummary[] = [];
  const failures: string[] = [];
  let captureCount = 0;
  let motionSeconds = 0;
  let videoSeconds = 0;
  let quotaStopped = false;

  for (const entry of contexts) {
    const captureDuration = computeCaptureDuration({
      motionEnabled,
      videoEnabled,
      remainingMotionSeconds,
      remainingVideoSeconds,
      maxDurationSeconds:
        videoEnabled && advanced.ffmpeg.maxDurationSeconds
          ? advanced.ffmpeg.maxDurationSeconds
          : DEFAULT_CAPTURE_SECONDS
    });

    if (captureDuration < MIN_CAPTURE_SECONDS) {
      quotaStopped = true;
      break;
    }

    try {
      const viewport = resolveViewport(entry, pipelineConfig);
      const capture = await recordInteractionVideo(entry, viewport, captureDuration, tmpRoot, context.repoRoot);
      const outputs = await transcodeMotionOutputs({
        slug: entry.slug,
        rawVideoPath: capture.rawVideoPath,
        durationSeconds: captureDuration,
        tmpRoot,
        motionEnabled,
        videoEnabled
      });

      const artifactInputs = buildArtifactInputs(outputs, entry.slug);
      if (artifactInputs.length === 0) {
        failures.push(`${entry.slug}: no motion outputs produced`);
        await safeRemove(capture.rawVideoPath);
        continue;
      }

      const staged = await stageArtifacts({
        taskId: context.taskId,
        runId: context.runId,
        artifacts: artifactInputs.map((artifact) => ({
          path: relative(process.cwd(), artifact.path),
          description: artifact.description
        })),
        options: {
          relativeDir: join('design-toolkit', 'diffs', entry.slug, 'motion'),
          overwrite: true
        }
      });

      const slugApprovals = buildApprovals(entry.slug, advanced, context);
      approvals.push(...slugApprovals);

      let index = 0;
      if (outputs.motionPath) {
        const stagedMotion = staged[index++];
        motionSeconds += captureDuration;
        remainingMotionSeconds = Math.max(0, remainingMotionSeconds - captureDuration);
        const approval = slugApprovals.find((record) => record.id === `motion-${entry.slug}`);
        designArtifacts.push(
          buildDesignArtifact({
            stage: 'motion',
            slug: entry.slug,
            path: stagedMotion.path,
            durationSeconds: captureDuration,
            viewport,
            url: capture.url,
            approval,
            quotaLimit: advanced.framerMotion.quotaSeconds,
            format: 'webm'
          })
        );
        stageArtifactsSummaries.push({
          relative_path: stagedMotion.path,
          stage: 'motion',
          status: 'succeeded',
          description: `${entry.slug} motion loop (WebM)`
        });
      }

      if (outputs.videoPath) {
        const stagedVideo = staged[index++];
        videoSeconds += captureDuration;
        remainingVideoSeconds = Math.max(0, remainingVideoSeconds - captureDuration);
        const approval = slugApprovals.find((record) => record.id === `ffmpeg-motion-${entry.slug}`);
        designArtifacts.push(
          buildDesignArtifact({
            stage: 'video',
            slug: entry.slug,
            path: stagedVideo.path,
            durationSeconds: captureDuration,
            viewport,
            url: capture.url,
            approval,
            quotaLimit: advanced.ffmpeg.quotaSeconds,
            format: 'mp4'
          })
        );
        stageArtifactsSummaries.push({
          relative_path: stagedVideo.path,
          stage: 'video',
          status: 'succeeded',
          description: `${entry.slug} motion loop (MP4)`
        });
      }

      captureCount += 1;
      await safeRemove(capture.rawVideoPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${entry.slug}: ${message}`);
      console.error(`[design-advanced-assets] failed for ${entry.slug}: ${message}`);
    }
  }

  if (designArtifacts.length > 0) {
    appendArtifacts(state, designArtifacts);
  }
  if (approvals.length > 0) {
    appendApprovals(state, approvals);
  }

  let status: 'succeeded' | 'failed' | 'skipped' = 'succeeded';
  if (captureCount === 0) {
    status = failures.length > 0 ? 'failed' : 'skipped';
  }

  const notes = [...failures];
  if (quotaStopped) {
    notes.push('Stopped early after exhausting capture quota.');
  }

  upsertStage(state, {
    id: stageId,
    title: 'Advanced asset generation',
    status,
    notes: notes.length > 0 ? notes : undefined,
    metrics:
      captureCount > 0
        ? {
            capture_count: captureCount,
            motion_seconds: Number(motionSeconds.toFixed(2)),
            video_seconds: Number(videoSeconds.toFixed(2)),
            motion_quota_remaining: Number(remainingMotionSeconds.toFixed(2)),
            video_quota_remaining: Number(remainingVideoSeconds.toFixed(2))
          }
        : undefined,
    artifacts: stageArtifactsSummaries.length > 0 ? stageArtifactsSummaries : undefined
  });

  await saveDesignRunState(context.statePath, state);

  if (status === 'failed') {
    throw new Error('Advanced asset generation failed.');
  }

  console.log(`[design-advanced-assets] captured ${captureCount} motion loop${captureCount === 1 ? '' : 's'}`);
}

function buildDesignArtifact(options: {
  stage: DesignArtifactRecord['stage'];
  slug: string;
  path: string;
  durationSeconds: number;
  viewport: { width: number; height: number };
  url: string;
  approval?: DesignArtifactApprovalRecord;
  quotaLimit: number;
  format: 'webm' | 'mp4';
}): DesignArtifactRecord {
  return {
    stage: options.stage,
    status: 'succeeded',
    relative_path: options.path,
    description: `${options.slug} motion capture (${options.format.toUpperCase()})`,
    approvals: options.approval ? [options.approval] : undefined,
    quota: {
      type: 'runtime',
      unit: 'seconds',
      limit: options.quotaLimit,
      consumed: Number(options.durationSeconds.toFixed(2))
    },
    metadata: {
      slug: options.slug,
      url: options.url,
      duration_seconds: Number(options.durationSeconds.toFixed(2)),
      viewport: `${options.viewport.width}x${options.viewport.height}`,
      format: options.format
    }
  };
}

function buildApprovals(
  slug: string,
  advanced: DesignConfig['advanced'],
  context: Awaited<ReturnType<typeof loadDesignContext>>
): DesignArtifactApprovalRecord[] {
  const approvals: DesignArtifactApprovalRecord[] = [];
  const defaultActor = context.config.config.metadata.design.privacy.approver ?? 'design-reviewer';
  if (advanced.framerMotion.enabled) {
    approvals.push({
      id: `motion-${slug}`,
      actor: advanced.framerMotion.approver ?? defaultActor,
      reason: `Framer Motion capture approved for ${slug}`,
      timestamp: new Date().toISOString()
    });
  }
  if (advanced.ffmpeg.enabled) {
    approvals.push({
      id: `ffmpeg-motion-${slug}`,
      actor: advanced.ffmpeg.approver ?? defaultActor,
      reason: `FFmpeg capture approved for ${slug}`,
      timestamp: new Date().toISOString()
    });
  }
  return approvals;
}

function buildArtifactInputs(
  outputs: MotionOutputs,
  slug: string
): Array<{ path: string; description: string }> {
  const artifacts: Array<{ path: string; description: string }> = [];
  if (outputs.motionPath) {
    artifacts.push({ path: outputs.motionPath, description: `${slug} motion loop (WebM)` });
  }
  if (outputs.videoPath) {
    artifacts.push({ path: outputs.videoPath, description: `${slug} motion loop (MP4)` });
  }
  return artifacts;
}

async function ensureFfmpegAvailable(): Promise<void> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
  } catch (error) {
    throw new Error(
      'FFmpeg is required for advanced motion capture. Install it or run `npm run setup:design-tools` before rerunning.'
    );
  }
}

function resolveViewport(entry: ToolkitContextState, pipeline: DesignToolkitPipelineConfig): {
  width: number;
  height: number;
} {
  for (const breakpointId of entry.breakpoints) {
    const match = pipeline.breakpoints.find((bp) => bp.id === breakpointId);
    if (match) {
      return { width: match.width, height: match.height };
    }
  }
  const fallback = pipeline.breakpoints[0];
  if (fallback) {
    return { width: fallback.width, height: fallback.height };
  }
  return { width: 1440, height: 900 };
}

async function recordInteractionVideo(
  entry: ToolkitContextState,
  viewport: { width: number; height: number },
  durationSeconds: number,
  tmpRoot: string,
  repoRoot: string
): Promise<{ rawVideoPath: string; url: string }> {
  const captureDir = join(tmpRoot, entry.slug, `${Date.now()}`);
  await mkdir(captureDir, { recursive: true });
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  const targetUrl = resolveMotionTarget(entry, repoRoot);
  const macro = await loadMotionMacro(entry, repoRoot);
  let context: BrowserContext | null = null;
  try {
    const activeContext = await browser.newContext({
      viewport,
      userAgent: MOTION_USER_AGENT,
      recordVideo: {
        dir: captureDir,
        size: viewport
      }
    });
    if (targetUrl.startsWith('file:')) {
      await activeContext.route('**/*', (route: Route) => {
        const url = route.request().url();
        if (url.startsWith('file:') || url.startsWith('data:')) {
          return route.continue();
        }
        return route.abort();
      });
    }
    context = activeContext;
    if (macro?.contextScript) {
      await activeContext.addInitScript({ content: macro.contextScript });
    }
    const activePage = await activeContext.newPage();
    const start = Date.now();
    await activePage.goto(targetUrl, { waitUntil: 'networkidle', timeout: 120_000 });
    if (macro?.script) {
      await activePage.addScriptTag({ content: macro.script }).catch(() => {});
    }
    await activePage.waitForTimeout(entry.interactionWaitMs ?? 800);
    await runDefaultInteractions(activePage as unknown as InteractionPage);
    const elapsed = Date.now() - start;
    const remaining = durationSeconds * 1000 - elapsed;
    if (remaining > 0) {
      await activePage.waitForTimeout(remaining);
    }
    const video = await activePage.video();
    await activePage.close();
    const rawPath = video ? await video.path() : null;
    if (!rawPath) {
      throw new Error('Playwright finished without producing a video artifact');
    }
    return { rawVideoPath: rawPath, url: targetUrl };
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    await browser.close();
  }
}

function resolveMotionTarget(entry: ToolkitContextState, repoRoot: string): string {
  const referenceCandidate = entry.referencePath ?? entry.snapshotHtmlPath ?? null;
  if (referenceCandidate) {
    const absolute = isAbsolute(referenceCandidate) ? referenceCandidate : join(repoRoot, referenceCandidate);
    return pathToFileURL(absolute).toString();
  }
  return entry.referenceUrl ?? entry.url;
}

async function loadMotionMacro(
  entry: ToolkitContextState,
  repoRoot: string
): Promise<{ script: string; contextScript: string } | null> {
  if (!entry.interactionScriptPath) {
    return null;
  }
  try {
    const absolute = isAbsolute(entry.interactionScriptPath)
      ? entry.interactionScriptPath
      : join(repoRoot, entry.interactionScriptPath);
    const script = await readFile(absolute, 'utf8');
    const context = {
      slug: entry.slug,
      url: entry.url,
      waitMs: entry.interactionWaitMs ?? null,
      runtimeCanvasColors: entry.runtimeCanvasColors ?? [],
      resolvedFonts: entry.resolvedFonts ?? []
    };
    const contextScript = `(function(){window.macroContext=Object.assign({},window.macroContext||{},${JSON.stringify(context)});})();`;
    return { script: script.trim(), contextScript };
  } catch (error) {
    console.warn(`[design-advanced-assets] Failed to load interaction macro for ${entry.slug}:`, error);
    return null;
  }
}

type MotionOutputs = {
  motionPath?: string;
  videoPath?: string;
};

async function transcodeMotionOutputs(options: {
  slug: string;
  rawVideoPath: string;
  durationSeconds: number;
  tmpRoot: string;
  motionEnabled: boolean;
  videoEnabled: boolean;
}): Promise<MotionOutputs> {
  const { slug, rawVideoPath, durationSeconds, tmpRoot, motionEnabled, videoEnabled } = options;
  const outputDir = join(tmpRoot, slug, 'transcodes');
  await mkdir(outputDir, { recursive: true });
  const outputs: MotionOutputs = {};
  const durationArg = formatDuration(durationSeconds);

  if (motionEnabled) {
    const motionPath = join(outputDir, `${slug}-motion.webm`);
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      rawVideoPath,
      '-t',
      durationArg,
      '-c:v',
      'libvpx-vp9',
      '-auto-alt-ref',
      '1',
      '-pix_fmt',
      'yuv420p',
      '-an',
      motionPath
    ]);
    outputs.motionPath = motionPath;
  }

  if (videoEnabled) {
    const videoPath = join(outputDir, `${slug}-motion.mp4`);
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      rawVideoPath,
      '-t',
      durationArg,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      videoPath
    ]);
    outputs.videoPath = videoPath;
  }

  return outputs;
}

function computeCaptureDuration(options: {
  motionEnabled: boolean;
  videoEnabled: boolean;
  remainingMotionSeconds: number;
  remainingVideoSeconds: number;
  maxDurationSeconds: number;
}): number {
  const budgets: number[] = [];
  if (options.motionEnabled) {
    budgets.push(Math.max(0, options.remainingMotionSeconds));
  }
  if (options.videoEnabled) {
    budgets.push(Math.max(0, options.remainingVideoSeconds));
  }
  const limitingBudget = budgets.length > 0 ? Math.min(...budgets) : DEFAULT_CAPTURE_SECONDS;
  if (limitingBudget <= 0) {
    return 0;
  }
  const candidate = Math.min(DEFAULT_CAPTURE_SECONDS, options.maxDurationSeconds, limitingBudget);
  return candidate;
}

function formatDuration(value: number): string {
  return value.toFixed(2);
}

async function safeRemove(path: string): Promise<void> {
  try {
    await rm(path, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[design-advanced-assets] Failed to cleanup temp file', path, error);
    }
  }
}

main().catch((error) => {
  console.error('[design-advanced-assets] failed to process advanced assets');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
