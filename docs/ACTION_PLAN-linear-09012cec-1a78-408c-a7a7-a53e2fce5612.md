# ACTION_PLAN - CO validation: stabilize unrelated provider-worker full-suite blockers surfaced during CO-164

## Added by Bootstrap 2026-04-13

## Summary
- Goal: restore a truthful provider-worker full-suite validation baseline for CO-165 by reproducing the named provider-worker blockers on the current tree and applying the smallest repair they actually require.
- Scope: docs-first packet, live issue/workpad upkeep, audited docs-review delegation, focused provider-suite reproduction, minimal code repair, and final validation/review gates.
- Assumptions:
  - the issue’s two named suites remain the canonical blocker scope
  - the current missing-brace syntax regression in `providerIssueHandoff.ts` must be addressed or cleanly accounted for before normal reproduction and validation can proceed
  - provider-worker closeout truthfulness is stricter than simply making isolated tests pass

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `ProviderIssueHandoffAdmissionCache`, `ProviderLinearWorkerRunner`, `unrelated provider-worker full-suite blocker`, `truthful validation baseline`, `npm run test`, `orchestrator/tests/ProviderIssueHandoffAdmissionCache.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- Not done if:
  - either named provider-worker suite still fails without a root-cause-backed explanation
  - the final `npm run test` result is still ambiguous for provider-worker closeout
  - the lane widens into CO-164 cleanup semantics or generic timeout tuning
- Pre-implementation issue-quality review:
  - the issue packet is already sufficiently explicit; the next step is current-tree evidence and a bounded repair, not more abstract planning

## Milestones & Sequencing
1. Draft the CO-165 docs packet, update registry mirrors, create the local workpad source, and keep the issue/workpad workflow aligned with the live Linear state.
2. Record exactly one current-turn same-issue parallelization decision and move the issue from `Ready` to `In Progress` before active coding.
3. Run an audited `docs-review` child stream for the fresh packet and record its manifest-backed outcome.
4. Reproduce the named provider-worker suites and inspect the current provider-worker diffs, including the source-bootstrap syntax break in `providerIssueHandoff.ts`.
5. Land the smallest fix, rerun the focused suites plus `npm run test`, then complete the required validation floor and standalone/elegance review before any handoff.

## Dependencies
- `skills/linear/SKILL.md`
- `skills/land/SKILL.md` if the issue later reaches `Merging`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/ProviderIssueHandoffAdmissionCache.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/ProviderWorkflowConfigStore.test.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused `npx vitest run orchestrator/tests/ProviderIssueHandoffAdmissionCache.test.ts`
  - focused `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review plus explicit elegance review before handoff when the diff is non-trivial
- Rollback plan:
  - revert only the bounded provider-worker repair if broader validation regresses, while retaining the reproduction evidence and updated issue documentation

## Risks & Mitigations
- Risk: the current syntax regression is local residue rather than the original issue’s live blocker.
  - Mitigation: repair it minimally, then reproduce the two named suites directly rather than assuming it explains the full issue.
- Risk: the two failures overlap but tempt broad provider-worker refactors.
  - Mitigation: constrain changes to the smallest shared seam the reproductions support.
- Risk: Linear workflow helpers remain blocked by the source-loaded bootstrap failure.
  - Mitigation: use the built `dist` CLI only as a temporary workflow fallback, keep that limitation explicit, and return to the normal source-loaded path once parsing is healthy.

## Approvals
- Reviewer: Self-approved for docs-first execution; docs-review, exact reproduction evidence, and final validation/review gates still pending.
- Date: 2026-04-13
