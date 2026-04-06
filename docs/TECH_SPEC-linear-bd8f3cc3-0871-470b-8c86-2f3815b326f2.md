---
id: 20260406-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2
title: CO STATUS: make live attach scrolling work without accumulated full-frame history
relates_to: docs/PRD-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md
risk: high
owners:
  - Codex
last_review: 2026-04-06
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md`
- PRD: `docs/PRD-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md`
- Task checklist: `tasks/tasks-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md`

## Traceability
- Linear issue: `CO-97` / `bd8f3cc3-0871-470b-8c86-2f3815b326f2`
- Linear URL: https://linear.app/asabeko/issue/CO-97/co-status-make-live-attach-scrolling-work-without-accumulated-full
- Source issues:
  - `CO-74` / `c4c32123-af51-4552-b55a-03d17917659c`
  - `CO-67` / `f3193657-a549-43a2-8cff-50c5284df986`
  - `CO-83` / `bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: keep `co-status attach` live and scrollable while eliminating accumulated full-frame primary-scrollback history and tightening the live operator readability/truth surfaces called out in the issue.
- Scope:
  - docs-first registration for `CO-97`
  - attach live primary redraw semantics in `controlStatusDashboard.ts`
  - bounded duration/rate-limit/event/retry readability fixes on the protected `CO STATUS` surfaces
  - presenter/read-model freshness only if reproduced during validation
  - focused regressions plus real-device screenshot proof
- Constraints:
  - preserve attach as read-only
  - preserve launch-mode alternate-screen semantics
  - do not widen back into the full `CO-83` telemetry lane without new evidence

## Issue-Shaping Contract
- User-request translation carried forward:
  - keep live scrollable `CO STATUS`
  - stop accumulated duplicate full-frame history in `co-status attach`
  - keep the live surface pinned/current on `primary scrollback`
  - make countdown, rate-limit, retry, stage, and event surfaces readable and truthful enough for live debugging
- Protected terms / exact artifact and surface names:
  - `CO STATUS`
  - `co-status attach`
  - `primary scrollback`
  - `alternate screen`
  - `controlStatusDashboard.ts`
  - `coStatusAttachCliShell.ts`
  - `ControlStatusDashboard.test.ts`
  - `CoStatusAttachCliShell.test.ts`
- Nearby wrong interpretations to reject:
  - move attach back to alternate screen and call it fixed
  - treat the lane as only the old `CO-67` pause duplication bug
  - accept repeated full-screen history because attach was intentionally on primary
  - widen into full telemetry restoration without proof the remaining bug left the attach/view path
- Explicit non-goals carried forward:
  - no browser `/ui` redesign
  - no pause-first fallback as the intended operator experience
  - no broad styling churn beyond the protected readability/truth surfaces

## Parity / Alignment Matrix
- Current truth:
  - attach is live on primary but still redraws whole frames into scrollback
  - countdown, age/runtime, rate-limit, retry, and event text still carry the readability defects listed in the issue
  - some stale-stage suppression already exists in the presenter layer
- Reference truth:
  - operators should see one current live surface plus honest history
  - long-lived live status text should be readable without mental conversion from raw seconds/minutes-only output
- Target truth / intended delta:
  - attach uses a pinned live primary region instead of appending full-frame copies
  - live operator text uses clearer duration and rate-limit rendering
  - event/retry/stage truth is only widened where the current read model demonstrably remains wrong
- Explicitly out-of-scope differences:
  - broader telemetry plumbing changes not needed for the attach/view contract
  - redesigning launch-mode behavior

## Readiness Gate
- Not done if:
  - attach still accumulates stacked historical full-frame copies
  - the fix only reverts attach to alternate screen
  - operator-readable duration and rate-limit rendering remains unaddressed on the protected surfaces
  - validation skips real screenshot proof, visual inspection, or authoritative payload cross-checks
- Pre-implementation issue-quality review evidence:
  - this is not a micro-task. The lane spans live terminal semantics, several operator-facing protected surfaces, focused regression coverage, and real proof requirements across multiple files.
- Safeguard ownership split:
  - keep the first implementation pass in `controlStatusDashboard.ts` plus its tests
  - widen into `compatibilityIssuePresenter.ts` or `selectedRunProjection.ts` only if stale stage/read-model truth reproduces during validation

## Technical Requirements
- Functional requirements:
  - live attach redraw must stop accumulating full-frame history in primary scrollback
  - launch-mode live redraw must remain alternate-screen based
  - long countdowns/runtime/age values must render in higher-order readable units
  - Codex / Linear rate-limit presentation must match the requested spacing and percent semantics
  - running-event and retry text must be more operator-meaningful than the current generic fallbacks
- Non-functional requirements (performance, reliability, security):
  - keep attach read-only
  - avoid introducing extra live redraw complexity outside the attached primary path
  - keep proof capture cleanup explicit and deterministic
- Interfaces / contracts:
  - live viewer shell: `orchestrator/src/cli/coStatusAttachCliShell.ts`
  - renderer/writer: `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - optional presenter/read-model freshness seams: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add a primary-live pinned-region writer in the dashboard surface instead of full-frame clear-home rewrites
  - centralize readable duration formatting inside the dashboard surface
  - keep rate-limit source selection unchanged unless validation proves a source-truth defect
  - only widen into presenter freshness if the stale `Merging` / retry projection still reproduces
- Data model changes / migrations:
  - no persisted data model change expected
  - any extra frame bookkeeping should stay renderer-local
- External dependencies / integrations:
  - real local control-host proof during validation
  - authoritative root-host payload cross-check during screenshot proof

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused Vitest coverage for live attach redraw semantics and bounded readability changes
  - required repo validation floor after implementation
  - standalone review and explicit elegance pass before handoff
- Rollout verification:
  - real local attach session
  - screenshot proof embedded directly in Linear
  - explicit visual inspection and cleanup of temporary proof surfaces
- Monitoring / alerts:
  - rely on focused tests and proof artifacts; this lane adds no new telemetry source by design

## Open Questions
- If the stale `Merging` / `Done` projection does not reproduce once the dashboard surface is fixed, record that as validation evidence and keep the presenter code untouched.

## Approvals
- Reviewer: codex-orchestrator docs-review (`.runs/linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2-co-97-docs-review/cli/2026-04-06T09-58-42-515Z-642faafe/manifest.json`, review telemetry `status: succeeded`, `review_outcome: clean-success`)
- Date: 2026-04-06
