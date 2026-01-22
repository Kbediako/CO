/**
 * THIS FILE IS AUTO-GENERATED.
 * Run "npm run generate:manifest-types" after editing schemas/manifest.json.
 */

export interface CodexOrchestratorCLIManifest {
  version: number;
  task_id: string;
  task_slug: string | null;
  run_id: string;
  parent_run_id: string | null;
  pipeline_id: string;
  pipeline_title: string;
  runner: "codex-cli";
  approval_policy: string | null;
  status: "queued" | "in_progress" | "succeeded" | "failed" | "cancelled";
  status_detail: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
  heartbeat_at: string | null;
  heartbeat_interval_seconds: number;
  heartbeat_stale_after_seconds: number;
  artifact_root: string;
  compat_path: string;
  log_path: string;
  summary: string | null;
  metrics_recorded: boolean;
  resume_token: string;
  resume_events: {
    timestamp: string;
    actor: string;
    reason: string;
    outcome: "accepted" | "blocked";
    detail?: string | null;
  }[];
  approvals: {
    actor: string;
    timestamp: string;
    reason?: string | null;
  }[];
  handles?:
    | {
        handle_id: string;
        correlation_id: string;
        stage_id: string | null;
        pipeline_id: string;
        status: "open" | "closed";
        frame_count: number;
        latest_sequence: number;
        created_at: string;
        metadata?: {
          [k: string]: unknown;
        } | null;
      }[]
    | null;
  commands: {
    index: number;
    id: string;
    title: string;
    command: string | null;
    kind: "command" | "subpipeline";
    status: "pending" | "running" | "succeeded" | "failed" | "skipped";
    started_at: string | null;
    completed_at: string | null;
    exit_code: number | null;
    summary: string | null;
    log_path: string | null;
    error_file: string | null;
    sub_run_id: string | null;
  }[];
  collab_tool_calls?: CollabToolCall[] | null;
  child_runs: {
    run_id: string;
    pipeline_id: string;
    status: "queued" | "in_progress" | "succeeded" | "failed" | "cancelled";
    manifest: string;
  }[];
  run_summary_path: string | null;
  plan_target_id: string | null;
  control_plane?: {
    schema_id: string;
    schema_version: string;
    request_id: string;
    validation: {
      mode: "shadow" | "enforce";
      status: "passed" | "failed";
      timestamp: string;
      errors: {
        path: string;
        message: string;
        value?: unknown;
        expected?: string | null;
      }[];
    };
    drift?: {
      report_path: string | null;
      total_samples: number;
      invalid_samples: number;
      invalid_rate: number;
      last_sampled_at: string | null;
      mode: "shadow" | "enforce";
    } | null;
    enforcement?: {
      enabled: boolean;
      activated_at: string | null;
    } | null;
  } | null;
  guardrails_required?: boolean | null;
  scheduler?: {
    mode: "multi-instance";
    requested_at: string;
    min_instances: number;
    max_instances: number;
    recovery: {
      heartbeat_interval_seconds: number;
      missing_heartbeat_timeout_seconds: number;
      max_retries: number;
    };
    assignments: {
      instance_id: string;
      capability: string;
      status: "assigned" | "running" | "succeeded" | "failed" | "recovered";
      assigned_at: string;
      completed_at: string | null;
      metadata: {
        weight: number;
        maxConcurrency: number;
      };
      attempts: {
        number: number;
        assigned_at: string;
        started_at: string | null;
        completed_at: string | null;
        status: "pending" | "running" | "completed" | "failed" | "requeued";
        recovery_checkpoints: {
          timestamp: string;
          reason: "missed-heartbeat" | "manual" | "auto";
          action: "requeue" | "escalate" | "ack";
          detail?: string | null;
        }[];
      }[];
    }[];
  } | null;
  privacy?: {
    mode: "shadow" | "enforce";
    decisions: {
      handle_id: string;
      sequence: number;
      action: "allow" | "redact" | "block";
      rule?: string | null;
      reason?: string | null;
      timestamp: string;
      stage_id: string | null;
    }[];
    totals: {
      total_frames: number;
      redacted_frames: number;
      blocked_frames: number;
      allowed_frames: number;
    };
    log_path?: string | null;
  } | null;
  instructions_hash: string | null;
  instructions_sources: string[];
  prompt_packs?:
    | {
        id: string;
        domain: string;
        stamp: string;
        experience_slots: number;
        sources: string[];
        experiences?: string[] | null;
      }[]
    | null;
  tfgrpo?: {
    epoch?: number | null;
    group_id?: string | null;
    group_size?: number | null;
    tool_metrics?: {
      tool_calls: number;
      token_total: number;
      cost_usd: number;
      latency_ms: number;
      per_tool: {
        tool: string;
        tokens: number;
        cost_usd: number;
        latency_ms: number;
        attempts: number;
        status: "succeeded" | "failed";
        sandbox_state: "sandboxed" | "escalated" | "failed";
      }[];
    } | null;
    experiences?: {
      ids: string[];
      written: number;
      manifest_path: string | null;
    } | null;
  } | null;
  learning?: {
    snapshot?: {
      tag: string;
      commit_sha: string;
      tarball_path: string;
      tarball_digest: string;
      storage_path: string;
      retention_days: number;
      status: "pending" | "captured" | "snapshot_failed" | "stalled_snapshot";
      attempts: number;
      created_at: string;
      last_error?: string | null;
      git_status_path?: string | null;
      git_log_path?: string | null;
    } | null;
    queue?: {
      snapshot_id: string;
      diff_path?: string | null;
      prompt_path?: string | null;
      execution_history_path?: string | null;
      manifest_path: string;
      enqueued_at: string;
      payload_path: string;
      status: "queued" | "failed";
    } | null;
    scenario?: {
      path: string | null;
      generated_at: string | null;
      source: "execution_history" | "prompt" | "diff" | "template" | "manual";
      status: "pending" | "synthesized" | "needs_manual_scenario";
      attempts: number;
      partial_path?: string | null;
      manual_template?: string | null;
      approver?: string | null;
      reason?: string | null;
    } | null;
    validation?: {
      mode?: "per-task" | "grouped";
      grouping?: {
        id: string;
        members: string[];
        window_hours?: number | null;
      } | null;
      status?: "pending" | "validated" | "snapshot_failed" | "stalled_snapshot" | "needs_manual_scenario";
      reason?: string | null;
      log_path?: string | null;
      last_error?: string | null;
      git_status_path?: string | null;
      git_log_path?: string | null;
    } | null;
    crystalizer?: {
      candidate_path: string | null;
      model: string;
      prompt_pack: string;
      prompt_pack_stamp: string | null;
      budget_usd: number;
      cost_usd: number | null;
      status: "pending" | "succeeded" | "skipped" | "failed";
      error?: string | null;
      created_at: string;
    } | null;
    alerts?: {
      type: "snapshot_failed" | "stalled_snapshot" | "needs_manual_scenario" | "budget_exceeded";
      channel: "slack" | "pagerduty";
      target: string;
      message: string;
      created_at: string;
      severity?: string | null;
    }[];
    approvals?: {
      actor: string;
      timestamp: string;
      reason?: string | null;
      state: "stalled_snapshot" | "needs_manual_scenario" | "requeue";
    }[];
    review?: {
      rejections: number;
      latency_ms: number | null;
      last_reviewer?: string | null;
      updated_at: string;
    } | null;
    regressions?: {
      detected: number;
      detail_path?: string | null;
    } | null;
    pattern_hygiene?: {
      promoted: number;
      deprecated: number;
      notes?: string[] | null;
      updated_at: string;
    } | null;
    throughput?: {
      candidates: number;
      active: number;
      deprecated: number;
      updated_at: string;
    } | null;
  } | null;
  guardrail_status?: {
    present: boolean;
    recommendation: string | null;
    summary: string;
    computed_at: string;
    counts: {
      total: number;
      succeeded: number;
      failed: number;
      skipped: number;
      other: number;
    };
  };
  toolRuns?: ToolRun[] | null;
  design_artifacts?: DesignArtifact[] | null;
  design_artifacts_summary?: null | DesignArtifactsSummary;
  design_config_snapshot?: {
    [k: string]: unknown;
  } | null;
  design_toolkit_artifacts?: DesignToolkitArtifact[] | null;
  design_toolkit_summary?: null | DesignToolkitSummary;
  design_plan?: null | DesignPlan;
  design_guardrail?: null | DesignGuardrail;
  design_history?: null | DesignHistory;
  design_style_profile?: null | DesignStyleProfile;
  design_metrics?: null | DesignMetrics;
}
export interface CollabToolCall {
  observed_at: string;
  stage_id: string;
  command_index: number;
  event_type: "item.started" | "item.completed" | "item.updated";
  item_id: string;
  tool: string;
  status: "in_progress" | "completed" | "failed";
  sender_thread_id: string;
  receiver_thread_ids: string[];
  prompt?: string | null;
  agents_states?: {
    [k: string]: unknown;
  } | null;
}
export interface ToolRun {
  id: string;
  tool: string;
  approvalSource: "not-required" | "cache" | "prompt";
  retryCount: number;
  sandboxState: "sandboxed" | "escalated" | "failed";
  status: "succeeded" | "failed";
  startedAt: string;
  completedAt: string;
  attemptCount: number;
  metadata?: {
    [k: string]: unknown;
  } | null;
  events?: ToolRunEvent[] | null;
}
export interface ToolRunEvent {
  type: "exec:begin" | "exec:chunk" | "exec:end" | "exec:retry";
  correlationId: string;
  timestamp: string;
  attempt: number;
  command?: string | null;
  args?: string[] | null;
  cwd?: string | null;
  sessionId?: string | null;
  sandboxState?: string | null;
  stream?: string | null;
  sequence?: number | null;
  bytes?: number | null;
  data?: string | null;
  exitCode?: number | null;
  signal?: string | null;
  durationMs?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  delayMs?: number | null;
  errorMessage?: string | null;
  [k: string]: unknown;
}
export interface DesignArtifact {
  stage:
    | "extract"
    | "reference"
    | "components"
    | "motion"
    | "video"
    | "visual-regression"
    | "style-ingestion"
    | "design-brief"
    | "aesthetic-plan"
    | "implementation"
    | "guardrail"
    | "design-history";
  status: "succeeded" | "skipped" | "failed";
  relative_path: string;
  type?: string | null;
  description?: string | null;
  approvals?: DesignArtifactApproval[];
  quota?: DesignArtifactQuota;
  expiry?: DesignArtifactExpiry;
  privacy_notes?: string[];
  config_hash?: string | null;
  metadata?: {
    [k: string]: unknown;
  } | null;
}
export interface DesignArtifactApproval {
  id: string;
  actor: string;
  reason?: string | null;
  timestamp: string;
}
export interface DesignArtifactQuota {
  type: "storage" | "runtime";
  limit: number;
  unit: "MB" | "seconds";
  consumed?: number | null;
}
export interface DesignArtifactExpiry {
  date: string;
  policy: string;
}
export interface DesignArtifactsSummary {
  total_artifacts: number;
  generated_at: string;
  storage_bytes?: number | null;
  stages: DesignArtifactsSummaryStage[];
  errors?: string[];
}
export interface DesignArtifactsSummaryStage {
  stage:
    | "extract"
    | "reference"
    | "components"
    | "motion"
    | "video"
    | "visual-regression"
    | "style-ingestion"
    | "design-brief"
    | "aesthetic-plan"
    | "implementation"
    | "guardrail"
    | "design-history";
  succeeded: number;
  failed: number;
  skipped: number;
  artifacts?: number | null;
  notes?: string[];
}
export interface DesignToolkitArtifact {
  id: string;
  stage: "extract" | "tokens" | "styleguide" | "reference" | "self-correct" | "publish";
  status: "succeeded" | "skipped" | "failed";
  relative_path: string;
  description?: string | null;
  approvals?: DesignArtifactApproval[];
  retention?: {
    days: number;
    autoPurge: boolean;
    auto_purge?: boolean;
    expiry: string;
    policy?: string | null;
  };
  metrics?: {
    [k: string]: unknown;
  } | null;
  privacy_notes?: string[];
}
export interface DesignToolkitSummary {
  generated_at: string;
  stages: {
    stage: "extract" | "tokens" | "styleguide" | "reference" | "self-correct" | "publish";
    artifacts: number;
    metrics?: {
      [k: string]: unknown;
    } | null;
    notes?: string[];
  }[];
  totals?: {
    [k: string]: unknown;
  } | null;
  approvals?: string[] | null;
}
export interface DesignPlan {
  mode: "fresh" | "clone-informed";
  brief: {
    path: string;
    hash?: string | null;
    id?: string | null;
  };
  aesthetic_plan?: {
    path: string;
    snippet_version?: string | null;
    id?: string | null;
  };
  implementation?: {
    path: string;
    complexity?: string | null;
  };
  reference_style_id?: string | null;
  style_profile_id?: string | null;
  generated_at?: string | null;
}
export interface DesignGuardrail {
  report_path: string;
  status: "pass" | "fail";
  snippet_version?: string | null;
  strictness?: "low" | "medium" | "high" | null;
  slop_threshold?: number | null;
  mode?: "fresh" | "clone-informed" | null;
  scores?: {
    [k: string]: number;
  } | null;
  recommendations?: string[];
  notes?: string[];
  style_overlap?: null | DesignStyleOverlap;
}
export interface DesignStyleOverlap {
  palette?: number | null;
  typography?: number | null;
  motion?: number | null;
  spacing?: number | null;
  overall: number;
  gate?: "pass" | "fail" | null;
  threshold?: number | null;
  comparison_window?: string[] | null;
  reference_style_id?: string | null;
}
export interface DesignHistory {
  path: string;
  mirror_path?: string | null;
  entries?: number | null;
  max_entries?: number | null;
  updated_at?: string | null;
  mode?: "fresh" | "clone-informed" | null;
}
export interface DesignStyleProfile {
  id: string;
  relative_path: string;
  source_url?: string | null;
  ingestion_run?: string | null;
  similarity_level?: "low" | "medium" | "high" | null;
  do_not_copy?: {
    logos?: string[];
    wordmarks?: string[];
    unique_shapes?: string[];
    unique_illustrations?: string[];
    other?: string[];
  } | null;
  retention_days?: number | null;
  expiry?: null | DesignArtifactExpiry;
  approvals?: DesignArtifactApproval[];
  notes?: string[];
}
export interface DesignMetrics {
  aesthetic_axes_completeness?: number | null;
  originality_score?: number | null;
  accessibility_score?: number | null;
  brief_alignment_score?: number | null;
  slop_risk?: number | null;
  diversity_penalty?: number | null;
  similarity_to_reference?: number | null;
  style_overlap?: number | null;
  style_overlap_gate?: "pass" | "fail" | null;
  snippet_version?: string | null;
}

export type CliManifest = CodexOrchestratorCLIManifest;
export type CliManifestCommand = CliManifest['commands'][number];
export type RunStatus = CliManifest['status'];
export type CommandStatus = CliManifestCommand['status'];
export type CommandKind = CliManifestCommand['kind'];

export type ToolRunRecord = ToolRun;
export type ToolRunStatus = ToolRun['status'];
export type ApprovalSource = ToolRun['approvalSource'];
export type SandboxState = ToolRun['sandboxState'];
export type ToolRunEventType = ToolRunEvent['type'];
export type ToolRunManifest = Pick<
  CliManifest,
  | 'toolRuns'
  | 'design_artifacts'
  | 'design_artifacts_summary'
  | 'design_config_snapshot'
  | 'design_toolkit_artifacts'
  | 'design_toolkit_summary'
  | 'design_plan'
  | 'design_guardrail'
  | 'design_history'
  | 'design_style_profile'
  | 'design_metrics'
> &
  Record<string, unknown>;

export type DesignArtifactRecord = DesignArtifact;
export type DesignArtifactStage = DesignArtifact['stage'];
export type DesignArtifactApprovalRecord = DesignArtifactApproval;
export type DesignArtifactsSummaryStageEntry = DesignArtifactsSummary['stages'][number];

export type DesignToolkitArtifactRecord = DesignToolkitArtifact;
export type DesignToolkitStage = DesignToolkitArtifact['stage'];
export type DesignToolkitArtifactRetention = NonNullable<DesignToolkitArtifact['retention']>;
export type DesignToolkitSummaryStageEntry = DesignToolkitSummary['stages'][number];

export type DesignPlanRecord = DesignPlan;
export type DesignPipelineMode = DesignPlan['mode'];
export type DesignGuardrailRecord = DesignGuardrail;
export type DesignGateStatus = DesignGuardrail['status'];
export type DesignHistoryRecord = DesignHistory;
export type DesignStyleProfileMetadata = DesignStyleProfile;
export type DesignStyleOverlapBreakdown = DesignStyleOverlap;
export type DesignMetricRecord = DesignMetrics;
