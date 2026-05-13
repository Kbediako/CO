import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { formatInitSummary, initCodexTemplates } from '../src/cli/init.js';

let tempDir: string | null = null;

function buildInitEnv(codexHome: string, codexBin = path.join(codexHome, 'missing-codex')): NodeJS.ProcessEnv {
  return { CODEX_HOME: codexHome, CODEX_CLI_BIN: codexBin } as NodeJS.ProcessEnv;
}

async function writeFakeCodexBinary(
  dir: string,
  featureLine: string,
  options: { exitCode?: number; stderr?: string } = {}
): Promise<string> {
  const binPath = path.join(dir, 'codex');
  const featureOutput = featureLine.length > 0 ? `  printf '%s\\n' ${JSON.stringify(featureLine)}` : '';
  const stderrOutput = options.stderr ? `  printf '%s\\n' ${JSON.stringify(options.stderr)} >&2` : '';
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      featureOutput,
      stderrOutput,
      `  exit ${options.exitCode ?? 0}`,
      'fi',
      'exit 0'
    ].filter(Boolean).join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

async function writeEnvAwareCodexBinary(dir: string): Promise<string> {
  const binPath = path.join(dir, 'codex-env-aware');
  await writeFile(
    binPath,
    [
      '#!/bin/sh',
      'if [ "$1" = "features" ] && [ "$2" = "list" ]; then',
      '  if [ -n "$CODEX_HOME" ] && [ -f "$CODEX_HOME/multi-agent-v2.enabled" ]; then',
      "    printf '%s\\n' 'multi_agent_v2 experimental true'",
      '  else',
      "    printf '%s\\n' 'multi_agent_v2 experimental false'",
      '  fi',
      '  exit 0',
      'fi',
      'exit 0'
    ].join('\n'),
    'utf8'
  );
  await chmod(binPath, 0o755);
  return binPath;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('initCodexTemplates', () => {
  it('copies templates and skips existing files without --force', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-init-'));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), 'codex-home-init-stable-'));

    try {
      const first = await initCodexTemplates({
        template: 'codex',
        cwd: tempDir,
        force: false,
        env: buildInitEnv(codexHome)
      });
      expect(first.written.some((filePath) => filePath.endsWith('mcp-client.json'))).toBe(true);
      expect(first.written.some((filePath) => filePath.endsWith('codex.orchestrator.json'))).toBe(true);
      expect(first.written.some((filePath) => filePath.endsWith(path.join('.codex', 'config.toml')))).toBe(true);

      const templatePath = path.join(tempDir, 'mcp-client.json');
      const contents = await readFile(templatePath, 'utf8');
      const mcpClientConfig = JSON.parse(contents);
      expect(mcpClientConfig.templateVersion).toBe(1);
      expect(mcpClientConfig.mcpServers['codex-orchestrator']).toEqual({
        command: 'codex-orchestrator',
        args: ['mcp', 'serve']
      });
      const pipelineConfig = await readFile(path.join(tempDir, 'codex.orchestrator.json'), 'utf8');
      expect(pipelineConfig).toContain('"pipelines"');
      const codexConfig = await readFile(path.join(tempDir, '.codex', 'config.toml'), 'utf8');
      expect(codexConfig).toContain('max_threads = 12');
      expect(codexConfig).not.toContain('max_depth = 4');
      expect(codexConfig).not.toContain('max_spawn_depth = 4');
      const workerRole = await readFile(
        path.join(tempDir, '.codex', 'agents', 'worker-complex.toml'),
        'utf8'
      );
      expect(workerRole).toContain('model = "gpt-5.4"');
      expect(workerRole).toContain('model_reasoning_effort = "xhigh"');
      expect(workerRole).not.toContain('gpt-5.5');
      const awaiterRole = await readFile(
        path.join(tempDir, '.codex', 'agents', 'awaiter-high.toml'),
        'utf8'
      );
      expect(awaiterRole).toContain('# with CO override to use gpt-5.4 at high reasoning.');
      expect(awaiterRole).toContain('model = "gpt-5.4"');
      expect(awaiterRole).toContain('model_reasoning_effort = "high"');
      expect(awaiterRole).not.toContain('gpt-5.5');
      const explorerFastRole = await readFile(
        path.join(tempDir, '.codex', 'agents', 'explorer-fast.toml'),
        'utf8'
      );
      expect(explorerFastRole).toContain('model = "gpt-5.3-codex-spark"');
      expect(explorerFastRole).not.toContain('gpt-5.5');

      const second = await initCodexTemplates({
        template: 'codex',
        cwd: tempDir,
        force: false,
        env: buildInitEnv(codexHome)
      });
      expect(second.written).toHaveLength(0);
      expect(second.skipped.some((filePath) => filePath.endsWith('mcp-client.json'))).toBe(true);

      const summary = formatInitSummary(first, tempDir).join('\n');
      expect(summary).toContain('Written:');
      expect(summary).toContain('mcp-client.json');
      expect(summary).toContain('codex.orchestrator.json');
      expect(summary).toContain(path.join('.codex', 'config.toml'));
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it('omits max_threads from the copied config when multi_agent_v2 is enabled', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-init-multi-agent-v2-'));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), 'codex-home-init-v2-'));

    try {
      const codexBin = await writeFakeCodexBinary(codexHome, 'multi_agent_v2 experimental true');

      await initCodexTemplates({
        template: 'codex',
        cwd: tempDir,
        force: false,
        env: buildInitEnv(codexHome, codexBin)
      });

      const codexConfig = await readFile(path.join(tempDir, '.codex', 'config.toml'), 'utf8');
      expect(codexConfig).not.toContain('max_threads');
      expect(codexConfig).toContain('[agents.explorer_fast]');
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it('keeps max_threads when the feature probe explicitly disables multi_agent_v2', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-init-multi-agent-v2-false-'));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), 'codex-home-init-v2-false-'));

    try {
      await writeFile(path.join(codexHome, 'config.toml'), '[features]\nmulti_agent_v2 = true\n', 'utf8');
      const codexBin = await writeFakeCodexBinary(codexHome, 'multi_agent_v2 experimental false', {
        stderr: 'invalid config: agents.max_threads is rejected when features.multi_agent_v2=true'
      });

      await initCodexTemplates({
        template: 'codex',
        cwd: tempDir,
        force: false,
        env: buildInitEnv(codexHome, codexBin)
      });

      const codexConfig = await readFile(path.join(tempDir, '.codex', 'config.toml'), 'utf8');
      expect(codexConfig).toContain('max_threads = 12');
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it('keeps max_threads when feature table disables multi_agent_v2 despite a retained cap', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-init-multi-agent-v2-disabled-feature-cap-'));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), 'codex-home-init-v2-disabled-feature-cap-'));

    try {
      await writeFile(
        path.join(codexHome, 'config.toml'),
        [
          '[features.multi_agent_v2]',
          'enabled = false',
          'max_concurrent_threads_per_session = 8'
        ].join('\n'),
        'utf8'
      );
      const codexBin = await writeFakeCodexBinary(codexHome, '');

      await initCodexTemplates({
        template: 'codex',
        cwd: tempDir,
        force: false,
        env: buildInitEnv(codexHome, codexBin)
      });

      const codexConfig = await readFile(path.join(tempDir, '.codex', 'config.toml'), 'utf8');
      expect(codexConfig).toContain('max_threads = 12');
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it('uses the target env when probing Codex features during init', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-init-multi-agent-v2-env-'));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), 'codex-home-init-v2-env-'));
    const ambientCodexHome = await mkdtemp(path.join(os.tmpdir(), 'codex-home-init-v2-ambient-'));
    const originalCodexHome = process.env.CODEX_HOME;

    try {
      process.env.CODEX_HOME = ambientCodexHome;
      await writeFile(path.join(codexHome, 'multi-agent-v2.enabled'), '1\n', 'utf8');
      const codexBin = await writeEnvAwareCodexBinary(codexHome);

      await initCodexTemplates({
        template: 'codex',
        cwd: tempDir,
        force: false,
        env: buildInitEnv(codexHome, codexBin)
      });

      const codexConfig = await readFile(path.join(tempDir, '.codex', 'config.toml'), 'utf8');
      expect(codexConfig).not.toContain('max_threads');
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
      await rm(codexHome, { recursive: true, force: true });
      await rm(ambientCodexHome, { recursive: true, force: true });
    }
  });

  it('does not fail repo init when fallback global Codex config parsing fails', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-init-bad-global-config-'));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), 'codex-home-init-bad-config-'));

    try {
      await writeFile(path.join(codexHome, 'config.toml'), '[features\nmulti_agent_v2 = true\n', 'utf8');

      await initCodexTemplates({
        template: 'codex',
        cwd: tempDir,
        force: false,
        env: buildInitEnv(codexHome)
      });

      const codexConfig = await readFile(path.join(tempDir, '.codex', 'config.toml'), 'utf8');
      expect(codexConfig).toContain('max_threads = 12');
      const orchestratorConfig = await readFile(path.join(tempDir, 'codex.orchestrator.json'), 'utf8');
      expect(orchestratorConfig).toContain('"pipelines"');
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it('does not fail repo init when fallback global Codex config cannot be read', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-init-unreadable-global-config-'));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), 'codex-home-init-unreadable-config-'));

    try {
      await mkdir(path.join(codexHome, 'config.toml'));

      await initCodexTemplates({
        template: 'codex',
        cwd: tempDir,
        force: false,
        env: buildInitEnv(codexHome)
      });

      const codexConfig = await readFile(path.join(tempDir, '.codex', 'config.toml'), 'utf8');
      expect(codexConfig).toContain('max_threads = 12');
      const orchestratorConfig = await readFile(path.join(tempDir, 'codex.orchestrator.json'), 'utf8');
      expect(orchestratorConfig).toContain('"pipelines"');
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });
});
