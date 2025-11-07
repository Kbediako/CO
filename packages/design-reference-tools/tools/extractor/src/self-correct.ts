// @ts-nocheck
import { chromium } from 'playwright';
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { logStep } from './util.js';

const program = new Command();
program
  .requiredOption('--reference-url <string>', 'Reference URL to screenshot')
  .requiredOption('--candidate <string>', 'Candidate URL to screenshot (can be file: path to reference/index.html)')
  .requiredOption('--work <string>', 'Working folder (.out/... )')
  .option('--threshold <number>', 'Pixelmatch threshold 0..1 (lower is stricter)', '0.1')
  .parse(process.argv);

const { referenceUrl, candidate, work, threshold } = program.opts<{referenceUrl: string, candidate: string, work: string, threshold: string}>();
const TH = parseFloat(threshold);

async function screenshot(url: string, file: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: file, fullPage: true });
  await browser.close();
}

(async () => {
  await fs.mkdirp(work);
  logStep('Capturing screenshots');
  const refPng = path.join(work, 'reference.png');
  const candPng = path.join(work, 'candidate.png');
  await screenshot(referenceUrl, refPng);
  await screenshot(candidate, candPng);

  logStep('Computing pixel diff');
  const ref = PNG.sync.read(await fs.readFile(refPng));
  const cand = PNG.sync.read(await fs.readFile(candPng));
  const { width, height } = ref;
  const diff = new PNG({ width, height });
  const mismatch = pixelmatch(ref.data, cand.data, diff.data, width, height, { threshold: TH });
  const diffPath = path.join(work, 'diff.png');
  await fs.writeFile(diffPath, PNG.sync.write(diff));

  console.log(`\nΔ mismatch: ${mismatch} pixels (threshold=${TH}).`);
  console.log(`Diff written to: ${diffPath}`);
  console.log('\nℹ️ Auto‑tuning tokens is implementation‑specific. Wire this step to your orchestrator to iterate until mismatch < target.');
})();
