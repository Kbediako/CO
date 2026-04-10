# PRD - CO: restore current-main docs:freshness green baseline after CO-134 validation repair

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-143` / `d3f1af87-57da-46ab-901d-75a6cc60420e`
- Linear URL: https://linear.app/asabeko/issue/CO-143/co-restore-current-main-docsfreshness-green-baseline-after-co-134
- Source issue: `CO-134` / `653a1d08-94a4-47e1-8f63-2232dcaf8f1e`
- Prior green baseline lane: `CO-63` / `a34ce3f3-8e78-40f7-aabd-9e510572323e`
- Current local repro artifacts:
  - `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T052635Z-baseline-docs-freshness.log`
  - `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T052635Z-baseline-docs-freshness-report.json`
  - `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T0545Z-cohort-audit.md`

## Summary
- Problem Statement: `CO-134` is no longer blocked on `npm run test` or the standalone review wrapper, but the current mainline still fails `npm run docs:freshness`. Local reproduction on the detached `origin/main` workspace confirms the failure exactly: `3476 docs`, `3479 registry entries`, `119 stale docs`, with no missing or invalid registry entries. Every stale entry shares the same metadata signature: `last_review=2026-03-10`, `cadence_days=30`, `age_days=31`.
- Desired Outcome: restore a truthful green `docs:freshness` baseline on current mainline so implementation-gate runs move past `docs:freshness` after `build`, `lint`, `test`, and `docs:check` have already succeeded.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat this as a repo-baseline freshness repair lane on current main, not as a continuation of the earlier CO-134 test or review-wrapper seam, and leave auditable evidence showing why the baseline drifted from the April 1 green state.
- Success criteria / acceptance:
  - reproduce the current `docs:freshness` failure on the current mainline workspace
  - classify the stale set by source of drift, not just by aggregate count
  - repair the stale cohort truthfully so `npm run docs:freshness` passes again
  - confirm the repaired tree no longer stops first at `docs:freshness`
- Constraints / non-goals:
  - do not reopen the CO-134 `npm run test` or standalone-review wrapper seam without fresh evidence
  - do not use a validation override instead of fixing or classifying the baseline drift
  - do not broaden into unrelated control-host or feature work

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness`
  - `stale docs`
  - `current-main`
  - `CO-134`
  - `CO-63`
  - `implementation-gate`
- Protected terms / exact artifact and surface names:
  - `npm run docs:freshness`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-co-134-implementation-gate-final/...`
  - `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/docs-freshness.json`
- Nearby wrong interpretations to reject:
  - `CO-134` is still blocked on `npm run test`
  - the standalone review wrapper is still the first failing stage
  - the fix should be a waiver instead of a baseline repair
  - this is broad repo-wide docs churn rather than a single aged packet cohort

## Parity / Alignment Matrix
- Current truth:
  - current local repro on `HEAD == origin/main` fails only on stale registry entries
  - all `119` stale entries come from one March 10 packet cohort spanning `17` packet ids (`1093` through `1109`)
  - the split is `Task Packet stale=85`, `Task Mirror stale=17`, `Report Only stale=17`
- Reference truth:
  - CO-63 recorded `docs:freshness` green on April 1, 2026 with `0` stale entries
  - implementation-gate handoffs should not inherit an already-red repo baseline after the scoped lane has passed `build`, `lint`, `test`, and `docs:check`
- Target truth / intended delta:
  - the March 10 packet cohort is re-reviewed and its freshness metadata is refreshed consistently enough for a truthful green baseline on current main
  - the closeout explains that the drift was time-based expiration of a coherent packet cohort, not a reopened CO-134 validation seam
- Explicitly out-of-scope differences:
  - unrelated stale docs outside the reproduced March 10 cohort
  - review-wrapper prompt/boundary work
  - control-host or feature behavior changes

## Not Done If
- `npm run docs:freshness` still fails on the repaired branch without a narrower, newly documented blocker.
- The lane cannot explain how the current baseline drifted away from the April 1 green CO-63 result.
- Implementation-gate evidence still stops first at `docs:freshness` on the repaired tree.

## Goals
- Reproduce the current mainline `docs:freshness` failure with saved artifacts.
- Audit the stale cohort and confirm why the April 1 green state aged into the April 10 red state.
- Land the smallest truthful metadata refresh needed to make the current baseline green again.
- Record enough evidence that future CO lanes can distinguish time-based freshness drift from new validation regressions.

## Non-Goals
- Reopening the CO-134 long-suite validation seam.
- Weakening or bypassing the `docs:freshness` gate.
- Broad archive-policy redesign or unrelated docs cleanup.

## Stakeholders
- Product: CO operators blocked by implementation-gate handoffs that inherit a red baseline
- Engineering: maintainers of task packets, docs freshness metadata, and validation gates
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `npm run docs:freshness` exits `0` on the repaired tree
  - the refreshed cohort is explicitly identified and auditable
  - the lane can point to the exact drift source rather than a generic stale-doc count
- Guardrails / Error Budgets:
  - keep the fix bounded to the reproduced stale cohort
  - preserve truthful metadata instead of silent waivers
  - create a follow-up issue instead of expanding scope if a different blocker appears

## User Experience
- Personas:
  - provider worker trying to hand off a green implementation-gate lane
  - reviewer auditing whether a repo baseline failure is truthful
  - maintainer checking why a previously green freshness baseline drifted red
- User Journeys:
  - a worker reruns `npm run docs:freshness` on current main and sees a truthful green baseline
  - a reviewer can see exactly which packet cohort aged out and why
  - a maintainer can distinguish time-based freshness drift from a reopened validation regression

## Technical Considerations
- Architectural Notes:
  - the stale set is a single March 10 packet cohort, not a mix of missing or invalid registry entries
  - the repair should update packet metadata consistently across packet surfaces rather than introduce a new freshness exception
- Dependencies / Integrations:
  - `scripts/docs-freshness.mjs`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/docs-freshness.json`

## Open Questions
- Whether a full implementation-gate rerun is necessary after the local `docs:freshness` pass, or whether a narrower proof that the repaired tree advances past `docs:freshness` is sufficient for handoff.

## Approvals
- Product: pending
- Engineering: docs-review child stream reached `docs:freshness` and failed only on the pre-existing repo baseline; manual fallback accepted in `out/linear-d3f1af87-57da-46ab-901d-75a6cc60420e/manual/20260410T053642Z-docs-review-fallback.md`
- Design: N/A
