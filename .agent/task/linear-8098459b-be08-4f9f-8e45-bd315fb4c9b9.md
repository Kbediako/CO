# Task Checklist - linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9

- Linear Issue: `CO-408` / `8098459b-be08-4f9f-8e45-bd315fb4c9b9`
- Linear URL: https://linear.app/asabeko/issue/CO-408/co-add-durable-child-lane-decision-lineage-for-provider-worker
- MCP Task ID: `linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9`
- Source issue: `CO-403` / `c8e3a464-ec50-4fa4-aff5-d8a780626600`
- Primary PRD: `docs/PRD-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- TECH_SPEC: `tasks/specs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`

## Docs-First
- [x] CO-408 issue intent translated into packet scope. Evidence: `docs/PRD-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] CO-403 source issue context preserved as reference truth. Evidence: packet references `CO-403` / `c8e3a464-ec50-4fa4-aff5-d8a780626600` and the narrow timestamp-skew fail-closed behavior.
- [x] PRD drafted with Immediate Traceability, protected terms, wrong interpretations, non-goals, Not Done If, and parity/alignment matrix. Evidence: `docs/PRD-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] Canonical TECH_SPEC drafted with lineage contract, recovery algorithm contract, validation plan, and implementation boundaries. Evidence: `tasks/specs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] TECH_SPEC mirror drafted. Evidence: `docs/TECH_SPEC-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] ACTION_PLAN drafted for packet preservation, implementation, validation, review, and PR handoff. Evidence: `docs/ACTION_PLAN-linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md`.
- [x] Registry mirrors updated for the CO-408 packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Lineage Contract
- [x] Protected terms preserved: `provider-worker retry recovery`, `same-issue child lane`, `parallelize_now`, `recover_child_lane:<stream>`, `recover_run:<run_id>`, `latest prior decision lineage`, `stale older child lane`, and `fail closed`. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and canonical spec.
- [x] Implementation target requires durable parent turn and parallelization decision lineage. Evidence: PRD and canonical spec Target Data Shape.
- [x] Retry recovery is lineage-first and timestamp fallback remains bounded. Evidence: canonical spec Recovery Algorithm Contract.
- [x] Stale older child-lane rejection and stream-only rejection are explicit acceptance conditions. Evidence: PRD Not Done If and canonical spec Functional Requirements.
- [x] Proof/status lineage visibility is required. Evidence: PRD and canonical spec validation plan.

## Implementation Boundaries
- [x] Packet now states CO-408 is in active provider-worker execution on top of the original traceability packet. Evidence: PRD Traceability and Immediate Traceability, ACTION_PLAN Immediate Traceability.
- [x] Packet states this PR carries durable lineage implementation plus the traceability packet. Evidence: PRD Traceability, TECH_SPEC Implementation Summary, ACTION_PLAN Summary.
- [x] Packet keeps implementation scoped to child-lane decision lineage, retry recovery, proof/status, and focused tests. Evidence: PRD Non-Goals and Not Done If, canonical spec Not Done If.
- [x] Packet forbids unrelated provider current-state authority, timestamp-tolerance expansion, duplicate child-lane relaunch, and PR handoff behavior changes. Evidence: PRD Traceability and Non-Goals.

## Validation
- [x] JSON parse check for edited registries. Evidence: `node -e "JSON.parse(...)"` returned `json ok` for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- [x] Protected-term scan covers packet files. Evidence: `rg -n "provider-worker retry recovery|same-issue child lane|parallelize_now|recover_child_lane:<stream>|recover_run:<run_id>|latest prior decision lineage|stale older child lane|fail closed|Immediate Traceability|Not Done If|Parity / Alignment Matrix" ...` found matches across the CO-408 packet files.
- [x] `git diff --check`. Evidence: passed with no output.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed with `Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: passed with `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `MCP_RUNNER_TASK_ID=linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9 npm run docs:freshness` passed with `docs:freshness OK - 4952 docs, 4955 registry entries`.
- [x] `node scripts/diff-budget.mjs`. Evidence: post-elegance pass with `Diff budget: OK (scope=working-tree, files=14/25, lines=1068/1200, +947/-121)`.
- [x] `npm run build`. Evidence: passed after review fix and post-elegance import cleanup.
- [x] `npm run lint`. Evidence: passed with 0 errors and 3 pre-existing `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`. Evidence: full suite passed after review fix with 357 files and 5040 tests; post-elegance focused lineage suite passed 3 files and 382 tests.
- [x] `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 6080 tracked files, 0 action-required`.
- [x] Standalone review and elegance pass. Evidence: manifest-backed review telemetry `review_outcome=bounded-success` at `.runs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9/cli/2026-04-29T19-36-11-595Z-2e179dbb/review/telemetry.json`; P2 prior-run parent lineage finding addressed; elegance pass consolidated imports and aligned packet wording, then reran affected gates.
- [ ] PR checks and `pr ready-review` drain.
- [x] Scoped diff review confirms implementation remains inside declared CO-408 surfaces. Evidence: `git diff --name-only` includes provider-worker lineage, child-lane persistence, proof/status projection, focused tests, and CO-408 packet mirrors only.

## Progress Log
- 2026-04-30: created the dedicated packet worktree from latest `origin/main` on branch `kb/co-408-traceability-packet`; no Linear transition or provider-worker implementation performed.
- 2026-04-30: drafted the CO-408 packet and mirrors as packet prep for backlog hold cleanup.
- 2026-04-30: provider-worker implementation added durable decision lineage fields, lineage-first retry recovery, recovered lineage proof/status diagnostics, and focused child-lane/retry tests.

## Notes
- Do not broaden CO-403 timestamp tolerance.
- Do not count child lanes by stream alone.
- Preserve pending parent acceptance checks.
- Keep PR review handoff blocked until validation, standalone review, elegance review, PR checks, ready-review drain, and workpad refresh complete.
