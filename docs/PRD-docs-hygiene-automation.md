# PRD — Docs Hygiene Automation & Review Handoff Gate (Task 0906)

## Summary
- Problem Statement: Agent-facing documentation in this repo (README, `.agent/**`, `.ai-dev-tasks/**`, `docs/**`, `tasks/**`) is high leverage but easy to let drift. Today, we rely on humans to (a) keep mirrors in sync and (b) consistently run the non-interactive review handoff (`npm run review`) after implementation validations.
- Desired Outcome: Agents can deterministically validate “docs correctness” (references, workflow contracts, mirrors) and safely sync the task mirrors; reviewers can trust that every completed implementation ran the full guardrails *and* the `codex review` handoff via `npm run review`.

## Goals
- Make the “post-implementation” completion gate explicit and consistent:
  - Run `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, then `npm run review`.
- Add a deterministic docs hygiene checker that detects:
  - Broken backticked repo-relative file references in agentic docs.
  - Stale `npm run <script>` references vs `package.json`.
  - Stale `codex-orchestrator` pipeline references vs `codex.orchestrator.json`.
- Add a safe docs sync tool that can refresh *mirrors* for the active task:
  - `docs/TASKS.md` snapshot entry for the active task.
  - `.agent/task/<task-id>.md` mirror for the active task.
- Gate PRs with `docs:check` in CI (no Codex CLI auth required).

## Non‑Goals
- Automatically rewriting freeform docs like `README.md` without explicit “managed blocks”.
- Running `npm run review` in CI (depends on Codex CLI + auth).
- Using LLMs to “fix” docs content; this is a deterministic lint/sync pass only.

## Stakeholders
- Engineering: Orchestrator maintainers / Platform Enablement
- Reviewers: DX / tooling owners

## Metrics & Guardrails
- `npm run docs:check` passes locally and in CI.
- `npm run docs:sync -- --task <task-id>` is idempotent (second run produces no diff).
- Implementation checklists and workflow docs clearly state the required review handoff step (`npm run review`) after validations.

## User Experience
- Agents:
  - Can run `docs:check` to catch drift early.
  - Can run `docs:sync` to keep task mirrors current without manual edits.
- Reviewers:
  - See consistent evidence (manifest links + `npm run review` handoff) and fewer doc mismatches.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-docs-hygiene-automation.md`
- Action Plan: `docs/ACTION_PLAN-docs-hygiene-automation.md`
- Task checklist: `tasks/tasks-0906-docs-hygiene-automation.md`
- Mini-spec: `tasks/specs/0906-docs-hygiene-automation.md`
- Run Manifest: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`
- Metrics / State: `.runs/0906-docs-hygiene-automation/metrics.json`, `out/0906-docs-hygiene-automation/state.json`

## Open Questions
- Should `docs:check` validate all backticked paths, or only paths in an allowlist of doc files to reduce false positives?
- Should `docs:sync` be “active task only” (safer) or support `--all` for bulk sync once it’s proven stable?

## Approvals
- Engineering: _(pending)_
- Reviewer: _(pending)_
