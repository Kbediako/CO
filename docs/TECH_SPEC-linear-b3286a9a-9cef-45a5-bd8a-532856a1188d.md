# TECH_SPEC - CO: harden run-review direct-exec symlink handling without regressing subprocess harnesses

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-127` / `b3286a9a-9cef-45a5-bd8a-532856a1188d`
- Linear URL: https://linear.app/asabeko/issue/CO-127/co-harden-run-review-direct-exec-symlink-handling-without-regressing

## Summary
- Problem Statement: the reviewed gap exists in raw source parity terms, but the shipped and documented `run-review` surface does not currently include a standalone symlink-preserved entrypoint. The lane therefore closes by proving the narrower supported surface and codifying it with focused tests instead of widening runtime behavior.
- Desired Outcome: keep `scripts/run-review.ts` direct-exec handling strict, export the helper for regression coverage, preserve the subprocess harness, and record why no broader hardening is warranted today.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): close the issue with concrete support-surface evidence, not assumption; keep the pipe-close subprocess regression truthful; and avoid expanding the fix beyond the supported `run-review` path.
- Success criteria / acceptance:
  - prove the current repo-local and packaged `run-review` entrypoints
  - keep supported behavior unchanged
  - add focused regression coverage that makes the supported direct path explicit
  - keep symlink-preserved direct `run-review` exec unsupported unless the package surface changes in a future lane
  - preserve `does not crash when stdout pipe closes early`
- Constraints / non-goals:
  - no `CO-114` timing relitigation
  - no `bin/codex-orchestrator.ts` edits
  - no weakening of the pipe-close regression

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `scripts/run-review.ts`
  - `dist/scripts/run-review.js`
  - `NODE_OPTIONS=--preserve-symlinks-main`
  - `tests/run-review.spec.ts`
  - `does not crash when stdout pipe closes early`
- Protected terms / exact artifact and surface names:
  - `npm run review`
  - `codex-orchestrator review`
  - `package.json`
  - `bin/codex-orchestrator.ts`
  - `scripts/run-review.ts`
  - `dist/scripts/run-review.js`
- Nearby wrong interpretations to reject:
  - "reopen CO-114"
  - "change the CLI bin again"
  - "mask the regression with more timeout"
  - "treat a file shipped under `files` as an installed bin"

## Parity / Alignment Matrix
- Current truth:
  - `bin/codex-orchestrator.ts` accepts resolved and realpath entry URLs
  - `scripts/run-review.ts` keeps a realpath-first direct-exec contract
  - `package.json` ships `dist/scripts/run-review.js` but installs no standalone `run-review` bin
  - `orchestrator/src/cli/reviewCliLaunchShell.ts` launches source/dist review helpers by direct path
  - `tests/run-review.spec.ts` now contains the focused direct-exec contract regression alongside the subprocess smoke
- Reference truth:
  - `bin/codex-orchestrator.ts` direct-exec hardening from `7fd6aa427`
  - current `tests/run-review.spec.ts` subprocess truth surfaces
  - `orchestrator/tests/ReviewCliLaunchShell.test.ts` source/dist launch resolution coverage
- Target truth / intended delta:
  - supported-path verdict documented and enforced by focused tests
  - `run-review` direct exec remains strict because the supported surface is strict
  - future parity widening is deferred until a supported symlink-preserved `run-review` entrypoint actually exists
- Explicitly out-of-scope differences:
  - broader review-wrapper refactors
  - performance/timing optimization
  - new package bins or provider-worker workflow changes

## Not Done If
- No supported-path verdict is proven.
- The change widens unsupported behavior instead of codifying the narrower contract.
- The subprocess harness weakens or regresses.
- Validation does not cover both the direct-exec seam and the pipe-close regression.

## Goals
- Prove the supported invocation surface.
- Keep implementation minimal and local to the direct-exec seam.
- Preserve truthful subprocess smoke coverage.
- Leave a clear docs/workpad/PR evidence trail.

## Non-Goals
- `CO-114` wall-time work.
- `bin/codex-orchestrator.ts` changes.
- Timeout inflation or regression masking.
- Generic wrapper cleanup.

## Design
- Supported-path proof:
  - treat `package.json` `scripts`, `bin`, and `files` declarations as the authoritative shipped-surface contract
  - confirm repo-local review still runs `scripts/run-review.ts` directly
  - confirm packaged review still reaches `dist/scripts/run-review.js` through `codex-orchestrator review`
  - confirm no user-facing docs advertise a standalone `run-review` bin
- Accepted implementation:
  - export `isDirectExecution(...)` from `scripts/run-review.ts`
  - keep its current realpath-first contract and add a concise comment explaining why it intentionally remains stricter than `bin/codex-orchestrator.ts`
  - add a focused regression in `tests/run-review.spec.ts` that proves:
    - the direct script path is accepted
    - the canonical realpath still matches when `metaUrl` is canonical and the invoked path is a symlink
    - a symlink-preserved `metaUrl` stays rejected
  - keep `does not crash when stdout pipe closes early` unchanged as the subprocess smoke

## Implementation Surface
- Expected codepaths:
  - `scripts/run-review.ts`
  - `tests/run-review.spec.ts`
  - `package.json`
  - `orchestrator/src/cli/reviewCliLaunchShell.ts`
  - `orchestrator/tests/ReviewCliLaunchShell.test.ts`
- Expected evidence:
  - supported-path verdict note in `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260410T102625Z-supported-path-verdict.md`
  - docs-review fallback note in `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260410T002313Z-docs-review-fallback.md`
  - focused regression coverage in `tests/run-review.spec.ts`

## Protected Expectations
- Preserve the supported repo-local `npm run review` workflow.
- Preserve packaged `codex-orchestrator review` launch behavior.
- Preserve the existing subprocess smoke coverage for `stdout pipe closes early`.
- Keep the docs/workpad verdict explicit that symlink-preserved direct `run-review` exec is unsupported today.

## Reject These Wrong Interpretations
- "reopen the CO-114 timing lane"
- "fix this by changing the CLI bin"
- "increase timeout or remove the pipe-close regression"
- "assume any shipped JS file is a supported installed entrypoint"

## Current Truth
- `package.json` declares `review: "node --loader ts-node/esm scripts/run-review.ts"`.
- `package.json` publishes `dist/scripts/run-review.js` in `files`, but only `codex-orchestrator` / `codex-orch` in `bin`.
- `orchestrator/src/cli/reviewCliLaunchShell.ts` resolves review mode to the direct source or dist helper path.
- `orchestrator/tests/ReviewCliLaunchShell.test.ts` already locks those direct source/dist launch paths.
- `scripts/run-review.ts` now exports `isDirectExecution(...)` and documents why the stricter contract is intentional.
- `tests/run-review.spec.ts` now covers direct-path success plus symlink-preserved rejection, while preserving the pipe-close subprocess smoke.

## Proposed Design
- No broader runtime parity widening ships in this lane.
- The lane closes by making the narrower supported contract explicit in tests and docs.
- If a future lane introduces a supported standalone `run-review` symlink-preserved entrypoint, that lane can widen `isDirectExecution(...)` with evidence and add the corresponding subprocess-safe regression coverage.

## Deferred Scope (Reiterated)
- `CO-114` performance work.
- `bin/codex-orchestrator.ts` changes.
- Generic standalone-review wrapper refactors.
- Timeout inflation or regression masking.

## Validation Plan
- `linear child-stream --pipeline docs-review --stream co-127-docs-review`
- Focused supported-path proof capture
- `npx vitest run --config vitest.config.core.ts orchestrator/tests/ReviewCliLaunchShell.test.ts tests/run-review.spec.ts`
- Required repo validation floor before review handoff
- Standalone review, then elegance review

## Approvals
- Reviewer: `codex-orchestrator docs-review (failed-other, manual fallback accepted)`
- Date: 2026-04-10
- Manifest: `.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d-co-127-docs-review/cli/2026-04-10T00-23-13-717Z-acc886f4/manifest.json`
