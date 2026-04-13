#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  console.log(`Usage: node scripts/worktree-git-identity.mjs --worktree <path> [--name <value> --email <value>]

Preserves inherited git identity by default. When both --name and --email are
provided, enables worktree config if needed and writes the explicit identity to
the linked worktree only.

This helper is for future leak prevention only. It does not clear historical
shared repo-local user.name/user.email overrides from the shared checkout.
Use node scripts/shared-repo-git-identity.mjs --repo-root <shared-checkout-root>
[--clear] for intentional historical cleanup from the shared checkout root.`);
}

function readOptionValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || value.startsWith('--')) {
    fail(`Missing value for ${flag}.`);
  }
  return value;
}

function parseArgs(argv) {
  let worktree = null;
  let name = null;
  let email = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }

    if (arg === '--worktree') {
      worktree = readOptionValue(argv, index, '--worktree');
      index += 1;
      continue;
    }

    if (arg === '--name') {
      name = readOptionValue(argv, index, '--name');
      index += 1;
      continue;
    }

    if (arg === '--email') {
      email = readOptionValue(argv, index, '--email');
      index += 1;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  if (!worktree) {
    fail('Missing required --worktree <path>.');
  }

  const hasName = Boolean(name && name.trim());
  const hasEmail = Boolean(email && email.trim());
  if (hasName !== hasEmail) {
    fail('Provide both --name and --email together, or neither.');
  }

  return {
    worktree,
    name: hasName ? name.trim() : null,
    email: hasEmail ? email.trim() : null
  };
}

function runGit(worktree, args) {
  return execFileSync('git', ['-C', worktree, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function getCommonConfigPath(worktree) {
  const commonDir = runGit(worktree, ['rev-parse', '--git-common-dir']);
  return resolve(worktree, commonDir, 'config');
}

function readCommonConfig(worktree, key) {
  try {
    const commonConfigPath = getCommonConfigPath(worktree);
    return execFileSync('git', ['config', '--file', commonConfigPath, '--get', key], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
}

function writeCommonConfig(worktree, key, value) {
  const commonConfigPath = getCommonConfigPath(worktree);
  execFileSync('git', ['config', '--file', commonConfigPath, key, value], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function writeWorktreeConfig(worktree, key, value) {
  runGit(worktree, ['config', '--worktree', key, value]);
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

function isBenignWorktreeUnsetError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if (error.status === 5) {
    return true;
  }

  const stderr = typeof error.stderr === 'string' ? error.stderr : '';
  return stderr.includes('extension worktreeConfig is enabled');
}

function unsetWorktreeConfig(worktree, key) {
  try {
    runGit(worktree, ['config', '--worktree', '--unset-all', key]);
    return true;
  } catch (error) {
    if (isBenignWorktreeUnsetError(error)) {
      return false;
    }
    fail(formatGitError(error));
    return false;
  }
}

function clearWorktreeIdentity(worktree) {
  const clearedWorktreeName = unsetWorktreeConfig(worktree, 'user.name');
  const clearedWorktreeEmail = unsetWorktreeConfig(worktree, 'user.email');
  return clearedWorktreeName || clearedWorktreeEmail;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.name && !options.email) {
    const clearedWorktreeIdentity = clearWorktreeIdentity(options.worktree);
    if (clearedWorktreeIdentity) {
      console.log('Cleared worktree-local git identity override; allowing inherited identity.');
    } else {
      console.log('No explicit git identity requested; leaving inherited identity unchanged.');
    }
    return;
  }

  try {
    if (readCommonConfig(options.worktree, 'extensions.worktreeConfig') !== 'true') {
      writeCommonConfig(options.worktree, 'extensions.worktreeConfig', 'true');
      console.log('Enabled extensions.worktreeConfig in shared repo config.');
    }

    writeWorktreeConfig(options.worktree, 'user.name', options.name);
    writeWorktreeConfig(options.worktree, 'user.email', options.email);
  } catch (error) {
    fail(formatGitError(error));
  }

  console.log(`Configured worktree-local git identity for ${options.worktree}.`);
}

main();
