# Task Checklist - 0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction

- MCP Task ID: `0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction`
- Primary PRD: `docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`
- TECH_SPEC: `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`

> Set `MCP_RUNNER_TASK_ID=0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction` for orchestrator commands. For this implementation stream, keep edits scoped to `codex.orchestrator.json`, gate config/env tests, and 0994 docs/checklist artifacts; do not edit `orchestrator/src`.

## Foundation
- [x] Standalone pre-implementation review of task/spec intent recorded in spec + checklist notes. - Evidence: `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md` (docs-only approval).
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: `docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `docs/TECH_SPEC-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `docs/ACTION_PLAN-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, this file, `.agent/task/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for 0994 registration/snapshot. - Evidence: `tasks/index.json`, `docs/TASKS.md`.

## Residual Risk Closure Objectives
- [x] Authority-boundary residual risk objective documented. - Evidence: `docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`.
- [x] External transport-surface residual risk objective documented. - Evidence: same as above.
- [x] Delegated review-discipline residual risk objective documented. - Evidence: same as above.
- [x] Audit-trace residual risk objective documented. - Evidence: same as above.

## Codex-Autorunner Extraction Lane
- [x] In-scope transport adapter responsibilities documented. - Evidence: `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`.
- [x] Out-of-scope core authority responsibilities documented. - Evidence: same as above.
- [x] Hard invariants documented for extraction boundary. - Evidence: same as above.

## Discord/Telegram Interactive-Surface Decision Criteria
- [x] Security/reliability/interaction/auditability/blast-radius criteria documented. - Evidence: `docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`.
- [x] Explicit GO/HOLD decision rule documented. - Evidence: same as above.

## Delegated Implementation Review Cadence (Mandatory)
- [x] Mandatory standalone checkpoint cadence documented (kickoff, per-burst, pre-handoff). - Evidence: `docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`.
- [x] Mandatory elegance checkpoint cadence documented. - Evidence: same as above.
- [x] Hard-stop finding policy documented for unresolved P0/high-signal P1. - Evidence: same as above.

## Validation (Docs Stream)
- [x] docs-review manifest captured (pre-implementation). - Evidence: `.runs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/cli/2026-03-03T12-00-56-250Z-7bb41d10/manifest.json` (successful rerun after delegation-guard override + docs guard fixes).
- [x] Standalone review checkpoint (`npm run review`) captured for docs stream. - Evidence: `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/docs-stream-standalone-review-force.log`, `.runs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/cli/2026-03-03T11-49-27-322Z-c5a58fe9/review/output.log`.
- [x] Elegance/minimality pass summary recorded in checklist notes. - Evidence: `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/docs-stream-standalone-review-force.log`.

## Implementation Stream (Worker Complex)
- [x] Residual risk closure applied for implementation-gate test-stage env pollution. - Evidence: `codex.orchestrator.json`, `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`.
- [x] Deterministic gate review execution enforced for gate contexts (`implementation-gate`, `docs-review`). - Evidence: `codex.orchestrator.json`, `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`.
- [x] Findings artifact recorded for codex-autorunner extraction + Discord/Telegram GO/HOLD decision. - Evidence: `docs/findings/0994-codex-autorunner-extraction-and-transport-go-hold.md`, `docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `docs/ACTION_PLAN-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`.
- [x] Standalone review checkpoint captured after first coding burst. - Evidence: `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/implementation-stream-standalone-review-force.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/implementation-stream-standalone-review-force-skip-diff-budget.log`, `.runs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/cli/2026-03-03T12-00-56-250Z-7bb41d10/review/output.log`.
- [x] Targeted regression tests for gate config/env behavior passed. - Evidence: `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/implementation-stream-targeted-gate-env-tests.log`.

## Checklist Notes
- Elegance/minimality pass (docs stream): kept the solution minimal by limiting changes to docs/task registration artifacts, replacing stale evidence placeholders with real manifest/log paths, and avoiding any `orchestrator/src` edits in this stream.
- Elegance/minimality pass (implementation stream): kept changes config-first (`codex.orchestrator.json` + one focused regression test file) and avoided expanding into `orchestrator/src`; standalone review findings were limited to unrelated 0993-owned files in this shared checkout.

## Final Validation (End-State)
- [x] Ordered final end-state validation logs 01..10 captured and succeeded. - Evidence: `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-01-delegation-guard.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-02-spec-guard.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-03-build.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-04-lint.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-05-test.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-06-docs-check.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-07-docs-freshness.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-08-diff-budget.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-09-review.log`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-10-pack-smoke.log`.
- [x] Final implementation-gate evidence captured with succeeded manifest. - Evidence: `.runs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/cli/2026-03-03T13-46-07-481Z-b0b0aab0/manifest.json`, `out/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/manual/final-endstate-11-implementation-gate.json`.

## Closeout
- [x] 0994 checklist mirrors/index/task snapshot synced to completed state with final evidence pointers. - Evidence: `tasks/tasks-0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `.agent/task/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`, `tasks/index.json`, `docs/TASKS.md`.
