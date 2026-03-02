# PRD - Codex Review Quota + Merge Waiver Guardrails (0987)

## Summary
- Problem Statement: repeated `@codex` review requests on the same PR head can hit quota limits and stall merge decisions even when all objective quality gates are green.
- Desired Outcome: define explicit quota-aware review request behavior and a bounded merge-waiver path so maintainers can merge safely without ad-hoc decisions.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): add a minimal policy follow-up so we avoid over-pinging Codex, and document what to do when Codex review quota is exhausted.
- Success criteria / acceptance:
  - `AGENTS.md` and `docs/AGENTS.md` explicitly limit manual `@codex` requests to one ping per PR head SHA.
  - `AGENTS.md` and `docs/AGENTS.md` include a clear waiver rule for Codex quota exhaustion.
  - `docs/guides/codex-version-policy.md` documents quota-aware Codex review behavior and clarifies quota exhaustion is an operational availability event, not a promotion signal.
  - Task mirrors/index are updated with evidence references.
- Constraints / non-goals:
  - Minimal, docs-only policy changes.
  - No runtime/provider behavior changes.
  - No unrelated refactors.

## Goals
- Prevent repeated manual Codex pings on unchanged PR heads.
- Preserve merge discipline when Codex review is unavailable due to quota.
- Keep policy language short, explicit, and auditable.

## Non-Goals
- Changing Codex/GitHub product limits.
- Reworking existing review tooling or CI gates.

## Metrics & Guardrails
- Primary success metric: policy language lands in all three canonical files and passes docs guardrails.
- Guardrails:
  - Waiver requires objective conditions (`checks green`, `unresolved actionable threads = 0`, evidence recorded).
  - No changes outside policy/docs/checklist/index scope.

## Approvals
- Product: User approved follow-up on 2026-03-02.
- Engineering: Pending implementation completion.
- Design: N/A.
