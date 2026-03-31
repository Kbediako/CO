import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const cliEntrypoint = fileURLToPath(new URL('../../bin/codex-orchestrator.ts', import.meta.url));
const cliHelpTimeoutMs = 30_000;

describe('codex-orchestrator CLI monitor alias', () => {
  it('lists co-status in the top-level help output', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--loader', 'ts-node/esm', cliEntrypoint, '--help'],
      { cwd: repoRoot }
    );

    expect(stdout).toContain('co-status [options]');
    expect(stdout).toContain('Launch the live CO STATUS dashboard through the control-host path.');
  }, cliHelpTimeoutMs);

  it('prints dedicated co-status help', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--loader', 'ts-node/esm', cliEntrypoint, 'co-status', '--help'],
      { cwd: repoRoot }
    );

    expect(stdout).toContain('Usage: codex-orchestrator co-status [options]');
    expect(stdout).toContain('Dedicated monitor alias for the live CO STATUS dashboard.');
    expect(stdout).toContain('This reuses the same host/runtime path as `control-host`.');
  }, cliHelpTimeoutMs);

  for (const helpArg of ['help', '-h']) {
    it(`treats co-status ${helpArg} as a help request`, async () => {
      const { stdout } = await execFileAsync(
        process.execPath,
        ['--loader', 'ts-node/esm', cliEntrypoint, 'co-status', helpArg],
        { cwd: repoRoot }
      );

      expect(stdout).toContain('Usage: codex-orchestrator co-status [options]');
      expect(stdout).toContain('Dedicated monitor alias for the live CO STATUS dashboard.');
    }, cliHelpTimeoutMs);
  }
});
