# PRD - CO 0.1.38 Release + Skills/Docs Alignment (0992)

## Summary
- Problem Statement: We need a release that is backed by a fresh, deliberate audit of all shipped skills and operator docs, with contradictions resolved, explicit guidance for the new session-fork/subagent-context capability, and global skill-install posture verified.
- Desired Outcome: ship `@kbediako/codex-orchestrator@0.1.38` from `main` after docs/skills/release checks pass, verify `codex-orchestrator` skill install globally, and document an evidence-backed decision for `fork_context` adoption (guidance-only vs programmatic CO behavior).
- Fork-context adoption decision (2026-03-03): keep guidance-first defaults (`fork_context=false` unless explicitly required), and add minimal observability-only programmatic support (manifest + doctor usage counters) so future defaulting decisions are evidence-backed.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): run CO as an orchestrator (including advanced features), deeply deliberate across shipped skills/docs/SOPs, align contradictions, then release and ensure the codex-orchestrator skill is globally installed.
- Success criteria / acceptance:
  - Docs-first artifacts and mirrors are updated before implementation edits.
  - Deep checks cover shipped skills, AGENTS/SOP/readme guidance, and release readiness.
- New Codex CLI fork/session-context capability is evaluated with concrete usage recommendations for CO.
- A clear decision is documented on whether `fork_context` handling should be guidance-only or programmatic in CO.
- If any programmatic changes are made, they remain additive observability only (no behavior/default flips).
  - Contradictions are resolved with minimal, high-leverage changes.
  - Ordered validation lane (1-10) passes with evidence logs.
  - Release PR/tag/publish lifecycle completes and new npm version is verified.
  - Global skill install is executed and verified.
- Constraints / non-goals:
  - Minimal, non-destructive diffs only.
  - No unrelated refactors.
  - Preserve existing runtime/execution compatibility contracts.

## Goals
- Audit all bundled skills in `skills/` for correctness, stale guidance, and policy compatibility.
- Audit core docs/SOP surfaces (`AGENTS.md`, `docs/AGENTS.md`, `README.md`, `docs/README.md`, `.agent/SOPs/*`) for contradictions.
- Evaluate practical CO usage patterns for session/context forking (`codex fork`, collab `spawn_agent` with `fork_context`) and capture policy guidance.
- Keep `codex fork` out of default task-lane SOPs; treat it as ad-hoc operator workflow that must re-enter task-scoped orchestrator runs for auditable delivery.
- Apply only the smallest required fixes.
- Ship a patch release with signed tag + release workflow + npm verification.
- Verify global install of `codex-orchestrator` skill.

## Non-Goals
- Runtime provider architecture changes.
- New feature development outside release/docs/skills alignment.
- Broad reorganization of historical tasks/docs.

## Metrics & Guardrails
- Primary success metrics:
  - `docs:check` and `docs:freshness` pass after alignment updates.
  - Validation gates 1-10 pass and are logged under `out/0992-release-0-1-38-skills-docs-alignment/manual/`.
  - Fork-context adoption decision note is recorded with concrete recommended usage lanes.
  - `npm view @kbediako/codex-orchestrator version` reports `0.1.38` after publish.
- Guardrails:
  - Keep change scope release/docs/skills focused.
  - Maintain explicit `runtimeMode` vs `executionMode` orthogonality language.
  - Keep global stable policy unchanged unless evidence requires update.

## Approvals
- Product: User approved release + deep docs/skills checks on 2026-03-03.
- Engineering: Pending implementation + validations.
- Design: N/A.
