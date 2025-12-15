#!/usr/bin/env node
/**
 * Helper to launch `codex review` non-interactively with the latest run manifest
 * path included as evidence for reviewers.
 *
 * Note: `codex-cli` currently rejects combining diff-scoping flags (`--uncommitted`,
 * `--base`, `--commit`) with a custom prompt. This wrapper always supplies a custom
 * prompt (to include manifest evidence), so it invokes `codex review <PROMPT>` and
 * embeds any requested scope hints (base/commit) into the prompt text instead.
 */

import { execFile, spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface CliOptions {
  manifest?: string;
  runsDir: string;
  task?: string;
  base?: string;
  commit?: string;
  title?: string;
  uncommitted?: boolean;
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
    } else if (arg === '--uncommitted') {
      options.uncommitted = true;
    } else if (arg === '--base') {
      options.base = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--base=')) {
      options.base = arg.split('=')[1];
    } else if (arg === '--commit') {
      options.commit = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--commit=')) {
      options.commit = arg.split('=')[1];
    } else if (arg === '--title') {
      options.title = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--title=')) {
      options.title = arg.split('=')[1];
    }
  }

  if (!options.manifest) {
    const envManifest = process.env.MANIFEST ?? process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    if (envManifest && envManifest.trim().length > 0) {
      options.manifest = envManifest.trim();
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

  if (!(await hasReviewCommand())) {
    throw new Error('codex CLI is missing the `review` subcommand (or is not installed).');
  }

  const relativeManifest = path.relative(process.cwd(), manifestPath);
  const taskLabel = process.env.TASK ?? process.env.MCP_RUNNER_TASK_ID ?? options.task ?? 'unknown-task';
  const notes = process.env.NOTES?.trim();

  const promptLines = [
    `Review task: ${taskLabel}`,
    `Evidence manifest: ${relativeManifest}`,
    '',
    'Please review the current changes and confirm:',
    '- README/SOP docs match the implemented behavior',
    '- Commands/scripts are non-interactive (no TTY prompts)',
    '- Evidence + checklist mirroring requirements are satisfied',
    '',
    'Call out any remaining documentation/code mismatches or guardrail violations.'
  ];

  const scopeNotes = await buildScopeNotes(options);
  if (scopeNotes.length > 0) {
    promptLines.push('', ...scopeNotes);
  }

  if (notes) {
    promptLines.push('', 'Notes:', notes);
  }

  const reviewArgs = buildReviewArgs(options, promptLines.join('\n'));
  console.log(`Launching Codex review (evidence: ${relativeManifest})`);
  const child = spawn('codex', reviewArgs, { stdio: 'inherit', env: process.env });

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

function buildReviewArgs(options: CliOptions, prompt: string): string[] {
  const args = ['review'];
  if (options.title) {
    args.push('--title', options.title);
  }

  args.push(prompt);
  return args;
}

async function buildScopeNotes(options: CliOptions): Promise<string[]> {
  const lines: string[] = [];
  const details: string[] = [];

  if (options.commit) {
    lines.push(`Review scope hint: commit \`${options.commit}\``);
    const summary = await tryGit([
      'show',
      '--no-color',
      '--name-status',
      '--no-patch',
      '--format=medium',
      options.commit
    ]);
    if (summary) {
      details.push(summary);
    }
  } else if (options.base) {
    lines.push(`Review scope hint: diff vs base \`${options.base}\``);
    const diff = await tryGit(['diff', '--no-color', '--name-status', `${options.base}...HEAD`]);
    if (diff) {
      details.push(diff);
    }
  } else {
    lines.push('Review scope hint: uncommitted working tree changes (default).');
    const status = await tryGit(['status', '--porcelain=v1', '-b']);
    if (status) {
      details.push(status);
    }
  }

  if (details.length > 0) {
    lines.push('', 'Git scope summary:', '```', ...details, '```');
  } else {
    lines.push('', 'Git scope summary: unavailable (git command failed).');
  }

  return lines;
}

async function tryGit(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, { maxBuffer: 1024 * 1024 });
    const trimmed = String(stdout ?? '').trimEnd();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
