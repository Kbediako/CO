import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { loadDesignContext } from '../context.js';
import {
  appendToolkitArtifacts,
  ensureToolkitState,
  loadDesignRunState,
  saveDesignRunState,
  upsertStage
} from '../state.js';
import { stageArtifacts } from '../../../../orchestrator/src/persistence/ArtifactStager.js';
import { buildRetentionMetadata } from './common.js';
import { resolveToolkitPublishActions, type ToolkitPublishActions } from './publishActions.js';
import type { DesignToolkitArtifactRecord } from '../../../../packages/shared/manifest/types.js';

const DESIGN_SYSTEM_DIR = 'packages/design-system';

async function main(): Promise<void> {
  const context = await loadDesignContext();
  const state = await loadDesignRunState(context.statePath);
  const stageId = 'design-toolkit-publish';
  const toolkitState = ensureToolkitState(state);
  const contexts = toolkitState.contexts.filter((entry) => entry.tokensPath);
  const pipelineConfig = context.config.config.pipelines.hiFiDesignToolkit;
  const publishActions = resolveToolkitPublishActions(pipelineConfig);
  const hasAnyAction =
    publishActions.updateTokens || publishActions.updateComponents || publishActions.runVisualRegression;

  if ((publishActions.updateTokens || publishActions.updateComponents) && contexts.length === 0) {
    upsertStage(state, {
      id: stageId,
      title: 'Toolkit publish + design-system integration',
      status: 'skipped',
      notes: ['No token artifacts available. Run earlier stages first.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-toolkit-publish] skipped — no token artifacts');
    return;
  }

  if (!hasAnyAction) {
    upsertStage(state, {
      id: stageId,
      title: 'Toolkit publish + design-system integration',
      status: 'skipped',
      notes: ['publish.update_* config disabled all publish actions.']
    });
    await saveDesignRunState(context.statePath, state);
    console.log('[design-toolkit-publish] skipped — publish actions disabled via config');
    return;
  }

  const retention = toolkitState.retention ?? {
    days: state.retention?.days ?? 30,
    autoPurge: state.retention?.autoPurge ?? false,
    policy: state.retention?.policy ?? 'design.config.retention'
  };

  const repoRoot = context.repoRoot;
  const tokensTarget = join(repoRoot, DESIGN_SYSTEM_DIR, 'tokens', 'src', 'hi-fi');
  const componentTarget = join(repoRoot, DESIGN_SYSTEM_DIR, 'src', 'components', 'hi-fi');
  const dirPromises: Array<Promise<void>> = [];
  if (publishActions.updateTokens) {
    dirPromises.push(mkdir(tokensTarget, { recursive: true }).then(() => undefined));
  }
  if (publishActions.updateComponents) {
    dirPromises.push(mkdir(componentTarget, { recursive: true }).then(() => undefined));
  }
  await Promise.all(dirPromises);

  let tokensWritten = 0;
  let componentsWritten = 0;
  if (publishActions.updateTokens || publishActions.updateComponents) {
    for (const entry of contexts) {
      const sourcePath = join(repoRoot, entry.tokensPath!);
      if (publishActions.updateTokens) {
        const destPath = join(tokensTarget, `${entry.slug}.json`);
        const tokensRaw = await readFile(sourcePath, 'utf8');
        const tokens = JSON.parse(tokensRaw) as Record<string, unknown>;
        tokens.metadata = {
          ...(tokens.metadata ?? {}),
          manifest: context.manifestPath
        };
        await writeFile(destPath, `${JSON.stringify(tokens, null, 2)}\n`, 'utf8');
        tokensWritten += 1;
      }

      if (publishActions.updateComponents) {
        const componentDir = join(componentTarget, entry.slug);
        await mkdir(componentDir, { recursive: true });
        const componentName = toPascalCase(entry.slug);
        const componentFile = join(componentDir, 'index.ts');
        const componentSource = `export const ${componentName} = {\n  id: '${entry.slug}',\n  tokensFile: '../../tokens/src/hi-fi/${entry.slug}.json',\n  referencePath: '${entry.referencePath ?? ''}'\n};\n`;
        await writeFile(componentFile, componentSource, 'utf8');
        componentsWritten += 1;
      }
    }
  }

  const commandResults = await runDesignSystemCommands(repoRoot, publishActions);
  const tmpRoot = join(tmpdir(), `design-toolkit-publish-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });
  const logPath = join(tmpRoot, 'publish-summary.json');
  await writeFile(logPath, JSON.stringify(commandResults, null, 2), 'utf8');

  const [stagedLog] = await stageArtifacts({
    taskId: context.taskId,
    runId: context.runId,
    artifacts: [
      {
        path: relative(process.cwd(), logPath),
        description: 'Design-system publish logs'
      }
    ],
    options: {
      relativeDir: 'design-toolkit/publish/logs',
      overwrite: true
    }
  });

  const retentionMetadata = buildRetentionMetadata(retention, new Date());
  const artifact: DesignToolkitArtifactRecord = {
    id: 'design-system-publish',
    stage: 'publish',
    status: commandResults.failed === 0 ? 'succeeded' : 'failed',
    relative_path: stagedLog.path,
    description: 'Design-system integration summary',
    retention: retentionMetadata,
    metrics: {
      contexts_updated: Math.max(tokensWritten, componentsWritten),
      tokens_written: tokensWritten,
      components_written: componentsWritten,
      commands_passed: commandResults.passed,
      commands_failed: commandResults.failed,
      commands_executed: commandResults.executed.length
    }
  };

  appendToolkitArtifacts(state, [artifact]);

  const stageNotes: string[] = [];
  if (!publishActions.updateTokens) {
    stageNotes.push('Token publishing disabled via config.');
  }
  if (!publishActions.updateComponents) {
    stageNotes.push('Component publishing disabled via config.');
  }
  if (!publishActions.runVisualRegression) {
    stageNotes.push('Visual regression command disabled via config.');
  }

  upsertStage(state, {
    id: stageId,
    title: 'Toolkit publish + design-system integration',
    status: artifact.status === 'succeeded' ? 'succeeded' : 'failed',
    notes:
      commandResults.failed > 0
        ? [...stageNotes, ...commandResults.errors]
        : stageNotes.length > 0
          ? stageNotes
          : undefined,
    metrics: artifact.metrics,
    artifacts: [
      {
        relative_path: stagedLog.path,
        stage: 'publish',
        status: artifact.status,
        description: 'publish-summary.json'
      }
    ]
  });

  await saveDesignRunState(context.statePath, state);

  if (artifact.status === 'failed') {
    throw new Error('One or more design-system commands failed.');
  }

  console.log('[design-toolkit-publish] updated design-system tokens/components');
}

async function runDesignSystemCommands(repoRoot: string, actions: ToolkitPublishActions) {
  const commands: Array<{ args: string[]; label: string }> = [];
  if (actions.updateTokens) {
    commands.push({ args: ['npm', '--prefix', DESIGN_SYSTEM_DIR, 'run', 'build:tokens'], label: 'build:tokens' });
  }
  if (actions.updateComponents) {
    commands.push({ args: ['npm', '--prefix', DESIGN_SYSTEM_DIR, 'run', 'lint'], label: 'lint' });
  }
  if (actions.runVisualRegression) {
    commands.push({ args: ['npm', '--prefix', DESIGN_SYSTEM_DIR, 'run', 'test:visual'], label: 'test:visual' });
  }

  const errors: string[] = [];
  const executed: string[] = [];
  let passed = 0;
  let failed = 0;
  for (const command of commands) {
    const exitCode = await spawnCommand(command.args, repoRoot);
    executed.push(command.label);
    if (exitCode === 0) {
      passed += 1;
    } else {
      failed += 1;
      errors.push(`${command.label} failed with exit code ${exitCode}`);
    }
  }
  return { passed, failed, errors, executed };
}

function spawnCommand(args: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), { stdio: 'inherit', cwd });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

function toPascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

main().catch((error) => {
  console.error('[design-toolkit-publish] failed to publish toolkit outputs');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
