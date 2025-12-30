import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEVTOOLS_CONFIG_OVERRIDE, resolveCodexCommand } from '../src/cli/utils/devtools.js';
import {
  loadFrontendTestingPrompt,
  resolveFrontendTestingCommand
} from '../src/cli/frontendTestingRunner.js';

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('frontend testing runner', () => {
  it('resolves codex command without devtools by default', () => {
    const env = { CODEX_REVIEW_DEVTOOLS: undefined } as NodeJS.ProcessEnv;
    const resolved = resolveCodexCommand(['exec', 'prompt'], env);
    expect(resolved.command).toBe('codex');
    expect(resolved.args).toEqual(['exec', 'prompt']);
  });

  it('errors when devtools is enabled without readiness', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-'));
    const codexHome = join(tempDir, '.codex');
    const env = { CODEX_REVIEW_DEVTOOLS: '1', CODEX_HOME: codexHome } as NodeJS.ProcessEnv;
    expect(() => resolveCodexCommand(['exec', 'prompt'], env)).toThrow(
      /DevTools MCP is not ready/
    );
  });

  it('adds the devtools config override when readiness is satisfied', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-'));
    const codexHome = join(tempDir, '.codex');
    const skillPath = join(codexHome, 'skills', 'chrome-devtools', 'SKILL.md');
    await mkdir(join(codexHome, 'skills', 'chrome-devtools'), { recursive: true });
    await writeFile(skillPath, '# devtools skill', 'utf8');
    const configPath = join(codexHome, 'config.toml');
    await writeFile(
      configPath,
      [
        '[mcp_servers.chrome-devtools]',
        'command = "npx"',
        'args = ["-y", "chrome-devtools-mcp@latest"]'
      ].join('\n'),
      'utf8'
    );

    const env = { CODEX_REVIEW_DEVTOOLS: '1', CODEX_HOME: codexHome } as NodeJS.ProcessEnv;
    const resolved = resolveCodexCommand(['exec', 'prompt'], env);
    expect(resolved.command).toBe('codex');
    expect(resolved.args).toEqual(['-c', DEVTOOLS_CONFIG_OVERRIDE, 'exec', 'prompt']);
  });

  it('loads frontend testing prompt from a file when provided', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'frontend-test-'));
    const promptPath = join(tempDir, 'prompt.txt');
    await writeFile(promptPath, 'File prompt', 'utf8');

    const env = { CODEX_FRONTEND_TEST_PROMPT_PATH: promptPath } as NodeJS.ProcessEnv;
    const prompt = await loadFrontendTestingPrompt(env);
    expect(prompt).toBe('File prompt');
  });

  it('falls back to inline prompt when no file is provided', async () => {
    const env = { CODEX_FRONTEND_TEST_PROMPT: 'Inline prompt' } as NodeJS.ProcessEnv;
    const prompt = await loadFrontendTestingPrompt(env);
    const command = resolveFrontendTestingCommand(prompt, env);
    expect(prompt).toBe('Inline prompt');
    expect(command.args).toEqual(['exec', 'Inline prompt']);
  });
});
