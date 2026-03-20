# PRD - Coordinator Live Provider Child-Run Task Identity and Delegation Guard Contract Alignment

## Added by Bootstrap 2025-10-16

## Summary
- Problem Statement: Live provider-driven intake now accepts real Linear deliveries, writes provider-intake claims for `CO-1` and `CO-2`, and launches child runs, but those child runs use dynamic fallback task ids like `linear-<issueId>`. Strict `delegation-guard` rejects those runs before any downstream work starts because the task ids are not registered in `tasks/index.json` and are not prefixed as children of a registered task.
- Desired Outcome: Register a narrow follow-up lane that aligns provider-started child-run task identity with the strict delegation contract, preserves the existing provider-intake and execution-authority design, and proves through a live rerun that the provider-started child run advances past `stage:delegation-guard:failed` or else reports the next exact blocker.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Treat the provider-started `delegation-guard` failure as the next docs-first CO lane, investigate the architectural mismatch, implement the smallest auditable fix, preserve guardrail integrity, rerun the live provider path, and close the implementation through PR/merge rather than stopping at analysis.
- Success criteria / acceptance:
  - a new truthful follow-up lane exists as `1305`
  - the spec defines the sanctioned contract between provider-started child runs and `delegation-guard`
  - the implementation keeps existing provider-intake claim and execution-authority behavior intact
  - provider-started child runs no longer fail immediately because their fallback task id is unregistered
  - live rerun confirms provider-intake claim still happens and the mapped child run gets past `delegation-guard`, or captures the next blocker exactly
- Constraints / non-goals:
  - do not redo Telegram, Linear, Tailscale, webhook, or secret setup
  - do not add a blanket `DELEGATION_GUARD_OVERRIDE_REASON` for provider-started runs
  - do not weaken `delegation-guard` repo-wide for ordinary top-level tasks
  - do not undo the current provider-intake / execution-authority design

## Goals
- Define a truthful, auditable contract for provider-started child-run identity under strict guardrails.
- Keep the fix as small as possible while still surviving live runtime validation.
- Preserve the existing provider-intake ledger and manifest-based audit trail.

## Non-Goals
- Reworking general delegation policy for human-started top-level tasks.
- Reopening provider setup or ingress validation already proven live.
- Expanding provider authority beyond the current bounded `start` / `resume` handoff.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - real Linear deliveries remain accepted by the control host
  - `provider-intake-state.json` still records claims for live started issues
  - provider-started child runs advance beyond `stage:delegation-guard:failed`
- Guardrails / Error Budgets:
  - ordinary top-level tasks must still require registered task ids and normal delegation evidence
  - provider-started fallback runs must stay auditable from active run launch provenance plus provider-intake state, not hidden behind undocumented overrides
  - stop at the first new downstream blocker after `delegation-guard`

## User Experience
- Personas: CO operator validating live provider-driven autonomous intake
- User Journeys:
  - live provider intake accepts a started Linear issue and claims it
  - the control host launches or resumes the mapped child run
  - the child run clears `delegation-guard` instead of dying immediately on task identity mismatch

## Technical Considerations
- Architectural Notes:
  - `1303` intentionally introduced `linear-<opaque-provider-id>` fallback task ids when no explicit CO task carrier exists in the live issue projection
  - `delegation-guard` currently assumes top-level task ids must be registry-backed or registered-parent-prefixed, which mismatches that provider fallback design
  - the current runner exports `CODEX_ORCHESTRATOR_MANIFEST_PATH`, so the guard can inspect the active run manifest when deciding whether a run matches the sanctioned provider contract
  - manifest `issue_*` fields are not sufficient proof by themselves because ordinary `start` flags can populate them; the sanctioned provider contract must be tied to matching control-host provider-intake state plus control-host launch provenance
  - once a provider claim has `run_manifest_path`, the guard proof must require manifest-path continuity so a different run cannot piggyback on the same provider issue claim
  - delegated child runs under a sanctioned provider-started task must also remain valid, so the guard has to treat the sanctioned provider task id as a truthful parent prefix for `<task-id>-<stream>` subagent runs
- Dependencies / Integrations:
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/local-mcp/cli/control-host/linear-advisory-state.json`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `scripts/delegation-guard.mjs`
  - live Linear provider intake for `CO-1` / `CO-2`

## Open Questions
- Is a `delegation-guard`-only fix enough once it validates against provider-intake state, or does any follow-up helper extraction become worthwhile after live proof?
- Once the child run clears `delegation-guard`, what is the next exact downstream blocker, if any?

## Approvals
- Product: Self-approved from operator directive and live evidence
- Engineering: Pending docs-review for `1305`
- Design: N/A
