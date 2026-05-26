# Task Checklist - CO-529

## Docs-First
- [x] PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and agent mirror created for `linear-2807d702-edce-4847-84d3-ca8628ab77fc`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the CO-529 packet.
- [x] Protected terms are visible: `docs/docs-freshness-registry.json`, `status=archived`, `<!-- docs-archive:stub -->`, `Full content`, `Archive branch`, `Archive path`, `allow_registry_only`, `preserved_historical_stub`, and `retained_terminal_packet`.

## Decomposition
- [x] Same-turn decomposition matrix recorded in `docs/ACTION_PLAN-linear-2807d702-edce-4847-84d3-ca8628ab77fc.md`.
- [x] Exactly one parallelization decision recorded: `stay_serial` / `overlapping_scope`.
- [x] Docs-review evidence captured before implementation with review-quota waiver. Evidence: `.runs/linear-2807d702-edce-4847-84d3-ca8628ab77fc/cli/2026-05-26T08-59-45-162Z-af3ffe63/manifest.json`.

## Acceptance
- [x] Current latest-main suspect archived rows are classified into valid archive stubs, explicit retained/historical rows, historical/archive reference pages, and invalid full-doc archived rows. Evidence: `out/linear-2807d702-edce-4847-84d3-ca8628ab77fc/archived-registry-classification.json`.
- [x] Invalid rows are repaired by generating real archive payloads/stubs or by reclassifying to explicit non-hidden lifecycle truth. Evidence: 390 non-stub/no-payload packet rows reclassified active/non-hidden in `docs/docs-freshness-registry.json`.
- [x] `docs:freshness` or adjacent archive automation fails closed when a full on-main document is marked `archived` without valid stub or retained/history proof. Evidence: `npx vitest run tests/docs-freshness.spec.ts` and `npm run docs:freshness`.
- [x] `allow_registry_only` cannot hide full documents as archived without proof. Evidence: `tests/implementation-docs-archive.spec.ts` and `tests/archive-automation-workflow.spec.ts` in the focused archive suite.
- [x] Focused regressions cover valid stub, invalid full-doc row, historical/archive reference, preserved historical stub, and retained terminal packet behavior. Evidence: `tests/docs-freshness.spec.ts`.

## Not Done If
- A full on-main PRD, TECH_SPEC, ACTION_PLAN, task/spec, or checklist doc can remain `status=archived` without a valid archive stub or explicit retained/historical class.
- The fix relies only on diff-time audit and misses existing current-main registry rows.
- Registry repair blindly bumps `last_review` or deletes historical docs.
- `docs:freshness`, `spec-guard`, or archive policy is weakened.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the implicit archived-status bypass for full docs.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Docs freshness registry | `status=archived` can hide full non-stub docs. | remove fallback | CO-529 | Archived registry row lacks valid stub/retained proof. | 2026-05-13 | 2026-05-26 | Not retained | Guard rejects unsafe rows or rows are reclassified/stubbed. | focused docs-freshness/archive tests. |

## Validation
- [x] Live issue-context read before transition: CO-529 Backlog at `2026-05-13T12:30:54.790Z`.
- [x] Guarded transition to `In Progress`: `2026-05-26T08:35:25.719Z`.
- [x] Isolated worktree created from `origin/main` at `ee8fb58d01cf7abfa9d6bc92b446ce70c479132c`.
- [x] Open PR audit returned `[]`; stale provider-intake had no active claims; CO-529 is the only newly admitted In Progress implementation lane.
- [x] Delegation degraded-mode evidence: `delegate.spawn` returned `Transport closed` for the attempted read-only queue-audit stream.
- [x] Current-main scan evidence: original PR #800 TECH_SPEC case is now a valid archive stub; preliminary scan found `697` existing archived rows without valid archive-stub metadata before classification.
- [x] RED focused regression captured: `npx vitest run tests/docs-freshness.spec.ts -t "rejects archived registry rows that point at full docs without archive-stub proof"` failed before implementation.
- [x] GREEN focused regression captured: the same focused vitest target passed after implementation.
- [x] Required repo validation gates completed: delegation guard with override, spec guard, build, lint, full test, docs:check, docs:freshness, docs:freshness:maintain, repo:stewardship, diff-budget with override, pack:smoke, and review quota/manual fallback.
- [x] Standalone review attempted and quota-blocked; manual correctness/elegance fallback recorded. Evidence: `out/linear-2807d702-edce-4847-84d3-ca8628ab77fc/manual/20260526T0922Z-review-quota-waiver.md` and `out/linear-2807d702-edce-4847-84d3-ca8628ab77fc/manual/20260526T0922Z-elegance-review.md`.

## Notes
- CO-490 remains Blocked on external cloud-canary environment visibility and was not admitted.
- CO-521 remains Backlog traceability because its own comment says CO-522 owns the live terminal-owner repair; it is not part of this lane.
