# PRD - Coordinator Symphony Post-Merge Retry-Timer Follow-Up

## Added by Bootstrap 2026-03-23

## Summary
- Problem Statement: after `CO-2` merged and moved to `Done`, the post-merge `Core Lane` run on `main` for merge commit `bf21eb3c12d34e759e393e6e685442c4ea97c572` failed in `Test` on March 23, 2026. The failure was a single `ProviderIssueHandoff.test.ts` timeout in `createProviderIssueHandoffService > cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer`. The merged diff did not touch the provider handoff runtime, the PR head had passed before merge, and local targeted stress passes. The truthful reading is a post-merge CI-only retry-timer test flake, not a newly discovered Symphony runtime parity regression.
- Desired Outcome: open a narrow docs-first remediation lane that records the exact post-merge failure, creates a truthful follow-up tracker issue if possible, stabilizes the retry-timer test surface without weakening runtime behavior, and drives validation, PR, feedback, merge, and clean-main closeout end to end.
- Current Outcome Target: this lane remains intentionally narrow. It should keep production/provider logic unchanged unless a real runtime bug is reproduced, and should prefer deterministic test-side assertions over callback-order coupling in the retry-owner test cluster.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): take the post-merge `main` regression seriously, open the next truthful docs-first lane, trace the exact failing test from GitHub Actions, determine whether this reflects a real parity/runtime issue or only test brittleness, fix it with the smallest correct change, and deliver the entire follow-up as the top-level orchestrator.
- Success criteria / acceptance:
  - `1320` is registered as the next docs-first remediation lane with PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, task snapshot, and docs freshness updates
  - the packet records the exact `Core Lane` failure on run `23425656167` / job `68139836805`
  - the lane explicitly states that no new live Linear workflow status is required for this regression
  - a follow-up tracker issue is created if the current Linear credentials and team/project bindings allow it safely
  - the fix keeps runtime/provider behavior unchanged unless a real logic bug is reproduced
  - the final patch stabilizes the retry-timer test seam and clears the validation floor
  - PR, review/comments/checks, merge, and clean `main` return are all completed if permissions and CI allow
- Constraints / non-goals:
  - do not widen this lane into the broader deferred `1319` follow-ons such as workflow-file hot reload or follow-up issue automation
  - do not restart the control host or redo external setup
  - do not weaken delegation guard or alter provider execution-authority boundaries
  - do not claim a runtime parity bug without reproducing one

## Goals
- Register a truthful post-merge follow-up lane.
- Capture exact GitHub Actions failure evidence for the `main` regression.
- Determine whether the failure is a runtime bug or a CI-only timer/test flake.
- Create a Linear follow-up issue if safely possible from current auth/setup.
- Stabilize the smallest test surface needed to make `Core Lane` deterministic.
- Validate, review, merge, and close the lane cleanly.

## Non-Goals
- Reopening the full Symphony parity audit from `1319`.
- Changing live Linear workflow-state configuration.
- Reworking provider retry/runtime semantics without reproduced behavioral evidence.
- Touching Telegram, Tailscale, Funnel, webhook, or secret setup.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the failing post-merge test no longer flakes in CI
  - runtime/provider logic remains unchanged unless a reproduced logic bug demands otherwise
  - a follow-up tracker issue exists for the post-merge regression if creation is available
  - the lane closes with green required checks and a clean `main`
- Guardrails / Error Budgets:
  - keep the fix bounded to the retry-timer test seam or the minimum runtime seam proven faulty
  - preserve current Symphony-aligned lifecycle behavior landed in `1319`
  - do not over-claim new parity gaps when the evidence only supports test brittleness

## User Experience
- Personas:
  - CO operator auditing whether a post-merge failure requires reopening a finished Linear issue
  - maintainer needing a machine-checkable explanation of why `main` went red after merge
- User Journeys:
  - a merged Linear issue stays `Done` while a separate follow-up issue tracks the post-merge regression
  - a reviewer can inspect the docs packet and see whether the failure came from runtime behavior or test instability

## Technical Considerations
- Architectural Notes:
  - the failing job is `Core Lane` run `23425656167`, job `68139836805`, failing in `Test`
  - the failing assertion is in `orchestrator/tests/ProviderIssueHandoff.test.ts` and times out while waiting for `launcher.start`
  - local targeted runs pass, including repeated stress of the exact failing case, which points to CI-only timer sensitivity
  - merged `CO-2` work did not touch `ProviderIssueHandoff` runtime files, so a production regression is not the leading explanation
  - the repo-local Linear helper does not create issues, but the underlying GraphQL client and current `CO_LINEAR_*` bindings may allow direct issue creation from this session
- Dependencies / Integrations:
  - GitHub Actions run `23425656167`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIssueRetryQueue.ts`
  - `orchestrator/src/cli/control/linearGraphqlClient.ts`

## Open Questions
- Should the final patch touch only the exact failing test, or also the adjacent callback-driven retry tests in the same cluster if they share the same brittle pattern?
- If Linear follow-up issue creation succeeds, should `CO-2` receive a short traceability comment, or is the new issue plus PR enough?

## Approvals
- Product: Self-approved on 2026-03-23 for a narrow post-merge remediation lane.
- Engineering: Self-approved on 2026-03-23 based on GitHub Actions evidence and local retry-timer audit.
- Design: N/A
