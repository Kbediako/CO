# PRD - Coordinator Symphony Full-Parity Audit and Closure Truthfulness Reassessment

## Added by Bootstrap 2026-03-20

## Summary
- Problem Statement: `1303` and its live follow-up lanes closed the provider-intake path narrowly, but they did not prove truthful full Symphony parity. A fresh audit against the current `/Users/kbediako/Code/symphony/SPEC.md` and the current Elixir reference shows that CO still diverges on several larger lifecycle and workspace invariants: per-issue workspaces, repeated worker-turn continuation after a normal successful child run, and mid-run reconciliation when an issue leaves the active `started` state. The audit also found bounded current-tree issues that are worth fixing now instead of only documenting: provider intake treats a succeeded child run as a hard terminal gate on the next accepted event, and the selected-run/Telegram observability path can surface stale failure text from a now-succeeded child manifest.
- Desired Outcome: register a truthful umbrella parity-audit lane, classify every audited surface explicitly, implement the bounded parity fixes that are actually patchable in the current architecture, and update the repo so it no longer overstates "full Symphony parity" while still moving the current tree forward.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Act as the top-level orchestrator for a full Symphony parity audit, verify the current CO tree against both the Symphony SPEC and the Elixir reference implementation, avoid assumptions about Linear write-back, and carry the work through docs-first planning, implementation, validation, PR, review feedback, merge, and a clean `main`.
- Success criteria / acceptance:
  - a new truthful umbrella lane exists as `1310`
  - the lane contains a parity matrix that classifies the required surfaces as `aligned`, `intentionally divergent but acceptable`, `real parity gap`, or `unclear`
  - the lane states clearly whether full parity is already closed, partially closed, or still blocked by larger architectural divergences
  - the current-tree implementable-now parity bugs are fixed instead of left as docs-only findings
  - local validation and a live provider proof run against the existing control-host setup are captured
  - PR, review handling, merge, and clean-main closeout are completed unless a concrete external blocker prevents them
- Constraints / non-goals:
  - do not assume Linear write-back is automatically required or automatically unnecessary
  - do not redo Telegram, Linear, webhook, Tailscale, or secret setup
  - do not claim full closure if larger architectural divergences remain
  - do not silently expand scope into a multi-workspace or remote-worker rewrite without first recording that larger gap explicitly

## Goals
- Re-baseline the repo's Symphony parity posture truthfully against the current upstream reference.
- Separate core orchestrator parity from optional workflow/tooling surfaces and from larger architecture-level divergences.
- Land the smallest defensible fixes for current-tree parity bugs that can be patched now.
- Preserve the live provider setup and prove the updated behavior against a real control-host issue transition.

## Non-Goals
- Recreating the Symphony Elixir architecture wholesale in this lane.
- Rebuilding CO around per-issue worktrees, remote worker hosts, or worker-owned Linear mutation tooling unless required for a bounded fix in this branch.
- Reopening provider setup, webhook signing, or Telegram bootstrapping.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - parity matrix is explicit and evidence-backed
  - repo docs no longer imply full closure where the audit disproves it
  - bounded current-tree parity bugs are fixed and covered by tests
  - live provider proof demonstrates the updated bounded behavior against the existing control host
- Guardrails / Error Budgets:
  - keep implementation limited to bounded fixes that are actually compatible with the current CO architecture
  - record larger architectural divergences as such instead of hiding them behind optimistic wording
  - keep provider execution authority within CO; do not widen tracker authority into arbitrary control mutations

## User Experience
- Personas: CO operator auditing whether the current implementation is truthfully Symphony-aligned
- User Journeys:
  - read the parity packet and understand which surfaces are already aligned, which are optional differences, and which are still real gaps
  - see the repo fix the current bounded parity bugs instead of only describing them
  - run the existing control host and observe the updated behavior without redoing provider setup

## Technical Considerations
- Architectural Notes:
  - the upstream audit shows that orchestrator-managed tracker writes are not a core Symphony requirement; worker/workflow-owned write surfaces remain optional or environment-dependent
  - the biggest remaining parity misses are architectural: per-issue workspace confinement, repeated turn continuation after a succeeded child run, and mid-run reconcile/stop behavior when an issue leaves `started`
  - two smaller current-tree issues are patchable now:
    - a fresh accepted event for an already-started issue should not be hard-blocked only because the latest child run previously succeeded
    - selected-run and Telegram/status surfaces should not keep stale failure summaries once the child manifest is now `succeeded`
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/tracker.ex`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/controlTelegramReadController.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`

## Open Questions
- Should a larger follow-up lane add true internal continuation and running-issue reconcile loops, or should that work be blocked behind a broader per-issue workspace redesign?
- Is worker-visible Linear mutation tooling a repo-owned parity obligation for CO, or should that remain an environment-provided optional workflow dependency?

## Approvals
- Product: Self-approved from the operator directive to execute the handoff end to end.
- Engineering: Pre-implementation self-review completed by the top-level orchestrator on 2026-03-20 against the current Symphony SPEC, current Elixir reference, and current CO tree.
- Design: N/A
