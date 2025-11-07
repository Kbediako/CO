// @ts-nocheck
import { chromium, Response } from 'playwright';
import { Command } from 'commander';
import path from 'path';
import { ensureDir, logStep, sanitizeFilename, saveText, saveBuffer } from './util.js';
import fs from 'fs-extra';

const program = new Command();
program
  .requiredOption('--url <string>', 'Reference URL to extract CSS from')
  .option('--out <string>', 'Output folder', '.out/extract')
  .parse(process.argv);

const { url, out } = program.opts<{url: string, out: string}>();

const OUT = path.resolve(process.cwd(), out);
const CSS_DIR = path.join(OUT, 'stylesheets');
const FONT_DIR = path.join(OUT, 'fonts');

const CSS_TEXTS: string[] = [];
const CSS_FILES: string[] = [];

function isCssResponse(resp: Response) {
  const ct = resp.headers()['content-type'] || '';
  const url = resp.url();
  return ct.includes('text/css') || url.endsWith('.css');
}

function isFontResponse(resp: Response) {
  const ct = resp.headers()['content-type'] || '';
  const url = resp.url();
  return ct.includes('font') || /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url);
}

(async () => {
  await ensureDir(OUT);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ bypassCSP: true });
  const page = await ctx.newPage();

  logStep(`Visiting ${url}`);

  page.on('response', async (resp) => {
    try {
      if (isCssResponse(resp)) {
        const text = await resp.text();
        CSS_TEXTS.push(text);
        const fname = sanitizeFilename(new URL(resp.url()).pathname.split('/').pop() || 'style.css');
        const fpath = path.join(CSS_DIR, fname);
        await saveText(fpath, text);
        CSS_FILES.push(fpath);
      } else if (isFontResponse(resp)) {
        const buf = await resp.body();
        const fname = sanitizeFilename(new URL(resp.url()).pathname.split('/').pop() || 'font.woff2');
        const fpath = path.join(FONT_DIR, fname);
        await saveBuffer(fpath, buf);
      }
    } catch (e) {
      // non-fatal: cross-origin / CORS / cache misses
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // Inline <style> tags
  const inlineStyles: string[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('style')).map(s => s.textContent || '');
  });
  inlineStyles.forEach(s => CSS_TEXTS.push(s));

  // Snapshot computed styles for a canonical probe set
  const probeSelectors = ['h1','h2','h3','p','small','a','button','input','textarea','label','nav','header','footer'];
  const computed = await page.evaluate((selectors) => {
    const props = [
      'color','background-color','font-family','font-size','font-weight','line-height','letter-spacing','text-transform',
      'border-radius','border-width','border-style','border-color','padding','margin','box-shadow','text-shadow',
      'transition-duration','transition-timing-function','transition-property'
    ];
    const result: Record<string, Record<string,string>[]> = {};
    for (const sel of selectors) {
      const nodes = Array.from(document.querySelectorAll(sel)).slice(0, 6); // sample few
      result[sel] = nodes.map((el) => {
        const cs = window.getComputedStyle(el as Element);
        const o: Record<string,string> = {};
        for (const p of props) o[p] = cs.getPropertyValue(p);
        o['__textSample'] = (el.textContent || '').trim().slice(0, 100);
        return o;
      });
    }
    return result;
  }, probeSelectors);

  await saveText(path.join(OUT, 'computed.json'), JSON.stringify(computed, null, 2));

  const rawCss = CSS_TEXTS.join('\n\n/* --- next stylesheet --- */\n\n');
  await saveText(path.join(OUT, 'raw.css'), rawCss);

  // Save a basic HTML snapshot for side-by-side reference
  const html = await page.content();
  await saveText(path.join(OUT, 'page.html'), html);

  console.log('\n✅ Extracted:');
  console.log(' - raw.css');
  console.log(' - computed.json');
  console.log(' - page.html');
  console.log(' - stylesheets/* + fonts/* (if any)');

  await browser.close();
})();
