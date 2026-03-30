# PRD - CO: Fix stale merge-handoff after successful provider-worker review handoff

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-40` / `dcfbd1cc-2b22-41dc-94c6-ce00c38258a2`
- Linear URL: https://linear.app/asabeko/issue/CO-40/co-fix-stale-merge-handoff-after-successful-provider-worker-review
- Related source issues: `CO-30`, `CO-38`

## Summary
- Problem Statement: `CO-30` and `CO-38` both reached a truthful successful provider-worker review handoff, but the later merge-stage continuation was not picked up by control-host. The issue/PR pair was effectively green and mergeable, yet control-host kept stale active-run truth long enough that the later `Merging` transition parked instead of continuing automatically.
- Desired Outcome: Control-host must distinguish a worker run that has already ended successfully from a truly active worker run, so later `Merging` transitions either launch merge-stage continuation correctly or fail explicitly with truthful released/completed state instead of a stale `running` claim.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-40` in the current workspace by repairing the post-review merge-handoff seam only, using the required real artifacts from `CO-30` and `CO-38`, and leaving repo-tracked docs, regressions, validation, and closeout proof instead of a speculative control-host rewrite.
- Success criteria / acceptance:
  - control-host no longer keeps a stale `running` claim after the associated provider-worker has already terminally succeeded
  - a later `Merging` transition on the same issue is eligible for truthful continuation instead of being blocked behind stale active-run state
  - provider-intake/control-host surfaces show the difference between an ended prior run and a still-active run
  - focused regression coverage reproduces the stale merge-handoff class with real-world timing shape
  - at least one closeout-proof artifact ties the fix back to the real `CO-30` / `CO-38` lane shape rather than a purely synthetic scenario
- Constraints / non-goals:
  - do not reopen the active-lane Linear write-back seam already fixed by `CO-33`
  - do not widen into shared-root merge closeout work already tracked by `CO-25`
  - do not treat unrelated PR or CI failures as part of this issue
  - keep the patch narrow and metadata-driven; do not weaken delegation or truth guards

## Goals
- Make provider run discovery treat a terminal successful provider-worker proof as authoritative enough to prevent stale `running` claims.
- Keep post-worker continuation logic truthful when the issue later moves from review handoff into `Merging`.
- Preserve clear state transitions between active, completed, released, and continuation-pending provider claims.
- Add focused regression coverage for the real timing seam: worker proof ends successfully before all manifest/control-host surfaces catch up.
- Capture artifact-backed proof tied to the real `CO-30` / `CO-38` merge-handoff class.

## Non-Goals
- Rewriting the entire provider lifecycle or merge automation stack.
- Changing the separate shared-root checkout reconciliation contract.
- Broadening into generic PR-health or review-state handling unrelated to stale post-success run truth.

## Stakeholders
- Product: CO operators relying on truthful control-host/provider intake state during review and merge closeout
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - stale `provider_issue_rehydrated_active_run` claims disappear when proof shows the worker already ended successfully
  - `Merging` continuation is triggered or explicitly declined from truthful completed/released state, not blocked by a false active run
  - regressions cover both run reclassification and later continuation eligibility
- Guardrails / Error Budgets:
  - preserve existing failure-proof behavior and older-manifest safety checks
  - do not regress legitimate active-run detection when a manifest or proof still indicates real in-flight work
  - keep the fix limited to provider-intake/control-host reconciliation, related docs, and focused tests

## User Experience
- Personas: control-host operator, provider-worker owner, reviewer watching merge-stage continuation
- User Journeys:
  - a provider worker ends cleanly at review handoff, and control-host quickly stops presenting that run as still active
  - the issue later moves to `Merging`, and control-host truthfully picks up the merge-stage continuation instead of parking on dead run state
  - an operator reading intake/runtime surfaces can tell whether a prior run ended successfully, failed, or is still active without checking raw manifests manually

## Technical Considerations
- Architectural Notes:
  - run discovery and claim reconciliation live in `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - control-host startup/refresh ownership routes through `orchestrator/src/cli/controlHostCliShell.ts`
  - the provider-worker emits authoritative proof sidecars from `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - live Linear workflow state eligibility comes from `orchestrator/src/cli/control/linearDispatchSource.ts` and provider workflow state helpers
  - the current narrow defect is that successful terminal proof is not used the same way as terminal failure proof when the manifest still says `in_progress`
- Dependencies / Integrations:
  - `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `/Users/kbediako/Code/CO/.runs/linear-f6e514fa-352e-4d82-97e2-08667e32e586/cli/2026-03-29T02-19-33-956Z-a40ae5da/provider-linear-worker-proof.json`
  - `/Users/kbediako/Code/CO/.runs/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60/cli/2026-03-29T20-44-06-912Z-3f073605/manifest.json`
  - focused tests in `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Open Questions
- Should terminal successful proof also influence surfaced run summary when the manifest is still stale, or is status plus updated-at correction sufficient?
- What is the smallest reviewer-usable “real closeout proof” artifact that is still clearly tied to `CO-30` / `CO-38` and not merely synthetic?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending docs-review and implementation validation
- Design: N/A
