# PRD - CO: eliminate residual startup-anchor standalone-review failures that still force manual fallback after CO-173
## Added by Bootstrap 2026-04-18

## Traceability
- Linear issue: `CO-242` / `4b6dd62c-dd51-4edc-89e3-24c773d93124`
- Linear URL: https://linear.app/asabeko/issue/CO-242/co-eliminate-residual-startup-anchor-standalone-review-failures-that

## Summary
- Problem Statement: `CO-173` materially reduced the older forced-standalone-review wrapper failures centered on `command-intent`, but healthy implementation lanes still recur to documented manual fallback because the remaining live failure family is now `failed-boundary` -> `startup-anchor` -> `pre-anchor-meta-surface`. Current live evidence shows this is not just a historical audit artifact: recent wrapper reruns still terminate before a useful startup anchor while the underlying code diffs are otherwise healthy.
- Desired Outcome: reduce the residual post-`CO-173` startup-anchor seam with the smallest truthful change so bounded standalone review reaches a real startup anchor more reliably on healthy lanes, while keeping telemetry, operator messaging, and manual-fallback accounting honest when the wrapper still hits a real boundary.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): eliminate the remaining startup-anchor tooling seam without reopening the older `CO-173` command-intent retry work, without downgrading review to advisory, and without hiding boundary failures as success. The wrapper should keep failing closed on real boundaries, but it should stop routinely forcing manual correctness/elegance fallback for healthy diffs because of the specific residual `startup-anchor` / `pre-anchor-meta-surface` path.
- Success criteria / acceptance:
  - reproduce and classify a fresh residual post-`CO-173` failure sample
  - show the dominant remaining seam is `startup-anchor` / `pre-anchor-meta-surface`, not a reappearance of the older `command-intent` family
  - land the smallest fix that materially reduces this residual failure family
  - preserve truthful review evidence accounting and operator-visible distinction between product findings and wrapper/tooling boundaries
  - capture before/after telemetry showing reduced `startup-anchor` / `pre-anchor-meta-surface` failed-boundary recurrence
- Constraints / non-goals:
  - do not reopen generic docs:freshness baseline work
  - do not broaden into prompt transport, long-tail accounting, or unrelated review wrapper redesign unless fresh evidence requires it
  - do not hide the problem by reclassifying failed boundaries as success
  - do not treat a single `CO-238` sample as sufficient proof if a broader fresh sample says otherwise

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `standalone review wrapper`
  - `failed-boundary`
  - `startup-anchor`
  - `pre-anchor-meta-surface`
  - `manual fallback review`
  - `review telemetry`
  - `CO-173`
- Protected terms / exact artifact and surface names:
  - `.runs/**/review/telemetry.json`
  - `scripts/lib/review-execution-state.ts`
  - `scripts/lib/review-execution-runtime.ts`
  - `scripts/lib/review-execution-telemetry.ts`
  - `scripts/lib/review-meta-surface-normalization.ts`
  - `scripts/lib/review-execution-boundary-preflight.ts`
  - `tests/review-execution-state.spec.ts`
  - `tests/run-review.spec.ts`
  - `orchestrator/src/cli/services/commandRunner.ts`
- Nearby wrong interpretations to reject:
  - this is just the already-fixed `CO-173` command-intent bug
  - this is only docs/spec baseline debt
  - review should be disabled or permanently downgraded to advisory
  - this is only one anomalous `CO-238` rerun and not a real wrapper family

## Parity / Alignment Matrix
- Current truth:
  - the recent local audit in the issue description found `10` `failed-boundary` reviews in the sampled set, `8` of them `startup-anchor` and only `2` `command-intent`
  - the representative fresh sample at `.runs/linear-5570250a-1361-4af0-857c-119649b902ab/cli/2026-04-18T02-46-06-691Z-d566012b/review/telemetry.json` is `failed-boundary` with `termination_boundary.kind=startup-anchor`, `provenance=pre-anchor-meta-surface`, and `summary.metaSurfaceKinds=["codex-skills"]`
  - `tests/review-execution-state.spec.ts` and `tests/run-review.spec.ts` already cover synthetic startup-anchor drift, but the live post-`CO-173` recurrence still reaches the same boundary family in real provider-worker review runs
- Reference truth:
  - healthy bounded standalone review should reach a real startup anchor or fail only when repeated off-scope startup drift is still genuinely happening
  - telemetry should keep boundary kind, provenance, and operator-facing fallback truth explicit instead of masking wrapper failures as clean success
  - adjacent boundary families such as `command-intent`, `meta-surface-expansion`, and `relevant-reinspection-dwell` should remain distinct
- Target truth / intended delta:
  - reduce the residual live `startup-anchor` / `pre-anchor-meta-surface` recurrence with a bounded change in the startup-anchor classification / allowlist / anchor-promotion seam
  - keep `command-intent` behavior, telemetry schema, and manual-fallback truth intact
  - add focused regression coverage and a fresh before/after evidence sample for the remaining startup-anchor family
- Explicitly out-of-scope differences:
  - generic docs baseline cleanup
  - broad review wrapper redesign
  - telemetry schema resets or reinterpretation that makes failed boundaries disappear

## Not Done If
- A fresh evidence sample still shows the dominant post-`CO-173` recurrence is `startup-anchor` / `pre-anchor-meta-surface` at about the same rate with no bounded explanation.
- The change weakens or removes truthful boundary accounting instead of fixing the startup path.
- `command-intent` or other adjacent boundary families regress while this lane claims success.
- Healthy lanes still routinely need manual fallback for the same startup-anchor seam with no material before/after improvement.

## Goals
- Reproduce the residual startup-anchor failure family on fresh current-main-based evidence.
- Narrow the exact pre-anchor meta-surface seam that still trips healthy review runs.
- Land the smallest truthful fix plus focused regressions.
- Preserve honest operator-visible review telemetry and fallback guidance.

## Non-Goals
- Reopening `CO-173` as a generic command-intent umbrella.
- Generic docs/spec freshness cleanup.
- Disabling standalone review or reclassifying boundaries as success.
- Broad prompt transport or review-wrapper architecture refactors.

## Stakeholders
- Product: CO operators and provider-worker lanes that rely on bounded standalone review as an autonomous gate.
- Engineering: maintainers of the standalone-review wrapper, telemetry, and provider-worker review handoff surfaces.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - fresh local telemetry sample still reproduces the baseline before the fix
  - focused post-fix evidence reduces `startup-anchor` / `pre-anchor-meta-surface` recurrence on the bounded sample
  - targeted tests for the touched startup-anchor seam pass
- Guardrails / Error Budgets:
  - preserve truthful `failed-boundary` accounting when a real wrapper boundary still occurs
  - keep adjacent boundary families distinct
  - keep the fix bounded to startup-anchor / pre-anchor meta-surface behavior and its direct tests unless fresh evidence forces a nearby helper parity change

## User Experience
- Personas:
  - provider-worker lanes that must run standalone review before review handoff
  - maintainers auditing wrapper telemetry to distinguish tooling failures from code findings
  - reviewers relying on the wrapper to reach a bounded verdict without routine manual fallback
- User Journeys:
  - a healthy diff triggers manifest-backed `npm run review` and reaches a useful startup anchor instead of failing early on nearby startup-support drift
  - when a real startup-anchor boundary still occurs, the operator sees the same truthful boundary kind/provenance and manual-fallback guidance as today

## Technical Considerations
- Architectural Notes:
  - the current live seam points at startup-anchor enforcement and adjacent meta-surface classification, not the older command-intent retry path
  - the smallest truthful fix is likely inside `review-execution-state.ts` plus adjacent normalization or startup preflight helpers, not a new telemetry model
  - before/after evidence should come from fresh wrapper telemetry and focused tests, not only synthetic reasoning
- Dependencies / Integrations:
  - `.runs/**/review/telemetry.json`
  - `scripts/lib/review-execution-state.ts`
  - `scripts/lib/review-execution-runtime.ts`
  - `scripts/lib/review-execution-telemetry.ts`
  - `scripts/lib/review-meta-surface-normalization.ts`
  - `tests/review-execution-state.spec.ts`
  - `tests/run-review.spec.ts`

## Open Questions
- Which specific pre-anchor `codex-skills` or adjacent startup-support reads remain truthful boundary inputs, and which should now be treated as bounded nearby review-support in healthy lanes after the `CO-173` changes?

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria.
- Engineering: pending docs-review and implementation validation.
- Design: N/A.
