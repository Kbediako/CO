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
        env: { ...process.env, CODEX_CLOUD_ENV_ID: '', CODEX_CLOUD_BRANCH: '' }
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
