import { mkdtemp, mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { __test__ as childLaneRunnerTest } from '../src/cli/providerLinearChildLaneRunner.js';

let tempRoot: string | null = null;

function createClock(startedAt: string): {
  now: () => string;
  advance: (ms: number) => void;
} {
  let currentMs = Date.parse(startedAt);
  return {
    now: () => new Date(currentMs).toISOString(),
    advance: (ms: number) => {
      currentMs += ms;
    }
  };
}

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

describe('provider linear child lane runner', () => {
  it('includes shared source 0 anchor lines in the child-lane prompt when present', () => {
    const prompt = childLaneRunnerTest.buildChildLanePrompt({
      issueIdentifier: 'CO-91',
      purpose: 'Exercise the shared source-0 anchor',
      scope: {
        files: ['orchestrator/src/cli/run/source0.ts'],
        phases: ['implementation']
      },
      runMemoryPromptLines: [
        'Shared source 0 anchor:',
        '- Pointer: `ctx:sha256:source0#chunk:c000001`',
        '- Source payload: `.runs/linear-lin-issue-1/cli/run-child/memory/source-0/source.txt`'
      ],
      instructions: null
    });

    expect(prompt).toContain('You are a bounded same-issue child lane for Linear issue CO-91.');
    expect(prompt).toContain('Shared source 0 anchor:');
    expect(prompt).toContain('- Pointer: `ctx:sha256:source0#chunk:c000001`');
    expect(prompt).toContain(
      '- Source payload: `.runs/linear-lin-issue-1/cli/run-child/memory/source-0/source.txt`'
    );
  });

  it('times out appserver startup when no matching session log appears after runtime selection', async () => {
    const clock = createClock('2026-04-17T18:52:07.000Z');
    await expect(
      childLaneRunnerTest.waitForProviderLinearChildLaneAppserverStartup({
        context: {
          issueIdentifier: 'CO-224'
        },
        laneWorkspacePath: '/tmp/child-lane',
        env: {},
        startedAt: '2026-04-17T18:52:07.000Z',
        isExecSettled: () => false,
        deps: {
          now: clock.now,
          sleep: async (ms) => {
            clock.advance(ms);
          },
          discoverStartupSessionLogPath: async () => null
        }
      })
    ).rejects.toThrow(
      'Appserver child lane startup stalled after runtime selection'
    );
  });

  it('accepts matching session-log startup evidence for appserver child lanes', async () => {
    const clock = createClock('2026-04-17T18:52:07.000Z');
    let attempts = 0;
    const sessionLogPath = await childLaneRunnerTest.waitForProviderLinearChildLaneAppserverStartup({
      context: {
        issueIdentifier: 'CO-224'
      },
      laneWorkspacePath: '/tmp/child-lane',
      env: {},
      startedAt: '2026-04-17T18:52:07.000Z',
      isExecSettled: () => false,
      deps: {
        now: clock.now,
        sleep: async (ms) => {
          clock.advance(ms);
        },
        discoverStartupSessionLogPath: async () => {
          attempts += 1;
          return attempts >= 2 ? '/tmp/codex-sessions/rollout-child-lane.jsonl' : null;
        }
      }
    });

    expect(sessionLogPath).toBe('/tmp/codex-sessions/rollout-child-lane.jsonl');
    expect(attempts).toBeGreaterThanOrEqual(2);
  });

  it('keeps older resumed-thread session logs eligible when the child lane carries a thread hint', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const codexHome = join(tempRoot, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '04', '17');
    await mkdir(sessionDir, { recursive: true });

    const workspacePath = join(tempRoot, 'workspace');
    const promptNeedles = ['You are a bounded same-issue child lane for Linear issue CO-224.'];
    const resumedThreadId = 'thread-123';
    const resumedSessionLogPath = join(sessionDir, `rollout-existing-${resumedThreadId}.jsonl`);
    const matchingHeader = [
      `{"timestamp":"2026-04-17T18:52:05.000Z","type":"session_meta","payload":{"cwd":"${workspacePath}","id":"${resumedThreadId}"}}`,
      `{"timestamp":"2026-04-17T18:52:05.050Z","type":"turn_context","payload":{"user_instructions":"${promptNeedles[0]}"}}`
    ].join('\n');
    await writeFile(resumedSessionLogPath, matchingHeader, 'utf8');

    const resumedTimestamp = new Date('2026-04-17T18:52:06.000Z');
    await utimes(resumedSessionLogPath, resumedTimestamp, resumedTimestamp);

    const sessionLogPath = await childLaneRunnerTest.discoverProviderLinearChildLaneSessionLogPath({
      env: { CODEX_HOME: codexHome, CODEX_THREAD_ID: resumedThreadId },
      workspacePath,
      promptNeedles,
      startedAt: '2026-04-17T18:52:07.000Z'
    });

    expect(sessionLogPath).toBe(resumedSessionLogPath);
  });

  it('ignores stale pre-launch session logs and picks fresh startup evidence', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const codexHome = join(tempRoot, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '04', '17');
    await mkdir(sessionDir, { recursive: true });

    const workspacePath = join(tempRoot, 'workspace');
    const promptNeedles = ['You are a bounded same-issue child lane for Linear issue CO-224.'];
    const staleSessionLogPath = join(sessionDir, 'rollout-stale.jsonl');
    const freshSessionLogPath = join(sessionDir, 'rollout-fresh.jsonl');
    const matchingHeader = [
      `{"timestamp":"2026-04-17T18:52:07.000Z","type":"session_meta","payload":{"cwd":"${workspacePath}"}}`,
      `{"timestamp":"2026-04-17T18:52:07.050Z","type":"turn_context","payload":{"user_instructions":"${promptNeedles[0]}"}}`
    ].join('\n');
    await writeFile(staleSessionLogPath, matchingHeader, 'utf8');
    await writeFile(freshSessionLogPath, matchingHeader, 'utf8');

    const staleTimestamp = new Date('2026-04-17T18:52:02.000Z');
    const freshTimestamp = new Date('2026-04-17T18:52:08.000Z');
    await utimes(staleSessionLogPath, staleTimestamp, staleTimestamp);
    await utimes(freshSessionLogPath, freshTimestamp, freshTimestamp);

    const sessionLogPath = await childLaneRunnerTest.discoverProviderLinearChildLaneSessionLogPath({
      env: { CODEX_HOME: codexHome },
      workspacePath,
      promptNeedles,
      startedAt: '2026-04-17T18:52:07.000Z'
    });

    expect(sessionLogPath).toBe(freshSessionLogPath);
  });

  it('accepts matching startup evidence when coarse mtime precision rounds below launch time', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const codexHome = join(tempRoot, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '04', '17');
    await mkdir(sessionDir, { recursive: true });

    const workspacePath = join(tempRoot, 'workspace');
    const promptNeedles = ['You are a bounded same-issue child lane for Linear issue CO-224.'];
    const sessionLogPath = join(sessionDir, 'rollout-second-resolution.jsonl');
    const matchingHeader = [
      `{"timestamp":"2026-04-17T18:52:07.950Z","type":"session_meta","payload":{"cwd":"${workspacePath}"}}`,
      `{"timestamp":"2026-04-17T18:52:08.000Z","type":"turn_context","payload":{"user_instructions":"${promptNeedles[0]}"}}`
    ].join('\n');
    await writeFile(sessionLogPath, matchingHeader, 'utf8');

    const roundedTimestamp = new Date('2026-04-17T18:52:07.000Z');
    await utimes(sessionLogPath, roundedTimestamp, roundedTimestamp);

    const discoveredPath = await childLaneRunnerTest.discoverProviderLinearChildLaneSessionLogPath({
      env: { CODEX_HOME: codexHome },
      workspacePath,
      promptNeedles,
      startedAt: '2026-04-17T18:52:07.900Z'
    });

    expect(discoveredPath).toBe(sessionLogPath);
  });

  it('ignores within-skew logs when only later non-header events land after launch', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const codexHome = join(tempRoot, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '04', '17');
    await mkdir(sessionDir, { recursive: true });

    const workspacePath = join(tempRoot, 'workspace');
    const promptNeedles = ['You are a bounded same-issue child lane for Linear issue CO-224.'];
    const sessionLogPath = join(sessionDir, 'rollout-stale-with-late-event.jsonl');
    const matchingHeader = [
      `{"timestamp":"2026-04-17T18:52:07.000Z","type":"session_meta","payload":{"cwd":"${workspacePath}"}}`,
      `{"timestamp":"2026-04-17T18:52:07.050Z","type":"turn_context","payload":{"user_instructions":"${promptNeedles[0]}"}}`,
      `{"timestamp":"2026-04-17T18:52:08.000Z","type":"event_msg","payload":{"message":"late append from stale log"}}`
    ].join('\n');
    await writeFile(sessionLogPath, matchingHeader, 'utf8');

    const roundedTimestamp = new Date('2026-04-17T18:52:07.000Z');
    await utimes(sessionLogPath, roundedTimestamp, roundedTimestamp);

    const discoveredPath = await childLaneRunnerTest.discoverProviderLinearChildLaneSessionLogPath({
      env: { CODEX_HOME: codexHome },
      workspacePath,
      promptNeedles,
      startedAt: '2026-04-17T18:52:07.900Z'
    });

    expect(discoveredPath).toBeNull();
  });

  it('discovers matching startup evidence when turn context lands beyond 16KB', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const codexHome = join(tempRoot, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '04', '17');
    await mkdir(sessionDir, { recursive: true });

    const workspacePath = join(tempRoot, 'workspace');
    const promptNeedles = ['You are a bounded same-issue child lane for Linear issue CO-224.'];
    const sessionLogPath = join(sessionDir, 'rollout-large-prefix.jsonl');
    const largeEventPayload = 'x'.repeat(20 * 1024);
    const matchingHeader = [
      `{"timestamp":"2026-04-17T18:52:07.000Z","type":"session_meta","payload":{"cwd":"${workspacePath}"}}`,
      `{"timestamp":"2026-04-17T18:52:07.025Z","type":"event_msg","payload":{"type":"bootstrap","message":"${largeEventPayload}"}}`,
      `{"timestamp":"2026-04-17T18:52:07.050Z","type":"turn_context","payload":{"user_instructions":"${promptNeedles[0]}"}}`
    ].join('\n');
    await writeFile(sessionLogPath, matchingHeader, 'utf8');

    const timestamp = new Date('2026-04-17T18:52:08.000Z');
    await utimes(sessionLogPath, timestamp, timestamp);

    const discoveredPath = await childLaneRunnerTest.discoverProviderLinearChildLaneSessionLogPath({
      env: { CODEX_HOME: codexHome },
      workspacePath,
      promptNeedles,
      startedAt: '2026-04-17T18:52:07.000Z'
    });

    expect(discoveredPath).toBe(sessionLogPath);
  });

  it('re-checks startup evidence after the final poll interval before timing out', async () => {
    const clock = createClock('2026-04-17T18:52:07.000Z');
    let attempts = 0;
    const sessionLogPath = await childLaneRunnerTest.waitForProviderLinearChildLaneAppserverStartup({
      context: {
        issueIdentifier: 'CO-224'
      },
      laneWorkspacePath: '/tmp/child-lane',
      env: {},
      startedAt: '2026-04-17T18:52:07.000Z',
      isExecSettled: () => false,
      deps: {
        now: clock.now,
        sleep: async (ms) => {
          clock.advance(ms);
        },
        discoverStartupSessionLogPath: async () => {
          attempts += 1;
          return attempts > 360 ? '/tmp/codex-sessions/rollout-final-window.jsonl' : null;
        }
      }
    });

    expect(sessionLogPath).toBe('/tmp/codex-sessions/rollout-final-window.jsonl');
    expect(attempts).toBe(361);
  });

  it('counts session-log discovery time against the startup timeout budget', async () => {
    const clock = createClock('2026-04-17T18:52:07.000Z');
    let attempts = 0;
    const sleepCalls: number[] = [];

    await expect(
      childLaneRunnerTest.waitForProviderLinearChildLaneAppserverStartup({
        context: {
          issueIdentifier: 'CO-224'
        },
        laneWorkspacePath: '/tmp/child-lane',
        env: {},
        startedAt: '2026-04-17T18:52:07.000Z',
        isExecSettled: () => false,
        deps: {
          now: clock.now,
          sleep: async (ms) => {
            sleepCalls.push(ms);
            clock.advance(ms);
          },
          discoverStartupSessionLogPath: async () => {
            attempts += 1;
            clock.advance(30_000);
            return null;
          }
        }
      })
    ).rejects.toThrow('Appserver child lane startup stalled after runtime selection');

    expect(attempts).toBe(3);
    expect(sleepCalls).toEqual([250, 250]);
  });

  it('preserves a successful exec result when abort fires after exit but before close settles', async () => {
    const abortController = new AbortController();
    let resolveExec: ((value: { exitCode: number; stdout: string; stderr: string }) => void) | null = null;
    const execPromise = new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      resolveExec = resolve;
    });

    const recoveryPromise = childLaneRunnerTest.recoverProviderLinearChildLaneExecResultAfterAbort({
      abortController,
      error: new Error('startup timeout'),
      execPromise,
      execSettled: false
    });

    expect(abortController.signal.aborted).toBe(true);
    resolveExec?.({ exitCode: 0, stdout: '{"status":"ok"}', stderr: '' });

    await expect(recoveryPromise).resolves.toEqual({
      exitCode: 0,
      stdout: '{"status":"ok"}',
      stderr: ''
    });
  });

  it('returns null when the exec promise still rejects after abort', async () => {
    const abortController = new AbortController();
    const recoveryPromise = childLaneRunnerTest.recoverProviderLinearChildLaneExecResultAfterAbort({
      abortController,
      error: new Error('startup timeout'),
      execPromise: Promise.reject(new Error('exec failed')),
      execSettled: false
    });

    expect(abortController.signal.aborted).toBe(true);
    await expect(recoveryPromise).resolves.toBeNull();
  });
});
