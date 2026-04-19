# ACTION_PLAN - Control host / CO STATUS: prevent top-level tracked.linear from leaking stale linear-advisory fallback truth

## Added by Docs Child Lane 2026-04-18

## Summary
- Goal: give the parent lane a bounded implementation plan for the CO-223 top-level tracked fallback leak where stale advisory `CO-1` truth outranks current dispatch/intake `CO-196` truth.
- Scope: this child lane creates the docs-first packet and registry/checklist mirrors only; parent owns implementation, focused tests, docs-review, validation, Linear/workpad state, review, PR, merge, and any archive-supported `docs/TASKS.md` update.
- Assumptions:
  - the authoritative issue wording is the verbatim CO-223 prompt captured in the PRD
  - `controlRuntime.ts` currently falls back from `selected?.tracked` to advisory-state `tracked_issue`
  - `selectedRunProjection.ts` can seed projection context from advisory-state tracked snapshots
  - persisted `linear-advisory-state.json` is meant to be bounded fallback, not stale pseudo-current truth

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `tracked.linear`
  - `tracked.linear.identifier`
  - `tracked_issue.identifier`
  - `linear-advisory-state.json`
  - `controlRuntime.ts`
  - `selectedRunProjection.ts`
  - `observabilityReadModel.ts`
  - `co-status`
  - `/api/v1/state`
  - `/ui/data.json`
  - `CO-196`
  - `CO-1`
  - `CO-219`
  - `CO-220`
  - `CO-222`
- Not done if:
  - top-level `tracked.linear` still leaks stale `CO-1` while current dispatch/intake truth already points at `CO-196`
  - only one surface is fixed while another still leaks stale tracked truth
  - the change hides the bug by deleting useful current tracked data instead of preferring truthful current state
- Pre-implementation issue-quality review:
  - 2026-04-18: child-lane review confirms this is a narrow tracked-authority precedence lane, not a generic dispatch-selection redesign. The missing shared source payload is explicitly recorded; the packet is anchored on the verbatim CO-223 issue prompt recovered via read-only Linear fetch and on the current repo seams in `controlRuntime.ts` and `selectedRunProjection.ts`. The micro-task path is ineligible because correctness depends on exact protected seams, exact cross-surface alignment, and exact separation from `CO-219`, `CO-220`, and `CO-222`.

## Milestones & Sequencing
1. Child lane drafts the `CO-223` PRD, TECH_SPEC mirror pair, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json` entry, and docs-freshness registry entries inside the declared file scope.
2. Parent accepts the packet and inspects the current top-level tracked fallback chain from `controlRuntime.ts` through `selectedRunProjection.ts` and persisted `linear-advisory-state.json`.
3. Parent reproduces the stale split where live dispatch/intake truth is current but top-level tracked fallback still reports historical `CO-1`.
4. Parent implements the smallest authority-precedence or fail-closed null repair that keeps `tracked.linear` truthful without widening into generic dispatch redesign unless required.
5. Parent adds focused regressions that distinguish this bug from `CO-219`, `CO-220`, and `CO-222`.
6. Parent validates that `co-status`, `/api/v1/state`, and `/ui/data.json` stay aligned for the repaired tracked contract.

## Dependencies
- Shared source anchor: `ctx:sha256:ff78d09226d759620c87d1f1ae2de5782e81e7eda07b01112ef35807344be9b1#chunk:c000001`
- Origin manifest: `.runs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f-co223-docs-packet/cli/2026-04-17T18-00-08-729Z-4c76d75d/manifest.json`
- Verbatim issue prompt recovered via read-only Linear fetch because the expected shared source payload is absent in this checkout
- Current repo seams:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`

## Validation
- Checks / tests:
  - child lane: `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - child lane: protected-term grep across the touched packet files
  - child lane: `git diff --check -- <touched packet and registry files>`
  - parent lane: focused `ControlRuntime` regression for stale advisory tracked fallback
  - parent lane: focused `SelectedRunProjection` regression for tracked-issue authority precedence
  - parent lane: aligned `co-status`, `/api/v1/state`, and `/ui/data.json` verification
  - parent lane: docs-review and `node scripts/spec-guard.mjs --dry-run`
- Rollback plan:
  - revert the tracked-authority repair if it hides useful current tracked data or causes cross-surface divergence
  - preserve bounded advisory fallback behavior for genuinely no-authority cases

## Risks & Mitigations
- Risk: the repair overcorrects by deleting useful current tracked truth.
  - Mitigation: require explicit preference for current dispatch/intake truth before any empty/null fallback.
- Risk: only one surface is patched while another still leaks stale tracked truth.
  - Mitigation: keep one shared tracked contract across `co-status`, `/api/v1/state`, and `/ui/data.json`.
- Risk: the lane drifts into generic dispatch selection redesign.
  - Mitigation: keep the packet’s rejection language explicit and require parent evidence before widening beyond the named seams.
- Risk: `docs/TASKS.md` remains untouched in this child lane because it is already at the `450`-line cap.
  - Mitigation: record the omission explicitly and leave any archive-supported update to the parent lane.

## Approvals
- Reviewer: pending parent implementation and docs-review.
- Date: 2026-04-18.
