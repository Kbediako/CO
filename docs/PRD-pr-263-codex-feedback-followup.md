# PRD - PR 263 Codex Feedback Follow-up (0984)

## Summary
- Problem Statement: PR #263 merged with unresolved Codex review threads, and at least two findings remain valid on `main`.
- Desired Outcome: ship a focused follow-up that fixes the missed runtime issues, documents root cause, and tightens merge/review discipline, so this class of miss cannot recur.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): open a follow-up PR now, resolve missed feedback, and identify why it was missed with concrete prevention steps.
- Success criteria / acceptance:
  - Two unresolved Codex findings from PR #263 are either fixed or conclusively disproven with evidence.
    Evidence: `.runs/0984-pr-263-codex-feedback-followup/cli/2026-02-27T06-03-10-274Z-c519009a/manifest.json` | artifacts `out/0984-pr-263-codex-feedback-followup/manual/final-05-test-rerun6.log`, `out/0984-pr-263-codex-feedback-followup/manual/pre-pr-targeted-tests-3.log` | timestamp `2026-02-27T06:03:10Z` | owner `Codex`.
  - Root cause is documented with timeline evidence and remediation controls.
    Evidence: `.runs/0984-pr-263-codex-feedback-followup/cli/2026-02-27T06-03-10-274Z-c519009a/manifest.json` | artifact `out/0984-pr-263-codex-feedback-followup/manual/pr-263-root-cause.md` | timestamp `2026-02-27T06:03:10Z` | owner `Codex`.
  - Review-thread handling and merge readiness policy are updated to prevent repeat misses.
    Evidence: `.runs/0984-pr-263-codex-feedback-followup/cli/2026-02-27T06-03-10-274Z-c519009a/manifest.json` | artifacts `AGENTS.md`, `docs/AGENTS.md`, `tasks/tasks-0984-pr-263-codex-feedback-followup.md` | timestamp `2026-02-27T06:03:10Z` | owner `Codex`.
- Constraints / non-goals:
  - Minimal, high-leverage diffs only; no unrelated refactors.
  - Preserve runtime fallback and compatibility behavior.

## Goals
- Fix cloud/default runtime compatibility gap surfaced post-default flip.
- Make runtime canary default-lane deterministic by clearing runtime override env leakage.
- Add regression coverage for both fixes.
- Record incident-style root cause and prevention actions in task evidence.

## Non-Goals
- Re-architect runtime provider selection.
- Change cloud-mode support policy beyond current explicit guardrails.

## Stakeholders
- Product: CO maintainers responsible for runtime-mode safety.
- Engineering: operators and downstream users relying on cloud and appserver lanes.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - `start --execution-mode cloud` succeeds/fails according to existing cloud policy without requiring implicit runtime overrides.
  - Runtime canary default lane is not affected by ambient `CODEX_ORCHESTRATOR_RUNTIME_MODE*` env vars.
  - Review process captures and closes all actionable Codex threads before merge.
- Guardrails / Error Budgets:
  - No manifest schema breakage.
  - `runtimeMode=cli` break-glass preserved.

## User Experience
- Personas: maintainers, release operators, and downstream users running cloud/default paths.
- User Journeys:
  - A maintainer can safely merge after objective checklist confirms unresolved actionable threads = 0.
  - A user running cloud mode is not surprised by default runtime flip side effects.

## Technical Considerations
- Architectural Notes:
  - Keep default `runtimeMode=appserver` intact while preserving cloud compatibility through selector behavior.
  - Keep canary script deterministic by sanitizing runtime override env vars in scenario baseline env.
- Dependencies / Integrations:
  - Runtime selection logic (`orchestrator/src/cli/runtime/provider.ts`, `orchestrator/src/cli/orchestrator.ts`).
  - Runtime canary script (`scripts/runtime-mode-canary.mjs`).

## Open Questions
- Should unresolved non-blocking Codex comments remain open but explicitly tracked, or should merge policy require thread resolution state for all actionable comments regardless of agent?

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
