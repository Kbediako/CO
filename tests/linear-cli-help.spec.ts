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
  });
});
