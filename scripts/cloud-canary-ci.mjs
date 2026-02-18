#!/usr/bin/env node

import { appendFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_TASK_ID = 'ci-cloud-canary';
const DEFAULT_TIMEOUT_MS = 25 * 60 * 1000;
const DEFAULT_MANIFEST_WAIT_MS = 45 * 1000;
const DEFAULT_RUN_SUMMARY_WAIT_MS = 20 * 1000;
const DEFAULT_NOTES =
  'Goal: CI cloud canary wiring | Summary: Validate cloud execution manifest + run-summary contracts | Risks: credentials and endpoint availability';
const SKIPPABLE_FAILURE_CATEGORIES = new Set(['configuration', 'credentials']);
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);
const TERMINAL_CLOUD_STATUSES = new Set(['ready', 'failed', 'error', 'cancelled']);

function envFlagEnabled(value) {
  if (!value) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function classifyFailure(signal) {
  const normalized = signal.toLowerCase();
  if (
    normalized.includes('cloud-env-missing') ||
    normalized.includes('codex_cloud_env_id') ||
    normalized.includes('no environment id is configured')
  ) {
    return {
      category: 'configuration',
      guidance: 'Set CODEX_CLOUD_ENV_ID (or metadata.cloudEnvId) for the cloud canary target.'
    };
  }
  if (
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden') ||
    normalized.includes('not logged in') ||
    normalized.includes('login') ||
    normalized.includes('api key') ||
    normalized.includes('credential') ||
    normalized.includes('token')
  ) {
    return {
      category: 'credentials',
      guidance: 'Provide Codex Cloud credentials in CI with access to the configured environment.'
    };
  }
  if (
    normalized.includes('enotfound') ||
    normalized.includes('econn') ||
    normalized.includes('network') ||
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('502') ||
    normalized.includes('503') ||
    normalized.includes('504')
  ) {
    return {
      category: 'connectivity',
      guidance: 'Cloud endpoint connectivity looks unstable; retry and inspect endpoint/network health.'
    };
  }
  if (normalized.includes('failed') || normalized.includes('error') || normalized.includes('cancelled')) {
    return {
      category: 'execution',
      guidance: 'Inspect cloud command logs and manifest cloud_execution.error for the terminal failure cause.'
    };
  }
  return {
    category: 'unknown',
    guidance: 'Inspect manifest status_detail, runner logs, and cloud command logs to classify this failure.'
  };
}

function normalizeCloudBranch(rawBranch) {
  const trimmed = String(rawBranch ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/^refs\/heads\//, '');
}

async function runCommand(command, args, { env = process.env, cwd = process.cwd(), timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 4000).unref();
    }, timeoutMs);
    timeoutHandle.unref();

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      clearTimeout(timeoutHandle);
      resolve({
        exitCode: 1,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });
    child.once('close', (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        exitCode: timedOut ? 124 : typeof code === 'number' ? code : 1,
        stdout,
        stderr: timedOut ? `${stderr}\nTimed out after ${Math.round(timeoutMs / 1000)}s.`.trim() : stderr
      });
    });
  });
}

function tryParseJson(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  const lines = trimmed.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trimStart().startsWith('{')) {
      continue;
    }
    const candidate = lines.slice(index).join('\n');
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }
  return null;
}

function resolveRepoPath(repoRoot, filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return null;
  }
  return isAbsolute(filePath) ? filePath : join(repoRoot, filePath);
}

function tail(text, maxLines = 40) {
  return String(text ?? '')
    .split(/\r?\n/)
    .slice(-maxLines)
    .join('\n')
    .trim();
}

function redactSecrets(text, secrets) {
  return secrets
    .filter((secret) => typeof secret === 'string' && secret.trim().length > 0)
    .reduce((value, secret) => value.split(secret).join('***'), String(text ?? ''));
}

async function waitForManifest(manifestPath, timeoutMs = DEFAULT_MANIFEST_WAIT_MS) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() <= deadline) {
    if (existsSync(manifestPath)) {
      try {
        const parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
        latest = parsed;
        if (TERMINAL_STATUSES.has(String(parsed?.status ?? ''))) {
          return parsed;
        }
      } catch {
        // Retry while the file is being written.
      }
    }
    await sleep(500);
  }
  return latest;
}

async function waitForRunSummary(runSummaryPath, timeoutMs = DEFAULT_RUN_SUMMARY_WAIT_MS) {
  if (!runSummaryPath) {
    return null;
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (existsSync(runSummaryPath)) {
      try {
        return JSON.parse(await readFile(runSummaryPath, 'utf8'));
      } catch {
        // Retry while the file is being written.
      }
    }
    await sleep(500);
  }
  return null;
}

async function appendStepSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }
  await appendFile(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

function findManifestPath(repoRoot, taskId, startResult) {
  const directManifestPath = startResult?.manifest;
  if (typeof directManifestPath === 'string' && directManifestPath.trim().length > 0) {
    return resolveRepoPath(repoRoot, directManifestPath);
  }

  const artifactRoot = startResult?.manifest?.artifact_root;
  if (typeof artifactRoot === 'string' && artifactRoot.trim().length > 0) {
    return join(repoRoot, artifactRoot, 'manifest.json');
  }
  const topLevelArtifactRoot = startResult?.artifact_root;
  if (typeof topLevelArtifactRoot === 'string' && topLevelArtifactRoot.trim().length > 0) {
    return join(repoRoot, topLevelArtifactRoot, 'manifest.json');
  }
  const runId = startResult?.manifest?.run_id;
  if (typeof runId === 'string' && runId.trim().length > 0) {
    return join(repoRoot, '.runs', taskId, 'cli', runId, 'manifest.json');
  }
  const topLevelRunId = startResult?.run_id;
  if (typeof topLevelRunId === 'string' && topLevelRunId.trim().length > 0) {
    return join(repoRoot, '.runs', taskId, 'cli', topLevelRunId, 'manifest.json');
  }
  return null;
}

async function main() {
  const repoRoot = process.cwd();
  const taskId = process.env.CLOUD_CANARY_TASK_ID?.trim() || process.env.MCP_RUNNER_TASK_ID?.trim() || DEFAULT_TASK_ID;
  const required = envFlagEnabled(process.env.CODEX_CLOUD_CANARY_REQUIRED);
  const expectFallback = envFlagEnabled(process.env.CLOUD_CANARY_EXPECT_FALLBACK);
  const notes = process.env.CLOUD_CANARY_NOTES?.trim() || DEFAULT_NOTES;
  const cloudBranchRaw = process.env.CLOUD_CANARY_BRANCH?.trim() || process.env.CODEX_CLOUD_BRANCH?.trim() || 'main';
  const cloudBranch = normalizeCloudBranch(cloudBranchRaw);
  const preflightIssues = [];
  const orchestratorBinPath = join(repoRoot, 'dist', 'bin', 'codex-orchestrator.js');

  if (!expectFallback && !process.env.CODEX_CLOUD_ENV_ID) {
    preflightIssues.push('Missing CODEX_CLOUD_ENV_ID.');
  }
  if (!existsSync(orchestratorBinPath)) {
    preflightIssues.push('Missing dist/bin/codex-orchestrator.js. Run npm run build first.');
  }

  const codexCheck = await runCommand('codex', ['--version'], { cwd: repoRoot, timeoutMs: 10000 });
  if (codexCheck.exitCode !== 0) {
    preflightIssues.push('Codex CLI is unavailable (`codex --version` failed).');
  }
  if (!cloudBranch) {
    preflightIssues.push('Cloud branch is empty after normalization.');
  } else {
    const branchCheck = await runCommand('git', ['ls-remote', '--exit-code', '--heads', 'origin', cloudBranch], {
      cwd: repoRoot,
      timeoutMs: 10000
    });
    if (branchCheck.exitCode !== 0) {
      preflightIssues.push(
        `Cloud branch '${cloudBranch}' was not found on origin. Push it first or set CLOUD_CANARY_BRANCH/CODEX_CLOUD_BRANCH to an existing remote branch.`
      );
    }
  }

  if (preflightIssues.length > 0) {
    const summaryLines = [
      '## Cloud Canary (Skipped)',
      '',
      ...preflightIssues.map((issue) => `- ${issue}`),
      '',
      `Expected contract: ${expectFallback ? 'fallback' : 'cloud execution'}`,
      `Cloud branch: ${cloudBranch || '<unset>'}`,
      '',
      `Required mode: ${required ? 'yes' : 'no'}`
    ];
    console.log(summaryLines.join('\n'));
    await appendStepSummary(summaryLines);
    if (required || expectFallback) {
      process.exitCode = 1;
    }
    return;
  }

  const commandEnv = {
    ...process.env,
    MCP_RUNNER_TASK_ID: taskId,
    TASK: taskId,
    NOTES: notes,
    CODEX_CLOUD_ENV_ID: expectFallback ? '' : process.env.CODEX_CLOUD_ENV_ID,
    CODEX_CLOUD_BRANCH: cloudBranch,
    CODEX_NON_INTERACTIVE: process.env.CODEX_NON_INTERACTIVE ?? '1',
    CODEX_NO_INTERACTIVE: process.env.CODEX_NO_INTERACTIVE ?? '1',
    CODEX_INTERACTIVE: process.env.CODEX_INTERACTIVE ?? '0'
  };

  const runArgs = [
    orchestratorBinPath,
    'start',
    'docs-review',
    '--execution-mode',
    'cloud',
    '--target',
    'review',
    '--format',
    'json',
    '--no-interactive',
    '--task',
    taskId
  ];

  const execution = await runCommand('node', runArgs, {
    env: commandEnv,
    cwd: repoRoot,
    timeoutMs: DEFAULT_TIMEOUT_MS
  });

  const startResult = tryParseJson(execution.stdout);
  const manifestPath = findManifestPath(repoRoot, taskId, startResult);
  const manifest = manifestPath ? await waitForManifest(manifestPath) : null;
  const hasManifest = Boolean(manifest);
  const cloudExecution = manifest?.cloud_execution ?? null;
  const cloudFallback = manifest?.cloud_fallback ?? null;
  const runSummaryPath = resolveRepoPath(repoRoot, manifest?.run_summary_path ?? null);
  const runSummary = await waitForRunSummary(runSummaryPath);
  const hasRunSummary = Boolean(runSummary);

  const assertionFailures = [];
  const warnings = [];
  const assert = (condition, message) => {
    if (!condition) {
      assertionFailures.push(message);
    }
  };

  assert(execution.exitCode === 0, `Canary command failed with exit code ${execution.exitCode}.`);
  assert(Boolean(startResult), 'Failed to parse JSON output from codex-orchestrator start.');
  assert(Boolean(manifestPath && hasManifest), 'Manifest path could not be resolved from canary output.');
  if (manifest) {
    assert(TERMINAL_STATUSES.has(String(manifest.status ?? '')), `Manifest did not reach terminal state; received ${manifest.status}.`);
  }
  assert(Boolean(runSummaryPath && hasRunSummary), 'Run summary file missing.');

  if (expectFallback) {
    assert(manifest?.status === 'succeeded', `Fallback canary run should succeed; received manifest.status=${manifest?.status ?? '<unknown>'}.`);
    assert(!cloudExecution, 'manifest.cloud_execution should be absent when fallback contract is expected.');
    assert(Boolean(cloudFallback), 'manifest.cloud_fallback is missing.');
    if (cloudFallback) {
      assert(cloudFallback.mode_requested === 'cloud', 'cloud_fallback.mode_requested should be "cloud".');
      assert(cloudFallback.mode_used === 'mcp', 'cloud_fallback.mode_used should be "mcp".');
      assert(typeof cloudFallback.reason === 'string' && cloudFallback.reason.trim().length > 0, 'cloud_fallback.reason is missing.');
      assert(Array.isArray(cloudFallback.issues) && cloudFallback.issues.length > 0, 'cloud_fallback.issues should include at least one preflight issue.');
      if (Array.isArray(cloudFallback.issues)) {
        assert(
          cloudFallback.issues.some((issue) => issue?.code === 'missing_environment'),
          'cloud_fallback.issues should include missing_environment for fallback canary mode.'
        );
      }
    }

    const summaryFallback = runSummary?.cloudFallback ?? runSummary?.build?.cloudFallback ?? null;
    assert(Boolean(summaryFallback), 'run-summary.cloudFallback is missing.');
    if (summaryFallback && cloudFallback) {
      assert(
        summaryFallback.modeRequested === cloudFallback.mode_requested,
        'run-summary.cloudFallback.modeRequested does not match manifest.cloud_fallback.mode_requested.'
      );
      assert(
        summaryFallback.modeUsed === cloudFallback.mode_used,
        'run-summary.cloudFallback.modeUsed does not match manifest.cloud_fallback.mode_used.'
      );
      assert(
        summaryFallback.reason === cloudFallback.reason,
        'run-summary.cloudFallback.reason does not match manifest.cloud_fallback.reason.'
      );
    }
  } else {
    assert(Boolean(cloudExecution), 'manifest.cloud_execution is missing.');
    if (cloudExecution) {
      assert(typeof cloudExecution.task_id === 'string' && cloudExecution.task_id.trim().length > 0, 'cloud_execution.task_id is missing.');
      assert(
        TERMINAL_CLOUD_STATUSES.has(String(cloudExecution.status ?? '')),
        `Cloud task did not reach terminal status; received ${cloudExecution.status}.`
      );
      assert(typeof cloudExecution.submitted_at === 'string' && cloudExecution.submitted_at.length > 0, 'cloud_execution.submitted_at is missing.');
      assert(typeof cloudExecution.completed_at === 'string' && cloudExecution.completed_at.length > 0, 'cloud_execution.completed_at is missing.');
      assert(typeof cloudExecution.poll_count === 'number' && cloudExecution.poll_count > 0, 'cloud_execution.poll_count should be greater than zero.');
      assert(typeof cloudExecution.log_path === 'string' && cloudExecution.log_path.length > 0, 'cloud_execution.log_path is missing.');
      const cloudLogPath = resolveRepoPath(repoRoot, cloudExecution.log_path);
      assert(Boolean(cloudLogPath && existsSync(cloudLogPath)), `Cloud command log missing at ${cloudExecution.log_path}.`);
      if (cloudExecution.diff_status === 'available') {
        assert(typeof cloudExecution.diff_path === 'string' && cloudExecution.diff_path.length > 0, 'cloud_execution.diff_path missing while diff_status=available.');
        const diffPath = resolveRepoPath(repoRoot, cloudExecution.diff_path);
        assert(Boolean(diffPath && existsSync(diffPath)), `Cloud diff artifact missing at ${cloudExecution.diff_path}.`);
      }
      assert(cloudExecution.status === 'ready', `Cloud task reached terminal non-ready status: ${cloudExecution.status}.`);
    }

    const summaryCloud = runSummary?.cloudExecution ?? runSummary?.build?.cloudExecution ?? null;
    assert(Boolean(summaryCloud), 'run-summary.cloudExecution is missing.');
    if (summaryCloud && cloudExecution) {
      assert(summaryCloud.taskId === cloudExecution.task_id, 'run-summary.cloudExecution.taskId does not match manifest.cloud_execution.task_id.');
      assert(summaryCloud.status === cloudExecution.status, 'run-summary.cloudExecution.status does not match manifest.cloud_execution.status.');
      assert(summaryCloud.diffStatus === cloudExecution.diff_status, 'run-summary.cloudExecution.diffStatus does not match manifest.cloud_execution.diff_status.');
      assert(summaryCloud.logPath === cloudExecution.log_path, 'run-summary.cloudExecution.logPath does not match manifest.cloud_execution.log_path.');
    }
  }

  const failureSignal = [
    expectFallback ? '' : cloudFallback?.reason ?? '',
    cloudExecution?.error ?? '',
    manifest?.status_detail ?? '',
    execution.stderr ?? '',
    tail(execution.stdout, 20)
  ]
    .filter((value) => value.trim().length > 0)
    .join('\n');
  const diagnosis = classifyFailure(failureSignal);
  const fallbackContractFailure = expectFallback
    && assertionFailures.some((failure) => failure.includes('cloud_fallback') || failure.includes('cloudFallback'));
  const fatalCategory =
    required &&
    (diagnosis.category === 'configuration' || diagnosis.category === 'credentials' || diagnosis.category === 'connectivity');
  const skipEligible = !required && !fallbackContractFailure && SKIPPABLE_FAILURE_CATEGORIES.has(diagnosis.category);
  if (fatalCategory) {
    assertionFailures.push(`Failure class ${diagnosis.category} indicates infrastructure/credential issues.`);
  }

  if (assertionFailures.length === 0) {
    const successHeader = expectFallback
      ? warnings.length > 0
        ? '## Cloud Canary Fallback Contract (Passed with Warnings)'
        : '## Cloud Canary Fallback Contract (Passed)'
      : warnings.length > 0
        ? '## Cloud Canary (Passed with Warnings)'
        : '## Cloud Canary (Passed)';
    const successLines = [
      successHeader,
      '',
      `- Task ID: ${taskId}`,
      `- Manifest: ${manifestPath}`,
      `- Run summary: ${runSummaryPath}`,
      `- Expected contract: ${expectFallback ? 'fallback' : 'cloud execution'}`,
      `- Cloud branch: ${cloudBranch}`,
      `- Cloud task: ${cloudExecution?.task_id ?? '<none>'}`,
      `- Cloud status URL: ${cloudExecution?.status_url ?? '<none>'}`,
      `- Fallback reason: ${cloudFallback?.reason ?? '<none>'}`
    ];
    if (warnings.length > 0) {
      successLines.push('', ...warnings.map((warning) => `- Warning: ${warning}`));
    }
    console.log(successLines.join('\n'));
    await appendStepSummary(successLines);
    return;
  }

  const header = skipEligible
    ? expectFallback
      ? '## Cloud Canary Fallback Contract (Credential-Gated Skip)'
      : '## Cloud Canary (Credential-Gated Skip)'
    : expectFallback
      ? '## Cloud Canary Fallback Contract (Failed)'
      : '## Cloud Canary (Failed)';
  const redactedStderr = redactSecrets(tail(execution.stderr, 80), [
    process.env.CODEX_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.GITHUB_TOKEN
  ]);
  const details = [
    header,
    '',
    ...assertionFailures.map((failure) => `- ${failure}`),
    '',
    `Failure class: ${diagnosis.category}`,
    `Guidance: ${diagnosis.guidance}`,
    `Manifest: ${manifestPath ?? '<unresolved>'}`,
    `Run summary: ${runSummaryPath ?? '<unresolved>'}`,
    `Runner stderr (tail):`,
    '```',
    redactedStderr || '<empty>',
    '```'
  ];
  console.error(details.join('\n'));
  await appendStepSummary(details);
  process.exitCode = skipEligible ? 0 : 1;
}

main().catch(async (error) => {
  const message = (error instanceof Error ? error.stack ?? error.message : String(error)).trim();
  console.error(`Cloud canary crashed:\n${message}`);
  await appendStepSummary(['## Cloud Canary (Failed)', '', 'Unhandled exception:', '```', message, '```']);
  process.exitCode = 1;
});
