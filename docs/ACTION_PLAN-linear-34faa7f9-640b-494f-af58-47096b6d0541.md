# ACTION_PLAN - CO-491 retained released/not_active canceled metadata refresh

## Summary
- Goal: refresh stale retained released/not_active metadata when live Linear reports a terminal/canceled transition.
- Scope: provider-intake refresh logic, focused tests, docs packet, validation, PR handoff.
- Assumptions:
  - CO-470 is already `Duplicate` / `canceled`; this lane does not reopen or mutate it.
  - Persisted blocker-edge truth can safely act as a hint to re-read live Linear, not as the final same-issue metadata authority.
  - Still-open released/not_active recovery semantics remain required.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-292`
  - `CO-470`
  - `Duplicate/canceled`
  - `provider-intake-state.json`
  - retained `released` / `provider_issue_released:not_active` row
  - `issue_state=Blocked`
  - `issue_state_type=started`
  - `issue_updated_at` stale
  - live Linear `issue-context`
  - fresh blocker-edge truth
- Not done if:
  - retained released/not_active rows can keep stale started-state metadata after live Linear reports terminal/canceled
  - consumers can count those rows as active blockers without degraded marker or live-source refresh attempt
  - fix only handles CO-470
  - CO-459 or CO-476 scope is absorbed
- Pre-implementation issue-quality review:
  - CO-491 is concrete and narrow: repair a metadata refresh recurrence, not a projection or timeout owner.
  - The micro-task path is unavailable because exact provider-intake stale/cache semantics and adjacent-owner boundaries define correctness.
- Fallback / refactor decision:
  - `remove fallback`: stale terminal/canceled retained metadata must no longer be retained as started-state truth.
  - `justify retaining fallback`: still-open released/not_active recovery remains in scope only to preserve existing behavior.
- Large-refactor decision: not required; this lane makes one bounded provider-intake refresh correction without adding a parallel authority surface.
- Minor-seam decision: acceptable because persisted blocker-edge truth remains a refresh hint and live issue-by-id remains final authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Retained terminal/canceled metadata | Cached retained row can continue carrying stale started-state fields after dependent blocker truth reports terminal/canceled | `remove fallback` | CO-491 | Retained released/not_active claim disagrees with persisted or fresh blocker-edge terminal metadata. | 2026-05-02 | 2026-05-02 | This issue | Live source refresh updates or degrades the retained row. | Focused persisted blocker-edge regression. |
| Still-open released/not_active recovery | Retained released/not_active rows for still-open issues remain eligible for existing recovery/recheck semantics | `justify retaining fallback` | Provider-intake control-host | Live issue remains non-terminal or fresh truth is unavailable/inconclusive. | Existing CO-292-era behavior | 2026-05-02 | Existing provider-intake policy | Separate owner decides removal. | Existing retained released/not_active recovery coverage remains green. |

- Contract name: Still-open released/not_active recovery.
- Owning surface: Provider-intake control-host retained released/not_active recovery.
- Steady-state proof: existing retained released/not_active recovery coverage remains green.
- Tests/docs: `orchestrator/tests/ProviderIssueHandoff.test.ts -t "retained released"` and the CO-491 packet.
- Non-expiring rationale: still-open released/not_active recovery is durable provider-intake behavior, not a temporary fallback.

This parity matrix keeps the CO-491 packet boundaries reviewer-visible across the current incident, the CO-292 reference contract, and the target fix.

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| `CO-292` | Done recurrence source | Retained released/not_active metadata must refresh from live truth | Preserve as reference only, not active scope |
| `CO-470` | Incident row is `Duplicate` / `canceled` live | Terminal/canceled issue metadata is not active work | Use as fixture shape without reopening or special-casing |
| `provider-intake-state.json` | Retained row can keep stale started metadata | Raw intake must converge or degrade when live truth differs | Refresh retained metadata through live issue-by-id |
| retained `provider_issue_released:not_active` row | `issue_state=Blocked`, `issue_state_type=started`, stale `issue_updated_at` | Retained row remains released but not active if terminal/canceled | Preserve released reason while updating same-issue metadata |
| live Linear `issue-context` | CO-470 reports terminal/canceled | Live source is final same-issue authority | Direct refresh supplies final title/state/type/updated fields |
| fresh blocker-edge truth | Dependent CO-460 edge already sees `Duplicate` / `canceled` | Edge truth can reveal disagreement | Treat edge truth as refresh hint only |
| adjacent owners | CO-459 and CO-476 remain separate | Projection/timeout owners stay out of CO-491 | No top-level projection or timeout widening |

## Milestones & Sequencing
1. Establish workflow state, workpad, decomposition matrix, and same-issue docs child-lane evidence.
2. Refresh docs packet against live CO-491 issue contract.
3. Inspect retained released/not_active refresh flow and existing tests.
4. Add focused regression for stale same-issue retained row plus persisted dependent blocker-edge `Duplicate` / `canceled` truth.
5. Implement smallest refresh-path change so persisted blocker-edge disagreement triggers live issue refresh.
6. Run focused tests and update task checklist/workpad.
7. Run required repo validation, then run manifest-backed review with `TASK=<task-id> NOTES="..." MANIFEST=<path> codex-orchestrator review --manifest <path>` or the repo wrapper equivalent that records the same manifest evidence, and complete the elegance/minimality pass.
8. Open or update PR, attach it to CO-491, merge latest `origin/main`, wait for PR checks and `ready-review` drain, verify unresolved actionable threads are `0` or record an explicit waiver, then hand off to review state.

## Dependencies
- Linear issue-context for CO-491 and practical live/current-main status checks.
- Existing provider-intake claim metadata and blocker-edge types.
- Adjacent owners:
  - CO-459 for stale top-level provider_intake projection
  - CO-476 for `/ui/data` timeout work
  - CO-470 remains incident evidence, not an implementation owner

## Validation
- Checks / tests:
  - focused ProviderIssueHandoff test for persisted blocker-edge terminal/canceled disagreement
  - retained released/not_active regression cluster
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed review via `TASK=<task-id> NOTES="..." MANIFEST=<path> codex-orchestrator review --manifest <path>` or equivalent wrapper evidence
  - elegance/minimality review
  - `npm run pack:smoke` if required by touched CLI/package surface
- Pre-merge/review-handoff condition:
  - unresolved actionable review threads must be `0`, or a waiver with owner, expiry, reason, and evidence must be recorded before merge/handoff
- Rollback plan:
  - Revert providerIssueHandoff/test changes if focused regression or retained recovery behavior fails.
  - Move unrelated projection/timeout debt to the canonical adjacent owner instead of widening this lane.

## Risks & Mitigations
- Risk: stale persisted blocker-edge metadata is treated as final authority.
  - Mitigation: use it only to permit/trigger live Linear issue refresh; update same-issue metadata from live source truth.
- Risk: still-open released/not_active recovery regresses.
  - Mitigation: run existing nearby retained released/not_active tests and default test suite.
- Risk: CO-459/CO-476 adjacent debt appears in validation.
  - Mitigation: file/reuse follow-up owner with canonical key rather than broadening CO-491.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-02.
