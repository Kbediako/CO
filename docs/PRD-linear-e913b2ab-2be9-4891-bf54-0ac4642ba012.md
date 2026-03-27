# PRD - CO Add App-Runtime Proof Capture and PR Media Handoff Parity

## Added by Bootstrap 2026-03-27

## Traceability
- Linear issue: `CO-8` / `e913b2ab-2be9-4891-bf54-0ac4642ba012`
- Linear URL: https://linear.app/asabeko/issue/CO-8/co-add-app-runtime-proof-capture-and-pr-media-handoff-parity

## Summary
- Problem Statement: Symphony's current Elixir worker workflow requires app-touching lanes to run `launch-app` validation and capture/upload reviewer proof media before review handoff, but CO currently has no first-class worker-visible proof helper for that step. CO's current compliance permit template also leaves video capture disabled by default, so workers have no truthful bounded path for runtime proof handoff today.
- Desired Outcome: Add a bounded CO runtime-proof path that workers can use on app-touching issues to capture or stage approved proof, generate reviewer-facing PR/workpad handoff content, and fail closed whenever permit policy does not authorize the requested proof mode.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete Linear issue `CO-8` in this workspace by auditing Symphony's current `launch-app` and `github-pr-media` expectations, then adding the smallest CO command/docs/prompt/test slice that gives provider workers a real runtime-proof handoff path without silently weakening compliance or enabling video.
- Success criteria / acceptance:
  - CO exposes a clear worker-visible path for screenshot or other approved runtime proof on app-touching lanes.
  - The resulting proof can be linked or attached in PR/workpad handoff flow before review.
  - Permit/compliance policy governs allowed modes and blocks disallowed capture or linking attempts.
  - Screenshot-only or external-link-only degraded paths are explicit while video stays disabled unless permitted.
  - Docs and focused tests cover both allowed and blocked behavior.
- Constraints / non-goals:
  - stay bounded to reviewer runtime-proof capture and handoff, not a generic media platform
  - do not silently enable video capture
  - preserve current worker-owned Linear workflow boundaries
  - delegation must be recorded as an explicit override in this run because subagent spawning is unavailable in-session

## Goals
- Add a worker-discoverable CO helper for app-runtime proof capture/handoff.
- Reconcile runtime-proof capabilities against `compliance/permit.json` and fail closed on missing or insufficient approval.
- Make the handoff output reusable in both Linear workpads and PR review flow.
- Keep the degraded path explicit when only screenshots or external proof links are allowed.
- Cover the new path with focused CLI/policy/prompt/docs tests.

## Non-Goals
- Building a general-purpose media hosting or GitHub upload service.
- Turning on video capture by default or bypassing permit review.
- Broadly rewriting the provider worker lifecycle beyond the bounded proof-handoff seam.

## Stakeholders
- Product: CO operator / Linear worker owner
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - workers can discover and use one explicit CO proof-handoff path for app-touching issues
  - disallowed proof modes fail closed with actionable reasons
  - reviewer handoff text is structured and reusable for workpad/PR flow
- Guardrails / Error Budgets:
  - video remains disabled unless the permit explicitly enables it
  - local-only proof must not be misrepresented as reviewer-usable handoff
  - keep the implementation minimal and auditable

## User Experience
- Personas: provider worker handling app-touching Linear issues; reviewer expecting concrete runtime proof before handoff
- User Journeys:
  - worker validates an app-touching change, runs the CO proof helper, and pastes the generated handoff snippet into the workpad/PR flow
  - worker requests a disallowed proof mode and gets a fail-closed policy error instead of an implicit downgrade
  - worker on a screenshot-only or external-link-only lane sees the allowed degraded path explicitly spelled out

## Technical Considerations
- Architectural Notes:
  - current worker-visible Linear helper flow already exists in `orchestrator/src/cli/linearCliShell.ts` and `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - current permit loading utilities exist in `scripts/design/pipeline/permit.js`
  - current permit entries expose `allow_playwright`, `allow_video_capture`, and `allow_live_assets`, but CO has no runtime-proof-specific handoff helper today
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/README.md`
  - `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
  - `compliance/permit.json`
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`

## Open Questions
- Whether the smallest truthful policy model should reuse the existing permit booleans only or extend the permit schema with runtime-proof-specific flags for screenshot and external-link handoff. The implementation should choose the smallest fail-closed contract that keeps screenshot versus external-link behavior explicit.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria
- Engineering: Pending docs-review + implementation validation
- Design: N/A

## Manifest Evidence
- Baseline audit: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T035157Z-baseline-audit.md`
