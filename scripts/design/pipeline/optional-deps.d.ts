export function createOptionalDependencyLoader(options: {
  label: string;
  hint: string;
}): {
  loadPlaywright(): Promise<typeof import('playwright')>;
  loadPngjs(): Promise<typeof import('pngjs')>;
  loadPixelmatch(): Promise<typeof import('pixelmatch')>;
  loadCheerio(): Promise<typeof import('cheerio')>;
};

export function loadPlaywright(): Promise<typeof import('playwright')>;
export function loadPngjs(): Promise<typeof import('pngjs')>;
export function loadPixelmatch(): Promise<typeof import('pixelmatch')>;
export function loadCheerio(): Promise<typeof import('cheerio')>;
