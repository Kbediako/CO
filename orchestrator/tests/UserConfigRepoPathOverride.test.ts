import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import {
  loadUserConfig,
  REPO_CONFIG_PATH_ENV_KEY
} from '../src/cli/config/userConfig.js';

let workspaceRoot: string;
let snapshotRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'user-config-override-workspace-'));
  snapshotRoot = await mkdtemp(join(tmpdir(), 'user-config-override-snapshot-'));
});

afterEach(async () => {
  await rm(workspaceRoot, { recursive: true, force: true });
  await rm(snapshotRoot, { recursive: true, force: true });
});

describe('loadUserConfig repo path override', () => {
  it('loads repo config from the explicit override path when provided', async () => {
    await writeFile(
      join(workspaceRoot, 'codex.orchestrator.json'),
      JSON.stringify(buildConfig('workspace'), null, 2),
      'utf8'
    );
    const overridePath = join(snapshotRoot, 'provider-workflow.last-known-good.json');
    await writeFile(overridePath, JSON.stringify(buildConfig('snapshot'), null, 2), 'utf8');

    const config = await loadUserConfig(buildEnv(workspaceRoot), {
      processEnv: {
        ...process.env,
        [REPO_CONFIG_PATH_ENV_KEY]: overridePath
      }
    });

    expect(config?.source).toBe('repo');
    expect(config?.pipelines?.[0]?.title).toBe('Provider worker snapshot');
  });
});

function buildEnv(repoRoot: string): EnvironmentPaths {
  return {
    repoRoot,
    runsRoot: join(repoRoot, '.runs'),
    outRoot: join(repoRoot, 'out'),
    taskId: 'task-user-config-override'
  };
}

function buildConfig(label: string): Record<string, unknown> {
  return {
    defaultPipeline: 'provider-linear-worker',
    pipelines: [
      {
        id: 'provider-linear-worker',
        title: `Provider worker ${label}`,
        guardrailsRequired: false,
        stages: [
          {
            kind: 'command',
            id: 'echo',
            title: 'echo',
            command: `echo ${label}`
          }
        ]
      }
    ]
  };
}
