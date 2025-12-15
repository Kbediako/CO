# PRD — Agentic Coding Readiness & Onboarding Hygiene (Task 0905)

## Summary
- Problem Statement: Several repo entrypoints that are critical for agentic coding are currently either missing or placeholders (bootstrap `.agent/system/*`, `.ai-dev-tasks/*`, stale subagent documentation that implied a non-standard CLI dependency, and no enabled CI guardrail workflow). This increases onboarding time and makes it easier for instructions/process to drift from reality.
- Desired Outcome: A new agent (or teammate) can follow a single “read first” path to understand repo structure, execute the canonical PRD→tasks workflow, and rely on CI to keep guardrails and core diagnostics green.

## Goals
- Replace bootstrap placeholder onboarding docs with accurate, current repository guidance.
- Remove stale subagent guidance and standardize on Codex CLI primitives for non-interactive review and automation.
- Enable CI guardrails so PRs automatically run core checks (build/lint/test/spec-guard) in a non-interactive way.
- Keep checklist mirrors in sync across `tasks/`, `docs/TASKS.md`, and `.agent/task/**`.

## Non‑Goals
- Refactor orchestrator runtime behavior or add new orchestration features.
- Rebuild the documentation taxonomy end-to-end; this is a hygiene pass to make existing workflows runnable and discoverable.
- Introduce new external services or secrets management workflows.

## Stakeholders
- Engineering: Orchestrator maintainers / Platform Enablement
- Reviewers: DX / tooling owners

## Metrics & Guardrails
- A clean checkout can pass the core lane: `npm run build`, `npm run lint`, `npm run test`, `node scripts/spec-guard.mjs --dry-run`.
- All referenced onboarding documents exist, are non-placeholder, and have no broken local links.
- CI runs the same core lane on pull requests and pushes to main without requiring interactive input.

## User Experience
- A new agent can answer “what do I read first?” and “how do I prove work is correct?” without tribal knowledge.
- A reviewer can audit evidence via manifests and checklists without hunting through ad-hoc notes.

## Technical Considerations
- Prefer documentation that points to concrete code locations and commands over abstract guidance.
- CI should reuse existing scripts and avoid adding new tooling unless required (keep it fast and deterministic).

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-agentic-coding-readiness.md`
- Action Plan: `docs/ACTION_PLAN-agentic-coding-readiness.md`
- Task checklist: `tasks/tasks-0905-agentic-coding-readiness.md`

## Open Questions
- Should CI run only spec-guard + tests, or should it also build `dist/` to catch packaging drift?
- Do we want to formalize a pinned Node version file (`.nvmrc`, `.tool-versions`) as part of onboarding consistency?

## Approvals
- Engineering: _(pending)_
- Reviewer: _(pending)_
