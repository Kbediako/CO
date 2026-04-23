# Task Checklist - linear-4ea68a3d-3832-4161-bab7-84dceeceeb46

- Linear Issue: `CO-326` / `4ea68a3d-3832-4161-bab7-84dceeceeb46`
- MCP Task ID: `linear-4ea68a3d-3832-4161-bab7-84dceeceeb46`
- Primary PRD: `docs/PRD-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- TECH_SPEC: `tasks/specs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`
- Source anchor: `ctx:sha256:b6dfe577e25cc512757f1fba35bab57fb685d968fa340ea712648248f38b1fd5#chunk:c000001`

## Docs-First
- [x] PRD drafted for current-turn scoping of provider-linear parallelization proof invariants. Evidence: `docs/PRD-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`.
- [x] TECH_SPEC drafted with protected terms, current/reference/target truth, requirements, validation plan, and parent-owned implementation boundaries. Evidence: `tasks/specs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`.
- [x] TECH_SPEC mirror drafted for docs packet consumers. Evidence: `docs/TECH_SPEC-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`.
- [x] Task checklist created. Evidence: `tasks/tasks-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`.
- [x] Parent registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md` issue-shaping contract and current/reference/target truth.

## Analysis Evidence Required Before Implementation
- [x] Parent confirms the exact proof finalization path that emits `parallelization_decision_multiple`. Evidence: `resolveProviderLinearWorkerParallelizationFailure(...)` in `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Parent confirms the authoritative current-turn selector. Evidence: current implementation captures a refreshed post-bootstrap audit cursor for invariant checks, while child-lane launch checks use `current_turn_started_at` with `attempt_started_at` fallback.
- [x] Parent confirms which writer controls `manifest.status` and `runs.json` for the false-failure shape. Evidence: provider worker proof persistence feeds manifest/run summaries after `owner_status` and `end_reason` are set.
- [x] Parent confirms no child-lane admission, Linear transition, or stale control-host reconciliation change is needed. Evidence: source delta is limited to proof invariant selection and focused tests.

## Implementation Acceptance
- [x] Multi-turn provider-linear run with one valid parallelization decision per turn no longer ends with `owner_status=failed` / `parallelization_decision_multiple`. Evidence: `npm run test` after the `origin/main` restack, including `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] `provider-linear-worker-proof`, `manifest.status`, and `runs.json` align with successful handoff/closeout in the multi-turn case. Evidence: `runProviderLinearWorker(...)` now returns succeeded proof state for prior-turn audit history and no longer throws the false duplicate failure that drives failed manifest/run-summary closeout.
- [x] True same-turn duplicate decisions still fail closed with `parallelization_decision_multiple`. Evidence: existing provider-linear parallelization regression coverage in `npm run test`.
- [x] Missing current-turn decisions still fail closed with explicit evidence. Evidence: existing provider-linear missing-decision regression coverage in `npm run test`.
- [x] `provider-linear-worker-linear-audit.jsonl` remains cumulative and auditable. Evidence: regression asserts all prior and current parallelization rows remain in `linear_audit.parallelization_entries`.
- [x] Operator diagnostics no longer report a false failed lane solely because prior turns also recorded valid decisions. Evidence: proof-level success preserves cumulative audit rows while current-turn invariant reads only post-bootstrap entries.

## Validation
- [x] Docs child lane protected-term check. Evidence: `rg -n "provider-linear-worker-proof|parallelization_decision_multiple|owner_status=failed|manifest.status|runs.json|provider-linear-worker-linear-audit.jsonl|current-turn same-issue parallelization decision" docs/PRD-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md docs/TECH_SPEC-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md docs/ACTION_PLAN-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md tasks/specs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md tasks/tasks-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md .agent/task/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md`.
- [x] Docs child lane trailing-whitespace check. Evidence: `awk '/[ \t]$/{print FILENAME ":" FNR ": trailing whitespace"; found=1} END{exit found}' docs/PRD-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md docs/TECH_SPEC-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md docs/ACTION_PLAN-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md tasks/specs/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md tasks/tasks-linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md .agent/task/linear-4ea68a3d-3832-4161-bab7-84dceeceeb46.md` exits `0`.
- [x] Parent focused provider-linear worker regressions. Evidence: `npm run test` passed after the `origin/main` restack: 348 files / 4640 tests.
- [x] Parent guard and docs gates. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` passed after restack.
- [x] Parent review and package smoke. Evidence: manifest-backed `npm run review -- --base origin/main` completed with `review_outcome=bounded-success` and no actionable diff-local findings; `npm run pack:smoke` passed.

## Progress Log
- 2026-04-23: Same-issue docs child lane created the bounded docs-first packet only. The packet preserves `CO-326` as a false-failure proof invariant scoping issue: valid per-turn decisions across a successful provider-linear run must not be counted as same-turn duplicates.
- 2026-04-23: The expected shared source payload path was absent in this isolated child checkout, so the packet is anchored on the live read-only `CO-326` Linear issue text plus the supplied source anchor.
- 2026-04-23: Parent remains responsible for registry mirrors, implementation, tests, review, PR lifecycle, Linear state, and workpad updates.
- 2026-04-23: Parent accepted the docs packet, updated registry mirrors, corrected the packet source anchor to `ctx:sha256:b6dfe577e25cc512757f1fba35bab57fb685d968fa340ea712648248f38b1fd5#chunk:c000001`, implemented current-turn invariant checks via a refreshed post-bootstrap audit cursor, and added focused regression coverage for earlier-turn decisions plus same-turn duplicates.
- 2026-04-23: Parent restacked on current `origin/main`, resolved the standalone-review P2 about a stale docs-freshness owner revert, reran full validation successfully, reran manifest-backed standalone review successfully, and passed `npm run pack:smoke`.
