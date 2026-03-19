import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  prepareReviewNonInteractiveHandoffShell,
  shouldForceNonInteractive,
  shouldPrintNonInteractiveHandoff
} from '../scripts/lib/review-non-interactive-handoff.js';

const createdSandboxes: string[] = [];

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-non-interactive-handoff-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function makeManifest(sandbox: string): Promise<{ manifestPath: string; runnerLogPath: string }> {
  const runDir = join(sandbox, '.runs', 'sample-task', 'cli', 'sample-run');
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  const runnerLogPath = join(runDir, 'runner.ndjson');
  await writeFile(manifestPath, JSON.stringify({ run_id: 'sample-run' }), 'utf8');
  await writeFile(runnerLogPath, '{"event":"sample"}\n', 'utf8');
  return { manifestPath, runnerLogPath };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('review-non-interactive-handoff', () => {
  it('derives forced non-interactive mode from tty and review env flags', () => {
    expect(shouldForceNonInteractive({}, true)).toBe(false);
    expect(shouldForceNonInteractive({}, false)).toBe(true);
    expect(shouldForceNonInteractive({ CI: '1' }, true)).toBe(true);
    expect(shouldForceNonInteractive({ CODEX_REVIEW_NON_INTERACTIVE: 'true' }, true)).toBe(true);
    expect(shouldForceNonInteractive({ CODEX_NONINTERACTIVE: 'yes' }, true)).toBe(true);
  });

  it('prepares artifacts, exports review env, and prints the non-interactive handoff when execution is suppressed', async () => {
    const sandbox = await makeSandbox();
    const { manifestPath, runnerLogPath } = await makeManifest(sandbox);
    const logger = { log: vi.fn<(message: string) => void>() };

    const result = await prepareReviewNonInteractiveHandoffShell({
      env: {},
      manifestPath,
      prompt: 'Prompt body',
      repoRoot: sandbox,
      runnerLogExists: true,
      runnerLogPath,
      stdinIsTTY: false,
      logger
    });

    expect(result.nonInteractive).toBe(true);
    expect(result.handedOff).toBe(true);
    expect(result.reviewEnv.MANIFEST).toBe(manifestPath);
    expect(result.reviewEnv.RUNNER_LOG).toBe(runnerLogPath);
    expect(result.reviewEnv.RUN_LOG).toBe(runnerLogPath);
    expect(result.reviewEnv.CODEX_NON_INTERACTIVE).toBe('1');
    expect(result.reviewEnv.CODEX_NO_INTERACTIVE).toBe('1');
    expect(result.reviewEnv.CODEX_INTERACTIVE).toBe('0');
    await expect(readFile(result.artifactPaths.promptPath, 'utf8')).resolves.toBe('Prompt body\n');
    expect(logger.log).toHaveBeenCalledWith('Codex review handoff (non-interactive):');
    expect(logger.log).toHaveBeenCalledWith(
      'Review prompt saved to: .runs/sample-task/cli/sample-run/review/prompt.txt'
    );
  });

  it('clears stale runner-log aliases and keeps execution live when FORCE_CODEX_REVIEW is enabled', async () => {
    const sandbox = await makeSandbox();
    const { manifestPath, runnerLogPath } = await makeManifest(sandbox);

    const result = await prepareReviewNonInteractiveHandoffShell({
      cliNonInteractive: true,
      env: {
        FORCE_CODEX_REVIEW: '1',
        RUNNER_LOG: '/stale/runner.ndjson',
        RUN_LOG: '/stale/output.log'
      },
      manifestPath,
      prompt: 'Prompt body',
      repoRoot: sandbox,
      runnerLogExists: false,
      runnerLogPath,
      stdinIsTTY: false
    });

    expect(result.nonInteractive).toBe(true);
    expect(result.handedOff).toBe(false);
    expect(result.reviewEnv.MANIFEST).toBe(manifestPath);
    expect(result.reviewEnv.RUNNER_LOG).toBeUndefined();
    expect(result.reviewEnv.RUN_LOG).toBeUndefined();
  });

  it('only prints the non-interactive handoff when suppression conditions are met', () => {
    expect(
      shouldPrintNonInteractiveHandoff({
        env: {},
        nonInteractive: true,
        stdinIsTTY: true
      })
    ).toBe(false);
    expect(
      shouldPrintNonInteractiveHandoff({
        env: { CI: '1' },
        nonInteractive: true,
        stdinIsTTY: true
      })
    ).toBe(true);
    expect(
      shouldPrintNonInteractiveHandoff({
        env: { FORCE_CODEX_REVIEW: '1', CODEX_REVIEW_NON_INTERACTIVE: '1' },
        nonInteractive: true,
        stdinIsTTY: false
      })
    ).toBe(false);
  });
});
