#!/usr/bin/env node
/**
 * Helper to launch the Codex CLI /review flow against the latest run manifest.
 */

import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

interface CliOptions {
  manifest?: string;
  runsDir: string;
  task?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { runsDir: path.join(process.cwd(), '.runs') };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      options.manifest = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--manifest=')) {
      options.manifest = arg.split('=')[1];
    } else if (arg === '--runs-dir') {
      options.runsDir = argv[index + 1] ?? options.runsDir;
      index += 1;
    } else if (arg.startsWith('--runs-dir=')) {
      options.runsDir = arg.split('=')[1];
    } else if (arg === '--task') {
      options.task = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--task=')) {
      options.task = arg.split('=')[1];
    }
  }
  return options;
}

async function collectManifests(runsDir: string, taskFilter?: string): Promise<string[]> {
  const results: string[] = [];
  let taskIds: string[] = [];
  try {
    taskIds = await readdir(runsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return results;
    }
    throw error;
  }

  for (const taskId of taskIds) {
    if (taskFilter && taskFilter !== taskId) {
      continue;
    }
    const taskPath = path.join(runsDir, taskId);
    const cliPath = path.join(taskPath, 'cli');
    const legacyPath = taskPath;

    const candidates: Array<{ root: string; runIds: string[] }> = [];
    try {
      const cliRunIds = await readdir(cliPath);
      candidates.push({ root: cliPath, runIds: cliRunIds });
    } catch {
      // Ignore missing CLI directory; fall back to legacy layout.
    }

    if (candidates.length === 0) {
      try {
        const legacyRunIds = await readdir(legacyPath);
        candidates.push({ root: legacyPath, runIds: legacyRunIds });
      } catch {
        continue;
      }
    }

    for (const candidate of candidates) {
      for (const runId of candidate.runIds) {
        const manifestPath = path.join(candidate.root, runId, 'manifest.json');
        results.push(manifestPath);
      }
    }
  }
  return results;
}

async function resolveManifestPath(options: CliOptions): Promise<string> {
  if (options.manifest) {
    return path.resolve(process.cwd(), options.manifest);
  }

  const manifests = await collectManifests(options.runsDir, options.task);
  if (manifests.length === 0) {
    throw new Error('No run manifests found. Provide --manifest or execute the orchestrator first.');
  }

  const scored = await Promise.all(
    manifests.map(async (manifestPath) => {
      try {
        const fileStat = await stat(manifestPath);
        return { manifestPath, mtimeMs: fileStat.mtimeMs };
      } catch {
        return { manifestPath, mtimeMs: 0 };
      }
    })
  );

  scored.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return scored[0]?.manifestPath ?? manifests[0];
}

async function main(): Promise<void> {
  if (!(await hasReviewCommand())) {
    console.log('codex CLI does not expose a review command; skipping review hand-off.');
    return;
  }
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = await resolveManifestPath(options);

  console.log(`Launching Codex review for ${path.relative(process.cwd(), manifestPath)}`);
  const child = spawn('codex', ['review', manifestPath], {
    stdio: 'inherit',
    env: process.env
  });

  await new Promise<void>((resolve, reject) => {
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`codex review exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  console.error('[run-review] failed:', error.message ?? error);
  process.exitCode = 1;
});

async function hasReviewCommand(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('codex', ['--help'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout?.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', () => resolve(false));
    child.once('close', () => {
      resolve(output.includes(' review'));
    });
  });
}
