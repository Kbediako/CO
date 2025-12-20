import { stat, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRulePath = resolve(repoRoot, 'dist/patterns/linters/rules/prefer-logger-over-console.js');
const sourceRoot = resolve(repoRoot, 'patterns');

async function getLatestMtime(targetPath) {
  let stats;
  try {
    stats = await stat(targetPath);
  } catch {
    return 0;
  }

  if (!stats.isDirectory()) {
    return stats.mtimeMs;
  }

  const entries = await readdir(targetPath);
  if (entries.length === 0) {
    return stats.mtimeMs;
  }

  const candidateTimes = await Promise.all(
    entries.map(async (entry) => getLatestMtime(join(targetPath, entry)))
  );
  return Math.max(stats.mtimeMs, ...candidateTimes);
}

async function needsBuild() {
  const distMtime = await getLatestMtime(distRulePath);
  if (distMtime === 0) {
    return true;
  }
  const sourceMtime = Math.max(
    await getLatestMtime(join(sourceRoot, 'linters')),
    await getLatestMtime(join(sourceRoot, 'tsconfig.json'))
  );
  return sourceMtime > distMtime;
}

function runBuild() {
  const require = createRequire(import.meta.url);
  const tscPath = require.resolve('typescript/bin/tsc');
  const result = spawnSync(process.execPath, [tscPath, '-p', join(repoRoot, 'patterns/tsconfig.json')], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (await needsBuild()) {
  runBuild();
}
