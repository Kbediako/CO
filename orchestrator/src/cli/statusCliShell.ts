import type { CodexOrchestrator } from './orchestrator.js';
import type { CliManifest } from './types.js';

type OutputFormat = 'json' | 'text';

export interface RunStatusCliShellParams {
  orchestrator: CodexOrchestrator;
  runId: string;
  watch: boolean;
  format: OutputFormat;
  interval: number;
}

interface StatusCliShellDependencies {
  delay: (ms: number) => Promise<void>;
  terminalStatuses: Set<string>;
}

const DEFAULT_DEPENDENCIES: StatusCliShellDependencies = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  terminalStatuses: new Set(['succeeded', 'failed', 'cancelled'])
};

export async function runStatusCliShell(
  params: RunStatusCliShellParams,
  overrides: Partial<StatusCliShellDependencies> = {}
): Promise<CliManifest> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  let manifest = await params.orchestrator.status({
    runId: params.runId,
    format: params.format
  });

  if (!params.watch) {
    return manifest;
  }

  while (!dependencies.terminalStatuses.has(manifest.status)) {
    await dependencies.delay(params.interval * 1000);
    manifest = await params.orchestrator.status({
      runId: params.runId,
      format: params.format
    });
  }

  return manifest;
}
