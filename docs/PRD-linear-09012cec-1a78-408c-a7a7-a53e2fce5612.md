# PRD - CO validation: stabilize unrelated provider-worker full-suite blockers surfaced during CO-164

## Added by Bootstrap 2026-04-13

## Traceability
- Linear issue: `CO-165` / `09012cec-1a78-408c-a7a7-a53e2fce5612`
- Linear URL: https://linear.app/asabeko/issue/CO-165/co-validation-stabilize-unrelated-provider-worker-full-suite-blockers
- Source issue: `CO-164` / `abca2add-198d-40a6-b1c0-35e49f4c78cd`
- Source packet reference: issue description cites a CO-164 packet, but that exact path is not present in this working tree snapshot.
- Source workpad: `out/linear-abca2add-198d-40a6-b1c0-35e49f4c78cd/manual/workpad.md`

## Summary
- Problem Statement: CO-164 surfaced two unrelated provider-worker full-suite failures during the required `npm run test` floor, leaving provider-worker validation unable to tell whether the blocker is live, local-only, or repo-wide. The named failures are in `ProviderIssueHandoffAdmissionCache.test.ts` and `ProviderLinearWorkerRunner.test.ts`, and the current workspace also contains a one-line syntax regression in `providerIssueHandoff.ts` that currently breaks the source-loaded helper bootstrap and may overlap the admission-cache surface.
- Desired Outcome: re-establish a truthful provider-worker validation baseline by reproducing or truthfully non-reproducing the named failures with exact evidence, landing the smallest fix the current tree actually needs, and avoiding any reopen of CO-164 control-host cleanup scope.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete CO-165 in the current workspace by treating the two named provider-worker suite failures as the canonical scope, restoring exact reproducibility and validation truthfulness, and keeping the workflow artifacts current in Linear without broadening into generic timeout tuning or a CO-164 cleanup redo.
- Success criteria / acceptance:
  - reproduce or truthfully non-repro both named failing suites with exact commands and output capture
  - land the smallest fix that restores those suites and a truthful `npm run test` baseline without weakening behavior or hiding failures
  - keep the Linear workpad, docs packet, and validation story explicit about whether the blocker is local, live, or no longer reproducible
- Constraints / non-goals:
  - do not reopen CO-164 control-host cleanup semantics
  - do not weaken `ProviderIssueHandoffAdmissionCache` or `ProviderLinearWorkerRunner` behavior just to make tests pass
  - do not hide failures with skips, retries, or looser gates

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `ProviderIssueHandoffAdmissionCache`
  - `ProviderLinearWorkerRunner`
  - `unrelated provider-worker full-suite blocker`
  - `truthful validation baseline`
- Protected terms / exact artifact and surface names:
  - `npm run test`
  - `orchestrator/tests/ProviderIssueHandoffAdmissionCache.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- Nearby wrong interpretations to reject:
  - reopen CO-164 generic forced cleanup
  - treat this as blanket test-timeout tuning
  - suppress failures with skips or relaxed assertions
  - call the current workspace healthy while the source-loaded helper bootstrap is still broken

## Parity / Alignment Matrix
- Current truth:
  - the issue names two provider-worker suite failures discovered from the repo-wide `npm run test` floor during CO-164 validation
  - the current workspace is on branch `linear/co-165-provider-worker-full-suite-blockers`
  - a one-line missing brace in `orchestrator/src/cli/control/providerIssueHandoff.ts` currently breaks TypeScript parsing and prevents the source-loaded `bin/codex-orchestrator.js` wrapper from booting
  - there is no attached PR and no existing workpad comment on the live Linear issue as of the initial issue-context read
- Reference truth:
  - CO-164 remained bounded to `controlHostSupervisionCliShell.ts` plus focused cleanup coverage
  - provider-worker handoff requires a truthful repo-wide validation story rather than partial or implied success
  - the issue packet already rejects broad timeout tuning, behavioral weakening, and hidden failures
- Target truth / intended delta:
  - exact current-tree reproduction evidence for the two named failing suites
  - the smallest current-tree repair needed for those provider-worker seams, if any
  - a clean or narrowly-audited `npm run test` result that provider-worker closeout can report truthfully
- Explicitly out-of-scope differences:
  - new control-host cleanup behavior changes unrelated to the named provider-worker blocker
  - permanent validation downgrades or skip-based closeout
  - unrelated provider-worker or control-host refactors beyond the reproduced blocker seam

## Not Done If
- `npm run test` still fails in either `ProviderIssueHandoffAdmissionCache.test.ts` or `ProviderLinearWorkerRunner.test.ts`.
- The failures are merely suppressed without a root-cause-backed explanation.
- The final validation story is still ambiguous about whether the blocker is local to this branch or still repo-wide.

## Goals
- Reproduce or truthfully non-repro the named provider-worker failures with exact commands and saved output.
- Repair the smallest current-tree seam necessary to restore truthful provider-worker validation.
- Preserve explicit reporting about the difference between local workspace breakage and the issue’s named blocker surfaces.

## Non-Goals
- Reopening CO-164 control-host cleanup scope.
- Broad runtime or timeout retuning unrelated to the named provider-worker surfaces.
- Validation shortcuts that hide failures instead of explaining them.

## Stakeholders
- Product: CO operators who rely on provider-worker closeout evidence before review handoff.
- Engineering: provider-worker, provider-issue handoff, and validation harness maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - both named suite outcomes are captured with exact commands and evidence
  - the final current-tree fix surface is minimal and directly tied to reproduced failures
  - provider-worker closeout regains a truthful `npm run test` story
- Guardrails / Error Budgets:
  - no false-green full-suite claims
  - no hidden failures behind weaker gates
  - no reopening of CO-164 cleanup semantics without new evidence

## User Experience
- Personas:
  - provider-worker operators who need truthful issue closeout evidence
  - maintainers diagnosing whether provider-worker failures are live regressions or local-only breakage
- User Journeys:
  - a worker reruns the named suites and knows whether the failures are real on the current tree
  - review handoff can trust the repo-wide validation outcome without guessing whether earlier blocker reports are still live

## Technical Considerations
- Architectural Notes:
  - prefer one shared provider-worker timing or state-management fix if both failures converge on the same seam
  - if the issue report no longer reproduces, prefer a truthful no-fix or narrower-fix closeout over speculative timeout tuning
  - the source-loaded helper bootstrap failure must be accounted for because it blocks the instructed Linear workflow path and the normal TypeScript-backed validation loop
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderIssueHandoffAdmissionCache.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/ProviderWorkflowConfigStore.test.ts`
  - packaged Linear helper workflow / single workpad contract

## Open Questions
- Whether the current missing-brace syntax regression is simply local residue or part of the current admission-cache blocker seam.
- Whether the two named failures share a single provider-worker timing/state root cause or require separate fixes.

## Approvals
- Product: Self-approved for docs-first investigation start against the issue contract.
- Engineering: Pre-implementation packet drafted; audited docs-review, exact reproductions, final validation, and review/elegance gates remain pending.
- Design: Not applicable.
