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
    - Acceptance: All references point to Task 0303 with manifest placeholder ready; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json` (diagnostics run recorded 2025-11-03T23:58:59Z).
    - [x] Status: _completed 2025-11-03_
  - Subtask: Prepare run directories & env
    - Files: `.runs/0303-orchestrator-autonomy/**`, `out/0303-orchestrator-autonomy/**`
    - Commands: export `MCP_RUNNER_TASK_ID=0303-orchestrator-autonomy`, run diagnostics to seed manifest.
    - Acceptance: Diagnostics manifest written under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json`.
    - [x] Status: _completed 2025-11-03_
  - Subtask: Environment defaults recorded
    - Files: `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`
    - Acceptance: Manifest captures task id + approval profile; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (stores `approval_policy: read/edit/run/network`).
    - [x] Status: _completed 2025-11-04_
2. **Tool Orchestrator Layer**
   - Subtask: Implement `ToolOrchestrator`
     - Files: `packages/orchestrator/src/tool-orchestrator.ts`, `packages/shared/manifest/writer.ts`
     - Acceptance: Approval cache reuse + sandbox retry recorded in manifest; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
     - [x] Status: _completed 2025-11-04_
   - Subtask: Persist approval/retry metadata
     - Files: `schemas/manifest.json`, `tests/**`
     - Acceptance: `toolRuns[].approvalSource|retryCount|sandboxState` populated with tests; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
     - [x] Status: _completed 2025-11-04_
3. **Unified Exec Runtime**
   - Subtask: Build `ExecSessionManager`
     - Files: `packages/orchestrator/src/exec/session-manager.ts`
     - Acceptance: Reusable PTY handles + opt-out flows validated via tests; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
     - [x] Status: _completed 2025-11-04_
   - Subtask: Streamed unified exec events
     - Files: `packages/orchestrator/src/exec/unified-exec.ts`, `packages/shared/streams/stdio.ts`
     - Acceptance: Emits `exec:begin|chunk|end`, caps streams at 64 KiB, integrates sandbox retries; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
     - [x] Status: _completed 2025-11-04_
4. **CLI & SDK Interfaces**
   - Subtask: CLI `exec` command
     - Files: `cli/src/commands/exec.ts`, `docs/guides/ci-integration.md`
     - Acceptance: Flags `--json`, `--jsonl`, `--otel-endpoint`, `--notify` documented and tested; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
     - [x] Status: _(completed 2025-11-04)_
   - Subtask: Node SDK streaming support
     - Files: `packages/sdk-node/src/orchestrator.ts`
     - Acceptance: Streams JSONL events, surfaces resume helpers, updates docs; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
     - [x] Status: _(completed 2025-11-04)_
5. **Telemetry & Notifications**
   - Subtask: OTEL exporter
     - Files: `packages/orchestrator/src/telemetry/otel-exporter.ts`
     - Acceptance: Retries/backoff, opt-in gating, manifest metrics recorded; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
     - [x] Status: _(completed 2025-11-04)_
   - Subtask: Notification hooks
     - Files: `packages/orchestrator/src/notifications/index.ts`
     - Acceptance: Config precedence (CLI > env > config) respected; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
     - [x] Status: _(completed 2025-11-04)_
6. **Instruction Hierarchy & Schema**
   - Subtask: Instruction loader
     - Files: `packages/orchestrator/src/instructions/loader.ts`, docs additions
     - Acceptance: Resolves `AGENTS.md` hierarchy, writes hash to manifest metadata; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
     - [x] Status: _(completed 2025-11-04)_
   - Subtask: Schema & docs updates
     - Files: `schemas/manifest.json`, `docs/specs/exec-jsonl.md`
     - Acceptance: JSONL + manifest schema updates documented; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
     - [x] Status: _(completed 2025-11-04)_
7. **Verification & Rollout**
  - Subtask: Diagnostics
    - Commands: `npx codex-orchestrator start diagnostics --format json`
    - Acceptance: Manifest appended to `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-44-59-137Z-de57c4d7/manifest.json`.
    - [x] Status: _completed 2025-11-04_
   - Subtask: Guardrail commands
     - Commands: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test`
     - Acceptance: Commands succeed with manifest/log evidence; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json` (diagnostics run captures guardrail execution summary).
    - [x] Status: _completed 2025-11-04_
   - Subtask: Reviewer hand-off
     - Commands: `npm run review`
     - Acceptance: Review command references latest manifest; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (local review recorded outcome “Skip for now”).
     - [x] Status: _completed 2025-11-04_
8. **Efficiency Optimizations**
   - Subtask: Bounded guard decisions
     - Files: `packages/orchestrator/src/exec/handle-service.ts`
     - Acceptance: `handle.decisions` pruned with frame buffer; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
     - [x] Status: _completed 2025-11-06_
   - Subtask: Replay window reuse
     - Files: `packages/orchestrator/src/exec/handle-service.ts`
     - Acceptance: Snapshots/subscriptions reuse stored frame tail (O(replayed frames)); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
     - [x] Status: _completed 2025-11-06_
   - Subtask: Sliding stdio buffer
     - Files: `packages/shared/streams/stdio.ts`
     - Acceptance: O(chunk) sliding window with unit coverage; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/shared/tests/StdioTracker.test.ts`.
     - [x] Status: _completed 2025-11-06_
   - Subtask: O(1) TaskStateStore append
     - Files: `orchestrator/src/persistence/TaskStateStore.ts`
     - Acceptance: Append path avoids full rescan; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `orchestrator/tests/TaskStateStore.test.ts`.
     - [x] Status: _completed 2025-11-06_
   - Subtask: Guardrails rerun
     - Commands: `npm run test`, `node scripts/spec-guard.mjs --dry-run`, `codex-orchestrator start diagnostics --approval-policy never --format json --no-interactive`
     - Acceptance: Diagnostics manifest captures successful guardrail execution; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.
     - [x] Status: _completed 2025-11-06_

## Relevant Files
- `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `tasks/0303-prd-orchestrator-autonomy.md`, `tasks/tasks-0303-orchestrator-autonomy.md`

## Notes
- Record approvals/escalations inside the diagnostics manifest `approvals` array if any occur.
- Update manifest links across docs immediately after each run to keep mirrors in sync.
