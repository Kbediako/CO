import process from 'node:process';

import { logger } from '../logger.js';

export interface McpRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
  codex_private?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

type ResponseFormat = 'framed' | 'jsonl';

export const MAX_MCP_MESSAGE_BYTES = 1024 * 1024;
export const MAX_MCP_HEADER_BYTES = 16 * 1024;
const MCP_HEADER_DELIMITER = '\r\n\r\n';
const MCP_HEADER_DELIMITER_BYTES = MCP_HEADER_DELIMITER.length;
const MCP_HEADER_DELIMITER_BUFFER = Buffer.from(MCP_HEADER_DELIMITER, 'utf8');
const MAX_MCP_BUFFER_BYTES =
  (MAX_MCP_MESSAGE_BYTES + MAX_MCP_HEADER_BYTES + MCP_HEADER_DELIMITER_BYTES) * 2;

export async function runJsonRpcServer(
  handler: (request: McpRequest) => Promise<unknown>,
  options: { stdin?: NodeJS.ReadableStream; stdout?: NodeJS.WritableStream } = {}
): Promise<void> {
  let buffer = Buffer.alloc(0);
  let expectedLength: number | null = null;
  let processing = Promise.resolve();
  let halted = false;
  const input = options.stdin ?? process.stdin;
  const output = options.stdout ?? process.stdout;

  const handleProtocolViolation = (message: string) => {
    if (halted) {
      return;
    }
    halted = true;
    logger.warn(message);
    process.exitCode = 1;
    buffer = Buffer.alloc(0);
    expectedLength = null;
    if (typeof (input as { pause?: () => void }).pause === 'function') {
      input.pause();
    }
  };

  input.on('data', (chunk) => {
    if (halted) {
      return;
    }
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    if (buffer.length > MAX_MCP_BUFFER_BYTES) {
      handleProtocolViolation(`Rejecting MCP buffer larger than ${MAX_MCP_BUFFER_BYTES} bytes`);
      return;
    }
    processing = processing
      .then(() => processBuffer())
      .catch((error) => {
        logger.error(`Failed to process MCP buffer: ${(error as Error)?.message ?? error}`);
      });
  });

  async function processBuffer() {
    while (buffer.length > 0) {
      if (halted) {
        return;
      }
      if (expectedLength !== null) {
        if (buffer.length < expectedLength) {
          return;
        }
        const body = buffer.slice(0, expectedLength);
        buffer = buffer.slice(expectedLength);
        expectedLength = null;
        await handleMessage(body.toString('utf8'), 'framed');
        continue;
      }

      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex !== -1) {
          const lineBuffer = buffer.slice(0, newlineIndex);
          const line = lineBuffer.toString('utf8').trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) {
            continue;
          }
          const normalizedLine = line.trimStart();
          const looksLikeHeaderLine = /^[A-Za-z0-9-]+:/.test(normalizedLine);
          const looksLikeJson = normalizedLine.startsWith('{') || normalizedLine.startsWith('[');
          const isContentLength = normalizedLine.toLowerCase().startsWith('content-length:');
          let restoredHeader = false;
          if (!looksLikeJson && looksLikeHeaderLine) {
            buffer = Buffer.concat([Buffer.from(lineBuffer), Buffer.from('\n'), buffer]);
            restoredHeader = true;
          } else if (!isContentLength) {
            const lineBytes = Buffer.byteLength(line, 'utf8');
            if (lineBytes > MAX_MCP_MESSAGE_BYTES) {
              handleProtocolViolation(
                `Rejecting MCP payload (${lineBytes} bytes) larger than ${MAX_MCP_MESSAGE_BYTES}`
              );
              return;
            }
            await handleMessage(line, 'jsonl');
            continue;
          }
          if (!restoredHeader && isContentLength) {
            buffer = Buffer.concat([Buffer.from(lineBuffer), Buffer.from('\n'), buffer]);
          }
        } else if (buffer.length > MAX_MCP_MESSAGE_BYTES) {
          handleProtocolViolation(
            `Rejecting MCP payload (${buffer.length} bytes) larger than ${MAX_MCP_MESSAGE_BYTES}`
          );
          return;
        }

        if (buffer.length > MAX_MCP_HEADER_BYTES) {
          const overflow = buffer.slice(MAX_MCP_HEADER_BYTES);
          const allowedPrefix = MCP_HEADER_DELIMITER_BUFFER.subarray(0, overflow.length);
          if (overflow.length > MCP_HEADER_DELIMITER_BYTES || !overflow.equals(allowedPrefix)) {
            handleProtocolViolation(`Rejecting MCP header larger than ${MAX_MCP_HEADER_BYTES} bytes`);
          }
        }
        return;
      }
      if (headerEnd > MAX_MCP_HEADER_BYTES) {
        handleProtocolViolation(`Rejecting MCP header larger than ${MAX_MCP_HEADER_BYTES} bytes`);
        return;
      }
      const header = buffer.slice(0, headerEnd).toString('utf8');
      const parsed = parseContentLengthHeader(header);
      if (parsed.error) {
        handleProtocolViolation(parsed.error);
        return;
      }
      if (parsed.length === null) {
        const lines = header.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) {
          buffer = buffer.slice(headerEnd + 4);
          continue;
        }
        const allJsonLike = lines.every((line) => line.startsWith('{') || line.startsWith('['));
        if (allJsonLike) {
          buffer = buffer.slice(headerEnd + 4);
          for (const line of lines) {
            await handleMessage(line, 'jsonl');
          }
          continue;
        }
        handleProtocolViolation('Missing Content-Length header in MCP message');
        return;
      }
      const length = parsed.length;
      if (!Number.isFinite(length) || length < 0) {
        handleProtocolViolation('Invalid Content-Length for MCP payload');
        return;
      }
      if (length > MAX_MCP_MESSAGE_BYTES) {
        handleProtocolViolation(`Rejecting MCP payload (${length} bytes) larger than ${MAX_MCP_MESSAGE_BYTES}`);
        return;
      }
      expectedLength = length;
      buffer = buffer.slice(headerEnd + 4);
    }
  }

  async function handleMessage(raw: string, format: ResponseFormat) {
    let request: McpRequest;
    try {
      request = JSON.parse(raw) as McpRequest;
    } catch (error) {
      logger.error(`Failed to parse MCP message: ${(error as Error)?.message ?? error}`);
      return;
    }
    if (typeof request.method !== 'string') {
      return;
    }
    const id = request.id ?? null;
    try {
      const result = await handler(request);
      if (id !== null && typeof id !== 'undefined') {
        sendResponse({ jsonrpc: '2.0', id, result }, output, format);
      }
    } catch (error) {
      if (id !== null && typeof id !== 'undefined') {
        sendResponse(
          {
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message: (error as Error)?.message ?? String(error) }
          },
          output,
          format
        );
      }
    }
  }
}

export function parseContentLengthHeader(header: string): { length: number | null; error?: string } {
  const lines = header.split(/\r?\n/);
  let contentLength: number | null = null;
  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const name = line.slice(0, separator).trim().toLowerCase();
    if (name !== 'content-length') {
      continue;
    }
    if (contentLength !== null) {
      return { length: null, error: 'Multiple Content-Length headers in MCP message' };
    }
    const value = line.slice(separator + 1).trim();
    if (!/^\d+$/.test(value)) {
      return { length: null, error: 'Invalid Content-Length header in MCP message' };
    }
    contentLength = Number(value);
  }
  return { length: contentLength };
}

function sendResponse(
  response: McpResponse,
  output: NodeJS.WritableStream = process.stdout,
  format: ResponseFormat = 'framed'
): void {
  const payload = JSON.stringify(response);
  if (format === 'jsonl') {
    output.write(`${payload}\n`);
    return;
  }
  const buffer = Buffer.from(payload, 'utf8');
  const header = Buffer.from(`Content-Length: ${buffer.length}\r\n\r\n`, 'utf8');
  output.write(Buffer.concat([header, buffer]));
}
