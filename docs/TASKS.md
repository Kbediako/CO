# Task List Snapshot — Codex Orchestrator Autonomy Enhancements (0303)

- **Update — 2025-11-03:** Project scaffolding established; manifests pending first diagnostics run under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`.
- **Gate Status:** Planning in progress; awaiting ToolOrchestrator implementation kickoff.
- **Notes:** Metrics and state snapshots will populate under `.runs/0303-orchestrator-autonomy/metrics.json` and `out/0303-orchestrator-autonomy/state.json` once diagnostics completes.

## Checklist Mirror
Mirror status with `tasks/tasks-0303-orchestrator-autonomy.md` and `.agent/task/0303-orchestrator-autonomy.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

### Foundation
- [ ] Synchronize collateral — `tasks/index.json`, `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md` reference Task 0303; Evidence: _(pending — add diagnostics manifest once files align)._
- [ ] Prepare run directories — Initialize `.runs/0303-orchestrator-autonomy/cli/` via diagnostics run; Evidence: _(pending — capture first `npx codex-orchestrator start diagnostics --format json` output)._
- [ ] Environment defaults — `MCP_RUNNER_TASK_ID` exported in shell / CI and recorded in diagnostics manifest task id; Evidence: _(pending — attach manifest once environment verified)._

### Tool Orchestrator Layer
- [ ] Implement centralized `ToolOrchestrator` service with approval cache reuse and sandbox retry policy; Evidence: _(pending — reference manifest + tests when merged)._
- [ ] Persist approval/retry metadata into manifests (`toolRuns[].approvalSource`, `toolRuns[].retryCount`, `toolRuns[].sandboxState`) with unit coverage; Evidence: _(pending)._

### Unified Exec Runtime
- [ ] Build `ExecSessionManager` supporting reusable PTY handles, opt-out flows, and environment snapshots; Evidence: _(pending)._
- [ ] Update unified exec runner to emit `exec:begin|chunk|end` events, stream stdout/stderr under 64 KiB caps, and honor sandbox retries; Evidence: _(pending)._

### CLI & SDK Interfaces
- [ ] Ship `codex-orchestrator exec` command with `--json`, `--jsonl`, `--otel-endpoint`, and `--notify` support mirroring Codex CLI; Evidence: _(pending)._
- [ ] Extend Node.js SDK to spawn the exec command, stream JSONL events, and expose resume/retry helpers; Evidence: _(pending)._

### Telemetry & Notifications
- [ ] Implement OTEL exporter module with graceful retry/backoff and manifest metrics; Evidence: _(pending)._
- [ ] Add notification hooks for summarized run events with configuration precedence (CLI > env > config); Evidence: _(pending)._

### Instruction Hierarchy & Schema
- [ ] Deliver hierarchical instruction loader merging `AGENTS.md` → `docs/AGENTS.md` → `.agent/AGENTS.md`, recording hashes in manifest metadata; Evidence: _(pending)._
- [ ] Update manifest/config schemas for new fields and document JSONL event format; Evidence: _(pending)._

### Verification & Guardrails
- [ ] Run diagnostics (`npx codex-orchestrator start diagnostics --format json`) and record manifest link; Evidence: _(pending)._
- [ ] Guardrails — `bash scripts/spec-guard.sh --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures ready); Evidence: _(pending)._
- [ ] Reviewer hand-off — Execute `npm run review` using latest manifest; Evidence: _(pending)._

---

# Task List Snapshot — Orchestrator Resilience Hardening (0202)

- **Update — 2025-10-31:** Diagnostics run `2025-10-31T22-56-34-431Z-9574035c` succeeded; manifest recorded under `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- **Gate Status:** Resilience enhancements implemented; awaiting reviewer sign-off.
- **Notes:** Metrics appended to `.runs/0202-orchestrator-hardening/metrics.json`; state snapshot refreshed at `out/0202-orchestrator-hardening/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0202-orchestrator-hardening.md` and `.agent/task/0202-orchestrator-hardening.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

- Documentation Sync — `[x]` Collateral references Task 0202 and ties to diagnostics manifest; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Persistence Reliability — `[x]` Lock retry/backoff shipped with passing tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Heartbeat Safety — `[x]` Awaited heartbeat queue implemented; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Output Bounding — `[x]` Command buffer and error truncation verified via tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Guardrails & Review — `[x]` `spec-guard`, `npm run lint`, `npm run test`, and `npm run review` executed; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.

Update checklist entries with the exact `.runs/0202-orchestrator-hardening/cli/<run-id>/manifest.json` path once runs complete.
