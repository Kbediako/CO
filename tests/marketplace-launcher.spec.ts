import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const launcherPath = join(process.cwd(), 'plugins', 'codex-orchestrator', 'launcher.mjs');
const createdSandboxes: string[] = [];

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'marketplace-launcher-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) =>
      rm(sandbox, { recursive: true, force: true })
    )
  );
});

describe('marketplace launcher', () => {
  it('accepts literal-string marketplace config values with inline comments', async () => {
    const sandbox = await makeSandbox();
    const sourceRoot = join(sandbox, 'marketplace-source');
    const entrypoint = join(sourceRoot, 'bin', 'codex-orchestrator.js');
    const homeRoot = join(sandbox, 'home');
    const codexHome = join(homeRoot, '.codex');
    await mkdir(join(sourceRoot, 'bin'), { recursive: true });
    await mkdir(codexHome, { recursive: true });

    await writeFile(
      entrypoint,
      [
        'const payload = {',
        '  argv: process.argv.slice(2),',
        '  packageRoot: process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT',
        '};',
        'console.log(JSON.stringify(payload));'
      ].join('\n'),
      'utf8'
    );

    const relativeSource = relative(codexHome, sourceRoot).replace(/'/g, "''");
    await writeFile(
      join(codexHome, 'config.toml'),
      [
        '[marketplaces.codex-orchestrator]',
        `source = '${relativeSource}' # local literal string with inline comment`,
        `source_type = 'local' # inline comment`
      ].join('\n'),
      'utf8'
    );

    const { stdout, stderr } = await execFileAsync(process.execPath, [launcherPath, 'smoke-arg'], {
      env: {
        ...process.env,
        HOME: homeRoot,
        CODEX_HOME: codexHome
      }
    });

    expect(stderr).toBe('');
    expect(JSON.parse(stdout.trim())).toEqual({
      argv: ['smoke-arg'],
      packageRoot: sourceRoot
    });
  });

  it('fails closed on unsupported explicit marketplace source_type values', async () => {
    const sandbox = await makeSandbox();
    const homeRoot = join(sandbox, 'home');
    const codexHome = join(homeRoot, '.codex');
    await mkdir(codexHome, { recursive: true });

    await writeFile(
      join(codexHome, 'config.toml'),
      [
        '[marketplaces.codex-orchestrator]',
        "source = 'owner/repo'",
        "source_type = 'weird'"
      ].join('\n'),
      'utf8'
    );

    await expect(
      execFileAsync(process.execPath, [launcherPath], {
        env: {
          ...process.env,
          HOME: homeRoot,
          CODEX_HOME: codexHome
        }
      })
    ).rejects.toMatchObject({
      code: 1,
      stdout: '',
      stderr: expect.stringContaining(
        'unsupported [marketplaces.codex-orchestrator].source_type="weird"'
      )
    });
  });
});
