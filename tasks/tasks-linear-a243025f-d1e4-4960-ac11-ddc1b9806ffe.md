# Task Checklist - CO-462 run-review override-prefixed mock cleanup

- Linear Issue: `CO-462` / `a243025f-d1e4-4960-ac11-ddc1b9806ffe`
- Task registry id: `20260505-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe`
- MCP Task ID: `linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe`
- Primary PRD: `docs/PRD-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- TECH_SPEC: `tasks/specs/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- Agent mirror: `.agent/task/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`
- Source anchor: `ctx:sha256:e3b40af6e404697c60cd43d7e91ea7a900dbdb13c2c2d451918c05e4ca044a3f#chunk:c000001`
- Follow-up reference: `CO-205`

## Docs-First
- [x] PRD drafted with intent checksum, parity matrix, explicit non-goals, Not Done If, and fallback/refactor decisions. Evidence: `docs/PRD-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, readiness gate, technical requirements, fallback/refactor decisions, and validation plan. Evidence: `tasks/specs/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`, `docs/TECH_SPEC-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`.
- [x] ACTION_PLAN drafted for parent sequencing. Evidence: `docs/ACTION_PLAN-linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md`.
- [x] Task registration mirrors updated in declared scope. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Pre-implementation docs-review child stream completed. Evidence: `.runs/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe-co462-docs-review-r2/cli/2026-05-05T04-43-41-570Z-996ddd5c/manifest.json`; telemetry `status=succeeded`, `review_outcome=clean-success`.

## Acceptance Criteria
- [x] Add a regression that launches the mock review harness with config overrides before `review`. Evidence: `tests/run-review.spec.ts` / `reaps override-prefixed fake Codex review subprocesses`.
- [x] Ensure cleanup terminates direct `codex-mock.sh review` and override-prefixed `codex-mock.sh -c ... review` shapes. Evidence: existing CO-205 direct regression plus new override-prefixed regression in `tests/run-review.spec.ts`.
- [x] Preserve strict cleanup scope and avoid killing unrelated user processes. Evidence: `commandInvokesRunReviewMock` requires exact fake-binary token plus `review` after config flags and rejects approval-option / path-suffix / non-review shapes.
- [x] Process-health checks no longer flag stale `codex-mock.sh` review mocks after the run-review test suite exits. Evidence: focused stale-orphan scan after full spec returned no PPID=1 `codex-mock.sh` / `run-review` rows; delayed scan showed no remaining fake review process rows.
- [x] Link the fix to CO-205 as a follow-up variant, not a provider-worker admission blocker. Evidence: docs packet, workpad, and test notes preserve CO-205 follow-up framing.

## Non-Goals
- [x] No provider-worker admission changes.
- [x] No Linear polling, queue recovery, or live worker kill scope.
- [x] No generic process supervisor rewrite.
- [x] No status-output filtering that hides leaked process evidence.
- [x] No cleanup of real user review processes.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required because this is a focused command-shape gap in existing test cleanup.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tests/run-review.spec.ts` mock cleanup matching | Direct-only process match misses config overrides before `review`. | remove fallback | CO-462 | `codex-mock.sh -c ... review` survives cleanup. | CO-205 follow-up variant | 2026-05-05 | N/A after removal | Helper matches direct and override-prefixed review mocks. | Focused regression passes. |
| Exact fake-binary review mock cleanup | Tests use a cleanup finalizer for sandbox fake Codex review processes. | justify retaining fallback | CO-205 / CO-462 | Review wrapper tests intentionally spawn hanging fake Codex commands. | 2026-04-16 | 2026-05-05 | Supported test harness guardrail, not temporary fallback. | N/A; retain as safety cleanup. | Exact-path safety coverage and process scan. |

## Validation
- [x] `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] Pre-implementation docs-review child stream. Evidence: `.runs/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe-co462-docs-review-r2/cli/2026-05-05T04-43-41-570Z-996ddd5c/manifest.json`.
- [x] Focused `tests/run-review.spec.ts` regression passes. Evidence: `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts -t "matches only exact fake Codex review commands with optional config overrides|reaps override-prefixed fake Codex review subprocesses"` passed 2 tests; full `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts` passed 173 tests.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] Passive process-health scan shows no stale `codex-mock.sh` review mocks after the focused suite exits.
- [x] Standalone review and elegance pass completed before review handoff. Evidence: `.runs/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe/cli/2026-05-05T04-30-40-349Z-d04f2132/review/telemetry.json` recorded `status=succeeded`, `review_outcome=bounded-success`, no actionable issues; explicit elegance pass kept the focused matcher/regression unchanged.
- [x] Required validation floor passed. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint` (existing 3 `DelegationMcpHealth.test.ts` warnings only), `npm run test` (359 files / 5310 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`.

## Progress Log
- 2026-05-05: Provider worker moved CO-462 from `Ready` to `In Progress`, recorded `stay_serial` / `single_bounded_change`, created branch `co-462-run-review-mock-cleanup`, and refreshed the existing Linear workpad.
- 2026-05-05: Docs-first packet created for CO-462 as a bounded CO-205 follow-up variant.
- 2026-05-05: Initial docs-review surfaced a P2 over-broad approval-flag wording in the TECH_SPEC mirror; provider fixed the wording and reran docs-review cleanly.
- 2026-05-05: Implemented token-aware exact fake-binary review mock matching and override-prefixed hanging fake Codex regression; focused new tests and full run-review spec passed.
- 2026-05-05: Required validation floor passed through pack smoke; lint emitted only the existing three `DelegationMcpHealth.test.ts` warnings.
- 2026-05-05: Manifest-backed standalone review completed as `bounded-success` after command-intent retry with no actionable findings, followed by an explicit no-change elegance/minimality pass.

## Notes
- Goal: clean up run-review mock processes with config overrides before review. | Summary: keep the fix in `tests/run-review.spec.ts` unless source inspection proves another owner, and preserve exact-path process cleanup. | Risks: process overmatch and provider-worker scope drift.
- Agent mirror status: `.agent/task/linear-a243025f-d1e4-4960-ac11-ddc1b9806ffe.md` is an abbreviated mirror that carries Docs-First, Acceptance Criteria, Validation, and approval status. It intentionally omits this task file's Non-Goals, fallback/refactor table, and Progress Log; this task file remains canonical for those expanded sections.
