import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

describe('codex-orchestrator linear help', () => {
  it('lists the delete-workpad helper subcommand', () => {
    const distCliEntry = join(process.cwd(), 'dist', 'bin', 'codex-orchestrator.js');
    const cliEntry = join(process.cwd(), 'bin', 'codex-orchestrator.ts');
    const cliArgs = shouldUseFreshDistSync(cliEntry, distCliEntry)
      ? ['--no-warnings', distCliEntry, 'linear', 'help']
      : ['--no-warnings', '--loader', 'ts-node/esm', cliEntry, 'linear', 'help'];
    const result = spawnSync(
      process.execPath,
      cliArgs,
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
  });
});

function shouldUseFreshDistSync(sourceEntry: string, distEntry: string): boolean {
  const distCliStat = statSync(distEntry, { throwIfNoEntry: false });
  if (!distCliStat?.isFile()) {
    return false;
  }
  const sourceCliStat = statSync(sourceEntry, { throwIfNoEntry: false });
  return !sourceCliStat || distCliStat.mtimeMs >= sourceCliStat.mtimeMs;
}
