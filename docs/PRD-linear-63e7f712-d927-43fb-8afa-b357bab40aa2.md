# PRD - CO: Harden hot-suite dist freshness heuristics for transitive CLI/runtime dependencies

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-123` / `63e7f712-d927-43fb-8afa-b357bab40aa2`
- Linear URL: https://linear.app/asabeko/issue/CO-123/co-harden-hot-suite-dist-freshness-heuristics-for-transitive
- Source issue: `CO-114` / `54387f04-30aa-436a-9901-690c0e9cfcee`

## Summary
- Problem Statement: CO-114 preserved a fast retained subprocess smoke matrix by preferring built JS when `dist` looks newer than selected source roots, but the current selectors are intentionally narrow. `tests/cli-command-surface.spec.ts` only compares `dist/bin/codex-orchestrator.js` against `bin/codex-orchestrator.ts`, and `tests/run-review.spec.ts` only compares `dist/scripts/run-review.js` against `scripts/run-review.ts` plus `scripts/lib/**`. In local or focused reruns, a transitive dependency can change without those tracked roots changing, causing stale built JS to be treated as fresh.
- Desired Outcome: keep CO-114's merged speedup and Core Lane guardrail shape, but harden the hot-suite freshness selectors so stale `dist` is rejected when relevant transitive CLI/runtime roots move, while unrelated sibling edits still preserve the fast built-entry path.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat this as a bounded hardening follow-up to CO-114 rather than a rework of the merged performance lane. Define an explicit dependency-root contract for the two retained subprocess smoke helpers, implement the smallest correct freshness fix, and prove both stale-root rejection and unrelated-sibling tolerance with focused tests.
- Success criteria / acceptance:
  - the CLI hot-suite freshness selector invalidates `dist` when relevant transitive command-surface roots change, not only when `bin/codex-orchestrator.ts` changes
  - the review hot-suite freshness selector invalidates `dist` when relevant runtime roots change beyond `scripts/run-review.ts` and `scripts/lib/**`
  - focused tests prove stale tracked roots reject `dist` and unrelated sibling edits still keep the fast path
  - the issue packet records the chosen dependency-root contract and whether the improved heuristic remains local-only or is shared by both hot suites
- Constraints / non-goals:
  - do not reopen CO-114 or broaden this into a generic repository dependency-graph overhaul
  - do not regress back to broad whole-tree invalidation that erases the local speedup
  - keep the protected CI path and local focused reruns conceptually separate where the evidence supports it

## Pre-Implementation Review Notes
- Review approval: 2026-04-10 standalone issue/spec review found that the ticketed CO-123 follow-up matched the intended bounded lane, so the docs-first packet was approved to proceed without additional blocking questions.
- Issue-quality review: 2026-04-10 issue-quality review confirmed that the lane is not plausibly narrower than the user request and already preserves the protected terms, nearby wrong interpretations, non-goals, and `Not Done If` conditions before implementation.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Harden hot-suite dist freshness heuristics`
  - `transitive CLI/runtime dependencies`
  - `retained subprocess smoke helpers`
  - `bounded subprocess smoke matrix`
  - `Core Lane`
  - `local or ad hoc reruns`
- Protected terms / exact artifact and surface names:
  - `tests/cli-command-surface.spec.ts`
  - `tests/run-review.spec.ts`
  - `dist/bin/codex-orchestrator.js`
  - `bin/codex-orchestrator.ts`
  - `dist/scripts/run-review.js`
  - `scripts/run-review.ts`
  - `scripts/lib/**`
  - `CO-114`
- Nearby wrong interpretations to reject:
  - "Core Lane is already exercising stale dist in CI, so reopen CO-114"
  - "walk the full repo dependency graph for every hot-suite subprocess check"
  - "invalidate built JS on any repo edit because that is safer"
  - "turn this into generic CLI/runtime cleanup unrelated to the hot suites"

## Parity / Alignment Matrix
- Current truth:
  - the CLI hot suite treats `dist/bin/codex-orchestrator.js` as fresh when it is newer than only `bin/codex-orchestrator.ts`
  - the review hot suite treats `dist/scripts/run-review.js` as fresh when it is newer than `scripts/run-review.ts` plus `scripts/lib/**`
  - transitive dependencies outside those tracked roots can still leave stale built JS looking fresh during local reruns
- Reference truth:
  - the same retained subprocess smoke matrix should remain fast for unrelated-file edits
  - stale built JS should be rejected whenever the declared transitive command-surface or runtime roots become newer
- Target truth / intended delta:
  - both hot suites use an explicit bounded dependency contract defined as the transitive relative-import closure of their source entrypoints
  - the freshness check is shared across the two suites to avoid divergence, while the dependency closure remains entrypoint-specific
  - focused tests prove stale tracked roots reject `dist` while unrelated siblings do not
- Explicitly out-of-scope differences:
  - generic dependency discovery across the whole repo
  - reworking the Core Lane build-before-test guardrail
  - broad product/runtime behavior changes outside the hot-suite helpers

## Not Done If
- The hot-suite freshness helpers still treat `dist` as fresh when newly declared transitive CLI/runtime roots are newer than the built entrypoint.
- The fix broadens into whole-tree invalidation and destroys the intended local speed benefit for unrelated edits.
- There is no focused proof showing both stale-dependency rejection and unrelated-sibling tolerance.
- The packet does not state the chosen dependency-root contract and shared-helper decision.

## Goals
- Define the bounded source-root contract for the CLI and review hot-suite retained subprocess helpers.
- Implement the smallest correct freshness hardening for those suites.
- Keep the built-entry fast path available for unrelated sibling edits.
- Record focused validation and the chosen helper-sharing decision.

## Non-Goals
- Reopening CO-114 for a non-blocking follow-up hardening improvement.
- Replacing the retained subprocess smoke matrix with pure in-process coverage.
- Introducing a generic repository dependency crawler.
- Expanding the lane into unrelated CI or runtime cleanup.

## Stakeholders
- Product: operators and reviewers relying on truthful hot-suite reruns without reopening CO-114
- Engineering: test-harness, CLI, and review-wrapper maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - focused tests fail closed when newly tracked transitive roots are newer than `dist`
  - focused tests continue to allow the built-entry path when only unrelated sibling files changed
  - the retained subprocess smoke helpers remain bounded to entrypoint-specific dependency closures rather than a broad repo scan
- Guardrails / Error Budgets:
  - preserve CO-114's retained subprocess smoke shape and Core Lane guardrail posture
  - do not add a broad full-repo scan to the hot-suite freshness checks
  - keep the final diff bounded to the hot suites, a direct shared helper, and the required docs packet

## User Experience
- Personas:
  - an author running focused CLI or review-wrapper tests locally after editing adjacent sources
  - a maintainer verifying that the hot-suite speedup still behaves truthfully after transitive source changes
- User Journeys:
  - local reruns use built JS only when the declared dependency closure is actually fresh
  - unrelated sibling edits do not force a slow source-entry fallback
  - reviewers can inspect a documented root contract instead of inferring it from scattered test logic

## Technical Considerations
- Architectural Notes:
  - the freshest minimal fix is a shared test-local helper that computes the newest mtime across the transitive relative runtime-dependency closure of each source entrypoint instead of a hand-maintained subtree list
  - the first docs-review pass showed why static subtree roots are too narrow: CLI imports already escape `orchestrator/src/cli/**`, and review-runtime imports already escape `orchestrator/src/cli/runtime/**`
  - using a per-entrypoint dependency closure keeps the check bounded to the files the source entrypoint actually loads, avoiding a broad repo scan while closing the stale-dist gap
  - the helper should ignore type-only edges so runtime-unrelated type churn does not evict the fast path, and it should fail closed when a tracked relative runtime dependency can no longer be resolved
  - keeping the helper test-local avoids turning a suite-specific optimization seam into product code
- Dependencies / Integrations:
  - `tests/cli-command-surface.spec.ts`
  - `tests/run-review.spec.ts`
  - `tests/helpers/**`
  - `bin/codex-orchestrator.ts`
  - `scripts/run-review.ts`

## Open Questions
- None at this stage. The implemented helper already covers the discovered edge cases by ignoring type-only edges and failing closed on unresolved tracked relative runtime dependencies.

## Approvals
- Product: self-approved from the Linear issue scope
- Engineering: `codex-orchestrator linear child-stream docs-review` on the rework branch, with manifest-backed fallback accepted after isolating `docs:freshness` failures to unrelated repo-baseline drift; see `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/docs-review-fallback.md`
- Design: N/A
