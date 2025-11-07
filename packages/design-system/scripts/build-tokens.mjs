import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const tokensDir = join(process.cwd(), 'tokens', 'src', 'hi-fi');
  let bundles = 0;
  try {
    const files = await readdir(tokensDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.json')) {
        continue;
      }
      const contents = await readFile(join(tokensDir, file.name), 'utf8');
      JSON.parse(contents);
      bundles += 1;
    }
  } catch (error) {
    console.warn('[design-system] no hi-fi token bundles found', error instanceof Error ? error.message : error);
  }

  console.log(`[design-system] build:tokens processed ${bundles} bundle(s)`);
}

main().catch((error) => {
  console.error('[design-system] build:tokens failed');
  console.error(error);
  process.exit(1);
});
