import fs from 'fs-extra';
import path from 'path';

function flatten(obj: any, prefix: string[] = []) {
  const out: Record<string, string> = {};
  for (const [k,v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && 'value' in v) {
      out[[...prefix, k].join('-')] = (v as any).value;
    } else if (v && typeof v === 'object') {
      Object.assign(out, flatten(v, [...prefix, k]));
    }
  }
  return out;
}

(async () => {
  const tokens = await fs.readJSON('tokens.json');
  const flat = flatten(tokens);
  const lines = [':root {'];
  for (const [k,v] of Object.entries(flat)) {
    lines.push(`  --${k}: ${v};`);
  }
  lines.push('}');
  await fs.mkdirp('dist');
  await fs.writeFile('dist/tokens.css', lines.join('\n'), 'utf8');
  console.log('✅ Built dist/tokens.css');
})();
