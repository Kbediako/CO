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
    expect(stdout).toContain('Launch or attach the CO STATUS terminal viewer.');
  }, cliHelpTimeoutMs);

  it('prints dedicated co-status help', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--loader', 'ts-node/esm', cliEntrypoint, 'co-status', '--help'],
      { cwd: repoRoot }
    );

    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('codex-orchestrator co-status [options]');
    expect(stdout).toContain('codex-orchestrator co-status attach [options]');
    expect(stdout).toContain('Launch the live CO STATUS dashboard by starting the control-host path,');
    expect(stdout).toContain('or attach a read-only viewer to an already-running local JSON control-host.');
    expect(stdout).toContain('Pipeline used for provider-driven starts (default: provider-linear-worker).');
    expect(stdout).toContain('Attach subcommand:');
    expect(stdout).toContain('Run `codex-orchestrator co-status attach --help` for attach flags.');
  }, cliHelpTimeoutMs);

  it('prints dedicated co-status attach help', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--loader', 'ts-node/esm', cliEntrypoint, 'co-status', 'attach', '--help'],
      { cwd: repoRoot }
    );

    expect(stdout).toContain('Usage: codex-orchestrator co-status attach [options]');
    expect(stdout).toContain(
      'Attach a read-only CO STATUS viewer to an already-running local JSON control-host.'
    );
    expect(stdout).toContain('This reads persisted endpoint/auth artifacts and does not start another control-host,');
    expect(stdout).toContain('Linear poller, or Telegram poller.');
    expect(stdout).toContain('--run-dir <path>');
    expect(stdout).toContain('--manifest-path <path>');
  }, cliHelpTimeoutMs);

  it('prints control-host help with the provider worker default pipeline', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--loader', 'ts-node/esm', cliEntrypoint, 'control-host', '--help'],
      { cwd: repoRoot }
    );

    expect(stdout).toContain('Usage: codex-orchestrator control-host [options]');
    expect(stdout).toContain('Pipeline used for provider-driven starts (default: provider-linear-worker).');
  }, cliHelpTimeoutMs);

  for (const helpArg of ['help', '-h']) {
    it(`treats co-status ${helpArg} as a help request`, async () => {
      const { stdout } = await execFileAsync(
        process.execPath,
        ['--loader', 'ts-node/esm', cliEntrypoint, 'co-status', helpArg],
        { cwd: repoRoot }
      );

      expect(stdout).toContain('codex-orchestrator co-status [options]');
      expect(stdout).toContain('codex-orchestrator co-status attach [options]');
    }, cliHelpTimeoutMs);
  }

  it('rejects unexpected positional arguments for co-status attach', async () => {
    await expect(
      execFileAsync(
        process.execPath,
        ['--loader', 'ts-node/esm', cliEntrypoint, 'co-status', 'attach', 'unexpected-arg'],
        { cwd: repoRoot }
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown co-status attach argument(s): unexpected-arg')
    });
  }, cliHelpTimeoutMs);
});
