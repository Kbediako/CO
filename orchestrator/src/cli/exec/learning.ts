import process from 'node:process';

import { saveManifest } from '../run/manifest.js';
import type { RunStatus } from '../types.js';
import { isoTimestamp } from '../utils/time.js';
import { logger } from '../../logger.js';
import { runLearningHarvester } from '../../learning/harvester.js';
import { synthesizeScenario } from '../../learning/runner.js';
import { runScenarioValidation } from '../../learning/validator.js';
import type { ExecRunContext } from './context.js';

export async function maybeTriggerLearning(runContext: ExecRunContext, runStatus: RunStatus): Promise<void> {
  const enabled = process.env.LEARNING_PIPELINE_ENABLED === '1';
  if (!enabled) {
    return;
  }
  const storageDir = process.env.LEARNING_SNAPSHOT_DIR;
  if (runStatus !== 'succeeded') {
    return;
  }
  try {
    const harvester = await runLearningHarvester(runContext.manifest, {
      repoRoot: runContext.env.repoRoot,
      runsRoot: runContext.env.runsRoot,
      manifestPath: runContext.paths.manifestPath,
      taskId: runContext.env.taskId,
      runId: runContext.manifest.run_id,
      diffPath: null,
      promptPath: null,
      executionHistoryPath: runContext.paths.logPath,
      storageDir,
      alertTargets: { slack: '#learning-alerts', pagerduty: 'learning-pipeline' }
    });

    const scenario = await synthesizeScenario({
      manifest: harvester.manifest,
      taskId: runContext.env.taskId,
      runId: runContext.manifest.run_id,
      runsRoot: runContext.env.runsRoot,
      prompt: null,
      diff: null,
      executionHistory: [
        {
          command: runContext.shellCommand,
          exitCode: 0,
          cwd: runContext.stage.cwd ?? runContext.env.repoRoot,
          timestamp: isoTimestamp()
        }
      ],
      alertTargets: { slack: '#learning-alerts', pagerduty: 'learning-pipeline' },
      pagerDutySeverity: 'none'
    });
    const validation = await runScenarioValidation({
      manifest: scenario.manifest,
      repoRoot: runContext.env.repoRoot,
      runsRoot: runContext.env.runsRoot,
      taskId: runContext.env.taskId,
      runId: runContext.manifest.run_id,
      paths: runContext.paths,
      scenarioPath: scenario.scenarioPath
    });
    await saveManifest(runContext.paths, validation.manifest);
  } catch (error) {
    logger.warn(`[learning] auto-trigger failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
