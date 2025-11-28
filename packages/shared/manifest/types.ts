export type ApprovalSource = 'not-required' | 'cache' | 'prompt';

export type SandboxState = 'sandboxed' | 'escalated' | 'failed';

export type ToolRunStatus = 'succeeded' | 'failed';

export type ToolRunEventType = 'exec:begin' | 'exec:chunk' | 'exec:end' | 'exec:retry';

export interface ToolRunEventBase {
  /**
   * Event discriminator describing which lifecycle event fired.
   */
  type: ToolRunEventType;
  /**
   * Correlation identifier shared across exec lifecycle events.
   */
  correlationId: string;
  /**
   * ISO 8601 timestamp when the event fired.
   */
  timestamp: string;
  /**
   * Attempt number associated with this event (starts at 1).
   */
  attempt: number;
}

export interface ExecBeginEventRecord extends ToolRunEventBase {
  type: 'exec:begin';
  command: string;
  args: string[];
  cwd?: string;
  sessionId: string;
  sandboxState: SandboxState;
  persisted: boolean;
}

export interface ExecChunkEventRecord extends ToolRunEventBase {
  type: 'exec:chunk';
  stream: 'stdout' | 'stderr';
  sequence: number;
  bytes: number;
  data: string;
}

export interface ExecEndEventRecord extends ToolRunEventBase {
  type: 'exec:end';
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  sandboxState: SandboxState;
  sessionId: string;
  status: ToolRunStatus;
}

export interface ExecRetryEventRecord extends ToolRunEventBase {
  type: 'exec:retry';
  delayMs: number;
  sandboxState: SandboxState;
  errorMessage: string;
}

export type ToolRunEvent =
  | ExecBeginEventRecord
  | ExecChunkEventRecord
  | ExecEndEventRecord
  | ExecRetryEventRecord;

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
  /**
   * Optional per-run lifecycle events emitted during execution.
   */
  events?: ToolRunEvent[];
}

export interface ToolRunManifest {
  toolRuns?: ToolRunRecord[];
  design_artifacts?: DesignArtifactRecord[];
  design_artifacts_summary?: DesignArtifactsSummary;
  design_config_snapshot?: Record<string, unknown> | null;
  design_toolkit_artifacts?: DesignToolkitArtifactRecord[];
  design_toolkit_summary?: DesignToolkitSummary;
  design_plan?: DesignPlanRecord | null;
  design_guardrail?: DesignGuardrailRecord | null;
  design_history?: DesignHistoryRecord | null;
  design_style_profile?: DesignStyleProfileMetadata | null;
  design_metrics?: DesignMetricRecord | null;
  [key: string]: unknown;
}

export type DesignArtifactStage =
  | 'extract'
  | 'reference'
  | 'components'
  | 'motion'
  | 'video'
  | 'visual-regression'
  | 'style-ingestion'
  | 'design-brief'
  | 'aesthetic-plan'
  | 'implementation'
  | 'guardrail'
  | 'design-history';

export interface DesignArtifactApprovalRecord {
  id: string;
  actor: string;
  reason: string;
  timestamp: string;
}

export interface DesignArtifactQuota {
  type: 'storage' | 'runtime';
  limit: number;
  unit: 'MB' | 'seconds';
  consumed?: number;
}

export interface DesignArtifactExpiry {
  date: string;
  policy: string;
}

export interface DesignArtifactRecord {
  stage: DesignArtifactStage;
  status: 'succeeded' | 'skipped' | 'failed';
  relative_path: string;
  type?: string;
  description?: string;
  approvals?: DesignArtifactApprovalRecord[];
  quota?: DesignArtifactQuota;
  expiry?: DesignArtifactExpiry;
  privacy_notes?: string[];
  config_hash?: string;
  metadata?: Record<string, unknown>;
}

export interface DesignArtifactsSummaryStageEntry {
  stage: DesignArtifactStage;
  succeeded: number;
  failed: number;
  skipped: number;
  artifacts?: number;
  notes?: string[];
}

export interface DesignArtifactsSummary {
  total_artifacts: number;
  storage_bytes?: number;
  generated_at: string;
  stages: DesignArtifactsSummaryStageEntry[];
  errors?: string[];
}

export type DesignToolkitStage =
  | 'extract'
  | 'tokens'
  | 'styleguide'
  | 'reference'
  | 'self-correct'
  | 'publish';

export interface DesignToolkitArtifactRetention {
  days: number;
  autoPurge: boolean;
  expiry: string;
  policy?: string;
}

export interface DesignToolkitArtifactRecord {
  id: string;
  stage: DesignToolkitStage;
  status: 'succeeded' | 'skipped' | 'failed';
  relative_path: string;
  description?: string;
  approvals?: DesignArtifactApprovalRecord[];
  retention?: DesignToolkitArtifactRetention;
  metrics?: Record<string, number | string>;
  privacy_notes?: string[];
}

export interface DesignToolkitSummaryStageEntry {
  stage: DesignToolkitStage;
  artifacts: number;
  metrics?: Record<string, number | string>;
  notes?: string[];
}

export interface DesignToolkitSummary {
  generated_at: string;
  stages: DesignToolkitSummaryStageEntry[];
  totals?: Record<string, number>;
  approvals?: string[];
}

export type DesignPipelineMode = 'fresh' | 'clone-informed';

export interface DesignStyleProfileMetadata {
  id: string;
  relative_path: string;
  source_url?: string;
  ingestion_run?: string;
  similarity_level?: 'low' | 'medium' | 'high';
  do_not_copy?: {
    logos?: string[];
    wordmarks?: string[];
    unique_shapes?: string[];
    unique_illustrations?: string[];
    other?: string[];
  };
  retention_days?: number;
  expiry?: DesignArtifactExpiry;
  approvals?: DesignArtifactApprovalRecord[];
  notes?: string[];
}

export interface DesignPlanRecord {
  mode: DesignPipelineMode;
  brief: {
    path: string;
    hash?: string;
    id?: string;
  };
  aesthetic_plan?: {
    path: string;
    snippet_version?: string;
    id?: string;
  };
  implementation?: {
    path: string;
    complexity?: string;
  };
  reference_style_id?: string | null;
  style_profile_id?: string | null;
  generated_at?: string;
}

export type DesignGateStatus = 'pass' | 'fail';

export interface DesignStyleOverlapBreakdown {
  palette?: number;
  typography?: number;
  motion?: number;
  spacing?: number;
  overall: number;
  gate?: DesignGateStatus;
  threshold?: number;
  comparison_window?: string[];
  reference_style_id?: string | null;
}

export interface DesignGuardrailRecord {
  report_path: string;
  status: DesignGateStatus;
  snippet_version?: string;
  strictness?: 'low' | 'medium' | 'high';
  slop_threshold?: number;
  mode?: DesignPipelineMode;
  scores?: Record<string, number>;
  recommendations?: string[];
  notes?: string[];
  style_overlap?: DesignStyleOverlapBreakdown;
}

export interface DesignHistoryRecord {
  path: string;
  mirror_path?: string;
  entries?: number;
  max_entries?: number;
  updated_at?: string;
  mode?: DesignPipelineMode;
}

export interface DesignMetricRecord {
  aesthetic_axes_completeness?: number;
  originality_score?: number;
  accessibility_score?: number;
  brief_alignment_score?: number;
  slop_risk?: number;
  diversity_penalty?: number;
  similarity_to_reference?: number;
  style_overlap?: number;
  style_overlap_gate?: DesignGateStatus;
  snippet_version?: string;
}
