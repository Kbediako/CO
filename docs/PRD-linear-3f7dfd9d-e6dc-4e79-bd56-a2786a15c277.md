# PRD - CO Strengthen Autonomous Issue Understanding and Intent Capture for Follow-Up Work

## Added by Bootstrap 2026-03-31

## Traceability
- Linear issue: `CO-45` / `3f7dfd9d-e6dc-4e79-bd56-a2786a15c277`
- Linear URL: https://linear.app/asabeko/issue/CO-45/co-strengthen-autonomous-issue-understanding-and-intent-capture-for

## Summary
- Problem Statement: autonomy-created and autonomy-consumed backlog issues can still preserve only part of the user's real intent long enough for the smaller interpretation to become the docs-first packet and, later, the implementation lane. The `CO STATUS` chain shows the specific failure: exact surface, exact artifact name, and full parity target were each restored only after drift had already been operationalized.
- Desired Outcome: strengthen issue shaping, issue readiness, and follow-up creation so autonomous backlog work fails closed unless the issue preserves exact names and surfaces, explicitly rejects nearby wrong interpretations, captures parity scope with a matrix when relevant, and leaves immediate repo-traceability breadcrumbs before work starts.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): use the `CO STATUS` chain as a concrete root-cause case study, then harden the reusable intake and docs-first workflow so future autonomy-facing issues do not narrow the user's actual request into a nearby but wrong implementation target.
- Success criteria / acceptance:
  - explain concretely how `CO-7`, `CO-26`, and `CO-44` drifted relative to the original intent
  - define an issue-shaping contract that preserves user-request translation, protected terms, explicit non-goals, readiness checks, and nearby wrong interpretations to reject
  - require a parity/alignment matrix for parity work
  - add an `intent checksum` and `Not Done If` gate so issues fail readiness review before implementation when ambiguity remains
  - define how follow-up issues become traceable immediately through repo artifacts or an explicit artifact contract
  - record the safeguard split across templates, follow-up tooling, review gate, and checklist surfaces
- Constraints / non-goals:
  - this lane is about issue shaping and docs-first process quality, not about shipping more `CO STATUS` runtime or UI work
  - keep safeguards lightweight enough for provider-worker/autonomy flows to use routinely
  - prefer the smallest set of workflow/tooling changes that makes the drift classes harder to repeat

## Case Study Root-Cause Review
- `CO-7` preserved the general observability goal but explicitly allowed a web-first interpretation; the requested terminal surface was therefore not treated as a protected requirement and the lane landed truthful `/ui` work while still missing the shell requirement.
- `CO-26` corrected the artifact name to exactly `CO STATUS` and restored the terminal-first medium, but its docs-first packet still narrowed scope to one terminal renderer over the already-landed web dataset instead of full Symphony-style terminal parity.
- `CO-44` had to reopen the chain because the parity target itself was still underspecified; the issue was "good enough to start" before the current truth, reference truth, target truth, and nearby wrong target were explicitly separated.
- The reusable gap is earlier than implementation: issue creation and issue readiness do not currently require a short, hard-to-misread block that preserves exact wording, protected terms, wrong interpretations to reject, and immediate docs-first traceability.

## Goals
- Define a stronger issue-shaping contract for autonomy-facing backlog issues and follow-up issues.
- Require an explicit `intent checksum` and `Not Done If` readiness gate before work starts.
- Require a current-vs-reference-vs-target parity/alignment matrix for parity or alignment work.
- Improve follow-up issue creation so same-project backlog issues leave immediate traceability instructions instead of freeform descriptions only.
- Record which safeguard belongs in guidance/templates, helper/tooling, review gate, and task checklist surfaces.

## Non-Goals
- Re-implementing or redesigning the `CO STATUS` runtime/dashboard itself.
- Inventing a heavyweight planning ceremony for every tiny typo or wording fix.
- Replacing docs-review with an all-new pipeline when a lightweight issue-quality gate can sit on top of the existing docs-first flow.
- Generalizing this lane into unrelated Linear project governance or non-autonomy workflows.

## Stakeholders
- Product: operator/maintainer who expects autonomous follow-up work to preserve the actual request rather than the nearest convenient interpretation
- Engineering: Codex / provider-worker owners / docs-first reviewers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - new autonomy-facing follow-up issues can preserve exact artifact names, surfaces, and wrong interpretations to reject in a short standardized block
  - parity/alignment issues must spell out current truth, reference truth, target truth, and explicit out-of-scope differences before they leave backlog/readiness review
  - task packets and review gates now record a lightweight pre-implementation issue-quality check instead of treating a merely plausible issue as ready
- Guardrails / Error Budgets:
  - keep the contract additive and reviewer-friendly rather than forcing a large planning rewrite for unrelated lanes
  - do not weaken delegation or docs-first discipline to make issue creation look easier
  - make the follow-up helper fail closed only on the fields that materially reduce drift and can be supplied in provider-worker flows

## User Experience
- Personas: provider-worker creating a follow-up issue, reviewer checking whether an issue is truly ready, maintainer resuming a lane from the repo without chat history
- User Journeys:
  - autonomous worker creates a follow-up issue and immediately records the exact name/surface constraints, wrong interpretations to reject, and repo-traceability contract
  - reviewer inspects a `Ready` issue and can quickly tell whether the intended medium, artifact name, parity target, and non-goals are preserved
  - later worker resumes from the repo packet and can see why the issue exists, what would be a false completion, and which nearby solutions are out of scope

## Technical Considerations
- Architectural Notes:
  - the sanctioned autonomy follow-up surface is `linear create-follow-up`, so issue-creation hardening belongs there instead of only in prose guidance
  - docs-first templates currently capture general translation but do not force protected terms, wrong-interpretation rejection, or parity matrices strongly enough
  - issue readiness guidance needs an explicit lightweight issue-quality review gate before implementation, not only a later implementation review
  - micro-task rules should fail closed for parity/alignment or exact-name/exact-surface lanes because those are precisely where "small but wrong" interpretations slip through
- Dependencies / Integrations:
  - `AGENTS.md`
  - `.agent/task/templates/prd-template.md`
  - `.agent/task/templates/tech-spec-template.md`
  - `.agent/task/templates/action-plan-template.md`
  - `.agent/task/templates/tasks-template.md`
  - `docs/micro-task-path.md`
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/LinearCliShell.test.ts`
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

## Open Questions
- Keep the first issue-quality gate lightweight and docs-first-backed in this lane: checklist + docs-review + explicit `Not Done If` review. If later evidence shows that is still too weak, open a narrower follow-up for pipeline-level enforcement instead of over-expanding `CO-45`.

## Approvals
- Product: Self-approved from the Linear issue scope and required `CO STATUS` case-study evidence
- Engineering: Docs-review complete; implementation validation complete; standalone-review fallback and elegance evidence recorded. Human engineering sign-off remains pending on PR review / merge.
- Design: N/A
