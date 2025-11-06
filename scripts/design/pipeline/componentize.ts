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
  const stageId = 'design-componentize';

  const components = buildComponentManifest(context.config.config.metadata.design.captureUrls);
  const tmpRoot = join(tmpdir(), `design-components-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });
  const tempFile = join(tmpRoot, 'components.json');
  await writeFile(tempFile, JSON.stringify(components, null, 2), 'utf8');

  const [staged] = await stageArtifacts({
    taskId: context.taskId,
    runId: context.runId,
    artifacts: [
      {
        path: relative(process.cwd(), tempFile),
        description: 'Componentization manifest'
      }
    ],
    options: {
      relativeDir: 'design/components',
      overwrite: true
    }
  });

  const artifact: DesignArtifactRecord = {
    stage: 'components',
    status: 'succeeded',
    relative_path: staged.path,
    type: 'storybook-manifest',
    description: 'Componentization summary',
    metadata: {
      stories: components.stories.length
    }
  };

  appendArtifacts(state, [artifact]);
  upsertStage(state, {
    id: stageId,
    title: 'Componentize design artifacts',
    status: 'succeeded',
    metrics: {
      story_count: components.stories.length
    },
    artifacts: [
      {
        relative_path: staged.path,
        stage: 'components',
        status: 'succeeded',
        description: 'components.json'
      }
    ]
  });

  await saveDesignRunState(context.statePath, state);
  console.log(`[design-componentize] staged components summary: ${staged.path}`);
}

function buildComponentManifest(urls: string[]) {
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    stories: urls.map((url, index) => ({
      id: `story-${index + 1}`,
      source: url
    }))
  };
}

main().catch((error) => {
  console.error('[design-componentize] failed to build components');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
