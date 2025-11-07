import { Buffer } from 'node:buffer';
import { load, type CheerioAPI } from 'cheerio';
import { chromium, type Response } from 'playwright';

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
  sections: PageSectionSummary[];
  assets: SnapshotAsset[];
}

const DEFAULT_MAX_STYLESHEETS = 6;
const DEFAULT_VIEWPORT = { width: 1440, height: 900 } as const;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MIRRORABLE_RESOURCE_TYPES = new Set(['document', 'stylesheet', 'image', 'media', 'font', 'script', 'xhr']);

interface SnapshotOptions {
  maxStylesheets?: number;
  keepScripts?: boolean;
  mirrorAssets?: boolean;
}

interface CapturedAssetRecord {
  url: string;
  pathname: string;
  buffer: Buffer;
}

interface AssetRewriteData {
  assets: SnapshotAsset[];
  map: Map<string, string>;
}

export async function capturePageSnapshot(url: string, options?: SnapshotOptions): Promise<PageSnapshot> {
  const mirrorAssets = Boolean(options?.mirrorAssets);
  const browser = await chromium.launch({ headless: true });
  const assetTasks: Array<Promise<void>> = [];
  const capturedAssets: CapturedAssetRecord[] = [];

  try {
    const context = await browser.newContext({ userAgent: USER_AGENT, viewport: DEFAULT_VIEWPORT });
    const page = await context.newPage();

    if (mirrorAssets) {
      page.on('response', (response: Response) => {
        assetTasks.push(captureResponseAsset(response, url, capturedAssets));
      });
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForTimeout(2000);
    const html = await page.content();
    await Promise.all(assetTasks);

    const $ = load(html);

    absolutizeDocument($, url);
    const assetRewrite = mirrorAssets ? buildAssetRewrite(capturedAssets) : null;
    if (assetRewrite) {
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
      sections,
      assets: assetRewrite?.assets ?? []
    };
  } catch (error) {
    throw new Error(`Failed to render ${url} via Playwright: ${(error as Error).message}`);
  } finally {
    await browser.close();
  }
}

async function captureResponseAsset(
  response: Response,
  baseUrl: string,
  bucket: CapturedAssetRecord[]
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
    if (!isSameOrigin(absoluteUrl, baseUrl)) {
      return;
    }
    const buffer = Buffer.from(await response.body());
    const pathname = new URL(absoluteUrl).pathname;
    bucket.push({ url: normalizeAssetUrl(absoluteUrl), pathname, buffer });
  } catch (error) {
    console.warn('[snapshot] Failed to capture asset', response.url(), 'due to', error);
  }
}

function buildAssetRewrite(records: CapturedAssetRecord[]): AssetRewriteData {
  const map = new Map<string, string>();
  const assets: SnapshotAsset[] = [];
  for (const record of records) {
    const safePath = sanitizeAssetPath(record.pathname);
    const relativePath = `assets/${safePath}`;
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

function computeColorPalette(css: string): string[] {
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

function computeFontFamilies(css: string): string[] {
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
  $('section').each((index, element) => {
    const heading = $(element).find('h1, h2, h3').first().text().trim();
    const text = $(element)
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length === 0) {
      return;
    }
    summaries.push({
      title: heading || `Section ${index + 1}`,
      description: text.slice(0, 280)
    });
  });

  if (summaries.length === 0) {
    const fallback = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280);
    if (fallback.length > 0) {
      summaries.push({ title: 'Page overview', description: fallback });
    }
  }

  return summaries.slice(0, 8);
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
