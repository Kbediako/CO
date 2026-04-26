# ACTION_PLAN - CO: eliminate residual startup-anchor standalone-review failures that still force manual fallback after CO-173
## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-242` / `4b6dd62c-dd51-4edc-89e3-24c773d93124`
- Linear URL: https://linear.app/asabeko/issue/CO-242/co-eliminate-residual-startup-anchor-standalone-review-failures-that

## Summary
- Goal: reduce the residual post-`CO-173` startup-anchor / pre-anchor-meta-surface review-wrapper failures without weakening truthful boundary accounting.
- Scope: docs-first packet, single workpad, current-turn parallelization evidence plus truthful child-lane blockage note, audited docs-review child-stream, fresh telemetry reproduction, bounded startup-anchor fix, focused regressions, before/after evidence, and normal validation/review handoff.
- Assumptions:
  - the live dominant seam is no longer `command-intent`
  - the representative fresh sample pointing at `codex-skills` is real enough to guide initial source inspection
  - the smallest correct fix will stay inside startup-anchor classification / allowlist / promotion surfaces and their direct tests

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `standalone review wrapper`
  - `failed-boundary`
  - `startup-anchor`
  - `pre-anchor-meta-surface`
  - `manual fallback review`
  - `review telemetry`
  - `CO-173`
- Not done if:
  - fresh evidence still shows the same startup-anchor recurrence with no material reduction
  - truthful boundary accounting is weakened instead of the startup seam being fixed
  - adjacent boundary families regress
  - healthy lanes still routinely need manual fallback for the same residual seam
- Pre-implementation issue-quality review:
  - completed during docs-first setup. The live issue wording, current telemetry, and current wrapper sources all point to a narrow residual startup-anchor seam rather than another command-intent retry bug or a generic docs baseline problem.

## Milestones & Sequencing
- [x] Isolate the lane in the historical issue workspace path .workspaces/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124, move the issue into `In Progress`, create the single workpad source, and publish the initial workpad comment with the pre-turn decomposition matrix. Proof: `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/workpad.md`.
- [x] Register the docs-first packet and registry mirrors for `linear-4b6dd62c-dd51-4edc-89e3-24c773d93124`, keeping the issue wording and current telemetry seam explicit. Proof: `docs/PRD-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `docs/TECH_SPEC-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `docs/ACTION_PLAN-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `tasks/specs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `tasks/tasks-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `.agent/task/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Run docs-review evidence before implementation and record the truthful fallback when same-issue child helpers are unavailable in the parent run. Proof: `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T0548Z-docs-review-fallback.md`, `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/cli/2026-04-18T05-48-25-732Z-f5e259ca/manifest.json`, `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/docs-freshness-maintenance.json`.
- [x] Reproduce the fresh startup-anchor / pre-anchor-meta-surface evidence and narrow the exact wrapper seam before code changes. Proof: `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T1616Z-startup-anchor-audit.json`, `.runs/linear-5570250a-1361-4af0-857c-119649b902ab/cli/2026-04-18T02-46-06-691Z-d566012b/review/telemetry.json`.
- [x] Implement the smallest truthful fix plus focused regressions, then collect before/after telemetry evidence. Proof: `scripts/lib/review-meta-surface-normalization.ts`, `tests/review-meta-surface-normalization.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124-docs-review/cli/2026-04-18T15-54-42-548Z-b8fdf93e/review/telemetry.json`.
- [ ] Run the final standalone review, elegance review, PR attachment, and review drain before any review-state transition. Proof: parent validation floor green on current `origin/main`; parent standalone review succeeded as bounded-success with `startupAnchorObserved=true` and zero pre-anchor meta-surface hits; final elegance passed; PR attachment and ready-review drain pending.

## Dependencies
- `scripts/lib/review-execution-state.ts`
- `scripts/lib/review-execution-runtime.ts`
- `scripts/lib/review-execution-telemetry.ts`
- `scripts/lib/review-meta-surface-normalization.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- representative local telemetry under `.runs/**/review/telemetry.json`

## Validation
- [x] docs-review evidence runs before implementation or records a truthful repo-baseline fallback.
- [x] fresh pre-fix evidence is captured and cited.
- [x] focused startup-anchor regressions pass for the bounded seam.
- [x] post-fix evidence shows reduced `startup-anchor` / `pre-anchor-meta-surface` recurrence on the bounded sample.
- [x] full repo validation floor runs for the non-trivial diff on current `origin/main`, including `docs:freshness` now passing with `CO-175` retained as in-policy rolling debt.
- [x] standalone review plus explicit elegance review complete before handoff. Proof: `/Users/kbediako/Code/CO/.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/cli/2026-04-18T05-35-22-749Z-3e368e6f/review/telemetry.json`, `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T1621Z-final-elegance-review.md`.
- [x] Rollback plan: revert the bounded startup-anchor change and focused tests together if the fix weakens truthful boundary accounting or regresses adjacent boundary families, then file a bounded follow-up instead of masking the regression.

## Risks & Mitigations
- Risk: the apparent residual seam is only a synthetic or one-off sample.
  - Mitigation: compare a fresh sample set before concluding the fix scope.
- Risk: broadening startup support too far hides real boundary drift.
  - Mitigation: keep the change bounded and preserve current telemetry classification when a real boundary still occurs.
- Risk: the true seam lives in a nearby helper family rather than `review-execution-state.ts`.
  - Mitigation: narrow the reproduction first and touch only the minimal adjacent helper surface the evidence actually points at.
- Risk: current-turn same-issue child-lane adoption is blocked by provider-worker runtime provenance, not repo scope.
  - Mitigation: keep the blocked child-lane attempt explicit in the workpad and use the audited docs-review child-stream for this run rather than faking child-lane success.

## Approvals
- Reviewer: docs-review child stream succeeded; parent standalone review succeeded as bounded-success; final elegance passed; PR handoff pending.
- Date: 2026-04-19
