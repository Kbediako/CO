# Task List — Codex Orchestrator Autonomy Enhancements (0303)

## Context
- Link to PRD: `docs/PRD-codex-orchestrator-autonomy.md`
- Summary: Align the orchestrator wrapper with Codex CLI autonomy by centralizing tool orchestration, upgrading exec streaming, enabling JSONL automation, and layering opt-in telemetry while preserving approval guardrails.

### Checklist Convention
- Keep `[ ]` until acceptance criteria is met. Flip to `[x]` only after attaching the manifest path from `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json` that proves completion.

## Parent Tasks
1. **Foundation**
   - Subtask: Synchronize collateral
     - Files: `tasks/index.json`, `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md`
     - Acceptance: All references point to Task 0303 with manifest placeholder ready; Evidence: _(pending — add diagnostics manifest)._
     - [ ] Status: _(pending)_
   - Subtask: Prepare run directories & env
     - Files: `.runs/0303-orchestrator-autonomy/**`, `out/0303-orchestrator-autonomy/**`
     - Commands: export `MCP_RUNNER_TASK_ID=0303-orchestrator-autonomy`, run diagnostics to seed manifest.
     - Acceptance: Diagnostics manifest written under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`; Evidence: _(pending)._
     - [ ] Status: _(pending)_
   - Subtask: Environment defaults recorded
     - Files: `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`
     - Acceptance: Manifest captures task id + approval profile; Evidence: _(pending)._
     - [ ] Status: _(pending)_
2. **Tool Orchestrator Layer**
   - Subtask: Implement `ToolOrchestrator`
     - Files: `packages/orchestrator/src/tool-orchestrator.ts`, `packages/shared/manifest/writer.ts`
     - Acceptance: Approval cache reuse + sandbox retry recorded in manifest; Evidence: _(pending)._
     - [ ] Status: _(pending)_
   - Subtask: Persist approval/retry metadata
     - Files: `schemas/manifest.json`, `tests/**`
     - Acceptance: `toolRuns[].approvalSource|retryCount|sandboxState` populated with tests; Evidence: _(pending)._
     - [ ] Status: _(pending)_
3. **Unified Exec Runtime**
   - Subtask: Build `ExecSessionManager`
     - Files: `packages/orchestrator/src/exec/session-manager.ts`
     - Acceptance: Reusable PTY handles + opt-out flows validated via tests; Evidence: _(pending)._
     - [ ] Status: _(pending)_
   - Subtask: Streamed unified exec events
     - Files: `packages/orchestrator/src/exec/unified-exec.ts`, `packages/shared/streams/stdio.ts`
     - Acceptance: Emits `exec:begin|chunk|end`, caps streams at 64 KiB, integrates sandbox retries; Evidence: _(pending)._
     - [ ] Status: _(pending)_
4. **CLI & SDK Interfaces**
   - Subtask: CLI `exec` command
     - Files: `cli/src/commands/exec.ts`, `docs/guides/ci-integration.md`
     - Acceptance: Flags `--json`, `--jsonl`, `--otel-endpoint`, `--notify` documented and tested; Evidence: _(pending)._
     - [ ] Status: _(pending)_
   - Subtask: Node SDK streaming support
     - Files: `packages/sdk-node/src/orchestrator.ts`
     - Acceptance: Streams JSONL events, surfaces resume helpers, updates docs; Evidence: _(pending)._
     - [ ] Status: _(pending)_
5. **Telemetry & Notifications**
   - Subtask: OTEL exporter
     - Files: `packages/orchestrator/src/telemetry/otel-exporter.ts`
     - Acceptance: Retries/backoff, opt-in gating, manifest metrics recorded; Evidence: _(pending)._
     - [ ] Status: _(pending)_
   - Subtask: Notification hooks
     - Files: `packages/orchestrator/src/notifications/index.ts`
     - Acceptance: Config precedence (CLI > env > config) respected; Evidence: _(pending)._
     - [ ] Status: _(pending)_
6. **Instruction Hierarchy & Schema**
   - Subtask: Instruction loader
     - Files: `packages/orchestrator/src/instructions/loader.ts`, docs additions
     - Acceptance: Resolves `AGENTS.md` hierarchy, writes hash to manifest metadata; Evidence: _(pending)._
     - [ ] Status: _(pending)_
   - Subtask: Schema & docs updates
     - Files: `schemas/manifest.json`, `docs/specs/exec-jsonl.md`
     - Acceptance: JSONL + manifest schema updates documented; Evidence: _(pending)._
     - [ ] Status: _(pending)_
7. **Verification & Rollout**
   - Subtask: Diagnostics
     - Commands: `npx codex-orchestrator start diagnostics --format json`
     - Acceptance: Manifest appended to `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`; Evidence: _(pending)._
     - [ ] Status: _(pending)_
   - Subtask: Guardrail commands
     - Commands: `bash scripts/spec-guard.sh --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test`
     - Acceptance: Commands succeed with manifest/log evidence; Evidence: _(pending)._
     - [ ] Status: _(pending)_
   - Subtask: Reviewer hand-off
     - Commands: `npm run review`
     - Acceptance: Review command references latest manifest; Evidence: _(pending)._
     - [ ] Status: _(pending)_

## Relevant Files
- `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `tasks/0303-prd-orchestrator-autonomy.md`, `tasks/tasks-0303-orchestrator-autonomy.md`

## Notes
- Record approvals/escalations inside the diagnostics manifest `approvals` array if any occur.
- Update manifest links across docs immediately after each run to keep mirrors in sync.
