#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { runPack } from './lib/npm-pack.js';

const REVIEW_ENV_BLOCKLIST = new Set([
  'FORCE_CODEX_REVIEW',
  'CODEX_CLI_BIN',
  'CODEX_CONFIG_OVERRIDES',
  'CODEX_MCP_CONFIG_OVERRIDES',
  'NOTES',
  'SKIP_DIFF_BUDGET',
  'TASK',
  'MCP_RUNNER_TASK_ID',
  'CODEX_ORCHESTRATOR_ROOT',
  'CODEX_ORCHESTRATOR_RUN_DIR',
  'CODEX_ORCHESTRATOR_RUNS_DIR',
  'CODEX_ORCHESTRATOR_OUT_DIR'
]);

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', (error) => reject(error));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function assertPathExists(filePath, label) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

async function assertFileIncludes(filePath, text, label) {
  const raw = await readFile(filePath, 'utf8');
  if (!raw.includes(text)) {
    throw new Error(`${label} missing expected text "${text}" (${filePath})`);
  }
}

async function writeMockCodexBin(tempDir) {
  if (process.platform === 'win32') {
    const mockPath = path.join(tempDir, 'codex-mock.cmd');
    const script = [
      '@echo off',
      'if "%1"=="--help" (',
      '  echo codex help',
      '  echo   review',
      '  exit /b 0',
      ')',
      'set cmd=%1',
      'if "%1"=="-c" set cmd=%3',
      'if "%cmd%"=="review" (',
      '  echo thinking',
      '  echo codex review mock ok',
      '  exit /b 0',
      ')',
      'echo codex mock unsupported args: %*',
      'exit /b 0',
      ''
    ].join('\r\n');
    await writeFile(mockPath, script, 'utf8');
    return mockPath;
  }

  const mockPath = path.join(tempDir, 'codex-mock.sh');
  const script = `#!/usr/bin/env sh
set -eu
if [ "\${1:-}" = "--help" ]; then
  printf '%s\n' "codex help" "  review"
  exit 0
fi
cmd="\${1:-}"
if [ "$cmd" = "-c" ]; then
  shift 2
  cmd="\${1:-}"
fi
if [ "$cmd" = "review" ]; then
  printf '%s\n' "thinking" "codex review mock ok"
  exit 0
fi
printf '%s\n' "codex mock unsupported args: $*"
exit 0
`;
  await writeFile(mockPath, script, 'utf8');
  await chmod(mockPath, 0o755);
  return mockPath;
}

function readMcpResponse(stream, timeoutMs = 5000) {
  if (!stream) {
    return Promise.reject(new Error('MCP smoke requires stdout stream'));
  }
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    let settled = false;
    const timer = timeoutMs > 0 ? setTimeout(() => finalize(new Error('MCP response timed out')), timeoutMs) : null;

    const finalize = (error, payload) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      stream.off('data', onData);
      stream.off('error', onError);
      stream.off('end', onEnd);
      if (error) {
        reject(error);
      } else {
        resolve(payload);
      }
    };

    const onError = (error) => finalize(error instanceof Error ? error : new Error(String(error)));
    const onEnd = () => finalize(new Error('MCP response stream ended before payload'));
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);

      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const header = buffer.slice(0, headerEnd).toString('utf8');
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          finalize(new Error('Missing Content-Length header in framed response'));
          return;
        }
        const length = Number(match[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + length) {
          return;
        }
        const body = buffer.slice(bodyStart, bodyStart + length).toString('utf8');
        try {
          const payload = JSON.parse(body);
          finalize(null, { kind: 'framed', payload });
        } catch (error) {
          finalize(error instanceof Error ? error : new Error('Failed to parse framed response'));
        }
        return;
      }

      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }
      const lineBuffer = buffer.slice(0, newlineIndex);
      const line = lineBuffer.toString('utf8').trim();
      if (!line) {
        buffer = buffer.slice(newlineIndex + 1);
        return;
      }
      if (/^content-length:/i.test(line)) {
        // Wait for the remainder of the framed header/body.
        return;
      }
      buffer = buffer.slice(newlineIndex + 1);
      try {
        const payload = JSON.parse(line);
        finalize(null, { kind: 'jsonl', payload });
      } catch (error) {
        finalize(error instanceof Error ? error : new Error('Failed to parse JSONL response'));
      }
    };

    stream.on('data', onData);
    stream.on('error', onError);
    stream.on('end', onEnd);
  });
}

async function runDelegateServerJsonlSmoke(binPath, repoRoot) {
  const child = spawn(binPath, ['delegate-server', '--repo', repoRoot, '--mode', 'question_only'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });
  try {
    const responsePromise = readMcpResponse(child.stdout);
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' });
    child.stdin.write(`${payload}\n`);
    child.stdin.end();
    const response = await responsePromise;
    if (!response || response.kind !== 'jsonl') {
      throw new Error('Expected JSONL response for JSONL request');
    }
    if (!response.payload || response.payload.jsonrpc !== '2.0' || response.payload.id !== 1) {
      throw new Error('Expected JSON-RPC response with matching id');
    }
    if (!response.payload.error && !response.payload.result) {
      throw new Error('Expected JSON-RPC result or error payload');
    }
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null) {
      await new Promise((resolve) => child.once('exit', resolve));
    }
  }
}

export function buildPackSmokeReviewEnv(tempDir, sourceEnv = process.env) {
  const env = { ...sourceEnv };
  for (const key of Object.keys(env)) {
    if (REVIEW_ENV_BLOCKLIST.has(key) || key.startsWith('CODEX_REVIEW_') || key.startsWith('DIFF_BUDGET_')) {
      delete env[key];
    }
  }
  return {
    ...env,
    NOTES: 'Goal: pack smoke review coverage | Summary: package smoke path | Risks: low',
    CODEX_REVIEW_NON_INTERACTIVE: '1',
    CODEX_ORCHESTRATOR_ROOT: tempDir,
    MCP_RUNNER_TASK_ID: 'pack-smoke'
  };
}

async function main() {
  let record;
  let tarballPath = null;
  let tempDir = null;

  try {
    record = await runPack();
    if (record.filename) {
      tarballPath = path.resolve(process.cwd(), record.filename);
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-pack-smoke-'));
    const pkgJsonPath = path.join(tempDir, 'package.json');
    await writeFile(pkgJsonPath, JSON.stringify({ name: 'pack-smoke', private: true }, null, 2));

    if (!tarballPath) {
      throw new Error('pack smoke requires a tarball filename');
    }

    await runCommand('npm', ['install', tarballPath, '--no-fund', '--no-audit', '--ignore-scripts'], {
      cwd: tempDir
    });

    const binName = process.platform === 'win32' ? 'codex-orchestrator.cmd' : 'codex-orchestrator';
    const binPath = path.join(tempDir, 'node_modules', '.bin', binName);

    await runCommand(binPath, ['--help'], { cwd: tempDir });
    await runCommand(binPath, ['--version'], { cwd: tempDir });
    await runCommand(binPath, ['review', '--help'], { cwd: tempDir });
    await runCommand(binPath, ['self-check', '--format', 'json'], { cwd: tempDir });
    await runDelegateServerJsonlSmoke(binPath, tempDir);

    const runDir = path.join(tempDir, '.runs', 'pack-smoke', 'cli', '2026-01-01T00-00-00-000Z-packsmoke');
    const manifestPath = path.join(runDir, 'manifest.json');
    await mkdir(runDir, { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify({ run_id: 'pack-smoke', summary: { status: 'completed' } }, null, 2)}\n`
    );

    const baseReviewEnv = buildPackSmokeReviewEnv(tempDir);

    await runCommand(binPath, ['review', '--manifest', manifestPath, '--non-interactive'], {
      cwd: tempDir,
      env: baseReviewEnv
    });

    const reviewDir = path.join(runDir, 'review');
    const promptPath = path.join(reviewDir, 'prompt.txt');
    await assertPathExists(promptPath, 'review prompt artifact');
    await assertFileIncludes(promptPath, 'Review task: pack-smoke', 'review prompt artifact');

    const mockCodex = await writeMockCodexBin(tempDir);
    await runCommand(binPath, ['review', '--manifest', manifestPath, '--non-interactive'], {
      cwd: tempDir,
      env: {
        ...baseReviewEnv,
        FORCE_CODEX_REVIEW: '1',
        CODEX_CLI_BIN: mockCodex,
        CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0'
      }
    });

    const outputLogPath = path.join(reviewDir, 'output.log');
    const telemetryPath = path.join(reviewDir, 'telemetry.json');
    await assertPathExists(outputLogPath, 'review output artifact');
    await assertPathExists(telemetryPath, 'review telemetry artifact');
    await assertFileIncludes(telemetryPath, '"status": "succeeded"', 'review telemetry artifact');

    const codexHome = path.join(tempDir, '.codex-home');
    await runCommand(
      binPath,
      ['skills', 'install', '--only', 'long-poll-wait', '--codex-home', codexHome, '--force'],
      { cwd: tempDir }
    );
    const installedLongPollSkillPath = path.join(codexHome, 'skills', 'long-poll-wait', 'SKILL.md');
    await assertPathExists(installedLongPollSkillPath, 'installed long-poll-wait skill');
    await assertFileIncludes(installedLongPollSkillPath, 'name: long-poll-wait', 'long-poll-wait skill');
    await assertFileIncludes(
      installedLongPollSkillPath,
      'Poll until terminal state',
      'long-poll-wait skill'
    );

    console.log('✅ pack smoke passed');
  } catch (error) {
    console.error(`❌ pack smoke failed: ${error?.message ?? String(error)}`);
    process.exitCode = 1;
  } finally {
    if (tarballPath) {
      try {
        await rm(tarballPath, { force: true });
      } catch {
        // ignore cleanup failures
      }
    }
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
