# Action Plan — Agentic Coding Readiness & Onboarding Hygiene (Task 0905)

## Status Snapshot
- Current Phase: Completed (onboarding docs updated, CI enabled, evidence captured).
- Run Manifest Link: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- Metrics / State Snapshots: `.runs/0905-agentic-coding-readiness/metrics.json`, `out/0905-agentic-coding-readiness/state.json`.
- Approvals / Escalations: None recorded.

## Milestones & Tasks
1. Milestone: Onboarding docs unblocked
   - Tasks: replaced `.agent/system/*` and `.ai-dev-tasks/*` placeholders with repo-specific guidance; “read first” order remains in `.agent/AGENTS.md`.
2. Milestone: Governance/link integrity
   - Tasks: standardized guidance on Codex-first workflows (`codex exec`, `codex review`, `npx codex-orchestrator ...`) and removed/avoided references to non-standard subagent tooling.
3. Milestone: CI guardrails enabled
   - Tasks: enabled `.github/workflows/core-lane.yml` (PR + push to main) running `npm ci`, `npm run build`, `npm run lint`, `npm run test`, and `node scripts/spec-guard.mjs`.
4. Milestone: Evidence & mirrors
   - Tasks: captured diagnostics manifest and updated checklist mirrors in `tasks/`, `docs/TASKS.md`, and `.agent/task/**`.

## Risks & Mitigations
- Risk: Docs get updated but drift again without enforcement.
  - Mitigation: put the core lane in CI and keep docs pointing to source-of-truth scripts/configs.

## Next Review
- Date: TBD
- Agenda: confirm CI signal quality (runtime, flake rate) and decide whether to add an optional local Node pin file (`.nvmrc` / `.tool-versions`).
