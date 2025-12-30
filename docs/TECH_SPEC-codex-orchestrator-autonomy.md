# Technical Spec — Codex Orchestrator Autonomy Enhancements (Task 0303)

## Overview
- Objective: Align the Codex Orchestrator with Codex CLI autonomy capabilities by introducing a centralized tool orchestration layer, upgrading the unified exec runtime, and extending automation/telemetry interfaces without violating global approval policies.
- In Scope: Tool orchestration service, approval cache integration, unified exec runtime session manager, CLI `exec` command and Node SDK adapters, JSONL event stream, OTEL exporters, notification hooks, AGENTS discovery pipeline, manifest/schema updates.
- Out of Scope: Changing global approval storage semantics, replacing manifest persistence, GUI interfaces, or non-Node SDK implementations beyond the documented backlog.

## Requirements Mapping
| PRD Goal | Spec Component |
| --- | --- |
| Centralized tool orchestrator with global approval reuse & sandbox retries | Sections 3.1, 4.1 |
| Persistent PTY sessions, streaming stdout/stderr, begin/end events | Sections 3.2, 4.2 |
| Non-interactive exec mode emitting JSONL with SDK/CI hooks | Sections 3.3, 4.3 |
| Optional OTEL + notification integrations | Sections 3.4, 4.4 |
| Hierarchical AGENTS discovery | Sections 3.5, 4.5 |

## Architecture & Design

### 3.1 Tool Orchestrator Layer
- Introduce `ToolOrchestrator` service (`packages/orchestrator/src/tool-orchestrator.ts`) that becomes the single entry point for tool invocations (shell, MCP, custom adapters).
- Responsibilities:
  - Load global approval cache via `packages/orchestrator/src/tool-orchestrator.ts` (ApprovalCache / ApprovalPrompter wiring).
  - Emit structured lifecycle events (`tool:start`, `tool:retry`, `tool:complete`) through `packages/shared/events`.
  - Apply sandbox retry policy (configurable defaults: max 3 attempts, exponential backoff starting 250 ms) while honoring `approval_policy=never`.
  - Persist retry/approval metadata into manifests using `packages/shared/manifest/writer.ts`.
- Integration:
  - All existing runners refactor to call `ToolOrchestrator.invoke()` instead of managing approvals directly.
  - Approval override logic checks current run config before escalating; orchestrator raises typed errors to the CLI for user-facing messaging.

### 3.2 Unified Exec Runtime Enhancements
- Create `ExecSessionManager` (`packages/orchestrator/src/exec/session-manager.ts`) to manage reusable PTY handles keyed by session ID.
  - Maintains PTY lifecycle, environment snapshots, and per-session configuration (TTY size, encoding).
  - Supports opt-out flag for commands that require clean PTY contexts.
- Update unified exec runner (`packages/orchestrator/src/exec/unified-exec.ts`) to:
  - Emit `exec:begin` and `exec:end` events with correlation IDs.
  - Stream stdout/stderr incrementally using adapters in `packages/orchestrator/src/exec/stdio.ts` that timestamp and sequence chunks.
  - Surface sandbox retry attempts through orchestrator callbacks.
- Ensure non-PTY commands share the same streaming interface; unify buffering logic to cap in-memory data (<64 KiB per stream by default).

### 3.3 CLI & SDK Interfaces
- Add `codex-orchestrator exec` command (`cli/src/commands/exec.ts`) supporting:
  - Non-interactive mode defaulting to JSONL output when STDIN is not a TTY.
  - Flags: `--json`, `--jsonl`, `--output-schema <path>`, `--otel-endpoint`, `--notify <hook>`, `--full-auto`.
- Define JSONL schema in `docs/specs/exec-jsonl.md` and implement serialization helpers (`cli/src/lib/jsonl-writer.ts`, `packages/shared/events/serializer.ts`).
- Extend Node.js SDK (`packages/sdk-node/src/orchestrator.ts`):
  - Spawn CLI exec command, surface event emitter, support PTY attach/detach for interactive resumptions.
  - Provide helpers for automation (resume tokens, retry wrappers).
- Emit a terminal `run:summary` JSONL record that captures exit status, aggregated tool results, manifest path, and structured `outputs` tailored for SDK consumers; mirror this content into `out/<task-id>/state.json` so automation reaches parity with Codex CLI summaries.
- Update CI documentation (`docs/guides/ci-integration.md`) with usage samples incorporating JSONL stream and manifest references.

### 3.4 Telemetry & Notifications
- Implement OTEL exporter module (`packages/orchestrator/src/telemetry/otel-exporter.ts`) that subscribes to orchestrator events.
  - Supports OTLP/HTTP by default, environment-driven configuration, and graceful degradation (max 3 retries/minute).
- Notification hooks (`packages/orchestrator/src/notifications/index.ts`) dispatch summarized events to configured webhooks or local notifiers.
- Configuration precedence: CLI flags > environment variables > `config/orchestrator.json`.
- Ensure telemetry is opt-in; if disabled, exporter stubs no-op while still emitting local logs.

### 3.6 Metrics Instrumentation
- Add orchestrator metrics collector (`orchestrator/src/cli/metrics/metricsRecorder.ts`) that aggregates:
  - Approval reuse rate by counting tool invocations satisfied from cache vs. escalations, persisted per-run in manifest `metrics.approvalReuse`.
  - Command latency histograms (including P95) using high-resolution timers in unified exec; export to OTEL as `orchestrator.command.latency` and append to manifest summary.
  - JSONL adoption flag by marking runs invoked with `--jsonl` and recording usage statistics inside `.runs/<task-id>/metrics.json`.
- Provide analytics hooks for CI pipelines by emitting aggregated metrics in the final `run:summary` JSONL record and optional OTEL gauges so product can evaluate launch criteria.

### 3.5 Hierarchical AGENTS Discovery
- Create instruction loader (`packages/orchestrator/src/instructions/loader.ts`) that merges instructions from:
  1. Workspace root `AGENTS.md`
  2. Repository `docs/AGENTS.md`
  3. Project-scoped `.agent/AGENTS.md`
  - Merge strategy: earlier levels provide defaults; downstream files append/override scoped rules flagged by explicit headings.
- Update manifest metadata to record the resolved instruction set hash for auditing.
- Document behavior in `docs/guides/instructions.md`, emphasizing additive guidance and user autonomy safeguards.

## Data & Schema Changes
- Manifest schema (`schemas/manifest.json`):
  - Add `toolRuns[].approvalSource`, `toolRuns[].retryCount`, `toolRuns[].sandboxState`.
  - Include `events[].type = "exec:begin|end|chunk"` with correlation IDs.
- Introduce `events[].type = "run:summary"` carrying final status, actionable outputs, metrics snapshot, and manifest pointer.
- JSONL event schema: strict envelope `{ "type": string, "timestamp": string ISO8601, "payload": object }`.
- Configuration schema (`config/orchestrator.schema.json`) updated with telemetry and retry policy fields.

## Operational Considerations
- Failure Handling:
  - Orchestrator retries adhere to global policy; on exhausted retries, emit warning event and bubble error.
  - OTEL exporter failure logs and disables exporter for remainder of run after third consecutive failure.
  - Notification hook failures do not block run completion; recorded in manifest summary.
- Performance:
  - Added layers target ≤150 ms overhead per command (95th percentile). Streaming adapters chunk at ≤8 KiB to cap memory.
  - PTY reuse avoids reinitializing shell for sequential commands, reducing latency for interactive workflows.
- Security & Compliance:
  - Never store approval tokens in events; only references to cache keys.
  - Streaming truncation prevents leaking excessive secrets; telemetry payloads respect redaction policies defined in PRD.

## Testing Strategy
- Unit Tests:
  - Orchestrator event emission, retry policy (mock approvals), manifest serialization.
  - Exec session manager lifecycle (create, reuse, opt-out).
  - Instruction loader hierarchy merges.
- Integration Tests:
  - CLI `exec` JSONL stream with simulated commands; verify begin/end and chunk ordering.
  - SDK automation scenario with mocked OTEL collector and notification hook.
  - Approval policy matrix (`never`, `on-request`, custom) to confirm no regressions in consent flow.
- Stress / Manual:
  - Long-running PTY session with streaming outputs, verifying RSS <75 MB.
  - Collector offline scenarios ensuring graceful degradation.
- Tooling:
  - `npm run lint`, `npm run test`, `npm run eval:test` (if fixtures available), `node scripts/spec-guard.mjs --dry-run`, `npm run review`.

## Implementation Phases
1. Refactor approval handling into `ToolOrchestrator`; update manifests and unit tests.
2. Implement exec session manager + streaming adapters; adjust unified exec runner and tests.
3. Deliver CLI command, JSONL schema, and SDK updates; document CI usage.
4. Add telemetry/notification modules and configuration plumbing.
5. Implement hierarchical instruction loader and documentation; finalize manifest audit fields.

## Risks & Mitigations
- **Approval regressions**: Create feature flag gate for orchestrator invocation; run regression test matrix before enabling by default.
- **Streaming performance**: Profile chunk handling under high throughput; fallback to buffered mode if chunk queue saturates.
- **Telemetry noise**: Allow per-hook sampling rates in configuration to prevent overload.

## Open Questions
- Should retry policy be user-configurable per tool type or fixed global defaults?
- Do we need synchronous notification confirmation in CI context, or is fire-and-forget sufficient?
- Is Node.js SDK sufficient for GA, or do we need a Python adapter in the same release?
- How should instruction loader handle conflicting directives (last-wins vs. explicit precedence metadata)?

## Evidence & Links
- PRD: `docs/PRD-codex-orchestrator-autonomy.md`
- Task Checklist: `tasks/tasks-0303-orchestrator-autonomy.md`
- Run Manifest Link: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-46-22-699Z-8be8efb9/manifest.json` (diagnostics-with-eval pipeline captured build/lint/test/eval/spec-guard run).
- Metrics / State Snapshots: `.runs/0303-orchestrator-autonomy/metrics.json`, `out/0303-orchestrator-autonomy/state.json` (updated 2025-11-04T00:46:28Z diagnostics-with-eval run).
- Spec Guard Run: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json` (spec-guard command captured in diagnostics run).
