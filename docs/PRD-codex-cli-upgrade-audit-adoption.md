# PRD - Codex CLI Upgrade Audit + CO Capability Adoption (0980)

## Summary
- Problem Statement: CO currently carries mixed assumptions across docs/skills/config about Codex CLI multi-agent behavior, collab/delegation semantics, and agent thread defaults while upstream Codex CLI has introduced new capabilities and behavior shifts.
- Desired Outcome: establish an evidence-backed latest-capability baseline and ship targeted CO upgrades that improve adoption safety, consistency, and downstream usability without unrelated refactors.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): deeply audit latest Codex CLI changes, compare local fork against upstream, deliberate on depth/thread defaults (including a decision on moving to 12 threads), implement CO updates across code/config/docs/skills, validate, and merge the PR end-to-end.
- Success criteria / acceptance:
  - A concise, sourced "what changed" report exists and clearly explains CO impact.
  - Local fork delta summary includes ahead/behind counts and key commit-level differences.
  - Explicit decision log for depth-by-workload defaults and thread limit decision is documented.
  - CO updates are implemented and consistent across AGENTS/README/docs/skills/templates.
  - Required validation chain passes and evidence is captured.
  - PR is opened, feedback handled, checks monitored through quiet window, and merged.
- Constraints / non-goals:
  - Keep changes minimal and high-leverage.
  - Avoid destructive git operations.
  - Do not overfocus only on depth/thread count; cover broader capability surface.

## Goals
- Upgrade CO guidance/config posture to align with current Codex CLI behavior.
- Improve consistency of canonical-vs-legacy collab/multi-agent terminology.
- Document and codify workload-specific depth/thread recommendations with clear tradeoffs.
- Capture a reproducible fork-delta process for future upgrade audits.

## Non-Goals
- Re-architecting orchestrator runtime internals.
- Replacing existing delegation/collab architecture.
- Broad refactors unrelated to Codex CLI adoption gaps.

## Stakeholders
- Product: CO maintainers and downstream users relying on packaged docs/skills.
- Engineering: operators running multi-agent, delegation, review, and orchestration flows.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - No stale guidance remains for adopted defaults in touched surfaces.
  - Required validation chain passes on this branch.
  - PR merges cleanly with review/bot feedback resolved.
- Guardrails / Error Budgets:
  - Keep diff scoped to audit/adoption goals.
  - Preserve backward compatibility language where legacy alias support still exists.

## User Experience
- Personas: top-level CO users, downstream npm users, maintainers auditing run evidence.
- User Journeys:
  - User asks for latest Codex CLI adoption guidance and receives current, consistent defaults.
  - User runs upgrade/sync flow and can quickly see fork divergence and capability impact.
  - User can choose depth/thread defaults by workload with explicit risks.

## Technical Considerations
- Architectural Notes: keep implementation mostly in docs/skills/config guidance, plus minimal helper/script updates when they materially improve upgrade operations.
- Dependencies / Integrations: GitHub release metadata, local `codex` fork state, existing CO validation chain.

## Decision Log
- Decision (2026-02-25): set `[agents] max_threads = 12` and `[agents] max_depth = 2` as CO defaults, with fallback profile `max_threads = 8` and `max_depth = 1` for constrained or deterministic high-risk lanes.
- Rationale: CO workloads regularly benefit from higher parallel throughput than upstream defaults, while the documented fallback profile preserves predictable operation under tighter host/tool conditions.

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
