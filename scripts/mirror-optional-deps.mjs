import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DESIGN_GUIDANCE =
  'Install optional design deps with "npm run setup:design-tools" and "npx playwright install" before running mirror commands.';

function isMissing(error) {
  if (!error) return false;
  const message = error.message || '';
  return (
    error.code === 'ERR_MODULE_NOT_FOUND' ||
    error.code === 'MODULE_NOT_FOUND' ||
    message.includes('Cannot find module') ||
    message.includes('Cannot find package')
  );
}

function resolveOptional(specifier, cwd = process.cwd()) {
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

async function loadOptional(specifier) {
  const resolved = resolveOptional(specifier);
  if (!resolved) {
    throw new Error(`[mirror] Missing optional dependency "${specifier}". ${DESIGN_GUIDANCE}`);
  }
  try {
    return await import(pathToFileURL(resolved).href);
  } catch (error) {
    if (isMissing(error)) {
      throw new Error(`[mirror] Missing optional dependency "${specifier}". ${DESIGN_GUIDANCE}`);
    }
    throw error;
  }
}

let cheerioPromise = null;
let playwrightPromise = null;

export async function loadCheerio() {
  if (!cheerioPromise) {
    cheerioPromise = loadOptional('cheerio');
  }
  return cheerioPromise;
}

export async function loadPlaywright() {
  if (!playwrightPromise) {
    playwrightPromise = loadOptional('playwright');
  }
  return playwrightPromise;
}
