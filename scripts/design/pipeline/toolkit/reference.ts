import { access, cp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { loadDesignContext } from '../context.js';
import type { DesignContext } from '../context.js';
import {
  appendApprovals,
  appendToolkitArtifacts,
  ensureToolkitState,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage,
  upsertToolkitContext,
  type ToolkitContextState
} from '../state.js';
import { stageArtifacts } from '../../../../orchestrator/src/persistence/ArtifactStager.js';
import { buildRetentionMetadata } from './common.js';
import type {
  DesignArtifactApprovalRecord,
  DesignToolkitArtifactRecord
} from '../../../../packages/shared/manifest/types.js';
import { normalizeSentenceSpacing, runDefaultInteractions, type InteractionPage } from './snapshot.js';

const TOOLKIT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_SELF_CORRECTION_THRESHOLD = 1.5;

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-toolkit-reference';
  const toolkitState = ensureToolkitState(state);
  const contexts = toolkitState.contexts;

  if (contexts.length === 0) {
    upsertStage(state, {
      id: stageId,
      title: 'Toolkit reference + self-correction',
      status: 'skipped',
      notes: ['No toolkit contexts available. Run previous stages first.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-toolkit-reference] skipped — no contexts');
    return;
  }

  const retention = toolkitState.retention ?? {
    days: state.retention?.days ?? 30,
    autoPurge: state.retention?.autoPurge ?? false,
    policy: state.retention?.policy ?? 'design.config.retention'
  };
  const selfCorrection = context.config.config.pipelines.hiFiDesignToolkit.selfCorrection;
  const advanced = context.config.config.advanced;

  const tmpRoot = join(tmpdir(), `design-toolkit-reference-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  const artifacts: DesignToolkitArtifactRecord[] = [];
  const approvals: DesignArtifactApprovalRecord[] = [];
  const failures: string[] = [];
  let processed = 0;

  for (const entry of contexts) {
    try {
      const outputs = await buildReferenceOutputs(entry, context.repoRoot, tmpRoot);
      const retentionMetadata = buildRetentionMetadata(retention, new Date());

      const [referenceArtifact] = await stageArtifacts({
        taskId: context.taskId,
        runId: context.runId,
        artifacts: [
          {
            path: relative(process.cwd(), outputs.referencePath),
            description: `Reference page for ${entry.slug}`
          }
        ],
        options: {
          relativeDir: `design-toolkit/reference/${entry.slug}`,
          overwrite: true
        }
      });

      await mirrorReferenceAssets({
        entry,
        repoRoot: context.repoRoot,
        referenceArtifactPath: referenceArtifact.path
      });

      artifacts.push({
        id: `${entry.slug}-reference`,
        stage: 'reference',
        status: 'succeeded',
        relative_path: referenceArtifact.path,
        description: `Reference implementation for ${entry.slug}`,
        retention: retentionMetadata,
        metrics: {
          section_count: outputs.sectionCount
        }
      });

      upsertToolkitContext(state, {
        ...entry,
        referencePath: referenceArtifact.path
      });

      if (selfCorrection.enabled) {
        const correction = await runSelfCorrection({
          entry,
          repoRoot: context.repoRoot,
          tmpRoot,
          referenceArtifactPath: referenceArtifact.path,
          pipelineBreakpoints: context.config.config.pipelines.hiFiDesignToolkit.breakpoints,
          threshold: selfCorrection.threshold ?? DEFAULT_SELF_CORRECTION_THRESHOLD
        });
        const correctionArtifacts = [
          {
            path: relative(process.cwd(), correction.path),
            description: `Self-correction report for ${entry.slug}`
          }
        ];
        if (correction.settlingLogPath) {
          correctionArtifacts.push({
            path: relative(process.cwd(), correction.settlingLogPath),
            description: `Counter settling log for ${entry.slug}`
          });
        }
        const assetOffset = correctionArtifacts.length;
        correction.assets.forEach((asset) =>
          correctionArtifacts.push({
            path: relative(process.cwd(), asset.path),
            description: asset.description
          })
        );

        const stagedCorrection = await stageArtifacts({
          taskId: context.taskId,
          runId: context.runId,
          artifacts: correctionArtifacts,
          options: {
            relativeDir: `design-toolkit/diffs/${entry.slug}`,
            overwrite: true
          }
        });

        const diffArtifact = stagedCorrection[0];
        const settlingArtifact = correction.settlingLogPath ? stagedCorrection[1] : undefined;
        const evidenceArtifacts = stagedCorrection.slice(assetOffset);

        artifacts.push({
          id: `${entry.slug}-self-correct`,
          stage: 'self-correct',
          status: 'succeeded',
          relative_path: diffArtifact.path,
          description: `Self-correction summary for ${entry.slug}`,
          retention: retentionMetadata,
          metrics: {
            iterations: correction.iterations,
            final_error_rate: correction.finalErrorRate,
            threshold: selfCorrection.threshold ?? DEFAULT_SELF_CORRECTION_THRESHOLD,
            threshold_passed: correction.finalErrorRate <= (selfCorrection.threshold ?? DEFAULT_SELF_CORRECTION_THRESHOLD)
          }
        });

        if (settlingArtifact) {
          artifacts.push({
            id: `${entry.slug}-self-correct-settle`,
            stage: 'self-correct',
            status: 'succeeded',
            relative_path: settlingArtifact.path,
            description: `Counter settling log for ${entry.slug}`,
            retention: retentionMetadata,
            metrics: {
              wait_ms: correction.settlingWaitMs ?? 0,
              baseline_error: correction.baselineError,
              stabilized_error: correction.finalErrorRate,
              threshold: selfCorrection.threshold ?? DEFAULT_SELF_CORRECTION_THRESHOLD
            }
          });
        }

        if (evidenceArtifacts.length > 0) {
          evidenceArtifacts.forEach((artifactRecord, index) => {
            const asset = correction.assets[index];
            artifacts.push({
              id: `${entry.slug}-self-correct-${asset?.role ?? 'asset'}-${asset?.breakpoint ?? index + 1}`,
              stage: 'self-correct',
              status: 'succeeded',
              relative_path: artifactRecord.path,
              description: asset?.description ?? artifactRecord.description ?? 'Self-correction asset',
              retention: retentionMetadata,
              metrics: asset?.breakpoint ? { breakpoint: asset.breakpoint } : undefined
            });
          });
        }

        approvals.push({
          id: `self-correct-${entry.slug}`,
          actor: selfCorrection.provider ?? metadataApprover(context),
          reason: `Self-correction provider ${selfCorrection.provider ?? 'local'} approved`,
          timestamp: new Date().toISOString()
        });
      }

      if (advanced.ffmpeg.enabled) {
        approvals.push({
          id: `ffmpeg-${entry.slug}`,
          actor: advanced.ffmpeg.approver ?? metadataApprover(context),
          reason: 'FFmpeg diff rendering approved',
          timestamp: new Date().toISOString()
        });
      }

      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${entry.slug}: ${message}`);
      console.error(`[design-toolkit-reference] failed for ${entry.slug}: ${message}`);
    }
  }

  if (artifacts.length > 0) {
    appendToolkitArtifacts(state, artifacts);
  }
  if (approvals.length > 0) {
    appendApprovals(state, approvals);
  }

  const status: 'succeeded' | 'failed' = failures.length === 0 && processed > 0 ? 'succeeded' : 'failed';

  upsertStage(state, {
    id: stageId,
    title: 'Toolkit reference + self-correction',
    status,
    notes: failures.length > 0 ? failures : undefined,
    metrics: {
      processed,
      self_correction_enabled: selfCorrection.enabled
    },
    artifacts: artifacts.map((artifact) => ({
      relative_path: artifact.relative_path,
      stage: artifact.stage,
      status: artifact.status,
      description: artifact.description
    }))
  });

  await saveDesignRunState(context.statePath, state);

  if (status === 'failed') {
    throw new Error('Reference or self-correction stage failed.');
  }

  console.log(`[design-toolkit-reference] produced references for ${processed} contexts`);
}

async function buildReferenceOutputs(entry: ToolkitContextState, repoRoot: string, tmpRoot: string) {
  const referenceDir = join(tmpRoot, entry.slug, 'reference');
  await mkdir(referenceDir, { recursive: true });
  const referencePath = join(referenceDir, 'index.html');
  const sections = await loadSections(entry, repoRoot);
  const sectionCount = sections.length;
  const html = await buildReferenceHtml(entry, repoRoot, sections);
  await writeFile(referencePath, html, 'utf8');
  return { referencePath, sectionCount: sectionCount > 0 ? sectionCount : 3 };
}

type BreakpointDiffResult = {
  breakpoint: string;
  width: number;
  height: number;
  referencePath: string;
  clonePath: string;
  diffPath: string;
  mismatchPercentage: number;
  settledMismatch?: number;
  settledDiffPath?: string;
};

type InteractionMacroPayload = {
  script: string;
  contextScript: string;
};

async function runSelfCorrection(options: {
  entry: ToolkitContextState;
  repoRoot: string;
  tmpRoot: string;
  referenceArtifactPath: string;
  pipelineBreakpoints: Array<{ id: string; width: number; height: number; deviceScaleFactor?: number }>;
  threshold: number;
}): Promise<{
  path: string;
  iterations: number;
  finalErrorRate: number;
  settlingLogPath?: string;
  settlingWaitMs?: number;
  baselineError: number;
  assets: Array<{ path: string; description: string; role: string; breakpoint?: string }>;
}> {
  const { entry, repoRoot, tmpRoot, referenceArtifactPath, pipelineBreakpoints, threshold } = options;
  const correctionDir = join(tmpRoot, entry.slug, 'diffs');
  const screenshotsDir = join(correctionDir, 'screens');
  await mkdir(correctionDir, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });

  const sourceUrl = entry.referenceUrl ?? entry.url;
  const cloneUrl = resolveCloneUrl(entry, repoRoot, referenceArtifactPath);
  const breakpoints = resolveBreakpointTargets(entry, pipelineBreakpoints);
  const macro = await loadInteractionMacroForCapture(entry, repoRoot);
  const browser = await chromium.launch({ headless: true });
  const results: BreakpointDiffResult[] = [];
  let settlingLogPath: string | undefined;
  let settlingWaitMs: number | undefined;

  try {
    for (const breakpoint of breakpoints) {
      const result = await captureBreakpointDiff({
        browser,
        breakpoint,
        screenshotsDir,
        sourceUrl,
        cloneUrl,
        macro,
        waitMs: entry.interactionWaitMs ?? null
      });
      results.push(result);
    }

    if (results.length > 0) {
      const worst = results.reduce((previous, current) =>
        (current.mismatchPercentage ?? 0) >= (previous.mismatchPercentage ?? 0) ? current : previous
      );
      const settleWait = Math.max(entry.interactionWaitMs ?? 0, 650);
      const settled = await captureBreakpointDiff({
        browser,
        breakpoint: breakpoints.find((bp) => bp.id === worst.breakpoint) ?? breakpoints[0],
        screenshotsDir,
        sourceUrl,
        cloneUrl,
        macro,
        waitMs: settleWait,
        suffix: 'settled'
      });
      worst.settledMismatch = settled.mismatchPercentage;
      worst.settledDiffPath = settled.diffPath;
      const settlingLog = await recordSettlingLog({
        slug: entry.slug,
        correctionDir,
        baselineError: worst.mismatchPercentage,
        stabilizedError: settled.mismatchPercentage,
        waitMs: settleWait,
        breakpoint: settled.breakpoint
      });
      await writeFile(settlingLog.path, JSON.stringify(settlingLog.payload, null, 2), 'utf8');
      settlingLogPath = settlingLog.path;
      settlingWaitMs = settleWait;
    }
  } finally {
    await browser.close();
  }

  return await assembleSelfCorrectionResult({
    correctionDir,
    results,
    threshold,
    sourceUrl,
    cloneUrl,
    slug: entry.slug,
    settlingLogPath,
    settlingWaitMs
  });
}

async function captureBreakpointDiff(options: {
  browser: Awaited<ReturnType<typeof chromium.launch>>;
  breakpoint: { id: string; width: number; height: number; deviceScaleFactor?: number };
  screenshotsDir: string;
  sourceUrl: string;
  cloneUrl: string;
  macro?: InteractionMacroPayload | null;
  waitMs?: number | null;
  suffix?: string;
}): Promise<BreakpointDiffResult> {
  const label = options.suffix ? `${options.breakpoint.id}-${options.suffix}` : options.breakpoint.id;
  const referencePath = join(options.screenshotsDir, `reference-${label}.png`);
  const clonePath = join(options.screenshotsDir, `clone-${label}.png`);
  const diffPath = join(options.screenshotsDir, `diff-${label}.png`);
  const viewport = normalizeViewportConfig(options.breakpoint);

  const referenceShot = await captureScreenshot({
    browser: options.browser,
    targetUrl: options.sourceUrl,
    outputPath: referencePath,
    viewport,
    macro: options.macro,
    waitMs: options.waitMs,
    blockNetwork: false
  });

  const cloneShot = await captureScreenshot({
    browser: options.browser,
    targetUrl: options.cloneUrl,
    outputPath: clonePath,
    viewport,
    macro: options.macro,
    waitMs: options.waitMs,
    blockNetwork: true
  });

  const mismatchPercentage = await computeMismatch(referenceShot.image, cloneShot.image, diffPath);

  return {
    breakpoint: options.breakpoint.id,
    width: viewport.width,
    height: viewport.height,
    referencePath,
    clonePath,
    diffPath,
    mismatchPercentage
  };
}

async function captureScreenshot(options: {
  browser: Awaited<ReturnType<typeof chromium.launch>>;
  targetUrl: string;
  outputPath: string;
  viewport: { width: number; height: number; deviceScaleFactor?: number };
  macro?: InteractionMacroPayload | null;
  waitMs?: number | null;
  blockNetwork?: boolean;
}): Promise<{ image: PNG }> {
  const context = await options.browser.newContext({
    viewport: { width: options.viewport.width, height: options.viewport.height },
    deviceScaleFactor: options.viewport.deviceScaleFactor,
    userAgent: TOOLKIT_USER_AGENT
  });

  const enforceOffline = Boolean(options.blockNetwork && options.targetUrl.startsWith('file:'));
  if (enforceOffline) {
    await context.route('**/*', (route) => {
      const requestUrl = route.request().url();
      if (requestUrl.startsWith('file:') || requestUrl.startsWith('data:')) {
        return route.continue();
      }
      return route.abort();
    });
  }

  if (options.macro?.contextScript) {
    await context.addInitScript({ content: options.macro.contextScript });
  }

  const page = await context.newPage();
  await page.goto(options.targetUrl, { waitUntil: 'networkidle', timeout: 120_000 });

  if (options.macro?.script) {
    await page.addScriptTag({ content: options.macro.script }).catch(() => {});
  }

  const waitMs = options.waitMs ?? 800;
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  await runDefaultInteractions(page as unknown as InteractionPage);

  const buffer = await page.screenshot({ fullPage: true, path: options.outputPath });
  await context.close();

  return { image: PNG.sync.read(buffer) };
}

function normalizeViewportConfig(breakpoint: { width: number; height: number; deviceScaleFactor?: number }) {
  return {
    width: breakpoint.width,
    height: breakpoint.height,
    deviceScaleFactor: breakpoint.deviceScaleFactor
  };
}

async function computeMismatch(reference: PNG, candidate: PNG, diffPath: string): Promise<number> {
  const width = Math.min(reference.width, candidate.width);
  const height = Math.min(reference.height, candidate.height);
  if (width === 0 || height === 0) {
    const placeholder = new PNG({ width: 1, height: 1 });
    await writeFile(diffPath, PNG.sync.write(placeholder));
    return 100;
  }
  const normalizedReference = normalizePngDimensions(reference, width, height);
  const normalizedCandidate = normalizePngDimensions(candidate, width, height);
  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    normalizedReference.data,
    normalizedCandidate.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );
  const percent = (mismatchedPixels / (width * height)) * 100;
  await writeFile(diffPath, PNG.sync.write(diff));
  return roundPercent(percent);
}

function normalizePngDimensions(image: PNG, width: number, height: number): PNG {
  if (image.width === width && image.height === height) {
    return image;
  }
  const output = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceStart = y * image.width * 4;
    const targetStart = y * width * 4;
    image.data.copy(output.data, targetStart, sourceStart, sourceStart + width * 4);
  }
  return output;
}

function roundPercent(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

async function loadInteractionMacroForCapture(
  entry: ToolkitContextState,
  repoRoot: string
): Promise<InteractionMacroPayload | null> {
  if (!entry.interactionScriptPath) {
    return null;
  }
  try {
    const absolute = join(repoRoot, entry.interactionScriptPath);
    const script = await readFile(absolute, 'utf8');
    return {
      script: script.trim(),
      contextScript: buildMacroContextScript(entry)
    };
  } catch (error) {
    console.warn(`[design-toolkit-reference] Failed to load interaction macro for ${entry.slug}:`, error);
  }
  return null;
}

function buildMacroContextScript(entry: ToolkitContextState): string {
  const payload = {
    slug: entry.slug,
    url: entry.url,
    waitMs: entry.interactionWaitMs ?? null,
    runtimeCanvasColors: entry.runtimeCanvasColors ?? [],
    resolvedFonts: entry.resolvedFonts ?? []
  };
  return `(function(){window.macroContext=Object.assign({},window.macroContext||{},${JSON.stringify(payload)});})();`;
}

function resolveBreakpointTargets(
  entry: ToolkitContextState,
  pipeline: Array<{ id: string; width: number; height: number; deviceScaleFactor?: number }>
) {
  const map = new Map(pipeline.map((bp) => [bp.id, bp]));
  const resolved: Array<{ id: string; width: number; height: number; deviceScaleFactor?: number }> = [];
  for (const id of entry.breakpoints) {
    const match = map.get(id);
    if (match) {
      resolved.push(match);
    }
  }
  if (resolved.length > 0) {
    return resolved;
  }
  if (pipeline.length > 0) {
    return [pipeline[0]];
  }
  return [{ id: 'desktop', width: 1440, height: 900 }];
}

function resolveCloneUrl(entry: ToolkitContextState, repoRoot: string, referenceArtifactPath: string): string {
  const absoluteReference = referenceArtifactPath
    ? isAbsolute(referenceArtifactPath)
      ? referenceArtifactPath
      : join(repoRoot, referenceArtifactPath)
    : entry.snapshotHtmlPath
      ? isAbsolute(entry.snapshotHtmlPath)
        ? entry.snapshotHtmlPath
        : join(repoRoot, entry.snapshotHtmlPath)
      : null;
  if (absoluteReference) {
    return pathToFileURL(absoluteReference).toString();
  }
  return entry.referenceUrl ?? entry.url;
}

async function recordSettlingLog(options: {
  slug: string;
  correctionDir: string;
  baselineError: number;
  stabilizedError: number;
  waitMs: number;
  breakpoint: string;
}): Promise<{ path: string; payload: Record<string, unknown> }> {
  const waitMs = Math.max(0, options.waitMs);
  const path = join(options.correctionDir, 'counter-settling.json');
  const payload = {
    slug: options.slug,
    breakpoint: options.breakpoint,
    wait_ms: waitMs,
    baseline_error: roundPercent(options.baselineError),
    stabilized_error: roundPercent(options.stabilizedError),
    recorded_at: new Date().toISOString()
  };
  return { path, payload };
}

async function assembleSelfCorrectionResult(options: {
  correctionDir: string;
  results: BreakpointDiffResult[];
  threshold: number;
  sourceUrl: string;
  cloneUrl: string;
  slug: string;
  settlingLogPath?: string;
  settlingWaitMs?: number;
}): Promise<{
  path: string;
  iterations: number;
  finalErrorRate: number;
  settlingLogPath?: string;
  settlingWaitMs?: number;
  baselineError: number;
  assets: Array<{ path: string; description: string; role: string; breakpoint?: string }>;
}> {
  const { correctionDir, results, threshold, sourceUrl, cloneUrl, slug, settlingLogPath, settlingWaitMs } = options;
  const reportPath = join(correctionDir, 'self-correction.json');
  const finalValues = results.map((result) => result.settledMismatch ?? result.mismatchPercentage);
  const finalErrorRate = finalValues.length > 0 ? roundPercent(Math.max(...finalValues)) : 0;
  const averageErrorRate =
    finalValues.length > 0 ? roundPercent(finalValues.reduce((sum, value) => sum + value, 0) / finalValues.length) : 0;
  const baselineError =
    results.length > 0 ? roundPercent(Math.max(...results.map((result) => result.mismatchPercentage))) : 0;

  const payload = {
    slug,
    reference: sourceUrl,
    clone: cloneUrl,
    threshold,
    threshold_passed: threshold > 0 ? finalErrorRate <= threshold : null,
    average_error_rate: averageErrorRate,
    final_error_rate: finalErrorRate,
    breakpoints: results.map((result) => ({
      id: result.breakpoint,
      width: result.width,
      height: result.height,
      mismatch_percent: result.mismatchPercentage,
      settled_mismatch_percent: result.settledMismatch ?? null,
      reference_image: result.referencePath,
      clone_image: result.clonePath,
      diff_image: result.diffPath,
      settled_diff_image: result.settledDiffPath ?? null
    })),
    recorded_at: new Date().toISOString(),
    settling_log: settlingLogPath ?? null
  };

  await writeFile(reportPath, JSON.stringify(payload, null, 2), 'utf8');

  return {
    path: reportPath,
    iterations: results.length,
    finalErrorRate,
    settlingLogPath,
    settlingWaitMs,
    baselineError,
    assets: buildSelfCorrectionAssets(results)
  };
}

function buildSelfCorrectionAssets(results: BreakpointDiffResult[]) {
  const assets: Array<{ path: string; description: string; role: string; breakpoint?: string }> = [];
  for (const result of results) {
    assets.push({
      path: result.referencePath,
      description: `Reference screenshot (${result.breakpoint})`,
      role: 'reference',
      breakpoint: result.breakpoint
    });
    assets.push({
      path: result.clonePath,
      description: `Clone screenshot (${result.breakpoint})`,
      role: 'clone',
      breakpoint: result.breakpoint
    });
    assets.push({
      path: result.diffPath,
      description: `Diff heatmap (${result.breakpoint})`,
      role: 'diff',
      breakpoint: result.breakpoint
    });
    if (result.settledDiffPath) {
      assets.push({
        path: result.settledDiffPath,
        description: `Settled diff (${result.breakpoint})`,
        role: 'settled-diff',
        breakpoint: result.breakpoint
      });
    }
  }
  return assets;
}

function metadataApprover(context: DesignContext) {
  return context.config.config.metadata.design.privacy.approver ?? 'design-reviewer';
}

async function loadSections(entry: ToolkitContextState, repoRoot: string) {
  if (!entry.sectionsPath) {
    return [] as Array<{ title: string; description: string }>;
  }
  try {
    const absolute = join(repoRoot, entry.sectionsPath);
    const raw = await readFile(absolute, 'utf8');
    const parsed = JSON.parse(raw) as Array<{ title?: string; description?: string }>;
    return parsed
      .map((section) => ({
        title:
          normalizeSentenceSpacing(section.title ?? 'Section')
            .replace(/\s+/g, ' ')
            .trim() || 'Section',
        description: normalizeSentenceSpacing(section.description ?? '')
          .replace(/\s+/g, ' ')
          .trim()
      }))
      .filter((section) => section.description.length > 0);
  } catch (error) {
    console.warn(`[design-toolkit-reference] Failed to read sections for ${entry.slug}:`, error);
  }
  return [];
}

async function buildReferenceHtml(
  entry: ToolkitContextState,
  repoRoot: string,
  sections: Array<{ title: string; description: string }>
): Promise<string> {
  if (!entry.snapshotHtmlPath) {
    return fallbackReference(entry.slug, entry.url);
  }
  try {
    const absolute = join(repoRoot, entry.snapshotHtmlPath);
    const snapshotHtml = await readFile(absolute, 'utf8');
    const overlayEnabled = process.env.HI_FI_TOOLKIT_DEBUG_OVERLAY === '1';
    const scrollUnlockEnabled = process.env.HI_FI_TOOLKIT_SCROLL_UNLOCK === '1';
    const overlay = overlayEnabled ? buildOverlay(entry.url, sections) : '';
    const styleBlock = overlayEnabled ? buildOverlayStyles() : '';
    const scrollScript = scrollUnlockEnabled ? buildScrollFallbackScript() : '';
    const interactionScript = await buildInteractionMacro(entry, repoRoot);
    const withStyles = overlay ? injectIntoHead(snapshotHtml, styleBlock) : snapshotHtml;
    const macroBundle = [overlay, scrollScript, interactionScript].filter(Boolean).join('\n');
    return macroBundle ? injectAfterBodyOpen(withStyles, macroBundle) : withStyles;
  } catch (error) {
    console.warn(`[design-toolkit-reference] Failed to read snapshot for ${entry.slug}:`, error);
    return fallbackReference(entry.slug, entry.url);
  }
}

function fallbackReference(slug: string, url: string): string {
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8"/>\n  <title>${slug} Reference</title>\n  <style>body{font-family:system-ui;padding:2rem;}section{margin-bottom:2rem;}</style>\n</head>\n<body>\n  <section aria-label="fallback"><h2>Snapshot unavailable</h2><p>Original capture for ${escapeHtml(
    url
  )} missing; showing placeholder.</p></section>\n</body>\n</html>`;
}

function buildOverlay(sourceUrl: string, sections: Array<{ title: string; description: string }>): string {
  const list =
    sections.length > 0
      ? `<ol>${sections
          .map(
            (section) =>
              `<li><strong>${escapeHtml(section.title)}</strong><p>${escapeHtml(section.description)}</p></li>`
          )
          .join('')}</ol>`
      : '<p>No sections detected.</p>';
  return `<div class="codex-clone-overlay"><div class="codex-clone-banner"><strong>Hi-Fi Toolkit Clone</strong><p>Source: <a href="${escapeHtml(
    sourceUrl
  )}" target="_blank" rel="noreferrer">${escapeHtml(sourceUrl)}</a></p></div><div class="codex-section-outline"><h2>Captured Sections</h2>${list}</div></div>`;
}

function buildOverlayStyles(): string {
  return `<style id="codex-clone-style">\n  .codex-clone-overlay { position: fixed; top: 1rem; right: 1rem; width: 320px; max-height: 90vh; overflow-y: auto; z-index: 9999; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #f2f2f2; }\n  .codex-clone-banner { background: rgba(7, 7, 12, 0.95); padding: 1rem; border-radius: 0.75rem 0.75rem 0 0; box-shadow: 0 8px 20px rgba(0,0,0,0.4); }\n  .codex-clone-banner a { color: #7dd3ff; text-decoration: none; }\n  .codex-section-outline { background: rgba(12, 12, 18, 0.92); padding: 0.75rem 1rem 1rem; border-radius: 0 0 0.75rem 0.75rem; font-size: 0.85rem; line-height: 1.4; }\n  .codex-section-outline ol { margin: 0; padding-left: 1.25rem; }\n  .codex-section-outline li { margin-bottom: 0.75rem; }\n  .codex-section-outline p { margin: 0.25rem 0 0; color: #cbd5f5; }\n  @media (max-width: 900px) { .codex-clone-overlay { position: static; width: auto; max-height: none; } }\n</style>`;
}

function buildScrollFallbackScript(): string {
  return `<script id="codex-scroll-fallback">(function(){\n  const html = document.documentElement;\n  const body = document.body;\n  if (!html || !body) { return; }\n  const MAX_ATTEMPTS = 8;\n  let attempts = 0;\n\n  function isLocked() {\n    if (!body) { return false; }\n    if (body.hasAttribute('data-lenis-prevent')) { return true; }\n    const bodyOverflow = window.getComputedStyle(body).overflowY;\n    const htmlOverflow = window.getComputedStyle(html).overflowY;\n    return bodyOverflow === 'hidden' || htmlOverflow === 'hidden';\n  }\n\n  function unlock() {\n    body.removeAttribute('data-lenis-prevent');\n    body.style.overflowY = 'auto';\n    body.style.removeProperty('height');\n    body.style.removeProperty('min-height');\n    html.style.overflowY = 'auto';\n    html.style.removeProperty('--vh-in-px');\n  }\n\n  function tryUnlock() {\n    if (!isLocked()) { return; }\n    attempts += 1;\n    unlock();\n    if (attempts < MAX_ATTEMPTS) {\n      setTimeout(tryUnlock, 500);\n    }\n  }\n\n  window.addEventListener('load', () => {\n    setTimeout(tryUnlock, 1200);\n  });\n  document.addEventListener('visibilitychange', () => {\n    if (document.visibilityState === 'visible') {\n      setTimeout(tryUnlock, 600);\n    }\n  });\n})();</script>`;
}

function injectIntoHead(html: string, snippet: string): string {
  if (html.includes('</head>')) {
    return html.replace('</head>', `${snippet}\n</head>`);
  }
  return `${snippet}\n${html}`;
}

function injectAfterBodyOpen(html: string, snippet: string): string {
  const match = html.match(/<body[^>]*>/i);
  if (match) {
    return html.replace(match[0], `${match[0]}\n${snippet}\n`);
  }
  return `${snippet}\n${html}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function mirrorReferenceAssets(options: {
  entry: ToolkitContextState;
  repoRoot: string;
  referenceArtifactPath: string;
}): Promise<void> {
  const { entry, repoRoot, referenceArtifactPath } = options;
  const contextDir = join(repoRoot, entry.relativeDir);
  if (!(await directoryExists(contextDir))) {
    return;
  }
  const referenceDir = dirname(join(repoRoot, referenceArtifactPath));
  await mkdir(referenceDir, { recursive: true });
  const entries = await readdir(contextDir, { withFileTypes: true });
  let copiedAssets = false;
  let copiedVideo = false;
  for (const entryDir of entries) {
    if (!entryDir.isDirectory()) {
      continue;
    }
    const sourcePath = join(contextDir, entryDir.name);
    const destinationPath = join(referenceDir, entryDir.name);
    await cp(sourcePath, destinationPath, { recursive: true, force: true });
    if (entryDir.name === 'assets') {
      copiedAssets = true;
      await mirrorTopLevelShortcuts(destinationPath, referenceDir);
    }
    if (entryDir.name === 'video') {
      copiedVideo = true;
    }
  }
  if (!copiedAssets) {
    const assetsPath = join(contextDir, 'assets');
    if (await directoryExists(assetsPath)) {
      await mkdir(join(referenceDir, 'assets'), { recursive: true });
      await cp(assetsPath, join(referenceDir, 'assets'), { recursive: true, force: true });
      await mirrorTopLevelShortcuts(join(referenceDir, 'assets'), referenceDir);
    }
  }

  if (!copiedVideo) {
    const videoPath = join(contextDir, 'video');
    if (await directoryExists(videoPath)) {
      await cp(videoPath, join(referenceDir, 'video'), { recursive: true, force: true });
    }
  }
}

async function buildInteractionMacro(entry: ToolkitContextState, repoRoot: string): Promise<string | null> {
  if (!entry.interactionScriptPath) {
    return null;
  }
  try {
    const absolute = join(repoRoot, entry.interactionScriptPath);
    const script = await readFile(absolute, 'utf8');
    const contextScript = `<script id="codex-interaction-context">${buildMacroContextScript(entry)}</script>`;
    return `${contextScript}\n<script id="codex-interaction-macro">${script.trim()}\n</script>`;
  } catch (error) {
    console.warn(`[design-toolkit-reference] Failed to load interaction macro for ${entry.slug}:`, error);
    return null;
  }
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function mirrorTopLevelShortcuts(sourceAssetsDir: string, referenceDir: string): Promise<void> {
  const entries = await readdir(sourceAssetsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const shortcutName = entry.name;
    // Preserve "assets" prefix; only mirror top-level roots (e.g., wp-content, wp-includes).
    if (!/^wp-/.test(shortcutName)) {
      continue;
    }
    const shortcutPath = join(referenceDir, shortcutName);
    try {
      await symlink(join(sourceAssetsDir, shortcutName), shortcutPath);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'EEXIST') {
        continue;
      }
      throw error;
    }
  }
}

main().catch((error) => {
  console.error('[design-toolkit-reference] failed to build references');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
