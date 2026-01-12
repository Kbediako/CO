#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { runPack } from './lib/npm-pack.js';


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
    await runCommand(binPath, ['self-check', '--format', 'json'], { cwd: tempDir });
    await runDelegateServerJsonlSmoke(binPath, tempDir);

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

main();
