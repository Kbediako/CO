import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { logger } from '../logger.js';

const MCP_HEADER_TOKEN = 'Content-Length:';
const MCP_HEADER_DELIMITER = '\r\n\r\n';

export interface McpServeOptions {
  repoRoot?: string;
  dryRun?: boolean;
  extraArgs: string[];
}

export async function serveMcp(options: McpServeOptions): Promise<void> {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  if (!existsSync(repoRoot)) {
    throw new Error(`Repository root not found: ${repoRoot}`);
  }

  if (options.dryRun) {
    logger.warn(`[mcp] repo root: ${repoRoot}`);
    logger.warn('[mcp] codex CLI must be available in PATH.');
    return;
  }

  const args = ['-C', repoRoot, 'mcp-server', ...options.extraArgs];
  const child = spawn('codex', args, { stdio: ['inherit', 'pipe', 'pipe'] });
  if (child.stdout) {
    if (isStrictMcpStdout()) {
      attachMcpStdoutGuard(child.stdout);
    } else {
      child.stdout.pipe(process.stdout);
    }
  }
  if (child.stderr) {
    child.stderr.pipe(process.stderr);
  }

  await new Promise<void>((resolvePromise) => {
    child.once('exit', (code) => {
      if (typeof code === 'number') {
        process.exitCode = code;
      } else {
        process.exitCode = 1;
      }
      resolvePromise();
    });
    child.once('error', (error) => {
      logger.error(error?.message ?? String(error));
      process.exitCode = 1;
      resolvePromise();
    });
  });
}

function isStrictMcpStdout(): boolean {
  const value = process.env.CODEX_MCP_STDIO_STRICT;
  if (!value) {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function attachMcpStdoutGuard(stream: NodeJS.ReadableStream): void {
  let buffer = Buffer.alloc(0);
  let expectedLength: number | null = null;

  const flushLog = (data: Buffer) => {
    if (data.length > 0) {
      process.stderr.write(data);
    }
  };

  const processBuffer = () => {
    while (buffer.length > 0) {
      if (expectedLength !== null) {
        if (buffer.length < expectedLength) {
          return;
        }
        const body = buffer.slice(0, expectedLength);
        buffer = buffer.slice(expectedLength);
        process.stdout.write(body);
        expectedLength = null;
        continue;
      }

      const headerIndex = buffer.indexOf(MCP_HEADER_TOKEN);
      if (headerIndex > 0) {
        flushLog(buffer.slice(0, headerIndex));
        buffer = buffer.slice(headerIndex);
        continue;
      }

      if (headerIndex === -1) {
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex !== -1) {
          flushLog(buffer.slice(0, newlineIndex + 1));
          buffer = buffer.slice(newlineIndex + 1);
          continue;
        }
        return;
      }

      const headerEnd = buffer.indexOf(MCP_HEADER_DELIMITER);
      if (headerEnd === -1) {
        return;
      }

      const headerBytes = buffer.slice(0, headerEnd + MCP_HEADER_DELIMITER.length);
      const headerText = headerBytes.toString('utf8');
      const match = headerText.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        flushLog(headerBytes);
        buffer = buffer.slice(headerEnd + MCP_HEADER_DELIMITER.length);
        continue;
      }

      const length = Number(match[1]);
      if (!Number.isFinite(length) || length < 0) {
        flushLog(headerBytes);
        buffer = buffer.slice(headerEnd + MCP_HEADER_DELIMITER.length);
        continue;
      }

      expectedLength = length;
      process.stdout.write(headerBytes);
      buffer = buffer.slice(headerEnd + MCP_HEADER_DELIMITER.length);
    }
  };

  stream.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    processBuffer();
  });
  stream.on('error', (error) => {
    logger.error(error?.message ?? String(error));
  });
  if (typeof stream.resume === 'function') {
    stream.resume();
  }
}
