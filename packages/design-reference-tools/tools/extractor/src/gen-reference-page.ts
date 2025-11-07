// @ts-nocheck
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { logStep } from './util.js';

const program = new Command();
program
  .requiredOption('--snapshot <string>', 'Path to computed.json')
  .requiredOption('--css <string>', 'Path to raw.css')
  .option('--out <string>', 'Output folder', '.out/reference')
  .parse(process.argv);

const { snapshot, css, out } = program.opts<{snapshot: string, css: string, out: string}>();

function styleBlockFromSnapshot(snap: Record<string, Record<string,string>[]>) {
  // Pick first sample for each selector and build specific component demo styles inline.
  const blocks: string[] = [];
  for (const [sel, arr] of Object.entries(snap)) {
    if (!arr.length) continue;
    const st = arr[0];
    const css = Object.entries(st)
      .filter(([k])=>!k.startsWith('__'))
      .map(([k,v]) => `${k}:${v};`)
      .join('\n  ');
    blocks.push(`${sel}.demo {\n  ${css}\n}`);
  }
  return blocks.join('\n\n');
}

(async () => {
  logStep('Building reference page');
  const snap = await fs.readJSON(snapshot);
  const rawCss = await fs.readFile(css, 'utf8');
  const inline = styleBlockFromSnapshot(snap);

  const html = `
<!doctype html>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Reference Implementation</title>
<style>
/* Extracted raw CSS (may include unused rules) */
${rawCss}

/* Inline computed overrides for canonical demo elements */
${inline}

:root {
  --guide-grid: rgba(0,0,255,0.06);
}
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; background-image: linear-gradient(90deg, var(--guide-grid) 1px, transparent 1px), linear-gradient(180deg, var(--guide-grid) 1px, transparent 1px); background-size: 24px 24px; }
.section { padding: 2rem 0; border-bottom: 1px dashed rgba(0,0,0,0.1); }
.card { border: 1px solid rgba(0,0,0,0.08); padding: 1rem; border-radius: .75rem; }
.row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
.demo { display: inline-block; }
</style>

<div class="container">
  <header class="section">
    <nav class="demo row">
      <a class="demo" href="#">Link A</a>
      <a class="demo" href="#">Link B</a>
      <a class="demo" href="#">Link C</a>
      <button class="demo">Primary Action</button>
    </nav>
  </header>

  <section class="section">
    <h1 class="demo">Display Heading</h1>
    <p class="demo">Body text paragraph with <a class="demo" href="#">inline link</a> and typographic defaults tested.</p>
    <div class="row">
      <button class="demo">Button</button>
      <input class="demo" placeholder="Input field"/>
      <textarea class="demo" rows="3" placeholder="Textarea"></textarea>
    </div>
  </section>

  <section class="section">
    <div class="card">
      <h3 class="demo">Card Title</h3>
      <p class="demo">Card content block. Shadows, radii, spacing and border tokens should be visible here.</p>
      <button class="demo">Card Button</button>
    </div>
  </section>

  <footer class="section">
    <small class="demo">Footer small text.</small>
  </footer>
</div>
`;

  const outDir = path.resolve(process.cwd(), out);
  await fs.mkdirp(outDir);
  await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
  console.log('\n✅ Built reference/index.html');
})();
