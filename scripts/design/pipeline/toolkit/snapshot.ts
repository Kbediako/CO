import { Buffer } from 'node:buffer';
import { load, type CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { chromium, type Page, type Response } from 'playwright';

export interface PageSectionSummary {
  title: string;
  description: string;
}

export interface SnapshotAsset {
  sourceUrl: string;
  relativePath: string;
  buffer: Buffer;
}

export interface PageSnapshot {
  originalHtml: string;
  inlineHtml: string;
  aggregatedCss: string;
  colorPalette: string[];
  fontFamilies: string[];
  runtimeCanvasColors: string[];
  resolvedFonts: string[];
  sections: PageSectionSummary[];
  assets: SnapshotAsset[];
}

const DEFAULT_MAX_STYLESHEETS = 24;
const DEFAULT_VIEWPORT = { width: 1440, height: 900 } as const;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MIRRORABLE_RESOURCE_TYPES = new Set(['document', 'stylesheet', 'image', 'media', 'font', 'script', 'xhr']);

export interface SnapshotViewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

interface SnapshotOptions {
  maxStylesheets?: number;
  keepScripts?: boolean;
  mirrorAssets?: boolean;
  allowRemoteAssets?: boolean;
  runInteractions?: boolean;
  viewport?: SnapshotViewport;
}

export type InteractionElementHandle = {
  click(options?: Record<string, unknown>): Promise<void>;
  hover(options?: Record<string, unknown>): Promise<void>;
};

export type InteractionPage = {
  waitForTimeout(ms: number): Promise<void>;
  mouse: {
    wheel: (deltaX: number, deltaY: number) => Promise<void>;
  };
  $(selector: string): Promise<InteractionElementHandle | null>;
  evaluate<R>(pageFunction: () => R | Promise<R>): Promise<R>;
};

interface CapturedAssetRecord {
  url: string;
  pathname: string;
  buffer: Buffer;
  origin: string;
}

interface AssetRewriteData {
  assets: SnapshotAsset[];
  map: Map<string, string>;
}

function normalizeViewport(viewport?: SnapshotViewport): SnapshotViewport {
  if (viewport && viewport.width > 0 && viewport.height > 0) {
    return {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor
    };
  }
  return { ...DEFAULT_VIEWPORT };
}

function getPageOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

export async function capturePageSnapshot(url: string, options?: SnapshotOptions): Promise<PageSnapshot> {
  const mirrorAssets = Boolean(options?.mirrorAssets);
  const allowRemoteAssets = Boolean(options?.allowRemoteAssets);
  const viewport = normalizeViewport(options?.viewport);
  const baseOrigin = getPageOrigin(url);
  const browser = await chromium.launch({ headless: true });
  const assetTasks: Array<Promise<void>> = [];
  const capturedAssets: CapturedAssetRecord[] = [];

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport,
      deviceScaleFactor: options?.viewport?.deviceScaleFactor
    });
    const page = await context.newPage();

    if (mirrorAssets) {
      page.on('response', (response: Response) => {
        assetTasks.push(captureResponseAsset(response, url, baseOrigin, capturedAssets, allowRemoteAssets));
      });
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForTimeout(2000);

    if (options?.runInteractions) {
      await runDefaultInteractions(page);
    }
    const runtimeMetadata = await collectRuntimeMetadata(page);
    const html = await page.content();
    await Promise.all(assetTasks);

    const $ = load(html);

    absolutizeDocument($, url);
    const assetRewrite = mirrorAssets ? buildAssetRewrite(capturedAssets, baseOrigin) : null;
    if (assetRewrite) {
      await ensureInlineAssets(html, url, assetRewrite, allowRemoteAssets, baseOrigin);
      await ensurePortfolioAssets(html, url, assetRewrite, allowRemoteAssets, baseOrigin);
      await ensureDocumentAssets($, url, assetRewrite, allowRemoteAssets, baseOrigin);
      rewriteDocumentAssets($, url, assetRewrite.map);
    }

    rewriteBaseHref($, mirrorAssets ? './' : deriveOriginBase(url));
    if (!options?.keepScripts) {
      stripExecutableContent($);
    }

    const maxSheets = options?.maxStylesheets ?? DEFAULT_MAX_STYLESHEETS;
    const stylesheetHrefs = collectStylesheetHrefs($, url, maxSheets);
    const inlineCss: string[] = [];
    $('style').each((_, element) => {
      const text = $(element).text();
      if (text && text.trim().length > 0) {
        inlineCss.push(text);
      }
    });

    for (const href of stylesheetHrefs) {
      const cssResponse = await fetchWithHeaders(href, url);
      if (!cssResponse.ok) {
        continue;
      }
      const cssText = await cssResponse.text();
      if (cssText.trim().length > 0) {
        inlineCss.push(`/* source: ${href} */\n${cssText}`);
      }
    }

    let aggregatedCss = absolutizeCssUrls(inlineCss.join('\n\n'), url);
    if (assetRewrite) {
      await ensureCssAssets(aggregatedCss, url, assetRewrite, allowRemoteAssets, baseOrigin);
      aggregatedCss = rewriteCssAssetUrls(aggregatedCss, url, assetRewrite.map);
    }
    if (aggregatedCss.trim().length > 0) {
      $('head').append(`\n<style data-inline-source="hi-fi-toolkit">\n${aggregatedCss}\n</style>`);
    }

    const colorPalette = computeColorPalette(aggregatedCss).slice(0, 24);
    const fontFamilies = computeFontFamilies(aggregatedCss).slice(0, 8);
    const sections = summarizeSections($);
    const inlineHtml = buildDocumentHtml($);

    return {
      originalHtml: html,
      inlineHtml,
      aggregatedCss,
      colorPalette,
      fontFamilies,
      runtimeCanvasColors: runtimeMetadata.runtimeCanvasColors,
      resolvedFonts: runtimeMetadata.resolvedFonts,
      sections,
      assets: assetRewrite?.assets ?? []
    };
  } catch (error) {
    throw new Error(`Failed to render ${url} via Playwright: ${(error as Error).message}`);
  } finally {
    await browser.close();
  }
}

export async function runDefaultInteractions(page: InteractionPage): Promise<void> {
  try {
    const safeWait = (ms: number) => page.waitForTimeout(ms);
    await page.mouse.wheel(0, 1400);
    await safeWait(600);
    await page.mouse.wheel(0, 1400);
    await safeWait(600);
    await page.mouse.wheel(0, -600);
    await safeWait(400);

    const sliderSelectors = ['[data-slider="next"]', '.swiper-button-next', '.w-slider-arrow-right', '[data-scroll="next"]'];
    for (const selector of sliderSelectors) {
      const handle = await page.$(selector);
      if (handle) {
        await handle.click().catch(() => {});
        await safeWait(350);
      }
    }

    const hoverSelectors = ['[data-lottie]', 'video[autoplay]'];
    for (const selector of hoverSelectors) {
      const element = await page.$(selector);
      if (element) {
        await element.hover().catch(() => {});
        await safeWait(200);
      }
    }

    await safeWait(600);

    await page
      .evaluate(() => {
        const preload = new Set<string>();
        const normalizePath = (value: string) => {
          if (!value) {
            return null;
          }
          const trimmed = value.trim();
          if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
          }
          if (trimmed.startsWith('/')) {
            return trimmed;
          }
          if (trimmed.startsWith('assets/')) {
            return `/${trimmed}`;
          }
          return `/assets/portfolio/${trimmed}`;
        };
        document.querySelectorAll('[data-src]').forEach((element) => {
          const attr = element.getAttribute('data-src');
          const resolved = normalizePath(attr ?? '');
          if (!resolved || preload.has(resolved)) {
            return;
          }
          preload.add(resolved);
          const img = new Image();
          img.decoding = 'async';
          img.src = resolved;
        });
      })
      .catch(() => {});
  } catch (error) {
    console.warn('[snapshot] interaction macro failed', error);
  }
}

async function captureResponseAsset(
  response: Response,
  baseUrl: string,
  baseOrigin: string,
  bucket: CapturedAssetRecord[],
  allowRemoteAssets: boolean
): Promise<void> {
  try {
    if (!response.ok()) {
      return;
    }
    const request = response.request();
    if (!MIRRORABLE_RESOURCE_TYPES.has(request.resourceType())) {
      return;
    }
    const absoluteUrl = response.url();
    if (!allowRemoteAssets && !isSameOrigin(absoluteUrl, baseUrl)) {
      return;
    }
    const parsed = new URL(absoluteUrl);
    const buffer = Buffer.from(await response.body());
    const pathname = parsed.pathname;
    bucket.push({ url: normalizeAssetUrl(absoluteUrl), pathname, buffer, origin: parsed.origin });
  } catch (error) {
    console.warn('[snapshot] Failed to capture asset', response.url(), 'due to', error);
  }
}

function buildAssetRewrite(records: CapturedAssetRecord[], baseOrigin: string): AssetRewriteData {
  const map = new Map<string, string>();
  const assets: SnapshotAsset[] = [];
  for (const record of records) {
    const relativePath = buildRelativeAssetPath(record.url, record.origin ?? baseOrigin, baseOrigin);
    if (map.has(record.url)) {
      continue;
    }
    map.set(record.url, relativePath);
    assets.push({ sourceUrl: record.url, relativePath, buffer: record.buffer });
  }
  return { assets, map };
}

function absolutizeDocument($: CheerioAPI, baseUrl: string): void {
  const selectors: Array<{ selector: string; attribute: string; kind?: 'srcset' }> = [
    { selector: 'img', attribute: 'src' },
    { selector: 'img', attribute: 'srcset', kind: 'srcset' },
    { selector: 'source', attribute: 'src' },
    { selector: 'source', attribute: 'srcset', kind: 'srcset' },
    { selector: 'video', attribute: 'poster' },
    { selector: 'video', attribute: 'src' },
    { selector: 'a', attribute: 'href' },
    { selector: 'link', attribute: 'href' },
    { selector: 'use', attribute: 'xlink:href' },
    { selector: 'img', attribute: 'data-src' }
  ];

  for (const item of selectors) {
    $(item.selector).each((_, element) => {
      const attr = $(element).attr(item.attribute);
      if (!attr) {
        return;
      }
      if (item.kind === 'srcset') {
        $(element).attr(item.attribute, absolutizeSrcset(attr, baseUrl));
      } else {
        $(element).attr(item.attribute, absolutizeUrl(attr, baseUrl));
      }
    });
  }

  if ($('head base').length === 0) {
    $('head').prepend(`<base href="${baseUrl}">`);
  }
}

function rewriteBaseHref($: CheerioAPI, baseHref: string): void {
  $('head base').remove();
  $('head').prepend(`<base href="${baseHref}">`);
}

function stripExecutableContent($: CheerioAPI): void {
  $('script').remove();
  $('noscript').remove();
}

function collectStylesheetHrefs($: CheerioAPI, baseUrl: string, max: number): string[] {
  const hrefs: string[] = [];
  $('link[rel="stylesheet"]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) {
      return;
    }
    if (hrefs.length >= max) {
      return false;
    }
    hrefs.push(absolutizeUrl(href, baseUrl));
    return undefined;
  });
  return hrefs;
}

function buildDocumentHtml($: CheerioAPI): string {
  const doc = $.root().html();
  if (doc && doc.toLowerCase().startsWith('<!doctype')) {
    return doc;
  }
  return `<!doctype html>\n${doc ?? ''}`;
}

function rewriteDocumentAssets($: CheerioAPI, baseUrl: string, assetMap: Map<string, string>): void {
  const attributes: Array<{ selector: string; attribute: string }> = [
    { selector: 'img', attribute: 'src' },
    { selector: 'script', attribute: 'src' },
    { selector: 'link', attribute: 'href' },
    { selector: 'video', attribute: 'poster' },
    { selector: 'video source', attribute: 'src' },
    { selector: 'source', attribute: 'src' },
    { selector: 'use', attribute: 'xlink:href' }
  ];

  for (const item of attributes) {
    $(item.selector).each((_, element) => {
      const value = $(element).attr(item.attribute);
      if (!value) {
        return;
      }
      const absolute = absolutizeUrl(value, baseUrl);
      const replacement = assetMap.get(normalizeAssetUrl(absolute));
      if (replacement) {
        $(element).attr(item.attribute, replacement.startsWith('.') ? replacement : `./${replacement}`);
      }
    });
  }
}

async function ensureDocumentAssets(
  $: CheerioAPI,
  baseUrl: string,
  assetRewrite: AssetRewriteData,
  allowRemoteAssets: boolean,
  baseOrigin: string
): Promise<void> {
  const selectors: Array<{ selector: string; attribute: string }> = [
    { selector: 'img', attribute: 'src' },
    { selector: 'script', attribute: 'src' },
    { selector: 'link', attribute: 'href' },
    { selector: 'video', attribute: 'poster' },
    { selector: 'video source', attribute: 'src' },
    { selector: 'source', attribute: 'src' },
    { selector: 'use', attribute: 'xlink:href' }
  ];

  for (const item of selectors) {
    const nodes = $(item.selector);
    for (let index = 0; index < nodes.length; index += 1) {
      const element = nodes[index];
      const value = $(element).attr(item.attribute);
      if (!value) {
        continue;
      }
      const absolute = absolutizeUrl(value, baseUrl);
      await fetchMissingAsset(absolute, baseUrl, assetRewrite, allowRemoteAssets, baseOrigin);
    }
  }
}

function rewriteCssAssetUrls(css: string, baseUrl: string, assetMap: Map<string, string>): string {
  if (!css) {
    return css;
  }
  return css.replace(/url\(([^)]+)\)/gi, (match, rawValue) => {
    const trimmed = rawValue?.trim();
    if (!trimmed) {
      return match;
    }
    const unquoted = trimmed.replace(/^['"]|['"]$/g, '');
    if (/^(data:|mailto:|#)/i.test(unquoted)) {
      return match;
    }
    const absolute = absolutizeUrl(unquoted, baseUrl);
    const replacement = assetMap.get(normalizeAssetUrl(absolute));
    if (!replacement) {
      return match;
    }
    return `url(${replacement.startsWith('.') ? replacement : `./${replacement}`})`;
  });
}

async function ensureInlineAssets(
  html: string,
  baseUrl: string,
  assetRewrite: AssetRewriteData,
  allowRemoteAssets: boolean,
  baseOrigin: string
): Promise<void> {
  if (!html) {
    return;
  }
  const inlineRegex = /["'`](\.{0,2}\/?assets\/[^"'`]+)["'`]/gi;
  const pending = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = inlineRegex.exec(html)) !== null) {
    const rawPath = match[1];
    if (!rawPath) {
      continue;
    }
    pending.add(rawPath);
  }
  for (const referencePath of pending) {
    const absolute = absolutizeUrl(referencePath, baseUrl);
    await fetchMissingAsset(absolute, baseUrl, assetRewrite, allowRemoteAssets, baseOrigin);
  }
}

async function ensurePortfolioAssets(
  html: string,
  baseUrl: string,
  assetRewrite: AssetRewriteData,
  allowRemoteAssets: boolean,
  baseOrigin: string
): Promise<void> {
  if (!html) {
    return;
  }
  const regex = /project_[^"'`\\\s]+?\.jpg/gi;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const filename = match[0];
    if (filename) {
      matches.add(filename);
    }
  }
  for (const filename of matches) {
    const absolute = new URL(`/assets/portfolio/${filename}`, baseUrl).toString();
    await fetchMissingAsset(absolute, baseUrl, assetRewrite, allowRemoteAssets, baseOrigin);
  }
}

async function ensureCssAssets(
  css: string,
  baseUrl: string,
  assetRewrite: AssetRewriteData,
  allowRemoteAssets: boolean,
  baseOrigin: string
): Promise<void> {
  if (!css) {
    return;
  }
  const urlRegex = /url\(([^)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(css)) !== null) {
    const rawValue = match[1];
    if (!rawValue) {
      continue;
    }
    const trimmed = rawValue.trim();
    const unquoted = trimmed.replace(/^['"]|['"]$/g, '');
    if (/^(data:|mailto:|#)/i.test(unquoted)) {
      continue;
    }
    const absolute = absolutizeUrl(unquoted, baseUrl);
    await fetchMissingAsset(absolute, baseUrl, assetRewrite, allowRemoteAssets, baseOrigin);
  }
}

function absolutizeUrl(value: string, baseUrl: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return trimmed;
  }
}

function absolutizeSrcset(value: string, baseUrl: string): string {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [url, descriptor] = entry.split(/\s+/, 2);
      const absolute = absolutizeUrl(url, baseUrl);
      return descriptor ? `${absolute} ${descriptor}` : absolute;
    })
    .join(', ');
}

function absolutizeCssUrls(css: string, baseUrl: string): string {
  if (!css) {
    return css;
  }
  return css.replace(/url\(([^)]+)\)/gi, (fullMatch, rawValue) => {
    const trimmed = rawValue.trim();
    const unquoted = trimmed.replace(/^['"]|['"]$/g, '');
    if (/^(data:|https?:|mailto:|#)/i.test(unquoted)) {
      return `url(${trimmed})`;
    }
    let absolute = unquoted;
    try {
      absolute = new URL(unquoted, baseUrl).toString();
    } catch (error) {
      console.warn('[snapshot] Failed to absolutize CSS url', unquoted, 'due to', error);
    }
    const quote = trimmed.startsWith('"') ? '"' : trimmed.startsWith('\'') ? '\'' : '';
    return `url(${quote}${absolute}${quote})`;
  });
}

export function computeColorPalette(css: string): string[] {
  const palette = new Set<string>();
  const hexRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  let match: RegExpExecArray | null;
  while ((match = hexRegex.exec(css)) !== null) {
    palette.add(normalizeHex(match[0]));
  }

  const rgbRegex = /rgb(a)?\(([^)]+)\)/g;
  while ((match = rgbRegex.exec(css)) !== null) {
    const hex = rgbToHex(match[0]);
    if (hex) {
      palette.add(hex);
    }
  }

  return Array.from(palette);
}

function normalizeHex(value: string): string {
  let hex = value.toLowerCase();
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function rgbToHex(value: string): string | null {
  const parts = value
    .replace(/rgba?\(/, '')
    .replace(')', '')
    .split(',')
    .map((part) => part.trim())
    .slice(0, 3);
  if (parts.length !== 3) {
    return null;
  }
  const channel = parts.map((part) => {
    const numeric = Number.parseInt(part, 10);
    if (Number.isNaN(numeric)) {
      return null;
    }
    return Math.max(0, Math.min(255, numeric));
  });
  if (channel.some((value) => value === null)) {
    return null;
  }
  const [r, g, b] = channel as number[];
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function computeFontFamilies(css: string): string[] {
  const regex = /font-family\s*:\s*([^;{}]+)/gi;
  const families = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(css)) !== null) {
    const value = match[1];
    value
      .split(',')
      .map((segment) => segment.trim().replace(/^['"]|['"]$/g, ''))
      .filter((segment) => segment.length > 0)
      .forEach((segment) => families.add(segment));
  }
  return Array.from(families);
}

function summarizeSections($: CheerioAPI): PageSectionSummary[] {
  const summaries: PageSectionSummary[] = [];
  const candidates = collectSectionCandidates($);

  candidates.forEach((element, index) => {
    const headingElement = $(element).find('h1, h2, h3').first().get(0) as Element | undefined;
    const heading = headingElement ? extractSectionText($, headingElement) : '';
    const text = extractSectionText($, element);
    if (text.length === 0) {
      return;
    }
    summaries.push({
      title: heading || `Section ${index + 1}`,
      description: text.slice(0, 280)
    });
  });

  if (summaries.length === 0) {
    const fallback = extractSectionText($, $('body').get(0) as Element).slice(0, 280);
    if (fallback.length > 0) {
      summaries.push({ title: 'Page overview', description: fallback });
    }
  }

  return summaries.slice(0, 8);
}

function collectSectionCandidates($: CheerioAPI): Element[] {
  const selectors = [
    'section',
    '[data-section]',
    '[data-load-stage]',
    '[data-load-section]',
    '[data-scroll]',
    '[data-anchor]',
    '.section',
    '[class*="section"]',
    '.w-layout-blockcontainer',
    'main > div'
  ];
  const seen = new Set<Element>();
  const result: Element[] = [];

  const addElement = (element: Element): void => {
    if (seen.has(element)) {
      return;
    }
    seen.add(element);
    result.push(element);
  };

  for (const selector of selectors) {
    $(selector).each((_, element) => addElement(element as Element));
    if (result.length >= 12) {
      break;
    }
  }

  if (result.length === 0) {
    $('body')
      .children()
      .each((_, element) => addElement(element as Element));
  }

  return result;
}

function extractSectionText($: CheerioAPI, element?: Element | null): string {
  if (!element) {
    return '';
  }
  const html = $(element).html();
  if (!html) {
    return normalizeSentenceSpacing(
      $(element)
        .text()
        .replace(/\u00a0/g, ' ')
    )
      .replace(/\s+/g, ' ')
      .trim();
  }
  const spaced = html.replace(/></g, '> <');
  const wrapped = load(`<root>${spaced}</root>`);
  const rawText = wrapped('root')
    .text()
    .replace(/\u00a0/g, ' ');
  return normalizeSentenceSpacing(rawText)
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSentenceSpacing(value: string): string {
  if (!value) {
    return '';
  }
  return value.replace(/([.?!%])(?!\s)(?=[A-Za-z0-9])/g, '$1 ');
}

function isSameOrigin(candidate: string, baseUrl: string): boolean {
  try {
    const candidateOrigin = new URL(candidate).origin;
    const baseOrigin = new URL(baseUrl).origin;
    return candidateOrigin === baseOrigin;
  } catch {
    return false;
  }
}

function normalizeAssetUrl(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return value;
  }
}

function sanitizeAssetPath(pathname: string): string {
  const segments = pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
  if (segments.length === 0) {
    return 'index.html';
  }
  return segments.join('/');
}

function buildRelativeAssetPath(resourceUrl: string, assetOrigin: string, baseOrigin: string): string {
  let parsed: URL | null = null;
  try {
    parsed = new URL(resourceUrl);
  } catch {
    parsed = null;
  }
  const safePath = sanitizeAssetPath(parsed?.pathname ?? resourceUrl);
  const sameOrigin = assetOrigin === baseOrigin || (!assetOrigin && parsed && parsed.origin === baseOrigin);
  const prefix = sameOrigin ? '' : `remote/${sanitizeHost(parsed?.host ?? assetOrigin)}`;
  const qualifiedPath = prefix ? `${prefix}/${safePath}` : safePath;
  if (qualifiedPath.length === 0) {
    return 'index.html';
  }
  const lower = qualifiedPath.toLowerCase();
  if (lower.startsWith('assets/')) {
    return qualifiedPath;
  }
  if (lower.startsWith('video/')) {
    return qualifiedPath;
  }
  return `assets/${qualifiedPath}`;
}

function sanitizeHost(host: string): string {
  if (!host) {
    return 'external';
  }
  return host
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'external';
}

async function collectRuntimeMetadata(page: Page): Promise<{
  runtimeCanvasColors: string[];
  resolvedFonts: string[];
}> {
  try {
    const result = await page.evaluate(() => {
      const toHex = (value: number) => value.toString(16).padStart(2, '0');
      const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
      const normalizeColor = (r: number, g: number, b: number) => `#${toHex(clamp(r))}${toHex(clamp(g))}${toHex(clamp(b))}`;
      const canvasColors = new Set<string>();
      const resolvedFonts = new Set<string>();

      try {
        if (document.fonts && typeof document.fonts.forEach === 'function') {
          document.fonts.forEach((font) => {
            if (font && typeof font.family === 'string') {
              const cleaned = font.family.trim().replace(/^['"]|['"]$/g, '');
              if (cleaned) {
                resolvedFonts.add(cleaned);
              }
            }
          });
        }
      } catch {
        // Ignore document.fonts access errors.
      }

      const canvases = Array.from(document.querySelectorAll('canvas'));
      for (const canvas of canvases) {
        let ctx: any = null;
        try {
          ctx = typeof (canvas as any).getContext === 'function' ? (canvas as any).getContext('2d') : null;
        } catch {
          ctx = null;
        }
        if (!ctx) {
          continue;
        }
        const width = (canvas as any).width || (canvas as any).clientWidth || 0;
        const height = (canvas as any).height || (canvas as any).clientHeight || 0;
        if (width === 0 || height === 0) {
          continue;
        }
        const samples: Array<[number, number]> = [
          [0, 0],
          [Math.floor(width / 2), Math.floor(height / 2)],
          [Math.max(0, width - 1), Math.max(0, height - 1)]
        ];
        for (const [x, y] of samples) {
          try {
            const data = ctx.getImageData(x, y, 1, 1).data;
            if (data && data[3] > 0) {
              canvasColors.add(normalizeColor(data[0], data[1], data[2]));
            }
          } catch {
            break;
          }
        }
      }

      return {
        runtimeCanvasColors: Array.from(canvasColors),
        resolvedFonts: Array.from(resolvedFonts)
      };
    });

    return {
      runtimeCanvasColors: result.runtimeCanvasColors.slice(0, 12),
      resolvedFonts: result.resolvedFonts.slice(0, 24)
    };
  } catch (error) {
    console.warn('[snapshot] Failed to collect runtime metadata', error);
    return { runtimeCanvasColors: [], resolvedFonts: [] };
  }
}

function deriveOriginBase(pageUrl: string): string {
  const origin = new URL(pageUrl).origin.replace(/\/$/, '');
  return `${origin}/`;
}

async function fetchWithHeaders(url: string, referer?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'user-agent': USER_AGENT,
    'accept-language': 'en-US,en;q=0.9',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };
  if (referer) {
    headers.referer = referer;
  }
  return fetch(url, { headers });
}

async function fetchMissingAsset(
  absoluteUrl: string,
  referer: string,
  assetRewrite: AssetRewriteData,
  allowRemoteAssets: boolean,
  baseOrigin: string
): Promise<void> {
  if (!allowRemoteAssets && !isSameOrigin(absoluteUrl, referer)) {
    return;
  }
  const normalized = normalizeAssetUrl(absoluteUrl);
  if (assetRewrite.map.has(normalized)) {
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(absoluteUrl);
  } catch {
    return;
  }
  if (parsed.protocol === 'file:') {
    return;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return;
  }
  try {
    const response = await fetchWithHeaders(parsed.toString(), referer);
    if (!response.ok) {
      return;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pathname = parsed.pathname;
    const filename = pathname.split('/').pop() ?? '';
    if (!filename.includes('.')) {
      return;
    }
    const relativePath = buildRelativeAssetPath(parsed.toString(), parsed.origin, baseOrigin);
    assetRewrite.map.set(normalized, relativePath);
    assetRewrite.assets.push({
      sourceUrl: normalized,
      relativePath,
      buffer
    });
  } catch (error) {
    console.warn('[snapshot] Failed to fetch referenced asset', absoluteUrl, 'due to', error);
  }
}
