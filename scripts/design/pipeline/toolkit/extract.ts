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
import {
  buildRetentionMetadata,
  computeToolkitRetention,
  ensureSourcePermitted,
  loadToolkitPermit,
  resolveToolkitSources,
  slugifyToolkitValue,
  type ToolkitRuntimeSource
} from './common.js';
import type {
  DesignArtifactApprovalRecord,
  DesignToolkitArtifactRecord
} from '../../../../packages/shared/manifest/types.js';

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-toolkit-extract';
  const toolkitState = ensureToolkitState(state);
  const metadata = context.config.config.metadata.design;
  const pipelineConfig = context.config.config.pipelines.hiFiDesignToolkit;
  const sources = resolveToolkitSources(pipelineConfig, metadata);

  if (sources.length === 0) {
    upsertStage(state, {
      id: stageId,
      title: 'Toolkit context acquisition',
      status: 'skipped',
      notes: ['No hi-fi design toolkit sources configured.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-toolkit-extract] skipped — no sources configured');
    return;
  }

  let permit;
  try {
    permit = await loadToolkitPermit(context.repoRoot);
  } catch (error) {
    upsertStage(state, {
      id: stageId,
      title: 'Toolkit context acquisition',
      status: 'failed',
      notes: ['Unable to read compliance/permit.json', error instanceof Error ? error.message : String(error)]
    });
    await saveDesignRunState(context.statePath, state);
    throw new Error('Hi-fi toolkit extraction requires compliance/permit.json.');
  }

  const fallbackRetention = {
    days: state.retention?.days ?? metadata.retention.days,
    autoPurge: state.retention?.autoPurge ?? metadata.retention.autoPurge,
    policy: state.retention?.policy ?? 'design.config.retention'
  };
  toolkitState.retention = computeToolkitRetention(pipelineConfig, fallbackRetention);

  const now = new Date();
  const tmpRoot = join(tmpdir(), `design-toolkit-context-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  let successCount = 0;
  const failures: string[] = [];
  const stagedArtifacts: DesignToolkitArtifactRecord[] = [];
  const approvals: DesignArtifactApprovalRecord[] = [];

  for (const source of sources) {
    try {
      ensureSourcePermitted(source.url, permit);
      const artifact = await stageContextArtifact({
        context,
        source,
        tmpRoot,
        retentionDays: toolkitState.retention?.days ?? fallbackRetention.days,
        retentionPolicy: toolkitState.retention?.policy ?? fallbackRetention.policy,
        autoPurge: toolkitState.retention?.autoPurge ?? fallbackRetention.autoPurge,
        timestamp: now
      });
      successCount += 1;
      stagedArtifacts.push(artifact);

      approvals.push({
        id: `playwright-${source.slug}`,
        actor: metadata.privacy.approver ?? 'design-reviewer',
        reason: `Playwright extraction approved for ${source.url}`,
        timestamp: new Date().toISOString()
      });

      upsertToolkitContext(state, {
        id: source.id ?? slugifyToolkitValue(source.url, successCount - 1),
        slug: source.slug,
        title: source.title ?? null,
        url: source.url,
        referenceUrl: source.referenceUrl ?? source.url,
        relativeDir: artifact.relative_path.split('/').slice(0, -1).join('/'),
        breakpoints: source.breakpoints.map((bp) => bp.id)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${source.url}: ${message}`);
      console.error(`[design-toolkit-extract] failed to process ${source.url}: ${message}`);
    }
  }

  if (stagedArtifacts.length > 0) {
    appendToolkitArtifacts(state, stagedArtifacts);
  }
  if (approvals.length > 0) {
    appendApprovals(state, approvals);
  }

  const stageStatus: 'succeeded' | 'failed' = failures.length === 0 && successCount > 0 ? 'succeeded' : 'failed';
  upsertStage(state, {
    id: stageId,
    title: 'Toolkit context acquisition',
    status: stageStatus,
    notes: failures.length > 0 ? failures : undefined,
    metrics: {
      source_count: sources.length,
      captured_count: successCount
    },
    artifacts: stagedArtifacts.map((artifact) => ({
      relative_path: artifact.relative_path,
      stage: 'extract',
      status: artifact.status,
      description: artifact.description
    }))
  });

  await saveDesignRunState(context.statePath, state);

  if (stageStatus === 'failed') {
    throw new Error('One or more toolkit sources failed permit validation or staging.');
  }

  console.log(`[design-toolkit-extract] staged ${successCount} / ${sources.length} sources`);
}

async function stageContextArtifact(options: {
  context: DesignContext;
  source: ToolkitRuntimeSource;
  tmpRoot: string;
  retentionDays: number;
  retentionPolicy?: string;
  autoPurge: boolean;
  timestamp: Date;
}): Promise<DesignToolkitArtifactRecord> {
  const { context, source, tmpRoot, retentionDays, retentionPolicy, autoPurge, timestamp } = options;
  const payload = {
    id: source.id,
    url: source.url,
    referenceUrl: source.referenceUrl,
    breakpoints: source.breakpoints,
    maskSelectors: source.maskSelectors,
    capturedAt: timestamp.toISOString()
  };
  const filename = join(tmpRoot, `${source.slug}-context.json`);
  await writeFile(filename, JSON.stringify(payload, null, 2), 'utf8');

  const [staged] = await stageArtifacts({
    taskId: context.taskId,
    runId: context.runId,
    artifacts: [
      {
        path: relative(process.cwd(), filename),
        description: `Toolkit context for ${source.url}`
      }
    ],
    options: {
      relativeDir: join('design-toolkit', 'context', source.slug),
      overwrite: true
    }
  });

  const retention = buildRetentionMetadata(
    {
      days: retentionDays,
      autoPurge,
      policy: retentionPolicy
    },
    timestamp
  );

  return {
    id: source.id,
    stage: 'extract',
    status: 'succeeded',
    relative_path: staged.path,
    description: `Context snapshot for ${source.slug}`,
    retention,
    metrics: {
      breakpoint_count: source.breakpoints.length
    }
  };
}

main().catch((error) => {
  console.error('[design-toolkit-extract] failed to stage toolkit context');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
