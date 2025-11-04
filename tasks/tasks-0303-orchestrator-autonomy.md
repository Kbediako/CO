# Task Checklist — Codex Orchestrator Autonomy Enhancements (0303)

> Export `MCP_RUNNER_TASK_ID=0303-orchestrator-autonomy` before executing orchestrator commands. Mirror status across `/tasks`, `docs/TASKS.md`, and `.agent/task/0303-orchestrator-autonomy.md`. Flip `[ ]` to `[x]` only after attaching the manifest path (e.g., `.runs/0303-orchestrator-autonomy/cli/2025-11-03T18-00-00Z/manifest.json`) that proves completion.

## Foundation
- [x] Synchronize collateral — `tasks/index.json`, `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md` reference Task 0303; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json` (diagnostics run 2025-11-03T23:58:59Z confirms collateral alignment).
- [x] Prepare run directories — Initialize `.runs/0303-orchestrator-autonomy/cli/` via diagnostics run; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json`.
- [x] Environment defaults — `MCP_RUNNER_TASK_ID` exported in shell / CI and recorded in diagnostics manifest task id + approval profile; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (manifest captures `approval_policy: read/edit/run/network`).

## Tool Orchestrator Layer
- [ ] Implement centralized `ToolOrchestrator` service with approval cache reuse and sandbox retry policy; Evidence: _(pending — reference manifest + tests when merged)._
- [ ] Persist approval/retry metadata into manifests (`toolRuns[].approvalSource`, `toolRuns[].retryCount`, `toolRuns[].sandboxState`) with unit coverage; Evidence: _(pending)._

## Unified Exec Runtime
- [ ] Build `ExecSessionManager` supporting reusable PTY handles, opt-out flows, and environment snapshots; Evidence: _(pending)._
- [ ] Update unified exec runner to emit `exec:begin|chunk|end` events, stream stdout/stderr under 64 KiB caps, and honor sandbox retries; Evidence: _(pending)._

## CLI & SDK Interfaces
- [ ] Ship `codex-orchestrator exec` command with `--json`, `--jsonl`, `--otel-endpoint`, and `--notify` support mirroring Codex CLI; Evidence: _(pending)._
- [ ] Extend Node.js SDK to spawn the exec command, stream JSONL events, and expose resume/retry helpers; Evidence: _(pending)._

## Telemetry & Notifications
- [ ] Implement OTEL exporter module with graceful retry/backoff and manifest metrics; Evidence: _(pending)._
- [ ] Add notification hooks for summarized run events with configuration precedence (CLI > env > config); Evidence: _(pending)._

## Instruction Hierarchy & Schema
- [ ] Deliver hierarchical instruction loader merging `AGENTS.md` → `docs/AGENTS.md` → `.agent/AGENTS.md`, recording hashes in manifest metadata; Evidence: _(pending)._
- [ ] Update manifest/config schemas for new fields and document JSONL event format; Evidence: _(pending)._

## Verification & Guardrails
- [x] Run diagnostics (`npx codex-orchestrator start diagnostics --format json`) and record manifest link; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json`.
- [x] Guardrails — `bash scripts/spec-guard.sh --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures ready); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (pipeline records build/lint/test/eval/spec-guard under approval profile `read/edit/run/network`).
- [x] Reviewer hand-off — Execute `npm run review` using latest manifest; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (review outcome recorded as “Skip for now” referencing latest diagnostics-with-eval run).

_Flip each `[ ]` to `[x]` with the exact manifest path (e.g., `.runs/0303-orchestrator-autonomy/cli/2025-11-03T20-15-00Z/manifest.json`) once acceptance criteria are satisfied._
