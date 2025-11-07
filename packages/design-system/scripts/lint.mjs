import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

async function main() {
  const tokensDir = join(process.cwd(), 'tokens', 'src', 'hi-fi');
  const componentsDir = join(process.cwd(), 'src', 'components', 'hi-fi');
  await Promise.all([ensureDirectory(tokensDir), ensureDirectory(componentsDir)]);
  console.log('[design-system] lint checks passed');
}

async function ensureDirectory(path) {
  try {
    await access(path, constants.F_OK);
  } catch {
    throw new Error(`expected directory missing: ${path}`);
  }
}

main().catch((error) => {
  console.error('[design-system] lint failed');
  console.error(error);
  process.exit(1);
});
