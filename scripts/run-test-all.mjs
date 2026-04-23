#!/usr/bin/env node
import { spawn } from 'node:child_process';

const forwardedArgs = process.argv.slice(2);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const noTestFilesPattern = /No test files found(?:, exiting with code 0)?/i;

const coreArgs =
  forwardedArgs.length > 0
    ? ['run', 'test:core', '--', '--passWithNoTests', ...forwardedArgs]
    : ['run', 'test:core', '--'];
const adapterArgs = ['run', 'test:adapters', '--', ...forwardedArgs];

const coreResult = await runNpm(coreArgs);
const adapterResult = await runNpm(adapterArgs);

if (forwardedArgs.length > 0 && !coreResult.matchedTests && !adapterResult.matchedTests) {
  console.error(`[test:all] no tests matched forwarded filters: ${forwardedArgs.join(' ')}`);
  process.exit(1);
}

function runNpm(args) {
  return new Promise((resolve) => {
    let output = '';
    const child = spawn(npmCommand, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: shouldUseShellForCommand(npmCommand)
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      output += chunk;
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      output += chunk;
    });

    child.on('error', (error) => {
      console.error(`[test:all] failed to launch ${npmCommand}: ${error.message}`);
      process.exit(1);
    });

    child.on('close', (code, signal) => {
      if (signal) {
        console.error(`[test:all] ${npmCommand} ${args.join(' ')} exited via ${signal}`);
        process.exit(1);
      }

      if (code !== 0) {
        process.exit(code ?? 1);
      }

      resolve({ matchedTests: !noTestFilesPattern.test(output) });
    });
  });
}

function shouldUseShellForCommand(command) {
  return process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command);
}
