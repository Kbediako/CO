#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { runPack } from './lib/npm-pack.js';


async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', (error) => reject(error));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  let record;
  let tarballPath = null;
  let tempDir = null;

  try {
    record = await runPack();
    if (record.filename) {
      tarballPath = path.resolve(process.cwd(), record.filename);
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-pack-smoke-'));
    const pkgJsonPath = path.join(tempDir, 'package.json');
    await writeFile(pkgJsonPath, JSON.stringify({ name: 'pack-smoke', private: true }, null, 2));

    if (!tarballPath) {
      throw new Error('pack smoke requires a tarball filename');
    }

    await runCommand('npm', ['install', tarballPath, '--no-fund', '--no-audit', '--ignore-scripts'], {
      cwd: tempDir
    });

    const binName = process.platform === 'win32' ? 'codex-orchestrator.cmd' : 'codex-orchestrator';
    const binPath = path.join(tempDir, 'node_modules', '.bin', binName);

    await runCommand(binPath, ['--help'], { cwd: tempDir });
    await runCommand(binPath, ['--version'], { cwd: tempDir });
    await runCommand(binPath, ['self-check', '--format', 'json'], { cwd: tempDir });

    console.log('✅ pack smoke passed');
  } catch (error) {
    console.error(`❌ pack smoke failed: ${error?.message ?? String(error)}`);
    process.exitCode = 1;
  } finally {
    if (tarballPath) {
      try {
        await rm(tarballPath, { force: true });
      } catch {
        // ignore cleanup failures
      }
    }
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  }
}

main();
