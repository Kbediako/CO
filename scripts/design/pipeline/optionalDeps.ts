export type PlaywrightModule = typeof import('playwright');
export type PngjsModule = typeof import('pngjs');
export type PixelmatchModule = typeof import('pixelmatch');
export type CheerioModule = typeof import('cheerio');
export { loadCheerio, loadPixelmatch, loadPlaywright, loadPngjs } from './optional-deps.js';
