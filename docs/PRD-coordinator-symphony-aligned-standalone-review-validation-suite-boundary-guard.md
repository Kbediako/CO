# PRD - Coordinator Symphony-Aligned Standalone Review Validation-Suite Boundary Guard

## Summary

After `1061`, bounded standalone review fails closed on explicit command-intent violations such as direct `vitest`/`jest` runners and nested review/delegation flows, but explicit package-manager validation suites still remain advisory in default mode. This slice closes that gap by turning review-launched `npm`/`pnpm`/`yarn`/`bun` validation suites into the same kind of bounded-policy violation, so the wrapper stops early instead of lingering after a heavy suite completes.

## Problem

- The bounded review contract says the reviewer should not launch full validation suites such as `npm run test`, `npm run lint`, or `npm run build`.
- In practice, the current wrapper still treats package-manager validation suites as heavy-but-advisory unless `CODEX_REVIEW_ENFORCE_BOUNDED_MODE=1`.
- The `1064` and `1065` review/full-suite repros show the operational cost of that gap:
  - `npm run test` can run to apparent suite completion and then leave a quiet tail instead of terminating cleanly,
  - `npm run review` can broaden into heavy validation work and continue crawling instead of returning a bounded verdict.

## Goal

Extend the standalone-review boundary so explicit package-manager validation suites become a default fail-closed command-intent violation in bounded mode, while preserving an explicit operator escape hatch for intentionally broader review runs.

## Non-Goals

- No generic ban on all heavy commands.
- No rewrite of the broader meta-surface or low-signal drift heuristics.
- No retry/supervisor behavior for review runs.
- No change to downstream CLI/package UX beyond the bounded review contract.
- No controller/symphony extraction work mixed into this reliability lane.

## Requirements

- Detect explicit package-manager validation suites launched by the reviewer, including:
  - `npm run test`
  - `npm run lint`
  - `npm run build`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - equivalent `pnpm` / `yarn` / `bun` forms
- Classify those launches as a bounded-policy violation from the shared review execution state in default review mode.
- Preserve `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1` as the explicit escape hatch for intentionally broader runs.
- Surface a clear runtime reason/artifact showing that review stopped because a validation-suite boundary was crossed.
- Add focused regression coverage for the failure mode where a suite launch would otherwise complete and then leave the wrapper drifting afterward.

## Constraints

- Preserve the existing Symphony-aligned split:
  - `ReviewExecutionState` remains the one runtime authority
  - `scripts/run-review.ts` remains a thin launcher/terminator shell
- Reuse existing classification surfaces where possible instead of introducing a second parallel command classifier.
- Keep the slice narrow enough that the next post-fix step can return to Symphony-aligned runtime/controller work.

## Acceptance Criteria

1. Default bounded review fails closed when the reviewer launches package-manager validation suites.
2. The stop reason is surfaced from the shared execution-state seam, not from ad hoc wrapper-only branching.
3. `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1` still permits explicit broader runs.
4. Focused `run-review` regressions cover the new boundary and the previously observed “suite completes, crawl continues” failure shape.
5. Standard repo validation plus `pack:smoke` are captured before closeout.
