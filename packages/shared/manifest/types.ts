export type ApprovalSource = 'not-required' | 'cache' | 'prompt';

export type SandboxState = 'sandboxed' | 'escalated' | 'failed';

export type ToolRunStatus = 'succeeded' | 'failed';

export interface ToolRunRecord {
  /**
   * Unique identifier for this tool run within the parent manifest.
   */
  id: string;
  /**
   * Identifier of the tool or adapter that executed.
   */
  tool: string;
  /**
   * Where the approval originated (cache, prompt, or not-required).
   */
  approvalSource: ApprovalSource;
  /**
   * Number of retry attempts performed after the initial run.
   */
  retryCount: number;
  /**
   * Final sandbox disposition for the tool (e.g., stayed sandboxed or escalated).
   */
  sandboxState: SandboxState;
  /**
   * Whether the tool completed successfully.
   */
  status: ToolRunStatus;
  /**
   * ISO 8601 timestamp indicating when the tool run started.
   */
  startedAt: string;
  /**
   * ISO 8601 timestamp indicating when the tool run completed (success or failure).
   */
  completedAt: string;
  /**
   * Total attempts performed (retries + initial attempt).
   */
  attemptCount: number;
  /**
   * Optional additional metadata captured during execution.
   */
  metadata?: Record<string, unknown>;
}

export interface ToolRunManifest {
  toolRuns?: ToolRunRecord[];
  [key: string]: unknown;
}
