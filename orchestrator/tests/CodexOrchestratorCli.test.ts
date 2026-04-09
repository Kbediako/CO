import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const cliEntrypoint = fileURLToPath(new URL('../../bin/codex-orchestrator.ts', import.meta.url));
const distCliEntrypoint = fileURLToPath(new URL('../../dist/bin/codex-orchestrator.js', import.meta.url));
const cliHelpTimeoutMs = 30_000;

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const cliArgs = await buildCliArgs(args);
  return await execFileAsync(process.execPath, cliArgs, { cwd: repoRoot });
}

async function buildCliArgs(args: string[]): Promise<string[]> {
  return (await shouldUseFreshDist(cliEntrypoint, distCliEntrypoint))
    ? [distCliEntrypoint, ...args]
    : ['--loader', 'ts-node/esm', cliEntrypoint, ...args];
}

async function shouldUseFreshDist(sourceEntry: string, distEntry: string): Promise<boolean> {
  const distCliStat = await stat(distEntry).catch(() => null);
  if (!distCliStat?.isFile()) {
    return false;
  }
  const sourceCliStat = await stat(sourceEntry).catch(() => null);
  return !sourceCliStat || distCliStat.mtimeMs >= sourceCliStat.mtimeMs;
}

describe('codex-orchestrator CLI monitor alias', () => {
  it('lists co-status in the top-level help output', async () => {
    const { stdout } = await runCli(['--help']);

    expect(stdout).toContain('co-status [options]');
    expect(stdout).toContain(
      'Attach the CO STATUS terminal viewer or emit the current snapshot from an already-running local control-host.'
    );
  }, cliHelpTimeoutMs);

  it('prints dedicated co-status help', async () => {
    const { stdout } = await runCli(['co-status', '--help']);

    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('codex-orchestrator co-status [options]');
    expect(stdout).toContain('codex-orchestrator co-status attach [options]');
    expect(stdout).toContain('Attach the CO STATUS terminal viewer to an already-running local JSON control-host,');
    expect(stdout).toContain('or emit the current CO STATUS snapshot from that host in JSON mode.');
    expect(stdout).toContain('Emit the current CO STATUS snapshot from the local control-host and exit.');
    expect(stdout).toContain('Use `control-host --format json` for startup readiness output.');
    expect(stdout).toContain('Attach subcommand:');
    expect(stdout).toContain('Run `codex-orchestrator co-status attach --help` for attach flags.');
    expect(stdout).not.toContain('Pipeline used for provider-driven starts');
  }, cliHelpTimeoutMs);

  it('prints dedicated co-status attach help', async () => {
    const { stdout } = await runCli(['co-status', 'attach', '--help']);

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
    const { stdout } = await runCli(['control-host', '--help']);

    expect(stdout).toContain('Usage: codex-orchestrator control-host [options]');
    expect(stdout).toContain('Pipeline used for provider-driven starts (default: provider-linear-worker).');
  }, cliHelpTimeoutMs);

  for (const helpArg of ['help', '-h']) {
    it(`treats co-status ${helpArg} as a help request`, async () => {
      const { stdout } = await runCli(['co-status', helpArg]);

      expect(stdout).toContain('codex-orchestrator co-status [options]');
      expect(stdout).toContain('codex-orchestrator co-status attach [options]');
    }, cliHelpTimeoutMs);
  }

  it('rejects unexpected positional arguments for co-status attach', async () => {
    await expect(
      buildCliArgs(['co-status', 'attach', 'unexpected-arg']).then((args) =>
        execFileAsync(process.execPath, args, { cwd: repoRoot })
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown co-status attach argument(s): unexpected-arg')
    });
  }, cliHelpTimeoutMs);

  it('rejects unexpected positional arguments for doctor', async () => {
    await expect(
      buildCliArgs(['doctor', 'unexpected-arg']).then((args) =>
        execFileAsync(process.execPath, args, { cwd: repoRoot })
      )
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Unknown doctor argument(s): unexpected-arg')
    });
  }, cliHelpTimeoutMs);

  it('prints dedicated doctor help with the apply/json limitation', async () => {
    const { stdout } = await runCli(['doctor', '--help']);

    expect(stdout).toContain('Usage: codex-orchestrator doctor [options]');
    expect(stdout).toContain(
      '--format json         Emit machine-readable output (not supported with --apply).'
    );
  }, cliHelpTimeoutMs);
});
