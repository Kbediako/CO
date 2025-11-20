import type { SandboxState, ToolRunStatus } from '../../../../packages/shared/manifest/types.js';

export interface RunResultSummary {
  correlationId: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  status: ToolRunStatus;
  sandboxState: SandboxState;
}
