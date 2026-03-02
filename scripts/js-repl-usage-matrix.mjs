#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path, { join } from 'node:path';
import process from 'node:process';

import { hasFlag, parseArgs } from './lib/cli-args.js';

const DEFAULT_LOCAL_REPOS = 5;
const DEFAULT_LOCAL_ITERATIONS = 4;
const DEFAULT_CLOUD_ITERATIONS = 4;
const DEFAULT_COMMAND_TIMEOUT_MS = 30 * 60 * 1000;

function toPositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asBool(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

async function runCommand(command, args, options = {}) {
  return await new Promise((resolve) => {
    const timeoutCandidate = Number(options.timeout);
    const timeoutMs = Number.isFinite(timeoutCandidate) && timeoutCandidate > 0 ? timeoutCandidate : 0;
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let settled = false;
    let timedOut = false;
    let killEscalationHandle = null;
    let stdout = '';
    let stderr = '';
    const timeoutHandle = timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          stderr = `${stderr}\ncommand timed out after ${timeoutMs}ms`.trim();
          child.kill('SIGTERM');
          killEscalationHandle = setTimeout(() => {
            child.kill('SIGKILL');
          }, 2000);
        }, timeoutMs)
      : null;
    const clearTimers = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (killEscalationHandle) {
        clearTimeout(killEscalationHandle);
      }
    };
    const finalize = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      resolve(result);
    };
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.once('error', (error) => {
      finalize({
        exitCode: timedOut ? 124 : 1,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });
    child.once('close', (code) => {
      finalize({
        exitCode: timedOut ? 124 : (typeof code === 'number' ? code : 1),
        stdout,
        stderr
      });
    });
  });
}

async function readJsonIfExists(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function resolveLatestManifest(taskId, rootDir, options = {}) {
  const cliRoot = join(rootDir, '.runs', taskId, 'cli');
  if (!existsSync(cliRoot)) {
    return null;
  }
  const minMtimeMs = Number(options.minMtimeMs);
  const candidates = (await readdir(cliRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (candidates.length === 0) {
    return null;
  }
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const runId = candidates[index];
    const manifestPath = join(cliRoot, runId, 'manifest.json');
    if (!existsSync(manifestPath)) {
      continue;
    }
    if (Number.isFinite(minMtimeMs) && minMtimeMs > 0) {
      let manifestStats = null;
      try {
        manifestStats = await stat(manifestPath);
      } catch {
        manifestStats = null;
      }
      if (!manifestStats || manifestStats.mtimeMs < minMtimeMs) {
        continue;
      }
    }
    return { runId, manifestPath };
  }
  return null;
}

function checkRuntimeSummary(summary) {
  if (!summary || typeof summary !== 'object') {
    return {
      passed: false,
      reasons: ['runtime-mode-canary summary missing']
    };
  }
  const checks = summary.threshold_checks ?? {};
  const entries = Object.entries(checks);
  const failing = [];
  if (entries.length === 0) {
    failing.push('runtime-mode-canary threshold_checks missing or empty');
  }
  failing.push(...entries
    .filter(([, result]) => !result?.passed)
    .map(([name, result]) => `${name} pass_rate=${result?.pass_rate ?? '<missing>'} threshold=${result?.threshold ?? '<missing>'}`));
  return {
    passed: failing.length === 0,
    reasons: failing
  };
}

async function commandLogHasJsReplFeatureFlag(commandLogPath, mode) {
  if (!commandLogPath || !existsSync(commandLogPath)) {
    return false;
  }
  const expectedMode = mode === 'enable' ? 'enable' : 'disable';
  const raw = await readFile(commandLogPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed?.args)) {
      continue;
    }
    for (let index = 0; index < parsed.args.length - 1; index += 1) {
      if (parsed.args[index] === `--${expectedMode}` && parsed.args[index + 1] === 'js_repl') {
        return true;
      }
    }
  }
  return false;
}

async function runCloudScenario({
  scenario,
  iteration,
  taskIdBase,
  repoRoot,
  outputDir,
  baseEnv,
  commandTimeoutMs
}) {
  const scenarioTaskId = `${taskIdBase}-cloud-${scenario}-r${iteration}`;
  const scenarioStartedAt = Date.now();
  const env = {
    ...baseEnv,
    MCP_RUNNER_TASK_ID: scenarioTaskId,
    CLOUD_CANARY_TASK_ID: scenarioTaskId,
    TASK: scenarioTaskId,
    CODEX_CLOUD_CANARY_REQUIRED: scenario === 'fallback' ? '0' : '1',
    CLOUD_CANARY_EXPECT_FALLBACK: scenario === 'fallback' ? '1' : '0',
    CODEX_CLOUD_ENABLE_FEATURES: scenario === 'required-enabled' ? 'js_repl' : '',
    CODEX_CLOUD_DISABLE_FEATURES: scenario === 'required-disabled' ? 'js_repl' : ''
  };

  const commandResult = await runCommand('npm', ['run', 'ci:cloud-canary'], {
    cwd: repoRoot,
    env,
    timeout: commandTimeoutMs
  });

  const logFile = join(outputDir, 'cloud', `${scenarioTaskId}.log`);
  await writeFile(
    logFile,
    [
      `# Scenario: ${scenario}`,
      `# Task: ${scenarioTaskId}`,
      `# Exit code: ${commandResult.exitCode}`,
      '## STDOUT',
      commandResult.stdout.trim(),
      '',
      '## STDERR',
      commandResult.stderr.trim(),
      ''
    ].join('\n'),
    'utf8'
  );

  const latest = await resolveLatestManifest(scenarioTaskId, repoRoot, { minMtimeMs: scenarioStartedAt });
  const manifest = latest ? await readJsonIfExists(latest.manifestPath) : null;

  const reasons = [];
  if (commandResult.exitCode !== 0) {
    reasons.push(`expected exit code 0, received ${commandResult.exitCode}`);
  }
  if (!manifest) {
    reasons.push('manifest missing');
  } else if (manifest.status !== 'succeeded') {
    reasons.push(`expected status=succeeded, received ${manifest.status ?? '<missing>'}`);
  } else {
    const manifestTaskId = manifest?.task?.id ?? manifest?.task_id ?? null;
    if (manifestTaskId && manifestTaskId !== scenarioTaskId) {
      reasons.push(`manifest task id mismatch: expected ${scenarioTaskId}, received ${manifestTaskId}`);
    }
  }

  let disableFlagObserved = null;
  if (manifest && (scenario === 'required-disabled' || scenario === 'required-enabled')) {
    const commandLogPath = manifest?.cloud_execution?.log_path
      ? path.resolve(repoRoot, manifest.cloud_execution.log_path)
      : null;
    const expectedMode = scenario === 'required-disabled' ? 'disable' : 'enable';
    const featureFlagObserved = await commandLogHasJsReplFeatureFlag(commandLogPath, expectedMode);
    disableFlagObserved = scenario === 'required-disabled' ? featureFlagObserved : null;
    if (!featureFlagObserved) {
      reasons.push(`expected cloud commands log to include --${expectedMode} js_repl`);
    }
  }

  if (manifest) {
    if (scenario === 'fallback') {
      if (!manifest.cloud_fallback) {
        reasons.push('expected cloud_fallback payload for fallback scenario');
      }
      if (manifest.cloud_execution) {
        reasons.push('expected cloud_execution to be null for fallback scenario');
      }
    } else {
      if (!manifest.cloud_execution) {
        reasons.push('expected cloud_execution payload for required scenario');
      }
      if (manifest.cloud_fallback) {
        reasons.push('expected cloud_fallback to be null for required scenario');
      }
    }
  }

  const result = {
    scenario,
    iteration,
    task_id: scenarioTaskId,
    manifest_path: latest?.manifestPath ?? null,
    exit_code: commandResult.exitCode,
    status: manifest?.status ?? null,
    cloud_execution_status: manifest?.cloud_execution?.status ?? null,
    cloud_fallback_reason: manifest?.cloud_fallback?.reason ?? null,
    disable_flag_observed: disableFlagObserved,
    passed: reasons.length === 0,
    failure_reasons: reasons,
    log_path: logFile
  };
  return result;
}

function summarizeScenario(results, scenario) {
  const scoped = results.filter((result) => result.scenario === scenario);
  const passed = scoped.filter((result) => result.passed).length;
  const total = scoped.length;
  return {
    scenario,
    total,
    passed,
    pass_rate: total > 0 ? passed / total : 0,
    failures: scoped.filter((result) => !result.passed).map((result) => ({
      task_id: result.task_id,
      reasons: result.failure_reasons
    }))
  };
}

async function main() {
  const repoRoot = process.cwd();
  const { args } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'help') || hasFlag(args, 'h')) {
    console.log(`Usage: node scripts/js-repl-usage-matrix.mjs [--task-id <id>] [--output-dir <path>] [--local-repos <n>] [--local-iterations <n>] [--cloud-iterations <n>] [--command-timeout-ms <ms>] [--skip-cloud]`);
    return;
  }

  const taskIdBase =
    (typeof args['task-id'] === 'string' ? args['task-id'] : process.env.MCP_RUNNER_TASK_ID) ||
    'js-repl-usage-matrix';
  const outputDir = path.resolve(
    typeof args['output-dir'] === 'string' && args['output-dir'].trim().length > 0
      ? args['output-dir']
      : join(repoRoot, 'out', taskIdBase, 'manual')
  );
  const localRepos = toPositiveInt(args['local-repos'], DEFAULT_LOCAL_REPOS);
  const localIterations = toPositiveInt(args['local-iterations'], DEFAULT_LOCAL_ITERATIONS);
  const cloudIterations = toPositiveInt(args['cloud-iterations'], DEFAULT_CLOUD_ITERATIONS);
  const commandTimeoutMs = toPositiveInt(args['command-timeout-ms'], DEFAULT_COMMAND_TIMEOUT_MS);
  const skipCloud = asBool(args['skip-cloud']);

  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputDir, 'local'), { recursive: true });
  await mkdir(join(outputDir, 'cloud'), { recursive: true });

  const localTaskId = `${taskIdBase}-local`;
  const localCommand = await runCommand(
    'node',
    [
      'scripts/runtime-mode-canary.mjs',
      '--task-id',
      localTaskId,
      '--repos',
      String(localRepos),
      '--iterations',
      String(localIterations),
      '--output-dir',
      join(outputDir, 'local')
    ],
    { cwd: repoRoot, env: process.env, timeout: commandTimeoutMs }
  );
  await writeFile(
    join(outputDir, 'local', 'runtime-mode-canary.log'),
    [
      `# Task: ${localTaskId}`,
      `# Exit code: ${localCommand.exitCode}`,
      '## STDOUT',
      localCommand.stdout.trim(),
      '',
      '## STDERR',
      localCommand.stderr.trim(),
      ''
    ].join('\n'),
    'utf8'
  );

  const localSummaryPath = join(outputDir, 'local', 'runtime-canary-summary.json');
  const localSummary = await readJsonIfExists(localSummaryPath);
  const localSummaryCheck = checkRuntimeSummary(localSummary);

  const packSmokeCommand = await runCommand('npm', ['run', 'pack:smoke'], {
    cwd: repoRoot,
    env: process.env,
    timeout: commandTimeoutMs
  });
  await writeFile(
    join(outputDir, 'local', 'pack-smoke.log'),
    [
      `# Exit code: ${packSmokeCommand.exitCode}`,
      '## STDOUT',
      packSmokeCommand.stdout.trim(),
      '',
      '## STDERR',
      packSmokeCommand.stderr.trim(),
      ''
    ].join('\n'),
    'utf8'
  );

  const cloudResults = [];
  let cloudPreflightFailure = null;
  if (!skipCloud) {
    if (!process.env.CODEX_CLOUD_ENV_ID) {
      cloudPreflightFailure = 'missing CODEX_CLOUD_ENV_ID; falling back to local mcp';
    } else {
      const baseEnv = {
        ...process.env,
        CODEX_CLOUD_BRANCH: process.env.CODEX_CLOUD_BRANCH || 'main'
      };
      const scenarios = ['required-enabled', 'required-disabled', 'fallback'];
      for (const scenario of scenarios) {
        for (let iteration = 1; iteration <= cloudIterations; iteration += 1) {
          const result = await runCloudScenario({
            scenario,
            iteration,
            taskIdBase,
            repoRoot,
            outputDir,
            baseEnv,
            commandTimeoutMs
          });
          cloudResults.push(result);
        }
      }
    }
  }

  const cloudSummary = {
    required_enabled: summarizeScenario(cloudResults, 'required-enabled'),
    required_disabled: summarizeScenario(cloudResults, 'required-disabled'),
    fallback: summarizeScenario(cloudResults, 'fallback')
  };

  const localPassed = localCommand.exitCode === 0 && localSummaryCheck.passed;
  const packPassed = packSmokeCommand.exitCode === 0;
  const cloudPassed = !skipCloud && !cloudPreflightFailure && cloudResults.length > 0 && cloudResults.every((result) => result.passed);
  const readyForGuidance = localPassed && packPassed && cloudPassed;

  const summary = {
    generated_at: new Date().toISOString(),
    task_id: taskIdBase,
    config: {
      local_repos: localRepos,
      local_iterations: localIterations,
      cloud_iterations: cloudIterations,
      command_timeout_ms: commandTimeoutMs,
      skip_cloud: skipCloud
    },
    local: {
      runtime_mode_canary: {
        task_id: localTaskId,
        exit_code: localCommand.exitCode,
        summary_path: localSummaryPath,
        passed: localPassed,
        failure_reasons: localSummaryCheck.reasons
      },
      pack_smoke: {
        exit_code: packSmokeCommand.exitCode,
        log_path: join(outputDir, 'local', 'pack-smoke.log'),
        passed: packPassed
      }
    },
    cloud: {
      preflight_failure: cloudPreflightFailure,
      total_runs: cloudResults.length,
      scenarios: cloudSummary,
      results: cloudResults
    },
    decision: {
      ready_for_guidance: readyForGuidance,
      recommendation: readyForGuidance ? 'candidate-for-js-repl-guidance' : 'hold-js-repl-guidance',
      notes: skipCloud
        ? 'Cloud scenarios were skipped. Keep js_repl guidance in defer/hold state.'
        : cloudPreflightFailure
          ? `Cloud preflight failed: ${cloudPreflightFailure}. Keep js_repl guidance in defer/hold state.`
        : readyForGuidance
          ? 'All required local/cloud scenarios passed.'
          : 'One or more required scenarios failed. Keep js_repl guidance in defer/hold state.'
    }
  };

  const summaryPath = join(outputDir, 'matrix-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.decision.ready_for_guidance) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(`js-repl-usage-matrix failed: ${(error && error.message) || String(error)}`);
  process.exit(1);
});
