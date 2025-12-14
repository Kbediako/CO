# PRD — README vs Codebase Alignment (Task 0904)

## Summary
- Problem Statement: `README.md` includes commands, flags, paths, and workflow descriptions that no longer match the current repository behavior, leading to broken developer workflows and higher onboarding/review friction.
- Desired Outcome: `README.md` and linked workflow docs accurately reflect the actual CLI flags, scripts, and artifact layout. Where the documented behavior is intentional and valuable, we align code to match (or add compatibility shims) instead of papering over drift.

## Goals
- Reconcile each documented mismatch captured in `docs/TECH_SPEC-readme-codebase-alignment.md`.
- Ensure the “CLI Quick Start”, “Development Workflow”, “Mirror Workflows”, and “Hi‑Fi Design Toolkit Captures” sections are runnable as written in a clean checkout.
- Clarify which features are optional/not wired by default (e.g., cloud sync) and how they are enabled.
- Keep checklist mirrors in sync across `tasks/`, `docs/TASKS.md`, and `.agent/task/**`.

## Non‑Goals
- Rewriting the documentation structure end‑to‑end (only correctness + clarity for existing sections).
- Introducing new product features unrelated to documented mismatches.
- Changing external tooling behavior (e.g., upstream `codex` CLI interfaces) beyond adapting our wrapper scripts/docs.

## Stakeholders
- Engineering: Orchestrator maintainers / Platform Enablement
- Reviewers: Tooling + DX owners

## Metrics & Guardrails
- All README command snippets execute successfully after `npm install && npm run build`.
- `npm run review` succeeds in non‑interactive environments (no prompts / no TTY required).
- No README references to non‑existent flags, paths, or scripts.

## User Experience
- New contributors can follow `README.md` end‑to‑end to run diagnostics, locate manifests/metrics, and execute review hand‑off without tribal knowledge.
- Existing contributors can trust that README snippets are authoritative (no “try `--target` instead” surprises).

## Technical Considerations
- Some mismatches are best handled via doc updates (path clarifications), while others should be fixed in code for backwards compatibility (CLI flag aliases) or workflow integrity (`npm run review`).
- Prefer minimal compatibility shims over breaking changes when the README reflects a previously supported interface.

## Documentation & Evidence
- Findings + fix options: `docs/TECH_SPEC-readme-codebase-alignment.md`
- Task checklist: `tasks/tasks-0904-readme-codebase-alignment.md`
- Run Manifest Link: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`
- Metrics / State Snapshots: `.runs/0904-readme-codebase-alignment/metrics.json`, `out/0904-readme-codebase-alignment/state.json`

## Open Questions
- For `npm run lint` and CLI stage targeting, should we align docs to code, or code to docs (via aliases/pre-steps), and why?
- What is the intended contract for `npm run review` with the current `codex review` CLI (diff-driven review vs. manifest-driven evidence review)?

## Approvals
- Engineering: _(pending)_
- Reviewer: _(pending)_
