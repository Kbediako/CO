#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path, { isAbsolute, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { hasFlag, parseArgs } from './lib/cli-args.js';
import { runPack } from './lib/npm-pack.js';

const DEFAULT_REPOS = 5;
const DEFAULT_ITERATIONS_PER_REPO = 4;
const DEFAULT_APP_SUCCESS_THRESHOLD = 0.95;
const DEFAULT_STRICT_THRESHOLD = 1;

function toPositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toRatio(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 0 || parsed > 1) {
    return fallback;
  }
  return parsed;
}

function tryParseJson(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }
  const lines = trimmed.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const candidate = lines.slice(index).join('\n').trim();
    if (!candidate.startsWith('{')) {
      continue;
    }
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }
  return null;
}

function resolvePath(root, candidate) {
  if (!candidate || typeof candidate !== 'string') {
    return null;
  }
  return isAbsolute(candidate) ? candidate : join(root, candidate);
}

function recordFailure(bucket, context) {
  bucket.push(context);
  if (bucket.length > 20) {
    bucket.shift();
  }
}

async function runCommand(command, args, options = {}) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.once('error', (error) => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });
    child.once('close', (code) => {
      resolve({
        exitCode: typeof code === 'number' ? code : 1,
        stdout,
        stderr
      });
    });
  });
}

async function writeMockCodexBin(mockPath) {
  const script = `#!/usr/bin/env sh
set -eu
cmd="\${1:-}"
if [ "$cmd" = "--help" ]; then
  printf '%s\\n' "codex help" "  review" "  exec" "  app-server" "  login" "  cloud"
  exit 0
fi
if [ "$cmd" = "--version" ]; then
  printf '%s\\n' "codex 0.0.0-runtime-canary"
  exit 0
fi
if [ "$cmd" = "app-server" ] && [ "\${2:-}" = "--help" ]; then
  printf '%s\\n' "codex app-server help"
  exit 0
fi
if [ "$cmd" = "login" ] && [ "\${2:-}" = "status" ]; then
  printf '%s\\n' "Logged in to ChatGPT as runtime-canary"
  exit 0
fi
if [ "$cmd" = "exec" ]; then
  printf '%s\\n' "runtime canary exec ok"
  exit 0
fi
if [ "$cmd" = "review" ]; then
  printf '%s\\n' "runtime canary review ok"
  exit 0
fi
if [ "$cmd" = "cloud" ] && [ "\${2:-}" = "--help" ]; then
  printf '%s\\n' "codex cloud help"
  exit 0
fi
printf '%s\\n' "runtime canary codex default success: $*"
exit 0
`;
  await writeFile(mockPath, script, 'utf8');
  await chmod(mockPath, 0o755);
}

function findManifestPath(repoDir, payload) {
  const fromManifest = resolvePath(repoDir, payload?.manifest);
  if (fromManifest) {
    return fromManifest;
  }
  const runId = typeof payload?.run_id === 'string' ? payload.run_id : payload?.manifest?.run_id;
  if (typeof runId === 'string' && runId.trim().length > 0) {
    return join(repoDir, '.runs', payload?.task_id ?? '', 'cli', runId, 'manifest.json');
  }
  return null;
}

function summarizeManifest(manifest) {
  return {
    status: manifest?.status ?? null,
    status_detail: manifest?.status_detail ?? null,
    runtime_mode_requested: manifest?.runtime_mode_requested ?? null,
    runtime_mode: manifest?.runtime_mode ?? null,
    runtime_provider: manifest?.runtime_provider ?? null,
    runtime_fallback: manifest?.runtime_fallback ?? null,
    cloud_fallback: manifest?.cloud_fallback ?? null
  };
}

async function runScenario(params) {
  const runResult = await runCommand(params.binPath, params.args, {
    cwd: params.repoDir,
    env: params.env
  });
  const payload = tryParseJson(runResult.stdout);
  const manifestPath = findManifestPath(params.repoDir, payload);

  let manifest = null;
  if (manifestPath && existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch {
      manifest = null;
    }
  }

  const scenarioResult = {
    name: params.name,
    run_label: params.runLabel,
    command: `${params.binPath} ${params.args.join(' ')}`,
    exit_code: runResult.exitCode,
    manifest_path: manifestPath,
    manifest: summarizeManifest(manifest),
    passed: true,
    failure_reasons: []
  };

  for (const check of params.checks) {
    const outcome = check({ payload, manifest, exitCode: runResult.exitCode });
    if (!outcome.ok) {
      scenarioResult.passed = false;
      scenarioResult.failure_reasons.push(outcome.reason);
    }
  }

  const logPath = join(params.outputDir, `${params.runLabel}.log`);
  const detailsPath = join(params.outputDir, `${params.runLabel}.json`);
  await writeFile(
    logPath,
    [
      `# Scenario: ${params.name}`,
      `# Exit code: ${runResult.exitCode}`,
      '## STDOUT',
      runResult.stdout.trim(),
      '',
      '## STDERR',
      runResult.stderr.trim(),
      ''
    ].join('\n'),
    'utf8'
  );
  await writeFile(detailsPath, `${JSON.stringify(scenarioResult, null, 2)}\n`, 'utf8');

  return scenarioResult;
}

function createChecks(expectedDefaultMode) {
  return {
    defaultMode: [
      ({ exitCode }) => ({ ok: exitCode === 0, reason: `expected exitCode=0, received ${exitCode}` }),
      ({ manifest }) => ({ ok: manifest?.status === 'succeeded', reason: `expected status=succeeded, received ${manifest?.status ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_mode_requested === expectedDefaultMode, reason: `expected runtime_mode_requested=${expectedDefaultMode}, received ${manifest?.runtime_mode_requested ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_mode === expectedDefaultMode, reason: `expected runtime_mode=${expectedDefaultMode}, received ${manifest?.runtime_mode ?? '<missing>'}` }),
      ({ manifest }) => ({
        ok:
          (expectedDefaultMode === 'appserver' && manifest?.runtime_provider === 'AppServerRuntimeProvider') ||
          (expectedDefaultMode === 'cli' && manifest?.runtime_provider === 'CliRuntimeProvider'),
        reason: `expected runtime_provider to match ${expectedDefaultMode} default, received ${manifest?.runtime_provider ?? '<missing>'}`
      }),
      ({ manifest }) => ({ ok: manifest?.runtime_fallback?.occurred === false, reason: 'expected runtime_fallback.occurred=false for default-mode lane' })
    ],
    appserverSuccess: [
      ({ exitCode }) => ({ ok: exitCode === 0, reason: `expected exitCode=0, received ${exitCode}` }),
      ({ manifest }) => ({ ok: manifest?.status === 'succeeded', reason: `expected status=succeeded, received ${manifest?.status ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_mode_requested === 'appserver', reason: `expected runtime_mode_requested=appserver, received ${manifest?.runtime_mode_requested ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_mode === 'appserver', reason: `expected runtime_mode=appserver, received ${manifest?.runtime_mode ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_provider === 'AppServerRuntimeProvider', reason: `expected runtime_provider=AppServerRuntimeProvider, received ${manifest?.runtime_provider ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_fallback?.occurred === false, reason: 'expected runtime_fallback.occurred=false' })
    ],
    forcedFallback: [
      ({ exitCode }) => ({ ok: exitCode === 0, reason: `expected exitCode=0, received ${exitCode}` }),
      ({ manifest }) => ({ ok: manifest?.status === 'succeeded', reason: `expected status=succeeded, received ${manifest?.status ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_mode_requested === 'appserver', reason: `expected runtime_mode_requested=appserver, received ${manifest?.runtime_mode_requested ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_mode === 'cli', reason: `expected runtime_mode=cli, received ${manifest?.runtime_mode ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_provider === 'CliRuntimeProvider', reason: `expected runtime_provider=CliRuntimeProvider, received ${manifest?.runtime_provider ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.runtime_fallback?.occurred === true, reason: 'expected runtime_fallback.occurred=true' }),
      ({ manifest }) => ({ ok: manifest?.runtime_fallback?.code === 'forced-preflight-failure', reason: `expected fallback code forced-preflight-failure, received ${manifest?.runtime_fallback?.code ?? '<missing>'}` })
    ],
    unsupportedCombo: [
      ({ exitCode }) => ({ ok: exitCode !== 0, reason: `expected non-zero exitCode for failed run, received ${exitCode}` }),
      ({ manifest }) => ({ ok: manifest?.status === 'failed', reason: `expected status=failed, received ${manifest?.status ?? '<missing>'}` }),
      ({ manifest }) => ({ ok: manifest?.status_detail === 'runtime-selection-failed', reason: `expected status_detail=runtime-selection-failed, received ${manifest?.status_detail ?? '<missing>'}` }),
      ({ manifest }) => ({
        ok:
          typeof manifest?.runtime_fallback?.reason === 'string' ||
          typeof manifest?.status_detail === 'string',
        reason: 'expected runtime failure details to be present'
      })
    ]
  };
}

function ratio(numerator, denominator) {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

async function main() {
  const { args } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'help') || hasFlag(args, 'h')) {
    console.log(`Usage: node scripts/runtime-mode-canary.mjs [options]

Options:
  --task-id <id>           Base task id used for run labels.
  --repos <n>              Number of dummy repos (default: ${DEFAULT_REPOS}).
  --iterations <n>         Iterations per repo (default: ${DEFAULT_ITERATIONS_PER_REPO}).
  --expected-default <cli|appserver> Expected default runtime mode lane assertion (default: appserver).
  --app-threshold <0..1>   Appserver success threshold (default: ${DEFAULT_APP_SUCCESS_THRESHOLD}).
  --strict-threshold <0..1> Strict threshold for deterministic lanes (default: ${DEFAULT_STRICT_THRESHOLD}).
  --output-dir <path>      Output directory for evidence files.
`);
    return;
  }

  const repoRoot = process.cwd();
  const taskId =
    (typeof args['task-id'] === 'string' ? args['task-id'] : process.env.RUNTIME_CANARY_TASK_ID) ||
    process.env.MCP_RUNNER_TASK_ID ||
    'runtime-mode-canary';
  const repoCount = toPositiveInt(args.repos, DEFAULT_REPOS);
  const iterationsPerRepo = toPositiveInt(args.iterations, DEFAULT_ITERATIONS_PER_REPO);
  const expectedDefaultMode =
    args['expected-default'] === 'cli' || args['expected-default'] === 'appserver'
      ? args['expected-default']
      : 'appserver';
  const appThreshold = toRatio(args['app-threshold'], DEFAULT_APP_SUCCESS_THRESHOLD);
  const strictThreshold = toRatio(args['strict-threshold'], DEFAULT_STRICT_THRESHOLD);
  const outputDir = path.resolve(
    typeof args['output-dir'] === 'string' && args['output-dir'].trim().length > 0
      ? args['output-dir']
      : join(repoRoot, 'out', taskId, 'manual')
  );

  await mkdir(outputDir, { recursive: true });

  let tarballPath = null;
  const tempRoots = [];

  const checks = createChecks(expectedDefaultMode);
  const counters = {
    default_mode: { total: 0, passed: 0, failures: [] },
    appserver_success: { total: 0, passed: 0, failures: [] },
    forced_fallback: { total: 0, passed: 0, failures: [] },
    unsupported_combo: { total: 0, passed: 0, failures: [] }
  };

  try {
    const packRecord = await runPack();
    if (!packRecord?.filename) {
      throw new Error('runtime canary requires npm pack filename output');
    }
    tarballPath = path.resolve(repoRoot, packRecord.filename);
    await access(tarballPath);

    for (let repoIndex = 1; repoIndex <= repoCount; repoIndex += 1) {
      const tempRoot = await mkdtemp(join(os.tmpdir(), `co-runtime-canary-${repoIndex}-`));
      tempRoots.push(tempRoot);
      const repoDir = join(tempRoot, `dummy-repo-${repoIndex}`);
      await mkdir(repoDir, { recursive: true });
      await writeFile(
        join(repoDir, 'package.json'),
        `${JSON.stringify({ name: `runtime-canary-${repoIndex}`, private: true }, null, 2)}\n`,
        'utf8'
      );

      const installResult = await runCommand(
        'npm',
        ['install', tarballPath, '--no-fund', '--no-audit', '--ignore-scripts'],
        { cwd: repoDir }
      );
      if (installResult.exitCode !== 0) {
        throw new Error(`npm install failed for repo ${repoIndex}: ${installResult.stderr || installResult.stdout}`);
      }

      const binName = process.platform === 'win32' ? 'codex-orchestrator.cmd' : 'codex-orchestrator';
      const binPath = join(repoDir, 'node_modules', '.bin', binName);
      await access(binPath);

      const mockCodexPath = join(repoDir, process.platform === 'win32' ? 'codex-mock.cmd' : 'codex-mock.sh');
      await writeMockCodexBin(mockCodexPath);

      for (let iteration = 1; iteration <= iterationsPerRepo; iteration += 1) {
        const runSuffix = `r${repoIndex}-i${iteration}`;
        const baseEnv = {
          ...process.env,
          CODEX_CLI_BIN: mockCodexPath,
          CODEX_NON_INTERACTIVE: '1',
          CODEX_NO_INTERACTIVE: '1',
          CODEX_INTERACTIVE: '0',
          CODEX_REVIEW_NON_INTERACTIVE: '1',
          CODEX_ORCHESTRATOR_ROOT: repoDir,
          CODEX_ORCHESTRATOR_RUNS_DIR: join(repoDir, '.runs'),
          CODEX_ORCHESTRATOR_OUT_DIR: join(repoDir, 'out')
        };

        const defaultModeLabel = `canary-default-mode-${runSuffix}`;
        const defaultModeResult = await runScenario({
          name: 'default_mode',
          runLabel: defaultModeLabel,
          outputDir,
          repoDir,
          binPath,
          env: {
            ...baseEnv,
            MCP_RUNNER_TASK_ID: `${taskId}-${defaultModeLabel}`
          },
          args: [
            'start',
            'frontend-testing',
            '--format',
            'json',
            '--no-interactive',
            '--task',
            `${taskId}-${defaultModeLabel}`
          ],
          checks: checks.defaultMode
        });
        counters.default_mode.total += 1;
        if (defaultModeResult.passed) {
          counters.default_mode.passed += 1;
        } else {
          recordFailure(counters.default_mode.failures, {
            run_label: defaultModeResult.run_label,
            reasons: defaultModeResult.failure_reasons
          });
        }

        const appserverSuccessLabel = `canary-appserver-success-${runSuffix}`;
        const appserverSuccess = await runScenario({
          name: 'appserver_success',
          runLabel: appserverSuccessLabel,
          outputDir,
          repoDir,
          binPath,
          env: {
            ...baseEnv,
            MCP_RUNNER_TASK_ID: `${taskId}-${appserverSuccessLabel}`
          },
          args: [
            'start',
            'frontend-testing',
            '--runtime-mode',
            'appserver',
            '--format',
            'json',
            '--no-interactive',
            '--task',
            `${taskId}-${appserverSuccessLabel}`
          ],
          checks: checks.appserverSuccess
        });
        counters.appserver_success.total += 1;
        if (appserverSuccess.passed) {
          counters.appserver_success.passed += 1;
        } else {
          recordFailure(counters.appserver_success.failures, {
            run_label: appserverSuccess.run_label,
            reasons: appserverSuccess.failure_reasons
          });
        }

        const fallbackLabel = `canary-fallback-${runSuffix}`;
        const fallbackResult = await runScenario({
          name: 'forced_fallback',
          runLabel: fallbackLabel,
          outputDir,
          repoDir,
          binPath,
          env: {
            ...baseEnv,
            MCP_RUNNER_TASK_ID: `${taskId}-${fallbackLabel}`,
            CODEX_ORCHESTRATOR_APPSERVER_FORCE_PRECHECK_FAIL: '1'
          },
          args: [
            'start',
            'frontend-testing',
            '--runtime-mode',
            'appserver',
            '--format',
            'json',
            '--no-interactive',
            '--task',
            `${taskId}-${fallbackLabel}`
          ],
          checks: checks.forcedFallback
        });
        counters.forced_fallback.total += 1;
        if (fallbackResult.passed) {
          counters.forced_fallback.passed += 1;
        } else {
          recordFailure(counters.forced_fallback.failures, {
            run_label: fallbackResult.run_label,
            reasons: fallbackResult.failure_reasons
          });
        }

        const unsupportedLabel = `canary-unsupported-combo-${runSuffix}`;
        const unsupportedResult = await runScenario({
          name: 'unsupported_combo',
          runLabel: unsupportedLabel,
          outputDir,
          repoDir,
          binPath,
          env: {
            ...baseEnv,
            MCP_RUNNER_TASK_ID: `${taskId}-${unsupportedLabel}`,
            CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'deny',
            CODEX_CLOUD_ENV_ID: 'env-runtime-canary'
          },
          args: [
            'start',
            'frontend-testing',
            '--execution-mode',
            'cloud',
            '--runtime-mode',
            'appserver',
            '--format',
            'json',
            '--no-interactive',
            '--task',
            `${taskId}-${unsupportedLabel}`
          ],
          checks: checks.unsupportedCombo
        });
        counters.unsupported_combo.total += 1;
        if (unsupportedResult.passed) {
          counters.unsupported_combo.passed += 1;
        } else {
          recordFailure(counters.unsupported_combo.failures, {
            run_label: unsupportedResult.run_label,
            reasons: unsupportedResult.failure_reasons
          });
        }
      }
    }

    const defaultModePassRate = ratio(counters.default_mode.passed, counters.default_mode.total);
    const appPassRate = ratio(counters.appserver_success.passed, counters.appserver_success.total);
    const fallbackPassRate = ratio(counters.forced_fallback.passed, counters.forced_fallback.total);
    const unsupportedPassRate = ratio(counters.unsupported_combo.passed, counters.unsupported_combo.total);

    const thresholdChecks = {
      default_mode: {
        threshold: appThreshold,
        pass_rate: defaultModePassRate,
        passed: defaultModePassRate >= appThreshold
      },
      appserver_success: {
        threshold: appThreshold,
        pass_rate: appPassRate,
        passed: appPassRate >= appThreshold
      },
      forced_fallback: {
        threshold: strictThreshold,
        pass_rate: fallbackPassRate,
        passed: fallbackPassRate >= strictThreshold
      },
      unsupported_combo: {
        threshold: strictThreshold,
        pass_rate: unsupportedPassRate,
        passed: unsupportedPassRate >= strictThreshold
      }
    };

    const readyForDefaultFlip =
      thresholdChecks.default_mode.passed &&
      thresholdChecks.appserver_success.passed &&
      thresholdChecks.forced_fallback.passed &&
      thresholdChecks.unsupported_combo.passed;

    const summary = {
      generated_at: new Date().toISOString(),
      task_id: taskId,
      repos: repoCount,
      iterations_per_repo: iterationsPerRepo,
      total_iterations: repoCount * iterationsPerRepo,
      thresholds: {
        expected_default_mode: expectedDefaultMode,
        appserver_success: appThreshold,
        strict_lanes: strictThreshold
      },
      scenarios: {
        default_mode: {
          ...counters.default_mode,
          pass_rate: defaultModePassRate
        },
        appserver_success: {
          ...counters.appserver_success,
          pass_rate: appPassRate
        },
        forced_fallback: {
          ...counters.forced_fallback,
          pass_rate: fallbackPassRate
        },
        unsupported_combo: {
          ...counters.unsupported_combo,
          pass_rate: unsupportedPassRate
        }
      },
      threshold_checks: thresholdChecks,
      decision: {
        ready_for_default_flip: readyForDefaultFlip,
        recommendation: readyForDefaultFlip
          ? 'flip-default-to-appserver'
          : 'hold-default-cli-and-continue-canary'
      }
    };

    const summaryPath = join(outputDir, 'runtime-canary-summary.json');
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    if (!readyForDefaultFlip) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`runtime-mode-canary failed: ${(error && error.message) || String(error)}`);
    process.exitCode = 1;
  } finally {
    if (tarballPath) {
      try {
        await rm(tarballPath, { force: true });
      } catch {
        // ignore cleanup failures
      }
    }
    for (const tempRoot of tempRoots) {
      try {
        await rm(tempRoot, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
