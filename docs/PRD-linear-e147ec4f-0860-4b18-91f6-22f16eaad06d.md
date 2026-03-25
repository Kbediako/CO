# PRD - CO Add Symphony-Style Follow-Up Issue Automation

## Added by Bootstrap 2026-03-25

## Summary
- Problem Statement: CO's worker-visible Linear helper surface currently supports issue reads, workpad comment updates, state transitions, workpad deletion, and PR attachment, but it still cannot create a same-project follow-up Linear issue when a worker discovers meaningful out-of-scope improvements. Current workers therefore need repo-local break-glass GraphQL or manual operator intervention to satisfy the Symphony Elixir workflow requirement.
- Desired Outcome: add a bounded worker-visible CO Linear helper that creates a follow-up issue in the same team/project in `Backlog`, records a required `related` link to the source issue, optionally records a blocker link when the follow-up depends on the source issue landing first, and returns the new issue identifier/URL so the worker can reference it in the single persistent workpad comment.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): close the remaining Symphony workflow parity gap for out-of-scope follow-up issues by giving provider workers an explicit CO-owned helper command rather than forcing repo-local raw GraphQL scripts.
- Success criteria / acceptance:
  - worker-visible CO Linear tooling can create a same-project follow-up issue without repo-local break-glass GraphQL
  - created follow-up issues default to `Backlog` and preserve the current project/team assignment
  - the flow supports a required `related` relation to the source issue plus optional blocker linkage when the follow-up depends on the source issue
  - the helper returns the created issue identifier and URL so the workpad can reference it cleanly
  - tests cover creation success, relation creation, missing-project safeguards, and relation/create failure behavior
- Constraints / non-goals:
  - preserve worker-owned tracker mutation boundaries; do not move ticket creation into generic provider reconciliation
  - do not weaken delegation guard or widen provider execution authority
  - audit against the local Symphony checkout before implementation

## Goals
- Extend the existing provider-worker Linear CLI/facade with a narrow follow-up issue creation operation.
- Keep the new operation bound to the current issue's team/project instead of exposing generic arbitrary issue creation.
- Encode Symphony's workflow requirement directly in the helper contract:
  - required `Backlog` placement
  - required `related` relation to the source issue
  - optional source-issue blocker linkage when requested
- Surface created issue metadata clearly enough for workpad usage and audit logging.
- Update worker-facing docs/prompting so the feature is discoverable during unattended execution.

## Non-Goals
- Adding a general-purpose Linear issue creation CLI for arbitrary teams, projects, or relations.
- Widening provider-owned mutation behavior beyond the existing worker-visible helper boundary.
- Reworking existing workpad, review-state, PR-attachment, or merge-shepherding flows outside the minimal changes needed to advertise the new helper.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `codex-orchestrator linear` exposes a documented follow-up issue creation command
  - the helper fails closed when the source issue lacks a project or when the live team does not expose `Backlog`
  - successful runs create the issue plus required relations and return the created issue identifier/URL
  - focused tests prove the create/relation/error paths without widening unrelated Linear behavior
- Guardrails / Error Budgets:
  - keep issue creation scoped to the current source issue context; do not accept arbitrary project/team overrides beyond existing scoped source setup
  - preserve current audit logging and worker prompt contracts
  - if relation creation fails after the issue is created, return explicit created-issue details instead of hiding the partial success

## User Experience
- Personas:
  - provider worker handling a scoped Linear issue in CO
  - reviewer/operator verifying that out-of-scope follow-ons are filed cleanly without manual GraphQL
- User Journeys:
  - a worker discovers a meaningful out-of-scope improvement, calls the new Linear helper once, and receives the new follow-up issue identifier/URL for the workpad
  - the operator sees the follow-up issue already filed in the same project in `Backlog`, linked as `related`, and optionally blocked by the source issue
  - reviewers can audit helper attempts via the existing provider Linear audit trail

## Technical Considerations
- Architectural Notes:
  - keep the new behavior inside the current provider Linear workflow facade and CLI shell instead of adding a separate GraphQL script path
  - reuse `issue-context` resolution to derive authoritative team/project/backlog state from the current issue before creation
  - use the existing Linear relation model where `related` is symmetric-style linkage and `blocks` should be created from the source issue to the new follow-up issue when the follow-up is blocked by the source
  - keep the result shape explicit enough for workpad references and partial-failure reporting
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/README.md`
  - `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
  - `skills/linear/SKILL.md`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
  - `orchestrator/tests/LinearCliShell.test.ts`
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

## Open Questions
- Whether the first helper shape should accept acceptance criteria as a single Markdown block only, or also expose a more structured repeated-flag form later. This lane stays with the smallest documented string/file inputs that cover current worker use.

## Approvals
- Product: Self-approved for the bounded Symphony parity slice described above.
- Engineering: Self-approved on 2026-03-25 after auditing the current CO helper surface, Symphony workflow requirements, and live Linear GraphQL schema.
- Design: N/A
