# PRD — Orchestrator Reliability Fixes (Task 0902)

## Summary
- Problem Statement: Task 0901 validated nine reliability issues spanning CLI orchestration, unified exec, persistence defaults, instruction loading, evaluation harness termination, temp artifact cleanup, and lint tooling side effects.
- Desired Outcome: Implement minimal, well‑tested fixes for all nine issues, rerun guardrails/diagnostics, and publish evidence in manifests and checklist mirrors.

## Goals
- Fix issues #1‑#9 from Task 0901 with minimal surface area.
- Add/extend unit tests where patterns exist to prevent regressions.
- Keep `npm run lint`, `npm run test`, and `node scripts/spec-guard.mjs --dry-run` green.
- Record a new diagnostics manifest under `.runs/0902-orchestrator-reliability-fixes/cli/` and mirror evidence across `/tasks`, `docs/TASKS.md`, and `.agent/task/**`.

## Non‑Goals
- Broad refactors or new feature work outside the validated issues.
- Changing manifest schema or orchestration semantics beyond what the fixes require.
- Re‑scoping other active tasks unless a fix clearly belongs here.

## Stakeholders
- Product/Infra: Platform Enablement
- Engineering: Orchestrator Reliability
- Reviewers: Orchestrator maintainers + toolchain owners

## Metrics & Guardrails
- 9/9 validated issues fixed with regression coverage.
- No manifest/stage left “running” after failures.
- No temp artifact directories left behind after runs.
- Linting has no side‑effect builds; builds are explicit prerequisites.

## Technical Considerations
- Touch only the call sites/utility functions implicated in 0901.
- Preserve existing APIs unless strictness changes are required (documented in spec).

## Approvals
- Product/Infra: _(pending)_
- Engineering: _(pending)_
- Review: _(pending)_

## Evidence & Manifests
- Diagnostics/guardrails manifest: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- Metrics/state snapshots: `.runs/0902-orchestrator-reliability-fixes/metrics.json`, `out/0902-orchestrator-reliability-fixes/state.json`.
