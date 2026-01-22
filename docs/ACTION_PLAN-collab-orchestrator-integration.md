# ACTION_PLAN - Codex Collab Orchestrator Integration

## Summary
- Goal: Ship a spec-driven plan to integrate Codex collab capabilities into the orchestrator and RLM workflows.
- Scope: Research + design, schema/config updates, RLM integration approach, context-rot safeguards, and validation plan.
- Assumptions: Collab features are available in Codex CLI v0.88.0+ and can be enabled via configuration.

## Milestones & Sequencing
1) Collab capability map + MCP vs collab decision matrix.
2) Manifest/event schema + pipeline configuration design for collab metadata.
3) RLM integration design (iterative roles + symbolic subcall fan-out) and guardrails.
4) CO-managed patched Codex CLI setup flow (side-by-side install + opt-in routing).
5) Context-rot mitigation and multi-day resume strategy.
6) Validation plan and staged rollout checklist with real-world evals.

## Dependencies
- Codex CLI v0.88.0+ collab support.
- Orchestrator manifest/event schema tooling.
- Optional: patched Codex CLI fork or build pipeline for collab JSONL parity.

## Validation
- Checks / tests: manifest schema validation, collab-enabled pipeline run, RLM symbolic subcall coverage, long-running eval scenarios.
- Eval schedule:
  - Multi-hour refactor with checkpoints (completed).
  - 24h pause/resume context-rot regression (in progress; resume after 2026-01-23).
  - Multi-day initiative (48–72h) with multiple resumes (planned).
- Rollback plan: keep collab optional; fall back to single-agent execution.

## Risks & Mitigations
- Risk: Event volume or coordination failures in collab runs.
  - Mitigation: cap concurrency and event capture; add fallback path.

## Approvals
- Reviewer:
- Date:
