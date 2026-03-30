import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import {
  loadUserConfig,
  REPO_CONFIG_PATH_ENV_KEY
} from '../src/cli/config/userConfig.js';
import { sanitizeProviderOverrideEnv } from '../src/cli/utils/providerOverrideEnv.js';

let workspaceRoot: string;
const ORIGINAL_REPO_CONFIG_PATH = process.env[REPO_CONFIG_PATH_ENV_KEY];

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'user-config-stagesets-'));
  delete process.env[REPO_CONFIG_PATH_ENV_KEY];
});

afterEach(async () => {
  if (ORIGINAL_REPO_CONFIG_PATH === undefined) {
    delete process.env[REPO_CONFIG_PATH_ENV_KEY];
  } else {
    process.env[REPO_CONFIG_PATH_ENV_KEY] = ORIGINAL_REPO_CONFIG_PATH;
  }
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('loadUserConfig stage sets', () => {
  it('expands stage-set references into concrete stages', async () => {
    const config = {
      stageSets: {
        'build-lint-test': [
          {
            kind: 'command',
            id: 'build',
            title: 'npm run build',
            command: 'npm run build'
          },
          {
            kind: 'command',
            id: 'lint',
            title: 'npm run lint',
            command: 'npm run lint'
          },
          {
            kind: 'command',
            id: 'test',
            title: 'npm run test',
            command: 'npm run test'
          }
        ]
      },
      pipelines: [
        {
          id: 'diagnostics',
          title: 'Diagnostics',
          stages: [
            {
              kind: 'command',
              id: 'guard',
              title: 'guard',
              command: 'node guard'
            },
            {
              kind: 'stage-set',
              ref: 'build-lint-test'
            },
            {
              kind: 'command',
              id: 'spec',
              title: 'spec',
              command: 'node spec'
            }
          ]
        }
      ]
    };
    await writeFile(
      join(workspaceRoot, 'codex.orchestrator.json'),
      `${JSON.stringify(config, null, 2)}\n`,
      'utf8'
    );

    const env: EnvironmentPaths = {
      repoRoot: workspaceRoot,
      runsRoot: join(workspaceRoot, '.runs'),
      outRoot: join(workspaceRoot, 'out'),
      taskId: 'task-stagesets'
    };

    const loaded = await loadUserConfig(env, {
      processEnv: sanitizeProviderOverrideEnv(process.env)
    });
    const stages = loaded?.pipelines?.[0]?.stages ?? [];

    expect(stages).toHaveLength(5);
    expect(stages.map((stage) => stage.kind)).toEqual([
      'command',
      'command',
      'command',
      'command',
      'command'
    ]);
    expect(stages.map((stage) => stage.id)).toEqual(['guard', 'build', 'lint', 'test', 'spec']);
  });
});
