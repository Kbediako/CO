# Technical Spec: Codex Multi-Instance Autonomy Upgrade

## Summary
This spec details the architectural changes needed to let the Codex orchestrator autonomously launch, monitor, and close delegated runs across multiple instances. It implements five coordinated capabilities—typed MCP control plane, multi-instance scheduler and manifest fan-out, handle-based remote exec streaming, privacy-aware streaming guard, and cross-instance performance metrics—while preserving existing guardrails and approval workflows.

## Goals & Principles
- Guarantee that every orchestrated run adheres to a typed contract and emits deterministic evidence artifacts.
- Scale horizontally across Codex instances without manual load balancing or manifest stitching.
- Stream execution data safely, respecting privacy policies while keeping operators informed.
- Measure performance in near real time and feed metrics back into scheduling decisions.
- Maintain backward-compatible APIs or provide explicit migration paths where breaking changes are required.

## Architecture Overview
The system consists of:
1. **Typed MCP Control Plane**: A schema registry plus validation middleware integrated with the orchestrator ingress.
2. **Multi-Instance Scheduler**: A queueing service with capability-aware dispatch, manifest fan-out, and recovery workers.
3. **Remote Exec Streaming Handles**: Handle issuance service backed by a session store to coordinate resumable streams.
4. **Privacy-Aware Streaming Guard**: Inline policy evaluation service intercepting outbound frames.
5. **Metrics Pipeline**: Collectors embedded in orchestrator and agents, feeding into run manifests and aggregated dashboards.

Data flow:
1. Client submits a request via MCP; typed middleware validates payloads.
2. Scheduler enqueues job, selects target instances, and writes per-instance manifest entries.
3. Remote execution starts; handles are issued and broadcast to subscribers.
4. Streaming guard inspects outbound traffic, applying redactions and annotating manifests.
5. Metrics collectors emit per-instance telemetry to `.runs/<task-id>/metrics.json` and update state snapshots in `out/<task-id>/state.json`.

## Components & Interfaces
### 1. Typed MCP Control Plane
- **Schema Registry**: JSON Schema / TypeScript definitions stored under `packages/control-plane-schemas`.
- **Validation Middleware**: Imports schemas, validates request/response objects, writes results to manifest under `controlPlane.validation`.
- **Interface Contracts**:
  - `POST /mcp/run` (typed payload `RunRequestV2`)
  - `GET /mcp/schema/:id` for schema introspection
- **Migration Strategy**: Deploy registry in read-only mode, shadow validate existing traffic, then enforce rejection of invalid payloads.

### 2. Multi-Instance Scheduler & Manifest Fan-Out
- **Queue Abstraction**: Backed by Redis streams or equivalent; messages include desired capability tags (`llm-32k`, `sandbox`, etc.).
- **Dispatch Policy**: Weighted fair scheduling + cooldown for failure scenarios.
- **Manifest Fan-Out**: Each scheduled run appends `manifests[instanceId]` entries with scheduling metadata, timestamps, and recovery checkpoints.
- **Recovery Worker**: Detects stalled runs via heartbeat timestamps; requeues or escalates with manifest annotation.

### 3. Handle-Based Remote Exec Streaming
- **Handle Issuer**: Generates signed handle IDs, tracks active observers, and records handle state.
- **Streaming Protocol**: WebSocket/HTTP2 with structured event frames (`stdout`, `artifact`, `metric`, `heartbeat`).
- **Persistence**: Streams archived to `out/<task-id>/state.json` slices referenced by manifest handle IDs.
- **Resume Semantics**: Clients reconnect using handle + offset; orchestrator replays buffered frames.

### 4. Privacy-Aware Streaming Guard
- **Policy Engine**: Rule-based classifier with pluggable detectors (PII, secrets, governance tags).
- **Actions**: `ALLOW`, `REDACT`, `BLOCK`. Redactions replace sensitive tokens with structured markers stored in manifest.
- **Audit Trail**: Guard decisions emitted to `.runs/<task-id>/manifest.json` under `privacy.guardDecisions`.
- **Fallback**: On repeated false positives, operators can approve override through manifest entry referencing approval path.

### 5. Cross-Instance Performance Metrics
- **Collectors**: Instrument scheduler, control plane, and agents for latency, success rate, resource consumption.
- **Aggregation**: Batch metrics per run and per instance; write summaries to metrics file and push to telemetry bus.
- **Dashboards & Alerts**: Provide derived KPIs (utilization, MTTR, queue depth) and thresholds triggering auto-escalation.

## Data Model Updates
- **Manifest Schema**: Extend with `controlPlane`, `scheduler`, `handles`, and `privacy` sections. Each entry references schema version IDs and timestamps.
- **Metrics File (`.runs/<task-id>/metrics.json`)**: Add arrays `instanceStats` and `privacyEvents`.
- **State Snapshot (`out/<task-id>/state.json`)**: Include handle metadata and observer subscription history.
- **Control-Plane Drift Reports (`out/<task-id>/control-plane/drift.json`)**: Store validation drift findings separately from handle state to avoid artifact collisions.

## Security & Privacy
- Enforce schema version pinning and signature validation on control plane contracts.
- Guard runs in shadow mode to collect baseline accuracy; enable enforcement after achieving <2% false positives.
- Confidential data remains encrypted at rest; redacted payloads include hash digests for audit correlation.
- All escalations logged with reviewer identity and timestamp per repository guardrail.
- Privacy policy review must approve fan-out before enforcement. Owner: @privacy. Evidence recorded in `.runs/<task-id>/approvals/latest.json` and referenced in rollout manifests.

## Telemetry & Observability
- Metrics instrumentation uses existing `npm run eval:test` hooks for smoke testing.
- Scheduler emits structured logs to `.runs/<task-id>/cli/<run-id>/manifest.json`.
- Alerts integrate with existing reviewer notifications; SLA breaches raise tasks in `/tasks`.
- Success metrics instrumentation: 
  - Completion rate ≥95% computed from manifest outcomes per run and aggregated daily into `.runs/<task-id>/metrics/post-rollout.json`.
  - MTTR reduction ≥40% derived from baseline metrics (TASK-002) versus post-rollout averages, calculated by telemetry collectors and attached to the same metrics artifact.
  - Metrics completeness (<5% missing fields) validated by schema checks during ingestion; failures annotate manifests and block rollout progression.
  - Each threshold assessed prior to advancing rollout Phase 3; failures trigger rollback via scheduler feature flag.

## Rollout Plan
1. **Phase 0 (Shadow Validation)**: Deploy typed control plane and privacy guard in passive mode; collect metrics baselines.
2. **Phase 1 (Scheduler + Fan-Out)**: Enable scheduler in limited scope, backfill manifests, test recovery paths.
3. **Phase 2 (Streaming Handles)**: Issue handles to limited cohort; validate resume semantics and guard interactions.
4. **Phase 3 (Full Autonomy)**: Roll out autopilot mode, enforce guard redactions, require manifests for all escalations.
5. **Phase 4 (Optimization)**: Tune scheduling weights using captured metrics, expand instance pool.

## Migration Strategy
- Provide compatibility adapters for legacy manifest consumers; maintain dual-write for one release cycle.
- Offer schema conversion scripts to transform old manifests to new structure.
- Document manual rollback path (feature flags per component, revert to single-instance queue).

## Testing Strategy
- Contract tests for typed control plane using schema fixtures under `packages/control-plane-schemas/__tests__`.
- Integration tests simulating multi-instance load via Vitest harness (`npm run test -- scheduler`).
- Privacy guard evaluation scenarios with synthetic sensitive payloads; track precision/recall.
- Performance benchmarks capturing scheduling latency and handle resume times.

## Dependencies & Resources
- Schema registry infrastructure and signing keys.
- Secure session store (Redis/MemoryStore with TLS) for handle tracking.
- Privacy detector libraries vetted by security partners.
- Telemetry sink and dashboard tooling (Grafana / internal equivalent).

## Open Questions
- What is the default retention period for handle archives in `out/<task-id>/state.json`?
- Should metrics aggregation fan-in to a central service, or remain per-task with later ingestion?
- Which team triages guard override requests outside business hours?
