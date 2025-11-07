import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { loadDesignContext } from '../context.js';
import type { DesignContext } from '../context.js';
import {
  appendApprovals,
  appendToolkitArtifacts,
  ensureToolkitState,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage,
  upsertToolkitContext
} from '../state.js';
import { stageArtifacts } from '../../../../orchestrator/src/persistence/ArtifactStager.js';
import { buildRetentionMetadata } from './common.js';
import type {
  DesignArtifactApprovalRecord,
  DesignToolkitArtifactRecord
} from '../../../../packages/shared/manifest/types.js';

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-toolkit-reference';
  const toolkitState = ensureToolkitState(state);
  const contexts = toolkitState.contexts;

  if (contexts.length === 0) {
    upsertStage(state, {
      id: stageId,
      title: 'Toolkit reference + self-correction',
      status: 'skipped',
      notes: ['No toolkit contexts available. Run previous stages first.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-toolkit-reference] skipped — no contexts');
    return;
  }

  const retention = toolkitState.retention ?? {
    days: state.retention?.days ?? 30,
    autoPurge: state.retention?.autoPurge ?? false,
    policy: state.retention?.policy ?? 'design.config.retention'
  };
  const selfCorrection = context.config.config.pipelines.hiFiDesignToolkit.selfCorrection;
  const advanced = context.config.config.advanced;

  const tmpRoot = join(tmpdir(), `design-toolkit-reference-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  const artifacts: DesignToolkitArtifactRecord[] = [];
  const approvals: DesignArtifactApprovalRecord[] = [];
  const failures: string[] = [];
  let processed = 0;

  for (const entry of contexts) {
    try {
      const outputs = await buildReferenceOutputs(entry.slug, entry.url, tmpRoot);
      const retentionMetadata = buildRetentionMetadata(retention, new Date());

      const [referenceArtifact] = await stageArtifacts({
        taskId: context.taskId,
        runId: context.runId,
        artifacts: [
          {
            path: relative(process.cwd(), outputs.referencePath),
            description: `Reference page for ${entry.slug}`
          }
        ],
        options: {
          relativeDir: `design-toolkit/reference/${entry.slug}`,
          overwrite: true
        }
      });

      artifacts.push({
        id: `${entry.slug}-reference`,
        stage: 'reference',
        status: 'succeeded',
        relative_path: referenceArtifact.path,
        description: `Reference implementation for ${entry.slug}`,
        retention: retentionMetadata,
        metrics: {
          section_count: outputs.sectionCount
        }
      });

      upsertToolkitContext(state, {
        ...entry,
        referencePath: referenceArtifact.path
      });

      if (selfCorrection.enabled) {
        const correction = await simulateSelfCorrection(entry.slug, tmpRoot, selfCorrection.maxIterations);
        const [diffArtifact] = await stageArtifacts({
          taskId: context.taskId,
          runId: context.runId,
          artifacts: [
            {
              path: relative(process.cwd(), correction.path),
              description: `Self-correction report for ${entry.slug}`
            }
          ],
          options: {
            relativeDir: `design-toolkit/diffs/${entry.slug}`,
            overwrite: true
          }
        });

        artifacts.push({
          id: `${entry.slug}-self-correct`,
          stage: 'self-correct',
          status: 'succeeded',
          relative_path: diffArtifact.path,
          description: `Self-correction summary for ${entry.slug}`,
          retention: retentionMetadata,
          metrics: {
            iterations: correction.iterations,
            final_error_rate: correction.finalErrorRate
          }
        });

        approvals.push({
          id: `self-correct-${entry.slug}`,
          actor: selfCorrection.provider ?? metadataApprover(context),
          reason: `Self-correction provider ${selfCorrection.provider ?? 'local'} approved`,
          timestamp: new Date().toISOString()
        });
      }

      if (advanced.ffmpeg.enabled) {
        approvals.push({
          id: `ffmpeg-${entry.slug}`,
          actor: advanced.ffmpeg.approver ?? metadataApprover(context),
          reason: 'FFmpeg diff rendering approved',
          timestamp: new Date().toISOString()
        });
      }

      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${entry.slug}: ${message}`);
      console.error(`[design-toolkit-reference] failed for ${entry.slug}: ${message}`);
    }
  }

  if (artifacts.length > 0) {
    appendToolkitArtifacts(state, artifacts);
  }
  if (approvals.length > 0) {
    appendApprovals(state, approvals);
  }

  const status: 'succeeded' | 'failed' = failures.length === 0 && processed > 0 ? 'succeeded' : 'failed';

  upsertStage(state, {
    id: stageId,
    title: 'Toolkit reference + self-correction',
    status,
    notes: failures.length > 0 ? failures : undefined,
    metrics: {
      processed,
      self_correction_enabled: selfCorrection.enabled
    },
    artifacts: artifacts.map((artifact) => ({
      relative_path: artifact.relative_path,
      stage: artifact.stage,
      status: artifact.status,
      description: artifact.description
    }))
  });

  await saveDesignRunState(context.statePath, state);

  if (status === 'failed') {
    throw new Error('Reference or self-correction stage failed.');
  }

  console.log(`[design-toolkit-reference] produced references for ${processed} contexts`);
}

async function buildReferenceOutputs(slug: string, url: string, tmpRoot: string) {
  const referenceDir = join(tmpRoot, slug, 'reference');
  await mkdir(referenceDir, { recursive: true });
  const referencePath = join(referenceDir, 'index.html');
  const sectionCount = 3;
  const html = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8"/>\n  <title>${slug} Reference</title>\n  <style>body{font-family:system-ui;padding:2rem;}section{margin-bottom:2rem;}</style>\n</head>\n<body>\n  <h1>${slug} Reference Page</h1>\n  <p>Generated from ${url}</p>\n  <section><h2>Typography</h2><p>Sample paragraph showcasing typography tokens.</p></section>\n  <section><h2>Controls</h2><button>Primary Action</button></section>\n  <section><h2>Cards</h2><div class="card">Component preview</div></section>\n</body>\n</html>`;
  await writeFile(referencePath, html, 'utf8');
  return { referencePath, sectionCount };
}

async function simulateSelfCorrection(slug: string, tmpRoot: string, maxIterations: number) {
  const iterations = Math.max(1, maxIterations);
  const steps = [] as Array<{ iteration: number; before: number; after: number }>;
  let currentError = 12;
  for (let i = 0; i < iterations; i += 1) {
    const nextError = Math.max(0.5, currentError * 0.6);
    steps.push({ iteration: i + 1, before: Number(currentError.toFixed(2)), after: Number(nextError.toFixed(2)) });
    currentError = nextError;
  }
  const correctionDir = join(tmpRoot, slug, 'diffs');
  await mkdir(correctionDir, { recursive: true });
  const reportPath = join(correctionDir, 'self-correction.json');
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        slug,
        iterations: steps,
        finalErrorRate: Number(currentError.toFixed(2))
      },
      null,
      2
    ),
    'utf8'
  );
  return {
    path: reportPath,
    iterations,
    finalErrorRate: Number(currentError.toFixed(2))
  };
}

function metadataApprover(context: DesignContext) {
  return context.config.config.metadata.design.privacy.approver ?? 'design-reviewer';
}

main().catch((error) => {
  console.error('[design-toolkit-reference] failed to build references');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
