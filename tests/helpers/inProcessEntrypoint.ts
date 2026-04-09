import { format } from 'node:util';

type InProcessEntrypointResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function renderChunk(chunk: unknown, encoding?: BufferEncoding): string {
  if (typeof chunk === 'string') {
    return chunk;
  }
  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk).toString(encoding ?? 'utf8');
  }
  return String(chunk ?? '');
}

function installOutputCapture(target: NodeJS.WriteStream, buffer: { value: string }): () => void {
  const original = target.write.bind(target);
  target.write = ((chunk: unknown, encoding?: unknown, callback?: unknown) => {
    const normalizedEncoding = typeof encoding === 'string' ? (encoding as BufferEncoding) : undefined;
    buffer.value += renderChunk(chunk, normalizedEncoding);
    if (typeof encoding === 'function') {
      encoding();
    }
    if (typeof callback === 'function') {
      callback();
    }
    return true;
  }) as typeof target.write;

  return () => {
    target.write = original as typeof target.write;
  };
}

function replaceProcessEnv(nextEnv: NodeJS.ProcessEnv): () => void {
  const previous = { ...process.env };
  for (const key of Object.keys(process.env)) {
    if (!Object.prototype.hasOwnProperty.call(nextEnv, key)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(nextEnv)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
  return () => {
    for (const key of Object.keys(process.env)) {
      if (!Object.prototype.hasOwnProperty.call(previous, key)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }
      process.env[key] = value;
    }
  };
}

function installConsoleCapture(
  stdoutBuffer: { value: string },
  stderrBuffer: { value: string }
): () => void {
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };

  console.log = (...args: unknown[]) => {
    stdoutBuffer.value += `${format(...args)}\n`;
  };
  console.info = (...args: unknown[]) => {
    stdoutBuffer.value += `${format(...args)}\n`;
  };
  console.warn = (...args: unknown[]) => {
    stderrBuffer.value += `${format(...args)}\n`;
  };
  console.error = (...args: unknown[]) => {
    stderrBuffer.value += `${format(...args)}\n`;
  };

  return () => {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  };
}

export async function runEntrypointInProcess(options: {
  args: string[];
  env: NodeJS.ProcessEnv;
  runner: (args?: string[]) => Promise<number>;
}): Promise<InProcessEntrypointResult> {
  const stdoutBuffer = { value: '' };
  const stderrBuffer = { value: '' };
  const restoreStdout = installOutputCapture(process.stdout, stdoutBuffer);
  const restoreStderr = installOutputCapture(process.stderr, stderrBuffer);
  const restoreConsole = installConsoleCapture(stdoutBuffer, stderrBuffer);
  const restoreEnv = replaceProcessEnv(options.env);
  const previousExitCode = process.exitCode;

  try {
    process.exitCode = 0;
    const exitCode = await options.runner([...options.args]);
    const finalExitCode = typeof process.exitCode === 'number' ? process.exitCode : exitCode;
    return {
      exitCode: typeof finalExitCode === 'number' ? finalExitCode : 0,
      stdout: stdoutBuffer.value,
      stderr: stderrBuffer.value
    };
  } finally {
    process.exitCode = previousExitCode;
    restoreEnv();
    restoreConsole();
    restoreStderr();
    restoreStdout();
  }
}

export async function runEntrypointLikeExec(options: {
  args: string[];
  env: NodeJS.ProcessEnv;
  runner: (args?: string[]) => Promise<number>;
}): Promise<{ stdout: string; stderr: string }> {
  const result = await runEntrypointInProcess(options);
  if (result.exitCode === 0) {
    return { stdout: result.stdout, stderr: result.stderr };
  }
  const error = new Error(`Command failed with exit code ${result.exitCode}`) as Error & {
    code?: number;
    stdout?: string;
    stderr?: string;
  };
  error.code = result.exitCode;
  error.stdout = result.stdout;
  error.stderr = result.stderr;
  throw error;
}
