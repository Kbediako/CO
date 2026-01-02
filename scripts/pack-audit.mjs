#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { runPack } from './lib/npm-pack.js';

const REQUIRED_FILES = [
  'dist/bin/codex-orchestrator.js',
  'schemas/manifest.json',
  'README.md',
  'LICENSE'
];

const ALLOWED_PREFIXES = ['dist/', 'schemas/', 'templates/'];
const ALLOWED_ROOT_FILES = new Set(['README.md', 'LICENSE', 'package.json']);
const DIST_ALLOWED_PREFIXES = [
  'dist/bin/',
  'dist/orchestrator/',
  'dist/packages/',
  'dist/scripts/design/pipeline/',
  'dist/scripts/lib/',
  'dist/types/'
];

const FORBIDDEN_PREFIXES = [
  '.agent/',
  '.github/',
  '.runs/',
  'archives/',
  'docs/',
  'out/',
  'scripts/',
  'tasks/',
  'tests/',
  'adapters/',
  'evaluation/',
  'node_modules/'
];

const DIST_FORBIDDEN_PATTERNS = [/\/__tests__\//, /\/tests\//, /\.test\./, /\.spec\./];

function parseByteLimit(value) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function collectFilePaths(record) {
  const files = Array.isArray(record.files) ? record.files : [];
  return files
    .map((entry) => (entry && typeof entry.path === 'string' ? entry.path : null))
    .filter((value) => Boolean(value));
}

function isAllowedPath(filePath) {
  if (ALLOWED_ROOT_FILES.has(filePath)) {
    return true;
  }
  return ALLOWED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function isAllowedDistPath(filePath) {
  if (!filePath.startsWith('dist/')) {
    return true;
  }
  return DIST_ALLOWED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function isForbiddenDistArtifact(filePath) {
  if (!filePath.startsWith('dist/')) {
    return false;
  }
  return DIST_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(filePath));
}

async function main() {
  const maxPackedBytes = parseByteLimit(process.env.PACK_AUDIT_MAX_BYTES);
  const maxUnpackedBytes = parseByteLimit(process.env.PACK_AUDIT_MAX_UNPACKED_BYTES);
  let record;
  let tarballPath = null;

  try {
    record = await runPack();
    if (record.filename) {
      tarballPath = path.resolve(process.cwd(), record.filename);
    }

    const filePaths = collectFilePaths(record);
    const fileSet = new Set(filePaths);
    const errors = [];

    for (const required of REQUIRED_FILES) {
      if (!fileSet.has(required)) {
        errors.push(`missing required file: ${required}`);
      }
    }

    for (const filePath of filePaths) {
      if (FORBIDDEN_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
        errors.push(`forbidden path: ${filePath}`);
        continue;
      }
      if (isForbiddenDistArtifact(filePath)) {
        errors.push(`forbidden dist artifact: ${filePath}`);
        continue;
      }
      if (!isAllowedDistPath(filePath)) {
        errors.push(`unexpected dist path: ${filePath}`);
        continue;
      }
      if (!isAllowedPath(filePath)) {
        errors.push(`unexpected path: ${filePath}`);
      }
    }

    if (maxPackedBytes !== null && record.size > maxPackedBytes) {
      errors.push(`packed size ${record.size} exceeds limit ${maxPackedBytes}`);
    }
    if (maxUnpackedBytes !== null && record.unpackedSize > maxUnpackedBytes) {
      errors.push(`unpacked size ${record.unpackedSize} exceeds limit ${maxUnpackedBytes}`);
    }

    if (errors.length > 0) {
      console.error('❌ pack audit failed:');
      for (const error of errors) {
        console.error(` - ${error}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('✅ pack audit passed');
  } catch (error) {
    console.error(`❌ pack audit error: ${error?.message ?? String(error)}`);
    process.exitCode = 1;
  } finally {
    if (tarballPath) {
      try {
        await rm(tarballPath, { force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  }
}

main();
