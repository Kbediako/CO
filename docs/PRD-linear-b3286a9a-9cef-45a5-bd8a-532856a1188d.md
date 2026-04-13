# PRD - CO: harden run-review direct-exec symlink handling without regressing subprocess harnesses

## Added by Bootstrap 2026-04-12

## Traceability
- Linear issue: `CO-127` / `b3286a9a-9cef-45a5-bd8a-532856a1188d`
- Linear URL: https://linear.app/asabeko/issue/CO-127/co-harden-run-review-direct-exec-symlink-handling-without-regressing
- Source issue: `CO-114` / `54387f04-30aa-436a-9901-690c0e9cfcee`
- Prior rework PR: `#402` / `https://github.com/Kbediako/CO/pull/402` (closed on 2026-04-11 before merge)

## Summary
- Problem Statement: `scripts/run-review.ts` still used a stricter direct-execution guard than `bin/codex-orchestrator.ts` under `NODE_OPTIONS=--preserve-symlinks-main`, and current `main` reproduced a real silent no-op when the helper was invoked through a same-directory symlink. The product surface is still narrower than the CLI bin surface because there is no installed standalone `run-review` bin, but the helper direct-exec seam itself was still worth hardening.
- Desired Outcome: keep the product-surface docs truthful about the absence of an installed `run-review` bin, while landing the bounded direct-exec hardening in `scripts/run-review.ts` and preserving the subprocess harness.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete CO-127 from a clean rework reset, use the current tree rather than the closed PR as truth, prove whether a supported symlink-preserved `run-review` path exists, and keep the `stdout pipe closes early` regression truthful and green.
- Success criteria / acceptance:
  - prove whether a supported symlinked `run-review` entrypoint exists today for repo-local or packaged workflows
  - implement the bounded direct-exec fix now that current-main repro shows the seam is still worth hardening
  - add focused regression coverage for the supported direct-exec path and any newly supported symlink-preserved path
  - re-run focused validation showing `tests/run-review.spec.ts`, especially `does not crash when stdout pipe closes early`, stays green
  - record the supported-path verdict and validation evidence in the issue workpad and handoff notes
- Constraints / non-goals:
  - do not reopen CO-114 wall-time scope
  - do not change `bin/codex-orchestrator.ts`
  - do not weaken, delete, or mask the `stdout pipe closes early` subprocess regression
  - do not assume a supported symlink-preserved `run-review` entrypoint exists without proving the actual path first

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
  - `scripts/run-review.ts`
  - `dist/scripts/run-review.js`
  - `bin/codex-orchestrator.ts`
  - `tests/run-review.spec.ts`
  - `orchestrator/src/cli/reviewCliLaunchShell.ts`
- Nearby wrong interpretations to reject:
  - reopen the CO-114 performance lane
  - make the issue disappear by changing `bin/codex-orchestrator.ts` again
  - hide the seam by inflating timeouts or weakening the subprocess harness
  - treat any shipped JS file under `files` as proof of a supported installed bin surface

## Parity / Alignment Matrix
- Current truth:
  - `bin/codex-orchestrator.ts` already treats resolved and realpath entry URLs as direct execution.
  - `scripts/run-review.ts` now treats resolved and realpath entry URLs as direct execution, closing the reproduced same-directory symlink no-op without widening the installed product surface.
  - `package.json` exposes only `codex-orchestrator` / `codex-orch` in `bin`, while `review` still runs `node --loader ts-node/esm scripts/run-review.ts`.
  - packaged review still resolves source/dist helper execution through `orchestrator/src/cli/reviewCliLaunchShell.ts`.
- Reference truth:
  - `7fd6aa427` fixed the CLI-bin direct-exec seam under `--preserve-symlinks-main`.
  - `tests/run-review.spec.ts` is the truthful subprocess-harness baseline and must stay authoritative.
- Target truth / intended delta:
  - the supported `run-review` surface is explicit on current main
  - the chosen direct-exec behavior is locked by focused regression coverage
  - any hardening remains bounded and does not regress the subprocess harness
- Explicitly out-of-scope differences:
  - CO-114 timing work
  - unrelated provider-worker or merge-handoff behavior
  - new user-facing bins or wrapper features

## Not Done If
- The lane only restates the old review comment without proving the current supported invocation path.
- The chosen fix widens unsupported behavior or regresses `tests/run-review.spec.ts`.
- The direct-exec seam is changed without focused before/after validation on both the seam and the `stdout pipe closes early` regression.
- The workpad and docs packet do not record the supported-path verdict and current validation state.

## Goals
- Prove the actual supported `run-review` entrypoints on current `origin/main`.
- Keep the final change bounded to the direct-exec seam, its focused tests, and the required docs/evidence surfaces.
- Preserve truthful subprocess-harness coverage.

## Non-Goals
- Reopening CO-114 wall-time work.
- Editing `bin/codex-orchestrator.ts`.
- Weakening or deleting the existing pipe-close regression.
- Broad standalone-review wrapper refactors unrelated to this seam.

## Stakeholders
- Product: CO maintainers and operators who need a truthful closeout for the rereviewed seam.
- Engineering: review-wrapper, CLI, and test-harness maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - supported repo-local and packaged `run-review` entrypoints are explicit and evidenced
  - the chosen resolution is covered by focused regression tests
  - the existing subprocess smoke remains green
- Guardrails / Error Budgets:
  - preserve supported `npm run review` behavior
  - preserve packaged `codex-orchestrator review` behavior
  - keep the diff bounded and auditable
  - fail closed rather than silently broadening unsupported surfaces

## User Experience
- Personas:
  - maintainers evaluating whether the rereviewed seam is real on supported paths
  - operators using standalone review through repo-local or packaged entrypoints
- User Journeys:
  - repo-local `npm run review` keeps working as before
  - packaged `codex-orchestrator review` keeps resolving the direct helper path correctly
  - reviewers can see whether symlink-preserved direct `run-review` execution is supported or intentionally rejected

## Technical Considerations
- Architectural Notes:
  - this lane is a narrow direct-exec seam investigation and repair, not a wrapper redesign
  - the final implementation decision should follow the proved supported surface rather than symmetry for symmetry's sake
- Dependencies / Integrations:
  - `scripts/run-review.ts`
  - `tests/run-review.spec.ts`
  - `package.json`
  - `orchestrator/src/cli/reviewCliLaunchShell.ts`
  - `orchestrator/tests/ReviewCliLaunchShell.test.ts`

## Open Questions
- Resolved: there is no installed standalone `run-review` bin today; official flows remain `codex-orchestrator review` and the repo-local `npm run review` alias.
- Resolved: the bounded candidate-url hardening stays within the subprocess-harness budget on focused validation.

## Approvals
- Product: Self-approved against the Linear issue contract.
- Engineering: Docs-review child stream and parent standalone review both reached clean success on the refreshed packet.
- Design: Not applicable.
