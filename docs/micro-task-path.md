# Micro-Task Docs-First Path

Use this path to reduce friction for very small changes while keeping traceability.

## Eligibility (all required)
- Change is bounded to at most 2 files and no more than ~40 changed lines.
- No schema/data migration, no auth/secret boundary change, no release workflow/publish change.
- No user-visible behavior change beyond typo/wording/clarity or narrowly scoped guardrail text.
- Change is not a parity/alignment lane and does not depend on preserving exact artifact names, exact surfaces, or other protected wording.
- Change does not add, retain, or touch fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior anywhere in the repo.
- Rollback is trivial (single commit revert) and blast radius is low.

## Required artifacts
- Keep a task id and checklist entry (`tasks/tasks-<id>-<slug>.md`).
- Keep a TECH_SPEC update (`tasks/specs/<id>-<slug>.md`) with `last_review` refreshed.
- Keep a concise PRD/ACTION_PLAN delta note (1-3 bullets each) instead of full rewrite.
- Capture one pre-implementation review note and one validation evidence link.

## Guardrails
- Delegation remains required for top-level tasks unless explicitly blocked.
- If any eligibility condition fails mid-task, switch back to the full docs-first flow.
- If the lane depends on rejecting nearby wrong interpretations or on preserving exact naming/surface intent, do not use this path; open the full docs-first packet instead.
- If the lane needs a fallback-expiry or large-refactor decision, do not use this path; open the full docs-first packet and follow `docs/guides/fallback-expiry-and-refactor-policy.md`.
- Never use this path for release tags, npm publish workflow changes, or cloud credential flows.
