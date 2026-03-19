# PRD - Coordinator Symphony-Aligned Standalone Review Self-Containment Boundary

## Summary

`1093` made `diff` and `audit` explicit review surfaces and fixed the main audit-surface contradictions, but the live wrapper still broadens default `diff` reviews into adjacent review-system surfaces such as review-artifact docs, pack-smoke helpers, and run-manifest plumbing. This slice adds a tighter self-containment boundary so default `diff` reviews stay on changed code and direct dependencies instead of wandering through the wrapper's own support infrastructure.

## Problem

- The current runtime guard classifies memories, skills, and `.runs` plumbing as meta surfaces, but it does not treat adjacent review-system surfaces such as `docs/standalone-review-guide.md`, `docs/guides/review-artifacts.md`, `scripts/pack-smoke.mjs`, or `<runDir>/review/*` as their own off-task class.
- As a result, the wrapper can stop the most obvious meta drift while still allowing low-signal inspection of review-adjacent infrastructure during ordinary `diff` reviews.
- That weakens trust in future Symphony extraction reviews because it becomes harder to distinguish real product-code findings from wrapper self-inspection churn.

## Goals

- Keep default `diff` reviews self-contained to changed files, direct dependencies, and directly relevant test coverage.
- Treat adjacent review-system surfaces as a bounded off-task class for `diff` mode unless the diff itself touches those paths or a concrete finding requires them.
- Preserve the `1093` surface contract: `audit` remains the only explicit path that broadens into checklist/manifest/PRD/evidence review.
- Reduce manual termination/override churn on future Symphony controller extractions.

## Non-Goals

- Reopening the `diff` vs `audit` split introduced in `1093`.
- Replacing the wrapper with a fully native review controller in this slice.
- Redesigning manifest resolution, pack-smoke itself, or downstream docs layout outside the minimal self-containment boundary needed for reliability.

## User-Facing Outcome

- `npm run review` stays useful on bounded implementation slices instead of repeatedly inspecting its own support docs and artifact helpers.
- Operators keep `--surface audit` for intentional broader validation instead of having to infer when the default `diff` surface has become too permissive.
- Future Symphony alignment slices inherit a cleaner review baseline.
