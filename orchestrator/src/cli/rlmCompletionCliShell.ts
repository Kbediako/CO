import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface RunRlmCompletionCliShellParams {
  repoRoot: string;
  artifactRoot: string;
  log: (line: string) => void;
  error: (line: string) => void;
  setExitCode: (code: number) => void;
}

interface TerminalManifest {
  status: string;
}

interface RlmFinalState {
  exitCode: number;
  status: string;
}

interface RlmCompletionCliShellDependencies {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  delay: (ms: number) => Promise<void>;
  terminalStatuses: Set<string>;
  missingStateExitCode: number;
}

const DEFAULT_DEPENDENCIES: RlmCompletionCliShellDependencies = {
  readFile,
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  terminalStatuses: new Set(['succeeded', 'failed', 'cancelled']),
  missingStateExitCode: 10
};

async function waitForManifestCompletion(
  manifestPath: string,
  dependencies: RlmCompletionCliShellDependencies,
  intervalMs = 2000
): Promise<TerminalManifest> {
  for (;;) {
    const raw = await dependencies.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(raw) as TerminalManifest;
    if (dependencies.terminalStatuses.has(manifest.status)) {
      return manifest;
    }
    await dependencies.delay(intervalMs);
  }
}

async function readRlmState(
  statePath: string,
  dependencies: RlmCompletionCliShellDependencies
): Promise<RlmFinalState | null> {
  try {
    const raw = await dependencies.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw) as { final?: RlmFinalState | null };
    if (!parsed.final) {
      return null;
    }
    return parsed.final;
  } catch {
    return null;
  }
}

export async function runRlmCompletionCliShell(
  params: RunRlmCompletionCliShellParams,
  overrides: Partial<RlmCompletionCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const manifestPath = join(params.repoRoot, params.artifactRoot, 'manifest.json');
  const manifest = await waitForManifestCompletion(manifestPath, dependencies);
  const statePath = join(params.repoRoot, params.artifactRoot, 'rlm', 'state.json');
  const rlmState = await readRlmState(statePath, dependencies);

  if (rlmState) {
    params.log(`RLM status: ${rlmState.status}`);
    params.setExitCode(rlmState.exitCode);
    return;
  }

  params.log(`RLM status: ${manifest.status}`);
  params.error('RLM state file missing; treating as internal error.');
  params.setExitCode(dependencies.missingStateExitCode);
}
