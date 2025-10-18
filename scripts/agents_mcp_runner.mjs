#!/usr/bin/env node
/**
 * Agents SDK-based MCP diagnostics runner (Node.js edition).
 *
 * Provides a start/poll workflow that launches Codex MCP via MCPServerStdio with
 * an extended client session timeout and logs progress under
 * .runs/local-mcp/<run-id>/.
 */

import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

import { MCPServerStdio } from '@openai/agents-core';
import { setDefaultOpenAIKey } from '@openai/agents-openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const runsRoot = path.join(repoRoot, '.runs', 'local-mcp');

const DEFAULT_COMMANDS = [
  'npm run build',
  'npm run lint',
  'npm run test',
  'bash scripts/spec-guard.sh --dry-run',
];

const PROMPT_TEMPLATE = `You are operating the Codex CLI via MCP.
Run the exact shell command: {command}

Instructions:
- Use the Codex run tool exactly once to execute the command.
- Do not modify files before the command unless required by the command itself.
- Stream output until the command finishes.
- When finished, respond ONLY with a JSON object containing: exit_code (integer), summary (string), manifest_path (string or null).
- The JSON must be the entire final message (no markdown).
`;

function timestamp() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
}

function generateRunId() {
  return `${timestamp()}-${process.pid}`;
}

async function writeJsonAtomic(targetPath, data) {
  const tmpPath = `${targetPath}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(tmpPath, payload, 'utf8');
  await fs.rename(tmpPath, targetPath);
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

async function saveManifest(manifestPath, manifest) {
  manifest.updated_at = timestamp();
  await writeJsonAtomic(manifestPath, manifest);
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
  const runDir = path.join(runsRoot, runId);
  const manifestPath = path.join(runDir, 'manifest.json');
  const logPath = path.join(runDir, 'runner.log');

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

  const manifest = {
    runner: 'agents-sdk',
    script: 'scripts/agents_mcp_runner.mjs',
    status: 'queued',
    commands: commandEntries,
    started_at: timestamp(),
    updated_at: timestamp(),
    completed_at: null,
    run_id: runId,
    repo_root: repoRoot,
    approval_policy: approvalPolicy,
    timeout_seconds: timeoutSeconds,
    runner_pid: null,
    runner_log: path.relative(repoRoot, logPath),
  };

  await writeJsonAtomic(manifestPath, manifest);

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

  if (format === 'json') {
    console.log(
      JSON.stringify(
        {
          run_id: runId,
          run_dir: runDir,
          manifest: manifestPath,
          runner_pid: child.pid,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Run ID: ${runId}`);
    console.log(`Run directory: ${runDir}`);
    console.log(`Manifest: ${manifestPath}`);
    console.log(`Runner PID: ${child.pid}`);
    console.log(`Use 'scripts/mcp-runner-poll.sh ${runId}' to monitor progress.`);
  }
}

async function executeRun(runId) {
  const manifestPath = path.join(runsRoot, runId, 'manifest.json');
  const manifest = await readJson(manifestPath);
  const timeoutSeconds = Number(manifest.timeout_seconds ?? 3600);
  const approvalPolicy = manifest.approval_policy ?? 'never';
  const commands = manifest.commands ?? [];
  const runDir = path.dirname(manifestPath);

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

  try {
    for (const entry of commands) {
      entry.status = 'running';
      entry.started_at = timestamp();
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
        entry.completed_at = timestamp();
        entry.summary = `Tool invocation failed: ${error.message ?? error}`;
        manifest.status = 'failed';
        manifest.completed_at = timestamp();
        await saveManifest(manifestPath, manifest);
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
      entry.completed_at = timestamp();

      if (parsed) {
        entry.exit_code = parsed.exit_code ?? null;
        entry.summary = parsed.summary ?? summary;
        entry.manifest_path = parsed.manifest_path ?? null;
        entry.status = parsed.exit_code === 0 ? 'succeeded' : 'failed';
      } else {
        entry.summary = summary;
        entry.status = 'succeeded';
      }

      await saveManifest(manifestPath, manifest);

      if (entry.status === 'failed') {
        manifest.status = 'failed';
        manifest.completed_at = timestamp();
        await saveManifest(manifestPath, manifest);
        return;
      }
    }

    manifest.status = 'succeeded';
    manifest.completed_at = timestamp();
    await saveManifest(manifestPath, manifest);
  } finally {
    await server.close();
  }
}

function renderStatus(manifest) {
  console.log(`\nRun ${manifest.run_id} status: ${manifest.status}`);
  console.log(`Started: ${manifest.started_at}`);
  if (manifest.completed_at) {
    console.log(`Completed: ${manifest.completed_at}`);
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

async function pollRun(runId, { watch = false, interval = 10 }) {
  const manifestPath = path.join(runsRoot, runId, 'manifest.json');
  const terminalStates = new Set(['succeeded', 'failed', 'cancelled']);

  do {
    const manifest = await readJson(manifestPath);
    renderStatus(manifest);
    if (!watch || terminalStates.has(manifest.status)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  } while (true);
}

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new Error('Usage: scripts/agents_mcp_runner.mjs <start|poll|execute> [...]');
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
          case '--command':
            options.commands.push(rest[++i]);
            break;
          case '--approval-policy':
            options.approvalPolicy = rest[++i];
            break;
          case '--timeout':
            options.timeoutSeconds = Number(rest[++i]);
            break;
          case '--format':
            options.format = rest[++i];
            break;
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
          case '--interval':
            options.interval = Number(rest[++i]);
            break;
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
    }
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}

await main();
