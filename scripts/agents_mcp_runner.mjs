#!/usr/bin/env node
/**
 * Agents SDK-based MCP diagnostics runner (Node.js edition).
 *
 * Enhancements:
 * - Task-scoped artifact directories under .runs/0001/mcp/<run-id>/.
 * - Backward-compatible pointers under .runs/local-mcp/<run-id>/.
 * - Heartbeat + resume-token support for durable runs.
 * - Metrics emission to .runs/0001/metrics.json after each run.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

import { MCPServerStdio } from '@openai/agents-core';
import { setDefaultOpenAIKey } from '@openai/agents-openai';

const TASK_ID = '0001';
const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_STALE_THRESHOLD_MS = 30_000;
const DEFAULT_COMMANDS = [
  'npm run build',
  'npm run lint',
  'npm run test',
  'bash scripts/spec-guard.sh --dry-run',
];
const TERMINAL_STATES = new Set(['succeeded', 'failed', 'cancelled']);

const PROMPT_TEMPLATE = `You are operating the Codex CLI via MCP.
Run the exact shell command: {command}

Instructions:
- Use the Codex run tool exactly once to execute the command.
- Do not modify files before the command unless required by the command itself.
- Stream output until the command finishes.
- When finished, respond ONLY with a JSON object containing: exit_code (integer), summary (string), manifest_path (string or null).
- The JSON must be the entire final message (no markdown).
`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(process.env.MCP_RUNNER_REPO_ROOT ?? path.join(__dirname, '..'));
const taskRunsRoot = path.resolve(
  process.env.MCP_RUNNER_TASK_RUNS_ROOT ?? path.join(repoRoot, '.runs', TASK_ID, 'mcp'),
);
const legacyRunsRoot = path.resolve(
  process.env.MCP_RUNNER_LEGACY_ROOT ?? path.join(repoRoot, '.runs', 'local-mcp'),
);
const metricsRoot = path.resolve(
  process.env.MCP_RUNNER_METRICS_ROOT ?? path.join(repoRoot, '.runs', TASK_ID),
);
const metricsFilePath = path.join(metricsRoot, 'metrics.json');

function isoTimestamp(date = new Date()) {
  return date.toISOString();
}

function timestampForRunId(date = new Date()) {
  return isoTimestamp(date).replace(/[:.]/g, '-');
}

function generateRunId() {
  return `${timestampForRunId()}-${process.pid}`;
}

async function writeJsonAtomic(targetPath, data) {
  const tmpPath = `${targetPath}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(tmpPath, payload, 'utf8');
  await fs.rename(tmpPath, targetPath);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(targetPath) {
  const raw = await fs.readFile(targetPath, 'utf8');
  return JSON.parse(raw);
}

function slugify(command) {
  const cleaned = command.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-');
  return cleaned.replace(/^-|-$/g, '').slice(0, 60) || 'command';
}

function extractSummary(content) {
  if (!Array.isArray(content)) {
    return null;
  }
  const texts = [];
  for (const item of content) {
    if (item && typeof item === 'object' && item.type === 'text') {
      const value = item.text?.value ?? item.text ?? '';
      if (typeof value === 'string') {
        texts.push(value.trim());
      }
    }
  }
  return texts.length ? texts.join('\n').trim() : null;
}

function parseJsonPayload(summary) {
  if (!summary || !summary.trim().startsWith('{')) {
    return null;
  }
  try {
    return JSON.parse(summary);
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRunPaths(runId) {
  const runDir = path.join(taskRunsRoot, runId);
  const compatDir = path.join(legacyRunsRoot, runId);
  return {
    runDir,
    compatDir,
    manifestPath: path.join(runDir, 'manifest.json'),
    heartbeatPath: path.join(runDir, '.heartbeat'),
    resumeTokenPath: path.join(runDir, '.resume-token'),
    logPath: path.join(runDir, 'runner.log'),
  };
}

async function createCompatibilityPointer(runId, manifestPath, runDir) {
  const compatDir = path.join(legacyRunsRoot, runId);
  await fs.mkdir(compatDir, { recursive: true });

  const legacyManifestPath = path.join(compatDir, 'manifest.json');
  const compatInfoPath = path.join(compatDir, 'compat.json');
  const relativeManifestFromCompat = path.relative(compatDir, manifestPath);
  const artifactRootRelative = path.relative(repoRoot, runDir);
  const manifestRelative = path.relative(repoRoot, manifestPath);

  let pointerType = 'symlink';
  try {
    await fs.rm(legacyManifestPath, { force: true });
    await fs.symlink(relativeManifestFromCompat, legacyManifestPath);
  } catch (error) {
    pointerType = 'stub';
    const stub = {
      redirect_to: artifactRootRelative,
      manifest: manifestRelative,
      created_at: isoTimestamp(),
      note: 'Compatibility pointer generated by MCP runner; prefer artifact_root.',
    };
    try {
      await writeJsonAtomic(legacyManifestPath, stub);
    } catch (writeError) {
      throw new Error(
        `Failed to create compatibility pointer: ${writeError.message ?? writeError}`,
      );
    }
  }

  await writeJsonAtomic(compatInfoPath, {
    artifact_root: artifactRootRelative,
    manifest: manifestRelative,
    pointer: pointerType,
    created_at: isoTimestamp(),
  });

  return { compatDir, pointerType };
}

async function saveManifest(manifestPath, manifest) {
  manifest.updated_at = isoTimestamp();
  await writeJsonAtomic(manifestPath, manifest);
}

async function updateHeartbeat(manifest, manifestPath, heartbeatPath) {
  manifest.heartbeat_at = isoTimestamp();
  manifest.status_detail = null;
  await saveManifest(manifestPath, manifest);
  await fs.writeFile(heartbeatPath, `${manifest.heartbeat_at}\n`, 'utf8');
}

function computeHeartbeatState(manifest) {
  if (!manifest?.heartbeat_at) {
    return { ageSeconds: null, stale: false };
  }
  const parsed = Date.parse(manifest.heartbeat_at);
  if (Number.isNaN(parsed)) {
    return { ageSeconds: null, stale: false };
  }
  const ageMs = Date.now() - parsed;
  return {
    ageSeconds: Math.max(0, ageMs / 1000),
    stale: ageMs > HEARTBEAT_STALE_THRESHOLD_MS,
  };
}

function isProcessAlive(pid) {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function guardrailCommandPresent(commands) {
  return commands.some(
    (entry) => entry.command.includes('scripts/spec-guard.sh') && entry.status === 'succeeded',
  );
}

function ensureResumeEvents(manifest) {
  if (!Array.isArray(manifest.resume_events)) {
    manifest.resume_events = [];
  }
}

async function recordResumeAttempt(manifest, manifestPath, event) {
  ensureResumeEvents(manifest);
  manifest.resume_events.push({
    timestamp: isoTimestamp(),
    ...event,
  });
  await saveManifest(manifestPath, manifest);
}

async function appendMetricsEntry(manifest, manifestPath) {
  if (manifest.metrics_recorded === true) {
    return;
  }
  if (!TERMINAL_STATES.has(manifest.status)) {
    return;
  }

  const startedAt = manifest.started_at ? Date.parse(manifest.started_at) : NaN;
  const completedAt = manifest.completed_at ? Date.parse(manifest.completed_at) : NaN;
  const durationSeconds = Number.isNaN(startedAt) || Number.isNaN(completedAt)
    ? null
    : Math.max(0, (completedAt - startedAt) / 1000);

  const commandsPassed = (manifest.commands ?? []).filter((cmd) => cmd.status === 'succeeded').length;
  const commandsFailed = (manifest.commands ?? []).filter((cmd) => cmd.status === 'failed').length;
  const artifactPath = manifest.artifact_root ?? path.relative(repoRoot, path.dirname(manifestPath));

  const entry = {
    run_id: manifest.run_id,
    task_id: manifest.task_id ?? TASK_ID,
    started_at: manifest.started_at ?? null,
    completed_at: manifest.completed_at ?? null,
    duration_seconds: durationSeconds,
    status: manifest.status,
    commands_passed: commandsPassed,
    commands_failed: commandsFailed,
    guardrails_present: guardrailCommandPresent(manifest.commands ?? []),
    artifact_path: artifactPath,
    recorded_at: isoTimestamp(),
  };

  await fs.mkdir(metricsRoot, { recursive: true });
  await fs.appendFile(metricsFilePath, `${JSON.stringify(entry)}\n`, 'utf8');
  manifest.metrics_recorded = true;
  await saveManifest(manifestPath, manifest);
}

async function startRun(options) {
  const {
    commands = [],
    approvalPolicy = 'never',
    timeoutSeconds = 3600,
    format = 'text',
  } = options;

  const runCommands = commands.length > 0 ? commands : DEFAULT_COMMANDS;
  const runId = generateRunId();
  const { runDir, compatDir, manifestPath, heartbeatPath, resumeTokenPath, logPath } = getRunPaths(runId);

  await fs.mkdir(runDir, { recursive: true });

  const commandEntries = runCommands.map((command, index) => ({
    index: index + 1,
    command,
    status: 'pending',
    started_at: null,
    completed_at: null,
    exit_code: null,
    manifest_path: null,
    response_file: null,
    summary: null,
  }));

  const now = isoTimestamp();
  const resumeToken = crypto.randomBytes(32).toString('hex');
  const manifest = {
    runner: 'agents-sdk',
    script: 'scripts/agents_mcp_runner.mjs',
    status: 'queued',
    status_detail: null,
    commands: commandEntries,
    started_at: now,
    updated_at: now,
    completed_at: null,
    run_id: runId,
    repo_root: repoRoot,
    approval_policy: approvalPolicy,
    timeout_seconds: timeoutSeconds,
    runner_pid: null,
    runner_log: path.relative(repoRoot, logPath),
    task_id: TASK_ID,
    artifact_root: path.relative(repoRoot, runDir),
    compat_path: path.relative(repoRoot, compatDir),
    heartbeat_at: now,
    heartbeat_interval_seconds: HEARTBEAT_INTERVAL_MS / 1000,
    heartbeat_stale_after_seconds: HEARTBEAT_STALE_THRESHOLD_MS / 1000,
    resume_token: resumeToken,
    resume_events: [],
    metrics_recorded: false,
  };

  try {
    await writeJsonAtomic(manifestPath, manifest);
    await fs.writeFile(resumeTokenPath, `${resumeToken}\n`, 'utf8');
    await fs.writeFile(heartbeatPath, `${now}\n`, 'utf8');
    await createCompatibilityPointer(runId, manifestPath, runDir);
  } catch (error) {
    await fs.rm(runDir, { recursive: true, force: true });
    await fs.rm(compatDir, { recursive: true, force: true });
    throw error;
  }

  const child = spawn(process.execPath, [__filename, 'execute', '--run-id', runId], {
    cwd: repoRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logStream = createWriteStream(logPath, { flags: 'a' });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  manifest.runner_pid = child.pid;
  manifest.status = 'in_progress';
  await saveManifest(manifestPath, manifest);

  const outputPayload = {
    run_id: runId,
    artifact_root: manifest.artifact_root,
    compat_path: manifest.compat_path,
    manifest: path.relative(repoRoot, manifestPath),
    runner_pid: child.pid,
  };

  if (format === 'json') {
    console.log(JSON.stringify(outputPayload, null, 2));
  } else {
    console.log(`Run ID: ${runId}`);
    console.log(`Artifact root: ${manifest.artifact_root}`);
    console.log(`Compatibility path: ${manifest.compat_path}`);
    console.log(`Manifest: ${outputPayload.manifest}`);
    console.log(`Runner PID: ${child.pid}`);
    console.log(`Use 'scripts/mcp-runner-poll.sh ${runId}' to monitor progress.`);
  }

  return { runId, manifestPath, runDir, compatDir, childPid: child.pid };
}

async function executeRun(runId) {
  const { manifestPath, heartbeatPath, runDir } = getRunPaths(runId);
  const manifest = await readJson(manifestPath);
  const timeoutSeconds = Number(manifest.timeout_seconds ?? 3600);
  const approvalPolicy = manifest.approval_policy ?? 'never';
  const commands = manifest.commands ?? [];

  if (process.env.OPENAI_API_KEY) {
    setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
  }

  const server = new MCPServerStdio({
    command: path.join(repoRoot, 'scripts', 'run-local-mcp.sh'),
    args: ['--repo', repoRoot, '--no-log'],
    cwd: repoRoot,
    clientSessionTimeoutSeconds: timeoutSeconds,
    name: 'codex-local',
  });

  await server.connect();

  manifest.runner_pid = process.pid;
  manifest.status_detail = null;
  await updateHeartbeat(manifest, manifestPath, heartbeatPath);

  let heartbeatActive = true;
  const heartbeatLoop = (async () => {
    while (heartbeatActive) {
      await sleep(HEARTBEAT_INTERVAL_MS);
      if (!heartbeatActive) {
        break;
      }
      try {
        await updateHeartbeat(manifest, manifestPath, heartbeatPath);
      } catch (error) {
        // Non-fatal: surface error in runner log and continue.
        console.error(`Heartbeat update failed: ${error.message ?? error}`);
      }
    }
  })();

  try {
    for (const entry of commands) {
      entry.status = 'running';
      entry.started_at = isoTimestamp();
      await saveManifest(manifestPath, manifest);

      const prompt = PROMPT_TEMPLATE.replace('{command}', entry.command);
      let response;
      try {
        response = await server.callTool('codex', {
          approval_policy: approvalPolicy,
          prompt,
        });
      } catch (error) {
        entry.status = 'failed';
        entry.completed_at = isoTimestamp();
        entry.summary = `Tool invocation failed: ${error.message ?? error}`;
        manifest.status = 'failed';
        manifest.status_detail = 'tool-invocation-error';
        manifest.completed_at = isoTimestamp();
        await saveManifest(manifestPath, manifest);
        await appendMetricsEntry(manifest, manifestPath);
        process.exitCode = 1;
        throw error;
      }

      const normalizedResponse = JSON.parse(JSON.stringify(response));
      const responseFile = path.join(
        runDir,
        `${String(entry.index).padStart(2, '0')}-${slugify(entry.command)}.json`,
      );
      await writeJsonAtomic(responseFile, normalizedResponse);
      entry.response_file = path.relative(repoRoot, responseFile);

      const summary = Array.isArray(normalizedResponse)
        ? extractSummary(normalizedResponse)
        : extractSummary(normalizedResponse?.content);
      const parsed = parseJsonPayload(summary);
      entry.completed_at = isoTimestamp();

      if (parsed) {
        entry.exit_code = parsed.exit_code ?? null;
        entry.summary = parsed.summary ?? summary;
        entry.manifest_path = parsed.manifest_path ?? null;
        entry.status = parsed.exit_code === 0 ? 'succeeded' : 'failed';
      } else {
        entry.summary = summary;
        entry.status = entry.exit_code === 0 ? 'succeeded' : entry.status;
        if (entry.status === 'running') {
          entry.status = 'succeeded';
        }
      }

      await saveManifest(manifestPath, manifest);

      if (entry.status === 'failed') {
        manifest.status = 'failed';
        manifest.status_detail = 'command-failed';
        manifest.completed_at = isoTimestamp();
        await saveManifest(manifestPath, manifest);
        await appendMetricsEntry(manifest, manifestPath);
        process.exitCode = 1;
        return;
      }
    }

    manifest.status = 'succeeded';
    manifest.completed_at = isoTimestamp();
    manifest.status_detail = null;
    await saveManifest(manifestPath, manifest);
    await appendMetricsEntry(manifest, manifestPath);
    process.exitCode = 0;
  } finally {
    heartbeatActive = false;
    await heartbeatLoop;
    await server.close();
  }
}

function renderStatus(manifest) {
  console.log(`\nRun ${manifest.run_id} status: ${manifest.status}`);
  if (manifest.status_detail) {
    console.log(`Status detail: ${manifest.status_detail}`);
  }
  console.log(`Started: ${manifest.started_at}`);
  if (manifest.completed_at) {
    console.log(`Completed: ${manifest.completed_at}`);
  }
  const heartbeatState = computeHeartbeatState(manifest);
  if (heartbeatState.ageSeconds !== null) {
    const ageDisplay = heartbeatState.ageSeconds.toFixed(1);
    console.log(`Heartbeat age: ${ageDisplay}s${heartbeatState.stale ? ' (STALE)' : ''}`);
  }
  console.log('Commands:');
  for (const entry of manifest.commands ?? []) {
    console.log(`  ${entry.index}. ${entry.command} -> ${entry.status}`);
    if (entry.summary) {
      console.log(`     summary: ${entry.summary}`);
    }
    if (entry.response_file) {
      console.log(`     response: ${entry.response_file}`);
    }
  }
}

async function resolveManifestPath(runId) {
  const { manifestPath, compatDir } = getRunPaths(runId);
  if (await pathExists(manifestPath)) {
    return manifestPath;
  }
  const legacyManifestPath = path.join(compatDir, 'manifest.json');
  if (!(await pathExists(legacyManifestPath))) {
    throw new Error(`Manifest for run ${runId} not found.`);
  }
  const legacyPayload = await readJson(legacyManifestPath).catch(() => null);
  if (legacyPayload && legacyPayload.redirect_to) {
    const redirected = legacyPayload.manifest
      ? path.resolve(repoRoot, legacyPayload.manifest)
      : path.resolve(repoRoot, legacyPayload.redirect_to, 'manifest.json');
    if (await pathExists(redirected)) {
      return redirected;
    }
  }
  return legacyManifestPath;
}

async function pollRun(runId, { watch = false, interval = 10 }) {
  const manifestPath = await resolveManifestPath(runId);

  do {
    const manifest = await readJson(manifestPath);
    const heartbeatState = computeHeartbeatState(manifest);
    if (!TERMINAL_STATES.has(manifest.status) && heartbeatState.stale && manifest.status_detail !== 'stale-heartbeat') {
      manifest.status_detail = 'stale-heartbeat';
      await saveManifest(manifestPath, manifest);
    }

    renderStatus(manifest);
    if (!watch || TERMINAL_STATES.has(manifest.status)) {
      break;
    }
    await sleep(interval * 1000);
  } while (true);
}

async function resumeRun(options) {
  const {
    runId,
    resumeToken: providedToken,
    actor = 'cli',
    reason = 'manual-resume',
    format = 'text',
  } = options;

  if (!runId) {
    throw new Error('Resume requires --run-id <id>.');
  }

  const { manifestPath, resumeTokenPath, heartbeatPath, logPath, runDir, compatDir } = getRunPaths(runId);
  const manifest = await readJson(manifestPath);
  ensureResumeEvents(manifest);

  const recordBlocked = async (detail) => {
    await recordResumeAttempt(manifest, manifestPath, {
      actor,
      reason,
      outcome: 'blocked',
      detail,
    });
  };

  if (TERMINAL_STATES.has(manifest.status)) {
    await recordBlocked(`terminal-status:${manifest.status}`);
    throw new Error(`Run ${runId} is already ${manifest.status}; cannot resume.`);
  }

  if (isProcessAlive(manifest.runner_pid)) {
    await recordBlocked(`runner-active:${manifest.runner_pid}`);
    throw new Error(`Run ${runId} still has active PID ${manifest.runner_pid}.`);
  }

  let storedToken = manifest.resume_token ?? null;
  if (!storedToken) {
    try {
      const diskToken = await fs.readFile(resumeTokenPath, 'utf8');
      storedToken = diskToken.toString().trim();
    } catch (error) {
      await recordBlocked(`resume-token-read-error:${error?.code ?? 'unknown'}`);
      throw new Error(`Resume token not found for run ${runId}.`);
    }
  }

  if (!storedToken) {
    await recordBlocked('missing-resume-token');
    throw new Error(`Resume token not found for run ${runId}.`);
  }

  if (providedToken && storedToken !== providedToken) {
    await recordBlocked('resume-token-mismatch');
    throw new Error('Resume token mismatch.');
  }

  manifest.resume_token = storedToken;
  manifest.resume_events.push({
    timestamp: isoTimestamp(),
    actor,
    reason,
    outcome: 'accepted',
    detail: 'resume-started',
  });
  manifest.status_detail = 'resuming';
  await saveManifest(manifestPath, manifest);
  await fs.writeFile(heartbeatPath, `${isoTimestamp()}\n`, 'utf8');

  const child = spawn(process.execPath, [__filename, 'execute', '--run-id', runId], {
    cwd: repoRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logStream = createWriteStream(logPath, { flags: 'a' });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  manifest.runner_pid = child.pid;
  manifest.status = 'in_progress';
  manifest.status_detail = null;
  await saveManifest(manifestPath, manifest);

  const payload = {
    run_id: runId,
    artifact_root: manifest.artifact_root,
    compat_path: manifest.compat_path ?? path.relative(repoRoot, compatDir),
    manifest: path.relative(repoRoot, manifestPath),
    runner_pid: child.pid,
    resume_token: storedToken,
  };

  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Resumed run ${runId}.`);
    console.log(`Artifact root: ${payload.artifact_root}`);
    console.log(`Compatibility path: ${payload.compat_path}`);
    console.log(`Manifest: ${payload.manifest}`);
    console.log(`Runner PID: ${child.pid}`);
  }

  return { runId, manifestPath, runDir, compatDir, childPid: child.pid };
}

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new Error('Usage: scripts/agents_mcp_runner.mjs <start|poll|execute|resume> [...]');
  }

  const [command, ...rest] = argv;
  switch (command) {
    case 'start': {
      const options = {
        commands: [],
        approvalPolicy: 'never',
        timeoutSeconds: 3600,
        format: 'text',
      };

      for (let i = 0; i < rest.length; i += 1) {
        const arg = rest[i];
        switch (arg) {
          case '--command': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--command requires a value');
            }
            options.commands.push(value);
            break;
          }
          case '--approval-policy': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--approval-policy requires a value');
            }
            options.approvalPolicy = value;
            break;
          }
          case '--timeout': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--timeout requires a numeric value');
            }
            options.timeoutSeconds = Number(value);
            break;
          }
          case '--format': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--format requires a value');
            }
            options.format = value;
            break;
          }
          default:
            throw new Error(`Unknown option for start: ${arg}`);
        }
      }
      return { command, options };
    }
    case 'poll': {
      if (rest.length === 0) {
        throw new Error('Usage: scripts/agents_mcp_runner.mjs poll <run-id> [--watch] [--interval N]');
      }
      const runId = rest[0];
      const options = { watch: false, interval: 10 };
      for (let i = 1; i < rest.length; i += 1) {
        const arg = rest[i];
        switch (arg) {
          case '--watch':
            options.watch = true;
            break;
          case '--interval': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--interval requires a numeric value');
            }
            options.interval = Number(value);
            break;
          }
          default:
            throw new Error(`Unknown option for poll: ${arg}`);
        }
      }
      return { command, runId, options };
    }
    case 'execute': {
      const idx = rest.indexOf('--run-id');
      if (idx === -1 || !rest[idx + 1]) {
        throw new Error('Usage: scripts/agents_mcp_runner.mjs execute --run-id <id>');
      }
      const runId = rest[idx + 1];
      return { command, runId };
    }
    case 'resume': {
      const options = {
        runId: null,
        resumeToken: null,
        actor: 'cli',
        reason: 'manual-resume',
        format: 'text',
      };

      for (let i = 0; i < rest.length; i += 1) {
        const arg = rest[i];
        switch (arg) {
          case '--run-id': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--run-id requires a value');
            }
            options.runId = value;
            break;
          }
          case '--resume-token': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--resume-token requires a value');
            }
            options.resumeToken = value;
            break;
          }
          case '--actor': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--actor requires a value');
            }
            options.actor = value;
            break;
          }
          case '--reason': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--reason requires a value');
            }
            options.reason = value;
            break;
          }
          case '--format': {
            const value = rest[++i];
            if (!value) {
              throw new Error('--format requires a value');
            }
            options.format = value;
            break;
          }
          default:
            throw new Error(`Unknown option for resume: ${arg}`);
        }
      }

      if (!options.runId) {
        throw new Error('Resume requires --run-id <id>.');
      }

      return { command, options };
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

async function main() {
  try {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.command === 'start') {
      await startRun(parsed.options);
    } else if (parsed.command === 'poll') {
      await pollRun(parsed.runId, parsed.options);
    } else if (parsed.command === 'execute') {
      await executeRun(parsed.runId);
    } else if (parsed.command === 'resume') {
      await resumeRun(parsed.options);
    }
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}

export {
  appendMetricsEntry,
  createCompatibilityPointer,
  computeHeartbeatState,
  getRunPaths,
  isoTimestamp,
  parseArgs,
  pollRun,
  resumeRun,
  saveManifest,
  startRun,
  timestampForRunId,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_STALE_THRESHOLD_MS,
};

export const constants = {
  TASK_ID,
  repoRoot,
  taskRunsRoot,
  legacyRunsRoot,
  metricsFilePath,
  metricsRoot,
};

if (path.resolve(process.argv[1] ?? '') === __filename) {
  await main();
}
