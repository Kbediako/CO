# ACTION_PLAN - Coordinator Live Provider Child-Run Task Identity and Delegation Guard Contract Alignment

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Unblock live provider-started child runs by aligning fallback task identity with strict `delegation-guard` semantics and proving the fix in the current live provider environment.
- Scope: docs-first lane registration, pre-implementation docs review, one narrow provider/guard contract fix, focused regressions, required repo validation, live rerun, and PR-to-merge closeout.
- Assumptions:
  - provider setup, webhook acceptance, and provider-intake claim flow are already live enough to reuse
  - the first blocker after `1304` is the current `stage:delegation-guard:failed` stop

## Milestones & Sequencing
1) Register `1305` docs, mirrors, registry entries, and task snapshot; truth-sync the predecessor docs that now point at this follow-up.
2) Run docs-review for `1305`, then finalize the sanctioned provider-run contract from the evidence and code inspection.
3) Implement the smallest guard-compatible fix plus focused tests.
4) Run the required validation floor, then rerun the live provider path until the child run clears `delegation-guard` or a new exact blocker appears.
5) Run explicit post-implementation review/elegance, open the PR, handle feedback/checks to terminal state, merge, and return the checkout to clean `main`.

## Dependencies
- Existing persistent `control-host` runtime and live provider env
- `provider-intake-state.json`, `linear-advisory-state.json`, and child-run manifests from the current live rerun
- current guard and provider handoff code paths

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - explicit elegance review pass
- Rollback plan:
  - revert the narrow provider/guard contract change if focused tests or live rerun show widened delegation bypass
  - keep the current provider-intake/runtime surfaces intact and report the blocker exactly if live validation exposes a different failure after guard pass

## Risks & Mitigations
- Risk: a too-broad guard exemption accidentally weakens top-level task enforcement.
  - Mitigation: bind the exemption to control-host launch provenance plus a matching provider-intake claim for the current provider fallback contract, and require manifest-path continuity once the claim knows the concrete run path.
- Risk: a new downstream failure appears after the child run clears `delegation-guard`.
  - Mitigation: stop at the first new blocker and record exact manifest/log evidence instead of broadening scope.

## Approvals
- Reviewer: Codex docs-review approved on 2026-03-19. Evidence: `.runs/1305-coordinator-live-provider-child-run-task-identity-and-delegation-guard-contract-alignment/cli/2026-03-19T14-17-56-695Z-cbfe549d/manifest.json`
- Date: 2026-03-19
