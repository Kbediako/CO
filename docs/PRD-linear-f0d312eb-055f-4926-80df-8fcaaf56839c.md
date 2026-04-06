# PRD - CO workflow: unblock repo-wide spec/docs freshness review blockers

## Added by Bootstrap 2026-04-06

## Summary
- Problem Statement: active CO review handoffs were blocked by repo-wide docs/spec freshness drift on clean `main`, with `Spec guard` failing on stale 2026-03-06 task specs (`1001`, `1009`-`1031`) and `docs:freshness` reporting a separate `stale docs: 19` registry cohort.
- Desired Outcome: refresh or otherwise reconcile the stale repo-wide task/spec docs surfaces so `Spec guard` and `docs:freshness` return cleanly on the current branch without weakening either guardrail or reopening unrelated CO-99 runtime telemetry scope.

## Execution Update 2026-04-06
- The exact stale split is now confirmed:
  - `Spec guard`: stale task specs `1001` and `1009`-`1031`.
  - `docs:freshness`: `.agent/SOPs/instruction-stamps.md` plus the `0932`-`0934` packet family as recorded in `docs/docs-freshness-registry.json`.
- The lane fixed the blocker at the source by refreshing the stale `last_review` values on those exact surfaces instead of changing any guardrail behavior.
- Current branch validation is green on `node scripts/spec-guard.mjs --dry-run`, `npm run docs:freshness`, `npm run docs:check`, `npm run build`, `npm run lint`, `npm run test`, and the rerun audited `docs-review` child stream.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): fix the shared repo validation blocker at the source by refreshing or reconciling the stale spec/docs packet cohort that is keeping unrelated Linear lanes from handing off cleanly.
- Success criteria / acceptance:
  - on clean current `main`, `node scripts/spec-guard.mjs --dry-run` no longer fails because of stale 2026-03-06 task specs
  - on clean current `main`, `npm run docs:freshness` no longer reports stale docs
  - the packet and workpad record exactly which stale specs/docs were refreshed, archived, or otherwise reconciled
- Constraints / non-goals:
  - do not disable, bypass, or loosen `Spec guard` or `docs:freshness`
  - do not expand back into CO-99 runtime telemetry or `refreshProviderLinearWorkerProofSnapshot`
  - keep the change bounded to the stale repo-wide docs/spec surfaces that cause review handoff blockers

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Spec guard`
  - `docs:freshness`
  - `last_review`
  - `stale docs: 19`
  - `Core Lane`
  - `review handoff blockers`
- Protected terms / exact artifact and surface names:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:freshness`
  - `tasks/specs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
  - `tasks/specs/1009-...` through `tasks/specs/1031-...`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Nearby wrong interpretations to reject:
  - the fix is to disable or weaken `Spec guard` or `docs:freshness`
  - this is only a CO-99-local problem instead of a clean-`main` repo-wide blocker
  - provider-proof runtime telemetry or unrelated app behavior should be reopened in this lane

## Parity / Alignment Matrix
- Not applicable.
- Current truth:
  - the stale `Spec guard` and `docs:freshness` cohorts have been identified exactly and refreshed on branch
  - current branch freshness gates are green again without any guardrail weakening
  - active implementation lanes are no longer blocked by this repo-wide baseline drift on the patched branch
- Reference truth:
  - a clean repo baseline should allow active lanes to hand off when their own implementation and review gates are green
- Target truth / intended delta:
  - the stale cohort is refreshed or reconciled so both freshness gates pass again on current `main`
  - the repo keeps the same strict freshness policy
  - the fix is documented as repo-wide validation hygiene rather than as a CO-99 runtime change
- Explicitly out-of-scope differences:
  - changing the meaning or thresholds of the freshness guards
  - altering unrelated implementation behavior
  - broad archival or refactor work outside the stale blocker cohort

## Not Done If
- `node scripts/spec-guard.mjs --dry-run` still fails on clean current `main` because the stale 2026-03-06 task specs were not refreshed or otherwise reconciled.
- `npm run docs:freshness` still reports stale docs on clean current `main`.
- Unrelated issue lanes remain blocked from review handoff solely because repo-wide docs/spec freshness is still red.

## Goals
- Register a docs-first packet for the CO-102 repo-wide freshness unblock lane.
- Confirm the exact stale surfaces behind `Spec guard` and `docs:freshness`.
- Refresh or reconcile the stale docs/spec cohort with the smallest truthful change set.
- Record machine-checkable validation and handoff evidence for future lanes.

## Non-Goals
- Runtime telemetry changes for CO-99.
- Guardrail weakening, waivers, or policy bypasses in place of a real freshness fix.
- Unrelated repository cleanup outside the stale blocker cohort.

## Stakeholders
- Product: CO operators and maintainers depending on truthful review handoff readiness.
- Engineering: docs/spec owners and worker lanes blocked by repo-wide freshness drift.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - `spec-guard --dry-run` passes on the current branch after the stale cohort refresh
  - `docs:freshness` passes on the current branch after the stale cohort refresh
  - the packet/workpad accurately enumerate the refreshed or reconciled surfaces
- Guardrails / Error Budgets:
  - no freshness-policy weakening
  - no false claims about the stale set without command output
  - no reopening unrelated implementation scope

## User Experience
- Personas:
  - provider workers preparing review handoff
  - maintainers who need repo-wide docs/spec hygiene to stay truthful
- User Journeys:
  - a worker completes a bounded implementation lane
  - required validation reaches the shared freshness gates
  - the lane is no longer blocked by unrelated stale specs/docs on clean `main`

## Technical Considerations
- Architectural Notes:
  - start by auditing the exact `Spec guard` and `docs:freshness` failure surfaces on the current tree
  - bias toward direct `last_review` refresh or documented archival reconciliation on the stale cohort instead of policy changes
  - keep task mirrors, docs registry, and packet mirrors aligned as the stale cohort is refreshed
- Dependencies / Integrations:
  - `scripts/spec-guard.mjs`
  - `scripts/docs-freshness.mjs`
  - `tasks/specs/**`
  - `docs/docs-freshness-registry.json`
  - `docs/TASKS.md`

## Open Questions
- None. `docs:freshness` required the separate 19-entry registry cohort rooted in `.agent/SOPs/instruction-stamps.md` and the `0932`-`0934` packet family.

## Approvals
- Product: pending
- Engineering: pending
- Design: not applicable
