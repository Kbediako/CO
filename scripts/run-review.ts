#!/usr/bin/env node
/**
 * Helper to launch the Codex CLI /review flow against the latest run manifest.
 * Falls back to a lightweight local prompt when the installed CLI lacks the
 * native review subcommand.
 */

import { spawn } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

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
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = await resolveManifestPath(options);

  if (await hasReviewCommand()) {
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
    return;
  }

  await runLocalReview(manifestPath);
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

async function runLocalReview(manifestPath: string): Promise<void> {
  console.warn(
    'codex CLI does not expose a review command; running local review hand-off instead.'
  );

  let manifest: Record<string, unknown>;
  try {
    const raw = await readFile(manifestPath, 'utf8');
    manifest = JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Failed to load manifest at ${manifestPath}: ${(error as Error)?.message ?? String(error)}`
    );
  }

  const taskId = String(manifest.task_id ?? manifest.taskId ?? 'unknown');
  const runId = String(manifest.run_id ?? manifest.runId ?? 'unknown');
  const status = String(manifest.status ?? 'unknown');
  const summary = String(manifest.summary ?? '(no summary)');

  console.log('');
  console.log(`Task:    ${taskId}`);
  console.log(`Run ID:  ${runId}`);
  console.log(`Status:  ${status}`);
  console.log('');
  console.log('Summary:');
  console.log(summary.split('\n').map((line) => `  ${line}`).join('\n'));
  console.log('');
  console.log('Select review outcome:');
  const options = [
    { label: '1. Approve run', value: 'approve' },
    { label: '2. Request changes', value: 'changes' },
    { label: '3. Comment only', value: 'comment' },
    { label: '4. Skip for now', value: 'skip' }
  ];
  for (const option of options) {
    console.log(option.label);
  }

  const rl = createInterface({ input, output });
  let choice: string | null = null;
  try {
    while (!choice) {
      const answer = (await rl.question('Enter choice [1-4]: ')).trim();
      const index = Number.parseInt(answer, 10);
      if (!Number.isNaN(index) && index >= 1 && index <= options.length) {
        choice = options[index - 1]!.value;
      } else {
        console.log('Invalid selection. Please choose a number between 1 and 4.');
      }
    }
  } finally {
    await rl.close();
  }

  const selected = options.find((option) => option.value === choice);
  console.log('');
  console.log(
    `Review outcome recorded: ${selected?.label ?? choice}. Attach results referencing ${path.relative(
      process.cwd(),
      manifestPath
    )}.`
  );
}
