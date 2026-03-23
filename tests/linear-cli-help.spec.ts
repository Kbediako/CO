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
    expect(result.stdout).toContain('--comment-id <id>     Optional persisted workpad comment id to delete.');
  });
});
