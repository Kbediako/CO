import { writeFile, mkdir } from 'node:fs/promises';
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

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-advanced-assets';
  const advanced = context.config.config.advanced;

  if (!advanced.framerMotion.enabled && !advanced.ffmpeg.enabled) {
    upsertStage(state, {
      id: stageId,
      title: 'Advanced asset generation',
      status: 'skipped',
      notes: ['Advanced assets disabled in design.config.yaml']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-advanced-assets] skipped — advanced features disabled');
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    framerMotion: advanced.framerMotion,
    ffmpeg: advanced.ffmpeg
  };

  const tmpRoot = join(tmpdir(), `design-assets-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });
  const tempFile = join(tmpRoot, 'advanced-assets.json');
  await writeFile(tempFile, JSON.stringify(payload, null, 2), 'utf8');

  const [staged] = await stageArtifacts({
    taskId: context.taskId,
    runId: context.runId,
    artifacts: [
      {
        path: relative(process.cwd(), tempFile),
        description: 'Advanced asset manifest'
      }
    ],
    options: {
      relativeDir: 'design/assets',
      overwrite: true
    }
  });

  const artifact: DesignArtifactRecord = {
    stage: advanced.ffmpeg.enabled ? 'video' : 'motion',
    status: 'succeeded',
    relative_path: staged.path,
    type: 'advanced-assets-manifest',
    description: 'Advanced asset summary',
    quota: {
      type: 'runtime',
      unit: 'seconds',
      limit: Math.max(advanced.framerMotion.quotaSeconds, advanced.ffmpeg.quotaSeconds ?? 0)
    }
  };

  appendArtifacts(state, [artifact]);
  upsertStage(state, {
    id: stageId,
    title: 'Advanced asset generation',
    status: 'succeeded',
    artifacts: [
      {
        relative_path: staged.path,
        stage: artifact.stage,
        status: 'succeeded',
        description: 'advanced-assets.json'
      }
    ]
  });

  await saveDesignRunState(context.statePath, state);
  console.log(`[design-advanced-assets] staged advanced assets manifest: ${staged.path}`);
}

main().catch((error) => {
  console.error('[design-advanced-assets] failed to process advanced assets');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
