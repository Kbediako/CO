import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

describe('codex-orchestrator linear help', () => {
  it('lists the delete-workpad helper subcommand', () => {
    const result = spawnSync(
      process.execPath,
      ['--no-warnings', '--loader', 'ts-node/esm', 'bin/codex-orchestrator.ts', 'linear', 'help'],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('delete-workpad');
    expect(result.stdout).toMatch(
      /--issue-id <id>\s+Linear issue id\/key whose workpad should be deleted\./
    );
    expect(result.stdout).toMatch(/--comment-id <id>\s+Optional persisted workpad comment id to delete\./);
    expect(result.stdout).toContain('runtime-proof');
    expect(result.stdout).toMatch(/--origin <url>\s+App origin whose permit posture should be evaluated\./);
    expect(result.stdout).toMatch(
      /--proof-url <url>\s+Reviewer-usable proof URL for workpad\/PR handoff generation\./
    );
    expect(result.stdout).toMatch(
      /--reachability-mode <mode>\s+Optional reviewer reachability mode: deterministic \(default\) or dns-public\./
    );
    expect(result.stdout).toContain('parallelization');
    expect(result.stdout).toContain('Parallel-first rule: create a pre-turn decomposition matrix before the decision.');
    expect(result.stdout).toContain('Matrix columns: candidate lane, file/phase scope, dependencies, overlap risk,');
    expect(result.stdout).toContain('stay_serial is invalid while any safe independent child-lane candidate remains');
    expect(result.stdout).toContain('Child-lane cap: at most 2 active, pending, or unaccepted same-issue child lanes.');
    expect(result.stdout).toContain('include cap_exhausted: evidence');
    expect(result.stdout).toContain('legacy claims without timestamps, are recoverable');
    expect(result.stdout).toContain('Parent ownership: avoid delegated files/phases while a child lane is active');
  });
});
