import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
const cliBootstrapPath = fileURLToPath(new URL('../../../bin/codex-orchestrator.js', import.meta.url));
const sdkModuleUrl = pathToFileURL(fileURLToPath(new URL('../src/orchestrator.ts', import.meta.url))).href;

describe('ExecClient artifact retention', () => {
  it('keeps compatibility artifact files available after awaiting result inline', async () => {
    await runGcProbe(`
      import { access } from 'node:fs/promises';
      import { setTimeout as delay } from 'node:timers/promises';
      import { ExecClient } from ${JSON.stringify(sdkModuleUrl)};

      const client = new ExecClient({
        cliPath: ${JSON.stringify(cliBootstrapPath)},
        cwd: ${JSON.stringify(workspaceRoot)}
      });

      const result = await client.run({
        command: process.execPath,
        args: ['-e', 'console.log("ok")']
      }).result;

      global.gc();
      await delay(20);

      const eventsPathExists = await access(result.eventsPath).then(() => true, () => false);
      const stderrPathExists = await access(result.stderrPath).then(() => true, () => false);

      if (!eventsPathExists || !stderrPathExists) {
        throw new Error(
          \`compatibility artifact paths disappeared early: events=\${eventsPathExists} stderr=\${stderrPathExists}\`
        );
      }
    `);
  }, 30_000);

  it('reclaims compatibility artifact files when the probe process exits after releasing references', async () => {
    const { retainedEventsPath, retainedStderrPath } = await runGcProbeJson<{
      retainedEventsPath: string;
      retainedStderrPath: string;
    }>(`
      import { ExecClient } from ${JSON.stringify(sdkModuleUrl)};

      const { retainedEventsPath, retainedStderrPath } = await (async () => {
        const client = new ExecClient({
          cliPath: ${JSON.stringify(cliBootstrapPath)},
          cwd: ${JSON.stringify(workspaceRoot)}
        });

        const result = await client.run({
          command: process.execPath,
          args: ['-e', 'console.log("ok")']
        }).result;

        return {
          retainedEventsPath: result.eventsPath,
          retainedStderrPath: result.stderrPath
        };
      })();

      console.log(JSON.stringify({ retainedEventsPath, retainedStderrPath }));
    `);

    await expect(access(retainedEventsPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(retainedStderrPath)).rejects.toMatchObject({ code: 'ENOENT' });
  }, 30_000);
});

async function runGcProbe(script: string): Promise<void> {
  await expect(
    execFileAsync(
      process.execPath,
      ['--expose-gc', '--loader', 'ts-node/esm', '--input-type=module', '--eval', script],
      { cwd: workspaceRoot }
    )
  ).resolves.toBeDefined();
}

async function runGcProbeJson<T>(script: string): Promise<T> {
  const result = await execFileAsync(
    process.execPath,
    ['--expose-gc', '--loader', 'ts-node/esm', '--input-type=module', '--eval', script],
    { cwd: workspaceRoot }
  );
  return JSON.parse(result.stdout.trim()) as T;
}
