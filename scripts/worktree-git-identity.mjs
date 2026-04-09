#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  console.log(`Usage: node scripts/worktree-git-identity.mjs --worktree <path> [--name <value> --email <value>]

Preserves inherited git identity by default. When both --name and --email are
provided, enables worktree config if needed and writes the explicit identity to
the linked worktree only.`);
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

function readLocalConfig(worktree, key) {
  try {
    return runGit(worktree, ['config', '--local', '--get', key]);
  } catch {
    return null;
  }
}

function writeLocalConfig(worktree, key, value) {
  runGit(worktree, ['config', '--local', key, value]);
}

function unsetLocalConfig(worktree, key) {
  try {
    runGit(worktree, ['config', '--local', '--unset-all', key]);
    return true;
  } catch {
    return false;
  }
}

function writeWorktreeConfig(worktree, key, value) {
  runGit(worktree, ['config', '--worktree', key, value]);
}

const options = parseArgs(process.argv.slice(2));

if (!options.name && !options.email) {
  console.log('No explicit git identity requested; leaving inherited identity unchanged.');
  process.exit(0);
}

if (readLocalConfig(options.worktree, 'extensions.worktreeConfig') !== 'true') {
  writeLocalConfig(options.worktree, 'extensions.worktreeConfig', 'true');
  console.log('Enabled extensions.worktreeConfig in shared repo config.');
}

const sharedLocalName = readLocalConfig(options.worktree, 'user.name');
const sharedLocalEmail = readLocalConfig(options.worktree, 'user.email');
const shouldClearSharedIdentity =
  sharedLocalName === options.name || sharedLocalEmail === options.email;

const clearedSharedName = shouldClearSharedIdentity ? unsetLocalConfig(options.worktree, 'user.name') : false;
const clearedSharedEmail = shouldClearSharedIdentity ? unsetLocalConfig(options.worktree, 'user.email') : false;

if (clearedSharedName || clearedSharedEmail) {
  console.log('Removed matching shared repo-local git identity override.');
}

writeWorktreeConfig(options.worktree, 'user.name', options.name);
writeWorktreeConfig(options.worktree, 'user.email', options.email);
console.log(`Configured worktree-local git identity for ${options.worktree}.`);
