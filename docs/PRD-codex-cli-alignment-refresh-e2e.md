# PRD - Codex CLI Alignment + Refresh E2E (0963)

## Summary
- Problem Statement: The local Codex fork is behind upstream and CO guidance still implies a custom/managed CLI is generally required, creating unnecessary friction when stock CLI may already cover most workflows.
- Desired Outcome: Align local Codex to upstream, reduce refresh/setup friction, and clearly document when a custom/managed CLI is required versus optional.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Plan and execute local Codex alignment, investigate the refresh/jsonl path, decide whether custom CLI is still required, and validate everything manually end-to-end.
- Success criteria / acceptance:
  - Local codex fork at `${CODEX_DIR}` is aligned to `upstream/main`.
  - CO refresh/setup workflow works from one low-friction path.
  - Docs clearly separate stock CLI path vs managed/custom CLI path.
  - Manual E2E evidence covers refresh + orchestrator behavior.
- Constraints / non-goals:
  - Keep changes scoped; avoid broad refactors.
  - Preserve current downstream npm behavior.

## Goals
- Remove ambiguity about whether custom CLI is required.
- Make local refresh/alignment repeatable with minimal operator effort.
- Keep collab/jsonl capability available without forcing it for all users.
- Validate behavior manually, not only through automated tests.

## Non-Goals
- Rewriting Codex upstream behavior.
- Replacing CO's delegation or pipeline architecture.

## Stakeholders
- Product: CO maintainers and downstream npm users.
- Engineering: Orchestrator/CLI maintainers.

## Metrics and Guardrails
- Primary Success Metrics:
  - Refresh command(s) run successfully and report aligned state.
  - Manual E2E runs complete with expected outputs and no ambiguous failure modes.
  - Docs-readme guidance is explicit about required vs optional custom CLI.
- Guardrails / Error Budgets:
  - No regression in existing `codex-orchestrator codex setup` behavior.
  - Keep diff small and focused.

## User Experience
- Personas:
  - Maintainer updating local Codex + CO tooling.
  - Downstream user installing npm package with minimal setup.
- User Journeys:
  - User runs refresh flow and receives deterministic result (updated or already current).
  - User follows README and chooses stock or managed CLI path appropriately.

## Technical Considerations
- Architectural Notes:
  - Preserve managed CLI install support for collab parity and pinned behavior.
  - Prefer stock CLI by default where parity exists.
- Dependencies / Integrations:
  - `scripts/codex-cli-refresh.sh`
  - `orchestrator/src/cli/codexCliSetup.ts`
  - `README.md`
  - local fork: `${CODEX_DIR}` (example: `export CODEX_DIR=~/Code/codex`)

## Open Questions
- Resolved (2026-02-14): refresh script now includes explicit align-only mode (`--align-only`).
- Resolved (2026-02-14): docs now frame stock CLI as default and managed CLI as opt-in.

## Approvals
- Product: Approved by user (2026-02-14)
- Engineering: Pending implementation validation
- Design: N/A
