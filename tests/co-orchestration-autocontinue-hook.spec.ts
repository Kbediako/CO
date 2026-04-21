import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

const hookPath = join(process.cwd(), 'scripts', 'hooks', 'continue_co_orchestration.py');

type HookRun = {
  payload: Record<string, unknown>;
  state: Record<string, unknown>;
  stderr: string;
};

type HookRunPaths = {
  cwd?: string;
  repoRoot?: string;
};

function runHook(lastAssistantMessage: string, configurePaths?: (sandbox: string) => HookRunPaths): HookRun {
  const sandbox = mkdtempSync(join(tmpdir(), 'co-autocontinue-hook-'));
  try {
    const paths = configurePaths?.(sandbox) ?? {};
    const repoRoot = paths.repoRoot ?? join(sandbox, 'repo');
    const statePath = join(sandbox, 'state', 'co_orchestration_autocontinue.json');
    const initialState = {
      enabled: true,
      repo_root: repoRoot,
      max_in_progress: 2
    };
    mkdirSync(join(sandbox, 'state'), { recursive: true });
    writeFileSync(statePath, JSON.stringify(initialState), 'utf8');

    const result = spawnSync(process.env.PYTHON ?? 'python3', [hookPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        CO_ORCHESTRATION_AUTOCONTINUE_STATE_PATH: statePath
      },
      input: JSON.stringify({
        cwd: paths.cwd ?? join(repoRoot, 'workspace'),
        last_assistant_message: lastAssistantMessage
      })
    });

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();

    return {
      payload: JSON.parse(result.stdout) as Record<string, unknown>,
      state: JSON.parse(readFileSync(statePath, 'utf8')) as Record<string, unknown>,
      stderr: result.stderr
    };
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

describe('CO orchestration auto-continue hook', () => {
  it('keeps auto-continue enabled for quoted sentinel text', () => {
    const run = runHook('The literal string "CO_ORCHESTRATOR_DONE" is only an example here.');

    expect(run.stderr).toBe('');
    expect(run.payload).toMatchObject({ decision: 'block' });
    expect(run.state.enabled).toBe(true);
  });

  it('keeps auto-continue enabled for read-only critical-blocker mentions', () => {
    const run = runHook(
      [
        'Read-only audit mentioned CO_ORCHESTRATOR_CRITICAL_BLOCKER because approval_policy=never.',
        'No user intervention is required; continue monitoring and report the limitation.'
      ].join('\n')
    );

    expect(run.stderr).toBe('');
    expect(run.payload).toMatchObject({ decision: 'block' });
    expect(run.state.enabled).toBe(true);
  });

  it('requires the structured stop line to be the final non-empty line', () => {
    const run = runHook(
      [
        'CO_ORCHESTRATOR_STOP: CO_ORCHESTRATOR_DONE',
        '',
        'Additional explanatory text means this is not a deliberate final stop control line.'
      ].join('\n')
    );

    expect(run.stderr).toBe('');
    expect(run.payload).toMatchObject({ decision: 'block' });
    expect(run.state.enabled).toBe(true);
  });

  it('keeps auto-continue enabled for indented structured stop examples', () => {
    const run = runHook(
      [
        'Example of the stop control line in a code block:',
        '    CO_ORCHESTRATOR_STOP: CO_ORCHESTRATOR_DONE'
      ].join('\n')
    );

    expect(run.stderr).toBe('');
    expect(run.payload).toMatchObject({ decision: 'block' });
    expect(run.state.enabled).toBe(true);
  });

  it('ignores sibling directories that merely share the repo root prefix', () => {
    const run = runHook('CO_ORCHESTRATOR_STOP: CO_ORCHESTRATOR_DONE', (sandbox) => {
      const repoRoot = join(sandbox, 'repo');
      return {
        repoRoot,
        cwd: `${repoRoot}-archive/workspace`
      };
    });

    expect(run.stderr).toBe('');
    expect(run.payload).toEqual({ continue: true });
    expect(run.state.enabled).toBe(true);
  });

  it('uses the current home directory for the default state path', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'co-autocontinue-hook-home-'));
    try {
      const home = join(sandbox, 'home');
      const repoRoot = join(sandbox, 'repo');
      const statePath = join(home, '.codex', 'hooks', 'co_orchestration_autocontinue.json');
      mkdirSync(join(home, '.codex', 'hooks'), { recursive: true });
      writeFileSync(
        statePath,
        JSON.stringify({
          enabled: true,
          repo_root: repoRoot,
          max_in_progress: 2
        }),
        'utf8'
      );

      const env = {
        ...process.env,
        HOME: home
      };
      delete env.CO_ORCHESTRATION_AUTOCONTINUE_STATE_PATH;

      const result = spawnSync(process.env.PYTHON ?? 'python3', [hookPath], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env,
        input: JSON.stringify({
          cwd: join(repoRoot, 'workspace'),
          last_assistant_message: 'CO_ORCHESTRATOR_STOP: CO_ORCHESTRATOR_DONE'
        })
      });

      expect(result.status).toBe(0);
      expect(result.error).toBeUndefined();
      expect(JSON.parse(result.stdout) as Record<string, unknown>).toEqual({ continue: true });
      expect(JSON.parse(readFileSync(statePath, 'utf8')) as Record<string, unknown>).toMatchObject({
        enabled: false
      });
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it.each([
    'CO_ORCHESTRATOR_CRITICAL_BLOCKER',
    'CO_ORCHESTRATOR_DONE',
    'CO_ORCHESTRATOR_DESTRUCTIVE_DECISION_REQUIRED'
  ])('disables auto-continue for a true structured %s stop', (sentinel) => {
    const run = runHook(
      [
        'Stopping because the orchestration contract reached a true stop condition.',
        `CO_ORCHESTRATOR_STOP: ${sentinel}`
      ].join('\n')
    );

    expect(run.stderr).toBe('');
    expect(run.payload).toEqual({ continue: true });
    expect(run.state.enabled).toBe(false);
  });
});
