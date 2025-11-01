# Task List — Orchestrator Resilience Hardening (0202)

## Context
- Link to PRD: `docs/PRD.md`
- Summary: Harden Codex orchestrator persistence/telemetry so overlapping runs retain state snapshots, heartbeat updates cannot crash the process, and command outputs remain bounded for reviewers.

### Checklist Convention
- Keep `[ ]` until acceptance criteria is met. Flip to `[x]` and attach the manifest path from `.runs/0202-orchestrator-hardening/cli/<run-id>/manifest.json` that proves completion.

## Parent Tasks
1. **Foundation**
   - Subtask: Synchronize collateral
     - Files: `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `/tasks/0202-prd-orchestrator-hardening.md`
     - Acceptance: Reviewer confirms collateral references Task 0202; Evidence: diagnostics manifest link recorded across checklists.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
   - Subtask: Prepare run directories & env
     - Files: `.runs/0202-orchestrator-hardening/**`, `.runs/local-mcp/**`
     - Commands: export `MCP_RUNNER_TASK_ID=0202-orchestrator-hardening`, run diagnostics once.
     - Acceptance: First diagnostics run writes `.runs/0202-orchestrator-hardening/cli/<run-id>/manifest.json`; Evidence: manifest path attached.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
2. **Persistence Reliability**
   - Subtask: Lock retry/backoff
     - Files: `orchestrator/src/persistence/TaskStateStore.ts`
     - Acceptance: Snapshot persists after transient lock contention; Evidence: manifest + test log.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
   - Subtask: Manifest persistence resilience
     - Files: `orchestrator/src/persistence/PersistenceCoordinator.ts`
     - Acceptance: Manifest still writes when snapshot retries exhaust; Evidence: manifest note or unit test.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
3. **Heartbeat Safety**
   - Subtask: Awaited heartbeat writes
     - Files: `orchestrator/src/cli/orchestrator.ts`
     - Acceptance: Interval flush awaits promises and throttles manifest writes (<1 commit / 30s); Evidence: diagnostics manifest + log snippet.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
   - Subtask: Failure logging & forced flush
     - Files: `orchestrator/src/cli/orchestrator.ts`
     - Acceptance: Errors captured via logger, final flush always awaited; Evidence: test coverage.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
4. **Output Bounding**
   - Subtask: Buffer limits
     - Files: `orchestrator/src/cli/services/commandRunner.ts`
     - Acceptance: Stdout/stderr buffers limited to 64 KiB each; Evidence: test verifying truncation behavior.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
   - Subtask: Error payload truncation
     - Files: `orchestrator/src/cli/run/manifest.ts`
     - Acceptance: `appendCommandError` stores ≤8 KiB detail payload; Evidence: diagnostics manifest referencing trimmed error file.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
5. **Verification & Rollout**
   - Subtask: Guardrail runs
     - Commands: `bash scripts/spec-guard.sh --dry-run`, `npm run lint`, `npm run test`
     - Acceptance: Commands succeed; Evidence: manifests/log snippets attached.
     - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
  - Subtask: Reviewer hand-off
    - Commands: `npm run review`
    - Acceptance: Review command references latest manifest; Evidence: command output path.
    - [x] Status: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`

## Relevant Files
- `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `tasks/0202-prd-orchestrator-hardening.md`, `tasks/tasks-0202-orchestrator-hardening.md`

## Notes
- Record approvals/escalations inside the diagnostics manifest `approvals` array if any occur.
- Update manifest links across docs immediately after each run to keep mirrors in sync.
