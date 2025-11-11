#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { logger } from '../../orchestrator/src/logger.js';
import { runAllScenarios } from './index.js';
import type { EvaluationMode, RewarderId } from './types.js';

interface CliOptions {
  mode: EvaluationMode;
  outputDir?: string;
  rewarders?: RewarderId[];
}

function parseArgs(argv: string[]): CliOptions {
  let mode: EvaluationMode = 'mcp';
  let outputDir: string | undefined;
  let rewarders: RewarderId[] | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--mode') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --mode');
      }
      if (value === 'mcp' || value === 'cloud') {
        mode = value;
        index += 1;
      } else {
        throw new Error(`Invalid mode '${value}'. Expected 'mcp' or 'cloud'.`);
      }
    } else if (arg.startsWith('--mode=')) {
      const [, value] = arg.split('=');
      if (value === 'mcp' || value === 'cloud') {
        mode = value as EvaluationMode;
      } else {
        throw new Error(`Invalid mode '${value}'. Expected 'mcp' or 'cloud'.`);
      }
    } else if (arg === '--output') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --output');
      }
      outputDir = path.resolve(process.cwd(), value);
      index += 1;
    } else if (arg.startsWith('--output=')) {
      const [, value] = arg.split('=');
      outputDir = path.resolve(process.cwd(), value);
    } else if (arg === '--rewarders') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --rewarders');
      }
      rewarders = parseRewarderList(value);
      index += 1;
    } else if (arg.startsWith('--rewarders=')) {
      const [, value] = arg.split('=');
      rewarders = parseRewarderList(value ?? '');
    }
  }

  return { mode, outputDir, rewarders };
}

function parseRewarderList(input: string): RewarderId[] {
  return input
    .split(',')
    .map((token) => token.trim())
    .filter((token): token is RewarderId => token === 'gt' || token === 'relative');
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  try {
    const results = await runAllScenarios({
      mode: options.mode,
      outputDir: options.outputDir,
      rewarders: options.rewarders
    });
    const summary = results.map((result) => ({
      scenario: result.scenario.id,
      adapter: result.scenario.adapterId,
      goals: result.goals.map((goal) => `${goal.goal}:${goal.status}`).join(', ')
    }));
    logger.info('Evaluation summary', summary);
  } catch (error) {
    logger.error('[evaluation] run failed', error instanceof Error ? error : new Error(String(error)));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  logger.error('[evaluation] unexpected failure', error instanceof Error ? error : new Error(String(error)));
  process.exitCode = 1;
});
