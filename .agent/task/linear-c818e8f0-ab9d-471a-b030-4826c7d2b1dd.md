# Task Checklist - linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd

- Linear Issue: `CO-560` / `c818e8f0-ab9d-471a-b030-4826c7d2b1dd`
- MCP Task ID: `linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd`
- Primary PRD: `docs/PRD-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- Task spec: `tasks/specs/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`

## Docs-First
- [x] PRD drafted with CO-515 problem statement, desired outcome, protected terms, non-goals, Not Done If, parity matrix, and fail-closed guardrails. Evidence: `docs/PRD-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, requirements, fallback/refactor decision, expected seams, and validation plan. Evidence: `docs/TECH_SPEC-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`, `tasks/specs/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`.
- [x] ACTION_PLAN drafted for implementation, validation, review, PR, and Linear handoff. Evidence: `docs/ACTION_PLAN-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`.
- [x] Task checklist and `.agent` mirror drafted. Evidence: `tasks/tasks-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`, `.agent/task/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`.
- [x] Pre-implementation docs review captured. Evidence: `.runs/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd-docs-review/cli/2026-05-19T11-19-43-506Z-c91dc108/manifest.json`.

## Source / Assumptions
- [x] Live issue-context read before transition. Evidence: terminal output on 2026-05-19 confirmed `Ready`, no PR attachment, no workpad, team review alias `In Review`, and started state `In Progress`.
- [x] Source-0 anchor recorded. Evidence: `ctx:sha256:590ab51fb1f4bf827f3704ee1c7dfe50e3ddc370664e87c4fd92856e52a35118#chunk:c000001`.
- [x] GPT Pro advisory comment incorporated as non-authoritative planning context. Evidence: Linear comment `acd715f8-b657-4526-bd8f-1eb717393dfb`.
- [x] Parallelization decision recorded. Evidence: `stay_serial / single_bounded_change` on 2026-05-19 with docs/test/research/review slice evidence.

## Parent Implementation
- [x] Inspect provider-worker review evidence resolution in `orchestrator/src/cli/services/commandRunner.ts` and related provider truth/status surfaces. Evidence: parent provider stage previously required top-level `review/telemetry.json`; selected-run discovery queued manifest-only failed runs from historical provider artifacts.
- [x] Add CO-515-shaped positive regression for successful review handoff with clean nested implementation-gate evidence and absent parent telemetry. Evidence: `orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts` case `accepts clean nested implementation-gate review evidence when parent provider telemetry is absent`.
- [x] Preserve fail-closed regressions for missing clean evidence, unknown verdict, omitted verdict, missing contract evidence, invalid/non-clean contract verdicts, bounded-success, legacy fallback launch, unrouted agent-loop proposals, and unbound nested evidence. Evidence: focused `CommandRunnerReviewEvidenceConsistency`/`SelectedRunProjection` run passed 182 tests.
- [x] Implement explicit governed review evidence convergence and exact missing-path diagnostics. Evidence: `orchestrator/src/cli/services/commandRunner.ts` now resolves fresh same-issue nested implementation-gate telemetry, records nested evidence source, supports nested contract artifact paths, and reports expected parent telemetry path on unknown review failure.
- [x] Ensure control-host/co-status does not queue the contained handoff shape as active/retrying/failed current work. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts` suppresses manifest-only retry fallback when a fresh terminal proof shows successful `issue_review_handoff`; `SelectedRunProjection` regression passed.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: OK, 1 subagent manifest found.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: OK.
- [x] Focused provider-worker review evidence and status projection tests. Evidence: `npm run test -- CommandRunnerReviewEvidenceConsistency SelectedRunProjection` passed 182 tests.
- [x] `npm run build`. Evidence: passed.
- [x] `npm run lint`. Evidence: passed with existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`. Evidence: 363 test files and 5983 tests passed.
- [x] `npm run docs:check`. Evidence: OK.
- [x] `npm run docs:freshness`. Evidence: OK, 5476 docs and 5479 registry entries; existing CO-558 rolling cohort warning remains non-blocking.
- [x] `npm run repo:stewardship`. Evidence: OK, 6615 tracked files and 0 action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: OK, 11/25 files and 1096/1200 lines before final checklist updates.
- [x] Manifest-backed standalone review with clean semantic verdict. Evidence: `../../.runs/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd/cli/2026-05-19T11-11-15-864Z-934545e5/review/telemetry.json` recorded `review_verdict=clean`, contract mode `enforce`, validation `valid`, overall `clean`.
- [x] Explicit elegance/minimality pass. Evidence: no extra code changes; helper boundary retained because it preserves parent versus nested telemetry path/contract semantics; `git diff --check` passed.
- [x] `npm run pack:smoke` if touched CLI/package/review-wrapper surfaces require it. Evidence: passed.

## Handoff Status
- [ ] PR opened and attached to CO-560. Evidence: pending.
- [ ] `codex-orchestrator pr ready-review --pr <number> --quiet-minutes <window>` drained cleanly. Evidence: pending.
- [ ] Workpad refreshed with final validation, review, and advisory goal evidence from current manifest snapshot. Evidence: pending.
- [ ] Linear transitioned to `In Review` only after clean handoff gates. Evidence: pending.

## Progress Log
- 2026-05-19: Read repo-local Linear/land/docs-first skills, live issue-context, and prior review-verdict memory. Transitioned CO-560 from `Ready` to `In Progress`, created branch `linear/co-560-review-handoff-evidence`, created the single active workpad, and recorded `stay_serial / single_bounded_change`.
- 2026-05-19: Created the docs-first packet and registry mirrors before implementation.
- 2026-05-19: Pre-implementation docs-review child stream succeeded before production edits.
- 2026-05-19: Implemented nested implementation-gate review evidence convergence, parent telemetry missing-path diagnostics, and manifest-only retry suppression for successful review handoff proof. Focused tests, build, and lint passed.
- 2026-05-19: First standalone review found an unbound nested evidence issue; tightened evidence discovery to exact same-issue task/manifest identity and added the negative regression.
- 2026-05-19: Full validation, package smoke, clean enforce-mode standalone review, and elegance/minimality pass completed.

## Relevant Files
- `docs/PRD-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- `docs/TECH_SPEC-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- `docs/ACTION_PLAN-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- `tasks/specs/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- `tasks/tasks-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- `.agent/task/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd.md`
- `orchestrator/src/cli/services/commandRunner.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts`
- `orchestrator/tests/SelectedRunProjection.test.ts`

## Notes
- Do not weaken `review_verdict`, `contract_validation`, `contract_overall_verdict`, or fallback-expiry handling.
- Do not treat Linear `In Review`, green PR checks, CodeRabbit approval, or empty findings as clean governed review evidence by themselves.
- Do not use local containment actions such as parent manifest quarantine, run deletion, or manual provider-intake edits as product behavior.
