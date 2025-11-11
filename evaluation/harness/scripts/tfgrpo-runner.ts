#!/usr/bin/env node
import process from 'node:process';
import path from 'node:path';
import { logger } from '../../../orchestrator/src/logger.js';
import { runLearningSchedule } from '../index.js';
import type { LearningScheduleOptions, RewarderId } from '../types.js';

interface CliOptions extends LearningScheduleOptions {}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--epochs') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --epochs');
      options.epochs = Number.parseInt(value, 10);
      index += 1;
    } else if (arg.startsWith('--epochs=')) {
      const [, value] = arg.split('=');
      options.epochs = Number.parseInt(value ?? '', 10);
    } else if (arg === '--samples') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --samples');
      options.sampleSize = Number.parseInt(value, 10);
      index += 1;
    } else if (arg.startsWith('--samples=')) {
      const [, value] = arg.split('=');
      options.sampleSize = Number.parseInt(value ?? '', 10);
    } else if (arg === '--rewarders') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --rewarders');
      options.rewarders = parseRewarders(value);
      index += 1;
    } else if (arg.startsWith('--rewarders=')) {
      const [, value] = arg.split('=');
      options.rewarders = parseRewarders(value ?? '');
    } else if (arg === '--train-temp') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --train-temp');
      options.temperatureTrain = Number.parseFloat(value);
      index += 1;
    } else if (arg.startsWith('--train-temp=')) {
      const [, value] = arg.split('=');
      options.temperatureTrain = Number.parseFloat(value ?? '');
    } else if (arg === '--eval-temp') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --eval-temp');
      options.temperatureEval = Number.parseFloat(value);
      index += 1;
    } else if (arg.startsWith('--eval-temp=')) {
      const [, value] = arg.split('=');
      options.temperatureEval = Number.parseFloat(value ?? '');
    } else if (arg === '--scenario') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --scenario');
      options.scenarioIds = value.split(',').map((token) => token.trim()).filter(Boolean);
      index += 1;
    } else if (arg.startsWith('--scenario=')) {
      const [, value] = arg.split('=');
      options.scenarioIds = (value ?? '')
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
    } else if (arg === '--output') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --output');
      options.outputDir = path.resolve(process.cwd(), value);
      index += 1;
    } else if (arg.startsWith('--output=')) {
      const [, value] = arg.split('=');
      options.outputDir = path.resolve(process.cwd(), value ?? '.');
    } else if (arg === '--mode') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --mode');
      options.mode = value === 'cloud' ? 'cloud' : 'mcp';
      index += 1;
    } else if (arg.startsWith('--mode=')) {
      const [, value] = arg.split('=');
      options.mode = value === 'cloud' ? 'cloud' : 'mcp';
    } else if (arg === '--seed') {
      const value = argv[index + 1];
      if (!value) throw new Error('Missing value for --seed');
      options.rngSeed = Number.parseInt(value, 10);
      index += 1;
    } else if (arg.startsWith('--seed=')) {
      const [, value] = arg.split('=');
      options.rngSeed = Number.parseInt(value ?? '', 10);
    }
  }
  return options;
}

function parseRewarders(value: string): RewarderId[] {
  return value
    .split(',')
    .map((token) => token.trim())
    .filter((token): token is RewarderId => token === 'gt' || token === 'relative');
}

async function main(): Promise<void> {
  const cliOptions = parseArgs(process.argv.slice(2));
  const result = await runLearningSchedule(cliOptions);
  const summary = result.epochs.map((epoch) => ({
    epoch: epoch.epoch,
    temperature: epoch.temperature,
    temperatureMode: epoch.temperatureMode,
    samples: epoch.samples.length
  }));
  logger.info('[tfgrpo] learning schedule completed', summary);
}

main().catch((error) => {
  logger.error('[tfgrpo] learning schedule failed', error instanceof Error ? error : new Error(String(error)));
  process.exitCode = 1;
});
