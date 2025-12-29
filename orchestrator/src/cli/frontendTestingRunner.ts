import { spawn, type StdioOptions } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { logger } from '../logger.js';
import { resolveCodexCommand } from './utils/devtools.js';

const DEFAULT_PROMPT = [
  'You are running frontend testing for the current project.',
  '',
  'Goals:',
  '- Validate critical user flows and layout responsiveness.',
  '- Check the browser console and network panels for errors.',
  '- If Chrome DevTools MCP is enabled, use it.',
  '',
  'Output a concise report with:',
  '- Summary',
  '- Steps executed',
  '- Issues (severity, repro)',
  '- Follow-up recommendations',
  '',
  'Do not modify code unless explicitly asked.'
].join('\n');

export async function loadFrontendTestingPrompt(
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const promptPath = env.CODEX_FRONTEND_TEST_PROMPT_PATH?.trim();
  if (promptPath) {
    const raw = await readFile(resolve(promptPath), 'utf8');
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error(`Frontend testing prompt file is empty: ${promptPath}`);
    }
    return trimmed;
  }

  const inlinePrompt = env.CODEX_FRONTEND_TEST_PROMPT?.trim();
  if (inlinePrompt) {
    return inlinePrompt;
  }

  return DEFAULT_PROMPT;
}

export function resolveFrontendTestingCommand(
  prompt: string,
  env: NodeJS.ProcessEnv = process.env
): { command: string; args: string[] } {
  const args = ['exec', prompt];
  return resolveCodexCommand(args, env);
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function shouldForceNonInteractive(env: NodeJS.ProcessEnv): boolean {
  const stdinIsTTY = process.stdin?.isTTY === true;
  return (
    !stdinIsTTY ||
    envFlagEnabled(env.CI) ||
    envFlagEnabled(env.CODEX_REVIEW_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NONINTERACTIVE) ||
    envFlagEnabled(env.CODEX_NO_INTERACTIVE)
  );
}

export async function runFrontendTesting(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const prompt = await loadFrontendTestingPrompt(env);
  const { command, args } = resolveFrontendTestingCommand(prompt, env);
  const nonInteractive = shouldForceNonInteractive(env);
  const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env };
  if (nonInteractive) {
    childEnv.CODEX_NON_INTERACTIVE = childEnv.CODEX_NON_INTERACTIVE ?? '1';
    childEnv.CODEX_NO_INTERACTIVE = childEnv.CODEX_NO_INTERACTIVE ?? '1';
    childEnv.CODEX_INTERACTIVE = childEnv.CODEX_INTERACTIVE ?? '0';
  }
  const stdio: StdioOptions = nonInteractive ? ['ignore', 'inherit', 'inherit'] : 'inherit';

  const child = spawn(command, args, { stdio, env: childEnv });
  await new Promise<void>((resolvePromise, reject) => {
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`codex exec exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

async function main(): Promise<void> {
  await runFrontendTesting();
}

const entry = process.argv[1] ? resolve(process.argv[1]) : null;
const self = resolve(fileURLToPath(import.meta.url));
if (entry && entry === self) {
  main().catch((error) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
