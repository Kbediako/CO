#!/usr/bin/env node
import { spawn } from 'node:child_process';

const forwardedArgs = process.argv.slice(2);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const coreArgs =
  forwardedArgs.length > 0
    ? ['run', 'test:core', '--', '--passWithNoTests', ...forwardedArgs]
    : ['run', 'test:core', '--'];
const adapterArgs = ['run', 'test:adapters', '--', ...forwardedArgs];

await runNpm(coreArgs);
await runNpm(adapterArgs);

function runNpm(args) {
  return new Promise((resolve) => {
    const child = spawn(npmCommand, args, {
      stdio: 'inherit',
      shell: false
    });

    child.on('error', (error) => {
      console.error(`[test:all] failed to launch ${npmCommand}: ${error.message}`);
      process.exit(1);
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        console.error(`[test:all] ${npmCommand} ${args.join(' ')} exited via ${signal}`);
        process.exit(1);
      }

      if (code !== 0) {
        process.exit(code ?? 1);
      }

      resolve();
    });
  });
}
