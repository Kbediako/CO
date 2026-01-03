import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { loadDesignContext } from './context.js';
import {
  appendArtifacts,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage,
  type StageStateArtifactSummary
} from './state.js';
import { stageArtifacts } from '../../../orchestrator/src/persistence/ArtifactStager.js';
import type { DesignArtifactRecord } from '../../../packages/shared/manifest/types.js';
import { slugify as sharedSlugify } from '../../../packages/shared/utils/strings.js';
import type { Browser, Page } from 'playwright';
import { loadPlaywright } from './optional-deps.js';
type PlaywrightModule = Awaited<ReturnType<typeof loadPlaywright>>;

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-extract';

  const metadata = context.config.config.metadata.design;
  if (metadata.captureUrls.length === 0) {
    upsertStage(state, {
      id: stageId,
      title: 'Playwright extractor',
      status: 'skipped',
      notes: ['No capture URLs configured.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-extract] skipped — no capture URLs configured');
    return;
  }

  const breakpoints = metadata.breakpoints.length > 0 ? metadata.breakpoints : defaultBreakpoints();
  const records: DesignArtifactRecord[] = [];
  const stageSummaries: StageStateArtifactSummary[] = [];
  const notes: string[] = [];
  let successCount = 0;

  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  const tmpRoot = join(tmpdir(), `design-extract-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  try {
    for (const url of metadata.captureUrls) {
      for (const breakpoint of breakpoints) {
        try {
          const result = await captureWithPlaywright({
            browser,
            url,
            breakpoint,
            tmpRoot,
            taskId: context.taskId,
            runId: context.runId,
            allowThirdParty: metadata.privacy.allowThirdParty,
            maskSelectors: metadata.maskSelectors ?? []
          });
          records.push(...result.records);
          stageSummaries.push(...result.stageSummaries);
          successCount += 1;
          console.log(`[design-extract] staged assets for ${url} @ ${breakpoint.id}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          notes.push(`${url} (${breakpoint.id}): ${message}`);
          console.error(`[design-extract] capture failed for ${url} @ ${breakpoint.id}: ${message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  appendArtifacts(state, records);

  const stageStatus = successCount === 0 ? 'failed' : notes.length > 0 ? 'failed' : 'succeeded';
  upsertStage(state, {
    id: stageId,
    title: 'Playwright extractor',
    status: stageStatus,
    notes: notes.length > 0 ? notes : undefined,
    metrics: {
      capture_count: successCount,
      failure_count: notes.length,
      breakpoint_count: breakpoints.length
    },
    artifacts: stageSummaries
  });

  await saveDesignRunState(context.statePath, state);

  if (stageStatus === 'failed') {
    throw new Error('Playwright extraction encountered failures. See stage notes for details.');
  }
}

interface CaptureOptions {
  browser: Browser;
  url: string;
  breakpoint: {
    id: string;
    width: number;
    height: number;
    deviceScaleFactor?: number;
  };
  tmpRoot: string;
  taskId: string;
  runId: string;
  allowThirdParty: boolean;
  maskSelectors: string[];
}

async function captureWithPlaywright(options: CaptureOptions): Promise<{
  records: DesignArtifactRecord[];
  stageSummaries: StageStateArtifactSummary[];
}> {
  const { browser, url, breakpoint, tmpRoot, taskId, runId, allowThirdParty, maskSelectors } = options;
  const context = await browser.newContext({
    viewport: { width: breakpoint.width, height: breakpoint.height },
    deviceScaleFactor: breakpoint.deviceScaleFactor
  });

  const baseOrigin = new URL(url).origin;
  if (!allowThirdParty) {
    await context.route('**/*', async (route) => {
      const requestUrl = route.request().url();
      if (isSameOrigin(baseOrigin, requestUrl)) {
        await route.continue();
      } else {
        await route.abort();
      }
    });
  }

  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    if (maskSelectors.length > 0) {
      await page.addStyleTag({ content: createMaskStyles(maskSelectors) });
    }

    const slug = slugify(`${url}-${breakpoint.id}`);
    const captureDir = join(tmpRoot, slug);
    await mkdir(captureDir, { recursive: true });

    const domPath = join(captureDir, 'dom.html');
    const cssPath = join(captureDir, 'styles.css');
    const screenshotPath = join(captureDir, 'screenshot.png');
    const metadataPath = join(captureDir, 'metadata.json');

    const html = await page.content();
    const css = await collectStyles(page);
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });

    const metadata = {
      url,
      breakpoint,
      capturedAt: new Date().toISOString(),
      assets: {
        dom: 'dom.html',
        css: 'styles.css',
        screenshot: 'screenshot.png'
      },
      privacy: {
        allowThirdParty,
        maskSelectors
      }
    };

    await Promise.all([
      writeFile(domPath, html, 'utf8'),
      writeFile(cssPath, css, 'utf8'),
      writeFile(screenshotPath, screenshot),
      writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8')
    ]);

    const relativeDir = `design/reference/playwright/${sanitizeSegment(breakpoint.id)}/${slug}`;
    const staged = await stageArtifacts({
      taskId,
      runId,
      artifacts: [
        { path: relative(process.cwd(), domPath), description: `DOM snapshot for ${url}` },
        { path: relative(process.cwd(), cssPath), description: `CSS snapshot for ${url}` },
        { path: relative(process.cwd(), screenshotPath), description: `Screenshot for ${url}` },
        { path: relative(process.cwd(), metadataPath), description: `Capture metadata for ${url}` }
      ],
      options: {
        relativeDir,
        overwrite: true
      }
    });

    const [domArtifact, cssArtifact, screenshotArtifact, metadataArtifact] = staged;

    const records: DesignArtifactRecord[] = [
      buildDesignRecord('dom', domArtifact.path, url, breakpoint.id),
      buildDesignRecord('css', cssArtifact.path, url, breakpoint.id),
      buildDesignRecord('screenshot', screenshotArtifact.path, url, breakpoint.id),
      {
        stage: 'extract',
        status: 'succeeded',
        relative_path: metadataArtifact.path,
        type: 'metadata',
        description: `${url} (${breakpoint.id}) metadata`,
        metadata
      }
    ];

    const stageSummaries: StageStateArtifactSummary[] = [
      summaryEntry(domArtifact.path, 'DOM snapshot'),
      summaryEntry(cssArtifact.path, 'CSS snapshot'),
      summaryEntry(screenshotArtifact.path, 'Screenshot'),
      summaryEntry(metadataArtifact.path, 'Metadata')
    ];

    return { records, stageSummaries };
  } finally {
    await context.close();
  }
}

function summaryEntry(path: string, description: string): StageStateArtifactSummary {
  return {
    relative_path: path,
    stage: 'extract',
    status: 'succeeded',
    description
  };
}

function buildDesignRecord(
  type: string,
  path: string,
  url: string,
  breakpointId: string
): DesignArtifactRecord {
  return {
    stage: 'extract',
    status: 'succeeded',
    relative_path: path,
    type,
    description: `${url} (${breakpointId})`
  };
}

function createMaskStyles(selectors: string[]): string {
  const rules = selectors
    .map((selector) => `${selector} { filter: blur(10px) !important; }`)
    .join('\n');
  return `${rules}\n`;
}

function isSameOrigin(baseOrigin: string, requestUrl: string): boolean {
  try {
    const requestOrigin = new URL(requestUrl).origin;
    return requestOrigin === baseOrigin;
  } catch {
    return false;
  }
}

async function collectStyles(page: Page): Promise<string> {
  return (await page.evaluate(() => {
    const outputs: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules ? Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n') : '';
        outputs.push(rules);
      } catch (error) {
        const href = (sheet as CSSStyleSheet).href ?? 'inline';
        outputs.push(`/* Unable to read stylesheet: ${href} (${String(error)}) */`);
      }
    }
    return outputs.join('\n\n');
  })) as string;
}

function defaultBreakpoints() {
  return [
    {
      id: 'default',
      width: 1280,
      height: 720
    }
  ];
}

function slugify(value: string): string {
  return sharedSlugify(value, {
    fallback: 'capture',
    maxLength: 60,
    lowercase: true,
    pattern: /[^a-z0-9]+/g,
    collapseDashes: true
  });
}

function sanitizeSegment(value: string): string {
  const slug = slugify(value);
  return slug.length > 0 ? slug : 'default';
}

main().catch((error) => {
  console.error('[design-extract] failed to stage assets');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
