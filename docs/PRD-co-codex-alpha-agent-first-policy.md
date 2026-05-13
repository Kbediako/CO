# PRD - CO Codex Alpha Agent-First Policy

## Summary
- Problem Statement: CO needs a durable agent-first operating policy, so any agent working in this repo immediately knows how to use Codex alpha safely without forcing global alpha usage.
- Desired Outcome: CO repository guidance explicitly defines a CO-only alpha policy, evidence gates, rollback rules, and cadence, so alpha usage is controlled and auditable.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Use alpha for CO work, but keep strict procedures, so agents do not miss fast-moving Codex alpha changes and always know what to do.
- Success criteria / acceptance:
  - `AGENTS.md` and `docs/AGENTS.md` contain clear CO-specific Codex version policy.
  - A canonical repo guide documents cadence, evidence gates, and rollback path.
  - Task mirrors/index are updated, so policy state is auditable.
- Constraints / non-goals:
  - Keep global default stable unless explicit evidence-driven promotion is approved.
  - No unrelated refactors.

## Goals
- Encode a CO-repo Codex version policy that all agents can discover immediately.
- Keep alpha usage scoped and evidence-gated.
- Provide minimal, repeatable procedures for cadence, canary validation, and rollback.

## Non-Goals
- Forcing alpha globally across all repos.
- Reworking unrelated runtime/release systems.

## Metrics & Guardrails
- Primary success metric: policy is present in both agent handbooks and linked canonical guide.
- Guardrails:
  - Alpha adoption requires canary evidence (runtime + cloud contracts, no P0/P1 regressions).
  - Missing required cloud evidence defaults to hold/global stable.

## Approvals
- Product: User approved 2026-02-27.
- Engineering: Pending implementation completion.
- Design: N/A.
