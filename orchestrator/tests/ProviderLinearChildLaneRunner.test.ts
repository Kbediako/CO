import { execFileSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME,
  __test__ as childLaneRunnerTest,
  runProviderLinearChildLane
} from '../src/cli/providerLinearChildLaneRunner.js';
import { PROVIDER_LINEAR_CHILD_LANE_DIAGNOSTICS_FILENAME } from '../src/cli/providerLinearWorkerRunner.js';

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

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8'
  }).trim();
}

async function initGitRepo(repoPath: string): Promise<string> {
  await mkdir(repoPath, { recursive: true });
  runGit(repoPath, ['init']);
  runGit(repoPath, ['config', 'user.name', 'Codex Test']);
  runGit(repoPath, ['config', 'user.email', 'codex@example.com']);
  await writeFile(join(repoPath, 'README.md'), 'initial\n', 'utf8');
  runGit(repoPath, ['add', 'README.md']);
  runGit(repoPath, ['commit', '-m', 'initial']);
  return runGit(repoPath, ['rev-parse', 'HEAD']);
}

describe('provider linear child lane runner', () => {
  it('plans removal of only the current trusted child-lane entry when a trusted parent workspace already exists', () => {
    const rawConfig = [
      'model = "gpt-5.5"',
      '',
      '[projects]',
      '[projects."/Users/kbediako/Code/CO"]',
      'trust_level = "trusted"',
      '',
      '[projects."/Users/kbediako/Code/CO/.workspaces/linear-123"]',
      'trust_level = "trusted"',
      '',
      '[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a"]',
      'trust_level = "trusted"',
      '',
      '[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/tests-b"]',
      'trust_level = "trusted"',
      '',
      '[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/tests-c"]',
      'trust_level = "untrusted"',
      '',
      '[projects."/Users/kbediako/Code/other]x"]',
      'trust_level = "trusted"',
      '',
      '[[profiles]]',
      'name = "default"',
      ''
    ].join('\n');

    const plan = childLaneRunnerTest.planTrustedProjectCleanup({
      rawConfig,
      laneWorkspacePath: '/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a',
      configPath: '/Users/kbediako/.codex/config.toml'
    });

    expect(plan.anchorProject).toBe('/Users/kbediako/Code/CO/.workspaces/linear-123');
    expect(plan.removedProjects).toEqual(['/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a']);
    expect(plan.changed).toBe(true);
    expect(plan.nextConfig).not.toContain('[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a"]');
    expect(plan.nextConfig).toContain('[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/tests-b"]');
    expect(plan.nextConfig).toContain('[projects."/Users/kbediako/Code/CO/.workspaces/linear-123"]');
    expect(plan.nextConfig).toContain('[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/tests-c"]');
    expect(plan.nextConfig).toContain('[projects."/Users/kbediako/Code/other]x"]');
    expect(plan.nextConfig).toContain('[[profiles]]');
  });

  it('removes nested tables and ignores multiline header-like content inside the removed project block', () => {
    const laneWorkspacePath = '/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a';
    const siblingWorkspacePath = '/Users/kbediako/Code/CO/.workspaces/linear-keep';
    const rawConfig = [
      '[ "projects" ]',
      '[ "projects" . "/Users/kbediako/Code/CO" ]',
      'trust_level = "trusted"',
      `[ "projects" . "${siblingWorkspacePath}" ]`,
      'trust_level = "trusted"',
      'notes = """',
      `[projects . "${laneWorkspacePath}"]`,
      '"""',
      'keep_flag = "still-here"',
      `[ "projects" . "${laneWorkspacePath}" ]`,
      'trust_level = "trusted"',
      'notes = [',
      '  [1,2]',
      ']',
      `[ "projects" . "${laneWorkspacePath}" . metadata ]`,
      'owner = "codex"',
      `[[ "projects" . "${laneWorkspacePath}" . metadata . links ]]`,
      'target = "proof"',
      '[ "projects" . "/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/tests-b" ]',
      'trust_level = "trusted"',
      '[[profiles]]',
      'name = "default"'
    ].join('\n');

    const plan = childLaneRunnerTest.planTrustedProjectCleanup({
      rawConfig,
      laneWorkspacePath,
      configPath: '/Users/kbediako/.codex/config.toml'
    });

    expect(plan.removedProjects).toEqual([laneWorkspacePath]);
    for (const expected of [
      `[ "projects" . "${siblingWorkspacePath}" ]`,
      `notes = """\n[projects . "${laneWorkspacePath}"]\n"""`,
      'keep_flag = "still-here"',
      '[ "projects" . "/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/tests-b" ]',
      '[[profiles]]'
    ]) {
      expect(plan.nextConfig).toContain(expected);
    }
    for (const unexpected of [
      `[ "projects" . "${laneWorkspacePath}" ]\ntrust_level = "trusted"`,
      `[ "projects" . "${laneWorkspacePath}" . metadata ]`,
      `[[ "projects" . "${laneWorkspacePath}" . metadata . links ]]`,
      '  [1,2]'
    ]) {
      expect(plan.nextConfig).not.toContain(unexpected);
    }
  });

  it('removes redundant inline entries and fails closed for multiline dotted project values', () => {
    const parentWorkspacePath = '/Users/kbediako/Code/CO';
    const laneWorkspacePath = '/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a';
    const siblingWorkspacePath = '/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/tests-b';
    const rawConfig = [
      `"projects"."${parentWorkspacePath}" = { trust_level = "trusted" }`,
      `"projects"."${laneWorkspacePath}".trust_level = "trusted"`,
      `"projects"."${laneWorkspacePath}".tags = ["]",`,
      '  "remove me"',
      ']',
      `"projects"."${siblingWorkspacePath}" = { trust_level = "trusted" }`,
      '[[profiles]]',
      'name = "default"'
    ].join('\n');

    const plan = childLaneRunnerTest.planTrustedProjectCleanup({
      rawConfig,
      laneWorkspacePath,
      configPath: '/Users/kbediako/.codex/config.toml'
    });

    expect(plan.anchorProject).toBe(parentWorkspacePath);
    expect(plan.removedProjects).toEqual([laneWorkspacePath]);
    expect(plan.changed).toBe(true);
    expect(plan.nextConfig).toContain(`"${parentWorkspacePath}" = { trust_level = "trusted" }`);
    expect(plan.nextConfig).not.toContain(`"${laneWorkspacePath}".trust_level = "trusted"`);
    expect(plan.nextConfig).toContain(`"${laneWorkspacePath}".tags = ["]",\n  "remove me"\n]`);
    expect(plan.nextConfig).toContain(`"${siblingWorkspacePath}" = { trust_level = "trusted" }`);
    expect(plan.nextConfig).toContain('[[profiles]]');
  });

  it('does not remove child-lane trust entries when no separate trusted ancestor exists', () => {
    const rawConfig = [
      '[projects]',
      '[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a"]',
      'trust_level = "trusted"',
      ''
    ].join('\n');

    const plan = childLaneRunnerTest.planTrustedProjectCleanup({
      rawConfig,
      laneWorkspacePath: '/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a',
      configPath: '/Users/kbediako/.codex/config.toml'
    });

    expect(plan.anchorProject).toBeNull();
    expect(plan.removedProjects).toEqual([]);
    expect(plan.changed).toBe(false);
    expect(plan.nextConfig).toBeNull();
  });

  it('uses the stable repo root as the cleanup anchor but leaves sibling child lanes untouched', () => {
    const rawConfig = [
      '[projects]',
      '[projects."/Users/kbediako/Code/CO"]',
      'trust_level = "trusted"',
      '',
      '[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a"]',
      'trust_level = "trusted"',
      '',
      '[projects."/Users/kbediako/Code/CO/.workspaces/linear-456/.child-lanes/tests-b"]',
      'trust_level = "trusted"',
      '',
      '[projects."/Users/kbediako/Code/tower-defence"]',
      'trust_level = "trusted"',
      '',
      '[projects."/Users/kbediako/Code/tower-defence/.child-lanes/other"]',
      'trust_level = "trusted"',
      ''
    ].join('\n');

    const plan = childLaneRunnerTest.planTrustedProjectCleanup({
      rawConfig,
      laneWorkspacePath: '/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a',
      configPath: '/Users/kbediako/.codex/config.toml'
    });

    expect(plan.anchorProject).toBe('/Users/kbediako/Code/CO');
    expect(plan.removedProjects).toEqual(['/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a']);
    expect(plan.nextConfig).not.toContain('[projects."/Users/kbediako/Code/CO/.workspaces/linear-123/.child-lanes/docs-a"]');
    expect(plan.nextConfig).toContain('[projects."/Users/kbediako/Code/CO/.workspaces/linear-456/.child-lanes/tests-b"]');
    expect(plan.nextConfig).toContain('[projects."/Users/kbediako/Code/tower-defence"]');
    expect(plan.nextConfig).toContain('[projects."/Users/kbediako/Code/tower-defence/.child-lanes/other"]');
  });

  it('compacts redundant trusted child-lane entries after a child-lane run completes', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const parentWorkspacePath = join(tempRoot, 'workspace');
    const parentBaseSha = await initGitRepo(parentWorkspacePath);
    const codexHome = join(tempRoot, '.codex');
    const configPath = join(codexHome, 'config.toml');
    const runDir = join(tempRoot, '.runs', 'linear-lin-issue-1-docs', 'cli', 'child-run-1');
    const manifestPath = join(runDir, 'manifest.json');
    await mkdir(runDir, { recursive: true });
    await mkdir(codexHome, { recursive: true });
    await writeFile(
      configPath,
      [
        '[projects]',
        `[projects."${parentWorkspacePath}"]`,
        'trust_level = "trusted"',
        '',
        `[projects."${join(parentWorkspacePath, '.child-lanes', 'tests-sibling')}"]`,
        'trust_level = "trusted"',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'child-run-1',
        task_id: 'linear-lin-issue-1-docs',
        parent_run_id: 'provider-run-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-307'
      }),
      'utf8'
    );

    const proof = await runProviderLinearChildLane(
      {
        CODEX_HOME: codexHome,
        CODEX_ORCHESTRATOR_ROOT: parentWorkspacePath,
        CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
        CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli',
        CODEX_PROVIDER_LINEAR_CHILD_LANE_STREAM: 'docs',
        CODEX_PROVIDER_LINEAR_CHILD_LANE_PURPOSE: 'Validate trusted-project cleanup',
        CODEX_PROVIDER_LINEAR_CHILD_LANE_FILES: JSON.stringify(['README.md']),
        CODEX_PROVIDER_LINEAR_CHILD_LANE_PHASES: JSON.stringify(['docs']),
        CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH: parentWorkspacePath,
        CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA: parentBaseSha,
        CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT: '2026-04-22T10:00:00.000Z',
        CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT: '2026-04-22T10:00:00.000Z',
        CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE: 'In Progress',
        CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE: 'started'
      },
      {
        execRunner: async (request) => {
          await writeFile(
            configPath,
            [
              await readFile(configPath, 'utf8'),
              `[projects."${request.cwd}"]`,
              'trust_level = "trusted"',
              ''
            ].join('\n'),
            'utf8'
          );
          await writeFile(join(request.cwd, 'README.md'), 'child-lane change\n', 'utf8');
          return {
            exitCode: 0,
            stdout: [
              '{"type":"session_meta","payload":{"id":"thread-1"}}',
              '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
            ].join('\n'),
            stderr: ''
          };
        }
      }
    );

    const finalConfig = await readFile(configPath, 'utf8');
    const diagnostics = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_CHILD_LANE_DIAGNOSTICS_FILENAME), 'utf8')
    ) as Record<string, unknown>;
    const finalManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    expect(proof.lane_workspace_path).toBe(join(parentWorkspacePath, '.child-lanes', 'docs-child-run-1'));
    expect(diagnostics).toMatchObject({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-307',
      task_id: 'linear-lin-issue-1-docs',
      run_id: 'child-run-1',
      parent_run_id: 'provider-run-1',
      stream: 'docs',
      provider_linear_child_lane_runtime_requested_mode: 'cli',
      provider_linear_child_lane_runtime_selected_mode: 'cli',
      provider_linear_child_lane_runtime_source: 'flag',
      provider_linear_child_lane_runtime_provider: 'CliRuntimeProvider',
      provider_linear_child_lane_runtime_fallback_occurred: false,
      provider_linear_child_lane_runtime_event: 'codex_exec_completed',
      provider_linear_child_lane_exec_exit_code: 0
    });
    expect(finalManifest.provider_linear_child_lane_runtime_event).toBeUndefined();
    expect(finalConfig).toContain(`[projects."${parentWorkspacePath}"]`);
    expect(finalConfig).not.toContain(`[projects."${proof.lane_workspace_path}"]`);
    expect(finalConfig).toContain(`[projects."${join(parentWorkspacePath, '.child-lanes', 'tests-sibling')}"]`);
  });

  it('still compacts the current lane trust entry when post-exec patch export fails', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const parentWorkspacePath = join(tempRoot, 'workspace');
    const parentBaseSha = await initGitRepo(parentWorkspacePath);
    const codexHome = join(tempRoot, '.codex');
    const configPath = join(codexHome, 'config.toml');
    const runDir = join(tempRoot, '.runs', 'linear-lin-issue-1-docs', 'cli', 'child-run-1');
    const manifestPath = join(runDir, 'manifest.json');
    await mkdir(runDir, { recursive: true });
    await mkdir(codexHome, { recursive: true });
    await writeFile(
      configPath,
      [
        '[projects]',
        `[projects."${parentWorkspacePath}"]`,
        'trust_level = "trusted"',
        ''
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: 'child-run-1',
        task_id: 'linear-lin-issue-1-docs',
        parent_run_id: 'provider-run-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-307'
      }),
      'utf8'
    );

    await expect(
      runProviderLinearChildLane(
        {
          CODEX_HOME: codexHome,
          CODEX_ORCHESTRATOR_ROOT: parentWorkspacePath,
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli',
          CODEX_PROVIDER_LINEAR_CHILD_LANE_STREAM: 'docs',
          CODEX_PROVIDER_LINEAR_CHILD_LANE_PURPOSE: 'Validate trusted-project cleanup',
          CODEX_PROVIDER_LINEAR_CHILD_LANE_FILES: JSON.stringify(['README.md']),
          CODEX_PROVIDER_LINEAR_CHILD_LANE_PHASES: JSON.stringify(['docs']),
          CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH: parentWorkspacePath,
          CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA: parentBaseSha,
          CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT: '2026-04-22T10:00:00.000Z',
          CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT: '2026-04-22T10:00:00.000Z',
          CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE: 'In Progress',
          CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE: 'started'
        },
        {
          execRunner: async (request) => {
            await writeFile(
              configPath,
              [
                await readFile(configPath, 'utf8'),
                `[projects."${request.cwd}"]`,
                'trust_level = "trusted"',
                ''
              ].join('\n'),
              'utf8'
            );
            await writeFile(join(request.cwd, 'README.md'), `${'x'.repeat((21 * 1024 * 1024) + 1024)}\n`, 'utf8');
            return {
              exitCode: 0,
              stdout: [
                '{"type":"session_meta","payload":{"id":"thread-1"}}',
                '{"type":"turn_context","payload":{"turn_id":"turn-1"}}'
              ].join('\n'),
              stderr: ''
            };
          }
        }
      )
    ).rejects.toThrow(/maxBuffer|stdout maxBuffer length exceeded/i);

    const finalConfig = await readFile(configPath, 'utf8');
    const proof = JSON.parse(
      await readFile(join(runDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME), 'utf8')
    ) as {
      status: string;
      thread_id: string | null;
      latest_turn_id: string | null;
      latest_session_id: string | null;
      latest_session_id_source: string | null;
      last_message: string | null;
      patch_bytes: number;
      patch_artifact_path: string;
    };
    expect(finalConfig).toContain(`[projects."${parentWorkspacePath}"]`);
    expect(finalConfig).not.toContain('.child-lanes/docs-child-run-1');
    expect(proof.status).toBe('failed');
    expect(proof.thread_id).toBe('thread-1');
    expect(proof.latest_turn_id).toBe('turn-1');
    expect(proof.latest_session_id).toBe('thread-1-turn-1');
    expect(proof.latest_session_id_source).toBe('derived_from_thread_and_turn');
    expect(proof.last_message).toMatch(/maxBuffer|stdout maxBuffer length exceeded/i);
    expect(proof.patch_bytes).toBe(0);
    expect(proof.patch_artifact_path).toBe(join(runDir, 'provider-linear-child-lane.patch'));
  });

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

  it('tells docs-scoped provider child lanes to keep packet keys rooted at the issue task key', () => {
    const prompt = childLaneRunnerTest.buildChildLanePrompt({
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-557',
      taskId: 'linear-lin-issue-1-docs-packet',
      stream: 'docs-packet',
      purpose: 'Create a docs-first packet.',
      scope: {
        files: [
          'docs/PRD-linear-lin-issue-1.md',
          'tasks/tasks-linear-lin-issue-1.md',
          'tasks/index.json'
        ],
        phases: ['docs']
      },
      runMemoryPromptLines: [],
      instructions: null
    });

    expect(prompt).toContain('Provider docs packet task-key contract:');
    expect(prompt).toContain('Use `linear-lin-issue-1` as the registered provider issue task key');
    expect(prompt).toContain('Do not append issue-title, retry, or freshness suffixes');
    expect(prompt).toContain('`linear-lin-issue-1-docs-packet`');
    expect(prompt).toContain('`linear-lin-issue-1-docs-review`');
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

  it('extracts parent-owned GitHub and Linear drift evidence from an appserver child session log', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const sessionLogPath = join(tempRoot, 'rollout-drift.jsonl');
    await writeFile(
      sessionLogPath,
      [
        '{"timestamp":"2026-04-22T05:53:31.453Z","type":"response_item","payload":{"type":"function_call","name":"exec_command","arguments":"{\\"cmd\\":\\"gh pr view 597 --comments\\",\\"workdir\\":\\"/tmp/child\\"}","call_id":"call-1"}}',
        '{"timestamp":"2026-04-22T06:12:49.011Z","type":"response_item","payload":{"type":"tool_search_call","call_id":"call-2","arguments":{"query":"Linear list issues update issue GitHub pull request checks comments","limit":12}}}'
      ].join('\n'),
      'utf8'
    );

    await expect(
      childLaneRunnerTest.scanProviderLinearChildLaneSessionLogForParentScopeDrift(sessionLogPath)
    ).resolves.toEqual([
      '2026-04-22T05:53:31.453Z exec_command gh pr view 597 --comments',
      '2026-04-22T06:12:49.011Z tool_search Linear list issues update issue GitHub pull request checks comments'
    ]);
  });

  it('ignores historical appserver drift entries that predate the current child-lane launch', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const sessionLogPath = join(tempRoot, 'rollout-drift-windowed.jsonl');
    await writeFile(
      sessionLogPath,
      [
        '{"timestamp":"2026-04-22T05:53:31.453Z","type":"response_item","payload":{"type":"function_call","name":"exec_command","arguments":"{\\"cmd\\":\\"gh pr view 597 --comments\\",\\"workdir\\":\\"/tmp/child\\"}","call_id":"call-old"}}',
        '{"timestamp":"2026-04-22T06:12:49.011Z","type":"response_item","payload":{"type":"tool_search_call","call_id":"call-new","arguments":{"query":"PR #597 comments","limit":12}}}'
      ].join('\n'),
      'utf8'
    );

    await expect(
      childLaneRunnerTest.scanProviderLinearChildLaneSessionLogForParentScopeDrift(
        sessionLogPath,
        '2026-04-22T06:00:00.000Z'
      )
    ).resolves.toEqual(['2026-04-22T06:12:49.011Z tool_search PR #597 comments']);
  });

  it('does not treat benign tool_search queries containing only the word linear as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:12:49.011Z',
        type: 'response_item',
        payload: {
          type: 'tool_search_call',
          call_id: 'call-benign',
          arguments: {
            query: 'linear child lane patch artifact format',
            limit: 12
          }
        }
      })
    ).toEqual([]);
  });

  it('does not treat benign GitHub technical searches as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:12:49.500Z',
        type: 'response_item',
        payload: {
          type: 'tool_search_call',
          call_id: 'call-benign-github',
          arguments: {
            query: 'GitHub markdown docs table syntax',
            limit: 12
          }
        }
      })
    ).toEqual([]);
  });

  it('does not treat benign plural pull request technical searches as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:12:49.750Z',
        type: 'response_item',
        payload: {
          type: 'tool_search_call',
          call_id: 'call-benign-pr-plural',
          arguments: {
            query: 'GitHub pull requests REST API docs',
            limit: 12
          }
        }
      })
    ).toEqual([]);
  });

  it('treats PR shorthand tool_search queries as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:12:50.000Z',
        type: 'response_item',
        payload: {
          type: 'tool_search_call',
          call_id: 'call-pr-shorthand',
          arguments: {
            query: 'PR #597 comments',
            limit: 12
          }
        }
      })
    ).toEqual(['2026-04-22T06:12:50.000Z tool_search PR #597 comments']);
  });

  it('treats plural pull request lifecycle searches as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:12:51.000Z',
        type: 'response_item',
        payload: {
          type: 'tool_search_call',
          call_id: 'call-pr-plural',
          arguments: {
            query: 'open pull requests for repo',
            limit: 12
          }
        }
      })
    ).toEqual(['2026-04-22T06:12:51.000Z tool_search open pull requests for repo']);
  });

  it('treats PR shorthand plural searches as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:12:51.250Z',
        type: 'response_item',
        payload: {
          type: 'tool_search_call',
          call_id: 'call-pr-shorthand-plural',
          arguments: {
            query: 'open PRs for repo',
            limit: 12
          }
        }
      })
    ).toEqual(['2026-04-22T06:12:51.250Z tool_search open PRs for repo']);
  });

  it('treats PR lifecycle function calls without github or linear substrings as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:00.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'mcp__make_pr__make_pr'
        }
      })
    ).toEqual(['2026-04-22T06:13:00.000Z function_call mcp__make_pr__make_pr']);
  });

  it('treats git commit and push commands with global git flags as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:30.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'git -C /tmp/child commit -m "child commit"',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:30.000Z exec_command git -C /tmp/child commit -m "child commit"']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:31.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'git -c credential.helper=store push https://example.invalid/repo.git HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([
      '2026-04-22T06:13:31.000Z exec_command git -c credential.helper=store push https://example.invalid/repo.git HEAD'
    ]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:32.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: '/usr/bin/git push origin HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:32.000Z exec_command /usr/bin/git push origin HEAD']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:32.250Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'command git push origin HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:32.250Z exec_command command git push origin HEAD']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:32.500Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'command gh pr view',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:32.500Z exec_command command gh pr view']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:32.750Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'eval "git push origin HEAD"',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:32.750Z exec_command eval "git push origin HEAD"']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:32.875Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'eval "gh pr view 123"',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:32.875Z exec_command eval "gh pr view 123"']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:33.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'git status && git push origin HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:33.000Z exec_command git status && git push origin HEAD']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:34.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'git status&&git push origin HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:34.000Z exec_command git status&&git push origin HEAD']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:35.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'bash -lc "git push origin HEAD"',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:35.000Z exec_command bash -lc "git push origin HEAD"']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:36.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: "sh -c 'git commit -m \"child commit\"'",
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:36.000Z exec_command sh -c \'git commit -m "child commit"\'']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:37.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'env GIT_TRACE=1 git push origin HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:37.000Z exec_command env GIT_TRACE=1 git push origin HEAD']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:37.500Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'GIT_TRACE=1 GIT_SSH_COMMAND=ssh git push origin HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:37.500Z exec_command GIT_TRACE=1 GIT_SSH_COMMAND=ssh git push origin HEAD']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:37.750Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'git status\ngit push origin HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:37.750Z exec_command git status git push origin HEAD']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:37.900Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'node --require ts-node/register codex-orchestrator linear transition --issue-id 123',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([
      '2026-04-22T06:13:37.900Z exec_command node --require ts-node/register codex-orchestrator linear transition --issue-id 123'
    ]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:37.950Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'env -u GIT_DIR git push origin HEAD',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:37.950Z exec_command env -u GIT_DIR git push origin HEAD']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:37.975Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'bash -o pipefail -c "git push origin HEAD"',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual(['2026-04-22T06:13:37.975Z exec_command bash -o pipefail -c "git push origin HEAD"']);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:38.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'codex-orchestrator start provider-linear-worker --issue-id 123',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([
      '2026-04-22T06:13:38.000Z exec_command codex-orchestrator start provider-linear-worker --issue-id 123'
    ]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:38.025Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'npx codex-orchestrator start provider-linear-worker --issue-id 123',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([
      '2026-04-22T06:13:38.025Z exec_command npx codex-orchestrator start provider-linear-worker --issue-id 123'
    ]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:38.050Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'npm exec -- codex-orchestrator linear transition --issue-id 123',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([
      '2026-04-22T06:13:38.050Z exec_command npm exec -- codex-orchestrator linear transition --issue-id 123'
    ]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:38.075Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'npx codex-orchestrator@latest start provider-linear-worker --issue-id 123',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([
      '2026-04-22T06:13:38.075Z exec_command npx codex-orchestrator@latest start provider-linear-worker --issue-id 123'
    ]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:38.100Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'npm exec -- codex-orchestrator@latest linear transition --issue-id 123',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([
      '2026-04-22T06:13:38.100Z exec_command npm exec -- codex-orchestrator@latest linear transition --issue-id 123'
    ]);
  });

  it('does not treat shell-wrapped heredoc or echoed git text as scope drift', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:38.100Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'bash -lc "echo git push origin HEAD"',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:39.100Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: `bash -lc "cat >note.txt <<'EOF'\nremember to git commit before pushing\nEOF"`,
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:40.100Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'bash -lc "echo gh pr view"',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:40.200Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: "cat <<'EOF'\ngh pr view\nEOF",
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([]);

    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:40.300Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: 'cat <<-EOF\n\tgit push origin HEAD\nEOF',
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([]);
  });

  it('still detects trailing commands after a quoted heredoc terminator', () => {
    expect(
      childLaneRunnerTest.extractProviderLinearChildLaneScopeDriftEvidenceFromRecord({
        timestamp: '2026-04-22T06:13:40.400Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: JSON.stringify({
            cmd: `bash -lc "cat <<'EOF'\ngh pr view\nEOF" && git push origin HEAD`,
            workdir: '/tmp/child'
          })
        }
      })
    ).toEqual([
      `2026-04-22T06:13:40.400Z exec_command bash -lc "cat <<'EOF' gh pr view EOF" && git push origin HEAD`
    ]);
  });

  it('re-checks the session log after exec settles before clearing scope drift', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const sessionLogPath = join(tempRoot, 'rollout-drift-final-window.jsonl');
    await writeFile(sessionLogPath, '', 'utf8');
    let execSettled = false;

    await expect(
      childLaneRunnerTest.waitForProviderLinearChildLaneScopeDrift({
        context: {
          issueIdentifier: 'CO-303'
        },
        sessionLogPath,
        isExecSettled: () => execSettled,
        deps: {
          sleep: async () => {
            execSettled = true;
            await writeFile(
              sessionLogPath,
              '{"timestamp":"2026-04-22T06:12:49.011Z","type":"response_item","payload":{"type":"function_call","name":"exec_command","arguments":"{\\"cmd\\":\\"gh pr view 597 --comments\\",\\"workdir\\":\\"/tmp/child\\"}","call_id":"call-final-window"}}\n',
              'utf8'
            );
          }
        }
      })
    ).resolves.toContain('Appserver child lane drifted into parent-owned GitHub/Linear/PR lifecycle work for CO-303.');
  });

  it('fails closed when a discovered session log becomes unreadable mid-monitor', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const sessionLogPath = join(tempRoot, 'missing-session-log.jsonl');

    await expect(
      childLaneRunnerTest.waitForProviderLinearChildLaneScopeDrift({
        context: {
          issueIdentifier: 'CO-303'
        },
        sessionLogPath,
        isExecSettled: () => false,
        deps: {
          sleep: async () => undefined
        }
      })
    ).resolves.toContain('drift_monitor_unreadable missing-session-log.jsonl');
  });

  it('detects transient child-lane commits that reset back to the starting head', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const startingHeadSha = await initGitRepo(laneWorkspacePath);
    const startingReflogEntryCount = runGit(laneWorkspacePath, ['reflog', '--format=%H'])
      .split('\n')
      .filter(Boolean).length;

    await writeFile(join(laneWorkspacePath, 'README.md'), 'transient\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'transient child commit']);
    const transientCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    await expect(
      childLaneRunnerTest.detectProviderLinearChildLaneCreatedCommitShas(
        laneWorkspacePath,
        startingHeadSha,
        startingReflogEntryCount
      )
    ).resolves.toEqual([transientCommitSha]);
  });

  it('detects transient child-lane commits created via cherry-pick and merge before resetting to the base', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const startingHeadSha = await initGitRepo(laneWorkspacePath);
    const mainBranch = runGit(laneWorkspacePath, ['branch', '--show-current']);

    runGit(laneWorkspacePath, ['checkout', '-b', 'feature', startingHeadSha]);
    await writeFile(join(laneWorkspacePath, 'feature.txt'), 'feature\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'feature.txt']);
    runGit(laneWorkspacePath, ['commit', '-m', 'feature']);
    const featureCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);

    runGit(laneWorkspacePath, ['checkout', '-b', 'side', startingHeadSha]);
    await writeFile(join(laneWorkspacePath, 'side.txt'), 'side\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'side.txt']);
    runGit(laneWorkspacePath, ['commit', '-m', 'side']);

    runGit(laneWorkspacePath, ['checkout', mainBranch]);
    const startingReflogEntryCount = runGit(laneWorkspacePath, ['reflog', '--format=%H'])
      .split('\n')
      .filter(Boolean).length;

    runGit(laneWorkspacePath, ['cherry-pick', featureCommitSha]);
    const cherryPickCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    runGit(laneWorkspacePath, ['merge', '--no-ff', 'side', '-m', 'merge side']);
    const mergeCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    await expect(
      childLaneRunnerTest.detectProviderLinearChildLaneCreatedCommitShas(
        laneWorkspacePath,
        startingHeadSha,
        startingReflogEntryCount
      )
    ).resolves.toEqual([mergeCommitSha, cherryPickCommitSha]);
  });

  it('detects transient child-lane commits created via rebase before resetting to the base', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    await initGitRepo(laneWorkspacePath);
    const mainBranch = runGit(laneWorkspacePath, ['branch', '--show-current']);

    runGit(laneWorkspacePath, ['checkout', '-b', 'feature']);
    await writeFile(join(laneWorkspacePath, 'feature.txt'), 'feature\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'feature.txt']);
    runGit(laneWorkspacePath, ['commit', '-m', 'feature']);

    runGit(laneWorkspacePath, ['checkout', mainBranch]);
    await writeFile(join(laneWorkspacePath, 'base.txt'), 'base advance\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'base.txt']);
    runGit(laneWorkspacePath, ['commit', '-m', 'base advance']);
    const startingHeadSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    const startingReflogEntryCount = runGit(laneWorkspacePath, ['reflog', '--format=%H'])
      .split('\n')
      .filter(Boolean).length;

    runGit(laneWorkspacePath, ['checkout', 'feature']);
    runGit(laneWorkspacePath, ['rebase', mainBranch]);
    const rebaseCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    await expect(
      childLaneRunnerTest.detectProviderLinearChildLaneCreatedCommitShas(
        laneWorkspacePath,
        startingHeadSha,
        startingReflogEntryCount
      )
    ).resolves.toEqual([rebaseCommitSha]);
  });

  it('detects transient child-lane commits created via rebase continue before resetting to the base', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    await initGitRepo(laneWorkspacePath);
    const mainBranch = runGit(laneWorkspacePath, ['branch', '--show-current']);

    runGit(laneWorkspacePath, ['checkout', '-b', 'feature']);
    await writeFile(join(laneWorkspacePath, 'conflict.txt'), 'feature\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'conflict.txt']);
    runGit(laneWorkspacePath, ['commit', '-m', 'feature']);

    runGit(laneWorkspacePath, ['checkout', mainBranch]);
    await writeFile(join(laneWorkspacePath, 'conflict.txt'), 'main\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'conflict.txt']);
    runGit(laneWorkspacePath, ['commit', '-m', 'main']);
    const startingHeadSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    const startingReflogEntryCount = runGit(laneWorkspacePath, ['reflog', '--format=%H'])
      .split('\n')
      .filter(Boolean).length;

    runGit(laneWorkspacePath, ['checkout', 'feature']);
    expect(() => runGit(laneWorkspacePath, ['rebase', mainBranch])).toThrow();
    await writeFile(join(laneWorkspacePath, 'conflict.txt'), 'main\nfeature\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'conflict.txt']);
    runGit(laneWorkspacePath, ['-c', 'core.editor=true', 'rebase', '--continue']);
    const rebaseCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    await expect(
      childLaneRunnerTest.detectProviderLinearChildLaneCreatedCommitShas(
        laneWorkspacePath,
        startingHeadSha,
        startingReflogEntryCount
      )
    ).resolves.toEqual([rebaseCommitSha]);
  });

  it('detects transient child-lane commits created via git am before resetting to the base', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const startingHeadSha = await initGitRepo(laneWorkspacePath);
    const mainBranch = runGit(laneWorkspacePath, ['branch', '--show-current']);

    runGit(laneWorkspacePath, ['checkout', '-b', 'mail-source', startingHeadSha]);
    await writeFile(join(laneWorkspacePath, 'mail.txt'), 'mail patch\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'mail.txt']);
    runGit(laneWorkspacePath, ['commit', '-m', 'mail patch']);
    const patch = runGit(laneWorkspacePath, ['format-patch', '-1', '--stdout', 'HEAD']);

    runGit(laneWorkspacePath, ['checkout', mainBranch]);
    const patchPath = join(tempRoot, 'mail.patch');
    await writeFile(patchPath, patch, 'utf8');
    const startingReflogEntryCount = runGit(laneWorkspacePath, ['reflog', '--format=%H'])
      .split('\n')
      .filter(Boolean).length;

    runGit(laneWorkspacePath, ['am', patchPath]);
    const amCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    await expect(
      childLaneRunnerTest.detectProviderLinearChildLaneCreatedCommitShas(
        laneWorkspacePath,
        startingHeadSha,
        startingReflogEntryCount
      )
    ).resolves.toEqual([amCommitSha]);
  });

  it('exports the unauthorized commit patch from the newest created commit after a reset to base', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const runDir = join(tempRoot, 'run');
    const startingHeadSha = await initGitRepo(laneWorkspacePath);
    await mkdir(runDir, { recursive: true });

    await writeFile(join(laneWorkspacePath, 'README.md'), 'initial\ntransient\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'transient child commit']);
    const transientCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    const { patchArtifactPath } = await childLaneRunnerTest.createPatchArtifact(
      laneWorkspacePath,
      runDir,
      startingHeadSha,
      transientCommitSha
    );

    await expect(readFile(patchArtifactPath, 'utf8')).resolves.toContain('+transient');
  });

  it('preserves later workspace edits in the patch artifact after resetting to the base', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const runDir = join(tempRoot, 'run');
    const startingHeadSha = await initGitRepo(laneWorkspacePath);
    await mkdir(runDir, { recursive: true });

    await writeFile(join(laneWorkspacePath, 'README.md'), 'initial\ntransient\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'transient child commit']);
    const transientCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);
    await writeFile(join(laneWorkspacePath, 'workspace.txt'), 'workspace\n', 'utf8');

    const { patchArtifactPath } = await childLaneRunnerTest.createPatchArtifact(
      laneWorkspacePath,
      runDir,
      startingHeadSha,
      transientCommitSha,
      startingHeadSha
    );

    const patchContent = await readFile(patchArtifactPath, 'utf8');
    expect(patchContent).toContain('+transient');
    expect(patchContent).toContain('workspace.txt');
    expect(patchContent).toContain('+workspace');
  });

  it('structurally composes transient commit and later workspace edits for the same file', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const applyWorkspacePath = join(tempRoot, 'apply-workspace');
    const runDir = join(tempRoot, 'run');
    await initGitRepo(laneWorkspacePath);
    await mkdir(runDir, { recursive: true });

    const baselineLines = [
      'line 01',
      'line 02',
      'line 03',
      'line 04',
      'line 05',
      'line 06',
      'line 07',
      'line 08',
      'line 09',
      'line 10',
      'line 11',
      'line 12'
    ];
    const baselineContent = `${baselineLines.join('\n')}\n`;
    const composedLines = [...baselineLines];
    composedLines[1] = 'line 02 transient';
    composedLines[9] = 'line 10 workspace';
    const composedContent = `${composedLines.join('\n')}\n`;

    await writeFile(join(laneWorkspacePath, 'README.md'), baselineContent, 'utf8');
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'baseline fixture']);
    const startingHeadSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);

    await writeFile(
      join(laneWorkspacePath, 'README.md'),
      `${baselineLines
        .map((line, index) => (index === 1 ? 'line 02 transient' : line))
        .join('\n')}\n`,
      'utf8'
    );
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'transient child commit']);
    const transientCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    await writeFile(
      join(laneWorkspacePath, 'README.md'),
      `${baselineLines
        .map((line, index) => (index === 9 ? 'line 10 workspace' : line))
        .join('\n')}\n`,
      'utf8'
    );

    const { patchArtifactPath } = await childLaneRunnerTest.createPatchArtifact(
      laneWorkspacePath,
      runDir,
      startingHeadSha,
      transientCommitSha,
      startingHeadSha
    );

    const patchContent = await readFile(patchArtifactPath, 'utf8');
    expect(patchContent.match(/^diff --git a\/README\.md b\/README\.md$/gmu) ?? []).toHaveLength(1);
    expect(patchContent).toContain('+line 02 transient');
    expect(patchContent).toContain('+line 10 workspace');

    await initGitRepo(applyWorkspacePath);
    await writeFile(join(applyWorkspacePath, 'README.md'), baselineContent, 'utf8');
    runGit(applyWorkspacePath, ['add', 'README.md']);
    runGit(applyWorkspacePath, ['commit', '-m', 'apply baseline']);

    runGit(applyWorkspacePath, ['apply', '--check', patchArtifactPath]);
    runGit(applyWorkspacePath, ['apply', patchArtifactPath]);
    await expect(readFile(join(applyWorkspacePath, 'README.md'), 'utf8')).resolves.toBe(composedContent);
  });

  it('fails closed when transient commit and workspace edits cannot be composed safely', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const runDir = join(tempRoot, 'run');
    await initGitRepo(laneWorkspacePath);
    await mkdir(runDir, { recursive: true });

    await writeFile(join(laneWorkspacePath, 'README.md'), 'alpha\nbravo\ncharlie\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'baseline fixture']);
    const startingHeadSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);

    await writeFile(join(laneWorkspacePath, 'README.md'), 'alpha\nbravo transient\ncharlie\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'transient child commit']);
    const transientCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);

    await writeFile(join(laneWorkspacePath, 'README.md'), 'alpha\nbravo workspace\ncharlie\n', 'utf8');

    await expect(
      childLaneRunnerTest.createPatchArtifact(
        laneWorkspacePath,
        runDir,
        startingHeadSha,
        transientCommitSha,
        startingHeadSha
      )
    ).rejects.toThrow(/failed closed while composing .* and live workspace changes/u);
  });

  it('bypasses git hooks while composing a temporary workspace snapshot', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const runDir = join(tempRoot, 'run');
    const hooksPath = join(tempRoot, 'hooks');
    await initGitRepo(laneWorkspacePath);
    await mkdir(runDir, { recursive: true });
    await mkdir(hooksPath, { recursive: true });

    const prepareCommitMsgHookPath = join(hooksPath, 'prepare-commit-msg');
    await writeFile(prepareCommitMsgHookPath, '#!/bin/sh\nexit 1\n', 'utf8');
    await chmod(prepareCommitMsgHookPath, 0o755);

    const baselineLines = [
      'line 01',
      'line 02',
      'line 03',
      'line 04',
      'line 05',
      'line 06',
      'line 07',
      'line 08',
      'line 09',
      'line 10',
      'line 11',
      'line 12'
    ];
    await writeFile(join(laneWorkspacePath, 'README.md'), `${baselineLines.join('\n')}\n`, 'utf8');
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'baseline fixture']);
    const startingHeadSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);

    await writeFile(
      join(laneWorkspacePath, 'README.md'),
      `${baselineLines
        .map((line, index) => (index === 1 ? 'line 02 transient' : line))
        .join('\n')}\n`,
      'utf8'
    );
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'transient child commit']);
    const transientCommitSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    runGit(laneWorkspacePath, ['reset', '--hard', startingHeadSha]);
    runGit(laneWorkspacePath, ['config', 'core.hooksPath', hooksPath]);

    await writeFile(
      join(laneWorkspacePath, 'README.md'),
      `${baselineLines
        .map((line, index) => (index === 9 ? 'line 10 workspace' : line))
        .join('\n')}\n`,
      'utf8'
    );

    const { patchArtifactPath } = await childLaneRunnerTest.createPatchArtifact(
      laneWorkspacePath,
      runDir,
      startingHeadSha,
      transientCommitSha,
      startingHeadSha
    );

    const patchContent = await readFile(patchArtifactPath, 'utf8');
    expect(patchContent).toContain('+line 02 transient');
    expect(patchContent).toContain('+line 10 workspace');
  });

  it('ignores plain head movement across existing commits when no child commit was created', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-lane-runner-'));
    const laneWorkspacePath = join(tempRoot, 'workspace');
    const initialHeadSha = await initGitRepo(laneWorkspacePath);

    await writeFile(join(laneWorkspacePath, 'README.md'), 'existing history\n', 'utf8');
    runGit(laneWorkspacePath, ['add', 'README.md']);
    runGit(laneWorkspacePath, ['commit', '-m', 'existing repo commit']);
    const startingHeadSha = runGit(laneWorkspacePath, ['rev-parse', 'HEAD']);
    const startingReflogEntryCount = runGit(laneWorkspacePath, ['reflog', '--format=%H'])
      .split('\n')
      .filter(Boolean).length;

    runGit(laneWorkspacePath, ['checkout', initialHeadSha]);
    runGit(laneWorkspacePath, ['checkout', startingHeadSha]);

    await expect(
      childLaneRunnerTest.detectProviderLinearChildLaneCreatedCommitShas(
        laneWorkspacePath,
        startingHeadSha,
        startingReflogEntryCount
      )
    ).resolves.toEqual([]);
  });

  it('flags unauthorized child-lane commits when HEAD diverges from the parent snapshot base sha', () => {
    expect(
      childLaneRunnerTest.resolveProviderLinearChildLaneUnauthorizedCommitMessage({
        context: { issueIdentifier: 'CO-303' },
        expectedBaseSha: 'base-sha-1',
        currentHeadSha: 'child-commit-1',
        createdCommitShas: ['child-commit-1']
      })
    ).toContain('Child lane created commit(s) child-commit-1 from parent base base-sha-1 for CO-303');
    expect(
      childLaneRunnerTest.resolveProviderLinearChildLaneUnauthorizedCommitMessage({
        context: { issueIdentifier: 'CO-303' },
        expectedBaseSha: 'base-sha-1',
        currentHeadSha: 'child-commit-1',
        createdCommitShas: ['child-commit-1']
      })
    ).toContain('and left HEAD at child-commit-1');
    expect(
      childLaneRunnerTest.resolveProviderLinearChildLaneUnauthorizedCommitMessage({
        context: { issueIdentifier: 'CO-303' },
        expectedBaseSha: 'base-sha-1',
        currentHeadSha: 'base-sha-1',
        createdCommitShas: []
      })
    ).toBeNull();
    expect(
      childLaneRunnerTest.resolveProviderLinearChildLaneUnauthorizedCommitMessage({
        context: { issueIdentifier: 'CO-303' },
        expectedBaseSha: 'base-sha-1',
        currentHeadSha: 'base-sha-1',
        createdCommitShas: ['child-commit-1']
      })
    ).toContain('and reset HEAD back to the parent base');
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
