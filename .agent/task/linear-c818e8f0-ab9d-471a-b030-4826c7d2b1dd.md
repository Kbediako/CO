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
- [x] Preserve fail-closed regressions for missing clean evidence, unknown verdict, omitted verdict, missing contract evidence, invalid/non-clean contract verdicts, bounded-success, legacy fallback launch, unrouted agent-loop proposals, unbound nested evidence, unlineaged nested evidence, stale default-root evidence under custom runs roots, and governed-review failures that include only an expected telemetry path. Evidence: focused `CommandRunnerReviewEvidenceConsistency`/`SelectedRunProjection` run passed 186 tests.
- [x] Implement explicit governed review evidence convergence and exact missing-path diagnostics. Evidence: `orchestrator/src/cli/services/commandRunner.ts` now resolves fresh same-issue nested implementation-gate telemetry from the configured runs root, records nested evidence source, supports nested contract artifact paths, requires provider-attempt lineage, and reports expected parent telemetry path on unknown review failure.
- [x] Ensure control-host/co-status does not queue the contained handoff shape as active/retrying/failed current work. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts` suppresses manifest-only retry fallback only when a fresh terminal proof shows successful `issue_review_handoff` plus a succeeded implementation-gate child stream; failed review handoffs without clean child-stream proof remain retryable.

## CO-382 Fallback Decision Table
| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker review handoff | Parent stage treats missing top-level telemetry as the only review authority even when the worker recorded explicit clean nested governed evidence | remove fallback | CO-560 | Successful `issue_review_handoff` with clean nested implementation-gate evidence and absent parent telemetry | Existing pre-CO-560 behavior | 2026-05-19 | N/A after removal | Parent resolves review verdict from explicit governed nested evidence or records the expected missing path | CO-515-shaped positive regression; unbound and unlineaged negative regressions; clean standalone review |
| Control-host status surfaces | Manifest-only retry projection treats successful review handoff proof as retryable failed WIP | remove fallback | CO-560 | Completed historical provider run has `owner_status=succeeded`, `end_reason=issue_review_handoff`, and a succeeded implementation-gate child stream | Existing pre-CO-560 behavior | 2026-05-19 | N/A after removal | Completed clean handoff proof with succeeded implementation-gate child stream is excluded from retry projection; failed handoffs without clean child evidence remain retryable | `SelectedRunProjection` positive and failed-handoff negative regressions; `co-status --format json` evidence |
| Review fail-closed contract | Missing or unknown review evidence blocks provider-worker review handoff | justify retaining fallback | Provider-worker review contract | No explicit clean governed review evidence exists or lineage is not tied to the provider attempt | Existing review-verdict contract | 2026-05-19 | Non-expiring supported safety contract | Replace only with an equivalent stricter governed review contract | Negative regressions for absent, unbound, unlineaged, unknown, findings, and invalid contract evidence |

- Contract name: provider-worker review evidence fail-closed contract.
- Owning surface: `orchestrator/src/cli/services/commandRunner.ts` provider-linear-worker review contract.
- Steady-state proof: missing, unknown, findings, invalid contract, unbound, or unlineaged review evidence blocks review handoff.
- Tests/docs: `CommandRunnerReviewEvidenceConsistency` negative regressions plus this CO-560 packet describe the retained safety path.
- Non-expiring rationale: fail-closed review evidence is a supported safety contract, not temporary fallback debt.
- Large-refactor decision: no large refactor is warranted because CO-560 removes the top-level-only telemetry fallback and keeps the provider-worker review contract in the existing authority surface.
- Minor-seam decision: this bounded seam is acceptable because it resolves only explicitly lineaged same-issue governed review evidence and does not add another review parser, lifecycle, or status authority.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: OK, 1 subagent manifest found.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: OK.
- [x] Focused provider-worker review evidence and status projection tests. Evidence: `npm run test -- CommandRunnerReviewEvidenceConsistency SelectedRunProjection` passed 186 tests.
- [x] `npm run build`. Evidence: passed.
- [x] `npm run lint`. Evidence: passed with existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `npm run test`. Evidence: 363 test files and 5987 tests passed.
- [x] `npm run docs:check`. Evidence: OK.
- [x] `npm run docs:freshness`. Evidence: OK, 5476 docs and 5479 registry entries; existing CO-558 rolling cohort warning remains non-blocking.
- [x] `npm run repo:stewardship`. Evidence: OK, 6621 tracked files and 0 action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: OK, hard working-tree gate 3/25 files and 104/1200 lines; advisory stacked aggregate 11/25 files and 1542/1200 lines.
- [x] Manifest-backed standalone review with clean semantic verdict. Evidence: `../../.runs/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd/cli/2026-05-19T11-11-15-864Z-934545e5/review/telemetry.json` recorded `status=succeeded`, `review_outcome=clean-success`, `review_verdict=clean`, contract mode `enforce`, validation `valid`, overall `clean`.
- [x] Explicit elegance/minimality pass. Evidence: `out/linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd/manual/elegance-review.md`; no extra code changes after the final clean review, and `git diff --check` passed.
- [x] `npm run pack:smoke` if touched CLI/package/review-wrapper surfaces require it. Evidence: passed.

## Handoff Status
- [x] PR opened and attached to CO-560. Evidence: PR #844, `https://github.com/Kbediako/CO/pull/844`.
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
- 2026-05-19: PR feedback and follow-up standalone review found configured runs-root isolation gaps; restricted nested review discovery to the configured runs root, added stale default-root negative coverage, reran the full validation floor, and obtained clean enforce-mode standalone review.
- 2026-05-19: Follow-up CodeRabbit/Codex feedback identified an over-broad retry-suppression predicate and an overly weak identity-negative fixture; narrowed retry suppression to the exact missing-telemetry contract phrase, made the mismatched nested evidence fixture lineaged-but-wrong-issue, added a governed-review-failure retry regression, reran the full validation floor, and obtained clean enforce-mode standalone review.

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
