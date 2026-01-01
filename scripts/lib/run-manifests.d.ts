export function resolveRepoRoot(): string;
export function resolveRunsDir(repoRoot: string): string;
export function listDirectories(dirPath: string): Promise<string[]>;
export function parseRunIdTimestamp(runId: string): Date | null;
export function pickLatestRunId(runIds: string[]): string | null;
export function collectManifests(runsDir: string, taskFilter?: string | null): Promise<string[]>;
export function findSubagentManifests(
  runsDir: string,
  taskId: string
): Promise<{ found: string[]; error: string | null }>;
