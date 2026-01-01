import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DESIGN_SETUP_HINT =
  'Run "npm run setup:design-tools" and "npx playwright install" to enable design tooling.';

function isModuleNotFound(error) {
  if (!error) {
    return false;
  }
  const message = error.message ?? '';
  return (
    error.code === 'ERR_MODULE_NOT_FOUND' ||
    error.code === 'MODULE_NOT_FOUND' ||
    message.includes('Cannot find package') ||
    message.includes('Cannot find module')
  );
}

function missingDependency(specifier, label, hint) {
  return new Error(`[${label}] Missing optional dependency "${specifier}". ${hint}`);
}

function resolveWithRequire(specifier, base) {
  try {
    const resolver = createRequire(base);
    return resolver.resolve(specifier);
  } catch {
    return null;
  }
}

function resolveWithImportMeta(specifier, parentUrl) {
  const resolver = import.meta.resolve;
  if (typeof resolver !== 'function') {
    return null;
  }
  try {
    return resolver(specifier, parentUrl);
  } catch {
    return null;
  }
}

function resolveOptionalDependency(specifier, cwd = process.cwd()) {
  const cwdPackage = join(cwd, 'package.json');
  if (existsSync(cwdPackage)) {
    const cwdRequireResolved = resolveWithRequire(specifier, cwdPackage);
    if (cwdRequireResolved) {
      return cwdRequireResolved;
    }
    const cwdImportResolved = resolveWithImportMeta(specifier, pathToFileURL(cwdPackage).href);
    if (cwdImportResolved) {
      return cwdImportResolved;
    }
  }
  const selfRequireResolved = resolveWithRequire(specifier, import.meta.url);
  if (selfRequireResolved) {
    return selfRequireResolved;
  }
  return resolveWithImportMeta(specifier, import.meta.url);
}

function toModuleUrl(resolved) {
  if (resolved.startsWith('file://') || resolved.startsWith('node:')) {
    return resolved;
  }
  return pathToFileURL(resolved).href;
}

async function loadOptionalDependency(specifier, label, hint) {
  const resolved = resolveOptionalDependency(specifier);
  if (!resolved) {
    throw missingDependency(specifier, label, hint);
  }
  try {
    return await import(toModuleUrl(resolved));
  } catch (error) {
    if (isModuleNotFound(error)) {
      throw missingDependency(specifier, label, hint);
    }
    throw error;
  }
}

export function createOptionalDependencyLoader({ label, hint }) {
  let playwrightPromise = null;
  let pngPromise = null;
  let pixelmatchPromise = null;
  let cheerioPromise = null;

  return {
    async loadPlaywright() {
      if (!playwrightPromise) {
        playwrightPromise = loadOptionalDependency('playwright', label, hint);
      }
      return playwrightPromise;
    },
    async loadPngjs() {
      if (!pngPromise) {
        pngPromise = loadOptionalDependency('pngjs', label, hint);
      }
      return pngPromise;
    },
    async loadPixelmatch() {
      if (!pixelmatchPromise) {
        pixelmatchPromise = loadOptionalDependency('pixelmatch', label, hint);
      }
      return pixelmatchPromise;
    },
    async loadCheerio() {
      if (!cheerioPromise) {
        cheerioPromise = loadOptionalDependency('cheerio', label, hint);
      }
      return cheerioPromise;
    }
  };
}

const designLoader = createOptionalDependencyLoader({
  label: 'design-tools',
  hint: DESIGN_SETUP_HINT
});

export const loadPlaywright = designLoader.loadPlaywright;
export const loadPngjs = designLoader.loadPngjs;
export const loadPixelmatch = designLoader.loadPixelmatch;
export const loadCheerio = designLoader.loadCheerio;
