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

async function loadOptional(specifier) {
  try {
    return await import(specifier);
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
