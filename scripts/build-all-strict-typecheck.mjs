#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_BASELINE_PATH = 'tasks/baselines/build-all-strict-typecheck-debt.json';
const STRICT_TYPECHECK_COMMAND = ['-p', 'tsconfig.json', '--pretty', 'false', '--noEmit'];
const CANONICAL_OWNER_KEY = 'build-all-strict-test-typecheck-debt';
const DIAGNOSTIC_IDENTITY_ALGORITHM = 'sha256(sorted file:line:column:code:repo-root-normalized-full-message-block)';

function showUsage() {
  console.log(`Usage: node scripts/build-all-strict-typecheck.mjs [--baseline <path>] [--update]

Runs the root strict TypeScript check and compares diagnostics against the
checked-in CO-471 baseline. The guard fails when diagnostics drift, so
npm run build:all can stay release-auditable while the known strict test type
debt is burned down deliberately.

Options:
  --baseline <path>  Baseline JSON path (default: ${DEFAULT_BASELINE_PATH})
  --update           Rewrite the baseline with the current diagnostics
  -h, --help         Show this help message`);
}

function parseArgs(argv) {
  const options = {
    baselinePath: DEFAULT_BASELINE_PATH,
    update: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }
    if (arg === '--update') {
      options.update = true;
      continue;
    }
    if (arg === '--baseline') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--baseline requires a path');
      }
      options.baselinePath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function resolveTscPath() {
  return require.resolve('typescript/bin/tsc');
}

function runStrictTypecheck() {
  const tscPath = resolveTscPath();
  const result = spawnSync(process.execPath, [tscPath, ...STRICT_TYPECHECK_COMMAND], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const output = `${stdout}${stderr}`;
  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 1,
    output,
    summary: parseTypeScriptDiagnostics(output)
  };
}

function incrementCount(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedObjectFromMap(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function normalizePathSeparators(value) {
  return value.split('\\').join('/');
}

function normalizeDiagnosticMessage(message) {
  const normalizedRoot = normalizePathSeparators(REPO_ROOT);
  return normalizePathSeparators(message).split(normalizedRoot).join('<repo-root>');
}

function parseTypeScriptDiagnostics(output) {
  const byFile = new Map();
  const byCode = new Map();
  const diagnostics = [];
  const diagnosticStartPattern = /^(?:(.+?)\((\d+),(\d+)\): )?error TS(\d+): (.*)$/;
  let current = null;

  function pushCurrentDiagnostic() {
    if (current === null) {
      return;
    }
    const { file, line, column, code, messageLines } = current;
    const normalizedFile = file.split('\\').join('/');
    incrementCount(byFile, normalizedFile);
    incrementCount(byCode, `TS${code}`);
    diagnostics.push({
      file: normalizedFile,
      line: Number(line),
      column: Number(column),
      code: `TS${code}`,
      message: normalizeDiagnosticMessage(messageLines.join('\n').trimEnd())
    });
  }

  for (const rawLine of output.split(/\r?\n/)) {
    const match = diagnosticStartPattern.exec(rawLine);
    if (match !== null) {
      pushCurrentDiagnostic();
      const [, file, line, column, code, message] = match;
      current = {
        file: file ?? '<global>',
        line: line ?? '0',
        column: column ?? '0',
        code,
        messageLines: [message.trimEnd()]
      };
      continue;
    }
    if (current !== null && rawLine.length > 0) {
      current.messageLines.push(rawLine.trimEnd());
    }
  }
  pushCurrentDiagnostic();

  const diagnosticIdentityHash = createHash('sha256')
    .update(
      diagnostics
        .map(
          (diagnostic) =>
            `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}:${diagnostic.code}:${diagnostic.message}`
        )
        .sort()
        .join('\n')
    )
    .digest('hex');

  return {
    total_errors: diagnostics.length,
    files: sortedObjectFromMap(byFile),
    codes: sortedObjectFromMap(byCode),
    diagnostic_identity_algorithm: DIAGNOSTIC_IDENTITY_ALGORITHM,
    diagnostic_identity_hash: diagnosticIdentityHash
  };
}

function readBaseline(path) {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8'));
}

function buildBaseline(summary) {
  return {
    schema_version: 1,
    canonical_owner_key: CANONICAL_OWNER_KEY,
    command: `tsc ${STRICT_TYPECHECK_COMMAND.join(' ')}`,
    policy: 'exact-diagnostic-identities',
    introduced_by: 'CO-471',
    reviewed_at: '2026-05-07',
    removal_condition:
      'Remove this baseline and keep npm run build:all on a clean root strict typecheck once total_errors reaches 0.',
    total_errors: summary.total_errors,
    diagnostic_identity_algorithm: summary.diagnostic_identity_algorithm,
    diagnostic_identity_hash: summary.diagnostic_identity_hash,
    files: summary.files,
    codes: summary.codes
  };
}

function writeBaseline(path, summary) {
  const baselinePath = resolve(REPO_ROOT, path);
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify(buildBaseline(summary), null, 2)}\n`);
}

function compareCountObjects(label, actual, expected) {
  const findings = [];
  const keys = new Set([...Object.keys(actual ?? {}), ...Object.keys(expected ?? {})]);
  for (const key of [...keys].sort()) {
    const actualCount = actual?.[key] ?? 0;
    const expectedCount = expected?.[key] ?? 0;
    if (actualCount !== expectedCount) {
      findings.push(`${label}:${key}: expected ${expectedCount}, observed ${actualCount}`);
    }
  }
  return findings;
}

function compareAgainstBaseline(summary, baseline) {
  const findings = [];
  if (baseline?.canonical_owner_key !== CANONICAL_OWNER_KEY) {
    findings.push(`canonical_owner_key: expected ${CANONICAL_OWNER_KEY}, observed ${baseline?.canonical_owner_key ?? 'missing'}`);
  }
  if (summary.total_errors !== baseline?.total_errors) {
    findings.push(`total_errors: expected ${baseline?.total_errors ?? 'missing'}, observed ${summary.total_errors}`);
  }
  if (baseline?.diagnostic_identity_algorithm !== DIAGNOSTIC_IDENTITY_ALGORITHM) {
    findings.push(
      `diagnostic_identity_algorithm: expected ${DIAGNOSTIC_IDENTITY_ALGORITHM}, observed ${baseline?.diagnostic_identity_algorithm ?? 'missing'}`
    );
  }
  if (summary.diagnostic_identity_hash !== baseline?.diagnostic_identity_hash) {
    findings.push(
      `diagnostic_identity_hash: expected ${baseline?.diagnostic_identity_hash ?? 'missing'}, observed ${summary.diagnostic_identity_hash}`
    );
  }
  findings.push(...compareCountObjects('file', summary.files, baseline?.files ?? {}));
  findings.push(...compareCountObjects('code', summary.codes, baseline?.codes ?? {}));
  return findings;
}

function printSummary(summary) {
  const topFiles = Object.entries(summary.files)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10);
  console.log(`[build-all-strict-typecheck] total_errors=${summary.total_errors}`);
  if (topFiles.length > 0) {
    console.log('[build-all-strict-typecheck] top files:');
    for (const [file, count] of topFiles) {
      console.log(`  ${count}\t${file}`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    showUsage();
    return;
  }

  const result = runStrictTypecheck();
  printSummary(result.summary);

  if (options.update) {
    writeBaseline(options.baselinePath, result.summary);
    console.log(`[build-all-strict-typecheck] updated baseline ${options.baselinePath}`);
    return;
  }

  if (result.status !== 0 && result.summary.total_errors === 0) {
    console.error(
      '[build-all-strict-typecheck] root strict typecheck failed but no TypeScript diagnostics were parsed; refusing to compare an empty summary.'
    );
    process.exit(1);
  }

  const baseline = readBaseline(options.baselinePath);
  const findings = compareAgainstBaseline(result.summary, baseline);
  if (findings.length === 0) {
    if (result.status === 0) {
      console.log(`[build-all-strict-typecheck] root strict typecheck is clean and matches ${options.baselinePath}`);
    } else {
      console.log(
        `[build-all-strict-typecheck] diagnostics match ${options.baselinePath}; known debt remains owned by ${CANONICAL_OWNER_KEY}`
      );
    }
    return;
  }

  console.error('[build-all-strict-typecheck] strict typecheck diagnostics drifted from the checked-in baseline:');
  for (const finding of findings.slice(0, 80)) {
    console.error(`  - ${finding}`);
  }
  if (findings.length > 80) {
    console.error(`  ... ${findings.length - 80} more`);
  }
  console.error('[build-all-strict-typecheck] update the baseline only in the owner lane after reviewing the drift.');
  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`[build-all-strict-typecheck] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
