#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { lstatSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  console.log(`Usage: node scripts/shared-repo-git-identity.mjs --repo-root <path> [--clear]

Detects or explicitly clears a historical shared repo-local git identity override
from the shared checkout root only. This helper is for historical cleanup, not
for linked-worktree future leak prevention.

Examples:
  node scripts/shared-repo-git-identity.mjs --repo-root /Users/kbediako/Code/CO
  node scripts/shared-repo-git-identity.mjs --repo-root /Users/kbediako/Code/CO --clear`);
}

function readOptionValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || value.startsWith('--')) {
    fail(`Missing value for ${flag}.`);
  }
  return value;
}

function parseArgs(argv) {
  let repoRoot = null;
  let clear = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--repo-root') {
      repoRoot = readOptionValue(argv, index, '--repo-root');
      index += 1;
      continue;
    }
    if (arg === '--clear') {
      clear = true;
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }

  if (!repoRoot) {
    fail('Missing required --repo-root <path>.');
  }

  return {
    repoRoot: resolve(repoRoot),
    clear
  };
}

function runGit(repoRoot, args) {
  return execFileSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function formatGitError(error) {
  if (error && typeof error === 'object') {
    const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : '';
    if (stderr) {
      return stderr;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

function ensureSharedCheckoutRoot(repoRoot) {
  const dotGitPath = resolve(repoRoot, '.git');
  let dotGitStats;
  try {
    dotGitStats = lstatSync(dotGitPath);
  } catch {
    fail(`Historical cleanup must be run from the shared checkout root; missing ${dotGitPath}.`);
  }

  if (!dotGitStats.isDirectory()) {
    fail(
      `Historical cleanup must be run from the shared checkout root; ${dotGitPath} is not a directory.`
    );
  }

  let topLevel;
  try {
    topLevel = realpathSync(resolve(runGit(repoRoot, ['rev-parse', '--show-toplevel'])));
  } catch (error) {
    fail(formatGitError(error));
    return;
  }

  if (topLevel !== realpathSync(repoRoot)) {
    fail(`Expected shared checkout root ${repoRoot}, but git resolved ${topLevel}.`);
  }
}

function getSharedConfigPath(repoRoot) {
  const commonDir = runGit(repoRoot, ['rev-parse', '--git-common-dir']);
  return resolve(repoRoot, commonDir, 'config');
}

function readConfigValues(configPath, key) {
  try {
    const output = execFileSync('git', ['config', '--file', configPath, '--get-all', key], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    return output ? output.split('\n').map((value) => value.trim()).filter(Boolean) : [];
  } catch (error) {
    if (error && typeof error === 'object' && (error.status === 1 || error.status === 5)) {
      return [];
    }
    fail(formatGitError(error));
    return [];
  }
}

function unsetConfigValues(configPath, key) {
  try {
    execFileSync('git', ['config', '--file', configPath, '--unset-all', key], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    if (error && typeof error === 'object' && (error.status === 1 || error.status === 5)) {
      return;
    }
    fail(formatGitError(error));
  }
}

function formatValue(values) {
  return values.join(', ');
}

function printKeyValue(key, value) {
  console.log(`${key}=${value}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureSharedCheckoutRoot(options.repoRoot);

  const configPath = getSharedConfigPath(options.repoRoot);
  const beforeName = readConfigValues(configPath, 'user.name');
  const beforeEmail = readConfigValues(configPath, 'user.email');
  const overridePresentBefore = beforeName.length > 0 || beforeEmail.length > 0;

  if (!options.clear) {
    if (overridePresentBefore) {
      console.log(`Shared repo-local git identity override detected in ${configPath}.`);
    } else {
      console.log(`No shared repo-local git identity override detected in ${configPath}.`);
    }

    printKeyValue('action', 'status');
    printKeyValue('repo_root', options.repoRoot);
    printKeyValue('config_path', configPath);
    printKeyValue('override_present', overridePresentBefore ? 'true' : 'false');
    if (beforeName.length > 0) {
      printKeyValue('user.name', formatValue(beforeName));
    }
    if (beforeEmail.length > 0) {
      printKeyValue('user.email', formatValue(beforeEmail));
    }
    return;
  }

  if (overridePresentBefore) {
    unsetConfigValues(configPath, 'user.name');
    unsetConfigValues(configPath, 'user.email');
  }

  const afterName = readConfigValues(configPath, 'user.name');
  const afterEmail = readConfigValues(configPath, 'user.email');
  const overridePresentAfter = afterName.length > 0 || afterEmail.length > 0;

  if (overridePresentBefore) {
    console.log(`Cleared shared repo-local git identity override from ${configPath}.`);
  } else {
    console.log(`No shared repo-local git identity override detected in ${configPath}; nothing to clear.`);
  }

  printKeyValue('action', 'clear');
  printKeyValue('repo_root', options.repoRoot);
  printKeyValue('config_path', configPath);
  printKeyValue('override_present_before', overridePresentBefore ? 'true' : 'false');
  if (beforeName.length > 0) {
    printKeyValue('user.name', formatValue(beforeName));
  }
  if (beforeEmail.length > 0) {
    printKeyValue('user.email', formatValue(beforeEmail));
  }
  printKeyValue('cleared', overridePresentBefore ? 'true' : 'false');
  printKeyValue('override_present_after', overridePresentAfter ? 'true' : 'false');
}

main();
