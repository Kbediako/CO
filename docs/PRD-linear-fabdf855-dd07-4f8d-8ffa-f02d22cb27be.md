# PRD - CO: Reconcile provider-worker child-stream delegation evidence with delegation guard

## Added by Bootstrap 2026-03-31

## Traceability
- Linear issue: `CO-56` / `fabdf855-dd07-4f8d-8ffa-f02d22cb27be`
- Linear URL: https://linear.app/asabeko/issue/CO-56/co-reconcile-provider-worker-child-stream-delegation-evidence-with

## Summary
- Problem Statement: provider-worker child streams and child lanes launched from a Linear issue workspace now record their manifests under the workspace-scoped artifact root, but top-level `delegation-guard` still scans only the shared-root `.runs` path inherited in the worker environment. That makes the guard fail even when the worker followed the documented audited child-stream workflow and real delegated manifests exist.
- Desired Outcome: keep delegation enforcement intact for provider-worker lanes while reconciling the guard with the worker's actual audited artifact location so valid workspace-scoped child-stream and child-lane manifests satisfy the guard without requiring routine override text.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): fix the provider-worker delegation evidence contract narrowly. Recognize valid audited child manifests where provider-worker helpers actually write them, keep the guard fail-closed when no child evidence exists, and document the contract where provider-worker delegation expectations are described.
- Success criteria / acceptance:
  - provider-worker top-level `delegation-guard` accepts workspace-scoped child-stream and child-lane manifest evidence for the active issue workspace
  - the fix remains fail-closed when no delegated child evidence exists
  - the provider-worker workflow guidance reflects that valid child-stream or child-lane evidence should satisfy the guard instead of pushing workers toward blanket override text
  - a regression test covers the workspace-path mismatch that surfaced during CO-45 validation
- Constraints / non-goals:
  - do not weaken delegation enforcement for top-level tasks
  - do not broaden this into a generic artifact-root refactor across unrelated flows
  - keep the change metadata-driven and bounded to provider-worker issue workspaces

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "Preserve the delegation requirement for provider-worker lanes."
  - "Preserve workspace-scoped child-stream execution for same-issue workspaces unless there is a stronger audited alternative."
  - "Reject the wrong interpretation that workers should use blanket `DELEGATION_GUARD_OVERRIDE_REASON` text even when valid child-stream evidence exists."
  - "Reject the wrong interpretation that the fix is to weaken `delegation-guard` globally without accounting for provider-worker child-stream artifact locations."
- Protected terms / exact artifact and surface names:
  - `node scripts/delegation-guard.mjs`
  - `linear child-stream`
  - `linear child-lane`
  - `provider-linear-worker`
  - `workspace_path`
  - `CODEX_ORCHESTRATOR_ROOT`
  - `CODEX_ORCHESTRATOR_RUNS_DIR`
- Nearby wrong interpretations to reject:
  - changing provider-worker child streams back to shared-root artifacts instead of accepting their audited workspace-scoped location
  - solving the issue by telling workers to add override text to routine validation
  - widening the change into a general `resolveEnvironmentPaths()` rewrite for every orchestrator surface

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth: provider-worker parent runs inherit `CODEX_ORCHESTRATOR_ROOT=<workspace>` but also inherit `CODEX_ORCHESTRATOR_RUNS_DIR=/Users/kbediako/Code/CO/.runs`; child-stream and child-lane launch helpers explicitly sanitize their child env so child artifacts land under `<workspace>/.runs`, and top-level `delegation-guard` still scans only the shared-root `runsDir`.
- Reference truth: the documented provider-worker workflow says audited `linear child-stream` and `linear child-lane` runs are the sanctioned delegation evidence path for the same issue workspace.
- Target truth / intended delta: when the active top-level task is a provider-worker issue workspace, `delegation-guard` should search the authoritative shared-root runs dir plus the audited workspace-scoped runs dir derived from the active manifest/workspace contract and accept real child manifests from either location.
- Explicitly out-of-scope differences: no broader artifact-root policy change for non-provider-worker tasks; no control-host intake correlation redesign; no removal of the top-level delegation requirement.

## Not Done If
- `delegation-guard` still fails for provider-worker runs that have valid workspace-scoped child-stream manifests.
- The fix only works for one helper path and leaves `linear child-stream` or `linear child-lane` evidence invisible to the guard.
- The final contract still forces routine override text instead of recognizing or mirroring valid delegated evidence.

## Goals
- Accept valid workspace-scoped delegated child evidence for provider-worker top-level tasks.
- Preserve fail-closed behavior when that evidence is absent.
- Document the provider-worker delegation contract where workers learn the audited child-stream and child-lane workflow.
- Add focused regression coverage for the workspace-path mismatch.

## Non-Goals
- Removing or weakening top-level delegation enforcement.
- Refactoring all orchestrator artifact-root resolution to a new generic model.
- Reopening CO-45 or shifting its scope into generic delegation infrastructure work.

## Stakeholders
- Product: operator relying on provider-worker runs to preserve the documented delegation contract without manual override drift
- Engineering: provider-worker, delegation-guard, and workflow-guidance maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `node scripts/delegation-guard.mjs` passes in a provider-worker lane after a valid workspace-scoped child-stream or child-lane run is recorded
  - the guard still fails in the same provider-worker context when no delegated child manifest exists
  - provider-worker guidance explicitly points workers at audited child-stream / child-lane evidence instead of override text when evidence exists
- Guardrails / Error Budgets:
  - keep the fix limited to provider-worker workspace artifact-location reconciliation
  - derive any extra search roots from audited manifest metadata, not ad hoc filesystem scans
  - avoid changing unrelated control-host or non-provider-worker delegation behavior

## User Experience
- Personas: provider worker validating a non-trivial lane; reviewer auditing delegation evidence from manifests and workpad notes
- User Journeys:
  - worker launches `linear child-stream --pipeline docs-review` or `linear child-lane --action launch ...` from the issue workspace, then runs `node scripts/delegation-guard.mjs` and gets a truthful pass because the guard sees the audited child manifest
  - worker without child evidence still gets a fail-closed guard result plus expected-path guidance
  - reviewer can inspect the updated workflow guidance and understand that workspace-scoped child manifests are the intended provider-worker evidence path

## Technical Considerations
- Architectural Notes:
  - the mismatch is caused by a mixed environment: parent provider-worker validation inherits a shared-root `CODEX_ORCHESTRATOR_RUNS_DIR`, while child launch helpers sanitize child runs into `<workspace>/.runs`
  - the narrowest fix is on the guard side: teach top-level provider-worker delegation checks to search the active worker's audited workspace-scoped runs root in addition to the inherited shared root
  - workflow guidance should explicitly say those audited child runs satisfy delegation evidence so operators do not reach for override text
- Dependencies / Integrations:
  - `scripts/delegation-guard.mjs`
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `skills/linear/SKILL.md`
  - `tests/delegation-guard.spec.ts`

## Open Questions
- Resolved in planning: keep the fix inside the provider-worker delegation evidence contract instead of changing the broader artifact-root contract for every run type.

## Approvals
- Product: self-approved from the Linear issue scope and explicit intent checksum
- Engineering: docs packet under review; implementation and validation pending
- Design: N/A
