# TECH_SPEC: Coordinator Symphony Full-Parity Audit and Closure Truthfulness Reassessment

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: re-baseline the repo's Symphony parity claim truthfully, implement the bounded parity bugs that are patchable now, and document the larger architectural divergences that prevent full closure on the current tree.
- Scope:
  - docs-first umbrella registration for `1310`
  - explicit parity matrix against current Symphony SPEC plus current Elixir reference behavior
  - bounded implementation for current-tree parity bugs in provider intake and observability freshness
  - local validation, live provider proof, review, and merge
- Constraints:
  - full parity closure cannot be claimed unless the larger architectural divergences are actually removed
  - do not redo provider setup or widen scope into a speculative multi-workspace rewrite without explicit evidence
  - keep tracker-write conclusions aligned with upstream evidence: orchestrator-managed writes are not required core parity

## Technical Requirements
- Functional requirements:
  - register a parity matrix that explicitly classifies:
    - provider-driven intake host lifecycle
    - issue eligibility model
    - claim / running / retry / completed bookkeeping
    - issue-to-run mapping and workspace identity
    - repeated worker-turn semantics while issue remains active
    - reconciliation and stop/release behavior when an issue changes state mid-run
    - tracker read vs write authority and worker-visible write tooling obligations
    - observability API/dashboard/TUI expectations
    - Telegram/dispatch/status behavior
    - control-host / auth / background monitor surfaces
    - SSH / remote worker behavior and retry ownership
    - path safety / workspace confinement
    - scheduler ownership and execution authority boundaries
  - provider intake must not treat a previously succeeded child run as a permanent terminal gate when a fresh accepted issue event arrives for the same still-started issue
  - selected-run / status / Telegram-facing summaries must not surface stale failure text once the underlying child manifest status is now `succeeded`
  - docs must state explicitly that larger architectural gaps remain where proven by the audit
- Non-functional requirements:
  - keep the implementation patch set small and high-signal
  - preserve existing live provider setup and current control-host contracts
  - avoid introducing new provider authority beyond bounded start/resume handoff behavior
- Interfaces / contracts:
  - provider intake handoff logic in [`orchestrator/src/cli/control/providerIssueHandoff.ts`](../orchestrator/src/cli/control/providerIssueHandoff.ts)
  - selected-run projection and observability read model in [`orchestrator/src/cli/control/selectedRunProjection.ts`](../orchestrator/src/cli/control/selectedRunProjection.ts)
  - Telegram/status rendering in [`orchestrator/src/cli/control/controlTelegramReadController.ts`](../orchestrator/src/cli/control/controlTelegramReadController.ts)
  - live provider state under `.runs/local-mcp/cli/control-host/`

## Architecture & Data
- Architecture / design adjustments:
  - keep the docs packet explicit that per-issue workspaces, true repeated-turn continuation, and mid-run stop/reconcile remain larger architectural divergences on the current tree
  - patch the provider handoff so a previously succeeded child run no longer blocks the next accepted event for the same active issue
  - patch selected-run summary derivation so a succeeded child manifest does not continue to render stale failure text from an old summary string
- Data model changes / migrations:
  - none expected for task metadata; current claim/manifest schemas should stay backward compatible
- External dependencies / integrations:
  - current Symphony local checkout for audit evidence
  - existing Linear webhook and control-host setup for live proof

## Validation Plan
- Tests / checks:
  - docs-review or explicit waiver for `1310`
  - targeted provider handoff and observability regression coverage
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` if downstream-facing surfaces are touched
  - explicit elegance review pass
- Rollout verification:
  - rediscover the current control-host endpoint and public ingress
  - prove the bounded provider-intake behavior against a real Linear issue transition on the existing host
  - verify the selected-run/status surfaces stop showing stale failure text for the succeeded child manifest used in the live provider path
- Monitoring / alerts:
  - track `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - track `.runs/local-mcp/cli/control-host/linear-advisory-state.json`
  - track the affected child manifest and selected-run/status output

## Open Questions
- Should larger continuation/reconcile closure live in a dedicated architectural follow-up once this truthfulness pass lands?
- Is worker-visible Linear mutation tooling best treated as a repo-owned follow-up or as an external environment dependency?

## Approvals
- Reviewer: Top-level orchestrator self-review completed before implementation on 2026-03-20.
- Date: 2026-03-20
