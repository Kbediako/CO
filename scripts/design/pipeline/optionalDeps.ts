import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DESIGN_SETUP_HINT =
  'Run "npm run setup:design-tools" and "npx playwright install" to enable design tooling.';

type MissingModuleError = NodeJS.ErrnoException & {
  code?: string;
};

export type PlaywrightModule = typeof import('playwright');
export type PngjsModule = typeof import('pngjs');
export type PixelmatchModule = typeof import('pixelmatch');
export type CheerioModule = typeof import('cheerio');

function isModuleNotFound(error: unknown): boolean {
  const candidate = error as MissingModuleError;
  if (!candidate) {
    return false;
  }
  const message = candidate.message ?? '';
  return (
    candidate.code === 'ERR_MODULE_NOT_FOUND' ||
    candidate.code === 'MODULE_NOT_FOUND' ||
    message.includes('Cannot find package') ||
    message.includes('Cannot find module')
  );
}

function missingDependency(specifier: string): Error {
  return new Error(`[design-tools] Missing optional dependency "${specifier}". ${DESIGN_SETUP_HINT}`);
}

function resolveOptionalDependency(specifier: string, cwd: string = process.cwd()): string | null {
  const cwdPackage = join(cwd, 'package.json');
  if (existsSync(cwdPackage)) {
    try {
      const cwdRequire = createRequire(cwdPackage);
      return cwdRequire.resolve(specifier);
    } catch {
      // fall through
    }
  }
  try {
    const selfRequire = createRequire(import.meta.url);
    return selfRequire.resolve(specifier);
  } catch {
    return null;
  }
}

async function loadOptionalDependency<T>(specifier: string): Promise<T> {
  const resolved = resolveOptionalDependency(specifier);
  if (!resolved) {
    throw missingDependency(specifier);
  }
  try {
    return (await import(pathToFileURL(resolved).href)) as T;
  } catch (error) {
    if (isModuleNotFound(error)) {
      throw missingDependency(specifier);
    }
    throw error;
  }
}

let playwrightPromise: Promise<typeof import('playwright')> | null = null;
let pngPromise: Promise<typeof import('pngjs')> | null = null;
let pixelmatchPromise: Promise<typeof import('pixelmatch')> | null = null;
let cheerioPromise: Promise<typeof import('cheerio')> | null = null;

export async function loadPlaywright(): Promise<typeof import('playwright')> {
  if (!playwrightPromise) {
    playwrightPromise = loadOptionalDependency<typeof import('playwright')>('playwright');
  }
  return playwrightPromise;
}

export async function loadPngjs(): Promise<typeof import('pngjs')> {
  if (!pngPromise) {
    pngPromise = loadOptionalDependency<typeof import('pngjs')>('pngjs');
  }
  return pngPromise;
}

export async function loadPixelmatch(): Promise<typeof import('pixelmatch')> {
  if (!pixelmatchPromise) {
    pixelmatchPromise = loadOptionalDependency<typeof import('pixelmatch')>('pixelmatch');
  }
  return pixelmatchPromise;
}

export async function loadCheerio(): Promise<typeof import('cheerio')> {
  if (!cheerioPromise) {
    cheerioPromise = loadOptionalDependency<typeof import('cheerio')>('cheerio');
  }
  return cheerioPromise;
}
