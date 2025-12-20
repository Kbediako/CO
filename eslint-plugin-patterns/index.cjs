const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const distRulePath = path.resolve(repoRoot, 'dist/patterns/linters/rules/prefer-logger-over-console.js');
const sourceRoot = path.resolve(repoRoot, 'patterns');

function getLatestMtime(targetPath) {
  let stat;
  try {
    stat = fs.statSync(targetPath);
  } catch {
    return 0;
  }

  if (!stat.isDirectory()) {
    return stat.mtimeMs;
  }

  const entries = fs.readdirSync(targetPath);
  return entries.reduce((latest, entry) => {
    const candidate = getLatestMtime(path.join(targetPath, entry));
    return candidate > latest ? candidate : latest;
  }, stat.mtimeMs);
}

function needsBuild() {
  const distMtime = getLatestMtime(distRulePath);
  if (distMtime === 0) {
    return true;
  }
  const sourceMtime = Math.max(
    getLatestMtime(path.join(sourceRoot, 'linters')),
    getLatestMtime(path.join(sourceRoot, 'tsconfig.json'))
  );
  return sourceMtime > distMtime;
}

function buildPatterns() {
  const tscPath = require.resolve('typescript/bin/tsc');
  const result = spawnSync(
    process.execPath,
    [tscPath, '-p', path.join(sourceRoot, 'tsconfig.json')],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    throw new Error(
      `patterns plugin failed to build artifacts. Run "npm run build:patterns" to inspect failures.`
    );
  }
}

function ensurePatternsBuilt() {
  if (!needsBuild()) {
    return;
  }
  buildPatterns();
  if (needsBuild()) {
    throw new Error(
      `patterns plugin requires built artifacts at ${distRulePath}. Run "npm run build:patterns" before linting.`
    );
  }
}

function loadRules() {
  ensurePatternsBuilt();
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const moduleExports = require(distRulePath);
    const rule = moduleExports?.default ?? moduleExports;
    return {
      'prefer-logger-over-console': rule
    };
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `patterns plugin requires built artifacts at ${distRulePath}. Run "npm run build:patterns" before linting.`
      );
    }
    throw error;
  }
}

const rules = loadRules();

module.exports = {
  rules,
  configs: {
    recommended: {
      rules: {
        'patterns/prefer-logger-over-console': 'warn'
      }
    }
  }
};
