import { spawnSync } from 'node:child_process';

export interface CodexFeatureProbeResult {
  flags: Record<string, boolean> | null;
  stderr: string;
  error: string | null;
  status: number | null;
}

export function readCodexFeatureProbe(
  codexBin: string,
  env: NodeJS.ProcessEnv = process.env
): CodexFeatureProbeResult {
  const result = spawnSync(codexBin, ['features', 'list'], {
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000
  });
  const stderr = String(result.stderr ?? '');
  if (result.error || result.status !== 0) {
    return {
      flags: null,
      stderr,
      error: result.error
        ? result.error.message
        : `codex features list exited with status ${result.status ?? '<unknown>'}`,
      status: result.status
    };
  }
  const stdout = String(result.stdout ?? '');
  return {
    flags: parseFeatureFlagsFromText(stdout),
    stderr,
    error: null,
    status: result.status
  };
}

export function codexFeatureProbeRejectsAgentMaxThreads(probe: CodexFeatureProbeResult): boolean {
  const text = `${probe.error ?? ''}\n${probe.stderr}`.toLowerCase();
  const mentionsMaxThreads = /\bagents\.max_threads\b/u.test(text) || /\bmax[_\s-]?threads\b/u.test(text);
  return mentionsMaxThreads && /\bmulti_agent_v2\b/u.test(text);
}

export function codexFeatureProbeDisablesMultiAgentV2(probe: CodexFeatureProbeResult): boolean {
  return probe.flags?.multi_agent_v2 === false;
}

function parseFeatureFlagsFromText(stdout: string): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const line of stdout.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const tokens = trimmed.split(/\s+/u);
    if (tokens.length < 2) {
      continue;
    }
    const name = tokens[0] ?? '';
    const enabledToken = tokens[tokens.length - 1] ?? '';
    if (!name) {
      continue;
    }
    if (enabledToken === 'true') {
      flags[name] = true;
    } else if (enabledToken === 'false') {
      flags[name] = false;
    }
  }
  return flags;
}
