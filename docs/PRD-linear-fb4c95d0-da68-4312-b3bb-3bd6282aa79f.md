# PRD - Control host / CO STATUS: prevent top-level tracked.linear from leaking stale linear-advisory fallback truth

## Added by Docs Child Lane 2026-04-18

## Traceability
- Linear issue: `CO-223` / `fb4c95d0-da68-4312-b3bb-3bd6282aa79f`
- Linear URL: https://linear.app/asabeko/issue/CO-223/control-host-co-status-prevent-top-level-trackedlinear-from-leaking
- Task id: `linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f`
- Canonical spec: `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- Shared source 0 anchor: `ctx:sha256:ff78d09226d759620c87d1f1ae2de5782e81e7eda07b01112ef35807344be9b1#chunk:c000001`
- Source object id: `sha256:ff78d09226d759620c87d1f1ae2de5782e81e7eda07b01112ef35807344be9b1`
- Expected source payload: `.runs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f-co223-docs-packet/cli/2026-04-17T18-00-08-729Z-4c76d75d/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f-co223-docs-packet/cli/2026-04-17T18-00-08-729Z-4c76d75d/manifest.json`
- Issue body source: the expected shared source payload is absent in this child checkout, so the verbatim CO-223 issue prompt below was recovered via read-only Linear fetch on 2026-04-18 and paired with direct repo inspection of `controlRuntime.ts`, `selectedRunProjection.ts`, and `observabilityReadModel.ts`.
- Parent lane ownership: authoritative issue workspace, Linear state, workpad, implementation, validation, review, PR, merge, and any wider-scope `docs/TASKS.md` archive handling.

## Verbatim Issue Prompt

### Problem
Top-level `tracked.linear` can still report stale advisory fallback truth even when the live dispatch and provider-intake surfaces have already converged on current queue truth.

Current local evidence shows this exact split:

- live dispatch recommended and tracked `CO-196`
- provider intake rehydrated current running claims for `CO-196`, `CO-210`, and `CO-215`
- top-level `tracked.linear.identifier` still exposed `CO-1` from the persisted March 22 advisory snapshot

That makes the control-host status payload partially truthful and partially stale at the same time.

### Expected
When the selected projection has no authoritative tracked payload, top-level `tracked.linear` must prefer current dispatch/intake truth or remain empty. It must not leak stale `linear-advisory-state.json` fallback data as if it were current queue truth.

### Evidence
- persisted fallback snapshot still reports `tracked_issue.identifier = CO-1` from `2026-03-22T04:01:03.255Z`
- current provider intake rehydrated running claims for `CO-196`, `CO-210`, and `CO-215` on `2026-04-17`
- authenticated live control-host dispatch returned `tracked_issue.identifier = CO-196`
- live `/api/v1/state` / `/ui/data.json` still projected top-level `tracked.linear.identifier = CO-1`
- the narrow fallback path is `controlRuntime.ts` -> `selectedRunProjection.ts` -> `observabilityReadModel.ts`, seeded from persisted `linear-advisory-state.json`

### Acceptance Criteria
- [ ] Reproduce the shape where live dispatch and provider-intake truth are current but persisted advisory fallback still points at an older tracked issue.
- [ ] Top-level `tracked.linear` no longer projects stale advisory fallback truth when current dispatch/intake truth is available.
- [ ] If no authoritative tracked truth is available, the surface fails closed to a truthful empty/null shape instead of leaking stale advisory state.
- [ ] `co-status`, `/api/v1/state`, and `/ui/data.json` stay aligned for this surface.
- [ ] Regression coverage distinguishes this bug from `CO-219`, `CO-220`, and `CO-222`.

### Non-Goals
- Do not reopen the dead-proof running/max-allowed overcount seam from `CO-219`.
- Do not reopen the stale reset-to-Rework / stale attached PR seam from `CO-220`.
- Do not reopen resumed-run retry-failure truth from `CO-222`.
- Do not broaden into generic dispatch selection redesign unless that is required to make top-level tracked truth truthful.

### Not Done If
- top-level `tracked.linear` can still show a stale historical issue such as `CO-1` while current dispatch/intake truth already points elsewhere
- only one surface is fixed while the others still leak stale tracked truth
- the fix hides the problem by deleting useful current tracked data rather than preferring truthful current state

### Related Issues
- `CO-219`
- `CO-220`
- `CO-222`

### Context Only
- `CO-211` and `CO-212` showed adjacent status-truth splits but do not cover this specific top-level tracked fallback leak.

## User Request Translation (Context Anchor)
- User intent / needs: create the docs-first packet and registry/checklist mirrors for `CO-223`, preserving the exact stale top-level `tracked.linear` fallback leak before the parent lane edits source or tests.
- Success criteria / acceptance:
  - preserve the exact issue wording for `tracked.linear`, `tracked.linear.identifier`, `tracked_issue.identifier`, `CO-196`, `CO-1`, `linear-advisory-state.json`, `controlRuntime.ts`, `selectedRunProjection.ts`, `observabilityReadModel.ts`, `co-status`, `/api/v1/state`, and `/ui/data.json`
  - keep the packet narrowly scoped to stale advisory fallback truth leakage at the top-level tracked surface
  - define parent-owned implementation as authority precedence and fail-closed null behavior, not generic dispatch selection redesign
  - preserve explicit separation from `CO-219`, `CO-220`, and `CO-222`
- Constraints / non-goals:
  - this child lane edits only the declared docs/checklist/registry files
  - parent owns implementation, tests, docs-review, validation, Linear state, workpad refreshes, review, PR, merge, and any `docs/TASKS.md` archive action
  - the packet must use the verbatim issue prompt recovered above rather than inventing narrower or broader wording

## Intent Checksum
- Exact user wording / phrases to preserve:
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
- Protected terms / exact artifact and surface names:
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
  - `docs-relevance-advisory`
- Exact seams to preserve:
  - `tracked.linear`
  - `controlRuntime.ts`
  - `selectedRunProjection.ts`
  - `observabilityReadModel.ts`
  - `linear-advisory-state.json`
  - `co-status`
  - `/api/v1/state`
  - `/ui/data.json`
- Nearby wrong interpretations to reject:
  - this is another `CO-219` running/max-allowed overcount fix
  - this is another `CO-220` stale Rework or stale attached PR fix
  - this is another `CO-222` resumed-run retry-failure truth fix
  - the right fix is to keep stale advisory fallback truth but hide it in only one surface
  - the right fix is to redesign generic dispatch selection rather than repair this top-level tracked precedence seam
  - the right fix is to delete useful current tracked data instead of preferring truthful current state

## Parity / Alignment Matrix

| Surface | Current Truth | Target Truth |
| --- | --- | --- |
| Top-level `tracked.linear` | `controlRuntime.ts` falls back to `buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue)` whenever `selected?.tracked` is absent, which can expose stale advisory data. | Top-level `tracked.linear` prefers authoritative current dispatch/intake truth when available and otherwise fails closed empty/null. |
| Selected projection seam | `selectedRunProjection.ts` can seed `trackedIssue` from `context.linearAdvisoryState.tracked_issue` or persisted advisory snapshot reads for selected/discovered runs. | Selected projection preserves authoritative tracked truth when it exists and does not let stale advisory fallback outrank newer current truth. |
| Persisted advisory snapshot | `linear-advisory-state.json` still carries historical tracked issue data such as `CO-1` from March 22. | Persisted advisory state remains available as bounded fallback only when no authoritative tracked truth is available. |
| Surface alignment | `co-status`, `/api/v1/state`, and `/ui/data.json` can diverge because stale fallback truth survives into top-level tracked output. | All three surfaces share the same truthful tracked-state contract for current truth vs empty/null fallback. |

## Goals
- Preserve the verbatim CO-223 issue contract in repo-owned docs before implementation starts.
- Keep the lane bounded to top-level `tracked.linear` stale advisory fallback leakage.
- Record the exact authority-precedence seams the parent must inspect: `controlRuntime.ts`, `selectedRunProjection.ts`, `observabilityReadModel.ts`, and persisted `linear-advisory-state.json`.
- Make the fail-closed empty/null behavior explicit when no authoritative tracked truth exists.
- Keep the regression boundary explicit against `CO-219`, `CO-220`, and `CO-222`.

## Non-Goals
- Reopening the dead-proof running/max-allowed overcount seam from `CO-219`.
- Reopening stale reset-to-Rework or stale attached PR work from `CO-220`.
- Reopening resumed-run retry-failure truth from `CO-222`.
- Broadening into generic dispatch selection redesign unless the parent proves that is the minimal seam required.
- Editing implementation or tests in this child lane.

## Stakeholders
- Product: control-host and `CO STATUS` operators relying on truthful top-level tracked issue reporting.
- Engineering: maintainers of `controlRuntime.ts`, `selectedRunProjection.ts`, `observabilityReadModel.ts`, and the tracked-state surfaces exposed through `co-status`, `/api/v1/state`, and `/ui/data.json`.
- Review: parent lane reviewers validating separation from `CO-219`, `CO-220`, and `CO-222`.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - the reproduced stale `CO-1` vs current `CO-196` split is captured before implementation
  - top-level `tracked.linear` no longer leaks stale advisory fallback truth when current dispatch/intake truth exists
  - empty/null fallback remains truthful when no authoritative tracked truth is available
  - `co-status`, `/api/v1/state`, and `/ui/data.json` stay aligned for this surface
- Guardrails / Error Budgets:
  - do not hide useful current tracked data
  - do not broaden into adjacent status-truth seams already covered by `CO-219`, `CO-220`, or `CO-222`
  - keep persisted advisory fallback available only as bounded fallback, not as stale pseudo-current truth

## User Experience
- Personas:
  - operator reading `co-status`
  - operator consuming `/api/v1/state` or `/ui/data.json`
  - reviewer verifying that tracked truth is current or empty, but never stale-presented-as-current
- User Journeys:
  - operator sees `CO-196` when live dispatch/intake already agree on `CO-196`
  - operator sees empty/null top-level tracked truth when no authoritative current tracked payload exists
  - reviewer can distinguish this top-level tracked leak from `CO-219`, `CO-220`, and `CO-222`

## Technical Considerations
- Architectural Notes:
  - `controlRuntime.ts` currently reads `selected?.tracked ?? buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue)` in both selected-run and compatibility runtime snapshots, so the top-level tracked surface already has an explicit advisory fallback branch
  - `selectedRunProjection.ts` carries `trackedIssue: context.linearAdvisoryState.tracked_issue` for current run context and reads persisted advisory snapshots for other run dirs, so advisory fallback state can enter projection context before final surface shaping
  - the issue-specific narrow seam is authority precedence and fail-closed null behavior for top-level tracked truth, not a generic dispatch-selection rewrite
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - any parent-selected API/UI projection coverage needed to keep `co-status`, `/api/v1/state`, and `/ui/data.json` aligned

## Open Questions
- Should the fail-closed empty/null rule live at top-level tracked payload construction in `controlRuntime.ts`, earlier in selected projection context building, or in a shared tracked-authority helper?
- When dispatch and intake disagree, which current-truth source should top-level `tracked.linear` prefer first, and what is the smallest authoritative rule that remains truthful across all three surfaces?
- Is the smallest durable regression boundary a `controlRuntime` test, a `selectedRunProjection` test, or both plus one API/UI alignment assertion?

## Approvals
- Product: self-approved from the verbatim CO-223 issue prompt recovered via read-only Linear fetch.
- Engineering: pending parent docs-review, focused implementation, and validation.
- Design: N/A.
