import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const sourceCliEntrypoint = fileURLToPath(new URL('../../bin/codex-orchestrator.ts', import.meta.url));
const builtCliEntrypoint = fileURLToPath(new URL('../../dist/bin/codex-orchestrator.js', import.meta.url));
const cliEntrypoint = existsSync(builtCliEntrypoint) ? builtCliEntrypoint : sourceCliEntrypoint;
const cliHelpTimeoutMs = 120_000;

function buildCliArgs(args: string[]): string[] {
  if (cliEntrypoint === builtCliEntrypoint) {
    return [cliEntrypoint, ...args];
  }
  return ['--loader', 'ts-node/esm', cliEntrypoint, ...args];
}

describe('codex-orchestrator CLI monitor alias', () => {
  it('lists co-status in the top-level help output', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      buildCliArgs(['--help']),
      { cwd: repoRoot }
    );

    expect(stdout).toContain('co-status [options]');
    expect(stdout).toContain(
      'Attach the CO STATUS terminal viewer or emit the current snapshot from an already-running local control-host.'
    );
  }, cliHelpTimeoutMs);

  it('prints dedicated co-status help', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      buildCliArgs(['co-status', '--help']),
      { cwd: repoRoot }
    );

    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('codex-orchestrator co-status [options]');
    expect(stdout).toContain('codex-orchestrator co-status attach [options]');
    expect(stdout).toContain('Attach the CO STATUS terminal viewer to an already-running local JSON control-host,');
    expect(stdout).toContain('or emit the current CO STATUS snapshot from that host in JSON mode.');
    expect(stdout).toContain('Emit the cheap machine-health snapshot from the local control-host and exit.');
    expect(stdout).toContain('In JSON mode, emit the full /ui/data.json operator-dashboard snapshot.');
    expect(stdout).toContain('Use `control-host --format json` for startup readiness output.');
    expect(stdout).toContain('Attach subcommand:');
    expect(stdout).toContain('Run `codex-orchestrator co-status attach --help` for attach flags.');
    expect(stdout).not.toContain('Pipeline used for provider-driven starts');
  }, cliHelpTimeoutMs);

  it('prints dedicated co-status attach help', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      buildCliArgs(['co-status', 'attach', '--help']),
      { cwd: repoRoot }
    );

    expect(stdout).toContain('Usage: codex-orchestrator co-status attach [options]');
    expect(stdout).toContain(
      'Attach a read-only CO STATUS viewer to an already-running local JSON control-host.'
    );
    expect(stdout).toContain('This reads persisted endpoint/auth artifacts and does not start another control-host,');
    expect(stdout).toContain('Linear poller, or Telegram poller.');
    expect(stdout).toContain('the viewer re-resolves the endpoint on fetch failures');
    expect(stdout).toContain('--run-dir <path>');
    expect(stdout).toContain('--manifest-path <path>');
  }, cliHelpTimeoutMs);

  it('prints control-host help with the provider worker default pipeline', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      buildCliArgs(['control-host', '--help']),
      { cwd: repoRoot }
    );

    expect(stdout).toContain('codex-orchestrator control-host [options]');
    expect(stdout).toContain('Pipeline used for provider-driven starts (default: provider-linear-worker).');
    expect(stdout).toContain(
      'codex-orchestrator control-host supervise <install|status|restart|uninstall|run> [options]'
    );
    expect(stdout).toContain(
      'supervise install     Install a launchd LaunchAgent-backed local control-host supervisor.'
    );
  }, cliHelpTimeoutMs);

  it('prints dedicated control-host supervision help', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      buildCliArgs(['control-host', 'supervise', '--help']),
      { cwd: repoRoot }
    );

    expect(stdout).toContain(
      'Usage: codex-orchestrator control-host supervise <install|status|restart|uninstall|run> [options]'
    );
    expect(stdout).toContain(
      'Install the macOS launchd LaunchAgent plus generated config/state files.'
    );
    expect(stdout).toContain(
      '--env-files <csv|none>      Comma-separated env/bootstrap files to source before launch.'
    );
    expect(stdout).toContain(
      '--unhealthy-threshold <n>   Consecutive unhealthy samples before launchd restart (default: 3).'
    );
    expect(stdout).toContain(
      '--label <value>             LaunchAgent label (default: com.kbediako.co.control-host).'
    );
  }, cliHelpTimeoutMs);

  for (const helpArg of ['help', '-h']) {
    it(`treats co-status ${helpArg} as a help request`, async () => {
      const { stdout } = await execFileAsync(
        process.execPath,
        buildCliArgs(['co-status', helpArg]),
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
        buildCliArgs(['co-status', 'attach', 'unexpected-arg']),
        { cwd: repoRoot }
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown co-status attach argument(s): unexpected-arg')
    });
  }, cliHelpTimeoutMs);

  it('rejects unexpected positional arguments for doctor', async () => {
    await expect(
      execFileAsync(
        process.execPath,
        buildCliArgs(['doctor', 'unexpected-arg']),
        { cwd: repoRoot }
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown doctor argument(s): unexpected-arg')
    });
  }, cliHelpTimeoutMs);

  it('prints dedicated doctor help with the apply/json limitation', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      buildCliArgs(['doctor', '--help']),
      { cwd: repoRoot }
    );

    expect(stdout).toContain('Usage: codex-orchestrator doctor [options]');
    expect(stdout).toContain(
      '--format json         Emit machine-readable output (not supported with --apply).'
    );
  }, cliHelpTimeoutMs);
});
