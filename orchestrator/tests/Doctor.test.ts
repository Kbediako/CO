import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  formatDoctorCloudPreflightSummary,
  formatDoctorSummary,
  runDoctor,
  runDoctorCloudPreflight
} from '../src/cli/doctor.js';

async function writeFakeCodexBinary(dir: string, featureLine: string): Promise<string> {
  const binPath = join(dir, 'codex');
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      `  echo "${featureLine}"`,
      '  exit 0',
      'fi',
      'if [ "$1" = "cloud" ] && [ "$2" = "--help" ]; then',
      '  exit 0',
      'fi',
      'exit 0'
    ].join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

describe('runDoctor', () => {
  it('reports missing devtools config and skill when absent', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      const result = runDoctor(process.cwd());
      expect(result.devtools.status).toBe('missing-both');
      expect(result.devtools.skill.name).toBe('chrome-devtools');
      expect(result.devtools.config.status).toBe('missing');
      expect(result.missing).toContain('chrome-devtools');
      expect(result.missing).toContain('chrome-devtools-config');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('reports devtools readiness when config and skill exist', async () => {
    const originalCodexHome = process.env.CODEX_HOME;
    const tempHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
    process.env.CODEX_HOME = tempHome;
    try {
      const skillDir = join(tempHome, 'skills', 'chrome-devtools');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# devtools skill', 'utf8');
      await writeFile(
        join(tempHome, 'config.toml'),
        [
          '[mcp_servers.chrome-devtools]',
          'command = "npx"',
          'args = ["-y", "chrome-devtools-mcp@latest"]'
        ].join('\n'),
        'utf8'
      );

      const result = runDoctor(process.cwd());
      const names = result.dependencies.map((dep) => dep.name);
      expect(names).toEqual(['playwright', 'pngjs', 'pixelmatch', 'cheerio']);
      expect(result.devtools.status).toBe('ok');
      expect(result.devtools.config.status).toBe('ok');

      const summary = formatDoctorSummary(result).join('\n');
      for (const name of names) {
        expect(summary).toContain(name);
      }
      expect(summary).toContain('DevTools: ok');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('prefers multi_agent feature key when reported by codex features list', async () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-codex-bin-'));
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = runDoctor(process.cwd());
      expect(result.collab.enabled).toBe(true);
      expect(result.collab.feature_key).toBe('multi_agent');
      expect(formatDoctorSummary(result).join('\n')).toContain('feature key: multi_agent');
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to legacy collab feature key when canonical key is absent', async () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-codex-bin-'));
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'collab experimental true');
    try {
      const result = runDoctor(process.cwd());
      expect(result.collab.enabled).toBe(true);
      expect(result.collab.feature_key).toBe('collab');
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('reports missing cloud env id in doctor cloud preflight output', async () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-'));
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: process.cwd(),
        env: {
          ...process.env,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: '',
          MCP_RUNNER_TASK_ID: '',
          TASK: '',
          CODEX_ORCHESTRATOR_TASK_ID: ''
        }
      });
      expect(result.ok).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing_environment' })]));
      expect(formatDoctorCloudPreflightSummary(result).join('\n')).toContain('Cloud preflight: failed');
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('passes doctor cloud preflight when env id is provided', async () => {
    const previousCodexBin = process.env.CODEX_CLI_BIN;
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-'));
    process.env.CODEX_CLI_BIN = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: process.cwd(),
        env: { ...process.env, CODEX_CLOUD_ENV_ID: 'env_123', CODEX_CLOUD_BRANCH: '' }
      });
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(formatDoctorCloudPreflightSummary(result).join('\n')).toContain('Cloud preflight: ok');
    } finally {
      if (previousCodexBin === undefined) {
        delete process.env.CODEX_CLI_BIN;
      } else {
        process.env.CODEX_CLI_BIN = previousCodexBin;
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses repo pipeline stage cloudEnvId for doctor cloud preflight when env var is unset', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-metadata-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_stage_meta');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('ignores unsupported stage envId aliases in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-envid-alias-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { envId: 'env_alias_only' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(false);
      expect(result.details.environment_id).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain('missing_environment');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses runtime-selected pipeline metadata for doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-runtime-pipeline-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'diag',
                  title: 'Diagnostics stage',
                  command: 'echo diagnostics',
                  plan: { cloudEnvId: 'env_diag' }
                }
              ]
            },
            {
              id: 'design-reference',
              title: 'Design reference',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'design',
                  title: 'Design stage',
                  command: 'echo design'
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      join(tempDir, 'design.config.yaml'),
      ['metadata:', '  design:', '    enabled: true'].join('\n'),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(false);
      expect(result.details.environment_id).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain('missing_environment');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to diagnostics pipeline when defaultPipeline is unset in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-diagnostics-fallback-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          pipelines: [
            {
              id: 'alpha',
              title: 'Alpha',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'alpha-stage',
                  title: 'Alpha stage',
                  command: 'echo alpha',
                  plan: { cloudEnvId: 'env_alpha' }
                }
              ]
            },
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_diagnostics' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_diagnostics');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to CODEX_CLOUD_ENV_ID when defaultPipeline is invalid in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-invalid-default-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'missing-default',
          pipelines: [
            {
              id: 'alpha',
              title: 'Alpha',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'alpha-stage',
                  title: 'Alpha stage',
                  command: 'echo alpha',
                  plan: { cloudEnvId: 'env_alpha' }
                }
              ]
            },
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_diagnostics' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_from_env',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_from_env');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('fails doctor cloud preflight when strict repo-config mode blocks pipeline resolution', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-strict-repo-config-'));
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        environmentId: 'env_override',
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: '',
          CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1'
        }
      });
      expect(result.ok).toBe(false);
      expect(result.details.environment_id).toBe('env_override');
      expect(result.issues.map((issue) => issue.code)).toContain('pipeline_resolution_failed');
      expect(
        result.issues.find((issue) => issue.code === 'pipeline_resolution_failed')?.message
      ).toContain('Repo-local codex.orchestrator.json is required');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses the first runnable stage for doctor cloud preflight when no default target is declared', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-runnable-target-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'bootstrap',
                  title: 'Bootstrap',
                  command: 'echo bootstrap',
                  plan: { runnable: false }
                },
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_runnable' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_runnable');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('matches runtime target selection when earlier runnable stages have no cloud metadata', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-metadata-target-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'bootstrap',
                  title: 'Bootstrap',
                  command: 'echo bootstrap'
                },
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_second_stage' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(false);
      expect(result.details.environment_id).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain('missing_environment');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers repo stage metadata over CODEX_CLOUD_ENV_ID in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-metadata-priority-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_from_env',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_stage_meta');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves cloud env id from stageSets references in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-set-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          stageSets: {
            sharedCloud: [
              {
                kind: 'command',
                id: 'review',
                title: 'Review',
                command: 'echo review',
                plan: { cloudEnvId: 'env_stage_set' }
              }
            ]
          },
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [{ kind: 'stage-set', ref: 'sharedCloud' }]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_stage_set');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves default target from expanded stageSets in doctor cloud preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-set-default-target-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          stageSets: {
            sharedCloud: [
              {
                kind: 'command',
                id: 'bootstrap',
                title: 'Bootstrap',
                command: 'echo bootstrap',
                plan: { cloudEnvId: 'env_first' }
              },
              {
                kind: 'command',
                id: 'review',
                title: 'Review',
                command: 'echo review',
                plan: { cloudEnvId: 'env_default', defaultTarget: true }
              }
            ]
          },
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [{ kind: 'stage-set', ref: 'sharedCloud' }]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_default');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to CODEX_CLOUD_ENV_ID when stage-set references are invalid in doctor preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-set-invalid-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                { kind: 'stage-set', ref: 'missingSharedSet' },
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: 'env_from_env',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_from_env');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers explicit cloud env id override over repo stage metadata in doctor preflight', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-stage-override-'));
    await writeFile(
      join(tempDir, 'codex.orchestrator.json'),
      JSON.stringify(
        {
          defaultPipeline: 'diagnostics',
          pipelines: [
            {
              id: 'diagnostics',
              title: 'Diagnostics',
              guardrailsRequired: false,
              stages: [
                {
                  kind: 'command',
                  id: 'review',
                  title: 'Review',
                  command: 'echo review',
                  plan: { cloudEnvId: 'env_stage_meta' }
                }
              ]
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        environmentId: 'env_override',
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_override');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses task metadata cloud env id for doctor cloud preflight when env var is unset', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-task-metadata-'));
    await mkdir(join(tempDir, 'tasks'), { recursive: true });
    await writeFile(
      join(tempDir, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '0974-cloud-adoption-preflight-reliability',
            slug: '0974-cloud-adoption-preflight-reliability',
            title: 'Cloud preflight task',
            metadata: {
              cloud: {
                envId: 'env_task_meta'
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        taskId: '0974-cloud-adoption-preflight-reliability',
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_task_meta');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves task metadata cloud env id when doctor runs from a subdirectory', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-task-metadata-subdir-'));
    const subdir = join(tempDir, 'packages', 'app');
    await mkdir(join(tempDir, 'tasks'), { recursive: true });
    await mkdir(subdir, { recursive: true });
    await writeFile(
      join(tempDir, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '0974-cloud-adoption-preflight-reliability',
            slug: '0974-cloud-adoption-preflight-reliability',
            title: 'Cloud preflight task',
            metadata: {
              cloud: {
                envId: 'env_task_meta_subdir'
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: subdir,
        taskId: '0974-cloud-adoption-preflight-reliability',
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_task_meta_subdir');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('uses parent task metadata cloud env id for delegated task IDs', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-cloud-preflight-task-metadata-delegated-'));
    await mkdir(join(tempDir, 'tasks'), { recursive: true });
    await writeFile(
      join(tempDir, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '0974-cloud-adoption-preflight-reliability',
            slug: '0974-cloud-adoption-preflight-reliability',
            title: 'Cloud preflight task',
            metadata: {
              cloud: {
                envId: 'env_task_meta'
              }
            }
          }
        ]
      }),
      'utf8'
    );
    const fakeCodexBin = await writeFakeCodexBinary(tempDir, 'multi_agent experimental true');
    try {
      const result = await runDoctorCloudPreflight({
        cwd: tempDir,
        taskId: '0974-cloud-adoption-preflight-reliability-scout',
        env: {
          ...process.env,
          CODEX_CLI_BIN: fakeCodexBin,
          CODEX_CLOUD_ENV_ID: '',
          CODEX_CLOUD_BRANCH: ''
        }
      });
      expect(result.ok).toBe(true);
      expect(result.details.environment_id).toBe('env_task_meta');
      expect(result.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
