# PRD - CO: harden run-review direct-exec symlink handling without regressing subprocess harnesses

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-127` / `b3286a9a-9cef-45a5-bd8a-532856a1188d`
- Linear URL: https://linear.app/asabeko/issue/CO-127/co-harden-run-review-direct-exec-symlink-handling-without-regressing
- Related lanes:
  - `CO-114` / `54387f04-30aa-436a-9901-690c0e9cfcee`

## Summary
- Problem Statement: the rereviewed seam is real in source, but the product surface is narrower than the comment implied. Repo-local review still runs `node --loader ts-node/esm scripts/run-review.ts`, packaged review still reaches `dist/scripts/run-review.js` through `codex-orchestrator review`, and the package exposes no standalone `run-review` bin. There is therefore no current supported symlink-preserved `run-review` entrypoint to harden.
- Desired Outcome: codify that supported-path verdict, keep the current stricter `run-review` direct-exec contract, expose the helper for focused regression coverage, and preserve the subprocess harness without widening unsupported behavior.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): close the follow-up truthfully by proving whether a supported symlink-preserved `run-review` path exists, avoid reopening `CO-114`, and keep `tests/run-review.spec.ts`, especially `does not crash when stdout pipe closes early`, green and unweakened.
- Success criteria / acceptance:
  - prove the current supported repo-local and packaged `run-review` entrypoints
  - document the verdict that no supported symlink-preserved `run-review` entrypoint exists today
  - keep supported behavior unchanged for `npm run review` and packaged `codex-orchestrator review`
  - add focused regression coverage that locks the supported direct path and explicitly leaves symlink-preserved direct exec unsupported
  - preserve the existing `does not crash when stdout pipe closes early` subprocess regression
  - record the docs-review child-stream fallback truthfully when unrelated repo-wide stale-doc debt blocks a clean docs-review pass
- Constraints / non-goals:
  - do not reopen `CO-114` timing work
  - do not change `bin/codex-orchestrator.ts`
  - do not weaken, delete, or mask the existing `stdout pipe closes early` regression
  - do not invent or advertise a new supported `run-review` symlink path that the package and docs do not actually expose

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `scripts/run-review.ts`
  - `dist/scripts/run-review.js`
  - `NODE_OPTIONS=--preserve-symlinks-main`
  - `direct-execution guard parity with bin/codex-orchestrator.ts`
  - `tests/run-review.spec.ts`
  - `does not crash when stdout pipe closes early`
- Protected terms / exact artifact and surface names:
  - `npm run review`
  - `codex-orchestrator review`
  - `package.json`
  - `bin/codex-orchestrator.ts`
  - `scripts/run-review.ts`
  - `dist/scripts/run-review.js`
  - `tests/run-review.spec.ts`
- Nearby wrong interpretations to reject:
  - "reopen the CO-114 performance lane"
  - "fix this by changing `bin/codex-orchestrator.ts` again"
  - "make the regression pass by weakening the pipe-close subprocess test"
  - "assume a supported symlinked `run-review` entrypoint exists because a JS file is shipped in `files`"

## Parity / Alignment Matrix
- Current truth:
  - `bin/codex-orchestrator.ts` already accepts symlink-preserved and realpath direct execution
  - `scripts/run-review.ts` intentionally remains stricter and only treats the supported direct source or dist path as direct execution
  - `package.json` exposes only `codex-orchestrator` / `codex-orch` in `bin`
  - `npm run review` invokes `scripts/run-review.ts` directly
  - packaged `codex-orchestrator review` launches `dist/scripts/run-review.js` directly via `orchestrator/src/cli/reviewCliLaunchShell.ts`
- Reference truth:
  - post-`7fd6aa427` CLI-bin direct-exec hardening in `bin/codex-orchestrator.ts`
  - current truthful subprocess harness in `tests/run-review.spec.ts`
  - `orchestrator/tests/ReviewCliLaunchShell.test.ts` coverage for direct source/dist review launch resolution
- Target truth / intended delta:
  - supported-path verdict is explicit: no current supported symlink-preserved `run-review` entrypoint exists
  - `scripts/run-review.ts` keeps the stricter direct-exec contract, but exports the helper so focused tests can lock that contract
  - focused regression coverage proves direct-path success and symlink-preserved direct-exec rejection without disturbing the subprocess smoke
- Explicitly out-of-scope differences:
  - broader standalone-review wrapper refactors
  - wall-time tuning
  - new package bins or operator-facing launch surfaces

## Not Done If
- The lane only repeats the review comment without proving the actual supported invocation path.
- The patch widens or advertises a new supported symlink-preserved `run-review` path without package/doc evidence.
- `tests/run-review.spec.ts` subprocess behavior regresses or `does not crash when stdout pipe closes early` gets weakened.
- The docs/workpad do not record the supported-path verdict and focused validation evidence.

## Goals
- Prove the actual supported `run-review` entrypoint posture for repo-local and packaged workflows.
- Preserve the current supported direct-path behavior.
- Add focused regression coverage for the chosen contract.
- Leave an explicit docs/workpad/PR evidence trail.

## Non-Goals
- Reopening `CO-114` timing work.
- Changing `bin/codex-orchestrator.ts`.
- Weakening or deleting `stdout pipe closes early`.
- Broad review-wrapper cleanup unrelated to this seam.

## Stakeholders
- Product: operators and reviewers who need a truthful closeout on the rereviewed seam
- Engineering: standalone-review wrapper, packaging, and test-harness maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - supported-path verdict is explicit and evidenced
  - focused regression coverage protects the chosen contract
  - `tests/run-review.spec.ts` remains green, including the pipe-close regression
- Guardrails / Error Budgets:
  - preserve current supported `npm run review` behavior
  - preserve packaged `codex-orchestrator review` launch resolution
  - preserve subprocess harness truthfulness
  - keep the diff bounded to `run-review` direct-exec handling, focused tests, and the required docs/evidence packet

## User Experience
- Personas:
  - maintainer reviewing the Codex rereview comment for `run-review`
  - operator using standalone review through supported repo-local or packaged entrypoints
- User Journeys:
  - repo-local `npm run review` behavior stays unchanged
  - packaged `codex-orchestrator review` still launches the direct dist script path
  - reviewers can confirm from docs/workpad that symlink-preserved direct `run-review` exec is unsupported rather than silently assumed

## Technical Considerations
- Architectural Notes:
  - `scripts/run-review.ts` already isolates the seam in `isDirectExecution(...)`
  - `bin/codex-orchestrator.ts` remains the parity reference only; this lane does not copy its wider product behavior because the supported `run-review` surface is narrower
  - the lowest-risk change is to export `isDirectExecution(...)`, add a concise contract comment, and add focused regression coverage while leaving the end-to-end subprocess smoke untouched
- Dependencies / Integrations:
  - `package.json`
  - `scripts/run-review.ts`
  - `tests/run-review.spec.ts`
  - `orchestrator/src/cli/reviewCliLaunchShell.ts`
  - `orchestrator/tests/ReviewCliLaunchShell.test.ts`

## Open Questions
- Resolved: `dist/scripts/run-review.js` is a shipped implementation artifact behind `codex-orchestrator review`, not a standalone installed bin.
- Resolved: the bounded truthful change is to export `isDirectExecution(...)` for direct regression coverage rather than widen runtime behavior.

## Approvals
- Product: self-approved from the Linear issue scope
- Engineering: `codex-orchestrator docs-review` child stream ran and failed only on unrelated repo-wide stale-doc baseline; manual fallback accepted with manifest `.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d-co-127-docs-review/cli/2026-04-10T00-23-13-717Z-acc886f4/manifest.json`
- Design: N/A
