# PRD: Codex Multi-Instance Autonomy Upgrade

## Overview
Codex orchestrator teams need to launch, monitor, and close delegated Codex runs with minimal human intervention across multiple concurrent instances. This initiative delivers five coordinated upgrades—typed MCP control plane, multi-instance scheduler with manifest fan-out, handle-based remote execution streaming, privacy-aware streaming guard, and cross-instance performance metrics—to turn the orchestrator into an autonomous, auditable execution layer.

## Objectives
1. Provide a typed Codex MCP control plane that standardizes orchestration requests and enforces contract-level validation before dispatch.
2. Ship a multi-instance scheduler that can fan out manifests, balance workloads, and recover stalled runs without manual escalation.
3. Enable handle-based remote execution streaming so downstream agents can attach to live runs, resume statefully, and emit structured artifacts.
4. Introduce a privacy-aware streaming guard that redacts or suppresses sensitive payloads while maintaining observability.
5. Capture cross-instance performance metrics and surface them in run manifests so automation can self-calibrate.

## User Impact
- Staff engineers and autonomy reviewers spend <30 minutes per day triaging Codex runs because the orchestrator handles concurrency, recovery, and reporting.
- Downstream product teams receive deterministic evidence packs (manifests, metrics, logs) that match compliance expectations without hand curation.
- Security and privacy partners gain confidence that delegated runs respect data boundaries while still emitting actionable telemetry.

## Success Metrics
- ≥95% of orchestrator-triggered Codex runs reach completion without human intervention within 14 days of rollout.
- Mean time to resolution (MTTR) for failed runs drops by 40% due to automated rescheduling and typed control-plane validation.
- False-positive privacy guard alerts remain below 2% while blocking 100% of P0 policy violations in streaming data.
- Cross-instance metrics populate `.runs/<task-id>/metrics.json` for every orchestrator run with <5% missing fields.
- Scheduler maintains ≥90% target utilization per Codex instance without breaching configured concurrency thresholds.

## Guardrails & Constraints
- Enforce typed schemas at MCP boundaries; reject or quarantine malformed requests instead of coercing them.
- Preserve immutable run manifests; append new fan-out records rather than mutating history.
- All streaming guards must redact before persistence or downstream emission; raw payloads remain inaccessible post-filter.
- Observe existing approval workflow: escalations logged in `.runs/<task-id>/manifest.json` with justification and timestamp.
- No reduction in current security posture; privacy guard additions must pass policy review prior to enabling fan-out.

## Functional Requirements
- **Typed Codex MCP control plane**: Contract definitions in shared registry; validation errors surfaced with actionable remediation hints; typed responses published alongside manifests.
- **Multi-instance scheduler + manifest fan-out**: Queue abstraction that shards workloads by instance capability; manifest generator emits per-instance entries with scheduling metadata and recovery checkpoints.
- **Handle-based remote exec streaming**: Unique handles for each remote run enabling resumable WebSocket/HTTP2 streams; observers can subscribe/unsubscribe without resetting execution state; artifact streaming persists under `out/<task-id>/state.json`.
- **Privacy-aware streaming guard**: Policy engine that inspects outbound frames, classifies sensitivity, and redacts or blocks with manifest annotations.
- **Cross-instance performance metrics**: Collect per-run latency, throughput, resource usage; aggregate across instances; store summary in `.runs/<task-id>/metrics.json` and expose alerts to `npm run review`.

## Non-Goals
- Replacing downstream agent implementations or their prompt logic.
- Introducing new ticketing or approval tooling outside existing manifests.
- Solving for non-MCP transport layers (e.g., bespoke gRPC) in this phase.
- Optimizing cost efficiency beyond telemetry capture (to be handled in later performance workstream).

## Risks & Mitigations
- **Schema drift between orchestrator and agents** → Mitigate with versioned schema registry and automated compatibility tests.
- **Scheduler overload due to inaccurate capacity modeling** → Implement dynamic feedback loop using cross-instance metrics and conservative default concurrency.
- **Privacy guard false positives delaying runs** → Provide human override workflow logged in manifests and tune policies with shadow mode before enforcing.
- **Telemetry volume increase** → Compress metrics payloads and enforce retention policies aligned with compliance.

## Dependencies
- Updated schema registry infrastructure and tooling for typed MCP contracts.
- Agreement from security/privacy reviewers on redaction policy thresholds.
- Availability of diagnostics pipeline (`npx codex-orchestrator start diagnostics`) for capturing baseline metrics.
- Existing Codex orchestrator environments with feature flags per instance.

## Open Questions
- Which team owns long-term maintenance of the privacy guard policies?
- Do downstream teams require backward compatibility shims for legacy manifests, or can they consume new fan-out structures directly?
- What service-level objectives (SLOs) should trigger auto-escalation, and who receives notifications?

## Status Checklist
- [ ] Confirm sponsor alignment on objectives and success metrics. Evidence: `.runs/autonomy-upgrade/cli/<run-id>/manifest.json`
- [ ] Baseline current orchestrator MTTR and completion rates. Evidence: `.runs/autonomy-upgrade/metrics/baseline.json`
- [ ] Approvals captured for schema registry and privacy guard changes. Evidence: `.runs/autonomy-upgrade/approvals/latest.json`

