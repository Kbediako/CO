// @ts-nocheck
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import * as csstree from 'csstree';
import tinycolor from 'tinycolor2';
import { logStep } from './util.js';

const program = new Command();
program
  .requiredOption('--in <string>', 'Path to raw.css')
  .option('--out <string>', 'Output folder', '.out/extract')
  .parse(process.argv);

const { in: cssPath, out } = program.opts<{in: string, out: string}>();

function extractColors(cssText: string) {
  const colors: Record<string, number> = {};
  const ast = csstree.parse(cssText, { parseValue: true, positions: false });
  csstree.walk(ast, {
    visit: 'Declaration',
    enter(node: any) {
      if (node.type !== 'Declaration') return;
      const prop = node.property.toLowerCase();
      if (!prop.includes('color') && prop !== 'fill' && prop !== 'stroke' && prop !== 'background') return;
      const value = csstree.generate(node.value);
      const matches = value.match(/#([0-9a-f]{3,8})\b|rgba?\([^\)]+\)|hsla?\([^\)]+\)/gi);
      if (!matches) return;
      for (const m of matches) {
        const hex = tinycolor(m).toHexString().toLowerCase();
        colors[hex] = (colors[hex] || 0) + 1;
      }
    }
  });
  // sort by frequency
  return Object.keys(colors).sort((a,b)=>colors[b]-colors[a]);
}

function extractSizes(cssText: string, keys: string[]) {
  const values: Record<string, number> = {};
  const ast = csstree.parse(cssText, { parseValue: true, positions: false });
  csstree.walk(ast, {
    visit: 'Declaration',
    enter(node: any) {
      if (node.type !== 'Declaration') return;
      const prop = node.property.toLowerCase();
      if (!keys.includes(prop)) return;
      const value = csstree.generate(node.value);
      const matches = value.match(/-?\d*\.?\d+(px|rem|em|%)?/g);
      if (!matches) return;
      for (const m of matches) values[m] = (values[m] || 0) + 1;
    }
  });
  return Object.keys(values).sort((a,b)=>values[b]-values[a]);
}

(async () => {
  const cssText = await fs.readFile(cssPath, 'utf8');
  logStep('Computing tokens from CSS');

  const topColors = extractColors(cssText).slice(0, 10);
  const radii = extractSizes(cssText, ['border-radius']).slice(0, 8);
  const spacing = Array.from(new Set(extractSizes(cssText, ['margin','padding']).slice(0, 12)));
  const shadows = Array.from(new Set(
    cssText.match(/box-shadow\s*:\s*[^;]+;/gi)?.map(s => s.split(':')[1].trim().replace(/;$/,'')) || []
  )).slice(0, 8);

  const tokens = {
    "$schema": "https://design-tokens.github.io/community-group/format/module.json",
    "tokenSetOrder": ["global", "semantic"],
    "global": {
      "color": Object.fromEntries(topColors.map((c, i) => [i===0?'primary':`palette${i}`, {"value": c}])),
      "radius": Object.fromEntries(radii.map((r, i)=>[`r${i}`, {"value": r}])),
      "spacing": Object.fromEntries(spacing.map((s, i)=>[`s${i}`, {"value": s}])),
      "shadow": Object.fromEntries(shadows.map((s, i)=>[`sh${i}`, {"value": s}]))
    },
    "semantic": {
      "fg": {"value": "{global.color.palette1.value}"},
      "bg": {"value": "{global.color.palette2.value}"},
      "accent": {"value": "{global.color.primary.value}"}
    }
  };

  const outDir = path.resolve(process.cwd(), out);
  await fs.mkdirp(outDir);
  await fs.writeJSON(path.join(outDir, 'tokens.json'), tokens, { spaces: 2 });

  console.log('\n✅ Wrote tokens.json');
})();
