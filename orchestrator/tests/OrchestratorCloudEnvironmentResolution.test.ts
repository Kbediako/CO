import { afterEach, describe, expect, it } from 'vitest';
import process from 'node:process';

import type { PlanItem, TaskContext } from '../src/types.js';
import { resolveCloudEnvironmentId } from '../src/cli/services/orchestratorCloudEnvironmentResolution.js';

const ORIGINAL_CLOUD_ENV_ID = process.env.CODEX_CLOUD_ENV_ID;

function buildTask(metadata: TaskContext['metadata'] = {}): TaskContext {
  return {
    id: 'task-1',
    title: 'Task',
    metadata
  };
}

function buildTarget(metadata: PlanItem['metadata'] = {}): PlanItem {
  return {
    id: 'target-1',
    description: 'Target',
    metadata
  };
}

afterEach(() => {
  if (ORIGINAL_CLOUD_ENV_ID === undefined) {
    delete process.env.CODEX_CLOUD_ENV_ID;
    return;
  }
  process.env.CODEX_CLOUD_ENV_ID = ORIGINAL_CLOUD_ENV_ID;
});

describe('resolveCloudEnvironmentId', () => {
  it('prefers target metadata cloudEnvId over all later candidates', () => {
    process.env.CODEX_CLOUD_ENV_ID = 'process-env';

    const result = resolveCloudEnvironmentId(
      buildTask({
        cloud: { envId: 'task-cloud-env' },
        cloudEnvId: 'task-top-level-env'
      }),
      buildTarget({
        cloudEnvId: ' target-env ',
        cloud_env_id: 'target-env-snake',
        envId: 'target-env-id',
        environmentId: 'target-environment-id'
      }),
      { CODEX_CLOUD_ENV_ID: 'override-env' }
    );

    expect(result).toBe('target-env');
  });

  it('falls through target aliases and task metadata before env overrides and process env', () => {
    process.env.CODEX_CLOUD_ENV_ID = 'process-env';

    expect(
      resolveCloudEnvironmentId(
        buildTask({
          cloud: { envId: ' task-cloud-env ' },
          cloudEnvId: 'task-top-level-env'
        }),
        buildTarget({
          cloudEnvId: '   ',
          cloud_env_id: ' target-snake-env '
        }),
        { CODEX_CLOUD_ENV_ID: 'override-env' }
      )
    ).toBe('target-snake-env');

    expect(
      resolveCloudEnvironmentId(
        buildTask({
          cloud: { envId: '   ', environmentId: ' task-cloud-environment ' },
          cloudEnvId: 'task-top-level-env'
        }),
        buildTarget({
          cloudEnvId: '   ',
          cloud_env_id: '',
          envId: '   ',
          environmentId: '   '
        }),
        { CODEX_CLOUD_ENV_ID: 'override-env' }
      )
    ).toBe('task-cloud-environment');

    expect(
      resolveCloudEnvironmentId(
        buildTask({
          cloud: { envId: '   ', environmentId: '   ' },
          cloudEnvId: ' task-top-level-env '
        }),
        buildTarget(),
        { CODEX_CLOUD_ENV_ID: 'override-env' }
      )
    ).toBe('task-top-level-env');
  });

  it('falls back to env overrides and then process env when metadata is missing', () => {
    process.env.CODEX_CLOUD_ENV_ID = ' process-env ';

    expect(
      resolveCloudEnvironmentId(buildTask(), buildTarget(), {
        CODEX_CLOUD_ENV_ID: ' override-env '
      })
    ).toBe('override-env');

    expect(resolveCloudEnvironmentId(buildTask(), buildTarget(), { CODEX_CLOUD_ENV_ID: '   ' })).toBe('process-env');
  });

  it('returns null when no candidate is present', () => {
    delete process.env.CODEX_CLOUD_ENV_ID;

    expect(resolveCloudEnvironmentId(buildTask(), buildTarget(), { CODEX_CLOUD_ENV_ID: ' ' })).toBeNull();
  });
});
