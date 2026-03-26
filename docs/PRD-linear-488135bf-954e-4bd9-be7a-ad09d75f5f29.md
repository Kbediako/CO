# PRD - CO Add Audited Provider-Worker Child-Stream Support for Bounded Multi-Agent Work

## Added by Bootstrap 2026-03-27

## Traceability
- Linear issue: `CO-13` / `488135bf-954e-4bd9-be7a-ad09d75f5f29`
- Linear URL: https://linear.app/asabeko/issue/CO-13/co-add-audited-provider-worker-child-stream-support-for-bounded-multi

## Summary
- Problem Statement: Current `provider-linear-worker` runs keep one authoritative worker thread and workspace, but the worker itself can only loop plain `codex exec` / `codex exec resume` on that single thread. That blocks supported, audited in-session child streams for read-only or review work, so docs-review and review-style lanes still fall back to the blanket `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker"` even though `delegation-guard` already has a sanctioned provider-child contract.
- Desired Outcome: A provider worker can launch at least one bounded child stream inside the same issue workspace for read-only, planning, or review work with truthful lineage, auditable manifests/proofs, and no widening of lifecycle authority. The main provider worker stays the only owner of Linear issue transitions and scheduling state.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete Linear issue `CO-13` in this workspace by adding a narrow provider-worker child-stream mechanism that matches the current Symphony-informed constraints and current CO control-host/provider contracts, then carry the issue through validation and review handoff.
- Success criteria / acceptance:
  - provider-worker runs can launch at least one bounded child stream for read-only, review, or planning work
  - child-stream lineage is recorded in manifests and proof artifacts and is auditable after the fact
  - docs-review and review-style lanes no longer require the blanket provider-worker delegation override when a real child stream is used
  - the existing single-stream provider-worker path still works
  - child streams stay inside the parent issue workspace/root contract and do not mutate scheduling state directly
  - live-style validation proves the provider-worker proof/manifests remain truthful with and without child streams
- Constraints / non-goals:
  - treat Symphony as a constraint baseline, not as claiming explicit provider-worker child-stream support in upstream `SPEC.md`
  - do not weaken `delegation-guard`
  - do not add arbitrary unrestricted multi-agent execution or new provider workflow states
  - keep the change bounded to provider-worker child-stream launch/audit/truthfulness plus any narrow guard needed to preserve current control-host discovery behavior

## Goals
- Add a supported provider-worker child-stream surface that launches sanctioned `<provider-task-id>-<stream>` child runs with `parent_run_id` continuity and current issue/workspace metadata.
- Keep provider-worker ownership explicit: the main worker remains authoritative for issue lifecycle transitions, while child streams stay bounded to read-only, review, and planning work.
- Surface child-stream lineage in provider-worker proof/read-model artifacts so operator evidence is truthful.
- Protect scheduler-owned provider-run discovery from accidentally matching nested provider-worker child manifests.
- Prove the behavior with focused tests plus live-style validation against current provider-worker manifests.

## Non-Goals
- Reworking control-host dispatch policy or adding new workflow states.
- Allowing child streams to edit scheduling state or operate outside the issue workspace.
- Turning provider workers into unrestricted collab runtimes.
- Claiming upstream Symphony requirements that are not actually written in the audited baseline docs.

## Stakeholders
- Product: CO operator / provider-worker workflow owner
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - a provider worker can launch and complete a bounded child stream without a blanket delegation override
  - provider-worker proof/manifests show truthful child-stream lineage
  - control-host duplicate detection and provider-run discovery remain correct in the presence of nested child manifests
- Guardrails / Error Budgets:
  - preserve same-thread continuation and per-issue workspace confinement for the main worker
  - preserve current single-stream success behavior when child streams are not used
  - keep the implementation minimal and auditable

## User Experience
- Personas: CO operator relying on provider workers to execute Linear issues autonomously but truthfully
- User Journeys:
  - a provider worker needs a docs-review or review-style side lane and can launch it without lying to delegation guard
  - an operator reads provider proof/manifests and can trace child-stream lineage back to the main provider worker
  - the control host continues to see exactly one scheduler-owned provider run per issue and ignores nested worker-owned child streams

## Technical Considerations
- Architectural Notes:
  - Symphony baseline to carry forward: bounded orchestrator concurrency, single authoritative orchestrator state, deterministic per-issue workspaces, same-thread continuation inside one worker lifetime, and optional client-side tool use within the app-server thread
  - current CO gap is not `delegation-guard` semantics; the script already recognizes sanctioned provider-child runs with `<task-id>-<stream>` plus `parent_run_id` continuity
  - the missing seam is an audited provider-worker child-stream launch surface plus proof/read-model surfacing, and a narrow control-host guard so nested child manifests never masquerade as scheduler-owned provider runs
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/README.md`
  - `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
  - `AGENTS.md`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `scripts/delegation-guard.mjs`
  - `codex.orchestrator.json`

## Open Questions
- Whether the bounded child-stream allowlist should initially include only `docs-review` and `implementation-gate` or also a non-blocking docs advisory lane. The implementation should choose the smallest useful allowlist that satisfies the issue contract.

## Approvals
- Product: Self-approved from Linear issue scope and current provider-worker acceptance criteria
- Engineering: Pending docs-review + implementation validation
- Design: N/A

## Manifest Evidence
- Current provider-worker manifest: `.runs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/cli/2026-03-26T14-32-37-352Z-eda5d760/manifest.json`
- Baseline audit: `out/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/manual/20260326T144912Z-baseline-audit.md`
