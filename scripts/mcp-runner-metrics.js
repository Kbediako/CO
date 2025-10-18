#!/usr/bin/env node
/**
 * MCP runner metrics summarizer.
 *
 * Reads .runs/0001/metrics.json (JSON Lines) and writes an aggregate summary
 * to .runs/0001/metrics-summary.json for reviewer dashboards.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { constants, isoTimestamp } from './agents_mcp_runner.mjs';

const { TASK_ID, metricsFilePath, metricsRoot, repoRoot } = constants;
const summaryPath = path.join(metricsRoot, 'metrics-summary.json');

async function writeJsonAtomic(targetPath, data) {
  const tmpPath = `${targetPath}.tmp`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, targetPath);
}

async function readMetricsEntries() {
  try {
    const contents = await fs.readFile(metricsFilePath, 'utf8');
    return contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return { __parse_error: error.message ?? String(error), raw: line };
        }
      });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function summarize(entries) {
  const valid = entries.filter((entry) => !entry.__parse_error);
  const total = valid.length;
  const successes = valid.filter((entry) => entry.status === 'succeeded').length;
  const failures = valid.filter((entry) => entry.status === 'failed').length;
  const guardrailHits = valid.filter((entry) => entry.guardrails_present === true).length;
  const durations = valid
    .map((entry) => Number(entry.duration_seconds))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const avgDuration = durations.length
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : null;

  return {
    generated_at: isoTimestamp(),
    task_id: TASK_ID,
    metrics_file: path.relative(repoRoot, metricsFilePath),
    entries_total: total,
    entries_succeeded: successes,
    entries_failed: failures,
    success_rate: total === 0 ? null : successes / total,
    guardrail_coverage: total === 0 ? null : guardrailHits / total,
    average_duration_seconds: avgDuration,
    parse_errors: entries
      .filter((entry) => entry.__parse_error)
      .map((entry) => ({ error: entry.__parse_error, raw: entry.raw })),
  };
}

async function main() {
  const entries = await readMetricsEntries();
  const summary = summarize(entries);
  await writeJsonAtomic(summaryPath, summary);
  console.log(`Metrics summary written to ${path.relative(repoRoot, summaryPath)}`);
}

function printHelp() {
  console.log('Usage: node scripts/mcp-runner-metrics.js [--summarize]');
  console.log('Reads .runs/0001/metrics.json (JSONL) and writes aggregate stats to metrics-summary.json.');
}

async function cli() {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg === '--summarize') {
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  await main();
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    await cli();
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}

export { readMetricsEntries, summarize, main, constants };
