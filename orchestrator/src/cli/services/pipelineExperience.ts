import type { PipelineDefinition, CliManifest } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import { relativeToRepo } from '../run/runPaths.js';
import { ExperienceStore, type ExperienceInput } from '../../persistence/ExperienceStore.js';
import { loadInstructionSet } from '../../../../packages/orchestrator/src/instructions/loader.js';
import { logger } from '../../logger.js';

const SUCCESS_REWARD = 1;
const COST_PER_TOKEN_USD = 0.000002;

interface PromptPackLike {
  domain: string;
  stamp: string;
  experienceSlots: number;
}

export interface PersistPipelineExperienceParams {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  manifest: CliManifest;
  paths: RunPaths;
}

export async function persistPipelineExperience(params: PersistPipelineExperienceParams): Promise<void> {
  const { env, pipeline, manifest, paths } = params;
  if (manifest.status !== 'succeeded') {
    return;
  }

  try {
    const instructions = await loadInstructionSet(env.repoRoot);
    const promptPacks = instructions.promptPacks.filter((pack) => pack.experienceSlots > 0);
    if (promptPacks.length === 0) {
      return;
    }

    const domain = resolveExperienceDomain(pipeline, promptPacks);
    if (!domain) {
      return;
    }
    const selectedPack = promptPacks.find((pack) => pack.domain === domain);
    if (!selectedPack) {
      return;
    }

    const summary = summarizePipelineOutcome(manifest);
    if (!summary) {
      return;
    }
    const tokenCount = Math.max(1, countWords(summary));
    const durationMs = resolveDurationMs(manifest);

    const record: ExperienceInput = {
      runId: manifest.run_id,
      taskId: manifest.task_id,
      epoch: null,
      groupId: null,
      summary,
      reward: { gtScore: SUCCESS_REWARD, relativeRank: 0 },
      toolStats: [
        {
          tool: `pipeline:${pipeline.id}`,
          tokens: tokenCount,
          latencyMs: durationMs,
          costUsd: roundCurrency(tokenCount * COST_PER_TOKEN_USD)
        }
      ],
      stampSignature: selectedPack.stamp,
      domain
    };

    const store = new ExperienceStore({
      outDir: env.outRoot,
      runsDir: env.runsRoot,
      maxSummaryWords: instructions.experienceMaxWords
    });
    await store.recordBatch([record], relativeToRepo(env, paths.manifestPath));
  } catch (error) {
    logger.warn(
      `Failed to persist pipeline experience for run ${manifest.run_id}: ${
        (error as Error)?.message ?? String(error)
      }`
    );
  }
}

export function resolveExperienceDomain(
  pipeline: Pick<PipelineDefinition, 'id' | 'title' | 'tags'>,
  promptPacks: PromptPackLike[]
): string | null {
  const domains = uniqueDomains(promptPacks);
  if (domains.length === 0) {
    return null;
  }
  const haystack = normalizeSummary(
    `${pipeline.id} ${pipeline.title} ${(pipeline.tags ?? []).join(' ')}`
  ).toLowerCase();
  const directMatch = domains.find((domain) => haystack.includes(domain.toLowerCase()));
  if (directMatch) {
    return directMatch;
  }
  if (domains.includes('implementation')) {
    return 'implementation';
  }
  return domains[0] ?? null;
}

export function summarizePipelineOutcome(
  manifest: Pick<CliManifest, 'summary' | 'commands'>
): string | null {
  const chunks: string[] = [];
  if (typeof manifest.summary === 'string' && manifest.summary.trim().length > 0) {
    chunks.push(normalizeSummary(manifest.summary));
  }

  const stageHighlights = manifest.commands
    .filter((command) => command.kind === 'command' && command.status === 'succeeded')
    .map((command) => normalizeSummary(command.summary ?? command.title))
    .filter((value) => value.length > 0)
    .slice(0, 2);

  chunks.push(...stageHighlights);

  if (chunks.length === 0) {
    return null;
  }

  return chunks.join(' | ');
}

function uniqueDomains(promptPacks: PromptPackLike[]): string[] {
  const seen = new Set<string>();
  const domains: string[] = [];
  for (const pack of promptPacks) {
    const domain = pack.domain.trim();
    if (!domain || seen.has(domain)) {
      continue;
    }
    seen.add(domain);
    domains.push(domain);
  }
  return domains;
}

function resolveDurationMs(manifest: Pick<CliManifest, 'started_at' | 'completed_at'>): number {
  const startedAt = Date.parse(manifest.started_at);
  const completedAt = Date.parse(manifest.completed_at ?? manifest.started_at);
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt)) {
    return 0;
  }
  return Math.max(0, completedAt - startedAt);
}

function normalizeSummary(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function countWords(value: string): number {
  const tokens = value.trim().split(/\s+/u).filter(Boolean);
  return tokens.length;
}

function roundCurrency(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
