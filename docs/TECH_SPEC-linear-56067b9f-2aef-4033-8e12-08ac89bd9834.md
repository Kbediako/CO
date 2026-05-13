---
id: 20260401-linear-56067b9f-2aef-4033-8e12-08ac89bd9834
title: 'CO: Restore unrelated full-suite baseline blocking CO-43 handoff'
relates_to: docs/PRD-linear-56067b9f-2aef-4033-8e12-08ac89bd9834.md
risk: high
owners:
  - Codex
last_review: 2026-04-01
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-56067b9f-2aef-4033-8e12-08ac89bd9834.md`
- PRD: `docs/PRD-linear-56067b9f-2aef-4033-8e12-08ac89bd9834.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-56067b9f-2aef-4033-8e12-08ac89bd9834.md`
- Task checklist: `tasks/tasks-linear-56067b9f-2aef-4033-8e12-08ac89bd9834.md`

## Traceability
- Linear issue: `CO-46` / `56067b9f-2aef-4033-8e12-08ac89bd9834`
- Linear URL: https://linear.app/asabeko/issue/CO-46/co-restore-unrelated-full-suite-baseline-blocking-co-43-handoff

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore or truthfully classify the unrelated branch-baseline failures blocking `CO-43` review handoff.
- Scope:
  - docs-first registration for the current Linear worker lane
  - focused reproduction of `Doctor.test.ts`, `UserConfigStageSets.test.ts`, and `cli-frontend-test.spec.ts`
  - minimal baseline repair for the still-live frontend-test fixture seam and explicit blocker ownership for the remaining full-suite quiet-tail hang
  - full-suite validation evidence plus pre-handoff review/elegance gates
- Constraints:
  - keep the lane bounded to the named suites and their direct seams
  - do not hide branch-baseline reds behind the scoped-review wrapper seam
  - keep `CO-43` feature work out of this repair lane

## Technical Requirements
- Functional requirements:
  - reproduce the current truth for the three named suites
  - identify which seams are still actively broken on this branch
  - implement the smallest truthful repair or record explicit out-of-scope ownership
  - make `npm run test` green or leave an explicit owner/waiver trail for any remaining blocker
- Non-functional requirements:
  - keep the diff reviewable and audit-friendly
  - preserve deterministic doctor, stage-set, and CLI fixture behavior
  - keep docs/workpad/checklist state synchronized with the actual lane status
- Interfaces / contracts:
  - doctor contract: `orchestrator/src/cli/doctor.ts` with `orchestrator/tests/Doctor.test.ts`
  - user config stage-set contract: `orchestrator/src/cli/config/userConfig.ts` with `orchestrator/tests/UserConfigStageSets.test.ts`
  - frontend-test CLI contract: `orchestrator/src/cli/frontendTestCliRequestShell.ts` and related command plumbing with `tests/cli-frontend-test.spec.ts`

## Architecture & Data
- Architecture / design adjustments:
  - prefer expectation corrections when current runtime behavior is intentional and already-used elsewhere
  - prefer narrow runtime or fixture fixes when the named tests expose real branch drift
  - keep unrelated validation infrastructure changes out unless they are strictly necessary to make the named baseline failures truthful
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - repo Vitest harness, provider-worker Linear workflow, and existing docs/review wrappers only

## Validation Plan
- Tests / checks:
  - audited docs-review child stream before implementation, with fallback override when the review command fails without a classified wrapper boundary
  - focused reproduction and rerun for the three named suites
  - `npm run test` on the final branch state, or explicit surviving blocker ownership when the suite output is green through the named seam but the command still hangs in the separate quiet-tail case
  - standalone review plus explicit elegance pass before any review handoff for non-trivial diffs
- Rollout verification:
  - confirm the three named suites are fixed or explicitly owned
  - confirm the final baseline status is clear enough for `CO-43` to cite this lane and the remaining owner lane instead of re-triaging the same blocker
- Monitoring / alerts:
  - keep the workpad current once Linear rate limiting clears; until then keep the local staged body and repo packet aligned

## Open Questions
- The focused reproduction is complete: only `cli-frontend-test.spec.ts` was still broken here. Final handoff still depends on the separate `CO-57` quiet-tail ownership clearing or remaining explicitly recorded.

## Approvals
- Reviewer: docs-review approved; implementation validation completed; standalone review completed clean
- Remaining: PR checks and the separate `CO-57` quiet-tail still gate review handoff
- Date: 2026-04-01
