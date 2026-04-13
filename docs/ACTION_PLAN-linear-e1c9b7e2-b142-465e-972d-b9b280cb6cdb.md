# ACTION_PLAN - CO: Fix delegation MCP startup/perf and stale delegate-server process lifecycle

## Added by Bootstrap 2026-04-13

## Traceability
- Linear issue: `CO-168` / `e1c9b7e2-b142-465e-972d-b9b280cb6cdb`
- Linear URL: https://linear.app/asabeko/issue/CO-168/co-fix-delegation-mcp-startupperf-and-stale-delegate-server-process

## Summary
- Goal: finish `CO-168` by making delegation MCP setup/doctor/recovery use the fast direct transport contract and by adding bounded stale-process observability/remediation.
- Scope: docs-first packet registration, audited docs-review child stream, setup/doctor/cleanup implementation, focused docs/tests, live command checks, and final validation/review gates.
- Assumptions:
  - the active host is macOS/Unix and supports bounded `ps`-based process inspection
  - the fast direct dist transport remains the desired MCP-safe baseline for stdio delegation
  - active delegate-server instances should remain untouched during cleanup

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `delegation`, `delegate-server`, `codex mcp get delegation`, `codex-orchestrator doctor`, `codex-orchestrator delegation setup`, `CO-164`, and `CO-165`
  - reject "config exists is enough", "kill all delegate-server processes", and broad control-host cleanup drift
- Not done if:
  - setup still plans the wrapper form
  - doctor lacks command/startup/process health
  - cleanup path is not bounded and safe
- Pre-implementation issue-quality review:
  - live repo checks already confirmed the wrapper setup plan, current direct transport config, and active-parent delegate-server process shape

## Milestones & Sequencing
1. Register the `linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb` docs-first packet, task mirrors, registry entries, branch/workpad source, and initial workpad refresh.
2. Run `linear child-stream --pipeline docs-review` for this packet and record the manifest-backed result or truthful fallback.
3. Update delegation setup/readiness/manual guidance so MCP stdio uses the direct dist command rather than the wrapper form.
4. Add delegation doctor health reporting for command classification, initialize probe timing/handshake correctness, and orphaned stale-process posture.
5. Add a bounded dry-run/apply cleanup path for orphaned stale delegate-server chains and wire doctor guidance to it.
6. Update focused docs/tests and run targeted live checks plus the required validation floor.
7. Refresh the workpad with implementation/validation/review status, then continue through PR/review handoff only after standalone review and elegance pass are complete.

## Dependencies
- `orchestrator/src/cli/delegationSetup.ts`
- `orchestrator/src/cli/delegationCliShell.ts`
- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/utils/packageProgramResolver.ts`
- delegation docs/skills/readme references

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-168-docs-review --format json`
  - focused Vitest coverage for delegation setup, doctor, and cleanup-shell behavior
  - `"/opt/homebrew/Cellar/node/25.2.1/bin/node" "dist/bin/codex-orchestrator.js" delegation setup --repo /Users/kbediako/Code/CO --format json`
  - `codex mcp get delegation --json`
  - `"/opt/homebrew/Cellar/node/25.2.1/bin/node" "dist/bin/codex-orchestrator.js" doctor`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb npm run build`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb npm run test`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb npm run repo:stewardship`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb npm run pack:smoke`
- Rollback plan:
  - revert the setup/doctor/cleanup changes if they misclassify active delegate-server processes or regress startup
  - keep the issue active until doctor and setup truthfully reflect the new transport and stale-process contract

## Risks & Mitigations
- Risk: command classification/probe logic disagrees with real Codex MCP transport behavior.
  - Mitigation: drive the probe from `codex mcp get delegation --json` and add focused tests for both wrapper and direct command forms.
- Risk: cleanup hits active delegate-server processes.
  - Mitigation: target orphaned chains only, default to dry-run, and add focused active-vs-orphaned coverage.
- Risk: docs drift if manual guidance keeps the wrapper form.
  - Mitigation: update the primary delegation/operator docs in the same lane and let `docs:check` / `docs:freshness` validate the packet.

## Approvals
- Reviewer: `codex-orchestrator docs-review (direct fallback after provider provenance boundary)`
- Date: 2026-04-13
- Evidence: `.runs/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/cli/2026-04-13T05-44-46-601Z-d94802bb/provider-linear-worker-linear-audit.jsonl`, `out/linear-e1c9b7e2-b142-465e-972d-b9b280cb6cdb/manual/20260413T055822Z-docs-review-fallback.md`
