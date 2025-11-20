import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { loadDesignContext } from '../context.js';
import type { DesignContext } from '../context.js';
import {
  appendApprovals,
  appendToolkitArtifacts,
  ensureToolkitState,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage,
  upsertToolkitContext
} from '../state.js';
import { stageArtifacts } from '../../../../orchestrator/src/persistence/ArtifactStager.js';
import {
  buildRetentionMetadata,
  computeToolkitRetention,
  ensureSourcePermitted,
  loadToolkitPermit,
  resolveToolkitSources,
  slugifyToolkitValue,
  type ToolkitRuntimeSource
} from './common.js';
import { capturePageSnapshot } from './snapshot.js';
import type {
  DesignArtifactApprovalRecord,
  DesignToolkitArtifactRecord
} from '../../../../packages/shared/manifest/types.js';
import type { DesignToolkitPipelineConfig } from '../../../../packages/shared/config/index.js';

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-toolkit-extract';
  const toolkitState = ensureToolkitState(state);
  const metadata = context.config.config.metadata.design;
  const pipelineConfig = context.config.config.pipelines.hiFiDesignToolkit;
  const sources = resolveToolkitSources(pipelineConfig, metadata);

  if (sources.length === 0) {
    upsertStage(state, {
      id: stageId,
      title: 'Toolkit context acquisition',
      status: 'skipped',
      notes: ['No hi-fi design toolkit sources configured.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-toolkit-extract] skipped — no sources configured');
    return;
  }

  const permit = await loadToolkitPermit(context.repoRoot).catch((error) => {
    console.warn('[design-toolkit-extract] permit load failed, proceeding without enforcement', error);
    return { allowedSources: [] };
  });

  const fallbackRetention = {
    days: state.retention?.days ?? metadata.retention.days,
    autoPurge: state.retention?.autoPurge ?? metadata.retention.autoPurge,
    policy: state.retention?.policy ?? 'design.config.retention'
  };
  toolkitState.retention = computeToolkitRetention(pipelineConfig, fallbackRetention);

  const now = new Date();
  const tmpRoot = join(tmpdir(), `design-toolkit-context-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  let successCount = 0;
  const failures: string[] = [];
  const stagedArtifacts: DesignToolkitArtifactRecord[] = [];
  const approvals: DesignArtifactApprovalRecord[] = [];

  for (const source of sources) {
    try {
      ensureSourcePermitted(source.url, permit);
      const contextResult = await stageContextArtifact({
        context,
        source,
        tmpRoot,
        retentionDays: toolkitState.retention?.days ?? fallbackRetention.days,
        retentionPolicy: toolkitState.retention?.policy ?? fallbackRetention.policy,
        autoPurge: toolkitState.retention?.autoPurge ?? fallbackRetention.autoPurge,
        timestamp: now,
        liveAssets: pipelineConfig.liveAssets,
        interactionsEnabled: pipelineConfig.interactions?.enabled ?? false
      });
      successCount += 1;
      stagedArtifacts.push(contextResult.artifact);

      approvals.push({
        id: `playwright-${source.slug}`,
        actor: metadata.privacy.approver ?? 'design-reviewer',
        reason: `Playwright extraction approved for ${source.url}`,
        timestamp: new Date().toISOString()
      });

      upsertToolkitContext(state, {
        id: source.id ?? slugifyToolkitValue(source.url, successCount - 1),
        slug: source.slug,
        title: source.title ?? null,
        url: source.url,
        referenceUrl: source.referenceUrl ?? source.url,
        relativeDir: contextResult.artifact.relative_path.split('/').slice(0, -1).join('/'),
        breakpoints: source.breakpoints.map((bp) => bp.id),
        snapshotHtmlPath: contextResult.paths.inlineHtmlPath,
        snapshotRawHtmlPath: contextResult.paths.rawHtmlPath,
        snapshotCssPath: contextResult.paths.stylesPath,
        palettePath: contextResult.paths.palettePath,
        sectionsPath: contextResult.paths.sectionsPath,
        palettePreview: contextResult.palettePreview,
        fontFamilies: contextResult.fontFamilies,
        runtimeCanvasColors: contextResult.runtimeCanvasColors,
        resolvedFonts: contextResult.resolvedFonts,
        interactionScriptPath: pipelineConfig.interactions?.scriptPath ?? null,
        interactionWaitMs: pipelineConfig.interactions?.waitMs ?? null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${source.url}: ${message}`);
      console.error(`[design-toolkit-extract] failed to process ${source.url}: ${message}`);
    }
  }

  if (stagedArtifacts.length > 0) {
    appendToolkitArtifacts(state, stagedArtifacts);
  }
  if (approvals.length > 0) {
    appendApprovals(state, approvals);
  }

  const stageStatus: 'succeeded' | 'failed' = failures.length === 0 && successCount > 0 ? 'succeeded' : 'failed';
  upsertStage(state, {
    id: stageId,
    title: 'Toolkit context acquisition',
    status: stageStatus,
    notes: failures.length > 0 ? failures : undefined,
    metrics: {
      source_count: sources.length,
      captured_count: successCount
    },
    artifacts: stagedArtifacts.map((artifact) => ({
      relative_path: artifact.relative_path,
      stage: 'extract',
      status: artifact.status,
      description: artifact.description
    }))
  });

  await saveDesignRunState(context.statePath, state);

  if (stageStatus === 'failed') {
    throw new Error('One or more toolkit sources failed staging.');
  }

  console.log(`[design-toolkit-extract] staged ${successCount} / ${sources.length} sources`);
}

interface ContextArtifactResult {
  artifact: DesignToolkitArtifactRecord;
  paths: {
    contextPath: string;
    inlineHtmlPath: string;
    rawHtmlPath: string;
    stylesPath: string;
    palettePath: string;
    sectionsPath: string;
  };
  palettePreview: string[];
  fontFamilies: string[];
  runtimeCanvasColors: string[];
  resolvedFonts: string[];
}

async function stageContextArtifact(options: {
  context: DesignContext;
  source: ToolkitRuntimeSource;
  tmpRoot: string;
  retentionDays: number;
  retentionPolicy?: string;
  autoPurge: boolean;
  timestamp: Date;
  liveAssets?: DesignToolkitPipelineConfig['liveAssets'];
  interactionsEnabled?: boolean;
}): Promise<ContextArtifactResult> {
  const {
    context,
    source,
    tmpRoot,
    retentionDays,
    retentionPolicy,
    autoPurge,
    timestamp,
    liveAssets,
    interactionsEnabled
  } = options;
  const primaryBreakpoint = source.breakpoints[0];
  const viewport = primaryBreakpoint
    ? {
        width: primaryBreakpoint.width,
        height: primaryBreakpoint.height,
        deviceScaleFactor: primaryBreakpoint.deviceScaleFactor
      }
    : undefined;
  const snapshot = await capturePageSnapshot(source.url, {
    keepScripts: liveAssets?.keepScripts ?? false,
    maxStylesheets: liveAssets?.maxStylesheets ?? undefined,
    mirrorAssets: liveAssets?.mirrorAssets ?? false,
    allowRemoteAssets: liveAssets?.allowRemoteAssets ?? false,
    viewport,
    runInteractions: Boolean(interactionsEnabled)
  });

  const slugDir = join(tmpRoot, source.slug);
  await mkdir(slugDir, { recursive: true });

  const contextPayload = {
    id: source.id,
    url: source.url,
    referenceUrl: source.referenceUrl,
    breakpoints: source.breakpoints,
    maskSelectors: source.maskSelectors,
    capturedAt: timestamp.toISOString(),
    colorPalettePreview: snapshot.colorPalette.slice(0, 12),
    fontFamilies: snapshot.fontFamilies,
    sectionCount: snapshot.sections.length,
    runtimeCanvasColors: snapshot.runtimeCanvasColors,
    resolvedFonts: snapshot.resolvedFonts
  };

  const contextPath = join(slugDir, 'context.json');
  const inlineHtmlPath = join(slugDir, 'inline.html');
  const rawHtmlPath = join(slugDir, 'original.html');
  const stylesPath = join(slugDir, 'styles.css');
  const palettePath = join(slugDir, 'palette.json');
  const sectionsPath = join(slugDir, 'sections.json');

  await Promise.all([
    writeFile(contextPath, `${JSON.stringify(contextPayload, null, 2)}\n`, 'utf8'),
    writeFile(inlineHtmlPath, snapshot.inlineHtml, 'utf8'),
    writeFile(rawHtmlPath, snapshot.originalHtml, 'utf8'),
    writeFile(stylesPath, snapshot.aggregatedCss, 'utf8'),
    writeFile(palettePath, `${JSON.stringify(snapshot.colorPalette, null, 2)}\n`, 'utf8'),
    writeFile(sectionsPath, `${JSON.stringify(snapshot.sections, null, 2)}\n`, 'utf8')
  ]);

  if (snapshot.assets.length > 0) {
    for (const asset of snapshot.assets) {
      const assetPath = join(slugDir, asset.relativePath);
      await mkdir(dirname(assetPath), { recursive: true });
      await writeFile(assetPath, asset.buffer);
    }
  }

  const stagedFiles = await stageArtifacts({
    taskId: context.taskId,
    runId: context.runId,
    artifacts: [
      {
        path: relative(process.cwd(), contextPath),
        description: `Toolkit context for ${source.url}`
      },
      {
        path: relative(process.cwd(), inlineHtmlPath),
        description: `Inlined Cognition clone for ${source.url}`
      },
      {
        path: relative(process.cwd(), rawHtmlPath),
        description: `Original HTML for ${source.url}`
      },
      {
        path: relative(process.cwd(), stylesPath),
        description: `Aggregated CSS for ${source.url}`
      },
      {
        path: relative(process.cwd(), palettePath),
        description: `Color palette for ${source.url}`
      },
      {
        path: relative(process.cwd(), sectionsPath),
        description: `Section summaries for ${source.url}`
      }
    ],
    options: {
      relativeDir: join('design-toolkit', 'context', source.slug),
      overwrite: true
    }
  });

  const [contextRecord, inlineRecord, rawRecord, stylesRecord, paletteRecord, sectionsRecord] = stagedFiles;
  const contextDir = join(process.cwd(), dirname(contextRecord.path));

  if (snapshot.assets.length > 0) {
    for (const asset of snapshot.assets) {
      const tempPath = join(slugDir, asset.relativePath);
      const destinationPath = join(contextDir, asset.relativePath);
      await mkdir(dirname(destinationPath), { recursive: true });
      await copyFile(tempPath, destinationPath);
    }
  }

  const retention = buildRetentionMetadata(
    {
      days: retentionDays,
      autoPurge,
      policy: retentionPolicy
    },
    timestamp
  );

  return {
    artifact: {
      id: source.id,
      stage: 'extract',
      status: 'succeeded',
      relative_path: contextRecord.path,
      description: `Context snapshot for ${source.slug}`,
      retention,
      metrics: {
        breakpoint_count: source.breakpoints.length,
        color_count: snapshot.colorPalette.length,
        section_count: snapshot.sections.length
      }
    },
    paths: {
      contextPath: contextRecord.path,
      inlineHtmlPath: inlineRecord.path,
      rawHtmlPath: rawRecord.path,
      stylesPath: stylesRecord.path,
      palettePath: paletteRecord.path,
      sectionsPath: sectionsRecord.path
    },
    palettePreview: snapshot.colorPalette.slice(0, 12),
    fontFamilies: snapshot.fontFamilies,
    runtimeCanvasColors: snapshot.runtimeCanvasColors,
    resolvedFonts: snapshot.resolvedFonts
  };
}

main().catch((error) => {
  console.error('[design-toolkit-extract] failed to stage toolkit context');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
