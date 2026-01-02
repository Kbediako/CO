import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { loadDesignContext } from './context.js';
import {
  appendArtifacts,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage
} from './state.js';
import { stageArtifacts } from '../../../orchestrator/src/persistence/ArtifactStager.js';
import type { DesignArtifactRecord } from '../../../packages/shared/manifest/types.js';
import { pathExists } from '../../lib/docs-helpers.js';

const DESIGN_SYSTEM_DIR = 'packages/design-system';
const SUMMARY_FILE = join(DESIGN_SYSTEM_DIR, '.codex', 'visual-regression-summary.json');

interface VisualRegressionSummary {
  generatedAt: string;
  status: string;
  metrics: {
    total: number;
    failed: number;
    passed: number;
  };
  report?: unknown;
}

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-visual-regression';

  const designSystemExists = await pathExists(DESIGN_SYSTEM_DIR);
  if (!designSystemExists) {
    upsertStage(state, {
      id: stageId,
      title: 'Visual regression tests',
      status: 'skipped',
      notes: ['packages/design-system not present; skipping visual regression']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-visual-regression] skipped — packages/design-system not found');
    return;
  }

  const exitCode = await runVisualRegression();
  const summaryData = await loadSummaryData(exitCode);

  const tmpRoot = join(tmpdir(), `design-visual-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });
  const tempFile = join(tmpRoot, 'visual-regression-summary.json');
  await writeFile(tempFile, JSON.stringify(summaryData, null, 2), 'utf8');

  const [staged] = await stageArtifacts({
    taskId: context.taskId,
    runId: context.runId,
    artifacts: [
      {
        path: relative(process.cwd(), tempFile),
        description: 'Visual regression summary'
      }
    ],
    options: {
      relativeDir: 'design/visual-regression',
      overwrite: true
    }
  });

  const artifact: DesignArtifactRecord = {
    stage: 'visual-regression',
    status: exitCode === 0 ? 'succeeded' : 'failed',
    relative_path: staged.path,
    type: 'visual-regression-summary',
    description: 'Visual regression results',
    metadata: summaryData.report ? { report: summaryData.report } : undefined
  };

  appendArtifacts(state, [artifact]);
  upsertStage(state, {
    id: stageId,
    title: 'Visual regression tests',
    status: exitCode === 0 ? 'succeeded' : 'failed',
    metrics: {
      status: exitCode === 0 ? 'passed' : 'failed',
      total: summaryData.metrics.total,
      failed: summaryData.metrics.failed
    },
    artifacts: [
      {
        relative_path: staged.path,
        stage: 'visual-regression',
        status: exitCode === 0 ? 'succeeded' : 'failed',
        description: 'visual-regression-summary.json'
      }
    ]
  });

  await saveDesignRunState(context.statePath, state);
  const statusText = exitCode === 0 ? 'passed' : 'failed';
  console.log(`[design-visual-regression] ${statusText}; summary staged at ${staged.path}`);
}

async function runVisualRegression(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npm', ['--prefix', DESIGN_SYSTEM_DIR, 'run', 'test:visual'], {
      stdio: 'inherit'
    });
    child.on('close', (code) => {
      resolve(code ?? 1);
    });
    child.on('error', () => {
      resolve(1);
    });
  });
}

async function loadSummaryData(exitCode: number): Promise<VisualRegressionSummary> {
  try {
    const raw = await readFile(SUMMARY_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<VisualRegressionSummary>;
    const metrics = parsed.metrics ?? {
      total: exitCode === 0 ? 1 : 1,
      failed: exitCode === 0 ? 0 : 1,
      passed: exitCode === 0 ? 1 : 0
    };
    return {
      generatedAt: new Date().toISOString(),
      status: exitCode === 0 ? 'passed' : 'failed',
      metrics: {
        total: metrics.total ?? (exitCode === 0 ? 1 : 1),
        failed: metrics.failed ?? (exitCode === 0 ? 0 : 1),
        passed: metrics.passed ?? (exitCode === 0 ? 1 : 0)
      },
      report: parsed.report
    };
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      status: exitCode === 0 ? 'passed' : 'failed',
      metrics: {
        total: exitCode === 0 ? 0 : 1,
        failed: exitCode === 0 ? 0 : 1,
        passed: exitCode === 0 ? 1 : 0
      },
      report: null
    };
  }
}

main().catch((error) => {
  console.error('[design-visual-regression] failed to execute visual regression tests');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
