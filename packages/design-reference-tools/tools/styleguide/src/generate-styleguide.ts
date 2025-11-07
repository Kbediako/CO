import fs from 'fs-extra';
import path from 'path';
import { Command } from 'commander';

const program = new Command();
program
  .requiredOption('--tokens <string>', 'Path to tokens.json')
  .option('--out <string>', 'Output dir', 'docs')
  .parse(process.argv);

const { tokens, out } = program.opts<{tokens: string, out: string}>();

function mdColorSwatch(hex: string) {
  const sw = `<span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${hex};border:1px solid rgba(0,0,0,.1)"></span>`;
  return `| ${sw} | \`${hex}\` |`;
}

(async () => {
  const t = await fs.readJSON(tokens);
  const g = t.global || {};
  const colors = g.color || {};
  const radii = g.radius || {};
  const spacing = g.spacing || {};
  const shadows = g.shadow || {};

  const md = `
# Style Guide

**Overview**  
Generated from extracted CSS -> tokens.

## Color Plate
| Swatch | Hex |
|---|---|
${Object.values(colors).map((v:any)=>mdColorSwatch(v.value)).join('\n')}

## Typography
> Typography is derived from computed snapshots. Populate from \`.out/.../computed.json\` if you want richer details.

- Base font families: _populated from reference_
- Font sizes: _from tokens or snapshots_
- Weights: _from snapshots_

## Spacing
${Object.values(spacing).map((v:any)=>'- ' + v.value).join('\n') || '_no spacing tokens found_'}

## Border Radius
${Object.values(radii).map((v:any)=>'- ' + v.value).join('\n') || '_no radii tokens found_'}

## Shadow
${Object.values(shadows).map((v:any)=>'``' + v.value + '``').join('\n\n') || '_no shadow tokens found_'}

## Component Style
Components in \`packages/ui\` consume these tokens via CSS variables. Extend \`tokens.css\` and component styles as needed.

## Animation
Derived from computed snapshots (transition-duration / timing-function). Consider mapping to motion tokens:
- \`--motion-duration-fast\`
- \`--motion-duration-base\`
- \`--motion-ease-standard\`

`;

  const outDir = path.resolve(process.cwd(), out);
  await fs.mkdirp(outDir);
  await fs.writeFile(path.join(outDir, 'STYLE_GUIDE.md'), md, 'utf8');
  console.log('\n✅ Wrote docs/STYLE_GUIDE.md');
})();
