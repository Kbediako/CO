import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import type { CliManifest } from '../cli/types.js';
import { isoTimestamp } from '../cli/utils/time.js';
import { resolveCodexCliBin } from '../cli/utils/codexCli.js';
import { slugify } from '../cli/utils/strings.js';
import { appendLearningAlert, ensureLearningSection } from './manifest.js';
import {
  computePromptPackStamp,
  loadPromptPacks
} from '../../../packages/orchestrator/src/instructions/promptPacks.js';

export interface CrystalizerClient {
  generate(
    prompt: string,
    options: { model: string }
  ): Promise<{ content: string; costUsd?: number; model?: string }>;
}

export interface CrystalizerOptions {
  manifest: CliManifest;
  client: CrystalizerClient;
  problemStatement: string;
  validatedPatch: string;
  scenarioSummary?: string | null;
  repoRoot?: string;
  outputDir?: string;
  promptPackId?: string;
  model?: string;
  budgetUsd?: number;
}

export interface CrystalizerResult {
  manifest: CliManifest;
  candidatePath: string | null;
}

const DEFAULT_PROMPT_PACK = 'crystalizer-v1';
const DEFAULT_OUTPUT_DIR = '.agent/patterns/candidates';
const DEFAULT_MODEL = process.env.CRYSTALIZER_MODEL || 'gpt-5.1-codex-max';
const DEFAULT_BUDGET = 0.5;

export async function runCrystalizer(options: CrystalizerOptions): Promise<CrystalizerResult> {
  const {
    manifest,
    client,
    problemStatement,
    validatedPatch,
    scenarioSummary = null,
    repoRoot = process.cwd(),
    outputDir = DEFAULT_OUTPUT_DIR,
    promptPackId = DEFAULT_PROMPT_PACK,
    model = DEFAULT_MODEL,
    budgetUsd = DEFAULT_BUDGET
  } = options;

  if (outputDir.includes('docs/patterns')) {
    throw new Error('Crystalizer output may not be written to docs/patterns; use .agent/patterns instead.');
  }

  const learning = ensureLearningSection(manifest);
  const packs = await loadPromptPacks(repoRoot);
  const pack = packs.find((entry) => entry.id === promptPackId);
  if (!pack) {
    throw new Error(`Prompt pack ${promptPackId} not found`);
  }
  const packStamp = computePromptPackStamp(pack.sources);
  const promptSources = pack.sources.map((source) => source.content).join('\n\n');
  const prompt = composePrompt(promptSources, packStamp, problemStatement, validatedPatch, scenarioSummary ?? '');

  const response = await client.generate(prompt, { model });
  const cost = typeof response.costUsd === 'number' ? response.costUsd : 0;
  if (cost > budgetUsd) {
    appendLearningAlert(manifest, {
      type: 'budget_exceeded',
      channel: 'slack',
      target: '#learning-alerts',
      message: `Crystalizer cost ${cost.toFixed(2)} exceeded budget ${budgetUsd.toFixed(2)}`
    });
    learning.crystalizer = {
      candidate_path: null,
      model,
      prompt_pack: promptPackId,
      prompt_pack_stamp: packStamp,
      budget_usd: budgetUsd,
      cost_usd: cost,
      status: 'failed',
      error: 'budget_exceeded',
      created_at: isoTimestamp()
    };
    return { manifest, candidatePath: null };
  }

  const candidateDir = join(repoRoot, outputDir);
  await mkdir(candidateDir, { recursive: true });
  const baseSlug = slugify(problemStatement || 'learning');
  const slug = baseSlug.slice(0, 60) || 'learning';
  const candidatePath = join(candidateDir, `${slug}.md`);

  const markdown = [
    '# Problem',
    problemStatement || 'Not provided',
    '',
    '## Solution',
    response.content.trim(),
    '',
    '## Rationale',
    scenarioSummary ? scenarioSummary : 'Captured from validation run.'
  ].join('\n');
  await writeFile(candidatePath, markdown, 'utf8');

  learning.crystalizer = {
    candidate_path: relative(repoRoot, candidatePath),
    model: response.model ?? model,
    prompt_pack: promptPackId,
    prompt_pack_stamp: packStamp,
    budget_usd: budgetUsd,
    cost_usd: cost,
    status: 'succeeded',
    created_at: isoTimestamp()
  };

  return { manifest, candidatePath };
}

function composePrompt(
  promptBody: string,
  packStamp: string,
  problem: string,
  patch: string,
  scenarioSummary: string
): string {
  const segments = [
    `Prompt-Pack: ${packStamp}`,
    promptBody,
    'You are the crystalizer. Produce a concise pattern with Problem, Solution, and Rationale.',
    `Problem:\n${problem}`,
    `Patch:\n${patch}`,
    scenarioSummary ? `Scenario:\n${scenarioSummary}` : ''
  ];
  return segments.filter(Boolean).join('\n\n');
}

export async function createCodexCliCrystalizerClient(
  binary = resolveCodexCliBin(process.env)
): Promise<CrystalizerClient> {
  const execFileAsync = promisify(execFile);
  return {
    async generate(prompt: string, options: { model: string }) {
      const workDir = await mkdtemp(join(tmpdir(), 'crystalizer-'));
      try {
        const promptPath = join(workDir, 'prompt.txt');
        const outputPath = join(workDir, 'output.txt');
        await writeFile(promptPath, prompt, 'utf8');
        const args = ['chat', '--model', options.model, '--input-file', promptPath, '--output-file', outputPath];
        await execFileAsync(binary, args, { env: { ...process.env } });
        const content = await readFile(outputPath, 'utf8');
        return { content: content.trim(), model: options.model };
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }
  };
}
