import { spawn } from 'node:child_process';

async function main(): Promise<void> {
  await runCommand('npm', ['install', '--prefix', 'packages/design-system']);
  console.log('[setup:design-tools] packages/design-system dependencies installed');
  console.log('[setup:design-tools] Install Playwright browsers with `npx playwright install` when needed.');
  console.log('[setup:design-tools] Ensure FFmpeg binaries are available via system package manager before enabling advanced assets.');
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  console.error('[setup:design-tools] failed');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
