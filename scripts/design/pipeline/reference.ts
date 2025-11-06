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
  const stageId = 'design-reference';

  const html = buildReferencePage(
    context.config.config.metadata.design.captureUrls,
    state.artifacts.filter((artifact) => artifact.stage === 'extract')
  );

  const tmpRoot = join(tmpdir(), `design-reference-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });
  const tempFile = join(tmpRoot, 'motherduck.html');
  await writeFile(tempFile, html, 'utf8');

  const [staged] = await stageArtifacts({
    taskId: context.taskId,
    runId: context.runId,
    artifacts: [
      {
        path: relative(process.cwd(), tempFile),
        description: 'Design reference page'
      }
    ],
    options: {
      relativeDir: 'design/reference',
      overwrite: true
    }
  });

  const artifact: DesignArtifactRecord = {
    stage: 'reference',
    status: 'succeeded',
    relative_path: staged.path,
    type: 'motherduck-html',
    description: 'Aggregated reference page'
  };

  appendArtifacts(state, [artifact]);
  upsertStage(state, {
    id: stageId,
    title: 'Build motherduck reference page',
    status: 'succeeded',
    artifacts: [
      {
        relative_path: staged.path,
        stage: 'reference',
        status: 'succeeded',
        description: 'motherduck.html'
      }
    ]
  });

  await saveDesignRunState(context.statePath, state);
  console.log(`[design-reference] staged reference page: ${staged.path}`);
}

function buildReferencePage(urls: string[], extractArtifacts: DesignArtifactRecord[]): string {
  const captures = extractArtifacts.map((artifact) => artifact.relative_path);
  const listItems = urls
    .map((url) => `<li><a href="${url}">${url}</a></li>`)
    .join('\n');
  const captureList = captures
    .map((path) => `<li><code>${path}</code></li>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Design Reference</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; }
      h1 { margin-bottom: 1rem; }
      section { margin-bottom: 2rem; }
    </style>
  </head>
  <body>
    <h1>Design Reference Overview</h1>
    <section>
      <h2>Capture Targets</h2>
      <ol>
        ${listItems}
      </ol>
    </section>
    <section>
      <h2>Staged Artifacts</h2>
      <ul>
        ${captureList}
      </ul>
    </section>
  </body>
</html>`;
}

main().catch((error) => {
  console.error('[design-reference] failed to generate reference page');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
